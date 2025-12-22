/**
 * ============================================
 * GROUP MANAGEMENT V2 - MÓDULO ENTERPRISE
 * ============================================
 * 
 * Módulo de gestión de grupos de permisos con:
 * - Sidebar jerárquico tipo Active Directory
 * - Tabla optimizada con paginación
 * - Panel de edición embebido
 * - Búsqueda y filtros avanzados
 * 
 * Acceso: Solo administradores y administradores operativos
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
  ChevronRight,
  ChevronDown,
  Lock,
  Unlock,
  Eye,
  PanelLeftClose,
  PanelLeft,
  MoreHorizontal,
  Filter,
  X,
  Check,
  Building2,
  Layers,
  UserCog
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { groupsService, type PermissionGroup, type GroupPermission } from '../../../services/groupsService';
import toast from 'react-hot-toast';
import GroupEditModal from './components/GroupEditModal';
import GroupUsersModal from './components/GroupUsersModal';

// Key para localStorage del sidebar interno
const GROUP_SIDEBAR_KEY = 'group_management_sidebar_visible';

// ============================================
// TIPOS
// ============================================

type FilterType = 'all' | 'system' | 'custom';
type SortField = 'display_name' | 'priority' | 'users_count' | 'permissions_count' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface TreeNode {
  id: string;
  name: string;
  icon: React.ReactNode;
  count: number;
  type: 'all' | 'system' | 'custom' | 'role';
  children?: TreeNode[];
  color?: string;
}

// ============================================
// COMPONENTE: SIDEBAR DE ÁRBOL
// ============================================

interface TreeViewSidebarProps {
  nodes: TreeNode[];
  selectedId: string | null;
  onSelect: (node: TreeNode) => void;
  expanded: boolean;
}

const TreeViewSidebar: React.FC<TreeViewSidebarProps> = ({
  nodes,
  selectedId,
  onSelect,
  expanded
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id}>
        <button
          onClick={() => {
            if (hasChildren) toggleNode(node.id);
            onSelect(node);
          }}
          className={`w-full flex items-center px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${
            isSelected
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          {hasChildren && (
            <span className="mr-1.5 text-gray-400">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
          )}
          <span className={`flex items-center justify-center w-7 h-7 rounded-lg mr-2.5 ${
            node.color ? `bg-gradient-to-br ${node.color}` : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            {node.icon}
          </span>
          {expanded && (
            <>
              <span className="flex-1 text-sm font-medium truncate">
                {node.name}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                isSelected
                  ? 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {node.count}
              </span>
            </>
          )}
        </button>
        {hasChildren && isExpanded && (
          <div className="mt-0.5">
            {node.children!.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="py-2 space-y-0.5">
      {nodes.map(node => renderNode(node))}
    </div>
  );
};

// ============================================
// COMPONENTE: FILA DE TABLA
// ============================================

interface GroupRowProps {
  group: PermissionGroup;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onViewUsers: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

const GroupRow: React.FC<GroupRowProps> = ({
  group,
  isSelected,
  onSelect,
  onEdit,
  onViewUsers,
  onDuplicate,
  onDelete,
  canEdit,
  canDelete
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`border-b border-gray-100 dark:border-gray-800 transition-colors cursor-pointer ${
        isSelected
          ? 'bg-purple-50 dark:bg-purple-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
      onClick={onSelect}
      onDoubleClick={onEdit}
    >
      {/* Indicador + Icono */}
      <td className="py-3 px-4">
        <div className="flex items-center space-x-3">
          <div 
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${group.color || 'from-blue-500 to-indigo-600'} flex items-center justify-center shadow-sm`}
          >
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {group.display_name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {group.name}
            </p>
          </div>
        </div>
      </td>

      {/* Tipo */}
      <td className="py-3 px-4">
        {group.is_system ? (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg">
            <Lock className="w-3 h-3 mr-1" />
            Sistema
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg">
            <Unlock className="w-3 h-3 mr-1" />
            Personalizado
          </span>
        )}
      </td>

      {/* Rol base */}
      <td className="py-3 px-4">
        {group.base_role ? (
          <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
            {group.base_role.replace('_', ' ')}
          </span>
        ) : (
          <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
        )}
      </td>

      {/* Usuarios */}
      <td className="py-3 px-4 text-center">
        <span className="inline-flex items-center px-2.5 py-1 text-sm font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg">
          <Users className="w-3.5 h-3.5 mr-1" />
          {group.users_count || 0}
        </span>
      </td>

      {/* Permisos */}
      <td className="py-3 px-4 text-center">
        <span className="inline-flex items-center px-2.5 py-1 text-sm font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg">
          <Settings className="w-3.5 h-3.5 mr-1" />
          {group.permissions_count || 0}
        </span>
      </td>

      {/* Prioridad */}
      <td className="py-3 px-4 text-center">
        <div className="flex items-center justify-center">
          <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
              style={{ width: `${group.priority}%` }}
            />
          </div>
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            {group.priority}
          </span>
        </div>
      </td>

      {/* Acciones */}
      <td className="py-3 px-4">
        <div className="flex items-center justify-end space-x-1">
          <button
            onClick={(e) => { e.stopPropagation(); onViewUsers(); }}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            title="Ver usuarios"
          >
            <Eye className="w-4 h-4" />
          </button>
          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"
              title="Editar"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              className="p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-500 transition-colors"
              title="Duplicar"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
          {canDelete && !group.is_system && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </motion.tr>
  );
};

// ============================================
// COMPONENTE: PANEL DE DETALLE
// ============================================

interface DetailPanelProps {
  group: PermissionGroup | null;
  onEdit: () => void;
  onViewUsers: () => void;
  onClose: () => void;
  canEdit: boolean;
}

const DetailPanel: React.FC<DetailPanelProps> = ({
  group,
  onEdit,
  onViewUsers,
  onClose,
  canEdit
}) => {
  const [permissions, setPermissions] = useState<GroupPermission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  useEffect(() => {
    if (group) {
      loadPermissions();
    }
  }, [group?.id]);

  const loadPermissions = async () => {
    if (!group) return;
    try {
      setLoadingPermissions(true);
      const perms = await groupsService.getGroupPermissions(group.id);
      setPermissions(perms);
    } catch (err) {
      console.error('Error cargando permisos:', err);
    } finally {
      setLoadingPermissions(false);
    }
  };

  // Agrupar permisos por módulo
  const groupedPermissions = useMemo(() => {
    const grouped: Record<string, GroupPermission[]> = {};
    permissions.forEach(p => {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    });
    return grouped;
  }, [permissions]);

  if (!group) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-6">
        <Shield className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-center">Selecciona un grupo para ver sus detalles</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header del panel */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div 
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${group.color || 'from-blue-500 to-indigo-600'} flex items-center justify-center shadow-lg`}
            >
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {group.display_name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {group.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Badges */}
        <div className="flex items-center space-x-2 mb-3">
          {group.is_system && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
              <Lock className="w-3 h-3 mr-1" />
              Sistema
            </span>
          )}
          {group.base_role && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
              {group.base_role}
            </span>
          )}
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
            Prioridad: {group.priority}
          </span>
        </div>

        {/* Descripción */}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {group.description || 'Sin descripción'}
        </p>
      </div>

      {/* Stats */}
      <div className="flex-shrink-0 grid grid-cols-2 gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onViewUsers}
          className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <Users className="w-5 h-5 text-blue-500" />
          <div className="text-left">
            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
              {group.users_count || 0}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Usuarios</p>
          </div>
        </button>
        <div className="flex items-center space-x-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
          <Settings className="w-5 h-5 text-purple-500" />
          <div>
            <p className="text-lg font-bold text-purple-700 dark:text-purple-400">
              {group.permissions_count || 0}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400">Permisos</p>
          </div>
        </div>
      </div>

      {/* Permisos por módulo */}
      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Permisos Asignados
        </h4>

        {loadingPermissions ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
          </div>
        ) : Object.keys(groupedPermissions).length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
            No hay permisos asignados
          </p>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedPermissions).map(([module, perms]) => (
              <div key={module} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Layers className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {module.replace(/[-_]/g, ' ')}
                  </span>
                  <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded">
                    {perms.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {perms.filter(p => p.is_granted).map(p => (
                    <span 
                      key={p.id}
                      className="inline-flex items-center px-2 py-0.5 text-xs bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600"
                    >
                      <Check className="w-3 h-3 mr-1 text-green-500" />
                      {p.action}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer con acciones */}
      {canEdit && (
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onEdit}
            className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-purple-500/25 hover:from-purple-700 hover:to-indigo-700 transition-all"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Editar Grupo
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const GroupManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role_name === 'admin';
  const isAdminOperativo = currentUser?.role_name === 'administrador_operativo';

  // Estados principales
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortField, setSortField] = useState<SortField>('display_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Vista y selección
  const [selectedGroup, setSelectedGroup] = useState<PermissionGroup | null>(null);
  const [selectedTreeNode, setSelectedTreeNode] = useState<TreeNode | null>(null);
  
  // Sidebar
  const [showSidebar, setShowSidebar] = useState(() => {
    const saved = localStorage.getItem(GROUP_SIDEBAR_KEY);
    if (saved === null) return window.innerWidth >= 1280;
    return saved === 'true';
  });
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1280);
  
  // Modales
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit' | 'duplicate'>('create');
  const [modalGroup, setModalGroup] = useState<PermissionGroup | null>(null);

  // Permisos
  const canView = isAdmin || isAdminOperativo;
  const canCreate = isAdmin;
  const canEdit = isAdmin;
  const canDelete = isAdmin;
  const canAssign = isAdmin || isAdminOperativo;

  // Responsive
  useEffect(() => {
    const handleResize = () => {
      const large = window.innerWidth >= 1280;
      setIsLargeScreen(large);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = useCallback(() => {
    setShowSidebar(prev => {
      const newValue = !prev;
      localStorage.setItem(GROUP_SIDEBAR_KEY, String(newValue));
      return newValue;
    });
  }, []);

  const sidebarExpanded = showSidebar && (isLargeScreen || isSidebarHovered);

  // ============================================
  // CARGA DE DATOS
  // ============================================

  const loadGroups = useCallback(async () => {
    if (!canView) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await groupsService.getGroups(true);
      setGroups(data);
    } catch (err) {
      console.error('Error cargando grupos:', err);
      setError('No se pudieron cargar los grupos. Verifique que las tablas existan en la base de datos.');
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // ============================================
  // ÁRBOL DE NAVEGACIÓN
  // ============================================

  const treeNodes = useMemo((): TreeNode[] => {
    const systemGroups = groups.filter(g => g.is_system);
    const customGroups = groups.filter(g => !g.is_system);
    
    // Agrupar por rol base
    const roleGroups: Record<string, PermissionGroup[]> = {};
    groups.forEach(g => {
      const role = g.base_role || 'sin_rol';
      if (!roleGroups[role]) roleGroups[role] = [];
      roleGroups[role].push(g);
    });

    return [
      {
        id: 'all',
        name: 'Todos los Grupos',
        icon: <Shield className="w-4 h-4 text-purple-500" />,
        count: groups.length,
        type: 'all',
        color: 'from-purple-500 to-indigo-500'
      },
      {
        id: 'system',
        name: 'Del Sistema',
        icon: <Lock className="w-4 h-4 text-amber-500" />,
        count: systemGroups.length,
        type: 'system',
        color: 'from-amber-500 to-orange-500'
      },
      {
        id: 'custom',
        name: 'Personalizados',
        icon: <Unlock className="w-4 h-4 text-emerald-500" />,
        count: customGroups.length,
        type: 'custom',
        color: 'from-emerald-500 to-teal-500'
      },
      {
        id: 'by-role',
        name: 'Por Rol Base',
        icon: <UserCog className="w-4 h-4 text-blue-500" />,
        count: Object.keys(roleGroups).length,
        type: 'all',
        color: 'from-blue-500 to-indigo-500',
        children: Object.entries(roleGroups).map(([role, roleGrps]) => ({
          id: `role-${role}`,
          name: role === 'sin_rol' ? 'Sin rol base' : role.replace('_', ' '),
          icon: <Users className="w-3.5 h-3.5 text-gray-500" />,
          count: roleGrps.length,
          type: 'role' as const,
          color: 'from-gray-400 to-gray-500'
        }))
      }
    ];
  }, [groups]);

  // ============================================
  // FILTROS Y ORDENAMIENTO
  // ============================================

  const filteredGroups = useMemo(() => {
    let result = [...groups];

    // Filtro por nodo del árbol
    if (selectedTreeNode) {
      if (selectedTreeNode.type === 'system') {
        result = result.filter(g => g.is_system);
      } else if (selectedTreeNode.type === 'custom') {
        result = result.filter(g => !g.is_system);
      } else if (selectedTreeNode.type === 'role') {
        const role = selectedTreeNode.id.replace('role-', '');
        result = result.filter(g => 
          role === 'sin_rol' ? !g.base_role : g.base_role === role
        );
      }
    } else if (filterType !== 'all') {
      result = result.filter(g => 
        filterType === 'system' ? g.is_system : !g.is_system
      );
    }

    // Filtro por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(g =>
        g.display_name.toLowerCase().includes(query) ||
        g.name.toLowerCase().includes(query) ||
        (g.description && g.description.toLowerCase().includes(query))
      );
    }

    // Ordenamiento
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [groups, selectedTreeNode, filterType, searchQuery, sortField, sortDirection]);

  // Estadísticas
  const stats = useMemo(() => ({
    total: groups.length,
    system: groups.filter(g => g.is_system).length,
    custom: groups.filter(g => !g.is_system).length,
    totalUsers: groups.reduce((acc, g) => acc + (g.users_count || 0), 0)
  }), [groups]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleTreeNodeSelect = (node: TreeNode) => {
    setSelectedTreeNode(node.id === 'all' ? null : node);
    setSelectedGroup(null);
  };

  const handleCreateGroup = () => {
    setModalGroup(null);
    setEditMode('create');
    setShowEditModal(true);
  };

  const handleEditGroup = (group: PermissionGroup) => {
    setModalGroup(group);
    setEditMode('edit');
    setShowEditModal(true);
  };

  const handleDuplicateGroup = (group: PermissionGroup) => {
    setModalGroup(group);
    setEditMode('duplicate');
    setShowEditModal(true);
  };

  const handleViewUsers = (group: PermissionGroup) => {
    setModalGroup(group);
    setShowUsersModal(true);
  };

  const handleDeleteGroup = async (group: PermissionGroup) => {
    if (group.is_system) {
      toast.error('No se puede eliminar un grupo del sistema');
      return;
    }

    if (!confirm(`¿Eliminar el grupo "${group.display_name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await groupsService.deleteGroup(group.id, currentUser?.id);
      toast.success('Grupo eliminado correctamente');
      if (selectedGroup?.id === group.id) setSelectedGroup(null);
      loadGroups();
    } catch (err) {
      console.error('Error eliminando grupo:', err);
      toast.error('Error al eliminar el grupo');
    }
  };

  const handleSaveGroup = async (groupData: Partial<PermissionGroup>, permissions: GroupPermission[]) => {
    try {
      if (editMode === 'create') {
        await groupsService.createGroup({
          name: groupData.name || `grupo_${Date.now()}`,
          display_name: groupData.display_name || 'Nuevo Grupo',
          description: groupData.description || undefined,
          color: groupData.color || undefined,
          icon: groupData.icon || undefined,
          base_role: groupData.base_role || undefined,
          priority: groupData.priority || 50,
          permissions: permissions.map(p => ({
            module: p.module,
            action: p.action,
            scope_restriction: p.scope_restriction
          }))
        }, currentUser?.id);
        toast.success('Grupo creado correctamente');
      } else if (editMode === 'edit' && modalGroup) {
        await groupsService.updateGroup(modalGroup.id, {
          display_name: groupData.display_name,
          description: groupData.description,
          color: groupData.color,
          icon: groupData.icon,
          priority: groupData.priority,
          permissions: permissions.map(p => ({
            module: p.module,
            action: p.action,
            scope_restriction: p.scope_restriction
          }))
        }, currentUser?.id);
        toast.success('Grupo actualizado correctamente');
      } else if (editMode === 'duplicate' && modalGroup) {
        await groupsService.duplicateGroup(
          modalGroup.id,
          groupData.name || `${modalGroup.name}_copia`,
          groupData.display_name || `${modalGroup.display_name} (Copia)`,
          currentUser?.id
        );
        toast.success('Grupo duplicado correctamente');
      }

      setShowEditModal(false);
      loadGroups();
    } catch (err) {
      console.error('Error guardando grupo:', err);
      toast.error('Error al guardar el grupo');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ============================================
  // RENDER: Estados especiales
  // ============================================

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16">
        <Shield className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Acceso Restringido
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Solo administradores pueden acceder a la gestión de grupos.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Cargando grupos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16">
        <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Error al cargar
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-4">
          {error}
        </p>
        <button
          onClick={loadGroups}
          className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </button>
      </div>
    );
  }

  // ============================================
  // RENDER: Principal
  // ============================================

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-900/50">
      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ 
          width: showSidebar ? (sidebarExpanded ? 260 : 64) : 0,
          opacity: showSidebar ? 1 : 0
        }}
        transition={{ duration: 0.2 }}
        className="flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-hidden"
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        {showSidebar && (
          <div className="h-full flex flex-col">
            {/* Header sidebar */}
            <div className="flex-shrink-0 p-3 border-b border-gray-200 dark:border-gray-700">
              {sidebarExpanded ? (
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Navegación
                  </h3>
                  <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full">
                    {stats.total}
                  </span>
                </div>
              ) : (
                <div className="flex justify-center">
                  <Shield className="w-5 h-5 text-purple-500" />
                </div>
              )}
            </div>

            {/* Tree content */}
            <div className="flex-1 overflow-y-auto px-2">
              <TreeViewSidebar
                nodes={treeNodes}
                selectedId={selectedTreeNode?.id || 'all'}
                onSelect={handleTreeNodeSelect}
                expanded={sidebarExpanded}
              />
            </div>

            {/* Stats en sidebar */}
            {sidebarExpanded && (
              <div className="flex-shrink-0 p-3 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{stats.totalUsers}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Usuarios</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2">
                    <p className="text-lg font-bold text-purple-700 dark:text-purple-400">{stats.total}</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400">Grupos</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                title={showSidebar ? 'Ocultar sidebar' : 'Mostrar sidebar'}
              >
                {showSidebar ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
              </button>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-purple-500" />
                  Grupos de Permisos
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {filteredGroups.length} de {groups.length} grupos
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={loadGroups}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                title="Refrescar"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              {canCreate && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateGroup}
                  className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-purple-500/25 hover:from-purple-700 hover:to-indigo-700 transition-all"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Nuevo Grupo
                </motion.button>
              )}
            </div>
          </div>

          {/* Barra de búsqueda */}
          <div className="flex items-center space-x-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar grupos..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filtros rápidos */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              {(['all', 'system', 'custom'] as FilterType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setFilterType(type);
                    setSelectedTreeNode(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterType === type && !selectedTreeNode
                      ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {type === 'all' ? 'Todos' : type === 'system' ? 'Sistema' : 'Personalizados'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-auto">
          {filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Shield className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                No se encontraron grupos
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? 'Intenta con otros criterios' : 'Crea un nuevo grupo para comenzar'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                <tr className="text-left">
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Grupo
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rol Base
                  </th>
                  <th 
                    className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center cursor-pointer hover:text-purple-500"
                    onClick={() => handleSort('users_count')}
                  >
                    Usuarios
                    {sortField === 'users_count' && (
                      <ChevronDown className={`inline w-4 h-4 ml-1 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </th>
                  <th 
                    className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center cursor-pointer hover:text-purple-500"
                    onClick={() => handleSort('permissions_count')}
                  >
                    Permisos
                    {sortField === 'permissions_count' && (
                      <ChevronDown className={`inline w-4 h-4 ml-1 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </th>
                  <th 
                    className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center cursor-pointer hover:text-purple-500"
                    onClick={() => handleSort('priority')}
                  >
                    Prioridad
                    {sortField === 'priority' && (
                      <ChevronDown className={`inline w-4 h-4 ml-1 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filteredGroups.map((group) => (
                    <GroupRow
                      key={group.id}
                      group={group}
                      isSelected={selectedGroup?.id === group.id}
                      onSelect={() => setSelectedGroup(group)}
                      onEdit={() => handleEditGroup(group)}
                      onViewUsers={() => handleViewUsers(group)}
                      onDuplicate={() => handleDuplicateGroup(group)}
                      onDelete={() => handleDeleteGroup(group)}
                      canEdit={canEdit}
                      canDelete={canDelete}
                    />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Panel de detalle */}
      <AnimatePresence>
        {selectedGroup && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 border-l border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <DetailPanel
              group={selectedGroup}
              onEdit={() => handleEditGroup(selectedGroup)}
              onViewUsers={() => handleViewUsers(selectedGroup)}
              onClose={() => setSelectedGroup(null)}
              canEdit={canEdit}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modales */}
      <AnimatePresence>
        {showEditModal && (
          <GroupEditModal
            group={editMode === 'create' ? null : modalGroup}
            mode={editMode}
            onSave={handleSaveGroup}
            onClose={() => setShowEditModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUsersModal && modalGroup && (
          <GroupUsersModal
            group={modalGroup}
            canAssign={canAssign}
            onClose={() => setShowUsersModal(false)}
            onRefresh={loadGroups}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupManagement;
