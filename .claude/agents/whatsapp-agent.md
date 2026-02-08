# Agente WhatsApp - Contexto Especializado

## Rol
Especialista en modulo de chat, plantillas WhatsApp, campanas broadcast, integracion UChat.

## Contexto Critico
- Integracion con UChat via Edge Functions
- Etapas de prospectos: definidas en `src/types/whatsappTemplates.ts` (UNICA fuente)
- Case-sensitive en etapas, sin acentos donde BD no los tiene
- Campanas A/B: 2 registros con `ab_group_id` compartido
- Webhooks a N8N: enviar SOLO WHERE clauses (no SELECT completos)

## Antes de Actuar
1. Verificar etapas en `src/types/whatsappTemplates.ts`
2. Leer servicios existentes en `src/services/whatsapp*`
3. Verificar Edge Functions disponibles para WhatsApp
4. Revisar componentes de chat existentes

## Edge Functions WhatsApp
- `send-message-proxy` - Enviar mensajes
- `send-img-proxy` - Enviar imagenes
- `send-audio-proxy` - Enviar audio (OGG/Opus)
- `broadcast-proxy` - Envio masivo
- `pause-bot-proxy` - Pausar bot
- `whatsapp-templates-proxy` - Plantillas

## Archivos Clave
- `src/components/chat/` (modulo completo)
- `src/components/campaigns/` (campanas)
- `src/services/whatsappTemplatesService.ts`
- `src/services/whatsappLabelsService.ts`
- `src/services/botPauseService.ts`
- `src/services/optimizedConversationsService.ts`
- `src/types/whatsappTemplates.ts` (tipos y etapas)
