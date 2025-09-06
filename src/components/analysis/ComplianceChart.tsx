import React, { useRef, useEffect } from 'react';
import { Chart, registerables } from 'chart.js/auto';

Chart.register(...registerables);

// ============================================
// INTERFACES Y TIPOS
// ============================================

interface ComplianceChartProps {
  complianceData: any;
  className?: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const ComplianceChart: React.FC<ComplianceChartProps> = ({
  complianceData,
  className = ""
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  
  // ============================================
  // EFECTOS
  // ============================================
  
  useEffect(() => {
    if (chartRef.current && complianceData) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        // Destruir gráfica anterior si existe
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }
        
        // Preparar datos para la gráfica
        const elementosObligatorios = complianceData.elementosObligatorios || {};
        const elementos = Object.keys(elementosObligatorios);
        const mencionados = elementos.filter(key => elementosObligatorios[key]?.mencionado).length;
        const noMencionados = elementos.length - mencionados;
        const porcentajeCumplimiento = complianceData.metricas_cumplimiento?.porcentaje_cumplimiento || 0;
        
        // Crear gráfica de donut con gauge effect
        chartInstanceRef.current = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Cumplidos', 'Pendientes', 'Vacío'],
            datasets: [{
              data: [
                mencionados,
                noMencionados,
                Math.max(0, 1 - (mencionados + noMencionados) / 10) // Padding para efecto gauge
              ],
              backgroundColor: [
                '#10B981', // Verde para cumplidos
                '#EF4444', // Rojo para pendientes
                'transparent' // Transparente para el efecto gauge
              ],
              borderWidth: 0,
              cutout: '75%',
              rotation: -90,
              circumference: 180, // Solo media vuelta para efecto gauge
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    if (context.label === 'Vacío') return '';
                    const label = context.label || '';
                    const value = context.parsed;
                    return `${label}: ${value} elementos`;
                  }
                }
              }
            },
            animation: {
              duration: 1500,
              easing: 'easeInOutQuart'
            }
          },
          plugins: [{
            id: 'centerText',
            beforeDraw: function(chart) {
              const ctx = chart.ctx;
              const centerX = chart.width / 2;
              const centerY = chart.height / 2;
              
              ctx.save();
              
              // Texto principal (porcentaje)
              ctx.font = 'bold 24px Inter, sans-serif';
              ctx.fillStyle = '#1E293B';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(`${porcentajeCumplimiento}%`, centerX, centerY - 10);
              
              // Texto secundario
              ctx.font = '12px Inter, sans-serif';
              ctx.fillStyle = '#64748B';
              ctx.fillText('Cumplimiento', centerX, centerY + 15);
              
              ctx.restore();
            }
          }]
        });
      }
    }
    
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [complianceData]);
  
  // ============================================
  // HELPERS
  // ============================================
  
  const getElementosDetalle = () => {
    if (!complianceData?.elementosObligatorios) return [];
    
    return Object.entries(complianceData.elementosObligatorios).map(([key, element]: [string, any]) => ({
      name: getElementName(key),
      mencionado: element?.mencionado || false,
      textoExacto: element?.textoExacto || '',
      key
    }));
  };
  
  const getElementName = (key: string) => {
    switch (key) {
      case 'tour': return 'Tour Guiado';
      case 'checkInOut': return 'Check-in/Check-out';
      case 'impuestoHotelero': return 'Impuesto Hotelero';
      case 'descripcionHabitacion': return 'Descripción de Habitación';
      default: return key;
    }
  };
  
  const getRiskLevel = () => {
    const riesgo = complianceData?.metricas_cumplimiento?.riesgo_normativo || 'desconocido';
    return riesgo.toUpperCase();
  };
  
  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'bajo': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'medio': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'alto': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      default: return 'text-slate-600 bg-slate-100 dark:bg-slate-800';
    }
  };
  
  // ============================================
  // RENDER
  // ============================================
  
  const elementos = getElementosDetalle();
  const riesgoNormativo = getRiskLevel();
  
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Análisis de Cumplimiento Normativo
        </h3>
        
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getRiskColor(riesgoNormativo)}`}>
          RIESGO {riesgoNormativo}
        </span>
      </div>
      
      {/* Layout en dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfica Gauge */}
        <div className="flex flex-col items-center">
          <div className="relative w-48 h-32">
            <canvas ref={chartRef} />
          </div>
          
          {/* Leyenda personalizada */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs text-slate-600 dark:text-slate-400">Cumplidos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs text-slate-600 dark:text-slate-400">Pendientes</span>
            </div>
          </div>
        </div>
        
        {/* Lista de elementos */}
        <div className="space-y-3">
          <h4 className="font-medium text-slate-900 dark:text-white text-sm">
            Elementos Obligatorios ({elementos.filter(e => e.mencionado).length}/{elementos.length})
          </h4>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {elementos.map((elemento, index) => (
              <div key={index} className={`flex items-center gap-3 p-2 rounded-lg ${
                elemento.mencionado 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  elemento.mencionado ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {elemento.name}
                  </div>
                  {elemento.textoExacto && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      "{elemento.textoExacto.substring(0, 60)}..."
                    </div>
                  )}
                </div>
                
                <div className={`w-5 h-5 ${elemento.mencionado ? 'text-green-500' : 'text-red-500'}`}>
                  {elemento.mencionado ? (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
      </div>
      
    </div>
  );
};

export default ComplianceChart;
