import { createClient } from '@supabase/supabase-js';

// Configuración para la base de datos de análisis (donde están los prospectos)
const ANALYSIS_SUPABASE_URL = 'https://glsmifhkoaifvaegsozd.supabase.co';
const ANALYSIS_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrbzFpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2NzI2NzQsImV4cCI6MjA1MDI0ODY3NH0.Qs8Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7E';

// Cliente de Supabase para la base de análisis
export const analysisSupabase = createClient(
  ANALYSIS_SUPABASE_URL,
  ANALYSIS_SUPABASE_ANON_KEY
);

// ============================================
// INTERFACES Y TIPOS
// ============================================

export interface Prospect {
  id: string;
  nombre_completo?: string;
  nombre_whatsapp?: string;
  edad?: number;
  estado_civil?: string;
  ciudad_residencia?: string;
  etapa?: string;
  whatsapp: string;
  email?: string;
  observaciones?: string;
  tamano_grupo?: number;
  cantidad_menores?: number;
  viaja_con?: string;
  destino_preferencia?: string[];
  created_at: string;
  updated_at: string;
  
  // Campos adicionales para Live Monitor (si existen)
  status_transferencia?: string;
  agente_asignado?: string;
  fecha_transferencia?: string;
  checkpoint_transferencia?: string;
  temperatura_prospecto?: string;
  feedback_agente?: string;
  resultado_transferencia?: string;
  comentarios_ia?: string;
  duracion_llamada_ia?: number;
  prioridad_seguimiento?: string;
  fecha_feedback?: string;
  agente_feedback_id?: string;
  llamada_activa?: boolean;
}

export interface ProspectSearchResult {
  prospect: Prospect | null;
  found: boolean;
  searchTerm: string;
  matchType?: 'exact' | 'partial' | 'formatted';
}

// ============================================
// SERVICIO PRINCIPAL
// ============================================

class ProspectsService {
  
  // ============================================
  // BÚSQUEDA DE PROSPECTOS
  // ============================================

  /**
   * Busca un prospecto por número de teléfono
   * Intenta diferentes formatos de número para maximizar las coincidencias
   */
  async findProspectByPhone(phone: string): Promise<ProspectSearchResult> {
    if (!phone || phone.trim() === '') {
      return {
        prospect: null,
        found: false,
        searchTerm: phone
      };
    }

    try {
      // Limpiar el número de teléfono
      const cleanPhone = this.cleanPhoneNumber(phone);
      
      // Generar variaciones del número para búsqueda
      const phoneVariations = this.generatePhoneVariations(cleanPhone);
      
      // Buscar con cada variación
      for (const variation of phoneVariations) {
        const result = await this.searchProspectByPhoneVariation(variation);
        if (result.found && result.prospect) {
          return {
            ...result,
            searchTerm: phone,
            matchType: variation === cleanPhone ? 'exact' : 'formatted'
          };
        }
      }

      // Si no se encuentra con variaciones exactas, buscar parcialmente
      const partialResult = await this.searchProspectPartially(cleanPhone);
      if (partialResult.found && partialResult.prospect) {
        return {
          ...partialResult,
          searchTerm: phone,
          matchType: 'partial'
        };
      }

      return {
        prospect: null,
        found: false,
        searchTerm: phone
      };

    } catch (error) {
      console.error('Error buscando prospecto por teléfono:', error);
      return {
        prospect: null,
        found: false,
        searchTerm: phone
      };
    }
  }

  /**
   * Busca prospecto con una variación específica del número
   */
  private async searchProspectByPhoneVariation(phone: string): Promise<ProspectSearchResult> {
    try {
      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select('*')
        .eq('whatsapp', phone)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error en búsqueda de prospecto:', error);
        return { prospect: null, found: false, searchTerm: phone };
      }

      return {
        prospect: data,
        found: !!data,
        searchTerm: phone
      };
    } catch (error) {
      console.error('Error en búsqueda por variación:', error);
      return { prospect: null, found: false, searchTerm: phone };
    }
  }

  /**
   * Búsqueda parcial usando LIKE para números similares
   */
  private async searchProspectPartially(phone: string): Promise<ProspectSearchResult> {
    try {
      // Buscar números que contengan los últimos 8 dígitos
      const lastDigits = phone.slice(-8);
      
      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select('*')
        .like('whatsapp', `%${lastDigits}`)
        .limit(5);

      if (error) {
        console.error('Error en búsqueda parcial:', error);
        return { prospect: null, found: false, searchTerm: phone };
      }

      // Si hay múltiples resultados, tomar el más reciente
      const prospect = data && data.length > 0 
        ? data.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
        : null;

      return {
        prospect,
        found: !!prospect,
        searchTerm: phone
      };
    } catch (error) {
      console.error('Error en búsqueda parcial:', error);
      return { prospect: null, found: false, searchTerm: phone };
    }
  }

  // ============================================
  // UTILIDADES DE FORMATEO
  // ============================================

  /**
   * Limpia un número de teléfono removiendo caracteres no numéricos
   */
  private cleanPhoneNumber(phone: string): string {
    return phone.replace(/[\s\-\(\)\+\.]/g, '');
  }

  /**
   * Genera variaciones comunes de un número de teléfono
   */
  private generatePhoneVariations(phone: string): string[] {
    const variations = new Set<string>();
    
    // Número original limpio
    variations.add(phone);
    
    // Si empieza con código de país, también sin él
    if (phone.startsWith('52') && phone.length > 10) {
      variations.add(phone.substring(2));
    }
    if (phone.startsWith('1') && phone.length === 11) {
      variations.add(phone.substring(1));
    }
    
    // Si no tiene código de país, agregarlo
    if (phone.length === 10) {
      variations.add('52' + phone);
      variations.add('1' + phone);
    }
    
    // Variaciones con formato internacional
    if (!phone.startsWith('+')) {
      variations.add('+52' + (phone.startsWith('52') ? phone.substring(2) : phone));
    }
    
    // Remover el + si existe
    if (phone.startsWith('+')) {
      variations.add(phone.substring(1));
    }

    return Array.from(variations);
  }

  // ============================================
  // OPERACIONES CRUD
  // ============================================

  /**
   * Obtiene un prospecto por ID
   */
  async getProspectById(id: string): Promise<Prospect | null> {
    try {
      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error obteniendo prospecto:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error obteniendo prospecto por ID:', error);
      return null;
    }
  }

  /**
   * Actualiza información de un prospecto
   */
  async updateProspect(id: string, updates: Partial<Prospect>): Promise<Prospect | null> {
    try {
      const { data, error } = await analysisSupabase
        .from('prospectos')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando prospecto:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error actualizando prospecto:', error);
      return null;
    }
  }

  /**
   * Busca prospectos por múltiples criterios
   */
  async searchProspects(criteria: {
    name?: string;
    email?: string;
    phone?: string;
    etapa?: string;
    ciudad?: string;
    limit?: number;
  }): Promise<Prospect[]> {
    try {
      let query = analysisSupabase
        .from('prospectos')
        .select('*');

      if (criteria.name) {
        query = query.or(`nombre_completo.ilike.%${criteria.name}%,nombre_whatsapp.ilike.%${criteria.name}%`);
      }

      if (criteria.email) {
        query = query.ilike('email', `%${criteria.email}%`);
      }

      if (criteria.phone) {
        const cleanPhone = this.cleanPhoneNumber(criteria.phone);
        query = query.like('whatsapp', `%${cleanPhone}%`);
      }

      if (criteria.etapa) {
        query = query.eq('etapa', criteria.etapa);
      }

      if (criteria.ciudad) {
        query = query.ilike('ciudad_residencia', `%${criteria.ciudad}%`);
      }

      query = query
        .order('updated_at', { ascending: false })
        .limit(criteria.limit || 50);

      const { data, error } = await query;

      if (error) {
        console.error('Error buscando prospectos:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error en búsqueda de prospectos:', error);
      return [];
    }
  }

  // ============================================
  // ESTADÍSTICAS Y MÉTRICAS
  // ============================================

  /**
   * Obtiene estadísticas generales de prospectos
   */
  async getProspectsStats(): Promise<{
    total: number;
    byEtapa: Record<string, number>;
    byCiudad: Record<string, number>;
    recentActivity: number;
  }> {
    try {
      // Total de prospectos
      const { count: total } = await analysisSupabase
        .from('prospectos')
        .select('*', { count: 'exact', head: true });

      // Por etapa
      const { data: etapasData } = await analysisSupabase
        .from('prospectos')
        .select('etapa')
        .not('etapa', 'is', null);

      const byEtapa: Record<string, number> = {};
      etapasData?.forEach(item => {
        if (item.etapa) {
          byEtapa[item.etapa] = (byEtapa[item.etapa] || 0) + 1;
        }
      });

      // Por ciudad
      const { data: ciudadesData } = await analysisSupabase
        .from('prospectos')
        .select('ciudad_residencia')
        .not('ciudad_residencia', 'is', null);

      const byCiudad: Record<string, number> = {};
      ciudadesData?.forEach(item => {
        if (item.ciudad_residencia) {
          byCiudad[item.ciudad_residencia] = (byCiudad[item.ciudad_residencia] || 0) + 1;
        }
      });

      // Actividad reciente (últimos 7 días)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: recentActivity } = await analysisSupabase
        .from('prospectos')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', sevenDaysAgo.toISOString());

      return {
        total: total || 0,
        byEtapa,
        byCiudad,
        recentActivity: recentActivity || 0
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de prospectos:', error);
      return {
        total: 0,
        byEtapa: {},
        byCiudad: {},
        recentActivity: 0
      };
    }
  }

  // ============================================
  // INTEGRACIÓN CON LIVE MONITOR
  // ============================================

  /**
   * Actualiza el estado de transferencia de un prospecto
   */
  async updateTransferStatus(
    prospectId: string, 
    status: string, 
    agentId?: string, 
    checkpoint?: string
  ): Promise<boolean> {
    try {
      const updates: Partial<Prospect> = {
        status_transferencia: status,
        fecha_transferencia: new Date().toISOString()
      };

      if (agentId) {
        updates.agente_asignado = agentId;
      }

      if (checkpoint) {
        updates.checkpoint_transferencia = checkpoint;
      }

      const result = await this.updateProspect(prospectId, updates);
      return !!result;
    } catch (error) {
      console.error('Error actualizando estado de transferencia:', error);
      return false;
    }
  }

  /**
   * Marca un prospecto como en llamada activa
   */
  async setActiveCall(prospectId: string, isActive: boolean): Promise<boolean> {
    try {
      const result = await this.updateProspect(prospectId, {
        llamada_activa: isActive
      });
      return !!result;
    } catch (error) {
      console.error('Error actualizando estado de llamada activa:', error);
      return false;
    }
  }
}

export const prospectsService = new ProspectsService();
