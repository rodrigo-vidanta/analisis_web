/**
 * ============================================
 * EDGE FUNCTION: GENERATE TWILIO TOKEN
 * ============================================
 *
 * Genera Access Tokens JWT para Twilio Voice SDK (browser).
 * Usa jose (40KB) en vez de twilio SDK (60MB) para compatibilidad Deno.
 *
 * Header critico: cty: "twilio-fpa;v=1" (sin esto: error 20103)
 * Identity: agent_{user_id} (UUID sin guiones, max 121 chars, [a-zA-Z0-9_])
 *
 * Autor: PQNC AI Platform
 * Creado: 2026-03-10
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { SignJWT } from 'https://esm.sh/jose@5.9.6'

// ============================================
// CONFIGURACION
// ============================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_API_KEY_SID = Deno.env.get('TWILIO_API_KEY_SID')!
const TWILIO_API_KEY_SECRET = Deno.env.get('TWILIO_API_KEY_SECRET')!
const TWILIO_TWIML_APP_SID = Deno.env.get('TWILIO_TWIML_APP_SID')!

const TTL_SECONDS = 3600 // 1 hora

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ============================================
// HELPERS
// ============================================

/** Sanitiza identity: solo [a-zA-Z0-9_], max 121 chars */
function sanitizeIdentity(raw: string): string {
  return raw
    .replace(/-/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .substring(0, 121)
}

/** Genera Access Token JWT compatible con Twilio Voice SDK */
async function generateAccessToken(identity: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const secret = new TextEncoder().encode(TWILIO_API_KEY_SECRET)

  const grants: Record<string, unknown> = {
    identity,
    voice: {
      incoming: { allow: true },
      outgoing: { application_sid: TWILIO_TWIML_APP_SID },
    },
  }

  return await new SignJWT({ grants })
    .setProtectedHeader({
      typ: 'JWT',
      alg: 'HS256',
      cty: 'twilio-fpa;v=1', // CRITICO: sin esto Twilio rechaza con error 20103
    })
    .setJti(`${TWILIO_API_KEY_SID}-${now}`)
    .setIssuer(TWILIO_API_KEY_SID)
    .setSubject(TWILIO_ACCOUNT_SID)
    .setIssuedAt(now)
    .setExpirationTime(now + TTL_SECONDS)
    .sign(secret)
}

// ============================================
// HANDLER
// ============================================

serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Verificar auth via Supabase JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Construir identity desde auth user
    const identity = sanitizeIdentity(`agent_${user.id}`)
    if (!identity || identity.length < 5) {
      return new Response(
        JSON.stringify({ error: 'Invalid identity generated' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar que las credenciales Twilio estan configuradas
    if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY_SID || !TWILIO_API_KEY_SECRET || !TWILIO_TWIML_APP_SID) {
      console.error('Missing Twilio credentials in environment')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generar token
    const token = await generateAccessToken(identity)
    const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000).toISOString()

    return new Response(
      JSON.stringify({ token, identity, ttl: TTL_SECONDS, expiresAt }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Token generation error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
