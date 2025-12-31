/**
 * ============================================
 * SERVICIO DE ETIQUETAS PARA WHATSAPP
 * ============================================
 * 
 * Gestiona etiquetas predefinidas y personalizadas para conversaciones de WhatsApp
 * Base de datos: SYSTEM_UI (zbylezfyagwrxoecioup)
 */

import { supabaseSystemUI } from '../config/supabaseSystemUI';

// ============================================
// INTERFACES Y TIPOS
// ============================================

export interface WhatsAppLabel {
  id: string;
  name: string;
  color: string; // Hexadecimal #RRGGBB
  icon?: string; // Nombre del icono lucide-react (solo preset)
  description?: string;
  business_rule?: 'positive' | 'negative' | 'neutral'; // Solo preset
  type: 'preset' | 'custom';
  isOwner?: boolean; // Si el usuario actual es el creador (solo custom)
  creatorName?: string; // Nombre del creador (solo custom)
  creatorId?: string; // ID del creador (solo custom)
}

export interface ConversationLabel {
  id: string;
  label_id: string;
  label_type: 'preset' | 'custom';
  shadow_cell: boolean;
  name: string;
  color: string;
  icon?: string;
  business_rule?: string;
  assigned_by?: string; // Usuario que la aplicó
  assigned_by_role?: string; // Rol de quien la aplicó
  can_remove?: boolean; // Si el usuario actual puede quitarla
  remove_reason?: string; // Razón por la que puede/no puede quitarla
}

export interface AvailableLabels {
  preset: WhatsAppLabel[];
  custom: WhatsAppLabel[];
}

// Catálogo de colores disponibles para etiquetas personalizadas (12 colores)
export const CUSTOM_LABEL_COLORS = [
  { name: 'Rosa', hex: '#EC4899' },
  { name: 'Fucsia', hex: '#D946EF' },
  { name: 'Índigo', hex: '#6366F1' },
  { name: 'Cian', hex: '#06B6D4' },
  { name: 'Turquesa', hex: '#14B8A6' },
  { name: 'Lima', hex: '#84CC16' },
  { name: 'Ámbar', hex: '#F59E0B' },
  { name: 'Naranja Oscuro', hex: '#EA580C' },
  { name: 'Rojo Oscuro', hex: '#DC2626' },
  { name: 'Rosa Oscuro', hex: '#BE185D' },
  { name: 'Gris', hex: '#6B7280' },
  { name: 'Esmeralda', hex: '#059669' },
] as const;

// Límites del sistema
export const LABEL_LIMITS = {
  MAX_LABELS_PER_CONVERSATION: 3,
  MAX_CUSTOM_LABELS_PER_USER: 6,
  PRESET_LABELS_COUNT: 6,
} as const;

// ============================================
// CLASE DEL SERVICIO
// ============================================

class WhatsAppLabelsService {
  
  /**
   * Obtiene todas las etiquetas disponibles para un usuario
   * (predefinidas del sistema + personalizadas del usuario)
   */
  async getAvailableLabels(userId: string): Promise<AvailableLabels> {
    try {
      // Cargar preset y custom por separado para tener control total
      const [preset, custom] = await Promise.all([
        this.getPresetLabels(),
        this.getCustomLabels(userId), // Usa getCustomLabels que tiene isOwner
      ]);
      
      return {
        preset,
        custom,
      };
    } catch (error) {
      console.error('Error obteniendo etiquetas disponibles:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene solo las etiquetas predefinidas del sistema
   */
  async getPresetLabels(): Promise<WhatsAppLabel[]> {
    try {
      if (!supabaseSystemUI) {
        throw new Error('Supabase System UI no está configurado');
      }

      const { data, error } = await supabaseSystemUI
        .from('whatsapp_labels_preset')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      
      return (data || []).map(label => ({
        id: label.id,
        name: label.name,
        color: label.color,
        icon: label.icon,
        description: label.description,
        business_rule: label.business_rule,
        type: 'preset' as const,
      }));
    } catch (error) {
      console.error('Error obteniendo etiquetas predefinidas:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene TODAS las etiquetas personalizadas (globales visibles)
   * Diferenciando cuáles pertenecen al usuario actual
   */
  async getCustomLabels(userId: string): Promise<WhatsAppLabel[]> {
    try {
      if (!supabaseSystemUI) {
        throw new Error('Supabase System UI no está configurado');
      }

      // Cargar TODAS las etiquetas custom activas
      const { data, error } = await supabaseSystemUI
        .from('whatsapp_labels_custom')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(label => ({
        id: label.id,
        name: label.name,
        color: label.color,
        description: label.description,
        type: 'custom' as const,
        isOwner: String(label.user_id) === String(userId),
        creatorName: 'Usuario',
        creatorId: label.user_id,
      }));
    } catch (error) {
      console.error('Error obteniendo etiquetas personalizadas:', error);
      throw error;
    }
  }
  
  /**
   * Crea una nueva etiqueta personalizada
   */
  async createCustomLabel(
    userId: string,
    name: string,
    color: string,
    description?: string
  ): Promise<WhatsAppLabel> {
    try {
      if (!supabaseSystemUI) {
        throw new Error('Supabase System UI no está configurado');
      }

      // Validar que el color esté en el catálogo
      const validColors = CUSTOM_LABEL_COLORS.map(c => c.hex);
      if (!validColors.includes(color)) {
        throw new Error('Color no válido. Debe seleccionar un color del catálogo.');
      }
      
      // Insertar etiqueta (el trigger validará el límite de 6)
      const { data, error } = await supabaseSystemUI
        .from('whatsapp_labels_custom')
        .insert({
          user_id: userId,
          name: name.trim(),
          color,
          description: description?.trim(),
          is_active: true,
        })
        .select()
        .single();
      
      if (error) {
        if (error.message.includes('más de 6 etiquetas')) {
          throw new Error('Ya tienes el máximo de 6 etiquetas personalizadas. Elimina alguna para crear una nueva.');
        }
        if (error.code === '23505') { // unique violation
          throw new Error('Ya tienes una etiqueta con ese nombre.');
        }
        throw error;
      }
      
      return {
        id: data.id,
        name: data.name,
        color: data.color,
        description: data.description,
        type: 'custom',
      };
    } catch (error) {
      console.error('Error creando etiqueta personalizada:', error);
      throw error;
    }
  }
  
  /**
   * Actualiza una etiqueta personalizada
   */
  async updateCustomLabel(
    labelId: string,
    userId: string,
    updates: {
      name?: string;
      color?: string;
      description?: string;
    }
  ): Promise<WhatsAppLabel> {
    try {
      if (!supabaseSystemUI) {
        throw new Error('Supabase System UI no está configurado');
      }

      // Validar color si se está actualizando
      if (updates.color) {
        const validColors = CUSTOM_LABEL_COLORS.map(c => c.hex);
        if (!validColors.includes(updates.color)) {
          throw new Error('Color no válido. Debe seleccionar un color del catálogo.');
        }
      }
      
      const { data, error } = await supabaseSystemUI
        .from('whatsapp_labels_custom')
        .update({
          ...(updates.name && { name: updates.name.trim() }),
          ...(updates.color && { color: updates.color }),
          ...(updates.description !== undefined && { description: updates.description?.trim() }),
        })
        .eq('id', labelId)
        .eq('user_id', userId) // Asegurar que solo el dueño puede modificar
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya tienes una etiqueta con ese nombre.');
        }
        throw error;
      }
      
      return {
        id: data.id,
        name: data.name,
        color: data.color,
        description: data.description,
        type: 'custom',
      };
    } catch (error) {
      console.error('Error actualizando etiqueta personalizada:', error);
      throw error;
    }
  }
  
  /**
   * Elimina una etiqueta personalizada (soft delete)
   */
  async deleteCustomLabel(labelId: string, userId: string): Promise<void> {
    try {
      if (!supabaseSystemUI) {
        throw new Error('Supabase System UI no está configurado');
      }

      // HARD DELETE: Eliminar relaciones primero (FK constraint)
      await supabaseSystemUI
        .from('whatsapp_conversation_labels')
        .delete()
        .eq('label_id', labelId)
        .eq('label_type', 'custom');
      
      // Eliminar la etiqueta permanentemente
      const { error } = await supabaseSystemUI
        .from('whatsapp_labels_custom')
        .delete()
        .eq('id', labelId)
        .eq('user_id', userId); // Asegurar que solo el dueño puede eliminar
      
      if (error) throw error;
    } catch (error) {
      console.error('Error eliminando etiqueta personalizada:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene todas las etiquetas de un prospecto con permisos de remoción
   */
  async getProspectoLabels(prospectoId: string, userId?: string): Promise<ConversationLabel[]> {
    try {
      if (!supabaseSystemUI) {
        throw new Error('Supabase System UI no está configurado');
      }

      const { data, error } = await supabaseSystemUI.rpc('get_prospecto_labels', {
        p_prospecto_id: prospectoId,
      });
      
      if (error) throw error;
      
      const labels = data || [];
      
      // Si hay userId, validar permisos de remoción para cada etiqueta
      if (userId && labels.length > 0) {
        try {
          const labelsWithPermissions = await Promise.all(
            labels.map(async (label: any) => {
              try {
                const { data: permData } = await supabaseSystemUI.rpc('can_remove_label_from_prospecto', {
                  p_relation_id: label.id,
                  p_user_id: userId,
                });
                
                return {
                  ...label,
                  can_remove: permData?.canRemove || false,
                  remove_reason: permData?.reason,
                };
              } catch (e) {
                // Si la función no existe (404), asumir que puede remover
                return {
                  ...label,
                  can_remove: true,
                  remove_reason: 'Función de permisos no disponible',
                };
              }
            })
          );
          
          return labelsWithPermissions;
        } catch (e) {
          // Fallback: retornar sin permisos
          return labels.map((l: any) => ({ ...l, can_remove: true }));
        }
      }
      
      return labels;
    } catch (error) {
      console.error('Error obteniendo etiquetas de prospecto:', error);
      throw error;
    }
  }
  
  /**
   * Agrega una etiqueta a un prospecto
   */
  async addLabelToProspecto(
    prospectoId: string,
    labelId: string,
    labelType: 'preset' | 'custom',
    shadowCell: boolean,
    userId: string
  ): Promise<ConversationLabel> {
    try {
      if (!supabaseSystemUI) {
        throw new Error('Supabase System UI no está configurado');
      }

      const { data, error } = await supabaseSystemUI.rpc('add_label_to_prospecto', {
        p_prospecto_id: prospectoId,
        p_label_id: labelId,
        p_label_type: labelType,
        p_shadow_cell: shadowCell,
        p_user_id: userId,
      });
      
      if (error) {
        if (error.message.includes('más de 3 etiquetas')) {
          throw new Error('No puedes agregar más de 3 etiquetas a una conversación.');
        }
        if (error.message.includes('etiqueta positiva') || error.message.includes('etiqueta negativa')) {
          throw new Error('No puedes combinar etiquetas de éxito con etiquetas de rechazo (ej: "Reservación Concretada" y "No Interesado").');
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error agregando etiqueta a prospecto:', error);
      throw error;
    }
  }
  
  /**
   * Remueve una etiqueta de un prospecto
   */
  async removeLabelFromProspecto(
    prospectoId: string,
    labelId: string,
    labelType: 'preset' | 'custom'
  ): Promise<boolean> {
    try {
      if (!supabaseSystemUI) {
        throw new Error('Supabase System UI no está configurado');
      }

      const { data, error } = await supabaseSystemUI.rpc('remove_label_from_prospecto', {
        p_prospecto_id: prospectoId,
        p_label_id: labelId,
        p_label_type: labelType,
      });
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error removiendo etiqueta de prospecto:', error);
      throw error;
    }
  }
  
  /**
   * Actualiza el estado de shadow_cell de una etiqueta
   */
  async toggleShadowCell(
    prospectoId: string,
    labelId: string,
    labelType: 'preset' | 'custom',
    shadowCell: boolean,
    userId: string
  ): Promise<void> {
    try {
      if (!supabaseSystemUI) {
        throw new Error('Supabase System UI no está configurado');
      }

      // Si se activa shadow_cell, desactivar en las demás primero
      if (shadowCell) {
        await supabaseSystemUI
          .from('whatsapp_conversation_labels')
          .update({ shadow_cell: false })
          .eq('prospecto_id', prospectoId);
      }

      // Actualizar la etiqueta específica
      const { error } = await supabaseSystemUI
        .from('whatsapp_conversation_labels')
        .update({ shadow_cell: shadowCell })
        .eq('prospecto_id', prospectoId)
        .eq('label_id', labelId)
        .eq('label_type', labelType);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error actualizando shadow_cell:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene las etiquetas de múltiples prospectos (batch)
   * Para optimizar la carga en LiveChatCanvas
   */
  async getBatchProspectosLabels(prospectoIds: string[]): Promise<Record<string, ConversationLabel[]>> {
    try {
      if (!supabaseSystemUI) {
        throw new Error('Supabase System UI no está configurado');
      }

      // Usar función RPC con SECURITY DEFINER (evita problemas de RLS)
      // Dividir en batches de 200 para evitar límites de PostgreSQL
      const BATCH_SIZE = 200;
      const allResults: Record<string, ConversationLabel[]> = {};

      for (let i = 0; i < prospectoIds.length; i += BATCH_SIZE) {
        const batch = prospectoIds.slice(i, i + BATCH_SIZE);
        
        const { data, error } = await supabaseSystemUI.rpc('get_batch_prospecto_labels', {
          p_prospecto_ids: batch,
        });
        
        if (error) {
          console.error('Error cargando batch de etiquetas:', error);
          continue;
        }
        
        if (data) {
          Object.assign(allResults, data);
        }
      }

      return allResults;
    } catch (error) {
      console.error('Error obteniendo etiquetas en batch:', error);
      return {};
    }
  }
  
  /**
   * Valida si se puede agregar una etiqueta a un prospecto
   */
  async canAddLabel(
    prospectoId: string,
    labelId: string,
    labelType: 'preset' | 'custom'
  ): Promise<{ canAdd: boolean; reason?: string }> {
    try {
      // Obtener etiquetas actuales del prospecto
      const currentLabels = await this.getProspectoLabels(prospectoId);
      
      // Validar límite de 3 etiquetas
      if (currentLabels.length >= LABEL_LIMITS.MAX_LABELS_PER_CONVERSATION) {
        return {
          canAdd: false,
          reason: `Ya tienes el máximo de ${LABEL_LIMITS.MAX_LABELS_PER_CONVERSATION} etiquetas en esta conversación.`,
        };
      }
      
      // Validar etiquetas contradictorias (solo para preset)
      if (labelType === 'preset' && supabaseSystemUI) {
        // Buscar la etiqueta en la lista de preset labels ya cargadas
        const presetLabels = await this.getPresetLabels();
        const targetLabel = presetLabels.find(l => l.id === labelId);
        
        if (targetLabel && targetLabel.business_rule) {
          const newRule = targetLabel.business_rule;
          
          // Buscar conflictos
          const hasConflict = currentLabels.some(label => {
            if (label.label_type === 'preset') {
              return (
                (newRule === 'positive' && label.business_rule === 'negative') ||
                (newRule === 'negative' && label.business_rule === 'positive')
              );
            }
            return false;
          });
          
          if (hasConflict) {
            return {
              canAdd: false,
              reason: 'No puedes combinar etiquetas de éxito con etiquetas de rechazo.',
            };
          }
        }
      }
      
      return { canAdd: true };
    } catch (error) {
      console.error('Error validando si se puede agregar etiqueta:', error);
      return { canAdd: false, reason: 'Error al validar la etiqueta.' };
    }
  }
}

// ============================================
// EXPORTAR INSTANCIA SINGLETON
// ============================================

export const whatsappLabelsService = new WhatsAppLabelsService();

