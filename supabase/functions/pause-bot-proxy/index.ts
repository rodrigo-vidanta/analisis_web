// Edge Function: pause-bot-proxy
// Proxy seguro para pausar/reanudar bot de WhatsApp via N8N

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
    const { uchat_id, duration_minutes, paused_by } = await req.json()
    
    console.log(`⏸️ [pause-bot-proxy] ${paused_by === 'bot' ? 'Pausando' : 'Reanudando'} bot para ${uchat_id}`)
    
    const AUTH_TOKEN = Deno.env.get('PAUSE_BOT_AUTH')
    if (!AUTH_TOKEN) {
      throw new Error('PAUSE_BOT_AUTH no configurado')
    }
    
    const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/pause_bot'
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Auth': AUTH_TOKEN
      },
      body: JSON.stringify({ uchat_id, duration_minutes, paused_by })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [pause-bot-proxy] Error:`, errorText)
      throw new Error(`Webhook Error: ${response.status}`)
    }
    
    const responseData = await response.json()
    console.log(`✅ [pause-bot-proxy] Bot ${paused_by === 'bot' ? 'pausado' : 'reanudado'}`)
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('❌ Error en pause-bot-proxy:', error)
    
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
