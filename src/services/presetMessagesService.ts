import { analysisSupabase } from '../config/analysisSupabase';

// ============================================
// TIPOS
// ============================================

export interface PresetVariable {
  name: string;
  label: string;
  type: 'text' | 'dropdown';
  placeholder?: string;
  default_value?: string;
  options?: string[];
}

export interface PresetMessageCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PresetMessage {
  id: string;
  category_id: string;
  title: string;
  content: string;
  variables: PresetVariable[];
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PresetMessageWithCategory extends PresetMessage {
  category?: PresetMessageCategory;
}

// ============================================
// SERVICIO
// ============================================

class PresetMessagesService {
  // --- Categorías ---

  async getCategories(activeOnly = true): Promise<PresetMessageCategory[]> {
    let query = analysisSupabase
      .from('preset_message_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async createCategory(category: Partial<PresetMessageCategory>): Promise<string> {
    const { data, error } = await analysisSupabase.rpc('manage_preset_category', {
      p_action: 'create',
      p_name: category.name,
      p_description: category.description || null,
      p_icon: category.icon || '📋',
      p_sort_order: category.sort_order || 0,
      p_is_active: category.is_active ?? true,
    });
    if (error) throw error;
    return (data as { id: string }).id;
  }

  async updateCategory(id: string, category: Partial<PresetMessageCategory>): Promise<void> {
    const { error } = await analysisSupabase.rpc('manage_preset_category', {
      p_action: 'update',
      p_id: id,
      p_name: category.name,
      p_description: category.description,
      p_icon: category.icon,
      p_sort_order: category.sort_order,
      p_is_active: category.is_active,
    });
    if (error) throw error;
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await analysisSupabase.rpc('manage_preset_category', {
      p_action: 'delete',
      p_id: id,
    });
    if (error) throw error;
  }

  // --- Mensajes ---

  async getMessages(activeOnly = true): Promise<PresetMessage[]> {
    let query = analysisSupabase
      .from('preset_messages')
      .select('*')
      .order('sort_order', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(msg => ({
      ...msg,
      variables: Array.isArray(msg.variables) ? msg.variables : [],
    }));
  }

  async getMessagesWithCategories(activeOnly = true): Promise<Map<PresetMessageCategory, PresetMessage[]>> {
    const [categories, messages] = await Promise.all([
      this.getCategories(activeOnly),
      this.getMessages(activeOnly),
    ]);

    const grouped = new Map<PresetMessageCategory, PresetMessage[]>();
    for (const cat of categories) {
      const catMessages = messages.filter(m => m.category_id === cat.id);
      if (catMessages.length > 0 || !activeOnly) {
        grouped.set(cat, catMessages);
      }
    }
    return grouped;
  }

  async createMessage(message: Partial<PresetMessage>): Promise<string> {
    const { data, error } = await analysisSupabase.rpc('manage_preset_message', {
      p_action: 'create',
      p_category_id: message.category_id,
      p_title: message.title,
      p_content: message.content,
      p_variables: message.variables || [],
      p_sort_order: message.sort_order || 0,
      p_is_active: message.is_active ?? true,
    });
    if (error) throw error;
    return (data as { id: string }).id;
  }

  async updateMessage(id: string, message: Partial<PresetMessage>): Promise<void> {
    const { error } = await analysisSupabase.rpc('manage_preset_message', {
      p_action: 'update',
      p_id: id,
      p_category_id: message.category_id,
      p_title: message.title,
      p_content: message.content,
      p_variables: message.variables,
      p_sort_order: message.sort_order,
      p_is_active: message.is_active,
    });
    if (error) throw error;
  }

  async deleteMessage(id: string): Promise<void> {
    const { error } = await analysisSupabase.rpc('manage_preset_message', {
      p_action: 'delete',
      p_id: id,
    });
    if (error) throw error;
  }

  // --- Utilidad: resolver variables en contenido ---

  resolveContent(content: string, variableValues: Record<string, string>): string {
    let resolved = content;
    for (const [key, value] of Object.entries(variableValues)) {
      resolved = resolved.replaceAll(`{{${key}}}`, value);
    }
    return resolved;
  }
}

export const presetMessagesService = new PresetMessagesService();
