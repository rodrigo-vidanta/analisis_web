// ============================================
// MODAL DE REPORTE DE FALLA
// ============================================
// Captura automática de pantalla y recopilación de contexto

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { ticketService } from '../../services/ticketService';
import { analysisSupabase } from '../../config/analysisSupabase';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModule?: string;
  prospectoId?: string;
  prospectoNombre?: string;
}

// Obtener versión del footer
const getAppVersion = (): string => {
  // Buscar en el footer o en window
  const footerVersion = document.querySelector('[data-version]')?.getAttribute('data-version');
  if (footerVersion) return footerVersion;
  
  // Buscar en el texto del footer
  const footerText = document.querySelector('footer')?.textContent;
  const versionMatch = footerText?.match(/B\d+\.\d+\.\d+N\d+\.\d+\.\d+/);
  if (versionMatch) return versionMatch[0];
  
  return 'No detectada';
};

// Obtener detalles de sesión y navegador
const getSessionDetails = () => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    colorDepth: window.screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cookiesEnabled: navigator.cookieEnabled,
    online: navigator.onLine,
    deviceMemory: (navigator as any).deviceMemory || 'No disponible',
    hardwareConcurrency: navigator.hardwareConcurrency || 'No disponible',
    timestamp: new Date().toISOString(),
    url: window.location.href,
    referrer: document.referrer || 'Directo'
  };
};

const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  currentModule,
  prospectoId,
  prospectoNombre
}) => {
  const { user } = useAuth();
  const [isCapturing, setIsCapturing] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionDetails, setSessionDetails] = useState<Record<string, any>>({});
  const [appVersion, setAppVersion] = useState('');

  // Capturar pantalla al abrir el modal
  const captureScreen = useCallback(async () => {
    setIsCapturing(true);
    try {
      // Ocultar temporalmente el modal backdrop para la captura
      const modalBackdrop = document.querySelector('[data-modal-backdrop]');
      if (modalBackdrop) {
        (modalBackdrop as HTMLElement).style.display = 'none';
      }

      // Capturar la pantalla
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 0.8, // Reducir tamaño para optimizar
        logging: false,
        ignoreElements: (element) => {
          // Ignorar modales y overlays
          return element.hasAttribute('data-modal-backdrop') || 
                 element.classList.contains('Toastify');
        }
      });

      // Restaurar modal
      if (modalBackdrop) {
        (modalBackdrop as HTMLElement).style.display = '';
      }

      // Convertir a base64
      const base64 = canvas.toDataURL('image/jpeg', 0.7);
      setScreenshot(base64);
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      toast.error('No se pudo capturar la pantalla');
    } finally {
      setIsCapturing(false);
    }
  }, []);

  // Inicializar al abrir
  useEffect(() => {
    if (isOpen) {
      setSessionDetails(getSessionDetails());
      setAppVersion(getAppVersion());
      // Pequeño delay para que el modal se oculte antes de capturar
      const timer = setTimeout(() => {
        captureScreen();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // Limpiar al cerrar
      setScreenshot(null);
      setDescription('');
    }
  }, [isOpen, captureScreen]);

  // Subir screenshot a Supabase Storage
  const uploadScreenshot = async (base64Data: string): Promise<string | null> => {
    try {
      // Convertir base64 a blob
      const base64Response = await fetch(base64Data);
      const blob = await base64Response.blob();
      
      // Generar nombre único
      const fileName = `screenshot-${user?.id || 'unknown'}-${Date.now()}.jpg`;
      
      // Subir al bucket support-tickets
      const { data, error } = await analysisSupabase.storage
        .from('support-tickets')
        .upload(`screenshots/${fileName}`, blob, {
          contentType: 'image/jpeg',
          upsert: false,
          cacheControl: '3600'
        });

      if (error) {
        console.error('Error uploading screenshot:', error);
        return null;
      }

      // Obtener URL pública
      const { data: { publicUrl } } = analysisSupabase.storage
        .from('support-tickets')
        .getPublicUrl(`screenshots/${fileName}`);

      console.log('✅ Screenshot subido:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      return null;
    }
  };

  // Enviar reporte
  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Por favor describe el problema');
      return;
    }

    if (!user) {
      toast.error('Debes estar autenticado');
      return;
    }

    setIsSubmitting(true);
    try {
      // Subir screenshot si existe
      let screenshotUrl: string | undefined;
      if (screenshot) {
        const url = await uploadScreenshot(screenshot);
        if (url) {
          screenshotUrl = url;
        }
      }

      const { ticket, error } = await ticketService.createTicket({
        type: 'reporte_falla',
        title: `Reporte de falla - ${currentModule || 'General'}`,
        description: description.trim(),
        priority: 'normal',
        app_version: appVersion,
        user_agent: navigator.userAgent,
        current_module: currentModule || 'No especificado',
        prospecto_id: prospectoId,
        prospecto_nombre: prospectoNombre,
        session_details: sessionDetails,
        screenshot_url: screenshotUrl, // URL en lugar de base64
        reporter_id: user.id,
        reporter_name: user.full_name || user.email,
        reporter_email: user.email,
        reporter_role: user.role_name
      });

      if (error) {
        throw new Error(error);
      }

      toast.success(`Ticket ${ticket?.ticket_number} creado exitosamente`);
      onClose();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Error al crear el reporte');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        data-modal-backdrop
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        style={{ 
          zIndex: 99999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          style={{ zIndex: 100000, margin: 'auto' }}
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Reportar Falla</h2>
                  <p className="text-sm text-red-100">Ayúdanos a mejorar reportando el problema</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Captura de pantalla */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-1 h-5 bg-gradient-to-b from-red-500 to-orange-500 rounded-full" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Captura de Pantalla
                </h3>
              </div>
              
              <div className="relative rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden bg-slate-50 dark:bg-slate-800">
                {isCapturing ? (
                  <div className="h-48 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Capturando pantalla...</p>
                    </div>
                  </div>
                ) : screenshot ? (
                  <div className="relative">
                    <img 
                      src={screenshot} 
                      alt="Captura de pantalla" 
                      className="w-full h-auto max-h-64 object-contain"
                    />
                    <button
                      onClick={captureScreen}
                      className="absolute top-2 right-2 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title="Recapturar"
                    >
                      <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center">
                    <button
                      onClick={captureScreen}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Capturar Pantalla</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Información del contexto */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Información del Contexto
                </h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Versión</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-white font-mono">{appVersion}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Usuario</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{user?.full_name || user?.email}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Módulo Actual</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{currentModule || 'General'}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Navegador</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                    {sessionDetails.userAgent?.split(' ').pop()?.split('/')[0] || 'Desconocido'}
                  </p>
                </div>
                {prospectoNombre && (
                  <div className="col-span-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Prospecto en Contexto</p>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{prospectoNombre}</p>
                  </div>
                )}
              </div>

              {/* Detalles expandibles */}
              <details className="mt-3">
                <summary className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
                  Ver todos los detalles técnicos...
                </summary>
                <pre className="mt-2 p-3 bg-slate-900 text-green-400 rounded-lg text-xs overflow-x-auto max-h-40">
                  {JSON.stringify(sessionDetails, null, 2)}
                </pre>
              </details>
            </div>

            {/* Descripción del problema */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Descripción del Problema <span className="text-red-500">*</span>
                </h3>
              </div>

              {/* Sugerencia */}
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    <p className="font-semibold mb-1">¿Cómo reportar correctamente?</p>
                    <ul className="list-disc list-inside space-y-0.5 text-blue-600 dark:text-blue-400">
                      <li>Describe <strong>qué estabas haciendo</strong> cuando ocurrió el problema</li>
                      <li>Indica <strong>qué esperabas que pasara</strong> vs <strong>qué pasó realmente</strong></li>
                      <li>Menciona si el problema es <strong>constante o intermitente</strong></li>
                      <li>Incluye cualquier <strong>mensaje de error</strong> que hayas visto</li>
                    </ul>
                  </div>
                </div>
              </div>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el problema detalladamente...&#10;&#10;Ejemplo: Estaba intentando enviar un mensaje de WhatsApp al prospecto, pero al hacer clic en 'Enviar' aparece un error 'No se pudo enviar' y el mensaje se queda en gris."
                className="w-full h-40 px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 dark:bg-slate-800 dark:text-white resize-none"
                required
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {description.length}/1000 caracteres
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              El reporte incluirá la captura y toda la información técnica
            </p>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <motion.button
                onClick={handleSubmit}
                disabled={!description.trim() || isSubmitting}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-orange-500 rounded-xl hover:from-red-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-500/25"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSubmitting ? (
                  <span className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>Enviando...</span>
                  </span>
                ) : (
                  'Enviar Reporte'
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default ReportIssueModal;
