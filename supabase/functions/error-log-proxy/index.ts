// Edge Function: error-log-proxy
// Proxy seguro para envío de logs de errores del frontend via N8N

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    
    console.log(`📋 [error-log-proxy] Registrando error: ${payload.error_type || 'unknown'}`)
    
    const ERROR_LOG_AUTH = Deno.env.get('ERROR_LOG_AUTH')
    const WEBHOOK_URL = Deno.env.get('N8N_ERROR_LOG_URL') || 'https://primary-dev-d75a.up.railway.app/webhook/error-log'
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    // Añadir auth si existe
    if (ERROR_LOG_AUTH) {
      headers['Auth'] = ERROR_LOG_AUTH
    }
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [error-log-proxy] Error:`, errorText)
      // No lanzar error - el logging no debe fallar
      return new Response(
        JSON.stringify({ success: false, reason: 'webhook_error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    let responseData
    try {
      responseData = await response.json()
    } catch {
      responseData = { success: true }
    }
    
    console.log(`✅ [error-log-proxy] Error registrado`)
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('❌ Error en error-log-proxy:', error)
    
    // El logging no debe causar más errores - retornar silenciosamente
    return new Response(
      JSON.stringify({ 
        success: false,
        reason: 'proxy_error'
      }),
      { 
        status: 200, // No 500 para evitar cascadas de errores
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
