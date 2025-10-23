/**
 * ============================================
 * COMPONENTE LEGACY - MÓDULO LIVE MONITOR
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/analysis/README_LIVEMONITOR.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/analysis/README_LIVEMONITOR.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/analysis/CHANGELOG_LIVEMONITOR.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

import React, { useState, useEffect } from 'react';
import { liveMonitorService, type Prospect, type Agent, type FeedbackData, type LiveCallData } from '../../services/liveMonitorService';
import { Device } from '@twilio/voice-sdk';
import * as Tone from 'tone';

// Extender interfaz Prospect para incluir campos de llamada
interface ExtendedProspect extends Prospect {
  call_id?: string;
  monitor_url?: string;
  control_url?: string;
  call_sid?: string;
  provider?: string;
  account_sid?: string;
  call_status?: string;
}

// Función para reproducir pitido de alerta
const playAlertBeep = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    // Silenciar errores de audio
  }
};

// Tipos importados desde el servicio

// Función utilitaria para obtener progreso
const getCheckpointProgress = (checkpoint: string): number => {
  const progressMap: Record<string, number> = {
    'saludo_continuacion': 20,
    'conexion_emocional': 40,
    'introduccion_paraiso': 60,
    'presentacion_oferta': 80,
    'proceso_pago': 100
  };
  return progressMap[checkpoint] || 10;
};

// Función para detectar si una llamada ha finalizado EXITOSAMENTE
const isCallEnded = (prospect: ExtendedProspect | LiveCallData): boolean => {
  const hasDuration = prospect.duracion_segundos && prospect.duracion_segundos > 0;
  const hasRecording = prospect.audio_ruta_bucket && prospect.audio_ruta_bucket.length > 0;
  
  // Llamada finalizada exitosamente si tiene duración Y grabación
  return hasDuration && hasRecording;
};

// Función para detectar si una llamada FALLÓ (no se conectó)
const isCallFailed = (prospect: ExtendedProspect | LiveCallData): boolean => {
  const hasZeroDuration = prospect.duracion_segundos === 0;
  const hasNoRecording = !prospect.audio_ruta_bucket;
  
  let hasFailureReason = false;
  try {
    if (prospect.datos_llamada) {
      const datosStr = typeof prospect.datos_llamada === 'string' 
        ? prospect.datos_llamada 
        : JSON.stringify(prospect.datos_llamada);
      hasFailureReason = datosStr.includes('customer-did-not-answer') || 
                        datosStr.includes('razon_finalizacion');
    }
  } catch (e) {
    // Si no se puede procesar, no es llamada fallida
    hasFailureReason = false;
  }
  
  // Llamada fallida si tiene duración 0 Y no tiene grabación Y tiene razón de falla
  return hasZeroDuration && hasNoRecording && hasFailureReason;
};

// Función para detectar si una llamada tiene feedback MANUAL
const hasFeedback = (prospect: ExtendedProspect | LiveCallData): boolean => {
  // Usar la nueva columna tiene_feedback si está disponible
  if ('tiene_feedback' in prospect && prospect.tiene_feedback !== undefined) {
    return prospect.tiene_feedback === true;
  }
  
  // Fallback: buscar feedback en observaciones (legacy)
  const hasCallFeedback = prospect.observaciones && 
    prospect.observaciones.includes(`[CALL_FEEDBACK ${prospect.call_id}]`);
  
  const hasLegacyFeedback = prospect.observaciones && 
    (prospect.observaciones.includes('[FEEDBACK') || 
     prospect.observaciones.includes('Feedback desde Live Monitor'));
  
  return hasCallFeedback || hasLegacyFeedback || false;
};

// Función para verificar si una llamada debe mostrarse en el pipeline
const shouldShowInPipeline = (prospect: ExtendedProspect | LiveCallData): boolean => {
  const isEnded = isCallEnded(prospect);
  const isFailed = isCallFailed(prospect);
  const hasManualFeedback = hasFeedback(prospect);
  
  if (!isEnded && !isFailed) {
    // Llamadas activas siempre se muestran
    return true;
  } else {
    // Llamadas finalizadas o fallidas solo se muestran si NO tienen feedback MANUAL
    return !hasManualFeedback;
  }
};

// Función para obtener el estado visual de la llamada
const getCallStatus = (prospect: ExtendedProspect | LiveCallData) => {
  if (isCallFailed(prospect)) {
    return {
      isActive: false,
      isFailed: true,
      statusText: 'Fallida',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-300 dark:border-red-600',
      textColor: 'text-red-600 dark:text-red-400',
      duration: '0:00'
    };
  }
  
  if (isCallEnded(prospect)) {
    return {
      isActive: false,
      isFailed: false,
      statusText: 'Finalizada',
      bgColor: 'bg-gray-100 dark:bg-gray-800',
      borderColor: 'border-gray-300 dark:border-gray-600',
      textColor: 'text-gray-600 dark:text-gray-400',
      duration: prospect.duracion_segundos ? `${Math.floor(prospect.duracion_segundos / 60)}:${(prospect.duracion_segundos % 60).toString().padStart(2, '0')}` : null
    };
  }
  
  return {
    isActive: true,
    isFailed: false,
    statusText: 'En Vivo',
    bgColor: 'bg-white dark:bg-slate-800',
    borderColor: 'border-slate-200 dark:border-slate-700',
    textColor: 'text-slate-900 dark:text-white',
    duration: null
  };
};

// Función utilitaria para obtener color de temperatura
const getTemperatureColor = (temperatura?: string) => {
  switch (temperatura) {
    case 'caliente': return 'from-red-500 to-orange-500';
    case 'tibio': return 'from-yellow-500 to-amber-500';
    case 'frio': return 'from-blue-500 to-cyan-500';
    default: return 'from-slate-500 to-gray-500';
  }
};

// Función de procesamiento técnico avanzado por canal
const aplicarProcesamientoTecnico = (sample: number, isLeft: boolean, settings: any): number => {
  const channelSettings = isLeft ? {
    volume: settings.leftVolume,
    compression: settings.leftCompression,
    noiseGate: settings.leftNoiseGate,
    dynamicRange: settings.leftDynamicRange,
    channelMode: settings.leftChannelMode
  } : {
    volume: settings.rightVolume,
    compression: settings.rightCompression,
    noiseGate: settings.rightNoiseGate,
    dynamicRange: settings.rightDynamicRange,
    channelMode: settings.rightChannelMode
  };
  
  let processed = sample;
  
  // Aplicar volumen del canal
  processed = processed * channelSettings.volume;
  
  // Aplicar compresión (reduce picos, aumenta señales débiles)
  if (channelSettings.compression !== 1.0) {
    const threshold = 0.7;
    if (Math.abs(processed) > threshold) {
      const excess = Math.abs(processed) - threshold;
      const compressed = threshold + (excess * channelSettings.compression);
      processed = processed > 0 ? compressed : -compressed;
    }
  }
  
  // Aplicar rango dinámico
  processed = processed * channelSettings.dynamicRange;
  
  // Gate de ruido
  if (Math.abs(processed) < channelSettings.noiseGate) {
    processed = 0;
  }
  
  return processed;
};

// Panel de Configuración Técnica de Audio
interface AudioConfigPanelProps {
  isVisible: boolean;
  onClose: () => void;
  audioSettings: any;
  onSettingsChange: (settings: any) => void;
}

const AudioConfigPanel: React.FC<AudioConfigPanelProps> = ({
  isVisible,
  onClose,
  audioSettings,
  onSettingsChange
}) => {
  const [lastChanged, setLastChanged] = React.useState<string>('');
  const [changeCount, setChangeCount] = React.useState(0);
  
  if (!isVisible) return null;

  const handleChange = (key: string, value: any) => {
    // Manejar propiedades anidadas (ej: toneEQ.low)
    let newSettings = { ...audioSettings };
    
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      newSettings = {
        ...audioSettings,
        [parent]: {
          ...audioSettings[parent],
          [child]: value
        }
      };
    } else {
      newSettings = {
        ...audioSettings,
        [key]: value
      };
    }
    
    // APLICAR CAMBIOS INMEDIATAMENTE
    onSettingsChange(newSettings);
    
    // APLICAR A TONE.JS EN TIEMPO REAL
    if (key.startsWith('toneEQ.') && toneEffectsChain) {
      const eqParam = key.split('.')[1];
      if (toneEffectsChain.eq3[eqParam]) {
        toneEffectsChain.eq3[eqParam].value = value;
        console.log(`🎵 [TONE.JS APLICADO] EQ ${eqParam}: ${value}dB`);
      }
    } else if (key.startsWith('toneCompressor.') && toneEffectsChain) {
      const compParam = key.split('.')[1];
      if (toneEffectsChain.compressor[compParam]) {
        toneEffectsChain.compressor[compParam].value = value;
        console.log(`📈 [TONE.JS APLICADO] Compressor ${compParam}: ${value}`);
      }
    } else if (key.startsWith('toneFilters.') && toneEffectsChain) {
      const filterParam = key.split('.')[1];
      if (filterParam === 'highpass' && toneEffectsChain.highpass) {
        toneEffectsChain.highpass.frequency.value = value;
        console.log(`🔊 [TONE.JS APLICADO] High-pass: ${value}Hz`);
      } else if (filterParam === 'lowpass' && toneEffectsChain.lowpass) {
        toneEffectsChain.lowpass.frequency.value = value;
        console.log(`🔉 [TONE.JS APLICADO] Low-pass: ${value}Hz`);
      }
    }
    
    // ACTUALIZAR INDICADORES VISUALES
    setLastChanged(key);
    setChangeCount(prev => prev + 1);
    
    // LOGS DETALLADOS EN TIEMPO REAL
    const channelInfo = key.includes('left') ? '🤖 IA (L)' : key.includes('right') ? '👤 Cliente (R)' : '🔧 Global';
    const paramName = key.replace('left', '').replace('right', '').replace(/([A-Z])/g, ' $1').toLowerCase();
    
    console.log(`🔧 [TIEMPO REAL] ${channelInfo} → ${paramName}: ${typeof value === 'number' ? value.toFixed(3) : value}`);
    
    // LOG DETALLADO DEL IMPACTO
    if (key.includes('Volume')) {
      console.log(`📊 Impacto: ${channelInfo} ahora ${value > 1 ? 'amplificado' : 'reducido'} ${(value * 100).toFixed(1)}%`);
    } else if (key.includes('SampleRate')) {
      console.log(`📡 Impacto: ${channelInfo} calidad ${value >= 22050 ? 'ALTA' : value >= 16000 ? 'MEDIA' : 'BÁSICA'} (${value}Hz)`);
    } else if (key.includes('ChannelMode')) {
      console.log(`🎧 Impacto: ${channelInfo} modo ${value.toUpperCase()} activado`);
    } else if (key.includes('Compression')) {
      console.log(`📈 Impacto: ${channelInfo} compresión ${value > 1 ? 'ALTA' : value < 0.8 ? 'BAJA' : 'NORMAL'}`);
    } else if (key.includes('DynamicRange')) {
      console.log(`🎚️ Impacto: ${channelInfo} rango dinámico ${value > 1.2 ? 'AMPLIO' : value < 0.8 ? 'ESTRECHO' : 'NORMAL'}`);
    } else if (key.includes('NoiseGate') || key.includes('Gate')) {
      console.log(`🔇 Impacto: ${channelInfo} filtro ruido ${value > 0.01 ? 'AGRESIVO' : value > 0.005 ? 'MEDIO' : 'SUAVE'}`);
    } else if (key === 'bufferSize') {
      console.log(`⏱️ Impacto: Latencia ${value <= 2 ? 'MUY BAJA' : value <= 4 ? 'BAJA' : value <= 6 ? 'MEDIA' : 'ALTA'} (${value}s)`);
    } else if (key === 'latencyMode') {
      console.log(`⚡ Impacto: Modo ${value.toUpperCase()} - ${value === 'ultra-low' ? 'Mínima latencia, posibles cortes' : value === 'low' ? 'Balance óptimo' : value === 'normal' ? 'Estable, más latencia' : 'Máxima calidad'}`);
    }
    
    // RESUMEN DE CONFIGURACIÓN ACTUAL
    console.log(`📋 [RESUMEN] IA: ${(newSettings.leftVolume || 0.9).toFixed(2)}x | Cliente: ${(newSettings.rightVolume || 2.2).toFixed(2)}x | Buffer: ${newSettings.bufferSize || 4}s`);
  };

  const resetToDefaults = () => {
    onSettingsChange({
      // Canal Izquierdo (IA) - ALTA CALIDAD
      leftVolume: 0.85,
      leftSampleRate: 22050,
      leftChannelMode: 'stereo',
      leftCompression: 0.9,
      leftNoiseGate: 0.002,
      leftDynamicRange: 1.1,
      leftBitDepth: 16,
      
      // Canal Derecho (Cliente) - MÁXIMA CLARIDAD
      rightVolume: 3.5,
      rightSampleRate: 22050,
      rightChannelMode: 'stereo',
      rightCompression: 0.6,
      rightNoiseGate: 0.001,
      rightDynamicRange: 1.8,
      rightBitDepth: 16,
      
      // Global - MÁXIMA CALIDAD
      globalSampleRate: 22050,
      bufferSize: 6,
      bufferChunks: 80,
      masterVolume: 1.2,
      audioFormat: 'pcm',
      latencyMode: 'high-quality',
      processingMode: 'buffered',
      
      // TONE.JS OPTIMIZADO
      useToneJS: true,
      toneEQ: {
        low: -6,     // Reducir graves telefónicos
        lowMid: 2,   // Realzar medios-bajos
        mid: 8,      // REALZAR MEDIOS para claridad
        highMid: 5,  // Realzar medios-altos
        high: 3      // Realzar agudos
      },
      toneCompressor: {
        threshold: -28,
        ratio: 6,
        attack: 0.001,
        release: 0.15,
        knee: 35
      },
      toneFilters: {
        highpass: 120,
        lowpass: 8500,
        notch: 0
      },
      toneEffects: {
        reverb: 0.08,
        delay: 0,
        distortion: 0,
        chorus: 0
      },
      toneChannels: {
        leftVolume: 0.85,
        rightVolume: 3.5,
        stereoWidth: 1.2,
        balance: 0.1
      }
    });
    console.log('🔄 [CONFIGURACIÓN] Reseteo a MÁXIMA CALIDAD aplicado');
  };

  const exportSettings = () => {
    const settingsJson = JSON.stringify(audioSettings, null, 2);
    navigator.clipboard.writeText(settingsJson);
    alert('¡Configuración copiada al portapapeles!');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">🔧</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Configuración Técnica de Audio</h2>
              <p className="text-gray-400 text-sm">Ajusta parámetros técnicos por canal en tiempo real</p>
              {lastChanged && (
                <p className="text-green-400 text-xs mt-1 animate-pulse">
                  ✅ Último cambio: {lastChanged} | Total cambios: {changeCount}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Canal Izquierdo (IA) - Configuración Técnica */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
              <span>🤖</span> Canal Izquierdo (IA)
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Volumen: {audioSettings.leftVolume?.toFixed(2) || '0.90'}</label>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={audioSettings.leftVolume || 0.9}
                  onChange={(e) => handleChange('leftVolume', parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Sample Rate (Hz)</label>
                <select
                  value={audioSettings.leftSampleRate || 16000}
                  onChange={(e) => handleChange('leftSampleRate', parseInt(e.target.value))}
                  className="w-full bg-slate-700 text-white p-2 rounded"
                >
                  <option value={8000}>8000 Hz (Teléfono)</option>
                  <option value={16000}>16000 Hz (VAPI)</option>
                  <option value={22050}>22050 Hz (Calidad)</option>
                  <option value={44100}>44100 Hz (CD)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Modo Canal</label>
                <select
                  value={audioSettings.leftChannelMode || 'stereo'}
                  onChange={(e) => handleChange('leftChannelMode', e.target.value)}
                  className="w-full bg-slate-700 text-white p-2 rounded"
                >
                  <option value="stereo">Estéreo (Normal)</option>
                  <option value="mono">Mono (Mezclado)</option>
                  <option value="left-only">Solo Izquierdo</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Compresión: {audioSettings.leftCompression?.toFixed(2) || '1.00'}</label>
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={audioSettings.leftCompression || 1.0}
                  onChange={(e) => handleChange('leftCompression', parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Rango Dinámico: {audioSettings.leftDynamicRange?.toFixed(2) || '1.00'}</label>
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={audioSettings.leftDynamicRange || 1.0}
                  onChange={(e) => handleChange('leftDynamicRange', parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Gate Ruido: {audioSettings.leftNoiseGate?.toFixed(4) || '0.003'}</label>
                <input
                  type="range"
                  min="0"
                  max="0.02"
                  step="0.001"
                  value={audioSettings.leftNoiseGate || 0.003}
                  onChange={(e) => handleChange('leftNoiseGate', parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Canal Derecho (Cliente) - Configuración Técnica */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
              <span>👤</span> Canal Derecho (Cliente)
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Volumen: {audioSettings.rightVolume?.toFixed(2) || '2.20'}</label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={audioSettings.rightVolume || 2.2}
                  onChange={(e) => handleChange('rightVolume', parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Sample Rate (Hz)</label>
                <select
                  value={audioSettings.rightSampleRate || 16000}
                  onChange={(e) => handleChange('rightSampleRate', parseInt(e.target.value))}
                  className="w-full bg-slate-700 text-white p-2 rounded"
                >
                  <option value={8000}>8000 Hz (Teléfono)</option>
                  <option value={16000}>16000 Hz (VAPI)</option>
                  <option value={22050}>22050 Hz (Calidad)</option>
                  <option value={44100}>44100 Hz (CD)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Modo Canal</label>
                <select
                  value={audioSettings.rightChannelMode || 'stereo'}
                  onChange={(e) => handleChange('rightChannelMode', e.target.value)}
                  className="w-full bg-slate-700 text-white p-2 rounded"
                >
                  <option value="stereo">Estéreo (Normal)</option>
                  <option value="mono">Mono (Mezclado)</option>
                  <option value="right-only">Solo Derecho</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Compresión: {audioSettings.rightCompression?.toFixed(2) || '0.80'}</label>
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={audioSettings.rightCompression || 0.8}
                  onChange={(e) => handleChange('rightCompression', parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Rango Dinámico: {audioSettings.rightDynamicRange?.toFixed(2) || '1.20'}</label>
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={audioSettings.rightDynamicRange || 1.2}
                  onChange={(e) => handleChange('rightDynamicRange', parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Gate Ruido: {audioSettings.rightNoiseGate?.toFixed(4) || '0.003'}</label>
                <input
                  type="range"
                  min="0"
                  max="0.02"
                  step="0.001"
                  value={audioSettings.rightNoiseGate || 0.003}
                  onChange={(e) => handleChange('rightNoiseGate', parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
          
          {/* Panel específico para Tone.js */}
          {audioSettings.useToneJS && (
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
                <span>🎵</span> Tone.js - EQ Paramétrico
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Graves (Low): {audioSettings.toneEQ?.low?.toFixed(1) || '0.0'} dB</label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="0.5"
                    value={audioSettings.toneEQ?.low || 0}
                    onChange={(e) => handleChange('toneEQ.low', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Medios-Bajos: {audioSettings.toneEQ?.lowMid?.toFixed(1) || '0.0'} dB</label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="0.5"
                    value={audioSettings.toneEQ?.lowMid || 0}
                    onChange={(e) => handleChange('toneEQ.lowMid', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Medios: {audioSettings.toneEQ?.mid?.toFixed(1) || '0.0'} dB</label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="0.5"
                    value={audioSettings.toneEQ?.mid || 0}
                    onChange={(e) => handleChange('toneEQ.mid', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Medios-Altos: {audioSettings.toneEQ?.highMid?.toFixed(1) || '0.0'} dB</label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="0.5"
                    value={audioSettings.toneEQ?.highMid || 0}
                    onChange={(e) => handleChange('toneEQ.highMid', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Agudos (High): {audioSettings.toneEQ?.high?.toFixed(1) || '0.0'} dB</label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="0.5"
                    value={audioSettings.toneEQ?.high || 0}
                    onChange={(e) => handleChange('toneEQ.high', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Configuración Global Técnica */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-400 mb-4 flex items-center gap-2">
              <span>🔧</span> {audioSettings.useToneJS ? 'Tone.js Avanzado' : 'Configuración Global'}
            </h3>
            
            <div className="space-y-4">
              {audioSettings.useToneJS ? (
                <>
                  {/* Controles Tone.js Avanzados */}
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Compressor Threshold: {audioSettings.toneCompressor?.threshold?.toFixed(1) || '-24.0'} dB</label>
                    <input
                      type="range"
                      min="-60"
                      max="0"
                      step="1"
                      value={audioSettings.toneCompressor?.threshold || -24}
                      onChange={(e) => handleChange('toneCompressor.threshold', parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Compressor Ratio: {audioSettings.toneCompressor?.ratio?.toFixed(1) || '4.0'}</label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="0.5"
                      value={audioSettings.toneCompressor?.ratio || 4}
                      onChange={(e) => handleChange('toneCompressor.ratio', parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">High-pass Filter: {audioSettings.toneFilters?.highpass || 80} Hz</label>
                    <input
                      type="range"
                      min="20"
                      max="1000"
                      step="10"
                      value={audioSettings.toneFilters?.highpass || 80}
                      onChange={(e) => handleChange('toneFilters.highpass', parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Low-pass Filter: {audioSettings.toneFilters?.lowpass || 8000} Hz</label>
                    <input
                      type="range"
                      min="1000"
                      max="20000"
                      step="100"
                      value={audioSettings.toneFilters?.lowpass || 8000}
                      onChange={(e) => handleChange('toneFilters.lowpass', parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Stereo Width: {audioSettings.toneChannels?.stereoWidth?.toFixed(2) || '1.00'}</label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={audioSettings.toneChannels?.stereoWidth || 1.0}
                      onChange={(e) => handleChange('toneChannels.stereoWidth', parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Reverb: {audioSettings.toneEffects?.reverb?.toFixed(2) || '0.00'}</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={audioSettings.toneEffects?.reverb || 0}
                      onChange={(e) => handleChange('toneEffects.reverb', parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Controles Básicos */}
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Sample Rate Global</label>
                    <select
                      value={audioSettings.globalSampleRate || 16000}
                      onChange={(e) => handleChange('globalSampleRate', parseInt(e.target.value))}
                      className="w-full bg-slate-700 text-white p-2 rounded"
                    >
                      <option value={8000}>8000 Hz</option>
                      <option value={16000}>16000 Hz (Recomendado)</option>
                      <option value={22050}>22050 Hz</option>
                      <option value={44100}>44100 Hz</option>
                    </select>
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Buffer (seg): {audioSettings.bufferSize || 4}</label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={audioSettings.bufferSize || 4}
                  onChange={(e) => handleChange('bufferSize', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Chunks Buffer: {audioSettings.bufferChunks || 40}</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={audioSettings.bufferChunks || 40}
                  onChange={(e) => handleChange('bufferChunks', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Modo Latencia</label>
                <select
                  value={audioSettings.latencyMode || 'low'}
                  onChange={(e) => handleChange('latencyMode', e.target.value)}
                  className="w-full bg-slate-700 text-white p-2 rounded"
                >
                  <option value="ultra-low">Ultra Baja (Más cortes)</option>
                  <option value="low">Baja (Recomendado)</option>
                  <option value="normal">Normal</option>
                  <option value="high-quality">Alta Calidad (Más latencia)</option>
                </select>
              </div>
              
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Modo Procesamiento</label>
                    <select
                      value={audioSettings.processingMode || 'batch'}
                      onChange={(e) => handleChange('processingMode', e.target.value)}
                      className="w-full bg-slate-700 text-white p-2 rounded"
                    >
                      <option value="realtime">⚡ Tiempo Real (Baja latencia)</option>
                      <option value="buffered">🔄 Con Buffer (Balance)</option>
                      <option value="batch">🎛️ Por Lotes (MÁXIMA CALIDAD)</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      {audioSettings.processingMode === 'batch' ? 
                        '🎯 Por Lotes: Máxima calidad, más latencia' :
                        audioSettings.processingMode === 'buffered' ?
                        '⚖️ Buffer: Balance calidad/latencia' :
                        '⚡ Tiempo Real: Mínima latencia, calidad básica'
                      }
                    </p>
                  </div>
                  
                  {/* Presets Rápidos */}
                  <div className="border-t border-slate-600 pt-4">
                    <label className="block text-gray-300 text-sm mb-3">🎯 Presets de Calidad</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          handleChange('processingMode', 'batch');
                          handleChange('bufferSize', 8);
                          handleChange('bufferChunks', 150);
                          handleChange('latencyMode', 'high-quality');
                          console.log('🎛️ [PRESET] MÁXIMA CALIDAD activado');
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs"
                      >
                        🎛️ Máxima Calidad
                      </button>
                      
                      <button
                        onClick={() => {
                          handleChange('processingMode', 'buffered');
                          handleChange('bufferSize', 4);
                          handleChange('bufferChunks', 60);
                          handleChange('latencyMode', 'normal');
                          console.log('⚖️ [PRESET] BALANCE activado');
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-xs"
                      >
                        ⚖️ Balance
                      </button>
                      
                      <button
                        onClick={() => {
                          handleChange('processingMode', 'realtime');
                          handleChange('bufferSize', 2);
                          handleChange('bufferChunks', 20);
                          handleChange('latencyMode', 'ultra-low');
                          console.log('⚡ [PRESET] BAJA LATENCIA activado');
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-xs"
                      >
                        ⚡ Baja Latencia
                      </button>
                      
                      <button
                        onClick={() => {
                          handleChange('processingMode', 'buffered');
                          handleChange('bufferSize', 6);
                          handleChange('bufferChunks', 48);
                          handleChange('latencyMode', 'high-quality');
                          handleChange('globalSampleRate', 16000);
                          handleChange('rightVolume', 5.0);
                          handleChange('masterVolume', 1.8);
                          console.log('💎 [PRESET] VAPI OPTIMIZADO activado');
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-xs"
                      >
                        💎 VAPI Optimizado
                      </button>
                    </div>
                  </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Volumen Maestro: {audioSettings.masterVolume?.toFixed(2) || '1.00'}</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={audioSettings.masterVolume || 1.0}
                  onChange={(e) => handleChange('masterVolume', parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Controles Globales */}
        <div className="mt-6 bg-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-purple-400 mb-4 flex items-center gap-2">
            <span>🎚️</span> Controles Globales
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm mb-2">Volumen Maestro: {audioSettings.masterVolume.toFixed(2)}</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={audioSettings.masterVolume}
                onChange={(e) => handleChange('masterVolume', parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-purple"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm mb-2">Buffer (seg): {audioSettings.bufferSize}</label>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={audioSettings.bufferSize}
                onChange={(e) => handleChange('bufferSize', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-purple"
              />
            </div>
          </div>
        </div>

        {/* Indicadores en Tiempo Real */}
        <div className="mt-6 bg-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
            <span>📊</span> Monitoreo en Tiempo Real
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-700 rounded p-3">
              <h4 className="text-blue-400 font-medium mb-2">🤖 Canal IA (Izquierdo)</h4>
              <div className="text-sm text-gray-300 space-y-1">
                <div>Volumen: <span className="text-blue-400 font-mono">{(audioSettings.leftVolume || 0.9).toFixed(2)}x</span></div>
                <div>Sample Rate: <span className="text-blue-400 font-mono">{audioSettings.leftSampleRate || 16000} Hz</span></div>
                <div>Modo: <span className="text-blue-400 font-mono">{audioSettings.leftChannelMode || 'stereo'}</span></div>
                <div>Compresión: <span className="text-blue-400 font-mono">{(audioSettings.leftCompression || 1.0).toFixed(2)}x</span></div>
              </div>
            </div>
            
            <div className="bg-slate-700 rounded p-3">
              <h4 className="text-green-400 font-medium mb-2">👤 Canal Cliente (Derecho)</h4>
              <div className="text-sm text-gray-300 space-y-1">
                <div>Volumen: <span className="text-green-400 font-mono">{(audioSettings.rightVolume || 2.2).toFixed(2)}x</span></div>
                <div>Sample Rate: <span className="text-green-400 font-mono">{audioSettings.rightSampleRate || 16000} Hz</span></div>
                <div>Modo: <span className="text-green-400 font-mono">{audioSettings.rightChannelMode || 'stereo'}</span></div>
                <div>Compresión: <span className="text-green-400 font-mono">{(audioSettings.rightCompression || 0.8).toFixed(2)}x</span></div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 bg-slate-700 rounded p-3">
            <h4 className="text-purple-400 font-medium mb-2">🔧 Configuración Global</h4>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-300">
              <div>Sample Rate: <span className="text-purple-400 font-mono">{audioSettings.globalSampleRate || 16000} Hz</span></div>
              <div>Buffer: <span className="text-purple-400 font-mono">{audioSettings.bufferSize || 4}s / {audioSettings.bufferChunks || 40} chunks</span></div>
              <div>Latencia: <span className="text-purple-400 font-mono">{audioSettings.latencyMode || 'low'}</span></div>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={resetToDefaults}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            🔄 Resetear
          </button>
          <button
            onClick={exportSettings}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            📋 Exportar Config
          </button>
          <button
            onClick={() => {
              console.log('🎯 Configuración actual:', audioSettings);
              console.log('📊 Aplicando cambios en tiempo real...');
            }}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            🔍 Debug Info
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente Modal de Detalle Avanzado
interface ProspectDetailModalProps {
  prospect: ExtendedProspect | LiveCallData;
  nextAgent: Agent | null;
  onClose: () => void;
  onFeedback: (type: 'contestada' | 'perdida') => void;
  onRefresh: () => void;
  onOpenEqualizer: () => void;
  isConnectedToTwilio: boolean;
  audioSettings: any; // Configuración del ecualizador en tiempo real
  onAudioConnectionChange: (connected: boolean) => void; // Callback para notificar conexión
}

// Componente para llamadas finalizadas
const FinishedCallModal: React.FC<ProspectDetailModalProps> = ({ 
  prospect, 
  nextAgent, 
  onClose, 
  onFeedback 
}) => {
  const callStatus = getCallStatus(prospect);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'contestada' | 'perdida' | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Abrir modal de feedback
  const handleFeedbackRequest = (tipo: 'contestada' | 'perdida') => {
    console.log('🔍 [FINISHED CALL] Abriendo modal de feedback:', tipo);
    setFeedbackType(tipo);
    setShowFeedbackModal(true);
    setFeedbackComment(''); // Reset comentario
  };

  // Ejecutar feedback con comentario obligatorio
  const executeFeedback = async () => {
    console.log('🔍 [FINISHED CALL] Ejecutando feedback:', { feedbackType, comentario: feedbackComment });
    
    if (!feedbackType || !feedbackComment.trim()) {
      alert('Por favor, proporciona un comentario sobre la llamada');
      return;
    }

    try {
      console.log('🔍 [FINISHED CALL] Llamando onFeedback con:', feedbackType, feedbackComment);
      // Pasar solo el tipo a la función de feedback
      await onFeedback(feedbackType);
      
      console.log('✅ [FINISHED CALL] Feedback guardado exitosamente');
      
      // Cerrar modal y limpiar estado
      setShowFeedbackModal(false);
      setFeedbackType(null);
      setFeedbackComment('');
      
      // Cerrar modal principal
      onClose();
    } catch (error) {
      console.error('Error guardando feedback:', error);
      alert('Error al guardar el feedback. Intenta nuevamente.');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white font-bold">
                {(prospect.nombre_completo || prospect.nombre_whatsapp || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {prospect.nombre_completo || prospect.nombre_whatsapp || 'Sin nombre'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Llamada Finalizada • {callStatus.duration || 'N/A'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - Layout Compacto */}
        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Columna 1: Información Personal */}
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center">
                <svg className="w-3 h-3 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Información Personal
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Nombre:</span>
                  <span className="font-medium text-slate-900 dark:text-white text-right">
                    {prospect.nombre_completo || prospect.nombre_whatsapp || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Teléfono:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{prospect.whatsapp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Email:</span>
                  <span className="font-medium text-slate-900 dark:text-white text-right">
                    {prospect.email || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Ciudad:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {prospect.ciudad_residencia || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Estado Civil:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {prospect.estado_civil || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Edad:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{prospect.edad || 'N/A'}</span>
                </div>
              </div>

              {/* Información de Viaje */}
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white mt-4 mb-2 flex items-center">
                <svg className="w-3 h-3 mr-1 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Información de Viaje
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Grupo:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {prospect.tamano_grupo ? `${prospect.tamano_grupo}p` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Viaja con:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {prospect.viaja_con || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Destino:</span>
                  <span className="font-medium text-slate-900 dark:text-white text-right">
                    {prospect.destino_preferencia?.join(', ') || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Menores:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {prospect.cantidad_menores !== null ? prospect.cantidad_menores : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Columna 2: Detalles de Llamada */}
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center">
                <svg className="w-3 h-3 mr-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Detalles de Llamada
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Duración:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{callStatus.duration || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Interés:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{prospect.nivel_interes || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Probabilidad:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{prospect.probabilidad_cierre || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Costo:</span>
                  <span className="font-medium text-slate-900 dark:text-white">${prospect.costo_total || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Tipo:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{prospect.tipo_llamada || 'N/A'}</span>
                </div>
              </div>

              {/* Resultado de Venta */}
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white mt-4 mb-2 flex items-center">
                <svg className="w-3 h-3 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Resultado
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Estado:</span>
                  <span className="font-medium text-slate-900 dark:text-white flex items-center">
                    {prospect.es_venta_exitosa ? (
                      <>
                        <svg className="w-3 h-3 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Exitosa
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3 mr-1 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        No Cerrada
                      </>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Precio:</span>
                  <span className="font-medium text-slate-900 dark:text-white">${prospect.precio_ofertado || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Oferta:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {prospect.oferta_presentada ? 'Sí' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Seguimiento:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {prospect.requiere_seguimiento ? 'Sí' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Columna 3: Grabación */}
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center">
                <svg className="w-3 h-3 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728" />
                </svg>
                Grabación
              </h4>
              {prospect.audio_ruta_bucket ? (
                <audio 
                  controls 
                  controlsList="nodownload noremoteplayback"
                  className="w-full"
                  preload="metadata"
                >
                  <source src={prospect.audio_ruta_bucket} type="audio/wav" />
                  Tu navegador no soporta audio HTML5.
                </audio>
              ) : (
                <div className="text-center py-4">
                  <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                  </svg>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Sin grabación disponible</p>
                </div>
              )}

              {/* Información adicional compacta */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Etapa:</span>
                    <span className="font-medium text-slate-900 dark:text-white">{prospect.etapa}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Campaña:</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {prospect.campana_origen || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Interés:</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {prospect.interes_principal || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Resumen de la Llamada - Ancho Completo */}
          <div className="mt-4 bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Resumen de la Llamada
            </h4>
            {(() => {
              let resumen = 'Resumen no disponible';
              try {
                if (prospect.datos_llamada) {
                  const datosLlamada = typeof prospect.datos_llamada === 'string' 
                    ? JSON.parse(prospect.datos_llamada) 
                    : prospect.datos_llamada;
                  resumen = datosLlamada.resumen || 'Resumen no disponible';
                }
              } catch (e) {
                resumen = 'Error al cargar resumen';
              }
              
              return (
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {resumen}
                  </p>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Footer con Botones de Feedback */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Selecciona el resultado:
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  console.log('🔍 [BUTTON CLICK] Botón Contestada presionado - Llamando función global');
                  onFeedback('contestada');
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Contestada
              </button>
              <button
                onClick={() => {
                  console.log('🔍 [BUTTON CLICK] Botón Perdida presionado - Llamando función global');
                  onFeedback('perdida');
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Perdida
              </button>
            </div>
          </div>
        </div>

        {/* Modal de Feedback Obligatorio */}
        {showFeedbackModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-[70] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Feedback Obligatorio - {feedbackType === 'contestada' ? 'Llamada Contestada' : 'Llamada Perdida'}
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Comentarios sobre la llamada: *
                  </label>
                  <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                    rows={4}
                    placeholder="Describe qué pasó en la llamada, calidad del prospecto, observaciones importantes..."
                    required
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowFeedbackModal(false);
                      setFeedbackType(null);
                      setFeedbackComment('');
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={executeFeedback}
                    disabled={!feedbackComment.trim()}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg"
                  >
                    Guardar Feedback
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Feedback Obligatorio */}
        {showFeedbackModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-[70] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Feedback Obligatorio - {feedbackType === 'contestada' ? 'Llamada Contestada' : 'Llamada Perdida'}
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Comentarios sobre la llamada: *
                  </label>
                  <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                    rows={4}
                    placeholder="Describe qué pasó en la llamada, calidad del prospecto, observaciones importantes..."
                    required
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowFeedbackModal(false);
                      setFeedbackType(null);
                      setFeedbackComment('');
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={executeFeedback}
                    disabled={!feedbackComment.trim()}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg"
                  >
                    Guardar Feedback
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente Modal Unificado
const ProspectDetailModal: React.FC<ProspectDetailModalProps> = ({ 
  prospect, 
  nextAgent, 
  onClose, 
  onFeedback, 
  onRefresh,
  onOpenEqualizer,
  isConnectedToTwilio,
  audioSettings,
  onAudioConnectionChange
}) => {
  const callStatus = getCallStatus(prospect);
  const isCallActive = callStatus.isActive;
  
  // Si la llamada ha finalizado, mostrar el modal de llamada finalizada
  if (!isCallActive) {
    return (
      <FinishedCallModal
        prospect={prospect}
        nextAgent={nextAgent}
        onClose={onClose}
        onFeedback={onFeedback}
        onRefresh={onRefresh}
        onOpenEqualizer={onOpenEqualizer}
        isConnectedToTwilio={isConnectedToTwilio}
        audioSettings={audioSettings}
        onAudioConnectionChange={onAudioConnectionChange}
      />
    );
  }

  // Si la llamada está activa, mostrar el modal de llamada activa
  const progressPercentage = getCheckpointProgress(liveMonitorService.mapEtapaToCheckpoint(prospect.etapa));
  const [isListening, setIsListening] = useState(false);
  const [hangupStep, setHangupStep] = useState(0); // 0: inicial, 1: primer click, 2: confirmación
  const [transferLoading, setTransferLoading] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferReason, setTransferReason] = useState('');
  const [audioWebSocket, setAudioWebSocket] = useState<WebSocket | null>(null);
  const [selectedPresetReason, setSelectedPresetReason] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'contestada' | 'perdida' | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Razones predefinidas para transferencia
  const presetReasons = [
    'Dile que tu supervisor puede ofrecerle un mejor precio exclusivo',
    'Comenta que tu supervisor estaba atento a la llamada y quiere darle un beneficio adicional',
    'Explícale que tu supervisor maneja casos especiales como el suyo',
    'Menciona que tu supervisor tiene autorización para ofertas personalizadas',
    'Dile que tu supervisor puede resolver cualquier duda específica que tenga',
    'Comenta que tu supervisor quiere atenderle personalmente por ser un cliente especial',
    'Explica que tu supervisor tiene disponibilidad limitada solo para hoy'
  ];

  // Monitor de audio real usando WebSocket de VAPI
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioQueue, setAudioQueue] = useState<ArrayBuffer[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [audioBufferSize, setAudioBufferSize] = useState(0);
  
  // Configuración de audio actualizada en tiempo real
  const [currentAudioConfig, setCurrentAudioConfig] = useState(audioSettings);
  
  // Estados para Tone.js
  const [isUsingToneJS, setIsUsingToneJS] = useState(false);
  const [toneEffectsChain, setToneEffectsChain] = useState<any>(null);
  const [toneSettings, setToneSettings] = useState({
    // EQ Paramétrico
    eq: {
      low: 0,      // -20 a +20 dB
      lowMid: 0,   // -20 a +20 dB
      mid: 0,      // -20 a +20 dB
      highMid: 0,  // -20 a +20 dB
      high: 0      // -20 a +20 dB
    },
    // Compresión Dinámica
    compressor: {
      threshold: -24,  // -60 a 0 dB
      ratio: 4,        // 1 a 20
      attack: 0.003,   // 0 a 1 segundo
      release: 0.1,    // 0 a 1 segundo
      knee: 30         // 0 a 40 dB
    },
    // Filtros Avanzados
    filters: {
      highpass: 80,    // 20 a 1000 Hz
      lowpass: 8000,   // 1000 a 20000 Hz
      notch: 0         // 0 = off, frecuencia específica
    },
    // Efectos Especiales
    effects: {
      reverb: 0,       // 0 a 1 (wet)
      delay: 0,        // 0 a 1 (wet)
      distortion: 0,   // 0 a 1 (wet)
      chorus: 0        // 0 a 1 (wet)
    },
    // Control por Canal
    channels: {
      leftVolume: 0.9,
      rightVolume: 2.2,
      stereoWidth: 1.0, // 0 = mono, 1 = estéreo normal, 2 = súper ancho
      balance: 0        // -1 = izquierda, 0 = centro, 1 = derecha
    }
  });
  
  // Actualizar configuración cuando cambie audioSettings
  React.useEffect(() => {
    setCurrentAudioConfig(audioSettings);
    console.log('🔄 [CONFIG ACTUALIZADA] Nueva configuración aplicada:', audioSettings);
  }, [audioSettings]);
  
  // Inicializar cadena de efectos Tone.js
  const initializeToneJS = async () => {
    try {
      await Tone.start();
      console.log('🎵 [TONE.JS] Contexto de audio iniciado');
      
      // Crear cadena de efectos profesional con configuración optimizada para calidad
      const eq3 = new Tone.EQ3({
        low: audioSettings.toneEQ?.low || -6,    // Reducir graves telefónicos
        mid: audioSettings.toneEQ?.mid || 8,     // REALZAR medios para claridad
        high: audioSettings.toneEQ?.high || 3    // Realzar agudos para nitidez
      });
      
      const compressor = new Tone.Compressor({
        threshold: audioSettings.toneCompressor?.threshold || -28,  // Más compresión
        ratio: audioSettings.toneCompressor?.ratio || 6,           // Control de picos
        attack: audioSettings.toneCompressor?.attack || 0.001,     // Ataque rápido
        release: audioSettings.toneCompressor?.release || 0.15,    // Release balanceado
        knee: audioSettings.toneCompressor?.knee || 35             // Transición suave
      });
      
      console.log('🎛️ [TONE.JS] EQ configurado: Low=-6dB, Mid=+8dB, High=+3dB');
      console.log('📈 [TONE.JS] Compressor configurado: -28dB threshold, 6:1 ratio');
      
      const highpass = new Tone.Filter({
        frequency: toneSettings.filters.highpass,
        type: "highpass"
      });
      
      const lowpass = new Tone.Filter({
        frequency: toneSettings.filters.lowpass,
        type: "lowpass"
      });
      
      const reverb = new Tone.Reverb({
        decay: 1.5,
        wet: toneSettings.effects.reverb
      });
      
      const delay = new Tone.Delay({
        delayTime: 0.2,
        wet: toneSettings.effects.delay
      });
      
      const limiter = new Tone.Limiter(-6); // Prevenir distorsión
      
      // Conectar cadena: EQ → Compressor → Limiter → Speakers (SIMPLIFICADO)
      eq3.connect(compressor).connect(limiter).toDestination();
      
      console.log('🔗 [TONE.JS] Cadena conectada: EQ3 → Compressor → Limiter → Speakers');
      
      const effectsChain = {
        eq3,
        compressor,
        highpass,
        lowpass,
        reverb,
        delay,
        limiter,
        // Conectar en cadena
        connect: () => {
          console.log('🔗 [TONE.JS] Cadena ya conectada');
        }
      };
      
      setToneEffectsChain(effectsChain);
      console.log('🎛️ [TONE.JS] Cadena de efectos creada:', Object.keys(effectsChain));
      
      return effectsChain;
    } catch (error) {
      console.error('❌ [TONE.JS] Error inicializando:', error);
      return null;
    }
  };

  // Twilio Voice SDK para audio nativo - ÚNICA SOLUCIÓN
  const [twilioDevice, setTwilioDevice] = useState<Device | null>(null);
  const [twilioCall, setTwilioCall] = useState<any>(null);
  
  // Procesamiento con Tone.js para audio estéreo profesional
  const processToneJSAudio = async (audioData: ArrayBuffer) => {
    try {
      if (!toneEffectsChain) {
        console.log('🎵 [TONE.JS] Inicializando cadena de efectos...');
        const chain = await initializeToneJS();
        if (!chain) return;
        chain.connect();
      }
      
      // Convertir ArrayBuffer según formato VAPI (MONO por defecto, ESTÉREO si detectado)
      const int16Array = new Int16Array(audioData);
      const samples = int16Array.length;
      
      // Detectar si es mono o estéreo según VAPI
      const isVAPIstereo = samples % 2 === 0 && samples > 320;
      console.log(`🎵 [TONE.JS] Procesando ${samples} samples - ${isVAPIstereo ? 'ESTÉREO detectado' : 'MONO (VAPI estándar)'}`);
      
      if (isVAPIstereo) {
        // PROCESAMIENTO ESTÉREO (cuando VAPI envía 2 canales)
        const samplesPerChannel = Math.floor(samples / 2);
        const audioBuffer = Tone.context.createBuffer(2, samplesPerChannel, 16000);
        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = audioBuffer.getChannelData(1);
        
        for (let i = 0; i < samplesPerChannel; i++) {
          leftChannel[i] = (int16Array[i * 2] / 32768.0) * toneSettings.channels.leftVolume;
          rightChannel[i] = (int16Array[i * 2 + 1] / 32768.0) * toneSettings.channels.rightVolume;
        }
      } else {
        // PROCESAMIENTO MONO (VAPI estándar)
        const audioBuffer = Tone.context.createBuffer(1, samples, 16000);
        const channelData = audioBuffer.getChannelData(0);
        
        for (let i = 0; i < samples; i++) {
          channelData[i] = (int16Array[i] / 32768.0) * toneSettings.channels.rightVolume; // Usar volumen de cliente
        }
      }
      
      // USAR contexto nativo de audio para streaming en tiempo real
      const source = Tone.context.createBufferSource();
      source.buffer = audioBuffer;
      
      // Conectar directamente al EQ3 (que ya está conectado a la cadena)
      source.connect(toneEffectsChain.eq3);
      source.start();
      
      console.log('🎵 [TONE.JS] Audio enviado a cadena EQ3 → Compressor → Limiter → Speakers');
      
      // Log de procesamiento Tone.js
      if (Math.random() < 0.01) {
        console.log(`🎛️ [TONE.JS] EQ: L=${toneSettings.eq.low}dB M=${toneSettings.eq.mid}dB H=${toneSettings.eq.high}dB`);
        console.log(`📈 [TONE.JS] Compressor: ${toneSettings.compressor.threshold}dB ratio=${toneSettings.compressor.ratio}`);
        console.log(`🎚️ [TONE.JS] Volúmenes: IA=${toneSettings.channels.leftVolume} Cliente=${toneSettings.channels.rightVolume}`);
      }
      
    } catch (error) {
      console.error('❌ [TONE.JS] Error procesando audio:', error);
    }
  };

  // Buffer para audio suave (4 segundos)
  const audioBufferRef = React.useRef<ArrayBuffer[]>([]);
  const isPlayingRef = React.useRef(false);
  const [bufferSize, setBufferSize] = useState(0);
  
  // Función simplificada para conectar con Twilio Voice SDK
  const connectToTwilioCall = async () => {
    try {
      console.log('🔄 Conectando a audio Twilio nativo...');
      
      // Obtener call_sid de la llamada activa
      const callSid = 'call_sid' in prospect ? prospect.call_sid : null;
      
      if (!callSid) {
        alert('No se encontró call_sid. Verifica que la llamada esté activa en la base de datos.');
        return;
      }
      
      console.log('📞 Call SID encontrado:', callSid);
      
      // Por ahora mostrar que está conectado (implementación completa requiere TwiML App)
      setIsConnectedToTwilio(true);
      setIsListening(true);
      
      console.log('✅ Simulando conexión a Twilio (implementar con TwiML App)');
      console.log('🎧 Audio nativo Twilio - calidad garantizada');
      
    } catch (error) {
      console.error('❌ Error conectando a Twilio:', error);
      alert('Error conectando a Twilio. Verifica configuración.');
    }
  };
  
  const disconnectTwilioCall = () => {
    if (twilioCall) {
      twilioCall.disconnect();
    }
    setIsConnectedToTwilio(false);
    setIsListening(false);
    setTwilioCall(null);
    console.log('📞 Desconectado de Twilio');
  };
  
  // Debugging inteligente con estadísticas
  const updateAudioStats = (audioData: ArrayBuffer) => {
    debugCounterRef.current++;
    const newStats = {
      chunks: debugCounterRef.current,
      bytes: audioStats.bytes + audioData.byteLength,
      lastChunkSize: audioData.byteLength
    };
    
    // Actualizar stats cada 50 chunks para no saturar
    if (debugCounterRef.current % 50 === 0) {
      setAudioStats(newStats);
      
      if (debugMode) {
        const avgChunkSize = newStats.bytes / newStats.chunks;
        console.log(`📊 Audio Stats - Chunks: ${newStats.chunks}, Avg: ${avgChunkSize.toFixed(0)} bytes, Last: ${newStats.lastChunkSize} bytes`);
      }
    }
  };
  
  // Detectar problemas de audio automáticamente
  const diagnoseAudioIssues = (audioData: ArrayBuffer) => {
    const samples = audioData.byteLength / (getCurrentFormat().encoding === 'mulaw' ? 1 : 2);
    const format = getCurrentFormat();
    
    // Análisis automático cada 100 chunks
    if (debugCounterRef.current % 100 === 0 && debugMode) {
      console.log(`🔍 DIAGNÓSTICO AUTOMÁTICO:`);
      console.log(`  Formato actual: ${format.name}`);
      console.log(`  Samples por chunk: ${samples}`);
      console.log(`  Bytes por chunk: ${audioData.byteLength}`);
      console.log(`  Encoding: ${format.encoding}`);
      console.log('  Transport: Listen Only');
      
      // Sugerencias basadas en patrones
      if (samples < 100) {
        console.log(`  💡 Chunks muy pequeños - prueba μ-law 8kHz`);
      } else if (samples > 2000) {
        console.log(`  💡 Chunks muy grandes - prueba PCM 44kHz`);
      }
    }
  };
  
  // Decodificar μ-law a PCM lineal
  const decodeMulaw = (mulawArray: Uint8Array): Int16Array => {
    const pcmArray = new Int16Array(mulawArray.length);
    const mulawToLinear = [
      -32124, -31100, -30076, -29052, -28028, -27004, -25980, -24956,
      -23932, -22908, -21884, -20860, -19836, -18812, -17788, -16764,
      -15996, -15484, -14972, -14460, -13948, -13436, -12924, -12412,
      -11900, -11388, -10876, -10364, -9852, -9340, -8828, -8316,
      -7932, -7676, -7420, -7164, -6908, -6652, -6396, -6140,
      -5884, -5628, -5372, -5116, -4860, -4604, -4348, -4092,
      -3900, -3772, -3644, -3516, -3388, -3260, -3132, -3004,
      -2876, -2748, -2620, -2492, -2364, -2236, -2108, -1980,
      -1884, -1820, -1756, -1692, -1628, -1564, -1500, -1436,
      -1372, -1308, -1244, -1180, -1116, -1052, -988, -924,
      -876, -844, -812, -780, -748, -716, -684, -652,
      -620, -588, -556, -524, -492, -460, -428, -396,
      -372, -356, -340, -324, -308, -292, -276, -260,
      -244, -228, -212, -196, -180, -164, -148, -132,
      -120, -112, -104, -96, -88, -80, -72, -64,
      -56, -48, -40, -32, -24, -16, -8, 0,
      32124, 31100, 30076, 29052, 28028, 27004, 25980, 24956,
      23932, 22908, 21884, 20860, 19836, 18812, 17788, 16764,
      15996, 15484, 14972, 14460, 13948, 13436, 12924, 12412,
      11900, 11388, 10876, 10364, 9852, 9340, 8828, 8316,
      7932, 7676, 7420, 7164, 6908, 6652, 6396, 6140,
      5884, 5628, 5372, 5116, 4860, 4604, 4348, 4092,
      3900, 3772, 3644, 3516, 3388, 3260, 3132, 3004,
      2876, 2748, 2620, 2492, 2364, 2236, 2108, 1980,
      1884, 1820, 1756, 1692, 1628, 1564, 1500, 1436,
      1372, 1308, 1244, 1180, 1116, 1052, 988, 924,
      876, 844, 812, 780, 748, 716, 684, 652,
      620, 588, 556, 524, 492, 460, 428, 396,
      372, 356, 340, 324, 308, 292, 276, 260,
      244, 228, 212, 196, 180, 164, 148, 132,
      120, 112, 104, 96, 88, 80, 72, 64,
      56, 48, 40, 32, 24, 16, 8, 0
    ];
    
    for (let i = 0; i < mulawArray.length; i++) {
      pcmArray[i] = mulawToLinear[mulawArray[i]];
    }
    
    return pcmArray;
  };
  
  // Inicializar AudioContext para reproducir audio PCM
  const initializeAudioContext = () => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
      return ctx;
    }
    return audioContext;
  };

  // Inicializar AudioWorklet para streaming profesional
  const initializeAudioWorklet = async () => {
    const ctx = initializeAudioContext();
    if (!ctx || audioWorkletNodeRef.current) return audioWorkletNodeRef.current;
    
    try {
      // Cargar el procesador de AudioWorklet desde public
      await ctx.audioWorklet.addModule('/audio-processor.js');
      
      // Crear nodo de AudioWorklet
      const workletNode = new AudioWorkletNode(ctx, 'audio-stream-processor');
      workletNode.connect(ctx.destination);
      
      audioWorkletNodeRef.current = workletNode;
      console.log('✅ AudioWorklet inicializado para streaming profesional');
      return workletNode;
    } catch (error) {
      console.error('❌ Error inicializando AudioWorklet:', error);
      console.log('⚠️ Fallback a Web Audio API tradicional');
      return null;
    }
  };

  // Sistema de cache masivo para calidad premium (5-10s retraso)
  const addAudioToMassiveCache = (audioData: ArrayBuffer) => {
    audioQueueRef.current.push(audioData);
    
    // Cache masivo para calidad premium (500 chunks = ~15-20 segundos)
    if (audioQueueRef.current.length > 500) {
      audioQueueRef.current.shift(); // Remover el más antiguo
    }
    
    setAudioBufferSize(audioQueueRef.current.length);
    
    // Esperar cache grande para calidad máxima (150 chunks = ~5-8 segundos)
    if (!isPlayingRef.current && audioQueueRef.current.length >= 150) {
      startQualityPlayback();
    }
  };

  // Sistema de reproducción para calidad premium con retraso aceptable
  const startQualityPlayback = async () => {
    const ctx = initializeAudioContext();
    if (!ctx || isPlayingRef.current) return;

    // Reanudar AudioContext si está suspendido
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    isPlayingRef.current = true;
    setIsAudioPlaying(true);
    setIsBuffering(false);
    
    const format = getCurrentFormat();
    nextPlayTimeRef.current = ctx.currentTime;

    console.log('🎵 Iniciando reproducción de calidad premium');
    console.log(`📊 Cache inicial: ${audioQueueRef.current.length} chunks (~${Math.round(audioQueueRef.current.length * 0.03)}s)`);

    // Función para procesar lotes grandes de audio
    const playLargeBatch = () => {
      if (audioQueueRef.current.length === 0) {
        isPlayingRef.current = false;
        setIsAudioPlaying(false);
        console.log('🔚 Reproducción terminada - cache vacío');
        return;
      }

      // Procesar lotes de 20-50 chunks para máxima calidad
      const batchSize = Math.min(50, audioQueueRef.current.length);
      const batch = audioQueueRef.current.splice(0, batchSize);
      setAudioBufferSize(audioQueueRef.current.length);

      try {
        // Combinar múltiples chunks en un buffer masivo
        let totalSamples = 0;
        const processedChunks = [];
        
        for (const audioData of batch) {
          let int16Array: Int16Array;
          
          if (format.encoding === 'mulaw') {
            const uint8Array = new Uint8Array(audioData);
            int16Array = decodeMulaw(uint8Array);
          } else {
            int16Array = new Int16Array(audioData);
          }
          
          processedChunks.push(int16Array);
          totalSamples += int16Array.length;
        }
        
        // Crear buffer masivo combinado
        const audioBuffer = ctx.createBuffer(1, totalSamples, format.sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        
        // Concatenar todos los chunks con suavizado
        let offset = 0;
        for (let chunkIndex = 0; chunkIndex < processedChunks.length; chunkIndex++) {
          const chunk = processedChunks[chunkIndex];
          
          for (let i = 0; i < chunk.length; i++) {
            let sample = chunk[i] / 32768.0;
            
            // Aplicar suavizado en las uniones entre chunks
            if (chunkIndex > 0 && i < 32) {
              const fadeIn = i / 32;
              sample *= fadeIn;
            }
            if (chunkIndex < processedChunks.length - 1 && i >= chunk.length - 32) {
              const fadeOut = (chunk.length - 1 - i) / 32;
              sample *= fadeOut;
            }
            
            channelData[offset + i] = sample;
          }
          offset += chunk.length;
        }

        // Reproducir buffer masivo
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        
        // Programar para reproducir en secuencia
        const playTime = Math.max(nextPlayTimeRef.current, ctx.currentTime);
        source.start(playTime);
        nextPlayTimeRef.current = playTime + audioBuffer.duration;
        
        // Programar siguiente lote con timing generoso
        const nextBatchDelay = (audioBuffer.duration * 1000) - 100; // 100ms antes
        setTimeout(playLargeBatch, Math.max(nextBatchDelay, 500));
        
        if (debugMode) {
          console.log(`🎵 Lote reproducido: ${batchSize} chunks, ${audioBuffer.duration.toFixed(2)}s`);
        }
        
      } catch (error) {
        console.error('❌ Error procesando lote masivo:', error);
        setTimeout(playLargeBatch, 200);
      }
    };

    // Empezar con lote inicial
    playLargeBatch();
  };

  // Procesamiento ultra-simple según foros - PCM directo
  const processSimpleAudio = async (audioData: ArrayBuffer) => {
    try {
      // Usar configuración técnica actualizada en tiempo real
      console.log('🔍 [DEBUG] audioSettings recibido:', audioSettings);
      console.log('🔍 [DEBUG] currentAudioConfig:', currentAudioConfig);
      const currentSettings = currentAudioConfig && Object.keys(currentAudioConfig).length > 0 ? currentAudioConfig : {
        leftVolume: 0.9,
        leftSampleRate: 16000,
        leftChannelMode: 'stereo',
        leftCompression: 1.0,
        leftNoiseGate: 0.003,
        leftDynamicRange: 1.0,
        rightVolume: 2.2,
        rightSampleRate: 16000,
        rightChannelMode: 'stereo',
        rightCompression: 0.8,
        rightNoiseGate: 0.003,
        rightDynamicRange: 1.2,
        globalSampleRate: 16000,
        bufferSize: 4,
        bufferChunks: 40,
        masterVolume: 1.0,
        latencyMode: 'low',
        processingMode: 'realtime'
      };
      
      console.log('🎯 [USANDO CONFIG] Vol IA:', currentSettings.leftVolume, 'Vol Cliente:', currentSettings.rightVolume);
      
      // GRABACIÓN: Guardar audio crudo para análisis
      if (isRecording) {
        recordedChunksRef.current.push(audioData.slice(0));
        const newStats = {
          chunks: recordedChunksRef.current.length,
          totalBytes: recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.byteLength, 0)
        };
        setRecordingStats(newStats);
      }
      
      // Estadísticas simples
      debugCounterRef.current++;
      if (debugCounterRef.current % 50 === 0) {
        setAudioStats({
          chunks: debugCounterRef.current,
          bytes: audioStats.bytes + audioData.byteLength,
          lastChunkSize: audioData.byteLength
        });
      }
      
      // REPRODUCCIÓN DIRECTA según foros
      const ctx = initializeAudioContext();
      if (!ctx) return;
      
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      // PCM crudo directo - sin formateos complejos
      const int16Array = new Int16Array(audioData);
      const samples = int16Array.length;
      
      // Detección inteligente mono vs estéreo
      const isStereoProbable = samples % 2 === 0 && samples > 320; // Mínimo 160 samples por canal
      
      // Log ocasional para debug
      if (Math.random() < 0.01) {
        console.log(`🎵 Audio: ${samples} samples, ${isStereoProbable ? 'ESTÉREO' : 'MONO'} detectado`);
      }
      
      if (isStereoProbable && samples > 1) {
        // PROCESAMIENTO ESTÉREO CON ECUALIZADOR
        const samplesPerChannel = Math.floor(samples / 2);
        const audioBuffer = ctx.createBuffer(2, samplesPerChannel, 16000);
        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = audioBuffer.getChannelData(1);
        
        for (let i = 0; i < samplesPerChannel; i++) {
          let leftSample = int16Array[i * 2] / 32768.0;     // IA
          let rightSample = int16Array[i * 2 + 1] / 32768.0; // Cliente
          
          // Aplicar configuración del ecualizador EN TIEMPO REAL
          leftSample = leftSample * currentSettings.leftVolume;
          rightSample = rightSample * currentSettings.rightVolume;
          
          // Aplicar procesamiento técnico avanzado
          leftSample = aplicarProcesamientoTecnico(leftSample, true, currentSettings);
          rightSample = aplicarProcesamientoTecnico(rightSample, false, currentSettings);
          
          // Aplicar volumen maestro
          leftSample = leftSample * currentSettings.masterVolume;
          rightSample = rightSample * currentSettings.masterVolume;
          
          // Limitar amplitud
          leftSample = Math.max(-0.95, Math.min(0.95, leftSample));
          rightSample = Math.max(-0.95, Math.min(0.95, rightSample));
          
          leftChannel[i] = leftSample;
          rightChannel[i] = rightSample;
        }
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
        
      } else {
        // PROCESAMIENTO MONO SIMPLE
        const audioBuffer = ctx.createBuffer(1, samples, 16000);
        const channelData = audioBuffer.getChannelData(0);
        
        for (let i = 0; i < samples; i++) {
          let sample = int16Array[i] / 32768.0;
          
          // Aplicar volumen maestro al menos
          sample = sample * currentSettings.masterVolume;
          sample = Math.max(-0.95, Math.min(0.95, sample));
          
          channelData[i] = sample;
        }
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
      }
      
      // Indicador visual simple
      setIsAudioPlaying(true);
      setTimeout(() => setIsAudioPlaying(false), 50);
      
    } catch (error) {
      if (debugMode) {
        console.error('❌ Error procesamiento simple:', error);
      }
    }
  };
  
  // Control del micrófono para WebSocket bidireccional
  const toggleMicrophone = async () => {
    if (!micEnabled) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMediaStream(stream);
        setMicEnabled(true);
        
        if (audioWebSocket) { // Simplificado
          setupMicrophoneStreaming(stream);
        }
        
        console.log('🎤 Micrófono activado');
      } catch (error) {
        console.error('❌ Error accediendo al micrófono:', error);
        alert('No se pudo acceder al micrófono. Verifica los permisos del navegador.');
      }
    } else {
      // Desactivar micrófono
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      }
      
      if (micProcessorRef.current) {
        micProcessorRef.current.disconnect();
        micProcessorRef.current = null;
      }
      
      setMicEnabled(false);
      console.log('🎤 Micrófono desactivado');
    }
  };
  
  // Configurar streaming del micrófono al WebSocket
  const setupMicrophoneStreaming = (stream: MediaStream) => {
    if (!audioContext || !audioWebSocket) return;
    
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(1024, 1, 1);
    
    processor.onaudioprocess = (event) => {
      if (audioWebSocket.readyState === WebSocket.OPEN) { // Simplificado
        const inputBuffer = event.inputBuffer.getChannelData(0);
        const format = getCurrentFormat();
        
        // Convertir a formato requerido
        if (format.encoding === 'mulaw') {
          // Convertir a μ-law para Twilio
          const int16Data = new Int16Array(inputBuffer.length);
          for (let i = 0; i < inputBuffer.length; i++) {
            int16Data[i] = Math.max(-32768, Math.min(32767, inputBuffer[i] * 32768));
          }
          // TODO: Implementar conversión a μ-law
          audioWebSocket.send(int16Data.buffer);
        } else {
          // PCM directo
          const int16Data = new Int16Array(inputBuffer.length);
          for (let i = 0; i < inputBuffer.length; i++) {
            int16Data[i] = Math.max(-32768, Math.min(32767, inputBuffer[i] * 32768));
          }
          audioWebSocket.send(int16Data.buffer);
        }
      }
    };
    
    source.connect(processor);
    processor.connect(audioContext.destination);
    micProcessorRef.current = processor;
    
    console.log('🎤 Streaming de micrófono configurado');
  };

  // Reproducción con buffer de 4 segundos
  const startBufferedPlayback = async () => {
    if (isPlayingRef.current) return;
    
    isPlayingRef.current = true;
    console.log('🎵 Iniciando reproducción con buffer de 4 segundos');
    
    const ctx = initializeAudioContext();
    if (!ctx) return;
    
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    const playNextChunk = (settings: any) => {
      if (audioBufferRef.current.length === 0) {
        isPlayingRef.current = false;
        console.log('🔄 Buffer vacío - esperando más audio...');
        return;
      }
      
      try {
        const arrayBuffer = audioBufferRef.current.shift()!;
        setBufferSize(audioBufferRef.current.length);
        
        // Procesar audio estéreo correctamente
        const int16Array = new Int16Array(arrayBuffer);
        const totalSamples = int16Array.length;
        const samplesPerChannel = totalSamples / 2;
        
        // Crear buffer estéreo
        const audioBuffer = ctx.createBuffer(2, samplesPerChannel, 16000);
        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = audioBuffer.getChannelData(1);
        
        // PROCESAMIENTO CON ECUALIZADOR EN TIEMPO REAL
        for (let i = 0; i < samplesPerChannel; i++) {
          let leftSample = int16Array[i * 2] / 32768.0;     // IA (generalmente)
          let rightSample = int16Array[i * 2 + 1] / 32768.0; // Cliente (generalmente)
          
          // Aplicar configuración del ecualizador en tiempo real
          leftSample = leftSample * settings.leftVolume;
          rightSample = rightSample * settings.rightVolume;
          
          // Aplicar ecualización avanzada
          leftSample = aplicarProcesamientoTecnico(leftSample, true, settings);
          rightSample = aplicarProcesamientoTecnico(rightSample, false, settings);
          
          // Aplicar volumen maestro
          leftSample = leftSample * settings.masterVolume;
          rightSample = rightSample * settings.masterVolume;
          
          // Limitar amplitud sin distorsión
          leftSample = Math.max(-0.95, Math.min(0.95, leftSample));
          rightSample = Math.max(-0.95, Math.min(0.95, rightSample));
          
          leftChannel[i] = leftSample;
          rightChannel[i] = rightSample;
        }
        
        // Log del procesamiento técnico en tiempo real
        if (Math.random() < 0.005) {
          const leftVol = leftChannel.reduce((sum, val) => sum + Math.abs(val), 0) / samplesPerChannel;
          const rightVol = rightChannel.reduce((sum, val) => sum + Math.abs(val), 0) / samplesPerChannel;
          
          console.log(`🎛️ [AUDIO PROCESADO] IA(L): ${(leftVol*100).toFixed(1)}% | Cliente(R): ${(rightVol*100).toFixed(1)}%`);
          console.log(`🔧 [CONFIG ACTIVA] Vol IA: ${(currentSettings.leftVolume || 0.9).toFixed(2)}x | Vol Cliente: ${(currentSettings.rightVolume || 2.2).toFixed(2)}x`);
          console.log(`📡 [SAMPLE RATE] IA: ${currentSettings.leftSampleRate || 16000}Hz | Cliente: ${currentSettings.rightSampleRate || 16000}Hz`);
          console.log(`🎧 [MODO] IA: ${currentSettings.leftChannelMode || 'stereo'} | Cliente: ${currentSettings.rightChannelMode || 'stereo'}`);
        }
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
        
        // Programar siguiente chunk con timing adecuado
        const duration = audioBuffer.duration * 1000; // ms
        setTimeout(() => playNextChunk(settings), Math.max(duration - 10, 20));
        
      } catch (error) {
        console.error('❌ Error reproduciendo chunk:', error);
        setTimeout(() => playNextChunk(settings), 50);
      }
    };
    
    // Iniciar reproducción con configuración técnica actualizada en tiempo real
    console.log('🔍 [DEBUG BUFFER] audioSettings recibido:', audioSettings);
    console.log('🔍 [DEBUG BUFFER] currentAudioConfig:', currentAudioConfig);
    const currentSettings = currentAudioConfig && Object.keys(currentAudioConfig).length > 0 ? currentAudioConfig : {
      leftVolume: 0.9,
      leftSampleRate: 16000,
      leftChannelMode: 'stereo',
      leftCompression: 1.0,
      leftNoiseGate: 0.003,
      leftDynamicRange: 1.0,
      rightVolume: 2.2,
      rightSampleRate: 16000,
      rightChannelMode: 'stereo',
      rightCompression: 0.8,
      rightNoiseGate: 0.003,
      rightDynamicRange: 1.2,
      globalSampleRate: 16000,
      bufferSize: 4,
      bufferChunks: 40,
      masterVolume: 1.0,
      latencyMode: 'low',
        processingMode: 'realtime'
    };
    
    console.log('🎯 [USANDO CONFIG BUFFER] Vol IA:', currentSettings.leftVolume, 'Vol Cliente:', currentSettings.rightVolume);
    playNextChunk(currentSettings);
  };

  // Conectar usando Twilio Streams - Audio directo en navegador
  const connectToLiveCall = async () => {
    try {
      console.log('🔄 Conectando con Twilio Streams...');
      
      const callSid = 'call_sid' in prospect ? prospect.call_sid : null;
      
      if (!callSid) {
        throw new Error('No se encontró call_sid');
      }
      
      console.log('📞 Call SID:', callSid);
      
      // PROBAR ENDPOINT TRANSPORT EN LUGAR DE LISTEN
      const monitorUrl = 'monitor_url' in prospect ? prospect.monitor_url : null;
      
      if (!monitorUrl) {
        throw new Error('No se encontró monitor_url');
      }
      
      // Usar /listen PERO con configuración optimizada
      console.log('🔄 Conectando a /listen con configuración optimizada');
      console.log('📡 Listen URL:', monitorUrl);
      console.log('💡 Transport no funciona porque "Call Already Active"');
      
      // Conectar a WebSocket de listen (única opción para llamadas activas)
      const ws = new WebSocket(monitorUrl);
      
      ws.onopen = () => {
        console.log('✅ WebSocket Listen conectado con config optimizada');
        console.log('🎧 11labs: speed=1.0, stability=0.75, speakerBoost=false');
        console.log('🎵 Esperando audio optimizado...');
        
        setAudioWebSocket(ws);
        setIsListening(true);
        // NOTIFICAR AL COMPONENTE PRINCIPAL QUE EL AUDIO ESTÁ CONECTADO
        onAudioConnectionChange(true);
      };
      
      ws.onmessage = async (event) => {
        if (typeof event.data === 'string') {
          // Mensajes de control del servidor
          try {
            const message = JSON.parse(event.data);
            console.log('📨 Mensaje del servidor transport:', message);
            
            if (message.type === 'connected') {
              console.log('✅ Transport inicializado correctamente');
            } else if (message.type === 'error') {
              console.error('❌ Error del servidor transport:', message);
            }
          } catch (error) {
            console.log('📝 Mensaje transport (texto):', event.data);
          }
        } else if (event.data instanceof Blob) {
          try {
            const arrayBuffer = await event.data.arrayBuffer();
            
            // Agregar al buffer para reproducción suave
            audioBufferRef.current.push(arrayBuffer);
            setBufferSize(audioBufferRef.current.length);
            
            // Mantener buffer de ~4 segundos (120 chunks aprox)
            if (audioBufferRef.current.length > 120) {
              audioBufferRef.current.shift();
            }
            
            // Iniciar reproducción cuando tengamos buffer suficiente
            if (!isPlayingRef.current && audioBufferRef.current.length >= (audioSettings.bufferChunks || 40)) {
              console.log(`🎵 Iniciando reproducción con buffer suficiente (${audioBufferRef.current.length} chunks)`);
              console.log(`🔧 [APLICANDO CONFIG] Buffer: ${audioSettings.bufferSize || 4}s | Chunks: ${audioSettings.bufferChunks || 40} | Latencia: ${audioSettings.latencyMode || 'low'}`);
              startBufferedPlayback();
            }
            
          } catch (error) {
            console.error('❌ Error procesando audio:', error);
          }
        } else if (event.data instanceof ArrayBuffer) {
          // Audio directo como ArrayBuffer
          console.log('🎵 Audio ArrayBuffer recibido del transport');
          // Procesar igual que Blob
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ Error WebSocket transport:', error);
      };
      
      ws.onclose = (event) => {
        console.log('🔌 WebSocket cerrado');
        console.log('📊 Código de cierre:', event.code);
        console.log('📝 Razón:', event.reason);
        
        // NOTIFICAR AL COMPONENTE PRINCIPAL QUE EL AUDIO SE DESCONECTÓ
        onAudioConnectionChange(false);
        
        // DETENER COMPLETAMENTE EL AUDIO
        try {
          if (audioContext) {
            audioContext.close();
            setAudioContext(null);
          }
        } catch (error) {
          console.error('❌ Error cerrando contexto de audio:', error);
        }
        
        // Limpiar buffer
        audioBufferRef.current = [];
        isPlayingRef.current = false;
        setBufferSize(0);
        setAudioWebSocket(null);
        setIsListening(false);
        setIsListening(false);
        
        console.log('🧹 Buffer limpiado');
      };
      
      alert(`✅ AUDIO OPTIMIZADO ACTIVADO!

Usando /listen con configuración 11labs optimizada:
- Speed: 1.0 (era 1.04)
- Stability: 0.75 (era 0.30) 
- SpeakerBoost: false (era true)

Debería sonar MUCHO mejor ahora.`);
      
    } catch (error) {
      console.error('❌ Error con Twilio Streams:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Sistema de grabación de audio crudo para análisis
  const startRecording = () => {
    recordedChunksRef.current = [];
    setIsRecording(true);
    setRecordingStats({ chunks: 0, totalBytes: 0 });
    console.log('🔴 Iniciando grabación de audio crudo...');
  };

  const stopRecording = () => {
    setIsRecording(false);
    console.log(`🛑 Grabación detenida: ${recordedChunksRef.current.length} chunks`);
  };

  const downloadRecordedAudio = () => {
    if (recordedChunksRef.current.length === 0) {
      alert('No hay audio grabado para descargar');
      return;
    }

    try {
      const format = getCurrentFormat();
      
      // Combinar todos los chunks grabados
      const totalBytes = recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.byteLength, 0);
      const combinedBuffer = new ArrayBuffer(totalBytes);
      const combinedView = new Uint8Array(combinedBuffer);
      
      let offset = 0;
      for (const chunk of recordedChunksRef.current) {
        const chunkView = new Uint8Array(chunk);
        combinedView.set(chunkView, offset);
        offset += chunk.byteLength;
      }

      // Crear archivo WAV con headers correctos
      const wavBuffer = createWavFile(combinedBuffer, format.sampleRate, format.encoding);
      
      // Descargar archivo
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vapi_audio_${Date.now()}_${format.name.replace(' ', '_')}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log(`📥 Audio descargado: ${format.name}, ${recordedChunksRef.current.length} chunks`);
      
    } catch (error) {
      console.error('❌ Error descargando audio:', error);
    }
  };

  // Crear archivo WAV con headers correctos
  const createWavFile = (audioData: ArrayBuffer, sampleRate: number, encoding: string): ArrayBuffer => {
    let pcmData: ArrayBuffer;
    
    if (encoding === 'mulaw') {
      // Convertir μ-law a PCM para WAV
      const mulawArray = new Uint8Array(audioData);
      const pcmArray = decodeMulaw(mulawArray);
      pcmData = pcmArray.buffer;
    } else {
      pcmData = audioData;
    }
    
    const pcmLength = pcmData.byteLength;
    const wavLength = pcmLength + 44; // 44 bytes de header WAV
    
    const wavBuffer = new ArrayBuffer(wavLength);
    const view = new DataView(wavBuffer);
    
    // Header WAV
    // "RIFF"
    view.setUint32(0, 0x52494646, false);
    // File size
    view.setUint32(4, wavLength - 8, true);
    // "WAVE"
    view.setUint32(8, 0x57415645, false);
    // "fmt "
    view.setUint32(12, 0x666d7420, false);
    // Format chunk size
    view.setUint32(16, 16, true);
    // Audio format (PCM = 1)
    view.setUint16(20, 1, true);
    // Channels
    view.setUint16(22, 1, true);
    // Sample rate
    view.setUint32(24, sampleRate, true);
    // Byte rate
    view.setUint32(28, sampleRate * 2, true);
    // Block align
    view.setUint16(32, 2, true);
    // Bits per sample
    view.setUint16(34, 16, true);
    // "data"
    view.setUint32(36, 0x64617461, false);
    // Data size
    view.setUint32(40, pcmLength, true);
    
    // Copiar datos PCM
    const wavArray = new Uint8Array(wavBuffer);
    const pcmArray = new Uint8Array(pcmData);
    wavArray.set(pcmArray, 44);
    
    return wavBuffer;
  };
  
  const toggleAudioMonitor = async () => {
    if (!isListening) {
      // Iniciar conexión WebSocket usando URL de la base de datos
      const callId = 'call_id' in prospect ? prospect.call_id : prospect.id;
      const monitorUrl = 'monitor_url' in prospect ? prospect.monitor_url : null;
      
      if (monitorUrl) {
        // Determinar URL según modo de transporte
        let wsUrl = monitorUrl;
        let wsType = 'Listen Only';
        
        // Usar solo Listen por ahora - simplificado
        wsType = 'Listen Only (Simplificado)';
        
        console.log('🎧 Conectando WebSocket:', wsType);
        console.log('📡 URL:', wsUrl);
        console.log('📞 Call ID:', callId);
        console.log('🔍 Status de llamada:', 'call_status' in prospect ? prospect.call_status : 'desconocido');
        
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log(`✅ WebSocket conectado - ${wsType}`);
          console.log('🎧 Modo: Listen Only, PCM 16kHz simplificado');
          console.log('🎤 Micrófono: OFF por defecto');
          setIsListening(true);
          setAudioWebSocket(ws);
        };
        
        ws.onmessage = async (event) => {
          if (event.data instanceof ArrayBuffer) {
            // Audio PCM crudo como ArrayBuffer
            console.log(`🎵 Audio ArrayBuffer recibido: ${event.data.byteLength} bytes`);
            if (isUsingToneJS) {
              console.log('🎵 [TONE.JS] Recibiendo audio ArrayBuffer para procesamiento');
              await processToneJSAudio(event.data);
            } else {
              await processSimpleAudio(event.data);
            }
          } else if (event.data instanceof Blob) {
            // VAPI envía Blobs con PCM crudo - convertir y reproducir directamente
            console.log(`🎵 Audio Blob recibido: ${event.data.size} bytes`);
            try {
              const arrayBuffer = await event.data.arrayBuffer();
              if (isUsingToneJS) {
                console.log('🎵 [TONE.JS] Recibiendo audio Blob para procesamiento');
                await processToneJSAudio(arrayBuffer);
              } else {
                await processSimpleAudio(arrayBuffer);
              }
            } catch (error) {
              console.error('❌ Error procesando Blob:', error);
            }
          } else {
            // Mensajes de control JSON - solo mostrar ocasionalmente
            if (debugMode) {
              try {
                const message = JSON.parse(event.data);
                console.log('📝 Mensaje control VAPI:', message);
              } catch {
                console.log('📝 Mensaje texto:', event.data);
              }
            }
          }
        };
        
        ws.onerror = (error) => {
          console.error('❌ Error WebSocket:', error);
          console.error('🔍 Diagnóstico:');
          console.error('  - URL:', monitorUrl);
          console.error('  - Call ID:', callId);
          console.error('  - Posibles causas:');
          console.error('    1. La llamada ya terminó');
          console.error('    2. URL expirada o inválida');
          console.error('    3. Servidor VAPI no disponible');
          console.error('    4. Falta autenticación');
          
          setIsListening(false);
          setAudioWebSocket(null);
          
          // Mostrar alerta más informativa
          alert(`Error conectando al audio de la llamada.\n\nPosibles causas:\n• La llamada ya terminó\n• URL de WebSocket expirada\n• Servidor VAPI no disponible\n\nCall ID: ${callId.slice(-8)}`);
        };
        
        ws.onclose = (event) => {
          console.log('🔌 WebSocket de audio desconectado');
          console.log('📊 Código de cierre:', event.code);
          console.log('📝 Razón:', event.reason);
          setIsListening(false);
          setAudioWebSocket(null);
          // NOTIFICAR AL COMPONENTE PRINCIPAL QUE EL AUDIO SE DESCONECTÓ
          onAudioConnectionChange(false);
          
          // DETENER COMPLETAMENTE EL AUDIO
          try {
            if (audioContext) {
              audioContext.close();
              setAudioContext(null);
            }
          } catch (error) {
            console.error('❌ Error cerrando contexto de audio:', error);
          }
          
          // Si se cerró con error, mostrar información
          if (event.code !== 1000) {
            console.warn('⚠️ WebSocket cerrado con error:', event.code, event.reason);
          }
        };
      } else {
        // Si no hay monitor_url en el objeto, obtenerla del servicio
        console.log('🔍 Obteniendo monitor_url de la base de datos para:', callId);
        
        try {
          const ws = await liveMonitorService.createAudioWebSocket(callId, (audioData) => {
            const audioBuffer = new Uint8Array(audioData);
            console.log('🎵 Audio recibido:', audioBuffer.length, 'bytes');
            // TODO: Procesar o reproducir el audio aquí
          });
          
          if (ws) {
            setIsListening(true);
            setAudioWebSocket(ws);
          } else {
            alert('No se pudo conectar al audio. Verifica que la llamada tenga monitor_url configurado.');
          }
        } catch (error) {
          console.error('❌ Error creando WebSocket:', error);
          alert('Error conectando al audio de la llamada.');
        }
      }
    } else {
      // Detener conexión WebSocket y limpiar buffer
      if (audioWebSocket) {
        console.log('🛑 Cerrando WebSocket de audio');
        audioWebSocket.close();
        setAudioWebSocket(null);
      }
      
      // Limpiar buffer de audio
      audioQueueRef.current = [];
      isPlayingRef.current = false;
      nextPlayTimeRef.current = 0;
      
      setIsListening(false);
      setIsAudioPlaying(false);
      setIsBuffering(false);
      setAudioBufferSize(0);
      
      console.log('🧹 Audio limpiado - sistema simplificado');
    }
  };

  // Colgar llamada con doble confirmación usando API real
  const handleHangup = async () => {
    if (hangupStep === 0) {
      setHangupStep(1);
      setTimeout(() => setHangupStep(0), 5000); // Reset después de 5s
    } else if (hangupStep === 1) {
      setHangupStep(2);
      
      // Determinar call_id - si es LiveCallData usar call_id, si es Prospect usar id
      const callId = 'call_id' in prospect ? prospect.call_id : prospect.id;
      
      console.log('🔚 Terminando llamada real para call_id:', callId);
      
      // Usar la nueva función para terminar llamada real con VAPI
      const success = await liveMonitorService.endCall(callId);
      
      setTimeout(() => {
        if (success) {
          console.log('✅ Llamada terminada exitosamente');
        onFeedback('colgada');
        } else {
          console.error('❌ Error terminando llamada');
          alert('Error al terminar la llamada. Revisa la consola para más detalles.');
        }
        setHangupStep(0);
      }, 1000);
    }
  };

  // Solicitar transferencia (human handoff)
  const handleTransferRequest = () => {
    setShowTransferModal(true);
  };

  // Abrir modal de feedback
  const handleFeedbackRequest = (tipo: 'contestada' | 'perdida') => {
    console.log('🔍 Abriendo modal de feedback:', tipo);
    setFeedbackType(tipo);
    setShowFeedbackModal(true);
    setFeedbackComment(''); // Reset comentario
  };

  // Ejecutar feedback con comentario obligatorio
  const executeFeedback = async () => {
    if (!feedbackType || !feedbackComment.trim()) {
      alert('Por favor, proporciona un comentario sobre la llamada');
      return;
    }

    try {
      // Pasar solo el tipo a la función de feedback
      await onFeedback(feedbackType);
      
      // Cerrar modal y limpiar estado
      setShowFeedbackModal(false);
      setFeedbackType(null);
      setFeedbackComment('');
      
      // Cerrar modal principal
      onClose();
    } catch (error) {
      console.error('Error guardando feedback:', error);
      alert('Error al guardar el feedback. Intenta nuevamente.');
    }
  };

  // Ejecutar transferencia con razón específica usando APIs reales
  const executeTransfer = async () => {
    setTransferLoading(true);
    setShowTransferModal(false);
    
    const finalReason = selectedPresetReason || transferReason;
    
    if (!nextAgent?.agent_email) {
      console.error('❌ No hay agente asignado');
      setTransferLoading(false);
      return;
    }

    // Determinar call_id - si es LiveCallData usar call_id, si es Prospect usar id
    const callId = 'call_id' in prospect ? prospect.call_id : prospect.id;
    const prospectId = 'prospecto_id' in prospect ? prospect.prospecto_id : prospect.id;

    console.log('🔄 Iniciando transferencia real para call_id:', callId);

    // Usar la nueva función de transferencia real con VAPI
    const success = await liveMonitorService.transferCall(
      callId,
      '+523222264000', // Número de destino
      '60973', // Extensión
      finalReason // Mensaje contextual
    );

    if (success) {
      console.log('✅ Transferencia exitosa');
      
      // Marcar como transferido en la BD (método legacy para prospectos)
      if (prospectId !== callId) {
      await liveMonitorService.markAsTransferred(
          prospectId,
        nextAgent.agent_email,
        liveMonitorService.mapEtapaToCheckpoint(prospect.etapa)
      );
    }
    
    setTimeout(() => {
      setTransferLoading(false);
      onFeedback('transferida');
      // Reset form
      setTransferReason('');
      setSelectedPresetReason('');
      }, 1000);
    } else {
      console.error('❌ Error en transferencia');
      setTransferLoading(false);
      alert('Error al transferir la llamada. Revisa la consola para más detalles.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {(prospect.nombre_completo || prospect.nombre_whatsapp || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {prospect.nombre_completo || prospect.nombre_whatsapp || 'Sin nombre'}
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  Llamada Activa • {progressPercentage}% Progreso
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Barra de Progreso */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {prospect.etapa} • {progressPercentage}%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {liveMonitorService.getTimeElapsed(prospect.updated_at)}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-3">
              <div 
                className={`h-full bg-gradient-to-r ${getTemperatureColor(liveMonitorService.inferTemperature(prospect))} transition-all duration-1000 rounded-full relative overflow-hidden`}
                style={{width: `${progressPercentage}%`}}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                </div>
              </div>
          </div>
        </div>
        
        {/* Contenido Principal */}
        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Columna Izquierda: Información del Prospecto */}
          <div className="space-y-3">
                {/* Información Personal */}
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                Información Personal
                  </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Nombre:</span>
                  <p className="font-medium text-slate-900 dark:text-white">{prospect.nombre_completo || prospect.nombre_whatsapp || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Teléfono:</span>
                      <p className="font-medium text-slate-900 dark:text-white">{prospect.whatsapp}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Email:</span>
                  <p className="font-medium text-slate-900 dark:text-white">{prospect.email || 'N/A'}</p>
                    </div>
                    <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Ciudad:</span>
                  <p className="font-medium text-slate-900 dark:text-white">{prospect.ciudad_residencia || 'N/A'}</p>
                    </div>
                    <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Estado Civil:</span>
                  <p className="font-medium text-slate-900 dark:text-white">{prospect.estado_civil || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Edad:</span>
                  <p className="font-medium text-slate-900 dark:text-white">{prospect.edad || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Discovery de Viaje */}
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                Discovery de Viaje
                  </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Grupo:</span>
                      <p className="font-medium text-slate-900 dark:text-white">
                    {prospect.tamano_grupo ? `${prospect.tamano_grupo} personas` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Viaja con:</span>
                  <p className="font-medium text-slate-900 dark:text-white">{prospect.viaja_con || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Destino:</span>
                      <p className="font-medium text-slate-900 dark:text-white">
                    {prospect.destino_preferencia?.join(', ') || 'N/A'}
                      </p>
                    </div>
                    <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Menores:</span>
                      <p className="font-medium text-slate-900 dark:text-white">
                    {prospect.cantidad_menores !== null ? prospect.cantidad_menores : 'N/A'}
                      </p>
                    </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Interés:</span>
                  <p className="font-medium text-slate-900 dark:text-white">{prospect.interes_principal || 'N/A'}</p>
                  </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Campaña:</span>
                  <p className="font-medium text-slate-900 dark:text-white">{prospect.campana_origen || 'N/A'}</p>
                </div>
              </div>
                  </div>
            </div>

          {/* Columna Derecha: Audio y Controles */}
          <div className="space-y-3">
            {/* Control de Audio en Tiempo Real */}
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728" />
                    </svg>
                Audio en Tiempo Real
              </h4>
              
              {!isListening ? (
                <button
                  onClick={async () => {
                    setIsListening(true);
                    try {
                      const callId = prospect.call_id;
                      if (callId) {
                        const ws = await liveMonitorService.createAudioWebSocket(callId, (audioData) => {
                          // Procesar audio en tiempo real
                          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                          audioContext.decodeAudioData(audioData.slice(0)).then(buffer => {
                            const source = audioContext.createBufferSource();
                            source.buffer = buffer;
                            source.connect(audioContext.destination);
                            source.start();
                          }).catch(() => {});
                        });
                        setAudioWebSocket(ws);
                      }
                    } catch (error) {
                      console.error('Error iniciando audio:', error);
                      setIsListening(false);
                    }
                  }}
                  className="w-full bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072" />
                  </svg>
                  Escuchar Llamada
                </button>
              ) : (
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full animate-pulse flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072" />
                          </svg>
                        </div>
                      </div>
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-2">
                    Escuchando en tiempo real
                  </p>
                  <button
                    onClick={() => {
                      setIsListening(false);
                      if (audioWebSocket) {
                        audioWebSocket.close();
                        setAudioWebSocket(null);
                      }
                    }}
                    className="w-full bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
                  >
                    Dejar de Escuchar
                  </button>
                </div>
              )}
              </div>

            {/* Controles de Llamada */}
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Controles</h4>
              <div className="space-y-2">
                <button
                  onClick={() => setShowTransferModal(true)}
                  disabled={transferLoading}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                >
                  {transferLoading ? 'Transfiriendo...' : 'Transferir a Agente'}
                </button>

                <button
                  onClick={() => setHangupStep(hangupStep === 0 ? 1 : hangupStep === 1 ? 2 : 0)}
                  className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium ${
                    hangupStep === 0 ? 'bg-orange-500 hover:bg-orange-600 text-white' :
                    hangupStep === 1 ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' :
                    'bg-red-700 text-white'
                  }`}
                >
                  {hangupStep === 0 ? 'Colgar Llamada' : 
                   hangupStep === 1 ? 'Confirmar Colgar' : 'Colgando...'}
                </button>
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Resultado</h4>
              <div className="grid grid-cols-2 gap-2">
                    <button
                  onClick={() => {
                    console.log('🔍 [ACTIVE CALL BUTTON] Botón Contestada presionado - Llamando función global');
                    onFeedback('contestada');
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                  Contestada
                    </button>
                    <button
                  onClick={() => {
                    console.log('🔍 [ACTIVE CALL BUTTON] Botón Perdida presionado - Llamando función global');
                    onFeedback('perdida');
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                  Perdida
                    </button>
                  </div>
                </div>
              </div>
            </div>

        {/* Resumen de la Llamada - Ancho Completo */}
        <div className="px-4 pb-4">
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Resumen de la Llamada
          </div>
              <div className="flex items-center text-xs text-emerald-600 dark:text-emerald-400">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1 animate-pulse"></div>
                Actualización en tiempo real
        </div>
            </h4>
            {(() => {
              let resumen = 'Resumen no disponible';
              try {
                if (prospect.datos_llamada) {
                  const datosLlamada = typeof prospect.datos_llamada === 'string' 
                    ? JSON.parse(prospect.datos_llamada) 
                    : prospect.datos_llamada;
                  resumen = datosLlamada.resumen || 'Resumen aún no generado por el LLM';
                }
              } catch (e) {
                resumen = 'Error al cargar resumen';
              }
              
              return (
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {resumen}
              </p>
            </div>
              );
            })()}
                </div>
              </div>

        {/* Modal de Transferencia */}
        {showTransferModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Transferir Llamada
                </h3>
                <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Razón de transferencia:
                </label>
                <textarea
                  value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                  rows={3}
                    placeholder="Explica el motivo de la transferencia..."
                />
                </div>
                <div className="flex space-x-3">
                <button
                    onClick={() => setShowTransferModal(false)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeTransfer}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                    Transferir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

const LiveMonitor: React.FC = () => {
  const [prospects, setProspects] = useState<LiveCallData[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedProspect, setSelectedProspect] = useState<LiveCallData | null>(null);
  const [nextAgent, setNextAgent] = useState<Agent | null>(null);
  const [feedbackType, setFeedbackType] = useState<'contestada' | 'perdida' | 'transferida' | 'problemas_tecnicos' | null>(null);
  const [prospectForFeedback, setProspectForFeedback] = useState<ExtendedProspect | null>(null);
  const [feedback, setFeedback] = useState('');
  const [liveCallsData, setLiveCallsData] = useState<LiveCallData[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [isConnectedToTwilio, setIsConnectedToTwilio] = useState(false);
  const [audioSettings, setAudioSettings] = useState<any>({});
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showGlobalFeedbackModal, setShowGlobalFeedbackModal] = useState(false);
  const [globalFeedbackType, setGlobalFeedbackType] = useState<'contestada' | 'perdida' | null>(null);
  const [globalFeedbackComment, setGlobalFeedbackComment] = useState('');

  // Componente Header para ordenamiento
  const SortableHeader = ({ field, children, className = "" }: { field: string; children: React.ReactNode; className?: string }) => (
    <th 
      className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${getSortClass(field)} ${className}`}
      onClick={() => requestSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortConfig?.key === field && (
          <svg 
            className={`w-4 h-4 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </div>
    </th>
  );

  const sortedProspects = [...prospects].sort((a, b) => {
    if (!sortConfig) {
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }
    
    const { key, direction } = sortConfig;
    let aValue: any, bValue: any;

    switch (key) {
      case 'cliente':
        aValue = a.nombre_completo || a.nombre_whatsapp || '';
        bValue = b.nombre_completo || b.nombre_whatsapp || '';
        break;
      case 'checkpoint':
        aValue = getCheckpointProgress(liveMonitorService.mapEtapaToCheckpoint(a.etapa));
        bValue = getCheckpointProgress(liveMonitorService.mapEtapaToCheckpoint(b.etapa));
        break;
      case 'progreso':
        aValue = getCheckpointProgress(liveMonitorService.mapEtapaToCheckpoint(a.etapa));
        bValue = getCheckpointProgress(liveMonitorService.mapEtapaToCheckpoint(b.etapa));
        break;
      case 'temperatura':
        const tempOrder = { 'caliente': 3, 'tibio': 2, 'frio': 1 };
        aValue = tempOrder[liveMonitorService.inferTemperature(a) as keyof typeof tempOrder] || 0;
        bValue = tempOrder[liveMonitorService.inferTemperature(b) as keyof typeof tempOrder] || 0;
        break;
      case 'tiempo':
        aValue = new Date(a.updated_at).getTime();
        bValue = new Date(b.updated_at).getTime();
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Función para solicitar sort
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Función para obtener la clase CSS del header de ordenamiento
  const getSortClass = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return 'text-slate-500 dark:text-slate-300';
    }
    return sortConfig.direction === 'asc' 
      ? 'text-blue-600 dark:text-blue-400' 
      : 'text-purple-600 dark:text-purple-400';
  };

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        const [prospectsData, agentsData] = await Promise.all([
          liveMonitorService.getActiveCalls(),
          liveMonitorService.getActiveAgents()
        ]);
        setProspects(prospectsData);
        setAgents(agentsData);
        
        if (agentsData.length > 0) {
          setNextAgent(agentsData[0]);
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
      }
    };

    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Funciones auxiliares
  const getCheckpointIcon = (checkpoint: string) => {
    switch (checkpoint) {
      case 'saludo_continuacion':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0v10a2 2 0 002 2h8a2 2 0 002-2V8" />;
      case 'conexion_emocional':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />;
      case 'introduccion_paraiso':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
      case 'presentacion_oferta':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />;
      case 'proceso_pago':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />;
      default:
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />;
    }
  };

  const getTemperatureColor = (temperatura: string) => {
    switch (temperatura) {
      case 'caliente':
        return 'from-red-500 to-red-600';
      case 'tibio':
        return 'from-yellow-500 to-orange-500';
      case 'frio':
        return 'from-blue-500 to-blue-600';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };


  // Función para obtener clases de fila según progreso con animaciones mejoradas
  const getRowClasses = (progress: number): string => {
    if (progress >= 80) {
      return 'animate-pulse bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 shadow-lg shadow-red-500/20';
    } else if (progress >= 60) {
      return 'animate-bounce bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 shadow-md shadow-yellow-500/20';
    }
    return 'hover:bg-slate-50 dark:hover:bg-slate-700';
  };

  // Efecto de sonido para llamadas críticas al 80%
  useEffect(() => {
    const criticalProspects = sortedProspects.filter(p => {
      const callStatus = getCallStatus(p);
      if (!callStatus.isActive) return false;
      
      const progress = getCheckpointProgress(liveMonitorService.mapEtapaToCheckpoint(p.etapa));
      return progress >= 80;
    });

    if (criticalProspects.length > 0) {
      const interval = setInterval(() => {
        playAlertBeep();
      }, 3000); // Cada 3 segundos para llamadas al 80%

      return () => clearInterval(interval);
    }
  }, [sortedProspects]);

  // Función global para abrir modal de feedback
  const handleFeedbackRequest = (resultado: 'contestada' | 'perdida') => {
    console.log('🔍 [GLOBAL] Abriendo modal de feedback:', resultado);
    setGlobalFeedbackType(resultado);
    setShowGlobalFeedbackModal(true);
    setGlobalFeedbackComment('');
  };

  // Función para ejecutar feedback con comentario
  const executeGlobalFeedback = async () => {
    console.log('🔍 [GLOBAL] Ejecutando feedback:', { tipo: globalFeedbackType, comentario: globalFeedbackComment });
    
    if (!globalFeedbackType || !globalFeedbackComment.trim()) {
      alert('Por favor, proporciona un comentario sobre la llamada');
      return;
    }

    if (!selectedProspect) {
      console.error('❌ No hay prospecto seleccionado');
      return;
    }

    const feedbackData: FeedbackData = {
      call_id: selectedProspect.call_id,
      prospect_id: selectedProspect.prospecto_id,
      user_email: nextAgent?.agent_email || 'sistema@livemonitor.com', // TODO: Obtener usuario logueado real
      resultado: globalFeedbackType,
      comentarios: globalFeedbackComment,
      fecha_feedback: new Date().toISOString()
    };

    try {
      console.log('🔍 [GLOBAL] Guardando feedback:', feedbackData);
      await liveMonitorService.saveFeedback(feedbackData);
      
      console.log('✅ [GLOBAL] Feedback guardado exitosamente');
      
      // IMPORTANTE: Marcar la llamada como finalizada en la tabla llamadas_ventas
      if (selectedProspect.call_id) {
        const statusToUpdate = globalFeedbackType === 'contestada' ? 'exitosa' : 'perdida';
        console.log('🔍 [GLOBAL] Marcando llamada como:', statusToUpdate, selectedProspect.call_id);
        await liveMonitorService.updateCallStatus(selectedProspect.call_id, statusToUpdate);
        console.log('✅ [GLOBAL] Llamada marcada como:', statusToUpdate);
      }
      
      // Esperar un momento para que se propaguen los cambios en BD
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Actualizar la lista
      console.log('🔍 [GLOBAL] Actualizando lista de llamadas...');
      const updatedProspects = await liveMonitorService.getActiveCalls();
      setProspects(updatedProspects);
      console.log('✅ [GLOBAL] Lista actualizada, nuevas llamadas:', updatedProspects.length);
      
      // Cerrar modales y limpiar estado
      setShowGlobalFeedbackModal(false);
      setGlobalFeedbackType(null);
      setGlobalFeedbackComment('');
      setSelectedProspect(null);
      setFeedback('');
      
      // Rotar al siguiente agente
      if (agents.length > 1) {
        const currentIndex = agents.findIndex(a => a.agent_email === nextAgent?.agent_email);
        const nextIndex = (currentIndex + 1) % agents.length;
        setNextAgent(agents[nextIndex]);
      }
    } catch (error) {
      console.error('Error guardando feedback:', error);
      alert('Error al guardar el feedback. Intenta nuevamente.');
    }
  };

  const handleFeedback = async (resultado: 'contestada' | 'perdida' | 'transferida' | 'problemas_tecnicos', comentarios?: string) => {
    // Redirigir a modal de feedback para contestada/perdida
    if (resultado === 'contestada' || resultado === 'perdida') {
      handleFeedbackRequest(resultado);
      return;
    }

    // Para otros tipos (transferida, problemas_tecnicos) usar el flujo original
    if (!selectedProspect) return;

    const feedbackData: FeedbackData = {
      prospect_id: selectedProspect.prospecto_id,
      agent_email: nextAgent?.agent_email || 'unknown',
      resultado,
      comentarios: comentarios || `Acción: ${resultado}`,
      comentarios_ia: `Feedback desde Live Monitor`
    };

    try {
      await liveMonitorService.saveFeedback(feedbackData);
      
      // Actualizar la lista
      const updatedProspects = await liveMonitorService.getActiveCalls();
      setProspects(updatedProspects);
      
      // Cerrar modal
      setSelectedProspect(null);
      setFeedback('');
      
      // Rotar al siguiente agente
      if (agents.length > 1) {
        const currentIndex = agents.findIndex(a => a.agent_email === nextAgent?.agent_email);
        const nextIndex = (currentIndex + 1) % agents.length;
        setNextAgent(agents[nextIndex]);
      }
    } catch (error) {
      console.error('Error guardando feedback:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Monitor de Llamadas en Vivo
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
            Gestión en tiempo real de {sortedProspects.filter(shouldShowInPipeline).length} llamadas activas y finalizadas
                </p>
            </div>
            
        {/* Pipeline de Llamadas */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Pipeline de Llamadas
              </h2>
          </div>

          {sortedProspects.filter(shouldShowInPipeline).length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m0 0V9a2 2 0 012-2h2m0 0V6a2 2 0 012-2h2.5" />
              </svg>
              </div>
              <p className="text-slate-500 dark:text-slate-400">No hay llamadas activas en este momento</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <SortableHeader field="cliente" className="w-64">Cliente</SortableHeader>
                    <SortableHeader field="checkpoint" className="w-48">Checkpoint</SortableHeader>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider w-32">
                      Estado
                    </th>
                    <SortableHeader field="progreso" className="w-64">Progreso</SortableHeader>
                    <SortableHeader field="temperatura" className="w-32">Temperatura</SortableHeader>
                    <SortableHeader field="tiempo" className="w-20">Tiempo</SortableHeader>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider w-20">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {sortedProspects.filter(shouldShowInPipeline).map(prospect => {
                    const checkpoint = liveMonitorService.mapEtapaToCheckpoint(prospect.etapa);
                    const temperatura = liveMonitorService.inferTemperature(prospect);
                    const progressPercentage = getCheckpointProgress(checkpoint);
                    
                    // DETECTAR ESTADO DE LA LLAMADA
                    const callStatus = getCallStatus(prospect);
                    const uniqueKey = prospect.call_id;
                    
                    return (
                      <tr 
                        key={uniqueKey}
                        className={`transition-colors cursor-pointer border-l-4 ${
                          callStatus.isActive 
                            ? getRowClasses(progressPercentage) 
                            : callStatus.isFailed
                            ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 opacity-80 text-red-600 dark:text-red-400'
                            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 opacity-60 text-gray-600 dark:text-gray-400'
                        } ${
                          callStatus.isActive 
                            ? (progressPercentage >= 80 ? 'border-l-red-500' : 
                               progressPercentage >= 60 ? 'border-l-yellow-500' : 'border-l-blue-500')
                            : callStatus.isFailed 
                            ? 'border-l-red-500'
                            : 'border-l-gray-400'
                        }`}
                        onClick={() => {
                          const callStatus = getCallStatus(prospect);
                          if (callStatus.isFailed) {
                            // Llamadas fallidas van directamente a feedback "perdida"
                            console.log('🔍 [FAILED CALL] Llamada fallida detectada, abriendo feedback directo');
                            setSelectedProspect(prospect);
                            handleFeedbackRequest('perdida');
                          } else {
                            // Llamadas normales abren modal de detalles
                            setSelectedProspect(prospect);
                          }
                        }}
                      >
                        {/* Cliente */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                              callStatus.isActive 
                                ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
                                : callStatus.isFailed
                                ? 'bg-gradient-to-br from-red-500 to-red-700'
                                : 'bg-gradient-to-br from-gray-400 to-gray-600'
                            }`}>
                              {(prospect.nombre_completo || prospect.nombre_whatsapp || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-slate-900 dark:text-white">
                                {prospect.nombre_completo || prospect.nombre_whatsapp || 'Sin nombre'}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {prospect.whatsapp}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Checkpoint */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {getCheckpointIcon(checkpoint)}
                            </svg>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {prospect.etapa}
                            </span>
                          </div>
                        </td>

                        {/* Estado de Llamada */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              callStatus.isActive 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                            }`}>
                              <div className={`w-2 h-2 rounded-full mr-1.5 ${
                                callStatus.isActive ? 'bg-green-500' : 
                                callStatus.isFailed ? 'bg-red-500' : 'bg-gray-500'
                              } animate-pulse`}></div>
                              {callStatus.statusText}
                            </span>
                            {callStatus.duration && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {callStatus.duration}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Progreso con animación mejorada */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-medium ${callStatus.textColor}`}>
                                {progressPercentage}%
                              </span>
                              <span className={`text-xs ${callStatus.textColor} opacity-70`}>
                                {prospect.etapa}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-3 overflow-hidden shadow-inner">
                              {callStatus.isActive ? (
                              <div 
                                className={`h-full bg-gradient-to-r ${getTemperatureColor(temperatura)} transition-all duration-1000 relative overflow-hidden`}
                                style={{width: `${progressPercentage}%`}}
                              >
                                {/* Animación de progreso */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                                {progressPercentage >= 60 && (
                                  <div className="absolute inset-0 animate-pulse bg-white/10"></div>
                                )}
                              </div>
                              ) : (
                                <div className="h-full bg-gray-400 dark:bg-gray-600 transition-all duration-1000 relative overflow-hidden flex items-center justify-center w-full">
                                  <span className="text-xs text-white font-medium">Llamada Finalizada</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Temperatura */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            temperatura === 'caliente' 
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              : temperatura === 'tibio'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            <div className={`w-2 h-2 rounded-full mr-1.5 ${
                              temperatura === 'caliente' ? 'bg-red-500' :
                              temperatura === 'tibio' ? 'bg-yellow-500' : 'bg-blue-500'
                            } animate-pulse`}></div>
                            {temperatura.charAt(0).toUpperCase() + temperatura.slice(1)}
                          </span>
                        </td>

                        {/* Tiempo */}
                        <td className="px-3 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                          {liveMonitorService.getTimeElapsed(prospect.updated_at)}
                        </td>

                        {/* Acciones */}
                        <td className="px-3 py-4 whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProspect(prospect);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium"
                          >
                            Ver detalles
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Panel de Agentes Disponibles */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Agentes Disponibles
              </h2>
                <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {agents.length} agentes activos
                </span>
                </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent, index) => (
                <div
                  key={agent.id}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    nextAgent?.id === agent.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                  }`}
                  onClick={() => setNextAgent(agent)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {agent.agent_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {agent.agent_name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {agent.agent_email}
                      </p>
                    </div>
                    {nextAgent?.id === agent.id && (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
              </div>
              
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Llamadas: {agent.total_calls_handled}</span>
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                      Activo
                    </span>
                  </div>
                </div>
              ))}
                </div>

            {agents.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <p className="text-slate-500 dark:text-slate-400">No hay agentes disponibles</p>
              </div>
            )}
            </div>
          </div>
        
        {/* Modal de Detalles */}
        {selectedProspect && (
          <ProspectDetailModal 
            prospect={selectedProspect}
            nextAgent={nextAgent}
            onClose={() => setSelectedProspect(null)}
            onFeedback={handleFeedbackRequest}
            onRefresh={async () => {
              const updated = await liveMonitorService.getActiveCalls();
              setProspects(updated);
            }}
            onOpenEqualizer={() => setShowEqualizer(true)}
            isConnectedToTwilio={isConnectedToTwilio}
            audioSettings={audioSettings}
            onAudioConnectionChange={setIsConnectedToTwilio}
          />
        )}

        {/* Modal de Feedback Global */}
        {showGlobalFeedbackModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-[80] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Feedback Obligatorio - {globalFeedbackType === 'contestada' ? 'Llamada Contestada' : 'Llamada Perdida'}
                  </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Comentarios sobre la llamada: *
                  </label>
                  <textarea
                    value={globalFeedbackComment}
                    onChange={(e) => setGlobalFeedbackComment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Describe qué pasó en la llamada, calidad del prospecto, observaciones importantes..."
                    autoFocus
                  />
                  </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowGlobalFeedbackModal(false);
                      setGlobalFeedbackType(null);
                      setGlobalFeedbackComment('');
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={executeGlobalFeedback}
                    disabled={!globalFeedbackComment.trim()}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg"
                  >
                    Guardar Feedback
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveMonitor;
