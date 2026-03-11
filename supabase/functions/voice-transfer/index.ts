/**
 * ============================================
 * EDGE FUNCTION: VOICE TRANSFER (WARM)
 * ============================================
 *
 * Warm transfer: crea una conferencia Twilio donde el caller
 * puede briefear al target antes de completar la transferencia.
 *
 * Flujo:
 * 1. Redirect parentCallSid a conference (prospecto entra)
 * 2. Hold al prospecto (no escucha el briefing)
 * 3. Dial caller de vuelta a conference
 * 4. Dial target a conference
 * 5. Caller y target se briefean
 * 6. Caller llama voice-transfer-complete → unhold prospecto → caller cuelga
 *
 * Validaciones:
 * - JWT auth del caller
 * - Caller Y target pertenecen a la misma coordinacion
 * - Target esta online (active_sessions)
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

function sanitizeIdentity(raw: string): string {
  return raw.replace(/-/g, '_').replace(/[^a-zA-Z0-9_]/g, '').substring(0, 121)
}

const twilioAuth = () => btoa(`${TWILIO_API_KEY_SID}:${TWILIO_API_KEY_SECRET}`)
const twilioBase = () => `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}`

async function twilioPost(path: string, params: Record<string, string>): Promise<Response> {
  return fetch(`${twilioBase()}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${twilioAuth()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  })
}

async function twilioGet(path: string): Promise<Response> {
  return fetch(`${twilioBase()}${path}`, {
    headers: { 'Authorization': `Basic ${twilioAuth()}` },
  })
}

/**
 * Espera a que el prospecto entre a la conferencia y lo pone en hold.
 * Retorna el participant SID o null si timeout.
 * Polling: 30 intentos x 1s = 30s max (WhatsApp calls tardan mas en procesar TwiML)
 */
async function holdProspectoInConference(conferenceName: string, maxAttempts = 30): Promise<{ conferenceSid: string; participantSid: string } | null> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 1000))

    console.log(`[holdProspecto] Attempt ${i + 1}/${maxAttempts} — conference: ${conferenceName}`)

    // Buscar conferencia activa
    const confResp = await twilioGet(`/Conferences.json?FriendlyName=${encodeURIComponent(conferenceName)}&Status=in-progress&Limit=1`)
    if (!confResp.ok) {
      console.log(`[holdProspecto] Conference list failed: ${confResp.status}`)
      continue
    }
    const confData = await confResp.json()
    if (!confData.conferences?.length) {
      // Tambien buscar conferencias "init" (aun no in-progress)
      const initResp = await twilioGet(`/Conferences.json?FriendlyName=${encodeURIComponent(conferenceName)}&Status=init&Limit=1`)
      if (initResp.ok) {
        const initData = await initResp.json()
        if (initData.conferences?.length) {
          console.log(`[holdProspecto] Conference found in 'init' status, waiting for in-progress...`)
        } else {
          console.log(`[holdProspecto] No conference found yet (neither in-progress nor init)`)
        }
      }
      continue
    }

    const conferenceSid = confData.conferences[0].sid
    console.log(`[holdProspecto] Conference in-progress: ${conferenceSid}`)

    // Listar participantes
    const partResp = await twilioGet(`/Conferences/${conferenceSid}/Participants.json`)
    if (!partResp.ok) {
      console.log(`[holdProspecto] Participants list failed: ${partResp.status}`)
      continue
    }
    const partData = await partResp.json()
    if (!partData.participants?.length) {
      console.log(`[holdProspecto] Conference exists but no participants yet`)
      continue
    }

    const participant = partData.participants[0]
    const participantSid = participant.call_sid
    console.log(`[holdProspecto] Participant found: ${participantSid} (status: ${participant.status})`)

    // Poner en hold (sin HoldUrl — Twilio usa musica por defecto)
    const holdResp = await twilioPost(`/Conferences/${conferenceSid}/Participants/${participantSid}.json`, {
      Hold: 'true',
    })

    if (holdResp.ok) {
      console.log(`[holdProspecto] ✅ Prospecto held successfully (participant: ${participantSid})`)
      return { conferenceSid, participantSid }
    }

    const holdErr = await holdResp.text()
    console.log(`[holdProspecto] Hold failed: ${holdResp.status} — ${holdErr}`)
  }

  console.error(`[holdProspecto] ❌ Timeout after ${maxAttempts}s — conference never established`)
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
      targetUserId,
      coordinacionId,
      llamadaCallId,
      prospectoId,
      prospectoNombre,
      fromNumber,
      tipoLlamada,
    } = body as {
      parentCallSid: string
      targetUserId: string
      coordinacionId: string
      llamadaCallId: string
      prospectoId: string
      prospectoNombre?: string
      fromNumber?: string
      tipoLlamada?: string
    }

    if (!parentCallSid || !targetUserId || !coordinacionId || !llamadaCallId || !prospectoId) {
      return jsonResponse({ error: 'Missing required fields' }, 400)
    }

    // 3. Service role client
    const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // 4. Verificar CALLER en coordinacion
    const { data: callerCoord, error: callerErr } = await serviceSupabase
      .from('auth_user_coordinaciones')
      .select('id')
      .eq('user_id', user.id)
      .eq('coordinacion_id', coordinacionId)
      .maybeSingle()

    if (callerErr || !callerCoord) {
      return jsonResponse({ error: 'No tienes permiso para transferir en esta coordinacion' }, 403)
    }

    // 5. Verificar TARGET en coordinacion
    const { data: targetCoord, error: targetErr } = await serviceSupabase
      .from('auth_user_coordinaciones')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('coordinacion_id', coordinacionId)
      .maybeSingle()

    if (targetErr || !targetCoord) {
      return jsonResponse({ error: 'El usuario destino no pertenece a esta coordinacion' }, 403)
    }

    // 6. Verificar TARGET online
    const { data: targetSession } = await serviceSupabase
      .from('active_sessions')
      .select('user_id')
      .eq('user_id', targetUserId)
      .gt('last_activity', new Date(Date.now() - 2 * 60 * 1000).toISOString())
      .maybeSingle()

    if (!targetSession) {
      return jsonResponse({ error: 'El usuario destino no esta conectado' }, 409)
    }

    // 7. Obtener nombres
    const { data: callerProfile } = await serviceSupabase
      .from('user_profiles_v2')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const { data: targetProfile } = await serviceSupabase
      .from('user_profiles_v2')
      .select('full_name')
      .eq('id', targetUserId)
      .single()

    const callerName = callerProfile?.full_name ?? 'Unknown'
    const targetName = targetProfile?.full_name ?? 'Unknown'

    // 8. Crear nombre unico de conferencia
    const conferenceName = `warm_transfer_${crypto.randomUUID().substring(0, 8)}`
    const callerIdentity = sanitizeIdentity(`agent_${user.id}`)
    const targetIdentity = sanitizeIdentity(`agent_${targetUserId}`)

    console.log(`[transfer] Caller: ${callerName} (${callerIdentity}) → Target: ${targetName} (${targetIdentity})`)
    console.log(`[transfer] parentCallSid: ${parentCallSid} | conference: ${conferenceName}`)

    // 9. Verificar estado de la llamada antes de redirigir
    const callStatusResp = await twilioGet(`/Calls/${parentCallSid}.json`)
    if (callStatusResp.ok) {
      const callData = await callStatusResp.json()
      console.log(`[transfer] Call status BEFORE redirect: ${callData.status} | direction: ${callData.direction} | to: ${callData.to}`)
      if (callData.status !== 'in-progress') {
        return jsonResponse({
          error: `La llamada no esta activa (status: ${callData.status})`,
          callStatus: callData.status,
        }, 409)
      }
    } else {
      const errText = await callStatusResp.text()
      console.warn(`[transfer] Could not check call status: ${callStatusResp.status} — ${errText}`)
    }

    // 10. Redirigir parentCallSid a conferencia
    // Sin waitUrl — Twilio usa musica de espera por defecto
    const prospectoTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference startConferenceOnEnter="true" endConferenceOnExit="true" beep="false">${conferenceName}</Conference>
  </Dial>
</Response>`

    const redirectResp = await twilioPost(`/Calls/${parentCallSid}.json`, { Twiml: prospectoTwiml })
    const redirectBody = await redirectResp.text()
    console.log(`[transfer] Redirect response: ${redirectResp.status} — ${redirectBody.substring(0, 300)}`)

    if (!redirectResp.ok) {
      console.error('[transfer] Twilio redirect error:', redirectResp.status, redirectBody)
      return jsonResponse({ error: 'Error al redirigir llamada a conferencia', details: redirectBody }, 502)
    }

    // Verificar estado DESPUES del redirect (dar 1s para que Twilio procese)
    await new Promise(r => setTimeout(r, 1000))
    const postRedirectResp = await twilioGet(`/Calls/${parentCallSid}.json`)
    if (postRedirectResp.ok) {
      const postData = await postRedirectResp.json()
      console.log(`[transfer] Call status AFTER redirect: ${postData.status}`)
    }

    // 11. Esperar a que el prospecto entre y ponerlo en hold
    const holdResult = await holdProspectoInConference(conferenceName)
    if (!holdResult) {
      // Log estado final de la llamada para diagnostico
      const finalCallResp = await twilioGet(`/Calls/${parentCallSid}.json`)
      if (finalCallResp.ok) {
        const finalData = await finalCallResp.json()
        console.error(`[transfer] ❌ Conference failed. Final call status: ${finalData.status}`)
      }
      return jsonResponse({ error: 'No se pudo establecer la conferencia (timeout 30s)' }, 502)
    }

    const { conferenceSid, participantSid: prospectoParticipantSid } = holdResult
    console.log(`[transfer] ✅ Conference established: ${conferenceSid} | prospecto held: ${prospectoParticipantSid}`)

    // 12. Dial caller de vuelta a la conferencia
    const callerTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference startConferenceOnEnter="true" endConferenceOnExit="false" beep="false">${conferenceName}</Conference>
  </Dial>
</Response>`

    const callerDialResp = await twilioPost('/Calls.json', {
      To: `client:${callerIdentity}`,
      From: `client:warm_transfer`,
      Twiml: callerTwiml,
    })

    if (!callerDialResp.ok) {
      const errText = await callerDialResp.text()
      console.error(`[transfer] Failed to dial caller back (${callerIdentity}):`, errText)
      // No es fatal — el caller puede reconectarse manualmente
    } else {
      const callerCallData = await callerDialResp.json()
      console.log(`[transfer] Caller dialed back: ${callerCallData.sid}`)
    }

    // 13. Dial target a la conferencia
    const targetTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference startConferenceOnEnter="true" endConferenceOnExit="false" beep="false">${conferenceName}</Conference>
  </Dial>
</Response>`

    const targetDialResp = await twilioPost('/Calls.json', {
      To: `client:${targetIdentity}`,
      From: `client:warm_transfer`,
      Twiml: targetTwiml,
    })

    if (!targetDialResp.ok) {
      const errText = await targetDialResp.text()
      console.error(`[transfer] Failed to dial target (${targetIdentity}):`, errText)
      return jsonResponse({ error: 'Error al conectar al destino', details: errText }, 502)
    } else {
      const targetCallData = await targetDialResp.json()
      console.log(`[transfer] Target dialed: ${targetCallData.sid}`)
    }

    // 14. Insertar registro en voice_transfers
    const { data: transfer } = await serviceSupabase
      .from('voice_transfers')
      .insert({
        llamada_call_id: llamadaCallId,
        parent_call_sid: parentCallSid,
        prospecto_id: prospectoId,
        coordinacion_id: coordinacionId,
        from_user_id: user.id,
        to_user_id: targetUserId,
        status: 'ringing',
        prospecto_nombre: prospectoNombre ?? null,
        from_user_name: callerName,
        to_user_name: targetName,
        tipo_llamada: tipoLlamada ?? 'transfer',
        from_number: fromNumber ?? null,
      })
      .select('id')
      .single()

    console.log(`Warm transfer: ${callerName} -> ${targetName} | conf=${conferenceName}`)

    return jsonResponse({
      success: true,
      transferId: transfer?.id ?? null,
      targetIdentity,
      targetName,
      conferenceName,
      conferenceSid,
      prospectoParticipantSid,
    })
  } catch (error) {
    console.error('Voice transfer error:', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
