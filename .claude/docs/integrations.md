# Integraciones - PQNC QA AI Platform

> Actualizado: 2026-02-13 | Verificado contra codigo real

## N8N (Railway)

### Acceso
- URL: `https://primary-dev-d75a.up.railway.app`
- ~200 workflows | API Key en `~/.zshrc` como `N8N_API_KEY`
- CLI: `node scripts/n8n-cli.cjs` (v3.0 con analisis forense)
- Skill: `/n8n` (si existe) | LECTURA LIBRE, ESCRITURA CON AUTORIZACION
- Proxy: `src/services/n8nProxyService.ts`

### Workflows Produccion (NO modificar sin autorizacion)
- Workflows marcados con [PROD] son criticos
- Operaciones alto riesgo: DELETE workflows, DEACTIVATE, eliminar ejecuciones

### Uso en Codigo
```typescript
import { n8nProxyService } from '@/services/n8nProxyService';
await n8nProxyService.executeWorkflow(workflowId, data);
```

## WhatsApp (UChat)

### Acceso
- API: `https://www.uchat.com.au/api` | Bearer token
- API Key en `~/.zshrc` como `UCHAT_API_KEY`
- CLI: `node scripts/uchat-cli.cjs` (v2.0)
- Skill: `/uchat` | LECTURA LIBRE, ESCRITURA CON AUTORIZACION
- 4,213 subscribers | 3 bot fields | 13 user fields | 10 subflows
- Bot prefix: `f190385`

### Servicios
- `whatsappTemplatesService.ts` - CRUD plantillas
- `whatsappLabelsService.ts` - Etiquetas (preset + custom)
- `quickRepliesService.ts` - Respuestas rapidas
- `optimizedConversationsService.ts` - Conversaciones optimizadas
- `botPauseService.ts` - Pausar bot por usuario
- `uchatService.ts` - Interaccion directa UChat API

### Edge Functions
- `send-message-proxy` - Enviar mensajes texto
- `send-img-proxy` - Enviar imagenes
- `send-audio-proxy` - Enviar audio (WebM→MP3 via Web Worker)
- `broadcast-proxy` - Envio masivo
- `pause-bot-proxy` - Control del bot
- `whatsapp-templates-proxy` - Gestion plantillas
- `import-contact-proxy` - Importar contactos

### UChat Error Pipeline
- **Problema:** Push UChat→N8N perdia 98.5% errores por throttling broadcasts
- **Solucion:** Pull periodico via Edge Function `pull-uchat-errors` (v4)
- **Tabla:** `whatsapp_delivery_errors` (dedup por user+error+dia)
- **N8N Workflow:** "Pull UChat Errors → Supabase [PROD]" (cada 30 min)
- **Error_Message field NS:** `f190385v8089539`

### Etapas de Prospectos
- Definidas en `src/types/whatsappTemplates.ts` (UNICA fuente de verdad)
- Case-sensitive, sin acentos donde BD no los tiene

### Campanas
- A/B testing: 2 registros con `ab_group_id` compartido
- Webhooks a N8N: enviar SOLO WHERE clauses (no SELECT)
- Filtros: etapa, estado civil, viaja con, destinos, dias sin contacto, email, etiquetas

## VAPI (Voice AI)

### Acceso
- API: `https://api.vapi.ai` | Bearer token (private key)
- Private Key en `~/.zshrc` como `VAPI_API_KEY`
- Public Key: `3e3fadea-6c78-4002-8b7b-8f80674c7906`
- Org ID: `3e0ed58d-6294-4711-9cb9-b98ac6a31a42`
- CLI: `node scripts/vapi-cli.cjs` (v1.0)
- Skill: `/vapi` | LECTURA LIBRE, ESCRITURA CON AUTORIZACION

### Inventario
- 7 assistants | 10 phones | 13 tools | 2 workflows | 1 squad
- Phone produccion: +523224870413 (Twilio, ID: 15e9866d...)
- ~44 llamadas/dia, ~$1.61/dia (Feb 2026)
- Voice: 11labs multilingual_v2 | Transcriber: Deepgram nova-3-general

### Arquitectura
- NO hay agentes productivos en VAPI directamente - todo via assistant override en N8N
- N8N Inbound: `bGj8dv3dbSVV72bm` (nodo 9ae41b)
- N8N Outbound: `TnOvzPaammFaYuHL` (nodo 092eaf)
- Observability: Langfuse
- Decision arquitectonica: API REST > SDK (agentes via N8N override, no browser)

### Edge Function
- `trigger-manual-proxy` - Disparar llamadas manuales via VAPI

## AWS

### Infraestructura
- Cuenta: `307621978585` | IAM: `darigrosales` | Region: `us-west-2`
- CLI: AWS CLI v2.31.8 | Credenciales: `~/.aws/credentials`
- Skill: `/aws` | LECTURA LIBRE, ESCRITURA CON AUTORIZACION
- Inventario detallado: `.claude/docs/aws-inventory.md`

### Frontend Deploy
- S3: `pqnc-qa-ai-frontend`
- CloudFront: `E19ZID7TVR08JG` → `ai.vidavacations.com`
- Deploy: `./update-frontend.sh` (build + S3 sync + CloudFront invalidation)

### Servicios Activos
- S3 (2 buckets) | CloudFront (3 distribuciones)
- ECS (2 clusters, 0 tasks - escalado a 0)
- RDS (1 db.r6g.large) | Redis (2 cache.t3.medium) - posiblemente innecesarios
- ALB (1) | Lambda (4) | Route53 (6 zones)

### Servicios en Codigo
- `awsService.ts` - Cliente general
- `awsRealDataService.ts` - Metricas reales
- `awsDiagramService.ts` - Diagramas infraestructura
- `src/config/awsConfig.ts` - Configuracion

## Dynamics CRM

### Servicios
- `dynamicsLeadService.ts` - Gestion leads
- `dynamicsReasignacionService.ts` - Reasignacion

### Edge Functions
- `dynamics-lead-proxy` - Proxy a Dynamics
- `dynamics-reasignar-proxy` - Reasignacion via proxy

## Anthropic (Claude)

### Edge Function
- `anthropic-proxy` - Proxy a Claude API
- Secrets en Supabase Dashboard

## ElevenLabs (TTS)
- `elevenLabsService.ts` - Text-to-Speech
- Usado en modulo AI Models

## Linear (Issues)
- `src/components/linear/` - Integracion UI
- Sincronizacion de issues

## Supabase MCP
- Config: `.mcp.json` (usa `${SUPABASE_ACCESS_TOKEN}` env var)
- Proyecto: `glsmifhkoaifvaegsozd`
- `execute_sql` para operaciones BD desde Claude Code
