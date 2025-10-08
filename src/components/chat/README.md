# 💬 Módulo Live Chat

## Descripción
Sistema completo de chat en tiempo real con integración UChat, sincronización automática y navegación inteligente.

## Componentes
- **LiveChatModule.tsx**: Módulo principal con navegación
- **LiveChatCanvas.tsx**: Canvas principal con conversaciones
- **ChatWindowReal.tsx**: Ventana de chat individual
- **AgentAssignmentModal.tsx**: Modal de asignación de agentes

## Base de Datos
- **Supabase**: `supabaseSystemUI` (zbylezfyagwrxoecioup.supabase.co)
- **Tabla conversaciones**: `uchat_conversations`
- **Tabla mensajes**: `uchat_messages`
- **Tabla prospectos**: `prospectos` (analysisSupabase para sincronización)

## Funcionalidades
- Lista de conversaciones ordenada por último mensaje
- Chat en tiempo real con UChat
- Sincronización automática cada 15 segundos
- Pausa/reactivación de bot IA
- Envío de mensajes de agente
- Selección automática de conversación desde otros módulos
- Navegación desde sidebars de Prospectos y Análisis IA
- Ordenamiento como WhatsApp Web

## Integraciones
- **UChat API**: Envío y recepción de mensajes WhatsApp
- **VAPI**: Control de bot IA y pausas
- **Webhook**: Railway app para envío de mensajes
- **analysisSupabase**: Sincronización con datos de prospectos

## Dependencias
- **supabaseSystemUI**: Base de datos principal
- **analysisSupabase**: Datos de prospectos
- **Framer Motion**: Animaciones (mínimas)
- **UChat Webhook**: https://primary-dev-d75a.up.railway.app/webhook/send-message

## Permisos
- **Todos los usuarios autenticados**: Acceso completo
- **Funcionalidades específicas**: Según rol de usuario

## Navegación
- **Desde Prospectos**: Click botón chat verde en sidebar
- **Desde Análisis IA**: Click botón chat verde en sidebar
- **Selección automática**: Por prospect_id, whatsapp o id_uchat
- **Ordenamiento**: Conversaciones por last_message_at DESC

## Optimizaciones
- Sincronización inteligente (no interrumpe escritura)
- Update de last_message_at sin re-renders
- Reordenamiento local sin llamadas a BD
- Sin logs de debug en producción
