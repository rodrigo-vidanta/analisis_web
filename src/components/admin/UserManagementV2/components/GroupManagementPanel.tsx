/**
 * ============================================
 * GROUP MANAGEMENT PANEL - EMBEBIDO
 * ============================================
 * Panel embebido para gestión de grupos de permisos
 * Diseño tipo Active Directory con lista + detalle
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Plus,
  Users,
  Settings,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Search,
  Edit2,
  Trash2,
  Copy,
  Lock,
  Unlock,
  Eye,
  X,
  ChevronRight,
  ChevronLeft,
  Layers,
  Check,
  Save,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { groupsService, type PermissionGroup, type GroupPermission } from '../../../../services/groupsService';
import { MODULE_CATALOG } from '../../../../config/permissionModules';
import toast from 'react-hot-toast';

// ============================================
// TIPOS
// ============================================

interface GroupManagementPanelProps {
  onClose: () => void;
}

type ViewState = 'list' | 'edit' | 'create';

// ============================================
// COMPONENTE DE ITEM DE GRUPO EN LISTA
// ============================================

interface GroupListItemProps {
  group: PermissionGroup;
  isSelected: boolean;
  onSelect: () => void;
}

const GroupListItem: React.FC<GroupListItemProps> = ({
  group,
  isSelected,
  onSelect
}) => (
  <button
    onClick={onSelect}
    className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 text-left ${
      isSelected
        ? 'bg-purple-100 dark:bg-purple-900/30 border-l-4 border-purple-500'
        : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-l-4 border-transparent'
    }`}
  >
    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${group.color || 'from-purple-500 to-indigo-600'} flex items-center justify-center flex-shrink-0`}>
      {group.is_system ? (
        <Lock className="w-4 h-4 text-white" />
      ) : (
        <Shield className="w-4 h-4 text-white" />
      )}
    </div>
    <div className="ml-3 flex-1 min-w-0">
      <p className={`text-sm font-medium truncate ${
        isSelected ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-white'
      }`}>
        {group.display_name}
      </p>
      <div className="flex items-center space-x-2 mt-0.5">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {group.users_count || 0} usuarios
        </span>
        <span className="text-gray-300 dark:text-gray-600">•</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {group.permissions_count || 0} permisos
        </span>
      </div>
    </div>
    {group.is_system && (
      <span className="ml-2 text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded font-medium">
        SYS
      </span>
    )}
    <ChevronRight className={`ml-2 w-4 h-4 transition-colors ${
      isSelected ? 'text-purple-500' : 'text-gray-300 dark:text-gray-600'
    }`} />
  </button>
);

// ============================================
// COMPONENTE DE EDITOR DE PERMISOS
// ============================================

interface PermissionEditorProps {
  selectedActions: Set<string>;
  onToggleAction: (moduleAction: string) => void;
  onSelectAllModule: (moduleId: string, actions: string[]) => void;
}

const PermissionEditor: React.FC<PermissionEditorProps> = ({
  selectedActions,
  onToggleAction,
  onSelectAllModule
}) => {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {MODULE_CATALOG.map(module => {
        const isExpanded = expandedModules.has(module.id);
        const moduleActions = module.actions.map(a => `${module.id}:${a.id}`);
        const selectedCount = moduleActions.filter(a => selectedActions.has(a)).length;
        const allSelected = selectedCount === module.actions.length;
        const someSelected = selectedCount > 0 && !allSelected;

        return (
          <div key={module.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Header del módulo */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800">
              <button
                type="button"
                onClick={() => toggleModule(module.id)}
                className="flex items-center flex-1 text-left"
              >
                <ChevronRight className={`w-4 h-4 mr-2 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center mr-2 ${module.color}`}>
                  <Layers className="w-3.5 h-3.5 text-white" />
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {module.name}
                </span>
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                  allSelected 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : someSelected
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {selectedCount}/{module.actions.length}
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectAllModule(module.id, moduleActions);
                }}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  allSelected
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400'
                }`}
              >
                {allSelected ? '✓ Todos' : 'Seleccionar todos'}
              </button>
            </div>

            {/* Acciones del módulo */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 grid grid-cols-2 gap-2">
                    {module.actions.map(action => {
                      const actionKey = `${module.id}:${action.id}`;
                      const isSelected = selectedActions.has(actionKey);

                      return (
                        <label
                          key={action.id}
                          className={`flex items-center p-2 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700'
                              : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-purple-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleAction(actionKey)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded border-2 mr-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-purple-500 border-purple-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                              {action.name}
                            </p>
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
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const GroupManagementPanel: React.FC<GroupManagementPanelProps> = ({
  onClose
}) => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role_name === 'admin';
  const isAdminOperativo = currentUser?.role_name === 'administrador_operativo';

  // Estados principales
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Vista actual
  const [viewState, setViewState] = useState<ViewState>('list');
  const [selectedGroup, setSelectedGroup] = useState<PermissionGroup | null>(null);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  
  // Formulario de edición
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    color: 'from-purple-500 to-indigo-600',
    priority: 50
  });
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());

  // Permisos - Admin puede editar todo, Admin Operativo solo grupos de su nivel o inferior
  const canEdit = isAdmin || isAdminOperativo;
  const canDelete = isAdmin; // Solo admin puede eliminar grupos

  // Roles permitidos para Admin Operativo
  const allowedBaseRolesForAdminOp = ['administrador_operativo', 'coordinador', 'supervisor', 'ejecutivo', 'evaluador', 'calidad'];

  // Verificar si puede editar un grupo específico
  const canEditGroup = useCallback((group: PermissionGroup) => {
    if (isAdmin) return true;
    if (isAdminOperativo) {
      // Admin Operativo puede editar grupos que NO sean system_admin o admin
      return !group.is_system || allowedBaseRolesForAdminOp.includes(group.base_role || '');
    }
    return false;
  }, [isAdmin, isAdminOperativo]);

  // Colores disponibles
  const colorOptions = [
    'from-purple-500 to-indigo-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-red-500 to-rose-600',
    'from-pink-500 to-fuchsia-600',
    'from-gray-500 to-slate-600'
  ];

  // ============================================
  // CARGA DE DATOS
  // ============================================

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await groupsService.getGroups(true);
      setGroups(data);
    } catch (err) {
      console.error('Error cargando grupos:', err);
      setError('No se pudieron cargar los grupos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Cargar permisos del grupo seleccionado
  useEffect(() => {
    if (selectedGroup && viewState === 'edit') {
      loadGroupPermissions(selectedGroup.id);
    }
  }, [selectedGroup, viewState]);

  const loadGroupPermissions = async (groupId: string) => {
    try {
      const permissions = await groupsService.getGroupPermissions(groupId);
      const actions = new Set<string>();
      permissions.forEach(p => {
        if (p.is_granted) {
          actions.add(`${p.module}:${p.action}`);
        }
      });
      setSelectedActions(actions);
    } catch (err) {
      console.error('Error cargando permisos:', err);
    }
  };

  // ============================================
  // FILTROS
  // ============================================

  const filteredGroups = useMemo(() => {
    let result = groups;
    
    // Admin Operativo solo ve grupos de su nivel o inferior
    if (isAdminOperativo && !isAdmin) {
      result = result.filter(g => 
        !g.base_role || allowedBaseRolesForAdminOp.includes(g.base_role)
      );
    }
    
    // Aplicar búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(g =>
        g.display_name.toLowerCase().includes(query) ||
        g.name.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [groups, searchQuery, isAdmin, isAdminOperativo]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSelectGroup = (group: PermissionGroup) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      display_name: group.display_name,
      description: group.description || '',
      color: group.color || 'from-purple-500 to-indigo-600',
      priority: group.priority || 50
    });
    setViewState('edit');
  };

  const handleCreateNew = () => {
    setSelectedGroup(null);
    setFormData({
      name: '',
      display_name: '',
      description: '',
      color: 'from-purple-500 to-indigo-600',
      priority: 50
    });
    setSelectedActions(new Set());
    setViewState('create');
  };

  const handleDuplicate = (group: PermissionGroup) => {
    setSelectedGroup(group);
    setFormData({
      name: `${group.name}_copia`,
      display_name: `${group.display_name} (Copia)`,
      description: group.description || '',
      color: group.color || 'from-purple-500 to-indigo-600',
      priority: group.priority || 50
    });
    setViewState('create');
    // Cargar permisos del grupo original
    loadGroupPermissions(group.id);
  };

  const handleDelete = async (group: PermissionGroup) => {
    if (group.is_system) {
      toast.error('No se puede eliminar un grupo del sistema');
      return;
    }

    if (!confirm(`¿Eliminar el grupo "${group.display_name}"?`)) {
      return;
    }

    try {
      await groupsService.deleteGroup(group.id, currentUser?.id);
      toast.success('Grupo eliminado');
      setSelectedGroup(null);
      setViewState('list');
      loadGroups();
    } catch (err) {
      console.error('Error eliminando grupo:', err);
      toast.error('Error al eliminar el grupo');
    }
  };

  const handleToggleAction = (actionKey: string) => {
    setSelectedActions(prev => {
      const next = new Set(prev);
      if (next.has(actionKey)) {
        next.delete(actionKey);
      } else {
        next.add(actionKey);
      }
      return next;
    });
  };

  const handleSelectAllModule = (moduleId: string, moduleActions: string[]) => {
    setSelectedActions(prev => {
      const next = new Set(prev);
      const allSelected = moduleActions.every(a => next.has(a));
      
      if (allSelected) {
        // Deseleccionar todos
        moduleActions.forEach(a => next.delete(a));
      } else {
        // Seleccionar todos
        moduleActions.forEach(a => next.add(a));
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!formData.display_name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    try {
      setSaving(true);
      
      const permissions: GroupPermission[] = Array.from(selectedActions).map(key => {
        const [module, action] = key.split(':');
        return {
          id: '',
          group_id: '',
          module,
          action,
          is_granted: true,
          scope_restriction: null
        };
      });

      if (viewState === 'create') {
        await groupsService.createGroup({
          name: formData.name || formData.display_name.toLowerCase().replace(/\s+/g, '_'),
          display_name: formData.display_name,
          description: formData.description || undefined,
          color: formData.color,
          priority: formData.priority,
          permissions: permissions.map(p => ({
            module: p.module,
            action: p.action,
            scope_restriction: p.scope_restriction
          }))
        }, currentUser?.id);
        toast.success('Grupo creado');
      } else if (viewState === 'edit' && selectedGroup) {
        await groupsService.updateGroup(selectedGroup.id, {
          display_name: formData.display_name,
          description: formData.description,
          color: formData.color,
          priority: formData.priority,
          permissions: permissions.map(p => ({
            module: p.module,
            action: p.action,
            scope_restriction: p.scope_restriction
          }))
        }, currentUser?.id);
        toast.success('Grupo actualizado');
      }

      setViewState('list');
      setSelectedGroup(null);
      loadGroups();
    } catch (err) {
      console.error('Error guardando grupo:', err);
      toast.error('Error al guardar el grupo');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setViewState('list');
    setSelectedGroup(null);
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              title="Volver a usuarios"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Grupos de Permisos
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {groups.length} grupos • Gestión tipo Active Directory
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {viewState === 'list' && canEdit && (
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-purple-500/25 hover:from-purple-700 hover:to-indigo-700 transition-all"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Nuevo Grupo
              </button>
            )}
            {(viewState === 'edit' || viewState === 'create') && (
              <>
                <button
                  onClick={handleBack}
                  className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-purple-500/25 hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-1.5" />
                  )}
                  {viewState === 'create' ? 'Crear Grupo' : 'Guardar Cambios'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={loadGroups}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm"
          >
            Reintentar
          </button>
        </div>
      ) : viewState === 'list' ? (
        /* Vista de lista */
        <div className="flex-1 flex overflow-hidden">
          {/* Lista de grupos */}
          <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900">
            {/* Búsqueda */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar grupos..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredGroups.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay grupos</p>
                </div>
              ) : (
                filteredGroups.map(group => (
                  <GroupListItem
                    key={group.id}
                    group={group}
                    isSelected={selectedGroup?.id === group.id}
                    onSelect={() => handleSelectGroup(group)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Panel de detalle */}
          <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 overflow-y-auto">
            {selectedGroup ? (
              <div className="p-6">
                {/* Header del grupo */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${selectedGroup.color || 'from-purple-500 to-indigo-600'} flex items-center justify-center shadow-lg`}>
                      {selectedGroup.is_system ? (
                        <Lock className="w-7 h-7 text-white" />
                      ) : (
                        <Shield className="w-7 h-7 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedGroup.display_name}
                      </h3>
                      <p className="text-sm text-gray-500 font-mono">{selectedGroup.name}</p>
                      <div className="flex items-center space-x-3 mt-1">
                        {selectedGroup.is_system && (
                          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
                            Grupo del Sistema
                          </span>
                        )}
                        {selectedGroup.base_role && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full capitalize">
                            {selectedGroup.base_role.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {canEditGroup(selectedGroup) && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDuplicate(selectedGroup)}
                        className="p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/20 text-purple-600 transition-colors"
                        title="Duplicar"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                      {!selectedGroup.is_system && canDelete && (
                        <button
                          onClick={() => handleDelete(selectedGroup)}
                          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Descripción */}
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {selectedGroup.description || 'Sin descripción'}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2 text-blue-600 mb-1">
                      <Users className="w-5 h-5" />
                      <span className="text-2xl font-bold">{selectedGroup.users_count || 0}</span>
                    </div>
                    <p className="text-xs text-gray-500">Usuarios asignados</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2 text-purple-600 mb-1">
                      <Settings className="w-5 h-5" />
                      <span className="text-2xl font-bold">{selectedGroup.permissions_count || 0}</span>
                    </div>
                    <p className="text-xs text-gray-500">Permisos</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2 text-emerald-600 mb-1">
                      <Layers className="w-5 h-5" />
                      <span className="text-2xl font-bold">{selectedGroup.priority}</span>
                    </div>
                    <p className="text-xs text-gray-500">Prioridad</p>
                  </div>
                </div>

                {/* Botón de editar */}
                {canEditGroup(selectedGroup) && (
                  <button
                    onClick={() => setViewState('edit')}
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-purple-500/25 hover:from-purple-700 hover:to-indigo-700 transition-all"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar Grupo
                  </button>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Shield className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">Selecciona un grupo</p>
                <p className="text-sm">para ver sus detalles</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Vista de edición/creación */
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Formulario básico */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {viewState === 'create' ? 'Nuevo Grupo' : 'Editar Grupo'}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre visible *
                  </label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="Ej: Administradores"
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Identificador (slug)
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                    placeholder="Ej: administradores"
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    disabled={viewState === 'edit' && selectedGroup?.is_system}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción del grupo..."
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Color del grupo
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} transition-transform ${
                          formData.color === color ? 'ring-2 ring-offset-2 ring-purple-500 scale-110' : 'hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prioridad (1-100)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 50 }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Mayor prioridad = prevalece sobre otros grupos</p>
                </div>
              </div>
            </div>

            {/* Permisos */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Permisos del Grupo
                </h3>
                <span className="text-sm text-gray-500">
                  {selectedActions.size} permisos seleccionados
                </span>
              </div>
              
              <PermissionEditor
                selectedActions={selectedActions}
                onToggleAction={handleToggleAction}
                onSelectAllModule={handleSelectAllModule}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupManagementPanel;
