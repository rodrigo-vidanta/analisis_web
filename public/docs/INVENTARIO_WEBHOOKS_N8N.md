# Inventario de Webhooks N8N a Convertir en Edge Functions

**Servidor:** `https://primary-dev-d75a.up.railway.app` (Railway)  
**Fecha de análisis:** 13 de Enero 2025  
**Estado:** ANÁLISIS COMPLETADO

---

## Webhooks Identificados

### 1. send-img (Envío de Imágenes WhatsApp)

**URL:** `https://primary-dev-d75a.up.railway.app/webhook/send-img`  
**Método:** POST  
**Autenticación:** `livechat_auth: 2025_livechat_auth`  
**Edge Function:** ✅ YA EXISTE - `send-img-proxy`  
**Archivos que lo usan:**
- `src/components/chat/ImageCatalogModalV2.tsx`
- `src/components/chat/ImageCatalogModal.tsx`
- `supabase/functions/send-img-proxy/index.ts`

**Estado:** ✅ YA MIGRADO

---

### 2. transfer_request (Transferencia de Llamadas)

**URL:** `https://primary-dev-d75a.up.railway.app/webhook/transfer_request`  
**Método:** POST  
**Payload:** `{ prospect_id: string }`  
**Archivos que lo usan:**
- `src/components/analysis/LiveMonitorKanban.tsx` (línea 2395)
- `src/components/dashboard/widgets/ActiveCallDetailModal.tsx` (línea 757)

**Edge Function:** ❌ NO EXISTE  
**Prioridad:** ALTA (usado en Live Monitor)

---

### 3. tools (Herramientas/Acciones en Llamadas)

**URL:** `https://primary-dev-d75a.up.railway.app/webhook/tools`  
**Método:** POST  
**Payload:** 
```json
{
  "call_id": "string",
  "tool_name": "string",
  "prospect_id": "string",
  "prospect_name": "string",
  "prospect_phone": "string"
}
```
**Archivos que lo usan:**
- `src/components/analysis/LiveMonitorKanban.tsx` (líneas 2562, 2676)
- `src/components/dashboard/widgets/ActiveCallDetailModal.tsx` (línea 930)

**Edge Function:** ❌ NO EXISTE  
**Prioridad:** ALTA (usado en Live Monitor)

---

### 4. lead-info (Consulta Leads Dynamics CRM)

**URL:** `https://primary-dev-d75a.up.railway.app/webhook/lead-info`  
**Método:** POST  
**Autenticación:** Token en BD  
**Payload:** `{ id_prospecto, id_dynamics }`  
**Archivos que lo usan:**
- `src/services/dynamicsLeadService.ts` (línea 58)
- Configurado en `credentialsService.ts` (línea 253)

**Edge Function:** ❌ NO EXISTE  
**Prioridad:** MEDIA (solo admin)

---

### 5. reasignar-prospecto (Reasignación Dynamics)

**URL:** `https://primary-dev-d75a.up.railway.app/webhook/reasignar-prospecto`  
**Método:** POST  
**Timeout:** 80 segundos  
**Archivos que lo usan:**
- `src/services/dynamicsReasignacionService.ts`
- Configurado en `credentialsService.ts` (línea 254)

**Edge Function:** ❌ NO EXISTE  
**Prioridad:** MEDIA (solo admin)

---

### 6. pause_bot (Pausar Bot WhatsApp)

**URL:** `https://primary-dev-d75a.up.railway.app/webhook/pause_bot`  
**Método:** POST  
**Autenticación:** `pause_bot_auth`  
**Payload:** `{ uchat_id, duration_minutes, paused_by }`  
**Archivos que lo usan:**
- `src/components/chat/LiveChatCanvas.tsx` (líneas 5127, 5227)

**Edge Function:** ❌ NO EXISTE  
**Prioridad:** ALTA (usado frecuentemente)

---

### 7. send-message (Enviar Mensaje WhatsApp)

**URL:** `https://primary-dev-d75a.up.railway.app/webhook/send-message`  
**Método:** POST  
**Autenticación:** `send_message_auth`  
**Payload:** `{ message, uchat_id, id_sender }`  
**Archivos que lo usan:**
- `src/components/chat/LiveChatCanvas.tsx` (línea 5460)

**Edge Function:** ❌ NO EXISTE  
**Prioridad:** CRÍTICA (envío de mensajes)

---

### 8. whatsapp-templates (Gestión de Plantillas)

**URL:** `https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates`  
**Método:** POST  
**Operaciones:** List, Get, Create, Update, Delete, Sync  
**Autenticación:** Token en header `Auth`  
**Archivos que lo usan:**
- `src/services/whatsappTemplatesService.ts` (línea 50)
- `src/components/admin/WhatsAppTemplatesManager.tsx`

**Edge Function:** ❌ NO EXISTE  
**Prioridad:** ALTA (gestión de plantillas)

---

### 9. whatsapp-templates-send (Envío de Plantillas)

**URL:** `https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates-send`  
**Método:** POST  
**Autenticación:** `whatsapp_templates_auth`  
**Payload:** Template data + variables  
**Archivos que lo usan:**
- `src/components/chat/ReactivateConversationModal.tsx` (línea 962)

**Edge Function:** ❌ NO EXISTE  
**Prioridad:** ALTA (envío de plantillas)

---

### 10. broadcast (Broadcast Masivo)

**URL:** `https://primary-dev-d75a.up.railway.app/webhook/broadcast`  
**Método:** POST  
**Autenticación:** `broadcast_auth`  
**Payload:** Mensaje + lista de destinatarios  
**Archivos que lo usan:**
- `src/components/campaigns/campanas/CampanasManager.tsx` (línea 74)

**Edge Function:** ❌ NO EXISTE  
**Prioridad:** MEDIA (campañas)

---

### 11. timeline (Timeline de Actividades)

**URL:** `https://primary-dev-d75a.up.railway.app/webhook/timeline`  
**Método:** POST  
**Payload:** Actividad + datos  
**Archivos que lo usan:**
- `src/services/timelineService.ts`

**Edge Function:** ❌ NO EXISTE  
**Prioridad:** BAJA (timeline)

---

### 12. error-analisis (Análisis de Errores)

**URL:** `https://primary-dev-d75a.up.railway.app/webhook/error-analisis`  
**Método:** POST  
**Edge Function:** ✅ YA EXISTE - `error-analisis-proxy`  
**Archivos que lo usan:**
- `src/services/errorLogService.ts`
- `supabase/functions/error-analisis-proxy/index.ts`

**Estado:** ✅ YA MIGRADO

---

## Resumen

**Total de webhooks:** 12  
**Ya migrados:** 2 (send-img, error-analisis)  
**Pendientes:** 10  

### Por Prioridad

**CRÍTICA (3):**
- send-message (envío de mensajes WhatsApp)
- pause_bot (pausar bot)
- whatsapp-templates-send (envío de plantillas)

**ALTA (4):**
- transfer_request (transferencia de llamadas)
- tools (herramientas en llamadas)
- whatsapp-templates (gestión plantillas)

**MEDIA (2):**
- lead-info (Dynamics CRM)
- reasignar-prospecto (Dynamics CRM)
- broadcast (campañas)

**BAJA (1):**
- timeline (actividades)

---

## Recomendación

**Crear Edge Functions en PQNC_AI para:**

1. send-message-proxy
2. pause-bot-proxy
3. whatsapp-templates-proxy
4. whatsapp-templates-send-proxy
5. transfer-request-proxy
6. tools-proxy
7. dynamics-lead-proxy
8. dynamics-reasignar-proxy
9. broadcast-proxy
10. timeline-proxy

**Ventajas:**
- ✅ Seguridad (oculta credenciales)
- ✅ CORS manejado automáticamente
- ✅ Logs centralizados en Supabase
- ✅ Rate limiting por Supabase
- ✅ Retry automático
- ✅ Monitoreo en Supabase Dashboard

---

## Próximos Pasos

1. Crear Edge Functions en PQNC_AI
2. Actualizar código para usar Edge Functions
3. Probar cada una
4. Desplegar a PQNC_AI
5. Deprecar llamadas directas a Railway

---

**Tiempo estimado:** 3-4 horas para crear y probar todas las Edge Functions
