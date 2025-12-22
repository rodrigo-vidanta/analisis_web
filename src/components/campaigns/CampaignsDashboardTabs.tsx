import React, { useState } from 'react';
import WhatsAppTemplatesManager from './plantillas/WhatsAppTemplatesManager';
import AudienciasManager from './audiencias/AudienciasManager';
import CampanasManager from './campanas/CampanasManager';
import BasesDatosManager from './bases-datos/BasesDatosManager';
import SecuenciasManager from './secuencias/SecuenciasManager';
import { useAuth } from '../../contexts/AuthContext';
import { useEffectivePermissions } from '../../hooks/useEffectivePermissions';

type CampaignTab = 'plantillas' | 'audiencias' | 'campanas' | 'bases-datos' | 'secuencias';

const CampaignsDashboardTabs: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin } = useEffectivePermissions();
  const [activeTab, setActiveTab] = useState<CampaignTab>('plantillas');

  // Solo administradores pueden acceder
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Acceso Denegado
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Solo administradores pueden acceder al módulo de Campañas
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'plantillas' as CampaignTab,
      name: 'Plantillas',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'audiencias' as CampaignTab,
      name: 'Audiencias',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 'campanas' as CampaignTab,
      name: 'Campañas',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      )
    },
    {
      id: 'bases-datos' as CampaignTab,
      name: 'Bases de Datos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      )
    },
    {
      id: 'secuencias' as CampaignTab,
      name: 'Secuencias',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    }
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
                Campañas
              </h2>
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
              Campañas
            </h2>
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
              onChange={(e) => setActiveTab(e.target.value as CampaignTab)}
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
                {activeTab === 'plantillas' && (
                  <div className="p-4 sm:p-5 md:p-6 lg:p-8">
                    <WhatsAppTemplatesManager />
                  </div>
                )}
                
                {activeTab === 'audiencias' && (
                  <div className="p-4 sm:p-5 md:p-6 lg:p-8">
                    <AudienciasManager />
                  </div>
                )}
                
                {activeTab === 'campanas' && (
                  <div className="p-4 sm:p-5 md:p-6 lg:p-8">
                    <CampanasManager />
                  </div>
                )}
                
                {activeTab === 'bases-datos' && (
                  <div className="p-4 sm:p-5 md:p-6 lg:p-8">
                    <BasesDatosManager />
                  </div>
                )}
                
                {activeTab === 'secuencias' && (
                  <div className="p-4 sm:p-5 md:p-6 lg:p-8">
                    <SecuenciasManager />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignsDashboardTabs;

