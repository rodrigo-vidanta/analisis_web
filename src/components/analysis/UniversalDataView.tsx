import React, { useState } from 'react';

// ============================================
// INTERFACES Y TIPOS
// ============================================

interface UniversalDataViewProps {
  data: any;
  title: string;
  icon: React.ReactNode;
  className?: string;
}

interface Section {
  key: string;
  title: string;
  data: any;
  icon: React.ReactNode;
  highlights?: string[];
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const UniversalDataView: React.FC<UniversalDataViewProps> = ({
  data,
  title,
  icon,
  className = ""
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  // ============================================
  // HELPERS
  // ============================================
  
  const toggleSection = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
  };
  
  const hasValue = (value: any): boolean => {
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  };
  
  const getValueDisplay = (value: any): string => {
    if (value === null || value === undefined) return 'No especificado';
    if (value === '') return 'Vacío';
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : 'Lista vacía';
    }
    if (typeof value === 'object') {
      return Object.keys(value).length > 0 ? 'Ver detalles' : 'Objeto vacío';
    }
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    return String(value);
  };
  
  const getHighlights = (obj: any): string[] => {
    const highlights: string[] = [];
    
    if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        if (hasValue(value)) {
          if (typeof value === 'object' && !Array.isArray(value)) {
            const subHighlights = getHighlights(value);
            highlights.push(...subHighlights.map(h => `${key}: ${h}`));
          } else {
            highlights.push(`${key}: ${getValueDisplay(value)}`);
          }
        }
      });
    }
    
    return highlights.slice(0, 3); // Solo los primeros 3 highlights
  };
  
  const getSections = (): Section[] => {
    if (!data || typeof data !== 'object') return [];
    
    return Object.entries(data).map(([key, value]) => ({
      key,
      title: formatSectionTitle(key),
      data: value,
      icon: getSectionIcon(key),
      highlights: typeof value === 'object' ? getHighlights(value) : undefined
    }));
  };
  
  const formatSectionTitle = (key: string): string => {
    const titleMap: { [key: string]: string } = {
      elementosObligatorios: 'Elementos Obligatorios',
      metricas_cumplimiento: 'Métricas de Cumplimiento',
      perfil: 'Perfil del Cliente',
      contacto: 'Información de Contacto',
      patrones: 'Patrones de Comunicación',
      rapport_metricas: 'Métricas de Rapport',
      metricas_derivadas: 'Métricas Derivadas',
      datos_originales: 'Datos Originales',
      areas_performance: 'Áreas de Performance',
      metricas_calculadas: 'Métricas Calculadas',
      etapas: 'Etapas del Script',
      metricas_script: 'Métricas del Script',
      FODA: 'Análisis FODA',
      analisisGeneral: 'Análisis General',
      objeciones_resumen: 'Resumen de Objeciones',
      problemasDetectados: 'Problemas Detectados',
      estadia: 'Información de Estadía'
    };
    
    return titleMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };
  
  const getSectionIcon = (key: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      elementosObligatorios: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      metricas_cumplimiento: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      perfil: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      contacto: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      )
    };
    
    return iconMap[key] || (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };
  
  const renderValue = (value: any, key: string = ''): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-slate-400 dark:text-slate-500 italic">No especificado</span>;
    }
    
    if (value === '') {
      return <span className="text-slate-400 dark:text-slate-500 italic">Vacío</span>;
    }
    
    if (typeof value === 'boolean') {
      return (
        <span className={value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
          {value ? '✓ Sí' : '✗ No'}
        </span>
      );
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-slate-400 dark:text-slate-500 italic">Lista vacía</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, index) => (
            <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs rounded">
              {String(item)}
            </span>
          ))}
        </div>
      );
    }
    
    if (typeof value === 'object') {
      return (
        <div className="space-y-2">
          {Object.entries(value).map(([subKey, subValue]) => (
            <div key={subKey} className="flex justify-between items-start">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400 capitalize">
                {subKey.replace(/([A-Z])/g, ' $1')}:
              </span>
              <div className="text-sm text-slate-900 dark:text-white ml-2 flex-1 text-right">
                {renderValue(subValue, subKey)}
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    return <span className="text-slate-900 dark:text-white">{String(value)}</span>;
  };
  
  // ============================================
  // RENDER
  // ============================================
  
  if (!data) {
    return (
      <div className={`bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center ${className}`}>
        <svg className="w-12 h-12 text-yellow-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
          No hay {title.toLowerCase()} disponibles
        </h3>
        <p className="text-yellow-700 dark:text-yellow-300">
          Esta llamada no contiene {title.toLowerCase()}.
        </p>
      </div>
    );
  }
  
  const sections = getSections();
  
  return (
    <div className={`space-y-4 ${className}`}>
      
      {/* Header principal */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {title}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {sections.length} secciones disponibles
            </p>
          </div>
        </div>
      </div>
      
      {/* Secciones colapsables */}
      <div className="space-y-3">
        {sections.map((section) => {
          const isExpanded = expandedSections.has(section.key);
          const hasData = hasValue(section.data);
          
          return (
            <div key={section.key} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              
              {/* Header de sección */}
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded flex items-center justify-center ${
                    hasData 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                  }`}>
                    {section.icon}
                  </div>
                  
                  <div className="text-left">
                    <h3 className="font-medium text-slate-900 dark:text-white">
                      {section.title}
                    </h3>
                    
                    {/* Highlights cuando está colapsado */}
                    {!isExpanded && section.highlights && section.highlights.length > 0 && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {section.highlights.slice(0, 2).join(' • ')}
                        {section.highlights.length > 2 && '...'}
                      </div>
                    )}
                    
                    {!isExpanded && !hasData && (
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Sin información disponible
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Indicador de datos */}
                  <div className={`w-2 h-2 rounded-full ${
                    hasData ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}></div>
                  
                  {/* Flecha */}
                  <svg 
                    className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              {/* Contenido expandido */}
              {isExpanded && (
                <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900">
                  {typeof section.data === 'object' && section.data !== null ? (
                    <div className="space-y-3">
                      {Object.entries(section.data).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-start py-2 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400 capitalize flex-shrink-0 w-1/3">
                            {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:
                          </span>
                          <div className="text-sm text-slate-900 dark:text-white ml-4 flex-1">
                            {renderValue(value, key)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-900 dark:text-white">
                      {renderValue(section.data)}
                    </div>
                  )}
                </div>
              )}
              
            </div>
          );
        })}
      </div>
      
      {/* Botón para expandir/colapsar todo */}
      <div className="flex justify-center">
        <button
          onClick={() => {
            if (expandedSections.size === sections.length) {
              setExpandedSections(new Set());
            } else {
              setExpandedSections(new Set(sections.map(s => s.key)));
            }
          }}
          className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
        >
          {expandedSections.size === sections.length ? 'Colapsar Todo' : 'Expandir Todo'}
        </button>
      </div>
      
    </div>
  );
};

export default UniversalDataView;
