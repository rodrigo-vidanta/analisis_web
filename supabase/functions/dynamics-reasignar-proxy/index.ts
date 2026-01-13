// Edge Function: dynamics-reasignar-proxy
// Proxy seguro para reasignación de prospectos en Dynamics CRM via N8N

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
    
    console.log(`🔄 [dynamics-reasignar-proxy] Reasignando prospecto en Dynamics`)
    
    const DYNAMICS_TOKEN = Deno.env.get('DYNAMICS_TOKEN')
    if (!DYNAMICS_TOKEN) {
      throw new Error('DYNAMICS_TOKEN no configurado')
    }
    
    const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/reasignar-prospecto'
    
    // Timeout de 80 segundos (Dynamics CRM puede tardar)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 80000)
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Auth': DYNAMICS_TOKEN
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [dynamics-reasignar-proxy] Error:`, errorText)
      throw new Error(`Webhook Error: ${response.status}`)
    }
    
    const responseData = await response.json()
    console.log(`✅ [dynamics-reasignar-proxy] Reasignación completada`)
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('❌ Error en dynamics-reasignar-proxy:', error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(
        JSON.stringify({ error: 'Timeout: La operación tardó más de 80 segundos', success: false }),
        { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
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
