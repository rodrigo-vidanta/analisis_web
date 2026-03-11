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

// ============================================
// CONSTANTES
// ============================================

const SUPABASE_URL = import.meta.env.VITE_ANALYSIS_SUPABASE_URL || 'https://glsmifhkoaifvaegsozd.supabase.co';
const TRANSFER_ENDPOINT = `${SUPABASE_URL}/functions/v1/voice-transfer`;
const LOG_PREFIX = '[VoiceTransfer]';

// ============================================
// SERVICIO
// ============================================

class VoiceTransferService {
  /**
   * Obtiene miembros online del equipo en las coordinaciones dadas.
   * Usa RPC get_online_team_members (SECURITY DEFINER).
   */
  async getOnlineTeamMembers(coordinacionIds: string[]): Promise<TeamMember[]> {
    if (!coordinacionIds.length) return [];

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
      const { data: { session } } = await supabaseSystemUI.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: 'No hay sesion activa' };
      }

      const response = await fetch(TRANSFER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify(params),
      });

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
      };
    } catch (err) {
      console.error(`${LOG_PREFIX} Transfer error:`, err);
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
