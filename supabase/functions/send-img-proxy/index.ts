// Función Edge de Supabase para actuar como proxy del webhook send-img
// Evita problemas de CORS al hacer las llamadas desde el servidor

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, livechat_auth',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Leer el payload del request
    const payload = await req.json()
    
    console.log('📤 Proxy recibió payload:', payload)
    
    // Webhook de Railway
    const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/send-img'
    
    // Hacer request al webhook
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'livechat_auth': '2025_livechat_auth'
      },
      body: JSON.stringify(payload)
    })
    
    console.log('📥 Respuesta del webhook:', response.status, response.statusText)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error del webhook:', errorText)
      throw new Error(`Webhook Error: ${response.status} - ${errorText}`)
    }
    
    const responseData = await response.json()
    console.log('✅ Respuesta exitosa:', responseData)
    
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

