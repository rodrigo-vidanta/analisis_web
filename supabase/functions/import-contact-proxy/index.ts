/**
 * VERSIÓN ULTRA SIMPLIFICADA - Import Contact Proxy
 * Sin validación JWT, solo proxy directo
 */

const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/import-contact-crm';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const token = Deno.env.get('LIVECHAT_AUTH') || '';

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        '2025_livechat_auth': token,
      },
      body: JSON.stringify(payload),
    });

    // Manejar respuesta (puede ser vacía)
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : { success: true };
    } catch {
      data = { success: response.ok, raw: text };
    }

    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal error', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
