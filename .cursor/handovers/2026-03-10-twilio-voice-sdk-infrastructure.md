# Handover: Twilio Voice SDK Infrastructure & Deep Discovery

**Fecha**: 2026-03-10
**Sesion**: Creacion completa de infraestructura Twilio + investigacion profunda Voice SDK
**Estado**: Completado (documentacion e investigacion). Implementacion pendiente autorizacion.

---

## Resumen Ejecutivo

Se creo la infraestructura completa de tooling para gestionar Twilio desde Claude Code y se realizo una investigacion profunda (12 agentes en 2 rondas) para resolver el problema de transferencias WhatsApp→ejecutivo. Se documento la arquitectura completa para implementar Twilio Voice SDK en el browser.

## Problema Original

Las transferencias de llamadas WhatsApp→PSTN fallan porque **Twilio bloquea conexiones WhatsApp→PSTN**: "Calls from WhatsApp endpoints can't be connected to PSTN endpoints." Esto afecta el flujo VAPI→transfer→ejecutivo cuando la llamada origina en WhatsApp.

## Solucion Arquitectonica Decidida

**Patron `phoneCallProviderBypassEnabled`** (oficial de Twilio Professional Services, repo: `twilio-professional-services/twilio-vapi`):

```
WhatsApp → Twilio (+523224870413) → N8N (intercepta CallSid)
  → VAPI con phoneCallProviderBypassEnabled: true
  → IA conversa con prospecto
  → IA decide transferir → tool webhook → N8N
  → N8N: POST /Calls/{CallSid}.json → TwiML: <Dial><Client>agent_id</Client></Dial>
  → Browser ejecutivo: Device.on('incoming') → call.accept()
  → Prospecto conectado con ejecutivo via VoIP (sin PSTN)
```

### Por que este patron y no otros

| Alternativa | Descartada porque |
|-------------|------------------|
| SIP REFER | Bug mas reportado en VAPI community (falla silenciosamente) |
| VAPI transferCall a numero | WhatsApp→PSTN bloqueado por Twilio |
| SIP Domain routing | Requiere SIP REFER que es fragil |
| Conference desde inicio | Demasiado complejo, requiere reescribir flujo VAPI |
| VAPI endCall + redirect | Race condition, call puede morir antes del redirect |

## Archivos Creados

### Agentes
| Archivo | Lineas | Contenido |
|---------|--------|-----------|
| `.claude/agents/twilio-agent.md` | ~850 | Admin general: cuenta, API REST, TwiML, CLI, MCP, inventario |
| `.claude/agents/twilio-voice-sdk-agent.md` | ~400 | SDK browser: Device, Call, AudioHelper, React hooks, tokens, conference |

### Skill
| Archivo | Lineas | Contenido |
|---------|--------|-----------|
| `.claude/skills/twilio/SKILL.md` | ~240 | 40+ comandos read/write mapeados a curl API REST |

### Archivos Modificados
| Archivo | Cambio |
|---------|--------|
| `CLAUDE.md` | Agregado `twilio-agent.md` y `twilio-voice-sdk-agent.md` a lista de agentes |
| `MEMORY.md` | Seccion Twilio completa con decision arquitectonica transfer |
| `~/.zshrc` | Env vars: `TWILIO_ACCOUNT_SID`, `SID_API_ADMIN_TWILIO`, `SECRET_ADMIN_API_TWILIO` |

### Base de Datos
| Cambio | Detalle |
|--------|---------|
| `system_config` INSERT | `transfer_fallback_phone` → `{"phone": "+528002233444", "name": "Linea 800 Vida Vacations"}` |
| `get_best_transfer_target` UPDATE | Lee fallback de `system_config` en vez de hardcoded |

## Investigacion Realizada (12 agentes, 2 rondas)

### Ronda 1: Discovery inicial (5 agentes)
1. **REST API v2010** — Endpoints completos, paginacion, auth patterns
2. **CLI comandos** — Comandos principales, flags, plugins basicos
3. **Voice SDK browser** — Device, Call, AccessToken, patron React basico
4. **TwiML/SIP/transfers** — Verbos, nouns, limitaciones VAPI, conference basics
5. **MCP/plugins/repos** — `@twilio-alpha/mcp`, community servers, VS Code extensions

### Ronda 2: Deep discovery (6 agentes)
1. **Voice SDK API completo** — Leyo `.d.ts` directamente de `node_modules`. Todos los eventos, metodos, propiedades, tipos TS, hooks React (useDevice, useCall, useAudioDevices), store Zustand, PreflightTest, error codes 31xxx/53xxx, edge locations, warning thresholds
2. **Access Tokens** — JWT anatomy (`cty: "twilio-fpa;v=1"` critico), VoiceGrant 5 propiedades, generacion manual con `jose` para Deno (NO necesita SDK Twilio 60MB), Edge Function completa, identity rules (max 121 chars, [a-zA-Z0-9_]), token lifecycle, fork behavior
3. **Twilio MCP Server** — v0.7.0 PoC, 39 servicios (no 41), bugs #53-#58 rompen Claude Code, NO soporta env vars (#51), decision: no integrar aun. Plugin-token tiene 7 comandos. 8 plugins oficiales total
4. **Conference transfers** — Participants API completo (30+ params), warm transfer step-by-step, coach mode/whisper, supervisor monitor/barge-in, conference lifecycle, edge cases (DTMF no funciona en conference, max 10 con recording, 250 sin)
5. **CLI completo** — 53 API topics, 60+ subresources en api:core, 8 plugins oficiales con todos sus comandos, scripting con jq, v5→v6 breaking changes, ngrok removido en v6
6. **VAPI→Twilio transfer** — 5 rutas rankeadas por viabilidad, `phoneCallProviderBypassEnabled` ganador, `transfer-destination-request` event, controlUrl transfer, squad limitations, WhatsApp constraints confirmadas

## Inventario Cuenta Twilio (auditado 2026-03-10)

| Recurso | Cantidad | Detalle |
|---------|----------|---------|
| Phone Numbers | 2 | +523224870413 (VAPI prod), +523223080074 (voicemail) |
| TwiML Apps | 1 | WhatsApp Voice VAPI → N8N webhook |
| SIP Trunks | 2 | VAPI (vapi-pqnc.pstn.twilio.com), Livekit |
| API Keys | 4 | Claude Code, vapi-monitor, VAPI-Vidanta, test n8n |
| Costo mensual | ~$184 | WhatsApp templates ~$183 + calls ~$1.58 |

## Implementacion Pendiente (cuando se autorice)

### Componentes por crear
1. **Edge Function**: `generate-twilio-token` — JWT con `jose`, auth Supabase, CORS
2. **TwiML App**: Voice Client routing (Voice URL → N8N webhook)
3. **N8N Workflow modificado**: Interceptar CallSid antes de VAPI, `phoneCallProviderBypassEnabled`
4. **React hooks**: `useTwilioVoice.ts` (useDevice + useCall + useAudioDevices)
5. **Zustand store**: `twilioVoiceStore.ts`
6. **Componentes UI**: TwilioVoiceReceiver, IncomingCallModal, ActiveCallBar, AudioDeviceSelector

### Secrets por configurar en Supabase
```
TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, TWILIO_TWIML_APP_SID, ALLOWED_ORIGIN
```

### Dependencias ya instaladas
- `@twilio/voice-sdk` v2.15.0 (latest: 2.18.0)
- `zustand` v5, React 19 — todo listo en el proyecto

## Decisiones Tecnicas Clave

| Decision | Justificacion |
|----------|--------------|
| `jose` en vez de `twilio` SDK para tokens | 40KB vs 60MB, compatible Deno Edge Functions |
| `phoneCallProviderBypassEnabled` | Patron oficial Twilio PS, funciona con WhatsApp, no depende de SIP REFER |
| No integrar MCP en `.mcp.json` | Bugs #53-#58, no env vars, skill `/twilio` mas estable |
| Edge `roaming` para Mexico | Auto GLL selecciona ashburn/umatilla (mas cercanos) |
| Identity `agent_{userId}` | UUID sin guiones, max 121 chars, compatible TwiML `<Client>` |
| Conference para warm transfer | Customer(endOnExit=true), Agent(endOnExit=false), coach mode via CallSidToCoach |

## Notas Importantes

- **SDK v2.15.0 instalado** pero v2.18.0 disponible (considerar upgrade antes de implementar)
- **WhatsApp voice → PSTN bloqueado por Twilio** es una limitacion de plataforma, no un bug
- **Token refresh**: `tokenWillExpire` fires 10s antes de expiry, llamada activa sobrevive token expirado pero no puede recibir nuevas
- **PreflightTest**: `Device.runPreflight(token)` para validar conectividad antes de registrar
- **Max 10 registrations por identity** — tab multiples suenan todas, primer accept gana
