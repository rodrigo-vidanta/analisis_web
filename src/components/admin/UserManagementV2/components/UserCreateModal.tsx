/**
 * ============================================
 * USER CREATE MODAL - Modal de creación de usuario
 * ============================================
 * Modal para crear nuevos usuarios siguiendo el diseño enterprise.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Mail,
  Lock,
  Phone,
  Building2,
  Key,
  Loader2,
  UserPlus,
  Eye,
  EyeOff,
  Shield,
  Users,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Role, Coordinacion } from '../types';
import { supabaseSystemUI } from '../../../../config/supabaseSystemUI';
import { groupsService, type PermissionGroup } from '../../../../services/groupsService';

// ============================================
// TYPES
// ============================================

interface UserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  coordinaciones: Coordinacion[];
  currentUserRole: string;
  currentUserId?: string;
  onSuccess: () => void;
}

interface FormData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  id_dynamics: string; // ID de Dynamics CRM - requerido para is_operativo
  role_id: string;
  coordinacion_id: string;
  coordinaciones_ids: string[];
  is_active: boolean;
  inbound: boolean; // Usuario recibe mensajes inbound de WhatsApp
  analysis_sources: string[];
  group_ids: string[];
}

const initialFormData: FormData = {
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  phone: '',
  id_dynamics: '',
  role_id: '',
  coordinacion_id: '',
  coordinaciones_ids: [],
  is_active: true,
  inbound: false,
  analysis_sources: [],
  group_ids: []
};

// ============================================
// COMPONENT
// ============================================

const UserCreateModal: React.FC<UserCreateModalProps> = ({
  isOpen,
  onClose,
  roles,
  coordinaciones,
  currentUserRole,
  currentUserId,
  onSuccess
}) => {
  const isAdmin = currentUserRole === 'admin';
  const isAdminOperativo = currentUserRole === 'administrador_operativo';
  
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Estados para grupos de permisos
  const [availableGroups, setAvailableGroups] = useState<PermissionGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Obtener el rol seleccionado
  const selectedRole = roles.find(r => r.id === formData.role_id);
  
  // Cargar grupos de permisos disponibles
  useEffect(() => {
    const loadGroups = async () => {
      setLoadingGroups(true);
      try {
        const groups = await groupsService.getGroups(true);
        setAvailableGroups(groups);
      } catch {
        setAvailableGroups([]);
      } finally {
        setLoadingGroups(false);
      }
    };
    if (isOpen) {
      loadGroups();
    }
  }, [isOpen]);

  // Filtrar roles según permisos del usuario actual
  // Admin Operativo puede asignar: coordinador, supervisor, ejecutivo
  const availableRoles = roles.filter(role => {
    if (isAdminOperativo) {
      return ['coordinador', 'supervisor', 'ejecutivo'].includes(role.name);
    }
    if (isAdmin) {
      return true;
    }
    return false;
  });

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

  // Reset form
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setShowPassword(false);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name || !formData.role_id) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    // Validar coordinación para ejecutivos y supervisores
    if ((selectedRole?.name === 'ejecutivo' || selectedRole?.name === 'supervisor') && !formData.coordinacion_id) {
      toast.error('Debes seleccionar una coordinación para el ' + (selectedRole?.name === 'supervisor' ? 'supervisor' : 'ejecutivo'));
      return;
    }

    // Validar coordinaciones para coordinadores (múltiples)
    if (selectedRole?.name === 'coordinador' && formData.coordinaciones_ids.length === 0) {
      toast.error('Debes seleccionar al menos una coordinación');
      return;
    }

    try {
      setIsLoading(true);

      // ============================================
      // CREAR USUARIO EN SUPABASE AUTH NATIVO
      // ============================================
      // Usa Edge Function auth-admin-proxy con operación createUser
      // Los usuarios se crean en auth.users (no en tabla legacy auth_users)
      
      const edgeFunctionsUrl = import.meta.env.VITE_EDGE_FUNCTIONS_URL;
      const anonKey = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;
      
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`;
      
      const response = await fetch(`${edgeFunctionsUrl}/functions/v1/auth-admin-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          operation: 'createUser',
          params: {
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            fullName,
            roleId: formData.role_id,
            phone: formData.phone || null,
            idDynamics: formData.id_dynamics?.trim() || null,
            // Metadatos adicionales para el user_metadata
            isActive: formData.is_active,
            // REGLA DE NEGOCIO: Solo es operativo si tiene id_dynamics
            isOperativo: !!formData.id_dynamics?.trim(),
            isCoordinator: selectedRole?.name === 'coordinador',
            isEjecutivo: selectedRole?.name === 'ejecutivo',
            inbound: formData.inbound,
            coordinacionId: formData.coordinacion_id || null
          }
        })
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        console.error('Error creating user:', result);
        throw new Error(result.error || result.details?.join(', ') || 'Error al crear usuario');
      }

      const userId = result.userId;

      if (!userId) {
        throw new Error('No se pudo obtener el ID del usuario creado');
      }

      console.log(`✅ Usuario creado en Supabase Auth: ${userId}`);

      // ============================================
      // ASIGNAR COORDINACIONES (tabla auxiliar)
      // ============================================
      
      // Solo coordinadores usan múltiples coordinaciones
      if (selectedRole?.name === 'coordinador' && formData.coordinaciones_ids.length > 0) {
        // Insertar relaciones en tabla intermedia (auth_user_coordinaciones)
        const relaciones = formData.coordinaciones_ids.map(coordId => ({
          user_id: userId,
          coordinacion_id: coordId,
          assigned_by: currentUserId || null
        }));

        const { error: relacionesError } = await supabaseSystemUI
          .from('auth_user_coordinaciones')
          .insert(relaciones);

        if (relacionesError) {
          console.error('Error asignando coordinaciones:', relacionesError);
        }
      }

      // Ejecutivos y supervisores usan coordinacion_id único
      if ((selectedRole?.name === 'ejecutivo' || selectedRole?.name === 'supervisor') && formData.coordinacion_id) {
        const { error: relacionError } = await supabaseSystemUI
          .from('auth_user_coordinaciones')
          .insert({
            user_id: userId,
            coordinacion_id: formData.coordinacion_id,
            assigned_by: currentUserId || null
          });

        if (relacionError) {
          console.error('Error asignando coordinación:', relacionError);
        }
      }

      // Si es evaluador, asignar permisos de análisis
      if (selectedRole?.name === 'evaluator' && formData.analysis_sources.length > 0) {
        // TODO: Implementar asignación de permisos de análisis
      }

      // Asignar grupos de permisos
      if (formData.group_ids.length > 0) {
        for (const groupId of formData.group_ids) {
          try {
            await groupsService.assignUserToGroup(userId, groupId);
          } catch (err) {
            console.error(`Error asignando grupo ${groupId}:`, err);
          }
        }
      }

      toast.success('Usuario creado exitosamente');
      handleClose();
      onSuccess();

    } catch (err: any) {
      console.error('Error creating user:', err);
      toast.error(err.message || 'Error al crear usuario');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
        >
          {/* Header */}
          <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-0.5 shadow-lg"
                >
                  <div className="w-full h-full rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </motion.div>
                <div>
                  <motion.h3
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-lg font-bold text-gray-900 dark:text-white"
                  >
                    Crear Nuevo Usuario
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-sm text-gray-500 dark:text-gray-400"
                  >
                    Completa la información para crear un nuevo usuario
                  </motion.p>
                </div>
              </div>
              <motion.button
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.25 }}
                onClick={handleClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-hide">
            <form id="create-user-form" onSubmit={handleSubmit} className="space-y-5">
              
              {/* Sección: Información Personal */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Información Personal
                  </h4>
                </div>

                {/* Email */}
                <div className="group">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>Email *</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                    placeholder="usuario@ejemplo.com"
                  />
                </div>

                {/* Password */}
                <div className="group">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <span>Contraseña *</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-4 py-2.5 pr-10 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Name fields */}
                <div className="grid grid-cols-2 gap-4">
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
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
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
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                      placeholder="Apellido"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="group">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>Teléfono</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                    placeholder="+52 123 456 7890"
                  />
                </div>

                {/* ID Dynamics */}
                <div className="group">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span>ID Dynamics (CRM)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.id_dynamics}
                    onChange={(e) => setFormData(prev => ({ ...prev, id_dynamics: e.target.value }))}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                    placeholder="ID del usuario en Dynamics CRM"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Requerido para marcar al usuario como operativo
                  </p>
                </div>
              </motion.div>

              {/* Sección: Roles y Permisos */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Roles y Permisos
                  </h4>
                </div>

                {/* Role Select */}
                <div className="group">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    <Key className="w-4 h-4 text-gray-400" />
                    <span>Rol *</span>
                  </label>
                  <select
                    required
                    value={formData.role_id}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      role_id: e.target.value,
                      coordinacion_id: '',
                      coordinaciones_ids: []
                    }))}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-[length:12px_8px] bg-[right_1rem_center] bg-no-repeat"
                  >
                    <option value="">Seleccionar rol...</option>
                    {availableRoles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.display_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Coordinación para Ejecutivos */}
                <AnimatePresence>
                  {(selectedRole?.name === 'ejecutivo' || selectedRole?.name === 'supervisor') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="group">
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
                          {coordinaciones.filter(c => !c.archivado).map(coord => (
                            <option key={coord.id} value={coord.id}>
                              {coord.codigo} - {coord.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Coordinaciones para Coordinadores (múltiples) */}
                <AnimatePresence>
                  {selectedRole?.name === 'coordinador' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Coordinaciones
                        </h4>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
                        {coordinaciones.filter(c => !c.archivado).map((coord) => {
                          const isChecked = formData.coordinaciones_ids.includes(coord.id);
                          return (
                            <label
                              key={coord.id}
                              className={`relative flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                isChecked
                                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                              }`}
                            >
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
                              <div className={`w-5 h-5 rounded-lg border-2 mr-3 flex items-center justify-center transition-all ${
                                isChecked
                                  ? 'bg-purple-500 border-purple-500'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {isChecked && (
                                  <motion.svg
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-3 h-3 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </motion.svg>
                                )}
                              </div>
                              <div className="flex-1">
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
                </AnimatePresence>

                {/* Sección: Grupos de Permisos */}
                {filteredGroups.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-blue-500 rounded-full" />
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Grupos de Permisos
                      </h4>
                      {loadingGroups && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Asigna grupos de permisos predefinidos para este usuario (opcional)
                    </p>

                    <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
                      {filteredGroups
                        .filter(g => !selectedRole || g.base_role === selectedRole.name || !g.base_role)
                        .map((group) => {
                          const isChecked = formData.group_ids.includes(group.id);
                          const isMatchingRole = selectedRole && group.base_role === selectedRole.name;
                          
                          return (
                            <label
                              key={group.id}
                              className={`relative flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                isChecked
                                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={isChecked}
                                onChange={(e) => {
                                  const ids = e.target.checked
                                    ? [...formData.group_ids, group.id]
                                    : formData.group_ids.filter(id => id !== group.id);
                                  setFormData(prev => ({ ...prev, group_ids: ids }));
                                }}
                              />
                              <div className={`w-5 h-5 rounded-lg border-2 mr-3 flex items-center justify-center transition-all flex-shrink-0 ${
                                isChecked
                                  ? 'bg-indigo-500 border-indigo-500'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {isChecked && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </div>
                              
                              {/* Group Icon */}
                              <div 
                                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mr-3 bg-gradient-to-br ${group.color || 'from-gray-500 to-gray-600'}`}
                              >
                                <Shield className="w-4 h-4 text-white" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${
                                    isChecked
                                      ? 'text-indigo-700 dark:text-indigo-300'
                                      : 'text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {group.display_name}
                                  </span>
                                  {isMatchingRole && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      Recomendado
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
                  </motion.div>
                )}
              </motion.div>

              {/* Sección: Estado */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </h4>
                </div>

                {/* Toggle Usuario Activo */}
                <label className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
                      formData.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                    }`}>
                      <motion.div
                        animate={{ x: formData.is_active ? 20 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg"
                      />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Cuenta Activa
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        El usuario podrá iniciar sesión en el sistema
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                </label>

                {/* Toggle Inbound */}
                <label className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
                      formData.inbound ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-700'
                    }`}>
                      <motion.div
                        animate={{ x: formData.inbound ? 20 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg"
                      />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Usuario recibe mensajes inbound
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Al habilitar, el usuario recibirá mensajes de nuevos prospectos a su módulo de WhatsApp
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={formData.inbound}
                    onChange={(e) => setFormData(prev => ({ ...prev, inbound: e.target.checked }))}
                  />
                </label>
              </motion.div>

            </form>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              form="create-user-form"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Crear Usuario</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UserCreateModal;

