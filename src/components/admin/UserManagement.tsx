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
import { pqncSupabase as supabase } from '../../config/pqncSupabase';
import { supabaseSystemUI, supabaseSystemUIAdmin } from '../../config/supabaseSystemUI';
import { useAuth } from '../../contexts/AuthContext';
import AvatarUpload from './AvatarUpload';
import ParaphraseLogService from '../../services/paraphraseLogService';
import { ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';

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
    is_active: true,
    // Subpermisos específicos para evaluadores y vendedores
    analysis_sources: [] as string[] // ['natalia', 'pqnc', 'live_monitor']
  });

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
    }
  }, [canView]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
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
          
          setUsers(usersWithBlockStatus);
        } catch (warningError) {
          console.error('❌ Error cargando warnings:', warningError);
          // Si falla, usar usuarios sin estado de bloqueo
          setUsers(data || []);
        }
      } else {
        setUsers(data || []);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('auth_roles')
        .select('*')
        .order('name');

      if (error) throw error;
      setRoles(data || []);
    } catch (err) {
      console.error('Error loading roles:', err);
    }
  };

  const loadPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('auth_permissions')
        .select('*')
        .order('module, name');

      if (error) throw error;
      setPermissions(data || []);
    } catch (err) {
      console.error('Error loading permissions:', err);
    }
  };

  const loadUserPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
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
      is_active: true,
      analysis_sources: []
    });
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
      const { data: newUser, error: createError } = await supabase.rpc('create_user_with_role', {
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

      // Si es evaluador, asignar subpermisos de análisis
      const selectedRole = roles.find(r => r.id === formData.role_id);
      if (selectedRole?.name === 'evaluator' && formData.analysis_sources.length > 0) {
        await assignAnalysisSubPermissions(newUser[0].user_id, formData.analysis_sources);
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

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        department: formData.department || null,
        position: formData.position || null,
        role_id: formData.role_id,
        is_active: formData.is_active,
        updated_at: new Date().toISOString()
      };

      // Actualizar datos básicos del usuario
      const { error: updateError } = await supabase
        .from('auth_users')
        .update(updateData)
        .eq('id', selectedUser.id);

      if (updateError) throw updateError;

      // Si se proporcionó una nueva contraseña, actualizarla usando función SQL
      if (formData.password.trim()) {
        const { error: passwordError } = await supabase.rpc('change_user_password', {
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

      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
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
      const { error: rpcError } = await supabase.rpc('delete_user_complete', {
        p_user_id: userId
      });

      console.log('📞 RPC response:', { rpcError });

      if (rpcError) {
        console.warn('❌ RPC delete failed, trying direct deletion:', rpcError);
        
        // Fallback: usar cliente admin para eliminación directa
        console.log('🔧 Iniciando fallback con cliente admin...');
        const { pqncSupabaseAdmin } = await import('../../config/pqncSupabase');
        
        // Eliminar relaciones primero
        console.log('🗑️ Eliminando avatares...');
        await pqncSupabaseAdmin.from('user_avatars').delete().eq('user_id', userId);
        
        console.log('🗑️ Eliminando sesiones...');
        await pqncSupabaseAdmin.from('auth_sessions').delete().eq('user_id', userId);
        
        console.log('🗑️ Eliminando permisos específicos...');
        await pqncSupabaseAdmin.from('user_specific_permissions').delete().eq('user_id', userId);
        
        // Eliminar usuario
        console.log('🗑️ Eliminando usuario principal...');
        const { error: deleteError } = await pqncSupabaseAdmin
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
        const { data: result, error } = await supabase.rpc('configure_evaluator_analysis_permissions', {
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
      const { data: userData } = await supabase
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
        await supabase
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
    setFormData({
      email: user.email,
      password: '', // No mostrar password actual
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone || '',
      department: user.department || '',
      position: user.position || '',
      role_id: user.role_id,
      is_active: user.is_active,
      analysis_sources: []
    });

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

      {/* Users table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Departamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Moderación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Último acceso
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No hay usuarios registrados
                  </td>
                </tr>
              ) : (
                users.map((user) => (
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
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role_name === 'admin'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : user.role_name === 'evaluator'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {user.role_display_name}
                      </span>
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
                      ) : user.warning_count > 0 ? (
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
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Crear Nuevo Usuario
            </h3>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contraseña *
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rol *
                </label>
                <select
                  required
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Seleccionar rol...</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Permisos de análisis según rol */}
              {roles.find(r => r.id === formData.role_id)?.name === 'evaluator' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fuentes de Análisis
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.analysis_sources.includes('natalia')}
                        onChange={(e) => {
                          const sources = e.target.checked
                            ? [...formData.analysis_sources, 'natalia']
                            : formData.analysis_sources.filter(s => s !== 'natalia');
                          setFormData({ ...formData, analysis_sources: sources });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Análisis de Natalia
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.analysis_sources.includes('pqnc')}
                        onChange={(e) => {
                          const sources = e.target.checked
                            ? [...formData.analysis_sources, 'pqnc']
                            : formData.analysis_sources.filter(s => s !== 'pqnc');
                          setFormData({ ...formData, analysis_sources: sources });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Análisis de PQNC Humans
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.analysis_sources.includes('live_monitor')}
                        onChange={(e) => {
                          const sources = e.target.checked
                            ? [...formData.analysis_sources, 'live_monitor']
                            : formData.analysis_sources.filter(s => s !== 'live_monitor');
                          setFormData({ ...formData, analysis_sources: sources });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Live Monitor
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Departamento
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Posición
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Usuario activo
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Editar Usuario: {selectedUser.full_name}
            </h3>
            
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  El email no se puede modificar
                </p>
              </div>

              {/* Avatar del usuario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Foto de Perfil
                </label>
                <AvatarUpload
                  userId={selectedUser.id}
                  currentAvatarUrl={selectedUser.avatar_url}
                  onAvatarUpdated={(newUrl) => {
                    setSelectedUser({ ...selectedUser, avatar_url: newUrl });
                    loadUsers(); // Recargar para actualizar la tabla
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Dejar vacío para mantener la contraseña actual"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Solo completa este campo si deseas cambiar la contraseña
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rol *
                </label>
                <select
                  required
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value, analysis_sources: [] })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Seleccionar rol...</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Permisos de análisis según rol */}
              {roles.find(r => r.id === formData.role_id)?.name === 'evaluator' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fuentes de Análisis
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.analysis_sources.includes('natalia')}
                        onChange={(e) => {
                          const sources = e.target.checked
                            ? [...formData.analysis_sources, 'natalia']
                            : formData.analysis_sources.filter(s => s !== 'natalia');
                          setFormData({ ...formData, analysis_sources: sources });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Análisis de Natalia
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.analysis_sources.includes('pqnc')}
                        onChange={(e) => {
                          const sources = e.target.checked
                            ? [...formData.analysis_sources, 'pqnc']
                            : formData.analysis_sources.filter(s => s !== 'pqnc');
                          setFormData({ ...formData, analysis_sources: sources });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Análisis de PQNC Humans
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.analysis_sources.includes('live_monitor')}
                        onChange={(e) => {
                          const sources = e.target.checked
                            ? [...formData.analysis_sources, 'live_monitor']
                            : formData.analysis_sources.filter(s => s !== 'live_monitor');
                          setFormData({ ...formData, analysis_sources: sources });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Live Monitor
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Departamento
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Posición
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="edit_is_active" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Usuario activo
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedUser(null); resetForm(); }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default UserManagement;