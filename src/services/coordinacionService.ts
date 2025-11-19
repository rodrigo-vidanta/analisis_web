/**
 * ============================================
 * SERVICIO DE COORDINACIONES
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Este servicio gestiona coordinaciones y asignaciones de prospectos
 * 2. Todas las operaciones se realizan en System_UI (zbylezfyagwrxoecioup.supabase.co)
 * 3. Las asignaciones se sincronizan con la base de análisis cuando es necesario
 * 4. Cualquier cambio debe documentarse en docs/ROLES_PERMISOS_README.md
 */

import { supabaseSystemUI, supabaseSystemUIAdmin } from '../config/supabaseSystemUI';

// ============================================
// INTERFACES Y TIPOS
// ============================================

export interface Coordinacion {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  is_active: boolean;
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
  email_verified: boolean;
  last_login?: string;
  created_at: string;
  is_coordinator?: boolean; // Indica si es coordinador (para diferenciar de ejecutivos)
}

// ============================================
// SERVICIO PRINCIPAL
// ============================================

class CoordinacionService {
  
  // ============================================
  // GESTIÓN DE COORDINACIONES
  // ============================================

  /**
   * Obtiene todas las coordinaciones activas
   */
  async getCoordinaciones(): Promise<Coordinacion[]> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('coordinaciones')
        .select('*')
        .eq('is_active', true)
        .order('codigo');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo coordinaciones:', error);
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
    is_active?: boolean;
  }): Promise<Coordinacion> {
    try {
      const { data, error } = await supabaseSystemUIAdmin
        .from('coordinaciones')
        .insert({
          codigo: coordinacionData.codigo,
          nombre: coordinacionData.nombre,
          descripcion: coordinacionData.descripcion || null,
          is_active: coordinacionData.is_active !== undefined ? coordinacionData.is_active : true,
        })
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
      is_active?: boolean;
    }
  ): Promise<Coordinacion> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.codigo !== undefined) updateData.codigo = updates.codigo;
      if (updates.nombre !== undefined) updateData.nombre = updates.nombre;
      if (updates.descripcion !== undefined) updateData.descripcion = updates.descripcion || null;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

      const { data, error } = await supabaseSystemUIAdmin
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
      const { count, error: countError } = await supabaseSystemUIAdmin
        .from('auth_users')
        .select('*', { count: 'exact', head: true })
        .eq('coordinacion_id', coordinacionId)
        .eq('is_ejecutivo', true);

      if (countError) throw countError;

      if (count && count > 0) {
        throw new Error('No se puede eliminar una coordinación con ejecutivos asignados');
      }

      const { error } = await supabaseSystemUIAdmin
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
   * Activa o desactiva una coordinación
   */
  async toggleCoordinacionActive(coordinacionId: string, isActive: boolean): Promise<Coordinacion> {
    try {
      const { data, error } = await supabaseSystemUIAdmin
        .from('coordinaciones')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', coordinacionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error cambiando estado de coordinación:', error);
      throw error;
    }
  }

  // ============================================
  // GESTIÓN DE EJECUTIVOS
  // ============================================

  /**
   * Obtiene todos los ejecutivos de una coordinación
   */
  async getEjecutivosByCoordinacion(coordinacionId: string): Promise<Ejecutivo[]> {
    try {
      // Consulta con filtro is_active
      const { data, error } = await supabaseSystemUI
        .from('auth_users')
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
          coordinaciones:coordinacion_id (
            codigo,
            nombre
          )
        `)
        .eq('coordinacion_id', coordinacionId)
        .eq('is_ejecutivo', true)
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
          email_verified: user.email_verified,
          last_login: user.last_login,
          created_at: user.created_at,
        };
      });
    } catch (error) {
      console.error('❌ [coordinacionService] Error obteniendo ejecutivos:', error);
      throw error;
    }
  }

  /**
   * OPTIMIZACIÓN: Obtiene múltiples coordinaciones en batch
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
      (data || []).forEach(coord => {
        map.set(coord.id, coord);
      });

      return map;
    } catch (error) {
      console.error('Error obteniendo coordinaciones en batch:', error);
      return new Map();
    }
  }

  /**
   * OPTIMIZACIÓN: Obtiene múltiples ejecutivos en batch
   */
  async getEjecutivosByIds(ids: string[]): Promise<Map<string, Ejecutivo>> {
    try {
      if (ids.length === 0) return new Map();

      const { data, error } = await supabaseSystemUI
        .from('auth_users')
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
          coordinaciones:coordinacion_id (
            codigo,
            nombre
          )
        `)
        .in('id', ids)
        .eq('is_ejecutivo', true);

      if (error) throw error;

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
      const { data, error } = await supabaseSystemUI
        .from('auth_users')
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
          coordinaciones:coordinacion_id (
            codigo,
            nombre
          )
        `)
        .eq('id', ejecutivoId)
        .single();

      if (error) throw error;

      if (!data) return null;

      const coordinacion = Array.isArray(data.coordinaciones) 
        ? data.coordinaciones[0] 
        : data.coordinaciones;

      return {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        coordinacion_id: data.coordinacion_id,
        coordinacion_codigo: coordinacion?.codigo,
        coordinacion_nombre: coordinacion?.nombre,
        is_active: data.is_active,
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
   * Obtiene todos los coordinadores de una coordinación específica
   * Útil para que coordinadores puedan asignarse entre sí
   */
  async getCoordinadoresByCoordinacion(coordinacionId: string): Promise<Ejecutivo[]> {
    try {
      console.log('🔍 [coordinacionService] Obteniendo coordinadores para coordinación:', coordinacionId);
      
      // Primero obtener la coordinación para tener su información
      const coordinacion = await this.getCoordinacionById(coordinacionId);
      console.log('✅ [coordinacionService] Coordinación encontrada:', coordinacion?.nombre);
      
      // Obtener coordinadores a través de la tabla intermedia
      const { data: coordinadorCoordinaciones, error: ccError } = await supabaseSystemUI
        .from('coordinador_coordinaciones')
        .select(`
          coordinador_id,
          coordinaciones:coordinacion_id (
            codigo,
            nombre
          )
        `)
        .eq('coordinacion_id', coordinacionId);

      if (ccError) {
        console.error('❌ [coordinacionService] Error obteniendo relaciones coordinador-coordinación:', ccError);
        throw ccError;
      }

      console.log('📊 [coordinacionService] Relaciones encontradas:', coordinadorCoordinaciones?.length || 0);

      if (!coordinadorCoordinaciones || coordinadorCoordinaciones.length === 0) {
        console.warn('⚠️ [coordinacionService] No se encontraron relaciones coordinador-coordinación');
        return [];
      }

      // Extraer IDs de coordinadores
      const coordinadorIds = coordinadorCoordinaciones.map(cc => cc.coordinador_id);
      console.log('👥 [coordinacionService] IDs de coordinadores:', coordinadorIds);

      // Obtener datos de los coordinadores
      const { data: usersData, error: usersError } = await supabaseSystemUI
        .from('auth_users')
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
        .in('id', coordinadorIds)
        .eq('is_coordinator', true)
        .eq('is_active', true)
        .order('full_name');

      if (usersError) {
        console.error('❌ [coordinacionService] Error obteniendo coordinadores:', usersError);
        throw usersError;
      }

      console.log('✅ [coordinacionService] Coordinadores encontrados:', usersData?.length || 0, usersData?.map(u => ({ id: u.id, name: u.full_name })));

      // Transformar datos para incluir información de coordinación
      const resultado = (usersData || []).map((user: any) => {
        const relacion = coordinadorCoordinaciones.find(cc => cc.coordinador_id === user.id);
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
          email_verified: user.email_verified,
          last_login: user.last_login,
          created_at: user.created_at,
        };
      });
      
      console.log('✅ [coordinacionService] Retornando', resultado.length, 'coordinadores');
      return resultado;
    } catch (error) {
      console.error('❌ [coordinacionService] Error obteniendo coordinadores:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los ejecutivos (asignados y sin asignación)
   * Útil para coordinadores que necesitan ver todos los ejecutivos disponibles
   */
  async getAllEjecutivos(): Promise<Ejecutivo[]> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('auth_users')
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
          coordinaciones:coordinacion_id (
            codigo,
            nombre
          )
        `)
        .eq('is_ejecutivo', true)
        .order('full_name');

      if (error) throw error;

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
      await supabaseSystemUIAdmin
        .from('auth_users')
        .update({
          coordinacion_id: coordinacionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ejecutivoId)
        .eq('is_ejecutivo', true);

      // Registrar en logs si existe la tabla
      try {
        await supabaseSystemUIAdmin.from('assignment_logs').insert({
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
   * Crea un nuevo ejecutivo
   */
  async createEjecutivo(
    coordinacionId: string,
    ejecutivoData: {
      email: string;
      password_hash?: string;
      password?: string; // Contraseña en texto plano (se hasheará en el backend)
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

      // Usar función RPC para crear usuario (maneja el hash de contraseña correctamente)
      const passwordToUse = ejecutivoData.password || 'Admin$2025'; // Contraseña por defecto

      const { data, error } = await supabaseSystemUIAdmin.rpc('create_user_with_role', {
        user_email: ejecutivoData.email,
        user_password: passwordToUse,
        user_first_name: ejecutivoData.first_name || ejecutivoData.full_name.split(' ')[0] || '',
        user_last_name: ejecutivoData.last_name || ejecutivoData.full_name.split(' ').slice(1).join(' ') || '',
        user_role_id: ejecutivoRole.id,
        user_phone: ejecutivoData.phone || null,
        user_department: null,
        user_position: null,
        user_is_active: true,
      });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No se pudo crear el ejecutivo');
      }

      const newUser = data[0];

      // Actualizar coordinacion_id e is_ejecutivo después de crear el usuario
      const { error: updateError } = await supabaseSystemUIAdmin
        .from('auth_users')
        .update({
          coordinacion_id: coordinacionId,
          is_ejecutivo: true,
          is_coordinator: false,
        })
        .eq('id', newUser.id);

      if (updateError) {
        console.error('Error actualizando coordinacion_id:', updateError);
        // No lanzar error, el usuario ya fue creado
      }

      // Obtener el ejecutivo creado con todos los campos
      const { data: ejecutivoData, error: fetchError } = await supabaseSystemUIAdmin
        .from('auth_users')
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
          created_at
        `)
        .eq('id', newUser.id)
        .single();

      if (fetchError) throw fetchError;

      if (!ejecutivoData) {
        throw new Error('No se pudo obtener los datos del ejecutivo creado');
      }

      return {
        id: ejecutivoData.id,
        email: ejecutivoData.email,
        full_name: ejecutivoData.full_name,
        first_name: ejecutivoData.first_name,
        last_name: ejecutivoData.last_name,
        phone: ejecutivoData.phone,
        coordinacion_id: ejecutivoData.coordinacion_id,
        is_active: ejecutivoData.is_active,
        email_verified: ejecutivoData.email_verified,
        created_at: ejecutivoData.created_at,
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
      const { data, error } = await supabaseSystemUIAdmin
        .from('auth_users')
        .update(updates)
        .eq('id', ejecutivoId)
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

