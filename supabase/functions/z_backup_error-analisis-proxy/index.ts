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
      console.error('ERROR_ANALISIS_WEBHOOK_TOKEN no configurada')
      return new Response(
        JSON.stringify({ 
          error: 'ERROR_ANALISIS_WEBHOOK_TOKEN no configurada',
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

    // Leer el payload del request
    let payload;
    try {
      payload = await req.json()
      console.log('Proxy recibió payload:', JSON.stringify(payload).substring(0, 200))
    } catch (parseError) {
      console.error('Error parseando JSON:', parseError)
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
    
    console.log('Respuesta del webhook:', response.status, response.statusText)
    
    // Leer el cuerpo de la respuesta (puede ser JSON incluso con status 500)
    let responseText = '';
    try {
      responseText = await response.text()
      console.log('Cuerpo de respuesta (primeros 500 chars):', responseText.substring(0, 500))
    } catch (readError) {
      console.error('Error leyendo respuesta:', readError)
      throw new Error(`Error leyendo respuesta: ${readError instanceof Error ? readError.message : 'Error desconocido'}`)
    }
    
    // Intentar parsear como JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText)
      console.log('Respuesta parseada correctamente')
    } catch (parseError) {
      console.error('Error parseando JSON:', parseError)
      console.error('Respuesta recibida:', responseText)
      throw new Error(`Error parseando respuesta: ${parseError instanceof Error ? parseError.message : 'Error desconocido'}`)
    }
    
    // El webhook de n8n puede devolver la respuesta envuelta en "output"
    // Extraer el contenido real si está envuelto
    let actualResponse = responseData;
    if (responseData.output && typeof responseData.output === 'object') {
      actualResponse = responseData.output;
      console.log('Respuesta extraída de objeto output')
    }
    
    // Si la respuesta tiene success: true y analysis, retornarla aunque el status sea 500
    if (actualResponse.success === true && actualResponse.analysis) {
      console.log('Respuesta válida encontrada (success: true con analysis)')
      return new Response(
        JSON.stringify(actualResponse),
        { 
          status: 200,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }
    
    // Si no es exitosa, lanzar error
    if (!response.ok || !actualResponse.success) {
      console.error('Error del webhook:', actualResponse)
      throw new Error(`Webhook Error: ${response.status} - ${JSON.stringify(actualResponse)}`)
    }
    
    return new Response(
      JSON.stringify(actualResponse),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
    
  } catch (error) {
    console.error('Error en proxy:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: {
          code: 'PROXY_ERROR',
          message: error instanceof Error ? error.message : 'Error desconocido'
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
