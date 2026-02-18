/**
 * ============================================
 * EDGE FUNCTION: MASSIVE IMPORT BROADCAST PROXY
 * ============================================
 *
 * Proxy seguro para broadcast masivo a importados (no-prospectos).
 * Patron identico a broadcast-proxy.
 *
 * Webhook: https://primary-dev-d75a.up.railway.app/webhook/massive-import-broadcast
 * Header: 2025_livechat_auth
 *
 * Fecha: 18 Febrero 2026
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
    // Verificar autenticacion JWT
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
      console.error('[massive-import-broadcast-proxy] Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Authentication required', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.json();

    console.log(`[massive-import-broadcast-proxy] Broadcast importacion="${payload.importacion_id}" template="${payload.template_name}" recipients=${payload.total_recipients} user=${user.email}`);

    // Obtener token
    let webhookToken = Deno.env.get('LIVECHAT_AUTH') || '';

    if (!webhookToken) {
      console.log('[massive-import-broadcast-proxy] LIVECHAT_AUTH not in env, checking DB...');
      const { data: tokenData, error: tokenError } = await supabase
        .from('api_auth_tokens')
        .select('token_value')
        .eq('module_name', 'Broadcast WhatsApp')
        .eq('token_key', 'broadcast_auth')
        .eq('is_active', true)
        .single();

      if (tokenError || !tokenData?.token_value) {
        console.error('[massive-import-broadcast-proxy] Token not found:', tokenError);
        return new Response(
          JSON.stringify({ error: 'Server configuration error (token not found)', success: false }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      webhookToken = tokenData.token_value;
    }

    const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/massive-import-broadcast';

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        '2025_livechat_auth': webhookToken,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[massive-import-broadcast-proxy] Webhook error ${response.status}:`, errorText);
      return new Response(
        JSON.stringify({ error: `Webhook Error: ${response.status}`, details: errorText, success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let responseData;
    try {
      responseData = await response.json();
    } catch {
      responseData = { success: true, message: 'Broadcast sent to N8N' };
    }

    console.log('[massive-import-broadcast-proxy] Broadcast sent successfully');

    return new Response(
      JSON.stringify({ ...responseData, success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[massive-import-broadcast-proxy] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
