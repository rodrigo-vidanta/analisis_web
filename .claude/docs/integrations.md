# Integraciones - PQNC QA AI Platform

## N8N (Railway)

### Acceso
- Credenciales via `credentialsService.getN8NCredentials()` (NUNCA hardcodear)
- Proxy: `src/services/n8nProxyService.ts`

### Workflows Produccion (NO modificar sin autorizacion)
- 5 workflows PROD activos
- Operaciones alto riesgo: DELETE workflows, DEACTIVATE, eliminar ejecuciones

### Uso en Codigo
```typescript
import { n8nProxyService } from '@/services/n8nProxyService';
// Ejecutar workflow
await n8nProxyService.executeWorkflow(workflowId, data);
```

## WhatsApp (UChat)

### Servicios
- `whatsappTemplatesService.ts` - CRUD plantillas
- `whatsappLabelsService.ts` - Etiquetas
- `quickRepliesService.ts` - Respuestas rapidas
- `optimizedConversationsService.ts` - Conversaciones
- `botPauseService.ts` - Pausar bot

### Edge Functions
- `send-message-proxy` - Enviar mensajes
- `send-img-proxy` - Enviar imagenes
- `send-audio-proxy` - Enviar audio (OGG/Opus)
- `broadcast-proxy` - Envio masivo
- `pause-bot-proxy` - Control del bot
- `whatsapp-templates-proxy` - Gestion plantillas

### Etapas de Prospectos
- Definidas en `src/types/whatsappTemplates.ts` (UNICA fuente de verdad)
- Case-sensitive, sin acentos donde BD no los tiene

### Campanas
- A/B testing: 2 registros con `ab_group_id` compartido
- Webhooks a N8N: enviar SOLO WHERE clauses (no SELECT)
- Filtros: etapa, estado civil, viaja con, destinos, dias sin contacto, email, etiquetas

## AWS

### Infraestructura
- Region: us-west-2
- S3: hosting frontend
- CloudFront: CDN + SSL
- Lambda@Edge: funciones de borde

### Servicios en Codigo
- `awsService.ts` - Cliente general
- `awsRealDataService.ts` - Metricas reales
- `awsDiagramService.ts` - Diagramas infraestructura
- `src/config/awsConfig.ts` - Configuracion

### Scripts AWS
- `npm run aws:report` - Reporte recursos
- `npm run aws:cost-analysis` - Analisis costos
- `npm run aws:cleanup` - Limpieza segura

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

### Servicio
- `src/services/` - Llamadas a IA para analisis

## ElevenLabs (TTS)
- `elevenLabsService.ts` - Text-to-Speech
- Usado en modulo de modelos IA

## Linear (Issues)
- `src/components/linear/` - Integracion UI
- Sincronizacion de issues
