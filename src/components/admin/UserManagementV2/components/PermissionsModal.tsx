/**
 * ============================================
 * PERMISSIONS MODAL
 * ============================================
 * Modal para gestionar permisos y grupos de seguridad de usuarios
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Shield,
  Key,
  Lock,
  Unlock,
  Check,
  AlertTriangle,
  Loader2,
  Users,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus,
  ChevronRight,
  ChevronDown,
  Search,
  Info
} from 'lucide-react';
import { supabaseSystemUIAdmin } from '../../../../config/supabaseSystemUI';
import type { UserV2, Permission, UserPermission } from '../types';
import toast from 'react-hot-toast';

// ============================================
// TYPES
// ============================================

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserV2 | null;
  onPermissionsUpdated: () => void;
}

interface PermissionGroup {
  module: string;
  displayName: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions: Permission[];
}

// ============================================
// PERMISSION GROUPS CONFIG
// ============================================

const PERMISSION_GROUPS: { module: string; displayName: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { module: 'admin', displayName: 'Administración', icon: Settings },
  { module: 'analysis', displayName: 'Análisis IA', icon: Eye },
  { module: 'chat', displayName: 'Live Chat', icon: Users },
  { module: 'prospectos', displayName: 'Prospectos', icon: Users },
  { module: 'scheduled', displayName: 'Llamadas Programadas', icon: Eye },
  { module: 'vapi', displayName: 'VAPI/Agentes', icon: Settings },
  { module: 'documentation', displayName: 'Documentación', icon: Eye }
];

// ============================================
// COMPONENT
// ============================================

const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onClose,
  user,
  onPermissionsUpdated
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['admin']));
  const [searchTerm, setSearchTerm] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());

  // ============================================
  // LOAD DATA
  // ============================================

  const loadPermissions = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Cargar todos los permisos disponibles
      const { data: allPermissions, error: permError } = await supabaseSystemUIAdmin
        .from('auth_permissions')
        .select('*')
        .order('module')
        .order('permission_name');

      if (permError) throw permError;

      // Cargar permisos del usuario
      const { data: userPerms, error: userPermError } = await supabaseSystemUIAdmin
        .from('auth_user_permissions')
        .select('*')
        .eq('user_id', user.id);

      if (userPermError) throw userPermError;

      setPermissions(allPermissions || []);
      setUserPermissions(userPerms || []);
      
      // Inicializar cambios pendientes con permisos actuales
      const initialChanges = new Map<string, boolean>();
      (userPerms || []).forEach(up => {
        initialChanges.set(up.permission_name, true);
      });
      setPendingChanges(initialChanges);
      setHasChanges(false);
    } catch (error) {
      console.error('Error cargando permisos:', error);
      toast.error('Error al cargar permisos');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      loadPermissions();
    }
  }, [isOpen, user, loadPermissions]);

  // ============================================
  // HANDLERS
  // ============================================

  const toggleModule = useCallback((module: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  }, []);

  const togglePermission = useCallback((permissionName: string) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      const currentValue = next.get(permissionName) || false;
      next.set(permissionName, !currentValue);
      return next;
    });
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!user || !hasChanges) return;

    try {
      setSaving(true);

      // Determinar qué permisos añadir y cuáles eliminar
      const currentPermNames = new Set(userPermissions.map(up => up.permission_name));
      const toAdd: string[] = [];
      const toRemove: string[] = [];

      pendingChanges.forEach((isGranted, permName) => {
        const currentlyHas = currentPermNames.has(permName);
        if (isGranted && !currentlyHas) {
          toAdd.push(permName);
        } else if (!isGranted && currentlyHas) {
          toRemove.push(permName);
        }
      });

      // Eliminar permisos
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabaseSystemUIAdmin
          .from('auth_user_permissions')
          .delete()
          .eq('user_id', user.id)
          .in('permission_name', toRemove);

        if (deleteError) throw deleteError;
      }

      // Añadir permisos
      if (toAdd.length > 0) {
        const permissionsToInsert = toAdd.map(permName => {
          const perm = permissions.find(p => p.name === permName);
          return {
            user_id: user.id,
            permission_name: permName,
            module: perm?.module || 'unknown',
            sub_module: perm?.sub_module,
            granted_at: new Date().toISOString()
          };
        });

        const { error: insertError } = await supabaseSystemUIAdmin
          .from('auth_user_permissions')
          .insert(permissionsToInsert);

        if (insertError) throw insertError;
      }

      toast.success('Permisos actualizados correctamente');
      setHasChanges(false);
      onPermissionsUpdated();
      onClose();
    } catch (error) {
      console.error('Error guardando permisos:', error);
      toast.error('Error al guardar permisos');
    } finally {
      setSaving(false);
    }
  }, [user, hasChanges, userPermissions, pendingChanges, permissions, onPermissionsUpdated, onClose]);

  const handleClose = useCallback(() => {
    if (hasChanges) {
      if (window.confirm('Tienes cambios sin guardar. ¿Deseas descartar los cambios?')) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);

  // ============================================
  // GROUP PERMISSIONS BY MODULE
  // ============================================

  const groupedPermissions = React.useMemo(() => {
    const groups: PermissionGroup[] = [];
    const searchLower = searchTerm.toLowerCase();

    PERMISSION_GROUPS.forEach(group => {
      const modulePerms = permissions.filter(p => {
        const matchesModule = p.module === group.module;
        const matchesSearch = !searchTerm || 
          p.name.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          group.displayName.toLowerCase().includes(searchLower);
        return matchesModule && matchesSearch;
      });

      if (modulePerms.length > 0) {
        groups.push({
          ...group,
          permissions: modulePerms
        });
      }
    });

    return groups;
  }, [permissions, searchTerm]);

  // ============================================
  // RENDER
  // ============================================

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-purple-900/20 dark:via-gray-900 dark:to-indigo-900/20 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {/* User Avatar */}
                  <div className="relative">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="w-14 h-14 rounded-xl object-cover border-2 border-white dark:border-gray-800 shadow-lg"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {user.first_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-purple-500 flex items-center justify-center shadow-lg">
                      <Key className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Gestión de Permisos
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {user.full_name} • {user.role_display_name}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleClose}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-8 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar permisos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : groupedPermissions.length === 0 ? (
                <div className="text-center py-16">
                  <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No se encontraron permisos</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedPermissions.map(group => {
                    const isExpanded = expandedModules.has(group.module);
                    const grantedCount = group.permissions.filter(
                      p => pendingChanges.get(p.name)
                    ).length;
                    const IconComponent = group.icon;

                    return (
                      <div
                        key={group.module}
                        className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                      >
                        {/* Module Header */}
                        <button
                          onClick={() => toggleModule(group.module)}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <IconComponent className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1 text-left">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {group.displayName}
                            </span>
                            <span className="ml-2 text-xs text-gray-500">
                              {grantedCount}/{group.permissions.length} activos
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </button>

                        {/* Permissions List */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 py-2 space-y-1 bg-white dark:bg-gray-900">
                                {group.permissions.map(permission => {
                                  const isGranted = pendingChanges.get(permission.name) || false;

                                  return (
                                    <label
                                      key={permission.id}
                                      className={`
                                        flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors
                                        ${isGranted 
                                          ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800' 
                                          : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                                        }
                                      `}
                                    >
                                      {/* Checkbox */}
                                      <div className={`
                                        w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                                        ${isGranted 
                                          ? 'bg-purple-500 border-purple-500' 
                                          : 'border-gray-300 dark:border-gray-600'
                                        }
                                      `}>
                                        {isGranted && (
                                          <Check className="w-3 h-3 text-white" />
                                        )}
                                      </div>
                                      <input
                                        type="checkbox"
                                        checked={isGranted}
                                        onChange={() => togglePermission(permission.name)}
                                        className="sr-only"
                                      />

                                      {/* Permission Info */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          {isGranted ? (
                                            <Unlock className="w-3.5 h-3.5 text-purple-500" />
                                          ) : (
                                            <Lock className="w-3.5 h-3.5 text-gray-400" />
                                          )}
                                          <span className={`text-sm font-medium ${
                                            isGranted 
                                              ? 'text-purple-700 dark:text-purple-300' 
                                              : 'text-gray-700 dark:text-gray-300'
                                          }`}>
                                            {permission.name}
                                          </span>
                                        </div>
                                        {permission.description && (
                                          <p className="text-xs text-gray-500 dark:text-gray-400 ml-5 mt-0.5">
                                            {permission.description}
                                          </p>
                                        )}
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {hasChanges && (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400">
                      Tienes cambios sin guardar
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClose}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={{ scale: hasChanges ? 1.02 : 1 }}
                  whileTap={{ scale: hasChanges ? 0.98 : 1 }}
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-purple-500/25 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Guardar Permisos
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PermissionsModal;

