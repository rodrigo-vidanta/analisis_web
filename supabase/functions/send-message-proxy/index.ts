/**
 * ============================================
 * EDGE FUNCTION: SEND MESSAGE PROXY
 * ============================================
 *
 * Proxy seguro para envío de mensajes WhatsApp via N8N
 * Endpoint unificado: texto + imágenes → /webhook/send-message
 *
 * Payloads aceptados:
 *   Texto:  { whatsapp, message, id_sender? }
 *   Imagen: { whatsapp, imagenes: ["url1", ...], caption?, id_sender? }
 *   Ambos:  { whatsapp, message, imagenes: ["url1"], caption?, id_sender? }
 *
 * Al menos uno de message o imagenes debe estar presente.
 * whatsapp siempre requerido (número con código país, ej: 5213315127354).
 *
 * Header: 2025_livechat_auth
 * Fecha: 17 Enero 2026 | Reescrito: 03 Marzo 2026 (unificación Twilio)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      console.error('❌ [send-message-proxy] Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Authentication required', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Payload del frontend: { whatsapp, message?, imagenes?, caption?, id_sender? }
    const payload = await req.json();
    const { whatsapp, message, imagenes, caption, id_sender } = payload;

    // Validar campos requeridos
    if (!whatsapp) {
      return new Response(
        JSON.stringify({ error: 'whatsapp es requerido', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!message && !imagenes) {
      return new Response(
        JSON.stringify({ error: 'Se requiere al menos message o imagenes', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener token de autenticación para N8N
    const webhookToken = Deno.env.get('LIVECHAT_AUTH') || '';
    if (!webhookToken) {
      console.error('❌ LIVECHAT_AUTH no configurado');
      return new Response(
        JSON.stringify({ error: 'Server configuration error', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construir payload para N8N — solo campos con valor
    const n8nPayload: Record<string, unknown> = {
      whatsapp,
      id_sender: id_sender || user.id
    };
    if (message) {
      n8nPayload.message = message;
    }
    if (imagenes) {
      n8nPayload.imagenes = imagenes;
    }
    if (caption) {
      n8nPayload.caption = caption;
    }

    const tipo = imagenes ? 'imagen' : 'texto';
    console.log(`📤 [send-message-proxy] ${tipo} → ${whatsapp} (user: ${user.email})`);

    // Enviar al endpoint unificado de N8N
    const response = await fetch(
      'https://primary-dev-d75a.up.railway.app/webhook/send-message',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          '2025_livechat_auth': webhookToken,
        },
        body: JSON.stringify(n8nPayload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [send-message-proxy] Webhook error ${response.status}:`, errorText);
      return new Response(
        JSON.stringify({ error: `Webhook Error: ${response.status} - ${errorText}`, success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Propagar respuesta de N8N tal cual
    let responseData;
    try {
      responseData = await response.json();
    } catch {
      responseData = { success: true };
    }

    // Si N8N reporta error (ej: error_code de Twilio), propagarlo
    if (responseData.success === false) {
      console.error(`❌ [send-message-proxy] Error para ${whatsapp}:`, responseData.error, responseData.error_code);
      return new Response(
        JSON.stringify(responseData),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [send-message-proxy] Enviado a ${whatsapp} (${tipo})`);

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
