// Función Edge de Supabase para actuar como proxy de n8n API
// Evita problemas de CORS al hacer las llamadas desde el servidor

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { endpoint, method = 'GET', data } = await req.json()
    
    // Configuración de n8n
    const N8N_API_URL = 'https://primary-dev-d75a.up.railway.app/api/v1'
    const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMmE1MDZkMS1hZDM4LTQ3MGYtOTEzOS02MzAwM2NiMjQzZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU5MzU3ODgzfQ.7z0FtziI-eFleJr4pLvP5GgRVptllCw26Losrxf_Qpo'
    
    // Construir URL completa
    const url = `${N8N_API_URL}${endpoint}`
    
    // Configurar request
    const requestOptions: RequestInit = {
      method,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
      }
    }
    
    // Agregar body si es necesario
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = JSON.stringify(data)
    }
    
    // Hacer request a n8n
    const response = await fetch(url, requestOptions)
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`n8n API Error: ${response.status} - ${errorText}`)
    }
    
    const responseData = await response.json()
    
    // Procesar respuesta según el endpoint
    let result = {}
    
    if (endpoint === '/workflows') {
      // Para lista de workflows, extraer solo los datos necesarios
      result = {
        workflows: responseData.data || responseData
      }
    } else if (endpoint.startsWith('/workflows/')) {
      // Para workflow específico
      result = {
        workflow: responseData.data || responseData
      }
    } else {
      result = responseData
    }
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
    
  } catch (error) {
    console.error('Error en proxy n8n:', error)
    
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
