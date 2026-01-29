# Plan de Testing: Sistema de Sesión Única

**Fecha:** 29 de Enero 2026  
**Feature:** Prevención de sesiones duplicadas  
**Archivos modificados:** 4

---

## Archivos Modificados

| Archivo | Cambios | Testing Requerido |
|---------|---------|-------------------|
| `migrations/20260129_active_sessions.sql` | Tabla nueva + RLS + función cleanup | ✅ Ejecutar en Supabase |
| `src/services/authService.ts` | +`registerUniqueSession()` +`clearUniqueSession()` | ✅ Login/Logout |
| `src/contexts/AuthContext.tsx` | Listener Realtime para sesiones | ✅ Sesiones simultáneas |
| `FIX_SESIONES_DUPLICADAS_2026-01-29.md` | Documentación del fix | N/A |

---

## Pre-requisitos

1. **Ejecutar migración SQL:**
   ```bash
   # En Supabase SQL Editor
   # Copiar y pegar: migrations/20260129_active_sessions.sql
   # Ejecutar
   # Verificar mensaje: "✅ Migración completada exitosamente"
   ```

2. **Verificar tabla creada:**
   ```sql
   SELECT * FROM public.active_sessions;
   -- Debe retornar sin error (tabla vacía)
   
   SELECT COUNT(*) FROM pg_tables 
   WHERE schemaname = 'public' AND tablename = 'active_sessions';
   -- Debe retornar: 1
   ```

3. **Verificar RLS habilitado:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' AND tablename = 'active_sessions';
   -- rowsecurity debe ser: true
   ```

4. **Verificar Realtime habilitado:**
   ```sql
   SELECT schemaname, tablename 
   FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime' AND tablename = 'active_sessions';
   -- Debe retornar 1 fila
   ```

---

## Casos de Prueba

### Caso 1: Login Normal (Sin Sesión Previa)

**Objetivo:** Verificar que el login crea una sesión única correctamente

**Pasos:**
1. Limpiar cookies/localStorage (Cmd+Shift+Delete en Chrome)
2. Ir a `/login`
3. Ingresar credenciales válidas
4. Click en "Iniciar Sesión"

**Resultado Esperado:**
- ✅ Login exitoso
- ✅ Console log: `✅ Sesión única registrada: XXXXXXXX...`
- ✅ localStorage tiene `session_id`
- ✅ BD tiene 1 registro en `active_sessions` para este usuario

**Verificación en BD:**
```sql
SELECT 
  u.email,
  s.session_id,
  s.device_info,
  s.created_at,
  s.expires_at
FROM public.active_sessions s
JOIN auth.users u ON u.id = s.user_id
WHERE u.email = 'tu-email@test.com';
```

---

### Caso 2: Login en Dispositivo A, luego Dispositivo B (Sesión Duplicada)

**Objetivo:** Verificar que la sesión anterior es invalidada y el usuario A recibe logout forzado

**Setup:**
- Usuario ya logueado en Chrome (Dispositivo A)
- Intentar login en Firefox (Dispositivo B) con mismo usuario

**Pasos:**
1. **Dispositivo A (Chrome):**
   - Ya tiene sesión activa
   - Dejar pestaña abierta y visible
   - Abrir DevTools Console para ver logs

2. **Dispositivo B (Firefox):**
   - Ir a `/login`
   - Ingresar mismas credenciales que Dispositivo A
   - Click en "Iniciar Sesión"

**Resultado Esperado:**

**En Dispositivo B (Firefox):**
- ✅ Login exitoso
- ✅ Console log: `✅ Sesión única registrada: YYYYYYYY...`
- ✅ localStorage tiene nuevo `session_id`
- ✅ BD tiene 1 registro (reemplazó el anterior)

**En Dispositivo A (Chrome) - Automáticamente:**
- ✅ Console log: `🔐 Sesión invalidada - Nueva sesión detectada en otro dispositivo`
- ✅ Toast aparece: "Iniciaste sesión en otro dispositivo" (duración 5s)
- ✅ Logout automático (redirige a login)
- ✅ localStorage.session_id eliminado
- ✅ authState.isAuthenticated = false

**Verificación en BD:**
```sql
SELECT 
  u.email,
  s.session_id,
  s.device_info->'browser' as browser,
  s.created_at
FROM public.active_sessions s
JOIN auth.users u ON u.id = s.user_id
WHERE u.email = 'tu-email@test.com';

-- Debe mostrar SOLO 1 sesión (la más reciente, Firefox)
```

---

### Caso 3: Logout Manual

**Objetivo:** Verificar que el logout limpia la sesión correctamente

**Pasos:**
1. Usuario logueado
2. Click en menú de usuario > "Cerrar Sesión"
3. Confirmar logout

**Resultado Esperado:**
- ✅ Console log: `✅ Sesión única eliminada: XXXXXXXX...`
- ✅ localStorage.session_id eliminado
- ✅ BD no tiene registro para este usuario
- ✅ Redirige a `/login`

**Verificación en BD:**
```sql
SELECT COUNT(*) 
FROM public.active_sessions 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'tu-email@test.com');

-- Debe retornar: 0
```

---

### Caso 4: Sesión Expirada (24h después)

**Objetivo:** Verificar que las sesiones expiradas se limpian automáticamente

**Pasos (Simulación):**
1. Insertar sesión con `expires_at` en el pasado:
   ```sql
   INSERT INTO public.active_sessions (user_id, session_id, device_info, expires_at)
   VALUES (
     (SELECT id FROM auth.users LIMIT 1),
     gen_random_uuid()::TEXT,
     '{"browser": "Test"}'::JSONB,
     NOW() - INTERVAL '1 hour' -- Expirada hace 1 hora
   );
   ```

2. Ejecutar función de limpieza:
   ```sql
   SELECT public.cleanup_expired_sessions();
   -- Debe retornar: número de sesiones eliminadas (>0)
   ```

3. Verificar que la sesión fue eliminada:
   ```sql
   SELECT COUNT(*) FROM public.active_sessions WHERE expires_at < NOW();
   -- Debe retornar: 0
   ```

**Resultado Esperado:**
- ✅ Sesiones expiradas eliminadas
- ✅ Función retorna número correcto

---

### Caso 5: Múltiples Usuarios Simultáneos (No Debe Conflictar)

**Objetivo:** Verificar que usuarios DIFERENTES pueden tener sesiones simultáneas sin problema

**Pasos:**
1. Usuario A inicia sesión en Chrome
2. Usuario B inicia sesión en Firefox
3. Verificar que ambos permanecen logueados

**Resultado Esperado:**
- ✅ Ambos usuarios mantienen sesión activa
- ✅ BD tiene 2 registros (uno por usuario)
- ✅ Ninguno recibe logout forzado

**Verificación en BD:**
```sql
SELECT 
  u.email,
  s.session_id,
  s.created_at
FROM public.active_sessions s
JOIN auth.users u ON u.id = s.user_id
ORDER BY u.email;

-- Debe mostrar 2 filas (una por usuario)
```

---

### Caso 6: Navegador se Cierra sin Logout

**Objetivo:** Verificar que la sesión persiste en BD hasta expiración

**Pasos:**
1. Usuario inicia sesión
2. Cerrar navegador SIN hacer logout
3. Reabrir navegador y ir a la app

**Resultado Esperado:**
- ✅ BD mantiene el registro en `active_sessions`
- ✅ Si el JWT de Supabase es válido, usuario sigue logueado
- ✅ Si el JWT expiró, usuario debe hacer login nuevamente (sesión en BD se reemplaza)

---

## Monitoreo en Producción

### Logs a Revisar

**En Console del navegador:**
```
✅ Sesión única registrada: abc12345...
🔐 Sesión invalidada - Nueva sesión detectada en otro dispositivo
✅ Sesión única eliminada: abc12345...
```

**Errores posibles:**
```
⚠️ Error registrando sesión única: {...}
⚠️ No se encontró session_id en localStorage
⚠️ Error limpiando sesión única: {...}
```

### Query de Monitoreo (Supabase SQL Editor)

```sql
-- Ver todas las sesiones activas
SELECT 
  u.email,
  u.raw_user_meta_data->>'role_name' as role,
  s.session_id,
  s.device_info->'browser' as browser,
  s.created_at,
  s.expires_at,
  EXTRACT(EPOCH FROM (s.expires_at - NOW())) / 3600 as hours_until_expire
FROM public.active_sessions s
JOIN auth.users u ON u.id = s.user_id
ORDER BY s.created_at DESC;

-- Contar sesiones por usuario (debe ser máximo 1 por usuario)
SELECT 
  user_id,
  COUNT(*) as session_count
FROM public.active_sessions
GROUP BY user_id
HAVING COUNT(*) > 1;
-- Si retorna filas: HAY UN PROBLEMA (constraint UNIQUE no funcionó)

-- Ver sesiones próximas a expirar (<1 hora)
SELECT 
  u.email,
  s.expires_at,
  NOW() as current_time,
  s.expires_at - NOW() as time_remaining
FROM public.active_sessions s
JOIN auth.users u ON u.id = s.user_id
WHERE s.expires_at < NOW() + INTERVAL '1 hour'
ORDER BY s.expires_at;
```

---

## Checklist de Deploy

- [ ] Ejecutar migración SQL en Supabase Dashboard
- [ ] Verificar tabla `active_sessions` creada correctamente
- [ ] Verificar RLS habilitado y políticas activas
- [ ] Verificar Realtime habilitado en la tabla
- [ ] Build de frontend sin errores TypeScript
- [ ] Testing manual en desarrollo (Caso 1, 2, 3)
- [ ] Deploy a staging (si existe)
- [ ] Testing en staging
- [ ] Deploy a producción
- [ ] Monitorear logs primeras 2 horas post-deploy
- [ ] Testing en producción con usuarios reales (coordinar 2-3 voluntarios)

---

## Rollback (Si Falla)

### Opción 1: Deshabilitar Feature (Sin Eliminar Tabla)

**Archivo:** `src/services/authService.ts`

Comentar llamada a `registerUniqueSession`:

```typescript
// await this.registerUniqueSession(data.user.id, data.session.access_token);
```

Comentar llamada a `clearUniqueSession`:

```typescript
// await this.clearUniqueSession();
```

**Archivo:** `src/contexts/AuthContext.tsx`

Revertir listener Realtime a versión anterior (lógica deprecada).

**Deploy:** Build + push

### Opción 2: Eliminar Completamente

```sql
-- Eliminar tabla
DROP TABLE IF EXISTS public.active_sessions CASCADE;

-- Eliminar función
DROP FUNCTION IF EXISTS public.cleanup_expired_sessions();
```

Revertir cambios en código (git revert).

---

## Contacto y Soporte

**Responsable:** AI Team  
**Fecha de Implementación:** 29 de Enero 2026  
**Documento de Fix:** `FIX_SESIONES_DUPLICADAS_2026-01-29.md`

---

**Última actualización:** 29 de Enero 2026
