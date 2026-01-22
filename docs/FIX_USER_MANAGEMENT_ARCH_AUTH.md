# Fix: Actualización de Usuarios en Arquitectura Auth Nativa

**Fecha:** 22 de Enero 2026  
**Estado:** ✅ Completado  
**Afectado:** Módulo de Administración > Usuarios

---

## 🐛 Problema Detectado

Al editar usuarios en el módulo de administración, los cambios (como teléfono) **no se persistían** en la base de datos.

### Causa Raíz

El código intentaba actualizar directamente la vista `user_profiles_v2`, que es de **solo lectura**:

```typescript
// ❌ INCORRECTO - Vista de solo lectura
const { error } = await supabaseSystemUI
  .from('user_profiles_v2')
  .update(updateData)
  .eq('id', selectedUser.id);
```

La vista `user_profiles_v2` **lee** desde `auth.users` (Supabase Auth nativo), pero no permite escrituras.

---

## ✅ Solución Implementada

### 1. Actualización de Metadatos de Usuario

Ahora se usa la Edge Function `auth-admin-proxy` con la operación `updateUserMetadata`:

```typescript
// ✅ CORRECTO - Usar Edge Function
const response = await fetch(`${edgeFunctionsUrl}/functions/v1/auth-admin-proxy`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${anonKey}`,
  },
  body: JSON.stringify({
    operation: 'updateUserMetadata',
    params: {
      userId: selectedUser.id,
      metadata: {
        first_name: 'Juan',
        last_name: 'Pérez',
        full_name: 'Juan Pérez',
        phone: '+525512345678', // ✅ Ahora se guarda correctamente
        role_id: 'abc123',
        is_active: true,
        is_operativo: false
      }
    }
  })
});
```

### 2. Nueva Operación: `updateUserEmail`

Creada en la Edge Function para actualizar el email (campo especial en Supabase Auth):

```typescript
// ✅ Nueva operación
case 'updateUserEmail': {
  const { userId, email } = params
  const normalizedEmail = email.trim().toLowerCase()
  
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    email: normalizedEmail
  })
  
  if (error) throw error
  
  result = { success: true, userId, email: normalizedEmail }
  break
}
```

### 3. Actualización de Flags de Coordinador/Ejecutivo

Los flags `is_coordinator`, `is_ejecutivo`, `coordinacion_id` también se actualizan vía Edge Function:

```typescript
// ✅ CORRECTO - Para coordinadores
const response = await fetch(`${edgeFunctionsUrl}/functions/v1/auth-admin-proxy`, {
  method: 'POST',
  body: JSON.stringify({
    operation: 'updateUserMetadata',
    params: {
      userId: selectedUser.id,
      metadata: {
        is_coordinator: true,
        is_ejecutivo: false,
        coordinacion_id: null
      }
    }
  })
});
```

---

## 📝 Archivos Modificados

### 1. `src/components/admin/UserManagement.tsx`

**Cambios principales:**

| Líneas | Cambio | Descripción |
|-----|-----|-----|
| 1120-1202 | ✅ Refactorizado | Usa `updateUserMetadata` en lugar de UPDATE directo |
| 1135-1157 | ✅ Nuevo | Usa `updateUserEmail` para cambios de email |
| 1242-1266 | ✅ Refactorizado | Flags de coordinador vía Edge Function |
| 1293-1335 | ✅ Refactorizado | Flags de ejecutivo vía Edge Function |
| 1346-1368 | ✅ Refactorizado | Limpieza de flags vía Edge Function |

### 2. `supabase/functions/auth-admin-proxy/index.ts`

**Cambios principales:**

| Líneas | Cambio | Descripción |
|-----|-----|-----|
| 63-80 | ✅ Agregado | `updateUserEmail` en `ALLOWED_OPERATIONS` |
| 720-771 | ✅ Nuevo | Case `updateUserEmail` |

---

## 🔍 Verificación de Cambios

### Antes (Problema)

```typescript
// Intentaba UPDATE directo a vista de solo lectura
await supabaseSystemUI.from('user_profiles_v2').update({...})
// ❌ Error: Cannot update view user_profiles_v2
```

### Después (Solución)

```typescript
// Usa Edge Function que actualiza auth.users correctamente
await fetch('/functions/v1/auth-admin-proxy', {
  body: JSON.stringify({
    operation: 'updateUserMetadata',
    params: { userId, metadata: {...} }
  })
})
// ✅ Se persiste en auth.users (Supabase Auth nativo)
```

---

## 🧪 Pruebas a Realizar

### 1. Editar Teléfono de Usuario

1. Admin > Usuarios > Editar usuario
2. Cambiar campo "Teléfono"
3. Guardar
4. Verificar en BD: `SELECT phone FROM auth.users WHERE id = '<user_id>'`
5. Recargar página y verificar que el teléfono se mantiene

### 2. Cambiar Email de Usuario (Admin)

1. Admin > Usuarios > Editar usuario (como Admin)
2. Cambiar email
3. Guardar
4. Verificar en BD: `SELECT email FROM auth.users WHERE id = '<user_id>'`
5. Verificar login con nuevo email

### 3. Cambiar Rol de Coordinador a Ejecutivo

1. Admin > Usuarios > Editar coordinador
2. Cambiar rol a "Ejecutivo"
3. Asignar coordinación
4. Guardar
5. Verificar flags en BD:
   ```sql
   SELECT 
     raw_user_meta_data->>'is_coordinator' as is_coordinator,
     raw_user_meta_data->>'is_ejecutivo' as is_ejecutivo,
     raw_user_meta_data->>'coordinacion_id' as coordinacion_id
   FROM auth.users 
   WHERE id = '<user_id>';
   ```

---

## 📊 Arquitectura de Auth (Referencia)

### Flujo de Actualización

```
Frontend (UserManagement.tsx)
    ↓
Edge Function (auth-admin-proxy)
    ↓
Supabase Auth Admin API
    ↓
auth.users (PostgreSQL)
    ↓
user_profiles_v2 (Vista automática)
    ↓
Frontend (lectura)
```

### Campos en auth.users

| Campo | Tipo | Ubicación | Ejemplo |
|-------|------|-----------|---------|
| `id` | UUID | Directo | `550e8400-e29b-41d4-a716-446655440000` |
| `email` | TEXT | Directo | `juan.perez@example.com` |
| `phone` | TEXT | `user_metadata` | `+525512345678` |
| `first_name` | TEXT | `user_metadata` | `Juan` |
| `last_name` | TEXT | `user_metadata` | `Pérez` |
| `full_name` | TEXT | `user_metadata` | `Juan Pérez` |
| `role_id` | UUID | `user_metadata` | `abc-123-def` |
| `is_active` | BOOLEAN | `user_metadata` | `true` |
| `is_operativo` | BOOLEAN | `user_metadata` | `false` |
| `is_coordinator` | BOOLEAN | `user_metadata` | `false` |
| `is_ejecutivo` | BOOLEAN | `user_metadata` | `true` |
| `coordinacion_id` | UUID | `user_metadata` | `xyz-789-abc` |

---

## 📚 Referencias

- [Arquitectura BD Unificada](.cursor/rules/arquitectura-bd-unificada.mdc)
- [Security Rules](.cursor/rules/security-rules.mdc)
- [Edge Function: auth-admin-proxy](../supabase/functions/auth-admin-proxy/index.ts)
- [Supabase Auth Admin API](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid)

---

## ⚠️ Notas Importantes

1. **NO usar clientes `*Admin`**: Los clientes admin fueron eliminados del codebase
2. **NO actualizar vistas directamente**: `user_profiles_v2` es de solo lectura
3. **SIEMPRE usar Edge Functions**: Para operaciones en `auth.users`
4. **Email es campo especial**: Requiere `updateUserEmail` (no en metadata)

---

**Última actualización:** 22 de Enero 2026  
**Autor:** PQNC AI Platform
