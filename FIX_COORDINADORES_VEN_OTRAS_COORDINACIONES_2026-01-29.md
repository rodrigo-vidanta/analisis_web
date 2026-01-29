# Fix: Coordinadores ven prospectos de otras coordinaciones

**Fecha:** 29 de Enero 2026  
**Reportado por:** Usuario (diegobarba@vidavacations.com y oscarhernandez@vidavacations.com)

## Problema

Los coordinadores Diego Barba (APEX) y Oscar Hernández (COB ACA) están viendo prospectos de otras coordinaciones en el side-widget del dashboard.

## Análisis

### Usuarios Afectados

| Usuario | Email | Rol | Coordinación Correcta | `coordinacion_id` en perfil | Estado |
|---------|-------|-----|----------------------|----------------------------|--------|
| Diego Barba | diegobarba@vidavacations.com | coordinador | APEX (`f33742b9-46cf-4716-bf7a-ce129a82bad2`) | **`null`** ❌ | Problema |
| Oscar Hernández | oscarhernandez@vidavacations.com | coordinador | COB ACA (`0008460b-a730-4f0b-ac1b-5aaa5c40f5b0`) | `0008460b-a730-4f0b-ac1b-5aaa5c40f5b0` ✅ | Correcto |

### Causa Raíz

El servicio `permissionsService.getCoordinacionesFilter()` (líneas 677-747 en `src/services/permissionsService.ts`) funciona así:

1. Consulta la tabla `auth_user_coordinaciones` para obtener las coordinaciones del usuario
2. Si hay error o no hay datos, hace **fallback** a `permissions.coordinacion_id` (del perfil de usuario en `auth.users.raw_user_meta_data`)
3. Si `permissions.coordinacion_id` es `null`, retorna `null`
4. **Si retorna `null`, el filtro no se aplica** y el coordinador ve **TODOS** los prospectos

```typescript
// Líneas 724-727 de permissionsService.ts
if (error) {
  console.error(`Error obteniendo coordinaciones del ${permissions.role}:`, error);
  // Fallback: usar coordinacion_id del permiso si existe
  const result = permissions.coordinacion_id ? [permissions.coordinacion_id] : null;
  this.coordinacionesCache.set(userId, { data: result, timestamp: Date.now() });
  return result;
}
```

### Verificación del Problema

```sql
-- Diego Barba: coordinacion_id = null
SELECT 
  id,
  email,
  raw_user_meta_data->>'coordinacion_id' as coordinacion_id
FROM auth.users
WHERE email = 'diegobarba@vidavacations.com';
-- Resultado: null

-- Coordinación asignada en auth_user_coordinaciones
SELECT coordinacion_id FROM auth_user_coordinaciones 
WHERE user_id = '5b8852ef-ae60-4b82-a7aa-bc4f98ee1654';
-- Resultado: f33742b9-46cf-4716-bf7a-ce129a82bad2 (APEX)
```

## Solución

### 1. Actualizar `coordinacion_id` en el metadata del usuario

**Archivo:** `FIX_DIEGO_BARBA_COORDINACION_2026-01-29.sql`

```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{coordinacion_id}',
  '"f33742b9-46cf-4716-bf7a-ce129a82bad2"'::jsonb
)
WHERE email = 'diegobarba@vidavacations.com';
```

### 2. Ejecutar en Supabase SQL Editor

1. Ir a: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new
2. Copiar y pegar el contenido de `FIX_DIEGO_BARBA_COORDINACION_2026-01-29.sql`
3. Ejecutar el script completo
4. Verificar que la actualización fue exitosa

### 3. Limpiar caché del usuario

Después de ejecutar el SQL, el usuario debe:
- **Cerrar sesión**
- **Volver a iniciar sesión**

Esto asegura que el servicio de permisos recargue los datos del usuario desde la base de datos.

## Verificación Post-Fix

1. Diego Barba inicia sesión
2. Va al Dashboard
3. En el side-widget de "Prospectos - Requieren Atención", solo debe ver prospectos de **APEX**
4. NO debe ver prospectos de COB ACA u otras coordinaciones

## Prevención Futura

### Regla de Validación

Agregar una validación en el módulo de gestión de usuarios para asegurar que todos los coordinadores tengan `coordinacion_id` en su perfil:

```typescript
// En UserManagement.tsx, al asignar rol "coordinador"
if (formData.role_name === 'coordinador' && !formData.coordinacion_id) {
  throw new Error('Los coordinadores deben tener una coordinación asignada');
}
```

### Migration Script

Crear un script de migración que sincronice `coordinacion_id` desde `auth_user_coordinaciones` a `auth.users.raw_user_meta_data`:

```sql
-- Sincronizar coordinacion_id para todos los coordinadores
UPDATE auth.users au
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{coordinacion_id}',
  to_jsonb(auc.coordinacion_id)
)
FROM (
  SELECT DISTINCT ON (user_id) user_id, coordinacion_id
  FROM auth_user_coordinaciones
  ORDER BY user_id, assigned_at DESC
) auc
WHERE au.id = auc.user_id
  AND au.raw_user_meta_data->>'role_name' = 'coordinador'
  AND (au.raw_user_meta_data->>'coordinacion_id' IS NULL 
       OR au.raw_user_meta_data->>'coordinacion_id' = 'null');
```

## Archivos Modificados

- `FIX_DIEGO_BARBA_COORDINACION_2026-01-29.sql` (nuevo)
- `FIX_COORDINADORES_VEN_OTRAS_COORDINACIONES_2026-01-29.md` (nuevo)

## Referencias

- **Servicio de Permisos:** `src/services/permissionsService.ts`
- **Widget de Prospectos:** `src/components/dashboard/widgets/ProspectosNuevosWidget.tsx`
- **Tabla de Coordinaciones:** `auth_user_coordinaciones`
- **Tabla de Usuarios:** `auth.users`

---

**Estado:** ⏳ Pendiente de ejecución del SQL  
**Prioridad:** 🔴 Alta (afecta la seguridad de datos - coordinadores ven datos de otras coordinaciones)
