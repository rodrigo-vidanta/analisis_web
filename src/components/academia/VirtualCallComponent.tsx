import React, { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { useTheme } from '../../hooks/useTheme';

interface VirtualCallProps {
  assistantId: string;
  clientName: string;
  clientPersonality: string;
  objectives: string[];
  difficulty: number;
  onCallStart?: () => void;
  onCallEnd?: (data: any) => void;
  onError?: (error: string) => void;
}

interface CallData {
  duration: number;
  transcript: string;
  objectivesAchieved: string[];
  score: number;
  feedback: string;
}

const VirtualCallComponent: React.FC<VirtualCallProps> = ({
  assistantId,
  clientName,
  clientPersonality,
  objectives,
  difficulty,
  onCallStart,
  onCallEnd,
  onError
}) => {
  const { isLinearTheme } = useTheme();
  const [vapi, setVapi] = useState<Vapi | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [transcript, setTranscript] = useState<Array<{role: string, message: string, timestamp: Date}>>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [callData, setCallData] = useState<CallData | null>(null);
  const [showPrep, setShowPrep] = useState(true);
  
  const durationIntervalRef = useRef<NodeJS.Timeout>();
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Inicializar Vapi
  useEffect(() => {
    const vapiInstance = new Vapi('b6b0b0a5-6e4b-4c8d-a9c3-2b1b2b1b2b1b'); // Tu clave pública aquí
    setVapi(vapiInstance);

    // Configurar event listeners
    vapiInstance.on('call-start', () => {
      console.log('Llamada iniciada');
      setIsCallActive(true);
      setIsConnecting(false);
      setCallDuration(0);
      onCallStart?.();
      
      // Iniciar contador de duración
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    });

    vapiInstance.on('call-end', () => {
      console.log('Llamada finalizada');
      setIsCallActive(false);
      setIsConnecting(false);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }

      // Simular análisis de la llamada
      const mockCallData: CallData = {
        duration: callDuration,
        transcript: transcript.map(t => `${t.role}: ${t.message}`).join('\n'),
        objectivesAchieved: objectives.slice(0, Math.floor(Math.random() * objectives.length) + 1),
        score: Math.floor(Math.random() * 40) + 60, // Score entre 60-100
        feedback: generateFeedback()
      };
      
      setCallData(mockCallData);
      onCallEnd?.(mockCallData);
    });

    vapiInstance.on('message', (message: any) => {
      console.log('Mensaje recibido:', message);
      
      if (message.type === 'transcript' && message.transcript) {
        setTranscript(prev => [...prev, {
          role: message.role === 'assistant' ? clientName : 'Tú',
          message: message.transcript,
          timestamp: new Date()
        }]);
      }
    });

    vapiInstance.on('error', (error: any) => {
      console.error('Error en Vapi:', error);
      setIsCallActive(false);
      setIsConnecting(false);
      onError?.(error.message || 'Error en la llamada virtual');
    });

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      vapiInstance.stop();
    };
  }, [assistantId]);

  // Auto-scroll del transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const generateFeedback = (): string => {
    const feedbackOptions = [
      "Excelente trabajo estableciendo rapport con el cliente. Considera trabajar en el manejo de objeciones.",
      "Buena presentación de beneficios. Podrías mejorar en la escucha activa.",
      "Mantuviste un tono profesional durante toda la llamada. Trabaja en crear más urgencia.",
      "Buen manejo de la información del cliente. Considera hacer más preguntas de descubrimiento."
    ];
    return feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];
  };

  const startCall = async () => {
    if (!vapi) return;
    
    setIsConnecting(true);
    setShowPrep(false);
    setTranscript([]);
    
    try {
      await vapi.start(assistantId);
    } catch (error) {
      console.error('Error iniciando llamada:', error);
      setIsConnecting(false);
      onError?.('No se pudo iniciar la llamada virtual');
    }
  };

  const endCall = () => {
    if (vapi && isCallActive) {
      vapi.stop();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (level: number): string => {
    const colors = {
      1: 'from-green-400 to-emerald-500',
      2: 'from-yellow-400 to-orange-500',
      3: 'from-orange-400 to-red-500',
      4: 'from-red-400 to-pink-500',
      5: 'from-purple-400 to-indigo-500'
    };
    return colors[level as keyof typeof colors] || colors[1];
  };

  if (callData) {
    // Pantalla de resultados
    return (
      <div className={`max-w-4xl mx-auto p-6 rounded-2xl ${
        isLinearTheme 
          ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
          : 'bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700'
      }`}>
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
            <span className="text-3xl text-white">🎉</span>
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${
            isLinearTheme 
              ? 'text-slate-900 dark:text-white'
              : 'text-indigo-900 dark:text-white'
          }`}>
            ¡Llamada Completada!
          </h2>
          <p className={`text-lg ${
            isLinearTheme 
              ? 'text-slate-600 dark:text-slate-400'
              : 'text-indigo-600 dark:text-indigo-300'
          }`}>
            Duración: {formatTime(callData.duration)}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Puntuación */}
          <div className={`p-6 rounded-xl ${
            isLinearTheme 
              ? 'bg-slate-50 dark:bg-slate-700'
              : 'bg-indigo-50 dark:bg-slate-700'
          }`}>
            <h3 className={`font-bold text-lg mb-4 ${
              isLinearTheme 
                ? 'text-slate-900 dark:text-white'
                : 'text-indigo-900 dark:text-white'
            }`}>
              Tu Puntuación
            </h3>
            <div className="text-center">
              <div className={`text-4xl font-bold mb-2 ${
                callData.score >= 90 ? 'text-emerald-500' :
                callData.score >= 80 ? 'text-yellow-500' :
                callData.score >= 70 ? 'text-orange-500' : 'text-red-500'
              }`}>
                {callData.score}
              </div>
              <div className={`text-sm ${
                isLinearTheme 
                  ? 'text-slate-600 dark:text-slate-400'
                  : 'text-indigo-600 dark:text-indigo-300'
              }`}>
                de 100 puntos
              </div>
            </div>
          </div>

          {/* Objetivos Cumplidos */}
          <div className={`p-6 rounded-xl ${
            isLinearTheme 
              ? 'bg-slate-50 dark:bg-slate-700'
              : 'bg-indigo-50 dark:bg-slate-700'
          }`}>
            <h3 className={`font-bold text-lg mb-4 ${
              isLinearTheme 
                ? 'text-slate-900 dark:text-white'
                : 'text-indigo-900 dark:text-white'
            }`}>
              Objetivos Cumplidos
            </h3>
            <div className="space-y-2">
              {objectives.map((objective, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    callData.objectivesAchieved.includes(objective)
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}>
                    {callData.objectivesAchieved.includes(objective) ? '✓' : '○'}
                  </div>
                  <span className={`text-sm ${
                    isLinearTheme 
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-indigo-700 dark:text-indigo-300'
                  }`}>
                    {objective}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feedback */}
        <div className={`p-6 rounded-xl mb-6 ${
          isLinearTheme 
            ? 'bg-slate-50 dark:bg-slate-700'
            : 'bg-indigo-50 dark:bg-slate-700'
        }`}>
          <h3 className={`font-bold text-lg mb-4 ${
            isLinearTheme 
              ? 'text-slate-900 dark:text-white'
              : 'text-indigo-900 dark:text-white'
          }`}>
            Feedback de tu Entrenador IA
          </h3>
          <p className={`${
            isLinearTheme 
              ? 'text-slate-700 dark:text-slate-300'
              : 'text-indigo-700 dark:text-indigo-300'
          }`}>
            {callData.feedback}
          </p>
        </div>

        {/* Botones de Acción */}
        <div className="flex justify-center space-x-4">
          <button 
            onClick={() => setCallData(null)}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              isLinearTheme 
                ? 'bg-slate-600 hover:bg-slate-700 text-white'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white'
            }`}
          >
            Intentar de Nuevo
          </button>
          <button 
            className={`px-6 py-3 rounded-xl font-semibold border-2 transition-all duration-200 ${
              isLinearTheme 
                ? 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
                : 'border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-600 dark:text-indigo-300 dark:hover:bg-indigo-900/20'
            }`}
          >
            Continuar al Siguiente
          </button>
        </div>
      </div>
    );
  }

  if (showPrep) {
    // Pantalla de preparación
    return (
      <div className={`max-w-2xl mx-auto p-6 rounded-2xl ${
        isLinearTheme 
          ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
          : 'bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700'
      }`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-gradient-to-br ${getDifficultyColor(difficulty)}`}>
            <span className="text-2xl text-white">📞</span>
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${
            isLinearTheme 
              ? 'text-slate-900 dark:text-white'
              : 'text-indigo-900 dark:text-white'
          }`}>
            Llamada Virtual con {clientName}
          </h2>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <span className={`text-sm ${
              isLinearTheme 
                ? 'text-slate-600 dark:text-slate-400'
                : 'text-indigo-600 dark:text-indigo-300'
            }`}>
              Dificultad:
            </span>
            <div className="flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < difficulty 
                      ? `bg-gradient-to-r ${getDifficultyColor(difficulty)}`
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Información del Cliente */}
        <div className={`p-4 rounded-xl mb-6 ${
          isLinearTheme 
            ? 'bg-slate-50 dark:bg-slate-700'
            : 'bg-indigo-50 dark:bg-slate-700'
        }`}>
          <h3 className={`font-bold mb-3 ${
            isLinearTheme 
              ? 'text-slate-900 dark:text-white'
              : 'text-indigo-900 dark:text-white'
          }`}>
            Perfil del Cliente
          </h3>
          <p className={`text-sm ${
            isLinearTheme 
              ? 'text-slate-700 dark:text-slate-300'
              : 'text-indigo-700 dark:text-indigo-300'
          }`}>
            {clientPersonality}
          </p>
        </div>

        {/* Objetivos */}
        <div className={`p-4 rounded-xl mb-8 ${
          isLinearTheme 
            ? 'bg-slate-50 dark:bg-slate-700'
            : 'bg-indigo-50 dark:bg-slate-700'
        }`}>
          <h3 className={`font-bold mb-3 ${
            isLinearTheme 
              ? 'text-slate-900 dark:text-white'
              : 'text-indigo-900 dark:text-white'
          }`}>
            Tus Objetivos
          </h3>
          <ul className="space-y-2">
            {objectives.map((objective, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className={`text-sm mt-1 ${
                  isLinearTheme 
                    ? 'text-slate-500'
                    : 'text-indigo-500'
                }`}>
                  •
                </span>
                <span className={`text-sm ${
                  isLinearTheme 
                    ? 'text-slate-700 dark:text-slate-300'
                    : 'text-indigo-700 dark:text-indigo-300'
                }`}>
                  {objective}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Botón para Iniciar */}
        <div className="text-center">
          <button 
            onClick={startCall}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105 bg-gradient-to-r ${getDifficultyColor(difficulty)} text-white shadow-lg hover:shadow-xl`}
          >
            🚀 Iniciar Llamada Virtual
          </button>
          <p className={`text-xs mt-3 ${
            isLinearTheme 
              ? 'text-slate-500 dark:text-slate-400'
              : 'text-indigo-500 dark:text-indigo-400'
          }`}>
            La llamada se grabará para análisis y feedback
          </p>
        </div>
      </div>
    );
  }

  // Pantalla de llamada activa
  return (
    <div className={`max-w-4xl mx-auto p-6 rounded-2xl ${
      isLinearTheme 
        ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
        : 'bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700'
    }`}>
      {/* Header de Llamada Activa */}
      <div className="text-center mb-6">
        <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
          isConnecting 
            ? 'bg-yellow-500 animate-pulse'
            : 'bg-gradient-to-br from-emerald-400 to-green-500 animate-pulse'
        }`}>
          <span className="text-2xl text-white">
            {isConnecting ? '⏳' : '📞'}
          </span>
        </div>
        <h2 className={`text-xl font-bold mb-2 ${
          isLinearTheme 
            ? 'text-slate-900 dark:text-white'
            : 'text-indigo-900 dark:text-white'
        }`}>
          {isConnecting ? 'Conectando...' : `En llamada con ${clientName}`}
        </h2>
        <p className={`text-lg font-mono ${
          isLinearTheme 
            ? 'text-slate-600 dark:text-slate-400'
            : 'text-indigo-600 dark:text-indigo-300'
        }`}>
          {formatTime(callDuration)}
        </p>
      </div>

      {/* Transcript */}
      <div 
        ref={transcriptRef}
        className={`h-64 p-4 rounded-xl overflow-y-auto mb-6 ${
          isLinearTheme 
            ? 'bg-slate-50 dark:bg-slate-700'
            : 'bg-indigo-50 dark:bg-slate-700'
        }`}
      >
        {transcript.length === 0 ? (
          <p className={`text-center text-sm ${
            isLinearTheme 
              ? 'text-slate-500 dark:text-slate-400'
              : 'text-indigo-500 dark:text-indigo-400'
          }`}>
            {isConnecting ? 'Estableciendo conexión...' : 'La conversación aparecerá aquí...'}
          </p>
        ) : (
          <div className="space-y-3">
            {transcript.map((entry, index) => (
              <div key={index} className={`p-3 rounded-lg ${
                entry.role === 'Tú' 
                  ? isLinearTheme 
                    ? 'bg-slate-200 dark:bg-slate-600 ml-8'
                    : 'bg-indigo-100 dark:bg-indigo-900/30 ml-8'
                  : isLinearTheme 
                    ? 'bg-white dark:bg-slate-800 mr-8'
                    : 'bg-white dark:bg-slate-800 mr-8'
              }`}>
                <div className="flex items-start space-x-2">
                  <span className={`font-semibold text-xs ${
                    entry.role === 'Tú' 
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {entry.role}:
                  </span>
                  <span className={`text-sm flex-1 ${
                    isLinearTheme 
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-indigo-700 dark:text-indigo-300'
                  }`}>
                    {entry.message}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="flex justify-center space-x-4">
        <button 
          onClick={endCall}
          disabled={!isCallActive}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
            isCallActive
              ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
              : 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed'
          }`}
        >
          📞 Finalizar Llamada
        </button>
      </div>
    </div>
  );
};

export default VirtualCallComponent;
