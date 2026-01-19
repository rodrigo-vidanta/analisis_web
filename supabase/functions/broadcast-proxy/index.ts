/**
 * ============================================
 * EDGE FUNCTION: BROADCAST PROXY
 * ============================================
 * 
 * Proxy seguro para broadcast masivo de mensajes WhatsApp via N8N
 * Sigue el mismo patrón que send-message-proxy y pause-bot-proxy
 * 
 * Webhook: https://primary-dev-d75a.up.railway.app/webhook/broadcast
 * Header: livechat_auth (mismo que otros webhooks de N8N)
 * 
 * Fecha: 19 Enero 2026
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
      console.error('❌ [broadcast-proxy] Error de autenticación:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Authentication required', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener payload del request (payload de campaña completo)
    const payload = await req.json();

    console.log(`📢 [broadcast-proxy] Campaña "${payload.nombre || payload.campaign_name || 'sin nombre'}" - Usuario: ${user.email}`);

    // Obtener token desde secret o BD
    let webhookToken = Deno.env.get('LIVECHAT_AUTH') || '';
    
    if (!webhookToken) {
      // Fallback: obtener de la BD
      console.log(`🔄 [broadcast-proxy] LIVECHAT_AUTH no en env, buscando en BD...`);
      
      const { data: tokenData, error: tokenError } = await supabase
        .from('api_auth_tokens')
        .select('token_value')
        .eq('module_name', 'Broadcast WhatsApp')
        .eq('token_key', 'broadcast_auth')
        .eq('is_active', true)
        .single();
      
      if (tokenError || !tokenData?.token_value) {
        console.error('❌ Token no encontrado en BD:', tokenError);
        return new Response(
          JSON.stringify({ error: 'Server configuration error (token not found)', success: false }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      webhookToken = tokenData.token_value;
      console.log(`✅ [broadcast-proxy] Token obtenido de BD`);
    }

    // Webhook de N8N
    const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/broadcast';

    console.log(`📤 [broadcast-proxy] Enviando a N8N webhook...`);

    // Hacer request al webhook de N8N con autenticación
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'livechat_auth': webhookToken, // Header correcto (igual que otros proxies)
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [broadcast-proxy] Webhook error ${response.status}:`, errorText);
      return new Response(
        JSON.stringify({ 
          error: `Webhook Error: ${response.status}`, 
          details: errorText,
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
      responseData = { success: true, message: 'Campaign sent to N8N' };
    }

    console.log(`✅ [broadcast-proxy] Campaña enviada a N8N exitosamente`);

    return new Response(
      JSON.stringify({ ...responseData, success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error en broadcast-proxy:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
