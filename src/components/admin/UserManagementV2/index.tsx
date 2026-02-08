/**
 * ============================================
 * USER MANAGEMENT V2 - MÓDULO ENTERPRISE
 * ============================================
 * 
 * Módulo de gestión de usuarios con:
 * - Sidebar jerárquico tipo Active Directory
 * - Filtros avanzados con búsqueda en tiempo real
 * - Tabla optimizada con paginación
 * - Vistas de lista, cuadrícula y jerarquía
 * - Integración con modales existentes
 * 
 * ⚠️ REGLAS:
 * 1. Documentar cambios en README_PQNC_HUMANS.md
 * 2. Verificar en CHANGELOG_PQNC_HUMANS.md antes de modificar
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Shield,
  Settings,
  Loader2,
  AlertTriangle,
  RefreshCw,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useUserManagement } from './hooks/useUserManagement';
import TreeViewSidebar from './components/TreeViewSidebar';
import FilterBar from './components/FilterBar';
import UserTable from './components/UserTable';
import UserEditPanel from './components/UserEditPanel';
import UserCreateModal from './components/UserCreateModal';
import GroupManagementPanel from './components/GroupManagementPanel';
import type { TreeNode, ViewMode, UserV2 } from './types';

// Key para localStorage del sidebar interno
const USER_SIDEBAR_KEY = 'user_management_sidebar_visible';

// ============================================
// MAIN COMPONENT
// ============================================

const UserManagementV2: React.FC = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role_name === 'admin';
  const isAdminOperativo = currentUser?.role_name === 'administrador_operativo';
  
  // Core hook with all data and logic
  const {
    users,
    filteredUsers,
    roles,
    coordinaciones,
    groups,
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
  } = useUserManagement();

  // View state - sidebar colapsable con persistencia
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [showSidebar, setShowSidebar] = useState(() => {
    const saved = localStorage.getItem(USER_SIDEBAR_KEY);
    // Por defecto oculto en pantallas pequeñas
    if (saved === null) return window.innerWidth >= 1280;
    return saved === 'true';
  });
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  
  // Responsive: detectar tamaño de pantalla
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1280);
  
  useEffect(() => {
    const handleResize = () => {
      const large = window.innerWidth >= 1280;
      setIsLargeScreen(large);
      // Auto-ocultar en pantallas pequeñas
      if (!large && showSidebar) {
        const saved = localStorage.getItem(USER_SIDEBAR_KEY);
        if (saved !== 'true') {
          setShowSidebar(false);
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showSidebar]);
  
  const toggleSidebar = useCallback(() => {
    setShowSidebar(prev => {
      const newValue = !prev;
      localStorage.setItem(USER_SIDEBAR_KEY, String(newValue));
      return newValue;
    });
  }, []);
  
  // Sidebar expandido en hover (solo cuando está visible)
  const sidebarExpanded = showSidebar && (isLargeScreen || isSidebarHovered);

  // Estado para edición embebida en el área de trabajo
  const [editingUser, setEditingUser] = useState<UserV2 | null>(null);
  
  // Modal states (para modales flotantes si se necesitan)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserV2 | null>(null);
  
  // Estado para gestión de grupos
  const [showGroupManagement, setShowGroupManagement] = useState(false);

  // Permissions
  const canView = isAdmin || isAdminOperativo;
  const canCreate = isAdmin || isAdminOperativo;
  const canManageGroups = isAdmin;

  // ============================================
  // HANDLERS
  // ============================================

  // Navegación limpia: al cambiar de nodo, limpiar filtros anteriores
  const handleNodeSelect = useCallback((node: TreeNode | null) => {
    // Cerrar panel de edición al navegar
    setEditingUser(null);
    setSelectedNode(node);
    
    // Limpiar TODOS los filtros de navegación y aplicar el nuevo
    if (!node) {
      // "Todos los usuarios" - limpiar todos los filtros de navegación
      setFilters(prev => ({ 
        ...prev, 
        role: 'all', 
        coordinacion_id: 'all',
        status: 'all' // También limpiar filtro de estado
      }));
    } else if (node.type === 'role') {
      const roleName = node.id.replace('role-', '') as UserV2['role_name'];
      // Limpiar coordinación y status, aplicar solo rol
      setFilters(prev => ({ 
        ...prev, 
        role: roleName, 
        coordinacion_id: 'all',
        status: 'all'
      }));
    } else if (node.type === 'coordinacion') {
      // Extraer el ID de coordinación del nodo
      const coordId = node.id.includes('coord-') 
        ? node.id.split('-').slice(2).join('-')
        : node.id;
      // Limpiar rol y status, aplicar solo coordinación
      setFilters(prev => ({ 
        ...prev, 
        role: 'all',
        coordinacion_id: coordId,
        status: 'all'
      }));
    }
  }, [setFilters]);

  // Clic en usuario del árbol -> abrir panel de edición embebido
  const handleSelectUserFromTree = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setEditingUser(user);
    }
  }, [users]);

  // Doble clic en tabla -> abrir panel de edición embebido
  const handleEditUser = useCallback((user: UserV2) => {
    setEditingUser(user);
  }, []);

  // Cerrar panel de edición
  const handleCloseEditPanel = useCallback(() => {
    setEditingUser(null);
  }, []);

  const handleCreateUser = useCallback(() => {
    setSelectedUser(null);
    setShowCreateModal(true);
  }, []);

  const handleViewUser = useCallback((user: UserV2) => {
    // Abrir en panel embebido
    setEditingUser(user);
  }, []);

  const handleManagePermissions = useCallback((user: UserV2) => {
    setSelectedUser(user);
    setShowPermissionsModal(true);
  }, []);

  // ============================================
  // FILTERED USERS BY SELECTED NODE
  // ============================================

  const displayedUsers = useMemo(() => {
    // paginatedUsers ya tiene los filtros aplicados desde el hook
    return paginatedUsers;
  }, [paginatedUsers]);

  // ============================================
  // RENDER
  // ============================================

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Acceso Restringido
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            No tienes permisos para acceder a esta sección
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Sidebar - Colapsable y responsivo - Más compacto */}
      <AnimatePresence mode="wait">
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isLargeScreen ? 220 : 200, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onMouseEnter={() => setIsSidebarHovered(true)}
            onMouseLeave={() => setIsSidebarHovered(false)}
            className="flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
          >
            <TreeViewSidebar
              tree={hierarchyTree}
              coordinaciones={coordinaciones}
              stats={stats}
              selectedNodeId={selectedNode?.id || null}
              onSelectNode={handleNodeSelect}
              onSelectUserFromTree={handleSelectUserFromTree}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              currentStatusFilter={filters.status}
              onStatusFilterChange={(status) => {
                setEditingUser(null); // Cerrar panel al cambiar filtro
                setSelectedNode(null); // Limpiar selección de nodo
                setFilters(prev => ({ ...prev, status: status as typeof prev.status, role: 'all', coordinacion_id: 'all', group_id: 'all' }));
              }}
              // Grupos de permisos
              groups={groups}
              selectedGroupId={filters.group_id !== 'all' ? filters.group_id : null}
              onSelectGroup={(groupId) => {
                setEditingUser(null);
                setSelectedNode(null);
                setFilters(prev => ({ 
                  ...prev, 
                  group_id: groupId || 'all',
                  role: 'all',
                  coordinacion_id: 'all',
                  status: 'all'
                }));
              }}
              onManageGroups={() => setShowGroupManagement(true)}
              canManageGroups={canManageGroups}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-white dark:bg-gray-900">
        {/* Ultra Compact Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 min-w-0">
            {/* Toggle Sidebar Button */}
            <button
              onClick={toggleSidebar}
              className={`p-1 rounded transition-colors flex-shrink-0 ${
                showSidebar 
                  ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title={showSidebar ? 'Ocultar directorio' : 'Mostrar directorio'}
            >
              {showSidebar ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeft className="w-3.5 h-3.5" />}
            </button>

            <div className="flex items-center gap-1.5 min-w-0">
              <Users className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                Gestión de Usuarios
              </h1>
              {selectedNode && (
                <span className="hidden md:inline text-[11px] font-normal text-gray-500 dark:text-gray-400 truncate">
                  • {selectedNode.name}
                </span>
              )}
            </div>
          </div>

          {/* Compact Stats - inline */}
          <div className="flex items-center gap-2 text-[11px] flex-shrink-0">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="font-medium text-gray-900 dark:text-white">{stats.active}</span>
              <span className="text-gray-500 hidden sm:inline">activos</span>
            </span>
            <span className="text-gray-300 dark:text-gray-700">•</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="font-medium text-gray-900 dark:text-white">{stats.total}</span>
              <span className="text-gray-500 hidden sm:inline">total</span>
            </span>
            {stats.blocked > 0 && (
              <>
                <span className="text-gray-300 dark:text-gray-700 hidden sm:inline">•</span>
                <span className="flex items-center gap-0.5 text-red-500">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="font-medium">{stats.blocked}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Compact Filter Bar */}
        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <FilterBar
            filters={filters}
            onFiltersChange={setFilters}
            sortConfig={sortConfig}
            onSortChange={setSortConfig}
            coordinaciones={coordinaciones}
            onRefresh={refreshUsers}
            onCreateUser={handleCreateUser}
            loading={loading}
            totalResults={filteredUsers.length}
            canCreate={canCreate}
          />
        </div>

        {/* Content Area - Muestra lista, panel de edición, o gestión de grupos */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {showGroupManagement ? (
              /* Panel de gestión de grupos - Ocupa toda el área de trabajo */
              <motion.div
                key="group-management"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full min-h-0 bg-white dark:bg-gray-900 overflow-hidden flex flex-col"
              >
                <GroupManagementPanel
                  onClose={() => {
                    setShowGroupManagement(false);
                    refreshGroups();
                  }}
                />
              </motion.div>
            ) : editingUser ? (
              /* Panel de edición - Ocupa toda el área de trabajo */
              <motion.div
                key="edit-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full min-h-0 bg-white dark:bg-gray-900 overflow-hidden flex flex-col"
              >
                <UserEditPanel
                  user={editingUser}
                  roles={roles}
                  coordinaciones={coordinaciones}
                  currentUserRole={currentUser?.role_name || ''}
                  currentUserId={currentUser?.id}
                  onClose={handleCloseEditPanel}
                  onSave={async (userId, updates, currentUserId) => {
                    const success = await updateUserStatus(userId, updates, currentUserId);
                    if (success) {
                      setEditingUser(prev => prev ? { ...prev, ...updates } : null);
                    }
                    return success;
                  }}
                  onUnblock={unblockUser}
                  onRefresh={refreshUsers}
                />
              </motion.div>
            ) : (
              /* Lista/Grid de usuarios */
              <motion.div
                key="user-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full overflow-hidden"
              >
                {error ? (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center m-4">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-red-900 dark:text-red-200 mb-2">
                      Error al cargar usuarios
                    </h3>
                    <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                    <button
                      onClick={refreshUsers}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reintentar
                    </button>
                  </div>
                ) : viewMode === 'list' ? (
                  <UserTable
                    users={displayedUsers}
                    sortConfig={sortConfig}
                    onSortChange={setSortConfig}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    totalResults={filteredUsers.length}
                    onEditUser={handleEditUser}
                    onManagePermissions={handleManagePermissions}
                    onViewUser={handleViewUser}
                    onUnblockUser={unblockUser}
                    loading={loading}
                  />
                ) : viewMode === 'grid' ? (
                  <UserGridView
                    users={displayedUsers}
                    onEditUser={handleEditUser}
                    loading={loading}
                  />
                ) : (
                  <UserHierarchyView
                    tree={hierarchyTree}
                    onSelectUser={handleViewUser}
                    loading={loading}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modal de creación de usuario */}
      <UserCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        roles={roles}
        coordinaciones={coordinaciones}
        currentUserRole={currentUser?.role_name || ''}
        currentUserId={currentUser?.id}
        onSuccess={refreshUsers}
      />

    </div>
  );
};

// ============================================
// GRID VIEW COMPONENT
// ============================================

const UserGridView: React.FC<{
  users: UserV2[];
  onEditUser: (user: UserV2) => void;
  loading: boolean;
}> = ({ users, onEditUser, loading }) => {
  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-3 overflow-auto h-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
        {users.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: Math.min(index * 0.02, 0.2) }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 hover:shadow-md transition-all cursor-pointer group"
            onClick={() => onEditUser(user)}
          >
            {/* Avatar + Info compacto */}
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-shrink-0">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                    {user.first_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className={`
                  absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800
                  ${user.is_active ? 'bg-emerald-500' : 'bg-gray-400'}
                `} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-medium text-gray-900 dark:text-white truncate">
                  {user.full_name}
                </h3>
                <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
              </div>
            </div>

            {/* Role Badge */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {user.role_display_name}
              </span>
              {user.is_operativo && (
                <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  Op
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// HIERARCHY VIEW COMPONENT
// ============================================

const UserHierarchyView: React.FC<{
  tree: TreeNode[];
  onSelectUser: (user: UserV2) => void;
  loading: boolean;
}> = ({ tree, onSelectUser, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const renderNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    return (
      <div key={node.id} style={{ marginLeft: `${depth * 16}px` }} className="mb-1">
        <div className={`
          flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors
          ${node.type === 'user' 
            ? 'hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer' 
            : 'bg-gray-50 dark:bg-gray-800/50'
          }
        `}
        onClick={() => {
          if (node.type === 'user' && node.metadata?.user) {
            onSelectUser(node.metadata.user as UserV2);
          }
        }}
        >
          {node.type === 'role' && (
            <div className={`w-5 h-5 rounded bg-gradient-to-br ${node.color} flex items-center justify-center`}>
              <Shield className="w-3 h-3 text-white" />
            </div>
          )}
          {node.type === 'coordinacion' && (
            <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <Settings className="w-3 h-3 text-gray-600 dark:text-gray-400" />
            </div>
          )}
          {node.type === 'user' && (
            <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <Users className="w-2.5 h-2.5 text-gray-500" />
            </div>
          )}
          
          <span className={`text-xs ${node.type === 'user' ? 'text-gray-700 dark:text-gray-300' : 'font-medium text-gray-900 dark:text-white'}`}>
            {node.name}
          </span>
          
          {node.count !== undefined && (
            <span className="text-[10px] text-gray-500 ml-auto">({node.count})</span>
          )}
        </div>
        
        {node.children?.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="p-3 overflow-auto h-full">
      {tree.map(node => renderNode(node))}
    </div>
  );
};

export default UserManagementV2;

