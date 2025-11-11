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

  // ============================================
  // GESTIÓN DE EJECUTIVOS
  // ============================================

  /**
   * Obtiene todos los ejecutivos de una coordinación
   */
  async getEjecutivosByCoordinacion(coordinacionId: string): Promise<Ejecutivo[]> {
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
        .eq('coordinacion_id', coordinacionId)
        .eq('is_ejecutivo', true)
        .eq('is_active', true)
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
      console.error('Error obteniendo ejecutivos:', error);
      throw error;
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

