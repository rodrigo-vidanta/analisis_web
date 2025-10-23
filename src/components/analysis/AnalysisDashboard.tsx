/**
 * ============================================
 * DASHBOARD DE ANÁLISIS - MÓDULO ANÁLISIS IA
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/analysis/README_ANALISIS_IA.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/analysis/README_ANALISIS_IA.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/analysis/CHANGELOG_ANALISIS_IA.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

import React, { useState, useEffect, useRef } from 'react';
import { analysisSupabase } from '../../config/analysisSupabase';
import Chart from 'chart.js/auto';
import PQNCDashboard from './PQNCDashboard';
import { useAuth } from '../../contexts/AuthContext';

interface AnalysisRecord {
  analysis_id: string;
  call_id: string;
  created_at: string;
  score_general: number;
  categoria_desempeno: string;
  checkpoint_alcanzado: number;
  nivel_interes_detectado: string;
  resultado_llamada: string;
  feedback_positivo: string[];
  feedback_constructivo: any[];
  total_puntos_positivos: number;
  total_areas_mejora: number;
  calificaciones: Record<string, string>;
}

interface AnalysisDashboardProps {
  forceMode?: 'natalia' | 'pqnc';
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ forceMode }) => {
  const { user, canAccessSubModule, checkAnalysisPermissions } = useAuth();
  
  // Estado de la aplicación
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allData, setAllData] = useState<AnalysisRecord[]>([]);
  const [filteredData, setFilteredData] = useState<AnalysisRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AnalysisRecord | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Búsqueda y filtros
  const [searchCallId, setSearchCallId] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterInteres, setFilterInteres] = useState('');
  const [showOnlyIntelligent, setShowOnlyIntelligent] = useState(false);
  
  // Permisos específicos de análisis
  const [analysisPermissions, setAnalysisPermissions] = useState<{natalia: boolean, pqnc: boolean}>({ natalia: false, pqnc: false });
  
  // UI Estado - Usar forceMode si está definido, sino usar lógica anterior
  const [selectedAnalysis, setSelectedAnalysis] = useState<'natalia' | 'pqnc'>(() => {
    if (forceMode) return forceMode;
    
    if (!user) return 'natalia';
    
    // Admin ve por defecto Natalia
    if (user.role_name === 'admin') return 'natalia';
    
    // Developer no debe ver análisis, pero en caso de que llegue aquí
    if (user.role_name === 'developer') return 'natalia';
    
    // Evaluator: determinar basado en sus permisos
    if (user.role_name === 'evaluator') {
      if (canAccessSubModule('pqnc') && !canAccessSubModule('natalia')) {
        return 'pqnc';
      }
      return 'natalia'; // Por defecto si tiene ambos o solo natalia
    }
    
    return 'natalia';
  });

  // Actualizar selectedAnalysis cuando cambie forceMode
  useEffect(() => {
    if (forceMode) {
      setSelectedAnalysis(forceMode);
    }
  }, [forceMode]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailChart, setDetailChart] = useState<Chart | null>(null);
  const detailRadarChartRef = useRef<HTMLCanvasElement>(null);

  // Cargar permisos específicos de análisis
  useEffect(() => {
    const loadAnalysisPermissions = async () => {
      try {
        const permissions = await checkAnalysisPermissions();
        setAnalysisPermissions(permissions);
        
        // Ajustar selección inicial basada en permisos reales
        if (user?.role_name === 'evaluator') {
          if (permissions.pqnc && !permissions.natalia) {
            setSelectedAnalysis('pqnc');
          } else if (permissions.natalia && !permissions.pqnc) {
            setSelectedAnalysis('natalia');
          } else if (permissions.natalia) {
            setSelectedAnalysis('natalia'); // Por defecto si tiene ambos
          }
        }
      } catch (error) {
        console.error('Error loading analysis permissions:', error);
      }
    };

    if (user) {
      loadAnalysisPermissions();
    }
  }, [user, checkAnalysisPermissions]);

  // Mapeo de calificaciones a valores numéricos
  const calificationScores: Record<string, number> = {
    'PERFECTO': 10, 'MAESTRO': 10, 'DOMINANTE': 10, 'COMPLETO': 10,
    'EXCELENTE': 9, 'EXITOSO': 9, 'PRECISA': 9,
    'EFECTIVO': 8, 'BUENA': 8, 'CONTROLADO': 8, 'SUFICIENTE': 8, 'ALTO': 8, 'ADECUADA': 8,
    'BUENO': 7, 'PARCIAL': 6, 'REGULAR': 6, 'BASICO': 6, 'MEDIO': 6, 'TARDÍA': 5,
    'INCONSISTENTE': 4, 'INCOMPLETO': 4, 'DEFICIENTE': 3, 'BAJO': 3, 'INEFECTIVO': 3, 'FALLIDA': 3,
    'INCORRECTO': 2, 'PERDIDO': 2, 'FALLIDO': 2, 'NO_REALIZADO': 2,
    'NO_APLICABLE': 0, 'NO_HUBO': 0
  };

  // Función de ponderación inteligente según filosofía de Natalia
  const adjustScoreForIntelligentTransfer = (
    record: AnalysisRecord, 
    califications: Record<string, string>
  ): Record<string, number> => {
    const adjustedScores: Record<string, number> = {};
    const isHighInterest = record.nivel_interes_detectado === 'alto' || record.nivel_interes_detectado === 'muy_alto';
    const wasTransferred = record.resultado_llamada?.toLowerCase().includes('transferencia') || 
                          record.resultado_llamada?.toLowerCase().includes('derivado') ||
                          record.resultado_llamada?.toLowerCase().includes('supervisor');
    
    Object.entries(califications).forEach(([key, value]) => {
      let baseScore = calificationScores[value.toUpperCase()] || 5;
      
      // Ajustes contextuales según la filosofía de Natalia
      if (isHighInterest && wasTransferred) {
        // Si hay alto interés y transferencia, algunos "incompletos" no son malos
        if (key.toLowerCase().includes('discovery') && 
            (value.toUpperCase() === 'INCOMPLETO' || value.toUpperCase() === 'PARCIAL')) {
          baseScore = Math.min(baseScore + 3, 8); // Bonus por transferencia inteligente
        }
        
        if (key.toLowerCase().includes('urgencia') && value.toUpperCase() === 'DETECTADA') {
          baseScore = Math.min(baseScore + 2, 10); // Bonus por detectar urgencia
        }
        
        // Discovery rápido en casos de alta temperatura es inteligente
        if (key.toLowerCase().includes('tiempo') && 
            (value.toUpperCase() === 'RAPIDO' || value.toUpperCase() === 'EFICIENTE')) {
          baseScore = Math.min(baseScore + 1, 10);
        }
      }
      
      // Penalización menor para transferencias estratégicas exitosas
      if (wasTransferred && isHighInterest && 
          (value.toUpperCase() === 'NO_REALIZADO' || value.toUpperCase() === 'INCOMPLETO')) {
        // Solo si es discovery, no otras métricas críticas
        if (key.toLowerCase().includes('discovery') || key.toLowerCase().includes('familiar')) {
          baseScore = Math.max(baseScore, 4); // Piso mínimo para transferencias inteligentes
        }
      }
      
      adjustedScores[key] = baseScore;
    });
    
    return adjustedScores;
  };

  useEffect(() => {
    loadLastRecords(10);
  }, []);

  // Efecto separado para manejar call_id desde Prospectos
  useEffect(() => {
    // Capturar call_id desde localStorage si viene desde Prospectos
    const savedCallId = localStorage.getItem('natalia-search-call-id');
    if (savedCallId) {
      setSearchCallId(savedCallId);
      localStorage.removeItem('natalia-search-call-id'); // Limpiar después de usar
    }
    
    // Escuchar evento personalizado desde Prospectos
    const handleNataliaSearch = (event: any) => {
      const callId = event.detail;
      if (callId) {
        setSearchCallId(callId);
      }
    };
    
    window.addEventListener('natalia-search-call-id', handleNataliaSearch);
    
    return () => {
      window.removeEventListener('natalia-search-call-id', handleNataliaSearch);
    };
  }, []);

  // Efecto para hacer búsqueda automática cuando searchCallId cambia
  useEffect(() => {
    if (searchCallId && searchCallId.length > 0) {
      const timer = setTimeout(() => {
        searchById();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchCallId]);

  useEffect(() => {
    applyFilters();
  }, [minScore, filterCategory, filterInteres, filterDate, showOnlyIntelligent, allData]);

  // Efecto para manejar el gráfico cuando se abre el modal
  useEffect(() => {
    if (showDetailModal && selectedRecord && selectedRecord.calificaciones) {
      // Esperar un poco más para que el DOM esté completamente renderizado
      const timer = setTimeout(() => {
        updateDetailRadarChart();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [showDetailModal, selectedRecord]);

  const searchById = async () => {
    if (!searchCallId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const { data, error } = await analysisSupabase
        .from('call_analysis_summary')
        .select('*')
        .eq('call_id', searchCallId);

      if (error) throw error;

      if (data && data.length > 0) {
        setAllData(data);
        setFilteredData(data);
        setTotalRecords(data.length);
        
        if (data.length === 1) {
          viewDetail(data[0]);
        }
      } else {
        setError('No se encontró ningún registro con ese Call ID');
        setAllData([]);
        setFilteredData([]);
      }
    } catch (err: any) {
      setError(`Error al buscar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadLastRecords = async (limit: number) => {
    setLoading(true);
    setError('');
    
    try {
      const { count } = await analysisSupabase
        .from('call_analysis_summary')
        .select('*', { count: 'exact', head: true });
      
      setTotalRecords(count || 0);

      const { data, error } = await analysisSupabase
        .from('call_analysis_summary')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setAllData(data || []);
      applyFilters();
    } catch (err: any) {
      setError(`Error al cargar registros: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allData];

    if (minScore > 0) {
      filtered = filtered.filter(record => 
        parseFloat(record.score_general.toString()) >= minScore
      );
    }

    if (filterCategory) {
      filtered = filtered.filter(record => 
        record.categoria_desempeno === filterCategory
      );
    }

    if (filterInteres) {
      filtered = filtered.filter(record => 
        record.nivel_interes_detectado === filterInteres
      );
    }

    if (filterDate) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.created_at);
        const filterDateObj = new Date(filterDate + 'T00:00:00');
        
        return recordDate.toDateString() === filterDateObj.toDateString();
      });
    }

    // Filtro de ponderación inteligente
    if (showOnlyIntelligent) {
      filtered = filtered.filter(record => {
        const isHighInterest = record.nivel_interes_detectado === 'alto' || record.nivel_interes_detectado === 'muy_alto';
        const wasTransferred = record.resultado_llamada?.toLowerCase().includes('transferencia') || 
                              record.resultado_llamada?.toLowerCase().includes('derivado') ||
                              record.resultado_llamada?.toLowerCase().includes('supervisor');
        return isHighInterest && wasTransferred;
      });
    }

    setFilteredData(filtered);
  };

  const viewDetail = (record: AnalysisRecord) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
    
    // Dar más tiempo para que el modal se renderice completamente
    setTimeout(() => {
      updateDetailRadarChart();
    }, 300);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getCategoryClass = (category: string) => {
    switch(category) {
      case 'EXCELENTE': return 'text-green-600 dark:text-green-400';
      case 'MUY BUENO': return 'text-blue-600 dark:text-blue-400';
      case 'BUENO': return 'text-teal-600 dark:text-teal-400';
      case 'REGULAR': return 'text-yellow-600 dark:text-yellow-400';
      case 'NECESITA MEJORA': return 'text-orange-600 dark:text-orange-400';
      case 'DEFICIENTE': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getInterestClass = (interest: string) => {
    switch(interest) {
      case 'MUY_ALTO':
      case 'ALTO':
        return 'text-green-600 dark:text-green-400';
      case 'MEDIO':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'BAJO':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const updateDetailRadarChart = () => {
    const ctx = detailRadarChartRef.current;
    console.log('🎯 Intentando crear gráfico radar...');
    console.log('Canvas:', ctx);
    console.log('Selected record:', selectedRecord);
    console.log('Calificaciones:', selectedRecord?.calificaciones);
    
    if (!ctx || !selectedRecord || !selectedRecord.calificaciones) {
      console.log('❌ No se puede crear el gráfico - faltan elementos');
      return;
    }

    if (detailChart) {
      console.log('🗑️ Destruyendo gráfico anterior');
      detailChart.destroy();
      setDetailChart(null);
    }

    try {
      const labels = Object.keys(selectedRecord.calificaciones).map(key => 
        key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      );
      
      // Aplicar ponderación inteligente según filosofía de Natalia
      const adjustedScores = adjustScoreForIntelligentTransfer(selectedRecord, selectedRecord.calificaciones);
      const data = labels.map((_, index) => {
        const originalKey = Object.keys(selectedRecord.calificaciones)[index];
        return adjustedScores[originalKey] || 5;
      });

      console.log('📊 Datos del gráfico (ajustados):', { labels, data });
      console.log('🎯 Ajuste inteligente aplicado:', {
        isHighInterest: selectedRecord.nivel_interes_detectado === 'alto' || selectedRecord.nivel_interes_detectado === 'muy_alto',
        wasTransferred: selectedRecord.resultado_llamada?.toLowerCase().includes('transferencia')
      });

      const newChart = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Calificaciones',
            data: data,
            backgroundColor: 'rgba(16, 185, 129, 0.2)', // Emerald color matching the theme
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(16, 185, 129, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(16, 185, 129, 1)',
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          animation: {
            duration: 1000,
            easing: 'easeOutQuart'
          },
          scales: {
            r: {
              beginAtZero: true,
              max: 10,
              ticks: {
                stepSize: 2,
                font: { size: 10 },
                color: '#64748b'
              },
              pointLabels: {
                font: { size: 11 },
                color: '#475569'
              },
              grid: {
                color: '#e2e8f0'
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context: any) {
                  const calificationName = Object.values(selectedRecord.calificaciones)[context.dataIndex];
                  return `${context.label}: ${calificationName} (${context.raw}/10)`;
                }
              }
            }
          }
        }
      });

      setDetailChart(newChart);
      console.log('✅ Gráfico creado exitosamente');
    } catch (error) {
      console.error('❌ Error creando el gráfico:', error);
    }
  };

  const exportTableData = () => {
    if (filteredData.length === 0) {
      setError('No hay datos para exportar');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const headers = [
      'Call ID', 'Fecha', 'Score General', 'Categoría', 'Checkpoint',
      'Nivel de Interés', 'Resultado', 'Puntos Positivos', 'Áreas de Mejora'
    ];

    const rows = filteredData.map(record => [
      record.call_id,
      new Date(record.created_at).toLocaleString('es-MX'),
      parseFloat(record.score_general.toString()).toFixed(2),
      record.categoria_desempeno || '',
      record.checkpoint_alcanzado || 0,
      record.nivel_interes_detectado || '',
      record.resultado_llamada || '',
      record.total_puntos_positivos || 0,
      record.total_areas_mejora || 0
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => {
        const value = String(cell).replace(/"/g, '""');
        return value.includes(',') ? `"${value}"` : value;
      }).join(',') + '\n';
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `analisis_llamadas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className={selectedAnalysis === 'pqnc' ? 'w-full px-6 py-8' : 'max-w-7xl mx-auto px-6 py-8'}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-2">
            Dashboard de Análisis de Llamadas
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Analiza el rendimiento y resultados de las llamadas procesadas por los agentes
          </p>

        </div>

        {/* Renderizado Condicional */}
        {selectedAnalysis === 'pqnc' ? (
          <PQNCDashboard />
        ) : (
          <>
            {/* Metodología Inteligente */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 mb-8">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mb-1">
                    📊 Metodología de Análisis Inteligente
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                    <strong>Filosofía de Natalia:</strong> El objetivo NO es completar todos los checkpoints, sino <em>detectar temperatura del prospecto y transferir en el momento óptimo</em>. 
                    Las transferencias tempranas por <strong>alta intención de compra</strong> son exitosas. Discovery omitido + Urgencia detectada = Estrategia inteligente, no falla del proceso.
                  </p>
                </div>
              </div>
            </div>

            {/* Controles de Búsqueda y Filtros */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Búsqueda y Filtros
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Búsqueda por ID específico */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Buscar por Call ID
            </label>
            <div className="flex space-x-2">
              <input 
                type="text" 
                value={searchCallId}
                onChange={(e) => setSearchCallId(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && searchById()}
                placeholder="Ingrese el Call ID..."
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
              <button 
                onClick={searchById}
                disabled={!searchCallId}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-slate-400 transition duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Cargar últimos registros */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Cargar Registros Recientes
            </label>
            <div className="flex space-x-2">
              <button 
                onClick={() => loadLastRecords(10)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 text-sm"
              >
                Últimos 10
              </button>
              <button 
                onClick={() => loadLastRecords(20)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 text-sm"
              >
                Últimos 20
              </button>
              <button 
                onClick={() => loadLastRecords(50)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 text-sm"
              >
                Últimos 50
              </button>
            </div>
          </div>

          {/* Filtro por fecha */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Filtrar por Fecha
            </label>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Filtros adicionales */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Score Mínimo
            </label>
            <div className="flex items-center space-x-3">
              <input 
                type="range" 
                value={minScore} 
                min="0" 
                max="100" 
                step="5"
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-semibold w-12 text-center text-slate-700 dark:text-slate-300">
                {minScore}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Categoría
            </label>
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            >
              <option value="">Todas las categorías</option>
              <option value="EXCELENTE">Excelente</option>
              <option value="MUY BUENO">Muy Bueno</option>
              <option value="BUENO">Bueno</option>
              <option value="REGULAR">Regular</option>
              <option value="NECESITA MEJORA">Necesita Mejora</option>
              <option value="DEFICIENTE">Deficiente</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Nivel de Interés
            </label>
            <select 
              value={filterInteres} 
              onChange={(e) => setFilterInteres(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            >
              <option value="">Todos los niveles</option>
              <option value="MUY_ALTO">Muy Alto</option>
              <option value="ALTO">Alto</option>
              <option value="MEDIO">Medio</option>
              <option value="BAJO">Bajo</option>
            </select>
          </div>
        </div>

        {/* Toggle de Ponderación Inteligente */}
        <div className="mt-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  🎯 Mostrar solo Transferencias Estratégicas
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Filtrar llamadas con alta intención + transferencia inteligente
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowOnlyIntelligent(!showOnlyIntelligent)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                showOnlyIntelligent 
                  ? 'bg-emerald-600' 
                  : 'bg-slate-200 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showOnlyIntelligent ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="mt-6 flex flex-wrap gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg px-4 py-2">
            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              Total registros: {totalRecords}
            </span>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg px-4 py-2">
            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Registros filtrados: {filteredData.length}
            </span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg relative mb-6">
          {error}
        </div>
      )}

      {/* Tabla de Resultados */}
      {!loading && filteredData.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Resultados de Análisis
              </h3>
              <button 
                onClick={exportTableData}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition duration-200"
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Exportar CSV
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Call ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Checkpoint
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Nivel Interés
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Resultado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {filteredData.map((record) => (
                  <tr 
                    key={record.analysis_id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                    onClick={() => viewDetail(record)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center">
                        <span 
                          title={record.call_id}
                          className="cursor-help"
                        >
                          {record.call_id.substring(0, 8)}...
                        </span>
                        {/* Indicador de Ponderación Inteligente */}
                        {(record.nivel_interes_detectado === 'alto' || record.nivel_interes_detectado === 'muy_alto') && 
                         (record.resultado_llamada?.toLowerCase().includes('transferencia') || 
                          record.resultado_llamada?.toLowerCase().includes('derivado') ||
                          record.resultado_llamada?.toLowerCase().includes('supervisor')) && (
                          <div className="ml-2 flex items-center" title="Ponderación Inteligente Aplicada - Transferencia Estratégica">
                            <span className="text-xs text-emerald-600">🎯</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {new Date(record.created_at).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold ${
                        parseFloat(record.score_general.toString()) >= 80
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : parseFloat(record.score_general.toString()) >= 50
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {parseFloat(record.score_general.toString()).toFixed(0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryClass(record.categoria_desempeno).includes('green') 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : getCategoryClass(record.categoria_desempeno).includes('blue')
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : getCategoryClass(record.categoria_desempeno).includes('teal')
                        ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400'
                        : getCategoryClass(record.categoria_desempeno).includes('yellow')
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : getCategoryClass(record.categoria_desempeno).includes('orange')
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {record.categoria_desempeno ? record.categoria_desempeno.replace('_', ' ') : 'Sin categoría'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mr-2">
                          {record.checkpoint_alcanzado || 0}
                        </span>
                        <div className="w-20 bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                          <div 
                            className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full" 
                            style={{ width: `${(record.checkpoint_alcanzado || 0) * 10}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.nivel_interes_detectado === 'MUY_ALTO' || record.nivel_interes_detectado === 'ALTO'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : record.nivel_interes_detectado === 'MEDIO'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {record.nivel_interes_detectado ? record.nivel_interes_detectado.replace('_', ' ') : 'No detectado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-500 dark:text-slate-400">
                      {(record.resultado_llamada || 'Sin resultado').substring(0, 50)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay datos */}
      {!loading && filteredData.length === 0 && !error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414a1 1 0 00-.707-.293H4" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-300 mb-2">No se encontraron registros</h3>
          <p className="text-slate-500 dark:text-slate-400">Intenta ajustar los filtros o cargar más registros</p>
        </div>
      )}

      {/* Modal de Detalle */}
      {showDetailModal && selectedRecord && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetailModal(false);
              if (detailChart) {
                detailChart.destroy();
                setDetailChart(null);
              }
            }
          }}
        >
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Detalle del Análisis</h2>
              <button 
                onClick={() => {
                  setShowDetailModal(false);
                  if (detailChart) {
                    detailChart.destroy();
                    setDetailChart(null);
                  }
                }}
                className="text-white hover:text-slate-200 transition duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Contenido del Modal */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
              {/* Información General */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">Call ID</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">{selectedRecord.call_id}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Fecha</p>
                  <p className="text-slate-700 dark:text-slate-300">{new Date(selectedRecord.created_at).toLocaleString('es-MX')}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">Resultado</p>
                  <p className="text-slate-700 dark:text-slate-300 text-sm">{selectedRecord.resultado_llamada || 'Sin resultado'}</p>
                </div>
              </div>

              {/* Métricas Principales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Score General */}
                <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-6 text-center">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Score General</h4>
                  <div className="relative w-32 h-32 mx-auto">
                    <svg className="transform -rotate-90 w-32 h-32">
                      <circle cx="64" cy="64" r="50" stroke="#e5e7eb" strokeWidth="12" fill="none" className="dark:stroke-gray-600"></circle>
                      <circle 
                        cx="64" 
                        cy="64" 
                        r="50" 
                        stroke={getScoreColor(parseFloat(selectedRecord.score_general.toString()))} 
                        strokeWidth="12" 
                        fill="none"
                        strokeDasharray="314"
                        strokeDashoffset={314 - ((parseFloat(selectedRecord.score_general.toString()) / 100) * 314)}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                        {parseFloat(selectedRecord.score_general.toString()).toFixed(0)}
                      </span>
                    </div>
                  </div>
                  <p className={`mt-4 text-sm font-medium ${getCategoryClass(selectedRecord.categoria_desempeno)}`}>
                    {selectedRecord.categoria_desempeno ? selectedRecord.categoria_desempeno.replace('_', ' ') : 'Sin categoría'}
                  </p>
                </div>

                {/* Checkpoint */}
                <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-6 text-center">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Checkpoint Alcanzado</h4>
                  <div className="text-5xl font-bold text-purple-600 dark:text-purple-400 mb-4">
                    {selectedRecord.checkpoint_alcanzado || '0'}
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-3">
                    <div 
                      className="bg-purple-600 dark:bg-purple-400 h-3 rounded-full transition-all duration-500" 
                      style={{ width: `${(selectedRecord.checkpoint_alcanzado || 0) * 10}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">de 10 checkpoints</p>
                </div>

                {/* Nivel de Interés */}
                <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-6 text-center">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Nivel de Interés</h4>
                  <div className={`text-3xl font-bold mb-4 ${getInterestClass(selectedRecord.nivel_interes_detectado)}`}>
                    {selectedRecord.nivel_interes_detectado ? selectedRecord.nivel_interes_detectado.replace('_', ' ') : 'No detectado'}
                  </div>
                  <div className="flex justify-center space-x-2">
                    <div className={`w-20 h-3 rounded-full ${
                      selectedRecord.nivel_interes_detectado === 'BAJO' ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`} />
                    <div className={`w-20 h-3 rounded-full ${
                      selectedRecord.nivel_interes_detectado === 'MEDIO' ? 'bg-yellow-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`} />
                    <div className={`w-20 h-3 rounded-full ${
                      selectedRecord.nivel_interes_detectado === 'ALTO' || selectedRecord.nivel_interes_detectado === 'MUY_ALTO' ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`} />
                  </div>
                </div>
              </div>

              {/* Feedback */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Puntos Positivos */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6">
                  <h4 className="text-xl font-semibold text-green-800 dark:text-green-300 mb-4">
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                    Puntos Positivos ({selectedRecord.total_puntos_positivos || 0})
                  </h4>
                  <div className="space-y-3">
                    {selectedRecord.feedback_positivo?.map((feedback, index) => (
                      <div key={index} className="bg-white/80 dark:bg-slate-800/80 rounded-lg p-3 flex items-start space-x-3">
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-slate-700 dark:text-slate-300 text-sm">{feedback}</span>
                      </div>
                    )) || (
                      <div className="text-slate-500 dark:text-slate-400 text-sm italic">
                        No se registraron puntos positivos
                      </div>
                    )}
                  </div>
                </div>

                {/* Áreas de Mejora */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-6">
                  <h4 className="text-xl font-semibold text-orange-800 dark:text-orange-300 mb-4">
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Áreas de Mejora ({selectedRecord.total_areas_mejora || 0})
                  </h4>
                  <div className="space-y-3">
                    {selectedRecord.feedback_constructivo?.map((area, index) => (
                      <div key={index} className="bg-white/80 dark:bg-slate-800/80 rounded-lg p-3">
                        <h5 className="font-semibold text-slate-700 dark:text-slate-300 mb-1 text-sm">Problema {index + 1}:</h5>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{area.problema}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                          <strong>Ubicación:</strong> {area.ubicacion}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          <strong>Solución:</strong> {area.solucion_tecnica}
                        </p>
                      </div>
                    )) || (
                      <div className="text-slate-500 dark:text-slate-400 text-sm italic">
                        No se registraron áreas de mejora
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Gráfico Radar con Metodología Inteligente */}
              {selectedRecord.calificaciones && Object.keys(selectedRecord.calificaciones).length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                  <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-6 text-center">
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Análisis Visual Inteligente
                  </h4>
                  
                  {/* Indicador de Ajuste Inteligente */}
                  {(selectedRecord.nivel_interes_detectado === 'alto' || selectedRecord.nivel_interes_detectado === 'muy_alto') && 
                   (selectedRecord.resultado_llamada?.toLowerCase().includes('transferencia') || 
                    selectedRecord.resultado_llamada?.toLowerCase().includes('derivado') ||
                    selectedRecord.resultado_llamada?.toLowerCase().includes('supervisor')) && (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-4 mb-6">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h5 className="font-semibold text-emerald-800 dark:text-emerald-200">
                          🎯 Ponderación Inteligente Aplicada
                        </h5>
                      </div>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-2">
                        Esta llamada muestra <strong>alto interés</strong> y <strong>transferencia estratégica</strong>. 
                        Los puntajes han sido ajustados según la filosofía de Natalia: <em>detectar temperatura y transferir en el momento óptimo</em>.
                        Discovery incompleto + Alta intención = Estrategia exitosa.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex justify-center">
                    <div className="w-96 h-96 relative">
                      <canvas 
                        ref={detailRadarChartRef}
                        className="w-full h-full"
                        width="384" 
                        height="384"
                      ></canvas>
                    </div>
                  </div>
                  
                  <div className="mt-6 space-y-2">
                    <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                      Gráfico de radar con <strong>ponderación inteligente</strong> (escala 0-10)
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full mr-1"></div>
                        Transferencia estratégica bonificada
                      </span>
                      <span className="flex items-center">
                        <div className="w-3 h-3 bg-amber-500 rounded-full mr-1"></div>
                        Discovery contextual evaluado
                      </span>
                      <span className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                        Detección de urgencia premiada
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
              )}
          </>
        )}
      </div>
    </div>
  );
};

export default AnalysisDashboard;
