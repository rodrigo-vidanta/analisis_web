/**
 * EDGE FUNCTION: SEND AUDIO PROXY
 * 
 * Proxy para envío de mensajes de voz WhatsApp via N8N
 * Patrón simplificado: Deno.serve() nativo, sin imports externos
 * Auth: LIVECHAT_AUTH (misma credencial LiveChat_auth_2025 que los otros webhooks)
 * 
 * Fecha: 05 Febrero 2026
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/send-audio';

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Obtener payload
    const payload = await req.json();
    const { audio_base64, uchat_id, filename, id_sender } = payload;

    if (!audio_base64 || !uchat_id) {
      return new Response(
        JSON.stringify({ error: 'audio_base64 and uchat_id are required', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LIVECHAT_AUTH: misma credencial LiveChat_auth_2025 que send-message y pause-bot
    const webhookToken = Deno.env.get('LIVECHAT_AUTH') || '';
    if (!webhookToken) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construir payload para N8N
    const n8nPayload: Record<string, unknown> = {
      audio_base64,
      uchat_id,
      filename: filename || 'audio.mp3',
    };
    if (id_sender) {
      n8nPayload.id_sender = id_sender;
    }

    // Enviar a N8N
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        '2025_livechat_auth': webhookToken,
      },
      body: JSON.stringify(n8nPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `Webhook Error: ${response.status} - ${errorText}`, success: false }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parsear respuesta
    let responseData;
    try {
      responseData = await response.json();
    } catch {
      responseData = { message: 'Audio sent' };
    }

    return new Response(
      JSON.stringify({ ...responseData, success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
