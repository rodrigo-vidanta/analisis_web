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
 */
async function holdProspectoInConference(conferenceName: string, maxAttempts = 15): Promise<{ conferenceSid: string; participantSid: string } | null> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 500))

    // Buscar conferencia activa
    const confResp = await twilioGet(`/Conferences.json?FriendlyName=${encodeURIComponent(conferenceName)}&Status=in-progress&Limit=1`)
    if (!confResp.ok) continue
    const confData = await confResp.json()
    if (!confData.conferences?.length) continue

    const conferenceSid = confData.conferences[0].sid

    // Listar participantes
    const partResp = await twilioGet(`/Conferences/${conferenceSid}/Participants.json`)
    if (!partResp.ok) continue
    const partData = await partResp.json()
    if (!partData.participants?.length) continue

    const participant = partData.participants[0]
    const participantSid = participant.call_sid

    // Poner en hold
    const holdResp = await twilioPost(`/Conferences/${conferenceSid}/Participants/${participantSid}.json`, {
      Hold: 'true',
      HoldUrl: 'http://twimlets.com/holdmusic?Bucket=com.twilio.music.ambient',
    })

    if (holdResp.ok) {
      console.log(`Prospecto held in conference ${conferenceName} (participant: ${participantSid})`)
      return { conferenceSid, participantSid }
    }
  }

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

    // 9. Redirigir parentCallSid a conferencia
    // startConferenceOnEnter=true para que la conferencia se cree inmediatamente
    const prospectoTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference startConferenceOnEnter="true" endConferenceOnExit="true" beep="false" waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.ambient">${conferenceName}</Conference>
  </Dial>
</Response>`

    const redirectResp = await twilioPost(`/Calls/${parentCallSid}.json`, { Twiml: prospectoTwiml })
    if (!redirectResp.ok) {
      const errText = await redirectResp.text()
      console.error('Twilio redirect error:', redirectResp.status, errText)
      return jsonResponse({ error: 'Error al redirigir llamada a conferencia', details: errText }, 502)
    }

    // 10. Esperar a que el prospecto entre y ponerlo en hold
    const holdResult = await holdProspectoInConference(conferenceName)
    if (!holdResult) {
      console.error('Failed to hold prospecto in conference')
      return jsonResponse({ error: 'No se pudo establecer la conferencia' }, 502)
    }

    const { conferenceSid, participantSid: prospectoParticipantSid } = holdResult

    // 11. Dial caller de vuelta a la conferencia
    const callerTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference startConferenceOnEnter="true" endConferenceOnExit="false" beep="false">${conferenceName}</Conference>
  </Dial>
</Response>`

    const callerDialResp = await twilioPost('/Calls.json', {
      To: `client:${callerIdentity}`,
      From: TWILIO_ACCOUNT_SID,
      Twiml: callerTwiml,
    })

    if (!callerDialResp.ok) {
      const errText = await callerDialResp.text()
      console.error('Failed to dial caller back:', errText)
      // No es fatal — el caller puede reconectarse manualmente
    }

    // 12. Dial target a la conferencia
    const targetTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference startConferenceOnEnter="true" endConferenceOnExit="false" beep="false">${conferenceName}</Conference>
  </Dial>
</Response>`

    const targetDialResp = await twilioPost('/Calls.json', {
      To: `client:${targetIdentity}`,
      From: TWILIO_ACCOUNT_SID,
      Twiml: targetTwiml,
    })

    if (!targetDialResp.ok) {
      const errText = await targetDialResp.text()
      console.error('Failed to dial target:', errText)
      return jsonResponse({ error: 'Error al conectar al destino', details: errText }, 502)
    }

    // 13. Insertar registro en voice_transfers
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
