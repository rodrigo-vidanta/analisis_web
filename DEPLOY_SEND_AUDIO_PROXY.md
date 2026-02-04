# 🚀 Deploy Manual de send-audio-proxy

## Opción 1: Dashboard de Supabase (5 minutos) ⭐ RECOMENDADO

### Paso 1: Ir al Dashboard
1. Abrir: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/functions
2. Click en **"Create a new function"**

### Paso 2: Configurar la Función
- **Name:** `send-audio-proxy`
- **Import from:** Copiar y pegar el código de abajo

### Paso 3: Copiar Código

```typescript
/**
 * ============================================
 * EDGE FUNCTION: SEND AUDIO PROXY
 * ============================================
 * 
 * Proxy seguro para envío de mensajes de voz WhatsApp via N8N
 * Basado en el patrón de send-message-proxy
 * 
 * Webhook original: https://primary-dev-d75a.up.railway.app/webhook/send-audio
 * Header: livechat_auth (mismo que send-message)
 * 
 * Fecha: 04 Febrero 2026
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar autenticación JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.substring(7);
    
    // Validar JWT con Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      console.error('❌ [send-audio-proxy] Error de autenticación:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Authentication required', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener payload del request
    // Formato esperado: { audio_base64, uchat_id, filename?, id_sender? }
    const payload = await req.json();
    const { audio_base64, uchat_id, filename, id_sender } = payload;

    if (!audio_base64 || !uchat_id) {
      return new Response(
        JSON.stringify({ error: 'audio_base64 and uchat_id are required', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎤 [send-audio-proxy] Enviando audio a ${uchat_id} (user: ${user.email})`);

    // Obtener token desde secret (mismo que send-message)
    const webhookToken = Deno.env.get('LIVECHAT_AUTH') || '';
    if (!webhookToken) {
      console.error('❌ LIVECHAT_AUTH no configurado');
      return new Response(
        JSON.stringify({ error: 'Server configuration error', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Webhook de N8N
    const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/send-audio';

    // Construir payload para N8N
    const n8nPayload: Record<string, unknown> = {
      audio_base64,
      uchat_id,
      filename: filename || 'audio.mp3'
    };

    // Agregar id_sender si está disponible
    if (id_sender) {
      n8nPayload.id_sender = id_sender;
    }

    // Hacer request al webhook de N8N con autenticación
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'livechat_auth': webhookToken,
      },
      body: JSON.stringify(n8nPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [send-audio-proxy] Webhook error ${response.status}:`, errorText);
      return new Response(
        JSON.stringify({ 
          error: `Webhook Error: ${response.status} - ${errorText}`, 
          success: false 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Intentar parsear respuesta JSON
    let responseData;
    try {
      responseData = await response.json();
    } catch {
      responseData = { success: true, message: 'Audio sent' };
    }

    console.log(`✅ [send-audio-proxy] Audio enviado exitosamente a ${uchat_id}`);

    return new Response(
      JSON.stringify({ ...responseData, success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error en send-audio-proxy:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Paso 4: Click en "Deploy"

### Paso 5: Verificar Secrets

Ya deberían estar configurados (se comparten con otras edge functions):
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `LIVECHAT_AUTH`

Si falta `LIVECHAT_AUTH`, ir a:
- Settings → Edge Functions → Secrets
- Add secret: `LIVECHAT_AUTH` = (valor del token)

---

## Opción 2: CLI (si tienes Supabase CLI instalado)

```bash
# 1. Login
supabase login

# 2. Deploy
cd /Users/darigsamuelrosalesrobledo/Documents/pqnc-qa-ai-platform
supabase functions deploy send-audio-proxy --project-ref glsmifhkoaifvaegsozd

# 3. Ver logs
supabase functions logs send-audio-proxy --project-ref glsmifhkoaifvaegsozd --tail
```

---

## ✅ Verificación Post-Deploy

### 1. Verificar que la función existe
```bash
curl https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/send-audio-proxy
```

**Respuesta esperada:** 401 (no hay auth) o 400 (faltan parámetros)

### 2. Ver logs en tiempo real
Dashboard → Edge Functions → send-audio-proxy → Logs

---

## 🐛 Troubleshooting

### Error: CORS
✅ El código ya incluye headers CORS correctos

### Error: 401 Unauthorized
- Verificar que `LIVECHAT_AUTH` esté configurado en secrets
- Verificar que el JWT del usuario sea válido

### Error: Webhook 500
- Verificar que N8N webhook esté activo: https://primary-dev-d75a.up.railway.app
- Verificar que `LIVECHAT_AUTH` sea correcto

---

**Última actualización:** 04 Febrero 2026
