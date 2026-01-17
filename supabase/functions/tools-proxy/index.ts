/**
 * ============================================
 * EDGE FUNCTION: tools-proxy
 * ============================================
 * 
 * Proxy seguro para herramientas/acciones en llamadas via N8N.
 * Soporta acciones como: transfer, hangup, etc.
 * 
 * NOTAS DE SEGURIDAD:
 * - El acceso a la app ya está protegido por login (Supabase Auth)
 * - Esta función solo actúa como proxy para ocultar el webhook de N8N
 * - No se valida JWT aquí para simplificar (la app ya está protegida)
 * 
 * Autor: Darig Samuel Rosales Robledo
 * Fecha: 17 Enero 2026
 * Versión: 2.0.0 - Simplificado (sin validación JWT redundante)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    
    // Validar que tenga al menos action o call_id
    if (!payload.action && !payload.call_id) {
      return new Response(
        JSON.stringify({ error: 'action o call_id requerido', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`🔧 [tools-proxy] Ejecutando acción: ${payload.action || 'herramienta genérica'}`)
    
    // URL del webhook de N8N (Railway)
    const WEBHOOK_URL = Deno.env.get('N8N_TOOLS_URL') || 
                        'https://primary-dev-d75a.up.railway.app/webhook/tools'
    
    // Token de autenticación (opcional, configurar en Supabase Secrets)
    const authToken = Deno.env.get('LIVECHAT_AUTH') || ''
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    // Agregar auth si está configurado
    if (authToken) {
      headers['livechat_auth'] = authToken
    }
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [tools-proxy] Error ${response.status}:`, errorText)
      return new Response(
        JSON.stringify({ 
          error: `Webhook Error: ${response.status}`,
          details: errorText.substring(0, 200),
          success: false 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const responseData = await response.json()
    console.log(`✅ [tools-proxy] Acción ejecutada exitosamente`)
    
    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('❌ [tools-proxy] Error:', error)
    
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
