# 🐛 Bug: Llamadas Programadas No Se Muestran

**Fecha:** 22 de Enero 2026  
**Reportado por:** Usuario  
**Estado:** ✅ IDENTIFICADO  
**Prioridad:** ALTA

---

## 📊 Resumen Ejecutivo

El módulo de programación de llamadas no muestra las llamadas después del refactor de autenticación a `auth.users` nativo (20-Ene-2026).

---

## 🔍 Diagnóstico

### Datos Verificados en BD (glsmifhkoaifvaegsozd)

✅ **Hay 2 llamadas programadas para hoy (22-Ene-2026)**:

| ID | Prospecto | Ejecutivo | Hora |
|----|-----------|-----------|------|
| `453dc2f8...` | Adriana Licona Mendiola | Diego Barba (`5b8852ef...`) | 16:00 UTC |
| `ba6e943d...` | Myriam Valenzuela Neriz | Irving Aquino (`2513037a...`) | 16:00 UTC |

✅ **La vista `user_profiles_v2` existe** y tiene 114 usuarios activos

✅ **Los ejecutivos existen** en `user_profiles_v2` y `auth.users`

✅ **Permisos correctos**: `anon` y `authenticated` tienen `SELECT` en `user_profiles_v2`

---

## 🎯 Causa Raíz del Problema

### Problema #1: Coordinación Faltante

**Ejecutivo: Diego Barba** (`5b8852ef-ae60-4b82-a7aa-bc4f98ee1654`)
- Rol: `coordinador`
- `coordinacion_id` en `user_profiles_v2`: **NULL** ❌
- Prospecto asignado: Adriana Licona (coordinación: `f33742b9...`)

```sql
-- Verificación
SELECT 
  id, 
  full_name, 
  role_name, 
  coordinacion_id 
FROM user_profiles_v2 
WHERE id = '5b8852ef-ae60-4b82-a7aa-bc4f98ee1654';

-- Resultado:
-- coordinacion_id: NULL
```

**Impacto:**  
El código en `permissionsService.canUserAccessProspect()` (línea 296-304) requiere que el `ejecutivo.coordinacion_id` coincida con `prospecto.coordinacion_id` para permitir acceso cuando no hay asignación en `prospect_assignments`.

Como Diego no tiene `coordinacion_id` en su metadata de `auth.users`, la verificación falla:

```typescript
// Línea 296 de permissionsService.ts
const sameCoordinacion = userCoordinaciones 
  ? userCoordinaciones.includes(prospectoData.coordinacion_id) 
  : false;

// userCoordinaciones es [] porque coordinacion_id es null
// sameCoordinacion = false
// canAccess = false ❌
```

### Problema #2: Lógica de Filtrado Muy Restrictiva

En `scheduledCallsService.ts`, líneas 168-201, hay un **fallback** que debería permitir acceso si `prospecto.ejecutivo_id` coincide con el usuario, pero este fallback **también está fallando** porque:

1. Primero llama a `permissionsService.canUserAccessProspect()`
2. Esta función retorna `canAccess: false` (por el problema de coordinación)
3. El fallback verifica `prospecto.ejecutivo_id === userId`
4. Pero para usuarios sin coordinación, esto no es suficiente

---

## 🔧 Solución Propuesta

### Opción 1: Actualizar Metadata de Usuarios (RECOMENDADO)

Asegurar que **todos los ejecutivos y coordinadores** tengan `coordinacion_id` en `auth.users.raw_user_meta_data`:

```sql
-- 1. Identificar usuarios sin coordinacion_id
SELECT 
  au.id,
  au.email,
  (au.raw_user_meta_data->>'full_name')::TEXT as full_name,
  ar.name as role_name,
  (au.raw_user_meta_data->>'coordinacion_id')::UUID as coordinacion_id,
  auc.coordinacion_id as coordinacion_from_table
FROM auth.users au
LEFT JOIN auth_roles ar ON ar.id = (au.raw_user_meta_data->>'role_id')::UUID
LEFT JOIN auth_user_coordinaciones auc ON auc.user_id = au.id
WHERE ar.name IN ('ejecutivo', 'coordinador')
  AND (au.raw_user_meta_data->>'coordinacion_id') IS NULL
  AND auc.coordinacion_id IS NOT NULL
ORDER BY ar.name, au.email;

-- 2. Actualizar metadata con coordinacion_id desde auth_user_coordinaciones
-- NOTA: Esto requiere una Edge Function o script con service_role
-- NO se puede hacer directamente desde frontend por seguridad
```

**Archivo de script:** `scripts/fix-user-coordinacion-metadata.sql`

### Opción 2: Modificar Lógica de Permisos

Cambiar `permissionsService.canUserAccessProspect()` para que **NO requiera coincidencia de coordinación** si el `ejecutivo_id` coincide:

```typescript
// Línea 294-304 de permissionsService.ts
// ANTES:
if (userEjecutivoIdStr && prospectEjecutivoIdStr === userEjecutivoIdStr) {
  const sameCoordinacion = userCoordinaciones 
    ? userCoordinaciones.includes(prospectoData.coordinacion_id) 
    : false;
  
  if (sameCoordinacion) {
    return {
      canAccess: true,
      reason: 'El prospecto está asignado a ti en la tabla prospectos',
    };
  }
}

// DESPUÉS:
if (userEjecutivoIdStr && prospectEjecutivoIdStr === userEjecutivoIdStr) {
  // Permitir acceso si el ejecutivo_id coincide, sin importar coordinación
  // Esto es necesario después del refactor a auth.users donde algunos
  // usuarios no tienen coordinacion_id en metadata
  return {
    canAccess: true,
    reason: 'El prospecto está asignado a ti en la tabla prospectos',
  };
}
```

**Archivo de cambio:** `src/services/permissionsService.ts`

---

## 🎯 Recomendación

**Implementar OPCIÓN 1** (actualizar metadata) porque:

✅ Corrige el problema de raíz (datos faltantes)  
✅ Mejora la consistencia de datos  
✅ No modifica lógica de permisos (menos riesgo)  
✅ Permite que futuras validaciones funcionen correctamente

**Y también OPCIÓN 2** como backup para casos edge donde la coordinación no sea crítica.

---

## 📋 Pasos para Resolver

1. **Verificar usuarios sin coordinacion_id** (query arriba)
2. **Crear script SQL** para actualizar metadata (`scripts/fix-user-coordinacion-metadata.sql`)
3. **Ejecutar vía Edge Function** o Supabase Dashboard
4. **Modificar `permissionsService.ts`** para hacer la verificación de coordinación opcional
5. **Probar módulo de programación**
6. **Documentar en CHANGELOG**

---

## 🧪 Testing

Después de aplicar la solución:

```bash
# 1. Verificar que usuarios tengan coordinacion_id
curl -X POST "https://api.supabase.com/v1/projects/glsmifhkoaifvaegsozd/database/query" \
  -H "Authorization: Bearer <token>" \
  -d '{"query": "SELECT id, full_name, coordinacion_id FROM user_profiles_v2 WHERE id = '\''5b8852ef-ae60-4b82-a7aa-bc4f98ee1654'\''"}'

# 2. Login como ejecutivo y verificar módulo de programación
# Debe mostrar las 2 llamadas de hoy
```

---

## 📚 Referencias

- [Migración auth.users Nativo](MIGRACION_AUTH_USERS_NATIVO_2026-01-20.md)
- [Arquitectura de Seguridad](ARQUITECTURA_SEGURIDAD_2026.md)
- [scheduledCallsService.ts](../src/services/scheduledCallsService.ts) (líneas 168-201)
- [permissionsService.ts](../src/services/permissionsService.ts) (líneas 225-375)

---

**Última actualización:** 22 de Enero 2026  
**Estado:** Pendiente de implementar solución
