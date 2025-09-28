import React, { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';

const ImageRepositorySection: React.FC = () => {
  const { isLinearTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const cardClass = isLinearTheme 
    ? 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'
    : 'corp-card corp-glow';

  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Repositorio de Imágenes
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Gestión avanzada de assets visuales clasificados
        </p>
        
        <div className={cardClass + ' p-6 max-w-2xl mx-auto'}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Búsqueda inteligente:
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por resort, amenidad, personaje, mood..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="text-sm text-slate-500 dark:text-slate-400 space-y-2">
              <p><strong>Funcionalidades preparadas:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Clasificación por resort, amenidad, personaje</li>
                <li>Filtros multidimensionales (formato, resolución, mood)</li>
                <li>Búsqueda semántica con embeddings</li>
                <li>Selección múltiple para procesamiento</li>
                <li>Metadatos ricos (color, hora del día, temporada)</li>
                <li>Integración con bucket de almacenamiento</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageRepositorySection;
