/**
 * ============================================
 * TYPES - USER MANAGEMENT V2
 * ============================================
 * Tipos e interfaces para el módulo de gestión de usuarios enterprise
 */

// Re-export Coordinacion type from service
export type { Coordinacion } from '../../../services/coordinacionService';

// ============================================
// USER TYPES
// ============================================

export interface UserV2 {
  id: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  phone?: string;
  department?: string;
  position?: string;
  organization: string;
  role_name: RoleName;
  role_display_name: string;
  role_id: string;
  is_active: boolean;
  is_operativo?: boolean;
  inbound?: boolean; // Usuario recibe mensajes inbound de WhatsApp
  archivado?: boolean;
  email_verified: boolean;
  last_login?: string;
  created_at: string;
  avatar_url?: string;
  is_blocked?: boolean;
  warning_count?: number;
  system_ui_user_id?: string;
  coordinacion_id?: string;
  coordinaciones_ids?: string[];
  id_dynamics?: string;
  // Campos adicionales para la jerarquía
  coordinacion_nombre?: string;
  coordinacion_codigo?: string;
  // Para coordinadores: nombres de sus múltiples coordinaciones
  coordinaciones_nombres?: string[];
}

export type RoleName = 
  | 'admin'
  | 'administrador_operativo'
  | 'coordinador'
  | 'supervisor'
  | 'ejecutivo'
  | 'evaluador'
  | 'developer';

export interface Role {
  id: string;
  name: RoleName;
  display_name: string;
  description: string;
  level: number; // 1 = admin, 2 = admin_op, 3 = coordinador, 4 = ejecutivo
  icon: string;
  color: string;
}

// ============================================
// HIERARCHY TYPES
// ============================================

export interface TreeNode {
  id: string;
  type: 'role' | 'coordinacion' | 'user';
  name: string;
  code?: string;
  icon?: string;
  color?: string;
  count?: number;
  children?: TreeNode[];
  isExpanded?: boolean;
  isActive?: boolean;
  level: number;
  parent_id?: string;
  metadata?: Record<string, unknown>;
}

export interface CoordinacionNode extends TreeNode {
  type: 'coordinacion';
  coordinadores: UserV2[];
  ejecutivos: UserV2[];
}

export interface RoleNode extends TreeNode {
  type: 'role';
  role: Role;
  users: UserV2[];
}

// ============================================
// FILTER TYPES
// ============================================

export interface UserFilters {
  search: string;
  role: RoleName | 'all';
  status: 'all' | 'active' | 'inactive' | 'blocked' | 'blocked_password' | 'archived' | 'operativo' | 'no_operativo' | 'online';
  operativo: 'all' | 'operativo' | 'no_operativo';
  coordinacion_id: string | 'all';
  group_id: string | 'all'; // Filtro por grupo de permisos
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface SortConfig {
  column: 'name' | 'role' | 'department' | 'last_login' | 'created_at' | 'status' | 'operativo';
  direction: 'asc' | 'desc';
}

// ============================================
// PERMISSION TYPES
// ============================================

export interface Permission {
  id: string;
  name: string;
  module: string;
  sub_module?: string;
  description: string;
}

export interface UserPermission {
  user_id: string;
  permission_name: string;
  module: string;
  sub_module?: string;
  granted_at?: string;
  granted_by?: string;
}

export interface SecurityGroup {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  users_count: number;
  color: string;
}

// ============================================
// VIEW STATE TYPES
// ============================================

export type ViewMode = 'list' | 'grid' | 'hierarchy';
export type SidebarSection = 'roles' | 'coordinaciones' | 'grupos' | 'all';

export interface ViewState {
  mode: ViewMode;
  selectedNode: TreeNode | null;
  expandedNodes: Set<string>;
  sidebarSection: SidebarSection;
}

// ============================================
// ACTION TYPES
// ============================================

export type UserAction = 
  | 'create'
  | 'edit'
  | 'delete'
  | 'archive'
  | 'unarchive'
  | 'block'
  | 'unblock'
  | 'toggle_operativo'
  | 'manage_permissions';

export interface BulkAction {
  action: UserAction;
  userIds: string[];
  metadata?: Record<string, unknown>;
}

// ============================================
// CONSTANTS
// ============================================

export const ROLE_HIERARCHY: Role[] = [
  {
    id: 'admin',
    name: 'admin',
    display_name: 'Administrador',
    description: 'Acceso completo al sistema',
    level: 1,
    icon: 'Shield',
    color: 'from-red-500 to-rose-600'
  },
  {
    id: 'administrador_operativo',
    name: 'administrador_operativo',
    display_name: 'Admin Operativo',
    description: 'Gestión operativa del sistema',
    level: 2,
    icon: 'Settings',
    color: 'from-purple-500 to-violet-600'
  },
  {
    id: 'coordinador',
    name: 'coordinador',
    display_name: 'Coordinador',
    description: 'Coordinación de equipos',
    level: 3,
    icon: 'Users',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'ejecutivo',
    name: 'ejecutivo',
    display_name: 'Ejecutivo',
    description: 'Ejecución de operaciones',
    level: 4,
    icon: 'Briefcase',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'evaluador',
    name: 'evaluador',
    display_name: 'Evaluador',
    description: 'Evaluación de calidad',
    level: 4,
    icon: 'ClipboardCheck',
    color: 'from-amber-500 to-orange-600'
  },
  {
    id: 'developer',
    name: 'developer',
    display_name: 'Desarrollador',
    description: 'Acceso técnico',
    level: 2,
    icon: 'Code',
    color: 'from-gray-600 to-gray-700'
  }
];

export const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados', color: 'gray' },
  { value: 'online', label: '🟢 Activo Ahora', color: 'emerald' },
  { value: 'active', label: 'Activos', color: 'emerald' },
  { value: 'inactive', label: 'Inactivos', color: 'gray' },
  { value: 'blocked', label: 'Bloqueados (Moderación)', color: 'red' },
  { value: 'blocked_password', label: 'Bloqueados (Contraseña)', color: 'orange' },
  { value: 'archived', label: 'Archivados', color: 'amber' }
] as const;

export const OPERATIVO_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'operativo', label: 'Operativos' },
  { value: 'no_operativo', label: 'No operativos' }
] as const;

