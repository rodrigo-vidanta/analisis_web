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
    // Formato esperado: { message, uchat_id, type, ttl, id_sender? }
    const payload = await req.json();
    const { message, uchat_id, type, ttl, id_sender } = payload;

    if (!message || !uchat_id) {
      return new Response(
        JSON.stringify({ error: 'message and uchat_id are required', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📤 [send-message-proxy] Enviando mensaje a ${uchat_id} (user: ${user.email})`);

    // Obtener token desde secret (mismo que otros webhooks de livechat)
    const webhookToken = Deno.env.get('LIVECHAT_AUTH') || '';
    if (!webhookToken) {
      console.error('❌ LIVECHAT_AUTH no configurado');
      return new Response(
        JSON.stringify({ error: 'Server configuration error', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Webhook de N8N (mismo que el backup original)
    const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/send-message';

    // Construir payload para N8N (mismo formato que el backup)
    const n8nPayload: Record<string, unknown> = {
      message,
      uchat_id,
      type: type || 'text',
      ttl: ttl || 180
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
        'livechat_auth': webhookToken, // Header correcto (igual que backup original)
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

    // Intentar parsear respuesta JSON
    let responseData;
    try {
      responseData = await response.json();
    } catch {
      responseData = { success: true, message: 'Message sent' };
    }

    console.log(`✅ [send-message-proxy] Mensaje enviado exitosamente a ${uchat_id}`);

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
