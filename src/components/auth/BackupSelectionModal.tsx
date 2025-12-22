import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backupService } from '../../services/backupService';
import type { EjecutivoBackup, AvailableBackupsResult } from '../../services/backupService';
import { Loader2, User, Phone, CheckCircle2, AlertCircle, Search, Users, LogOut, AlertTriangle, PhoneOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface BackupSelectionModalProps {
  isOpen: boolean;
  ejecutivoId: string;
  coordinacionId: string;
  onBackupSelected: (backupId: string) => Promise<void>;
  onCancel: () => void;
  onLogoutWithoutBackup?: () => Promise<void>;
}

const BackupSelectionModal: React.FC<BackupSelectionModalProps> = ({
  isOpen,
  ejecutivoId,
  coordinacionId,
  onBackupSelected,
  onCancel,
  onLogoutWithoutBackup
}) => {
  const [availableBackups, setAvailableBackups] = useState<EjecutivoBackup[]>([]);
  const [unavailableUsers, setUnavailableUsers] = useState<AvailableBackupsResult['unavailableUsers']>([]);
  const [selectedBackupId, setSelectedBackupId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showConfirmNoBackup, setShowConfirmNoBackup] = useState(false);

  useEffect(() => {
    if (isOpen && coordinacionId) {
      loadAvailableBackups();
    }
  }, [isOpen, coordinacionId]);

  const loadAvailableBackups = async () => {
    try {
      setLoadingBackups(true);
      const result = await backupService.getAvailableBackupsWithDetails(coordinacionId, ejecutivoId);
      setAvailableBackups(result.backups);
      setUnavailableUsers(result.unavailableUsers);
    } catch (error) {
      console.error('Error cargando backups disponibles:', error);
      toast.error('Error al cargar ejecutivos y coordinadores disponibles');
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedBackupId) {
      toast.error('Por favor selecciona un ejecutivo, supervisor o coordinador como backup');
      return;
    }

    try {
      setLoading(true);
      await onBackupSelected(selectedBackupId);
    } catch (error) {
      console.error('Error asignando backup:', error);
      toast.error('Error al asignar backup');
      setLoading(false);
    }
  };

  // Handler para logout sin transferir (con doble confirmación)
  const handleLogoutWithoutBackup = async () => {
    if (!showConfirmNoBackup) {
      setShowConfirmNoBackup(true);
      return;
    }

    if (!onLogoutWithoutBackup) {
      console.warn('⚠️ onLogoutWithoutBackup no está definido');
      return;
    }

    try {
      setLoading(true);
      await onLogoutWithoutBackup();
    } catch (error) {
      console.error('Error en logout sin backup:', error);
      toast.error('Error al cerrar sesión');
      setLoading(false);
      setShowConfirmNoBackup(false);
    }
  };

  // Resetear confirmación cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setShowConfirmNoBackup(false);
    }
  }, [isOpen]);

  // Filtrar backups por búsqueda y limitar a top 3 (solo si no hay búsqueda activa)
  const filteredBackups = useMemo(() => {
    let filtered = availableBackups;

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(backup => {
        const matchesName = backup.full_name.toLowerCase().includes(query);
        const matchesEmail = backup.email.toLowerCase().includes(query);
        const matchesPhone = backup.phone?.includes(query) || false;
        return matchesName || matchesEmail || matchesPhone;
      });
    }

    // Ordenar: primero ejecutivos, luego supervisores, luego coordinadores
    // PRIORIDAD: Ejecutivos > Supervisores > Coordinadores
    filtered.sort((a, b) => {
      // Ejecutivos primero (ni supervisor ni coordinador)
      const aIsEjecutivo = !a.is_coordinator && !a.is_supervisor;
      const bIsEjecutivo = !b.is_coordinator && !b.is_supervisor;
      if (aIsEjecutivo && !bIsEjecutivo) return -1;
      if (!aIsEjecutivo && bIsEjecutivo) return 1;
      
      // Supervisores antes que coordinadores
      if (a.is_supervisor && b.is_coordinator) return -1;
      if (a.is_coordinator && b.is_supervisor) return 1;
      
      // Si ambos son del mismo tipo, ordenar alfabéticamente
      return a.full_name.localeCompare(b.full_name);
    });

    // Limitar a top 3 SOLO si NO hay búsqueda activa
    // Si hay búsqueda, mostrar todos los resultados
    if (searchQuery.trim()) {
      return filtered; // Mostrar todos los resultados de búsqueda
    }
    
    return filtered.slice(0, 3); // Sin búsqueda, mostrar solo top 3
  }, [availableBackups, searchQuery]);

  // Contar total de ejecutivos activos (incluyendo coordinadores)
  const totalActivos = availableBackups.length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Seleccionar Backup
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Elige un ejecutivo, supervisor o coordinador que atenderá tus prospectos mientras estés fuera
                </p>
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <strong>Nota:</strong> Si un ejecutivo no aparece, verifica que tenga número de teléfono configurado y esté activo.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Contador y buscador */}
            <div className="flex items-center justify-between gap-3 mt-4">
              {/* Contador */}
              <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                <Users className="w-4 h-4" />
                <span className="font-medium">
                  {totalActivos} {totalActivos === 1 ? 'disponible' : 'disponibles'}
                </span>
              </div>
              
              {/* Buscador */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 px-6 py-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {loadingBackups ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  Cargando ejecutivos disponibles...
                </span>
              </div>
            ) : availableBackups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No hay ejecutivos, supervisores ni coordinadores con teléfono disponibles en tu coordinación para asignar como backup.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Contacta a tu coordinador para más información.
                </p>
                
                {/* Mostrar usuarios activos que no cumplen requisitos */}
                {unavailableUsers.length > 0 && (
                  <div className="mt-4 w-full p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-left">
                    <div className="flex items-start space-x-2">
                      <PhoneOff className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-orange-800 dark:text-orange-200">
                          Usuarios activos sin configuración completa:
                        </p>
                        <ul className="mt-2 space-y-1">
                          {unavailableUsers.map(user => (
                            <li key={user.id} className="text-xs text-orange-700 dark:text-orange-300">
                              <strong>{user.full_name}</strong>
                              {user.reason === 'no_phone' && ' - Sin número de teléfono configurado'}
                              {user.reason === 'no_dynamics' && ' - Sin ID Dynamics configurado'}
                              {user.reason === 'no_phone_and_dynamics' && ' - Sin teléfono ni ID Dynamics'}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                          Contacte a soporte técnico para habilitar estos usuarios.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : filteredBackups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No se encontraron resultados para "{searchQuery}"
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Intenta con otro término de búsqueda.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Mensaje de usuarios no disponibles (cuando hay backups pero también hay usuarios sin configurar) */}
                {unavailableUsers.length > 0 && (
                  <div className="p-3 mb-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <PhoneOff className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-orange-800 dark:text-orange-200">
                          Usuarios activos sin configuración completa:
                        </p>
                        <ul className="mt-1.5 space-y-0.5">
                          {unavailableUsers.map(user => (
                            <li key={user.id} className="text-xs text-orange-700 dark:text-orange-300">
                              <strong>{user.full_name}</strong>
                              {user.reason === 'no_phone' && ' - Sin teléfono'}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-1.5 text-xs text-orange-600 dark:text-orange-400">
                          Contacte a soporte técnico para habilitarlos.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {filteredBackups.length < availableBackups.length && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2 mb-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    Mostrando top {filteredBackups.length} de {availableBackups.length} disponibles
                  </div>
                )}
                {filteredBackups.map((backup) => (
                  <motion.label
                    key={backup.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: availableBackups.indexOf(backup) * 0.05 }}
                    className={`relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      selectedBackupId === backup.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="backup"
                      value={backup.id}
                      checked={selectedBackupId === backup.id}
                      onChange={(e) => setSelectedBackupId(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center transition-all ${
                      selectedBackupId === backup.id
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {selectedBackupId === backup.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2.5 h-2.5 rounded-full bg-white"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {backup.full_name}
                        </span>
                        {backup.is_supervisor && (
                          <span className="text-xs px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-full font-medium">
                            Supervisor
                          </span>
                        )}
                        {backup.is_coordinator && !backup.is_supervisor && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full font-medium">
                            Coordinador
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {backup.phone || 'Sin teléfono'}
                        </span>
                      </div>
                    </div>
                    {selectedBackupId === backup.id && (
                      <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    )}
                  </motion.label>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
            {/* Alerta de confirmación para logout sin backup */}
            <AnimatePresence>
              {showConfirmNoBackup && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start space-x-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        ¿Seguro que deseas salir sin asignar un backup?
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Tus prospectos no estarán visibles para nadie mientras estés ausente.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowConfirmNoBackup(false)}
                      className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 text-xs font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-between items-center">
              {/* Botón discreto: Salir sin transferir (lado izquierdo) */}
              {onLogoutWithoutBackup && (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleLogoutWithoutBackup();
                  }}
                  disabled={loading}
                  className={`text-xs font-medium transition-all duration-200 flex items-center space-x-1.5 ${
                    showConfirmNoBackup
                      ? 'px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline decoration-dotted underline-offset-2'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading && showConfirmNoBackup ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5" />
                  )}
                  <span>{showConfirmNoBackup ? 'Confirmar salida' : 'Salir sin transferir'}</span>
                </motion.button>
              )}
              
              {/* Espacio vacío si no hay botón de logout sin backup */}
              {!onLogoutWithoutBackup && <div />}

              {/* Botones principales (lado derecho) */}
              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowConfirmNoBackup(false);
                    onCancel();
                  }}
                  disabled={loading}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirm}
                  disabled={loading || !selectedBackupId || filteredBackups.length === 0}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center space-x-2"
                >
                  {loading && !showConfirmNoBackup ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Asignando...</span>
                    </>
                  ) : (
                    <span>Confirmar y Cerrar Sesión</span>
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BackupSelectionModal;

