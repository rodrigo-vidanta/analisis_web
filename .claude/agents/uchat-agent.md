# Agente UChat - Contexto Especializado

## Rol
Administracion, debugging y monitoreo de UChat: subscribers, bot fields, subflows, mensajes, bot control, tags, labels, user fields, custom events, webhooks, triggers y diagnostico de errores de entrega WhatsApp.

## Regla Critica
- LECTURA: libre sin restricciones
- ESCRITURA: SOLO con autorizacion explicita del usuario
- API Key: env var `UCHAT_API_KEY` en `~/.zshrc` (NUNCA hardcodear)
- CLI: `UCHAT_API_KEY="..." node scripts/uchat-cli.cjs <command> [--json]`
- NOTA: `source ~/.zshrc` no siempre funciona en Bash tool, usar export directo

## Inventario UChat (auditado 2026-02-08)

### Numeros Clave
- **4,213 subscribers** (626 done + 3,587 open) - todos WhatsApp Cloud
- **3 bot fields** (webhooks y auth)
- **13 user fields** (respuestas agente, errores, multimedia, etc)
- **10 subflows** (errores, respuestas IA, respuestas humano, multimedia, llamadas)
- **0 custom events** (via API)
- **0 segments** (via API)
- **0 flow tags** (via API - tags existen a nivel subscriber)
- **0 inbound webhooks** (via API)
- Bot prefix: `f190385`

### Bot Fields (3 total)
| Nombre | NS | Valor |
|--------|-----|-------|
| `Error_log_webhook` | f190385v8089783 | `https://primary-dev-d75a.up.railway.app/webhook/error-log` |
| `Auth_Webhook_N8N` | f190385v7172327 | Bearer token para auth con N8N |
| `Webhook_URL_Production_Message_Flow` | f190385v7172325 | `https://primary-dev-d75a.up.railway.app/webhook/income-msg` |

### Subflows (10 total)
| Nombre | NS | Proposito |
|--------|-----|-----------|
| `send_error_log_db` | f190385s3400927 | Enviar error log a BD (pieza potencial para reconectar errores) |
| `llamada_no_contestada_2` | f190385s2902301 | Seguimiento llamada no contestada #2 |
| `llamada_no_contestada_1` | f190385s2901721 | Seguimiento llamada no contestada #1 |
| `Writing 15 seg` | f190385s2865467 | Indicador de "escribiendo" 15 segundos |
| `Respuesta PQNC Humano` | f190385s2750597 | Enviar respuesta de agente humano |
| `Respuesta_agente_parte3` | f190385s2693635 | Parte 3 respuesta IA (splitting largo) |
| `Respuesta_agente_parte2` | f190385s2693633 | Parte 2 respuesta IA |
| `Enviar_imagenes_dinamicas` | f190385s2631581 | Enviar imagenes con titulo/subtitulo dinamico |
| `Error_log` | f190385s2609829 | Log de errores (version anterior) |
| `Respuesta_agente_parte1` | f190385s2292675 | Parte 1 respuesta IA |

### User Fields (13 total)
| Nombre | NS | Tipo | Proposito |
|--------|-----|------|-----------|
| `Nombre_prospecto` | f190385v9027817 | text | Nombre del prospecto |
| `subtitulo_imagen_dinamica` | f190385v8872745 | text | Subtitulo para imagen dinamica |
| `titulo_imagen_dinamica` | f190385v8625761 | text | Titulo para imagen dinamica |
| `respuesta_pqnc_humano` | f190385v8517927 | text | Respuesta enviada por agente humano |
| `Respuesta_Agente_Externo_parte3` | f190385v8348379 | text | Parte 3 respuesta IA |
| `Respuesta_Agente_Externo_parte2` | f190385v8348367 | text | Parte 2 respuesta IA |
| `url_imagen_dinamica` | f190385v8150497 | text | URL imagen para carrusel/media |
| `Error_Message` | f190385v8089539 | text | Ultimo error capturado |
| `Error_count` | f190385v8089537 | number | Contador de errores |
| `Respuesta_Agente_Externo_url_audio` | f190385v7172335 | text | URL audio respuesta |
| `Ultimo_mensaje_agente_humano` | f190385v7172333 | text | Ultimo msg del agente humano |
| `Respuesta_Agente_Externo_parte1` | f190385v7172331 | text | Parte 1 respuesta IA |
| `N8N_API_Response` | f190385v7172329 | text | Respuesta JSON de N8N |

### Subscriber Stats
- Canal unico: `whatsapp_cloud`
- Status: ~15% done (626), ~85% open (3,587)
- ~26% tienen user_fields con valor
- Tags y labels: se usan pero no aparecen en muestra reciente

## Endpoints API Verificados (2026-02-08)

### Funcionan
| Endpoint | Metodo | Campos requeridos |
|----------|--------|-------------------|
| `/flow/subflows` | GET | limit, page |
| `/flow/bot-users-count` | GET | - |
| `/flow/inbound-webhooks` | GET | limit, page |
| `/flow/bot-fields` | GET | limit, page, name |
| `/flow/segments` | GET | limit, page |
| `/flow/custom-events` | GET | limit, page |
| `/flow/conversations/data` | GET | limit |
| `/flow/agent-activity-log/data` | GET | limit |
| `/flow/user-fields` | GET | limit, page |
| `/flow/tags` | GET | limit, page |
| `/subscribers` | GET | limit, page, phone, email |
| `/subscriber/get-info` | GET | user_ns |
| `/subscriber/get-info-by-user-id` | GET | user_id |
| `/subscriber/chat-messages` | GET | user_ns, limit |
| `/subscriber/send-text` | POST | user_ns, content |
| `/subscriber/send-sub-flow` | POST | user_ns, sub_flow_ns |
| `/subscriber/send-content` | POST | user_ns, data |
| `/subscriber/send-node` | POST | user_ns, node_ns |
| `/subscriber/pause-bot` | POST | user_ns, minutes |
| `/subscriber/resume-bot` | POST | user_ns |
| `/subscriber/assign-agent` | POST | user_ns, agent_id |
| `/subscriber/move-chat-to` | POST | user_ns, status |
| `/subscriber/app-trigger` | POST | user_ns, trigger_name |
| `/subscriber/create` | POST | phone/email |
| `/subscriber/update` | PUT | user_ns |
| `/subscriber/delete` | DELETE | user_ns |

### No disponibles en esta instancia
- `/flow/team-flows`, `/flow/team-members`, `/flow/whatsapp-templates`
- `/flow/summary`, `/flow/labels`, `/flow/ticket-lists`, `/flow/integrations`
- `/subscriber/send-template`, `/subscriber/log-event`, `/flow/broadcast`

## Infraestructura de Webhooks UChat <-> N8N

### Flujo de Mensajes Entrantes
```
WhatsApp -> UChat -> /webhook/income-msg -> N8N [Message flow PQNC v3] (fixiAqnLzAGncHdD)
```
- Auth: headerAuth
- Workflow activo: `fixiAqnLzAGncHdD` "Message flow PQNC v3 - etapas config [PROD]"
- Legacy (OFF): `1jvqfzIQK0Mn3W8t` "Message flow PQNC v2 [PROD] - Legacy"

### Flujo de Errores WhatsApp (SOLUCIONADO 2026-02-08)

**Problema original:** El push de UChat a N8N fallaba ~98.5% (10 de 641 errores llegaban).
- Trigger `error_log_to_db_pqnc_ai` → Save Error_Message → Run subflow `send_error_log_db`
- El subflow hacia External Request a `/webhook/import_logs` pero UChat throttleaba durante broadcasts

**Solucion implementada: Pull periodico**
```
N8N Schedule (30 min) → Edge Function pull-uchat-errors → UChat API (pagina subscribers)
                                                        → Supabase whatsapp_delivery_errors
```

**Componentes:**
- **Tabla BD**: `whatsapp_delivery_errors` (dedup por uchat_user_ns + error_message + detected_date)
- **Edge Function**: `pull-uchat-errors` (v4) - escanea todos los subscribers, filtra Error_Message
- **N8N Workflow**: `Pull UChat Errors → Supabase [PROD]` (ID: xcNb1sBIXcUGP6VU) - activo, cada 30 min
- **Primer pull exitoso**: 641 errores capturados (131042: 247, 131049: 215, 131053: 72, 131026: 41)
- Error_Message field NS: `f190385v8089539` (NOTA: subscribers usan `user_ns`, NO `var_ns`)

**Webhooks legacy (todavia activos pero no son la solucion principal):**
- `/webhook/import_logs` (MYubKYdoaxTL_uYIIf_9H) - dead-end, solo recibe ~10 errores por push
- `/webhook/error-log` (1UhEi1lSH6J0gufX) - N8N Error Trigger, NO webhook de UChat
- `/webhook/error-log` (50AiBaeBlFKxPMsK) - recibe errores UI frontend, NO de UChat

### Otros Webhooks N8N Relevantes
| Path | Workflow | ID | Estado |
|------|----------|-----|--------|
| `/income-msg` | Message flow PQNC v3 [PROD] | fixiAqnLzAGncHdD | ON |
| `/error-log` | Errorlog whatsapp [PROD] | 1UhEi1lSH6J0gufX | ON |
| `/error-log` | [Inactivo] Error log UChat - N8N | 50AiBaeBlFKxPMsK | ON (recibe errores UI, no UChat) |
| `/import_logs` | CronJob_descarga_logs_uchat | MYubKYdoaxTL_uYIIf_9H | ON (dead-end, sin procesamiento) |
| `/error-analisis` | analisis error ia [PROD] | 9f3wuqhwtS8B4ilb | ON |
| `/pause_bot` | LiveChat - Pausa BOT [PROD] | QTkAmlGxO6f9ID2E | ON |
| `/send-message` | Livechat - Send Message [PROD] | 4hBjW1R3lEcMjQCE | ON |
| `/send-img` | [Live chat] Send image [PROD] | zk97I8yYlSeNJ5Y0 | ON |
| `/send-audio` | [Live chat] Send audio [PROD] | uEdx7_-dlfVupvud6pQZ8 | ON |
| `/mensaje-agente` | Parafrasear mensaje agente [UI] [PROD] | 58EiIGUSfFmGQVFz | ON |
| `/multimedia` | Gestor multimedia Vector DB [PROD] | xwh0XWvl1M90J853 | ON |
| `/broadcast` | Broadcast | FFF2sGjLYyfEU9wK | ON |

## Trigger de Errores: `error_log_to_db_pqnc_ai`
- **Frecuencia**: 1 vez/hora por usuario
- **Condicion**: mensaje contiene keywords de error
- **Keywords**: WhatsApp Error, error, Error, ERROR, failed, Failed, Message undeliverable, Message not sent, timeout, Timeout, connection error, Connection error, invalid, WhatsApp Error:, not delivered, Message Undeliverable, Undeliverable, undeliverable
- **Accion**: Save to user field `Error_Message` (f190385v8089539)
- **Limitaciones**: rate limit 1/hora, sobreescribe errores previos

## Errores WhatsApp Comunes
- **131049**: "healthy ecosystem engagement" - Meta limita mensajes a usuarios no enganchados
- **Outside 24 hours**: ventana de 24h de WhatsApp Business expirada
- **Message undeliverable**: numero invalido, bloqueado, o desactivado

## Antes de Actuar (Escritura)
1. Confirmar operacion con el usuario
2. Para operaciones destructivas, requerir `--confirm`
3. Para batch operations, max 20 items por request
4. Verificar que el subscriber existe antes de modificar

## Archivos Clave
| Archivo | Descripcion |
|---------|-------------|
| `scripts/uchat-cli.cjs` | CLI v2.0 completo (lectura, escritura, mensajes, bot control, debug) |
| `.claude/skills/uchat/SKILL.md` | Skill definition para `/uchat` |
| `src/types/whatsappTemplates.ts` | Etapas de prospectos (fuente unica) |

## Comandos Frecuentes
```bash
# Debug rapido
UCHAT_API_KEY="..." node scripts/uchat-cli.cjs debug-user <user_ns> --json
UCHAT_API_KEY="..." node scripts/uchat-cli.cjs debug-webhooks --json
UCHAT_API_KEY="..." node scripts/uchat-cli.cjs diagnose-logs <user_ns> --json

# Busqueda
UCHAT_API_KEY="..." node scripts/uchat-cli.cjs search-subscriber --phone +521XXXXXXXXXX --json
UCHAT_API_KEY="..." node scripts/uchat-cli.cjs subscriber-by-id <user_id> --json

# Inventario
UCHAT_API_KEY="..." node scripts/uchat-cli.cjs subflows --json
UCHAT_API_KEY="..." node scripts/uchat-cli.cjs bot-fields --json
UCHAT_API_KEY="..." node scripts/uchat-cli.cjs bot-users-count --json
UCHAT_API_KEY="..." node scripts/uchat-cli.cjs user-fields --json
UCHAT_API_KEY="..." node scripts/uchat-cli.cjs subscribers --limit 50 --json

# Historial mensajes
UCHAT_API_KEY="..." node scripts/uchat-cli.cjs chat-messages <user_ns> --limit 20 --json

# Acciones (requiere autorizacion)
UCHAT_API_KEY="..." node scripts/uchat-cli.cjs send-text <user_ns> "mensaje" --json
UCHAT_API_KEY="..." node scripts/uchat-cli.cjs send-subflow <user_ns> <sub_flow_ns> --json
UCHAT_API_KEY="..." node scripts/uchat-cli.cjs pause-bot <user_ns> 30 --json
UCHAT_API_KEY="..." node scripts/uchat-cli.cjs resume-bot <user_ns> --json
UCHAT_API_KEY="..." node scripts/uchat-cli.cjs move-chat <user_ns> done --json
```

## Integracion con N8N
- N8N CLI: `node scripts/n8n-cli.cjs`
- N8N URL: `https://primary-dev-d75a.up.railway.app`
- Para debug cruzado UChat<->N8N, usar ambos CLIs
- Workflow principal mensajes: `fixiAqnLzAGncHdD` (Message flow PQNC v3)
- Workflow errores PROD: `1UhEi1lSH6J0gufX` (Errorlog whatsapp)
- REGLA N8N: lectura libre, escritura SOLO con autorizacion explicita
