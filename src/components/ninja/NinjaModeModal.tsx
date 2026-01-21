/**
 * ============================================
 * NINJA MODE MODAL
 * ============================================
 * 
 * Modal de selección para el Modo Ninja que permite a los administradores
 * seleccionar qué usuario quieren suplantar.
 * 
 * FLUJO:
 * 1. Seleccionar coordinación (opcional, para filtrar)
 * 2. Seleccionar tipo de usuario: Ejecutivo, Supervisor, Coordinador
 * 3. Seleccionar usuario específico
 * 4. Confirmar y activar modo ninja
 * 
 * @version 1.0.0
 * @date 2026-01-21
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { coordinacionService, type Coordinacion, type Ejecutivo } from '../../services/coordinacionService';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';
import { useNinjaStore, type NinjaTargetUser, type NinjaPermission } from '../../stores/ninjaStore';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// ============================================
// TIPOS
// ============================================

type UserType = 'ejecutivo' | 'supervisor' | 'coordinador';

interface NinjaModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================
// ICONOS SVG NINJA
// ============================================

const NinjaStarIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z" />
  </svg>
);

const NinjaMaskIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
    <path d="M8 10h8v2H8z" className="fill-black dark:fill-gray-900"/>
  </svg>
);

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const NinjaModeModal: React.FC<NinjaModeModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { activateNinjaMode } = useNinjaStore();
  
  // Estados del flujo
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCoordinacion, setSelectedCoordinacion] = useState<Coordinacion | null>(null);
  const [selectedUserType, setSelectedUserType] = useState<UserType | null>(null);
  const [selectedUser, setSelectedUser] = useState<Ejecutivo | null>(null);
  
  // Datos
  const [coordinaciones, setCoordinaciones] = useState<Coordinacion[]>([]);
  const [users, setUsers] = useState<Ejecutivo[]>([]);
  
  // Estados de carga
  const [loadingCoordinaciones, setLoadingCoordinaciones] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [activating, setActivating] = useState(false);
  
  // Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  
  // ============================================
  // CARGAR COORDINACIONES
  // ============================================
  const loadCoordinaciones = useCallback(async () => {
    setLoadingCoordinaciones(true);
    try {
      const data = await coordinacionService.getCoordinaciones();
      setCoordinaciones(data);
    } catch (error) {
      console.error('Error cargando coordinaciones:', error);
      toast.error('Error al cargar coordinaciones');
    } finally {
      setLoadingCoordinaciones(false);
    }
  }, []);
  
  // ============================================
  // CARGAR USUARIOS POR TIPO
  // ============================================
  const loadUsers = useCallback(async () => {
    if (!selectedUserType) return;
    
    setLoadingUsers(true);
    setUsers([]);
    
    try {
      let usersData: Ejecutivo[] = [];
      
      if (selectedUserType === 'ejecutivo') {
        if (selectedCoordinacion) {
          usersData = await coordinacionService.getEjecutivosByCoordinacion(selectedCoordinacion.id);
        } else {
          usersData = await coordinacionService.getAllEjecutivos();
        }
      } else if (selectedUserType === 'supervisor') {
        if (selectedCoordinacion) {
          usersData = await coordinacionService.getSupervisoresByCoordinacion(selectedCoordinacion.id);
        } else {
          // Obtener todos los supervisores
          const { data, error } = await supabaseSystemUI
            .from('user_profiles_v2')
            .select('*')
            .eq('role_name', 'supervisor')
            .eq('is_active', true)
            .order('full_name');
          
          if (!error && data) {
            usersData = data.map((u: any) => ({
              id: u.id,
              email: u.email,
              full_name: u.full_name,
              first_name: u.first_name,
              last_name: u.last_name,
              phone: u.phone,
              coordinacion_id: u.coordinacion_id,
              is_active: u.is_active,
              email_verified: u.email_verified,
              last_login: u.last_login,
              created_at: u.created_at,
            }));
          }
        }
      } else if (selectedUserType === 'coordinador') {
        if (selectedCoordinacion) {
          usersData = await coordinacionService.getCoordinadoresByCoordinacion(selectedCoordinacion.id);
        } else {
          usersData = await coordinacionService.getAllCoordinadores();
        }
      }
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoadingUsers(false);
    }
  }, [selectedUserType, selectedCoordinacion]);
  
  // ============================================
  // CARGAR PERMISOS DEL USUARIO SELECCIONADO
  // ============================================
  const loadUserPermissions = async (userId: string): Promise<NinjaPermission[]> => {
    try {
      const { data, error } = await supabaseSystemUI
        .from('auth_user_permissions')
        .select('permission_name, module, sub_module')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      return (data || []).map(p => ({
        permission_name: p.permission_name,
        module: p.module,
        sub_module: p.sub_module,
      }));
    } catch (error) {
      console.error('Error cargando permisos:', error);
      return [];
    }
  };
  
  // ============================================
  // CARGAR COORDINACIONES DEL USUARIO
  // ============================================
  const loadUserCoordinaciones = async (userId: string): Promise<string[]> => {
    try {
      const { data, error } = await supabaseSystemUI
        .from('auth_user_coordinaciones')
        .select('coordinacion_id')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      return (data || []).map(c => c.coordinacion_id);
    } catch (error) {
      console.error('Error cargando coordinaciones del usuario:', error);
      return [];
    }
  };
  
  // ============================================
  // ACTIVAR MODO NINJA
  // ============================================
  const handleActivateNinja = async () => {
    if (!selectedUser || !user) return;
    
    setActivating(true);
    
    try {
      // Cargar permisos y coordinaciones del usuario
      const [permissions, coordinacionesIds] = await Promise.all([
        loadUserPermissions(selectedUser.id),
        loadUserCoordinaciones(selectedUser.id),
      ]);
      
      // Obtener datos completos del rol
      const { data: roleData } = await supabaseSystemUI
        .from('auth_roles')
        .select('name, display_name')
        .eq('name', selectedUserType)
        .single();
      
      // Crear objeto de usuario objetivo
      const targetUser: NinjaTargetUser = {
        id: selectedUser.id,
        email: selectedUser.email,
        full_name: selectedUser.full_name,
        first_name: selectedUser.first_name,
        last_name: selectedUser.last_name,
        role_name: selectedUserType || 'ejecutivo',
        role_display_name: roleData?.display_name || selectedUserType,
        coordinacion_id: selectedUser.coordinacion_id,
        coordinacion_codigo: selectedUser.coordinacion_codigo,
        coordinacion_nombre: selectedUser.coordinacion_nombre,
        is_active: selectedUser.is_active,
      };
      
      // Activar modo ninja
      activateNinjaMode(targetUser, permissions, coordinacionesIds, user.id);
      
      toast.success(
        <div className="flex items-center space-x-2">
          <span className="text-xl">🥷</span>
          <span>Modo Ninja activado como <strong>{selectedUser.full_name}</strong></span>
        </div>,
        { duration: 4000 }
      );
      
      onClose();
      resetModal();
      
    } catch (error) {
      console.error('Error activando modo ninja:', error);
      toast.error('Error al activar modo ninja');
    } finally {
      setActivating(false);
    }
  };
  
  // ============================================
  // RESET MODAL
  // ============================================
  const resetModal = () => {
    setStep(1);
    setSelectedCoordinacion(null);
    setSelectedUserType(null);
    setSelectedUser(null);
    setSearchTerm('');
    setUsers([]);
  };
  
  // ============================================
  // EFECTOS
  // ============================================
  
  // Cargar coordinaciones al abrir
  useEffect(() => {
    if (isOpen) {
      loadCoordinaciones();
    }
  }, [isOpen, loadCoordinaciones]);
  
  // Cargar usuarios cuando cambia el tipo
  useEffect(() => {
    if (step === 3 && selectedUserType) {
      loadUsers();
    }
  }, [step, selectedUserType, loadUsers]);
  
  // Filtrar usuarios por búsqueda
  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // ============================================
  // RENDER - Usando Portal para renderizar en el body
  // ============================================
  
  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md overflow-y-auto"
          style={{ zIndex: 99999 }}
          onClick={onClose}
        >
          {/* Contenedor para centrar vertical y horizontalmente */}
          <div className="min-h-screen w-full flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-red-900/50 rounded-2xl shadow-2xl shadow-red-900/20 w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
              style={{ zIndex: 100000 }}
            >
            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-gray-900 via-gray-900 to-red-950/30 border-b border-red-900/30">
              {/* Estrellas ninja decorativas */}
              <motion.div
                className="absolute top-3 right-16 text-red-500/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              >
                <NinjaStarIcon className="w-4 h-4" />
              </motion.div>
              <motion.div
                className="absolute top-6 right-8 text-red-500/20"
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
              >
                <NinjaStarIcon className="w-3 h-3" />
              </motion.div>
              
              <div className="flex items-center space-x-4">
                {/* Icono ninja */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-900/50"
                >
                  <NinjaMaskIcon className="w-8 h-8 text-white" />
                </motion.div>
                
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                    <span>Modo Ninja</span>
                    <span className="text-2xl">🥷</span>
                  </h2>
                  <p className="text-sm text-gray-400">
                    Suplantar sesión de usuario
                  </p>
                </div>
              </div>
              
              {/* Botón cerrar */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-red-900/30 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Progress steps */}
              <div className="flex items-center justify-center space-x-2 mt-4">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`w-2 h-2 rounded-full transition-all ${
                      s === step
                        ? 'w-6 bg-red-500'
                        : s < step
                        ? 'bg-red-700'
                        : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {/* STEP 1: Seleccionar Coordinación */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">
                        1. Selecciona Coordinación
                      </h3>
                      <span className="text-xs text-gray-500">(Opcional)</span>
                    </div>
                    
                    <p className="text-sm text-gray-400">
                      Filtra usuarios por coordinación o continúa para ver todos.
                    </p>
                    
                    {loadingCoordinaciones ? (
                      <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                        {coordinaciones.map((coord) => (
                          <button
                            key={coord.id}
                            onClick={() => setSelectedCoordinacion(coord)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              selectedCoordinacion?.id === coord.id
                                ? 'border-red-500 bg-red-900/30 text-white'
                                : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-red-700 hover:bg-gray-800'
                            }`}
                          >
                            <div className="font-medium text-sm">{coord.codigo}</div>
                            <div className="text-xs text-gray-500 truncate">{coord.nombre}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={() => {
                          setSelectedCoordinacion(null);
                          setStep(2);
                        }}
                        className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-800 transition-all text-sm font-medium"
                      >
                        Todas las coordinaciones
                      </button>
                      <button
                        onClick={() => setStep(2)}
                        disabled={!selectedCoordinacion}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                      >
                        Continuar →
                      </button>
                    </div>
                  </motion.div>
                )}
                
                {/* STEP 2: Seleccionar Tipo de Usuario */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-semibold text-white">
                      2. Tipo de Usuario
                    </h3>
                    
                    {selectedCoordinacion && (
                      <div className="flex items-center space-x-2 text-sm text-gray-400 bg-gray-800/50 rounded-lg px-3 py-2">
                        <span>Coordinación:</span>
                        <span className="text-red-400 font-medium">{selectedCoordinacion.codigo}</span>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      {[
                        { type: 'ejecutivo' as UserType, label: 'Ejecutivo', icon: '👤', desc: 'Agentes de ventas y atención' },
                        { type: 'supervisor' as UserType, label: 'Supervisor', icon: '👁️', desc: 'Supervisores de equipos' },
                        { type: 'coordinador' as UserType, label: 'Coordinador', icon: '👑', desc: 'Coordinadores de área' },
                      ].map(({ type, label, icon, desc }) => (
                        <button
                          key={type}
                          onClick={() => {
                            setSelectedUserType(type);
                            setStep(3);
                          }}
                          className={`w-full p-4 rounded-xl border text-left transition-all flex items-center space-x-4 ${
                            selectedUserType === type
                              ? 'border-red-500 bg-red-900/30'
                              : 'border-gray-700 bg-gray-800/50 hover:border-red-700 hover:bg-gray-800'
                          }`}
                        >
                          <span className="text-2xl">{icon}</span>
                          <div>
                            <div className="font-semibold text-white">{label}</div>
                            <div className="text-sm text-gray-400">{desc}</div>
                          </div>
                          <svg className="w-5 h-5 ml-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => setStep(1)}
                      className="w-full py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-800 transition-all text-sm font-medium"
                    >
                      ← Volver
                    </button>
                  </motion.div>
                )}
                
                {/* STEP 3: Seleccionar Usuario */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-semibold text-white">
                      3. Selecciona Usuario
                    </h3>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-400 bg-gray-800/50 rounded-lg px-3 py-2">
                      <span>Tipo:</span>
                      <span className="text-red-400 font-medium capitalize">{selectedUserType}</span>
                      {selectedCoordinacion && (
                        <>
                          <span className="text-gray-600">|</span>
                          <span>Coord:</span>
                          <span className="text-red-400 font-medium">{selectedCoordinacion.codigo}</span>
                        </>
                      )}
                    </div>
                    
                    {/* Búsqueda */}
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nombre o email..."
                        className="w-full px-4 py-2.5 pl-10 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-red-500 text-sm"
                      />
                      <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    
                    {loadingUsers ? (
                      <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <span className="text-4xl block mb-2">🥷</span>
                        No se encontraron usuarios
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-52 overflow-y-auto">
                        {filteredUsers.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => setSelectedUser(u)}
                            className={`w-full p-3 rounded-xl border text-left transition-all flex items-center space-x-3 ${
                              selectedUser?.id === u.id
                                ? 'border-red-500 bg-red-900/30'
                                : 'border-gray-700 bg-gray-800/50 hover:border-red-700 hover:bg-gray-800'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-bold">
                              {u.full_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-white truncate">{u.full_name}</div>
                              <div className="text-xs text-gray-500 truncate">{u.email}</div>
                            </div>
                            {selectedUser?.id === u.id && (
                              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex space-x-3 pt-2">
                      <button
                        onClick={() => {
                          setStep(2);
                          setSelectedUser(null);
                          setSearchTerm('');
                        }}
                        className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-800 transition-all text-sm font-medium"
                      >
                        ← Volver
                      </button>
                      <button
                        onClick={handleActivateNinja}
                        disabled={!selectedUser || activating}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium flex items-center justify-center space-x-2"
                      >
                        {activating ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <NinjaStarIcon className="w-4 h-4" />
                            <span>Activar Ninja</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Footer con advertencia */}
            <div className="px-6 py-3 border-t border-red-900/30 bg-red-950/20">
              <p className="text-xs text-red-400/80 text-center flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>El modo ninja registra todas las acciones para auditoría</span>
              </p>
            </div>
          </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
  
  // Usar Portal para renderizar fuera de la jerarquía del Header
  return createPortal(modalContent, document.body);
};

export default NinjaModeModal;
