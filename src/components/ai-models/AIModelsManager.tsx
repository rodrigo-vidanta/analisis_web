import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import VoiceModelsSection from './VoiceModelsSection';
import ImageRepositorySection from './ImageRepositorySection';
import ImageGenerationSection from './ImageGenerationSection';

const AIModelsManager: React.FC = () => {
  const { user } = useAuth();
  const { getThemeClasses, isLinearTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'voice' | 'images' | 'generation'>('voice');

  const themeClasses = getThemeClasses();

  const tabs = [
    {
      id: 'voice' as const,
      name: 'Modelos de Voz',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
      description: 'ElevenLabs, Speech-to-Text, Generación de Audio'
    },
    {
      id: 'images' as const,
      name: 'Repositorio de Imágenes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      description: 'Clasificación, Filtros, Búsqueda Avanzada'
    },
    {
      id: 'generation' as const,
      name: 'Generación de Imágenes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      ),
      description: 'Nano Banana, Prompts Inteligentes, Composición'
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'voice':
        return <VoiceModelsSection />;
      case 'images':
        return <ImageRepositorySection />;
      case 'generation':
        return <ImageGenerationSection />;
      default:
        return null;
    }
  };

  if (isLinearTheme) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Header Linear */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  AI Models Manager
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Gestión avanzada de modelos de IA para voz e imágenes
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Linear */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8 px-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors duration-200 ${
                      activeTab === tab.id
                        ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {tab.icon}
                      <span>{tab.name}</span>
                    </div>
                    <p className="text-xs mt-1 opacity-75">
                      {tab.description}
                    </p>
                  </button>
                ))}
              </nav>
            </div>

            {/* Content Linear */}
            <div className="p-6">
              {renderContent()}
            </div>
          </div>

          {/* Footer Info Linear */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              Usuario: <span className="font-medium">{user?.full_name}</span> | 
              Tema: <span className="font-medium">Linear</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Tema Corporativo
  return (
    <div className={`min-h-screen ${themeClasses.background} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto p-6">
        
        {/* Header Corporativo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                AI Models Manager
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Gestión avanzada de modelos de IA para voz e imágenes
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Corporativo */}
        <div className="corp-card corp-glow mb-6">
          <div className="border-b border-slate-200 dark:border-slate-700">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {tab.icon}
                    <span>{tab.name}</span>
                  </div>
                  <p className="text-xs mt-1 opacity-75">
                    {tab.description}
                  </p>
                </button>
              ))}
            </nav>
          </div>

          {/* Content Corporativo */}
          <div className="p-6">
            {renderContent()}
          </div>
        </div>

        {/* Footer Info Corporativo */}
        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
          <p>
            Usuario: <span className="font-medium">{user?.full_name}</span> | 
            Tema: <span className="font-medium">Corporativo</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIModelsManager;
