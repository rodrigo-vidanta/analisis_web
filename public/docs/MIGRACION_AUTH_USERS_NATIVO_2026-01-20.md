# Migración a auth.users Nativo de Supabase

**Fecha:** 2026-01-20  
**Estado:** ✅ COMPLETADA  
**Downtime:** 0 (migración atómica)

---

## Resumen Ejecutivo

Se completó la migración de la tabla legacy `auth_users` a `auth.users` nativo de Supabase Auth. Todas las Foreign Keys (31 en total) ahora apuntan a `auth.users`.

---

## Antes de la Migración

```
┌─────────────────────────────────────────────────────┐
│  ARQUITECTURA LEGACY (pre 2026-01-20)               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  public.auth_users  ←──┬── user_permission_groups   │
│  (tabla custom)        ├── auth_user_coordinaciones │
│                        ├── assignment_logs          │
│                        ├── auth_login_logs          │
│                        ├── prospect_assignments     │
│                        └── ... (25 tablas más)      │
│                                                     │
│  auth.users (Supabase nativo)                       │
│  └── Solo para autenticación                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Problemas:**
- Datos duplicados entre `auth_users` y `auth.users`
- Riesgo de desincronización
- `password_hash` expuesto en tabla custom
- Complejidad de mantenimiento

---

## Después de la Migración

```
┌─────────────────────────────────────────────────────┐
│  ARQUITECTURA NATIVA (2026-01-20+)                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  auth.users (Supabase nativo)                       │
│  ├── raw_user_meta_data (perfil de usuario)         │
│  │   ├── full_name                                  │
│  │   ├── role_id, role_name                         │
│  │   ├── id_dynamics                                │
│  │   ├── is_operativo, is_active                    │
│  │   ├── coordinacion_id                            │
│  │   └── ...                                        │
│  │                                                  │
│  ├── user_permission_groups    (FK → auth.users)    │
│  ├── auth_user_coordinaciones  (FK → auth.users)    │
│  ├── assignment_logs           (FK → auth.users)    │
│  ├── auth_login_logs           (FK → auth.users)    │
│  ├── prospect_assignments      (FK → auth.users)    │
│  └── ... (31 FKs total)                             │
│                                                     │
│  user_profiles_v2 (VIEW)                            │
│  └── Lee de auth.users + auth_roles                 │
│                                                     │
│  z_legacy_auth_users (BACKUP)                       │
│  └── Tabla legacy renombrada (no usar)              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Beneficios:**
- ✅ Fuente única de verdad (`auth.users`)
- ✅ Sin duplicación de datos
- ✅ `password_hash` manejado por Supabase (seguro)
- ✅ Autenticación JWT nativa
- ✅ RLS con `auth.uid()`

---

## Cambios Realizados

### 1. Foreign Keys Migradas (25 constraints)

| Tabla | Columna | Antes | Después |
|-------|---------|-------|---------|
| user_permission_groups | user_id | auth_users | auth.users |
| user_permission_groups | assigned_by | auth_users | auth.users |
| auth_user_permissions | user_id | auth_users | auth.users |
| auth_user_permissions | granted_by | auth_users | auth.users |
| auth_user_coordinaciones | user_id | auth_users | auth.users |
| auth_user_coordinaciones | assigned_by | auth_users | auth.users |
| assignment_logs | ejecutivo_id | auth_users | auth.users |
| assignment_logs | assigned_by | auth_users | auth.users |
| prospect_assignments | ejecutivo_id | auth_users | auth.users |
| prospect_assignments | assigned_by | auth_users | auth.users |
| auth_login_logs | user_id | auth_users | auth.users |
| permission_groups | created_by | auth_users | auth.users |
| permission_groups | updated_by | auth_users | auth.users |
| group_audit_log | user_id | auth_users | auth.users |
| group_audit_log | performed_by | auth_users | auth.users |
| timeline_activities | user_id | auth_users | auth.users |
| coordinacion_statistics | ejecutivo_id | auth_users | auth.users |
| user_avatars | user_id | auth_users | auth.users |
| user_ui_preferences | user_id | auth_users | auth.users |
| user_warning_counters | user_id | auth_users | auth.users |
| paraphrase_logs | user_id | auth_users | auth.users |
| ai_token_limits | user_id | auth_users | auth.users |
| whatsapp_conversation_labels | added_by | auth_users | auth.users |
| whatsapp_labels_custom | user_id | auth_users | auth.users |
| log_server_config | updated_by | auth_users | auth.users |

### 2. Edge Function auth-admin-proxy

**Operaciones migradas a auth.users nativo:**
- `updateLastLogin` → `auth.admin.updateUserById()`
- `getUserById` → `auth.admin.getUserById()`
- `updateUserField` → `auth.admin.updateUserById()`
- `getExecutivesWithBackup` → `user_profiles_v2` (view)
- `updateIsOperativo` → `auth.admin.updateUserById()`
- `resetFailedAttempts` → `auth.admin.updateUserById()`
- `verifyPassword` → `auth.signInWithPassword()`
- `changePassword` → `auth.admin.updateUserById()`
- `createUser` → `auth.admin.createUser()` (ya estaba)
- `updateUserMetadata` → `auth.admin.updateUserById()` (ya estaba)
- `deleteUser` → Nueva operación (soft/hard delete)

### 3. Tabla Legacy

```sql
-- Tabla renombrada para backup
ALTER TABLE auth_users RENAME TO z_legacy_auth_users;

COMMENT ON TABLE z_legacy_auth_users IS 
  'Tabla legacy - DEPRECATED. Migrada a auth.users nativo el 2026-01-20. No usar en código nuevo.';
```

---

## Verificación Final

```
📊 Usuarios en auth.users:           144
📊 Usuarios en user_profiles_v2:     144
📊 FKs a auth_users (legacy):        0
📊 FKs a z_legacy_auth_users:        0
📊 FKs a auth.users (nativo):        31
```

---

## Regla de Negocio: id_dynamics

**Implementada en:**
- Edge Function `auth-admin-proxy` → operaciones `createUser` y `updateUserMetadata`
- UI → `UserCreateModal.tsx` y `UserEditPanel.tsx`

**Lógica:**
```typescript
// is_operativo solo puede ser true si id_dynamics existe
const finalIsOperativo = idDynamics ? isOperativo : false;
```

---

## Rollback (si fuera necesario)

```sql
-- 1. Renombrar tabla de vuelta
ALTER TABLE z_legacy_auth_users RENAME TO auth_users;

-- 2. Restaurar FKs (script en scripts/migration/rollback_fk_migration.sql)
```

---

## Próximos Pasos Recomendados

1. **Limpiar código frontend**: Reemplazar referencias a `auth_users` por `user_profiles_v2`
2. **Eliminar tabla legacy**: Después de 30 días sin problemas, ejecutar `DROP TABLE z_legacy_auth_users`
3. **Actualizar documentación**: Actualizar diagramas de arquitectura

---

## Archivos Modificados

- `supabase/functions/auth-admin-proxy/index.ts` - Migrado a auth.users nativo
- `scripts/migration/migrate_fk_to_auth_users_native.sql` - Script de migración
- `docs/MIGRACION_AUTH_USERS_NATIVO_2026-01-20.md` - Este documento

---

**Autor:** PQNC AI Platform  
**Última actualización:** 2026-01-20
