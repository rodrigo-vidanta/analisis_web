/**
 * Servicio para gestionar llamadas programadas
 * Filtra según permisos de usuario (admin, coordinador, ejecutivo)
 */

import { analysisSupabase } from '../config/analysisSupabase';
import { supabaseSystemUI } from '../config/supabaseSystemUI';
import { permissionsService } from './permissionsService';
import { coordinacionService } from './coordinacionService';

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
      const isAdmin = await permissionsService.isAdmin(userId);

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

      const prospectoIds = [...new Set(callsData.map(call => call.prospecto))];

      const { data: prospectosData, error: prospectosError } = await analysisSupabase
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
        .in('id', prospectoIds);

      if (prospectosError) {
        console.error('Error obteniendo prospectos:', prospectosError);
        throw prospectosError;
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

      const enrichedCalls: ScheduledCall[] = callsData
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

      // Aplicar filtros de permisos
      const filteredByPermissions = enrichedCalls.filter(call => {
        if (isAdmin) return true;
        if (ejecutivoFilter && call.ejecutivo_id === ejecutivoFilter) return true;
        if (coordinacionesFilter && call.coordinacion_id && coordinacionesFilter.includes(call.coordinacion_id)) return true;
        return false;
      });

      // Aplicar filtro de búsqueda por texto
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        return filteredByPermissions.filter(call =>
          call.prospecto_nombre?.toLowerCase().includes(searchTerm) ||
          call.prospecto_whatsapp?.toLowerCase().includes(searchTerm) ||
          call.justificacion_llamada?.toLowerCase().includes(searchTerm) ||
          call.ejecutivo_nombre?.toLowerCase().includes(searchTerm) ||
          call.coordinacion_nombre?.toLowerCase().includes(searchTerm)
        );
      }

      return filteredByPermissions;
    } catch (error) {
      console.error('Error en getScheduledCalls:', error);
      return [];
    }
  }
}

export const scheduledCallsService = new ScheduledCallsService();

