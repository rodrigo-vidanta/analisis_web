// ============================================
// BOTÓN DE SOPORTE - DISEÑO ELEGANTE
// ============================================
// Icono de salvavidas con menú elegante y notificaciones
// Siguiendo la guía de diseño del sistema

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { ticketService } from '../../services/ticketService';
import ReportIssueModal from './ReportIssueModal';
import RequestModal from './RequestModal';
import MyTicketsModal from './MyTicketsModal';

// Icono de Salvavidas con colores típicos (rojo y blanco)
const LifebuoyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="none"
  >
    {/* Aro exterior - alternando rojo y blanco */}
    <circle cx="12" cy="12" r="10" fill="white" stroke="#e5e7eb" strokeWidth="0.5" />
    
    {/* Segmentos rojos del salvavidas */}
    <path d="M12 2 A10 10 0 0 1 22 12 L16.5 12 A4.5 4.5 0 0 0 12 7.5 Z" fill="#dc2626" />
    <path d="M22 12 A10 10 0 0 1 12 22 L12 16.5 A4.5 4.5 0 0 0 16.5 12 Z" fill="#dc2626" />
    <path d="M12 22 A10 10 0 0 1 2 12 L7.5 12 A4.5 4.5 0 0 0 12 16.5 Z" fill="#dc2626" />
    <path d="M2 12 A10 10 0 0 1 12 2 L12 7.5 A4.5 4.5 0 0 0 7.5 12 Z" fill="#dc2626" />
    
    {/* Círculo interior (hueco) */}
    <circle cx="12" cy="12" r="4" fill="currentColor" className="text-gray-100 dark:text-gray-800" />
    <circle cx="12" cy="12" r="4" fill="none" stroke="#9ca3af" strokeWidth="0.5" />
    
    {/* Cuerdas/líneas de agarre */}
    <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" stroke="#f5f5f5" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" stroke="#f5f5f5" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" stroke="#f5f5f5" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" stroke="#f5f5f5" strokeWidth="1.5" strokeLinecap="round" />
    
    {/* Borde exterior */}
    <circle cx="12" cy="12" r="10" fill="none" stroke="#b91c1c" strokeWidth="0.8" />
  </svg>
);

// Componente animado del salvavidas con efecto de agua
const AnimatedLifebuoy: React.FC<{ isAnimating: boolean; isMenuOpen: boolean }> = ({ isAnimating, isMenuOpen }) => (
  <div className="relative w-6 h-6 overflow-hidden">
    {/* Estilos de animación */}
    <style>{`
      @keyframes lifebuoy-sink-bounce {
        0% { transform: translateY(0px); }
        15% { transform: translateY(12px); }
        30% { transform: translateY(12px); }
        50% { transform: translateY(-3px); }
        65% { transform: translateY(1px); }
        80% { transform: translateY(-1px); }
        100% { transform: translateY(0px); }
      }
      @keyframes water-wave {
        0%, 100% { 
          d: path("M0 12 Q3 10, 6 12 T12 12 T18 12 T24 12 L24 24 L0 24 Z");
        }
        25% { 
          d: path("M0 12 Q3 14, 6 12 T12 12 T18 12 T24 12 L24 24 L0 24 Z");
        }
        50% { 
          d: path("M0 12 Q3 10, 6 12 T12 12 T18 12 T24 12 L24 24 L0 24 Z");
        }
        75% { 
          d: path("M0 12 Q3 14, 6 12 T12 12 T18 12 T24 12 L24 24 L0 24 Z");
        }
      }
      .lifebuoy-sink-bounce {
        animation: lifebuoy-sink-bounce 2.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      }
    `}</style>
    
    {/* Salvavidas */}
    <div className={`absolute inset-0 ${isAnimating ? 'lifebuoy-sink-bounce' : ''}`}>
      <LifebuoyIcon className="w-6 h-6" />
    </div>
    
    {/* Agua con ondulaciones - solo visible durante animación */}
    {isAnimating && (
      <svg 
        className="absolute inset-0 w-6 h-6 pointer-events-none"
        viewBox="0 0 24 24"
        style={{ zIndex: 10 }}
      >
        <defs>
          <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.6)" />
            <stop offset="100%" stopColor="rgba(37, 99, 235, 0.8)" />
          </linearGradient>
        </defs>
        {/* Onda de agua animada */}
        <path 
          fill="url(#waterGradient)"
          className="animate-pulse"
        >
          <animate
            attributeName="d"
            dur="0.8s"
            repeatCount="indefinite"
            values="
              M0 14 Q3 12, 6 14 T12 14 T18 14 T24 14 L24 24 L0 24 Z;
              M0 14 Q3 16, 6 14 T12 14 T18 14 T24 14 L24 24 L0 24 Z;
              M0 14 Q3 12, 6 14 T12 14 T18 14 T24 14 L24 24 L0 24 Z
            "
          />
        </path>
        {/* Espuma/brillo en la superficie */}
        <path 
          fill="rgba(255, 255, 255, 0.4)"
          strokeWidth="0"
        >
          <animate
            attributeName="d"
            dur="0.8s"
            repeatCount="indefinite"
            values="
              M0 13 Q3 11, 6 13 T12 13 T18 13 T24 13 L24 14 Q21 12, 18 14 T12 14 T6 14 T0 14 Z;
              M0 13 Q3 15, 6 13 T12 13 T18 13 T24 13 L24 14 Q21 16, 18 14 T12 14 T6 14 T0 14 Z;
              M0 13 Q3 11, 6 13 T12 13 T18 13 T24 13 L24 14 Q21 12, 18 14 T12 14 T6 14 T0 14 Z
            "
          />
        </path>
      </svg>
    )}
  </div>
);

interface SupportButtonProps {
  currentModule?: string;
  prospectoId?: string;
  prospectoNombre?: string;
}

const SupportButton: React.FC<SupportButtonProps> = ({
  currentModule,
  prospectoId,
  prospectoNombre
}) => {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showMyTicketsModal, setShowMyTicketsModal] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  
  // Animación del salvavidas cada 60 segundos
  useEffect(() => {
    const triggerAnimation = () => {
      setIsAnimating(true);
      // La animación dura 4 segundos, la detenemos después
      setTimeout(() => setIsAnimating(false), 4000);
    };
    
    // Iniciar primera animación después de 5 segundos
    const initialTimeout = setTimeout(triggerAnimation, 5000);
    
    // Repetir cada 60 segundos
    const interval = setInterval(triggerAnimation, 60000);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  const canSeeSupport = user && [
    'admin', 'administrador_operativo', 'coordinador', 'supervisor', 'ejecutivo'
  ].includes(user.role_name);

  const loadNotificationCount = useCallback(async () => {
    if (!user?.id) return;
    const { count } = await ticketService.getUnreadNotificationCount(user.id);
    setNotificationCount(count);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    loadNotificationCount();
    channelRef.current = ticketService.subscribeToNotifications(user.id, () => {
      setNotificationCount(prev => prev + 1);
    });
    return () => {
      if (channelRef.current) ticketService.unsubscribeFromNotifications(channelRef.current);
    };
  }, [user?.id, loadNotificationCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleReportIssue = () => {
    setIsMenuOpen(false);
    setShowReportModal(true);
  };

  const handleRequest = () => {
    setIsMenuOpen(false);
    setShowRequestModal(true);
  };

  const handleMyTickets = async () => {
    setIsMenuOpen(false);
    setShowMyTicketsModal(true);
    if (user?.id && notificationCount > 0) {
      await ticketService.markAllNotificationsAsRead(user.id);
      setNotificationCount(0);
    }
  };

  const handleMyTicketsClose = () => {
    setShowMyTicketsModal(false);
    loadNotificationCount();
  };

  if (!canSeeSupport) return null;

  return (
    <>
      <div className="relative" ref={menuRef}>
        {/* Botón principal */}
        <motion.button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`relative p-2 rounded-xl transition-all duration-200 ${
            isMenuOpen 
              ? 'bg-white dark:bg-gray-800 shadow-lg ring-2 ring-red-500/30' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Centro de Soporte"
        >
          <AnimatedLifebuoy isAnimating={isAnimating} isMenuOpen={isMenuOpen} />
          
          {/* Badge de notificaciones */}
          <AnimatePresence>
            {notificationCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white dark:border-gray-900"
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Menú desplegable */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50"
            >
              {/* Header del menú */}
              <div className="px-5 py-4 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 p-0.5 shadow-lg shadow-blue-500/25">
                    <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                      <LifebuoyIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Centro de Soporte</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">¿Cómo podemos ayudarte?</p>
                  </div>
                </div>
              </div>

              {/* Opciones */}
              <div className="p-2">
                {/* Reportar Falla */}
                <motion.button
                  onClick={handleReportIssue}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  whileHover={{ x: 4 }}
                >
                  <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Reportar Falla</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Algo no funciona correctamente</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.button>

                {/* Requerimiento */}
                <motion.button
                  onClick={handleRequest}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  whileHover={{ x: 4 }}
                >
                  <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Nuevo Requerimiento</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Solicitar cambios o mejoras</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.button>

                <div className="my-2 border-t border-gray-100 dark:border-gray-800" />

                {/* Mis Tickets */}
                <motion.button
                  onClick={handleMyTickets}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  whileHover={{ x: 4 }}
                >
                  <div className="relative w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {notificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Mis Tickets</p>
                      {notificationCount > 0 && (
                        <span className="text-xs font-medium text-red-500">{notificationCount} nuevo{notificationCount > 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ver estado de tus solicitudes</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modales */}
      <ReportIssueModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        currentModule={currentModule}
        prospectoId={prospectoId}
        prospectoNombre={prospectoNombre}
      />

      <RequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
      />

      <MyTicketsModal
        isOpen={showMyTicketsModal}
        onClose={handleMyTicketsClose}
        onTicketRead={(ticketId) => {
          if (user?.id) {
            ticketService.markTicketNotificationsAsRead(user.id, ticketId);
            loadNotificationCount();
          }
        }}
      />
    </>
  );
};

export default SupportButton;
