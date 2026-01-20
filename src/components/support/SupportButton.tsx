// ============================================
// BOTÓN DE SOPORTE - SALVAVIDAS
// ============================================
// Componente que muestra un icono de salvavidas en el header
// Al hacer clic muestra opciones: Requerimiento | Reporte de Falla
// Incluye notificaciones en tiempo real

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { ticketService } from '../../services/ticketService';
import ReportIssueModal from './ReportIssueModal';
import RequestModal from './RequestModal';
import MyTicketsModal from './MyTicketsModal';

// Icono de Salvavidas (Lifebuoy) vectorizado
const LifebuoyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {/* Círculo exterior */}
    <circle cx="12" cy="12" r="10" />
    {/* Círculo interior */}
    <circle cx="12" cy="12" r="4" />
    {/* Líneas de conexión (las "cuerdas" del salvavidas) */}
    <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
    <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
    <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
    <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
  </svg>
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
  const menuRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  // Verificar si el usuario puede ver este botón
  const canSeeSupport = user && [
    'admin', 
    'administrador_operativo', 
    'coordinador', 
    'supervisor', 
    'ejecutivo'
  ].includes(user.role_name);

  // Cargar conteo inicial de notificaciones
  const loadNotificationCount = useCallback(async () => {
    if (!user?.id) return;
    const { count } = await ticketService.getUnreadNotificationCount(user.id);
    setNotificationCount(count);
  }, [user?.id]);

  // Suscribirse a notificaciones en tiempo real
  useEffect(() => {
    if (!user?.id) return;

    // Cargar conteo inicial
    loadNotificationCount();

    // Suscribirse a cambios en tiempo real
    channelRef.current = ticketService.subscribeToNotifications(user.id, () => {
      // Incrementar contador cuando llega nueva notificación
      setNotificationCount(prev => prev + 1);
    });

    return () => {
      // Desuscribirse al desmontar
      if (channelRef.current) {
        ticketService.unsubscribeFromNotifications(channelRef.current);
      }
    };
  }, [user?.id, loadNotificationCount]);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Manejar reporte de falla
  const handleReportIssue = () => {
    setIsMenuOpen(false);
    setShowReportModal(true);
  };

  // Manejar requerimiento
  const handleRequest = () => {
    setIsMenuOpen(false);
    setShowRequestModal(true);
  };

  // Manejar ver mis tickets
  const handleMyTickets = async () => {
    setIsMenuOpen(false);
    setShowMyTicketsModal(true);
    
    // Marcar todas las notificaciones como leídas y resetear contador
    if (user?.id && notificationCount > 0) {
      await ticketService.markAllNotificationsAsRead(user.id);
      setNotificationCount(0);
    }
  };

  // Callback cuando se cierra el modal de tickets (refrescar contador)
  const handleMyTicketsClose = () => {
    setShowMyTicketsModal(false);
    loadNotificationCount(); // Recargar por si acaso
  };

  if (!canSeeSupport) return null;

  return (
    <>
      <div className="relative" ref={menuRef}>
        {/* Botón principal - Salvavidas */}
        <motion.button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`relative p-2 rounded-xl transition-all duration-200 group ${
            isMenuOpen 
              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' 
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Soporte - Reportar falla o requerimiento"
        >
          <LifebuoyIcon className="w-5 h-5" />
          
          {/* Badge de notificaciones */}
          <AnimatePresence>
            {notificationCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg"
              >
                {notificationCount > 99 ? '99+' : notificationCount}
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Indicador de pulsación suave */}
          {notificationCount === 0 && (
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-orange-400/50"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0, 0.5]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
        </motion.button>

        {/* Menú desplegable */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
            >
              {/* Header del menú */}
              <div className="px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <div className="flex items-center space-x-2">
                  <LifebuoyIcon className="w-5 h-5" />
                  <span className="font-semibold">Centro de Soporte</span>
                </div>
                <p className="text-xs text-orange-100 mt-1">¿Cómo podemos ayudarte?</p>
              </div>

              {/* Opciones */}
              <div className="p-2">
                {/* Reporte de Falla */}
                <motion.button
                  onClick={handleReportIssue}
                  className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
                  whileHover={{ x: 4 }}
                >
                  <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-slate-800 dark:text-white">Reporte de Falla</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Algo no funciona correctamente</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.button>

                {/* Requerimiento */}
                <motion.button
                  onClick={handleRequest}
                  className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
                  whileHover={{ x: 4 }}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-slate-800 dark:text-white">Requerimiento</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Solicitar cambios o mejoras</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.button>

                {/* Separador */}
                <div className="my-2 border-t border-slate-200 dark:border-slate-700" />

                {/* Mis Tickets */}
                <motion.button
                  onClick={handleMyTickets}
                  className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                  whileHover={{ x: 4 }}
                >
                  <div className="relative w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {/* Badge en el icono */}
                    {notificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                        {notificationCount > 9 ? '9+' : notificationCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-slate-800 dark:text-white flex items-center">
                      Mis Tickets
                      {notificationCount > 0 && (
                        <span className="ml-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                          {notificationCount} nuevo{notificationCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Ver estado de mis solicitudes</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          // Marcar notificaciones de este ticket como leídas
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
