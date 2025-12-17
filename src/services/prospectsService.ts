import { permissionsService } from './permissionsService';
import { automationService } from './automationService';
import { analysisSupabase } from '../config/analysisSupabase';
import { coordinacionService } from './coordinacionService';

/**
 * ============================================
 * SERVICIO DE PROSPECTOS - MÓDULO PROSPECTOS
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/prospectos/README_PROSPECTOS.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/prospectos/README_PROSPECTOS.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/prospectos/CHANGELOG_PROSPECTOS.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

// ============================================
// INTERFACES Y TIPOS
// ============================================

export interface Prospect {
  id: string;
  nombre_completo?: string;
  nombre_whatsapp?: string;
  titulo?: string; // Título de cortesía (Señor, Señorita, Sr., Srta., etc.)
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
  id_dynamics?: string; // ID de CRM
  coordinacion_id?: string; // ID de coordinación asignada
  ejecutivo_id?: string; // ID de ejecutivo asignado
  
  // Campos enriquecidos de coordinación y ejecutivo (obtenidos dinámicamente)
  coordinacion_codigo?: string;
  coordinacion_nombre?: string;
  ejecutivo_nombre?: string;
  ejecutivo_email?: string;
  asesor_asignado?: string;
  
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
  
  // Campos para alertas
  requiere_atencion_humana?: boolean;
  motivo_handoff?: string;
  score?: string;
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
   * @param phone - Número de teléfono a buscar
   * @param userId - ID del usuario para aplicar filtros de permisos (opcional)
   */
  async findProspectByPhone(phone: string, userId?: string): Promise<ProspectSearchResult> {
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
        const result = await this.searchProspectByPhoneVariation(variation, userId);
        if (result.found && result.prospect) {
          // Verificar permisos si hay userId
          if (userId && result.prospect) {
            const canAccess = await permissionsService.canUserAccessProspect(userId, result.prospect.id);
            if (!canAccess.canAccess) {
              continue; // Saltar este resultado si no tiene acceso
            }
          }
          return {
            ...result,
            searchTerm: phone,
            matchType: variation === cleanPhone ? 'exact' : 'formatted'
          };
        }
      }

      // Si no se encuentra con variaciones exactas, buscar parcialmente
      const partialResult = await this.searchProspectPartially(cleanPhone, userId);
      if (partialResult.found && partialResult.prospect) {
        // Verificar permisos si hay userId
        if (userId && partialResult.prospect) {
          const canAccess = await permissionsService.canUserAccessProspect(userId, partialResult.prospect.id);
          if (!canAccess.canAccess) {
            return {
              prospect: null,
              found: false,
              searchTerm: phone
            };
          }
        }
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
   * @param phone - Número de teléfono
   * @param userId - ID del usuario para aplicar filtros (opcional)
   */
  private async searchProspectByPhoneVariation(phone: string, userId?: string): Promise<ProspectSearchResult> {
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
   * @param phone - Número de teléfono
   * @param userId - ID del usuario para aplicar filtros (opcional)
   */
  private async searchProspectPartially(phone: string, userId?: string): Promise<ProspectSearchResult> {
    try {
      // Buscar números que contengan los últimos 8 dígitos
      const lastDigits = phone.slice(-8);
      
      let query = analysisSupabase
        .from('prospectos')
        .select('*')
        .like('whatsapp', `%${lastDigits}`)
        .limit(5);

      // Aplicar filtros de permisos si hay userId (incluye lógica de backup)
      if (userId) {
        const filteredQuery = await permissionsService.applyProspectFilters(query, userId);
        if (filteredQuery && typeof filteredQuery.limit === 'function') {
          query = filteredQuery;
        }
      }

      const { data, error } = await query;

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
   * @param id - ID del prospecto
   * @param userId - ID del usuario para verificar permisos (opcional)
   */
  async getProspectById(id: string, userId?: string): Promise<Prospect | null> {
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

      if (!data) return null;

      // Verificar permisos si hay userId
      if (userId) {
        const canAccess = await permissionsService.canUserAccessProspect(userId, id);
        if (!canAccess.canAccess) {
          return null; // Usuario no tiene acceso a este prospecto
        }
      }

      // Enriquecer con datos de coordinación y ejecutivo
      let coordinacionInfo: { codigo?: string; nombre?: string } | null = null;
      let ejecutivoInfo: { full_name?: string; nombre_completo?: string; nombre?: string; email?: string } | null = null;

      if (data.coordinacion_id) {
        try {
          coordinacionInfo = await coordinacionService.getCoordinacionById(data.coordinacion_id);
        } catch (error) {
          console.warn('Error obteniendo coordinación:', error);
        }
      }

      // Obtener ejecutivo: primero desde asesor_asignado (campo directo), luego desde ejecutivo_id
      let ejecutivoNombre: string | undefined = undefined;
      
      // 1. Intentar desde asesor_asignado (campo directo de prospectos)
      if (data.asesor_asignado && typeof data.asesor_asignado === 'string' && data.asesor_asignado.trim() !== '') {
        ejecutivoNombre = data.asesor_asignado.trim();
      }
      // 2. Si no hay asesor_asignado, intentar desde ejecutivo_id
      else if (data.ejecutivo_id) {
        try {
          ejecutivoInfo = await coordinacionService.getEjecutivoById(data.ejecutivo_id);
          if (ejecutivoInfo) {
            ejecutivoNombre = ejecutivoInfo.full_name || ejecutivoInfo.nombre_completo || ejecutivoInfo.nombre;
          }
        } catch (error) {
          console.warn('Error obteniendo ejecutivo:', error);
        }
      }

      // Retornar prospecto enriquecido
      return {
        ...data,
        coordinacion_codigo: coordinacionInfo?.codigo,
        coordinacion_nombre: coordinacionInfo?.nombre,
        ejecutivo_nombre: ejecutivoNombre,
        ejecutivo_email: ejecutivoInfo?.email
      };
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
      // Verificar si se está actualizando id_dynamics
      const idDynamicsValue = (updates as any).id_dynamics;
      const hasIdDynamics = idDynamicsValue !== undefined;
      
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

      // Si se actualizó id_dynamics y ahora tiene valor, procesar asignación automática
      if (hasIdDynamics && idDynamicsValue && data) {
        await automationService.processProspectWithCRM(id, idDynamicsValue);
      }

      return data;
    } catch (error) {
      console.error('Error actualizando prospecto:', error);
      return null;
    }
  }

  /**
   * Busca prospectos por múltiples criterios
   * @param criteria - Criterios de búsqueda
   * @param userId - ID del usuario para aplicar filtros de permisos (opcional)
   */
  async searchProspects(criteria: {
    name?: string;
    email?: string;
    phone?: string;
    etapa?: string;
    ciudad?: string;
    limit?: number;
  }, userId?: string): Promise<Prospect[]> {
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

      // Aplicar filtros de permisos si hay userId (incluye lógica de backup)
      let ejecutivosIdsParaFiltro: string[] | null = null;
      let coordinacionesIdsParaFiltro: string[] | null = null;
      
      if (userId) {
        try {
          const filteredQuery = await permissionsService.applyProspectFilters(query, userId);
          // Si applyProspectFilters retorna algo, es válido (la función interna ya valida)
          if (filteredQuery && typeof filteredQuery === 'object') {
            query = filteredQuery;
            
            // Guardar los filtros aplicados para usar en fallback si es necesario
            const ejecutivoFilter = await permissionsService.getEjecutivoFilter(userId);
            const coordinacionesFilter = await permissionsService.getCoordinacionesFilter(userId);
            
            if (ejecutivoFilter) {
              // Obtener IDs de ejecutivos donde es backup
              const { supabaseSystemUIAdmin } = await import('../config/supabaseSystemUI');
              const { data: ejecutivosConBackup } = await supabaseSystemUIAdmin
                .from('auth_users')
                .select('id')
                .eq('backup_id', ejecutivoFilter)
                .eq('has_backup', true);
              
              ejecutivosIdsParaFiltro = [ejecutivoFilter];
              if (ejecutivosConBackup && ejecutivosConBackup.length > 0) {
                ejecutivosIdsParaFiltro.push(...ejecutivosConBackup.map(e => e.id));
              }
            } else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
              coordinacionesIdsParaFiltro = coordinacionesFilter;
            }
          }
        } catch (error) {
          // Silenciar error, continuar con query original
        }
      }

      // Aplicar ordenamiento y límite - la query siempre debería tener estos métodos
      try {
        // Verificar que la query tiene .order() antes de usarlo
        if (typeof query.order === 'function') {
          query = query
            .order('updated_at', { ascending: false })
            .limit(criteria.limit || 50);
        } else {
          // Si no tiene .order(), reconstruir la query con los filtros aplicados
          const { analysisSupabase } = await import('../config/analysisSupabase');
          let fallbackQuery = analysisSupabase
            .from('prospectos')
            .select('*');
          
          // Aplicar los mismos filtros que se aplicaron antes
          if (ejecutivosIdsParaFiltro && ejecutivosIdsParaFiltro.length > 0) {
            // Para ejecutivos, también necesitamos filtrar por coordinación
            const coordinacionesFilter = await permissionsService.getCoordinacionesFilter(userId!);
            if (coordinacionesFilter && coordinacionesFilter.length > 0) {
              fallbackQuery = fallbackQuery
                .in('ejecutivo_id', ejecutivosIdsParaFiltro)
                .in('coordinacion_id', coordinacionesFilter);
            } else {
              fallbackQuery = fallbackQuery.in('ejecutivo_id', ejecutivosIdsParaFiltro);
            }
          } else if (coordinacionesIdsParaFiltro && coordinacionesIdsParaFiltro.length > 0) {
            fallbackQuery = fallbackQuery.in('coordinacion_id', coordinacionesIdsParaFiltro);
          }
          
          query = fallbackQuery
            .order('updated_at', { ascending: false })
            .limit(criteria.limit || 50);
        }
      } catch (error) {
        // Si falla, reconstruir la query con los filtros aplicados (no sin filtros)
        const { analysisSupabase } = await import('../config/analysisSupabase');
        let fallbackQuery = analysisSupabase
          .from('prospectos')
          .select('*');
        
        // Aplicar los mismos filtros que se aplicaron antes
        if (ejecutivosIdsParaFiltro && ejecutivosIdsParaFiltro.length > 0) {
          // Para ejecutivos, también necesitamos filtrar por coordinación
          const coordinacionesFilter = await permissionsService.getCoordinacionesFilter(userId!);
          if (coordinacionesFilter && coordinacionesFilter.length > 0) {
            fallbackQuery = fallbackQuery
              .in('ejecutivo_id', ejecutivosIdsParaFiltro)
              .in('coordinacion_id', coordinacionesFilter);
          } else {
            fallbackQuery = fallbackQuery.in('ejecutivo_id', ejecutivosIdsParaFiltro);
          }
        } else if (coordinacionesIdsParaFiltro && coordinacionesIdsParaFiltro.length > 0) {
          fallbackQuery = fallbackQuery.in('coordinacion_id', coordinacionesIdsParaFiltro);
        }
        
        query = fallbackQuery
          .order('updated_at', { ascending: false })
          .limit(criteria.limit || 50);
      }

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
