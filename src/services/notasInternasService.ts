/**
 * ============================================
 * SERVICIO: Notas Internas en Conversaciones
 * ============================================
 *
 * Permite a roles privilegiados (admin, coordinador,
 * supervisor, calidad) dejar notas internas en las
 * conversaciones de WhatsApp.
 *
 * Las notas NO se envian al prospecto, solo son
 * visibles dentro de la plataforma.
 */

import { analysisSupabase } from '../config/analysisSupabase';

export interface NotaInterna {
  id: string;
  prospecto_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  contenido: string;
  created_at: string;
}

class NotasInternasService {
  /**
   * Cargar notas internas de un prospecto
   */
  async getByProspecto(prospectoId: string): Promise<NotaInterna[]> {
    const { data, error } = await analysisSupabase
      .from('notas_internas')
      .select('*')
      .eq('prospecto_id', prospectoId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[NotasInternas] Error cargando notas:', error);
      return [];
    }
    return (data || []) as NotaInterna[];
  }

  /**
   * Crear nota interna
   */
  async create(params: {
    prospectoId: string;
    userId: string;
    userName: string;
    userRole: string;
    contenido: string;
  }): Promise<NotaInterna | null> {
    const { data, error } = await analysisSupabase
      .from('notas_internas')
      .insert({
        prospecto_id: params.prospectoId,
        user_id: params.userId,
        user_name: params.userName,
        user_role: params.userRole,
        contenido: params.contenido,
      })
      .select()
      .single();

    if (error) {
      console.error('[NotasInternas] Error creando nota:', error);
      return null;
    }
    return data as NotaInterna;
  }
}

export const notasInternasService = new NotasInternasService();
