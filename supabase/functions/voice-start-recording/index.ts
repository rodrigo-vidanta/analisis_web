/**
 * ============================================
 * EDGE FUNCTION: VOICE START RECORDING
 * ============================================
 *
 * Inicia grabacion en una llamada Twilio activa via REST API.
 * Llamada por el frontend cuando el ejecutivo acepta una llamada entrante.
 *
 * Flujo:
 * 1. Auth via Supabase JWT
 * 2. Recibe parentCallSid del body
 * 3. Llama POST /Calls/{sid}/Recordings.json en Twilio REST API
 * 4. Retorna recordingSid
 *
 * Autor: PQNC AI Platform
 * Creado: 2026-03-11
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// ============================================
// CONFIGURACION
// ============================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_API_KEY_SID = Deno.env.get('TWILIO_API_KEY_SID')!
const TWILIO_API_KEY_SECRET = Deno.env.get('TWILIO_API_KEY_SECRET')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const twilioAuth = () => btoa(`${TWILIO_API_KEY_SID}:${TWILIO_API_KEY_SECRET}`)
const twilioBase = () => `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}`

// ============================================
// HANDLER
// ============================================

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    // 1. Auth via Supabase JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401)
    }

    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await userSupabase.auth.getUser(jwt)
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    // 2. Parse body
    const body = await req.json()
    const { parentCallSid } = body as { parentCallSid: string }

    if (!parentCallSid) {
      return jsonResponse({ error: 'Missing parentCallSid' }, 400)
    }

    console.log(`[voice-start-recording] Starting recording for ${parentCallSid} (user: ${user.id})`)

    // 3. Iniciar grabacion via Twilio REST API
    const recordingResp = await fetch(`${twilioBase()}/Calls/${parentCallSid}/Recordings.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        RecordingChannels: 'dual',
      }).toString(),
    })

    const recordingBody = await recordingResp.text()

    if (!recordingResp.ok) {
      console.warn(`[voice-start-recording] Twilio error: ${recordingResp.status} — ${recordingBody}`)
      // No fallar — la llamada sigue aunque no se grabe
      return jsonResponse({
        success: false,
        error: `Twilio recording error: ${recordingResp.status}`,
        details: recordingBody,
      })
    }

    const recording = JSON.parse(recordingBody)
    console.log(`[voice-start-recording] ✅ Recording started: ${recording.sid}`)

    return jsonResponse({
      success: true,
      recordingSid: recording.sid,
      callSid: parentCallSid,
    })
  } catch (error) {
    console.error('[voice-start-recording] Error:', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
