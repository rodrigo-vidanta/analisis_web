/**
 * ============================================
 * EDGE FUNCTION: SEND MESSAGE PROXY
 * ============================================
 * 
 * Proxy seguro para envío de mensajes WhatsApp via N8N
 * Basado en el patrón de paraphrase-proxy y backup original
 * 
 * Webhook original: https://primary-dev-d75a.up.railway.app/webhook/send-message
 * Header: livechat_auth (mismo que mensaje-agente, pause_bot, etc.)
 * 
 * Fecha: 17 Enero 2026
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
      console.error('❌ [send-message-proxy] Error de autenticación:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Authentication required', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener payload del request
    // uChat: { message, uchat_id, type, ttl, id_sender? }
    // Twilio: { mensaje, whatsapp, provider: 'twilio', id_sender? }
    const payload = await req.json();
    const provider = payload.provider || 'uchat';

    // Obtener token desde secret (mismo que otros webhooks de livechat)
    const webhookToken = Deno.env.get('LIVECHAT_AUTH') || '';
    if (!webhookToken) {
      console.error('❌ LIVECHAT_AUTH no configurado');
      return new Response(
        JSON.stringify({ error: 'Server configuration error', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let webhookUrl: string;
    let n8nPayload: Record<string, unknown>;

    if (provider === 'twilio') {
      // ── Twilio: enviar via endpoint dedicado ──
      const { mensaje, whatsapp, id_sender } = payload;

      if (!mensaje && !payload.message) {
        return new Response(
          JSON.stringify({ error: 'mensaje es requerido para proveedor Twilio', success: false }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!whatsapp) {
        return new Response(
          JSON.stringify({ error: 'whatsapp es requerido para proveedor Twilio', success: false }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      webhookUrl = 'https://primary-dev-d75a.up.railway.app/webhook/twilio-livechat-send';
      n8nPayload = {
        mensaje: mensaje || payload.message,
        whatsapp,
        id_sender: id_sender || user.id
      };

      console.log(`📤 [send-message-proxy] Twilio → ${whatsapp} (user: ${user.email})`);

    } else if (provider === 'uchat') {
      // ── uChat: flujo original ──
      const { message, uchat_id, type, ttl, id_sender } = payload;

      if (!message || !uchat_id) {
        return new Response(
          JSON.stringify({ error: 'message and uchat_id are required', success: false }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      webhookUrl = 'https://primary-dev-d75a.up.railway.app/webhook/send-message';
      n8nPayload = {
        message,
        uchat_id,
        type: type || 'text',
        ttl: ttl || 180
      };
      if (id_sender) {
        n8nPayload.id_sender = id_sender;
      }

      console.log(`📤 [send-message-proxy] uChat → ${uchat_id} (user: ${user.email})`);

    } else {
      return new Response(
        JSON.stringify({ error: `Proveedor no soportado: ${provider}`, success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hacer request al webhook de N8N con autenticación
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        '2025_livechat_auth': webhookToken,
      },
      body: JSON.stringify(n8nPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [send-message-proxy] Webhook error ${response.status}:`, errorText);
      return new Response(
        JSON.stringify({
          error: `Webhook Error: ${response.status} - ${errorText}`,
          success: false
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parsear respuesta JSON
    let responseData;
    try {
      responseData = await response.json();
    } catch {
      responseData = { success: true, message: 'Message sent' };
    }

    const logId = provider === 'twilio' ? payload.whatsapp : payload.uchat_id;
    console.log(`✅ [send-message-proxy] Mensaje enviado exitosamente a ${logId} (${provider})`);

    return new Response(
      JSON.stringify({ ...responseData, success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error en send-message-proxy:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
