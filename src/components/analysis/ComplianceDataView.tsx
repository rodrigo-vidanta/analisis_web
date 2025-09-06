import React from 'react';

// ============================================
// INTERFACES Y TIPOS
// ============================================

interface ComplianceElement {
  mencionado: boolean;
  textoExacto: string;
  duracionMencionada?: boolean;
  mencionAmbosConyuges?: boolean;
  porcentajeExplicado?: boolean;
  tipoYCategoria?: string;
  capacidadExplicada?: boolean;
}

interface ComplianceData {
  elementosObligatorios: {
    tour?: ComplianceElement;
    checkInOut?: ComplianceElement;
    impuestoHotelero?: ComplianceElement;
    descripcionHabitacion?: ComplianceElement;
  };
  metricas_cumplimiento: {
    riesgo_normativo: string;
    elementos_requeridos: number;
    elementos_mencionados: number;
    porcentaje_cumplimiento: number;
  };
}

interface ComplianceDataViewProps {
  complianceData: ComplianceData;
  className?: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const ComplianceDataView: React.FC<ComplianceDataViewProps> = ({
  complianceData,
  className = ""
}) => {
  
  // ============================================
  // HELPERS
  // ============================================
  
  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'bajo': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'medio': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'alto': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      default: return 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400';
    }
  };
  
  const getComplianceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    if (percentage >= 40) return 'text-orange-600';
    return 'text-red-600';
  };
  
  const getElementIcon = (elementType: string, mentioned: boolean) => {
    const iconClass = mentioned ? 'text-green-500' : 'text-red-500';
    
    switch (elementType) {
      case 'tour':
        return (
          <svg className={`w-5 h-5 ${iconClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'checkInOut':
        return (
          <svg className={`w-5 h-5 ${iconClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'impuestoHotelero':
        return (
          <svg className={`w-5 h-5 ${iconClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        );
      case 'descripcionHabitacion':
        return (
          <svg className={`w-5 h-5 ${iconClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      default:
        return (
          <svg className={`w-5 h-5 ${iconClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };
  
  const getElementTitle = (elementType: string) => {
    switch (elementType) {
      case 'tour': return 'Tour Guiado';
      case 'checkInOut': return 'Check-in/Check-out';
      case 'impuestoHotelero': return 'Impuesto Hotelero';
      case 'descripcionHabitacion': return 'Descripción de Habitación';
      default: return elementType;
    }
  };
  
  // ============================================
  // RENDER
  // ============================================
  
  const { elementosObligatorios, metricas_cumplimiento } = complianceData;
  
  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Header con métricas generales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Riesgo Normativo */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">Riesgo Normativo</h3>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(metricas_cumplimiento.riesgo_normativo)}`}>
                {metricas_cumplimiento.riesgo_normativo.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
        
        {/* Elementos Mencionados */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">Elementos Mencionados</h3>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {metricas_cumplimiento.elementos_mencionados} / {metricas_cumplimiento.elementos_requeridos}
              </div>
            </div>
          </div>
        </div>
        
        {/* Porcentaje de Cumplimiento */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">Cumplimiento</h3>
              <div className={`text-lg font-bold ${getComplianceColor(metricas_cumplimiento.porcentaje_cumplimiento)}`}>
                {metricas_cumplimiento.porcentaje_cumplimiento}%
              </div>
            </div>
          </div>
        </div>
        
      </div>
      
      {/* Elementos Obligatorios Detallados */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Elementos Obligatorios
          </h3>
        </div>
        
        <div className="p-4 space-y-4">
          {Object.entries(elementosObligatorios).map(([key, element]) => (
            <div key={key} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              
              {/* Header del elemento */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getElementIcon(key, element.mencionado)}
                  <h4 className="font-medium text-slate-900 dark:text-white">
                    {getElementTitle(key)}
                  </h4>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  element.mencionado 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {element.mencionado ? 'MENCIONADO' : 'NO MENCIONADO'}
                </span>
              </div>
              
              {/* Detalles del elemento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                
                {/* Texto Exacto */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Texto Exacto:
                  </label>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded p-2 min-h-[60px]">
                    {element.textoExacto ? (
                      <p className="text-slate-700 dark:text-slate-300 italic">
                        "{element.textoExacto}"
                      </p>
                    ) : (
                      <p className="text-slate-400 dark:text-slate-500">
                        No se encontró texto específico
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Atributos específicos */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Detalles Específicos:
                  </label>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded p-2 space-y-1">
                    
                    {/* Tour específico */}
                    {key === 'tour' && (
                      <>
                        <div className="flex justify-between">
                          <span>Duración mencionada:</span>
                          <span className={element.duracionMencionada ? 'text-green-600' : 'text-red-600'}>
                            {element.duracionMencionada ? '✓' : '✗'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ambos cónyuges:</span>
                          <span className={element.mencionAmbosConyuges ? 'text-green-600' : 'text-red-600'}>
                            {element.mencionAmbosConyuges ? '✓' : '✗'}
                          </span>
                        </div>
                      </>
                    )}
                    
                    {/* Impuesto específico */}
                    {key === 'impuestoHotelero' && (
                      <div className="flex justify-between">
                        <span>Porcentaje explicado:</span>
                        <span className={element.porcentajeExplicado ? 'text-green-600' : 'text-red-600'}>
                          {element.porcentajeExplicado ? '✓' : '✗'}
                        </span>
                      </div>
                    )}
                    
                    {/* Habitación específica */}
                    {key === 'descripcionHabitacion' && (
                      <>
                        <div className="flex justify-between">
                          <span>Tipo y categoría:</span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {element.tipoYCategoria || 'No especificado'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Capacidad explicada:</span>
                          <span className={element.capacidadExplicada ? 'text-green-600' : 'text-red-600'}>
                            {element.capacidadExplicada ? '✓' : '✗'}
                          </span>
                        </div>
                      </>
                    )}
                    
                    {/* Para otros elementos, mostrar info genérica */}
                    {!['tour', 'impuestoHotelero', 'descripcionHabitacion'].includes(key) && (
                      <div className="text-slate-500 dark:text-slate-400 text-xs">
                        Elemento estándar de compliance
                      </div>
                    )}
                    
                  </div>
                </div>
                
              </div>
              
            </div>
          ))}
        </div>
        
      </div>
      
      {/* Barra de progreso visual */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">
            Progreso de Cumplimiento
          </h3>
          <span className={`text-sm font-bold ${getComplianceColor(metricas_cumplimiento.porcentaje_cumplimiento)}`}>
            {metricas_cumplimiento.porcentaje_cumplimiento}%
          </span>
        </div>
        
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              metricas_cumplimiento.porcentaje_cumplimiento >= 80 ? 'bg-green-500' :
              metricas_cumplimiento.porcentaje_cumplimiento >= 60 ? 'bg-yellow-500' :
              metricas_cumplimiento.porcentaje_cumplimiento >= 40 ? 'bg-orange-500' :
              'bg-red-500'
            }`}
            style={{ width: `${metricas_cumplimiento.porcentaje_cumplimiento}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
      
    </div>
  );
};

export default ComplianceDataView;
