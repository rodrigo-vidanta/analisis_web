// Edge Function: send-message-proxy
// Proxy seguro para envío de mensajes WhatsApp via N8N

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, uchat_id, id_sender } = await req.json()
    
    console.log(`📤 [send-message-proxy] Enviando mensaje a ${uchat_id}`)
    
    // Obtener auth token desde env
    const AUTH_TOKEN = Deno.env.get('SEND_MESSAGE_AUTH')
    if (!AUTH_TOKEN) {
      throw new Error('SEND_MESSAGE_AUTH no configurado')
    }
    
    // Webhook de N8N en Railway
    const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/send-message'
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Auth': AUTH_TOKEN
      },
      body: JSON.stringify({ message, uchat_id, id_sender })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [send-message-proxy] Error del webhook:`, errorText)
      throw new Error(`Webhook Error: ${response.status} - ${errorText}`)
    }
    
    const responseData = await response.json()
    console.log(`✅ [send-message-proxy] Mensaje enviado exitosamente`)
    
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
    console.error('❌ Error en send-message-proxy:', error)
    
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
