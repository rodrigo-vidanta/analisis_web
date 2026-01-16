// Edge Function: broadcast-proxy
// Proxy seguro para broadcast masivo de mensajes WhatsApp via N8N

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
    
    console.log(`📢 [broadcast-proxy] Enviando broadcast a ${payload.destinatarios?.length || 0} destinatarios`)
    
    const BROADCAST_AUTH = Deno.env.get('BROADCAST_AUTH')
    if (!BROADCAST_AUTH) {
      throw new Error('BROADCAST_AUTH no configurado')
    }
    
    const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/broadcast'
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Auth': BROADCAST_AUTH
      },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [broadcast-proxy] Error:`, errorText)
      throw new Error(`Webhook Error: ${response.status}`)
    }
    
    const responseData = await response.json()
    console.log(`✅ [broadcast-proxy] Broadcast enviado`)
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('❌ Error en broadcast-proxy:', error)
    
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
