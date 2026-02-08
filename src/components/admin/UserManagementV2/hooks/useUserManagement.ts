/**
 * ============================================
 * HOOK: useUserManagement
 * ============================================
 * Hook principal para gestión de usuarios con optimizaciones de rendimiento
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabaseSystemUI } from '../../../../config/supabaseSystemUI';
import { coordinacionService, type Coordinacion } from '../../../../services/coordinacionService';
import { groupsService, type PermissionGroup } from '../../../../services/groupsService';
import { useAuth } from '../../../../contexts/AuthContext';
import type { 
  UserV2, 
  Role, 
  UserFilters, 
  SortConfig, 
  TreeNode,
  RoleName,
  ROLE_HIERARCHY 
} from '../types';
import toast from 'react-hot-toast';

// ============================================
// TYPES
// ============================================

interface UseUserManagementReturn {
  // Data
  users: UserV2[];
  filteredUsers: UserV2[];
  roles: Role[];
  coordinaciones: Coordinacion[];
  groups: PermissionGroup[];
  userGroupAssignments: Map<string, string[]>; // userId -> groupIds
  loading: boolean;
  error: string | null;
  
  // Filters & Sort
  filters: UserFilters;
  setFilters: React.Dispatch<React.SetStateAction<UserFilters>>;
  sortConfig: SortConfig;
  setSortConfig: React.Dispatch<React.SetStateAction<SortConfig>>;
  
  // Pagination
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  itemsPerPage: number;
  setItemsPerPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  paginatedUsers: UserV2[];
  
  // Tree Structure
  hierarchyTree: TreeNode[];
  
  // Stats
  stats: {
    total: number;
    active: number;
    inactive: number;
    blocked: number;
    archived: number;
    byRole: Record<RoleName, number>;
  };
  
  // Actions
  refreshUsers: () => Promise<void>;
  refreshGroups: () => Promise<void>;
  updateUserStatus: (userId: string, updates: Partial<UserV2>) => Promise<boolean>;
  unblockUser: (user: UserV2) => Promise<boolean>;
}

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_FILTERS: UserFilters = {
  search: '',
  role: 'all',
  status: 'all',
  operativo: 'all',
  coordinacion_id: 'all',
  group_id: 'all'
};

const DEFAULT_SORT: SortConfig = {
  column: 'name',
  direction: 'asc'
};

const ROLE_HIERARCHY_DATA: Role[] = [
  { id: 'admin', name: 'admin', display_name: 'Administrador', description: 'Acceso completo', level: 1, icon: 'Shield', color: 'from-red-500 to-rose-600' },
  { id: 'administrador_operativo', name: 'administrador_operativo', display_name: 'Admin Operativo', description: 'Gestión operativa', level: 2, icon: 'Settings', color: 'from-purple-500 to-violet-600' },
  { id: 'coordinador', name: 'coordinador', display_name: 'Coordinador', description: 'Coordinación de equipos', level: 3, icon: 'Users', color: 'from-blue-500 to-indigo-600' },
  { id: 'supervisor', name: 'supervisor', display_name: 'Supervisor', description: 'Supervisión de equipos', level: 3, icon: 'UserCheck', color: 'from-cyan-500 to-teal-600' },
  { id: 'ejecutivo', name: 'ejecutivo', display_name: 'Ejecutivo', description: 'Ejecución de operaciones', level: 4, icon: 'Briefcase', color: 'from-emerald-500 to-teal-600' },
  { id: 'evaluador', name: 'evaluador', display_name: 'Evaluador', description: 'Evaluación de calidad', level: 4, icon: 'ClipboardCheck', color: 'from-amber-500 to-orange-600' },
  { id: 'developer', name: 'developer', display_name: 'Desarrollador', description: 'Acceso técnico', level: 2, icon: 'Code', color: 'from-gray-600 to-gray-700' }
];

// ============================================
// HOOK
// ============================================

export function useUserManagement(): UseUserManagementReturn {
  const { user: currentUser } = useAuth();
  
  // Core state
  const [users, setUsers] = useState<UserV2[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [coordinaciones, setCoordinaciones] = useState<Coordinacion[]>([]);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [userGroupAssignments, setUserGroupAssignments] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para grupos del usuario actual
  const [currentUserGroups, setCurrentUserGroups] = useState<string[]>([]);
  
  // Determinar permisos efectivos considerando rol base Y grupos asignados
  // Un usuario con grupo 'system_admin' obtiene permisos de admin aunque su rol base sea diferente
  const hasAdminGroup = useMemo(() => {
    const adminGroupNames = ['system_admin', 'full_admin'];
    return groups.some(g => 
      adminGroupNames.includes(g.name) && currentUserGroups.includes(g.id)
    );
  }, [groups, currentUserGroups]);
  
  const hasAdminOperativoGroup = useMemo(() => {
    return groups.some(g => 
      g.name === 'system_admin_operativo' && currentUserGroups.includes(g.id)
    );
  }, [groups, currentUserGroups]);
  
  // Permisos efectivos: rol base O grupos asignados
  const isAdmin = currentUser?.role_name === 'admin' || hasAdminGroup;
  const isAdminOperativo = (currentUser?.role_name === 'administrador_operativo' || hasAdminOperativoGroup) && !isAdmin;
  const isCoordinador = currentUser?.role_name === 'coordinador' && !isAdmin && !isAdminOperativo;
  
  // Filters & Sort
  const [filters, setFilters] = useState<UserFilters>(DEFAULT_FILTERS);
  const [sortConfig, setSortConfig] = useState<SortConfig>(DEFAULT_SORT);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Refs para evitar re-renders
  const loadingRef = useRef(false);
  const usersCache = useRef<Map<string, UserV2>>(new Map());

  // ============================================
  // LOAD DATA
  // ============================================

  const loadUsers = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    try {
      setLoading(true);
      setError(null);
      
      // Usar auth_user_profiles (vista sin RLS) que ya incluye datos del rol
      const { data, error: queryError } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select('*')
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      // Cargar nombres de coordinaciones
      const coordIds = new Set<string>();
      (data || []).forEach(u => {
        if (u.coordinacion_id) coordIds.add(u.coordinacion_id);
      });

      let coordMap: Record<string, Coordinacion> = {};
      if (coordIds.size > 0) {
        const { data: coordData } = await supabaseSystemUI
          .from('coordinaciones')
          .select('*')
          .in('id', Array.from(coordIds));
        
        if (coordData) {
          coordData.forEach(c => {
            coordMap[c.id] = c;
          });
        }
      }

      // ============================================
      // CARGAR ESTADO DE BLOQUEO POR MODERACIÓN
      // ============================================
      // El campo is_blocked viene de user_warning_counters en System_UI
      // Se mapea por email ya que los IDs pueden ser diferentes
      
      const emails = (data || []).filter(u => u.email).map(u => u.email);
      const emailToUserMap: Record<string, typeof data[0]> = {};
      (data || []).forEach(u => {
        if (u.email) emailToUserMap[u.email] = u;
      });
      
      const warningCounters: Record<string, { is_blocked: boolean; total_warnings: number; system_ui_user_id?: string }> = {};
      const emailToSystemUserIdMap: Record<string, string> = {};
      
      if (emails.length > 0) {
        // Buscar warnings por email para obtener el user_id de System_UI
        const { data: warningsByEmail, error: emailError } = await supabaseSystemUI
          .from('content_moderation_warnings')
          .select('user_id, user_email')
          .in('user_email', emails);
        
        if (!emailError && warningsByEmail && warningsByEmail.length > 0) {
          // Mapear email -> user_id de System_UI
          const emailToSystemUserId: Record<string, string> = {};
          warningsByEmail.forEach(w => {
            if (w.user_email && w.user_id) {
              emailToSystemUserId[w.user_email] = w.user_id;
              emailToSystemUserIdMap[w.user_email] = w.user_id;
            }
          });
          
          // Buscar contadores usando los user_id de System_UI
          const systemUserIds = Object.values(emailToSystemUserId);
          if (systemUserIds.length > 0) {
            const { data: countersBySystemId, error: countersError } = await supabaseSystemUI
              .from('user_warning_counters')
              .select('*')
              .in('user_id', systemUserIds);
            
            if (!countersError && countersBySystemId && countersBySystemId.length > 0) {
              // Mapear contadores de System_UI a IDs de PQNC_AI usando el email
              countersBySystemId.forEach(counter => {
                // Encontrar el email que corresponde a este user_id de System_UI
                const email = Object.entries(emailToSystemUserId).find(([_, sysId]) => sysId === counter.user_id)?.[0];
                if (email && emailToUserMap[email]) {
                  const pqncUser = emailToUserMap[email];
                  warningCounters[pqncUser.id] = {
                    is_blocked: counter.is_blocked || false,
                    total_warnings: counter.total_warnings || 0,
                    system_ui_user_id: counter.user_id
                  };
                }
              });
            }
          }
        }
      }

      // ============================================
      // CARGAR COORDINACIONES PARA COORDINADORES
      // ============================================
      // Los coordinadores pueden tener múltiples coordinaciones asignadas
      // en la tabla intermedia auth_user_coordinaciones
      
      // FIX 2026-01-22: Identificar coordinadores por role_name también (por si auth_roles no está disponible)
      const coordinadorIds = (data || [])
        .filter(u => {
          const isCoordByRole = u.auth_roles?.name === 'coordinador';
          const isCoordByName = u.role_name === 'coordinador';
          const isCoordByFlag = u.is_coordinator === true;
          return isCoordByRole || isCoordByName || isCoordByFlag;
        })
        .map(u => u.id);
      
      // Debug logs removidos para producción
      
      const userCoordinacionesMap: Record<string, string[]> = {};
      
      if (coordinadorIds.length > 0) {
        const { data: relaciones, error: relError } = await supabaseSystemUI
          .from('auth_user_coordinaciones')
          .select('user_id, coordinacion_id')
          .in('user_id', coordinadorIds);
        
        // Debug logs removidos para producción
        
        if (!relError && relaciones) {
          relaciones.forEach(rel => {
            if (!userCoordinacionesMap[rel.user_id]) {
              userCoordinacionesMap[rel.user_id] = [];
            }
            userCoordinacionesMap[rel.user_id].push(rel.coordinacion_id);
          });
          
          // Debug log removido para producción
        } else if (relError) {
          console.error('❌ [LOAD USERS] Error cargando coordinaciones:', relError);
        } else {
          console.warn('⚠️ [LOAD USERS] No se encontraron relaciones en auth_user_coordinaciones para coordinadores');
        }
      } else {
        console.warn('⚠️ [LOAD USERS] No se encontraron coordinadores en la lista de usuarios');
      }

      // Cargar TODAS las coordinaciones para poder mapear nombres (para coordinadores)
      const { data: allCoordinaciones } = await supabaseSystemUI
        .from('coordinaciones')
        .select('id, nombre, codigo');
      
      const allCoordMap: Record<string, { nombre: string; codigo: string }> = {};
      (allCoordinaciones || []).forEach(c => {
        allCoordMap[c.id] = { nombre: c.nombre, codigo: c.codigo };
      });

      // ============================================
      // CARGAR ÚLTIMO LOGIN DESDE auth_login_logs
      // ============================================
      // El campo last_login en auth_users no se actualiza correctamente
      // El dato real está en auth_login_logs con login_status = 'success'
      const userIds = (data || []).map(u => u.id);
      const lastLoginMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        // Obtener el último login exitoso por usuario usando una consulta agrupada
        // Nota: Supabase no soporta GROUP BY directo, así que obtenemos los más recientes
        const { data: loginLogs, error: loginError } = await supabaseSystemUI
          .from('auth_login_logs')
          .select('user_id, created_at')
          .in('user_id', userIds)
          .eq('login_status', 'success')
          .order('created_at', { ascending: false });
        
        if (!loginError && loginLogs) {
          // Solo guardamos el primer (más reciente) login por usuario
          loginLogs.forEach(log => {
            if (log.user_id && !lastLoginMap[log.user_id]) {
              lastLoginMap[log.user_id] = log.created_at;
            }
          });
        }
      }

      // Mapear usuarios con información enriquecida
      const mappedUsers: UserV2[] = (data || []).map(user => {
        const coord = user.coordinacion_id ? (allCoordMap[user.coordinacion_id] || coordMap[user.coordinacion_id]) : null;
        const warningInfo = warningCounters[user.id];
        const systemUserId = user.email ? emailToSystemUserIdMap[user.email] : undefined;
        // FIX 2026-01-22: Identificar coordinadores por múltiples campos (igual que en el filtro)
        const isCoordinador = 
          user.auth_roles?.name === 'coordinador' || 
          user.role_name === 'coordinador' || 
          user.is_coordinator === true;
        // FIX 2026-01-22: Asegurar que coordinadores siempre tengan array (nunca undefined)
        const coordIds = isCoordinador ? (userCoordinacionesMap[user.id] || []) : undefined;
        
        // Debug logs removidos para producción
        
        // Para coordinadores: obtener nombres de sus coordinaciones
        let coordinacionesNombres: string[] | undefined;
        if (isCoordinador && coordIds && coordIds.length > 0) {
          coordinacionesNombres = coordIds
            .map(id => allCoordMap[id]?.nombre)
            .filter(Boolean) as string[];
        }
        
        return {
          ...user,
          role_name: user.auth_roles?.name || user.role_name,
          role_display_name: user.auth_roles?.display_name || user.role_display_name,
          // Para ejecutivos: una sola coordinación
          coordinacion_nombre: coord?.nombre,
          coordinacion_codigo: coord?.codigo,
          // Para coordinadores: múltiples coordinaciones (mostrar primera o concatenar)
          coordinaciones_nombres: coordinacionesNombres,
          full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          // Estado de bloqueo por moderación
          is_blocked: warningInfo?.is_blocked || false,
          warning_count: warningInfo?.total_warnings || 0,
          system_ui_user_id: warningInfo?.system_ui_user_id || systemUserId,
          // Coordinaciones para coordinadores (desde tabla intermedia)
          // FIX 2026-01-22: Coordinadores siempre tienen array (vacío si no hay coordinaciones)
          coordinaciones_ids: isCoordinador ? coordIds : undefined,
          // Último login desde auth_login_logs (más confiable que auth_users.last_login)
          last_login: lastLoginMap[user.id] || user.last_login || null
        };
      });

      // Actualizar cache
      usersCache.current.clear();
      mappedUsers.forEach(u => usersCache.current.set(u.id, u));
      
      setUsers(mappedUsers);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
      setError('Error al cargar usuarios. Intenta de nuevo.');
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const loadCoordinaciones = useCallback(async () => {
    try {
      const data = await coordinacionService.getCoordinaciones();
      setCoordinaciones(data);
    } catch (err) {
      console.error('Error cargando coordinaciones:', err);
    }
  }, []);

  // Cargar grupos de permisos y asignaciones de usuarios
  const loadGroups = useCallback(async () => {
    try {
      // Cargar grupos (puede fallar si las tablas no existen)
      const groupsData = await groupsService.getGroups(true);
      setGroups(groupsData);
    } catch {
      // Tablas de grupos no existen aún, usar grupos vacíos
      setGroups([]);
    }
    
    // Cargar grupos del usuario actual para determinar permisos efectivos
    if (currentUser?.id) {
      try {
        const userGroups = await groupsService.getUserGroups(currentUser.id);
        setCurrentUserGroups(userGroups.map(g => g.group_id));
      } catch {
        setCurrentUserGroups([]);
      }
    }
    
    // Cargar asignaciones usuario-grupo (la tabla puede no existir aún)
    // Envuelto en try-catch separado para no detener la ejecución
    try {
      const { data: assignments, error: assignError } = await supabaseSystemUI
        .from('user_permission_groups')
        .select('user_id, group_id');
      
      if (!assignError && assignments && Array.isArray(assignments)) {
        const assignmentMap = new Map<string, string[]>();
        assignments.forEach((a: { user_id: string; group_id: string }) => {
          const current = assignmentMap.get(a.user_id) || [];
          current.push(a.group_id);
          assignmentMap.set(a.user_id, current);
        });
        setUserGroupAssignments(assignmentMap);
      } else if (assignError) {
        console.warn('Error cargando asignaciones de grupos:', assignError.message);
      }
    } catch {
      // Tabla no existe aún, ignorar silenciosamente
    }
  }, [currentUser?.id]);

  const loadRoles = useCallback(async () => {
    try {
      const { data, error: rolesError } = await supabaseSystemUI
        .from('auth_roles')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (rolesError) throw rolesError;

      // Mapear los roles de la BD al formato Role con colores/iconos del ROLE_HIERARCHY_DATA
      const mappedRoles: Role[] = (data || []).map(dbRole => {
        const hierarchyInfo = ROLE_HIERARCHY_DATA.find(r => r.name === dbRole.name);
        return {
          id: dbRole.id, // UUID real de la BD
          name: dbRole.name,
          display_name: dbRole.display_name,
          description: dbRole.description,
          level: hierarchyInfo?.level || 5,
          icon: hierarchyInfo?.icon || 'User',
          color: hierarchyInfo?.color || 'from-gray-500 to-gray-600'
        };
      });

      setRoles(mappedRoles);
    } catch (err) {
      console.error('Error cargando roles:', err);
      // Fallback a ROLE_HIERARCHY_DATA si falla la carga
      setRoles(ROLE_HIERARCHY_DATA);
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    loadRoles();
    loadUsers();
    loadCoordinaciones();
    loadGroups();
  }, [loadRoles, loadUsers, loadCoordinaciones, loadGroups]);

  // ============================================
  // FILTERED & SORTED USERS (MEMOIZED)
  // ============================================

  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Filtrar según permisos del usuario actual
    if (isCoordinador && currentUser?.coordinacion_id) {
      // Coordinador solo ve ejecutivos de su coordinación
      result = result.filter(u => 
        u.role_name === 'ejecutivo' && u.coordinacion_id === currentUser.coordinacion_id
      );
    } else if (isAdminOperativo) {
      // Admin operativo ve coordinadores, supervisores y ejecutivos
      result = result.filter(u => 
        ['coordinador', 'supervisor', 'ejecutivo'].includes(u.role_name)
      );
    }
    // Admin ve todos

    // Filtro de búsqueda
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(u =>
        u.full_name?.toLowerCase().includes(search) ||
        u.email?.toLowerCase().includes(search) ||
        u.department?.toLowerCase().includes(search) ||
        u.position?.toLowerCase().includes(search) ||
        u.coordinacion_nombre?.toLowerCase().includes(search)
      );
    }

    // Filtro de rol
    if (filters.role !== 'all') {
      result = result.filter(u => u.role_name === filters.role);
    }

    // Filtro de estado
    if (filters.status !== 'all') {
      switch (filters.status) {
        case 'online':
          // "Activo Ahora" - TODOS los usuarios con is_operativo = true (realmente conectados)
          result = result.filter(u => u.is_operativo === true);
          break;
        case 'active':
          result = result.filter(u => u.is_active && !u.is_blocked && !u.archivado);
          break;
        case 'inactive':
          result = result.filter(u => !u.is_active && !u.archivado);
          break;
        case 'blocked':
          // Bloqueados por moderación - usuarios con is_blocked=true
          // Esto incluye usuarios bloqueados por el sistema de parafraseo (3 strikes)
          result = result.filter(u => u.is_blocked === true);
          break;
        case 'blocked_password':
          // Bloqueados por intentos fallidos de contraseña
          // Usuarios que no están bloqueados por moderación pero están inactivos por contraseña
          // TODO: Añadir campo específico is_password_locked cuando esté disponible en BD
          result = result.filter(u => !u.is_active && !u.is_blocked && !u.archivado);
          break;
        case 'archived':
          result = result.filter(u => u.archivado === true);
          break;
        case 'operativo':
          // Filtrar usuarios operativos
          result = result.filter(u => u.is_operativo === true);
          break;
        case 'no_operativo':
          // Filtrar usuarios no operativos
          result = result.filter(u => u.is_operativo === false || u.is_operativo === undefined);
          break;
      }
    }

    // Filtro operativo
    if (filters.operativo !== 'all') {
      result = result.filter(u => 
        filters.operativo === 'operativo' ? u.is_operativo : !u.is_operativo
      );
    }

    // Filtro de coordinación
    // Ejecutivos: tienen coordinacion_id (una sola)
    // Coordinadores: tienen coordinaciones_ids (múltiples en tabla intermedia)
    if (filters.coordinacion_id !== 'all') {
      result = result.filter(u => {
        // Para ejecutivos: verificar coordinacion_id
        if (u.coordinacion_id === filters.coordinacion_id) return true;
        // Para coordinadores: verificar si tienen esa coordinación en su lista
        if (u.coordinaciones_ids && u.coordinaciones_ids.includes(filters.coordinacion_id)) return true;
        return false;
      });
    }

    // Filtro por grupo de permisos
    if (filters.group_id !== 'all') {
      result = result.filter(u => {
        // Solo verificar asignaciones directas (tabla user_permission_groups)
        const userGroups = userGroupAssignments.get(u.id);
        return userGroups?.includes(filters.group_id) || false;
      });
    }

    // Ordenamiento
    result.sort((a, b) => {
      let valueA: string | number | null = null;
      let valueB: string | number | null = null;

      switch (sortConfig.column) {
        case 'name':
          valueA = a.full_name || '';
          valueB = b.full_name || '';
          break;
        case 'role':
          valueA = a.role_display_name || '';
          valueB = b.role_display_name || '';
          break;
        case 'department':
          valueA = a.department || '';
          valueB = b.department || '';
          break;
        case 'last_login':
          valueA = a.last_login ? new Date(a.last_login).getTime() : 0;
          valueB = b.last_login ? new Date(b.last_login).getTime() : 0;
          break;
        case 'created_at':
          valueA = a.created_at ? new Date(a.created_at).getTime() : 0;
          valueB = b.created_at ? new Date(b.created_at).getTime() : 0;
          break;
        case 'status':
          valueA = a.is_active ? 1 : 0;
          valueB = b.is_active ? 1 : 0;
          break;
        case 'operativo':
          // Ordenar: Operativos primero (1) > No operativos (0)
          valueA = a.is_operativo ? 1 : 0;
          valueB = b.is_operativo ? 1 : 0;
          break;
      }

      if (valueA === null || valueB === null) return 0;
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortConfig.direction === 'asc' 
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortConfig.direction === 'asc' 
          ? valueA - valueB 
          : valueB - valueA;
      }
      return 0;
    });

    return result;
  }, [users, filters, sortConfig, isCoordinador, isAdminOperativo, currentUser?.coordinacion_id, userGroupAssignments, groups]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortConfig]);

  // ============================================
  // PAGINATION
  // ============================================

  const totalPages = useMemo(() => 
    Math.ceil(filteredUsers.length / itemsPerPage)
  , [filteredUsers.length, itemsPerPage]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // ============================================
  // HIERARCHY TREE
  // ============================================

  const hierarchyTree = useMemo((): TreeNode[] => {
    const tree: TreeNode[] = [];

    // Agrupar usuarios por rol
    const usersByRole = new Map<RoleName, UserV2[]>();
    users.forEach(user => {
      const role = user.role_name as RoleName;
      if (!usersByRole.has(role)) {
        usersByRole.set(role, []);
      }
      usersByRole.get(role)!.push(user);
    });

    // Crear nodos de rol
    ROLE_HIERARCHY_DATA.forEach(role => {
      const roleUsers = usersByRole.get(role.name) || [];
      
      const roleNode: TreeNode = {
        id: `role-${role.name}`,
        type: 'role',
        name: role.display_name,
        icon: role.icon,
        color: role.color,
        count: roleUsers.length,
        level: 0,
        children: []
      };

      // Si es ejecutivo, agrupar por coordinación única
      if (role.name === 'ejecutivo') {
        const byCoord = new Map<string, UserV2[]>();
        roleUsers.forEach(user => {
          const coordId = user.coordinacion_id || 'sin-coordinacion';
          if (!byCoord.has(coordId)) {
            byCoord.set(coordId, []);
          }
          byCoord.get(coordId)!.push(user);
        });

        byCoord.forEach((coordUsers, coordId) => {
          const coord = coordinaciones.find(c => c.id === coordId);
          roleNode.children!.push({
            id: `coord-${role.name}-${coordId}`,
            type: 'coordinacion',
            name: coord?.nombre || 'Sin Coordinación',
            code: coord?.codigo,
            count: coordUsers.length,
            level: 1,
            parent_id: roleNode.id,
            children: coordUsers.map(user => ({
              id: user.id,
              type: 'user',
              name: user.full_name,
              level: 2,
              parent_id: `coord-${role.name}-${coordId}`,
              metadata: { user }
            }))
          });
        });
      } else if (role.name === 'coordinador') {
        // Coordinadores: agrupar por coordinaciones_ids (pueden tener múltiples)
        // Un coordinador aparecerá bajo cada coordinación que tenga asignada
        const byCoord = new Map<string, UserV2[]>();
        
        roleUsers.forEach(user => {
          const coordIds = user.coordinaciones_ids || [];
          if (coordIds.length === 0) {
            // Sin coordinación asignada
            if (!byCoord.has('sin-coordinacion')) {
              byCoord.set('sin-coordinacion', []);
            }
            byCoord.get('sin-coordinacion')!.push(user);
          } else {
            // Agregar a cada coordinación que tenga
            coordIds.forEach(coordId => {
              if (!byCoord.has(coordId)) {
                byCoord.set(coordId, []);
              }
              byCoord.get(coordId)!.push(user);
            });
          }
        });

        byCoord.forEach((coordUsers, coordId) => {
          const coord = coordinaciones.find(c => c.id === coordId);
          roleNode.children!.push({
            id: `coord-${role.name}-${coordId}`,
            type: 'coordinacion',
            name: coord?.nombre || 'Sin Coordinación',
            code: coord?.codigo,
            count: coordUsers.length,
            level: 1,
            parent_id: roleNode.id,
            children: coordUsers.map(user => ({
              id: user.id,
              type: 'user',
              name: user.full_name,
              level: 2,
              parent_id: `coord-${role.name}-${coordId}`,
              metadata: { user }
            }))
          });
        });
      } else {
        // Para otros roles, lista plana
        roleNode.children = roleUsers.map(user => ({
          id: user.id,
          type: 'user',
          name: user.full_name,
          level: 1,
          parent_id: roleNode.id,
          metadata: { user }
        }));
      }

      tree.push(roleNode);
    });

    return tree;
  }, [users, coordinaciones]);

  // ============================================
  // STATS
  // ============================================

  const stats = useMemo(() => {
    const byRole: Record<RoleName, number> = {
      admin: 0,
      administrador_operativo: 0,
      coordinador: 0,
      ejecutivo: 0,
      evaluador: 0,
      developer: 0
    };

    let active = 0;
    let inactive = 0;
    let blocked = 0;
    let archived = 0;

    users.forEach(user => {
      const role = user.role_name as RoleName;
      if (byRole[role] !== undefined) {
        byRole[role]++;
      }

      if (user.archivado) {
        archived++;
      } else if (user.is_blocked) {
        blocked++;
      } else if (user.is_active) {
        active++;
      } else {
        inactive++;
      }
    });

    return {
      total: users.length,
      active,
      inactive,
      blocked,
      archived,
      byRole
    };
  }, [users]);

  // ============================================
  // ACTIONS
  // ============================================

  const refreshUsers = useCallback(async () => {
    await loadUsers();
  }, [loadUsers]);

  const updateUserStatus = useCallback(async (
    userId: string, 
    updates: Partial<UserV2> & { password?: string; coordinaciones_ids?: string[] },
    currentUserId?: string
  ): Promise<boolean> => {
    console.log('🚀 [UPDATE USER] Iniciando actualización:', {
      userId,
      updates,
      coordinacion_id: updates.coordinacion_id,
      coordinaciones_ids: updates.coordinaciones_ids,
      role_id: updates.role_id
    });
    
    try {
      // 1. Manejar cambio de password (usa Edge Function, no RPC)
      if (updates.password && updates.password.length > 0) {
        const edgeFunctionsUrl = import.meta.env.VITE_EDGE_FUNCTIONS_URL;
        const anonKey = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;
        
        const response = await fetch(`${edgeFunctionsUrl}/functions/v1/auth-admin-proxy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            operation: 'changePassword',
            params: {
              userId,
              newPassword: updates.password,
              skipVerification: true // Admin puede cambiar sin verificar contraseña actual
            }
          })
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          console.error('Error cambiando contraseña:', result.error);
          throw new Error(result.error || 'Error al cambiar la contraseña');
        }
      }

      // 2. Manejar coordinaciones para coordinadores
      // ✅ MIGRACIÓN COMPLETADA (2025-12-29): Solo usar auth_user_coordinaciones
      // Limpieza de tabla legacy para compatibilidad durante transición
      const newRole = roles.find(r => r.id === updates.role_id);
      console.log('🎭 [UPDATE USER] Rol identificado:', {
        role_id: updates.role_id,
        role_name: newRole?.name,
        tiene_coordinacion_id: !!updates.coordinacion_id,
        tiene_coordinaciones_ids: !!updates.coordinaciones_ids
      });
      
      // Función helper para limpiar todas las relaciones de coordinador
      // FIX 2026-01-14: Solo usar auth_user_coordinaciones (tabla legacy eliminada del código)
      const cleanAllCoordinadorRelations = async (userId: string) => {
        // Limpiar auth_user_coordinaciones (única fuente de verdad)
        await supabaseSystemUI
          .from('auth_user_coordinaciones')
          .delete()
          .eq('user_id', userId);
      };
      
      if (newRole?.name === 'coordinador') {
        // Solo coordinadores usan múltiples coordinaciones
        // Limpiar todas las relaciones existentes primero
        await cleanAllCoordinadorRelations(userId);

        // Insertar nuevas relaciones en auth_user_coordinaciones
        // FIX 2026-01-22: Asegurar que coordinaciones_ids siempre sea un array
        const coordinacionesIds = updates.coordinaciones_ids || [];
        
        // ========================================
        // FIX 2026-01-29: VALIDACIÓN PREVENTIVA
        // ========================================
        if (coordinacionesIds.length === 0) {
          console.error('❌ [COORDINACION] Intento de guardar coordinador sin coordinaciones', {
            userId,
            role: newRole.name,
            coordinacionesIds
          });
          toast.error('Los coordinadores deben tener al menos una coordinación asignada');
          return false;
        }
        
        if (coordinacionesIds.length > 0) {
          const relaciones = coordinacionesIds.map(coordId => ({
            user_id: userId,
            coordinacion_id: coordId,
            assigned_by: currentUserId || null
          }));

          const { error: relacionesError } = await supabaseSystemUI
            .from('auth_user_coordinaciones')
            .insert(relaciones);

          if (relacionesError) {
            console.error('❌ [COORDINACION] Error actualizando coordinaciones:', relacionesError);
            throw new Error(`Error al actualizar coordinaciones: ${relacionesError.message}`);
          } else {
            console.log('✅ [COORDINACION] Coordinaciones actualizadas exitosamente:', {
              userId,
              coordinacionesIds,
              relacionesInsertadas: relaciones.length
            });
          }
          
          // ✅ MIGRACIÓN COMPLETADA (2025-12-29): Ya no se necesita escritura dual
          // permissionsService ahora usa auth_user_coordinaciones
        }

        // Actualizar flags del usuario
        updates.is_coordinator = true;
        updates.is_ejecutivo = false;
        // FIX 2026-01-22: Limpiar coordinacion_id individual de los metadatos (coordinadores usan tabla intermedia)
        updates.coordinacion_id = null; // null en lugar de undefined para que se limpie en BD
      } else if (newRole?.name === 'ejecutivo' || newRole?.name === 'supervisor') {
        // Ejecutivos y supervisores usan coordinacion_id único (no array)
        console.log('🔍 [COORDINACION] Procesando rol ejecutivo/supervisor:', {
          role: newRole.name,
          userId,
          coordinacion_id: updates.coordinacion_id
        });
        
        // ========================================
        // FIX 2026-01-29: VALIDACIÓN PREVENTIVA
        // ========================================
        if (!updates.coordinacion_id) {
          console.error(`❌ [COORDINACION] Intento de guardar ${newRole.name} sin coordinación`, {
            userId,
            role: newRole.name,
            coordinacion_id: updates.coordinacion_id
          });
          toast.error(`Los ${newRole.name === 'supervisor' ? 'supervisores' : 'ejecutivos'} deben tener una coordinación asignada`);
          return false;
        }
        
        // ⚠️ DOWNGRADE: Limpiar TODAS las relaciones de coordinador si las tenía
        await cleanAllCoordinadorRelations(userId);
        console.log('✅ [COORDINACION] Limpiadas relaciones previas');

        // Insertar coordinación única en auth_user_coordinaciones
        if (updates.coordinacion_id) {
          console.log('📝 [COORDINACION] Insertando en auth_user_coordinaciones:', {
            user_id: userId,
            coordinacion_id: updates.coordinacion_id
          });
          
          const { error: relacionError } = await supabaseSystemUI
            .from('auth_user_coordinaciones')
            .insert({
              user_id: userId,
              coordinacion_id: updates.coordinacion_id,
              assigned_by: currentUserId || null
            });

          if (relacionError) {
            console.error('❌ [COORDINACION] Error asignando coordinación:', relacionError);
            throw new Error(`Error al asignar coordinación: ${relacionError.message}`);
          } else {
            console.log('✅ [COORDINACION] Coordinación insertada exitosamente');
          }
        }

        updates.is_coordinator = false;
        updates.is_ejecutivo = newRole?.name === 'ejecutivo';
      } else if (newRole && !['coordinador', 'supervisor', 'ejecutivo'].includes(newRole.name)) {
        // Otros roles (admin, admin_operativo, evaluador, etc.): limpiar todo
        await cleanAllCoordinadorRelations(userId);

        updates.is_coordinator = false;
        updates.is_ejecutivo = false;
        updates.coordinacion_id = undefined;
      }

      // 3. Campos válidos en auth_users de System_UI (verificado con curl directo)
      // NO existe: role_name, role_display_name, department, position, organization, avatar_url
      // NO enviar: password (se maneja con RPC), coordinaciones_ids (tabla intermedia)
      const validFields = [
        'email', 'full_name', 'first_name', 'last_name', 'phone',
        'role_id',
        'is_active', 'is_operativo', 'archivado',
        'email_verified',
        'coordinacion_id', 'is_coordinator', 'is_ejecutivo',
        'id_dynamics', 'must_change_password',
        'failed_login_attempts', 'locked_until',
        'inbound' // Usuario recibe mensajes inbound de WhatsApp
      ];

      // Filtrar solo campos válidos
      const filteredUpdates: Record<string, unknown> = {};
      for (const key of Object.keys(updates)) {
        if (validFields.includes(key) && updates[key as keyof typeof updates] !== undefined) {
          filteredUpdates[key] = updates[key as keyof typeof updates];
        }
      }

      // 4. Actualizar metadatos en auth.users (Supabase Auth nativo)
      // Esta es la fuente de verdad para user_profiles_v2
      const metadataFields = ['full_name', 'first_name', 'last_name', 'phone', 'id_dynamics', 
        'is_active', 'is_operativo', 'is_coordinator', 'is_ejecutivo', 'coordinacion_id', 
        'role_id', 'archivado', 'must_change_password', 'inbound'];
      
      const metadataUpdates: Record<string, unknown> = {};
      for (const key of metadataFields) {
        // FIX 2026-01-22: Incluir null explícitamente para limpiar coordinacion_id de coordinadores
        if (filteredUpdates[key] !== undefined) {
          metadataUpdates[key] = filteredUpdates[key];
        } else if (key === 'coordinacion_id' && newRole?.name === 'coordinador') {
          // Para coordinadores, asegurar que coordinacion_id sea null en metadatos
          metadataUpdates[key] = null;
        }
      }

      if (Object.keys(metadataUpdates).length > 0) {
        console.log('Actualizando auth.users metadata con campos:', metadataUpdates);

        const edgeFunctionsUrl = import.meta.env.VITE_EDGE_FUNCTIONS_URL;
        const anonKey = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;

        // REGLA DE NEGOCIO: Si no tiene id_dynamics, no puede ser operativo
        if (metadataUpdates.is_operativo === true && !metadataUpdates.id_dynamics) {
          // Verificar si ya tiene id_dynamics
          const existingUser = users.find(u => u.id === userId);
          if (!existingUser?.id_dynamics && !metadataUpdates.id_dynamics) {
            metadataUpdates.is_operativo = false;
            console.warn('⚠️ Corrigiendo is_operativo a false: usuario sin id_dynamics');
          }
        }

        const response = await fetch(`${edgeFunctionsUrl}/functions/v1/auth-admin-proxy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            operation: 'updateUserMetadata',
            params: {
              userId,
              metadata: metadataUpdates
            }
          })
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          console.error('Error actualizando metadata:', result.error);
          throw new Error(result.error || 'Error al actualizar metadata del usuario');
        }
      }

      // 5. Actualizar estado local
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, ...updates } : u
      ));

      toast.success('Usuario actualizado');
      return true;
    } catch (err) {
      console.error('Error actualizando usuario:', err);
      toast.error('Error al actualizar usuario');
      return false;
    }
  }, [roles]);

  // Desbloquear usuario por moderación (3 strikes)
  const unblockUser = useCallback(async (user: UserV2): Promise<boolean> => {
    try {
      // El user_id para user_warning_counters puede ser diferente al de auth_users
      // Usamos system_ui_user_id si existe, sino el id del usuario
      const targetUserId = user.system_ui_user_id || user.id;
      
      // Resetear contador de warnings en user_warning_counters
      const { error: counterError } = await supabaseSystemUI
        .from('user_warning_counters')
        .update({
          is_blocked: false,
          total_warnings: 0,
          warnings_last_30_days: 0,
          warnings_last_7_days: 0,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', targetUserId);

      if (counterError) {
        console.error('Error reseteando contador:', counterError);
        throw counterError;
      }

      // Actualizar estado local inmediatamente
      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, is_blocked: false, warning_count: 0 } : u
      ));

      toast.success(`Usuario ${user.full_name || user.email} desbloqueado correctamente`);
      return true;
    } catch (err) {
      console.error('Error desbloqueando usuario:', err);
      toast.error('Error al desbloquear usuario');
      return false;
    }
  }, []);

  // ============================================
  // RETURN
  // ============================================

  // Refrescar grupos
  const refreshGroups = useCallback(async () => {
    await loadGroups();
  }, [loadGroups]);

  return {
    users,
    filteredUsers,
    roles, // Roles cargados desde la BD con UUIDs reales
    coordinaciones,
    groups,
    userGroupAssignments,
    loading,
    error,
    
    filters,
    setFilters,
    sortConfig,
    setSortConfig,
    
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    paginatedUsers,
    
    hierarchyTree,
    stats,
    
    refreshUsers,
    refreshGroups,
    updateUserStatus,
    unblockUser
  };
}

