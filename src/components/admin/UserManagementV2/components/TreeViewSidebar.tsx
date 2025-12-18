/**
 * ============================================
 * TREE VIEW SIDEBAR - Active Directory Style
 * ============================================
 * Sidebar jerárquico con navegación por roles y coordinaciones
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  Shield,
  Settings,
  Users,
  Briefcase,
  ClipboardCheck,
  Code,
  Building2,
  User,
  Search,
  Folder,
  FolderOpen,
  LayoutGrid,
  List,
  Network,
  AlertTriangle,
  Lock,
  Archive,
  CheckCircle,
  XCircle
} from 'lucide-react';
import type { TreeNode, RoleName, ViewMode, Coordinacion } from '../types';

// ============================================
// ICON MAP
// ============================================

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  Settings,
  Users,
  Briefcase,
  ClipboardCheck,
  Code,
  Building2,
  User
};

// ============================================
// TYPES
// ============================================

interface TreeViewSidebarProps {
  tree: TreeNode[];
  coordinaciones: Coordinacion[];
  stats: {
    total: number;
    active: number;
    inactive: number;
    blocked: number;
    archived: number;
    byRole: Record<RoleName, number>;
  };
  selectedNodeId: string | null;
  onSelectNode: (node: TreeNode | null) => void;
  onSelectUserFromTree?: (userId: string) => void; // Clic en usuario del árbol
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  currentStatusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
}

interface TreeNodeItemProps {
  node: TreeNode;
  selectedNodeId: string | null;
  onSelectNode: (node: TreeNode) => void;
  onSelectUserFromTree?: (userId: string) => void;
  expandedNodes: Set<string>;
  toggleExpanded: (nodeId: string) => void;
  depth?: number;
}

// ============================================
// TREE NODE ITEM COMPONENT
// ============================================

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  selectedNodeId,
  onSelectNode,
  onSelectUserFromTree,
  expandedNodes,
  toggleExpanded,
  depth = 0
}) => {
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNodeId === node.id;
  const hasChildren = node.children && node.children.length > 0;
  
  // Get icon component
  const IconComponent = node.icon ? ICON_MAP[node.icon] : null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Si es un nodo de usuario, abrir el panel de edición
    if (node.type === 'user' && onSelectUserFromTree) {
      onSelectUserFromTree(node.id);
      return;
    }
    
    // Para otros nodos, expandir si tiene hijos y seleccionar
    if (hasChildren) {
      toggleExpanded(node.id);
    }
    onSelectNode(node);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleExpanded(node.id);
  };

  return (
    <div>
      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        className={`
          group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-all duration-200
          ${isSelected 
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
          }
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/Collapse Arrow */}
        {hasChildren ? (
          <button
            onClick={handleExpandClick}
            className="w-3.5 h-3.5 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        ) : (
          <span className="w-3.5" />
        )}

        {/* Icon */}
        {node.type === 'role' && IconComponent && (
          <div className={`w-5 h-5 rounded bg-gradient-to-br ${node.color} flex items-center justify-center`}>
            <IconComponent className="w-3 h-3 text-white" />
          </div>
        )}
        {node.type === 'coordinacion' && (
          <div className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            {isExpanded ? (
              <FolderOpen className="w-3 h-3 text-slate-500" />
            ) : (
              <Folder className="w-3 h-3 text-slate-500" />
            )}
          </div>
        )}
        {node.type === 'user' && (
          <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <User className="w-2.5 h-2.5 text-gray-500" />
          </div>
        )}

        {/* Name */}
        <span className={`flex-1 text-xs truncate ${isSelected ? 'font-medium' : ''}`}>
          {node.name}
        </span>

        {/* Code badge for coordinaciones - solo si hay espacio */}
        {node.code && (
          <span className="hidden xl:inline text-[9px] font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
            {node.code}
          </span>
        )}

        {/* Count badge */}
        {node.count !== undefined && node.count > 0 && (
          <span className={`
            text-[10px] px-1 py-0.5 rounded-full
            ${isSelected 
              ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }
          `}>
            {node.count}
          </span>
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence initial={false}>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {node.children!.map(child => (
              <TreeNodeItem
                key={child.id}
                node={child}
                selectedNodeId={selectedNodeId}
                onSelectNode={onSelectNode}
                onSelectUserFromTree={onSelectUserFromTree}
                expandedNodes={expandedNodes}
                toggleExpanded={toggleExpanded}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const TreeViewSidebar: React.FC<TreeViewSidebarProps> = ({
  tree,
  coordinaciones,
  stats,
  selectedNodeId,
  onSelectNode,
  onSelectUserFromTree,
  viewMode,
  onViewModeChange,
  currentStatusFilter = 'all',
  onStatusFilterChange
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const toggleExpanded = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  // Filter tree based on search
  const filteredTree = useMemo(() => {
    if (!searchTerm) return tree;
    
    const search = searchTerm.toLowerCase();
    
    const filterNode = (node: TreeNode): TreeNode | null => {
      // Check if current node matches
      const matches = node.name.toLowerCase().includes(search) ||
                     (node.code && node.code.toLowerCase().includes(search));
      
      // Filter children recursively
      const filteredChildren = node.children
        ?.map(filterNode)
        .filter((n): n is TreeNode => n !== null);
      
      // Include node if it matches or has matching children
      if (matches || (filteredChildren && filteredChildren.length > 0)) {
        return {
          ...node,
          children: filteredChildren || []
        };
      }
      
      return null;
    };
    
    return tree.map(filterNode).filter((n): n is TreeNode => n !== null);
  }, [tree, searchTerm]);

  // Build coordinaciones tree
  const coordinacionesTree = useMemo((): TreeNode[] => {
    return coordinaciones.map(coord => ({
      id: coord.id,
      type: 'coordinacion' as const,
      name: coord.nombre,
      code: coord.codigo,
      level: 0,
      count: 0 // TODO: count users
    }));
  }, [coordinaciones]);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Compact Header */}
      <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-900 dark:text-white">
            Directorio
          </h3>
          
          {/* View Mode Toggle - más compacto */}
          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title="Vista de lista"
            >
              <List className="w-3 h-3" />
            </button>
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title="Vista de cuadrícula"
            >
              <LayoutGrid className="w-3 h-3" />
            </button>
            <button
              onClick={() => onViewModeChange('hierarchy')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'hierarchy' 
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title="Vista jerárquica"
            >
              <Network className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Compact Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Sin tabs - siempre muestra vista "all" */}

      {/* Tree Content - más compacto, scrollbar invisible */}
      <div className="flex-1 overflow-y-auto py-1.5 scrollbar-hide">
        {/* "All Users" option */}
        <motion.div
          className={`
            group flex items-center gap-1.5 px-3 py-1.5 mx-1.5 rounded-md cursor-pointer transition-all duration-200
            ${selectedNodeId === null 
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' 
              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400'
            }
          `}
          onClick={handleClearSelection}
        >
          <Users className="w-3.5 h-3.5" />
          <span className="text-xs">Todos los usuarios</span>
          <span className="ml-auto text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full">
            {stats.total}
          </span>
        </motion.div>

        <div className="h-px bg-gray-100 dark:bg-gray-800 my-1.5 mx-3" />

        {/* Tree Nodes - Vista unificada con roles y coordinaciones */}
        <div className="px-2">
          {/* Roles */}
          <div className="mb-2">
            <span className="px-2 text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
              Roles
            </span>
            {filteredTree.map(node => (
              <TreeNodeItem
                key={node.id}
                node={node}
                selectedNodeId={selectedNodeId}
                onSelectNode={onSelectNode}
                onSelectUserFromTree={onSelectUserFromTree}
                expandedNodes={expandedNodes}
                toggleExpanded={toggleExpanded}
              />
            ))}
          </div>
          {/* Coordinaciones */}
          <div className="mb-2">
            <span className="px-2 text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
              Coordinaciones
            </span>
            {coordinacionesTree.map(node => (
              <TreeNodeItem
                key={node.id}
                node={node}
                selectedNodeId={selectedNodeId}
                onSelectNode={onSelectNode}
                onSelectUserFromTree={onSelectUserFromTree}
                expandedNodes={expandedNodes}
                toggleExpanded={toggleExpanded}
              />
            ))}
          </div>

          {/* Filtros rápidos de estado */}
          {onStatusFilterChange && (
            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="px-2 text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
                Filtros Especiales
              </span>
              
              {/* Bloqueados por Moderación */}
              <button
                onClick={() => onStatusFilterChange(currentStatusFilter === 'blocked' ? 'all' : 'blocked')}
                className={`
                  w-full flex items-center gap-1.5 px-2 py-1.5 mt-1 rounded-md transition-colors text-left
                  ${currentStatusFilter === 'blocked'
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                <div className="w-5 h-5 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                </div>
                <span className="text-xs flex-1">Bloqueados (Moderación)</span>
                {stats.blocked > 0 && (
                  <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                    {stats.blocked}
                  </span>
                )}
              </button>

              {/* Bloqueados por Contraseña */}
              <button
                onClick={() => onStatusFilterChange(currentStatusFilter === 'blocked_password' ? 'all' : 'blocked_password')}
                className={`
                  w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors text-left
                  ${currentStatusFilter === 'blocked_password'
                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                <div className="w-5 h-5 rounded bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Lock className="w-3 h-3 text-orange-500" />
                </div>
                <span className="text-xs flex-1">Bloqueados (Contraseña)</span>
              </button>

              {/* Archivados */}
              <button
                onClick={() => onStatusFilterChange(currentStatusFilter === 'archived' ? 'all' : 'archived')}
                className={`
                  w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors text-left
                  ${currentStatusFilter === 'archived'
                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                <div className="w-5 h-5 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Archive className="w-3 h-3 text-amber-500" />
                </div>
                <span className="text-xs flex-1">Archivados</span>
                {stats.archived > 0 && (
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                    {stats.archived}
                  </span>
                )}
              </button>

              {/* Separador - Operativos */}
              <div className="my-2 border-t border-gray-100 dark:border-gray-800"></div>

              {/* Operativo */}
              <button
                onClick={() => onStatusFilterChange(currentStatusFilter === 'operativo' ? 'all' : 'operativo')}
                className={`
                  w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors text-left
                  ${currentStatusFilter === 'operativo'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                <div className="w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                </div>
                <span className="text-xs flex-1">Operativo</span>
              </button>

              {/* No Operativo */}
              <button
                onClick={() => onStatusFilterChange(currentStatusFilter === 'no_operativo' ? 'all' : 'no_operativo')}
                className={`
                  w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors text-left
                  ${currentStatusFilter === 'no_operativo'
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <XCircle className="w-3 h-3 text-gray-500" />
                </div>
                <span className="text-xs flex-1">No Operativo</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Stats - más compacto */}
      <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="flex items-center justify-between text-center gap-1">
          <div className="flex-1">
            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {stats.active}
            </div>
            <div className="text-[9px] text-gray-500">Activos</div>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              {stats.inactive}
            </div>
            <div className="text-[9px] text-gray-500">Inactivos</div>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-red-500 dark:text-red-400">
              {stats.blocked}
            </div>
            <div className="text-[9px] text-gray-500">Bloqueados</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreeViewSidebar;

