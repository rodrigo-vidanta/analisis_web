/**
 * ============================================
 * EDGE FUNCTION: IMPORT-CONTACT-PROXY
 * ============================================
 * 
 * Proxy seguro para el webhook import-contact-crm
 * Agrega autenticación sin exponer el token en el frontend
 * 
 * Webhook: https://primary-dev-d75a.up.railway.app/webhook/import-contact-crm
 * Header: livechat_auth (mismo que otros webhooks de N8N)
 * 
 * Fecha: 27 Enero 2026
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
        JSON.stringify({ error: 'Missing authorization header' }),
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
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener payload del request
    const payload = await req.json();

    console.log(`📥 [import-contact-proxy] Request from user: ${user.email}`);
    console.log(`📋 [import-contact-proxy] Payload:`, payload);

    // Obtener webhook URL y token desde secrets
    const webhookUrl = Deno.env.get('N8N_IMPORT_CONTACT_URL') || 'https://primary-dev-d75a.up.railway.app/webhook/import-contact-crm';
    const webhookToken = Deno.env.get('LIVECHAT_AUTH') || '';

    if (!webhookToken) {
      console.error('❌ LIVECHAT_AUTH no configurado');
    }

    // Hacer request al webhook de N8N con autenticación
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'livechat_auth': webhookToken, // Mismo header que otros webhooks
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [import-contact-proxy] Webhook error: ${response.status}`, errorText);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Webhook error: ${response.status}`, 
          details: errorText 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Leer respuesta como texto primero
    const responseText = await response.text();
    console.log(`📥 [import-contact-proxy] Raw response: "${responseText}"`);

    // Verificar si la respuesta está vacía
    if (!responseText || responseText.trim() === '') {
      console.warn('⚠️ [import-contact-proxy] Respuesta vacía del webhook. Asumiendo éxito.');
      // Si el status es 200 y no hay error, asumimos que fue exitoso
      return new Response(
        JSON.stringify([{
          success: true,
          message: 'Importación procesada correctamente',
          prospecto_id: null, // N8N no devuelve el ID
          es_nuevo: true,
          data: {
            id: null,
            nombre_completo: payload.nombre_completo || '',
            etapa: 'importado manual',
            origen: 'IMPORTADO_MANUAL',
            ejecutivo_id: payload.ejecutivo_id || '',
            ejecutivo_nombre: payload.ejecutivo_nombre || '',
            coordinacion_id: payload.coordinacion_id || ''
          }
        }]),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Intentar parsear como JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('❌ [import-contact-proxy] Error parsing JSON:', jsonError);
      console.error('Raw response:', responseText);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Error al procesar la respuesta del webhook',
          details: responseText.substring(0, 200) // Primeros 200 caracteres
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [import-contact-proxy] Success:`, data);

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [import-contact-proxy] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
