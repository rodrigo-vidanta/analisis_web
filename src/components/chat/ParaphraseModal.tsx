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
import { X, Wand2, Sparkles, Loader2 } from 'lucide-react';

interface ParaphraseModalProps {
  isOpen: boolean;
  originalText: string;
  onSelect: (text: string) => void;
  onCancel: () => void;
}

// Configuración Anthropic (usar Edge Function proxy para evitar CORS)
const ANTHROPIC_PROXY_URL = 'https://zbylezfyagwrxoecioup.supabase.co/functions/v1/anthropic-proxy';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzYyNzEsImV4cCI6MjA3NDkxMjI3MX0.W6Vt5h4r7vNSP_YQtd_fbTWuK7ERrcttwhcpe5Q7KoM';

export const ParaphraseModal: React.FC<ParaphraseModalProps> = ({
  isOpen,
  originalText,
  onSelect,
  onCancel
}) => {
  const [option1, setOption1] = useState<string>('');
  const [option2, setOption2] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Prompt del sistema basado en la personalidad del agente
  const SYSTEM_PROMPT = `Eres un asistente experto en comunicación profesional para un agente de ventas de viajes y resorts de lujo.

**PERSONALIDAD DEL AGENTE:**
- Cordial, profesional y directo
- Lenguaje natural y conversacional (como persona real)
- Respetuoso y cálido, sin sonar robótico
- Experto en hospitalidad y turismo de lujo
- Enfocado en despertar interés y descubrir necesidades

**TU TAREA:**
Recibirás un mensaje escrito por un vendedor humano y deberás generar DOS versiones mejoradas:

**OPCIÓN 1 - Corrección Simple:**
- Corregir ortografía y gramática
- Mantener el tono y personalidad del agente
- NO alargar el texto ni agregar contenido nuevo
- Mantener el mensaje conciso y directo
- Conservar emojis existentes (si los hay)

**OPCIÓN 2 - Versión Elaborada:**
- Corregir ortografía y gramática
- Hacer el mensaje ligeramente más profesional y elaborado
- Agregar 1-2 emojis relevantes si mejora la comunicación
- Mantener la calidez y cercanía
- Máximo 20% más largo que el original

**FORMATO DE RESPUESTA:**
Debes responder ÚNICAMENTE con un JSON válido en este formato exacto:
{
  "option1": "texto corregido simple",
  "option2": "texto elaborado con emojis"
}

**RESTRICCIONES:**
- NO uses más de 2 emojis en la opción 2
- NO cambies el significado del mensaje original
- NO agregues información que no esté en el mensaje original
- Mantén el tono profesional pero cercano
- Si el mensaje original es una pregunta, mantén la pregunta
- Si el mensaje original es una afirmación, mantén la afirmación`;

  useEffect(() => {
    if (isOpen && originalText) {
      generateParaphrases();
    }
  }, [isOpen, originalText]);

  // Detectar atajos de teclado (1 o 2)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen || loading) return;

      if (e.key === '1' && option1) {
        onSelect(option1);
      } else if (e.key === '2' && option2) {
        onSelect(option2);
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, option1, option2, loading, onSelect, onCancel]);

  const generateParaphrases = async () => {
    setLoading(true);
    setError('');
    setOption1('');
    setOption2('');

    try {
      // Usar Edge Function proxy para evitar CORS
      const response = await fetch(ANTHROPIC_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 200, // Reducido a 200 para respuestas más rápidas
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Mensaje a mejorar: "${originalText}"`
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error al generar paráfrasis');
      }

      const data = await response.json();
      const content = data.content[0].text;

      // Parsear JSON de la respuesta
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Formato de respuesta inválido');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      setOption1(parsed.option1 || originalText);
      setOption2(parsed.option2 || originalText);

    } catch (err) {
      console.error('❌ Error generando paráfrasis:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      // Fallback: usar texto original
      setOption1(originalText);
      setOption2(originalText);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Wand2 className="w-6 h-6" />
              <h2 className="text-xl font-bold">Mejorar Mensaje con IA</h2>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-white/80 mt-2">
            Selecciona la mejor versión o presiona <kbd className="px-2 py-1 bg-white/20 rounded text-xs">1</kbd> o <kbd className="px-2 py-1 bg-white/20 rounded text-xs">2</kbd>
          </p>
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

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-red-600 dark:text-red-400 text-sm">
                ⚠️ {error}
              </p>
              <p className="text-xs text-red-500 dark:text-red-400 mt-2">
                Usando texto original como fallback
              </p>
            </div>
          )}

          {/* Opciones */}
          {!loading && (option1 || option2) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Opción 1: Corrección Simple */}
              <button
                onClick={() => onSelect(option1)}
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
                onClick={() => onSelect(option2)}
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
            Powered by Claude 3.5 Sonnet • Anthropic AI
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

