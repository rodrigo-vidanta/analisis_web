/**
 * Modal para ver y gestionar usuarios de un grupo
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Users,
  UserPlus,
  UserMinus,
  Search,
  Loader2,
  Shield,
  Star,
  Check,
  ChevronRight,
  Mail,
  Building2
} from 'lucide-react';
import { groupsService, type PermissionGroup, type UserGroupAssignment } from '../../../../services/groupsService';
import { supabaseSystemUI } from '../../../../config/supabaseSystemUI';
import { useAuth } from '../../../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { getAvatarGradient } from '../../../../utils/avatarGradient';

// ============================================
// TIPOS
// ============================================

interface GroupUsersModalProps {
  group: PermissionGroup;
  canAssign: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

// ============================================
// INTERFAZ DE USUARIO BÁSICO
// ============================================
// CORRECCIÓN 2025-01-14: 
// La tabla auth_users NO tiene columna 'role_name' directamente.
// El rol se obtiene via JOIN con 'auth_roles' usando 'role_id'.
// El campo 'role_name' se mapea después de la consulta.
// ============================================
interface UserBasic {
  id: string;
  email: string;
  full_name: string;
  role_name: string; // Mapeado desde auth_roles.name
  is_active: boolean;
  avatar_url?: string;
  coordinacion_id?: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const GroupUsersModal: React.FC<GroupUsersModalProps> = ({
  group,
  canAssign,
  onClose,
  onRefresh
}) => {
  const { user: currentUser } = useAuth();
  
  // Estados
  const [groupUsers, setGroupUsers] = useState<UserGroupAssignment[]>([]);
  const [allUsers, setAllUsers] = useState<UserBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddUsers, setShowAddUsers] = useState(false);
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // ============================================
  // CARGA DE DATOS
  // ============================================

  const loadGroupUsers = useCallback(async () => {
    try {
      setLoading(true);
      const users = await groupsService.getGroupUsers(group.id);
      setGroupUsers(users);
    } catch (err) {
      console.error('Error cargando usuarios del grupo:', err);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [group.id]);

  const loadAllUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      
      // ============================================
      // MIGRACIÓN 2026-01-20: Usar user_profiles_v2
      // ============================================
      // user_profiles_v2 ya incluye role_name directamente
      // ============================================
      const { data, error } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select('id, email, full_name, is_active, coordinacion_id, role_name')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      
      // Mapear resultado
      const mappedUsers: UserBasic[] = (data || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role_name: user.role_name || 'Sin rol',
        is_active: user.is_active,
        avatar_url: null, // user_profiles_v2 no tiene avatar_url
        coordinacion_id: user.coordinacion_id
      }));
      
      setAllUsers(mappedUsers);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadGroupUsers();
  }, [loadGroupUsers]);

  useEffect(() => {
    if (showAddUsers) {
      loadAllUsers();
    }
  }, [showAddUsers, loadAllUsers]);

  // ============================================
  // FILTROS
  // ============================================

  // Usuarios disponibles para agregar (no están en el grupo)
  const availableUsers = allUsers.filter(user => {
    const isInGroup = groupUsers.some(gu => gu.user_id === user.id);
    const matchesSearch = !searchQuery || 
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return !isInGroup && matchesSearch;
  });

  // ============================================
  // HANDLERS
  // ============================================

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('¿Está seguro de remover este usuario del grupo?')) return;

    try {
      await groupsService.removeUserFromGroup(userId, group.id, currentUser?.id);
      toast.success('Usuario removido del grupo');
      loadGroupUsers();
      onRefresh();
    } catch (err) {
      console.error('Error removiendo usuario:', err);
      toast.error('Error al remover usuario');
    }
  };

  const handleTogglePrimary = async (userId: string, currentPrimary: boolean) => {
    try {
      await groupsService.assignUserToGroup(
        userId,
        group.id,
        !currentPrimary,
        currentUser?.id
      );
      toast.success(currentPrimary ? 'Grupo desmarcado como principal' : 'Marcado como grupo principal');
      loadGroupUsers();
    } catch (err) {
      console.error('Error actualizando grupo principal:', err);
      toast.error('Error al actualizar');
    }
  };

  const handleToggleSelectUser = (userId: string) => {
    setSelectedUsersToAdd(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleAddSelectedUsers = async () => {
    if (selectedUsersToAdd.size === 0) return;

    try {
      setSaving(true);
      
      // Agregar cada usuario seleccionado al grupo
      for (const userId of Array.from(selectedUsersToAdd)) {
        await groupsService.assignUserToGroup(
          userId,
          group.id,
          false,
          currentUser?.id
        );
      }

      toast.success(`${selectedUsersToAdd.size} usuario(s) agregado(s) al grupo`);
      setSelectedUsersToAdd(new Set());
      setShowAddUsers(false);
      loadGroupUsers();
      onRefresh();
    } catch (err) {
      console.error('Error agregando usuarios:', err);
      toast.error('Error al agregar usuarios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${group.color || 'from-blue-500 to-indigo-600'} flex items-center justify-center shadow-lg`}>
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Usuarios en {group.display_name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {groupUsers.length} miembro(s)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Botón agregar usuarios */}
          {canAssign && !showAddUsers && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setShowAddUsers(true)}
              className="mt-4 w-full inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Agregar Usuarios
            </motion.button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Vista de agregar usuarios */}
          <AnimatePresence mode="wait">
            {showAddUsers ? (
              <motion.div
                key="add-users"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Header de agregar */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      setShowAddUsers(false);
                      setSelectedUsersToAdd(new Set());
                      setSearchQuery('');
                    }}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    ← Volver a lista
                  </button>
                  <span className="text-sm text-gray-500">
                    {selectedUsersToAdd.size} seleccionado(s)
                  </span>
                </div>

                {/* Búsqueda */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar usuarios..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Lista de usuarios disponibles */}
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    <span className="ml-2 text-gray-500">Cargando usuarios...</span>
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchQuery ? 'No se encontraron usuarios' : 'Todos los usuarios ya están en el grupo'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {availableUsers.map((user) => {
                      const isSelected = selectedUsersToAdd.has(user.id);
                      const gradient = getAvatarGradient(user.full_name || user.email);
                      
                      return (
                        <div
                          key={user.id}
                          onClick={() => handleToggleSelectUser(user.id)}
                          className={`flex items-center p-3 rounded-xl cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                              : 'bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                          }`}
                        >
                          {/* Checkbox */}
                          <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>

                          {/* Avatar */}
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-medium text-sm mr-3`}>
                            {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {user.full_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {user.email}
                            </p>
                          </div>

                          {/* Role badge */}
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                            {user.role_name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Botón confirmar */}
                {selectedUsersToAdd.size > 0 && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleAddSelectedUsers}
                    disabled={saving}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Agregando...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Agregar {selectedUsersToAdd.size} Usuario(s)
                      </>
                    )}
                  </motion.button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="users-list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-2"
              >
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    <span className="ml-2 text-gray-500">Cargando...</span>
                  </div>
                ) : groupUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Sin usuarios
                    </h4>
                    <p className="text-gray-500 dark:text-gray-400">
                      Este grupo no tiene usuarios asignados
                    </p>
                  </div>
                ) : (
                  groupUsers.map((assignment) => {
                    const user = assignment.user;
                    if (!user) return null;
                    
                    const gradient = getAvatarGradient(user.full_name || user.email);
                    
                    return (
                      <div
                        key={assignment.id}
                        className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                      >
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-medium text-sm mr-3`}>
                          {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {user.full_name}
                            </p>
                            {assignment.is_primary && (
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user.email}
                          </p>
                        </div>

                        {/* Acciones */}
                        {canAssign && (
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleTogglePrimary(user.id, assignment.is_primary)}
                              className={`p-2 rounded-lg transition-colors ${
                                assignment.is_primary
                                  ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                  : 'text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                              title={assignment.is_primary ? 'Desmarcar como principal' : 'Marcar como principal'}
                            >
                              <Star className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveUser(user.id)}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Remover del grupo"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GroupUsersModal;

