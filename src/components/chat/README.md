# 💬 Módulo Live Chat - Estado Actual v5.3.0

## Descripción
Sistema completo de chat en tiempo real con integración UChat, sincronización automática y navegación inteligente.

## Estado Actual del Sistema

### ✅ Funcionalidades Operativas
- Lista de 18 conversaciones activas
- Chat en tiempo real con UChat
- Sincronización automática cada 15 segundos (inteligente)
- Pausa/reactivación de bot IA (15 minutos automático)
- Envío de mensajes de agente funcional
- Selección automática desde otros módulos
- Navegación desde sidebars (Prospectos/Análisis IA)
- Ordenamiento local sin re-renders

### 📊 Estructura de Datos
- **uchat_conversations**: 18 conversaciones con last_message_at
- **uchat_messages**: Mensajes ordenados por created_at ASC
- **Sincronización**: Bidireccional con analysisSupabase.prospectos

### 🔄 Comportamiento Actual de Ordenamiento
- **Funciona**: Mensajes enviados desde plataforma actualizan last_message_at
- **Limitación**: Solo considera mensajes de agentes, NO del bot
- **Resultado**: Conversaciones no se reordenan cuando bot envía mensajes
- **UX**: Lista no refleja actividad real completa

### 💬 Sistema de Mensajes
- **Enviados**: Aparecen como "Enviando..." temporalmente
- **Problema**: Indicador aparece en conversación activa, no específica
- **Confusión**: En múltiples usuarios puede parecer que se envía a todas
- **Resolución**: Mensaje aparece en conversación correcta al confirmarse

### 🚫 Funcionalidades Pendientes
- **Indicador "no leído"**: No implementado (falta columna en BD)
- **Ordenamiento completo**: No considera mensajes del bot
- **Mensajes específicos**: Indicador "enviando" no es por conversación

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

## Integraciones
- **UChat API**: Envío y recepción de mensajes WhatsApp
- **VAPI**: Control de bot IA y pausas
- **Webhook**: Railway app para envío de mensajes
- **analysisSupabase**: Sincronización con datos de prospectos

## Dependencias
- **supabaseSystemUI**: Base de datos principal
- **analysisSupabase**: Datos de prospectos
- **UChat Webhook**: https://primary-dev-d75a.up.railway.app/webhook/send-message

## Permisos
- **Todos los usuarios autenticados**: Acceso completo

## Navegación
- **Desde Prospectos**: Click botón chat verde en sidebar
- **Desde Análisis IA**: Click botón chat verde en sidebar
- **Selección automática**: Por prospect_id, whatsapp o id_uchat

## Optimizaciones Aplicadas
- Sincronización inteligente (no interrumpe escritura)
- Update de last_message_at sin re-renders
- Reordenamiento local sin llamadas a BD
- Sin logs de debug en producción
