// Edge Function: trigger-manual-proxy
// Proxy seguro para disparar llamadas manuales via N8N

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
    
    console.log(`📞 [trigger-manual-proxy] Iniciando llamada para prospecto: ${payload.prospecto_id}`)
    
    const MANUAL_CALL_AUTH = Deno.env.get('MANUAL_CALL_AUTH')
    if (!MANUAL_CALL_AUTH) {
      throw new Error('MANUAL_CALL_AUTH no configurado')
    }
    
    const WEBHOOK_URL = Deno.env.get('N8N_TRIGGER_MANUAL_URL') || 'https://primary-dev-d75a.up.railway.app/webhook/trigger-manual-call'
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Auth': MANUAL_CALL_AUTH
      },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [trigger-manual-proxy] Error:`, errorText)
      throw new Error(`Webhook Error: ${response.status}`)
    }
    
    const responseData = await response.json()
    console.log(`✅ [trigger-manual-proxy] Llamada iniciada exitosamente`)
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('❌ Error en trigger-manual-proxy:', error)
    
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
