// Edge Function: dynamics-lead-proxy
// Proxy seguro para consulta de leads en Dynamics CRM via N8N

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
    const { id_prospecto, id_dynamics } = await req.json()
    
    console.log(`🔍 [dynamics-lead-proxy] Consultando lead: ${id_dynamics || id_prospecto}`)
    
    const DYNAMICS_TOKEN = Deno.env.get('DYNAMICS_TOKEN')
    if (!DYNAMICS_TOKEN) {
      throw new Error('DYNAMICS_TOKEN no configurado')
    }
    
    const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/lead-info'
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Auth': DYNAMICS_TOKEN
      },
      body: JSON.stringify({ id_prospecto, id_dynamics })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [dynamics-lead-proxy] Error:`, errorText)
      throw new Error(`Webhook Error: ${response.status}`)
    }
    
    const responseData = await response.json()
    console.log(`✅ [dynamics-lead-proxy] Lead encontrado`)
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('❌ Error en dynamics-lead-proxy:', error)
    
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
