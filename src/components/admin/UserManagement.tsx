/**
 * ============================================
 * ⚠️ DEPRECADO - NO USAR ESTE COMPONENTE
 * ============================================
 * 
 * 🚫 ESTE COMPONENTE ESTÁ DEPRECADO DESDE: 22 de Enero 2026
 * 
 * ✅ USAR EN SU LUGAR: UserManagementV2
 * 📁 UBICACIÓN: src/components/admin/UserManagementV2/
 * 
 * ❌ RAZÓN DE DEPRECACIÓN:
 * - Este componente (UserManagement.tsx) NO se usa en producción
 * - El flag USE_NEW_USER_MANAGEMENT = true activa UserManagementV2
 * - Mantener dos componentes causa confusión y errores
 * 
 * 🔧 SI NECESITAS EDITAR GESTIÓN DE USUARIOS:
 * - Edita: src/components/admin/UserManagementV2/
 * - Hook principal: UserManagementV2/hooks/useUserManagement.ts
 * - Tipos: UserManagementV2/types.ts
 * 
 * 📋 HISTORIAL:
 * - 2024: Versión original (UserManagement.tsx)
 * - 2025: Nueva versión enterprise (UserManagementV2)
 * - 2026-01-22: Deprecado oficialmente
 * 
 * ⚠️ NO REALIZAR CAMBIOS EN ESTE ARCHIVO
 * 
 * ============================================
 * GESTIÓN DE USUARIOS - MÓDULO PQNC HUMANS (LEGACY)
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/admin/README_PQNC_HUMANS.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/admin/README_PQNC_HUMANS.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/admin/CHANGELOG_PQNC_HUMANS.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';
import { analysisSupabase } from '../../config/analysisSupabase';
import { useAuth } from '../../contexts/AuthContext';
import { useEffectivePermissions } from '../../hooks/useEffectivePermissions';
import AvatarUpload from './AvatarUpload';
import AvatarCropModal from './AvatarCropModal';
import ParaphraseLogService from '../../services/paraphraseLogService';
import { coordinacionService, type Coordinacion } from '../../services/coordinacionService';
import { groupsService, type PermissionGroup } from '../../services/groupsService';
import { authAdminProxyService } from '../../services/authAdminProxyService';
import { ShieldAlert, CheckCircle2, Loader2, User, Mail, Lock, Phone, Building2, Briefcase, Users, Key, Pencil, X, Search, ChevronLeft, ChevronRight, Filter, ChevronUp, ChevronDown, ArrowUpDown, Shield } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  phone?: string;
  department?: string;
  position?: string;
  organization: string;
  role_name: string;
  role_display_name: string;
  role_id: string;
  is_active: boolean; // Activo/Inactivo (archivado) - impide login
  is_operativo?: boolean; // Operativo/No operativo - estado lógico sin limitar acceso
  archivado?: boolean;
  email_verified: boolean;
  last_login?: string;
  created_at: string;
  avatar_url?: string;
  is_blocked?: boolean; // Estado de bloqueo por moderación
  warning_count?: number; // Número de warnings
  system_ui_user_id?: string; // ID del usuario en System_UI (para desbloquear cuando los IDs no coinciden)
  coordinacion_id?: string; // Para ejecutivos y supervisores
  coordinaciones_ids?: string[]; // Para coordinadores
  id_dynamics?: string; // ID de Dynamics CRM (requerido para habilitar operativo en ejecutivos)
  inbound?: boolean; // Usuario recibe mensajes inbound de WhatsApp
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
}

interface Permission {
  id: string;
  name: string;
  module: string;
  sub_module?: string;
  description: string;
}

interface UserPermission {
  user_id: string;
  permission_name: string;
  module: string;
  sub_module?: string;
}

const UserManagement: React.FC = () => {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showArchiveConfirmModal, setShowArchiveConfirmModal] = useState(false);
  const [userToArchive, setUserToArchive] = useState<User | null>(null);
  const [selectedCoordinatorForArchive, setSelectedCoordinatorForArchive] = useState<string>('');
  const [userProspectsCount, setUserProspectsCount] = useState<number>(0);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [showAvatarCropModal, setShowAvatarCropModal] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<Blob | null>(null);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false); // Para distinguir entre crear y editar
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [editAvatarFile, setEditAvatarFile] = useState<Blob | null>(null);
  const [shouldDeleteAvatar, setShouldDeleteAvatar] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    department: '',
    position: '',
    role_id: '',
    coordinacion_id: '', // Para ejecutivos (una sola coordinación)
    coordinaciones_ids: [] as string[], // Para coordinadores (múltiples coordinaciones)
    is_active: true,
    is_operativo: true, // Operativo por defecto
    // Subpermisos específicos para evaluadores
    analysis_sources: [] as string[] // ['natalia', 'pqnc', 'live_monitor']
  });

  // Estado para coordinaciones
  const [coordinaciones, setCoordinaciones] = useState<Coordinacion[]>([]);
  
  // Estados para grupos de permisos
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(''); // Grupo seleccionado para crear/editar

  // Estados para paginación y filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCoordinacion, setFilterCoordinacion] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active'); // 'active' = usuarios operativos/activos, 'archived' = usuarios archivados
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  
  // Estados para ordenamiento
  const [sortColumn, setSortColumn] = useState<'name' | 'role' | 'department' | 'last_login' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Verificar permisos según nuevo sistema de roles (usando permisos efectivos)
  const { user: currentUser } = useAuth();
  const { isAdmin, isAdminOperativo, isCoordinador } = useEffectivePermissions();
  
  // Permisos de visualización
  const canView = hasPermission('admin.users.view') || isAdmin || isAdminOperativo || isCoordinador;
  
  // Permisos de creación
  // Admin: puede crear cualquier rol
  // Admin Operativo: solo puede crear coordinadores y ejecutivos
  // Coordinador: NO puede crear usuarios nuevos
  const canCreate = isAdmin || (isAdminOperativo && true); // Se validará en handleCreateUser
  
  // Permisos de edición
  // Admin: puede editar cualquier usuario
  // Admin Operativo: solo puede editar coordinadores y ejecutivos
  // Coordinador: solo puede editar ejecutivos de su coordinación
  const canEdit = hasPermission('admin.users.edit') || isAdmin || isAdminOperativo || isCoordinador;
  
  // Permisos de eliminación
  const canDelete = isAdmin; // Solo admin puede eliminar

  // Debug temporal removido - solo mantener logs de error

  useEffect(() => {
    if (canView) {
      loadUsers();
      loadRoles();
      loadPermissions();
      loadCoordinaciones();
      loadPermissionGroups();
      
      // Cargar coordinaciones del usuario actual si es coordinador
      if (isCoordinador && currentUser?.id) {
        loadCurrentUserCoordinaciones();
      }
    }
  }, [canView, isCoordinador, currentUser?.id]);

  // Cargar coordinaciones del usuario actual (coordinador)
  const loadCurrentUserCoordinaciones = async () => {
    if (!currentUser?.id) return;
    
    try {
      const { data: relaciones } = await supabaseSystemUI
        .from('auth_user_coordinaciones')
        .select('coordinacion_id')
        .eq('user_id', currentUser.id);
      
      if (relaciones) {
        // Actualizar currentUser con coordinaciones (esto requiere actualizar el contexto)
        // Por ahora, guardamos en un estado local
        const coordinacionesIds = relaciones.map(r => r.coordinacion_id);
        // Actualizar el objeto currentUser localmente para el filtro
        if (currentUser) {
          (currentUser as any).coordinaciones_ids = coordinacionesIds;
        }
      }
    } catch (error) {
      console.error('Error cargando coordinaciones del usuario actual:', error);
    }
  };

  const loadCoordinaciones = async () => {
    try {
      const data = await coordinacionService.getCoordinaciones();
      setCoordinaciones(data);
    } catch (error) {
      console.error('Error cargando coordinaciones:', error);
    }
  };

  // Cargar grupos de permisos
  const loadPermissionGroups = async () => {
    try {
      const groups = await groupsService.getGroups();
      setPermissionGroups(groups);
    } catch (error) {
      console.error('Error cargando grupos de permisos:', error);
    }
  };

  // Obtener grupo asignado a un usuario
  const getUserGroupId = async (userId: string): Promise<string | null> => {
    try {
      const assignments = await groupsService.getUserGroups(userId);
      // Buscar el grupo principal o el primero asignado
      const primary = assignments.find(a => a.is_primary);
      return primary?.group_id || assignments[0]?.group_id || null;
    } catch (error) {
      console.error('Error obteniendo grupo del usuario:', error);
      return null;
    }
  };

  // Manejar cambio de grupo de permisos
  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    
    // Auto-asignar role_id basado en base_role del grupo
    const selectedGroup = permissionGroups.find(g => g.id === groupId);
    if (selectedGroup?.base_role) {
      // Buscar el rol que corresponde al base_role
      const matchingRole = roles.find(r => r.name === selectedGroup.base_role);
      if (matchingRole) {
        setFormData(prev => ({ ...prev, role_id: matchingRole.id }));
      }
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      // Usar auth_user_profiles (vista sin RLS) que ya incluye datos del rol
      const { data, error } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Cargar estado de bloqueo para todos los usuarios
      const userIds = (data || []).map(u => u.id);
      
      if (userIds.length > 0) {
        try {
          // Obtener contadores por ID primero
          let warningCounters = await ParaphraseLogService.getMultipleUserWarningCounters(userIds);
          
          // Mapa para guardar la relación entre email y user_id de System_UI (necesario para desbloquear)
          const emailToSystemUserIdMap: Record<string, string> = {};
          
          // Buscar warnings por email para TODOS los usuarios (no solo los que no tienen contador)
          // Esto es necesario porque los IDs pueden no coincidir entre PQNC_AI y System_UI
          const emailToUserMap: Record<string, User> = {};
          (data || []).forEach(user => {
            if (user.email) {
              emailToUserMap[user.email] = user;
            }
          });
          
          const emails = Object.keys(emailToUserMap);
          
          if (emails.length > 0) {
            // Buscar warnings por email en System_UI (usar admin para bypass de RLS)
            const { data: warningsByEmail, error: emailError } = await supabaseSystemUI
              .from('content_moderation_warnings')
              .select('user_id, user_email')
              .in('user_email', emails);
            
            if (!emailError && warningsByEmail && warningsByEmail.length > 0) {
              // Agrupar warnings por email y obtener el user_id más común
              const emailToSystemUserId: Record<string, string> = {};
              warningsByEmail.forEach(w => {
                if (w.user_email && w.user_id) {
                  // Usar el último user_id encontrado (más reciente)
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
                      // Mapear el contador al ID de PQNC_AI (sobrescribir si ya existe)
                      warningCounters[pqncUser.id] = {
                        total_warnings: counter.total_warnings,
                        warnings_last_30_days: counter.warnings_last_30_days,
                        warnings_last_7_days: counter.warnings_last_7_days,
                        last_warning_at: counter.last_warning_at,
                        is_blocked: counter.is_blocked
                      };
                    }
                  });
                }
              }
            }
          }
          
          // Combinar datos de usuarios con estado de bloqueo y agregar el user_id de System_UI para desbloquear
          const usersWithBlockStatus = (data || []).map(user => {
            const systemUserId = user.email ? emailToSystemUserIdMap[user.email] : undefined;
            const counter = warningCounters[user.id];
            const isBlocked = counter?.is_blocked || false;
            const warningCount = counter?.total_warnings || 0;
            
            // Extraer archivado e is_operativo directamente de auth_users (ya estamos en esa tabla)
            const archivado = (user as any).archivado || false;
            const is_operativo = (user as any).is_operativo !== undefined ? (user as any).is_operativo : true; // Por defecto true si no existe
            
            // Extraer información del rol
            const role = (user as any).auth_roles;
            
            // Mapear campos para compatibilidad con la interfaz User
            return {
              ...user,
              archivado,
              is_operativo,
              role_name: role?.name || '',
              role_display_name: role?.display_name || '',
              role_id: role?.id || '',
              organization: (user as any).organization || 'PQNC',
              department: (user as any).department || '',
              position: (user as any).position || '',
              is_blocked: isBlocked,
              warning_count: warningCount,
              system_ui_user_id: systemUserId, // Guardar el user_id de System_UI para poder desbloquear
              id_dynamics: (user as any).id_dynamics || undefined // Cargar id_dynamics
            };
          });
          
          // Cargar información de coordinaciones para cada usuario
          const usersWithCoordinaciones = await Promise.all(
            usersWithBlockStatus.map(async (user) => {
              if (user.role_name === 'ejecutivo' || user.role_name === 'supervisor') {
                // FIX 2026-01-14: Para ejecutivos y supervisores: cargar coordinacion_id desde auth_users
                const { data: systemUser } = await supabaseSystemUI
                  .from('user_profiles_v2')
                  .select('coordinacion_id')
                  .eq('id', user.id)
                  .single();
                return { ...user, coordinacion_id: systemUser?.coordinacion_id };
              } else if (user.role_name === 'coordinador') {
                // Para coordinadores: cargar coordinaciones desde tabla intermedia (nueva tabla)
                const { data: relaciones } = await supabaseSystemUI
                  .from('auth_user_coordinaciones')
                  .select('coordinacion_id')
                  .eq('user_id', user.id);
                return {
                  ...user,
                  coordinaciones_ids: relaciones?.map(r => r.coordinacion_id) || []
                };
              }
              return user;
            })
          );
          
          setUsers(usersWithCoordinaciones);
        } catch (warningError) {
          console.error('❌ Error cargando warnings:', warningError);
          // Si falla, usar usuarios sin estado de bloqueo
          const usersWithCoordinaciones = await Promise.all(
            (data || []).map(async (user: any) => {
              const role = user.auth_roles;
              const archivado = user.archivado || false;
              const is_operativo = user.is_operativo !== undefined ? user.is_operativo : true; // Por defecto true si no existe
              const mappedUser = {
                ...user,
                archivado,
                is_operativo,
                role_name: role?.name || '',
                role_display_name: role?.display_name || '',
                role_id: role?.id || '',
                organization: user.organization || 'PQNC',
                department: user.department || '',
                position: user.position || '',
              };
              
              if (mappedUser.role_name === 'ejecutivo' || mappedUser.role_name === 'supervisor') {
                // FIX 2026-01-14: Incluir supervisores en la carga de coordinacion_id
                return { ...mappedUser, coordinacion_id: user.coordinacion_id };
              } else if (mappedUser.role_name === 'coordinador') {
                // Fallback: migrado a auth_user_coordinaciones (2025-12-29)
                const { data: relaciones } = await supabaseSystemUI
                  .from('auth_user_coordinaciones')
                  .select('coordinacion_id')
                  .eq('user_id', user.id);
                return {
                  ...mappedUser,
                  coordinaciones_ids: relaciones?.map(r => r.coordinacion_id) || []
                };
              }
              return mappedUser;
            })
          );
          setUsers(usersWithCoordinaciones);
        }
      } else {
        // Cargar información de coordinaciones para cada usuario
        const usersWithCoordinaciones = await Promise.all(
          (data || []).map(async (user: any) => {
            const role = user.auth_roles;
            const archivado = user.archivado || false;
            const is_operativo = user.is_operativo !== undefined ? user.is_operativo : true; // Por defecto true si no existe
            const mappedUser = {
              ...user,
              archivado,
              is_operativo,
              role_name: role?.name || '',
              role_display_name: role?.display_name || '',
              role_id: role?.id || '',
              organization: user.organization || 'PQNC',
              department: user.department || '',
              position: user.position || '',
            };
            
            if (mappedUser.role_name === 'ejecutivo') {
              return { ...mappedUser, coordinacion_id: user.coordinacion_id };
            } else if (mappedUser.role_name === 'coordinador') {
              // Fallback: migrado a auth_user_coordinaciones (2025-12-29)
              const { data: relaciones } = await supabaseSystemUI
                .from('auth_user_coordinaciones')
                .select('coordinacion_id')
                .eq('user_id', user.id);
              return {
                ...mappedUser,
                coordinaciones_ids: relaciones?.map(r => r.coordinacion_id) || []
              };
            }
            return mappedUser;
          })
        );
        setUsers(usersWithCoordinaciones);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  // Efecto para filtrar usuarios cuando cambian los filtros o usuarios
  useEffect(() => {
    let filtered = [...users];

    // Filtro por modo de vista: 'active' = usuarios no archivados, 'archived' = solo archivados
    if (viewMode === 'active') {
      filtered = filtered.filter(user => !user.archivado);
    } else {
      filtered = filtered.filter(user => user.archivado);
    }

    // NOTA: Los usuarios no operativos SÍ se muestran (no se filtran)
    // Solo se filtran por archivado según el modo de vista

    // Filtro de búsqueda (nombre, email)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => {
        return (
          user.full_name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.first_name.toLowerCase().includes(query) ||
          user.last_name.toLowerCase().includes(query)
        );
      });
    }

    // Filtro por coordinación
    if (filterCoordinacion) {
      filtered = filtered.filter(user => {
        // Para ejecutivos: verificar coordinacion_id
        if (user.role_name === 'ejecutivo') {
          return user.coordinacion_id === filterCoordinacion;
        }
        // Para coordinadores: verificar coordinaciones en tabla intermedia
        if (user.role_name === 'coordinador') {
          return user.coordinaciones_ids?.includes(filterCoordinacion) || false;
        }
        return false;
      });
    }

    // Filtro por permisos según rol del usuario actual
    // Administrador Operativo: solo ve coordinadores y ejecutivos
    if (isAdminOperativo) {
      filtered = filtered.filter(user => 
        ['coordinador', 'ejecutivo'].includes(user.role_name)
      );
    }
    
    // Coordinador: solo ve ejecutivos de su coordinación
    if (isCoordinador && currentUser?.coordinaciones_ids && currentUser.coordinaciones_ids.length > 0) {
      filtered = filtered.filter(user => {
        // Puede ver ejecutivos de su coordinación
        if (user.role_name === 'ejecutivo' && user.coordinacion_id) {
          return currentUser.coordinaciones_ids.includes(user.coordinacion_id);
        }
        // NO puede ver otros coordinadores ni otros roles
        return false;
      });
    }

    // Filtro por departamento
    if (filterDepartment) {
      filtered = filtered.filter(user =>
        user.department?.toLowerCase() === filterDepartment.toLowerCase()
      );
    }

    setFilteredUsers(filtered);
    setCurrentPage(1); // Resetear a primera página cuando cambian los filtros
  }, [users, searchQuery, filterCoordinacion, filterDepartment, viewMode]);

  // Función para ordenar usuarios
  const sortUsers = (usersToSort: User[]): User[] => {
    if (!sortColumn) return usersToSort;

    const sorted = [...usersToSort].sort((a, b) => {
      let aValue: string | number | undefined;
      let bValue: string | number | undefined;

      switch (sortColumn) {
        case 'name':
          aValue = a.full_name.toLowerCase();
          bValue = b.full_name.toLowerCase();
          break;
        case 'role':
          aValue = a.role_display_name.toLowerCase();
          bValue = b.role_display_name.toLowerCase();
          break;
        case 'department':
          aValue = (a.department || '').toLowerCase();
          bValue = (b.department || '').toLowerCase();
          break;
        case 'last_login':
          aValue = a.last_login ? new Date(a.last_login).getTime() : 0;
          bValue = b.last_login ? new Date(b.last_login).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (sortDirection === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      } else {
        if (sortDirection === 'asc') {
          return (aValue as number) - (bValue as number);
        } else {
          return (bValue as number) - (aValue as number);
        }
      }
    });

    return sorted;
  };

  // Usuarios filtrados y ordenados
  const sortedUsers = sortUsers(filteredUsers);

  // Obtener usuarios paginados
  const paginatedUsers = sortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calcular total de páginas
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

  // Obtener departamentos únicos para el filtro
  const uniqueDepartments = Array.from(
    new Set(users.map(u => u.department).filter(Boolean))
  ).sort() as string[];

  // Función para obtener colores según el rol
  const getRoleColors = (roleName: string): { bg: string; text: string; darkBg: string; darkText: string } => {
    const roleColors: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
      admin: {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        darkBg: 'dark:bg-purple-900',
        darkText: 'dark:text-purple-200'
      },
      coordinador: {
        bg: 'bg-indigo-100',
        text: 'text-indigo-800',
        darkBg: 'dark:bg-indigo-900',
        darkText: 'dark:text-indigo-200'
      },
      supervisor: {
        bg: 'bg-indigo-100',
        text: 'text-indigo-800',
        darkBg: 'dark:bg-indigo-900',
        darkText: 'dark:text-indigo-200'
      },
      ejecutivo: {
        bg: 'bg-emerald-100',
        text: 'text-emerald-800',
        darkBg: 'dark:bg-emerald-900',
        darkText: 'dark:text-emerald-200'
      },
      evaluator: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        darkBg: 'dark:bg-yellow-900',
        darkText: 'dark:text-yellow-200'
      },
      developer: {
        bg: 'bg-cyan-100',
        text: 'text-cyan-800',
        darkBg: 'dark:bg-cyan-900',
        darkText: 'dark:text-cyan-200'
      },
      administrador_operativo: {
        bg: 'bg-violet-100',
        text: 'text-violet-800',
        darkBg: 'dark:bg-violet-900',
        darkText: 'dark:text-violet-200'
      },
      productor: {
        bg: 'bg-pink-100',
        text: 'text-pink-800',
        darkBg: 'dark:bg-pink-900',
        darkText: 'dark:text-pink-200'
      }
    };

    return roleColors[roleName.toLowerCase()] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      darkBg: 'dark:bg-gray-700',
      darkText: 'dark:text-gray-300'
    };
  };

  const loadRoles = async () => {
    try {
      // Cargar roles desde System_UI donde están coordinador y ejecutivo
      const { data: systemRoles, error: systemError } = await supabaseSystemUI
        .from('auth_roles')
        .select('*')
        .order('name');

      if (systemError) {
        console.error('Error cargando roles de System_UI:', systemError);
        throw systemError;
      } else {
        setRoles(systemRoles || []);
      }
    } catch (err) {
      console.error('Error loading roles:', err);
      setError('Error al cargar roles');
    }
  };

  const loadPermissions = async () => {
    try {
      const { data, error } = await supabaseSystemUI
        .from('auth_permissions')
        .select('*')
        .order('module, permission_name');

      if (error) throw error;
      setPermissions(data || []);
    } catch (err) {
      console.error('Error loading permissions:', err);
    }
  };

  const loadUserPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabaseSystemUI
        .from('auth_user_permissions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setUserPermissions(data || []);
    } catch (err) {
      console.error('Error loading user permissions:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: '',
      department: '',
      position: '',
      role_id: '',
      coordinacion_id: '',
      coordinaciones_ids: [],
      is_active: true,
      is_operativo: true,
      analysis_sources: []
    });
    setSelectedGroupId(''); // Reset grupo seleccionado
    setAvatarPreview(null);
    setAvatarFile(null);
    setIsEditingAvatar(false);
    setEditAvatarPreview(null);
    setEditAvatarFile(null);
    setShouldDeleteAvatar(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreate) {
      setError('No tienes permisos para crear usuarios');
      return;
    }

    // Validar que se haya seleccionado un grupo de permisos
    const selectedGroup = permissionGroups.find(g => g.id === selectedGroupId);
    if (!selectedGroup) {
      setError('Debes seleccionar un grupo de permisos');
      return;
    }

    // El role_id se asigna automáticamente al seleccionar el grupo
    const selectedRole = roles.find(r => r.id === formData.role_id);
    if (!selectedRole) {
      setError('Error: No se pudo determinar el rol del grupo seleccionado');
      return;
    }

    // Administrador Operativo: solo puede crear coordinadores o ejecutivos
    if (isAdminOperativo && !['coordinador', 'ejecutivo'].includes(selectedRole.name)) {
      setError('Solo puedes crear usuarios con rol Coordinador o Ejecutivo');
      return;
    }

    // Coordinador: NO puede crear usuarios nuevos
    if (isCoordinador) {
      setError('No tienes permisos para crear usuarios nuevos');
      return;
    }

    try {
      setLoading(true);

      // ============================================
      // CREAR USUARIO EN SUPABASE AUTH NATIVO
      // ============================================
      // Usa Edge Function auth-admin-proxy con operación createUser
      // Los usuarios se crean en auth.users (no en tabla legacy auth_users)
      
      const edgeFunctionsUrl = import.meta.env.VITE_EDGE_FUNCTIONS_URL;
      const anonKey = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;
      const selectedRole = roles.find(r => r.id === formData.role_id);
      
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`;
      
      const response = await fetch(`${edgeFunctionsUrl}/functions/v1/auth-admin-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          operation: 'createUser',
          params: {
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            fullName,
            roleId: formData.role_id,
            phone: formData.phone || null,
            department: formData.department?.trim() || null,
            position: formData.position?.trim() || null,
            isActive: formData.is_active,
            isCoordinator: selectedRole?.name === 'coordinador',
            isEjecutivo: selectedRole?.name === 'ejecutivo',
            coordinacionId: formData.coordinacion_id || null
          }
        })
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        console.error('Error creating user:', result);
        throw new Error(result.error || result.details?.join(', ') || 'Error al crear usuario');
      }

      const userId = result.userId;

      if (!userId) {
        throw new Error('No se pudo obtener el ID del usuario creado');
      }

      console.log(`✅ Usuario creado en Supabase Auth: ${userId}`);

      // Subir avatar si existe
      if (avatarFile && userId) {
        try {
          const fileExt = 'jpg';
          const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabaseSystemUI.storage
            .from('user-avatars')
            .upload(fileName, avatarFile);

          if (!uploadError) {
            const { data: { publicUrl } } = supabaseSystemUI.storage
              .from('user-avatars')
              .getPublicUrl(fileName);

            // Guardar URL de avatar (la RPC puede no existir, usar tabla directa si falla)
            try {
              await supabaseSystemUI.rpc('upload_user_avatar', {
                p_user_id: userId,
                p_avatar_url: publicUrl,
                p_filename: fileName,
                p_file_size: avatarFile.size,
                p_mime_type: 'image/jpeg'
              });
            } catch {
              console.warn('RPC upload_user_avatar no disponible, avatar subido a storage');
            }
          }
        } catch (avatarError) {
          console.error('Error uploading avatar:', avatarError);
          // No fallar la creación si el avatar falla
        }
      }

      // Si es evaluador, asignar subpermisos de análisis
      if (selectedRole?.name === 'evaluator' && formData.analysis_sources.length > 0) {
        await assignAnalysisSubPermissions(userId, formData.analysis_sources);
      }

      // ============================================
      // ASIGNAR COORDINACIONES (tabla auxiliar)
      // ============================================
      
      // Si es coordinador, asignar múltiples coordinaciones
      if (selectedRole?.name === 'coordinador' && formData.coordinaciones_ids.length > 0) {
        try {
          const relaciones = formData.coordinaciones_ids.map(coordId => ({
            user_id: userId,
            coordinacion_id: coordId,
            assigned_by: currentUser?.id || null
          }));

          const { error: relacionesError } = await supabaseSystemUI
            .from('auth_user_coordinaciones')
            .insert(relaciones);

          if (relacionesError) {
            console.error('Error asignando coordinaciones al coordinador:', relacionesError);
          }
        } catch (coordError) {
          console.error('Error asignando coordinaciones:', coordError);
        }
      }

      // Si es ejecutivo o supervisor, asignar una sola coordinación
      if ((selectedRole?.name === 'ejecutivo' || selectedRole?.name === 'supervisor') && formData.coordinacion_id) {
        try {
          const { error: relacionError } = await supabaseSystemUI
            .from('auth_user_coordinaciones')
            .insert({
              user_id: userId,
              coordinacion_id: formData.coordinacion_id,
              assigned_by: currentUser?.id || null
            });

          if (relacionError) {
            console.error('Error asignando coordinación del ejecutivo:', relacionError);
          }
        } catch (coordError) {
          console.error('Error asignando coordinación:', coordError);
        }
      }

      // Asignar grupo de permisos al usuario
      if (selectedGroupId) {
        try {
          await groupsService.assignUserToGroup(userId, selectedGroupId, true);
        } catch (groupError) {
          console.error('Error asignando grupo de permisos:', groupError);
          // No fallar la creación si falla la asignación del grupo
        }
      }

      setShowCreateModal(false);
      resetForm();
      await loadUsers();
      setError(null);
    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.message || 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarCropComplete = (croppedBlob: Blob | null) => {
    if (isEditingAvatar) {
      // Modo edición
      if (croppedBlob) {
        setEditAvatarFile(croppedBlob);
        const reader = new FileReader();
        reader.onload = (e) => {
          setEditAvatarPreview(e.target?.result as string);
        };
        reader.readAsDataURL(croppedBlob);
      } else {
        // Eliminar avatar
        setShouldDeleteAvatar(true);
        setEditAvatarPreview(null);
        setEditAvatarFile(null);
      }
    } else {
      // Modo creación
      if (croppedBlob) {
        setAvatarFile(croppedBlob);
        const reader = new FileReader();
        reader.onload = (e) => {
          setAvatarPreview(e.target?.result as string);
        };
        reader.readAsDataURL(croppedBlob);
      }
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canEdit || !selectedUser) {
      return;
    }

    // Validar que se haya seleccionado un grupo de permisos
    const selectedGroup = permissionGroups.find(g => g.id === selectedGroupId);
    if (!selectedGroup) {
      setError('Debes seleccionar un grupo de permisos');
      return;
    }

    // El role_id se asigna automáticamente al seleccionar el grupo
    const selectedRole = roles.find(r => r.id === formData.role_id);
    if (!selectedRole) {
      setError('Error: No se pudo determinar el rol del grupo seleccionado');
      return;
    }

    // Administrador Operativo: solo puede editar coordinadores o ejecutivos
    if (isAdminOperativo && !['coordinador', 'ejecutivo'].includes(selectedRole.name)) {
      setError('Solo puedes editar usuarios con rol Coordinador o Ejecutivo');
      return;
    }

    // Coordinador: solo puede editar ejecutivos de su coordinación
    if (isCoordinador) {
      // Verificar que el usuario a editar es ejecutivo
      if (selectedUser.role_name !== 'ejecutivo') {
        setError('Solo puedes editar ejecutivos asignados a tu coordinación');
        return;
      }
      
      // Verificar que el ejecutivo pertenece a una de las coordinaciones del coordinador
      if (!currentUser?.coordinaciones_ids || currentUser.coordinaciones_ids.length === 0) {
        setError('No tienes coordinaciones asignadas');
        return;
      }

      // Cargar coordinación del ejecutivo
      const { data: ejecutivoData } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select('coordinacion_id')
        .eq('id', selectedUser.id)
        .single();

      if (!ejecutivoData?.coordinacion_id || 
          !currentUser.coordinaciones_ids.includes(ejecutivoData.coordinacion_id)) {
        setError('Solo puedes editar ejecutivos asignados a tu coordinación');
        return;
      }

      // Coordinador NO puede cambiar el rol a coordinador
      if (selectedRole.name === 'coordinador') {
        setError('No puedes cambiar el rol de un ejecutivo a coordinador');
        return;
      }
    }

    // Manejar avatar si hay cambios
    let newAvatarUrl = selectedUser.avatar_url;
    
    if (shouldDeleteAvatar) {
      // Eliminar avatar
      try {
        const { error: deleteError } = await supabaseSystemUI
          .from('user_avatars')
          .delete()
          .eq('user_id', selectedUser.id);
        
        if (deleteError) throw deleteError;
        
        // Actualizar usuario con avatar null
        const { error: updateError } = await supabaseSystemUI.rpc('upload_user_avatar', {
          p_user_id: selectedUser.id,
          p_avatar_url: null,
          p_file_name: null,
          p_file_size: null
        });
        
        if (updateError) throw updateError;
        newAvatarUrl = undefined;
      } catch (avatarError) {
        console.error('Error eliminando avatar:', avatarError);
        // Continuar con la edición aunque falle el avatar
      }
    } else if (editAvatarFile) {
      // Subir nuevo avatar
      try {
        const fileExt = editAvatarFile.type.split('/')[1] || 'jpg';
        const fileName = `avatar-${selectedUser.id}-${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabaseSystemUI.storage
          .from('user-avatars')
          .upload(fileName, editAvatarFile);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabaseSystemUI.storage
          .from('user-avatars')
          .getPublicUrl(fileName);
        
        // La función RPC está en System UI, no en PQNC
        const { error: updateError } = await supabaseSystemUI.rpc('upload_user_avatar', {
          p_user_id: selectedUser.id,
          p_avatar_url: publicUrl,
          p_file_name: fileName,
          p_file_size: editAvatarFile.size,
          p_mime_type: editAvatarFile.type
        });
        
        if (updateError) throw updateError;
        newAvatarUrl = publicUrl;
      } catch (avatarError) {
        console.error('Error subiendo avatar:', avatarError);
        // Continuar con la edición aunque falle el avatar
      }
    }
    
    // Validar: ejecutivos no pueden habilitar operativo sin id_dynamics
    if (selectedRole?.name === 'ejecutivo' && formData.is_operativo !== false) {
      // Cargar id_dynamics actualizado si no está en selectedUser
      let currentIdDynamics = selectedUser.id_dynamics;
      if (!currentIdDynamics) {
        try {
          const { data: systemUser } = await supabaseSystemUI
            .from('user_profiles_v2')
            .select('id_dynamics')
            .eq('id', selectedUser.id)
            .single();
          currentIdDynamics = systemUser?.id_dynamics;
        } catch (error) {
          console.error('Error verificando id_dynamics:', error);
        }
      }
      
      if (!currentIdDynamics || currentIdDynamics.trim() === '') {
        setError('No se puede habilitar operativo un ejecutivo sin ID_Dynamics');
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      
      const edgeFunctionsUrl = import.meta.env.VITE_EDGE_FUNCTIONS_URL;
      const anonKey = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;

      // Preparar metadatos para auth.users (Supabase Auth nativo)
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`;
      const metadata: any = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        full_name: fullName,
        phone: formData.phone?.trim() || null,
        department: formData.department?.trim() || null,
        position: formData.position?.trim() || null,
        role_id: formData.role_id,
        is_active: formData.is_active,
        is_operativo: formData.is_operativo,
        inbound: formData.inbound || false, // Campo inbound
        id_dynamics: formData.id_dynamics?.trim() || null, // ID Dynamics
      };

      // Agregar coordinacion_id al metadata si el rol lo requiere
      if (selectedRole?.name === 'ejecutivo' || selectedRole?.name === 'supervisor') {
        metadata.coordinacion_id = formData.coordinacion_id || null;
        metadata.is_coordinator = false;
        metadata.is_ejecutivo = selectedRole?.name === 'ejecutivo';
      } else if (selectedRole?.name === 'coordinador') {
        metadata.coordinacion_id = null; // Coordinadores no tienen coordinacion_id único
        metadata.is_coordinator = true;
        metadata.is_ejecutivo = false;
      } else {
        // Otros roles
        metadata.coordinacion_id = null;
        metadata.is_coordinator = false;
        metadata.is_ejecutivo = false;
      }

      // Si es admin o administrador_operativo y el email cambió, actualizarlo
      if ((isAdmin || isAdminOperativo) && formData.email && formData.email !== selectedUser.email) {
        const normalizedEmail = formData.email.trim().toLowerCase();
        
        // Verificar que el nuevo email no esté en uso por otro usuario
        const { data: existingUser, error: checkError } = await supabaseSystemUI
          .from('user_profiles_v2')
          .select('id, email')
          .ilike('email', normalizedEmail)
          .neq('id', selectedUser.id)
          .maybeSingle();

        if (checkError) throw checkError;
        
        if (existingUser) {
          throw new Error(`El email ${normalizedEmail} ya está en uso por otro usuario`);
        }

        // Actualizar email usando Edge Function
        const emailResponse = await fetch(`${edgeFunctionsUrl}/functions/v1/auth-admin-proxy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            operation: 'updateUserEmail',
            params: {
              userId: selectedUser.id,
              email: normalizedEmail
            }
          })
        });

        const emailResult = await emailResponse.json();
        if (!emailResponse.ok || !emailResult.success) {
          throw new Error(emailResult.error || 'Error al actualizar email');
        }

        console.log(`✅ Email actualizado: ${normalizedEmail}`);
      }

      // ============================================
      // ACTUALIZAR METADATOS EN auth.users (SUPABASE AUTH NATIVO)
      // ============================================
      const updateResponse = await fetch(`${edgeFunctionsUrl}/functions/v1/auth-admin-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          operation: 'updateUserMetadata',
          params: {
            userId: selectedUser.id,
            metadata
          }
        })
      });

      const updateResult = await updateResponse.json();
      if (!updateResponse.ok || !updateResult.success) {
        console.error('Error actualizando usuario:', updateResult);
        throw new Error(updateResult.error || 'Error al actualizar usuario');
      }

      console.log('✅ Usuario actualizado en auth.users:', selectedUser.id);

      // Si se habilitó la edición de contraseña y se proporcionó una nueva contraseña, actualizarla
      if (isEditingPassword && formData.password.trim()) {
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
              userId: selectedUser.id,
              newPassword: formData.password,
              skipVerification: true // Admin puede cambiar sin verificar contraseña actual
            }
          })
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Error al cambiar la contraseña');
        }
      }

      // Si cambió a evaluador, gestionar subpermisos
      const selectedRole = roles.find(r => r.id === formData.role_id);
      if (selectedRole?.name === 'evaluator') {
        await updateAnalysisSubPermissions(selectedUser.id, formData.analysis_sources);
      } else {
        // Si cambió a otro rol, remover subpermisos de análisis
        await removeAnalysisSubPermissions(selectedUser.id);
      }

      // Si es coordinador, actualizar múltiples coordinaciones usando tabla intermedia
      if (selectedRole?.name === 'coordinador') {
        try {
          // Eliminar relaciones existentes (nueva tabla)
          await supabaseSystemUI
            .from('auth_user_coordinaciones')
            .delete()
            .eq('user_id', selectedUser.id);

          // Insertar nuevas relaciones si hay coordinaciones seleccionadas
          if (formData.coordinaciones_ids.length > 0) {
            const relaciones = formData.coordinaciones_ids.map(coordId => ({
              user_id: selectedUser.id,
              coordinacion_id: coordId,
              assigned_by: currentUser?.id || null
            }));

            const { error: relacionesError } = await supabaseSystemUI
              .from('auth_user_coordinaciones')
              .insert(relaciones);

            if (relacionesError) {
              console.error('Error actualizando coordinaciones del coordinador:', relacionesError);
            }
          }
        } catch (coordError) {
          console.error('Error actualizando coordinaciones:', coordError);
        }
      } else if ((selectedRole?.name === 'ejecutivo' || selectedRole?.name === 'supervisor') && formData.coordinacion_id) {
        // Si es ejecutivo o supervisor, limpiar tabla intermedia (solo tienen una coordinacion_id directa)
        // ⚠️ DOWNGRADE A EJECUTIVO/SUPERVISOR: Limpiar TODAS las relaciones de coordinador
        try {
          // Limpiar relaciones de auth_user_coordinaciones si existían
          await supabaseSystemUI
            .from('auth_user_coordinaciones')
            .delete()
            .eq('user_id', selectedUser.id);
          
          // ⚠️ 2026-01-14: Tabla legacy coordinador_coordinaciones ELIMINADA del código
          // Solo se usa auth_user_coordinaciones como fuente única de verdad
          // El coordinacion_id ya está en metadata y se actualizó en línea 1190
        } catch (coordError) {
          console.error('Error limpiando relaciones de coordinaciones:', coordError);
        }
      } else if (selectedRole && selectedRole.name !== 'coordinador' && selectedRole.name !== 'ejecutivo' && selectedRole.name !== 'supervisor') {
        // Si cambió a otro rol que no es coordinador ni ejecutivo ni supervisor, limpiar todo
        try {
          // Limpiar relaciones de auth_user_coordinaciones (nueva tabla)
          await supabaseSystemUI
            .from('auth_user_coordinaciones')
            .delete()
            .eq('user_id', selectedUser.id);
          
          // ⚠️ 2026-01-14: Tabla legacy coordinador_coordinaciones ELIMINADA del código
          // Solo se usa auth_user_coordinaciones como fuente única de verdad
          // El coordinacion_id null ya está en metadata y se actualizó en línea 1190
        } catch (coordError) {
          console.error('Error limpiando coordinación:', coordError);
        }
      }

      // Actualizar grupo de permisos del usuario
      if (selectedGroupId) {
        try {
          // Usar setUserGroups para reemplazar los grupos existentes con el nuevo
          await groupsService.setUserGroups(selectedUser.id, [selectedGroupId], currentUser?.id || undefined);
        } catch (groupError) {
          console.error('Error actualizando grupo de permisos:', groupError);
          // No fallar la edición si falla la actualización del grupo
        }
      }

      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
      // Limpiar estados de avatar de edición
      setIsEditingAvatar(false);
      setEditAvatarPreview(null);
      setEditAvatarFile(null);
      setShouldDeleteAvatar(false);
      setIsEditingPassword(false);
      await loadUsers();
      setError(null);
    } catch (err: any) {
      console.error('Error updating user:', err);
      setError('Error al actualizar usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockUser = async (user: User) => {
    if (!isAdmin) {
      setError('Solo los administradores pueden desbloquear usuarios');
      return;
    }

    try {
      setUnblockingUserId(user.id);
      
      // Si el usuario tiene un system_ui_user_id, usarlo; si no, usar el ID de PQNC_AI
      const userIdToReset = user.system_ui_user_id || user.id;
      
      const success = await ParaphraseLogService.resetUserWarnings(userIdToReset);
      
      if (success) {
        setError(null);
        // Pequeña animación de éxito antes de recargar
        await new Promise(resolve => setTimeout(resolve, 500));
        await loadUsers(); // Recargar usuarios para actualizar estado
      } else {
        setError('Error al desbloquear usuario');
      }
    } catch (err) {
      console.error('Error desbloqueando usuario:', err);
      setError('Error al desbloquear usuario');
    } finally {
      setUnblockingUserId(null);
    }
  };

  const openArchiveModal = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setUserToArchive(user);
      setShowArchiveModal(true);
    }
  };

  const handleArchiveUser = async () => {
    if (!userToArchive) return;
    
    const userId = userToArchive.id;
    
    if (!canDelete) {
      setError('No tienes permisos para archivar usuarios');
      return;
    }

    // Verificar que no sea el usuario actual
    if (userId === currentUser?.id) {
      setError('No puedes archivar tu propio usuario');
      setShowArchiveModal(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      // Archivar usuario (eliminación lógica) - Usar Edge Function
      const edgeFunctionsUrl = import.meta.env.VITE_EDGE_FUNCTIONS_URL;
      const anonKey = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${edgeFunctionsUrl}/functions/v1/auth-admin-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          operation: 'updateUserMetadata',
          params: {
            userId: userId,
            metadata: {
              archivado: true,
              is_active: false // También desactivar al archivar
            }
          }
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al archivar usuario');
      }

      await loadUsers();
      setError(null);
      setShowArchiveModal(false);
      setUserToArchive(null);
      
    } catch (err: any) {
      console.error('❌ Error archiving user:', err);
      console.error('❌ Error details:', { message: err.message, stack: err.stack });
      setError(`Error al archivar usuario: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchiveUser = async (userId: string) => {
    
    if (!canDelete) {
      setError('No tienes permisos para desarchivar usuarios');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Desarchivar usuario - Usar Edge Function
      const edgeFunctionsUrl = import.meta.env.VITE_EDGE_FUNCTIONS_URL;
      const anonKey = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${edgeFunctionsUrl}/functions/v1/auth-admin-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          operation: 'updateUserMetadata',
          params: {
            userId: userId,
            metadata: {
              archivado: false,
              is_active: true // Reactivar al desarchivar
            }
          }
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al desarchivar usuario');
      }

      await loadUsers();
      setError(null);
      
    } catch (err: any) {
      console.error('❌ Error unarchiving user:', err);
      setError(`Error al desarchivar usuario: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Función para archivar usuario directamente (sin modal de confirmación)
  const handleArchiveUserDirect = async (userId: string, coordinatorId?: string) => {
    if (!canDelete) {
      setError('No tienes permisos para archivar usuarios');
      return;
    }

    if (userId === currentUser?.id) {
      setError('No puedes archivar tu propio usuario');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const user = users.find(u => u.id === userId);
      if (!user) {
        setError('Usuario no encontrado');
        return;
      }

      // Si tiene coordinación y prospectos, reasignar prospectos
      if (coordinatorId && (user.coordinacion_id || (user.coordinaciones_ids && user.coordinaciones_ids.length > 0))) {
        try {
          // Reasignar prospectos de ejecutivos
          if (user.role_name === 'ejecutivo' && user.coordinacion_id) {
            await analysisSupabase
              .from('prospectos')
              .update({ ejecutivo_id: coordinatorId })
              .eq('ejecutivo_id', userId)
              .eq('coordinacion_id', user.coordinacion_id);
          }
          
          // Reasignar prospectos de coordinadores (prospectos de sus coordinaciones)
          if (user.role_name === 'coordinador' && user.coordinaciones_ids) {
            for (const coordId of user.coordinaciones_ids) {
              await analysisSupabase
                .from('prospectos')
                .update({ coordinacion_id: coordinatorId })
                .eq('coordinacion_id', coordId)
                .is('ejecutivo_id', null);
            }
          }
        } catch (reassignError) {
          console.error('Error reasignando prospectos:', reassignError);
          // Continuar con el archivado aunque falle la reasignación
        }
      }

      // Archivar usuario - Usar Edge Function
      const edgeFunctionsUrl = import.meta.env.VITE_EDGE_FUNCTIONS_URL;
      const anonKey = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;
      
      const archiveResponse = await fetch(`${edgeFunctionsUrl}/functions/v1/auth-admin-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          operation: 'updateUserMetadata',
          params: {
            userId: userId,
            metadata: {
              archivado: true,
              is_active: false // También desactivar al archivar
            }
          }
        })
      });

      const archiveResult = await archiveResponse.json();
      if (!archiveResponse.ok || !archiveResult.success) {
        throw new Error(archiveResult.error || 'Error al archivar usuario');
      }

      await loadUsers();
      setError(null);
      setShowEditModal(false);
      setSelectedUser(null);
      setShowArchiveConfirmModal(false);
      setSelectedCoordinatorForArchive('');
      
    } catch (err: any) {
      console.error('❌ Error archiving user:', err);
      setError(`Error al archivar usuario: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Gestión de subpermisos usando localStorage temporal + función RPC cuando esté disponible
  const assignAnalysisSubPermissions = async (userId: string, sources: string[]) => {
    try {
      const nataliaAccess = sources.includes('natalia');
      const pqncAccess = sources.includes('pqnc');
      const liveMonitorAccess = sources.includes('live_monitor');
      
      // MÉTODO TEMPORAL: Guardar en localStorage hasta que RPC funcione completamente
      const userEmail = users.find(u => u.id === userId)?.email;
      if (userEmail) {
        const permissionsKey = `evaluator_permissions_${userEmail}`;
        const permissionsData = {
          userId,
          userEmail,
          natalia_access: nataliaAccess,
          pqnc_access: pqncAccess,
          live_monitor_access: liveMonitorAccess,
          updated_at: new Date().toISOString()
        };
        
        localStorage.setItem(permissionsKey, JSON.stringify(permissionsData));
        
        // Disparar evento para notificar cambios
        window.dispatchEvent(new StorageEvent('storage', {
          key: permissionsKey,
          newValue: JSON.stringify(permissionsData),
          url: window.location.href
        }));
      }

      // INTENTAR USAR FUNCIÓN RPC SI ESTÁ DISPONIBLE
      try {
        const { data: result, error } = await supabaseSystemUI.rpc('configure_evaluator_analysis_permissions', {
          p_target_user_id: userId,
          p_natalia_access: nataliaAccess,
          p_pqnc_access: pqncAccess
          // Omitir live_monitor por ahora hasta que la función se actualice completamente
        });

        if (error) {
          // RPC no disponible, usando localStorage temporal
        }
      } catch (err) {
        // RPC no disponible, usando solo localStorage temporal
      }

    } catch (err) {
      console.error('💥 Error assigning analysis sub-permissions:', err);
    }
  };

  const updateAnalysisSubPermissions = async (userId: string, sources: string[]) => {
    try {
      // Usar directamente la función de asignación que ya maneja la limpieza
      await assignAnalysisSubPermissions(userId, sources);
    } catch (err) {
      console.error('Error updating analysis sub-permissions:', err);
      throw err;
    }
  };

  const removeAnalysisSubPermissions = async (userId: string) => {
    try {
      // Obtener role_id del usuario
      const { data: userData } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select('role_id')
        .eq('id', userId)
        .single();

      if (!userData) return;

      // Remover solo los permisos de análisis con sub_module
      const analysisPermissionIds = permissions
        .filter(p => p.module === 'analisis' && p.sub_module)
        .map(p => p.id);

      if (analysisPermissionIds.length > 0) {
        await supabaseSystemUI
          .from('auth_role_permissions')
          .delete()
          .eq('role_id', userData.role_id)
          .in('permission_id', analysisPermissionIds);
      }
    } catch (err) {
      console.error('Error removing analysis sub-permissions:', err);
    }
  };

  // Función para cargar permisos específicos del usuario desde localStorage
  const loadUserPermissionsDirect = async (userId: string) => {
    try {
      const userEmail = users.find(u => u.id === userId)?.email;
      if (!userEmail) {
        console.error('❌ No se encontró email para usuario:', userId);
        setFormData(prev => ({ ...prev, analysis_sources: [] }));
        return;
      }

      // Cargar desde localStorage
      const permissionsKey = `evaluator_permissions_${userEmail}`;
      const savedPermissions = localStorage.getItem(permissionsKey);
      
      if (savedPermissions) {
        try {
          const permData = JSON.parse(savedPermissions);
          const sources: string[] = [];
          if (permData.natalia_access) sources.push('natalia');
          if (permData.pqnc_access) sources.push('pqnc');
          if (permData.live_monitor_access) sources.push('live_monitor');
          
          setFormData(prev => ({ ...prev, analysis_sources: sources }));
        } catch (err) {
          console.error('❌ Error parseando localStorage:', err);
          setFormData(prev => ({ ...prev, analysis_sources: [] }));
        }
      } else {
        setFormData(prev => ({ ...prev, analysis_sources: [] }));
      }

    } catch (err) {
      console.error('💥 Error en loadUserPermissionsDirect:', err);
      setFormData(prev => ({ ...prev, analysis_sources: [] }));
    }
  };

  const openEditModal = async (user: User) => {
    setSelectedUser(user);
    
    // Cargar coordinaciones del usuario desde System_UI
    let coordinacionId = '';
    let coordinacionesIds: string[] = [];
    let inboundValue = user.inbound || false;
    let idDynamicsValue = user.id_dynamics || '';
    
    if (user.role_name === 'coordinador') {
      // Para coordinadores: cargar desde tabla intermedia (nueva tabla)
      try {
        const { data: relaciones, error: relacionesError } = await supabaseSystemUI
          .from('auth_user_coordinaciones')
          .select('coordinacion_id')
          .eq('user_id', user.id);
        
        if (!relacionesError && relaciones) {
          coordinacionesIds = relaciones.map(r => r.coordinacion_id);
        }
      } catch (error) {
        console.error('Error cargando coordinaciones del coordinador:', error);
      }
    } else if (user.role_name === 'supervisor') {
      // ============================================
      // FIX 2026-01-14: Manejar supervisores correctamente
      // Los supervisores pueden tener:
      // 1. coordinacion_id directo en auth_users
      // 2. Relaciones en auth_user_coordinaciones (múltiples coordinaciones)
      // ============================================
      try {
        // Primero cargar datos del usuario para obtener coordinacion_id directo
        const { data: systemUser, error: systemError } = await supabaseSystemUI
          .from('user_profiles_v2')
          .select('coordinacion_id, id_dynamics, inbound')
          .eq('id', user.id)
          .single();
        
        if (!systemError && systemUser) {
          // Si tiene coordinacion_id directo, usarlo
          if (systemUser.coordinacion_id) {
            coordinacionId = systemUser.coordinacion_id;
          }
          // Actualizar valores locales
          idDynamicsValue = systemUser.id_dynamics || '';
          inboundValue = systemUser.inbound || false;
          
          // Actualizar id_dynamics e inbound en el usuario seleccionado
          if (systemUser.id_dynamics) {
            setSelectedUser({ ...user, id_dynamics: systemUser.id_dynamics, inbound: systemUser.inbound });
          } else {
            setSelectedUser({ ...user, inbound: systemUser.inbound });
          }
        }
        
        // También cargar desde tabla intermedia (supervisores pueden tener múltiples coordinaciones)
        const { data: relaciones, error: relacionesError } = await supabaseSystemUI
          .from('auth_user_coordinaciones')
          .select('coordinacion_id')
          .eq('user_id', user.id);
        
        if (!relacionesError && relaciones && relaciones.length > 0) {
          coordinacionesIds = relaciones.map(r => r.coordinacion_id);
          // Si no tenía coordinacion_id directo pero sí en tabla intermedia, usar el primero
          if (!coordinacionId && coordinacionesIds.length > 0) {
            coordinacionId = coordinacionesIds[0];
          }
        }
      } catch (error) {
        console.error('Error cargando coordinaciones del supervisor:', error);
      }
    } else if (user.role_name === 'ejecutivo') {
      // Para ejecutivos: cargar desde campo coordinacion_id e id_dynamics
      try {
        const { data: systemUser, error: systemError } = await supabaseSystemUI
          .from('user_profiles_v2')
          .select('coordinacion_id, id_dynamics, inbound')
          .eq('id', user.id)
          .single();
        
        if (!systemError && systemUser) {
          coordinacionId = systemUser.coordinacion_id || '';
          // Actualizar valores locales
          idDynamicsValue = systemUser.id_dynamics || '';
          inboundValue = systemUser.inbound || false;
          
          // Actualizar id_dynamics e inbound en el usuario seleccionado
          if (systemUser.id_dynamics) {
            setSelectedUser({ ...user, id_dynamics: systemUser.id_dynamics, inbound: systemUser.inbound });
          } else {
            setSelectedUser({ ...user, inbound: systemUser.inbound });
          }
        }
      } catch (error) {
        console.error('Error cargando coordinación del ejecutivo:', error);
      }
    } else {
      // ============================================
      // FIX 2026-01-14: Para cualquier otro rol, cargar coordinacion_id si existe
      // Esto cubre admin, admin_operativo, evaluator, etc.
      // ============================================
      try {
        const { data: systemUser, error: systemError } = await supabaseSystemUI
          .from('user_profiles_v2')
          .select('coordinacion_id, id_dynamics, inbound')
          .eq('id', user.id)
          .single();
        
        if (!systemError && systemUser) {
          coordinacionId = systemUser.coordinacion_id || '';
          // Actualizar valores locales
          idDynamicsValue = systemUser.id_dynamics || '';
          inboundValue = systemUser.inbound || false;
          
          if (systemUser.id_dynamics) {
            setSelectedUser({ ...user, id_dynamics: systemUser.id_dynamics, inbound: systemUser.inbound });
          } else {
            setSelectedUser({ ...user, inbound: systemUser.inbound });
          }
        }
      } catch (error) {
        console.error('Error cargando datos del usuario:', error);
      }
    }
    
    setFormData({
      email: user.email,
      password: '', // No mostrar password actual
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone || '',
      department: user.department || '',
      position: user.position || '',
      role_id: user.role_id,
      coordinacion_id: coordinacionId,
      coordinaciones_ids: coordinacionesIds,
      is_active: user.is_active,
      is_operativo: user.is_operativo !== undefined ? user.is_operativo : true,
      inbound: inboundValue, // Usar valor cargado desde BD
      id_dynamics: idDynamicsValue, // Usar valor cargado desde BD
      analysis_sources: []
    });
    
    // Cargar grupo de permisos del usuario
    const userGroupId = await getUserGroupId(user.id);
    if (userGroupId) {
      setSelectedGroupId(userGroupId);
    } else {
      // Si no tiene grupo asignado, intentar deducirlo del rol
      const matchingGroup = permissionGroups.find(g => g.base_role === user.role_name);
      if (matchingGroup) {
        setSelectedGroupId(matchingGroup.id);
      } else {
        setSelectedGroupId('');
      }
    }
    
    // Resetear estado de edición de contraseña
    setIsEditingPassword(false);

    // Cargar subpermisos actuales si es evaluador
    if (user.role_name === 'evaluator') {
      // Usar localStorage como fuente principal para gestión dinámica
      await loadUserPermissionsDirect(user.id);
    }

    setShowEditModal(true);
  };

  const openPermissionsModal = async (user: User) => {
    setSelectedUser(user);
    await loadUserPermissions(user.id);
    setShowPermissionsModal(true);
  };

  if (!canView) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-lg">
          No tienes permisos para ver la gestión de usuarios
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ⚠️ DEPRECATION WARNING */}
      <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-orange-900 dark:text-orange-200">
              ⚠️ COMPONENTE DEPRECADO - NO EDITAR
            </h3>
            <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
              Este componente está deprecado desde el 22 de Enero 2026. 
              Se mantiene solo por compatibilidad. 
              <strong> Usa UserManagementV2 para nuevas funcionalidades.</strong>
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
              Flag activo: <code className="bg-orange-100 dark:bg-orange-800 px-1 rounded">USE_NEW_USER_MANAGEMENT = true</code>
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestión de Usuarios (LEGACY)
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Administra usuarios, roles y permisos del sistema
          </p>
        </div>
        
        {canCreate && !isCoordinador && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Crear Usuario</span>
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {/* Campo de búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtro por coordinación */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={filterCoordinacion}
              onChange={(e) => setFilterCoordinacion(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">Todas las coordinaciones</option>
              {coordinaciones.map(coord => (
                <option key={coord.id} value={coord.id}>
                  {coord.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por departamento */}
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">Todos los departamentos</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Switch para cambiar entre vista activos/archivados */}
          <div className="flex items-center space-x-3 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 sm:col-span-2 lg:col-span-1">
            <button
              type="button"
              onClick={() => setViewMode('active')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                viewMode === 'active'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Activos
            </button>
            <button
              type="button"
              onClick={() => setViewMode('archived')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                viewMode === 'archived'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Archivados
            </button>
          </div>

          {/* Items por página */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value={10}>10 por página</option>
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
            </select>
          </div>
        </div>

        {/* Información de resultados */}
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Mostrando {paginatedUsers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, sortedUsers.length)} de {sortedUsers.length} usuarios
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th 
                  className="px-4 sm:px-5 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => {
                    if (sortColumn === 'name') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortColumn('name');
                      setSortDirection('asc');
                    }
                  }}
                >
                  <div className="flex items-center space-x-1">
                    <span>Usuario</span>
                    {sortColumn === 'name' ? (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )
                    ) : (
                      <ArrowUpDown className="w-4 h-4 opacity-30" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 sm:px-5 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => {
                    if (sortColumn === 'role') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortColumn('role');
                      setSortDirection('asc');
                    }
                  }}
                >
                  <div className="flex items-center space-x-1">
                    <span>Rol</span>
                    {sortColumn === 'role' ? (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )
                    ) : (
                      <ArrowUpDown className="w-4 h-4 opacity-30" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 sm:px-5 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => {
                    if (sortColumn === 'department') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortColumn('department');
                      setSortDirection('asc');
                    }
                  }}
                >
                  <div className="flex items-center space-x-1">
                    <span>Departamento</span>
                    {sortColumn === 'department' ? (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )
                    ) : (
                      <ArrowUpDown className="w-4 h-4 opacity-30" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 sm:px-5 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => {
                    if (sortColumn === 'last_login') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortColumn('last_login');
                      setSortDirection('desc'); // Por defecto, más recientes primero
                    }
                  }}
                >
                  <div className="flex items-center space-x-1">
                    <span>Último acceso</span>
                    {sortColumn === 'last_login' ? (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )
                    ) : (
                      <ArrowUpDown className="w-4 h-4 opacity-30" />
                    )}
                  </div>
                </th>
                <th className="px-4 sm:px-5 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-48">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 sm:px-5 lg:px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    {searchQuery || filterCoordinacion || filterDepartment
                      ? 'No se encontraron usuarios con los filtros aplicados'
                      : 'No hay usuarios registrados'}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 sm:px-5 lg:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div 
                          className={`h-10 w-10 flex-shrink-0 relative ${user.is_blocked ? 'cursor-pointer' : ''}`}
                          onClick={user.is_blocked && canEdit ? () => openEditModal(user) : undefined}
                          title={user.is_blocked ? 'Usuario bloqueado - Click para editar' : undefined}
                        >
                          {user.is_blocked ? (
                            // Avatar con candado rojo cuando está bloqueado
                            <div className="h-10 w-10 rounded-full bg-red-500 dark:bg-red-600 flex items-center justify-center shadow-lg hover:bg-red-600 dark:hover:bg-red-700 transition-colors">
                              <Lock className="w-5 h-5 text-white" />
                            </div>
                          ) : user.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt={user.full_name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                              </span>
                            </div>
                          )}
                          {/* Punto de estado en la esquina */}
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                            user.is_active ? 'bg-green-500' : 'bg-gray-400'
                          }`} title={user.is_active ? 'Activo' : 'Inactivo'}></div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.full_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 lg:px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const colors = getRoleColors(user.role_name);
                        return (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}>
                            {user.role_display_name}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 sm:px-5 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {(() => {
                        // Mostrar departamento > coordinación > nada
                        if (user.department) {
                          return user.department;
                        }
                        // Si no tiene departamento, buscar coordinación
                        if (user.coordinacion_id) {
                          const coordinacion = coordinaciones.find(c => c.id === user.coordinacion_id);
                          return coordinacion ? coordinacion.nombre : '-';
                        }
                        if (user.coordinaciones_ids && user.coordinaciones_ids.length > 0) {
                          const primeraCoord = coordinaciones.find(c => user.coordinaciones_ids?.includes(c.id));
                          return primeraCoord ? primeraCoord.nombre : '-';
                        }
                        return '-';
                      })()}
                    </td>
                    <td className="px-4 sm:px-5 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.last_login 
                        ? new Date(user.last_login).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'America/Mexico_City',
                            hour12: false
                          })
                        : 'Nunca'
                      }
                    </td>
                    <td className="px-4 sm:px-5 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center space-x-4">
                        {canEdit && (() => {
                          // Administrador Operativo: solo puede editar coordinadores y ejecutivos
                          if (isAdminOperativo && !['coordinador', 'ejecutivo'].includes(user.role_name)) {
                            return null;
                          }
                          // Coordinador: solo puede editar ejecutivos de su coordinación
                          if (isCoordinador) {
                            if (user.role_name !== 'ejecutivo') {
                              return null;
                            }
                            // Verificar que el ejecutivo pertenece a una de las coordinaciones del coordinador
                            if (!currentUser?.coordinaciones_ids || currentUser.coordinaciones_ids.length === 0) {
                              return null;
                            }
                            if (!user.coordinacion_id || !currentUser.coordinaciones_ids.includes(user.coordinacion_id)) {
                              return null;
                            }
                          }
                          return (
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-2.5 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all duration-200"
                              title="Editar usuario"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          );
                        })()}

                        {user.archivado && canDelete && (
                          <button
                            onClick={() => handleUnarchiveUser(user.id)}
                            className="p-2.5 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200"
                            title="Desarchivar usuario"
                            disabled={loading}
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 sm:px-5 lg:px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Página <span className="font-medium">{currentPage}</span> de{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  {/* Números de página */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Mostrar primera página, última página, página actual y páginas adyacentes
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === page
                              ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 dark:text-blue-300'
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span
                          key={page}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
      {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => { setShowCreateModal(false); resetForm(); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
            >
              {/* Header con Avatar */}
              <div className="relative px-8 pt-8 pb-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1 min-w-0">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                      className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-0.5 shadow-lg group cursor-pointer flex-shrink-0"
                      onClick={() => {
                        setIsEditingAvatar(false);
                        setShowAvatarCropModal(true);
                      }}
                    >
                      <div className="w-full h-full rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                        {avatarPreview ? (
                          <img 
                            src={avatarPreview} 
                            alt="Avatar preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      {/* Overlay con lápiz al hover */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center transition-opacity duration-200 pointer-events-none"
                      >
                        <Pencil className="w-6 h-6 text-white" />
                      </motion.div>
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <motion.h3
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="text-2xl font-bold text-gray-900 dark:text-white mb-1"
                      >
              Crear Nuevo Usuario
                      </motion.h3>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed"
                      >
                        Completa la información para crear un nuevo usuario
                      </motion.p>
                    </div>
                  </div>
                  <motion.button
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    transition={{ delay: 0.25 }}
                    onClick={() => { setShowCreateModal(false); resetForm(); }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 group flex-shrink-0 ml-4"
                  >
                    <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>
              </div>

              {/* Contenido con Scroll */}
              <div className="overflow-y-auto flex-1 px-8 py-8 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                <form id="create-user-form" onSubmit={handleCreateUser} className="space-y-6">
                  {/* Sección: Información Personal */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Información Personal
                      </h4>
                    </div>

                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <Mail className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <span>Email *</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                        placeholder="usuario@ejemplo.com"
                />
              </div>

                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <Lock className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <span>Contraseña *</span>
                </label>
                <input
                  type="password"
                  id="create-password"
                  name="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                        placeholder="••••••••"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                      <div className="group">
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <User className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                          <span>Nombre *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                          placeholder="Nombre"
                  />
                </div>

                      <div className="group">
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <User className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                          <span>Apellido *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                          placeholder="Apellido"
                  />
                </div>
              </div>
                  </motion.div>

                  {/* Sección: Grupo de Permisos */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Grupo de Permisos
                      </h4>
                    </div>

                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <Shield className="w-4 h-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                        <span>Grupo de Permisos *</span>
                </label>
                <select
                  required
                  value={selectedGroupId}
                  onChange={(e) => handleGroupChange(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-[length:12px_8px] bg-[right_1rem_center] bg-no-repeat"
                >
                  <option value="">Seleccionar grupo...</option>
                  {permissionGroups
                    .filter(group => {
                      // Administrador Operativo: solo puede seleccionar ciertos grupos
                      if (isAdminOperativo) {
                        return ['system_coordinador', 'system_ejecutivo', 'system_supervisor', 'system_admin_operativo'].includes(group.name);
                      }
                      // Admin: puede seleccionar cualquier grupo
                      if (isAdmin) {
                        return true;
                      }
                      // Coordinador: solo grupos de ejecutivo
                      if (isCoordinador) {
                        return group.name === 'system_ejecutivo';
                      }
                      return true;
                    })
                    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
                    .map(group => (
                      <option key={group.id} value={group.id}>
                        {group.display_name}
                      </option>
                    ))}
                </select>
                {selectedGroupId && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {permissionGroups.find(g => g.id === selectedGroupId)?.description}
                  </p>
                )}
              </div>

              {/* Selector de Coordinaciones para Coordinadores (Múltiples) */}
              {permissionGroups.find(g => g.id === selectedGroupId)?.base_role === 'coordinador' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center space-x-2 mb-4 mt-2">
                    <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Coordinaciones
                    </h4>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    {coordinaciones.filter(c => !c.archivado).map((coordinacion, index) => {
                      const isChecked = formData.coordinaciones_ids.includes(coordinacion.id);
                      return (
                        <motion.label
                          key={coordinacion.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.25 + index * 0.05 }}
                          className="relative flex items-center p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 cursor-pointer hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 group"
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isChecked}
                            onChange={(e) => {
                              const ids = e.target.checked
                                ? [...formData.coordinaciones_ids, coordinacion.id]
                                : formData.coordinaciones_ids.filter(id => id !== coordinacion.id);
                              setFormData({ ...formData, coordinaciones_ids: ids });
                            }}
                          />
                          <div className={`w-5 h-5 rounded-lg border-2 mr-3 flex items-center justify-center transition-all ${
                            isChecked
                              ? 'bg-purple-500 border-purple-500'
                              : 'border-gray-300 dark:border-gray-600 group-hover:border-purple-400'
                          }`}>
                            {isChecked && (
                              <motion.svg
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-3 h-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </motion.svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {coordinacion.codigo} - {coordinacion.nombre}
                            </span>
                            {coordinacion.descripcion && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {coordinacion.descripcion}
                              </p>
                            )}
                          </div>
                        </motion.label>
                      );
                    })}
                    {coordinaciones.filter(c => !c.archivado).length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        No hay coordinaciones activas disponibles
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Selector de Coordinación para Ejecutivos y Supervisores (Una sola) */}
              {(permissionGroups.find(g => g.id === selectedGroupId)?.base_role === 'ejecutivo' || 
                permissionGroups.find(g => g.id === selectedGroupId)?.base_role === 'supervisor') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="group">
                    <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      <Building2 className="w-4 h-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                      <span>Coordinación *</span>
                    </label>
                    <select
                      required
                      value={formData.coordinacion_id}
                      onChange={(e) => setFormData({ ...formData, coordinacion_id: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-[length:12px_8px] bg-[right_1rem_center] bg-no-repeat"
                    >
                      <option value="">Seleccionar coordinación...</option>
                      {coordinaciones.filter(c => !c.archivado).map(coordinacion => (
                        <option key={coordinacion.id} value={coordinacion.id}>
                          {coordinacion.codigo} - {coordinacion.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </motion.div>
              )}

              {/* Permisos de análisis según rol */}
              {permissionGroups.find(g => g.id === selectedGroupId)?.base_role === 'evaluador' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center space-x-2 mb-4 mt-2">
                          <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Fuentes de Análisis
                          </h4>
                        </div>
                  <div className="space-y-2">
                          {['natalia', 'pqnc', 'live_monitor'].map((source, index) => {
                            const isChecked = formData.analysis_sources.includes(source);
                            const labels = {
                              natalia: 'Análisis de Natalia',
                              pqnc: 'Análisis de PQNC Humans',
                              live_monitor: 'Live Monitor'
                            };
                            return (
                              <motion.label
                                key={source}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.25 + index * 0.05 }}
                                className="relative flex items-center p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 group"
                              >
                      <input
                        type="checkbox"
                                  className="sr-only"
                                  checked={isChecked}
                        onChange={(e) => {
                          const sources = e.target.checked
                                      ? [...formData.analysis_sources, source]
                                      : formData.analysis_sources.filter(s => s !== source);
                          setFormData({ ...formData, analysis_sources: sources });
                        }}
                                />
                                <div className={`w-5 h-5 rounded-lg border-2 mr-3 flex items-center justify-center transition-all ${
                                  isChecked
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'border-gray-300 dark:border-gray-600 group-hover:border-blue-400'
                                }`}>
                                  {isChecked && (
                                    <motion.svg
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="w-3 h-3 text-white"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </motion.svg>
                                  )}
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {labels[source as keyof typeof labels]}
                      </span>
                              </motion.label>
                            );
                          })}
                  </div>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Sección: Información Profesional */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Información Profesional
                      </h4>
                    </div>

              <div className="grid grid-cols-2 gap-4">
                      <div className="group">
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <Phone className="w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                          <span>Teléfono</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                          placeholder="+52 123 456 7890"
                  />
                </div>

                      <div className="group">
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <Building2 className="w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                          <span>Departamento</span>
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                          placeholder="Departamento"
                  />
                </div>
              </div>

                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <Briefcase className="w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                        <span>Posición</span>
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                        placeholder="Cargo o posición"
                />
              </div>

                    {/* Toggle Switch para Usuario Activo */}
                    <motion.label
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-all duration-200 group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                          formData.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                        }`}>
                          <motion.div
                            animate={{ x: formData.is_active ? 24 : 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg"
                          />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Usuario Activo
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            El usuario podrá iniciar sesión en el sistema
                          </p>
                        </div>
                      </div>
                <input
                  type="checkbox"
                        className="sr-only"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      />
                    </motion.label>
                  </motion.div>
                </form>
              </div>

              {/* Footer con Botones */}
              <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  form="create-user-form"
                  disabled={loading}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25"
                >
                  {loading ? (
                    <span className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creando...</span>
                    </span>
                  ) : (
                    'Crear Usuario'
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
      )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
      {showEditModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => { setShowEditModal(false); setSelectedUser(null); resetForm(); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
            >
              {/* Header con Avatar */}
              <div className="relative px-8 pt-8 pb-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1 min-w-0">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                      className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-0.5 shadow-lg flex-shrink-0 group cursor-pointer"
                      onClick={() => {
                        setIsEditingAvatar(true);
                        setShowAvatarCropModal(true);
                        // Si hay avatar actual, establecerlo como preview inicial
                        if (selectedUser.avatar_url) {
                          setEditAvatarPreview(selectedUser.avatar_url);
                        }
                      }}
                    >
                      <div className="w-full h-full rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                        {editAvatarPreview ? (
                          <img 
                            src={editAvatarPreview} 
                            alt={selectedUser.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : selectedUser.avatar_url ? (
                          <img 
                            src={selectedUser.avatar_url} 
                            alt={selectedUser.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      {/* Overlay con lápiz al hover */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center transition-opacity duration-200 pointer-events-none"
                      >
                        <Pencil className="w-6 h-6 text-white" />
                      </motion.div>
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <motion.h3
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="text-2xl font-bold text-gray-900 dark:text-white mb-1"
                      >
                        Editar Usuario
                      </motion.h3>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed"
                      >
                        {selectedUser.full_name} • {selectedUser.email}
                      </motion.p>
                      {/* Alerta de bloqueo */}
                      {selectedUser.is_blocked && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.25 }}
                          className="mt-3 flex items-center space-x-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                        >
                          <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-red-800 dark:text-red-300">
                              Usuario bloqueado por moderación
                            </p>
                            {selectedUser.warning_count !== undefined && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                                {selectedUser.warning_count} infracción{selectedUser.warning_count !== 1 ? 'es' : ''} registrada{selectedUser.warning_count !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                  <motion.button
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    transition={{ delay: 0.25 }}
                    onClick={() => { setShowEditModal(false); setSelectedUser(null); resetForm(); }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 group flex-shrink-0 ml-4"
                  >
                    <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>
              </div>

              {/* Contenido con Scroll */}
              <div className="overflow-y-auto flex-1 px-8 py-8 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                <form id="edit-user-form" onSubmit={handleEditUser} className="space-y-6">
                  {/* Sección: Información Personal */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Información Personal
                      </h4>
                    </div>

                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <Mail className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <span>Email {isAdmin || isAdminOperativo ? '*' : ''}</span>
                </label>
                <input
                  type="email"
                  required={isAdmin || isAdminOperativo}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value.trim().toLowerCase() })}
                  disabled={!(isAdmin || isAdminOperativo)}
                        className={`w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 ${
                          isAdmin || isAdminOperativo
                            ? 'hover:border-gray-300 dark:hover:border-gray-600'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        }`}
                        placeholder="usuario@ejemplo.com"
                />
                {!(isAdmin || isAdminOperativo) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Solo administradores pueden modificar el email
                  </p>
                )}
                {(isAdmin || isAdminOperativo) && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    El email se normalizará a minúsculas automáticamente
                  </p>
                )}
              </div>


              <div className="grid grid-cols-2 gap-4">
                      <div className="group">
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <User className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                          <span>Nombre *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                          placeholder="Nombre"
                  />
                </div>

                      <div className="group">
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <User className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                          <span>Apellido *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                          placeholder="Apellido"
                  />
                </div>
              </div>

                    <div className="group">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                          <Lock className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                          <span>Contraseña</span>
                        </label>
                        {!isEditingPassword && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingPassword(true);
                              setFormData({ ...formData, password: '' });
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors flex items-center space-x-1"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Editar Contraseña</span>
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="password"
                          id="edit-password"
                          name="password"
                          autoComplete="new-password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          disabled={!isEditingPassword}
                          placeholder={isEditingPassword ? "Ingresa la nueva contraseña" : "••••••••"}
                          className={`w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 ${
                            isEditingPassword
                              ? 'hover:border-gray-300 dark:hover:border-gray-600'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          }`}
                        />
                        {isEditingPassword && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingPassword(false);
                              setFormData({ ...formData, password: '' });
                            }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="Cancelar edición de contraseña"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {isEditingPassword && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Completa este campo para cambiar la contraseña. Deja vacío y cancela si no deseas cambiarla.
                        </p>
                      )}
                      {!isEditingPassword && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          La contraseña no se modificará. Haz clic en "Editar Contraseña" para cambiarla.
                        </p>
                      )}
                    </div>
                  </motion.div>

                  {/* Sección: Grupo de Permisos */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Grupo de Permisos
                      </h4>
                    </div>

                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <Shield className="w-4 h-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                        <span>Grupo de Permisos *</span>
                </label>
                <select
                  required
                  value={selectedGroupId}
                  onChange={(e) => {
                    handleGroupChange(e.target.value);
                    setFormData(prev => ({ ...prev, analysis_sources: [] }));
                  }}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-[length:12px_8px] bg-[right_1rem_center] bg-no-repeat"
                >
                  <option value="">Seleccionar grupo...</option>
                  {permissionGroups
                    .filter(group => {
                      // Administrador Operativo: solo puede seleccionar ciertos grupos
                      if (isAdminOperativo) {
                        return ['system_coordinador', 'system_ejecutivo', 'system_supervisor', 'system_admin_operativo'].includes(group.name);
                      }
                      // Admin: puede seleccionar cualquier grupo
                      if (isAdmin) {
                        return true;
                      }
                      // Coordinador: solo grupos de ejecutivo
                      if (isCoordinador) {
                        return group.name === 'system_ejecutivo';
                      }
                      return true;
                    })
                    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
                    .map(group => (
                      <option key={group.id} value={group.id}>
                        {group.display_name}
                      </option>
                    ))}
                </select>
                {selectedGroupId && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {permissionGroups.find(g => g.id === selectedGroupId)?.description}
                  </p>
                )}
              </div>

              {/* Selector de Coordinaciones para Coordinadores (Múltiples) - Modal Edición */}
              {permissionGroups.find(g => g.id === selectedGroupId)?.base_role === 'coordinador' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center space-x-2 mb-4 mt-2">
                    <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Coordinaciones
                    </h4>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    {coordinaciones.filter(c => !c.archivado).map((coordinacion, index) => {
                      const isChecked = formData.coordinaciones_ids.includes(coordinacion.id);
                      return (
                        <motion.label
                          key={coordinacion.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.25 + index * 0.05 }}
                          className="relative flex items-center p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 cursor-pointer hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 group"
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isChecked}
                            onChange={(e) => {
                              const ids = e.target.checked
                                ? [...formData.coordinaciones_ids, coordinacion.id]
                                : formData.coordinaciones_ids.filter(id => id !== coordinacion.id);
                              setFormData({ ...formData, coordinaciones_ids: ids });
                            }}
                          />
                          <div className={`w-5 h-5 rounded-lg border-2 mr-3 flex items-center justify-center transition-all ${
                            isChecked
                              ? 'bg-purple-500 border-purple-500'
                              : 'border-gray-300 dark:border-gray-600 group-hover:border-purple-400'
                          }`}>
                            {isChecked && (
                              <motion.svg
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-3 h-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </motion.svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {coordinacion.codigo} - {coordinacion.nombre}
                            </span>
                            {coordinacion.descripcion && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {coordinacion.descripcion}
                              </p>
                            )}
                          </div>
                        </motion.label>
                      );
                    })}
                    {coordinaciones.filter(c => !c.archivado).length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        No hay coordinaciones activas disponibles
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Selector de Coordinación para Ejecutivos y Supervisores (Una sola) - Modal Edición */}
              {(permissionGroups.find(g => g.id === selectedGroupId)?.base_role === 'ejecutivo' || 
                permissionGroups.find(g => g.id === selectedGroupId)?.base_role === 'supervisor') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="group">
                    <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      <Building2 className="w-4 h-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                      <span>Coordinación *</span>
                    </label>
                    <select
                      required
                      value={formData.coordinacion_id}
                      onChange={(e) => setFormData({ ...formData, coordinacion_id: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-[length:12px_8px] bg-[right_1rem_center] bg-no-repeat"
                    >
                      <option value="">Seleccionar coordinación...</option>
                      {coordinaciones.filter(c => !c.archivado).map(coordinacion => (
                        <option key={coordinacion.id} value={coordinacion.id}>
                          {coordinacion.codigo} - {coordinacion.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </motion.div>
              )}

              {/* Permisos de análisis según rol */}
              {permissionGroups.find(g => g.id === selectedGroupId)?.base_role === 'evaluador' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center space-x-2 mb-4 mt-2">
                          <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Fuentes de Análisis
                          </h4>
                        </div>
                  <div className="space-y-2">
                          {['natalia', 'pqnc', 'live_monitor'].map((source, index) => {
                            const isChecked = formData.analysis_sources.includes(source);
                            const labels = {
                              natalia: 'Análisis de Natalia',
                              pqnc: 'Análisis de PQNC Humans',
                              live_monitor: 'Live Monitor'
                            };
                            return (
                              <motion.label
                                key={source}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.25 + index * 0.05 }}
                                className="relative flex items-center p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 group"
                              >
                      <input
                        type="checkbox"
                                  className="sr-only"
                                  checked={isChecked}
                        onChange={(e) => {
                          const sources = e.target.checked
                                      ? [...formData.analysis_sources, source]
                                      : formData.analysis_sources.filter(s => s !== source);
                          setFormData({ ...formData, analysis_sources: sources });
                        }}
                                />
                                <div className={`w-5 h-5 rounded-lg border-2 mr-3 flex items-center justify-center transition-all ${
                                  isChecked
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'border-gray-300 dark:border-gray-600 group-hover:border-blue-400'
                                }`}>
                                  {isChecked && (
                                    <motion.svg
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="w-3 h-3 text-white"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </motion.svg>
                                  )}
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {labels[source as keyof typeof labels]}
                      </span>
                              </motion.label>
                            );
                          })}
                  </div>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Sección: Información Profesional */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Información Profesional
                      </h4>
                    </div>

              <div className="grid grid-cols-2 gap-4">
                      <div className="group">
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <Phone className="w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                          <span>Teléfono</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                          placeholder="+52 123 456 7890"
                  />
                </div>

                      <div className="group">
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <Building2 className="w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                          <span>Departamento</span>
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                          placeholder="Departamento"
                  />
                </div>
              </div>

                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <Briefcase className="w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                        <span>Posición</span>
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                        placeholder="Cargo o posición"
                />
              </div>
                  </motion.div>

                  {/* Sección: Estado del Usuario */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-1 h-5 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Estado del Usuario
                      </h4>
                    </div>

                    {/* Toggle Switch para Usuario Activo */}
                    <motion.label
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-all duration-200 group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                          formData.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                        }`}>
                          <motion.div
                            animate={{ x: formData.is_active ? 24 : 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg"
                          />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Usuario Activo
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            El usuario podrá iniciar sesión en el sistema
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      />
                    </motion.label>

                    {/* Indicador de Usuario en Línea - Solo visualización */}
                    {selectedUser && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 }}
                      className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className={`w-3 h-3 rounded-full ${
                            formData.is_operativo !== false ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-600'
                          } shadow-lg`}></div>
                          {formData.is_operativo !== false && (
                            <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Usuario en Línea
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formData.is_operativo !== false 
                              ? 'El usuario está actualmente conectado' 
                              : 'El usuario está desconectado'}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                        formData.is_operativo !== false
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>
                        {formData.is_operativo !== false ? 'En línea' : 'Desconectado'}
                      </span>
                    </motion.div>
                    )}
                  </motion.div>
                </form>
              </div>

              {/* Footer con Botones */}
              <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                {/* Botones a la izquierda */}
                <div className="flex items-center space-x-3">
                  {/* Botón Desbloquear (solo si está bloqueado) */}
                  {isAdmin && selectedUser && selectedUser.is_blocked && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => handleUnblockUser(selectedUser)}
                      disabled={unblockingUserId === selectedUser.id}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-emerald-500/25 flex items-center space-x-2"
                    >
                      {unblockingUserId === selectedUser.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Desbloqueando...</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4" />
                          <span>Desbloquear Usuario</span>
                        </>
                      )}
                    </motion.button>
                  )}
                  
                  {/* Botón Archivar */}
                  {canDelete && selectedUser && !selectedUser.archivado && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={async () => {
                        // Contar prospectos del usuario en la base de análisis
                        try {
                          let count = 0;
                          
                          // Contar prospectos de ejecutivos
                          if (selectedUser.role_name === 'ejecutivo' && selectedUser.coordinacion_id) {
                            const { count: ejecutivoCount } = await analysisSupabase
                              .from('prospectos')
                              .select('*', { count: 'exact', head: true })
                              .eq('ejecutivo_id', selectedUser.id)
                              .eq('coordinacion_id', selectedUser.coordinacion_id);
                            count += ejecutivoCount || 0;
                          }
                          
                          // Contar prospectos de coordinadores
                          if (selectedUser.role_name === 'coordinador' && selectedUser.coordinaciones_ids && selectedUser.coordinaciones_ids.length > 0) {
                            const { count: coordinadorCount } = await analysisSupabase
                              .from('prospectos')
                              .select('*', { count: 'exact', head: true })
                              .in('coordinacion_id', selectedUser.coordinaciones_ids);
                            count += coordinadorCount || 0;
                          }
                          
                          setUserProspectsCount(count);
                          
                          // Si tiene coordinación y prospectos, mostrar modal de confirmación
                          if ((selectedUser.coordinacion_id || (selectedUser.coordinaciones_ids && selectedUser.coordinaciones_ids.length > 0)) && count > 0) {
                            setShowArchiveConfirmModal(true);
                          } else {
                            // Si no tiene coordinación o prospectos, archivar directamente
                            await handleArchiveUserDirect(selectedUser.id);
                          }
                        } catch (error) {
                          console.error('Error contando prospectos:', error);
                          // En caso de error, archivar directamente
                          await handleArchiveUserDirect(selectedUser.id);
                        }
                      }}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl hover:from-orange-700 hover:to-orange-800 transition-all duration-200 shadow-lg shadow-orange-500/25 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      <span>Archivar Usuario</span>
                    </motion.button>
                  )}
                </div>
                
                {/* Botones de acción a la derecha */}
                <div className="flex justify-end space-x-3 ml-auto">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => { setShowEditModal(false); setSelectedUser(null); resetForm(); }}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    form="edit-user-form"
                    disabled={loading}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25"
                  >
                    {loading ? (
                      <span className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Guardando...</span>
                      </span>
                    ) : (
                      'Guardar Cambios'
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
      )}
      </AnimatePresence>

      {/* Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Permisos de {selectedUser.full_name}
            </h3>
            
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Rol: {selectedUser.role_display_name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {roles.find(r => r.name === selectedUser.role_name)?.description}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Permisos asignados:
                </h4>
                
                {userPermissions.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Cargando permisos...
                  </p>
                ) : (
                  <div className="space-y-3">
                    {['analisis', 'admin', 'live-chat', 'live-monitor', 'prospectos'].map(module => {
                      const modulePermissions = userPermissions.filter(p => p.module === module);
                      if (modulePermissions.length === 0) return null;
                      
                      return (
                        <div key={module} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                          <h5 className="font-medium text-gray-900 dark:text-white mb-2 capitalize">
                            {module === 'analisis' ? 'Análisis' : 
                             module === 'live-chat' ? 'Live Chat' :
                             module === 'live-monitor' ? 'Live Monitor' :
                             module === 'prospectos' ? 'Prospectos' : 'Administración'}
                          </h5>
                          <div className="grid grid-cols-1 gap-1">
                            {modulePermissions.map(permission => (
                              <div key={permission.permission_name} className="flex items-center text-sm">
                                <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-gray-700 dark:text-gray-300">
                                  {permission.permission_name.replace(`${module}.`, '').replace('.', ' ')}
                                  {permission.sub_module && (
                                    <span className="text-blue-600 dark:text-blue-400 ml-1">
                                      ({permission.sub_module})
                                    </span>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => { setShowPermissionsModal(false); setSelectedUser(null); }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      <AnimatePresence>
        {showArchiveModal && userToArchive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => { setShowArchiveModal(false); setUserToArchive(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
            >
              {/* Header */}
              <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Archivar Usuario
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Eliminación lógica del usuario
                    </p>
                  </div>
                  <motion.button
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    transition={{ delay: 0.25 }}
                    onClick={() => { setShowArchiveModal(false); setUserToArchive(null); }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 group"
                  >
                    <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                  </motion.button>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                <div className="space-y-6">
                  {/* Información del usuario */}
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {userToArchive.full_name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {userToArchive.email}
                      </p>
                      {userToArchive.role_display_name && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {userToArchive.role_display_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Advertencia */}
                  <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center mt-0.5">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-orange-900 dark:text-orange-200 mb-2">
                          Eliminación Lógica
                        </h4>
                        <p className="text-sm text-orange-800 dark:text-orange-300 mb-3">
                          El usuario será archivado (no eliminado permanentemente):
                        </p>
                        <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1.5">
                          <li className="flex items-start space-x-2">
                            <span className="text-orange-500 mt-0.5">•</span>
                            <span>El registro se mantiene en la base de datos</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-orange-500 mt-0.5">•</span>
                            <span>No se mostrará en la lista por defecto</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-orange-500 mt-0.5">•</span>
                            <span>Puede ser desarchivado en cualquier momento</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-orange-500 mt-0.5">•</span>
                            <span>Se marcará como inactivo automáticamente (is_active = false)</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setShowArchiveModal(false); setUserToArchive(null); }}
                  disabled={loading}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  onClick={handleArchiveUser}
                  disabled={loading}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-orange-500/25 flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Archivando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      <span>Archivar Usuario</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Archive Confirm Modal - Para seleccionar coordinador */}
      <AnimatePresence>
        {showArchiveConfirmModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => { setShowArchiveConfirmModal(false); setSelectedCoordinatorForArchive(''); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
            >
              {/* Header */}
              <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Archivar Usuario
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Reasignar prospectos antes de archivar
                    </p>
                  </div>
                  <motion.button
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    transition={{ delay: 0.25 }}
                    onClick={() => { setShowArchiveConfirmModal(false); setSelectedCoordinatorForArchive(''); }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 group"
                  >
                    <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                  </motion.button>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                <div className="space-y-6">
                  {/* Información del usuario */}
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedUser.full_name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedUser.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {userProspectsCount} prospecto(s) asignado(s)
                      </p>
                    </div>
                  </div>

                  {/* Advertencia */}
                  <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center mt-0.5">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-orange-900 dark:text-orange-200 mb-2">
                          Acciones Irreversibles
                        </h4>
                        <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1.5">
                          <li className="flex items-start space-x-2">
                            <span className="text-orange-500 mt-0.5">•</span>
                            <span>El usuario será archivado y no podrá hacer login</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-orange-500 mt-0.5">•</span>
                            <span>Los {userProspectsCount} prospecto(s) serán reasignados al coordinador seleccionado</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-orange-500 mt-0.5">•</span>
                            <span>El usuario no aparecerá en búsquedas ni filtros</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Selector de coordinador */}
                  {(() => {
                    // Obtener coordinación del usuario
                    const userCoordinacionId = selectedUser.coordinacion_id || (selectedUser.coordinaciones_ids && selectedUser.coordinaciones_ids[0]);
                    const userCoordinacion = coordinaciones.find(c => c.id === userCoordinacionId);
                    
                    // Obtener coordinadores de esa coordinación (solo excluir archivados, no operativos)
                    const coordinadoresEnCoordinacion = users.filter(u => 
                      u.role_name === 'coordinador' && 
                      !u.archivado && // Solo excluir archivados
                      (u.coordinaciones_ids?.includes(userCoordinacionId || '') || false)
                    );

                    if (coordinadoresEnCoordinacion.length === 0) {
                      return (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            No hay coordinadores disponibles en esta coordinación. Los prospectos se archivarán sin reasignar.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="group">
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          <Users className="w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                          <span>Seleccionar Coordinador para Reasignar Prospectos *</span>
                        </label>
                        <select
                          value={selectedCoordinatorForArchive}
                          onChange={(e) => setSelectedCoordinatorForArchive(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-[length:12px_8px] bg-[right_1rem_center] bg-no-repeat"
                        >
                          <option value="">Seleccionar coordinador...</option>
                          {coordinadoresEnCoordinacion.map(coord => (
                            <option key={coord.id} value={coord.id}>
                              {coord.full_name} ({coord.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setShowArchiveConfirmModal(false); setSelectedCoordinatorForArchive(''); }}
                  disabled={loading}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  onClick={async () => {
                    // Si hay prospectos pero no hay coordinadores disponibles, permitir archivar sin reasignar
                    // Solo excluir archivados, no operativos
                    const coordinadoresDisponibles = users.filter(u => 
                      u.role_name === 'coordinador' && 
                      !u.archivado && // Solo excluir archivados
                      (u.coordinaciones_ids?.includes(selectedUser.coordinacion_id || '') || 
                       (selectedUser.coordinaciones_ids && selectedUser.coordinaciones_ids.some(cid => u.coordinaciones_ids?.includes(cid))))
                    );
                    
                    if (userProspectsCount > 0 && coordinadoresDisponibles.length > 0 && !selectedCoordinatorForArchive) {
                      setError('Debes seleccionar un coordinador para reasignar los prospectos');
                      return;
                    }
                    await handleArchiveUserDirect(selectedUser.id, selectedCoordinatorForArchive || undefined);
                  }}
                  disabled={loading || (userProspectsCount > 0 && (() => {
                    // Solo excluir archivados, no operativos
                    const coordinadoresDisponibles = users.filter(u => 
                      u.role_name === 'coordinador' && 
                      !u.archivado && // Solo excluir archivados
                      (u.coordinaciones_ids?.includes(selectedUser.coordinacion_id || '') || 
                       (selectedUser.coordinaciones_ids && selectedUser.coordinaciones_ids.some(cid => u.coordinaciones_ids?.includes(cid))))
                    );
                    return coordinadoresDisponibles.length > 0 && !selectedCoordinatorForArchive;
                  })())}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-orange-500/25 flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Archivando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      <span>Confirmar Archivado</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar Crop Modal */}
      <AvatarCropModal
        isOpen={showAvatarCropModal}
        onClose={() => {
          setShowAvatarCropModal(false);
          if (isEditingAvatar) {
            // Si estaba editando y cierra sin confirmar, restaurar preview
            setEditAvatarPreview(selectedUser?.avatar_url || null);
          }
        }}
        onCropComplete={handleAvatarCropComplete}
        aspectRatio={1}
        currentAvatarUrl={isEditingAvatar ? (editAvatarPreview || selectedUser?.avatar_url || null) : null}
        allowDelete={isEditingAvatar}
      />
    </div>
  );
};

export default UserManagement;