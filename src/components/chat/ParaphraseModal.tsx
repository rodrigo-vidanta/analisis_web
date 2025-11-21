/**
 * ============================================
 * MODAL DE PARAFRASEO CON IA - LIVE CHAT
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/chat/README.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/chat/README.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/chat/CHANGELOG_LIVECHAT.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

import React, { useState, useEffect } from 'react';
import { X, Wand2, Sparkles, Loader2, ShieldAlert, AlertTriangle, Ban } from 'lucide-react';
import ModerationService from '../../services/moderationService';
import type { ModerationWarning } from '../../services/moderationService';
import ParaphraseLogService from '../../services/paraphraseLogService';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';

type ParaphraseContext = 'input_livechat' | 'input_send_image_livechat' | 'transfer_request_message';

interface ParaphraseModalProps {
  isOpen: boolean;
  originalText: string;
  onSelect: (text: string) => void;
  onCancel: () => void;
  context?: ParaphraseContext; // Contexto de uso del parafraseador
}

// Configuración del webhook de N8N
const N8N_WEBHOOK_URL = 'https://primary-dev-d75a.up.railway.app/webhook/mensaje-agente';

// Timeout para el webhook (15 segundos)
const WEBHOOK_TIMEOUT = 15000;

export const ParaphraseModal: React.FC<ParaphraseModalProps> = ({
  isOpen,
  originalText,
  onSelect,
  onCancel,
  context = 'input_livechat' // Por defecto para compatibilidad
}) => {
  const { user } = useAuth();
  const [option1, setOption1] = useState<string>('');
  const [option2, setOption2] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [moderationFlag, setModerationFlag] = useState<{ reason: string; category: string; warningId?: string } | null>(null);


  useEffect(() => {
    if (isOpen && originalText) {
      // Reset estados al abrir
      setModerationFlag(null);
      setError('');
      setOption1('');
      setOption2('');
      generateParaphrases();
    }
  }, [isOpen, originalText]);

  // Detectar atajos de teclado (1 o 2)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen || loading) return;

      if (e.key === '1' && option1) {
        handleSelect(option1);
      } else if (e.key === '2' && option2) {
        handleSelect(option2);
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, option1, option2, loading, onCancel]);

  const handleSelect = async (text: string) => {
    // Determinar qué opción seleccionó
    const selectedOptionNumber = text === option1 ? 1 : text === option2 ? 2 : undefined;
    
    // Si había un warning de moderación y el usuario selecciona una opción,
    // marcar el warning como "mensaje enviado"
    if (moderationFlag?.warningId) {
      // Log solo en desarrollo
      if (import.meta.env.DEV) {
        console.log('⚠️ Usuario seleccionó opción a pesar del warning, marcando como enviado');
      }
      await ModerationService.markWarningAsSent(moderationFlag.warningId);
      
      // Actualizar el warning con el output seleccionado
      if (user?.id) {
        await ModerationService.registerWarning(
          user.id,
          user.email || undefined,
          originalText,
          moderationFlag.reason,
          moderationFlag.category as ModerationWarning['warning_category'],
          text, // output_selected
          undefined,
          undefined
        );
      }
    }
    
    // Actualizar el log con el output seleccionado
    if (user?.id && (option1 || option2)) {
      // Buscar el log más reciente de este input para actualizarlo
      const logs = await ParaphraseLogService.getUserLogs(user.id, 1);
      const recentLog = logs.find(log => log.input_text === originalText);
      
      if (recentLog) {
        // Actualizar el log existente
        await supabaseSystemUI
          .from('paraphrase_logs')
          .update({
            output_selected: text,
            selected_option_number: selectedOptionNumber
          })
          .eq('id', recentLog.id);
      }
    }
    
    onSelect(text);
  };

  const generateParaphrases = async () => {
    const startTime = Date.now();
    setLoading(true);
    setError('');
    setOption1('');
    setOption2('');

    try {
      // Crear un AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

      console.log('📤 [PARAPHRASE] Enviando al webhook N8N:', {
        context,
        textLength: originalText.length
      });

      // Llamar al webhook de N8N
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: originalText,
          context: context // input_livechat, input_send_image_livechat, transfer_request_message
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          const errorText = await response.text();
          throw new Error(`Error ${response.status}: ${errorText || 'Error desconocido'}`);
        }
        
        console.error('❌ Error del webhook N8N:', errorData);
        throw new Error(errorData.error || errorData.message || `Error al generar paráfrasis: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('📥 [PARAPHRASE] Respuesta del webhook N8N:', {
        hasOption1: !!data.option1,
        hasOption2: !!data.option2,
        hasGuardrail: !!data.guardrail
      });

      // ⚠️ DETECCIÓN DE GUARDRAIL - PRIORITARIO
      if (data.guardrail === true || data.guardrail === 'true') {
        if (import.meta.env.DEV) {
          console.warn('🛡️ Guardrail activado:', data);
        }
        
        const warningReason = data.reason || 'Contenido inapropiado detectado';
        const warningCategory = (data.category || 'otro') as ModerationWarning['warning_category'];
        
        // Registrar warning en la base de datos (solo si hay usuario logueado)
        let warningId: string | null = null;
        if (user?.id) {
          warningId = await ModerationService.registerWarning(
            user.id,
            user.email || undefined,
            originalText,
            warningReason,
            warningCategory,
            undefined, // output_selected (se llenará si el usuario selecciona una opción)
            undefined, // conversation_id
            undefined  // prospect_id
          );
          
          if (warningId && import.meta.env.DEV) {
            console.log('✅ Warning registrado en BD:', warningId);
          }
        }
        
        setModerationFlag({
          reason: warningReason,
          category: warningCategory,
          warningId: warningId || undefined
        });
        setOption1('');
        setOption2('');
        
        // Registrar log con warning
        const processingTime = Date.now() - startTime;
        if (user?.id) {
          await ParaphraseLogService.registerLog(
            user.id,
            user.email || undefined,
            originalText,
            '', // option1 vacío porque hubo warning
            '', // option2 vacío porque hubo warning
            undefined,
            undefined,
            true, // has_moderation_warning
            warningId || undefined,
            undefined,
            undefined,
            processingTime
          );
        }
        
        return; // No continuar con paráfrasis
      }

      // Validar que tenga las opciones esperadas
      if (!data.option1 || !data.option2) {
        throw new Error('Formato de respuesta inválido: faltan opciones o flag de guardrail');
      }

      // Sanitizar y validar las opciones
      const option1 = (data.option1 || '').trim() || originalText;
      const option2 = (data.option2 || '').trim() || originalText;

      if (!option1 || !option2) {
        throw new Error('Las opciones generadas están vacías');
      }

      setModerationFlag(null); // Limpiar flag si hay opciones válidas
      setOption1(option1);
      setOption2(option2);

      // Registrar log de parafraseo (sin warning)
      const processingTime = Date.now() - startTime;
      if (user?.id) {
        await ParaphraseLogService.registerLog(
          user.id,
          user.email || undefined,
          originalText,
          option1,
          option2,
          undefined, // output_selected (se llenará cuando seleccione)
          undefined, // selected_option_number
          false, // has_moderation_warning
          undefined, // warning_id
          undefined, // conversation_id
          undefined, // prospect_id
          processingTime
        );
      }

    } catch (err) {
      console.error('❌ Error generando paráfrasis:', err);
      
      // Si es timeout o error de red, usar texto original como fallback
      if (err instanceof Error && (err.name === 'AbortError' || err.message.includes('fetch'))) {
        console.warn('⚠️ [PARAPHRASE] Webhook no respondió, usando texto original como fallback');
        setError('El servicio de parafraseo no está disponible. Usando texto original.');
        // Fallback: usar texto original en ambas opciones
        setOption1(originalText);
        setOption2(originalText);
        setModerationFlag(null);
      } else {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        // Fallback: usar texto original
        setOption1(originalText);
        setOption2(originalText);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 text-white ${
          moderationFlag 
            ? 'bg-gradient-to-r from-red-600 to-red-700' 
            : 'bg-gradient-to-r from-purple-500 to-blue-500'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {moderationFlag ? (
                <ShieldAlert className="w-6 h-6" />
              ) : (
                <Wand2 className="w-6 h-6" />
              )}
              <h2 className="text-xl font-bold">
                {moderationFlag ? '🛡️ Moderación de Contenido' : 'Mejorar Mensaje con IA'}
              </h2>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {!moderationFlag && (
            <p className="text-sm text-white/80 mt-2">
              Selecciona la mejor versión o presiona <kbd className="px-2 py-1 bg-white/20 rounded text-xs">1</kbd> o <kbd className="px-2 py-1 bg-white/20 rounded text-xs">2</kbd>
            </p>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Mensaje Original */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Mensaje Original
            </p>
            <p className="text-gray-900 dark:text-white">
              {originalText}
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400 animate-pulse">
                Generando versiones mejoradas con IA...
              </p>
            </div>
          )}

          {/* 🛡️ MODERACIÓN DE CONTENIDO - ALERTA CRÍTICA */}
          {moderationFlag && !loading && (
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-2 border-red-500 dark:border-red-600 rounded-xl p-6 animate-pulse">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <ShieldAlert className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <h3 className="text-xl font-bold text-red-900 dark:text-red-100">
                      ⚠️ ALERTA DE MODERACIÓN DE CONTENIDO
                    </h3>
                    <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  
                  <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-4 mb-4 border border-red-200 dark:border-red-800">
                    <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                      Razón de la moderación:
                    </p>
                    <p className="text-red-900 dark:text-red-100 font-medium">
                      {moderationFlag.reason}
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                      Categoría: <span className="font-semibold uppercase">{moderationFlag.category}</span>
                    </p>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-yellow-800 dark:text-yellow-200">
                        <p className="font-semibold mb-1">Este mensaje no puede ser enviado porque contiene:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          {moderationFlag.category === 'vulgaridad' && (
                            <li>Lenguaje vulgar, obsceno u ofensivo</li>
                          )}
                          {moderationFlag.category === 'amenazas' && (
                            <li>Amenazas, acoso o intimidación</li>
                          )}
                          {moderationFlag.category === 'discriminacion' && (
                            <li>Contenido discriminatorio</li>
                          )}
                          {moderationFlag.category === 'ilegal' && (
                            <li>Contenido ilegal o actividades criminales</li>
                          )}
                          {moderationFlag.category === 'spam' && (
                            <li>Spam o contenido fraudulento</li>
                          )}
                          {moderationFlag.category === 'sexual' && (
                            <li>Contenido sexual explícito o inapropiado</li>
                          )}
                          {moderationFlag.category === 'otro' && (
                            <li>Contenido que viola las políticas de comunicación profesional</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-700 dark:text-red-300">
                      Por favor, reformula tu mensaje de manera profesional y apropiada.
                    </p>
                    <button
                      onClick={onCancel}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium text-sm"
                    >
                      Entendido
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && !moderationFlag && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-red-600 dark:text-red-400 text-sm font-semibold mb-2">
                ⚠️ Error al generar paráfrasis
              </p>
              <p className="text-red-600 dark:text-red-400 text-xs mb-2">
                {error}
              </p>
              {(error.includes('ANTHROPIC_API_KEY') || error.includes('not_found_error') || error.includes('model:') || error.includes('CREDITS_ERROR') || error.includes('créditos') || error.includes('tokens')) && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-300 text-xs font-semibold mb-1">
                    💡 Solución:
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-400 text-xs">
                    {error.includes('CREDITS_ERROR') || error.includes('créditos') || error.includes('tokens') || error.includes('insufficient') ? (
                      <>
                        ⚠️ <strong>Problema de créditos/tokens en Anthropic</strong>
                        <br />• Ve a <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline">console.anthropic.com</a> y verifica tu saldo
                        <br />• Agrega créditos o verifica tu plan de facturación
                        <br />• La API key está configurada, pero no hay créditos disponibles
                      </>
                    ) : error.includes('not_found_error') || error.includes('model:') ? (
                      <>
                        El modelo no está disponible. Verifica:
                        <br />• Que la API key de Anthropic tenga acceso a Claude 3.5 Sonnet
                        <br />• Que la cuenta de Anthropic tenga créditos disponibles
                        <br />• Consulta los logs en Supabase para más detalles
                      </>
                    ) : (
                      <>
                        Configura la variable de entorno <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">ANTHROPIC_API_KEY</code> en el dashboard de Supabase.
                        <br />
                        Consulta: <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">CONFIGURAR_ANTHROPIC_API_KEY.md</code>
                      </>
                    )}
                  </p>
                </div>
              )}
              <p className="text-xs text-red-500 dark:text-red-400 mt-3 pt-2 border-t border-red-200 dark:border-red-800">
                Usando texto original como fallback
              </p>
            </div>
          )}

          {/* Opciones */}
          {!loading && !moderationFlag && (option1 || option2) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Opción 1: Corrección Simple */}
              <button
                onClick={() => handleSelect(option1)}
                className="group relative bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-6 text-left hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <span className="font-semibold text-blue-900 dark:text-blue-300">
                      Corrección Simple
                    </span>
                  </div>
                  <Wand2 className="w-5 h-5 text-blue-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                  {option1}
                </p>

                <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500 rounded-xl transition-colors pointer-events-none"></div>
              </button>

              {/* Opción 2: Versión Elaborada */}
              <button
                onClick={() => handleSelect(option2)}
                className="group relative bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-2 border-purple-200 dark:border-purple-700 rounded-xl p-6 text-left hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <span className="font-semibold text-purple-900 dark:text-purple-300">
                      Versión Elaborada
                    </span>
                  </div>
                  <Sparkles className="w-5 h-5 text-purple-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                  {option2}
                </p>

                <div className="absolute inset-0 border-2 border-transparent group-hover:border-purple-500 rounded-xl transition-colors pointer-events-none"></div>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Powered by N8N Workflow • {context === 'input_livechat' ? 'Live Chat' : context === 'input_send_image_livechat' ? 'Envío de Imagen' : 'Solicitud de Transferencia'}
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParaphraseModal;

