import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Search, Sparkles, Image as ImageIcon, Zap, History, Lightbulb } from 'lucide-react';

const ImageGenerationSection: React.FC = () => {
  const [prompt, setPrompt] = useState('');

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
          className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25"
        >
          <Wand2 className="w-8 h-8 text-white" />
        </motion.div>
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
        >
          Generación de Imágenes con IA
        </motion.h3>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-sm text-gray-600 dark:text-gray-400 mb-6"
        >
          Creación inteligente con Nano Banana y referencias del repositorio
        </motion.p>
        
        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-6 max-w-2xl mx-auto"
        >
          <div className="space-y-6">
            {/* Section Bar */}
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Prompt Inteligente
              </h4>
            </div>

            {/* Textarea */}
            <div className="group">
              <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                <Sparkles className="w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                <span>Describe la imagen que deseas generar</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ej: quiero una imagen de samuel en el mayan palace, tomándose una bebida de naranja"
                className="w-full h-32 px-4 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 resize-none"
                maxLength={500}
              />
              <div className="flex justify-end mt-1">
                <span className={`text-xs font-medium ${prompt.length > 450 ? 'text-orange-500' : prompt.length > 400 ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-500'}`}>
                  {prompt.length}/500
                </span>
              </div>
            </div>

            {/* Generate Button */}
            <motion.button
              whileHover={{ scale: prompt.trim() ? 1.02 : 1 }}
              whileTap={{ scale: prompt.trim() ? 0.98 : 1 }}
              disabled={!prompt.trim()}
              className={`w-full py-3 px-6 text-sm font-semibold text-white rounded-xl disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 ${
                prompt.trim()
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:via-teal-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/30'
                  : 'bg-gray-300 dark:bg-gray-700 opacity-50'
              }`}
            >
              <Search className="w-5 h-5" />
              <span>Buscar Referencias y Generar</span>
            </motion.button>
            
            {/* Features List */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="pt-4 border-t border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Funcionalidades Preparadas
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { icon: Zap, text: 'Generación inteligente con búsqueda automática' },
                  { icon: ImageIcon, text: 'Integración con Nano Banana' },
                  { icon: Search, text: 'Uso de referencias del repositorio' },
                  { icon: Sparkles, text: 'Control total de parámetros' },
                  { icon: History, text: 'Historial visual de generaciones' },
                  { icon: Lightbulb, text: 'Sugerencias rápidas predefinidas' }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + index * 0.05 }}
                    className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    <feature.icon className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
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

export default ImageGenerationSection;