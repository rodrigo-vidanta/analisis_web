/**
 * ============================================
 * EDGE FUNCTION: DYNAMICS LEAD PROXY
 * ============================================
 * 
 * Proxy seguro para consulta de leads en Dynamics CRM via N8N
 * 
 * Webhook: https://primary-dev-d75a.up.railway.app/webhook/lead-info
 * Auth: Authorization: Bearer <DYNAMICS_TOKEN>
 *       x-dynamics-token: <DYNAMICS_TOKEN>
 * 
 * ACTUALIZACIÓN 2026-02-05: Migrado a Deno.serve() nativo para evitar
 * bundle timeout con imports de deno.land/std y @supabase/supabase-js.
 * La validación JWT se hace manualmente via /auth/v1/user.
 * (verify_jwt debe ser false en Supabase).
 * 
 * Fecha original: 17 Enero 2026
 * Última actualización: 05 Febrero 2026
 */

const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/lead-info';

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

    // Obtener payload del request
    const payload = await req.json();
    
    console.log(`🔍 [dynamics-lead-proxy] Consultando lead (user: ${user.email})`);

    // Obtener token de Dynamics desde secrets
    const dynamicsToken = Deno.env.get('DYNAMICS_TOKEN') || '';
    if (!dynamicsToken) {
      console.error('❌ DYNAMICS_TOKEN no configurado');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: DYNAMICS_TOKEN not configured', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Timeout de 90 segundos (1:30 minutos)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      // Llamar al webhook de N8N con los headers correctos
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dynamicsToken}`,
          'x-dynamics-token': dynamicsToken
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [dynamics-lead-proxy] Webhook error ${response.status}:`, errorText);
        
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
            success: false 
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Manejar respuesta (puede ser vacía)
      const text = await response.text();
      let responseData;
      try {
        responseData = text ? JSON.parse(text) : { success: true, message: 'Lead encontrado' };
      } catch {
        responseData = { success: true, message: 'Lead encontrado' };
      }

      console.log(`✅ [dynamics-lead-proxy] Lead encontrado exitosamente`);

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
    console.error('❌ Error en dynamics-lead-proxy:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
