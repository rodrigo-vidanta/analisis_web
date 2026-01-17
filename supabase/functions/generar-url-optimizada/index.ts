// Edge Function para generar URLs firmadas de Google Cloud Storage
// Actúa como proxy al servicio de Railway para ocultar el token de autenticación
// Las imágenes están en GCS (Google Cloud Storage), no en Supabase Storage

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// URL del servicio original en Railway (Google Cloud Storage)
const GCS_SERVICE_URL = 'https://function-bun-dev-6d8e.up.railway.app/generar-url'

// Token de autenticación para el servicio de Railway
const GCS_API_TOKEN = Deno.env.get('GCS_API_TOKEN') || Deno.env.get('MEDIA_URL_AUTH') || ''

serve(async (req) => {
  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar que tenemos el token
    if (!GCS_API_TOKEN) {
      console.error('❌ GCS_API_TOKEN o MEDIA_URL_AUTH no está configurado')
      return new Response(
        JSON.stringify({ error: 'Configuración del servidor incompleta (GCS token)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let body;
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('❌ Error parseando JSON:', parseError)
      return new Response(
        JSON.stringify({ error: 'JSON inválido en el body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const { filename, bucket, expirationMinutes = 30 } = body
    
    console.log('📝 Proxy request a GCS:', { 
      bucket, 
      filename: filename?.substring(0, 50),
      expirationMinutes
    })

    if (!filename || !bucket) {
      console.log('❌ Faltan parámetros:', { filename: !!filename, bucket: !!bucket })
      return new Response(
        JSON.stringify({ error: 'filename y bucket son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📸 Llamando a servicio GCS para: ${bucket}/${filename.substring(0, 50)}...`)

    // Llamar al servicio de Railway (GCS)
    const gcsResponse = await fetch(GCS_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': GCS_API_TOKEN
      },
      body: JSON.stringify({
        filename,
        bucket,
        expirationMinutes
      })
    })

    // Obtener la respuesta
    const responseText = await gcsResponse.text()
    
    if (!gcsResponse.ok) {
      console.error('❌ Error del servicio GCS:', gcsResponse.status, responseText)
      return new Response(
        JSON.stringify({ 
          error: 'Error del servicio de imágenes',
          status: gcsResponse.status,
          details: responseText.substring(0, 200)
        }),
        { status: gcsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parsear respuesta
    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error('❌ Error parseando respuesta GCS:', responseText.substring(0, 100))
      return new Response(
        JSON.stringify({ error: 'Respuesta inválida del servicio de imágenes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ URL obtenida de GCS exitosamente`)

    // Retornar la respuesta del servicio GCS
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error en generar-url-optimizada:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        type: 'internal_error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
