/**
 * ============================================
 * USER TABLE COMPONENT
 * ============================================
 * Tabla optimizada de usuarios con paginación y acciones inline
 */

import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Mail,
  Phone,
  Building2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Lock,
  LockOpen,
  Shield
} from 'lucide-react';
import type { UserV2, SortConfig } from '../types';

// ============================================
// TYPES
// ============================================

interface UserTableProps {
  users: UserV2[];
  sortConfig: SortConfig;
  onSortChange: (sort: SortConfig) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (count: number) => void;
  totalResults: number;
  onEditUser: (user: UserV2) => void;
  onManagePermissions: (user: UserV2) => void;
  onViewUser: (user: UserV2) => void;
  onUnblockUser?: (user: UserV2) => Promise<boolean>;
  loading: boolean;
}

// ============================================
// HELPER COMPONENTS
// ============================================

const StatusBadge: React.FC<{ user: UserV2 }> = ({ user }) => {
  if (user.is_blocked) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
        <AlertTriangle className="w-3 h-3" />
        Bloqueado
      </span>
    );
  }
  if (user.archivado) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
        Archivado
      </span>
    );
  }
  if (!user.is_active) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
        <XCircle className="w-3 h-3" />
        Inactivo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
      <CheckCircle className="w-3 h-3" />
      Activo
    </span>
  );
};

const RoleBadge: React.FC<{ role: string; displayName: string }> = ({ role, displayName }) => {
  const colors: Record<string, string> = {
    admin: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    administrador_operativo: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    coordinador: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    supervisor: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
    ejecutivo: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    evaluator: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    developer: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    direccion: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
    productor: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${colors[role] || colors.developer}`}>
      {displayName}
    </span>
  );
};

const SortButton: React.FC<{
  column: SortConfig['column'];
  currentSort: SortConfig;
  onSort: (sort: SortConfig) => void;
  children: React.ReactNode;
}> = ({ column, currentSort, onSort, children }) => {
  const isActive = currentSort.column === column;
  
  const handleClick = () => {
    if (isActive) {
      onSort({
        column,
        direction: currentSort.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      onSort({ column, direction: 'asc' });
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors
        ${isActive 
          ? 'text-blue-600 dark:text-blue-400' 
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }
      `}
    >
      {children}
      {isActive ? (
        currentSort.direction === 'asc' 
          ? <ChevronUp className="w-3 h-3" />
          : <ChevronDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-50" />
      )}
    </button>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const UserTable: React.FC<UserTableProps> = ({
  users,
  sortConfig,
  onSortChange,
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalResults,
  onEditUser,
  onManagePermissions,
  onViewUser,
  onUnblockUser,
  loading
}) => {
  // Estado para animación de desbloqueo
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);
  const [unlockedUserId, setUnlockedUserId] = useState<string | null>(null);

  // Handler para desbloquear usuario con animación
  const handleUnblock = useCallback(async (user: UserV2, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUnblockUser || unblockingUserId) return;
    
    setUnblockingUserId(user.id);
    
    try {
      const success = await onUnblockUser(user);
      if (success) {
        // Mostrar animación de éxito
        setUnlockedUserId(user.id);
        // Limpiar después de la animación
        setTimeout(() => {
          setUnlockedUserId(null);
          setUnblockingUserId(null);
        }, 1500);
      } else {
        setUnblockingUserId(null);
      }
    } catch {
      setUnblockingUserId(null);
    }
  }, [onUnblockUser, unblockingUserId]);

  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  // Pagination info
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalResults);

  if (loading && users.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-16 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Cargando usuarios...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-16 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No se encontraron usuarios
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Intenta ajustar los filtros de búsqueda
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left">
                <SortButton column="name" currentSort={sortConfig} onSort={onSortChange}>
                  Usuario
                </SortButton>
              </th>
              <th className="px-3 py-2 text-left">
                <SortButton column="role" currentSort={sortConfig} onSort={onSortChange}>
                  Rol
                </SortButton>
              </th>
              <th className="px-3 py-2 text-left hidden lg:table-cell">
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  Coordinación
                </span>
              </th>
              <th className="px-3 py-2 text-left hidden md:table-cell">
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
                </span>
              </th>
              <th className="px-3 py-2 text-left hidden md:table-cell">
                <SortButton column="status" currentSort={sortConfig} onSort={onSortChange}>
                  Estado
                </SortButton>
              </th>
              <th className="px-3 py-2 text-left hidden xl:table-cell">
                <SortButton column="last_login" currentSort={sortConfig} onSort={onSortChange}>
                  Último Acceso
                </SortButton>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {users.map((user, index) => {
              const isUnblocking = unblockingUserId === user.id;
              const isUnlocked = unlockedUserId === user.id;
              const showBlockedState = user.is_blocked && !isUnlocked;
              
              return (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(index * 0.01, 0.2) }}
                className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
                onClick={() => onEditUser(user)}
                title="Clic para editar"
              >
                {/* User Info - Más compacto */}
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {/* Avatar con candado para bloqueados */}
                    <div className="relative flex-shrink-0">
                      <AnimatePresence mode="wait">
                        {showBlockedState ? (
                          // Avatar bloqueado con candado
                          <motion.button
                            key="blocked"
                            initial={{ scale: 1 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onClick={(e) => handleUnblock(user, e)}
                            disabled={isUnblocking}
                            className={`
                              w-9 h-9 rounded-full flex items-center justify-center 
                              bg-gradient-to-br from-red-500 to-red-600 
                              ring-2 ring-red-400/50 hover:ring-red-500 hover:ring-4
                              transition-all cursor-pointer shadow-lg shadow-red-500/25
                              ${isUnblocking ? 'animate-pulse' : ''}
                            `}
                            title="Click para desbloquear usuario"
                          >
                            <Lock className="w-4 h-4 text-white" />
                          </motion.button>
                        ) : isUnlocked ? (
                          // Animación de desbloqueo exitoso
                          <motion.div
                            key="unlocked"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/25"
                          >
                            <motion.div
                              initial={{ rotate: -20 }}
                              animate={{ rotate: 0 }}
                              transition={{ type: "spring", stiffness: 300 }}
                            >
                              <LockOpen className="w-4 h-4 text-white" />
                            </motion.div>
                          </motion.div>
                        ) : (
                          // Avatar normal
                          <motion.div
                            key="normal"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative"
                          >
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.full_name}
                                className="w-9 h-9 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm">
                                {user.first_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            {/* Status indicator dot */}
                            <div className={`
                              absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900
                              ${user.is_active ? 'bg-emerald-500' : 'bg-gray-400'}
                            `} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Name & Email */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                          {user.full_name || `${user.first_name} ${user.last_name}`}
                        </span>
                        {showBlockedState && (
                          <span className="text-[9px] font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1 py-0.5 rounded">
                            3 strikes
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Mail className="w-2.5 h-2.5 text-gray-400" />
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td className="px-3 py-2">
                  <RoleBadge role={user.role_name} displayName={user.role_display_name} />
                </td>

                {/* Coordinación */}
                <td className="px-3 py-2 hidden lg:table-cell">
                  {/* Para ejecutivos: mostrar una sola coordinación */}
                  {user.coordinacion_nombre ? (
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
                        {user.coordinacion_nombre}
                      </span>
                      {user.coordinacion_codigo && (
                        <span className="text-[9px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-1 rounded">
                          {user.coordinacion_codigo}
                        </span>
                      )}
                    </div>
                  ) : user.coordinaciones_nombres && user.coordinaciones_nombres.length > 0 ? (
                    /* Para coordinadores: mostrar múltiples coordinaciones */
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-blue-400" />
                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[150px]" title={user.coordinaciones_nombres.join(', ')}>
                        {user.coordinaciones_nombres.length === 1 
                          ? user.coordinaciones_nombres[0]
                          : `${user.coordinaciones_nombres[0]} +${user.coordinaciones_nombres.length - 1}`
                        }
                      </span>
                      {user.coordinaciones_nombres.length > 1 && (
                        <span className="text-[9px] font-mono text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-1 rounded">
                          {user.coordinaciones_nombres.length}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>

                {/* Teléfono */}
                <td className="px-3 py-2 hidden md:table-cell">
                  {user.phone ? (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                        {user.phone}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-3 py-2 hidden md:table-cell">
                  <StatusBadge user={user} />
                </td>

                {/* Last Login */}
                <td className="px-3 py-2 hidden xl:table-cell">
                  {/* Último acceso + indicador "Activo ahora" si aplica */}
                  {user.last_login ? (
                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                      {user.is_operativo && user.is_active ? (
                        <>
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">En línea</span>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                        </>
                      ) : (
                        <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                      )}
                      <span>{formatDate(user.last_login)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Nunca</span>
                  )}
                </td>
              </motion.tr>
            );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination - Más compacta */}
      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-white">{startItem}</span>-<span className="font-medium text-gray-900 dark:text-white">{endItem}</span>/<span className="font-medium text-gray-900 dark:text-white">{totalResults}</span>
          </span>
          
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="px-1.5 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          
          <div className="flex items-center gap-0.5">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`
                    w-6 h-6 text-xs rounded transition-colors
                    ${currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800'
                    }
                  `}
                >
                  {page}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserTable;

