# Análisis de Migración: system_ui → pqnc_ai

**Fecha:** 2025-01-13  
**Objetivo:** Unificar todas las tablas de `system_ui` en `pqnc_ai` para simplificar dependencias entre vistas de usuarios y prospectos.

---

## 📊 Resumen Ejecutivo

### Estado Actual
- **system_ui:** 40 tablas + 7 vistas + múltiples funciones y triggers
- **pqnc_ai:** 30 tablas + 6 vistas + múltiples funciones y triggers
- **Edge Functions:** 5 funciones en `supabase/functions/` (compartidas)

### Conflictos Detectados
- **4 tablas con nombres duplicados** que requieren resolución
- **Triggers:** 18 en system_ui vs 35 en pqnc_ai (algunos pueden duplicarse)
- **Funciones:** Muchas funciones compartidas entre ambos proyectos

---

## 🔴 CONFLICTOS DE TABLAS

### Tablas con Nombres Duplicados

| Tabla | system_ui | pqnc_ai | Acción Recomendada |
|-------|-----------|---------|-------------------|
| `admin_messages` | ✅ Existe | ✅ Existe | **MERGE** - Comparar estructura y unificar |
| `api_auth_tokens` | ✅ Existe | ✅ Existe | **MERGE** - Comparar columnas y unificar |
| `api_auth_tokens_history` | ✅ Existe | ✅ Existe | **MERGE** - Comparar estructura y unificar |
| `content_moderation_warnings` | ✅ Existe | ✅ Existe | **MERGE** - Comparar estructura y unificar |
| `user_notifications` | ✅ Existe | ✅ Existe | **MERGE** - Estructuras diferentes, requiere análisis |

### Análisis Detallado de Conflictos

#### 1. `admin_messages`
**system_ui:**
- 19 columnas incluyendo: `id`, `category`, `title`, `message`, `sender_id`, `recipient_id`, `status`, `priority`, `metadata`, `resolved_at`, `resolved_by`, `read_at`, `read_by`, `created_at`, `updated_at`

**pqnc_ai:**
- Misma estructura (19 columnas)

**Acción:** ✅ **MERGE DIRECTO** - Estructuras idénticas, solo migrar datos

---

#### 2. `api_auth_tokens`
**system_ui:**
- 22 columnas incluyendo: `id`, `module_name`, `service_name`, `token_type`, `token_value`, `description`, `is_active`, `expires_at`, `created_at`, `updated_at`, `created_by`, `endpoint_url`, `token_key`, `updated_by_id`, `updated_by_name`, `updated_by_email`, `previous_value`, `change_reason`, `version`, `ip_address`, `user_agent`

**pqnc_ai:**
- 18 columnas: Similar pero sin algunas columnas de auditoría (`ip_address`, `user_agent`, `expires_at`)

**Acción:** ⚠️ **MERGE CON EXPANSIÓN** - Migrar datos y agregar columnas faltantes de system_ui a pqnc_ai

---

#### 3. `api_auth_tokens_history`
**system_ui:**
- 19 columnas incluyendo: `id`, `token_id`, `module_name`, `service_name`, `token_key`, `token_value`, `description`, `endpoint_url`, `is_active`, `version`, `changed_at`, `changed_by_id`, `changed_by_name`, `changed_by_email`, `change_type`, `change_reason`, `ip_address`, `user_agent`

**pqnc_ai:**
- 16 columnas: Similar pero sin `is_active`, `ip_address`, `user_agent`

**Acción:** ⚠️ **MERGE CON EXPANSIÓN** - Migrar datos y agregar columnas faltantes

---

#### 4. `content_moderation_warnings`
**system_ui:**
- 13 columnas: `id`, `user_id`, `user_email`, `input_text`, `warning_reason`, `warning_category`, `output_selected`, `was_sent`, `conversation_id`, `prospect_id`, `ip_address`, `user_agent`, `created_at`

**pqnc_ai:**
- Misma estructura (13 columnas)

**Acción:** ✅ **MERGE DIRECTO** - Estructuras idénticas, solo migrar datos

---

#### 5. `user_notifications`
**system_ui:**
- 18 columnas: `id`, `user_id`, `notification_type`, `module`, `message_id`, `conversation_id`, `call_id`, `prospect_id`, `customer_name`, `customer_phone`, `message_preview`, `call_status`, `is_read`, `read_at`, `is_muted`, `metadata`, `created_at`, `updated_at`

**pqnc_ai:**
- 11 columnas: `id`, `user_id`, `type`, `title`, `message`, `metadata`, `is_read`, `clicked`, `created_at`, `read_at`, `expires_at`

**Acción:** ⚠️ **MERGE COMPLEJO** - Estructuras muy diferentes. system_ui tiene más campos específicos. Requiere decisión:
- Opción A: Expandir pqnc_ai con todas las columnas de system_ui
- Opción B: Migrar solo datos compatibles y perder información específica

---

## 📋 TABLAS A MIGRAR (Sin Conflictos)

### Tablas de Autenticación y Usuarios
- ✅ `auth_users` - Usuarios del sistema
- ✅ `auth_roles` - Roles de usuario
- ✅ `auth_permissions` - Permisos individuales
- ✅ `auth_role_permissions` - Relación roles-permisos
- ✅ `auth_user_permissions` - Permisos directos de usuario
- ✅ `auth_sessions` - Sesiones activas
- ✅ `auth_login_logs` - Logs de autenticación
- ✅ `auth_user_coordinaciones` - Relación usuarios-coordinaciones
- ✅ `auth_user_profiles` (VIEW) - Vista de perfiles de usuario

### Tablas de Coordinaciones
- ✅ `coordinaciones` - Coordinaciones del sistema
- ✅ `coordinacion_statistics` - Estadísticas de coordinaciones
- ✅ `coordinador_coordinaciones_legacy` - Relaciones legacy

### Tablas de Permisos y Grupos
- ✅ `permission_groups` - Grupos de permisos
- ✅ `group_permissions` - Permisos de grupos
- ✅ `user_permission_groups` - Relación usuarios-grupos
- ✅ `group_audit_log` - Auditoría de grupos

### Tablas de Asignaciones
- ✅ `prospect_assignments` - Asignaciones de prospectos
- ✅ `prospect_assignment_logs` - Logs de asignaciones
- ✅ `assignment_logs` - Logs generales de asignaciones

### Tablas de API y Tokens
- ✅ `api_tokens` - Tokens de API de usuarios

### Tablas de Configuración
- ✅ `log_server_config` - Configuración de logging
- ✅ `aws_diagram_configs` - Configuraciones de diagramas AWS

### Tablas de Bot y Chat
- ✅ `bot_pause_status` - Estado de pausa de bots
- ✅ `uchat_bots` - Bots de UChat
- ✅ `uchat_conversations` - Conversaciones de UChat
- ✅ `uchat_messages` - Mensajes de UChat

### Tablas de Usuarios
- ✅ `user_avatars` - Avatares de usuarios
- ✅ `user_warning_counters` - Contadores de advertencias
- ✅ `user_warning_counts` (VIEW) - Vista de advertencias
- ✅ `user_paraphrase_stats` (VIEW) - Estadísticas de paráfrasis

### Tablas de Contenido
- ✅ `paraphrase_logs` - Logs de paráfrasis
- ✅ `timeline_activities` - Actividades de timeline

### Tablas de WhatsApp Labels
- ✅ `whatsapp_conversation_labels` - Labels de conversaciones
- ✅ `whatsapp_labels_custom` - Labels personalizados
- ✅ `whatsapp_labels_preset` - Labels predefinidos

### Vistas
- ✅ `v_user_login_summary` (VIEW) - Resumen de logins

---

## 🔧 TRIGGERS

### Triggers en system_ui (18 triggers)

**Triggers de actualización automática (`updated_at`):**
- `update_admin_messages_updated_at` → `admin_messages`
- `update_bot_pause_status_updated_at` → `bot_pause_status`
- `update_log_server_config_updated_at` → `log_server_config`
- `update_permission_groups_updated_at` → `permission_groups`
- `update_user_notifications_updated_at` → `user_notifications`
- `update_aws_diagram_updated_at` → `aws_diagram_configs`
- `update_coordinador_coordinaciones_updated_at` → `coordinador_coordinaciones_legacy`
- `update_timeline_updated_at` → `timeline_activities`

**Triggers de negocio:**
- `update_user_warning_counter` → `content_moderation_warnings` (actualiza contadores)
- `check_max_custom_labels` → `whatsapp_labels_custom` (valida límites)
- `check_max_labels_per_prospecto` → `whatsapp_conversation_labels` (valida límites)
- `check_conflicting_labels` → `whatsapp_conversation_labels` (valida conflictos)
- `update_whatsapp_labels_timestamp` → `whatsapp_conversation_labels` (actualiza timestamps)

**Triggers de auditoría:**
- `log_prospect_assignment_change` → `prospect_assignments` (log de cambios)

### Triggers en pqnc_ai (35 triggers)

**Triggers similares que pueden entrar en conflicto:**
- `update_admin_messages_updated_at` → `admin_messages` ⚠️ **CONFLICTO**
- `update_user_notifications_updated_at` → `user_notifications` ⚠️ **CONFLICTO** (si se expande la tabla)

### Recomendaciones de Triggers

#### ✅ Migrar Sin Cambios
- Todos los triggers de `updated_at` para tablas nuevas
- Triggers de validación (`check_max_*`, `check_conflicting_*`)
- Triggers de auditoría (`log_prospect_assignment_change`)
- `update_user_warning_counter`

#### ⚠️ Revisar y Posiblemente Fusionar
- `update_admin_messages_updated_at` - Verificar si son idénticos
- `update_user_notifications_updated_at` - Verificar si son idénticos (si se expande la tabla)

#### ❌ No Migrar (Ya Existen Equivalentes)
- Ninguno identificado hasta ahora

---

## 🚀 EDGE FUNCTIONS

### Edge Functions Actuales (5 funciones)

Todas las edge functions están en `supabase/functions/` y son compartidas:

1. ✅ `anthropic-proxy` - Proxy para Anthropic API
2. ✅ `error-analisis-proxy` - Proxy para análisis de errores
3. ✅ `generar-url-optimizada` - Generación de URLs optimizadas
4. ✅ `n8n-proxy` - Proxy para N8N
5. ✅ `send-img-proxy` - Proxy para envío de imágenes

### Análisis de Edge Functions

**Estado:** ✅ **NO REQUIEREN MIGRACIÓN**

**Razón:** Las edge functions están en el repositorio local y se despliegan a proyectos específicos según configuración. Actualmente están desplegadas en:
- **system_ui:** `zbylezfyagwrxoecioup.supabase.co`
- **pqnc_ai:** `glsmifhkoaifvaegsozd.supabase.co`

**Acción Post-Migración:**
- Verificar que todas las funciones estén desplegadas en `pqnc_ai`
- Actualizar URLs de edge functions en código si es necesario
- Las funciones pueden seguir funcionando en ambos proyectos durante la transición

---

## 📝 FUNCIONES SQL (RPC Functions)

### Funciones en system_ui (87 funciones)

**Funciones críticas a migrar:**
- `authenticate_user` / `authenticate_user_v2` - Autenticación
- `get_user_permissions` / `get_user_effective_permissions` - Permisos
- `get_user_groups` - Grupos de usuarios
- `can_user_access_prospect` - Validación de acceso
- `create_user_with_role` - Creación de usuarios
- `delete_user_complete` - Eliminación de usuarios
- `change_user_password` / `verify_password` / `hash_password` - Gestión de contraseñas
- `log_user_login` - Logging de logins
- `create_admin_message` / `insert_admin_message` - Mensajes admin
- `get_prospecto_labels` / `get_batch_prospecto_labels` - Labels de prospectos
- `add_label_to_prospecto` / `remove_label_from_prospecto` - Gestión de labels
- `can_remove_label_from_prospecto` - Validación de eliminación de labels
- `get_available_labels_for_user` - Labels disponibles
- `create_message_notifications` / `create_call_notifications` - Notificaciones
- `create_message_notifications_batch` / `create_call_notifications_batch` - Notificaciones batch
- `mark_message_notifications_as_read` / `mark_call_notifications_as_read` - Marcar como leído
- `get_users_for_prospect_notification` - Usuarios para notificaciones
- `register_moderation_warning` / `get_user_warnings` - Moderación
- `is_user_blocked` / `reset_user_warnings` - Bloqueo de usuarios
- `register_paraphrase_log` - Logs de paráfrasis
- `get_user_warning_counter` - Contadores de advertencias
- `upload_user_avatar` - Avatares
- `assign_prospect_to_coordinacion` / `assign_prospect_to_ejecutivo` - Asignaciones
- `check_and_assign_prospect_with_crm` - Asignación con CRM
- `get_coordinacion_assignment_count` / `get_ejecutivo_assignment_count` - Conteos
- `get_coordinacion_id_by_codigo` - Búsqueda de coordinación
- `get_role_id_by_name` - Búsqueda de rol
- `archivar_coordinacion_y_reasignar` - Archivado de coordinaciones
- `update_coordinacion_is_operativo` - Actualización de coordinación
- `populate_group_default_permissions` - Permisos por defecto
- `configure_evaluator_analysis_permissions` - Permisos de evaluador
- `create_test_users` - Usuarios de prueba
- `capitalize_name` / `parse_name` - Utilidades de nombres
- `get_today_start` - Utilidades de fecha

**Funciones MCP (ya existen en pqnc_ai):**
- `exec_sql` / `exec_sql_transaction` / `exec_sql_batch` - Ejecución SQL
- `get_database_schema` / `get_all_tables` / `get_table_info` - Esquema
- `backup_table_data` - Backup
- `check_tables` - Verificación

### Funciones en pqnc_ai (200+ funciones)

Muchas funciones ya existen en pqnc_ai. Se debe verificar:
- Si son idénticas → No migrar
- Si son diferentes → Migrar o fusionar
- Si no existen → Migrar

### Recomendaciones de Funciones

#### ✅ Migrar (No Existen en pqnc_ai)
- Funciones de autenticación y usuarios (`authenticate_user`, `create_user_with_role`, etc.)
- Funciones de permisos y grupos (`get_user_permissions`, `get_user_groups`, etc.)
- Funciones de labels (`get_prospecto_labels`, `add_label_to_prospecto`, etc.)
- Funciones de notificaciones (`create_message_notifications`, etc.)
- Funciones de moderación (`register_moderation_warning`, etc.)
- Funciones de asignaciones (`assign_prospect_to_coordinacion`, etc.)
- Funciones de coordinaciones (`archivar_coordinacion_y_reasignar`, etc.)

#### ⚠️ Verificar y Posiblemente Fusionar
- Funciones MCP (ya existen, verificar si son idénticas)
- Funciones de utilidades (`capitalize_name`, `parse_name`, etc.)

#### ❌ No Migrar (Ya Existen Equivalentes)
- Funciones relacionadas con prospectos (ya existen en pqnc_ai)
- Funciones relacionadas con llamadas (ya existen en pqnc_ai)
- Funciones relacionadas con WhatsApp (ya existen en pqnc_ai)

---

## 📊 VISTAS (Views)

### Vistas en system_ui (7 vistas)

1. ✅ `auth_user_profiles` - Perfiles de usuario con roles
2. ✅ `user_paraphrase_stats` - Estadísticas de paráfrasis
3. ✅ `user_warning_counts` - Conteos de advertencias
4. ✅ `v_user_login_summary` - Resumen de logins

### Vistas en pqnc_ai (6 vistas)

1. `call_analysis_executive_summary` - Resumen ejecutivo de análisis
2. `call_analysis_summary` - Resumen de análisis
3. `live_monitor_view` - Vista de live monitor
4. `v_audit_pending_retry` - Auditoría de reintentos pendientes
5. `v_audit_retry_stats` - Estadísticas de reintentos
6. `v_horario_hoy` - Horario del día
7. `v_template_analytics` - Analytics de templates

### Recomendaciones de Vistas

#### ✅ Migrar Todas
- Todas las vistas de system_ui son específicas de usuarios/auth y no existen en pqnc_ai

---

## 🎯 PLAN DE MIGRACIÓN RECOMENDADO

### Fase 1: Preparación (1-2 días)
1. ✅ Backup completo de ambas bases de datos
2. ✅ Documentar todas las dependencias en código
3. ✅ Crear scripts de migración
4. ✅ Probar migración en ambiente de desarrollo

### Fase 2: Resolución de Conflictos (2-3 días)
1. ⚠️ Comparar estructuras de tablas conflictivas
2. ⚠️ Decidir estrategia para `user_notifications` (expandir vs simplificar)
3. ⚠️ Unificar estructuras de `api_auth_tokens` y `api_auth_tokens_history`
4. ⚠️ Verificar triggers duplicados

### Fase 3: Migración de Tablas (3-5 días)
1. ✅ Migrar tablas sin conflictos primero
2. ✅ Migrar tablas con conflictos resueltos
3. ✅ Migrar vistas
4. ✅ Migrar triggers
5. ✅ Migrar funciones SQL

### Fase 4: Actualización de Código (2-3 días)
1. ✅ Actualizar referencias de `system_ui` a `pqnc_ai` en código
2. ✅ Actualizar servicios y configuraciones
3. ✅ Actualizar variables de entorno
4. ✅ Actualizar documentación

### Fase 5: Pruebas y Validación (2-3 días)
1. ✅ Pruebas de funcionalidad completa
2. ✅ Validación de integridad de datos
3. ✅ Pruebas de rendimiento
4. ✅ Rollback plan listo

### Fase 6: Despliegue (1 día)
1. ✅ Migración en producción
2. ✅ Monitoreo post-migración
3. ✅ Desactivar `system_ui` (opcional, mantener como backup)

---

## ⚠️ RIESGOS Y CONSIDERACIONES

### Riesgos Altos
1. **Pérdida de datos** si no se hace backup completo
2. **Downtime** durante migración si no se planifica bien
3. **Dependencias en código** que pueden romperse
4. **Funciones duplicadas** que pueden causar conflictos

### Consideraciones
1. **Mantener system_ui activo** durante transición como backup
2. **Migración gradual** por módulos si es posible
3. **Validación exhaustiva** antes de desactivar system_ui
4. **Documentar todo** el proceso de migración

---

## 📋 CHECKLIST DE MIGRACIÓN

### Pre-Migración
- [ ] Backup completo de system_ui
- [ ] Backup completo de pqnc_ai
- [ ] Documentar todas las dependencias
- [ ] Crear scripts de migración
- [ ] Probar en ambiente de desarrollo

### Migración de Tablas
- [ ] Migrar tablas sin conflictos (35 tablas)
- [ ] Resolver conflictos de tablas (5 tablas)
- [ ] Migrar tablas conflictivas
- [ ] Migrar vistas (4 vistas)
- [ ] Verificar integridad de datos

### Migración de Lógica
- [ ] Migrar triggers (18 triggers)
- [ ] Migrar funciones SQL (87 funciones)
- [ ] Verificar funciones duplicadas
- [ ] Actualizar referencias en código

### Post-Migración
- [ ] Actualizar código fuente
- [ ] Actualizar configuraciones
- [ ] Actualizar documentación
- [ ] Pruebas completas
- [ ] Monitoreo post-migración

---

## 📚 REFERENCIAS

- **system_ui:** `zbylezfyagwrxoecioup.supabase.co`
- **pqnc_ai:** `glsmifhkoaifvaegsozd.supabase.co`
- **Edge Functions:** `supabase/functions/`
- **Documentación MCP:** `docs/MCP_CATALOG.md`

---

**Última actualización:** 2025-01-13  
**Próximos pasos:** Revisar y aprobar plan de migración antes de proceder
