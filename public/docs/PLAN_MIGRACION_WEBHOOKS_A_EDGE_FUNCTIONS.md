# Plan: Migración de Webhooks a Edge Functions

**Fecha:** 13 de Enero 2025  
**Objetivo:** Convertir llamadas directas a Railway en Edge Functions de Supabase  
**Razón:** Seguridad, CORS, manejo de errores, logs centralizados

---

## Problema Actual

**Llamadas directas a Railway:**
```typescript
const response = await fetch('https://primary-dev-d75a.up.railway.app/webhook/send-message', {
  method: 'POST',
  headers: { 'Auth': token },
  body: JSON.stringify(payload)
});
```

**Problemas:**
- Expone URL del servidor
- Credenciales viajan desde el cliente
- Sin logs centralizados
- Sin retry automático
- Difícil debugging

---

## Solución: Edge Functions

**Arquitectura propuesta:**
```
Frontend → Edge Function (Supabase) → Webhook (Railway)
```

**Ejemplo:**
```typescript
// Frontend
const response = await supabase.functions.invoke('send-message-proxy', {
  body: { message, uchat_id }
});

// Edge Function (servidor)
serve(async (req) => {
  const { message, uchat_id } = await req.json();
  const AUTH_TOKEN = Deno.env.get('SEND_MESSAGE_AUTH');
  
  const response = await fetch('https://primary-dev-d75a.up.railway.app/webhook/send-message', {
    method: 'POST',
    headers: { 'Auth': AUTH_TOKEN },
    body: JSON.stringify({ message, uchat_id })
  });
  
  return new Response(await response.json());
});
```

**Ventajas:**
- ✅ Credenciales en servidor (secretas)
- ✅ CORS manejado automáticamente
- ✅ Logs en Supabase Dashboard
- ✅ Retry con exponential backoff
- ✅ Rate limiting
- ✅ Monitoreo y métricas

---

## Edge Functions a Crear

### CRÍTICAS (Implementar primero)

#### 1. send-message-proxy
```typescript
// supabase/functions/send-message-proxy/index.ts
serve(async (req) => {
  const { message, uchat_id, id_sender } = await req.json();
  
  const response = await fetch(
    'https://primary-dev-d75a.up.railway.app/webhook/send-message',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Auth': Deno.env.get('SEND_MESSAGE_AUTH')
      },
      body: JSON.stringify({ message, uchat_id, id_sender })
    }
  );
  
  return new Response(await response.text(), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
```

**Archivos a actualizar:**
- `LiveChatCanvas.tsx` línea 5460

#### 2. pause-bot-proxy
```typescript
// supabase/functions/pause-bot-proxy/index.ts
serve(async (req) => {
  const { uchat_id, duration_minutes, paused_by } = await req.json();
  
  const response = await fetch(
    'https://primary-dev-d75a.up.railway.app/webhook/pause_bot',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Auth': Deno.env.get('PAUSE_BOT_AUTH')
      },
      body: JSON.stringify({ uchat_id, duration_minutes, paused_by })
    }
  );
  
  return new Response(await response.json());
});
```

**Archivos a actualizar:**
- `LiveChatCanvas.tsx` líneas 5127, 5227

#### 3. whatsapp-templates-send-proxy
```typescript
// supabase/functions/whatsapp-templates-send-proxy/index.ts
serve(async (req) => {
  const payload = await req.json();
  
  const response = await fetch(
    'https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates-send',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Auth': Deno.env.get('WHATSAPP_TEMPLATES_AUTH')
      },
      body: JSON.stringify(payload)
    }
  );
  
  return new Response(await response.json());
});
```

**Archivos a actualizar:**
- `ReactivateConversationModal.tsx` línea 962

---

### ALTAS (Implementar segundo)

#### 4. transfer-request-proxy
Solicitudes de transferencia de llamadas

#### 5. tools-proxy
Herramientas y acciones en llamadas activas

#### 6. whatsapp-templates-proxy
Gestión completa de plantillas (CRUD + Sync)

---

### MEDIAS (Implementar tercero)

#### 7. dynamics-lead-proxy
Consulta de leads en Dynamics CRM

#### 8. dynamics-reasignar-proxy
Reasignación de prospectos en Dynamics

#### 9. broadcast-proxy
Envío masivo de mensajes

---

### BAJAS (Implementar opcional)

#### 10. timeline-proxy
Eventos de timeline

---

## Implementación Sugerida

### Fase 1: Edge Functions Críticas (1-2 horas)

1. Crear `send-message-proxy`
2. Crear `pause-bot-proxy`
3. Crear `whatsapp-templates-send-proxy`
4. Actualizar código del frontend
5. Desplegar a PQNC_AI
6. Probar exhaustivamente

### Fase 2: Edge Functions Altas (2 horas)

7. Crear `transfer-request-proxy`
8. Crear `tools-proxy`
9. Crear `whatsapp-templates-proxy`
10. Actualizar código
11. Desplegar y probar

### Fase 3: Edge Functions Medias (1-2 horas)

12. Crear `dynamics-lead-proxy`
13. Crear `dynamics-reasignar-proxy`
14. Crear `broadcast-proxy`
15. Actualizar código
16. Desplegar y probar

---

## Patrón de Edge Function

Todas siguen este patrón:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    
    const response = await fetch(
      'https://primary-dev-d75a.up.railway.app/webhook/ENDPOINT',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Auth': Deno.env.get('AUTH_TOKEN')
        },
        body: JSON.stringify(payload)
      }
    )
    
    const data = await response.json()
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

---

## Variables de Entorno en Supabase

Para cada Edge Function, configurar secrets en Supabase Dashboard:

```bash
SEND_MESSAGE_AUTH=<token>
PAUSE_BOT_AUTH=<token>
WHATSAPP_TEMPLATES_AUTH=<token>
TRANSFER_REQUEST_AUTH=<token>
TOOLS_AUTH=<token>
DYNAMICS_TOKEN=<token>
BROADCAST_AUTH=<token>
```

**Obtener tokens de:** `api_auth_tokens` table en PQNC_AI

---

## Deployment

```bash
# Desplegar todas las funciones
supabase functions deploy send-message-proxy
supabase functions deploy pause-bot-proxy
supabase functions deploy whatsapp-templates-send-proxy
...
```

---

## Testing

Para cada Edge Function:

```bash
# Test local
supabase functions serve send-message-proxy

# Test en Supabase
curl -X POST https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/send-message-proxy \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{"message":"test","uchat_id":"test123"}'
```

---

## Beneficios

- Reducción de superficie de ataque
- Credenciales nunca expuestas al cliente
- Logs centralizados
- Retry automático
- CORS sin configuración adicional
- Monitoreo en tiempo real

---

## Estado

- ✅ Inventario completo
- ✅ Patrón definido
- ⏳ Implementación pendiente

---

**¿Implemento las Edge Functions críticas ahora o lo dejamos para después del deploy de la migración?**
