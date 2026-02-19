/**
 * ============================================
 * SERVICIO DE COORDINACIONES
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Este servicio gestiona coordinaciones y asignaciones de prospectos
 * 2. Todas las operaciones se realizan en PQNC_AI (glsmifhkoaifvaegsozd.supabase.co)
 *    - MIGRADO desde System_UI el 2025-01-13
 *    - supabaseSystemUI ahora apunta a PQNC_AI
 * 3. Cualquier cambio debe documentarse en docs/ROLES_PERMISOS_README.md
 *
 * ⚠️ TABLAS DE COORDINACIONES DE USUARIOS (2026-01-14):
 * - ✅ USAR: auth_user_coordinaciones (única fuente de verdad)
 * - ❌ NO USAR: coordinador_coordinaciones (VIEW eliminada)
 * - ❌ NO USAR: coordinador_coordinaciones_legacy (solo backup histórico)
 * 
 * REFACTOR 2026-01-22: Uso de authAdminProxyService centralizado
 */

import { supabaseSystemUI } from '../config/supabaseSystemUI';
import { authAdminProxyService } from './authAdminProxyService';

// ============================================
// INTERFACES Y TIPOS
// ============================================

export interface Coordinacion {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  archivado: boolean; // Borrado lógico: true = archivada, false = existe
  is_operativo: boolean; // Estado operativo: true = recibe asignaciones, false = pausada
  created_at: string;
  updated_at: string;
}

export interface ProspectAssignment {
  id: string;
  prospect_id: string;
  coordinacion_id: string;
  ejecutivo_id?: string;
  assigned_at: string;
  assigned_by?: string;
  assignment_type: 'automatic' | 'manual';
  assignment_reason?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoordinacionStatistics {
  coordinacion_id: string;
  ejecutivo_id?: string;
  stat_date: string;
  prospects_assigned_count: number;
  calls_assigned_count: number;
  conversations_assigned_count: number;
  last_assignment_time?: string;
}

export interface Ejecutivo {
  id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  coordinacion_id: string;
  coordinacion_codigo?: string;
  coordinacion_nombre?: string;
  is_active: boolean;
  is_operativo?: boolean | null; // Indica si el ejecutivo está operativo
  id_dynamics?: string | null; // ID de Dynamics CRM
  email_verified: boolean;
  last_login?: string;
  created_at: string;
  role_name?: string; // Rol del usuario (ejecutivo, supervisor, coordinador)
  is_coordinator?: boolean; // Indica si es coordinador (para diferenciar de ejecutivos)
  is_supervisor?: boolean; // Indica si es supervisor
}

// ============================================
// SERVICIO PRINCIPAL
// ============================================

class CoordinacionService {
  
  // ============================================
  // GESTIÓN DE COORDINACIONES
  // ============================================

  /**
   * Obtiene todas las coordinaciones no archivadas
   */
  async getCoordinaciones(): Promise<Coordinacion[]> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('coordinaciones')
        .select('*')
        .eq('archivado', false)
        .order('codigo');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error obteniendo coordinaciones:', error);
      throw error;
    }
  }

  /**
   * Obtiene coordinaciones operativas para asignación de prospectos
   */
  async getCoordinacionesParaAsignacion(): Promise<Coordinacion[]> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('coordinaciones')
        .select('*')
        .eq('archivado', false)
        .eq('is_operativo', true)
        .order('codigo');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error obteniendo coordinaciones para asignación:', error);
      throw error;
    }
  }

  /**
   * Obtiene una coordinación por ID
   */
  async getCoordinacionById(id: string): Promise<Coordinacion | null> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('coordinaciones')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error obteniendo coordinación:', error);
      return null;
    }
  }

  /**
   * Obtiene una coordinación por código
   */
  async getCoordinacionByCodigo(codigo: string): Promise<Coordinacion | null> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('coordinaciones')
        .select('*')
        .eq('codigo', codigo)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error obteniendo coordinación por código:', error);
      return null;
    }
  }

  /**
   * Crea una nueva coordinación
   */
  async createCoordinacion(coordinacionData: {
    codigo: string;
    nombre: string;
    descripcion?: string;
    archivado?: boolean;
    is_operativo?: boolean;
  }): Promise<Coordinacion> {
    try {
      const insertData = {
        codigo: coordinacionData.codigo,
        nombre: coordinacionData.nombre,
        descripcion: coordinacionData.descripcion || null,
        archivado: coordinacionData.archivado !== undefined ? coordinacionData.archivado : false,
        is_operativo: coordinacionData.is_operativo !== undefined ? coordinacionData.is_operativo : true,
      };

      const { data, error } = await supabaseSystemUI
        .from('coordinaciones')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error creando coordinación:', error);
      if (error.code === '23505') {
        throw new Error('Ya existe una coordinación con ese código');
      }
      throw error;
    }
  }

  /**
   * Actualiza una coordinación existente
   */
  async updateCoordinacion(
    coordinacionId: string,
    updates: {
      codigo?: string;
      nombre?: string;
      descripcion?: string;
      archivado?: boolean;
      is_operativo?: boolean;
    }
  ): Promise<Coordinacion> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.codigo !== undefined) updateData.codigo = updates.codigo;
      if (updates.nombre !== undefined) updateData.nombre = updates.nombre;
      if (updates.descripcion !== undefined) updateData.descripcion = updates.descripcion || null;
      if (updates.archivado !== undefined) updateData.archivado = updates.archivado;
      if (updates.is_operativo !== undefined) updateData.is_operativo = updates.is_operativo;

      // Intentar usar función RPC segura primero
      try {
        const { data: rpcData, error: rpcError } = await supabaseSystemUI.rpc('update_coordinacion_safe', {
          p_id: coordinacionId,
          p_codigo: updates.codigo || null,
          p_nombre: updates.nombre || null,
          p_descripcion: updates.descripcion || null,
          p_archivado: updates.archivado !== undefined ? updates.archivado : null,
          p_is_operativo: updates.is_operativo !== undefined ? updates.is_operativo : null,
        });

        if (!rpcError && rpcData) {
          return rpcData as Coordinacion;
        }
      } catch (rpcErr) {
        console.warn('RPC no disponible, usando método directo:', rpcErr);
      }

      // Fallback: método directo
      const { data, error } = await supabaseSystemUI
        .from('coordinaciones')
        .update(updateData)
        .eq('id', coordinacionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error actualizando coordinación:', error);
      if (error.code === '23505') {
        throw new Error('Ya existe una coordinación con ese código');
      }
      throw error;
    }
  }

  /**
   * Elimina una coordinación (solo si no tiene ejecutivos asignados)
   */
  async deleteCoordinacion(coordinacionId: string): Promise<void> {
    try {
      // Verificar que no tenga ejecutivos asignados
      const { count, error: countError } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select('*', { count: 'exact', head: true })
        .eq('coordinacion_id', coordinacionId)
        .eq('auth_roles.name', 'ejecutivo');

      if (countError) throw countError;

      if (count && count > 0) {
        throw new Error('No se puede eliminar una coordinación con ejecutivos asignados');
      }

      const { error } = await supabaseSystemUI
        .from('coordinaciones')
        .delete()
        .eq('id', coordinacionId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error eliminando coordinación:', error);
      throw error;
    }
  }

  /**
   * Archiva una coordinación y reasigna todos sus ejecutivos y coordinadores
   */
  async archivarCoordinacionYReasignar(
    coordinacionId: string,
    nuevaCoordinacionId: string,
    usuarioId: string
  ): Promise<{
    success: boolean;
    ejecutivos_reasignados: number;
    coordinadores_reasignados: number;
    error?: string;
  }> {
    try {
      const { data, error } = await supabaseSystemUI.rpc('archivar_coordinacion_y_reasignar', {
        p_coordinacion_id: coordinacionId,
        p_nueva_coordinacion_id: nuevaCoordinacionId,
        p_usuario_id: usuarioId,
      });

      if (error) throw error;
      
      if (data && !data.success) {
        throw new Error(data.error || 'Error al archivar coordinación');
      }

      return {
        success: data?.success || false,
        ejecutivos_reasignados: data?.ejecutivos_reasignados || 0,
        coordinadores_reasignados: data?.coordinadores_reasignados || 0,
      };
    } catch (error: any) {
      console.error('Error archivando coordinación:', error);
      throw error;
    }
  }

  /**
   * Obtiene ejecutivos y coordinadores de una coordinación (para modal de reasignación)
   */
  async getUsuariosParaReasignacion(coordinacionId: string): Promise<{
    ejecutivos: Ejecutivo[];
    coordinadores: Ejecutivo[];
  }> {
    try {
      // Obtener ejecutivos
      const ejecutivos = await this.getEjecutivosByCoordinacion(coordinacionId);

      // Obtener coordinadores
      const coordinadores = await this.getCoordinadoresByCoordinacion(coordinacionId);

      return {
        ejecutivos,
        coordinadores,
      };
    } catch (error) {
      console.error('Error obteniendo usuarios para reasignación:', error);
      throw error;
    }
  }

  // ============================================
  // GESTIÓN DE EJECUTIVOS
  // ============================================

  /**
   * Obtiene todos los usuarios asignables de una coordinación (ejecutivos, coordinadores, supervisores)
   * 
   * @param coordinacionId ID de la coordinación
   * @returns Lista de usuarios activos de la coordinación con roles asignables
   */
  async getEjecutivosByCoordinacion(coordinacionId: string): Promise<Ejecutivo[]> {
    try {
      // Usar user_profiles_v2 (vista segura sin password_hash)
      // NOTA: user_profiles_v2 YA incluye role_name, no necesita JOIN
      // Incluir ejecutivos, coordinadores y supervisores
      const { data, error } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select(`
          id,
          email,
          full_name,
          first_name,
          last_name,
          phone,
          coordinacion_id,
          is_active,
          is_operativo,
          id_dynamics,
          email_verified,
          last_login,
          created_at,
          role_name
        `)
        .eq('coordinacion_id', coordinacionId)
        .in('role_name', ['ejecutivo', 'coordinador', 'supervisor'])
        .eq('is_active', true)
        .order('full_name');

      if (error) {
        console.error('Error obteniendo ejecutivos:', error);
        throw error;
      }

      // Transformar datos para incluir información de coordinación
      return (data || []).map((user: any) => {
        const coordinacion = Array.isArray(user.coordinaciones) 
          ? user.coordinaciones[0] 
          : user.coordinaciones;
        
        return {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          coordinacion_id: user.coordinacion_id,
          coordinacion_codigo: coordinacion?.codigo,
          coordinacion_nombre: coordinacion?.nombre,
          is_active: user.is_active,
          is_operativo: user.is_operativo,
          id_dynamics: user.id_dynamics,
          email_verified: user.email_verified,
          last_login: user.last_login,
          created_at: user.created_at,
          role_name: user.role_name,
        };
      });
    } catch (error) {
      console.error('❌ [coordinacionService] Error obteniendo ejecutivos:', error);
      throw error;
    }
  }

  /**
   * OPTIMIZACIÓN: Obtiene múltiples coordinaciones en batch
   * NOTA: Incluye coordinaciones archivadas para mostrar historial correctamente
   */
  async getCoordinacionesByIds(ids: string[]): Promise<Map<string, Coordinacion>> {
    try {
      if (ids.length === 0) return new Map();

      const { data, error } = await supabaseSystemUI
        .from('coordinaciones')
        .select('*')
        .in('id', ids);

      if (error) throw error;

      const map = new Map<string, Coordinacion>();
      (data || []).forEach((coord: any) => {
        map.set(coord.id, coord);
      });

      return map;
    } catch (error) {
      console.error('Error obteniendo coordinaciones en batch:', error);
      return new Map();
    }
  }

  /**
   * OPTIMIZACIÓN: Obtiene múltiples usuarios en batch para visualización histórica
   * ============================================
   * CORRECCIÓN 2026-01-24: SIN FILTROS RESTRICTIVOS
   * ============================================
   * Para registros históricos, se deben mostrar TODOS los usuarios asignados
   * independientemente de su rol actual o estado activo/inactivo.
   * Esto permite ver el historial completo de asignaciones.
   * 
   * Los permisos de acceso a prospectos se manejan en otro nivel (filtro de prospectos).
   */
  async getEjecutivosByIds(ids: string[]): Promise<Map<string, Ejecutivo>> {
    try {
      if (ids.length === 0) return new Map();
      
      // Usar user_profiles_v2 (vista segura sin password_hash) que ya incluye role_name
      // SIN filtros de role_name ni is_active para permitir visualización histórica completa
      const { data, error } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select(`
          id,
          email,
          full_name,
          first_name,
          last_name,
          phone,
          coordinacion_id,
          is_active,
          is_operativo,
          email_verified,
          last_login,
          created_at,
          role_name
        `)
        .in('id', ids);

      if (error) {
        throw error;
      }

      const map = new Map<string, Ejecutivo>();
      (data || []).forEach((user: any) => {
        const coordinacion = Array.isArray(user.coordinaciones) 
          ? user.coordinaciones[0] 
          : user.coordinaciones;

        map.set(user.id, {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          coordinacion_id: user.coordinacion_id,
          coordinacion_codigo: coordinacion?.codigo,
          coordinacion_nombre: coordinacion?.nombre,
          is_active: user.is_active,
          is_operativo: user.is_operativo,
          email_verified: user.email_verified,
          last_login: user.last_login,
          created_at: user.created_at,
        });
      });

      return map;
    } catch (error) {
      console.error('Error obteniendo ejecutivos en batch:', error);
      return new Map();
    }
  }

  /**
   * Obtiene un ejecutivo por ID
   */
  async getEjecutivoById(ejecutivoId: string): Promise<Ejecutivo | null> {
    try {
      // Usar user_profiles_v2 que ya tiene role_name incluido
      const { data, error } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select(`
          id,
          email,
          full_name,
          first_name,
          last_name,
          phone,
          coordinacion_id,
          is_active,
          is_operativo,
          id_dynamics,
          email_verified,
          last_login,
          created_at,
          role_name
        `)
        .eq('id', ejecutivoId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error en getEjecutivoById:', error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        coordinacion_id: data.coordinacion_id,
        coordinacion_codigo: null,
        coordinacion_nombre: null,
        is_active: data.is_active,
        is_operativo: data.is_operativo,
        id_dynamics: data.id_dynamics,
        email_verified: data.email_verified,
        last_login: data.last_login,
        created_at: data.created_at,
      };
    } catch (error) {
      console.error('Error obteniendo ejecutivo:', error);
      return null;
    }
  }

  /**
   * Obtiene todos los supervisores de una coordinación específica
   * IMPORTANTE: Solo obtiene supervisores que están asignados a esta coordinación específica
   * a través de la tabla auth_user_coordinaciones (única fuente de verdad)
   * 
   * ⚠️ MIGRACIÓN 2026-01-14: VIEW coordinador_coordinaciones ELIMINADA
   * Usar SIEMPRE auth_user_coordinaciones
   */
  async getSupervisoresByCoordinacion(coordinacionId: string): Promise<Ejecutivo[]> {
    try {
      // Primero obtener la coordinación para tener su información
      const coordinacion = await this.getCoordinacionById(coordinacionId);
      
      // ============================================
      // CORRECCIÓN 2026-01-14: Eliminar JOIN inválido con auth_roles
      // ============================================
      // La tabla auth_user_coordinaciones NO tiene FK a auth_roles.
      // Solo tiene FK a auth_users y coordinaciones.
      // ============================================
      const { data: supervisorCoordinaciones, error: scError } = await supabaseSystemUI
        .from('auth_user_coordinaciones')
        .select(`
          user_id,
          coordinacion_id
        `)
        .eq('coordinacion_id', coordinacionId);

      if (scError) {
        throw scError;
      }

      if (!supervisorCoordinaciones || supervisorCoordinaciones.length === 0) {
        return [];
      }

      // Extraer IDs de supervisores potenciales
      const potentialSupervisorIds = supervisorCoordinaciones
        .map(sc => sc.user_id)
        .filter((id): id is string => id !== null && id !== undefined);

      if (potentialSupervisorIds.length === 0) {
        return [];
      }

      // Obtener datos de usuarios que son SUPERVISORES (role_name = 'supervisor')
      // user_profiles_v2 ya incluye role_name directamente
      const { data: usersData, error: usersError } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select(`
          id,
          email,
          full_name,
          first_name,
          last_name,
          phone,
          coordinacion_id,
          is_active,
          is_operativo,
          id_dynamics,
          email_verified,
          last_login,
          created_at,
          role_id,
          role_name
        `)
        .in('id', potentialSupervisorIds)
        .eq('is_active', true)
        .order('full_name');

      if (usersError) {
        throw usersError;
      }

      // Filtrar solo usuarios con rol 'supervisor'
      const supervisores = (usersData || [])
        .filter((user: any) => {
          // Verificar que el usuario es supervisor (role_name ya está en la vista)
          if (user.role_name !== 'supervisor') {
            return false;
          }

          // Verificar que el usuario realmente pertenece a esta coordinación específica
          const relacion = supervisorCoordinaciones.find(sc => 
            sc.user_id === user.id && 
            sc.coordinacion_id === coordinacionId
          );
          
          return !!relacion;
        })
        .map((user: any) => {
          const relacion = supervisorCoordinaciones.find(sc => 
            sc.user_id === user.id && 
            sc.coordinacion_id === coordinacionId
          );
          
          const coordinacionData = relacion?.coordinaciones;
          const coordInfo = Array.isArray(coordinacionData) 
            ? coordinacionData[0] 
            : coordinacionData;
          
          return {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            first_name: user.first_name,
            last_name: user.last_name,
            phone: user.phone,
            coordinacion_id: coordinacionId,
            coordinacion_codigo: coordInfo?.codigo || coordinacion?.codigo,
            coordinacion_nombre: coordInfo?.nombre || coordinacion?.nombre,
            is_active: user.is_active,
            is_operativo: user.is_operativo,
            id_dynamics: user.id_dynamics,
            email_verified: user.email_verified,
            last_login: user.last_login,
            created_at: user.created_at,
            is_supervisor: true, // Marca para identificar supervisores
          };
        });
      
      return supervisores;
    } catch (error) {
      console.error('Error obteniendo supervisores:', error);
      return []; // Retornar array vacío en lugar de throw para no romper el flujo
    }
  }

  /**
   * Obtiene todos los coordinadores de una coordinación específica
   * IMPORTANTE: Solo obtiene coordinadores que están asignados a esta coordinación específica
   * a través de la tabla auth_user_coordinaciones (única fuente de verdad)
   * 
   * ⚠️ MIGRACIÓN 2026-01-14: VIEW coordinador_coordinaciones ELIMINADA
   * Usar SIEMPRE auth_user_coordinaciones
   */
  async getCoordinadoresByCoordinacion(coordinacionId: string): Promise<Ejecutivo[]> {
    try {
      // Primero obtener la coordinación para tener su información
      const coordinacion = await this.getCoordinacionById(coordinacionId);
      
      // ============================================
      // CORRECCIÓN 2026-01-14: Eliminar JOIN inválido con auth_roles
      // ============================================
      // La tabla auth_user_coordinaciones NO tiene FK a auth_roles.
      // Solo tiene FK a auth_users y coordinaciones.
      // ============================================
      const { data: coordinadorCoordinaciones, error: ccError } = await supabaseSystemUI
        .from('auth_user_coordinaciones')
        .select(`
          user_id,
          coordinacion_id
        `)
        .eq('coordinacion_id', coordinacionId);

      if (ccError) {
        throw ccError;
      }

      if (!coordinadorCoordinaciones || coordinadorCoordinaciones.length === 0) {
        return [];
      }

      // Extraer IDs de coordinadores (solo los que están en esta coordinación específica)
      const coordinadorIds = coordinadorCoordinaciones
        .map(cc => cc.user_id)
        .filter((id): id is string => id !== null && id !== undefined);

      if (coordinadorIds.length === 0) {
        return [];
      }

      // Obtener datos de los coordinadores (solo los que están en la lista)
      // IMPORTANTE: Solo obtener coordinadores que están en auth_user_coordinaciones para esta coordinación específica
      const { data: usersData, error: usersError } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select(`
          id,
          email,
          full_name,
          first_name,
          last_name,
          phone,
          coordinacion_id,
          is_active,
          is_operativo,
          id_dynamics,
          email_verified,
          last_login,
          created_at
        `)
        .in('id', coordinadorIds) // Solo los IDs que pertenecen a esta coordinación específica
        .eq('is_coordinator', true)
        .eq('is_active', true)
        .order('full_name');

      if (usersError) {
        throw usersError;
      }

      // Transformar datos para incluir información de coordinación
      // CRÍTICO: Solo incluir coordinadores que tienen relación en auth_user_coordinaciones para esta coordinación específica
      const resultado = (usersData || [])
        .filter((user: any) => {
          // Verificar que el usuario realmente pertenece a esta coordinación específica
          const relacion = coordinadorCoordinaciones.find(cc => 
            cc.user_id === user.id && 
            cc.coordinacion_id === coordinacionId
          );
          
          if (!relacion) {
            return false;
          }
          
          // Verificar adicionalmente que la relación es para esta coordinación específica
          if (relacion.coordinacion_id !== coordinacionId) {
            return false;
          }
          
          return true;
        })
        .map((user: any) => {
          const relacion = coordinadorCoordinaciones.find(cc => 
            cc.user_id === user.id && 
            cc.coordinacion_id === coordinacionId
          );
          
          const coordinacionData = relacion?.coordinaciones;
          const coordInfo = Array.isArray(coordinacionData) 
            ? coordinacionData[0] 
            : coordinacionData;
          
          return {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            first_name: user.first_name,
            last_name: user.last_name,
            phone: user.phone,
            coordinacion_id: coordinacionId, // Usar la coordinación filtrada
            coordinacion_codigo: coordInfo?.codigo || coordinacion?.codigo,
            coordinacion_nombre: coordInfo?.nombre || coordinacion?.nombre,
            is_active: user.is_active,
            is_operativo: user.is_operativo,
            id_dynamics: user.id_dynamics,
            email_verified: user.email_verified,
            last_login: user.last_login,
            created_at: user.created_at,
          };
        });
      
      return resultado;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtiene todos los coordinadores activos de todas las coordinaciones
   * Útil para administradores que necesitan asignar a coordinadores
   */
  async getAllCoordinadores(): Promise<Ejecutivo[]> {
    try {
      // ============================================
      // CORRECCIÓN 2026-01-14: Eliminar JOIN inválido con auth_roles
      // ============================================
      // La tabla auth_user_coordinaciones NO tiene FK a auth_roles.
      // Solo tiene FK a auth_users y coordinaciones.
      // El rol se determina via auth_users.is_coordinator o auth_users.role_id
      // ============================================
      const { data: coordinadorCoordinaciones, error: ccError } = await supabaseSystemUI
        .from('auth_user_coordinaciones')
        .select(`
          user_id,
          coordinacion_id,
          coordinaciones(codigo, nombre)
        `);

      let coordinadores: Ejecutivo[] = [];

      if (!ccError && coordinadorCoordinaciones && coordinadorCoordinaciones.length > 0) {
        // Usar auth_user_coordinaciones si existe y tiene datos
        const coordinadorIds = coordinadorCoordinaciones
          .map(cc => cc.user_id)
          .filter((id): id is string => id !== null && id !== undefined);

        if (coordinadorIds.length > 0) {
          const { data: usersData, error: usersError } = await supabaseSystemUI
            .from('user_profiles_v2')
            .select(`
              id,
              email,
              full_name,
              first_name,
              last_name,
              phone,
              coordinacion_id,
              is_active,
              is_operativo,
              id_dynamics,
              email_verified,
              last_login,
              created_at
            `)
            .in('id', coordinadorIds)
            .eq('is_coordinator', true)
            .eq('is_active', true)
            .order('full_name');

          if (!usersError && usersData) {
            coordinadores = usersData.map((user: any) => {
              // Encontrar la relación para obtener la coordinación
              const relacion = coordinadorCoordinaciones.find(cc => cc.user_id === user.id);
              const coordinacionData = relacion?.coordinaciones;
              const coordInfo = Array.isArray(coordinacionData) 
                ? coordinacionData[0] 
                : coordinacionData;

              return {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                first_name: user.first_name,
                last_name: user.last_name,
                phone: user.phone,
                coordinacion_id: relacion?.coordinacion_id || user.coordinacion_id,
                coordinacion_codigo: coordInfo?.codigo,
                coordinacion_nombre: coordInfo?.nombre,
                is_active: user.is_active,
                is_operativo: user.is_operativo,
                id_dynamics: user.id_dynamics,
                email_verified: user.email_verified,
                last_login: user.last_login,
                created_at: user.created_at,
              };
            });
          }
        }
      } else {
        // Fallback: obtener coordinadores directamente de auth_users donde tienen coordinacion_id
        const { data: usersData, error: usersError } = await supabaseSystemUI
          .from('user_profiles_v2')
          .select(`
            id,
            email,
            full_name,
            first_name,
            last_name,
            phone,
            coordinacion_id,
            is_active,
            is_operativo,
            id_dynamics,
            email_verified,
            last_login,
            created_at,
            coordinaciones:coordinacion_id (
              codigo,
              nombre
            )
          `)
          .eq('is_coordinator', true)
          .eq('is_active', true)
          .not('coordinacion_id', 'is', null)
          .order('full_name');

        if (!usersError && usersData) {
          coordinadores = usersData.map((user: any) => {
            const coordinacion = Array.isArray(user.coordinaciones) 
              ? user.coordinaciones[0] 
              : user.coordinaciones;

            return {
              id: user.id,
              email: user.email,
              full_name: user.full_name,
              first_name: user.first_name,
              last_name: user.last_name,
              phone: user.phone,
              coordinacion_id: user.coordinacion_id,
              coordinacion_codigo: coordinacion?.codigo,
              coordinacion_nombre: coordinacion?.nombre,
              is_active: user.is_active,
              is_operativo: user.is_operativo,
              id_dynamics: user.id_dynamics,
              email_verified: user.email_verified,
              last_login: user.last_login,
              created_at: user.created_at,
            };
          });
        }
      }

      return coordinadores;
    } catch (error) {
      console.error('Error obteniendo todos los coordinadores:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los usuarios asignables (ejecutivos, coordinadores y supervisores)
   * Útil para filtros de asignación donde cualquiera de estos roles puede tener prospectos
   * 
   * @returns Lista de usuarios con roles: ejecutivo, coordinador, supervisor
   */
  async getAllEjecutivos(): Promise<Ejecutivo[]> {
    try {
      // Usar user_profiles_v2 que ya tiene role_name incluido
      // Incluir ejecutivos, coordinadores y supervisores (todos pueden tener prospectos asignados)
      const { data, error } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select(`
          id,
          email,
          full_name,
          first_name,
          last_name,
          phone,
          coordinacion_id,
          is_active,
          email_verified,
          last_login,
          created_at,
          role_name
        `)
        .in('role_name', ['ejecutivo', 'coordinador', 'supervisor'])
        .order('full_name');

      if (error) throw error;

      // Transformar datos para incluir información de coordinación
      return (data || []).map((user: any) => {
        return {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          coordinacion_id: user.coordinacion_id,
          coordinacion_codigo: null, // Se puede cargar aparte si es necesario
          coordinacion_nombre: null,
          is_active: user.is_active,
          email_verified: user.email_verified,
          last_login: user.last_login,
          created_at: user.created_at,
        };
      });
    } catch (error) {
      console.error('Error obteniendo todos los ejecutivos:', error);
      throw error;
    }
  }

  /**
   * Asigna un ejecutivo a una coordinación (o lo libera si coordinacionId es null)
   */
  async assignEjecutivoToCoordinacion(
    ejecutivoId: string,
    coordinacionId: string | null,
    assignedBy: string
  ): Promise<void> {
    try {
      // Usar servicio centralizado para actualizar coordinacion_id
      const success = await authAdminProxyService.updateUserMetadata(ejecutivoId, {
        coordinacion_id: coordinacionId,
        updated_at: new Date().toISOString()
      });
      
      if (!success) {
        throw new Error('Error al actualizar coordinación');
      }

      // Registrar en logs si existe la tabla
      try {
        await supabaseSystemUI.from('assignment_logs').insert({
          ejecutivo_id: ejecutivoId,
          coordinacion_id: coordinacionId,
          action: coordinacionId ? 'assigned' : 'unassigned',
          assigned_by: assignedBy,
          reason: coordinacionId 
            ? `Ejecutivo asignado a coordinación por ${assignedBy}`
            : `Ejecutivo liberado de coordinación por ${assignedBy}`,
        });
      } catch (logError) {
        // Si falla el log, no es crítico
        console.warn('Error registrando en logs (no crítico):', logError);
      }
    } catch (error) {
      console.error('Error asignando ejecutivo a coordinación:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo ejecutivo usando Supabase Auth nativo
   */
  async createEjecutivo(
    coordinacionId: string,
    ejecutivoData: {
      email: string;
      password_hash?: string;
      password?: string; // Contraseña en texto plano
      full_name: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
    }
  ): Promise<Ejecutivo> {
    try {
      // Obtener rol de ejecutivo
      const { data: ejecutivoRole, error: roleError } = await supabaseSystemUI
        .from('auth_roles')
        .select('id')
        .eq('name', 'ejecutivo')
        .single();

      if (roleError || !ejecutivoRole) {
        throw new Error('Rol de ejecutivo no encontrado');
      }

      // ============================================
      // CREAR USUARIO EN SUPABASE AUTH NATIVO
      // ============================================
      const edgeFunctionsUrl = import.meta.env.VITE_EDGE_FUNCTIONS_URL;
      const anonKey = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;
      
      // Contraseña por defecto que cumple la política de seguridad
      const passwordToUse = ejecutivoData.password || 'PqncAdmin$2026';
      const firstName = ejecutivoData.first_name || ejecutivoData.full_name.split(' ')[0] || '';
      const lastName = ejecutivoData.last_name || ejecutivoData.full_name.split(' ').slice(1).join(' ') || '';
      const fullName = `${firstName} ${lastName}`.trim();

      const response = await fetch(`${edgeFunctionsUrl}/functions/v1/auth-admin-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          operation: 'createUser',
          params: {
            email: ejecutivoData.email.trim().toLowerCase(),
            password: passwordToUse,
            fullName,
            roleId: ejecutivoRole.id,
            phone: ejecutivoData.phone || null,
            isActive: true,
            isCoordinator: false,
            isEjecutivo: true,
            coordinacionId
          }
        })
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        console.error('Error creating ejecutivo:', result);
        throw new Error(result.error || result.details?.join(', ') || 'Error al crear ejecutivo');
      }

      const userId = result.userId;

      if (!userId) {
        throw new Error('No se pudo obtener el ID del ejecutivo creado');
      }

      console.log(`✅ Ejecutivo creado en Supabase Auth: ${userId}`);

      // Asignar coordinación en tabla auxiliar
      const { error: coordError } = await supabaseSystemUI
        .from('auth_user_coordinaciones')
        .insert({
          user_id: userId,
          coordinacion_id: coordinacionId,
          assigned_by: null
        });

      if (coordError) {
        console.error('Error asignando coordinación:', coordError);
      }

      // Obtener el ejecutivo creado desde la vista user_profiles_v2
      const { data: newEjecutivo, error: fetchError } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      if (!newEjecutivo) {
        throw new Error('No se pudo obtener los datos del ejecutivo creado');
      }

      return {
        id: newEjecutivo.id,
        email: newEjecutivo.email,
        full_name: newEjecutivo.full_name,
        first_name: newEjecutivo.first_name,
        last_name: newEjecutivo.last_name,
        phone: newEjecutivo.phone,
        coordinacion_id: coordinacionId,
        is_active: newEjecutivo.is_active,
        email_verified: true, // Supabase Auth confirma automáticamente
        created_at: newEjecutivo.created_at,
      };
    } catch (error) {
      console.error('Error creando ejecutivo:', error);
      throw error;
    }
  }

  /**
   * Actualiza un ejecutivo
   */
  async updateEjecutivo(
    ejecutivoId: string,
    updates: {
      full_name?: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
      is_active?: boolean;
    }
  ): Promise<Ejecutivo> {
    try {
      // Usar servicio centralizado para actualizar ejecutivo
      const success = await authAdminProxyService.updateUserMetadata(ejecutivoId, updates);
      
      if (!success) {
        throw new Error('Error al actualizar ejecutivo');
      }
      
      // Recargar ejecutivo actualizado
      const { data, error } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select(`
          id,
          email,
          full_name,
          first_name,
          last_name,
          phone,
          coordinacion_id,
          is_active,
          email_verified,
          last_login,
          created_at
        `)
        .eq('id', ejecutivoId)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        coordinacion_id: data.coordinacion_id,
        is_active: data.is_active,
        email_verified: data.email_verified,
        last_login: data.last_login,
        created_at: data.created_at,
      };
    } catch (error) {
      console.error('Error actualizando ejecutivo:', error);
      throw error;
    }
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  /**
   * Obtiene estadísticas de una coordinación para el día actual
   */
  async getCoordinacionStatistics(
    coordinacionId: string,
    date?: string
  ): Promise<CoordinacionStatistics | null> {
    try {
      const statDate = date || new Date().toISOString().split('T')[0];

      const { data, error } = await supabaseSystemUI
        .from('coordinacion_statistics')
        .select('*')
        .eq('coordinacion_id', coordinacionId)
        .eq('ejecutivo_id', null)
        .eq('stat_date', statDate)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return null;
    }
  }

  /**
   * Obtiene estadísticas de un ejecutivo para el día actual
   */
  async getEjecutivoStatistics(
    ejecutivoId: string,
    date?: string
  ): Promise<CoordinacionStatistics | null> {
    try {
      const statDate = date || new Date().toISOString().split('T')[0];

      const { data, error } = await supabaseSystemUI
        .from('coordinacion_statistics')
        .select('*')
        .eq('ejecutivo_id', ejecutivoId)
        .eq('stat_date', statDate)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error obteniendo estadísticas de ejecutivo:', error);
      return null;
    }
  }
}

// Exportar instancia singleton
export const coordinacionService = new CoordinacionService();
export default coordinacionService;

