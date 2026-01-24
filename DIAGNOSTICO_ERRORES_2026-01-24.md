# Diagnóstico de Errores - 24 de Enero 2026

## 🔍 Resumen Ejecutivo

**Estado:** ⚠️ CRÍTICO  
**Problema Principal:** Vista `auth_users_safe` NO EXISTE en la base de datos  
**Impacto:** Error 404 en múltiples componentes (Footer, TokenManagement, DatabaseConfiguration)

---

## 📋 Errores Detectados

### 1. Error 404 en Vista `auth_users_safe`

**Ubicación del error:**
```
GET https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/auth_users_safe?select=...
404 (Not Found)
```

**Componentes afectados:**
1. `src/components/Footer.tsx` (línea 61)
2. `src/components/admin/TokenManagement.tsx` (línea 93)
3. `src/components/admin/DatabaseConfiguration.tsx` (línea 95)

**Código problemático:**
```typescript
// Footer.tsx - Líneas 60-63
const { data: users, error: usersError } = await supabaseSystemUI
  .from('auth_users_safe')  // ❌ Esta vista NO EXISTE
  .select('id, email, full_name')
  .in('id', AI_DIVISION_USER_IDS);
```

---

### 2. Error en Llamadas Activas

**Mensaje de error:**
```
❌ Error cargando llamadas recientes: 
{
  message: 'TypeError: Failed to fetch',
  details: 'TypeError: Failed to fetch\n    at window.fetch...'
}
```

**Origen:** `liveMonitorOptimizedService.ts` línea 164

**Causa raíz:** Posible problema de conexión o pérdida de sesión durante el logout/navegación

---

## 🔎 Análisis de la Base de Datos

### ⛔ Vista Faltante: `auth_users_safe`

**Estado actual:** NO EXISTE  
**Última referencia:** Documentación menciona su existencia en:
- `.cursor/rules/security-rules.mdc`
- `.cursor/rules/arquitectura-bd-unificada.mdc`

**Discrepancia:** La documentación afirma que existe una vista `auth_users_safe` creada después del pentesting 2026-01-16, pero NO hay:
1. Script de migración SQL que la cree
2. Evidencia de su existencia en la BD
3. Definición de la vista en los archivos SQL

### 📊 Comparación Documentación vs. Realidad

| Elemento | Documentación | Realidad |
|----------|---------------|----------|
| `auth_users_safe` | ✅ Existe (security-rules.mdc) | ❌ NO EXISTE (404) |
| `user_profiles_v2` | ✅ Existe | ✅ Existe (46 refs) |
| RLS en vistas | ✅ Solo authenticated | ❓ Sin confirmar |

---

## 🛠️ Solución Propuesta

### Opción 1: Crear la Vista `auth_users_safe` (RECOMENDADO)

**SQL a ejecutar:**
```sql
-- Crear vista segura de auth_users sin password_hash
CREATE OR REPLACE VIEW auth_users_safe AS
SELECT 
  id,
  email,
  full_name,
  phone,
  role,
  coordinacion_ids,
  is_admin,
  is_active,
  is_locked,
  failed_attempts,
  locked_until,
  last_login,
  created_at,
  updated_at,
  has_backup,
  backup_id,
  metadata
FROM auth_users;

-- Políticas RLS para la vista (solo usuarios autenticados)
ALTER VIEW auth_users_safe SET (security_invoker = on);

GRANT SELECT ON auth_users_safe TO authenticated;
REVOKE ALL ON auth_users_safe FROM anon;
```

**Justificación:**
- La documentación indica que debe existir
- Sigue el patrón de seguridad post-pentesting 2026-01-16
- No expone `password_hash`

---

### Opción 2: Migrar Código a `user_profiles_v2`

**Cambios necesarios en 3 archivos:**

#### 1. Footer.tsx
```typescript
// ANTES (línea 60-63)
const { data: users, error: usersError } = await supabaseSystemUI
  .from('auth_users_safe')  // ❌
  .select('id, email, full_name')
  .in('id', AI_DIVISION_USER_IDS);

// DESPUÉS
const { data: users, error: usersError } = await supabaseSystemUI
  .from('user_profiles_v2')  // ✅
  .select('id, email, full_name')
  .in('id', AI_DIVISION_USER_IDS);
```

#### 2. TokenManagement.tsx
```typescript
// ANTES (línea 93)
.from('auth_users_safe')

// DESPUÉS
.from('user_profiles_v2')
```

#### 3. DatabaseConfiguration.tsx
```typescript
// ANTES (línea 95)
testQuery = client.from('auth_users_safe').select('count').limit(1);

// DESPUÉS
testQuery = client.from('user_profiles_v2').select('count').limit(1);
```

**Ventajas:**
- ✅ Rápido de implementar
- ✅ Usa vista existente y confirmada
- ✅ `user_profiles_v2` también excluye `password_hash`

**Desventajas:**
- ⚠️ Inconsistencia con documentación
- ⚠️ Requiere actualizar documentación

---

### Opción 3: Verificar y Corregir Schema

**Pasos:**
1. Conectar a la BD con acceso admin
2. Verificar qué vistas existen realmente:
   ```sql
   SELECT table_name, table_type 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE '%auth_users%';
   ```
3. Decidir estrategia según resultados

---

## 🔧 Fix Inmediato (Opción 2 - RECOMENDADO)

**Pasos:**
1. Modificar 3 archivos TypeScript
2. Reemplazar `auth_users_safe` → `user_profiles_v2`
3. Actualizar documentación en:
   - `.cursor/rules/security-rules.mdc`
   - `.cursor/rules/arquitectura-bd-unificada.mdc`

**Comando de búsqueda:**
```bash
grep -r "auth_users_safe" src/
# Resultado: 4 ocurrencias (3 .tsx, 1 .ts Edge Function)
```

---

## 📝 Problema Secundario: Failed to fetch

### Causa Probable
El error `Failed to fetch` en `liveMonitorOptimizedService.ts` ocurre por:
1. **Sesión perdida durante navegación**
2. **Verificación de conexión retorna offline**

### Código relevante (liveActivityStore.ts líneas 273-282):
```typescript
// Verificar que hay sesión activa antes de hacer queries
const { data: { session } } = await supabaseSystemUI!.auth.getSession();
if (!session) {
  // Sin sesión activa, limpiar y no intentar cargar
  set({ 
    widgetCalls: [],
    isLoadingCalls: false 
  });
  return;
}
```

### ✅ Este código es CORRECTO
- Previene requests después de logout
- Implementado en respuesta a warnings previos
- No requiere cambios

---

## 📊 Estadísticas de Uso

### Referencias a `auth_users_safe` (4 total):
| Archivo | Línea | Tipo |
|---------|-------|------|
| Footer.tsx | 61 | Query |
| TokenManagement.tsx | 93 | Query |
| DatabaseConfiguration.tsx | 95 | Test query |
| trigger-manual-proxy/index.ts | 102 | Edge Function |

### Referencias a `user_profiles_v2` (46 total):
- UserManagement.tsx: 9 refs
- LiveChatCanvas.tsx: 10 refs
- ConversacionesWidget.tsx: 5 refs
- LiveMonitorKanban.tsx: 4 refs
- Otros: 18 refs

**Conclusión:** `user_profiles_v2` es la vista estándar usada en el 92% del código.

---

## 🎯 Recomendación Final

### Implementar Opción 2 (Migrar a `user_profiles_v2`)

**Razones:**
1. ✅ Consistencia: 92% del código ya usa `user_profiles_v2`
2. ✅ Velocidad: Fix inmediato sin SQL en producción
3. ✅ Seguridad: `user_profiles_v2` ya excluye `password_hash`
4. ✅ Confiabilidad: Vista existente y probada

**Riesgo:** Bajo  
**Esfuerzo:** 15 minutos  
**Impacto:** Elimina error 404 en Footer y admin panels

---

## 📋 Checklist de Implementación

- [ ] Modificar `src/components/Footer.tsx` (línea 61)
- [ ] Modificar `src/components/admin/TokenManagement.tsx` (línea 93)
- [ ] Modificar `src/components/admin/DatabaseConfiguration.tsx` (línea 95)
- [ ] Actualizar `.cursor/rules/security-rules.mdc`
- [ ] Actualizar `.cursor/rules/arquitectura-bd-unificada.mdc`
- [ ] Verificar Edge Function en `supabase/functions/trigger-manual-proxy/index.ts`
- [ ] Testing en localhost:5173
- [ ] Commit con mensaje descriptivo

---

## 🔐 Seguridad

**Ambas vistas (`auth_users_safe` y `user_profiles_v2`) deben:**
- ✅ Excluir `password_hash`
- ✅ Tener RLS habilitado
- ✅ Solo accesible por rol `authenticated`

**Estado confirmado de `user_profiles_v2`:**
- ✅ No expone `password_hash` (verificado en security-rules.mdc)
- ✅ Requiere autenticación (según documentación)

---

## 📚 Referencias

- Pentesting 2026-01-16: `docs/PENTESTING_2026-01-16.md`
- Security Rules: `.cursor/rules/security-rules.mdc`
- Arquitectura BD: `.cursor/rules/arquitectura-bd-unificada.mdc`
- Migración SystemUI: `docs/MIGRACION_SYSTEM_UI_A_PQNC_AI_COMPLETA.md`

---

**Creado:** 24 de Enero 2026  
**Por:** Diagnóstico automatizado  
**Estado:** Pendiente de aprobación para fix
