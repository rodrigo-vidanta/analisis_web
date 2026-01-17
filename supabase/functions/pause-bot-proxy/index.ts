/**
 * ============================================
 * EDGE FUNCTION: PAUSE BOT PROXY
 * ============================================
 * 
 * Proxy seguro para pausar/reanudar bot de WhatsApp via N8N
 * Usa el mismo header livechat_auth que otros webhooks
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
    // El frontend puede enviar:
    // - ttl (en segundos) - formato original que espera N8N
    // - duration_minutes - formato alternativo que convertimos a ttl
    const body = await req.json();
    const { uchat_id } = body;
    
    // Calcular TTL: priorizar ttl si existe, sino convertir duration_minutes a segundos
    let ttl: number;
    if (typeof body.ttl === 'number') {
      ttl = body.ttl;
    } else if (typeof body.duration_minutes === 'number') {
      ttl = body.duration_minutes * 60; // Convertir minutos a segundos
    } else {
      ttl = 60; // Default: 1 minuto
    }
    
    if (!uchat_id) {
      return new Response(
        JSON.stringify({ error: 'uchat_id is required', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`⏸️ [pause-bot-proxy] Bot para ${uchat_id} - TTL: ${ttl}s (user: ${user.email})`);

    // Obtener token desde secret (mismo que otros webhooks)
    const webhookToken = Deno.env.get('LIVECHAT_AUTH') || '';
    if (!webhookToken) {
      console.error('❌ LIVECHAT_AUTH no configurado');
      return new Response(
        JSON.stringify({ error: 'Server configuration error', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/pause_bot';

    // Hacer request al webhook de N8N con autenticación
    // El webhook N8N espera: { uchat_id, ttl } donde ttl es en segundos
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'livechat_auth': webhookToken, // Mismo header que otros webhooks
      },
      body: JSON.stringify({ uchat_id, ttl }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [pause-bot-proxy] Webhook error ${response.status}:`, errorText);
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
      responseData = { success: true, message: 'Bot status updated' };
    }

    console.log(`✅ [pause-bot-proxy] Bot ${ttl === 0 ? 'reanudado' : 'pausado'} exitosamente (TTL: ${ttl}s)`);

    return new Response(
      JSON.stringify({ ...responseData, success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error en pause-bot-proxy:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
