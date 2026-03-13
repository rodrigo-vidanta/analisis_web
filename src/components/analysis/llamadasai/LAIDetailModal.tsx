/**
 * LAI Detail Modal
 * Modal de detalle con radar chart para el modulo Llamadas AI (Natalia)
 * Glassmorphism + neutral-* colors + Chart.js radar
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Chart from 'chart.js/auto';
import { X, BarChart3, TrendingUp, CheckCircle2, AlertCircle, Target } from 'lucide-react';
import type { LAIAnalysisRecord, LAIEnrichedRecord } from '../../../types/llamadasAITypes';
import { adjustScoreForIntelligentTransfer, isIntelligentTransfer } from '../../../types/llamadasAITypes';
import { SCALE_IN, BACKDROP_VARIANTS, BACKDROP_TRANSITION } from '../../../styles/tokens/animations';

// ============================================
// TYPES
// ============================================

interface LAIDetailModalProps {
  record: LAIEnrichedRecord;
  detail: LAIAnalysisRecord | null;
  onClose: () => void;
}

// ============================================
// HELPERS
// ============================================

function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function getScoreTextClass(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getCategoryClass(category: string): string {
  switch (category) {
    case 'EXCELENTE': return 'text-emerald-600 dark:text-emerald-400';
    case 'MUY BUENO': return 'text-blue-600 dark:text-blue-400';
    case 'BUENO': return 'text-teal-600 dark:text-teal-400';
    case 'REGULAR': return 'text-amber-600 dark:text-amber-400';
    case 'NECESITA MEJORA': return 'text-orange-600 dark:text-orange-400';
    case 'DEFICIENTE': return 'text-red-600 dark:text-red-400';
    default: return 'text-neutral-600 dark:text-neutral-400';
  }
}

function getCategoryBadgeClass(category: string): string {
  switch (category) {
    case 'EXCELENTE': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'MUY BUENO': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'BUENO': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400';
    case 'REGULAR': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'NECESITA MEJORA': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case 'DEFICIENTE': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400';
  }
}

function getInterestClass(interest: string): string {
  switch (interest) {
    case 'MUY_ALTO':
    case 'ALTO':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'MEDIO':
      return 'text-amber-600 dark:text-amber-400';
    case 'BAJO':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-neutral-600 dark:text-neutral-400';
  }
}

function isInterestHigh(interest: string): boolean {
  return interest === 'ALTO' || interest === 'MUY_ALTO' ||
    interest === 'alto' || interest === 'muy_alto';
}

function isInterestMedium(interest: string): boolean {
  return interest === 'MEDIO' || interest === 'medio';
}

function isInterestLow(interest: string): boolean {
  return interest === 'BAJO' || interest === 'bajo';
}

// ============================================
// COMPONENT
// ============================================

const LAIDetailModal: React.FC<LAIDetailModalProps> = ({ record, detail, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const scoreValue = parseFloat(record.score_general.toString());
  const circumference = 2 * Math.PI * 50; // ~314
  const strokeOffset = circumference - (scoreValue / 100) * circumference;
  const showIntelligentTransfer = isIntelligentTransfer(record);

  // Chart.js radar
  useEffect(() => {
    if (!canvasRef.current || !detail?.calificaciones) return;

    // Destroy previous chart
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const calKeys = Object.keys(detail.calificaciones);
    if (calKeys.length === 0) return;

    const labels = calKeys.map(key =>
      key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    );
    const adjustedScores = adjustScoreForIntelligentTransfer(detail, detail.calificaciones);
    const data = calKeys.map(key => adjustedScores[key] || 5);

    chartRef.current = new Chart(canvasRef.current, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: 'Calificaciones',
          data,
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(16, 185, 129, 1)',
          pointBorderColor: '#fff',
          pointRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          r: {
            beginAtZero: true,
            max: 10,
            ticks: { stepSize: 2, font: { size: 10 }, color: '#64748b' },
            pointLabels: { font: { size: 11 }, color: '#475569' },
            grid: { color: '#e2e8f0' },
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const keys = Object.keys(detail.calificaciones);
                const calValue = detail.calificaciones[keys[context.dataIndex]];
                return `${context.label}: ${calValue} (${context.raw}/10)`;
              }
            }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [detail]);

  // Keyboard close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Merge detail feedback into record for display
  const feedbackPositivo = detail?.feedback_positivo ?? record.feedback_positivo ?? [];
  const feedbackConstructivo = detail?.feedback_constructivo ?? record.feedback_constructivo ?? [];
  const totalPositivos = detail?.total_puntos_positivos ?? record.total_puntos_positivos ?? 0;
  const totalMejora = detail?.total_areas_mejora ?? record.total_areas_mejora ?? 0;
  const calificaciones = detail?.calificaciones ?? record.calificaciones;
  const hasCalificaciones = calificaciones && Object.keys(calificaciones).length > 0;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        variants={BACKDROP_VARIANTS}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={BACKDROP_TRANSITION}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 lg:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Modal container */}
        <motion.div
          variants={SCALE_IN}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col border border-neutral-100 dark:border-neutral-800 overflow-hidden"
        >
          {/* ==================== HEADER ==================== */}
          <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <motion.h2
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-2xl font-bold text-neutral-900 dark:text-white mb-1 flex items-center"
                >
                  <BarChart3 className="w-6 h-6 mr-3 text-emerald-500" />
                  Detalle del Analisis
                </motion.h2>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400"
                >
                  <span className="font-mono text-xs">{record.call_id}</span>
                  <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                  <span>{new Date(record.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeClass(record.categoria_desempeno)}`}>
                    {record.categoria_desempeno ? record.categoria_desempeno.replace(/_/g, ' ') : 'Sin categoria'}
                  </span>
                </motion.div>
              </div>

              <motion.button
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.2 }}
                onClick={onClose}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 group ml-4 flex-shrink-0"
              >
                <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
              </motion.button>
            </div>
          </div>

          {/* ==================== SCROLLABLE CONTENT ==================== */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent px-8 py-6">

            {/* ---- INFO CARDS ---- */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-5 border border-purple-200 dark:border-purple-800"
              >
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">Call ID</p>
                <p className="text-sm text-neutral-900 dark:text-white font-mono font-semibold truncate">{record.call_id}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800"
              >
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Fecha</p>
                <p className="text-sm text-neutral-900 dark:text-white font-semibold">{new Date(record.created_at).toLocaleString('es-MX')}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 }}
                className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800"
              >
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">Resultado</p>
                <p className="text-sm text-neutral-900 dark:text-white font-semibold">{record.resultado_llamada || 'Sin resultado'}</p>
              </motion.div>
            </motion.div>

            {/* ---- METRICS ROW ---- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

              {/* Score General - SVG ring */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 text-center shadow-sm"
              >
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
                  <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Score General</h4>
                </div>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="transform -rotate-90 w-32 h-32">
                    <circle
                      cx="64" cy="64" r="50"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-neutral-200 dark:text-neutral-700"
                    />
                    <circle
                      cx="64" cy="64" r="50"
                      stroke={getScoreColor(scoreValue)}
                      strokeWidth="12"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={circumference.toString()}
                      strokeDashoffset={strokeOffset}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-neutral-800 dark:text-neutral-200">
                      {scoreValue.toFixed(0)}
                    </span>
                  </div>
                </div>
                <p className={`mt-4 text-sm font-medium ${getCategoryClass(record.categoria_desempeno)}`}>
                  {record.categoria_desempeno ? record.categoria_desempeno.replace(/_/g, ' ') : 'Sin categoria'}
                </p>
              </motion.div>

              {/* Checkpoint */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 text-center shadow-sm"
              >
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
                  <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Checkpoint Alcanzado</h4>
                </div>
                <div className="text-5xl font-bold text-purple-600 dark:text-purple-400 mb-4">
                  {record.checkpoint_alcanzado || '0'}
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(record.checkpoint_alcanzado || 0) * 10}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 uppercase tracking-wider">de 10 checkpoints</p>
              </motion.div>

              {/* Nivel de Interes */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 text-center shadow-sm"
              >
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
                  <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Nivel de Interes</h4>
                </div>
                <div className={`text-3xl font-bold mb-4 ${getInterestClass(record.nivel_interes_detectado)}`}>
                  {record.nivel_interes_detectado ? record.nivel_interes_detectado.replace(/_/g, ' ') : 'No detectado'}
                </div>
                <div className="flex justify-center space-x-2">
                  <div className={`w-20 h-3 rounded-full transition-all duration-300 ${
                    isInterestLow(record.nivel_interes_detectado)
                      ? 'bg-red-500 shadow-lg shadow-red-500/50'
                      : 'bg-neutral-300 dark:bg-neutral-600'
                  }`} />
                  <div className={`w-20 h-3 rounded-full transition-all duration-300 ${
                    isInterestMedium(record.nivel_interes_detectado)
                      ? 'bg-amber-500 shadow-lg shadow-amber-500/50'
                      : 'bg-neutral-300 dark:bg-neutral-600'
                  }`} />
                  <div className={`w-20 h-3 rounded-full transition-all duration-300 ${
                    isInterestHigh(record.nivel_interes_detectado)
                      ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50'
                      : 'bg-neutral-300 dark:bg-neutral-600'
                  }`} />
                </div>
              </motion.div>
            </div>

            {/* ---- FEEDBACK SECTION ---- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

              {/* Puntos Positivos */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-2xl p-6 border border-emerald-200 dark:border-emerald-800"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
                  <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Puntos Positivos ({totalPositivos})
                  </h4>
                </div>
                <div className="space-y-3">
                  {feedbackPositivo.length > 0 ? feedbackPositivo.map((feedback, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      className="bg-white/80 dark:bg-neutral-800/80 rounded-xl p-4 flex items-start space-x-3 border border-emerald-200/50 dark:border-emerald-800/50"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-neutral-700 dark:text-neutral-300 text-sm">{feedback}</span>
                    </motion.div>
                  )) : (
                    <div className="text-neutral-500 dark:text-neutral-400 text-sm italic py-4">
                      No se registraron puntos positivos
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Areas de Mejora */}
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-2xl p-6 border border-orange-200 dark:border-orange-800"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-5 bg-gradient-to-b from-orange-500 to-red-500 rounded-full" />
                  <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-300 uppercase tracking-wider flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Areas de Mejora ({totalMejora})
                  </h4>
                </div>
                <div className="space-y-3">
                  {feedbackConstructivo.length > 0 ? feedbackConstructivo.map((area, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      className="bg-white/80 dark:bg-neutral-800/80 rounded-xl p-4 border border-orange-200/50 dark:border-orange-800/50"
                    >
                      <h5 className="font-semibold text-neutral-700 dark:text-neutral-300 mb-2 text-sm">Problema {index + 1}:</h5>
                      <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-3">{area.problema}</p>
                      <div className="space-y-1">
                        <p className="text-xs text-neutral-500 dark:text-neutral-500">
                          <strong className="text-neutral-700 dark:text-neutral-300">Ubicacion:</strong> {area.ubicacion}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-500">
                          <strong className="text-neutral-700 dark:text-neutral-300">Solucion:</strong> {area.solucion_tecnica}
                        </p>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="text-neutral-500 dark:text-neutral-400 text-sm italic py-4">
                      No se registraron areas de mejora
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* ---- RADAR CHART ---- */}
            {hasCalificaciones && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700"
              >
                <div className="flex items-center justify-center space-x-2 mb-6">
                  <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
                  <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2 text-blue-500" />
                    Analisis Visual Inteligente
                  </h4>
                </div>

                {/* Intelligent Transfer Banner */}
                {showIntelligentTransfer && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.55 }}
                    className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-5 mb-6"
                  >
                    <div className="flex items-center">
                      <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mr-2 flex-shrink-0" />
                      <h5 className="font-semibold text-emerald-800 dark:text-emerald-200">
                        Ponderacion Inteligente Aplicada
                      </h5>
                    </div>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-2">
                      Esta llamada muestra <strong>alto interes</strong> y <strong>transferencia estrategica</strong>.
                      Los puntajes han sido ajustados segun la filosofia de Natalia: <em>detectar temperatura y transferir en el momento optimo</em>.
                      Discovery incompleto + Alta intencion = Estrategia exitosa.
                    </p>
                  </motion.div>
                )}

                <div className="flex justify-center">
                  <div className="w-96 h-96 relative">
                    <canvas
                      ref={canvasRef}
                      className="w-full h-full"
                      width="384"
                      height="384"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                    Grafico de radar con <strong className="text-neutral-700 dark:text-neutral-300">ponderacion inteligente</strong> (escala 0-10)
                  </p>
                  <div className="flex flex-wrap justify-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="flex items-center">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full mr-2" />
                      Transferencia estrategica bonificada
                    </span>
                    <span className="flex items-center">
                      <div className="w-3 h-3 bg-amber-500 rounded-full mr-2" />
                      Discovery contextual evaluado
                    </span>
                    <span className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
                      Deteccion de urgencia premiada
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LAIDetailModal;
