/**
 * ============================================
 * EDGE FUNCTION: GENERAR-URL-OPTIMIZADA
 * ============================================
 * 
 * Proxy seguro para generar URLs firmadas de Google Cloud Storage.
 * 
 * SEGURIDAD:
 * - Requiere autenticación JWT de Supabase
 * - Solo usuarios autenticados (authenticated role) pueden usar esta función
 * - No permite acceso con solo anon_key
 * 
 * SECRETS REQUERIDOS:
 * - GCS_API_TOKEN o MEDIA_URL_AUTH
 * 
 * Autor: Darig Samuel Rosales Robledo
 * Fecha: 17 Enero 2026 (Hardening de seguridad)
 */

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

/**
 * Verifica que el JWT sea de un usuario autenticado
 * Retorna el payload del JWT si es válido, null si no lo es
 */
function verifyJWT(authHeader: string | null): { valid: boolean; error?: string; payload?: Record<string, unknown> } {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Authorization header required' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid JWT format' };
    }
    
    // Decodificar payload
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    
    // Verificar que tiene un user_id (sub) - indica que es un usuario autenticado
    const isAuthenticated = payload.sub && payload.role === 'authenticated';
    const isServiceRole = payload.role === 'service_role';
    
    // Solo permitir usuarios autenticados o service_role
    if (!isAuthenticated && !isServiceRole) {
      console.log('🚫 Access denied - role:', payload.role, 'sub:', payload.sub);
      return { valid: false, error: 'Authentication required. Please login.' };
    }
    
    return { valid: true, payload };
  } catch (jwtError) {
    console.error('JWT validation error:', jwtError);
    return { valid: false, error: 'Invalid authentication token' };
  }
}

serve(async (req) => {
  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ============================================
    // VERIFICACIÓN DE AUTENTICACIÓN (JWT)
    // ============================================
    const authHeader = req.headers.get('Authorization');
    const jwtCheck = verifyJWT(authHeader);
    
    if (!jwtCheck.valid) {
      console.log('🚫 Acceso denegado a generar-url-optimizada:', jwtCheck.error);
      return new Response(
        JSON.stringify({ error: jwtCheck.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ Usuario autenticado:', jwtCheck.payload?.sub, 'role:', jwtCheck.payload?.role);

    // Verificar que tenemos el token de GCS
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
      expirationMinutes,
      user: jwtCheck.payload?.sub
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

    console.log(`✅ URL obtenida de GCS exitosamente para usuario: ${jwtCheck.payload?.sub}`)

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
