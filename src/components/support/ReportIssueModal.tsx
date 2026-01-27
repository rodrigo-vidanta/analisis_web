// ============================================
// MODAL REPORTE DE FALLA - DISEÑO ELEGANTE
// ============================================
// Siguiendo la guía de diseño del sistema

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

const getAppVersion = (): string => {
  const footerVersion = document.querySelector('[data-version]')?.getAttribute('data-version');
  if (footerVersion) return footerVersion;
  const footerText = document.querySelector('footer')?.textContent;
  const versionMatch = footerText?.match(/B\d+\.\d+\.\d+N\d+\.\d+\.\d+/);
  return versionMatch ? versionMatch[0] : 'No detectada';
};

// Buffer para capturar logs de consola
const consoleLogBuffer: { type: string; message: string; timestamp: string }[] = [];
const MAX_CONSOLE_LOGS = 10;

// Interceptor de consola (solo si no está ya instalado)
if (!(window as any).__consoleInterceptorInstalled) {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info
  };
  
  const captureLog = (type: string, ...args: any[]) => {
    // ⚠️ FIX: NO capturar logs de fetch/network para evitar loop infinito
    const message = args.map(arg => {
      try {
        const str = typeof arg === 'object' ? JSON.stringify(arg, null, 0) : String(arg);
        // Ignorar logs relacionados con getUserGroups que causan loop
        if (str.includes('getUserGroups') || str.includes('user_permission_groups')) {
          return null;
        }
        return str.slice(0, 200);
      } catch { return '[Object]'; }
    }).filter(Boolean).join(' ');
    
    if (!message || message.length === 0) return; // No capturar mensajes vacíos
    
    consoleLogBuffer.push({
      type,
      message: message.slice(0, 300),
      timestamp: new Date().toISOString()
    });
    
    // Mantener solo los últimos N logs
    while (consoleLogBuffer.length > MAX_CONSOLE_LOGS) {
      consoleLogBuffer.shift();
    }
  };
  
  console.log = (...args) => { originalConsole.log(...args); captureLog('log', ...args); };
  console.warn = (...args) => { originalConsole.warn(...args); captureLog('warn', ...args); };
  console.error = (...args) => { originalConsole.error(...args); captureLog('error', ...args); };
  console.info = (...args) => { originalConsole.info(...args); captureLog('info', ...args); };
  
  (window as any).__consoleInterceptorInstalled = true;
}

const getConsoleLogs = () => [...consoleLogBuffer];

const getSessionDetails = () => ({
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  language: navigator.language,
  screenResolution: `${window.screen.width}x${window.screen.height}`,
  viewportSize: `${window.innerWidth}x${window.innerHeight}`,
  colorDepth: window.screen.colorDepth,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  cookiesEnabled: navigator.cookieEnabled,
  online: navigator.onLine,
  timestamp: new Date().toISOString(),
  url: window.location.href,
  referrer: document.referrer || 'Directo',
  consoleLogs: getConsoleLogs()
});

const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen, onClose, currentModule, prospectoId, prospectoNombre
}) => {
  const { user } = useAuth();
  const [isCapturing, setIsCapturing] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'normal' | 'alta' | 'urgente'>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionDetails, setSessionDetails] = useState<Record<string, any>>({});
  const [appVersion, setAppVersion] = useState('');

  const captureScreen = useCallback(async () => {
    setIsCapturing(true);
    try {
      const modalBackdrop = document.querySelector('[data-modal-backdrop]');
      if (modalBackdrop) (modalBackdrop as HTMLElement).style.display = 'none';

      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: false,
        backgroundColor: '#ffffff',
        scale: 0.8,
        logging: false,
        imageTimeout: 5000,
        removeContainer: true,
        ignoreElements: (element) => {
          return element.hasAttribute('data-modal-backdrop') || element.classList.contains('Toastify');
        },
        onclone: (clonedDoc) => {
          const images = clonedDoc.querySelectorAll('img');
          images.forEach((img) => {
            const src = img.src || '';
            if (src.includes('storage.googleapis.com') || src.includes('X-Goog-') ||
                (src.startsWith('http') && !src.includes(window.location.hostname) && !src.includes('supabase'))) {
              img.style.backgroundColor = '#e2e8f0';
              img.style.objectFit = 'contain';
              img.removeAttribute('src');
            }
          });
        }
      });

      if (modalBackdrop) (modalBackdrop as HTMLElement).style.display = '';
      setScreenshot(canvas.toDataURL('image/jpeg', 0.7));
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      try {
        const canvas = await html2canvas(document.body, {
          useCORS: false, allowTaint: false, foreignObjectRendering: false,
          backgroundColor: '#ffffff', scale: 0.6, logging: false, imageTimeout: 1000,
          onclone: (clonedDoc) => {
            clonedDoc.querySelectorAll('img').forEach((img) => {
              img.style.backgroundColor = '#e2e8f0';
              img.removeAttribute('src');
            });
          }
        });
        setScreenshot(canvas.toDataURL('image/jpeg', 0.6));
        toast('Captura sin algunas imágenes');
      } catch {
        toast.error('No se pudo capturar la pantalla');
      }
    } finally {
      setIsCapturing(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSessionDetails(getSessionDetails());
      setAppVersion(getAppVersion());
      setTimeout(() => captureScreen(), 100);
    } else {
      setScreenshot(null);
      setDescription('');
      setPriority('normal');
    }
  }, [isOpen, captureScreen]);

  const base64ToBlob = (base64Data: string): Blob => {
    const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) throw new Error('Invalid base64 data');
    const byteCharacters = atob(matches[2]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: matches[1] });
  };

  const uploadScreenshot = async (base64Data: string): Promise<string | null> => {
    try {
      const blob = base64ToBlob(base64Data);
      const fileName = `screenshot-${user?.id || 'unknown'}-${Date.now()}.jpg`;
      const { error } = await analysisSupabase.storage
        .from('support-tickets')
        .upload(`screenshots/${fileName}`, blob, { contentType: 'image/jpeg', upsert: false });
      if (error) return null;
      const { data: { publicUrl } } = analysisSupabase.storage
        .from('support-tickets')
        .getPublicUrl(`screenshots/${fileName}`);
      return publicUrl;
    } catch {
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Describe el problema');
      return;
    }
    if (!user) {
      toast.error('Debes estar autenticado');
      return;
    }

    setIsSubmitting(true);
    try {
      let screenshotUrl: string | undefined;
      if (screenshot) {
        screenshotUrl = (await uploadScreenshot(screenshot)) || undefined;
      }

      const { ticket, error } = await ticketService.createTicket({
        type: 'reporte_falla',
        title: `Reporte de falla - ${currentModule || 'General'}`,
        description: description.trim(),
        priority,
        app_version: appVersion,
        user_agent: navigator.userAgent,
        current_module: currentModule || 'No especificado',
        prospecto_id: prospectoId,
        prospecto_nombre: prospectoNombre,
        session_details: sessionDetails,
        screenshot_url: screenshotUrl,
        reporter_id: user.id,
        reporter_name: user.full_name || user.email,
        reporter_email: user.email,
        reporter_role: user.role_name
      });

      if (error) throw new Error(error);
      toast.success(`Ticket ${ticket?.ticket_number} creado`);
      onClose();
    } catch (error) {
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
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
        >
          {/* Header */}
          <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar con borde degradado */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-orange-500 p-0.5 shadow-lg shadow-red-500/25"
                >
                  <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                    <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reportar Falla</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Ayúdanos a mejorar la plataforma</p>
                </div>
              </div>
              
              <motion.button
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.25 }}
                onClick={onClose}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 group"
              >
                <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>
          </div>

          {/* Contenido con scroll */}
          <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
            <div className="space-y-6">
              {/* Sección: Captura de Pantalla */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-5 bg-gradient-to-b from-red-500 to-orange-500 rounded-full"></div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Captura de Pantalla
                  </h4>
                </div>
                
                <div className="relative rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800/50">
                  {isCapturing ? (
                    <div className="h-44 flex items-center justify-center">
                      <div className="text-center">
                        <div className="relative w-12 h-12 mx-auto mb-3">
                          <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full" />
                          <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-red-500 rounded-full animate-spin" />
                        </div>
                        <p className="text-sm text-gray-500">Capturando pantalla...</p>
                      </div>
                    </div>
                  ) : screenshot ? (
                    <div className="relative group">
                      <img src={screenshot} alt="Captura" className="w-full h-auto max-h-56 object-contain" />
                      <button
                        onClick={captureScreen}
                        className="absolute top-3 right-3 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100"
                        title="Recapturar"
                      >
                        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="h-44 flex flex-col items-center justify-center space-y-3">
                      <motion.button
                        onClick={captureScreen}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all text-sm font-medium"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Capturar Pantalla</span>
                      </motion.button>
                      <p className="text-xs text-gray-400">La captura es opcional</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Sección: Contexto */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Información del Contexto
                  </h4>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Versión', value: appVersion, icon: 'M20 7L4 7M4 7L4 17C4 18.1046 4.89543 19 6 19L18 19C19.1046 19 20 18.1046 20 17L20 7Z' },
                    { label: 'Usuario', value: user?.full_name || user?.email || '-', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                    { label: 'Módulo', value: currentModule || 'General', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z' },
                    { label: 'Navegador', value: sessionDetails.userAgent?.split(' ').pop()?.split('/')[0] || 'N/A', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' }
                  ].map((item) => (
                    <div key={item.label} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                        </svg>
                        {item.label}
                      </p>
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{item.value}</p>
                    </div>
                  ))}
                </div>
                
                {prospectoNombre && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Prospecto en Contexto
                    </p>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{prospectoNombre}</p>
                  </div>
                )}
              </motion.div>

              {/* Sección: Prioridad */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Prioridad
                  </h4>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: 'normal', label: 'Normal', color: 'blue', icon: 'M5 12h14' },
                    { value: 'alta', label: 'Alta', color: 'orange', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
                    { value: 'urgente', label: 'Urgente', color: 'red', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' }
                  ] as const).map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPriority(p.value)}
                      className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                        priority === p.value
                          ? p.color === 'blue' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
                            p.color === 'orange' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' :
                            'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="text-center">
                        <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center mb-2 ${
                          p.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                          p.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' :
                          'bg-red-100 dark:bg-red-900/30 text-red-600'
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
                          </svg>
                        </div>
                        <p className={`text-sm font-medium ${
                          priority === p.value
                            ? p.color === 'blue' ? 'text-blue-600' :
                              p.color === 'orange' ? 'text-orange-600' : 'text-red-600'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>{p.label}</p>
                      </div>
                      {priority === p.value && (
                        <motion.div
                          layoutId="priority-indicator"
                          className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                            p.color === 'blue' ? 'bg-blue-500' :
                            p.color === 'orange' ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Sección: Descripción */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Descripción del Problema <span className="text-red-500">*</span>
                  </h4>
                </div>

                {/* Sugerencia */}
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      <p className="font-medium mb-1">Consejos para un buen reporte:</p>
                      <ul className="space-y-0.5 text-blue-600 dark:text-blue-400">
                        <li>• ¿Qué estabas haciendo cuando ocurrió?</li>
                        <li>• ¿Qué esperabas vs qué pasó?</li>
                        <li>• ¿Es constante o intermitente?</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="group">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe el problema detalladamente..."
                    className="w-full h-32 px-4 py-3 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-gray-800/50 dark:text-white resize-none transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                    required
                  />
                  <p className="mt-2 text-xs text-gray-400">{description.length}/1000 caracteres</p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
            <p className="text-xs text-gray-400 hidden sm:block">Se incluirá la captura y datos técnicos</p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                Cancelar
              </button>
              <motion.button
                onClick={handleSubmit}
                disabled={!description.trim() || isSubmitting}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-orange-500 rounded-xl hover:from-red-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-red-500/25"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
