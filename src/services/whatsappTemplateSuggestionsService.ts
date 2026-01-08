import { analysisSupabase } from '../config/analysisSupabase';

/**
 * ============================================
 * SERVICIO DE SUGERENCIAS DE PLANTILLAS WHATSAPP
 * ============================================
 * 
 * Gestión completa de sugerencias de plantillas de WhatsApp
 * Permite a ejecutivos, coordinadores y supervisores sugerir nuevas plantillas
 */

// ============================================
// TIPOS
// ============================================

export interface TemplateSuggestion {
  id: string;
  name: string;
  template_text: string;
  justification: string;
  suggested_by: string;
  conversation_id?: string | null;
  suggested_at: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  imported_to_template_id?: string | null;
  available_variables?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateSuggestionInput {
  name: string;
  template_text: string;
  justification: string;
  conversation_id?: string;
  available_variables?: string[];
}

export interface UpdateSuggestionStatusInput {
  status: 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
}

export interface SuggestionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

// ============================================
// SERVICIO
// ============================================

class WhatsAppTemplateSuggestionsService {
  /**
   * Crear una nueva sugerencia de plantilla
   */
  async createSuggestion(
    input: CreateSuggestionInput,
    userId: string
  ): Promise<TemplateSuggestion> {
    const { data, error } = await analysisSupabase
      .from('whatsapp_template_suggestions')
      .insert({
        name: input.name,
        template_text: input.template_text,
        justification: input.justification,
        suggested_by: userId,
        conversation_id: input.conversation_id || null,
        available_variables: input.available_variables || [],
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear sugerencia: ${error.message}`);
    }

    return data;
  }

  /**
   * Obtener todas las sugerencias (con filtros opcionales)
   */
  async getAllSuggestions(filters?: {
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    suggested_by?: string;
  }): Promise<TemplateSuggestion[]> {
    let query = analysisSupabase
      .from('whatsapp_template_suggestions')
      .select('*')
      .order('suggested_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.suggested_by) {
      query = query.eq('suggested_by', filters.suggested_by);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error al obtener sugerencias: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Obtener una sugerencia por ID
   */
  async getSuggestionById(id: string): Promise<TemplateSuggestion | null> {
    const { data, error } = await analysisSupabase
      .from('whatsapp_template_suggestions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No encontrado
      }
      throw new Error(`Error al obtener sugerencia: ${error.message}`);
    }

    return data;
  }

  /**
   * Obtener estadísticas de sugerencias para un usuario
   */
  async getSuggestionStats(userId: string): Promise<SuggestionStats> {
    const { data, error } = await analysisSupabase
      .from('whatsapp_template_suggestions')
      .select('status')
      .eq('suggested_by', userId);

    if (error) {
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }

    const stats: SuggestionStats = {
      total: data?.length || 0,
      pending: data?.filter((s) => s.status === 'PENDING').length || 0,
      approved: data?.filter((s) => s.status === 'APPROVED').length || 0,
      rejected: data?.filter((s) => s.status === 'REJECTED').length || 0,
    };

    return stats;
  }

  /**
   * Actualizar el estado de una sugerencia (solo administradores)
   */
  async updateSuggestionStatus(
    id: string,
    input: UpdateSuggestionStatusInput,
    reviewerId: string
  ): Promise<TemplateSuggestion> {
    const updateData: any = {
      status: input.status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    };

    if (input.status === 'REJECTED' && input.rejection_reason) {
      updateData.rejection_reason = input.rejection_reason;
    }

    const { data, error } = await analysisSupabase
      .from('whatsapp_template_suggestions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al actualizar estado: ${error.message}`);
    }

    return data;
  }

  /**
   * Vincular una sugerencia con una plantilla importada
   */
  async linkSuggestionToTemplate(
    suggestionId: string,
    templateId: string
  ): Promise<void> {
    const { error } = await analysisSupabase
      .from('whatsapp_template_suggestions')
      .update({ imported_to_template_id: templateId })
      .eq('id', suggestionId);

    if (error) {
      throw new Error(`Error al vincular sugerencia: ${error.message}`);
    }
  }

  /**
   * Obtener sugerencias pendientes (para administradores)
   */
  async getPendingSuggestions(): Promise<TemplateSuggestion[]> {
    const { data, error } = await analysisSupabase
      .from('whatsapp_template_suggestions')
      .select('*')
      .eq('status', 'PENDING')
      .order('suggested_at', { ascending: false });

    if (error) {
      throw new Error(`Error al obtener sugerencias pendientes: ${error.message}`);
    }

    return data || [];
  }
}

// Exportar instancia única del servicio
export const whatsappTemplateSuggestionsService = new WhatsAppTemplateSuggestionsService();

