# 📋 RESUMEN DE MIGRACIÓN - PQNC_QA a System_UI

## ✅ Estado Actual

El script de exportación (`02_export_users_from_pqnc.sql`) está funcionando correctamente. Se han exportado exitosamente los avatares.

## 🔍 Estructura Real de pqnc_qa

### Tablas Auth Identificadas:

1. **`auth_roles`**
   - Columnas: `id`, `name`, `display_name`, `description`, `created_at`
   - ❌ NO tiene `is_active` (se agregará como `true` en System_UI)

2. **`auth_users`**
   - Columnas: `id`, `email`, `password_hash`, `full_name`, `first_name`, `last_name`, `phone`, `department`, `position`, `organization`, `role_id`, `is_active`, `email_verified`, `last_login`, `failed_login_attempts`, `locked_until`, `created_at`, `updated_at`
   - ✅ Todas las columnas existen

3. **`auth_permissions`**
   - Columnas: `id`, `name`, `module`, `sub_module`, `description`, `created_at`
   - ⚠️ Tiene `name` NO `permission_name` (se transforma en el export)

4. **`auth_role_permissions`**
   - Columnas: `id`, `role_id`, `permission_id`, `created_at`
   - ✅ Estructura correcta

5. **`user_specific_permissions`** (NO `auth_user_permissions`)
   - Columnas: `id`, `user_id`, `permission_id`, `granted`, `created_at`, `created_by`
   - ⚠️ Usa `permission_id` no `permission_name` (se hace JOIN con `auth_permissions`)

6. **`auth_sessions`**
   - Columnas: `id`, `user_id`, `session_token`, `expires_at`, `ip_address`, `user_agent`, `created_at`, `last_activity`
   - ✅ Estructura correcta

7. **`user_avatars`**
   - Columnas: `id`, `user_id`, `avatar_url`, `original_filename`, `file_size`, `mime_type`, `uploaded_at`, `updated_at`
   - ⚠️ Tiene `original_filename` NO `filename` (se transforma en el export)

8. **`api_tokens`**
   - ❌ NO existe en pqnc_qa

## 📝 Scripts Actualizados

### ✅ `02_export_users_from_pqnc.sql`
- Usa `name as permission_name` para permisos
- Usa `original_filename as filename` para avatares
- Hace JOIN con `auth_permissions` para `user_specific_permissions`
- Maneja correctamente roles sin `is_active`

### ✅ `04_migration_script_node.js`
- Transforma `name` → `permission_name` automáticamente
- Transforma `original_filename` → `filename` automáticamente
- Maneja `user_specific_permissions` con JOIN
- Agrega `is_active: true` por defecto para roles
- Maneja `failed_login_attempts` y `locked_until` en usuarios

## 🚀 Próximos Pasos

1. ✅ Ejecutar `01_create_tables_system_ui.sql` en System_UI (ya hecho)
2. ✅ Ejecutar `02_export_users_from_pqnc.sql` en pqnc_qa (en proceso - avatares exportados)
3. ⏳ Ejecutar `04_migration_script_node.js` para migración automática
4. ⏳ Verificar que todos los datos se migraron correctamente
5. ⏳ Actualizar código para usar System_UI en lugar de pqncSupabase

## 📊 Datos Exportados Hasta Ahora

- ✅ Avatares: 5 registros exportados exitosamente

## ⚠️ Notas Importantes

- Los roles de coordinador y ejecutivo ya existen en System_UI
- Los roles migrados de pqnc_qa se fusionarán con los existentes (por nombre)
- Los usuarios mantendrán sus IDs originales
- Los permisos se transforman de `name` a `permission_name` automáticamente
- Los avatares se transforman de `original_filename` a `filename` automáticamente

