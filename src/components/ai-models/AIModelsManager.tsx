import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { Sparkles, Image, Wand2, Mic, ImageIcon, Settings } from 'lucide-react';
import VoiceModelsSection from './VoiceModelsSection';
import ImageRepositorySection from './ImageRepositorySection';
import ImageGenerationSection from './ImageGenerationSection';

const AIModelsManager: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'voice' | 'images' | 'generation'>('voice');

  const tabs = [
    {
      id: 'voice' as const,
      name: 'Modelos de Voz',
      icon: Mic,
      gradient: 'from-purple-500 to-pink-500',
      description: 'ElevenLabs, Speech-to-Text, Generación de Audio'
    },
    {
      id: 'images' as const,
      name: 'Repositorio de Imágenes',
      icon: ImageIcon,
      gradient: 'from-blue-500 to-cyan-500',
      description: 'Clasificación, Filtros, Búsqueda Avanzada'
    },
    {
      id: 'generation' as const,
      name: 'Generación de Imágenes',
      icon: Wand2,
      gradient: 'from-emerald-500 to-teal-500',
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        
        {/* Header con animación */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-4 mb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="text-3xl font-bold text-gray-900 dark:text-white"
              >
                AI Models Manager
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-gray-600 dark:text-gray-400 mt-1"
              >
                Gestión avanzada de modelos de IA para voz e imágenes
              </motion.p>
            </div>
          </div>
        </motion.div>

        {/* Navigation con animaciones */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 mb-6 overflow-hidden"
        >
          {/* Tabs Navigation */}
          <div className="relative border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <nav className="flex space-x-2 px-4 py-3">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                // Colores específicos por tab
                const activeColors = {
                  voice: 'text-white',
                  images: 'text-white',
                  generation: 'text-white'
                };
                const iconColors = {
                  voice: isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400',
                  images: isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400',
                  generation: isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                };
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
                      isActive
                        ? activeColors[tab.id]
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-800/50'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className={`absolute inset-0 bg-gradient-to-r ${tab.gradient} rounded-xl shadow-lg`}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <div className="relative flex flex-col items-center space-y-1 z-10">
                      <div className="flex items-center space-x-2">
                        <Icon className={`w-5 h-5 ${iconColors[tab.id]}`} />
                        <span className={`font-semibold ${isActive ? 'text-white' : ''}`}>{tab.name}</span>
                      </div>
                      <p className={`text-xs ${isActive ? 'text-white/90' : 'text-gray-500 dark:text-gray-500'}`}>
                        {tab.description}
                      </p>
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className={`absolute -bottom-[1px] left-0 right-0 h-0.5 bg-gradient-to-r ${tab.gradient} rounded-t-full`}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </nav>
          </div>

          {/* Content con transición animada */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AIModelsManager;
