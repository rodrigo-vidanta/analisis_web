// Edge Function: whatsapp-templates-send-proxy
// Proxy seguro para envío de plantillas WhatsApp via N8N

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
    
    console.log(`📧 [whatsapp-templates-send-proxy] Enviando plantilla`)
    
    const AUTH_TOKEN = Deno.env.get('WHATSAPP_TEMPLATES_AUTH')
    if (!AUTH_TOKEN) {
      throw new Error('WHATSAPP_TEMPLATES_AUTH no configurado')
    }
    
    const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates-send'
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Auth': AUTH_TOKEN
      },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [whatsapp-templates-send-proxy] Error:`, errorText)
      throw new Error(`Webhook Error: ${response.status} - ${errorText}`)
    }
    
    const responseData = await response.json()
    console.log(`✅ [whatsapp-templates-send-proxy] Plantilla enviada`)
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('❌ Error en whatsapp-templates-send-proxy:', error)
    
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
