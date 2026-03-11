/**
 * ============================================
 * EDGE FUNCTION: VOICE TRANSFER COMPLETE
 * ============================================
 *
 * Completa o cancela una warm transfer:
 * - action=complete: Unhold prospecto, caller puede colgar
 * - action=cancel: Remueve target de conferencia, unhold prospecto para reconectar con caller
 *
 * Requiere: conferenceSid, prospectoParticipantSid
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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

const twilioAuth = () => btoa(`${TWILIO_API_KEY_SID}:${TWILIO_API_KEY_SECRET}`)
const twilioBase = () => `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}`

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    // Auth
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

    const body = await req.json()
    const { conferenceSid, prospectoParticipantSid, action, transferId } = body as {
      conferenceSid: string
      prospectoParticipantSid: string
      action: 'complete' | 'cancel'
      transferId?: string
    }

    if (!conferenceSid || !prospectoParticipantSid || !action) {
      return jsonResponse({ error: 'Missing required fields: conferenceSid, prospectoParticipantSid, action' }, 400)
    }

    const headers = {
      'Authorization': `Basic ${twilioAuth()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    }

    if (action === 'complete') {
      // Unhold prospecto — ahora habla con el target
      const unholdResp = await fetch(
        `${twilioBase()}/Conferences/${conferenceSid}/Participants/${prospectoParticipantSid}.json`,
        {
          method: 'POST',
          headers,
          body: new URLSearchParams({ Hold: 'false' }).toString(),
        }
      )

      if (!unholdResp.ok) {
        const errText = await unholdResp.text()
        console.error('Unhold error:', errText)
        return jsonResponse({ error: 'Error al conectar prospecto', details: errText }, 502)
      }

      // Actualizar voice_transfers status
      if (transferId) {
        const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
        await serviceSupabase
          .from('voice_transfers')
          .update({ status: 'connected', connected_at: new Date().toISOString() })
          .eq('id', transferId)
      }

      console.log(`Transfer complete: prospecto unholded in conference ${conferenceSid}`)
      return jsonResponse({ success: true, action: 'complete' })

    } else if (action === 'cancel') {
      // Listar participantes para encontrar el target
      const partResp = await fetch(
        `${twilioBase()}/Conferences/${conferenceSid}/Participants.json`,
        { headers: { 'Authorization': `Basic ${twilioAuth()}` } }
      )

      if (partResp.ok) {
        const partData = await partResp.json()
        // Remover todos excepto el prospecto
        for (const p of partData.participants || []) {
          if (p.call_sid !== prospectoParticipantSid) {
            await fetch(
              `${twilioBase()}/Conferences/${conferenceSid}/Participants/${p.call_sid}.json`,
              { method: 'DELETE', headers: { 'Authorization': `Basic ${twilioAuth()}` } }
            )
          }
        }
      }

      // Unhold prospecto (queda solo, eventual timeout o reconnect)
      await fetch(
        `${twilioBase()}/Conferences/${conferenceSid}/Participants/${prospectoParticipantSid}.json`,
        {
          method: 'POST',
          headers,
          body: new URLSearchParams({ Hold: 'false' }).toString(),
        }
      )

      // Actualizar voice_transfers status
      if (transferId) {
        const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
        await serviceSupabase
          .from('voice_transfers')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', transferId)
      }

      console.log(`Transfer cancelled in conference ${conferenceSid}`)
      return jsonResponse({ success: true, action: 'cancel' })
    }

    return jsonResponse({ error: 'Invalid action' }, 400)
  } catch (error) {
    console.error('Voice transfer complete error:', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
