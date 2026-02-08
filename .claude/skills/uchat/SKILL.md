---
name: uchat
description: Administracion y debugging completo de UChat. Gestiona subscribers, bot fields, subflows, mensajes, bot control, tags, labels, user fields, eventos, webhooks, y diagnostica problemas de logs y entregas de mensajes WhatsApp.
---

# UChat - PQNC QA AI Platform

## REGLA: ESCRITURA requiere autorizacion explicita del usuario. LECTURA es libre.

## API Key
- Almacenada en `~/.zshrc` como `UCHAT_API_KEY` (NUNCA hardcodear)
- Base URL: `https://www.uchat.com.au/api`
- Auth: Bearer token
- IMPORTANTE: en Bash tool usar `UCHAT_API_KEY="..." node scripts/uchat-cli.cjs ...` porque `source ~/.zshrc` no siempre carga

## Invocacion

### Lectura (sin restricciones)
- `/uchat test` - Verificar conexion API
- `/uchat subscribers` - Listar subscribers
- `/uchat subscriber <user_ns>` - Info completa de subscriber
- `/uchat search --phone +52...` - Buscar subscriber
- `/uchat bot-fields` - Listar bot fields
- `/uchat subflows` - Listar subflows del bot
- `/uchat bot-users-count` - Conteo de usuarios por status
- `/uchat inbound-webhooks` - Listar inbound webhooks configurados
- `/uchat chat-messages <user_ns>` - Historial de mensajes
- `/uchat events` - Listar custom events
- `/uchat segments` - Listar segmentos
- `/uchat conversations` - Conversaciones cerradas

### Debug (sin restricciones)
- `/uchat debug <user_ns>` - Debug completo de un usuario
- `/uchat debug-error <user_ns>` - Debug de errores
- `/uchat debug-webhooks` - Verificar configuracion webhooks
- `/uchat debug-triggers` - Analizar triggers y keywords
- `/uchat diagnose-logs [user_ns]` - Diagnosticar logs perdidos
- `/uchat analyze-errors` - Analisis general de errores

### Mensajes (requiere autorizacion)
- `/uchat send-text <user_ns> <texto>` - Enviar texto
- `/uchat send-subflow <user_ns> <sub_flow_ns>` - Ejecutar subflow
- `/uchat send-content <user_ns> <json>` - Enviar contenido rich
- `/uchat send-node <user_ns> <node_ns>` - Enviar nodo especifico

### Bot Control (requiere autorizacion)
- `/uchat pause-bot <user_ns> <minutes>` - Pausar bot
- `/uchat resume-bot <user_ns>` - Reanudar bot
- `/uchat assign-agent <user_ns> <agent_id>` - Asignar agente live
- `/uchat move-chat <user_ns> <status>` - Mover chat (open/done/pending)
- `/uchat app-trigger <user_ns> <trigger_name>` - Disparar app trigger

### Escritura Subscribers/Fields (requiere autorizacion)
- `/uchat tag-add <user_ns> <tag>` - Agregar tag
- `/uchat field-set <user_ns> <field> <value>` - Set user field
- `/uchat bot-field-set <name> <value>` - Set bot field
- `/uchat subscriber-create --phone X` - Crear subscriber

## Flujo de Ejecucion

### 1. Mapear comando a CLI
Traducir el comando del usuario al script CLI:
```bash
UCHAT_API_KEY="..." node scripts/uchat-cli.cjs <command> [args] --json
```

Mapeo de comandos:
- `/uchat test` -> `test --json`
- `/uchat subscribers` -> `subscribers --json`
- `/uchat subscriber f190385u343660219` -> `subscriber f190385u343660219 --json`
- `/uchat debug f190385u343660219` -> `debug-user f190385u343660219 --json`
- `/uchat debug-error f190385u343660219` -> `debug-error f190385u343660219 --json`
- `/uchat search --phone +521234` -> `search-subscriber --phone +521234 --json`
- `/uchat bot-fields` -> `bot-fields --json`
- `/uchat subflows` -> `subflows --json`
- `/uchat bot-users-count` -> `bot-users-count --json`
- `/uchat chat-messages f190385u343660219` -> `chat-messages f190385u343660219 --json`
- `/uchat send-text f190385u343660219 Hola` -> `send-text f190385u343660219 Hola --json`
- `/uchat send-subflow f190385u343660219 f190385s3400927` -> `send-subflow f190385u343660219 f190385s3400927 --json`
- `/uchat pause-bot f190385u343660219 30` -> `pause-bot f190385u343660219 30 --json`
- `/uchat diagnose-logs` -> `diagnose-logs --json`
- `/uchat debug-webhooks` -> `debug-webhooks --json`

### 2. Ejecutar y parsear JSON
El CLI con `--json` devuelve JSON estructurado. Parsear y presentar al usuario de forma clara.

### 3. Para operaciones de escritura
SIEMPRE confirmar con el usuario antes de ejecutar. Ejemplo:
```
Voy a enviar el subflow send_error_log_db (f190385s3400927) al subscriber f190385u343660219. Confirmas?
```

### 4. Presentar resultados
Formatear la respuesta de forma clara y legible. Para debug, incluir analisis y recomendaciones.

## Comandos CLI Completos

### Lectura
| Skill Command | CLI Command |
|--------------|-------------|
| `/uchat test` | `test` |
| `/uchat bot-fields` | `bot-fields [--limit N]` |
| `/uchat bot-field <name>` | `bot-field <name>` |
| `/uchat subscribers` | `subscribers [--limit N] [--page N]` |
| `/uchat subscriber <ns>` | `subscriber <user_ns>` |
| `/uchat subscriber-by-id <id>` | `subscriber-by-id <user_id>` |
| `/uchat search --phone X` | `search-subscriber --phone X` |
| `/uchat subflows` | `subflows [--limit N]` |
| `/uchat bot-users-count` | `bot-users-count` |
| `/uchat inbound-webhooks` | `inbound-webhooks` |
| `/uchat chat-messages <ns>` | `chat-messages <user_ns> [--limit N]` |
| `/uchat segments` | `segments` |
| `/uchat events` | `events` |
| `/uchat event-summary <ns>` | `event-summary <event_ns>` |
| `/uchat event-data <ns>` | `event-data <event_ns>` |
| `/uchat conversations` | `conversations [--limit N]` |
| `/uchat activity-log` | `activity-log [--limit N]` |
| `/uchat user-fields` | `user-fields` |
| `/uchat flow-tags` | `flow-tags` |

### Debug
| Skill Command | CLI Command |
|--------------|-------------|
| `/uchat debug <ns>` | `debug-user <user_ns>` |
| `/uchat debug-error <ns>` | `debug-error <user_ns>` |
| `/uchat debug-webhooks` | `debug-webhooks` |
| `/uchat debug-triggers` | `debug-triggers` |
| `/uchat diagnose-logs [ns]` | `diagnose-logs [user_ns]` |
| `/uchat analyze-errors` | `analyze-errors` |

### Mensajes (requiere autorizacion)
| Skill Command | CLI Command |
|--------------|-------------|
| `/uchat send-text <ns> <txt>` | `send-text <user_ns> <texto>` |
| `/uchat send-subflow <ns> <sf>` | `send-subflow <user_ns> <sub_flow_ns>` |
| `/uchat send-content <ns> <json>` | `send-content <user_ns> <json_data>` |
| `/uchat send-node <ns> <node>` | `send-node <user_ns> <node_ns>` |

### Bot Control (requiere autorizacion)
| Skill Command | CLI Command |
|--------------|-------------|
| `/uchat pause-bot <ns> <min>` | `pause-bot <user_ns> <minutes>` |
| `/uchat resume-bot <ns>` | `resume-bot <user_ns>` |
| `/uchat assign-agent <ns> <id>` | `assign-agent <user_ns> <agent_id>` |
| `/uchat move-chat <ns> <status>` | `move-chat <user_ns> <status>` |
| `/uchat app-trigger <ns> <name>` | `app-trigger <user_ns> <trigger_name>` |

### Escritura Fields/Tags (requiere autorizacion)
| Skill Command | CLI Command |
|--------------|-------------|
| `/uchat tag-add <ns> <tag>` | `tag-add <user_ns> <tag_name>` |
| `/uchat tag-remove <ns> <tag>` | `tag-remove <user_ns> <tag_name>` |
| `/uchat label-add <ns> <label>` | `label-add <user_ns> <label>` |
| `/uchat field-set <ns> <f> <v>` | `field-set <user_ns> <name> <value>` |
| `/uchat field-clear <ns> <f>` | `field-clear <user_ns> <name>` |
| `/uchat bot-field-set <n> <v>` | `bot-field-set <name> <value>` |
| `/uchat bot-field-create <n>` | `bot-field-create <name>` |
| `/uchat subscriber-create` | `subscriber-create --phone X` |
| `/uchat subscriber-update <ns>` | `subscriber-update <ns> --name X` |

## Inventario UChat (auditado 2026-02-08)

### Numeros
- 4,213 subscribers (626 done + 3,587 open) | todos WhatsApp Cloud
- 3 bot fields | 13 user fields | 10 subflows
- 0 custom events | 0 segments | 0 flow tags | 0 inbound webhooks (via API)
- Bot prefix: `f190385`

### Bot Fields
| Nombre | NS | Valor |
|--------|-----|-------|
| `Error_log_webhook` | f190385v8089783 | `/webhook/error-log` |
| `Auth_Webhook_N8N` | f190385v7172327 | Bearer token N8N |
| `Webhook_URL_Production_Message_Flow` | f190385v7172325 | `/webhook/income-msg` |

### Subflows (10)
| Nombre | NS |
|--------|-----|
| `send_error_log_db` | f190385s3400927 |
| `llamada_no_contestada_2` | f190385s2902301 |
| `llamada_no_contestada_1` | f190385s2901721 |
| `Writing 15 seg` | f190385s2865467 |
| `Respuesta PQNC Humano` | f190385s2750597 |
| `Respuesta_agente_parte3` | f190385s2693635 |
| `Respuesta_agente_parte2` | f190385s2693633 |
| `Enviar_imagenes_dinamicas` | f190385s2631581 |
| `Error_log` | f190385s2609829 |
| `Respuesta_agente_parte1` | f190385s2292675 |

### User Fields (13)
- Error: `Error_Message` (f190385v8089539), `Error_count` (f190385v8089537)
- IA: `Respuesta_Agente_Externo_parte1/2/3`, `url_audio`
- Humano: `respuesta_pqnc_humano`, `Ultimo_mensaje_agente_humano`
- Media: `url_imagen_dinamica`, `titulo_imagen_dinamica`, `subtitulo_imagen_dinamica`
- Otros: `Nombre_prospecto`, `N8N_API_Response`

## Flujo de Webhooks UChat <-> N8N

### Mensajes Entrantes (funciona correctamente)
```
WhatsApp -> UChat -> /webhook/income-msg -> N8N fixiAqnLzAGncHdD [Message flow PQNC v3]
```

### Flujo de Errores (ROTO - diagnosticado 2026-02-08)
- Trigger `error_log_to_db_pqnc_ai` captura errores en `Error_Message` pero NO envia a N8N
- El flujo UChat que antes enviaba a `/error-log` ya no existe
- Subflow `send_error_log_db` (f190385s3400927) existe - podria ser la pieza faltante
- `/import_logs` (MYubKYdoaxTL_uYIIf_9H) es dead-end (0 nodos procesamiento)
- `/error-log` (50AiBaeBlFKxPMsK) recibe errores de UI frontend, NO de UChat

## Trigger de Errores: `error_log_to_db_pqnc_ai`
- Frecuencia: 1 vez/hora por usuario
- Keywords: WhatsApp Error, error, Error, ERROR, failed, Failed, Message undeliverable, Message not sent, timeout, Timeout, connection error, Connection error, invalid, WhatsApp Error:, not delivered, Message Undeliverable, Undeliverable, undeliverable
- Accion: Save to user field `Error_Message`
- El trigger SI matchea el error 131049 ("WhatsApp Error:")

## Errores WhatsApp Comunes
- **131049**: Meta limita por "healthy ecosystem engagement"
- **Outside 24 hours**: ventana de 24h expirada
- **Message undeliverable**: numero invalido/bloqueado

## Endpoints API Verificados (2026-02-08)

### Funcionan
- `GET /flow/subflows` - Listar subflows
- `GET /flow/bot-users-count` - Stats usuarios
- `GET /flow/inbound-webhooks` - Webhooks entrantes
- `GET /flow/bot-fields` - Bot fields
- `GET /flow/segments` - Segmentos
- `GET /flow/custom-events` - Eventos
- `GET /flow/conversations/data` - Conversaciones
- `GET /flow/agent-activity-log/data` - Activity log
- `GET /flow/user-fields` - User fields definition
- `GET /flow/tags` - Flow tags
- `GET /subscribers` - Listar subscribers
- `GET /subscriber/get-info` - Info subscriber
- `GET /subscriber/chat-messages` - Historial mensajes
- `POST /subscriber/send-text` - Enviar texto (user_ns, content)
- `POST /subscriber/send-sub-flow` - Ejecutar subflow (user_ns, sub_flow_ns)
- `POST /subscriber/send-content` - Enviar rich (user_ns, data)
- `POST /subscriber/send-node` - Enviar nodo (user_ns, node_ns)
- `POST /subscriber/pause-bot` - Pausar (user_ns, minutes)
- `POST /subscriber/resume-bot` - Reanudar (user_ns)
- `POST /subscriber/assign-agent` - Asignar (user_ns, agent_id)
- `POST /subscriber/move-chat-to` - Mover (user_ns, status)
- `POST /subscriber/app-trigger` - Trigger (user_ns, trigger_name)

### No disponibles en esta instancia
- `/flow/team-flows`, `/flow/team-members`, `/flow/whatsapp-templates`
- `/flow/summary`, `/flow/labels`, `/flow/ticket-lists`, `/flow/integrations`
- `/subscriber/send-template`, `/subscriber/log-event`, `/flow/broadcast`

## Manejo de Errores CLI
- **401 Unauthenticated**: API key invalida o no cargada en env
- **400 Bad Request**: parametros incorrectos
- **404**: subscriber/field/endpoint no encontrado

## Notas
- UChat API base: `https://www.uchat.com.au/api`
- Batch operations max 20 items
- Dos patrones ID: namespace (var_ns, tag_ns, sub_flow_ns) y nombre humano
- CLI v2.0 con `--json` para integracion Claude Code
- Standalone: `node scripts/uchat-cli.cjs help`
- Contexto completo del inventario en: `.claude/agents/uchat-agent.md`
