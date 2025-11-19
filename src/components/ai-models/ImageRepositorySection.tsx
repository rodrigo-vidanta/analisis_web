import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ImageIcon, Search, Filter, Layers, Tag, Palette, Clock, Database, Sparkles } from 'lucide-react';

const ImageRepositorySection: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center py-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
          className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25"
        >
          <ImageIcon className="w-8 h-8 text-white" />
        </motion.div>
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
        >
          Repositorio de Imágenes
        </motion.h3>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-sm text-gray-600 dark:text-gray-400 mb-6"
        >
          Gestión avanzada de assets visuales clasificados
        </motion.p>
        
        {/* Search Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-6 max-w-2xl mx-auto"
        >
          <div className="space-y-6">
            {/* Section Bar */}
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Búsqueda Inteligente
              </h4>
            </div>

            {/* Search Input */}
            <div className="group">
              <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                <Search className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <span>Buscar imágenes en el repositorio</span>
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por resort, amenidad, personaje, mood..."
                className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
              />
            </div>
            
            {/* Features List */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="pt-4 border-t border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Funcionalidades Preparadas
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { icon: Layers, text: 'Clasificación por resort, amenidad, personaje' },
                  { icon: Filter, text: 'Filtros multidimensionales (formato, resolución, mood)' },
                  { icon: Sparkles, text: 'Búsqueda semántica con embeddings' },
                  { icon: Tag, text: 'Selección múltiple para procesamiento' },
                  { icon: Palette, text: 'Metadatos ricos (color, hora del día, temporada)' },
                  { icon: Database, text: 'Integración con bucket de almacenamiento' }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + index * 0.05 }}
                    className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    <feature.icon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>{feature.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ImageRepositorySection;
