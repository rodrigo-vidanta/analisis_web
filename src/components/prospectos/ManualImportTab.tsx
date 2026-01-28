/**
 * ============================================
 * PESTAÑA DE IMPORTACIÓN MANUAL
 * ============================================
 * 
 * Permite buscar prospectos en Dynamics CRM por número de teléfono,
 * importarlos al sistema y gestionar importaciones masivas.
 * 
 * Incluye:
 * - Menú vertical lateral (Importación Individual, Masiva, Nuevo Prospecto)
 * - Búsqueda optimizada de prospectos en CRM
 * - Importación de contactos via webhook N8N
 * - Columna lateral de prospectos importados
 * - Navegación directa a conversaciones WhatsApp
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Phone, User, Mail, MapPin, Building, 
  AlertCircle, Loader2, CheckCircle, Download,
  Tag, Upload, UserPlus, MessageCircle, X
} from 'lucide-react';
import { dynamicsLeadService, type DynamicsLeadInfo } from '../../services/dynamicsLeadService';
import { importContactService, type ImportContactPayload } from '../../services/importContactService';
import { analysisSupabase } from '../../config/analysisSupabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

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

/**
 * Información de prospecto existente en BD
 */
interface ExistingProspect {
  id: string;
  nombre_completo: string;
  ejecutivo_nombre: string | null;
  coordinacion_nombre: string | null;
}

/**
 * Prospecto importado exitosamente
 */
interface ImportedProspect {
  id: string;
  nombre_completo: string;
  telefono: string;
  conversacion_id: string;
  fecha_importacion: string;
}

/**
 * Tipo de vista del menú lateral
 */
type MenuView = 'individual' | 'masiva' | 'nuevo';

export const ManualImportTab: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Estado del menú lateral
  const [currentView, setCurrentView] = useState<MenuView>('individual');
  
  // Estado de búsqueda
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [leadData, setLeadData] = useState<DynamicsLeadInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [existingProspect, setExistingProspect] = useState<ExistingProspect | null>(null);
  
  // Estado de importación
  const [isImporting, setIsImporting] = useState(false);
  const [importedProspects, setImportedProspects] = useState<ImportedProspect[]>([]);

  /**
   * Maneja la búsqueda por teléfono
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
    setSearchAttempted(true);

    try {
      // 🔍 PASO 1: Buscar primero en BD LOCAL por teléfono
      const { data: localData, error: localError } = await analysisSupabase
        .from('prospectos_con_ejecutivo_y_coordinacion')
        .select('id, nombre_completo, ejecutivo_nombre, coordinacion_nombre, whatsapp, telefono_principal')
        .or(`whatsapp.eq.${normalized},telefono_principal.eq.${normalized}`)
        .maybeSingle();

      if (localError && localError.code !== 'PGRST116') {
        console.error('Error al verificar prospecto en BD local:', localError);
      }

      if (localData) {
        // ✅ Ya existe en BD local
        setExistingProspect({
          id: localData.id,
          nombre_completo: localData.nombre_completo,
          ejecutivo_nombre: localData.ejecutivo_nombre,
          coordinacion_nombre: localData.coordinacion_nombre,
        });
        toast.error('Este prospecto ya existe en la base de datos');
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
   * Limpia la búsqueda
   */
  const handleClear = () => {
    setPhoneNumber('');
    setLeadData(null);
    setError(null);
    setSearchAttempted(false);
    setExistingProspect(null);
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
        // Datos del ejecutivo que solicita
        ejecutivo_nombre: user.full_name || user.email || 'Desconocido',
        ejecutivo_id: user.id,
        coordinacion_id: user.coordinacion_id || '',
        fecha_solicitud: new Date().toISOString(),
        // Datos completos del lead de Dynamics
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
        // Datos adicionales
        telefono: normalizePhone(phoneNumber),
        nombre_completo: leadData.Nombre,
        id_dynamics: leadData.LeadID,
      };

      const result = await importContactService.importContact(payload);

      if (result.success && result.prospecto_id) {
        // Mensaje personalizado según el status code
        let successMessage = result.message || 'Usuario importado exitosamente';
        
        if (result.statusCode === 200) {
          toast.success(successMessage, {
            duration: 4000,
            icon: '✅'
          });
        }
        
        // Agregar a la lista de importados
        const newImported: ImportedProspect = {
          id: result.prospecto_id,
          nombre_completo: leadData.Nombre,
          telefono: normalizePhone(phoneNumber),
          conversacion_id: result.conversacion_id || '',
          fecha_importacion: new Date().toISOString()
        };
        
        setImportedProspects(prev => [newImported, ...prev]);
        
        // Limpiar el formulario
        handleClear();
      } else {
        // Mensajes de error personalizados según código
        let errorMessage = result.message || 'Error al importar el contacto';
        let errorIcon = '❌';
        
        switch (result.statusCode) {
          case 400:
            errorIcon = '⚠️';
            errorMessage = `${errorMessage}\n${result.error || 'Datos inválidos o incompletos'}`;
            break;
          case 401:
            errorIcon = '🔒';
            errorMessage = 'Error de autenticación. Por favor, recarga la página e intenta de nuevo.';
            break;
          case 500:
            errorIcon = '🔥';
            errorMessage = 'Error interno del servidor. Intenta de nuevo en unos momentos.';
            break;
          default:
            errorMessage = `${errorMessage}\n${result.error || 'Error desconocido'}`;
        }
        
        toast.error(errorMessage, {
          duration: 5000,
          icon: errorIcon
        });
      }
    } catch (error) {
      console.error('Error en importación:', error);
      toast.error('Error al importar el contacto');
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Navega a la conversación de WhatsApp
   */
  const handleGoToConversation = (conversacionId: string) => {
    navigate(`/live-chat?conversation=${conversacionId}`);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ============================================
          SIDEBAR IZQUIERDO - NAVEGACIÓN
          ============================================ */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {/* Header del sidebar */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Importación
            </h2>
          </div>

          {/* Navegación de pestañas */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {/* Importación Individual */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentView('individual')}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                currentView === 'individual'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-500'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className={`mr-3 ${
                currentView === 'individual' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400'
              }`}>
                <Search size={20} />
              </span>
              <span>Individual</span>
            </motion.button>

            {/* Importación Masiva */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentView('masiva')}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                currentView === 'masiva'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-500'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className={`mr-3 ${
                currentView === 'masiva' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400'
              }`}>
                <Upload size={20} />
              </span>
              <span>Masiva</span>
            </motion.button>

            {/* Nuevo Prospecto */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentView('nuevo')}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                currentView === 'nuevo'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-500'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className={`mr-3 ${
                currentView === 'nuevo' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400'
              }`}>
                <UserPlus size={20} />
              </span>
              <span>Nuevo</span>
            </motion.button>
          </nav>

          {/* Footer con estadísticas */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <CheckCircle size={14} className="text-emerald-500" />
              <span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{importedProspects.length}</span> importados hoy
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================
          CONTENIDO PRINCIPAL
          ============================================ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Contenido de las pestañas */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="w-full max-w-[98%] 2xl:max-w-[96%] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-6 lg:py-8">
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
              <div className="p-4 sm:p-5 md:p-6 lg:p-8">
                <AnimatePresence mode="wait">
                  {currentView === 'individual' && (
                    <IndividualImportView
                      key="individual"
                      phoneNumber={phoneNumber}
                      setPhoneNumber={setPhoneNumber}
                      isSearching={isSearching}
                      leadData={leadData}
                      error={error}
                      existingProspect={existingProspect}
                      isImporting={isImporting}
                      handleSearch={handleSearch}
                      handleClear={handleClear}
                      handleImport={handleImport}
                    />
                  )}
                  {currentView === 'masiva' && (
                    <MassiveImportView key="masiva" />
                  )}
                  {currentView === 'nuevo' && (
                    <NewProspectView key="nuevo" />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================
          SIDEBAR DERECHO - PROSPECTOS IMPORTADOS
          ============================================ */}
      <div className="hidden xl:flex xl:flex-shrink-0">
        <div className="flex flex-col w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {/* Header del sidebar derecho */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-500" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Importados Hoy
              </h2>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {importedProspects.length}
            </span>
          </div>

          {/* Lista de prospectos importados */}
          <div className="flex-1 px-4 py-6 space-y-3 overflow-y-auto">
            {importedProspects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <MessageCircle size={32} className="text-gray-400 mb-3" />
                <p className="text-xs font-medium text-gray-900 dark:text-white mb-1">
                  Sin prospectos importados
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Los prospectos que importes aparecerán aquí
                </p>
              </div>
            ) : (
              importedProspects.map((prospect, index) => (
                <motion.div
                  key={prospect.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleGoToConversation(prospect.conversacion_id)}
                  className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-2.5">
                    {/* Avatar con inicial */}
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">
                        {prospect.nombre_completo.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Información del prospecto */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate mb-1">
                        {prospect.nombre_completo}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400 mb-1.5">
                        <Phone size={10} />
                        <span>{formatPhoneDisplay(prospect.telefono)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 dark:text-gray-500">
                          {new Date(prospect.fecha_importacion).toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <MessageCircle 
                          size={12} 
                          className="text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" 
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// VISTA DE IMPORTACIÓN INDIVIDUAL
// ============================================

interface IndividualImportViewProps {
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  isSearching: boolean;
  leadData: DynamicsLeadInfo | null;
  error: string | null;
  existingProspect: ExistingProspect | null;
  isImporting: boolean;
  handleSearch: () => void;
  handleClear: () => void;
  handleImport: () => void;
}

const IndividualImportView: React.FC<IndividualImportViewProps> = ({
  phoneNumber,
  setPhoneNumber,
  isSearching,
  leadData,
  error,
  existingProspect,
  isImporting,
  handleSearch,
  handleClear,
  handleImport
}) => {
  return (
    <div className="space-y-6">
      {/* Buscador */}
      <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="space-y-4">
          {/* Label */}
          <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <Phone size={16} className="text-gray-400" />
            <span>Número de Teléfono</span>
          </label>

          {/* Input */}
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            placeholder="3331234567"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            disabled={isSearching}
          />

          {/* Botones */}
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSearch}
              disabled={isSearching || !phoneNumber.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 text-sm"
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

            {leadData && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleClear}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm"
              >
                <X size={18} />
                <span>Limpiar</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Resultados */}
      <AnimatePresence mode="wait">
        {/* Error */}
        {error && !leadData && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={18} className="text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-900 dark:text-red-200 mb-1">
                  Lead no encontrado
                </h4>
                <p className="text-xs text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Prospecto ya existe */}
        {existingProspect && leadData && (
          <motion.div
            key="warning"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-2">
                  Prospecto ya existe en el sistema
                </h4>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-amber-700 dark:text-amber-400" />
                    <span className="text-xs text-amber-800 dark:text-amber-300">
                      <span className="font-semibold">Nombre:</span> {existingProspect.nombre_completo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-amber-700 dark:text-amber-400" />
                    <span className="text-xs text-amber-800 dark:text-amber-300">
                      <span className="font-semibold">Ejecutivo:</span> {existingProspect.ejecutivo_nombre || 'Sin asignar'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building size={14} className="text-amber-700 dark:text-amber-400" />
                    <span className="text-xs text-amber-800 dark:text-amber-300">
                      <span className="font-semibold">Coordinación:</span> {existingProspect.coordinacion_nombre || 'Sin coordinación'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Lead encontrado */}
        {leadData && (
          <motion.div
            key="data"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Botón importar */}
            {!existingProspect && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleImport}
                disabled={isImporting}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25 text-sm"
              >
                {isImporting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Importando prospecto...</span>
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    <span>Importar Prospecto al Sistema</span>
                  </>
                )}
              </motion.button>
            )}

            {/* Info del lead */}
            <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      Lead Encontrado
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Información de Dynamics CRM
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-3">
                <DataField icon={<User />} label="Nombre Completo" value={leadData.Nombre} />
                <DataField icon={<Mail />} label="Correo Electrónico" value={leadData.Email} />
                <DataField icon={<MapPin />} label="País" value={leadData.Pais} />
                <DataField icon={<Building />} label="Coordinación" value={leadData.Coordinacion} badge />
                <DataField icon={<User />} label="Propietario" value={leadData.Propietario} />
                <DataField icon={<Tag />} label="ID de Lead" value={leadData.LeadID} mono />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// COMPONENTE DE CAMPO DE DATOS
// ============================================

interface DataFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  badge?: boolean;
  mono?: boolean;
}

const DataField: React.FC<DataFieldProps> = ({ icon, label, value, badge = false, mono = false }) => {
  const displayValue = value || '—';

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
      <div className="flex-shrink-0 text-gray-400 mt-0.5">
        {React.cloneElement(icon as React.ReactElement, { size: 16 })}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          {label}
        </div>
        {badge && value ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {displayValue}
          </span>
        ) : (
          <div className={`text-xs font-medium text-gray-900 dark:text-white ${mono ? 'font-mono' : ''} break-words`}>
            {displayValue}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// VISTA DE IMPORTACIÓN MASIVA (Placeholder)
// ============================================

const MassiveImportView: React.FC = () => {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Upload size={36} className="text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Importación Masiva
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Esta funcionalidad estará disponible próximamente
        </p>
      </div>
    </div>
  );
};

// ============================================
// VISTA DE NUEVO PROSPECTO (Placeholder)
// ============================================

const NewProspectView: React.FC = () => {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <UserPlus size={36} className="text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Nuevo Prospecto
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Esta funcionalidad estará disponible próximamente
        </p>
      </div>
    </div>
  );
};

export default ManualImportTab;
