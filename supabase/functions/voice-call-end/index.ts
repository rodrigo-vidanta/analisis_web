/**
 * ============================================
 * EDGE FUNCTION: VOICE CALL END
 * ============================================
 *
 * Llamada por el frontend cuando una llamada Voice SDK termina.
 * Obtiene la grabacion de Twilio y envia datos al webhook N8N.
 *
 * Flujo:
 * 1. Auth via Supabase JWT
 * 2. Obtiene datos del prospecto (id_dynamics) y llamada (ejecutivo_id, timestamps)
 * 3. Busca grabacion en Twilio REST API (con retry)
 * 4. Envia todo al webhook N8N
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
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_API_KEY_SID = Deno.env.get('TWILIO_API_KEY_SID')!
const TWILIO_API_KEY_SECRET = Deno.env.get('TWILIO_API_KEY_SECRET')!
const LIVECHAT_AUTH = Deno.env.get('LIVECHAT_AUTH')!

const WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/end-call-whatsapp'

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

async function twilioGet(path: string): Promise<Response> {
  return fetch(`${twilioBase()}${path}`, {
    headers: { 'Authorization': `Basic ${twilioAuth()}` },
  })
}

/**
 * Busca grabacion de Twilio para un CallSid.
 * Retry con delay porque la grabacion puede tardar unos segundos en procesarse.
 */
async function getRecordingUrl(callSid: string, maxAttempts = 4, delayMs = 3000): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) {
      await new Promise(r => setTimeout(r, delayMs))
    }

    console.log(`[voice-call-end] Recording attempt ${i + 1}/${maxAttempts} for ${callSid}`)

    const resp = await twilioGet(`/Calls/${callSid}/Recordings.json?Limit=1`)
    if (!resp.ok) {
      console.log(`[voice-call-end] Recordings API failed: ${resp.status}`)
      continue
    }

    const data = await resp.json()
    if (data.recordings?.length > 0) {
      const rec = data.recordings[0]
      // URL directa al MP3 de la grabacion
      const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Recordings/${rec.sid}.mp3`
      console.log(`[voice-call-end] ✅ Recording found: ${rec.sid} (${rec.duration}s)`)
      return recordingUrl
    }

    console.log(`[voice-call-end] No recordings yet`)
  }

  console.log(`[voice-call-end] No recording found after ${maxAttempts} attempts`)
  return null
}

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
    const {
      parentCallSid,
      prospectoId,
      llamadaId,
      callStartedAt,
      callEndedAt,
    } = body as {
      parentCallSid: string
      prospectoId: string
      llamadaId: string
      callStartedAt: string
      callEndedAt: string
    }

    if (!prospectoId) {
      return jsonResponse({ error: 'Missing prospectoId' }, 400)
    }

    console.log(`[voice-call-end] Processing call end — prospecto: ${prospectoId}, llamada: ${llamadaId}, parentCallSid: ${parentCallSid}`)

    // 3. Service role client
    const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // 4. Obtener datos del prospecto
    const { data: prospecto } = await serviceSupabase
      .from('prospectos')
      .select('id, id_dynamics, ejecutivo_id')
      .eq('id', prospectoId)
      .single()

    if (!prospecto) {
      console.warn(`[voice-call-end] Prospecto not found: ${prospectoId}`)
      return jsonResponse({ error: 'Prospecto not found' }, 404)
    }

    // 5. Obtener timestamps de llamada desde BD si no vienen del frontend
    let timestampInicio = callStartedAt || null
    let timestampFin = callEndedAt || new Date().toISOString()

    if (llamadaId && !timestampInicio) {
      const { data: llamada } = await serviceSupabase
        .from('llamadas_ventas')
        .select('fecha_llamada, ended_at')
        .eq('call_id', llamadaId)
        .single()

      if (llamada) {
        timestampInicio = llamada.fecha_llamada
        if (llamada.ended_at) {
          timestampFin = llamada.ended_at
        }
      }
    }

    // 6. Buscar grabacion en Twilio
    let recordingUrl: string | null = null

    if (parentCallSid) {
      recordingUrl = await getRecordingUrl(parentCallSid)
    }

    // NOTA: No usar fallback VAPI (audio_ruta_bucket) — queremos solo la grabacion
    // de la llamada ejecutivo↔prospecto, no la conversacion con la IA.

    // 7. Enviar al webhook N8N
    const webhookPayload = {
      recording_url: recordingUrl,
      prospecto_id: prospectoId,
      ejecutivo_id: prospecto.ejecutivo_id ?? user.id,
      id_dynamics: prospecto.id_dynamics ?? null,
      timestamp_inicio: timestampInicio,
      timestamp_fin: timestampFin,
      call_sid: parentCallSid ?? null,
      llamada_id: llamadaId ?? null,
    }

    console.log(`[voice-call-end] Sending to webhook:`, JSON.stringify(webhookPayload))

    let webhookStatus = 0
    try {
      const webhookResp = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          '2025_livechat_auth': LIVECHAT_AUTH,
        },
        body: JSON.stringify(webhookPayload),
      })

      webhookStatus = webhookResp.status
      let webhookBody = ''
      try {
        webhookBody = await webhookResp.text()
      } catch {
        // ignore
      }

      console.log(`[voice-call-end] Webhook response: ${webhookStatus} — ${webhookBody.substring(0, 200)}`)

      if (!webhookResp.ok) {
        console.warn(`[voice-call-end] ⚠️ Webhook returned ${webhookStatus} — continuing anyway`)
      }
    } catch (webhookErr) {
      console.warn(`[voice-call-end] ⚠️ Webhook unreachable — continuing anyway:`, webhookErr)
    }

    console.log(`[voice-call-end] ✅ Call end processed`)

    return jsonResponse({
      success: true,
      recordingUrl,
      webhookStatus,
    })
  } catch (error) {
    console.error('[voice-call-end] Error:', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
