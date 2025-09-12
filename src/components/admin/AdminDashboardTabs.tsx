import React, { useState } from 'react';
import UserManagement from './UserManagement';
import SystemPreferences from './SystemPreferences';
import DatabaseConfiguration from './DatabaseConfiguration';
import AcademiaAdminPanel from '../academia/AcademiaAdminPanel';

type AdminTab = 'usuarios' | 'preferencias' | 'configuracion-db' | 'academia';

const AdminDashboardTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('usuarios');

  const tabs = [
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
      id: 'academia' as AdminTab,
      name: 'Academia de Ventas',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      ),
      description: 'Gestionar niveles, asistentes virtuales y configuración de la Academia'
    }
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
          {activeTab === 'usuarios' && (
            <div className="p-6">
              <UserManagement />
            </div>
          )}
          
          {activeTab === 'preferencias' && (
            <div className="p-6">
              <SystemPreferences />
            </div>
          )}
          
          {activeTab === 'configuracion-db' && (
            <div className="p-6">
              <DatabaseConfiguration />
            </div>
          )}
          
          {activeTab === 'academia' && (
            <div className="p-6">
              <AcademiaAdminPanel onClose={() => {}} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardTabs;
