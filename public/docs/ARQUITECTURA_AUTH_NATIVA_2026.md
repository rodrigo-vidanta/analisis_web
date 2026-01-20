# 🔐 Arquitectura de Autenticación y Gestión de Usuarios (v2026)

**Fecha:** 20 de Enero, 2026  
**Versión:** v3.5.0  
**Estado:** PRODUCCIÓN ACTIVA  
**Audiencia:** Equipo Backend / DevOps

---

## 🎯 Resumen Ejecutivo
La plataforma ha completado su migración de un sistema de autenticación custom (`public.auth_users`) a la **Autenticación Nativa de Supabase (`auth.users`)**. Este cambio elimina la redundancia de datos, mejora la seguridad (RLS nativo) y centraliza la gestión de sesiones.

---

## 🏗️ Estructura de Datos (Source of Truth)

### 1. Ubicación de Usuarios
Todos los usuarios residen ahora exclusivamente en la tabla interna de Supabase: `auth.users`.

### 2. Atributos y Propiedades (Metadata)
Las propiedades extendidas del usuario ya no están en columnas de una tabla pública, sino dentro de la columna **`raw_user_meta_data` (JSONB)** de `auth.users`.

**Esquema de Metadata:**
```json
{
  "full_name": "Nombre Completo",
  "role_id": "UUID (FK a public.auth_roles)",
  "role_name": "slug_del_rol",
  "id_dynamics": "ID de CRM Dynamics (CRÍTICO)",
  "is_operativo": "boolean",
  "is_active": "boolean",
  "phone": "string",
  "coordinacion_id": "UUID",
  "created_via": "auth-admin-proxy",
  "password_changed_at": "ISO-8601"
}
```

### 3. Reglas de Negocio Críticas
*   **ID Dynamics:** Es obligatorio para que un usuario sea marcado como `is_operativo`.
*   **Sincronización:** No existe "dual-write". Si un proceso externo necesita actualizar un usuario, debe hacerlo sobre `auth.users` o vía el `auth-admin-proxy`.

---

## 🔍 Capas de Acceso (Vistas de Compatibilidad)

Para no romper el código existente y facilitar la lectura desde el frontend/backend, se han creado dos vistas principales en el esquema `public`:

1.  **`public.user_profiles_v2`**: 
    *   **Uso:** Lectura principal del sistema.
    *   **Función:** Mapea el JSONB de `raw_user_meta_data` a columnas planas.
    *   **Seguridad:** RLS habilitado (revocado acceso a `anon`, permitido a `authenticated`).

2.  **`public.auth_users_compat`** (Anteriormente `auth_users`):
    *   **Uso:** Compatibilidad con queries legacy.
    *   **Función:** Emula la estructura de la tabla vieja `auth_users` pero lee datos en tiempo real de `auth.users`.

---

## 🛡️ Gestión de Permisos y Roles

### Roles
Los roles siguen definidos en `public.auth_roles`, pero la vinculación es vía `auth.users.raw_user_meta_data.role_id`.

### Grupos de Permisos
La tabla `public.user_permission_groups` ha sido migrada:
*   **FK de `user_id`**: Ahora apunta directamente a `auth.users(id)`.
*   **Asignación**: Se gestiona vía el Edge Function `auth-admin-proxy` (operaciones `assignUserToGroup` / `removeUserFromGroup`).

---

## ⚡ Edge Functions (API Administrativa)

El control de usuarios se centraliza en la Edge Function **`auth-admin-proxy`**. Esta función utiliza el `service_role` key internamente para bypass de RLS y gestión administrativa.

### Operaciones Disponibles:

| Operación | Parámetros Clave | Descripción |
|-----------|-----------------|-------------|
| `createUser` | `email`, `password`, `metadata` | Crea usuario nativo, confirma email y setea metadata inicial. |
| `updateUserMetadata` | `userId`, `metadata` | Actualiza propiedades en el JSONB (respeta regla `id_dynamics`). |
| `changePassword` | `userId`, `newPassword` | Cambia contraseña respetando política de complejidad (8+ char, Mayús, Minús, Especial). |
| `deleteUser` | `userId`, `softDelete` | `softDelete=true` marca como inactivo. `false` elimina de `auth.users`. |
| `assignUserToGroup` | `userId`, `groupId` | Vincula usuario a grupo de permisos. |

---

## ⚠️ Notas para Integraciones Backend

1.  **Tablas Legacy:** La tabla `public.auth_users` ha sido renombrada a `public.z_legacy_auth_users`. **NO DEBE USARSE**.
2.  **Actualizaciones Masivas:** Si el equipo de backend necesita actualizar atributos masivamente, se recomienda un script SQL que use `auth.admin_update_user` o actualice directamente `auth.users` (usando el key `service_role`).
3.  **Búsqueda de Usuarios:** Siempre usar `public.user_profiles_v2` para consultas `SELECT`.

---

## 🛠️ Comandos de Verificación (SQL)

**Verificar Foreign Keys activas:**
```sql
SELECT table_name, constraint_name 
FROM information_schema.constraint_column_usage 
WHERE table_name = 'users' AND table_schema = 'auth';
```

**Consultar Metadata de un usuario:**
```sql
SELECT email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'usuario@ejemplo.com';
```

---
**AI Assistant - PQNC QA AI Platform**  
*Documentación generada tras el despliegue exitoso de la v2.5.24/25.*
