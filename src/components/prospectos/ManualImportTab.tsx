/**
 * ============================================
 * PESTAÑA DE IMPORTACIÓN MANUAL
 * ============================================
 * 
 * Permite buscar prospectos en Dynamics CRM por número de teléfono
 * y visualizar los datos obtenidos.
 * 
 * Reutiliza el edge function: dynamics-lead-proxy
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Phone, User, Mail, MapPin, Building, 
  AlertCircle, Loader2, CheckCircle, Download,
  Calendar, Tag, Users, TrendingUp, AlertTriangle
} from 'lucide-react';
import { dynamicsLeadService, type DynamicsLeadInfo } from '../../services/dynamicsLeadService';
import { analysisSupabase } from '../../config/analysisSupabase';
import toast from 'react-hot-toast';

/**
 * Normaliza número de teléfono a 10 dígitos
 */
const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-10); // Últimos 10 dígitos
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

export const ManualImportTab: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [leadData, setLeadData] = useState<DynamicsLeadInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [existingProspect, setExistingProspect] = useState<ExistingProspect | null>(null);

  /**
   * Maneja la búsqueda por teléfono
   */
  const handleSearch = async () => {
    // Validar que hay un número
    if (!phoneNumber.trim()) {
      toast.error('Ingresa un número de teléfono');
      return;
    }

    // Normalizar y validar que tenga 10 dígitos
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
      const result = await dynamicsLeadService.searchLead({ phone: normalized });

      if (result.success && result.data) {
        // Verificar si el id_dynamics ya existe en la base de datos
        const { data: existingData, error: dbError } = await analysisSupabase
          .from('prospectos_con_ejecutivo_y_coordinacion')
          .select('id, nombre_completo, ejecutivo_nombre, coordinacion_nombre')
          .eq('id_dynamics', result.data.LeadID)
          .maybeSingle();

        if (dbError) {
          console.error('Error al verificar prospecto existente:', dbError);
        }

        if (existingData) {
          // Prospecto ya existe
          setExistingProspect({
            id: existingData.id,
            nombre_completo: existingData.nombre_completo,
            ejecutivo_nombre: existingData.ejecutivo_nombre,
            coordinacion_nombre: existingData.coordinacion_nombre,
          });
          toast.error('Este prospecto ya existe en la base de datos');
        }

        setLeadData(result.data);
        
        if (!existingData) {
          toast.success('Lead encontrado en Dynamics CRM');
        }
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Download size={24} className="text-blue-600 dark:text-blue-400" />
              Importación Manual
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Busca prospectos en Dynamics CRM por número de teléfono
            </p>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Buscador */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Buscar por Teléfono
              </h3>
            </div>

            <div className="space-y-4">
              {/* Input de teléfono */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Phone size={20} />
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  placeholder="Ej: 5512345678 o (55) 1234-5678"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                  disabled={isSearching}
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSearch}
                  disabled={isSearching || !phoneNumber.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
                >
                  {isSearching ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Buscando...</span>
                    </>
                  ) : (
                    <>
                      <Search size={20} />
                      <span>Buscar en Dynamics</span>
                    </>
                  )}
                </motion.button>

                {(leadData || error || searchAttempted) && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClear}
                    className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all"
                  >
                    Limpiar
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Resultados */}
          <AnimatePresence mode="wait">
            {/* Error */}
            {error && !leadData && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle size={24} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-1">
                      No se encontró el lead
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {error}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Advertencia: Prospecto ya existe */}
            {existingProspect && leadData && (
              <motion.div
                key="warning"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-6 shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                      <AlertTriangle size={24} className="text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-amber-900 dark:text-amber-200 mb-2">
                      ⚠️ Este prospecto ya existe en la base de datos
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-amber-800 dark:text-amber-300">
                        <span className="font-semibold">Nombre:</span> {existingProspect.nombre_completo}
                      </p>
                      <p className="text-amber-800 dark:text-amber-300">
                        <span className="font-semibold">Asignado a:</span>{' '}
                        {existingProspect.ejecutivo_nombre || 'Sin ejecutivo asignado'}
                      </p>
                      <p className="text-amber-800 dark:text-amber-300">
                        <span className="font-semibold">Coordinación:</span>{' '}
                        {existingProspect.coordinacion_nombre || 'Sin coordinación asignada'}
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-amber-300 dark:border-amber-700">
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Los datos de Dynamics CRM se muestran a continuación solo como referencia.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Datos del Lead */}
            {leadData && (
              <motion.div
                key="data"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
              >
                {/* Header de resultados */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-b border-emerald-200 dark:border-emerald-800 p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                      <CheckCircle size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Lead Encontrado
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Información de Dynamics CRM
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grid de información */}
                <div className="p-6 space-y-6">
                  {/* Sección 1: Información Personal */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Información Personal
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoField
                        icon={<User size={18} />}
                        label="Nombre Completo"
                        value={leadData.Nombre}
                      />
                      <InfoField
                        icon={<Mail size={18} />}
                        label="Email"
                        value={leadData.Email}
                      />
                      <InfoField
                        icon={<Tag size={18} />}
                        label="Estado Civil"
                        value={leadData.EstadoCivil}
                      />
                      <InfoField
                        icon={<Building size={18} />}
                        label="Ocupación"
                        value={leadData.Ocupacion}
                      />
                    </div>
                  </div>

                  {/* Sección 2: Ubicación */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Ubicación
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoField
                        icon={<MapPin size={18} />}
                        label="País"
                        value={leadData.Pais}
                      />
                      <InfoField
                        icon={<MapPin size={18} />}
                        label="Estado"
                        value={leadData.EntidadFederativa}
                      />
                    </div>
                  </div>

                  {/* Sección 3: Asignación CRM */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Asignación en CRM
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoField
                        icon={<Building size={18} />}
                        label="Coordinación"
                        value={leadData.Coordinacion}
                        badge={true}
                      />
                      <InfoField
                        icon={<Users size={18} />}
                        label="Propietario"
                        value={leadData.Propietario}
                      />
                    </div>
                  </div>

                  {/* Sección 4: Información CRM */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Datos CRM
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <InfoField
                        icon={<Tag size={18} />}
                        label="ID Lead"
                        value={leadData.LeadID}
                        mono={true}
                      />
                      <InfoField
                        icon={<TrendingUp size={18} />}
                        label="Calificación"
                        value={leadData.Calificacion}
                        badge={true}
                      />
                      <InfoField
                        icon={<Calendar size={18} />}
                        label="Última Llamada"
                        value={dynamicsLeadService.formatFechaUltimaLlamada(leadData.FechaUltimaLlamada)}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

/**
 * Componente para mostrar un campo de información
 */
interface InfoFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  badge?: boolean;
  mono?: boolean;
}

const InfoField: React.FC<InfoFieldProps> = ({ icon, label, value, badge = false, mono = false }) => {
  const displayValue = value || '—';

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 group hover:border-gray-300 dark:hover:border-gray-600 transition-all">
      <div className="flex-shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          {label}
        </div>
        {badge ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {displayValue}
          </span>
        ) : (
          <div className={`text-sm font-medium text-gray-900 dark:text-white ${mono ? 'font-mono text-xs' : ''} break-words`}>
            {displayValue}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualImportTab;
