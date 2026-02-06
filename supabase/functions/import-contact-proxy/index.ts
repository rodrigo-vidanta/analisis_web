/**
 * Import Contact Proxy - Edge Function
 * Proxy hacia N8N webhook import-contact-crm
 * 
 * ACTUALIZACIÓN 2026-02-06: Detecta body vacío de N8N
 * (indica que el workflow se detuvo sin llegar al nodo de respuesta,
 * generalmente por coordinación no encontrada en la BD local).
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

    const text = await response.text();

    // Body vacío = el workflow de N8N se detuvo sin llegar al nodo de respuesta
    if (!text || text.trim() === '') {
      const coordName = payload?.lead_dynamics?.Coordinacion || 'desconocida';
      const coordId = payload?.lead_dynamics?.CoordinacionID || '';
      
      console.error(`❌ [import-contact-proxy] N8N retornó body vacío. Coordinación: ${coordName} (${coordId})`);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `La coordinación "${coordName}" no existe en el sistema local. Contacta al administrador para agregarla.`,
          code: 'COORDINACION_NOT_FOUND',
          details: {
            coordinacion: coordName,
            coordinacion_id_dynamics: coordId,
          },
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parsear respuesta JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Respuesta inválida del servidor de importación',
          raw: text.substring(0, 200),
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ [import-contact-proxy] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
