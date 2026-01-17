/**
 * Servicio para gestionar llamadas programadas
 * Filtra según permisos de usuario (admin, coordinador, ejecutivo)
 */

import { analysisSupabase } from '../config/analysisSupabase';
import { supabaseSystemUI } from '../config/supabaseSystemUI';
import { permissionsService } from './permissionsService';
import { coordinacionService } from './coordinacionService';
import { getApiToken } from './apiTokensService';

export interface ScheduledCall {
  id: string;
  fecha_programada: string;
  prospecto: string; // prospecto_id
  estatus: 'programada' | 'ejecutada' | 'cancelada' | 'no_contesto';
  justificacion_llamada?: string;
  creada: string;
  llamada_ejecutada?: string; // Fecha de ejecución
  id_llamada_dynamics?: string;

  // Campos enriquecidos desde prospectos
  prospecto_nombre?: string;
  prospecto_whatsapp?: string;
  prospecto_email?: string;
  ejecutivo_id?: string;
  coordinacion_id?: string;

  // Campos enriquecidos desde auth_users y coordinaciones
  ejecutivo_nombre?: string;
  coordinacion_nombre?: string;
  coordinacion_codigo?: string;
}

export interface ScheduledCallFilters {
  estatus?: 'all' | 'programada' | 'ejecutada' | 'cancelada' | 'no_contesto';
  fechaDesde?: string;
  fechaHasta?: string;
  search?: string; // Para buscar por nombre de prospecto o whatsapp
}

class ScheduledCallsService {
  async getScheduledCalls(
    userId: string,
    filters?: ScheduledCallFilters
  ): Promise<ScheduledCall[]> {
    try {
      const ejecutivoFilter = await permissionsService.getEjecutivoFilter(userId);
      const coordinacionesFilter = await permissionsService.getCoordinacionesFilter(userId);
      // Verificar si es admin o administrador_operativo (ambos pueden ver todo)
      const permissions = await permissionsService.getUserPermissions(userId);
      const isAdminOrOperativo = permissions?.role === 'admin' || permissions?.role === 'administrador_operativo';
      // Verificar si es coordinador de Calidad (también puede ver todo)
      const isCoordinadorCalidad = await permissionsService.isCoordinadorCalidad(userId);

      let query = analysisSupabase
        .from('llamadas_programadas')
        .select(`
          id,
          fecha_programada,
          prospecto,
          estatus,
          justificacion_llamada,
          creada,
          llamada_ejecutada,
          id_llamada_dynamics
        `);

      if (filters?.estatus && filters.estatus !== 'all') {
        query = query.eq('estatus', filters.estatus);
      }
      if (filters?.fechaDesde) {
        query = query.gte('fecha_programada', filters.fechaDesde);
      }
      if (filters?.fechaHasta) {
        query = query.lt('fecha_programada', filters.fechaHasta);
      }

      const { data: callsData, error } = await query.order('fecha_programada', { ascending: true });

      if (error) {
        console.error('Error obteniendo llamadas programadas:', error);
        throw error;
      }

      if (!callsData || callsData.length === 0) {
        return [];
      }

      // Aplicar filtros de permisos
      let filteredCallsData = callsData;
      
      // Admin, Administrador Operativo y Coordinadores de Calidad pueden ver todo, no aplicar filtros
      if (!isAdminOrOperativo && !isCoordinadorCalidad) {
        if (ejecutivoFilter) {
          // Ejecutivo: solo sus prospectos asignados + prospectos de ejecutivos donde es backup
          // Obtener IDs de ejecutivos donde este ejecutivo es backup
          const { data: ejecutivosConBackup, error: backupError } = await supabaseSystemUI
            .from('auth_users')
            .select('id')
            .eq('backup_id', ejecutivoFilter)
            .eq('has_backup', true);
          
          if (backupError) {
            console.error('❌ Error obteniendo ejecutivos donde es backup:', backupError);
          }
          
          const ejecutivosIds = [ejecutivoFilter]; // Sus propios prospectos
          if (ejecutivosConBackup && ejecutivosConBackup.length > 0) {
            ejecutivosIds.push(...ejecutivosConBackup.map(e => e.id));
            console.log(`✅ Ejecutivo ${ejecutivoFilter} puede ver llamadas programadas de ${ejecutivosConBackup.length} ejecutivos como backup`);
          }
          
          // Necesitamos obtener los prospectos primero para filtrar
          const prospectoIds = [...new Set(callsData.map(call => call.prospecto).filter(Boolean))];
          
          if (prospectoIds.length === 0) {
            return [];
          }
          
          // FIX: Cargar prospectos en batches para evitar error 400 por URL muy larga
          const BATCH_SIZE = 100;
          const loadProspectosBatch1 = async (ids: string[]): Promise<any[]> => {
            const results: any[] = [];
            for (let i = 0; i < ids.length; i += BATCH_SIZE) {
              const batch = ids.slice(i, i + BATCH_SIZE);
              const { data } = await analysisSupabase
                .from('prospectos')
                .select('id, ejecutivo_id')
                .in('id', batch);
              if (data) results.push(...data);
            }
            return results;
          };
          
          const prospectosData = await loadProspectosBatch1(prospectoIds);

          const prospectosMap = new Map(
            (prospectosData || []).map(p => [p.id, p])
          );

          // Filtrar solo llamadas de prospectos que:
          // 1. Tienen ejecutivo_id asignado (no null, no undefined)
          // 2. El ejecutivo_id coincide con alguno de los IDs en ejecutivosIds (propios + backups)
          // 3. Tienen asignación activa en prospect_assignments (verificado por canUserAccessProspect)
          filteredCallsData = await Promise.all(
            callsData.map(async (call) => {
              if (!call.prospecto) return null;
              const prospecto = prospectosMap.get(call.prospecto);
              
              // Validar estrictamente:
              // - El prospecto existe en el mapa
              // - Tiene ejecutivo_id asignado (no null, no undefined)
              // - El ejecutivo_id coincide con alguno de los IDs en ejecutivosIds
              if (!prospecto || !prospecto.ejecutivo_id) {
                return null; // Prospecto sin ejecutivo asignado - ejecutivo no puede verlo
              }
              
              // Verificar si el ejecutivo_id está en la lista (propios + backups)
              if (!ejecutivosIds.includes(String(prospecto.ejecutivo_id))) {
                return null;
              }
              
              // Verificación adicional: usar el servicio de permisos para confirmar acceso completo
              // Esto verifica prospect_assignments como fuente de verdad
              try {
                const permissionCheck = await permissionsService.canUserAccessProspect(ejecutivoFilter, call.prospecto);
                if (permissionCheck.canAccess) {
                  return call;
                } else {
                  console.log(`🚫 [scheduledCallsService] Ejecutivo ${ejecutivoFilter}: Prospecto ${call.prospecto} denegado por servicio de permisos: ${permissionCheck.reason}`);
                  return null;
                }
              } catch (error) {
                console.error(`❌ [scheduledCallsService] Error verificando permiso para ${call.prospecto}:`, error);
                return null; // En caso de error, excluir por seguridad
              }
            })
          );
          
          // Filtrar nulls
          filteredCallsData = filteredCallsData.filter((call: any) => call !== null);
        } else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
          // Coordinador: prospectos de sus coordinaciones
          const prospectoIds = [...new Set(callsData.map(call => call.prospecto).filter(Boolean))];
          
          if (prospectoIds.length === 0) {
            return [];
          }
          
          // FIX: Cargar prospectos en batches para evitar error 400 por URL muy larga
          const BATCH_SIZE_COORD = 100;
          const loadProspectosBatch2 = async (ids: string[]): Promise<any[]> => {
            const results: any[] = [];
            for (let i = 0; i < ids.length; i += BATCH_SIZE_COORD) {
              const batch = ids.slice(i, i + BATCH_SIZE_COORD);
              const { data } = await analysisSupabase
                .from('prospectos')
                .select('id, coordinacion_id')
                .in('id', batch);
              if (data) results.push(...data);
            }
            return results;
          };
          
          const prospectosData = await loadProspectosBatch2(prospectoIds);

          const prospectosMap = new Map(
            (prospectosData || []).map(p => [p.id, p])
          );

          // Filtrar solo llamadas de prospectos que:
          // 1. Tienen coordinacion_id asignado (no null)
          // 2. El coordinacion_id está en la lista de coordinaciones del coordinador
          filteredCallsData = callsData.filter(call => {
            if (!call.prospecto) return false;
            const prospecto = prospectosMap.get(call.prospecto);
            return prospecto?.coordinacion_id && coordinacionesFilter.includes(prospecto.coordinacion_id);
          });
        } else {
          // Si no es admin, admin operativo, ejecutivo ni coordinador, no mostrar nada
          return [];
        }
      }

      if (filteredCallsData.length === 0) {
        return [];
      }

      const prospectoIds = [...new Set(filteredCallsData.map(call => call.prospecto))];

      // FIX: Cargar prospectos en batches para evitar error 400 por URL muy larga
      const BATCH_SIZE_FINAL = 100;
      const loadProspectosFinalBatch = async (ids: string[]): Promise<any[]> => {
        const results: any[] = [];
        for (let i = 0; i < ids.length; i += BATCH_SIZE_FINAL) {
          const batch = ids.slice(i, i + BATCH_SIZE_FINAL);
          const { data, error } = await analysisSupabase
            .from('prospectos')
            .select(`
              id,
              nombre_completo,
              nombre_whatsapp,
              whatsapp,
              email,
              ejecutivo_id,
              coordinacion_id
            `)
            .in('id', batch);
          if (!error && data) {
            results.push(...data);
          } else if (error) {
            console.error(`Error en batch ${i / BATCH_SIZE_FINAL + 1}:`, error);
          }
        }
        return results;
      };

      const prospectosData = await loadProspectosFinalBatch(prospectoIds);

      if (prospectosData.length === 0 && prospectoIds.length > 0) {
        console.error('Error obteniendo prospectos: no se cargaron datos');
      }

      const prospectosMap = new Map(
        (prospectosData || []).map(p => [p.id, p])
      );

      const allCoordinacionIds = [...new Set(
        (prospectosData || [])
          .map(p => p.coordinacion_id)
          .filter((id): id is string => !!id)
      )];

      let coordinacionesMap = new Map<string, { nombre: string, codigo: string }>();
      if (allCoordinacionIds.length > 0) {
        const coords = await coordinacionService.getCoordinacionesByIds(allCoordinacionIds);
        coords.forEach(c => coordinacionesMap.set(c.id, { nombre: c.nombre, codigo: c.codigo }));
      }

      const allEjecutivoIds = [...new Set(
        (prospectosData || [])
          .map(p => p.ejecutivo_id)
          .filter((id): id is string => !!id)
      )];

      let ejecutivosMap = new Map<string, string>();
      if (allEjecutivoIds.length > 0) {
        try {
          const { data: ejecutivosData, error: ejecutivosError } = await supabaseSystemUI
            .from('auth_users')
            .select('id, full_name')
            .in('id', allEjecutivoIds);

          if (ejecutivosError) {
            console.warn('Error obteniendo ejecutivos:', ejecutivosError);
          } else if (ejecutivosData) {
            ejecutivosMap = new Map(
              ejecutivosData.map((e: any) => [e.id, e.full_name])
            );
          }
        } catch (e) {
          console.error('Error fetching ejecutivos from SystemUI:', e);
        }
      }

      const enrichedCalls: ScheduledCall[] = filteredCallsData
        .map(call => {
          const prospecto = prospectosMap.get(call.prospecto);
          if (!prospecto) return null;

          const coordinacion = prospecto.coordinacion_id ? coordinacionesMap.get(prospecto.coordinacion_id) : undefined;
          const ejecutivo_nombre = prospecto.ejecutivo_id ? ejecutivosMap.get(prospecto.ejecutivo_id) : undefined;

          return {
            ...call,
            prospecto_nombre: prospecto.nombre_completo || prospecto.nombre_whatsapp,
            prospecto_whatsapp: prospecto.whatsapp,
            prospecto_email: prospecto.email,
            ejecutivo_id: prospecto.ejecutivo_id,
            coordinacion_id: prospecto.coordinacion_id,
            ejecutivo_nombre: ejecutivo_nombre,
            coordinacion_nombre: coordinacion?.nombre,
            coordinacion_codigo: coordinacion?.codigo,
          };
        })
        .filter((call): call is ScheduledCall => call !== null);

      // Aplicar filtro de búsqueda por texto
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        return enrichedCalls.filter(call =>
          call.prospecto_nombre?.toLowerCase().includes(searchTerm) ||
          call.prospecto_whatsapp?.toLowerCase().includes(searchTerm) ||
          call.justificacion_llamada?.toLowerCase().includes(searchTerm) ||
          call.ejecutivo_nombre?.toLowerCase().includes(searchTerm) ||
          call.coordinacion_nombre?.toLowerCase().includes(searchTerm)
        );
      }

      return enrichedCalls;
    } catch (error) {
      console.error('Error en getScheduledCalls:', error);
      return [];
    }
  }

  async deleteScheduledCall(
    callId: string,
    callData: {
      prospecto_id: string;
      user_id: string | null;
      justificacion?: string;
      fecha_programada: string;
      customer_phone?: string;
      customer_name?: string;
      conversation_id?: string;
    }
  ): Promise<boolean> {
    try {
      // Construir payload para DELETE (mismo formato que UPDATE)
      const payload: any = {
        action: 'DELETE',
        prospecto_id: callData.prospecto_id,
        user_id: callData.user_id,
        justificacion: callData.justificacion || 'Mejor momento de llamada',
        scheduled_timestamp: callData.fecha_programada,
        schedule_type: 'scheduled', // Siempre 'scheduled' para DELETE
        customer_phone: callData.customer_phone,
        customer_name: callData.customer_name,
        conversation_id: callData.conversation_id,
        llamada_programada_id: callId // ID de la llamada a eliminar
      };

      // Crear AbortController para timeout de 15 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        // Usar Edge Function en lugar de webhook directo
        const edgeFunctionUrl = `${import.meta.env.VITE_EDGE_FUNCTIONS_URL}/functions/v1/trigger-manual-proxy`;
        
        // Obtener JWT del usuario autenticado
        const { data: { session } } = await analysisSupabase.auth.getSession();
        const authToken = session?.access_token || import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;
        
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Error desconocido');
          throw new Error(`Error ${response.status}: ${errorText}`);
        }

        // Éxito
        await response.json().catch(() => ({}));
        return true;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Timeout: El webhook no respondió en 15 segundos');
        }
        
        throw fetchError;
      }
    } catch (error) {
      throw error;
    }
  }
}

export const scheduledCallsService = new ScheduledCallsService();

