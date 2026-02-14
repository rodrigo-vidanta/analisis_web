# Base de Datos - PQNC_AI

> Actualizado: 2026-02-13 | Verificado contra codigo real (180+ tablas en uso)

## Conexion

- Proyecto: `glsmifhkoaifvaegsozd`
- URL: `glsmifhkoaifvaegsozd.supabase.co`
- BD unificada: TODAS las tablas en PQNC_AI (migracion completada 2026-01-13)
- Auth: Supabase Auth nativo (`auth.users`) desde 2026-01-20

## Clientes en Codigo

```typescript
// CORRECTO - usar estos (ambos apuntan a PQNC_AI):
import { analysisSupabase } from '@/config/analysisSupabase';
import { supabaseSystemUI } from '@/config/supabaseSystemUI';

// PROHIBIDO - eliminados (retornan null):
// supabaseSystemUIAdmin ❌
// analysisSupabaseAdmin ❌
// pqncSupabaseAdmin ❌
```

## Seguridad de Datos

- **RLS en tablas:** Deshabilitado en la mayoria (61 tablas)
- **Proteccion real:** Via vistas con `security_invoker=true` + RPCs + Edge Functions
- **22 vistas** en public schema, 18 con security_invoker, 4 excepciones documentadas
- **REVOKE anon** en vistas sensibles (user_profiles_v2, v_prospectos_ai_config, etc.)
- **Operaciones privilegiadas:** SIEMPRE via Edge Functions con JWT validation

### Regla CRITICA: CREATE OR REPLACE VIEW

`CREATE OR REPLACE VIEW` **RESETEA** security_invoker. Siempre agregar inmediatamente:
```sql
ALTER VIEW nombre_vista SET (security_invoker = true);
```

## Tablas Principales

### Prospectos y Ventas
- `prospectos` - Tabla principal de prospectos
- `prospect_assignments` - Asignaciones ejecutivo/coordinacion
- `assignment_logs` - Historial de asignaciones
- `timeline_activities` - Timeline de actividades
- `etapas` - Catalogo de etapas dinamicas
- `llamadas_ventas` - Registro de llamadas
- `llamadas_programadas` - Llamadas programadas (VAPI/N8N)
- `crm_data` - Datos sincronizados de Dynamics CRM
- `destinos` / `resorts` - Catalogos de destinos

### Usuarios y Permisos
- `user_profiles_v2` - Vista segura (SECURITY DEFINER, sin password_hash)
- `auth_roles` - Roles del sistema
- `auth_permissions` - Permisos disponibles
- `auth_user_permissions` - Permisos por usuario
- `auth_user_coordinaciones` - Relacion usuario-coordinacion
- `permission_groups` - Grupos de permisos
- `group_permissions` - Permisos por grupo
- `user_permission_groups` - Grupos asignados a usuarios
- `group_audit_log` - Auditoria de cambios en grupos
- `coordinaciones` - Catalogo de coordinaciones
- `auth_login_logs` - Registro de logins
- `active_sessions` - Sesiones activas

### WhatsApp y Chat
- `whatsapp_templates` - Plantillas de mensajes
- `whatsapp_audiences` - Audiencias para campanas
- `whatsapp_labels_preset` / `whatsapp_labels_custom` - Etiquetas
- `whatsapp_conversation_labels` - Labels por conversacion
- `whatsapp_template_sends` - Envios de plantillas
- `whatsapp_template_suggestions` - Sugerencias IA
- `whatsapp_delivery_errors` - Errores de entrega (dedup user+error+dia)
- `uchat_conversations` - Conversaciones UChat
- `uchat_messages` - Mensajes UChat
- `uchat_bots` - Configuracion bots
- `uchat_agent_assignments` - Asignaciones agente-chat
- `uchat_handoff_rules` - Reglas de handoff
- `conversaciones_whatsapp` / `mensajes_whatsapp` - Tablas legacy WhatsApp
- `quick_replies` - Respuestas rapidas
- `content_management` - Gestion contenido (imagenes catalogo)

### Comunicados (nuevo 2026-02-13)
- `comunicados` - Anuncios y tutoriales (RLS: admin-only write, REVOKE anon)
- `comunicado_reads` - Tracking lecturas por usuario (PK: comunicado_id + user_id)
- RPC: `mark_comunicado_read` (SECURITY DEFINER)
- Realtime habilitado para `comunicados`

### Agentes IA
- `agent_templates` - Plantillas de agentes
- `agent_prompts` - Prompts de agentes
- `agent_tools` - Herramientas de agentes
- `agent_categories` - Categorias
- `system_prompts` - Prompts del sistema
- `tools_catalog` - Catalogo de herramientas
- `agent_usage_logs` - Logs de uso

### IA y Analisis
- `call_analysis` / `call_analysis_summary` - Analisis de llamadas
- `ai_token_limits` / `ai_token_usage` - Control tokens IA
- `ai_user_permissions` / `ai_user_preferences` - Permisos IA por usuario
- `ai_audio_generations` - Generaciones de audio
- `ai_manager` - Configuracion modelos IA
- `paraphrase_logs` - Logs de parafraseo

### Notificaciones y Sistema
- `user_notifications` - Notificaciones por usuario
- `admin_messages` - Mensajes admin
- `support_tickets` / `support_ticket_comments` / `support_ticket_history` - Tickets
- `system_config` - Configuracion del sistema (version, flags)
- `app_themes` - Temas de la aplicacion
- `error_log` / `ui_error_log_*` - Logs de errores con anotaciones
- `content_moderation_warnings` / `user_warning_counters` - Moderacion
- `api_auth_tokens` - Tokens API
- `bot_pause_status` - Estado pausa bot
- `config_horarios_*` - Horarios dinamicos (base, bloqueos, excepciones)

### Campanas
- `whatsapp_audiences` - Audiencias filtradas
- `whatsapp_template_sends` - Tracking envios con A/B

## Vistas Principales (22)

| Vista | Security | Notas |
|-------|----------|-------|
| `user_profiles_v2` | DEFINER | Lee auth.users, REVOKE anon |
| `system_config_public` | DEFINER | Pre-auth API |
| `app_themes_public` | DEFINER | Pre-auth API |
| `log_config_public` | DEFINER | Pre-auth API |
| `live_monitor_view` | INVOKER | 62+ campos, clasificacion estado |
| `v_prospectos_ai_config` | INVOKER | REVOKE anon |
| `prospectos_con_ejecutivo_y_coordinacion` | INVOKER | REVOKE anon |
| `v_whatsapp_errors_detailed` | INVOKER | REVOKE anon |
| `api_auth_tokens_safe` | INVOKER | Sin secrets |
| `mv_conversaciones_dashboard` | MATERIALIZED | Refresh periodico |
| `v_campaign_analytics` | INVOKER | Analytics campanas |
| `v_horario_hoy` | INVOKER | Horario actual |
| `call_analysis_executive_summary` | INVOKER | Resumen ejecutivo |
| + 9 vistas adicionales | INVOKER | Varias |

## RPCs Principales

| RPC | Tipo | Uso |
|-----|------|-----|
| `mark_comunicado_read` | SECURITY DEFINER | Marcar comunicado como leido |
| `get_ventas_atribucion` | SECURITY DEFINER | Ventas con atribucion IA/WA/Sin asistencia (reemplaza get_sales_conversation_stats) |
| `get_conversations_count` | INVOKER | Conteo conversaciones |
| `get_template_response_rates` | INVOKER | Tasas respuesta plantillas |
| `get_active_call_prospect_ids` | INVOKER | IDs prospectos en llamada |
| `get_distinct_ejecutivo_ids` | INVOKER | IDs ejecutivos unicos |
| `user_can_see_prospecto` | INVOKER | Validacion acceso prospecto |

## Triggers Importantes

- `trigger_notify_prospecto_changes` - Genera notificaciones en INSERT/UPDATE de `prospectos`
- Trigger unificado: frontend solo escucha via Realtime

## Storage Buckets

- `user-avatars` - Avatares de usuarios
- `system-assets` - Assets del sistema (logos, etc.)
- `support-tickets` - Archivos adjuntos de tickets

## Edge Functions para BD

Para operaciones que requieren privilegios (bypass RLS):
- `secure-query` - Queries seguras con CORS whitelist
- `multi-db-proxy` - Operaciones multi-tabla con CORS whitelist
- `auth-admin-proxy` - CRUD de usuarios (crear, editar roles)

## Deploy Edge Functions

```bash
# Deploy individual
npx supabase functions deploy {nombre} --project-ref glsmifhkoaifvaegsozd

# Secrets: configurar en Supabase Dashboard (NUNCA en codigo)
```

## Tablas/Vistas DEPRECADAS (NO usar)

- `z_legacy_auth_users` - Auth users pre-migracion nativo
- Cualquier tabla con prefijo `z_backup_`
- `coordinador_coordinaciones*` - Eliminadas
