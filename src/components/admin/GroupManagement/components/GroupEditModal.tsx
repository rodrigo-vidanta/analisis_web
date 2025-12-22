/**
 * Modal de creación/edición de grupos de permisos
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Shield,
  Settings,
  Users,
  Save,
  ChevronDown,
  ChevronRight,
  Check,
  Loader2,
  Palette,
  Tag,
  FileText,
  Layers,
  AlertCircle
} from 'lucide-react';
import { groupsService, type PermissionGroup, type GroupPermission } from '../../../../services/groupsService';
import { MODULE_CATALOG, type ModuleDefinition, type PermissionAction } from '../../../../config/permissionModules';

// ============================================
// TIPOS
// ============================================

interface GroupEditModalProps {
  group: PermissionGroup | null;
  mode: 'create' | 'edit' | 'duplicate';
  onSave: (groupData: Partial<PermissionGroup>, permissions: GroupPermission[]) => Promise<void>;
  onClose: () => void;
}

// Colores predefinidos para grupos
const GROUP_COLORS = [
  { name: 'Rojo', value: 'from-red-500 to-rose-600' },
  { name: 'Naranja', value: 'from-orange-500 to-amber-600' },
  { name: 'Amarillo', value: 'from-yellow-500 to-amber-600' },
  { name: 'Verde', value: 'from-emerald-500 to-teal-600' },
  { name: 'Azul', value: 'from-blue-500 to-indigo-600' },
  { name: 'Púrpura', value: 'from-purple-500 to-violet-600' },
  { name: 'Rosa', value: 'from-pink-500 to-rose-600' },
  { name: 'Gris', value: 'from-gray-500 to-slate-600' }
];

// ============================================
// COMPONENTE DE MÓDULO EXPANDIBLE
// ============================================

interface ModulePermissionsProps {
  module: ModuleDefinition;
  selectedActions: Set<string>;
  onToggleAction: (moduleId: string, actionId: string) => void;
  onToggleAllActions: (moduleId: string, select: boolean) => void;
  scopeRestrictions: Map<string, string>;
  onScopeChange: (moduleId: string, actionId: string, scope: string) => void;
}

const ModulePermissions: React.FC<ModulePermissionsProps> = ({
  module,
  selectedActions,
  onToggleAction,
  onToggleAllActions,
  scopeRestrictions,
  onScopeChange
}) => {
  const [expanded, setExpanded] = useState(false);
  
  // Contar acciones seleccionadas
  const selectedCount = module.actions.filter(action => 
    selectedActions.has(`${module.id}:${action.id}`)
  ).length;
  
  const allSelected = selectedCount === module.actions.length;
  const someSelected = selectedCount > 0 && selectedCount < module.actions.length;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Header del módulo */}
      <div className="flex items-center bg-gray-50 dark:bg-gray-800">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center`}>
              <Settings className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <span className="font-medium text-gray-900 dark:text-white">{module.name}</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">{module.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {selectedCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                {selectedCount}/{module.actions.length}
              </span>
            )}
            {expanded ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>
        {/* Botón seleccionar/deseleccionar todos */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleAllActions(module.id, !allSelected);
          }}
          className={`px-3 py-2 mr-2 text-xs font-medium rounded-lg transition-all ${
            allSelected
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : someSelected
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200'
                : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
          title={allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
        >
          {allSelected ? '✓ Todos' : someSelected ? 'Algunos' : 'Ninguno'}
        </button>
      </div>

      {/* Acciones del módulo */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-2 bg-white dark:bg-gray-900">
              {module.actions.map((action) => {
                const key = `${module.id}:${action.id}`;
                const isSelected = selectedActions.has(key);
                const scope = scopeRestrictions.get(key) || 'none';

                return (
                  <div
                    key={action.id}
                    className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-800 border border-transparent'
                    }`}
                  >
                    <label className="flex items-center space-x-3 cursor-pointer flex-1">
                      <div
                        onClick={() => onToggleAction(module.id, action.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {action.name}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {action.description}
                        </p>
                      </div>
                    </label>
                    
                    {isSelected && action.scopeRestricted && (
                      <select
                        value={scope}
                        onChange={(e) => onScopeChange(module.id, action.id, e.target.value)}
                        className="ml-2 px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="none">Sin restricción</option>
                        <option value="own">Solo propios</option>
                        <option value="coordination">Su coordinación</option>
                        <option value="all">Todo</option>
                      </select>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submódulos si existen */}
            {module.subModules && module.subModules.length > 0 && (
              <div className="p-3 pt-0 space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Submódulos
                </p>
                {module.subModules.map((subModule) => (
                  <ModulePermissions
                    key={subModule.id}
                    module={subModule}
                    selectedActions={selectedActions}
                    onToggleAction={onToggleAction}
                    onToggleAllActions={onToggleAllActions}
                    scopeRestrictions={scopeRestrictions}
                    onScopeChange={onScopeChange}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const GroupEditModal: React.FC<GroupEditModalProps> = ({
  group,
  mode,
  onSave,
  onClose
}) => {
  // Estados del formulario
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('from-blue-500 to-indigo-600');
  const [priority, setPriority] = useState(50);
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [scopeRestrictions, setScopeRestrictions] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  // Cargar datos del grupo si es edición/duplicación
  useEffect(() => {
    if (group && (mode === 'edit' || mode === 'duplicate')) {
      setName(mode === 'duplicate' ? `${group.name}_copia` : group.name);
      setDisplayName(mode === 'duplicate' ? `${group.display_name} (Copia)` : group.display_name);
      setDescription(group.description || '');
      setColor(group.color || 'from-blue-500 to-indigo-600');
      setPriority(group.priority);

      // Cargar permisos existentes
      loadExistingPermissions();
    }
  }, [group, mode]);

  const loadExistingPermissions = async () => {
    if (!group) return;
    
    try {
      setLoadingPermissions(true);
      const permissions = await groupsService.getGroupPermissions(group.id);
      
      const actions = new Set<string>();
      const scopes = new Map<string, string>();
      
      permissions.forEach((p) => {
        const key = `${p.module}:${p.action}`;
        if (p.is_granted) {
          actions.add(key);
        }
        if (p.scope_restriction && p.scope_restriction !== 'none') {
          scopes.set(key, p.scope_restriction);
        }
      });
      
      setSelectedActions(actions);
      setScopeRestrictions(scopes);
    } catch (err) {
      console.error('Error cargando permisos:', err);
    } finally {
      setLoadingPermissions(false);
    }
  };

  // Handlers
  const handleToggleAction = (moduleId: string, actionId: string) => {
    const key = `${moduleId}:${actionId}`;
    setSelectedActions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Handler para seleccionar/deseleccionar todos los permisos de un módulo
  const handleToggleAllActions = (moduleId: string, select: boolean) => {
    // Buscar el módulo en el catálogo
    const findModule = (modules: typeof MODULE_CATALOG, id: string): typeof MODULE_CATALOG[0] | undefined => {
      for (const mod of modules) {
        if (mod.id === id) return mod;
        if (mod.subModules) {
          const found = findModule(mod.subModules, id);
          if (found) return found;
        }
      }
      return undefined;
    };
    
    const module = findModule(MODULE_CATALOG, moduleId);
    if (!module) return;

    setSelectedActions(prev => {
      const newSet = new Set(prev);
      for (const action of module.actions) {
        const key = `${moduleId}:${action.id}`;
        if (select) {
          newSet.add(key);
        } else {
          newSet.delete(key);
        }
      }
      return newSet;
    });
  };

  const handleScopeChange = (moduleId: string, actionId: string, scope: string) => {
    const key = `${moduleId}:${actionId}`;
    setScopeRestrictions(prev => {
      const newMap = new Map(prev);
      if (scope === 'none') {
        newMap.delete(key);
      } else {
        newMap.set(key, scope);
      }
      return newMap;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      return;
    }

    try {
      setLoading(true);

      // Construir array de permisos
      const permissions: GroupPermission[] = Array.from(selectedActions).map(key => {
        const [moduleId, actionId] = key.split(':');
        return {
          id: '',
          group_id: group?.id || '',
          module: moduleId,
          action: actionId,
          is_granted: true,
          scope_restriction: (scopeRestrictions.get(key) as GroupPermission['scope_restriction']) || 'none',
          custom_rules: null,
          created_at: ''
        };
      });

      await onSave({
        name: name.toLowerCase().replace(/\s+/g, '_'),
        display_name: displayName,
        description: description || undefined,
        color,
        priority
      }, permissions);
    } catch (err) {
      console.error('Error guardando grupo:', err);
    } finally {
      setLoading(false);
    }
  };

  // Obtener título según modo
  const getTitle = () => {
    switch (mode) {
      case 'create': return 'Nuevo Grupo de Permisos';
      case 'edit': return 'Editar Grupo';
      case 'duplicate': return 'Duplicar Grupo';
      default: return 'Grupo de Permisos';
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
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{getTitle()}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {mode === 'create' ? 'Configura los permisos del nuevo grupo' : 
                   mode === 'duplicate' ? 'Modifica los datos de la copia' : 
                   'Modifica la configuración del grupo'}
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
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Sección: Información básica */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Información Básica
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre visible */}
                <div>
                  <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    <Tag className="w-4 h-4" />
                    <span>Nombre del Grupo *</span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ej: Supervisores de Ventas"
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all"
                  />
                </div>

                {/* Identificador técnico */}
                <div>
                  <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    <Settings className="w-4 h-4" />
                    <span>Identificador Técnico</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="supervisores_ventas"
                    disabled={mode === 'edit' && group?.is_system}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  <FileText className="w-4 h-4" />
                  <span>Descripción</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe el propósito de este grupo..."
                  rows={2}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all resize-none"
                />
              </div>

              {/* Color y Prioridad */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Color */}
                <div>
                  <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    <Palette className="w-4 h-4" />
                    <span>Color del Grupo</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {GROUP_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setColor(c.value)}
                        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${c.value} transition-all ${
                          color === c.value 
                            ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-900' 
                            : 'hover:scale-110'
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Prioridad */}
                <div>
                  <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    <Layers className="w-4 h-4" />
                    <span>Prioridad ({priority})</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Baja</span>
                    <span>Alta</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección: Permisos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Permisos del Grupo
                  </h4>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedActions.size} permisos seleccionados
                </span>
              </div>

              {loadingPermissions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  <span className="ml-2 text-gray-500">Cargando permisos...</span>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {MODULE_CATALOG.map((module) => (
                    <ModulePermissions
                      key={module.id}
                      module={module}
                      selectedActions={selectedActions}
                      onToggleAction={handleToggleAction}
                      onToggleAllActions={handleToggleAllActions}
                      scopeRestrictions={scopeRestrictions}
                      onScopeChange={handleScopeChange}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {mode === 'edit' && group?.is_system && (
                <span className="inline-flex items-center text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Grupo del sistema - Algunos campos no son editables
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <motion.button
                type="submit"
                disabled={loading || !displayName.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/25 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {mode === 'create' ? 'Crear Grupo' : 
                     mode === 'duplicate' ? 'Crear Copia' : 
                     'Guardar Cambios'}
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default GroupEditModal;

