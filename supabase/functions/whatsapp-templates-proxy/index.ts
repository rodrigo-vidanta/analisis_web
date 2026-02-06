/**
 * ============================================
 * EDGE FUNCTION: WHATSAPP TEMPLATES PROXY
 * ============================================
 * 
 * Proxy seguro para gestión de plantillas WhatsApp (CRUD + Sync) via N8N
 * 
 * Webhook: https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates
 * Auth al webhook: Header 'Auth' con WHATSAPP_TEMPLATES_AUTH
 * 
 * Migrado a Deno.serve() nativo + validación JWT manual.
 * (verify_jwt debe ser false en Supabase).
 * 
 * Fecha original: Enero 2026
 * Restaurado: 06 Febrero 2026
 */

const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
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

    // Obtener query params del request original
    const url = new URL(req.url);
    const queryParams = url.searchParams.toString();

    // Obtener payload (si no es GET)
    const payload = req.method !== 'GET' ? await req.json() : null;

    console.log(`📋 [whatsapp-templates-proxy] ${req.method} (user: ${user.email})${queryParams ? ` ?${queryParams}` : ''}`);

    // Obtener token de auth para el webhook
    const AUTH_TOKEN = Deno.env.get('WHATSAPP_TEMPLATES_AUTH');
    if (!AUTH_TOKEN) {
      console.error('❌ WHATSAPP_TEMPLATES_AUTH no configurado');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: WHATSAPP_TEMPLATES_AUTH not configured', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = `${WEBHOOK_URL}${queryParams ? `?${queryParams}` : ''}`;

    // Timeout de 90 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const fetchOptions: RequestInit = {
        method: 'POST', // N8N siempre usa POST
        headers: {
          'Content-Type': 'application/json',
          'Auth': AUTH_TOKEN,
        },
        signal: controller.signal,
      };

      if (payload) {
        fetchOptions.body = JSON.stringify(payload);
      }

      const response = await fetch(webhookUrl, fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [whatsapp-templates-proxy] Webhook error ${response.status}:`, errorText);

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
        responseData = text ? JSON.parse(text) : { success: true, message: 'Operación completada' };
      } catch {
        responseData = { success: true, message: 'Operación completada' };
      }

      console.log(`✅ [whatsapp-templates-proxy] Operación completada`);

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
    console.error('❌ Error en whatsapp-templates-proxy:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
