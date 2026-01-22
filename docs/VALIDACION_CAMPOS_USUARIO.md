# Validación Completa de Campos de Usuario

**Fecha:** 22 de Enero 2026  
**Estado:** ✅ Completado  
**Módulo:** Administración > Usuarios (Creación y Edición)

---

## 📋 Campos del Formulario

### Información Personal

| Campo | FormData Key | Se Guarda | Ubicación | Notas |
|-------|-------------|-----------|-----------|-------|
| **Email** | `email` | ✅ | `auth.users.email` | Campo especial (no en metadata) |
| **Contraseña** | `password` | ✅ | `auth.users.encrypted_password` | Solo en creación/cambio |
| **Nombre** | `first_name` | ✅ | `user_metadata.first_name` | ✅ Corregido |
| **Apellido** | `last_name` | ✅ | `user_metadata.last_name` | ✅ Corregido |
| **Nombre Completo** | `full_name` (calculado) | ✅ | `user_metadata.full_name` | Generado automáticamente |

### Información Profesional

| Campo | FormData Key | Se Guarda | Ubicación | Notas |
|-------|-------------|-----------|-----------|-------|
| **Teléfono** | `phone` | ✅ | `user_metadata.phone` | ✅ Corregido |
| **Departamento** | `department` | ✅ | `user_metadata.department` | ✅ **NUEVO** - Agregado |
| **Posición** | `position` | ✅ | `user_metadata.position` | ✅ **NUEVO** - Agregado |

### Roles y Permisos

| Campo | FormData Key | Se Guarda | Ubicación | Notas |
|-------|-------------|-----------|-----------|-------|
| **Rol** | `role_id` | ✅ | `user_metadata.role_id` | ✅ Corregido |
| **Grupo de Permisos** | `selectedGroupId` | ✅ | Tabla `user_permission_groups` | Relación externa |

### Coordinaciones

| Campo | FormData Key | Se Guarda | Ubicación | Notas |
|-------|-------------|-----------|-----------|-------|
| **Coordinación (Ejecutivo)** | `coordinacion_id` | ✅ | `user_metadata.coordinacion_id` | Una sola |
| **Coordinaciones (Coordinador)** | `coordinaciones_ids` | ✅ | Tabla `auth_user_coordinaciones` | Múltiples |

### Estados y Flags

| Campo | FormData Key | Se Guarda | Ubicación | Notas |
|-------|-------------|-----------|-----------|-------|
| **Usuario Activo** | `is_active` | ✅ | `user_metadata.is_active` | ✅ Corregido |
| **Operativo** | `is_operativo` | ✅ | `user_metadata.is_operativo` | ✅ Corregido |
| **Es Coordinador** | `is_coordinator` | ✅ | `user_metadata.is_coordinator` | Auto-calculado |
| **Es Ejecutivo** | `is_ejecutivo` | ✅ | `user_metadata.is_ejecutivo` | Auto-calculado |

### Subpermisos (Solo Evaluadores)

| Campo | FormData Key | Se Guarda | Ubicación | Notas |
|-------|-------------|-----------|-----------|-------|
| **Fuentes de Análisis** | `analysis_sources` | ✅ | Tabla `user_analysis_permissions` | ['natalia', 'pqnc', 'live_monitor'] |

### Campos NO Editables (Solo Lectura)

| Campo | Ubicación | Notas |
|-------|-----------|-------|
| **ID Dynamics** | `user_metadata.id_dynamics` | Solo visible, no editable desde UI |
| **Organization** | `user_metadata.organization` | Hardcoded: 'PQNC' |
| **Inbound** | `user_metadata.inbound` | No visible en UI actual |
| **Email Verified** | `auth.users.email_confirmed_at` | Sistema |
| **Last Login** | `user_metadata.last_login` | Sistema |
| **Created At** | `auth.users.created_at` | Sistema |
| **Avatar URL** | `user_metadata.avatar_url` | Manejado por storage separado |

---

## ✅ Cambios Implementados

### 1. UserManagement.tsx - Edición de Usuario (línea ~1130)

**ANTES:**
```typescript
const metadata: any = {
  first_name: formData.first_name.trim(),
  last_name: formData.last_name.trim(),
  full_name: fullName,
  phone: formData.phone?.trim() || null,
  role_id: formData.role_id,
  is_active: formData.is_active,
  is_operativo: formData.is_operativo,
};
```

**DESPUÉS:**
```typescript
const metadata: any = {
  first_name: formData.first_name.trim(),
  last_name: formData.last_name.trim(),
  full_name: fullName,
  phone: formData.phone?.trim() || null,
  department: formData.department?.trim() || null, // ✅ NUEVO
  position: formData.position?.trim() || null,      // ✅ NUEVO
  role_id: formData.role_id,
  is_active: formData.is_active,
  is_operativo: formData.is_operativo,
};
```

### 2. UserManagement.tsx - Creación de Usuario (línea ~812)

**ANTES:**
```typescript
params: {
  email: formData.email.trim().toLowerCase(),
  password: formData.password,
  fullName,
  roleId: formData.role_id,
  phone: formData.phone || null,
  isActive: formData.is_active,
  isCoordinator: selectedRole?.name === 'coordinador',
  isEjecutivo: selectedRole?.name === 'ejecutivo',
  coordinacionId: formData.coordinacion_id || null
}
```

**DESPUÉS:**
```typescript
params: {
  email: formData.email.trim().toLowerCase(),
  password: formData.password,
  fullName,
  roleId: formData.role_id,
  phone: formData.phone || null,
  department: formData.department?.trim() || null,  // ✅ NUEVO
  position: formData.position?.trim() || null,      // ✅ NUEVO
  isActive: formData.is_active,
  isCoordinator: selectedRole?.name === 'coordinador',
  isEjecutivo: selectedRole?.name === 'ejecutivo',
  coordinacionId: formData.coordinacion_id || null
}
```

### 3. Edge Function auth-admin-proxy - createUser (línea ~553)

**ANTES:**
```typescript
case 'createUser': {
  const { 
    email, 
    password, 
    fullName, 
    roleId, 
    phone,
    idDynamics = null,
    isActive = true,
    isOperativo = false,
    isCoordinator = false,
    isEjecutivo = false,
    inbound = false,
    coordinacionId = null
  } = params
```

**DESPUÉS:**
```typescript
case 'createUser': {
  const { 
    email, 
    password, 
    fullName, 
    roleId, 
    phone,
    department = null,  // ✅ NUEVO
    position = null,    // ✅ NUEVO
    idDynamics = null,
    isActive = true,
    isOperativo = false,
    isCoordinator = false,
    isEjecutivo = false,
    inbound = false,
    coordinacionId = null
  } = params
```

### 4. Edge Function auth-admin-proxy - user_metadata (línea ~618)

**ANTES:**
```typescript
user_metadata: {
  full_name: fullName || email.split('@')[0],
  first_name: fullName?.split(' ')[0] || email.split('@')[0],
  last_name: fullName?.split(' ').slice(1).join(' ') || '',
  role_id: roleId || null,
  role_name: roleName,
  phone: phone || null,
  id_dynamics: idDynamics || null,
  is_active: isActive,
  is_operativo: finalIsOperativo,
  is_coordinator: isCoordinator || roleName === 'coordinador',
  is_ejecutivo: isEjecutivo || roleName === 'ejecutivo',
  inbound: inbound,
  coordinacion_id: coordinacionId,
  created_via: 'auth-admin-proxy',
  created_at: new Date().toISOString()
}
```

**DESPUÉS:**
```typescript
user_metadata: {
  full_name: fullName || email.split('@')[0],
  first_name: fullName?.split(' ')[0] || email.split('@')[0],
  last_name: fullName?.split(' ').slice(1).join(' ') || '',
  role_id: roleId || null,
  role_name: roleName,
  phone: phone || null,
  department: department || null,    // ✅ NUEVO
  position: position || null,         // ✅ NUEVO
  id_dynamics: idDynamics || null,
  is_active: isActive,
  is_operativo: finalIsOperativo,
  is_coordinator: isCoordinator || roleName === 'coordinador',
  is_ejecutivo: isEjecutivo || roleName === 'ejecutivo',
  inbound: inbound,
  coordinacion_id: coordinacionId,
  created_via: 'auth-admin-proxy',
  created_at: new Date().toISOString()
}
```

---

## 🔍 Flujo de Guardado Completo

### Crear Usuario

```
1. Usuario llena formulario con todos los campos
2. Frontend llama Edge Function auth-admin-proxy (operation: createUser)
3. Edge Function crea usuario en auth.users con todos los campos en user_metadata
4. Si es coordinador → Insertar relaciones en auth_user_coordinaciones
5. Si es evaluador → Insertar permisos en user_analysis_permissions
6. Si tiene avatar → Subir a storage y guardar URL
7. ✅ Usuario creado con TODOS los campos
```

### Editar Usuario

```
1. Usuario modifica campos en modal de edición
2. Frontend llama Edge Function auth-admin-proxy (operation: updateUserMetadata)
3. Edge Function actualiza user_metadata en auth.users
4. Si cambió email → Llamar Edge Function (operation: updateUserEmail)
5. Si cambió rol a coordinador → Actualizar flags + insertar en auth_user_coordinaciones
6. Si cambió rol a ejecutivo → Actualizar flags + limpiar auth_user_coordinaciones
7. Si cambió grupo de permisos → Actualizar user_permission_groups
8. ✅ Usuario actualizado con TODOS los campos
```

---

## 🧪 Pruebas de Validación

### 1. Crear Usuario con Todos los Campos

```typescript
// Datos de prueba
{
  email: 'test@example.com',
  password: 'Test1234!',
  first_name: 'Juan',
  last_name: 'Pérez',
  phone: '+525512345678',
  department: 'Ventas',      // ✅ Nuevo
  position: 'Ejecutivo Jr',   // ✅ Nuevo
  role_id: '<ejecutivo_role_id>',
  coordinacion_id: '<coordinacion_id>',
  is_active: true,
  is_operativo: true
}
```

**Verificar en BD:**
```sql
SELECT 
  id,
  email,
  raw_user_meta_data->>'first_name' as first_name,
  raw_user_meta_data->>'last_name' as last_name,
  raw_user_meta_data->>'phone' as phone,
  raw_user_meta_data->>'department' as department,     -- ✅ Debe aparecer
  raw_user_meta_data->>'position' as position,         -- ✅ Debe aparecer
  raw_user_meta_data->>'role_id' as role_id,
  raw_user_meta_data->>'is_active' as is_active,
  raw_user_meta_data->>'is_operativo' as is_operativo
FROM auth.users 
WHERE email = 'test@example.com';
```

### 2. Editar Departamento y Posición

1. Editar usuario existente
2. Cambiar "Departamento" a "Marketing"
3. Cambiar "Posición" a "Coordinador Sr"
4. Guardar
5. Recargar página
6. Verificar que los cambios persisten

**Verificar en BD:**
```sql
SELECT 
  raw_user_meta_data->>'department' as department,
  raw_user_meta_data->>'position' as position
FROM auth.users 
WHERE email = 'test@example.com';
-- Debe mostrar: department='Marketing', position='Coordinador Sr'
```

### 3. Editar Solo Teléfono (Regresión Test)

1. Editar usuario
2. Cambiar solo el teléfono
3. Guardar
4. Verificar que el teléfono se guardó correctamente
5. Verificar que los demás campos NO cambiaron

---

## 📊 Resumen de Correcciones

| Problema | Estado | Fix |
|---------|--------|-----|
| Teléfono no se guardaba | ✅ Resuelto | Usar Edge Function updateUserMetadata |
| Department no se guardaba | ✅ Resuelto | Agregado a metadata en creación y edición |
| Position no se guardaba | ✅ Resuelto | Agregado a metadata en creación y edición |
| Email no se actualizaba | ✅ Resuelto | Nueva operación updateUserEmail |
| Flags de coordinador/ejecutivo no se guardaban | ✅ Resuelto | Usar updateUserMetadata para flags |
| Vista user_profiles_v2 es solo lectura | ✅ Resuelto | NUNCA actualizar vistas, usar Edge Functions |

---

## ⚠️ Notas Importantes

1. **Todos los campos van a `user_metadata`**: Excepto `email` que es campo directo de `auth.users`
2. **NUNCA actualizar vistas**: `user_profiles_v2` es solo lectura
3. **SIEMPRE usar Edge Functions**: Para operaciones en `auth.users`
4. **Validar campos vacíos**: Usar `?.trim() || null` para evitar strings vacíos

---

## 📚 Archivos Modificados

1. `src/components/admin/UserManagement.tsx` (líneas ~812, ~1130)
2. `supabase/functions/auth-admin-proxy/index.ts` (líneas ~553, ~618)
3. `docs/FIX_USER_MANAGEMENT_ARCH_AUTH.md` (documentación original)
4. `docs/VALIDACION_CAMPOS_USUARIO.md` (este documento)

---

**Última actualización:** 22 de Enero 2026  
**Autor:** PQNC AI Platform
