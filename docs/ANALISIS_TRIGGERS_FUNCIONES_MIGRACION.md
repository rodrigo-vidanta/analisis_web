# Análisis de Triggers, Funciones RPC y Edge Functions para Migración

**Fecha:** 13 de Enero 2025  
**Proyecto:** Migración System_UI → PQNC_AI  
**Estado:** Análisis Completo

---

## 📋 Resumen Ejecutivo

Este documento analiza los triggers, funciones RPC y Edge Functions de `system_ui` para determinar cuáles deben migrarse a `pqnc_ai`, considerando:
- Conflictos con funciones existentes en `pqnc_ai`
- Dependencias del frontend
- Necesidad funcional después de la migración

---

## 🔍 1. ANÁLISIS DE TRIGGERS

### 1.1 Triggers en System_UI (18 triggers)

| Trigger | Tabla | Evento | Función | Estado Migración |
|---------|-------|--------|---------|------------------|
| `trigger_update_admin_messages_updated_at` | `admin_messages` | UPDATE | `update_admin_messages_updated_at()` | ✅ **YA EXISTE** |
| `update_auth_users_updated_at` | `auth_users` | UPDATE | `update_updated_at()` | ⚠️ **CONFLICTO** (pqnc_ai usa `update_auth_users_updated_at()`) |
| `update_aws_diagram_updated_at` | `aws_diagram_configs` | UPDATE | `update_aws_diagram_updated_at()` | ❌ **NO EXISTE** (tabla no migrada) |
| `trigger_update_bot_pause_status_updated_at` | `bot_pause_status` | UPDATE | `update_bot_pause_status_updated_at()` | ❌ **NO EXISTE** (tabla no migrada) |
| `trigger_update_warning_counter` | `content_moderation_warnings` | INSERT | `update_user_warning_counter()` | ❌ **NO EXISTE** (necesario) |
| `update_coordinacion_statistics_updated_at` | `coordinacion_statistics` | UPDATE | `update_updated_at()` | ✅ **YA EXISTE** (nombre diferente) |
| `update_coordinaciones_updated_at` | `coordinaciones` | UPDATE | `update_updated_at()` | ✅ **YA EXISTE** (nombre diferente) |
| `trigger_update_coordinador_coordinaciones_updated_at` | `coordinador_coordinaciones_legacy` | UPDATE | `update_coordinador_coordinaciones_updated_at()` | ✅ **YA EXISTE** |
| `trigger_update_log_server_config_updated_at` | `log_server_config` | UPDATE | `update_log_server_config_updated_at()` | ✅ **YA EXISTE** |
| `trigger_update_permission_groups_updated_at` | `permission_groups` | UPDATE | `update_permission_groups_updated_at()` | ✅ **YA EXISTE** |
| `update_prospect_assignments_updated_at` | `prospect_assignments` | UPDATE | `update_updated_at()` | ✅ **YA EXISTE** (nombre diferente) |
| `trigger_update_timeline_updated_at` | `timeline_activities` | UPDATE | `update_timeline_updated_at()` | ✅ **YA EXISTE** |
| `trigger_update_user_notifications_updated_at` | `user_notifications` | UPDATE | `update_user_notifications_updated_at()` | ⚠️ **NO EXISTE** (tabla `user_notifications` en pqnc_ai es diferente) |
| `trigger_check_conflicting_labels` | `whatsapp_conversation_labels` | INSERT | `check_conflicting_labels()` | ❌ **NO EXISTE** (necesario) |
| `trigger_max_labels_per_prospecto` | `whatsapp_conversation_labels` | INSERT | `check_max_labels_per_prospecto()` | ❌ **NO EXISTE** (necesario) |
| `trigger_max_custom_labels` | `whatsapp_labels_custom` | INSERT | `check_max_custom_labels()` | ❌ **NO EXISTE** (necesario) |
| `update_custom_labels_updated_at` | `whatsapp_labels_custom` | UPDATE | `update_whatsapp_labels_timestamp()` | ✅ **YA EXISTE** (nombre diferente) |
| `update_preset_labels_updated_at` | `whatsapp_labels_preset` | UPDATE | `update_whatsapp_labels_timestamp()` | ✅ **YA EXISTE** (nombre diferente) |

### 1.2 Triggers que DEBEN Migrarse

#### 🔴 CRÍTICOS (Necesarios para funcionalidad)

1. **`trigger_update_warning_counter`** (INSERT en `content_moderation_warnings`)
   - **Razón:** Actualiza contadores de advertencias de usuarios
   - **Función:** `update_user_warning_counter()`
   - **Estado:** ❌ No existe en pqnc_ai
   - **Acción:** Migrar trigger + función

2. **`trigger_check_conflicting_labels`** (INSERT en `whatsapp_conversation_labels`)
   - **Razón:** Valida que no haya etiquetas conflictivas
   - **Función:** `check_conflicting_labels()`
   - **Estado:** ❌ No existe en pqnc_ai
   - **Acción:** Migrar trigger + función

3. **`trigger_max_labels_per_prospecto`** (INSERT en `whatsapp_conversation_labels`)
   - **Razón:** Limita número de etiquetas por prospecto
   - **Función:** `check_max_labels_per_prospecto()`
   - **Estado:** ❌ No existe en pqnc_ai
   - **Acción:** Migrar trigger + función

4. **`trigger_max_custom_labels`** (INSERT en `whatsapp_labels_custom`)
   - **Razón:** Limita número de etiquetas personalizadas por usuario
   - **Función:** `check_max_custom_labels()`
   - **Estado:** ❌ No existe en pqnc_ai
   - **Acción:** Migrar trigger + función

#### 🟡 OPCIONALES (Dependen de tablas no migradas)

5. **`update_aws_diagram_updated_at`** (UPDATE en `aws_diagram_configs`)
   - **Razón:** Tabla `aws_diagram_configs` no está en pqnc_ai
   - **Acción:** ⏸️ Pausar hasta decidir si migrar tabla

6. **`trigger_update_bot_pause_status_updated_at`** (UPDATE en `bot_pause_status`)
   - **Razón:** Tabla `bot_pause_status` no está en pqnc_ai
   - **Acción:** ⏸️ Pausar hasta decidir si migrar tabla

#### 🟢 YA EXISTEN (Solo verificar compatibilidad)

- Triggers de `updated_at` ya existen con nombres diferentes pero funcionalidad equivalente
- Triggers de validación de etiquetas necesitan migración

---

## 🔧 2. ANÁLISIS DE FUNCIONES RPC

### 2.1 Funciones RPC en System_UI (~80 funciones)

#### Funciones Usadas por el Frontend (Identificadas por grep)

| Función | Uso en Frontend | Estado en PQNC_AI | Acción |
|---------|----------------|-------------------|--------|
| `mark_message_notifications_as_read` | `userNotificationService.ts` | ❌ No existe | 🔴 **MIGRAR** |
| `mark_call_notifications_as_read` | `userNotificationService.ts` | ❌ No existe | 🔴 **MIGRAR** |
| `get_conversations_ordered` | `LiveChatCanvas.tsx` | ✅ Existe | ✅ Verificar compatibilidad |
| `mark_messages_as_read` | `LiveChatCanvas.tsx` | ✅ Existe | ✅ Verificar compatibilidad |
| `get_conversations_count` | `LiveChatCanvas.tsx` | ✅ Existe | ✅ Verificar compatibilidad |
| `change_user_password` | `UserManagement.tsx`, `ChangePasswordModal.tsx` | ✅ Existe | ✅ Verificar compatibilidad |
| `get_user_permissions` | `permissionsService.ts` | ❌ No existe | 🔴 **MIGRAR** |
| `can_user_access_prospect` | `permissionsService.ts` | ❌ No existe | 🔴 **MIGRAR** |
| `authenticate_user` | `authService.ts` | ✅ Existe | ✅ Verificar compatibilidad |
| `get_prospecto_labels` | `whatsappLabelsService.ts` | ❌ No existe | 🔴 **MIGRAR** |
| `can_remove_label_from_prospecto` | `whatsappLabelsService.ts` | ❌ No existe | 🔴 **MIGRAR** |
| `add_label_to_prospecto` | `whatsappLabelsService.ts` | ❌ No existe | 🔴 **MIGRAR** |
| `remove_label_from_prospecto` | `whatsappLabelsService.ts` | ❌ No existe | 🔴 **MIGRAR** |
| `get_batch_prospecto_labels` | `whatsappLabelsService.ts` | ❌ No existe | 🔴 **MIGRAR** |
| `create_user_with_role` | `UserManagement.tsx`, `coordinacionService.ts` | ❌ No existe | 🔴 **MIGRAR** |
| `upload_user_avatar` | `UserManagement.tsx`, `UserProfileModal.tsx` | ❌ No existe | 🔴 **MIGRAR** |
| `configure_evaluator_analysis_permissions` | `UserManagement.tsx` | ❌ No existe | 🔴 **MIGRAR** |
| `update_coordinacion_safe` | `coordinacionService.ts` | ✅ Existe | ✅ Verificar compatibilidad |
| `archivar_coordinacion_y_reasignar` | `coordinacionService.ts` | ✅ Existe | ✅ Verificar compatibilidad |
| `log_user_login` | `loginLogService.ts` | ❌ No existe | 🔴 **MIGRAR** |
| `register_paraphrase_log` | `paraphraseLogService.ts` | ❌ No existe | 🔴 **MIGRAR** |
| `get_user_warning_counter` | `paraphraseLogService.ts` | ❌ No existe | 🔴 **MIGRAR** |
| `reset_user_warnings` | `paraphraseLogService.ts` | ❌ No existe | 🔴 **MIGRAR** |
| `register_moderation_warning` | `moderationService.ts` | ✅ Existe | ✅ Verificar compatibilidad |
| `is_user_blocked` | `moderationService.ts` | ✅ Existe | ✅ Verificar compatibilidad |
| `get_user_warnings` | `moderationService.ts` | ✅ Existe | ✅ Verificar compatibilidad |
| `create_message_notifications_batch` | `notificationListenerService.ts` | ✅ Existe | ✅ Verificar compatibilidad |
| `create_call_notifications_batch` | `notificationListenerService.ts` | ✅ Existe | ✅ Verificar compatibilidad |
| `get_user_effective_permissions` | `groupsService.ts` | ❌ No existe | 🔴 **MIGRAR** |
| `user_has_permission` | `groupsService.ts` | ❌ No existe | 🔴 **MIGRAR** |

#### Funciones NO Usadas por el Frontend (Análisis de esquema)

**Funciones de Utilidad/Admin:**
- `populate_group_default_permissions` - Llenar permisos por defecto
- `get_user_groups` - Obtener grupos de usuario
- `get_available_labels_for_user` - Obtener etiquetas disponibles
- `delete_user_complete` - Eliminar usuario completo
- `get_coordinacion_assignment_count` - Contar asignaciones de coordinación
- `get_ejecutivo_assignment_count` - Contar asignaciones de ejecutivo
- `assign_prospect_to_coordinacion` - Asignar prospecto a coordinación
- `assign_prospect_to_ejecutivo` - Asignar prospecto a ejecutivo
- `check_and_assign_prospect_with_crm` - Verificar y asignar con CRM
- `get_users_for_prospect_notification` - Obtener usuarios para notificación
- `create_message_notifications` - Crear notificaciones de mensaje (versión simple)
- `create_call_notifications` - Crear notificaciones de llamada (versión simple)
- `get_today_start` - Obtener inicio del día
- `insert_admin_message` - Insertar mensaje admin (versión simple)
- `create_admin_message` - Crear mensaje admin (versión completa)
- `update_coordinacion_is_operativo` - Actualizar coordinación operativo
- `get_role_id_by_name` - Obtener ID de rol por nombre
- `get_coordinacion_id_by_codigo` - Obtener ID de coordinación por código
- `parse_name` - Parsear nombre
- `capitalize_name` - Capitalizar nombre
- `hash_password` - Hash de contraseña
- `verify_password` - Verificar contraseña
- `create_test_users` - Crear usuarios de prueba

**Funciones de MCP/Admin:**
- `exec_sql` - Ejecutar SQL (MCP)
- `exec_sql_batch` - Ejecutar SQL batch (MCP)
- `exec_sql_transaction` - Ejecutar SQL transacción (MCP)
- `get_database_schema` - Obtener esquema BD (MCP)
- `get_all_tables` - Obtener todas las tablas (MCP)
- `backup_table_data` - Backup de tabla (MCP)
- `get_table_info` - Obtener info de tabla (MCP)
- `check_tables` - Verificar tablas (MCP)

### 2.2 Funciones que DEBEN Migrarse

#### 🔴 CRÍTICAS (Usadas por Frontend)

1. **Notificaciones:**
   - `mark_message_notifications_as_read` ✅
   - `mark_call_notifications_as_read` ✅

2. **Permisos:**
   - `get_user_permissions` ✅
   - `can_user_access_prospect` ✅
   - `get_user_effective_permissions` ✅
   - `user_has_permission` ✅

3. **Etiquetas WhatsApp:**
   - `get_prospecto_labels` ✅
   - `can_remove_label_from_prospecto` ✅
   - `add_label_to_prospecto` ✅
   - `remove_label_from_prospecto` ✅
   - `get_batch_prospecto_labels` ✅

4. **Usuarios:**
   - `create_user_with_role` ✅
   - `upload_user_avatar` ✅
   - `configure_evaluator_analysis_permissions` ✅

5. **Logs y Moderación:**
   - `log_user_login` ✅
   - `register_paraphrase_log` ✅
   - `get_user_warning_counter` ✅
   - `reset_user_warnings` ✅

#### 🟡 OPCIONALES (No usadas por frontend pero útiles)

- Funciones de asignación automática (`assign_prospect_to_*`)
- Funciones de utilidad (`get_role_id_by_name`, `parse_name`, etc.)
- Funciones MCP (ya existen en pqnc_ai con nombres similares)

---

## 🌐 3. ANÁLISIS DE EDGE FUNCTIONS

### 3.1 Edge Functions en el Proyecto

| Edge Function | Ubicación | Uso en Frontend | Estado |
|---------------|-----------|-----------------|--------|
| `send-img-proxy` | `supabase/functions/send-img-proxy/` | `ImageCatalogModal.tsx` | ✅ **EN PQNC_AI** |
| `anthropic-proxy` | `supabase/functions/anthropic-proxy/` | No identificado | ✅ **EN PQNC_AI** |
| `error-analisis-proxy` | `supabase/functions/error-analisis-proxy/` | `logMonitorService.ts` | ✅ **EN PQNC_AI** |
| `generar-url-optimizada` | `supabase/functions/generar-url-optimizada/` | No identificado | ✅ **EN PQNC_AI** |
| `n8n-proxy` | `supabase/functions/n8n-proxy/` | `n8nProxyService.ts` | ✅ **EN PQNC_AI** |

### 3.2 Edge Functions Referenciadas desde System_UI

**Referencia encontrada:**
- `ImageCatalogModal.tsx` usa `VITE_SYSTEM_UI_SUPABASE_URL/functions/v1/send-img-proxy`
- Esto indica que la Edge Function está en `system_ui`, pero el código del proyecto está en `supabase/functions/`

**Conclusión:** Las Edge Functions están en el proyecto local y deben estar desplegadas en ambos proyectos o solo en `pqnc_ai`. No hay Edge Functions específicas de `system_ui` que migrar.

---

## 📊 4. RESUMEN DE MIGRACIÓN

### 4.1 Triggers a Migrar (4 críticos)

1. ✅ `trigger_update_warning_counter` + función `update_user_warning_counter()`
2. ✅ `trigger_check_conflicting_labels` + función `check_conflicting_labels()`
3. ✅ `trigger_max_labels_per_prospecto` + función `check_max_labels_per_prospecto()`
4. ✅ `trigger_max_custom_labels` + función `check_max_custom_labels()`

### 4.2 Funciones RPC a Migrar (18 críticas)

**Notificaciones (2):**
1. ✅ `mark_message_notifications_as_read`
2. ✅ `mark_call_notifications_as_read`

**Permisos (4):**
3. ✅ `get_user_permissions`
4. ✅ `can_user_access_prospect`
5. ✅ `get_user_effective_permissions`
6. ✅ `user_has_permission`

**Etiquetas WhatsApp (5):**
7. ✅ `get_prospecto_labels`
8. ✅ `can_remove_label_from_prospecto`
9. ✅ `add_label_to_prospecto`
10. ✅ `remove_label_from_prospecto`
11. ✅ `get_batch_prospecto_labels`

**Usuarios (3):**
12. ✅ `create_user_with_role`
13. ✅ `upload_user_avatar`
14. ✅ `configure_evaluator_analysis_permissions`

**Logs y Moderación (4):**
15. ✅ `log_user_login`
16. ✅ `register_paraphrase_log`
17. ✅ `get_user_warning_counter`
18. ✅ `reset_user_warnings`

### 4.3 Edge Functions

✅ **NO HAY QUE MIGRAR** - Todas las Edge Functions están en el proyecto local y deben estar desplegadas en `pqnc_ai`.

---

## ⚠️ 5. CONFLICTOS Y CONSIDERACIONES

### 5.1 Funciones que Existen en Ambos Proyectos

| Función | System_UI | PQNC_AI | Acción |
|---------|-----------|---------|--------|
| `authenticate_user` | ✅ | ✅ | Verificar compatibilidad de parámetros |
| `register_moderation_warning` | ✅ | ✅ | Verificar compatibilidad |
| `is_user_blocked` | ✅ | ✅ | Verificar compatibilidad |
| `get_user_warnings` | ✅ | ✅ | Verificar compatibilidad |
| `create_message_notifications_batch` | ✅ | ✅ | Verificar compatibilidad |
| `create_call_notifications_batch` | ✅ | ✅ | Verificar compatibilidad |
| `update_coordinacion_safe` | ✅ | ✅ | Verificar compatibilidad |
| `archivar_coordinacion_y_reasignar` | ✅ | ✅ | Verificar compatibilidad |
| `get_conversations_ordered` | ✅ | ✅ | Verificar compatibilidad |
| `mark_messages_as_read` | ✅ | ✅ | Verificar compatibilidad |
| `get_conversations_count` | ✅ | ✅ | Verificar compatibilidad |
| `change_user_password` | ✅ | ✅ | Verificar compatibilidad |

**Acción:** Comparar definiciones de estas funciones para asegurar compatibilidad.

### 5.2 Triggers con Nombres Diferentes

Algunos triggers tienen nombres diferentes pero funcionalidad equivalente:
- `update_updated_at()` vs `update_auth_users_updated_at()`
- `update_updated_at()` vs `update_coordinaciones_updated_at()`
- `update_whatsapp_labels_timestamp()` vs `update_whatsapp_labels_custom_updated_at()`

**Acción:** Verificar que las funciones subyacentes sean compatibles.

---

## 📝 6. PLAN DE ACCIÓN

### Fase 1: Migración de Triggers Críticos
1. Migrar función `update_user_warning_counter()`
2. Crear trigger `trigger_update_warning_counter` en `content_moderation_warnings`
3. Migrar función `check_conflicting_labels()`
4. Crear trigger `trigger_check_conflicting_labels` en `whatsapp_conversation_labels`
5. Migrar función `check_max_labels_per_prospecto()`
6. Crear trigger `trigger_max_labels_per_prospecto` en `whatsapp_conversation_labels`
7. Migrar función `check_max_custom_labels()`
8. Crear trigger `trigger_max_custom_labels` en `whatsapp_labels_custom`

### Fase 2: Migración de Funciones RPC Críticas
1. Migrar funciones de notificaciones (2)
2. Migrar funciones de permisos (4)
3. Migrar funciones de etiquetas WhatsApp (5)
4. Migrar funciones de usuarios (3)
5. Migrar funciones de logs y moderación (4)

### Fase 3: Verificación de Compatibilidad
1. Comparar funciones existentes en ambos proyectos
2. Verificar parámetros y tipos de retorno
3. Actualizar frontend si hay diferencias

### Fase 4: Testing
1. Probar triggers migrados
2. Probar funciones RPC migradas
3. Verificar que el frontend funciona correctamente

---

## 🔗 7. REFERENCIAS

- [Análisis de Migración Completo](./ANALISIS_MIGRACION_SYSTEM_UI_A_PQNC_AI.md)
- [Plan Detallado de Migración](./PLAN_DETALLADO_MIGRACION_SYSTEM_UI_PQNC_AI.md)
- [Cambios Frontend](./CAMBIOS_FRONTEND_MIGRACION.md)

---

**Última actualización:** 13 de Enero 2025
