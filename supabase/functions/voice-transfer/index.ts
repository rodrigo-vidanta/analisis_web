/**
 * ============================================
 * EDGE FUNCTION: VOICE TRANSFER (COLD)
 * ============================================
 *
 * Cold transfer: redirige la llamada del prospecto directamente
 * al agente destino via Twilio Client SDK en el browser.
 *
 * Flujo:
 * 1. Valida JWT y permisos (caller y target en misma coordinacion)
 * 2. Verifica target online (active_sessions)
 * 3. Redirect parentCallSid con <Dial><Client>target</Client></Dial>
 * 4. Agente actual se desconecta, target recibe incoming con datos del prospecto
 *
 * El TwiML incluye <Parameter> tags para que el Client SDK del target
 * reciba toda la info del prospecto y la transferencia.
 *
 * Autor: PQNC AI Platform
 * Creado: 2026-03-10
 * Actualizado: 2026-03-11 (cold transfer, sin conferencias)
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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
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

    // 4. Verificar rol del caller (admin bypasses coordinacion checks)
    const { data: callerRoleCheck } = await serviceSupabase
      .from('user_profiles_v2')
      .select('role_name')
      .eq('id', user.id)
      .single()

    const isAdmin = callerRoleCheck?.role_name === 'admin'

    if (!isAdmin) {
      // 4a. Verificar CALLER en coordinacion
      const { data: callerCoord, error: callerErr } = await serviceSupabase
        .from('auth_user_coordinaciones')
        .select('id')
        .eq('user_id', user.id)
        .eq('coordinacion_id', coordinacionId)
        .maybeSingle()

      if (callerErr || !callerCoord) {
        return jsonResponse({ error: 'No tienes permiso para transferir en esta coordinacion' }, 403)
      }

      // 4b. Verificar TARGET en coordinacion
      const { data: targetCoord, error: targetErr } = await serviceSupabase
        .from('auth_user_coordinaciones')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('coordinacion_id', coordinacionId)
        .maybeSingle()

      if (targetErr || !targetCoord) {
        return jsonResponse({ error: 'El usuario destino no pertenece a esta coordinacion' }, 403)
      }
    } else {
      console.log(`[transfer] Admin bypass — skipping coordinacion checks`)
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
    const callerIdentity = sanitizeIdentity(`agent_${user.id}`)
    const targetIdentity = sanitizeIdentity(`agent_${targetUserId}`)

    console.log(`[transfer] Cold transfer: ${callerName} (${callerIdentity}) → ${targetName} (${targetIdentity})`)
    console.log(`[transfer] parentCallSid: ${parentCallSid}`)

    // 8. Verificar estado de la llamada antes de redirigir
    const callStatusResp = await twilioGet(`/Calls/${parentCallSid}.json`)
    if (callStatusResp.ok) {
      const callData = await callStatusResp.json()
      console.log(`[transfer] Call status: ${callData.status} | direction: ${callData.direction} | to: ${callData.to}`)
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

    // 9. Cold transfer: redirigir parentCallSid para que timbre al target directamente
    //    El agente actual (caller) se desconectara automaticamente.
    //    El target recibe incoming call con todos los datos del prospecto via <Parameter>.
    const transferTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="client:transfer" record="record-from-answer-dual">
    <Client>
      <Identity>${targetIdentity}</Identity>
      <Parameter name="parentCallSid" value="${escapeXml(parentCallSid)}"/>
      <Parameter name="llamadaId" value="${escapeXml(llamadaCallId)}"/>
      <Parameter name="prospectoId" value="${escapeXml(prospectoId)}"/>
      <Parameter name="prospectoNombre" value="${escapeXml(prospectoNombre ?? '')}"/>
      <Parameter name="fromNumber" value="${escapeXml(fromNumber ?? '')}"/>
      <Parameter name="tipoLlamada" value="transfer"/>
      <Parameter name="coordinacionId" value="${escapeXml(coordinacionId)}"/>
      <Parameter name="transferredBy" value="${escapeXml(callerIdentity)}"/>
      <Parameter name="transferredByName" value="${escapeXml(callerName)}"/>
    </Client>
  </Dial>
</Response>`

    console.log(`[transfer] Redirecting parentCallSid to ring ${targetIdentity}`)

    const redirectResp = await twilioPost(`/Calls/${parentCallSid}.json`, { Twiml: transferTwiml })
    const redirectBody = await redirectResp.text()

    if (!redirectResp.ok) {
      console.error(`[transfer] ❌ Twilio redirect error: ${redirectResp.status} — ${redirectBody}`)
      return jsonResponse({ error: 'Error al redirigir llamada', details: redirectBody }, 502)
    }

    console.log(`[transfer] ✅ Call redirected successfully — ${targetName} should be ringing`)

    // 10. Insertar registro en voice_transfers
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

    console.log(`[transfer] Transfer record created: ${transfer?.id}`)

    return jsonResponse({
      success: true,
      transferId: transfer?.id ?? null,
      targetIdentity,
      targetName,
      transferType: 'cold',
    })
  } catch (error) {
    console.error('Voice transfer error:', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
