/**
 * ============================================
 * MODAL DE IMPORTACIÓN RÁPIDA
 * ============================================
 * 
 * Modal compacto para importar prospectos desde WhatsApp
 * - Campo de teléfono (solo números, máx 10 dígitos)
 * - Búsqueda en Dynamics CRM
 * - Vista resumida de datos
 * - Importación directa o indicador de existencia
 * - Navegación automática a conversación
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, Phone, User, Mail, Building, 
  AlertCircle, Loader2, Download, CheckCircle, ShieldAlert 
} from 'lucide-react';
import { dynamicsLeadService, type DynamicsLeadInfo } from '../../services/dynamicsLeadService';
import { importContactService, type ImportContactPayload } from '../../services/importContactService';
import { analysisSupabase } from '../../config/analysisSupabase';
import { useAuth } from '../../contexts/AuthContext';
import { useEffectivePermissions } from '../../hooks/useEffectivePermissions';
import toast from 'react-hot-toast';

interface QuickImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (prospectoId: string) => void; // Cambiado de conversacionId a prospectoId
}

interface ExistingProspect {
  id: string;
  nombre_completo: string;
  conversacion_id: string | null;
  ejecutivo_id: string | null;
  coordinacion_id: string | null;
}

/**
 * Normaliza número de teléfono a 10 dígitos
 */
const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-10);
};

/**
 * Formatea número de teléfono para visualización
 */
const formatPhoneDisplay = (phone: string): string => {
  const normalized = normalizePhone(phone);
  if (normalized.length === 10) {
    return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }
  return phone;
};

export const QuickImportModal: React.FC<QuickImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const { isAdmin, isCoordinadorCalidad, isOperativo } = useEffectivePermissions();
  
  // Estado del formulario
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [leadData, setLeadData] = useState<DynamicsLeadInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existingProspect, setExistingProspect] = useState<ExistingProspect | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  /**
   * Maneja cambios en el input de teléfono (solo números, máx 10)
   */
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Solo números
    if (value.length <= 10) {
      setPhoneNumber(value);
    }
  };

  /**
   * Verifica si el usuario tiene permiso para ver/acceder este prospecto
   */
  const canAccessProspect = (prospect: ExistingProspect): boolean => {
    // Administradores, coordinadores de calidad y operativos pueden ver todos
    if (isAdmin || isCoordinadorCalidad || isOperativo) {
      return true;
    }

    // Coordinadores: deben coincidir las coordinaciones
    if (user?.is_coordinador && user?.coordinacion_id) {
      return prospect.coordinacion_id === user.coordinacion_id;
    }

    // Ejecutivos: debe coincidir el ejecutivo_id
    if (user?.is_ejecutivo && prospect.ejecutivo_id) {
      return prospect.ejecutivo_id === user.id;
    }

    // Por defecto, no tiene acceso
    return false;
  };

  /**
   * Normaliza número de teléfono (elimina +52 si existe)
   */
  const normalizePhone = (phone: string): string => {
    return phone.replace(/^\+?52/, '').replace(/\D/g, '');
  };

  /**
   * Busca el prospecto en BD LOCAL por teléfono
   */
  const searchLocalProspect = async (phone: string): Promise<ExistingProspect | null> => {
    try {
      const normalizedPhone = normalizePhone(phone);
      
      const { data: existingData, error: dbError } = await analysisSupabase
        .from('prospectos')
        .select('id, nombre_completo, ejecutivo_id, coordinacion_id')
        .eq('whatsapp', normalizedPhone)
        .maybeSingle();

      if (dbError && dbError.code !== 'PGRST116') {
        console.error('Error al verificar prospecto:', dbError);
        return null;
      }

      if (!existingData) {
        return null;
      }

      // Buscar conversación asociada (query separada)
      const { data: conversacionData } = await analysisSupabase
        .from('conversaciones_whatsapp')
        .select('id')
        .eq('prospecto_id', existingData.id)
        .maybeSingle();

      return {
        id: existingData.id,
        nombre_completo: existingData.nombre_completo,
        conversacion_id: conversacionData?.id || null,
        ejecutivo_id: existingData.ejecutivo_id,
        coordinacion_id: existingData.coordinacion_id
      };
    } catch (error) {
      console.error('Error en búsqueda local:', error);
      return null;
    }
  };

  /**
   * Busca el lead en Dynamics CRM
   */
  const handleSearch = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Ingresa un número de teléfono');
      return;
    }

    const normalized = normalizePhone(phoneNumber);
    if (normalized.length !== 10) {
      toast.error('El número debe tener 10 dígitos');
      return;
    }

    setIsSearching(true);
    setError(null);
    setLeadData(null);
    setExistingProspect(null);

    try {
      // 🔍 PASO 1: Buscar primero en BD LOCAL por teléfono
      const localProspect = await searchLocalProspect(normalized);

      if (localProspect) {
        // ✅ Ya existe en BD local
        setExistingProspect(localProspect);
        
        if (localProspect.conversacion_id) {
          toast.error('Este prospecto ya existe en el sistema');
        } else {
          toast.error('Este prospecto existe pero no tiene conversación de WhatsApp');
        }
        
        setIsSearching(false);
        return; // ⛔ Detener aquí, no buscar en Dynamics
      }

      // 🔍 PASO 2: Si NO existe en BD, buscar en Dynamics
      const result = await dynamicsLeadService.searchLead({ phone: normalized });

      if (result.success && result.data) {
        setLeadData(result.data);
        toast.success('Lead encontrado en Dynamics CRM');
      } else {
        setError(result.error || 'Lead no encontrado en Dynamics CRM');
        toast.error(result.error || 'No se encontró el lead');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al buscar en Dynamics';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Importa el prospecto al sistema
   */
  const handleImport = async () => {
    if (!leadData || !user) {
      toast.error('Faltan datos requeridos para la importación');
      return;
    }

    setIsImporting(true);

    try {
      const payload: ImportContactPayload = {
        ejecutivo_nombre: user.full_name || user.email || 'Desconocido',
        ejecutivo_id: user.id,
        coordinacion_id: user.coordinacion_id || '',
        fecha_solicitud: new Date().toISOString(),
        lead_dynamics: {
          LeadID: leadData.LeadID,
          Nombre: leadData.Nombre,
          Email: leadData.Email,
          EstadoCivil: leadData.EstadoCivil || null,
          Ocupacion: leadData.Ocupacion || null,
          Pais: leadData.Pais || null,
          EntidadFederativa: leadData.EntidadFederativa || null,
          Coordinacion: leadData.Coordinacion || null,
          CoordinacionID: leadData.CoordinacionID || null,
          Propietario: leadData.Propietario || null,
          OwnerID: leadData.OwnerID || null,
          FechaUltimaLlamada: leadData.FechaUltimaLlamada || null,
          Calificacion: leadData.Calificacion || null,
        },
        telefono: normalizePhone(phoneNumber),
        nombre_completo: leadData.Nombre,
        id_dynamics: leadData.LeadID,
      };

      const result = await importContactService.importContact(payload);

      if (result.success && result.prospecto_id) {
        toast.success('Prospecto importado exitosamente');
        
        // 🔍 Buscar el prospecto recién creado en BD por teléfono para mayor seguridad
        console.log('🔍 Buscando prospecto recién importado en BD...');
        
        // Esperar 2 segundos para que el backend procese
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const normalizedPhone = normalizePhone(phoneNumber);
        const { data: prospectoCreado, error: searchError } = await analysisSupabase
          .from('prospectos')
          .select('*')
          .or(`whatsapp.eq.${normalizedPhone},telefono_principal.eq.${normalizedPhone},id_dynamics.eq.${leadData.LeadID}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (searchError || !prospectoCreado) {
          console.error('❌ Error al buscar prospecto recién creado:', searchError);
          console.warn('📞 Teléfono buscado:', normalizedPhone);
          console.warn('🆔 ID Dynamics:', leadData.LeadID);
          toast.error('Prospecto importado pero no se pudo cargar para enviar plantilla');
          setIsImporting(false);
          return;
        }

        console.log('✅ Prospecto encontrado en BD:', prospectoCreado.id);
        
        // Cerrar el modal de importación rápida
        onClose();
        
        // Abrir el modal de enviar plantilla con los datos completos de BD
        onSuccess(prospectoCreado.id);
      } else {
        toast.error(result.error || 'Error al importar el contacto');
      }
    } catch (error) {
      console.error('Error en importación:', error);
      toast.error('Error al importar el contacto');
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Navega a la conversación existente
   */
  const handleGoToConversation = () => {
    if (!existingProspect) return;

    if (existingProspect.conversacion_id) {
      // Si tiene conversación, redirigir directamente
      window.location.href = `/live-chat?conversation=${existingProspect.conversacion_id}`;
    } else {
      // Si no tiene conversación, pasar el prospecto_id para abrir modal de plantilla
      onSuccess(existingProspect.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
                    <Search size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Nueva Conversación
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Buscar prospecto por teléfono
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={18} />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Campo de teléfono */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <Phone size={14} className="text-gray-400" />
                  <span>Número de Teléfono</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                    placeholder="3331234567"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium"
                    disabled={isSearching}
                    autoFocus
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    {phoneNumber.length}/10
                  </div>
                </div>
              </div>

              {/* Botón de búsqueda */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSearch}
                disabled={isSearching || phoneNumber.length !== 10}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25 text-sm"
              >
                {isSearching ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Buscando...</span>
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    <span>Buscar en CRM</span>
                  </>
                )}
              </motion.button>

              {/* Resultados */}
              <AnimatePresence mode="wait">
                {/* Error */}
                {error && !leadData && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-red-900 dark:text-red-200">
                          Lead no encontrado
                        </h4>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          {error}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Lead encontrado */}
                {leadData && (
                  <motion.div
                    key="data"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3"
                  >
                    {/* Advertencia si ya existe */}
                    {existingProspect && (
                      <>
                        {/* Advertencia si no tiene permisos */}
                        {!canAccessProspect(existingProspect) ? (
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                              <ShieldAlert size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <h4 className="text-sm font-bold text-red-900 dark:text-red-200 mb-2">
                                  Sin permisos de acceso
                                </h4>
                                <p className="text-xs text-red-700 dark:text-red-300">
                                  Este prospecto pertenece a otra coordinación o ejecutivo. No tienes permisos para acceder a esta conversación.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                              <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-2">
                                  {existingProspect.conversacion_id 
                                    ? 'Prospecto ya existe' 
                                    : 'Prospecto existe sin conversación'}
                                </h4>
                                <p className="text-xs text-amber-800 dark:text-amber-300">
                                  {existingProspect.nombre_completo}
                                </p>
                              </div>
                            </div>
                            {existingProspect.conversacion_id ? (
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleGoToConversation}
                                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-sm transition-colors"
                              >
                                <CheckCircle size={16} />
                                <span>Ir a Conversación</span>
                              </motion.button>
                            ) : (
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleImport}
                                disabled={isImporting}
                                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
                              >
                                {isImporting ? (
                                  <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Importando...</span>
                                  </>
                                ) : (
                                  <>
                                    <Download size={16} />
                                    <span>Importar y Enviar Plantilla</span>
                                  </>
                                )}
                              </motion.button>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {/* Datos del lead */}
                    <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                            Lead Encontrado
                          </h4>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <DataField icon={<User />} label="Nombre" value={leadData.Nombre} />
                        <DataField icon={<Mail />} label="Email" value={leadData.Email} />
                        <DataField icon={<Building />} label="Coordinación" value={leadData.Coordinacion} />
                      </div>
                    </div>

                    {/* Botón de importación */}
                    {!existingProspect && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleImport}
                        disabled={isImporting}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 text-sm"
                      >
                        {isImporting ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>Importando...</span>
                          </>
                        ) : (
                          <>
                            <Download size={18} />
                            <span>Importar y Enviar Plantilla</span>
                          </>
                        )}
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Componente helper para mostrar campos
interface DataFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}

const DataField: React.FC<DataFieldProps> = ({ icon, label, value }) => {
  const displayValue = value || '—';

  return (
    <div className="flex items-start gap-2">
      <div className="text-gray-400 mt-0.5">
        {React.cloneElement(icon as React.ReactElement, { size: 14 })}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {label}
        </div>
        <div className="text-xs font-medium text-gray-900 dark:text-white truncate mt-0.5">
          {displayValue}
        </div>
      </div>
    </div>
  );
};

export default QuickImportModal;
