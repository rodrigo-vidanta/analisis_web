# Actualización de Vista user_profiles_v2

**Fecha:** 22 de Enero 2026  
**Estado:** ✅ Completado  
**Propósito:** Agregar campos `department` y `position` a la vista

---

## 🔄 Cambios en la Vista

### Campos Agregados

La vista `user_profiles_v2` ahora incluye:

```sql
COALESCE((au.raw_user_meta_data->>'department')::TEXT, '') as department,
COALESCE((au.raw_user_meta_data->>'position')::TEXT, '') as position,
```

### Script SQL Actualizado

**Ubicación:** `scripts/fix-user-profiles-v2-view.sql`

**Ejecutar en Supabase:**

```sql
-- Actualizar vista con nuevos campos
CREATE OR REPLACE VIEW public.user_profiles_v2 AS
SELECT 
  au.id,
  au.email,
  COALESCE((au.raw_user_meta_data->>'full_name')::TEXT, '') as full_name,
  COALESCE((au.raw_user_meta_data->>'first_name')::TEXT, '') as first_name,
  COALESCE((au.raw_user_meta_data->>'last_name')::TEXT, '') as last_name,
  COALESCE((au.raw_user_meta_data->>'phone')::TEXT, '') as phone,
  COALESCE((au.raw_user_meta_data->>'department')::TEXT, '') as department,  -- ✅ NUEVO
  COALESCE((au.raw_user_meta_data->>'position')::TEXT, '') as position,     -- ✅ NUEVO
  COALESCE((au.raw_user_meta_data->>'organization')::TEXT, 'PQNC') as organization,
  (au.raw_user_meta_data->>'role_id')::UUID as role_id,
  ar.name as role_name,
  ar.display_name as role_display_name,
  (au.raw_user_meta_data->>'coordinacion_id')::UUID as coordinacion_id,
  COALESCE((au.raw_user_meta_data->>'is_active')::BOOLEAN, true) as is_active,
  COALESCE((au.raw_user_meta_data->>'is_operativo')::BOOLEAN, false) as is_operativo,
  COALESCE((au.raw_user_meta_data->>'is_coordinator')::BOOLEAN, ar.name = 'coordinador') as is_coordinator,
  COALESCE((au.raw_user_meta_data->>'is_ejecutivo')::BOOLEAN, ar.name = 'ejecutivo') as is_ejecutivo,
  COALESCE((au.raw_user_meta_data->>'has_backup')::BOOLEAN, false) as has_backup,
  (au.raw_user_meta_data->>'backup_id')::UUID as backup_id,
  COALESCE((au.raw_user_meta_data->>'telefono_original')::TEXT, '') as telefono_original,
  COALESCE((au.raw_user_meta_data->>'id_colaborador')::TEXT, '') as id_colaborador,
  (au.raw_user_meta_data->>'id_dynamics')::TEXT as id_dynamics,
  COALESCE((au.raw_user_meta_data->>'must_change_password')::BOOLEAN, false) as must_change_password,
  COALESCE((au.raw_user_meta_data->>'email_verified')::BOOLEAN, true) as email_verified,
  COALESCE((au.raw_user_meta_data->>'failed_login_attempts')::INTEGER, 0) as failed_login_attempts,
  (au.raw_user_meta_data->>'locked_until')::TIMESTAMPTZ as locked_until,
  (au.raw_user_meta_data->>'legacy_id')::UUID as legacy_id,
  au.created_at,
  au.updated_at,
  au.last_sign_in_at as last_login
FROM auth.users au
LEFT JOIN public.auth_roles ar ON ar.id = (au.raw_user_meta_data->>'role_id')::UUID
WHERE au.deleted_at IS NULL;
```

---

## 📋 Lista Completa de Campos

### Información Personal

| Campo | Tipo | Origen | Descripción |
|-------|------|--------|-------------|
| `id` | UUID | `auth.users.id` | ID del usuario |
| `email` | TEXT | `auth.users.email` | Email principal |
| `full_name` | TEXT | `user_metadata.full_name` | Nombre completo |
| `first_name` | TEXT | `user_metadata.first_name` | Nombre |
| `last_name` | TEXT | `user_metadata.last_name` | Apellido |

### Información de Contacto

| Campo | Tipo | Origen | Descripción |
|-------|------|--------|-------------|
| `phone` | TEXT | `user_metadata.phone` | Teléfono |
| `department` | TEXT | `user_metadata.department` | ✅ Departamento |
| `position` | TEXT | `user_metadata.position` | ✅ Posición/Cargo |

### Información Profesional

| Campo | Tipo | Origen | Descripción |
|-------|------|--------|-------------|
| `organization` | TEXT | `user_metadata.organization` | Organización (default: 'PQNC') |
| `role_id` | UUID | `user_metadata.role_id` | ID del rol |
| `role_name` | TEXT | `auth_roles.name` (JOIN) | Nombre del rol |
| `role_display_name` | TEXT | `auth_roles.display_name` (JOIN) | Nombre display del rol |

### Coordinaciones

| Campo | Tipo | Origen | Descripción |
|-------|------|--------|-------------|
| `coordinacion_id` | UUID | `user_metadata.coordinacion_id` | Coordinación (ejecutivos) |

### Estados y Flags

| Campo | Tipo | Origen | Descripción |
|-------|------|--------|-------------|
| `is_active` | BOOLEAN | `user_metadata.is_active` | Usuario activo |
| `is_operativo` | BOOLEAN | `user_metadata.is_operativo` | Operativo |
| `is_coordinator` | BOOLEAN | `user_metadata.is_coordinator` o rol | Es coordinador |
| `is_ejecutivo` | BOOLEAN | `user_metadata.is_ejecutivo` o rol | Es ejecutivo |

### Backup y Legacy

| Campo | Tipo | Origen | Descripción |
|-------|------|--------|-------------|
| `has_backup` | BOOLEAN | `user_metadata.has_backup` | Tiene backup |
| `backup_id` | UUID | `user_metadata.backup_id` | ID del backup |
| `telefono_original` | TEXT | `user_metadata.telefono_original` | Teléfono original |
| `id_colaborador` | TEXT | `user_metadata.id_colaborador` | ID de colaborador |
| `id_dynamics` | TEXT | `user_metadata.id_dynamics` | ID de Dynamics CRM |
| `legacy_id` | UUID | `user_metadata.legacy_id` | ID de tabla legacy |

### Seguridad

| Campo | Tipo | Origen | Descripción |
|-------|------|--------|-------------|
| `must_change_password` | BOOLEAN | `user_metadata.must_change_password` | Debe cambiar contraseña |
| `email_verified` | BOOLEAN | `user_metadata.email_verified` | Email verificado |
| `failed_login_attempts` | INTEGER | `user_metadata.failed_login_attempts` | Intentos fallidos |
| `locked_until` | TIMESTAMPTZ | `user_metadata.locked_until` | Bloqueado hasta |

### Timestamps

| Campo | Tipo | Origen | Descripción |
|-------|------|--------|-------------|
| `created_at` | TIMESTAMPTZ | `auth.users.created_at` | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | `auth.users.updated_at` | Última actualización |
| `last_login` | TIMESTAMPTZ | `auth.users.last_sign_in_at` | Último login |

---

## 🔄 Flujo de Datos Completo

```
1. Usuario edita/crea en UI
   ↓
2. Frontend llama Edge Function (updateUserMetadata o createUser)
   ↓
3. Edge Function actualiza auth.users.raw_user_meta_data
   ↓
4. Vista user_profiles_v2 lee automáticamente los nuevos valores
   ↓
5. Frontend recarga usuarios y muestra datos actualizados
```

---

## 🧪 Verificación

### 1. Verificar que la vista se actualizó

```sql
-- Verificar estructura de la vista
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles_v2' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

**Debe aparecer:**
- `department` | `text`
- `position` | `text`

### 2. Probar lectura de datos

```sql
-- Leer usuarios con nuevos campos
SELECT 
  id,
  full_name,
  email,
  phone,
  department,
  position,
  role_name
FROM user_profiles_v2
WHERE is_active = true
LIMIT 10;
```

### 3. Probar ciclo completo

1. **Crear usuario** con department='Ventas' y position='Ejecutivo Jr'
2. **Verificar en BD:**
   ```sql
   SELECT 
     raw_user_meta_data->>'department' as department,
     raw_user_meta_data->>'position' as position
   FROM auth.users 
   WHERE email = 'test@example.com';
   ```
3. **Verificar en vista:**
   ```sql
   SELECT department, position 
   FROM user_profiles_v2 
   WHERE email = 'test@example.com';
   ```
4. **Recargar página** y verificar que los campos aparecen en UI

---

## 📝 Archivos Modificados

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `scripts/fix-user-profiles-v2-view.sql` | 36-37 | Agregados campos department y position |
| `scripts/fix-user-profiles-v2-view.sql` | 71-74 | Actualizado comentario de la vista |
| `scripts/fix-user-profiles-v2-view.sql` | 90-92 | Agregados campos a query de test |

---

## ⚠️ Notas Importantes

1. **La vista es de solo lectura**: Solo sirve para consultar datos
2. **Los datos vienen de `auth.users`**: La vista lee automáticamente de `raw_user_meta_data`
3. **Actualizar con Edge Function**: Para modificar, usar `updateUserMetadata`
4. **Permisos**: La vista tiene `GRANT SELECT` para `anon`, `authenticated` y `service_role`

---

## 🔗 Referencias

- [FIX_USER_MANAGEMENT_ARCH_AUTH.md](FIX_USER_MANAGEMENT_ARCH_AUTH.md) - Fix original
- [VALIDACION_CAMPOS_USUARIO.md](VALIDACION_CAMPOS_USUARIO.md) - Validación de campos
- [Edge Function: auth-admin-proxy](../supabase/functions/auth-admin-proxy/index.ts)

---

**Última actualización:** 22 de Enero 2026  
**Autor:** PQNC AI Platform
