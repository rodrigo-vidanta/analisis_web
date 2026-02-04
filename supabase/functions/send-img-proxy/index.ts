// Función Edge de Supabase para actuar como proxy del webhook send-img
// Evita problemas de CORS al hacer las llamadas desde el servidor

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, livechat_auth, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Usar X-Request-ID del cliente o generar uno nuevo
    const clientRequestId = req.headers.get('x-request-id')
    const requestId = clientRequestId || `proxy_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    
    // Leer el payload del request
    const payload = await req.json()
    
    // Extraer datos para logging
    const imageFile = payload?.[0]?.imagenes?.[0]?.archivo || 'unknown'
    const hasCaption = !!payload?.[0]?.caption
    const payloadRequestId = payload?.[0]?.request_id || 'no-id'
    
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📤 [${requestId}] NUEVA IMAGEN`)
    console.log(`   Archivo: ${imageFile}`)
    console.log(`   Caption: ${hasCaption ? 'SÍ' : 'NO'}`)
    console.log(`   Payload ID: ${payloadRequestId}`)
    console.log(`   Timestamp: ${new Date().toISOString()}`)
    console.log(`${'='.repeat(60)}`)
    
    // Verificar autenticación JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar que es un usuario real (no solo anon_key)
    const jwt = authHeader.substring(7);
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Webhook de Railway (URL desde secret)
    const WEBHOOK_URL = Deno.env.get('N8N_SEND_IMG_URL') || 'https://primary-dev-d75a.up.railway.app/webhook/send-img';
    const livechatAuth = Deno.env.get('LIVECHAT_AUTH') || '2025_livechat_auth';
    
    // Hacer request al webhook con request ID para trazabilidad
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        '2025_livechat_auth': livechatAuth,
        'x-request-id': requestId
      },
      body: JSON.stringify(payload)
    })
    
    console.log(`📥 [${requestId}] Respuesta: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [${requestId}] Error del webhook:`, errorText)
      throw new Error(`Webhook Error: ${response.status} - ${errorText}`)
    }
    
    const responseData = await response.json()
    console.log(`✅ [${requestId}] Éxito para archivo: ${imageFile}`)
    
    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
    
  } catch (error) {
    console.error('❌ Error en proxy send-img:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error desconocido',
        success: false 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

