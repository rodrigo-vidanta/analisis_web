/**
 * ============================================
 * GESTIÓN DE USUARIOS - MÓDULO PQNC HUMANS
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
import { supabaseSystemUI, supabaseSystemUIAdmin } from '../../config/supabaseSystemUI';
import { useAuth } from '../../contexts/AuthContext';
import AvatarUpload from './AvatarUpload';
import AvatarCropModal from './AvatarCropModal';
import ParaphraseLogService from '../../services/paraphraseLogService';
import { coordinacionService, type Coordinacion } from '../../services/coordinacionService';
import { ShieldAlert, CheckCircle2, Loader2, User, Mail, Lock, Phone, Building2, Briefcase, Users, Key, Pencil, X, Search, ChevronLeft, ChevronRight, Filter, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

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
  is_active: boolean;
  email_verified: boolean;
  last_login?: string;
  created_at: string;
  avatar_url?: string;
  is_blocked?: boolean; // Estado de bloqueo por moderación
  warning_count?: number; // Número de warnings
  system_ui_user_id?: string; // ID del usuario en System_UI (para desbloquear cuando los IDs no coinciden)
  coordinacion_id?: string; // Para ejecutivos
  coordinaciones_ids?: string[]; // Para coordinadores
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
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
    // Subpermisos específicos para evaluadores y vendedores
    analysis_sources: [] as string[] // ['natalia', 'pqnc', 'live_monitor']
  });

  // Estado para coordinaciones
  const [coordinaciones, setCoordinaciones] = useState<Coordinacion[]>([]);

  // Estados para paginación y filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCoordinacion, setFilterCoordinacion] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  
  // Estados para ordenamiento
  const [sortColumn, setSortColumn] = useState<'name' | 'role' | 'department' | 'last_login' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Verificar permisos - FORZAR TRUE para admin mientras se arregla hasPermission
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role_name === 'admin';
  
  const canView = hasPermission('admin.users.view') || isAdmin;
  const canCreate = hasPermission('admin.users.create') || isAdmin;
  const canEdit = hasPermission('admin.users.edit') || isAdmin;
  const canDelete = isAdmin; // FORZAR TRUE para admin temporalmente

  // Debug temporal para verificar permisos
  console.log('🔍 Debug permisos UserManagement:', {
    currentUser: currentUser?.role_name,
    isAdmin,
    hasDeletePermission: hasPermission('admin.users.delete'),
    canDelete,
    canView,
    canEdit,
    canCreate
  });

  useEffect(() => {
    if (canView) {
      loadUsers();
      loadRoles();
      loadPermissions();
      loadCoordinaciones();
    }
  }, [canView]);

  const loadCoordinaciones = async () => {
    try {
      const data = await coordinacionService.getCoordinaciones();
      setCoordinaciones(data);
    } catch (error) {
      console.error('Error cargando coordinaciones:', error);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabaseSystemUIAdmin
        .from('auth_user_profiles')
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
            const { data: warningsByEmail, error: emailError } = await supabaseSystemUIAdmin
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
                const { data: countersBySystemId, error: countersError } = await supabaseSystemUIAdmin
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
            
            return {
              ...user,
              is_blocked: isBlocked,
              warning_count: warningCount,
              system_ui_user_id: systemUserId // Guardar el user_id de System_UI para poder desbloquear
            };
          });
          
          // Cargar información de coordinaciones para cada usuario
          const usersWithCoordinaciones = await Promise.all(
            usersWithBlockStatus.map(async (user) => {
              if (user.role_name === 'ejecutivo') {
                // Para ejecutivos: cargar coordinacion_id desde auth_users
                const { data: systemUser } = await supabaseSystemUIAdmin
                  .from('auth_users')
                  .select('coordinacion_id')
                  .eq('id', user.id)
                  .single();
                return { ...user, coordinacion_id: systemUser?.coordinacion_id };
              } else if (user.role_name === 'coordinador') {
                // Para coordinadores: cargar coordinaciones desde tabla intermedia
                const { data: relaciones } = await supabaseSystemUIAdmin
                  .from('coordinador_coordinaciones')
                  .select('coordinacion_id')
                  .eq('coordinador_id', user.id);
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
            (data || []).map(async (user: User) => {
              if (user.role_name === 'ejecutivo') {
                const { data: systemUser } = await supabaseSystemUIAdmin
                  .from('auth_users')
                  .select('coordinacion_id')
                  .eq('id', user.id)
                  .single();
                return { ...user, coordinacion_id: systemUser?.coordinacion_id };
              } else if (user.role_name === 'coordinador') {
                const { data: relaciones } = await supabaseSystemUIAdmin
                  .from('coordinador_coordinaciones')
                  .select('coordinacion_id')
                  .eq('coordinador_id', user.id);
                return {
                  ...user,
                  coordinaciones_ids: relaciones?.map(r => r.coordinacion_id) || []
                };
              }
              return user;
            })
          );
          setUsers(usersWithCoordinaciones);
        }
      } else {
        // Cargar información de coordinaciones para cada usuario
        const usersWithCoordinaciones = await Promise.all(
          (data || []).map(async (user: User) => {
            if (user.role_name === 'ejecutivo') {
              const { data: systemUser } = await supabaseSystemUIAdmin
                .from('auth_users')
                .select('coordinacion_id')
                .eq('id', user.id)
                .single();
              return { ...user, coordinacion_id: systemUser?.coordinacion_id };
            } else if (user.role_name === 'coordinador') {
              const { data: relaciones } = await supabaseSystemUIAdmin
                .from('coordinador_coordinaciones')
                .select('coordinacion_id')
                .eq('coordinador_id', user.id);
              return {
                ...user,
                coordinaciones_ids: relaciones?.map(r => r.coordinacion_id) || []
              };
            }
            return user;
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

    // Filtro de búsqueda (nombre, email)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.full_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.first_name.toLowerCase().includes(query) ||
        user.last_name.toLowerCase().includes(query)
      );
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

    // Filtro por departamento
    if (filterDepartment) {
      filtered = filtered.filter(user =>
        user.department?.toLowerCase() === filterDepartment.toLowerCase()
      );
    }

    setFilteredUsers(filtered);
    setCurrentPage(1); // Resetear a primera página cuando cambian los filtros
  }, [users, searchQuery, filterCoordinacion, filterDepartment]);

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
      vendedor: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        darkBg: 'dark:bg-orange-900',
        darkText: 'dark:text-orange-200'
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
      const { data: systemRoles, error: systemError } = await supabaseSystemUIAdmin
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
      const { data, error } = await supabaseSystemUIAdmin
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
      const { data, error } = await supabaseSystemUIAdmin
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
      analysis_sources: []
    });
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

    try {
      setLoading(true);

      // Crear usuario usando función SQL
      const { data: newUser, error: createError } = await supabaseSystemUIAdmin.rpc('create_user_with_role', {
        user_email: formData.email,
        user_password: formData.password,
        user_first_name: formData.first_name,
        user_last_name: formData.last_name,
        user_role_id: formData.role_id,
        user_phone: formData.phone || null,
        user_department: formData.department || null,
        user_position: formData.position || null,
        user_is_active: formData.is_active
      });

      if (createError) {
        console.error('Error creating user:', createError);
        throw new Error(createError.message || 'Error al crear usuario');
      }

      // Subir avatar si existe
      if (avatarFile && newUser && newUser[0]?.user_id) {
        try {
          const fileExt = 'jpg';
          const fileName = `avatar-${newUser[0].user_id}-${Date.now()}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabaseSystemUIAdmin.storage
            .from('user-avatars')
            .upload(fileName, avatarFile);

          if (!uploadError) {
            const { data: { publicUrl } } = supabaseSystemUIAdmin.storage
              .from('user-avatars')
              .getPublicUrl(fileName);

            await supabaseSystemUIAdmin.rpc('upload_user_avatar', {
              p_user_id: newUser[0].user_id,
              p_avatar_url: publicUrl,
              p_filename: fileName,
              p_file_size: avatarFile.size,
              p_mime_type: 'image/jpeg'
            });
          }
        } catch (avatarError) {
          console.error('Error uploading avatar:', avatarError);
          // No fallar la creación si el avatar falla
        }
      }

      // Si es evaluador, asignar subpermisos de análisis
      const selectedRole = roles.find(r => r.id === formData.role_id);
      if (selectedRole?.name === 'evaluator' && formData.analysis_sources.length > 0) {
        await assignAnalysisSubPermissions(newUser[0].user_id, formData.analysis_sources);
      }

      // Si es coordinador, asignar múltiples coordinaciones usando tabla intermedia
      if (selectedRole?.name === 'coordinador' && formData.coordinaciones_ids.length > 0 && newUser[0]?.user_id) {
        try {
          // Actualizar flags del usuario
          const { error: updateError } = await supabaseSystemUIAdmin
            .from('auth_users')
            .update({
              is_coordinator: true,
              is_ejecutivo: false,
            })
            .eq('id', newUser[0].user_id);

          if (updateError) {
            console.error('Error actualizando flags del coordinador:', updateError);
          }

          // Insertar relaciones en tabla intermedia
          const relaciones = formData.coordinaciones_ids.map(coordId => ({
            coordinador_id: newUser[0].user_id,
            coordinacion_id: coordId,
          }));

          const { error: relacionesError } = await supabaseSystemUIAdmin
            .from('coordinador_coordinaciones')
            .insert(relaciones);

          if (relacionesError) {
            console.error('Error asignando coordinaciones al coordinador:', relacionesError);
          } else {
            console.log('✅ Coordinaciones asignadas correctamente');
          }
        } catch (coordError) {
          console.error('Error asignando coordinaciones:', coordError);
        }
      }

      // Si es ejecutivo, asignar una sola coordinación
      if (selectedRole?.name === 'ejecutivo' && formData.coordinacion_id && newUser[0]?.user_id) {
        try {
          // Actualizar usuario en System_UI con coordinación y flags
          const { error: updateError } = await supabaseSystemUIAdmin
            .from('auth_users')
            .update({
              coordinacion_id: formData.coordinacion_id,
              is_coordinator: false,
              is_ejecutivo: true,
            })
            .eq('id', newUser[0].user_id);

          if (updateError) {
            console.error('Error actualizando coordinación del ejecutivo:', updateError);
          } else {
            console.log('✅ Coordinación asignada correctamente');
          }
        } catch (coordError) {
          console.error('Error asignando coordinación:', coordError);
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

    // Manejar avatar si hay cambios
    let newAvatarUrl = selectedUser.avatar_url;
    
    if (shouldDeleteAvatar) {
      // Eliminar avatar
      try {
        const { error: deleteError } = await supabaseSystemUIAdmin
          .from('user_avatars')
          .delete()
          .eq('user_id', selectedUser.id);
        
        if (deleteError) throw deleteError;
        
        // Actualizar usuario con avatar null
        const { error: updateError } = await supabaseSystemUIAdmin.rpc('upload_user_avatar', {
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
        
        const { data: uploadData, error: uploadError } = await supabaseSystemUIAdmin.storage
          .from('user-avatars')
          .upload(fileName, editAvatarFile);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabaseSystemUIAdmin.storage
          .from('user-avatars')
          .getPublicUrl(fileName);
        
        const { error: updateError } = await supabaseSystemUIAdmin.rpc('upload_user_avatar', {
          p_user_id: selectedUser.id,
          p_avatar_url: publicUrl,
          p_file_name: fileName,
          p_file_size: editAvatarFile.size
        });
        
        if (updateError) throw updateError;
        newAvatarUrl = publicUrl;
      } catch (avatarError) {
        console.error('Error subiendo avatar:', avatarError);
        // Continuar con la edición aunque falle el avatar
      }
    }
    
    if (!canEdit || !selectedUser) {
      setError('No tienes permisos para editar usuarios');
      return;
    }

    try {
      setLoading(true);
      
      // Preparar datos de actualización
      const updateData: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone || null,
        // department y position no existen en System_UI auth_users
        role_id: formData.role_id,
        is_active: formData.is_active,
        updated_at: new Date().toISOString()
      };

      // Actualizar datos básicos del usuario
      const { error: updateError } = await supabaseSystemUIAdmin
        .from('auth_users')
        .update(updateData)
        .eq('id', selectedUser.id);

      if (updateError) throw updateError;

      // Si se habilitó la edición de contraseña y se proporcionó una nueva contraseña, actualizarla
      if (isEditingPassword && formData.password.trim()) {
        const { error: passwordError } = await supabaseSystemUIAdmin.rpc('change_user_password', {
          p_user_id: selectedUser.id,
          p_new_password: formData.password
        });

        if (passwordError) throw passwordError;
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
          // Actualizar flags del usuario
          const { error: updateError } = await supabaseSystemUIAdmin
            .from('auth_users')
            .update({
              is_coordinator: true,
              is_ejecutivo: false,
              coordinacion_id: null, // Limpiar coordinacion_id si existe
            })
            .eq('id', selectedUser.id);

          if (updateError) {
            console.error('Error actualizando flags del coordinador:', updateError);
          }

          // Eliminar relaciones existentes
          await supabaseSystemUIAdmin
            .from('coordinador_coordinaciones')
            .delete()
            .eq('coordinador_id', selectedUser.id);

          // Insertar nuevas relaciones si hay coordinaciones seleccionadas
          if (formData.coordinaciones_ids.length > 0) {
            const relaciones = formData.coordinaciones_ids.map(coordId => ({
              coordinador_id: selectedUser.id,
              coordinacion_id: coordId,
            }));

            const { error: relacionesError } = await supabaseSystemUIAdmin
              .from('coordinador_coordinaciones')
              .insert(relaciones);

            if (relacionesError) {
              console.error('Error actualizando coordinaciones del coordinador:', relacionesError);
            } else {
              console.log('✅ Coordinaciones actualizadas correctamente');
            }
          }
        } catch (coordError) {
          console.error('Error actualizando coordinaciones:', coordError);
        }
      } else if (selectedRole?.name === 'ejecutivo' && formData.coordinacion_id) {
        // Si es ejecutivo, actualizar una sola coordinación
        try {
          // Limpiar relaciones de coordinador_coordinaciones si existían
          await supabaseSystemUIAdmin
            .from('coordinador_coordinaciones')
            .delete()
            .eq('coordinador_id', selectedUser.id);

          const { error: coordUpdateError } = await supabaseSystemUIAdmin
            .from('auth_users')
            .update({
              coordinacion_id: formData.coordinacion_id,
              is_coordinator: false,
              is_ejecutivo: true,
            })
            .eq('id', selectedUser.id);

          if (coordUpdateError) {
            console.error('Error actualizando coordinación del ejecutivo:', coordUpdateError);
          } else {
            console.log('✅ Coordinación actualizada correctamente');
          }
        } catch (coordError) {
          console.error('Error actualizando coordinación:', coordError);
        }
      } else if (selectedRole && selectedRole.name !== 'coordinador' && selectedRole.name !== 'ejecutivo') {
        // Si cambió a otro rol que no es coordinador ni ejecutivo, limpiar todo
        try {
          // Limpiar relaciones de coordinador_coordinaciones
          await supabaseSystemUIAdmin
            .from('coordinador_coordinaciones')
            .delete()
            .eq('coordinador_id', selectedUser.id);

          const { error: coordClearError } = await supabaseSystemUIAdmin
            .from('auth_users')
            .update({
              coordinacion_id: null,
              is_coordinator: false,
              is_ejecutivo: false,
            })
            .eq('id', selectedUser.id);

          if (coordClearError) {
            console.error('Error limpiando coordinación:', coordClearError);
          }
        } catch (coordError) {
          console.error('Error limpiando coordinación:', coordError);
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

  const openDeleteModal = (userId: string) => {
    console.log('🗑️ Abriendo modal de eliminación para:', userId);
    const user = users.find(u => u.id === userId);
    if (user) {
      setUserToDelete(user);
      setShowDeleteModal(true);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    const userId = userToDelete.id;
    console.log('🗑️ handleDeleteUser ejecutado:', { userId, canDelete, currentUser: currentUser?.role_name });
    
    if (!canDelete) {
      console.log('❌ Sin permisos para eliminar');
      setError('No tienes permisos para eliminar usuarios');
      return;
    }

    console.log('✅ Permisos verificados');

    // Verificar que no sea el usuario actual
    if (userId === currentUser?.id) {
      console.log('❌ Intento de auto-eliminación');
      setError('No puedes eliminar tu propio usuario');
      setShowDeleteModal(false);
      return;
    }

    console.log('✅ No es auto-eliminación');

    console.log('🚀 Iniciando eliminación...');
    
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading activado');

      // Intentar usar RPC function para eliminación segura
      console.log('📞 Llamando a RPC delete_user_complete...');
      const { error: rpcError } = await supabaseSystemUIAdmin.rpc('delete_user_complete', {
        p_user_id: userId
      });

      console.log('📞 RPC response:', { rpcError });

      if (rpcError) {
        console.warn('❌ RPC delete failed, trying direct deletion:', rpcError);
        
        // Fallback: usar cliente admin para eliminación directa
        console.log('🔧 Iniciando fallback con cliente admin...');
        
        // Eliminar relaciones primero
        console.log('🗑️ Eliminando avatares...');
        await supabaseSystemUIAdmin.from('user_avatars').delete().eq('user_id', userId);
        
        console.log('🗑️ Eliminando sesiones...');
        await supabaseSystemUIAdmin.from('auth_sessions').delete().eq('user_id', userId);
        
        console.log('🗑️ Eliminando permisos específicos...');
        await supabaseSystemUIAdmin.from('auth_user_permissions').delete().eq('user_id', userId);
        
        // Eliminar usuario
        console.log('🗑️ Eliminando usuario principal...');
        const { error: deleteError } = await supabaseSystemUIAdmin
          .from('auth_users')
          .delete()
          .eq('id', userId);

        console.log('🗑️ Delete response:', { deleteError });
        if (deleteError) throw deleteError;
      }

      console.log('🔄 Recargando lista de usuarios...');
      await loadUsers();
      setError(null);
      console.log('✅ Usuario eliminado exitosamente');
      setShowDeleteModal(false);
      setUserToDelete(null);
      alert('Usuario eliminado exitosamente');
      
    } catch (err: any) {
      console.error('❌ Error deleting user:', err);
      console.error('❌ Error details:', { message: err.message, stack: err.stack });
      setError(`Error al eliminar usuario: ${err.message || 'Error desconocido'}`);
    } finally {
      console.log('🏁 Finalizando - loading desactivado');
      setLoading(false);
    }
  };

  // Gestión de subpermisos usando localStorage temporal + función RPC cuando esté disponible
  const assignAnalysisSubPermissions = async (userId: string, sources: string[]) => {
    try {
      const nataliaAccess = sources.includes('natalia');
      const pqncAccess = sources.includes('pqnc');
      const liveMonitorAccess = sources.includes('live_monitor');
      
      console.log('📋 Configurando permisos:', { userId, nataliaAccess, pqncAccess, liveMonitorAccess });
      
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
        console.log('✅ Permisos guardados temporalmente en localStorage:', permissionsData);
        
        // Disparar evento para notificar cambios
        window.dispatchEvent(new StorageEvent('storage', {
          key: permissionsKey,
          newValue: JSON.stringify(permissionsData),
          url: window.location.href
        }));
      }

      // INTENTAR USAR FUNCIÓN RPC SI ESTÁ DISPONIBLE
      try {
        const { data: result, error } = await supabaseSystemUIAdmin.rpc('configure_evaluator_analysis_permissions', {
          p_target_user_id: userId,
          p_natalia_access: nataliaAccess,
          p_pqnc_access: pqncAccess
          // Omitir live_monitor por ahora hasta que la función se actualice completamente
        });

        if (error) {
          console.log('⚠️ Función RPC no disponible completamente, usando localStorage temporal');
        } else {
          console.log('✅ Permisos también guardados via RPC:', result);
        }
      } catch (err) {
        console.log('⚠️ RPC no disponible, usando solo localStorage temporal');
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
      const { data: userData } = await supabaseSystemUIAdmin
        .from('auth_users')
        .select('role_id')
        .eq('id', userId)
        .single();

      if (!userData) return;

      // Remover solo los permisos de análisis con sub_module
      const analysisPermissionIds = permissions
        .filter(p => p.module === 'analisis' && p.sub_module)
        .map(p => p.id);

      if (analysisPermissionIds.length > 0) {
        await supabaseSystemUIAdmin
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
      console.log('🔍 Cargando permisos específicos para usuario:', userId);
      
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
          
          console.log('✅ Permisos cargados desde localStorage:', sources);
          setFormData(prev => ({ ...prev, analysis_sources: sources }));
        } catch (err) {
          console.error('❌ Error parseando localStorage:', err);
          setFormData(prev => ({ ...prev, analysis_sources: [] }));
        }
      } else {
        console.log('⚠️ No hay configuración en localStorage para:', userEmail);
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
    
    if (user.role_name === 'coordinador') {
      // Para coordinadores: cargar desde tabla intermedia
      try {
        const { data: relaciones, error: relacionesError } = await supabaseSystemUIAdmin
          .from('coordinador_coordinaciones')
          .select('coordinacion_id')
          .eq('coordinador_id', user.id);
        
        if (!relacionesError && relaciones) {
          coordinacionesIds = relaciones.map(r => r.coordinacion_id);
        }
      } catch (error) {
        console.error('Error cargando coordinaciones del coordinador:', error);
      }
    } else if (user.role_name === 'ejecutivo') {
      // Para ejecutivos: cargar desde campo coordinacion_id
      try {
        const { data: systemUser, error: systemError } = await supabaseSystemUIAdmin
          .from('auth_users')
          .select('coordinacion_id')
          .eq('id', user.id)
          .single();
        
        if (!systemError && systemUser) {
          coordinacionId = systemUser.coordinacion_id || '';
        }
      } catch (error) {
        console.error('Error cargando coordinación del ejecutivo:', error);
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
      analysis_sources: []
    });
    
    // Resetear estado de edición de contraseña
    setIsEditingPassword(false);

    // Cargar subpermisos actuales si es evaluador
    if (user.role_name === 'evaluator') {
      console.log('📋 Cargando configuración para evaluador:', user.email);
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestión de Usuarios
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Administra usuarios, roles y permisos del sistema
          </p>
        </div>
        
        {canCreate && (
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          {/* Items por página */}
          <div className="relative">
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
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
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
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
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
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Moderación
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    {searchQuery || filterCoordinacion || filterDepartment
                      ? 'No se encontraron usuarios con los filtros aplicados'
                      : 'No hay usuarios registrados'}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 relative">
                          {user.avatar_url ? (
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const colors = getRoleColors(user.role_name);
                        return (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}>
                            {user.role_display_name}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {user.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_blocked ? (
                        <button
                          onClick={() => isAdmin && handleUnblockUser(user)}
                          disabled={!isAdmin || unblockingUserId === user.id}
                          className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full transition-all duration-200 ${
                            unblockingUserId === user.id
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 cursor-wait'
                              : isAdmin
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 cursor-pointer active:scale-95'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 cursor-not-allowed'
                          }`}
                          title={isAdmin ? 'Haz clic para desbloquear' : 'Solo administradores pueden desbloquear'}
                        >
                          {unblockingUserId === user.id ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Desbloqueando...
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3 h-3 mr-1" />
                              Bloqueado ({user.warning_count})
                            </>
                          )}
                        </button>
                      ) : (user.warning_count ?? 0) > 0 ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          {user.warning_count} warnings
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.last_login 
                        ? new Date(user.last_login).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Nunca'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openPermissionsModal(user)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Ver permisos"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </button>

                        {canEdit && (
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            title="Editar usuario"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}

                        {canDelete ? (
                          <button
                            onClick={() => {
                              console.log('🖱️ Click en botón eliminar:', user.id);
                              openDeleteModal(user.id);
                            }}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Eliminar usuario"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        ) : (
                          <span className="text-gray-400" title="Sin permisos para eliminar">🔒</span>
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
          <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
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
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
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

                  {/* Sección: Roles y Permisos */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Roles y Permisos
                      </h4>
                    </div>

                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <Key className="w-4 h-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                        <span>Rol *</span>
                </label>
                <select
                  required
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-[length:12px_8px] bg-[right_1rem_center] bg-no-repeat"
                >
                  <option value="">Seleccionar rol...</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Coordinaciones para Coordinadores (Múltiples) */}
              {roles.find(r => r.id === formData.role_id)?.name === 'coordinador' && (
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
                    {coordinaciones.filter(c => c.is_active).map((coordinacion, index) => {
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
                    {coordinaciones.filter(c => c.is_active).length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        No hay coordinaciones activas disponibles
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Selector de Coordinación para Ejecutivos (Una sola) */}
              {roles.find(r => r.id === formData.role_id)?.name === 'ejecutivo' && (
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
                      {coordinaciones.filter(c => c.is_active).map(coordinacion => (
                        <option key={coordinacion.id} value={coordinacion.id}>
                          {coordinacion.codigo} - {coordinacion.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </motion.div>
              )}

              {/* Permisos de análisis según rol */}
              {roles.find(r => r.id === formData.role_id)?.name === 'evaluator' && (
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
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
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
                        <span>Email</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  El email no se puede modificar
                </p>
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

                  {/* Sección: Roles y Permisos */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Roles y Permisos
                      </h4>
                    </div>

                    <div className="group">
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <Key className="w-4 h-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                        <span>Rol *</span>
                </label>
                <select
                  required
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value, analysis_sources: [] })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-[length:12px_8px] bg-[right_1rem_center] bg-no-repeat"
                >
                  <option value="">Seleccionar rol...</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Coordinaciones para Coordinadores (Múltiples) - Modal Edición */}
              {roles.find(r => r.id === formData.role_id)?.name === 'coordinador' && (
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
                    {coordinaciones.filter(c => c.is_active).map((coordinacion, index) => {
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
                    {coordinaciones.filter(c => c.is_active).length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        No hay coordinaciones activas disponibles
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Selector de Coordinación para Ejecutivos (Una sola) - Modal Edición */}
              {roles.find(r => r.id === formData.role_id)?.name === 'ejecutivo' && (
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
                      {coordinaciones.filter(c => c.is_active).map(coordinacion => (
                        <option key={coordinacion.id} value={coordinacion.id}>
                          {coordinacion.codigo} - {coordinacion.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </motion.div>
              )}

              {/* Permisos de análisis según rol */}
              {roles.find(r => r.id === formData.role_id)?.name === 'evaluator' && (
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
            </motion.div>
          </motion.div>
      )}
      </AnimatePresence>

      {/* Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
                    {['constructor', 'plantillas', 'analisis', 'admin'].map(module => {
                      const modulePermissions = userPermissions.filter(p => p.module === module);
                      if (modulePermissions.length === 0) return null;
                      
                      return (
                        <div key={module} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                          <h5 className="font-medium text-gray-900 dark:text-white mb-2 capitalize">
                            {module === 'plantillas' ? 'Plantillas' : 
                             module === 'analisis' ? 'Análisis' : 
                             module === 'constructor' ? 'Constructor' : 'Administración'}
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

      {/* Delete User Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirmar Eliminación
              </h3>
              <button
                onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                    ¿Eliminar usuario {userToDelete.full_name}?
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Email: {userToDelete.email}
                  </p>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
                  ⚠️ Esta acción no se puede deshacer
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Se eliminará permanentemente:
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 mt-2 space-y-1">
                  <li>• El usuario y su información personal</li>
                  <li>• Todas sus sesiones activas</li>
                  <li>• Sus avatares y archivos</li>
                  <li>• Sus permisos específicos</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Eliminar Usuario</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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