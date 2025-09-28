import React, { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';

const ImageGenerationSection: React.FC = () => {
  const { isLinearTheme } = useTheme();
  const [prompt, setPrompt] = useState('');

  const cardClass = isLinearTheme 
    ? 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'
    : 'corp-card corp-glow';

  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Generación de Imágenes con IA
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Creación inteligente con Nano Banana y referencias del repositorio
        </p>
        
        <div className={cardClass + ' p-6 max-w-2xl mx-auto'}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Prompt inteligente:
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ej: quiero una imagen de samuel en el mayan palace, tomándose una bebida de naranja"
                className="w-full h-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
                maxLength={500}
              />
            </div>

            <button
              disabled={!prompt.trim()}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Buscar Referencias y Generar</span>
            </button>
            
            <div className="text-sm text-slate-500 dark:text-slate-400 space-y-2">
              <p><strong>Funcionalidades preparadas:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Generación inteligente con búsqueda automática</li>
                <li>Integración con Nano Banana</li>
                <li>Uso de referencias del repositorio</li>
                <li>Control total de parámetros</li>
                <li>Historial visual de generaciones</li>
                <li>Sugerencias rápidas predefinidas</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGenerationSection;