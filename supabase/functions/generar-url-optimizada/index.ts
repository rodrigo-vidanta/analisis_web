// Edge Function para generar URLs firmadas con transformación de imagen
// Reduce el tamaño de la imagen para cumplir con el límite de 5MB de WhatsApp
// 
// NOTA: Esta función tiene verificación JWT deshabilitada para permitir acceso desde N8N
// La seguridad se mantiene mediante un token simple en el body

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Configuración de Supabase (proyecto pqnc_ai / analysis)
const SUPABASE_URL = 'https://glsmifhkoaifvaegsozd.supabase.co'
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Token simple para autenticación
const AUTH_TOKEN = '2025_generar_url_optimizada_auth'

serve(async (req) => {
  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { filename, bucket, expirationMinutes = 30, resize = true, auth_token } = body
    
    // Verificar token de autenticación en el body
    if (auth_token !== AUTH_TOKEN) {
      console.log('❌ Token inválido:', auth_token)
      return new Response(
        JSON.stringify({ error: 'Token de autenticación inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!filename || !bucket) {
      return new Response(
        JSON.stringify({ error: 'filename y bucket son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📸 Generando URL para: ${bucket}/${filename}, resize=${resize}`)

    // Crear cliente de Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Opciones de transformación para reducir el tamaño
    // WhatsApp tiene límite de 5MB, apuntamos a ~2MB máximo
    const transformOptions = resize ? {
      transform: {
        width: 1920,      // Máximo 1920px de ancho
        height: 1920,     // Máximo 1920px de alto (mantiene aspect ratio)
        quality: 80,      // 80% calidad (buen balance tamaño/calidad)
        format: 'origin'  // Mantener formato original (jpg/png)
      }
    } : {}

    // Generar URL firmada con transformación
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .createSignedUrl(filename, expirationMinutes * 60, transformOptions)

    if (error) {
      console.error('❌ Error generando URL firmada:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ URL generada: ${data.signedUrl.substring(0, 100)}...`)

    return new Response(
      JSON.stringify({ 
        url: data.signedUrl,
        transformed: resize,
        config: resize ? { width: 1920, height: 1920, quality: 80 } : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error en generar-url-optimizada:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

