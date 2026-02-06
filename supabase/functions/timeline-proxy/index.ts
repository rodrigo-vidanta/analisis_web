/**
 * ============================================
 * EDGE FUNCTION: TIMELINE PROXY
 * ============================================
 * 
 * Proxy seguro para timeline de actividades via N8N
 * Procesa texto con LLM para extraer actividades estructuradas
 * 
 * Webhook: https://primary-dev-d75a.up.railway.app/webhook/timeline
 * Auth al webhook: Ninguno (el workflow de N8N no requiere auth)
 * 
 * Migrado a Deno.serve() nativo + validación JWT manual.
 * (verify_jwt debe ser false en Supabase).
 * 
 * Fecha original: Enero 2026
 * Restaurado: 06 Febrero 2026
 */

const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/timeline';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar autenticación JWT manualmente
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.substring(7);

    // Validar JWT con Supabase Auth API directamente (sin import pesado)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'apikey': supabaseAnonKey,
      },
    });

    if (!authResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Authentication required', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = await authResponse.json();

    // Obtener payload
    const payload = await req.json();

    console.log(`📅 [timeline-proxy] Procesando actividad (user: ${user.email})`);

    // Timeout de 90 segundos (LLM processing puede tardar)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [timeline-proxy] Webhook error ${response.status}:`, errorText);

        let errorDetails;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = errorText;
        }

        return new Response(
          JSON.stringify({
            error: `Webhook Error: ${response.status}`,
            details: errorDetails,
            success: false,
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Manejar respuesta (puede ser vacía)
      const text = await response.text();
      let responseData;
      try {
        responseData = text ? JSON.parse(text) : { success: true, message: 'Actividad registrada' };
      } catch {
        responseData = { success: true, message: 'Actividad registrada' };
      }

      console.log(`✅ [timeline-proxy] Actividad procesada exitosamente`);

      return new Response(
        JSON.stringify(responseData),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: 'Timeout: La operación tardó más de 90 segundos', success: false }),
          { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw fetchError;
    }

  } catch (error) {
    console.error('❌ Error en timeline-proxy:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
