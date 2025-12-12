import React, { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import UserManagement from './UserManagement';
import SystemPreferences from './SystemPreferences';
import DatabaseConfiguration from './DatabaseConfiguration';
import TokenManagement from './TokenManagement';
import EjecutivosManager from './EjecutivosManager';
import CoordinacionesManager from './CoordinacionesManager';
import AdminMessagesModal from './AdminMessagesModal';
import ApiAuthTokensManager from './ApiAuthTokensManager';
import { useAuth } from '../../contexts/AuthContext';
import { permissionsService } from '../../services/permissionsService';
import { adminMessagesService } from '../../services/adminMessagesService';
import { Mail } from 'lucide-react';

type AdminTab = 'usuarios' | 'preferencias' | 'configuracion-db' | 'tokens' | 'api-tokens' | 'ejecutivos' | 'coordinaciones';

const AdminDashboardTabs: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role_name === 'admin';
  const isAdminOperativo = user?.role_name === 'administrador_operativo';
  const [isCoordinador, setIsCoordinador] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('usuarios');
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const checkCoordinador = async () => {
      if (user?.id) {
        try {
          const isCoord = await permissionsService.isCoordinador(user.id);
          setIsCoordinador(isCoord);
          // Si es coordinador y no admin, establecer tab inicial a ejecutivos
          if (isCoord && !isAdmin) {
            setActiveTab('ejecutivos');
          }
        } catch (error) {
          console.error('Error verificando coordinador:', error);
        }
      }
    };
    checkCoordinador();
  }, [user?.id, isAdmin]);

  // Ref para almacenar la función de carga (evita recrear en cada render)
  const loadUnreadCountRef = useRef<(() => Promise<void>) | null>(null);
  const unreadCountRef = useRef<number>(0);

  // Función optimizada para cargar contador (memoizada)
  const loadUnreadCount = useCallback(async () => {
    if (!user?.role_name) return;
    
    try {
      const count = await adminMessagesService.getUnreadCount(user.role_name);
      unreadCountRef.current = count;
      // Usar startTransition para actualización no crítica
      startTransition(() => {
        setUnreadCount(count);
      });
    } catch (error) {
      // Silenciar errores - no crítico
      unreadCountRef.current = 0;
      startTransition(() => {
        setUnreadCount(0);
      });
    }
  }, [user?.role_name]);

  // Guardar función en ref para usar en handlers
  useEffect(() => {
    loadUnreadCountRef.current = loadUnreadCount;
  }, [loadUnreadCount]);

  // Handler optimizado para mensajes nuevos (no bloquea)
  const handleNewMessage = useCallback(() => {
    // Incrementar contador localmente inmediatamente (feedback visual rápido)
    unreadCountRef.current += 1;
    startTransition(() => {
      setUnreadCount(prev => prev + 1);
    });

    // Diferir la carga real desde BD (no bloquea el handler)
    setTimeout(() => {
      if (loadUnreadCountRef.current) {
        loadUnreadCountRef.current();
      }
    }, 0);
  }, []);

  // Cargar contador de mensajes no leídos
  useEffect(() => {
    if ((isAdmin || isAdminOperativo) && user?.role_name) {
      // Carga inicial
      loadUnreadCount();

      // Actualizar cada 30 segundos
      const interval = setInterval(() => {
        if (loadUnreadCountRef.current) {
          loadUnreadCountRef.current();
        }
      }, 30000);

      // Suscribirse a nuevos mensajes en tiempo real (handler optimizado)
      const unsubscribe = adminMessagesService.subscribeToMessages(
        user.role_name,
        handleNewMessage
      );

      return () => {
        clearInterval(interval);
        unsubscribe();
      };
    }
  }, [isAdmin, isAdminOperativo, user?.role_name, loadUnreadCount, handleNewMessage]);
  
  const tabs = [
    // Tabs para admin completo
    ...(isAdmin ? [
      {
        id: 'usuarios' as AdminTab,
        name: 'Usuarios',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        )
      },
      {
        id: 'preferencias' as AdminTab,
        name: 'Preferencias',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      },
      {
        id: 'configuracion-db' as AdminTab,
        name: 'Base de Datos',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        )
      },
      {
        id: 'tokens' as AdminTab,
        name: 'Tokens AI',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        )
      },
      {
        id: 'api-tokens' as AdminTab,
        name: 'Auth Tokens',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        )
      },
      {
        id: 'coordinaciones' as AdminTab,
        name: 'Coordinaciones',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      }
    ] : []),
    // Tabs para Administrador Operativo: solo usuarios y coordinaciones
    ...(isAdminOperativo ? [
      {
        id: 'usuarios' as AdminTab,
        name: 'Usuarios',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        )
      },
      {
        id: 'coordinaciones' as AdminTab,
        name: 'Coordinaciones',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      }
    ] : []),
    // Tab solo visible para coordinadores
    ...(isCoordinador ? [{
      id: 'ejecutivos' as AdminTab,
      name: 'Ejecutivos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    }] : [])
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar de navegación */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex flex-col w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {/* Header del sidebar */}
            <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Administración
              </h2>
              {(isAdmin || isAdminOperativo) && unreadCount > 0 && (
                <button
                  onClick={() => setShowMessagesModal(true)}
                  className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Navegación de pestañas */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-500'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <span className={`mr-3 ${
                    activeTab === tab.id ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400'
                  }`}>
                    {tab.icon}
                  </span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header móvil */}
          <div className="lg:hidden flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Administración
            </h2>
            {(isAdmin || isAdminOperativo) && unreadCount > 0 && (
              <button
                onClick={() => setShowMessagesModal(true)}
                className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <Mail className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Selector móvil */}
          <div className="lg:hidden px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <label htmlFor="tabs-mobile" className="sr-only">
              Seleccionar pestaña
            </label>
            <select
              id="tabs-mobile"
              name="tabs-mobile"
              className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as AdminTab)}
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.name}
                </option>
              ))}
            </select>
          </div>

          {/* Contenido de las pestañas */}
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-[98%] 2xl:max-w-[96%] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-6 lg:py-8">
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
                {activeTab === 'usuarios' && (isAdmin || isAdminOperativo) && (
                  <div className="p-4 sm:p-5 md:p-6 lg:p-8">
                    <UserManagement />
                  </div>
                )}
                
                {activeTab === 'preferencias' && isAdmin && (
                  <div className="p-4 sm:p-5 md:p-6 lg:p-8">
                    <SystemPreferences />
                  </div>
                )}
                
                {activeTab === 'configuracion-db' && isAdmin && (
                  <div className="p-4 sm:p-5 md:p-6 lg:p-8">
                    <DatabaseConfiguration />
                  </div>
                )}
                
                {activeTab === 'tokens' && isAdmin && (
                  <div className="p-4 sm:p-5 md:p-6 lg:p-8">
                    <TokenManagement />
                  </div>
                )}

                {activeTab === 'api-tokens' && isAdmin && (
                  <div className="p-4 sm:p-5 md:p-6 lg:p-8">
                    <ApiAuthTokensManager />
                  </div>
                )}
                
                {activeTab === 'ejecutivos' && isCoordinador && (
                  <div className="p-4 sm:p-5 md:p-6 lg:p-8">
                    <EjecutivosManager />
                  </div>
                )}
                
                {activeTab === 'coordinaciones' && (isAdmin || isAdminOperativo) && (
                  <div className="p-4 sm:p-5 md:p-6 lg:p-8">
                    <CoordinacionesManager />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Mensajes */}
      {(isAdmin || isAdminOperativo) && (
        <AdminMessagesModal
          isOpen={showMessagesModal}
          onClose={() => {
            setShowMessagesModal(false);
            // Recargar contador al cerrar
            if (user?.role_name) {
              adminMessagesService.getUnreadCount(user.role_name).then(setUnreadCount);
            }
          }}
          recipientRole={user?.role_name || 'admin'}
        />
      )}
    </div>
  );
};

export default AdminDashboardTabs;
