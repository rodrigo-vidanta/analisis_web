/**
 * ============================================
 * EDGE FUNCTION: TRIGGER MANUAL PROXY
 * ============================================
 * 
 * Proxy seguro para programar/actualizar/eliminar llamadas manuales
 * LLAMA AL WEBHOOK DE N8N (no inserta directamente en BD)
 * 
 * La lógica de negocio está en N8N:
 * - Validaciones adicionales
 * - Integración con VAPI/Dynamics
 * - Inserción en llamadas_programadas
 * - Cron Job para ejecución
 * 
 * Webhook: https://primary-dev-d75a.up.railway.app/webhook/trigger-manual
 * Header Auth: livechat_auth (mismo que otros webhooks de livechat)
 * 
 * Fecha: 20 Enero 2026
 * Fix: Corregido para llamar webhook N8N en lugar de BD directa
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// URL del webhook de N8N
const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/trigger-manual';

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
      console.error('❌ [trigger-manual-proxy] Error de autenticación:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Authentication required', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener payload del request
    const payload = await req.json();
    const { 
      action,
      prospecto_id, 
      user_id,
      justificacion,
      scheduled_timestamp,
      schedule_type,
      customer_phone,
      customer_name,
      conversation_id,
      llamada_programada_id 
    } = payload;

    console.log(`📞 [trigger-manual-proxy] Acción: ${action || 'INSERT'} para prospecto: ${prospecto_id} (user: ${user.email})`);

    // Obtener token de autenticación desde secret
    // Usa el mismo header que otros webhooks de livechat
    const webhookToken = Deno.env.get('LIVECHAT_AUTH') || '';
    if (!webhookToken) {
      console.error('❌ LIVECHAT_AUTH no configurado');
      return new Response(
        JSON.stringify({ error: 'Server configuration error', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener nombre del usuario que programa (para el payload)
    let programadaPorNombre = customer_name || user.email;
    try {
      const { data: userData } = await supabase
        .from('auth_users_safe')
        .select('full_name')
        .eq('id', user_id || user.id)
        .single();
      if (userData?.full_name) {
        programadaPorNombre = userData.full_name;
      }
    } catch (e) {
      console.log('No se pudo obtener nombre del usuario, usando email');
    }

    // Construir payload para N8N
    // El webhook espera recibir toda la información para procesarla
    const n8nPayload: Record<string, unknown> = {
      // Campos originales (compatibilidad con el webhook original)
      prospecto_id,
      motivo: justificacion || 'Llamada programada desde UI',
      
      // Campos extendidos para la lógica de N8N
      action: action || 'INSERT',
      user_id: user_id || user.id,
      user_email: user.email,
      programada_por_nombre: programadaPorNombre,
      scheduled_timestamp,
      schedule_type: schedule_type || 'now',
      customer_phone,
      customer_name,
      conversation_id,
      
      // Para UPDATE/DELETE
      llamada_programada_id,
      
      // Metadata
      timestamp: new Date().toISOString(),
      source: 'edge-function'
    };

    console.log(`🔗 [trigger-manual-proxy] Llamando webhook N8N: ${WEBHOOK_URL}`);

    // Hacer request al webhook de N8N con autenticación
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'livechat_auth': webhookToken, // Mismo header que otros webhooks
      },
      body: JSON.stringify(n8nPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [trigger-manual-proxy] Webhook error ${response.status}:`, errorText);
      return new Response(
        JSON.stringify({ 
          error: `Webhook Error: ${response.status} - ${errorText}`, 
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
      responseData = { success: true, message: 'Request processed' };
    }

    const actionLabel = action === 'DELETE' ? 'cancelada' : action === 'UPDATE' ? 'actualizada' : 'programada';
    console.log(`✅ [trigger-manual-proxy] Llamada ${actionLabel} exitosamente para prospecto: ${prospecto_id}`);

    return new Response(
      JSON.stringify({ 
        ...responseData, 
        success: true,
        message: `Llamada ${actionLabel} exitosamente`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error en trigger-manual-proxy:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
