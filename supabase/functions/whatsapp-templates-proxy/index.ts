// Edge Function: whatsapp-templates-proxy
// Proxy seguro para gestión de plantillas WhatsApp (CRUD + Sync) via N8N

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const queryParams = url.searchParams.toString()
    const payload = req.method !== 'GET' ? await req.json() : null
    
    console.log(`📋 [whatsapp-templates-proxy] ${req.method} ${queryParams ? `?${queryParams}` : ''}`)
    
    const AUTH_TOKEN = Deno.env.get('WHATSAPP_TEMPLATES_AUTH')
    if (!AUTH_TOKEN) {
      throw new Error('WHATSAPP_TEMPLATES_AUTH no configurado')
    }
    
    const WEBHOOK_URL = `https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates${queryParams ? `?${queryParams}` : ''}`
    
    const fetchOptions: RequestInit = {
      method: 'POST', // N8N siempre usa POST
      headers: {
        'Content-Type': 'application/json',
        'Auth': AUTH_TOKEN
      }
    }
    
    if (payload) {
      fetchOptions.body = JSON.stringify(payload)
    }
    
    const response = await fetch(WEBHOOK_URL, fetchOptions)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [whatsapp-templates-proxy] Error:`, errorText)
      throw new Error(`Webhook Error: ${response.status}`)
    }
    
    const responseData = await response.json()
    console.log(`✅ [whatsapp-templates-proxy] Operación completada`)
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('❌ Error en whatsapp-templates-proxy:', error)
    
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
