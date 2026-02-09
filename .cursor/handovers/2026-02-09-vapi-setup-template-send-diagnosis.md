# HANDOVER-2026-02-09-VAPI-TEMPLATE-DIAGNOSIS

**Fecha**: 2026-02-09 | **Version**: v2.8.1 | **Build**: ok (no code changes)

## Contexto

Sesion con dos bloques: (1) Setup completo de integracion VAPI voice AI, (2) Diagnostico de error 500 al enviar plantilla WhatsApp a prospecto importado manualmente.

## Delta

| Bloque | Descripcion |
|--------|-------------|
| 1 | Setup VAPI: CLI, skill, agente, inventario completo, analisis de costos y llamadas |
| 2 | Diagnostico: plantilla WhatsApp falla para prospectos sin `id_uchat` |

## Archivos Creados

| Archivo | Contenido |
|---------|-----------|
| `scripts/vapi-cli.cjs` | CLI v1.0 para VAPI API (llamadas, assistants, phones, tools, analytics, logs) |
| `.claude/skills/vapi/SKILL.md` | Skill `/vapi` para gestion de VAPI desde Claude Code |
| `.claude/agents/vapi-agent.md` | Agente especializado con inventario completo de VAPI |
| `.claude/docs/vapi/vapi-inventory.md` | Inventario detallado: 7 assistants, 10 phones, 13 tools |
| `.claude/docs/vapi/vapi-call-analysis.md` | Analisis de 44 llamadas/dia, $1.61/dia, patrones de uso |

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `CLAUDE.md` | Agregada referencia a `vapi-agent.md` en seccion agentes |
| `MEMORY.md` | Seccion VAPI completa con keys, endpoints, inventario |

## Decisiones Tecnicas

- **VAPI: API REST directa > SDK**: Los agentes productivos corren via N8N assistant override, no desde browser. SDK innecesario.
- **VAPI: Private key en env var**: `VAPI_API_KEY` en `~/.zshrc`, igual patron que UChat/N8N.

## Diagnostico: Error 500 whatsapp-templates-send-proxy

### Problema
- Prospecto `395d41d8-50fb-4beb-9005-1d620974a125` (ITZA GARCIA) no puede recibir plantillas WhatsApp
- Error: `Webhook Error: 500 - {"message":"Workflow execution failed"}`
- Otros prospectos SI funcionan

### Causa Raiz
- `prospectos.id_uchat = null` (importado manual, no registrado en UChat)
- Workflow N8N `[api]-whatsapp-templates-envio-v2` (ID: `pZSsb89s4ZqN8Pl6`) requiere `id_uchat` o `subscriber_ns`
- Nodo "Payload Sin Imagen" / "Actualizar Payload con GCS URL" lanza: `Error: No se encontro subscriber_ns para item`

### Flujo del Error
1. Frontend → Edge Function `whatsapp-templates-send-proxy`
2. Edge Function → N8N webhook `/whatsapp-templates-send`
3. N8N query: `SELECT p.id_uchat FROM prospectos WHERE p.id = ?` → null
4. `const subscriberNs = template.id_uchat || inputData.subscriber_ns` → ambos null
5. throw Error → 500

### Por que funciona con otros
- Prospectos importados via `ImportWizardModal` pasan por `import-contact-proxy` que crea subscriber UChat y asigna `id_uchat`
- `SendTemplateToProspectModal` asume que `id_uchat` ya existe — no importa a UChat

### Fix Requerido (backend)
- Opcion A: `SendTemplateToProspectModal` debe llamar `import-contact-proxy` antes si `id_uchat = null`
- Opcion B: Workflow N8N debe crear subscriber UChat on-the-fly si no existe
- Opcion C: Bloquear envio en UI si prospecto no tiene `id_uchat` (mostrar mensaje explicativo)

## Trampas y Gotchas

- `prospectos` tabla NO tiene columna `telefono` ni `whatsapp_phone` — el campo correcto es `whatsapp` y `telefono_principal`
- Edge Function `whatsapp-templates-send-proxy` no se puede leer via MCP (`Failed to retrieve function bundle`)
- Los logs de Edge Functions solo muestran status code, no body del error — el detalle esta en N8N

## VAPI Inventario Rapido

- Phone produccion: `+523224870413` (Twilio, ID: `15e9866d...`)
- N8N Inbound: `bGj8dv3dbSVV72bm` | N8N Outbound: `TnOvzPaammFaYuHL`
- ~44 llamadas/dia | ~$1.61/dia | Voice: 11labs multilingual_v2
- NO hay agentes productivos en VAPI directo — todo via assistant override en N8N

## Pendiente

1. **Backend**: Fix para envio de plantillas a prospectos sin `id_uchat` (pasado a ingeniero de backend)
2. **VAPI**: CLI creado pero no testeado en produccion — validar con llamadas reales

## Estado

- Build: no code changes en esta sesion (solo docs/tools)
- Deploy: no requerido
- Archivos sin commit: `scripts/vapi-cli.cjs`, `.claude/agents/vapi-agent.md`, `.claude/docs/vapi/`, `.claude/skills/vapi/`, cambios en `CLAUDE.md`
- Commit: ultimo `820d95d` (docs: agregar referencia a vapi-agent en CLAUDE.md)
