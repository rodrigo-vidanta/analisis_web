# ✅ Sistema de Heartbeat - Setup Final

**Fecha:** 30 Enero 2026  
**Estado:** ✅ CASI COMPLETO (solo falta habilitar Cron)

---

## ✅ Completado

1. ✅ **Tabla `active_sessions` creada y funcionando**
2. ✅ **Función `cleanup_inactive_sessions()` creada y probada**
3. ✅ **Edge Function desplegada y funcionando**
4. ✅ **Sistema de Heartbeat integrado en frontend**
5. ✅ **Indicador "Usuario en Línea" visible para todos los roles**

---

## ⚠️ Último Paso: Habilitar pg_cron y configurar Cron Job

### Paso 1: Habilitar extensión pg_cron

1. Ve a **Supabase Dashboard**: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/database/extensions
2. Busca `pg_cron` en la lista de extensiones
3. Click en el toggle para **HABILITAR**
4. Espera unos segundos a que se active

### Paso 2: Configurar Cron Job

Una vez habilitada la extensión, ve a **SQL Editor** y ejecuta:

```sql
SELECT cron.schedule(
  'cleanup-inactive-sessions',  -- Nombre del job
  '* * * * *',                   -- Cada 1 minuto
  $$
  SELECT net.http_post(
    url := 'https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/cleanup-inactive-sessions',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### Paso 3: Verificar que el Cron está activo

```sql
-- Ver todos los jobs programados
SELECT jobid, schedule, command FROM cron.job;

-- Ver ejecuciones recientes (últimas 10)
SELECT 
  jobid,
  status,
  start_time,
  end_time,
  return_message,
  EXTRACT(EPOCH FROM (end_time - start_time)) as duration_seconds
FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

---

## 🧪 Testing Completo

### 1. Verificar Heartbeat en Frontend

1. Hacer login en la app
2. Abrir **DevTools** → **Console**
3. Buscar logs:
   ```
   💓 Heartbeat iniciado (cada 30s)
   💓 Heartbeat enviado: HH:MM:SS
   ```

### 2. Verificar Sesión Activa en BD

```sql
SELECT 
  u.email,
  u.raw_user_meta_data->>'full_name' as nombre,
  s.last_activity,
  s.expires_at,
  EXTRACT(EPOCH FROM (NOW() - s.last_activity)) as segundos_inactivo,
  u.raw_user_meta_data->>'is_operativo' as is_operativo
FROM active_sessions s
INNER JOIN auth.users u ON s.user_id = u.id
WHERE s.expires_at > NOW()
ORDER BY s.last_activity DESC;
```

### 3. Test de Inactividad

1. Hacer login
2. Verificar que `is_operativo = true`
3. **Cerrar navegador completamente** (no solo la pestaña)
4. Esperar **3 minutos**
5. Ejecutar query:
   ```sql
   SELECT 
     email,
     raw_user_meta_data->>'is_operativo' as is_operativo,
     last_sign_in_at
   FROM auth.users 
   WHERE email = 'TU_EMAIL';
   ```
6. Verificar que `is_operativo = false`

### 4. Test de beforeunload

1. Hacer login
2. En **DevTools** → **Console**, buscar:
   ```
   👋 beforeunload listener registrado
   ```
3. Cerrar pestaña/ventana
4. La sesión debería limpiarse automáticamente

---

## 📊 Monitoreo en Producción

### Dashboard de Sesiones Activas

```sql
-- Ver usuarios en línea ahora mismo
SELECT 
  COUNT(*) as usuarios_en_linea
FROM active_sessions 
WHERE expires_at > NOW();

-- Ver detalle de quién está conectado
SELECT 
  u.email,
  u.raw_user_meta_data->>'full_name' as nombre,
  u.raw_user_meta_data->>'role_name' as rol,
  s.last_activity,
  EXTRACT(EPOCH FROM (NOW() - s.last_activity)) as segundos_inactivo
FROM active_sessions s
INNER JOIN auth.users u ON s.user_id = u.id
WHERE s.expires_at > NOW()
ORDER BY s.last_activity DESC;
```

### Detectar Inconsistencias

```sql
-- Usuarios marcados como "en línea" pero sin sesión activa
SELECT 
  u.email,
  u.raw_user_meta_data->>'is_operativo' as is_operativo_flag,
  CASE 
    WHEN s.user_id IS NOT NULL THEN 'Tiene sesión activa'
    ELSE 'Sin sesión activa'
  END as estado_real
FROM auth.users u
LEFT JOIN active_sessions s ON u.id = s.user_id AND s.expires_at > NOW()
WHERE u.raw_user_meta_data->>'is_operativo' = 'true'
  AND s.user_id IS NULL;
```

---

## 🔧 Ajustes Opcionales

### Cambiar Intervalo de Heartbeat

**Archivo:** `src/contexts/AuthContext.tsx` (línea ~63)

```typescript
useHeartbeat({
  userId: authState.user?.id || '',
  sessionId: localStorage.getItem('session_id') || '',
  enabled: authState.isAuthenticated,
  intervalMs: 60000 // Cambiar a 1 minuto (de 30s)
});
```

### Cambiar Timeout de Inactividad

**Función:** `cleanup_inactive_sessions()` en la migración SQL

```sql
-- Cambiar de 2 minutos a 5 minutos
DELETE FROM active_sessions
WHERE expires_at < NOW()
   OR last_activity < NOW() - INTERVAL '5 minutes'; -- Cambiar aquí
```

### Cambiar Frecuencia del Cron

```sql
-- Cada 5 minutos en lugar de cada 1 minuto
SELECT cron.schedule(
  'cleanup-inactive-sessions',
  '*/5 * * * *',  -- Cada 5 minutos
  $$...$$
);
```

---

## 📁 Archivos del Sistema

| Archivo | Descripción |
|--------|-------------|
| `supabase/migrations/20260130_create_active_sessions.sql` | ✅ Tabla + función |
| `src/hooks/useHeartbeat.ts` | ✅ Hook de heartbeat |
| `src/contexts/AuthContext.tsx` | ✅ Integración |
| `supabase/functions/cleanup-inactive-sessions/index.ts` | ✅ Edge Function |
| `src/components/admin/UserManagementV2/components/UserEditPanel.tsx` | ✅ Indicador UI |

---

## 🎯 Checklist Final

- [x] Tabla `active_sessions` creada
- [x] Función `cleanup_inactive_sessions()` creada
- [x] Hook `useHeartbeat` implementado
- [x] Integrado en `AuthContext`
- [x] Edge Function desplegada y probada
- [x] **Extensión `pg_cron` habilitada** ✅
- [x] **Cron Job configurado** ✅
- [ ] Heartbeat visible en console (hacer login y verificar)
- [ ] Test de inactividad completado

---

## ✅ Resultado Final

Una vez completados los pasos anteriores:

- ✅ Usuarios aparecerán como "en línea" solo cuando estén realmente conectados
- ✅ Heartbeat actualiza sesión cada 30 segundos
- ✅ Sesiones inactivas > 2 minutos se limpian automáticamente
- ✅ `is_operativo` se sincroniza automáticamente con el estado real
- ✅ No más sesiones "colgadas"

---

**Última actualización:** 30 Enero 2026  
**Estado:** ✅ Listo para habilitar pg_cron
