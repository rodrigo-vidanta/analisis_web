/**
 * ============================================
 * SERVICIO DE GRUPOS DE PERMISOS
 * ============================================
 * 
 * Servicio para gestión de grupos de permisos tipo Active Directory.
 * Maneja CRUD de grupos, asignación a usuarios y verificación de permisos.
 * 
 * Características:
 * - Grupos reutilizables con permisos predefinidos
 * - Usuarios pueden pertenecer a múltiples grupos (permisos acumulativos)
 * - Sistema de auditoría para tracking de cambios
 * - Compatible con el sistema de permisos existente
 */

import { supabaseSystemUI } from '../config/supabaseSystemUI';
import { MODULE_CATALOG, getModuleById, type ModuleDefinition, type PermissionAction } from '../config/permissionModules';

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface PermissionGroup {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  color: string;
  icon: string;
  base_role: string | null;
  priority: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Campos calculados
  users_count?: number;
  permissions_count?: number;
}

export interface GroupPermission {
  id: string;
  group_id: string;
  module: string;
  action: string;
  is_granted: boolean;
  scope_restriction: 'none' | 'own' | 'coordination' | 'all';
  custom_rules: Record<string, unknown> | null;
  created_at: string;
}

export interface UserGroupAssignment {
  id: string;
  user_id: string;
  group_id: string;
  is_primary: boolean;
  assigned_at: string;
  assigned_by: string | null;
  notes: string | null;
  // Datos del grupo
  group?: PermissionGroup;
  // Datos del usuario
  user?: {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface EffectivePermission {
  module: string;
  action: string;
  is_granted: boolean;
  scope_restriction: string;
  source_group: string;
}

export interface CreateGroupInput {
  name: string;
  display_name: string;
  description?: string;
  color?: string;
  icon?: string;
  base_role?: string;
  priority?: number;
  permissions: Array<{
    module: string;
    action: string;
    scope_restriction?: 'none' | 'own' | 'coordination' | 'all';
  }>;
}

export interface UpdateGroupInput {
  display_name?: string;
  description?: string;
  color?: string;
  icon?: string;
  priority?: number;
  is_active?: boolean;
  permissions?: Array<{
    module: string;
    action: string;
    scope_restriction?: 'none' | 'own' | 'coordination' | 'all';
  }>;
}

export interface GroupAuditLog {
  id: string;
  entity_type: 'group' | 'permission' | 'assignment';
  entity_id: string | null;
  user_id: string | null;
  action: string;
  changes: Record<string, unknown> | null;
  performed_by: string | null;
  performed_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

// ============================================
// SERVICIO PRINCIPAL
// ============================================

class GroupsService {
  // ============================================
  // CRUD DE GRUPOS
  // ============================================

  /**
   * Obtiene todos los grupos activos
   */
  async getGroups(includeSystem = true): Promise<PermissionGroup[]> {
    try {
      let query = supabaseSystemUI
        .from('permission_groups')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (!includeSystem) {
        query = query.eq('is_system', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Obtener conteos de usuarios y permisos para cada grupo
      const groupsWithCounts = await Promise.all(
        (data || []).map(async (group) => {
          const [usersCount, permissionsCount] = await Promise.all([
            this.getGroupUsersCount(group.id),
            this.getGroupPermissionsCount(group.id)
          ]);
          return {
            ...group,
            users_count: usersCount,
            permissions_count: permissionsCount
          };
        })
      );

      return groupsWithCounts;
    } catch (error) {
      console.error('Error obteniendo grupos:', error);
      throw error;
    }
  }

  /**
   * Obtiene un grupo por ID
   */
  async getGroupById(groupId: string): Promise<PermissionGroup | null> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('permission_groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No encontrado
        throw error;
      }

      // Obtener conteos
      const [usersCount, permissionsCount] = await Promise.all([
        this.getGroupUsersCount(groupId),
        this.getGroupPermissionsCount(groupId)
      ]);

      return {
        ...data,
        users_count: usersCount,
        permissions_count: permissionsCount
      };
    } catch (error) {
      console.error('Error obteniendo grupo:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo grupo de permisos
   */
  async createGroup(input: CreateGroupInput, createdBy?: string): Promise<PermissionGroup> {
    try {
      // Crear el grupo
      const { data: group, error: groupError } = await supabaseSystemUI
        .from('permission_groups')
        .insert({
          name: input.name.toLowerCase().replace(/\s+/g, '_'),
          display_name: input.display_name,
          description: input.description || null,
          color: input.color || '#3B82F6',
          icon: input.icon || 'Users',
          base_role: input.base_role || null,
          priority: input.priority || 50,
          is_system: false,
          is_active: true,
          created_by: createdBy || null
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Insertar permisos
      if (input.permissions && input.permissions.length > 0) {
        const permissionsToInsert = input.permissions.map(p => ({
          group_id: group.id,
          module: p.module,
          action: p.action,
          is_granted: true,
          scope_restriction: p.scope_restriction || 'none'
        }));

        const { error: permError } = await supabaseSystemUI
          .from('group_permissions')
          .insert(permissionsToInsert);

        if (permError) {
          // Rollback: eliminar el grupo si falla insertar permisos
          await supabaseSystemUI
            .from('permission_groups')
            .delete()
            .eq('id', group.id);
          throw permError;
        }
      }

      // Registrar en auditoría
      await this.logAudit('group', group.id, null, 'created', {
        group_name: input.display_name,
        permissions_count: input.permissions?.length || 0
      }, createdBy);

      return {
        ...group,
        users_count: 0,
        permissions_count: input.permissions?.length || 0
      };
    } catch (error) {
      console.error('Error creando grupo:', error);
      throw error;
    }
  }

  /**
   * Actualiza un grupo existente
   */
  async updateGroup(groupId: string, input: UpdateGroupInput, updatedBy?: string): Promise<PermissionGroup> {
    try {
      // Verificar que no es un grupo del sistema si se intenta modificar campos protegidos
      const existingGroup = await this.getGroupById(groupId);
      if (!existingGroup) {
        throw new Error('Grupo no encontrado');
      }

      if (existingGroup.is_system && input.is_active === false) {
        throw new Error('No se puede desactivar un grupo del sistema');
      }

      // Actualizar grupo
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        updated_by: updatedBy || null
      };

      if (input.display_name) updateData.display_name = input.display_name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.color) updateData.color = input.color;
      if (input.icon) updateData.icon = input.icon;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.is_active !== undefined && !existingGroup.is_system) {
        updateData.is_active = input.is_active;
      }

      const { data: updatedGroup, error: updateError } = await supabaseSystemUI
        .from('permission_groups')
        .update(updateData)
        .eq('id', groupId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Actualizar permisos si se proporcionaron
      if (input.permissions) {
        // Eliminar permisos existentes
        await supabaseSystemUI
          .from('group_permissions')
          .delete()
          .eq('group_id', groupId);

        // Insertar nuevos permisos
        if (input.permissions.length > 0) {
          const permissionsToInsert = input.permissions.map(p => ({
            group_id: groupId,
            module: p.module,
            action: p.action,
            is_granted: true,
            scope_restriction: p.scope_restriction || 'none'
          }));

          const { error: permError } = await supabaseSystemUI
            .from('group_permissions')
            .insert(permissionsToInsert);

          if (permError) throw permError;
        }
      }

      // Registrar en auditoría
      await this.logAudit('group', groupId, null, 'updated', {
        changes: updateData,
        permissions_updated: !!input.permissions
      }, updatedBy);

      return this.getGroupById(groupId) as Promise<PermissionGroup>;
    } catch (error) {
      console.error('Error actualizando grupo:', error);
      throw error;
    }
  }

  /**
   * Elimina un grupo (solo si no es del sistema)
   */
  async deleteGroup(groupId: string, deletedBy?: string): Promise<boolean> {
    try {
      const group = await this.getGroupById(groupId);
      if (!group) {
        throw new Error('Grupo no encontrado');
      }

      if (group.is_system) {
        throw new Error('No se puede eliminar un grupo del sistema');
      }

      // Registrar en auditoría antes de eliminar
      await this.logAudit('group', groupId, null, 'deleted', {
        group_name: group.display_name
      }, deletedBy);

      // Eliminar grupo (cascade elimina permisos y asignaciones)
      const { error } = await supabaseSystemUI
        .from('permission_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error eliminando grupo:', error);
      throw error;
    }
  }

  // ============================================
  // PERMISOS DE GRUPOS
  // ============================================

  /**
   * Obtiene los permisos de un grupo
   */
  async getGroupPermissions(groupId: string): Promise<GroupPermission[]> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('group_permissions')
        .select('*')
        .eq('group_id', groupId)
        .order('module')
        .order('action');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error obteniendo permisos del grupo:', error);
      throw error;
    }
  }

  /**
   * Obtiene el conteo de permisos de un grupo
   */
  private async getGroupPermissionsCount(groupId: string): Promise<number> {
    try {
      const { count, error } = await supabaseSystemUI
        .from('group_permissions')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Error obteniendo conteo de permisos:', error);
      return 0;
    }
  }

  // ============================================
  // ASIGNACIÓN DE USUARIOS A GRUPOS
  // ============================================

  /**
   * Asigna un usuario a un grupo (usa Edge Function para bypass RLS)
   */
  async assignUserToGroup(
    userId: string,
    groupId: string,
    isPrimary = false,
    assignedBy?: string,
    notes?: string
  ): Promise<UserGroupAssignment> {
    try {
      const edgeFunctionsUrl = import.meta.env.VITE_EDGE_FUNCTIONS_URL;
      const anonKey = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${edgeFunctionsUrl}/functions/v1/auth-admin-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          operation: 'assignUserToGroup',
          params: { userId, groupId, isPrimary, assignedBy, notes }
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error asignando usuario a grupo');
      }

      // Registrar en auditoría
      await this.logAudit('assignment', groupId, userId, 'assigned', {
        is_primary: isPrimary,
        notes
      }, assignedBy);

      return result.data;
    } catch (error) {
      console.error('Error asignando usuario a grupo:', error);
      throw error;
    }
  }

  /**
   * Remueve un usuario de un grupo (usa Edge Function para bypass RLS)
   */
  async removeUserFromGroup(userId: string, groupId: string, removedBy?: string): Promise<boolean> {
    try {
      // Registrar en auditoría antes de eliminar
      await this.logAudit('assignment', groupId, userId, 'unassigned', null, removedBy);

      const edgeFunctionsUrl = import.meta.env.VITE_EDGE_FUNCTIONS_URL;
      const anonKey = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${edgeFunctionsUrl}/functions/v1/auth-admin-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          operation: 'removeUserFromGroup',
          params: { userId, groupId }
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error removiendo usuario de grupo');
      }

      return true;
    } catch (error) {
      console.error('Error removiendo usuario de grupo:', error);
      throw error;
    }
  }

  /**
   * Obtiene los grupos de un usuario
   */
  async getUserGroups(userId: string): Promise<UserGroupAssignment[]> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('user_permission_groups')
        .select(`
          *,
          group:permission_groups(*)
        `)
        .eq('user_id', userId)
        .order('is_primary', { ascending: false });

      if (error) {
        console.warn('Error obteniendo grupos del usuario:', error.message);
        return []; // Devolver array vacío en lugar de lanzar error
      }

      return (data || []).map(item => ({
        ...item,
        group: item.group as PermissionGroup
      }));
    } catch (error) {
      console.error('Error obteniendo grupos del usuario:', error);
      return []; // Devolver array vacío para no romper la UI
    }
  }

  /**
   * Obtiene los usuarios de un grupo
   */
  async getGroupUsers(groupId: string): Promise<UserGroupAssignment[]> {
    try {
      // Obtener asignaciones
      const { data, error } = await supabaseSystemUI
        .from('user_permission_groups')
        .select('*')
        .eq('group_id', groupId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      // Obtener info de usuarios desde user_profiles_v2
      const userIds = (data || []).map(d => d.user_id).filter(Boolean);
      let usersMap: Record<string, { id: string; email: string; full_name: string; avatar_url: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: users } = await supabaseSystemUI
          .from('user_profiles_v2')
          .select('id, email, full_name')
          .in('id', userIds);
        
        usersMap = (users || []).reduce((acc, u) => {
          acc[u.id] = { ...u, avatar_url: null };
          return acc;
        }, {} as typeof usersMap);
      }

      return (data || []).map(item => ({
        ...item,
        user: usersMap[item.user_id] || { id: item.user_id, email: '', full_name: 'Usuario', avatar_url: null }
      }));
    } catch (error) {
      console.error('Error obteniendo usuarios del grupo:', error);
      throw error;
    }
  }

  /**
   * Obtiene el conteo de usuarios en un grupo
   */
  private async getGroupUsersCount(groupId: string): Promise<number> {
    try {
      const { count, error } = await supabaseSystemUI
        .from('user_permission_groups')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Error obteniendo conteo de usuarios:', error);
      return 0;
    }
  }

  /**
   * Actualiza los grupos de un usuario (reemplaza todos)
   */
  async setUserGroups(
    userId: string,
    groupIds: string[],
    primaryGroupId?: string,
    assignedBy?: string
  ): Promise<boolean> {
    try {
      // Eliminar asignaciones actuales
      await supabaseSystemUI
        .from('user_permission_groups')
        .delete()
        .eq('user_id', userId);

      // Insertar nuevas asignaciones
      if (groupIds.length > 0) {
        const assignments = groupIds.map(groupId => ({
          user_id: userId,
          group_id: groupId,
          is_primary: groupId === primaryGroupId,
          assigned_by: assignedBy || null,
          assigned_at: new Date().toISOString()
        }));

        const { error } = await supabaseSystemUI
          .from('user_permission_groups')
          .insert(assignments);

        if (error) throw error;
      }

      // Registrar en auditoría
      await this.logAudit('assignment', null, userId, 'groups_updated', {
        group_ids: groupIds,
        primary_group_id: primaryGroupId
      }, assignedBy);

      return true;
    } catch (error) {
      console.error('Error actualizando grupos del usuario:', error);
      throw error;
    }
  }

  // ============================================
  // VERIFICACIÓN DE PERMISOS
  // ============================================

  /**
   * Obtiene todos los permisos efectivos de un usuario
   */
  async getUserEffectivePermissions(userId: string): Promise<EffectivePermission[]> {
    try {
      const { data, error } = await supabaseSystemUI
        .rpc('get_user_effective_permissions', { p_user_id: userId });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error obteniendo permisos efectivos:', error);
      throw error;
    }
  }

  /**
   * Verifica si un usuario tiene un permiso específico
   */
  async userHasPermission(
    userId: string,
    module: string,
    action: PermissionAction
  ): Promise<{ hasPermission: boolean; scopeRestriction: string }> {
    try {
      const { data, error } = await supabaseSystemUI
        .rpc('user_has_permission', {
          p_user_id: userId,
          p_module: module,
          p_action: action
        });

      if (error) throw error;

      if (!data || data.length === 0) {
        return { hasPermission: false, scopeRestriction: 'none' };
      }

      return {
        hasPermission: data[0].has_permission || false,
        scopeRestriction: data[0].scope_restriction || 'none'
      };
    } catch (error) {
      console.error('Error verificando permiso:', error);
      return { hasPermission: false, scopeRestriction: 'none' };
    }
  }

  /**
   * Verifica múltiples permisos de un usuario
   */
  async userHasPermissions(
    userId: string,
    permissions: Array<{ module: string; action: PermissionAction }>
  ): Promise<Map<string, { hasPermission: boolean; scopeRestriction: string }>> {
    try {
      const results = new Map<string, { hasPermission: boolean; scopeRestriction: string }>();

      // Obtener todos los permisos efectivos una sola vez
      const effectivePermissions = await this.getUserEffectivePermissions(userId);

      // Verificar cada permiso solicitado
      for (const { module, action } of permissions) {
        const key = `${module}:${action}`;
        const found = effectivePermissions.find(
          p => p.module === module && p.action === action && p.is_granted
        );

        results.set(key, {
          hasPermission: !!found,
          scopeRestriction: found?.scope_restriction || 'none'
        });
      }

      return results;
    } catch (error) {
      console.error('Error verificando permisos múltiples:', error);
      return new Map();
    }
  }

  // ============================================
  // AUDITORÍA
  // ============================================

  /**
   * Registra una entrada en el log de auditoría
   */
  private async logAudit(
    entityType: 'group' | 'permission' | 'assignment',
    entityId: string | null,
    userId: string | null,
    action: string,
    changes: Record<string, unknown> | null,
    performedBy?: string
  ): Promise<void> {
    try {
      await supabaseSystemUI
        .from('group_audit_log')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          user_id: userId,
          action,
          changes,
          performed_by: performedBy || null,
          performed_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error registrando auditoría:', error);
      // No lanzar error para no interrumpir operación principal
    }
  }

  /**
   * Obtiene el historial de auditoría
   */
  async getAuditLog(filters?: {
    entityType?: 'group' | 'permission' | 'assignment';
    entityId?: string;
    userId?: string;
    limit?: number;
  }): Promise<GroupAuditLog[]> {
    try {
      let query = supabaseSystemUI
        .from('group_audit_log')
        .select('*')
        .order('performed_at', { ascending: false });

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters?.entityId) {
        query = query.eq('entity_id', filters.entityId);
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error obteniendo log de auditoría:', error);
      throw error;
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  /**
   * Obtiene el catálogo de módulos disponibles
   */
  getModuleCatalog(): ModuleDefinition[] {
    return MODULE_CATALOG;
  }

  /**
   * Obtiene un módulo específico del catálogo
   */
  getModule(moduleId: string): ModuleDefinition | undefined {
    return getModuleById(moduleId);
  }

  /**
   * Obtiene grupos por rol base
   */
  async getGroupsByBaseRole(baseRole: string): Promise<PermissionGroup[]> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('permission_groups')
        .select('*')
        .eq('base_role', baseRole)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error obteniendo grupos por rol:', error);
      throw error;
    }
  }

  /**
   * Duplica un grupo existente
   */
  async duplicateGroup(
    groupId: string,
    newName: string,
    newDisplayName: string,
    createdBy?: string
  ): Promise<PermissionGroup> {
    try {
      // Obtener grupo original
      const original = await this.getGroupById(groupId);
      if (!original) {
        throw new Error('Grupo original no encontrado');
      }

      // Obtener permisos originales
      const permissions = await this.getGroupPermissions(groupId);

      // Crear nuevo grupo
      return await this.createGroup({
        name: newName,
        display_name: newDisplayName,
        description: `Copia de: ${original.display_name}`,
        color: original.color,
        icon: original.icon,
        base_role: original.base_role || undefined,
        priority: original.priority - 1,
        permissions: permissions.map(p => ({
          module: p.module,
          action: p.action,
          scope_restriction: p.scope_restriction
        }))
      }, createdBy);
    } catch (error) {
      console.error('Error duplicando grupo:', error);
      throw error;
    }
  }
}

// Exportar instancia singleton
export const groupsService = new GroupsService();
export default groupsService;

