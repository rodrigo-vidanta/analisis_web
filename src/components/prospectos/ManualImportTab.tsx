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
 * - Modal de importación (REUTILIZA ImportWizardModal de WhatsApp)
 * - Columna lateral de prospectos importados
 * - Navegación directa a conversaciones WhatsApp
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Upload, UserPlus, MessageCircle, CheckCircle, Phone
} from 'lucide-react';
import { ImportWizardModal } from '../chat/ImportWizardModal';
import { analysisSupabase } from '../../config/analysisSupabase';
import toast from 'react-hot-toast';


/**
 * Formatea número de teléfono para visualización
 */
const formatPhoneDisplay = (phone: string): string => {
  const normalized = phone.replace(/\D/g, '').slice(-10);
  if (normalized.length === 10) {
    return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }
  return phone;
};

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
  
  // Estado del menú lateral
  const [currentView, setCurrentView] = useState<MenuView>('individual');
  
  // Estado del modal de importación (REUTILIZA ImportWizardModal)
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Estado de prospectos importados
  const [importedProspects, setImportedProspects] = useState<ImportedProspect[]>([]);

  /**
   * Maneja el éxito de la importación
   */
  const handleImportSuccess = async (prospectoId: string, conversacionId?: string) => {
    setShowImportModal(false);
    
    // Agregar a la lista de importados (buscar datos del prospecto)
    try {
      // Esperar un poco para que la BD se actualice
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Consultar datos del prospecto recién importado
      const { data: prospectoData } = await analysisSupabase
        .from('prospectos')
        .select('id, nombre_completo, telefono_principal, whatsapp')
        .eq('id', prospectoId)
        .single();
      
      if (prospectoData) {
        const newImported: ImportedProspect = {
          id: prospectoData.id,
          nombre_completo: prospectoData.nombre_completo,
          telefono: prospectoData.telefono_principal || prospectoData.whatsapp || '',
          conversacion_id: conversacionId || '',
          fecha_importacion: new Date().toISOString()
        };
        
        setImportedProspects(prev => [newImported, ...prev]);
        toast.success(`Prospecto ${prospectoData.nombre_completo} importado exitosamente`);
      }
    } catch (error) {
      console.error('Error al cargar datos del prospecto importado:', error);
    }
  };

  /**
   * Navega a la conversación de WhatsApp
   */
  const handleGoToConversation = (conversacionId: string) => {
    if (conversacionId) {
      navigate(`/live-chat?conversation=${conversacionId}`);
    } else {
      toast.error('No hay conversación de WhatsApp asociada');
    }
  };

  /**
   * Abre el modal de importación
   */
  const handleOpenImportModal = () => {
    setShowImportModal(true);
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
                      onOpenImportModal={handleOpenImportModal}
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

      {/* ============================================
          MODAL DE IMPORTACIÓN (REUTILIZA ImportWizardModal de WhatsApp)
          ============================================ */}
      <ImportWizardModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
};

// ============================================
// VISTA DE IMPORTACIÓN INDIVIDUAL
// ============================================

interface IndividualImportViewProps {
  onOpenImportModal: () => void;
}

const IndividualImportView: React.FC<IndividualImportViewProps> = ({
  onOpenImportModal
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Importar Prospecto Individual
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Busca un prospecto en Dynamics CRM, verifica sus datos y valida permisos antes de importar
        </p>
      </div>

      {/* Botón principal para abrir modal */}
      <div className="flex justify-center py-12">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onOpenImportModal}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/25 text-base"
        >
          <Search size={20} />
          <span>Buscar e Importar Prospecto</span>
        </motion.button>
      </div>

      {/* Info adicional */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-900/10 dark:via-gray-800 dark:to-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
          ¿Qué incluye el proceso de importación?
        </h4>
        <ul className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
          <li className="flex items-start gap-2">
            <CheckCircle size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <span><strong>Búsqueda en BD Local:</strong> Verifica si el prospecto ya existe en el sistema</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <span><strong>Búsqueda en Dynamics CRM:</strong> Si no existe, busca en la base de datos de Microsoft Dynamics</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <span><strong>Validación de Permisos:</strong> Verifica que tienes permisos para importar según la coordinación del prospecto</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <span><strong>Selección de Plantilla:</strong> Opcional - Puedes enviar una plantilla de WhatsApp al prospecto recién importado</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <span><strong>Confirmación:</strong> Revisa toda la información antes de confirmar la importación</span>
          </li>
        </ul>
      </div>
    </div>
  );
};


// ============================================
// COMPONENTE DE CAMPO DE DATOS (Eliminado - Ya no se usa)
// ============================================

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
