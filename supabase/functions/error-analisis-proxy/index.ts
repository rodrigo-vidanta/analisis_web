// Función Edge de Supabase para actuar como proxy del webhook error-analisis
// Evita problemas de CORS al hacer las llamadas desde el servidor

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
    // Verificar configuración de webhook
    const WEBHOOK_URL = Deno.env.get('ERROR_ANALISIS_WEBHOOK_URL') || 'https://primary-dev-d75a.up.railway.app/webhook/error-analisis'
    const WEBHOOK_TOKEN = Deno.env.get('ERROR_ANALISIS_WEBHOOK_TOKEN')
    
    if (!WEBHOOK_TOKEN) {
      console.error('❌ ERROR_ANALISIS_WEBHOOK_TOKEN no configurada en variables de entorno')
      return new Response(
        JSON.stringify({ 
          error: 'ERROR_ANALISIS_WEBHOOK_TOKEN no configurada. Por favor, configura la variable de entorno en Supabase.',
          success: false,
          details: 'La Edge Function requiere la variable de entorno ERROR_ANALISIS_WEBHOOK_TOKEN en el dashboard de Supabase'
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

    // Leer el payload del request
    let payload;
    try {
      payload = await req.json()
      console.log('📤 Proxy recibió payload para análisis de IA:', JSON.stringify(payload).substring(0, 200))
    } catch (parseError) {
      console.error('❌ Error parseando JSON:', parseError)
      return new Response(
        JSON.stringify({ 
          error: 'Error parseando el payload JSON',
          success: false,
          details: parseError instanceof Error ? parseError.message : 'Error desconocido'
        }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    // Validar que el payload tenga los campos requeridos
    if (!payload.analysis_id || !payload.error_log) {
      return new Response(
        JSON.stringify({ 
          error: 'Payload inválido: se requieren los campos "analysis_id" y "error_log"',
          success: false
        }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      )
    }
    
    // Hacer request al webhook
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${WEBHOOK_TOKEN}`
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
    console.log('✅ Respuesta exitosa del webhook')
    
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
    console.error('❌ Error en proxy error-analisis:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: {
          code: 'PROXY_ERROR',
          message: error instanceof Error ? error.message : 'Error desconocido en el proxy'
        }
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

