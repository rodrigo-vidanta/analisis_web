/**
 * ============================================
 * SERVICIO: VOICE TRANSFER (TEAM)
 * ============================================
 *
 * Maneja transferencias de llamadas Voice entre miembros
 * del equipo dentro de la misma coordinacion.
 *
 * Funcionalidades:
 * - Obtener miembros online del equipo (RPC)
 * - Transferir llamada via Edge Function voice-transfer
 * - Suscribirse a cambios en voice_transfers via Realtime
 */

import { supabaseSystemUI } from '../config/supabaseSystemUI';
import { analysisSupabase } from '../config/analysisSupabase';

// ============================================
// TIPOS
// ============================================

export interface TeamMember {
  user_id: string;
  full_name: string;
  role_name: string;
  coordinacion_ids: string[];
}

export interface TransferCallParams {
  parentCallSid: string;
  targetUserId: string;
  coordinacionId: string;
  llamadaCallId: string;
  prospectoId: string;
  prospectoNombre?: string;
  fromNumber?: string;
  tipoLlamada?: string;
}

export interface TransferResult {
  success: boolean;
  transferId?: string;
  targetIdentity?: string;
  targetName?: string;
  error?: string;
  // Warm transfer conference data
  conferenceName?: string;
  conferenceSid?: string;
  prospectoParticipantSid?: string;
}

export interface VoiceTransferRecord {
  id: string;
  llamada_call_id: string;
  parent_call_sid: string;
  prospecto_id: string;
  coordinacion_id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  prospecto_nombre: string | null;
  from_user_name: string | null;
  to_user_name: string | null;
  tipo_llamada: string | null;
  from_number: string | null;
  created_at: string;
  connected_at: string | null;
  completed_at: string | null;
}

export interface WarmTransferData {
  conferenceName: string;
  conferenceSid: string;
  prospectoParticipantSid: string;
  transferId: string;
  targetName: string;
}

// ============================================
// CONSTANTES
// ============================================

const SUPABASE_URL = import.meta.env.VITE_ANALYSIS_SUPABASE_URL || 'https://glsmifhkoaifvaegsozd.supabase.co';
const TRANSFER_ENDPOINT = `${SUPABASE_URL}/functions/v1/voice-transfer`;
const TRANSFER_COMPLETE_ENDPOINT = `${SUPABASE_URL}/functions/v1/voice-transfer-complete`;
const LOG_PREFIX = '[VoiceTransfer]';

// ============================================
// SERVICIO
// ============================================

class VoiceTransferService {
  /**
   * Helper: fetch con retry automatico en 401 (token expirado).
   * Refresca la sesion Supabase y reintenta una vez.
   */
  private async fetchWithAuthRetry(url: string, options: RequestInit): Promise<Response> {
    let response = await fetch(url, options);

    if (response.status === 401) {
      console.warn(`${LOG_PREFIX} Token expired, refreshing session...`);
      const { data: { session: refreshed } } = await supabaseSystemUI.auth.refreshSession();
      if (refreshed?.access_token) {
        const headers = { ...(options.headers as Record<string, string>), 'Authorization': `Bearer ${refreshed.access_token}` };
        response = await fetch(url, { ...options, headers });
      }
    }

    return response;
  }

  /**
   * Obtiene miembros online del equipo en las coordinaciones dadas.
   * Usa RPC get_online_team_members (SECURITY DEFINER).
   */
  async getOnlineTeamMembers(coordinacionIds: string[]): Promise<TeamMember[]> {
    // Admin puede tener 0 coordinaciones — el RPC detecta admin y retorna todos
    const { data, error } = await analysisSupabase
      .rpc('get_online_team_members', { p_coordinacion_ids: coordinacionIds });

    if (error) {
      console.error(`${LOG_PREFIX} Error fetching online team members:`, error);
      return [];
    }

    return (data ?? []) as TeamMember[];
  }

  /**
   * Transfiere una llamada activa a otro miembro del equipo.
   * Llama al Edge Function voice-transfer que redirige el parentCallSid.
   */
  async transferCall(params: TransferCallParams): Promise<TransferResult> {
    try {
      let { data: { session } } = await supabaseSystemUI.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: 'No hay sesion activa' };
      }

      const makeRequest = (accessToken: string) =>
        fetch(TRANSFER_ENDPOINT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify(params),
        });

      let response = await makeRequest(session.access_token);

      // Si 401, token posiblemente expirado — refrescar y reintentar
      if (response.status === 401) {
        console.warn(`${LOG_PREFIX} Token expired, refreshing session...`);
        const { data: { session: refreshed } } = await supabaseSystemUI.auth.refreshSession();
        if (refreshed?.access_token) {
          response = await makeRequest(refreshed.access_token);
        } else {
          return { success: false, error: 'Sesion expirada, recarga la pagina' };
        }
      }

      const result = await response.json();

      if (!response.ok) {
        console.error(`${LOG_PREFIX} Transfer failed:`, result);
        return { success: false, error: result.error || 'Error al transferir' };
      }

      console.log(`${LOG_PREFIX} Transfer initiated:`, result);
      return {
        success: true,
        transferId: result.transferId,
        targetIdentity: result.targetIdentity,
        targetName: result.targetName,
        conferenceName: result.conferenceName,
        conferenceSid: result.conferenceSid,
        prospectoParticipantSid: result.prospectoParticipantSid,
      };
    } catch (err) {
      console.error(`${LOG_PREFIX} Transfer error:`, err);
      return { success: false, error: 'Error de conexion' };
    }
  }

  /**
   * Actualiza el status de un transfer por parentCallSid + toUserId.
   * Usado cuando el destino acepta o la llamada termina.
   */
  async updateTransferStatus(
    parentCallSid: string,
    toUserId: string,
    status: 'connected' | 'completed' | 'failed' | 'rejected' | 'timeout',
    extraFields?: { connected_at?: string; completed_at?: string }
  ): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = { status };
      if (extraFields?.connected_at) updateData.connected_at = extraFields.connected_at;
      if (extraFields?.completed_at) updateData.completed_at = extraFields.completed_at;

      const previousStatuses = status === 'connected' ? ['ringing'] : ['ringing', 'connected'];
      const { error } = await analysisSupabase
        .from('voice_transfers')
        .update(updateData)
        .eq('parent_call_sid', parentCallSid)
        .eq('to_user_id', toUserId)
        .in('status', previousStatuses);

      if (error) {
        console.error(`${LOG_PREFIX} Error updating transfer status:`, error);
        return false;
      }

      console.log(`${LOG_PREFIX} Transfer status updated to ${status}`);
      return true;
    } catch (err) {
      console.error(`${LOG_PREFIX} Error updating transfer status:`, err);
      return false;
    }
  }

  /**
   * Completa un warm transfer: desactiva hold del prospecto para que hable con el target.
   * El caller puede colgar despues de completar.
   */
  async completeTransfer(params: {
    conferenceSid: string;
    prospectoParticipantSid: string;
    transferId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { session } } = await supabaseSystemUI.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: 'No hay sesion activa' };
      }

      const response = await this.fetchWithAuthRetry(TRANSFER_COMPLETE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({
          conferenceSid: params.conferenceSid,
          prospectoParticipantSid: params.prospectoParticipantSid,
          action: 'complete',
          transferId: params.transferId,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error(`${LOG_PREFIX} Complete transfer failed:`, result);
        return { success: false, error: result.error || 'Error al completar transferencia' };
      }

      console.log(`${LOG_PREFIX} Transfer completed successfully`);
      return { success: true };
    } catch (err) {
      console.error(`${LOG_PREFIX} Complete transfer error:`, err);
      return { success: false, error: 'Error de conexion' };
    }
  }

  /**
   * Cancela un warm transfer: remueve al target de la conferencia y reconecta al prospecto.
   */
  async cancelTransfer(params: {
    conferenceSid: string;
    prospectoParticipantSid: string;
    transferId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { session } } = await supabaseSystemUI.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: 'No hay sesion activa' };
      }

      const response = await this.fetchWithAuthRetry(TRANSFER_COMPLETE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({
          conferenceSid: params.conferenceSid,
          prospectoParticipantSid: params.prospectoParticipantSid,
          action: 'cancel',
          transferId: params.transferId,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error(`${LOG_PREFIX} Cancel transfer failed:`, result);
        return { success: false, error: result.error || 'Error al cancelar transferencia' };
      }

      console.log(`${LOG_PREFIX} Transfer cancelled successfully`);
      return { success: true };
    } catch (err) {
      console.error(`${LOG_PREFIX} Cancel transfer error:`, err);
      return { success: false, error: 'Error de conexion' };
    }
  }

  /**
   * Suscribe a cambios en voice_transfers para un usuario.
   * Usa Supabase Realtime para recibir notificaciones de transferencias.
   * Retorna funcion de cleanup.
   */
  subscribeToTransfers(
    userId: string,
    callback: (transfer: VoiceTransferRecord) => void
  ): () => void {
    const channel = analysisSupabase
      .channel(`voice_transfers_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'voice_transfers',
          filter: `to_user_id=eq.${userId}`,
        },
        (payload) => {
          const transfer = payload.new as VoiceTransferRecord;
          console.log(`${LOG_PREFIX} Incoming transfer notification:`, transfer);
          callback(transfer);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'voice_transfers',
          filter: `from_user_id=eq.${userId}`,
        },
        (payload) => {
          const transfer = payload.new as VoiceTransferRecord;
          console.log(`${LOG_PREFIX} Transfer status update:`, transfer.status);
          callback(transfer);
        }
      )
      .subscribe();

    return () => {
      analysisSupabase.removeChannel(channel);
    };
  }
}

// ============================================
// SINGLETON
// ============================================

export const voiceTransferService = new VoiceTransferService();
