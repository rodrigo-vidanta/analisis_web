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
  is_active?: boolean; // Deprecated: usar archivado en su lugar
  archivado?: boolean; // Nuevo: borrado lógico
  is_operativo?: boolean; // Nuevo: status operativo para asignación de prospectos
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
   * Obtiene todas las coordinaciones no archivadas
   */
  async getCoordinaciones(): Promise<Coordinacion[]> {
    try {
      // Intentar obtener con filtro de archivado
      let query = supabaseSystemUI
        .from('coordinaciones')
        .select('*')
        .order('codigo');

      // Intentar filtrar por archivado, pero si falla usar is_active
      try {
        const { data, error } = await query.eq('archivado', false);
        if (!error) {
          return (data || []).map((coord: any) => ({
            ...coord,
            archivado: coord.archivado !== undefined ? coord.archivado : !coord.is_active,
            is_operativo: coord.is_operativo !== undefined ? coord.is_operativo : true,
          }));
        }
        throw error;
      } catch (err: any) {
        // Si falla por columnas nuevas, usar is_active como fallback
        if (err.code === 'PGRST204' || err.message?.includes('archivado')) {
          console.warn('Usando is_active como fallback para archivado');
          const { data, error } = await supabaseSystemUI
            .from('coordinaciones')
            .select('*')
            .eq('is_active', true)
            .order('codigo');
          
          if (error) throw error;
          
          return (data || []).map((coord: any) => ({
            ...coord,
            archivado: false,
            is_operativo: true,
          }));
        }
        throw err;
      }
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
      // Intentar usar RPC primero
      try {
        const { data, error } = await supabaseSystemUIAdmin.rpc('get_coordinaciones_para_asignacion');
        if (!error && data) {
          return data;
        }
      } catch (rpcError) {
        console.warn('RPC no disponible, usando método directo:', rpcError);
      }

      // Fallback: obtener coordinaciones activas directamente
      const { data, error } = await supabaseSystemUIAdmin
        .from('coordinaciones')
        .select('*')
        .eq('is_active', true)
        .order('codigo', { ascending: true });

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
      const insertData: any = {
        codigo: coordinacionData.codigo,
        nombre: coordinacionData.nombre,
        descripcion: coordinacionData.descripcion || null,
      };

      // Intentar agregar campos nuevos, pero con fallback
      try {
        insertData.archivado = coordinacionData.archivado !== undefined ? coordinacionData.archivado : false;
        insertData.is_operativo = coordinacionData.is_operativo !== undefined ? coordinacionData.is_operativo : true;
        insertData.is_active = !insertData.archivado; // Mantener compatibilidad
      } catch {
        // Si falla, usar solo is_active
        insertData.is_active = coordinacionData.archivado === false ? true : false;
      }

      const { data, error } = await supabaseSystemUIAdmin
        .from('coordinaciones')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        // Si falla por columnas nuevas, intentar solo con campos básicos
        if (error.code === 'PGRST204' || error.message?.includes('archivado') || error.message?.includes('is_operativo')) {
          console.warn('Columnas nuevas no disponibles aún, usando campos básicos');
          const basicInsertData = {
            codigo: coordinacionData.codigo,
            nombre: coordinacionData.nombre,
            descripcion: coordinacionData.descripcion || null,
            is_active: coordinacionData.archivado === false ? true : false,
          };
          
          const { data: basicData, error: basicError } = await supabaseSystemUIAdmin
            .from('coordinaciones')
            .insert(basicInsertData)
            .select()
            .single();
          
          if (basicError) throw basicError;
          
          return {
            ...basicData,
            archivado: !basicData.is_active,
            is_operativo: true,
          } as Coordinacion;
        }
        throw error;
      }
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
      
      // Manejar campos nuevos con fallback a is_active si las columnas no existen aún
      // Intentar actualizar archivado e is_operativo, pero si falla, usar is_active como fallback
      if (updates.archivado !== undefined) {
        updateData.archivado = updates.archivado;
        // Fallback: si archivado = true, entonces is_active = false
        if (updates.archivado) {
          updateData.is_active = false;
        } else {
          updateData.is_active = true;
        }
      }
      
      if (updates.is_operativo !== undefined) {
        updateData.is_operativo = updates.is_operativo;
      }

      // Intentar usar función RPC segura primero
      try {
        const { data: rpcData, error: rpcError } = await supabaseSystemUIAdmin.rpc('update_coordinacion_safe', {
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

      // Fallback: método directo con manejo de errores
      const { data, error } = await supabaseSystemUIAdmin
        .from('coordinaciones')
        .update(updateData)
        .eq('id', coordinacionId)
        .select()
        .single();

      if (error) {
        // Si el error es porque las columnas no existen, intentar solo con campos básicos
        if (error.code === 'PGRST204' || error.message?.includes('archivado') || error.message?.includes('is_operativo')) {
          console.warn('Columnas nuevas no disponibles aún, usando campos básicos');
          const basicUpdateData: any = {
            updated_at: new Date().toISOString(),
          };
          
          if (updates.codigo !== undefined) basicUpdateData.codigo = updates.codigo;
          if (updates.nombre !== undefined) basicUpdateData.nombre = updates.nombre;
          if (updates.descripcion !== undefined) basicUpdateData.descripcion = updates.descripcion || null;
          
          // Mapear archivado a is_active
          if (updates.archivado !== undefined) {
            basicUpdateData.is_active = !updates.archivado;
          }
          
          const { data: basicData, error: basicError } = await supabaseSystemUIAdmin
            .from('coordinaciones')
            .update(basicUpdateData)
            .eq('id', coordinacionId)
            .select()
            .single();
          
          if (basicError) throw basicError;
          
          // Retornar datos con mapeo inverso
          return {
            ...basicData,
            archivado: !basicData.is_active,
            is_operativo: updates.is_operativo !== undefined ? updates.is_operativo : true,
          } as Coordinacion;
        }
        throw error;
      }
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
      const { data, error } = await supabaseSystemUIAdmin.rpc('archivar_coordinacion_y_reasignar', {
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
   * IMPORTANTE: Solo obtiene coordinadores que están asignados a esta coordinación específica
   * a través de la tabla coordinador_coordinaciones
   */
  async getCoordinadoresByCoordinacion(coordinacionId: string): Promise<Ejecutivo[]> {
    try {
      console.log('🔍 [coordinacionService] Obteniendo coordinadores para coordinación:', coordinacionId);
      
      // Primero obtener la coordinación para tener su información
      const coordinacion = await this.getCoordinacionById(coordinacionId);
      console.log('✅ [coordinacionService] Coordinación encontrada:', coordinacion?.nombre);
      
      // Obtener coordinadores SOLO a través de la tabla intermedia coordinador_coordinaciones
      // Esto asegura que solo obtenemos coordinadores que realmente pertenecen a esta coordinación
      const { data: coordinadorCoordinaciones, error: ccError } = await supabaseSystemUI
        .from('coordinador_coordinaciones')
        .select(`
          coordinador_id,
          coordinacion_id,
          coordinaciones:coordinacion_id (
            codigo,
            nombre
          )
        `)
        .eq('coordinacion_id', coordinacionId); // CRÍTICO: Solo esta coordinación específica

      if (ccError) {
        console.error('❌ [coordinacionService] Error obteniendo relaciones coordinador-coordinación:', ccError);
        throw ccError;
      }

      console.log('📊 [coordinacionService] Relaciones encontradas:', coordinadorCoordinaciones?.length || 0);

      if (!coordinadorCoordinaciones || coordinadorCoordinaciones.length === 0) {
        console.warn('⚠️ [coordinacionService] No se encontraron relaciones coordinador-coordinación para esta coordinación');
        return [];
      }

      // Extraer IDs de coordinadores (solo los que están en esta coordinación específica)
      const coordinadorIds = coordinadorCoordinaciones
        .map(cc => cc.coordinador_id)
        .filter((id): id is string => id !== null && id !== undefined);
      
      console.log('👥 [coordinacionService] IDs de coordinadores para esta coordinación:', coordinadorIds);

      if (coordinadorIds.length === 0) {
        return [];
      }

      // Obtener datos de los coordinadores (solo los que están en la lista)
      // IMPORTANTE: Solo obtener coordinadores que están en coordinador_coordinaciones para esta coordinación específica
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
        .in('id', coordinadorIds) // Solo los IDs que pertenecen a esta coordinación específica
        .eq('is_coordinator', true)
        .eq('is_active', true)
        .order('full_name');

      if (usersError) {
        console.error('❌ [coordinacionService] Error obteniendo coordinadores:', usersError);
        throw usersError;
      }

      console.log('✅ [coordinacionService] Coordinadores encontrados:', usersData?.length || 0, usersData?.map(u => ({ id: u.id, name: u.full_name })));

      // Transformar datos para incluir información de coordinación
      // CRÍTICO: Solo incluir coordinadores que tienen relación en coordinador_coordinaciones para esta coordinación específica
      const resultado = (usersData || [])
        .filter((user: any) => {
          // Verificar que el usuario realmente pertenece a esta coordinación específica
          const relacion = coordinadorCoordinaciones.find(cc => 
            cc.coordinador_id === user.id && 
            cc.coordinacion_id === coordinacionId
          );
          
          if (!relacion) {
            console.warn('⚠️ [coordinacionService] Usuario encontrado pero sin relación válida para esta coordinación:', {
              userId: user.id,
              userName: user.full_name,
              coordinacionId: coordinacionId
            });
            return false;
          }
          
          // Verificar adicionalmente que la relación es para esta coordinación específica
          if (relacion.coordinacion_id !== coordinacionId) {
            console.warn('⚠️ [coordinacionService] Relación encontrada pero para otra coordinación:', {
              userId: user.id,
              relacionCoordinacionId: relacion.coordinacion_id,
              coordinacionIdBuscada: coordinacionId
            });
            return false;
          }
          
          return true;
        })
        .map((user: any) => {
          const relacion = coordinadorCoordinaciones.find(cc => 
            cc.coordinador_id === user.id && 
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
            email_verified: user.email_verified,
            last_login: user.last_login,
            created_at: user.created_at,
          };
        });
      
      console.log('✅ [coordinacionService] Retornando', resultado.length, 'coordinadores válidos');
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

