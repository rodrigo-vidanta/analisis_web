/**
 * ============================================
 * USER EDIT PANEL - Panel de edición embebido
 * ============================================
 * Panel completo de edición de usuario que se embebe en el área de trabajo.
 * Incluye todas las funcionalidades del modal original.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  Mail,
  Phone,
  Building2,
  User,
  Lock,
  LockOpen,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Pencil,
  Key,
  Archive,
  ShieldAlert,
  Eye,
  EyeOff,
  Shield,
  Users,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { UserV2, Role, Coordinacion } from '../types';
import { supabaseSystemUI } from '../../../../config/supabaseSystemUI';
import { groupsService, type PermissionGroup } from '../../../../services/groupsService';

// ============================================
// TYPES
// ============================================

interface UserEditPanelProps {
  user: UserV2;
  roles: Role[];
  coordinaciones: Coordinacion[];
  currentUserRole: string;
  currentUserId?: string;
  onClose: () => void;
  onSave: (userId: string, updates: Partial<UserV2> & { password?: string; coordinaciones_ids?: string[] }, currentUserId?: string) => Promise<boolean>;
  onUnblock: (user: UserV2) => Promise<boolean>;
  onRefresh: () => void;
}

interface FormData {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  phone: string;
  role_id: string;
  is_operativo: boolean;
  is_active: boolean;
  coordinacion_id: string;
  coordinaciones_ids: string[];
  analysis_sources: string[];
}

// ============================================
// INFRACTIONS GRID COMPONENT
// ============================================

interface InfractionEvent {
  id: string;
  type: 'block' | 'warning' | 'login_fail' | 'inactive' | 'archived' | 'session' | 'unblocked';
  description: string;
  date?: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
}

interface ModerationWarningRecord {
  id: string;
  input_text: string;
  warning_reason: string;
  warning_category: string;
  created_at: string;
}

const UserInfractionsGrid: React.FC<{ user: UserV2 }> = ({ user }) => {
  const [warnings, setWarnings] = useState<ModerationWarningRecord[]>([]);
  const [loadingWarnings, setLoadingWarnings] = useState(false);
  const [selectedWarningId, setSelectedWarningId] = useState<string | null>(null);

  // Cargar warnings reales de la BD por email del usuario
  useEffect(() => {
    const loadWarnings = async () => {
      if (!user.email) return;
      
      setLoadingWarnings(true);
      try {
        // Buscar por user_email ya que es el campo que se usa para registrar warnings
        const { data, error } = await supabaseSystemUI
          .from('content_moderation_warnings')
          .select('id, input_text, warning_reason, warning_category, created_at')
          .eq('user_email', user.email)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (!error && data) {
          setWarnings(data);
        }
      } catch {
        // Tabla no existe o error de conexión, ignorar silenciosamente
      } finally {
        setLoadingWarnings(false);
      }
    };
    
    loadWarnings();
  }, [user.email]);

  // Obtener warning completo por ID
  const getWarningById = (warningId: string): ModerationWarningRecord | undefined => {
    const id = warningId.replace('warning-', '');
    return warnings.find(w => w.id === id);
  };

  // Generar eventos basados en el estado actual del usuario + warnings reales
  const events = useMemo<InfractionEvent[]>(() => {
    const result: InfractionEvent[] = [];
    
    // Warnings reales de la BD (si existen)
    if (warnings.length > 0) {
      warnings.forEach((w, index) => {
        result.push({
          id: `warning-${w.id}`,
          type: 'warning',
          description: w.warning_reason || `Infracción: ${w.warning_category}`,
          date: w.created_at,
          severity: 'warning'
        });
      });
    }
    
    // Bloqueo por moderación (estado actual)
    if (user.is_blocked) {
      result.unshift({
        id: 'blocked',
        type: 'block',
        description: `Bloqueado por moderación${user.warning_count ? ` (${user.warning_count} infracciones)` : ''}`,
        severity: 'critical'
      });
    }
    
    // Usuario fue desbloqueado pero tiene historial de warnings
    if (!user.is_blocked && user.warning_count && user.warning_count > 0) {
      result.unshift({
        id: 'unblocked',
        type: 'unblocked',
        description: `Desbloqueado (${user.warning_count} infracción${user.warning_count > 1 ? 'es' : ''} previa${user.warning_count > 1 ? 's' : ''})`,
        severity: 'success'
      });
    }
    
    // Cuenta inactiva
    if (!user.is_active && !user.archivado) {
      result.push({
        id: 'inactive',
        type: 'inactive',
        description: 'Cuenta desactivada',
        severity: 'warning'
      });
    }
    
    // Cuenta archivada
    if (user.archivado) {
      result.push({
        id: 'archived',
        type: 'archived',
        description: 'Usuario archivado',
        severity: 'info'
      });
    }
    
    // Último login (si fue hace más de 30 días)
    if (user.last_login) {
      const lastLoginDate = new Date(user.last_login);
      const daysSinceLogin = Math.floor((Date.now() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLogin > 30) {
        result.push({
          id: 'session',
          type: 'session',
          description: `Sin actividad hace ${daysSinceLogin} días`,
          date: user.last_login,
          severity: 'info'
        });
      }
    } else if (!user.is_blocked && !user.warning_count) {
      // Solo mostrar "nunca ha iniciado sesión" si no hay otros eventos
      result.push({
        id: 'no_login',
        type: 'session',
        description: 'Nunca ha iniciado sesión',
        severity: 'info'
      });
    }
    
    return result.slice(0, 10); // Máximo 10 eventos
  }, [user, warnings]);

  // Configuración de iconos y colores por tipo
  const getEventStyle = (event: InfractionEvent) => {
    switch (event.type) {
      case 'block':
        return { icon: Lock, bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' };
      case 'warning':
        return { icon: AlertTriangle, bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' };
      case 'login_fail':
        return { icon: XCircle, bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' };
      case 'inactive':
        return { icon: XCircle, bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' };
      case 'archived':
        return { icon: Archive, bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700' };
      case 'session':
        return { icon: User, bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' };
      case 'unblocked':
        return { icon: LockOpen, bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' };
      default:
        return { icon: AlertTriangle, bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' };
    }
  };

  // Si está cargando, mostrar loading
  if (loadingWarnings) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-red-500 to-orange-500 rounded-full" />
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Historial
          </h4>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Cargando historial...</span>
        </div>
      </div>
    );
  }

  // Si no hay eventos, mostrar estado limpio
  if (events.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-red-500 to-orange-500 rounded-full" />
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Historial
          </h4>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span className="text-xs text-emerald-700 dark:text-emerald-300">Sin infracciones registradas</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-gradient-to-b from-red-500 to-orange-500 rounded-full" />
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          Historial
        </h4>
        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
          {events.length}
        </span>
      </div>
      
      {/* Grid minimalista con expansión */}
      <div className="space-y-2">
        {events.map((event) => {
          const style = getEventStyle(event);
          const IconComponent = style.icon;
          const isWarning = event.type === 'warning' && event.id.startsWith('warning-');
          const isExpanded = selectedWarningId === event.id;
          const warningDetails = isWarning ? getWarningById(event.id) : null;
          
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="overflow-hidden"
            >
              <div
                onClick={() => isWarning && setSelectedWarningId(isExpanded ? null : event.id)}
                className={`flex items-center gap-3 p-2.5 rounded-lg border ${style.border} ${style.bg} ${
                  isWarning ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
                }`}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                  <IconComponent className={`w-3.5 h-3.5 ${style.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${isExpanded ? '' : 'truncate'} ${style.text}`}>
                    {event.description}
                  </p>
                  {event.date && (
                    <p className="text-[10px] text-gray-500 dark:text-gray-500">
                      {new Date(event.date).toLocaleDateString('es-MX', { 
                        day: 'numeric', 
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
                {isWarning && (
                  <svg 
                    className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
              
              {/* Panel de detalles expandible */}
              <AnimatePresence>
                {isExpanded && warningDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-3">
                      {/* Mensaje del usuario */}
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Mensaje del usuario
                        </p>
                        <p className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 font-mono">
                          "{warningDetails.input_text}"
                        </p>
                      </div>
                      
                      {/* Razón del warning */}
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Razón de la infracción
                        </p>
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                          {warningDetails.warning_reason}
                        </p>
                      </div>
                      
                      {/* Categoría */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Categoría:
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                          {warningDetails.warning_category}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// COMPONENT
// ============================================

const UserEditPanel: React.FC<UserEditPanelProps> = ({
  user,
  roles,
  coordinaciones,
  currentUserRole,
  currentUserId,
  onClose,
  onSave,
  onUnblock,
  onRefresh
}) => {
  const isAdmin = currentUserRole === 'admin';
  const isAdminOperativo = currentUserRole === 'administrador_operativo';
  
  // States
  const [isSaving, setIsSaving] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para grupos de permisos
  const [availableGroups, setAvailableGroups] = useState<PermissionGroup[]>([]);
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<FormData>({
    email: user.email || '',
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    password: '',
    phone: user.phone || '',
    role_id: user.role_id || '',
    is_operativo: user.is_operativo !== false,
    is_active: user.is_active,
    coordinacion_id: user.coordinacion_id || '',
    coordinaciones_ids: user.coordinaciones_ids || [],
    analysis_sources: []
  });

  // Reset form when user changes
  useEffect(() => {
    setFormData({
      email: user.email || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      password: '',
      phone: user.phone || '',
      role_id: user.role_id || '',
      is_operativo: user.is_operativo !== false,
      is_active: user.is_active,
      coordinacion_id: user.coordinacion_id || '',
      coordinaciones_ids: user.coordinaciones_ids || [],
      analysis_sources: []
    });
    setIsEditingPassword(false);
    setError(null);
    
    // Cargar grupos de permisos
    const loadGroups = async () => {
      setLoadingGroups(true);
      try {
        const groups = await groupsService.getGroups(true);
        setAvailableGroups(groups);
        
        // Cargar grupos asignados al usuario
        const assignedGroups = await groupsService.getUserGroups(user.id);
        setUserGroups(assignedGroups.map(g => g.group_id));
      } catch {
        // Tablas de grupos no existen aún
        setAvailableGroups([]);
        setUserGroups([]);
      } finally {
        setLoadingGroups(false);
      }
    };
    loadGroups();
  }, [user]);

  // Get selected role
  const selectedRole = useMemo(() => 
    roles.find(r => r.id === formData.role_id),
    [roles, formData.role_id]
  );

  // Filter roles based on current user permissions
  // Admin Operativo puede asignar: coordinador, supervisor, ejecutivo
  const availableRoles = useMemo(() => 
    roles.filter(role => {
      if (isAdminOperativo) {
        return ['coordinador', 'supervisor', 'ejecutivo'].includes(role.name);
      }
      if (isAdmin) return true;
      return false;
    }),
    [roles, isAdmin, isAdminOperativo]
  );

  // Filtrar grupos según permisos del usuario actual
  // Admin Operativo solo puede asignar grupos de nivel administrador_operativo o inferior
  const filteredGroups = useMemo(() => {
    if (isAdmin) return availableGroups;
    if (isAdminOperativo) {
      // Admin Operativo puede asignar grupos: administrador_operativo, coordinador, supervisor, ejecutivo, evaluador
      const allowedBaseRoles = ['administrador_operativo', 'coordinador', 'supervisor', 'ejecutivo', 'evaluador', 'calidad'];
      return availableGroups.filter(g => 
        !g.base_role || allowedBaseRoles.includes(g.base_role)
      );
    }
    return [];
  }, [availableGroups, isAdmin, isAdminOperativo]);

  // Active coordinaciones
  const activeCoordinaciones = useMemo(() => 
    coordinaciones.filter(c => !c.archivado),
    [coordinaciones]
  );

  // ============================================
  // HANDLERS
  // ============================================

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      const updates: Partial<UserV2> & { password?: string; coordinaciones_ids?: string[] } = {
        email: formData.email.trim().toLowerCase(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        full_name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
        phone: formData.phone.trim() || null,
        role_id: formData.role_id,
        is_operativo: formData.is_operativo,
        is_active: formData.is_active,
      };

      // Agregar coordinación según el rol
      if (selectedRole?.name === 'ejecutivo') {
        updates.coordinacion_id = formData.coordinacion_id || undefined;
      } else if (selectedRole?.name === 'coordinador' || selectedRole?.name === 'supervisor') {
        updates.coordinaciones_ids = formData.coordinaciones_ids;
      }

      // Agregar password si se está editando (con validación de complejidad)
      if (isEditingPassword && formData.password) {
        // Validar complejidad de contraseña
        const pwd = formData.password;
        const isPasswordValid = 
          pwd.length >= 8 &&
          /[A-Z]/.test(pwd) &&
          /[a-z]/.test(pwd) &&
          /[0-9]/.test(pwd) &&
          /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);
        
        if (!isPasswordValid) {
          setError('La contraseña no cumple con los requisitos de seguridad');
          setIsSaving(false);
          return;
        }
        updates.password = formData.password;
      }

      const success = await onSave(user.id, updates, currentUserId);
      if (success) {
        setIsEditingPassword(false);
        setFormData(prev => ({ ...prev, password: '' }));
      }
    } catch (err) {
      console.error('Error saving user:', err);
      setError('Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  }, [formData, user.id, selectedRole, isEditingPassword, onSave, currentUserId]);

  const handleUnblock = useCallback(async () => {
    setIsUnblocking(true);
    try {
      await onUnblock(user);
      onRefresh();
    } catch (err) {
      console.error('Error unblocking user:', err);
      toast.error('Error al desbloquear usuario');
    } finally {
      setIsUnblocking(false);
    }
  }, [user, onUnblock, onRefresh]);

  const handleArchive = useCallback(async () => {
    setIsArchiving(true);
    try {
      const { error } = await supabaseSystemUI
        .from('auth_users')
        .update({
          archivado: true,
          is_active: false,
          is_operativo: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('Usuario archivado correctamente');
      onRefresh();
      onClose();
    } catch (err) {
      console.error('Error archiving user:', err);
      toast.error('Error al archivar usuario');
    } finally {
      setIsArchiving(false);
    }
  }, [user.id, onRefresh, onClose]);

  const handleToggleOperativo = useCallback(() => {
    // Validar: ejecutivos no pueden habilitar operativo sin id_dynamics
    if (user.role_name === 'ejecutivo' && !user.id_dynamics && !formData.is_operativo) {
      setError('No se puede habilitar operativo un ejecutivo sin ID_Dynamics');
      return;
    }
    setFormData(prev => ({ ...prev, is_operativo: !prev.is_operativo }));
    setError(null);
  }, [user.role_name, user.id_dynamics, formData.is_operativo]);

  // Manejar toggle de grupos de permisos
  const handleToggleGroup = useCallback(async (groupId: string) => {
    const isCurrentlyAssigned = userGroups.includes(groupId);
    
    // Guardar estado anterior para posible revert
    const previousGroups = [...userGroups];
    
    // Actualizar estado local inmediatamente para feedback visual
    const newGroups = isCurrentlyAssigned 
      ? userGroups.filter(id => id !== groupId)
      : [...userGroups, groupId];
    setUserGroups(newGroups);
    
    try {
      if (isCurrentlyAssigned) {
        // Remover de user_permission_groups
        await groupsService.removeUserFromGroup(user.id, groupId);
        toast.success('Grupo removido');
      } else {
        // Agregar a user_permission_groups
        await groupsService.assignUserToGroup(user.id, groupId);
        toast.success('Grupo asignado');
      }
      // Refrescar lista de usuarios en el sidebar
      onRefresh();
    } catch (err) {
      console.error('Error toggling group:', err);
      // Revertir el cambio local si falló (usando copia del estado anterior)
      setUserGroups(previousGroups);
      toast.error('Error al modificar grupo');
    }
  }, [user.id, userGroups, onRefresh]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 min-h-0">
      {/* Header - Compacto y responsivo */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {user.is_blocked ? (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/25 p-0.5">
                    <div className="w-full h-full rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center">
                      <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                    </div>
                  </div>
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-0.5 shadow-lg">
                    <div className="w-full h-full rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                  </div>
                )}
                <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-white dark:border-gray-900 ${
                  user.is_blocked ? 'bg-red-500' : user.is_active ? 'bg-emerald-500' : 'bg-gray-400'
                }`} />
              </div>

              {/* Title */}
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                  Editar Usuario
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                  {user.full_name} • <span className="hidden sm:inline">{user.email}</span>
                  <span className="sm:hidden">{user.email.split('@')[0]}</span>
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Blocked Alert */}
          {user.is_blocked && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
            >
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-red-800 dark:text-red-200">
                  Usuario bloqueado por moderación
                </p>
                {user.warning_count !== undefined && (
                  <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400">
                    {user.warning_count} infracción{user.warning_count !== 1 ? 'es' : ''} registrada{user.warning_count !== 1 ? 's' : ''}
                  </p>
              )}
            </div>
            <button
              onClick={handleUnblock}
              disabled={isUnblocking}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isUnblocking ? <Loader2 className="w-3 h-3 animate-spin" /> : <LockOpen className="w-3 h-3" />}
              <span className="hidden sm:inline">{isUnblocking ? 'Desbloqueando...' : 'Desbloquear'}</span>
            </button>
          </motion.div>
        )}
        </div>
      </div>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 sm:px-6 lg:px-8 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800"
          >
            <div className="max-w-5xl mx-auto">
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content with Scroll - Responsive 2-column layout */}
      <form 
        id="user-edit-form"
        onSubmit={(e) => { e.preventDefault(); handleSave(); }}
        className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 scrollbar-hide"
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Left Column - Personal & Professional Info */}
            <div className="space-y-6">
              {/* Section: Personal Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Información Personal
                  </h4>
                </div>

                {/* Email */}
                <div className="group">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    <Mail className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <span>Email {isAdmin || isAdminOperativo ? '*' : ''}</span>
                  </label>
                  <input
                    type="email"
                    required={isAdmin || isAdminOperativo}
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value.trim().toLowerCase() }))}
                    disabled={!(isAdmin || isAdminOperativo)}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 ${
                      isAdmin || isAdminOperativo
                        ? 'hover:border-gray-300 dark:hover:border-gray-600'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                    }`}
                    placeholder="usuario@ejemplo.com"
                  />
                </div>

                {/* Name fields */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="group">
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span>Nombre *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                      placeholder="Nombre"
                    />
                  </div>
                  <div className="group">
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span>Apellido *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                      placeholder="Apellido"
                    />
                  </div>
                </div>

          {/* Password */}
          <div className="group">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                <Lock className="w-4 h-4 text-gray-400" />
                <span>Contraseña</span>
              </label>
              {!isEditingPassword && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingPassword(true);
                    setFormData(prev => ({ ...prev, password: '' }));
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  <span className="hidden sm:inline">Editar Contraseña</span>
                  <span className="sm:hidden">Editar</span>
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                disabled={!isEditingPassword}
                placeholder={isEditingPassword ? 'Nueva contraseña' : '••••••••'}
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 pr-16 sm:pr-20 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 ${
                  isEditingPassword ? 'hover:border-gray-300 dark:hover:border-gray-600' : 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                }`}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {isEditingPassword && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingPassword(false);
                        setFormData(prev => ({ ...prev, password: '' }));
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
            {isEditingPassword && formData.password && (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Requisitos de contraseña:
                </p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className={`flex items-center gap-1 ${formData.password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
                    {formData.password.length >= 8 ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>8+ caracteres</span>
                  </div>
                  <div className={`flex items-center gap-1 ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                    {/[A-Z]/.test(formData.password) ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>Mayúscula</span>
                  </div>
                  <div className={`flex items-center gap-1 ${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                    {/[a-z]/.test(formData.password) ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>Minúscula</span>
                  </div>
                  <div className={`flex items-center gap-1 ${/[0-9]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                    {/[0-9]/.test(formData.password) ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>Número</span>
                  </div>
                  <div className={`flex items-center gap-1 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                    {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>Especial (!@#$)</span>
                  </div>
                </div>
              </div>
            )}
            {isEditingPassword && !formData.password && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Completa este campo para cambiar la contraseña
              </p>
            )}
          </div>
              </div>

              {/* Section: Professional Information - En la misma columna en móvil */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Información Profesional
                  </h4>
                </div>

                {/* Teléfono */}
                <div className="group">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>Teléfono</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                    placeholder="+52 123 456 7890"
                  />
                </div>
              </div>

              {/* Section: Historial de Infracciones */}
              <UserInfractionsGrid user={user} />
            </div>

            {/* Right Column - Role, Permissions & Status */}
            <div className="space-y-6">
              {/* Section: Role & Permissions */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Roles y Permisos
                  </h4>
                </div>

                {/* Role Selector */}
                <div className="group">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    <Key className="w-4 h-4 text-gray-400" />
                    <span>Rol *</span>
                  </label>
                  <select
                    required
                    value={formData.role_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, role_id: e.target.value, analysis_sources: [] }))}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-[length:12px_8px] bg-[right_1rem_center] bg-no-repeat"
                  >
                    <option value="">Seleccionar rol...</option>
                    {availableRoles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.display_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Coordinaciones for Coordinador/Supervisor (Multiple) */}
                {(selectedRole?.name === 'coordinador' || selectedRole?.name === 'supervisor') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span>Coordinaciones *</span>
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-none">
                {activeCoordinaciones.map(coord => {
                  const isChecked = formData.coordinaciones_ids.includes(coord.id);
                  return (
                    <label
                      key={coord.id}
                      className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 cursor-pointer hover:border-purple-300 dark:hover:border-purple-600 transition-all group"
                    >
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                        isChecked ? 'bg-purple-500 border-purple-500' : 'border-gray-300 dark:border-gray-600 group-hover:border-purple-400'
                      }`}>
                        {isChecked && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isChecked}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...formData.coordinaciones_ids, coord.id]
                            : formData.coordinaciones_ids.filter(id => id !== coord.id);
                          setFormData(prev => ({ ...prev, coordinaciones_ids: ids }));
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {coord.codigo} - {coord.nombre}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Coordinación for Ejecutivo (Single) */}
          {selectedRole?.name === 'ejecutivo' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span>Coordinación *</span>
              </label>
              <select
                required
                value={formData.coordinacion_id}
                onChange={(e) => setFormData(prev => ({ ...prev, coordinacion_id: e.target.value }))}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-[length:12px_8px] bg-[right_1rem_center] bg-no-repeat"
              >
                <option value="">Seleccionar coordinación...</option>
                {activeCoordinaciones.map(coord => (
                  <option key={coord.id} value={coord.id}>
                    {coord.codigo} - {coord.nombre}
                  </option>
                ))}
              </select>
            </motion.div>
          )}

                {/* Section: Grupos de Permisos */}
                {filteredGroups.length > 0 && (
                  <div className="space-y-4 mt-6">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-blue-500 rounded-full" />
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Grupos de Permisos
                      </h4>
                      {loadingGroups && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Asigna grupos de permisos predefinidos para este usuario
                    </p>

                    <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                      {filteredGroups.map(group => {
                        const isAssigned = userGroups.includes(group.id);
                        const isMatchingRole = group.base_role === user.role_name;
                        
                        return (
                          <label
                            key={group.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all group ${
                              isAssigned
                                ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                              isAssigned 
                                ? 'bg-indigo-500 border-indigo-500' 
                                : 'border-gray-300 dark:border-gray-600 group-hover:border-indigo-400'
                            }`}>
                              {isAssigned && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={isAssigned}
                              onChange={() => handleToggleGroup(group.id)}
                            />
                            
                            {/* Group Icon */}
                            <div 
                              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${group.color || 'from-gray-500 to-gray-600'}`}
                            >
                              <Shield className="w-4 h-4 text-white" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium truncate ${
                                  isAssigned
                                    ? 'text-indigo-700 dark:text-indigo-300'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                  {group.display_name}
                                </span>
                                {isMatchingRole && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded flex items-center gap-1 flex-shrink-0">
                                    <Users className="w-3 h-3" />
                                    Recomendado
                                  </span>
                                )}
                                {group.is_system && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded flex-shrink-0">
                                    Sistema
                                  </span>
                                )}
                              </div>
                              {group.description && (
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                  {group.description}
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Section: Status Toggles */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full" />
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </h4>
                </div>

                {/* Operativo Toggle - Solo para coordinadores y ejecutivos */}
                {(user.role_name === 'coordinador' || user.role_name === 'ejecutivo') && (
                  <div
                    onClick={handleToggleOperativo}
                    className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      user.role_name === 'ejecutivo' && !user.id_dynamics && formData.is_operativo
                        ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 opacity-60 cursor-not-allowed'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`relative w-10 sm:w-12 h-5 sm:h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
                        formData.is_operativo ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                      }`}>
                        <motion.div
                          animate={{ x: formData.is_operativo ? 20 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="absolute top-0.5 left-0.5 w-4 sm:w-5 h-4 sm:h-5 bg-white rounded-full shadow-lg"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                          Usuario Operativo
                        </span>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user.role_name === 'ejecutivo' && !user.id_dynamics
                            ? 'Requiere ID_Dynamics'
                            : 'Estado lógico sin limitar acceso'}
                        </p>
                      </div>
                    </div>
                    {formData.is_operativo ? (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                )}

                {/* Estado Activo */}
                <div
                  onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                  className="flex items-center justify-between p-3 sm:p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`relative w-10 sm:w-12 h-5 sm:h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
                      formData.is_active ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
                    }`}>
                      <motion.div
                        animate={{ x: formData.is_active ? 20 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute top-0.5 left-0.5 w-4 sm:w-5 h-4 sm:h-5 bg-white rounded-full shadow-lg"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                        Cuenta Activa
                      </span>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        Permite o impide el acceso al sistema
                      </p>
                    </div>
                  </div>
                  {formData.is_active ? (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  {user.last_login && (
                    <p>Último acceso: {new Date(user.last_login).toLocaleString('es-MX')}</p>
                  )}
                  <p>Creado: {new Date(user.created_at).toLocaleString('es-MX')}</p>
                  {user.id_dynamics && (
                    <p className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded inline-block">
                      ID Dynamics: {user.id_dynamics}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Footer - Responsivo */}
      <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          {/* Left buttons */}
          <div className="flex items-center gap-2">
            {/* Archive Button */}
            {!user.archivado && (isAdmin || isAdminOperativo) && (
              <button
                onClick={handleArchive}
                disabled={isArchiving}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50 rounded-xl transition-colors disabled:opacity-50"
              >
                {isArchiving ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : <Archive className="w-3 h-3 sm:w-4 sm:h-4" />}
                <span className="hidden sm:inline">Archivar</span>
              </button>
            )}
          </div>

          {/* Right buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="user-edit-form"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/25"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                  <span className="hidden sm:inline">Guardando...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Guardar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserEditPanel;

