// Edge Function: transfer-request-proxy
// Proxy seguro para solicitudes de transferencia de llamadas via N8N

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
    const { prospect_id } = await req.json()
    
    console.log(`📞 [transfer-request-proxy] Transfer request para ${prospect_id}`)
    
    const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/transfer_request'
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospect_id })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [transfer-request-proxy] Error:`, errorText)
      throw new Error(`Webhook Error: ${response.status}`)
    }
    
    const responseData = await response.json()
    console.log(`✅ [transfer-request-proxy] Transfer solicitada`)
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('❌ Error en transfer-request-proxy:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error desconocido',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
