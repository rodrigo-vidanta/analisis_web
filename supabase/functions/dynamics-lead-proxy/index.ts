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
      return new Response(
        JSON.stringify({ error: 'Authentication required', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/lead-info';

    // Timeout de 30 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // Llamar al webhook de N8N con los headers correctos (igual que dynamics-reasignar-proxy)
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
        return new Response(
          JSON.stringify({ 
            error: `Webhook Error: ${response.status}`, 
            details: errorText,
            success: false 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Parsear respuesta
      let responseData;
      try {
        responseData = await response.json();
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
          JSON.stringify({ error: 'Timeout: La operación tardó más de 30 segundos', success: false }),
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
