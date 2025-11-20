import React, { useState, useEffect } from 'react';
import UserManagement from './UserManagement';
import SystemPreferences from './SystemPreferences';
import DatabaseConfiguration from './DatabaseConfiguration';
import TokenManagement from './TokenManagement';
import EjecutivosManager from './EjecutivosManager';
import CoordinacionesManager from './CoordinacionesManager';
import { useAuth } from '../../contexts/AuthContext';
import { permissionsService } from '../../services/permissionsService';

type AdminTab = 'usuarios' | 'preferencias' | 'configuracion-db' | 'tokens' | 'ejecutivos' | 'coordinaciones';

const AdminDashboardTabs: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role_name === 'admin';
  const [isCoordinador, setIsCoordinador] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('usuarios');

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
  
  const tabs = [
    // Tabs solo para admin
    ...(isAdmin ? [
      {
        id: 'usuarios' as AdminTab,
        name: 'Gestión de Usuarios',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        ),
        description: 'Crear, editar y gestionar usuarios del sistema'
      },
      {
        id: 'preferencias' as AdminTab,
        name: 'Preferencias del Sistema',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        description: 'Configurar branding, temas y ajustes generales'
      },
      {
        id: 'configuracion-db' as AdminTab,
        name: 'Configuración DB',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        ),
        description: 'Gestionar conexiones y esquemas de bases de datos'
      },
      {
        id: 'tokens' as AdminTab,
        name: 'Gestión de Tokens',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        ),
        description: 'Configurar límites de tokens para usuarios productores'
      },
      {
        id: 'coordinaciones' as AdminTab,
        name: 'Gestión de Coordinaciones',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
        description: 'Gestionar coordinaciones, ejecutivos y analíticas'
      }
    ] : []),
    // Tab solo visible para coordinadores
    ...(isCoordinador ? [{
      id: 'ejecutivos' as AdminTab,
      name: 'Gestión de Ejecutivos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      description: 'Gestionar ejecutivos de tu coordinación'
    }] : [])
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header de la sección */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Administración del Sistema
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona usuarios, roles y configuraciones del sistema
          </p>
        </div>

        {/* Navegación por pestañas mejorada */}
        <div className="mb-8">
          <div className="sm:hidden">
            {/* Selector móvil */}
            <label htmlFor="tabs" className="sr-only">
              Seleccionar pestaña
            </label>
            <select
              id="tabs"
              name="tabs"
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500"
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

          {/* Navegación desktop */}
          <div className="hidden sm:block">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    } group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200`}
                  >
                    <div className={`mr-3 ${
                      activeTab === tab.id ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-500'
                    }`}>
                      {tab.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{tab.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {tab.description}
                      </div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Contenido de las pestañas */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
          {activeTab === 'usuarios' && isAdmin && (
            <div className="p-6">
              <UserManagement />
            </div>
          )}
          
          {activeTab === 'preferencias' && isAdmin && (
            <div className="p-6">
              <SystemPreferences />
            </div>
          )}
          
          {activeTab === 'configuracion-db' && isAdmin && (
            <div className="p-6">
              <DatabaseConfiguration />
            </div>
          )}
          
          {activeTab === 'tokens' && isAdmin && (
            <div className="p-6">
              <TokenManagement />
            </div>
          )}
          
          {activeTab === 'ejecutivos' && isCoordinador && (
            <div className="p-6">
              <EjecutivosManager />
            </div>
          )}
          
          {activeTab === 'coordinaciones' && isAdmin && (
            <div className="p-6">
              <CoordinacionesManager />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardTabs;
