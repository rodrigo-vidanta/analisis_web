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

    // Obtener token específico para send-audio (diferente del resto)
    const webhookToken = Deno.env.get('SEND_AUDIO_AUTH') || '';
    if (!webhookToken) {
      console.error('❌ SEND_AUDIO_AUTH no configurado');
      return new Response(
        JSON.stringify({ error: 'Server configuration error', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Webhook de N8N para audio
    const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/send-audio';

    // Construir payload para N8N - Formato simple para audio
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
        'Accept': 'application/json',
        'Authorization': webhookToken,
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
