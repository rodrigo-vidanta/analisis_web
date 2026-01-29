/**
 * Componente de ejemplo para probar modificadores de texto de WhatsApp
 * 
 * Este componente NO se usa en producción, es solo para testing.
 * Para probarlo, importa en cualquier vista de desarrollo.
 */

import React from 'react';
import { renderWhatsAppFormattedText } from '../utils/whatsappTextFormatter';

export const WhatsAppTextModifierDemo: React.FC = () => {
  const ejemplos = [
    {
      titulo: 'Negrita',
      texto: 'Hola *Juan*, tu cita está *confirmada*.',
      sintaxis: '*texto*'
    },
    {
      titulo: 'Cursiva',
      texto: 'Recuerda traer _tu identificación oficial_.',
      sintaxis: '_texto_'
    },
    {
      titulo: 'Tachado',
      texto: 'Precio anterior: ~$500~ Nuevo precio: *$400*',
      sintaxis: '~texto~'
    },
    {
      titulo: 'Monoespaciado',
      texto: 'Tu código de verificación es: ```ABC123```',
      sintaxis: '```texto```'
    },
    {
      titulo: 'Combinado',
      texto: `*¡Hola {{1}}!* 👋

Tu cita está _confirmada_ para el *{{2}}* a las {{3}}.

~Horario anterior: 10:00 AM~
*Nuevo horario:* {{3}}

Por favor presenta tu código: ```{{4}}```

Nos vemos pronto 😊`,
      sintaxis: 'Mezcla de modificadores'
    }
  ];

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Modificadores de Texto WhatsApp
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Formatos oficiales soportados por la plataforma
          </p>
        </div>

        {/* Ejemplos */}
        <div className="space-y-6">
          {ejemplos.map((ejemplo, index) => (
            <div 
              key={index}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700"
            >
              {/* Header del ejemplo */}
              <div className="px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{ejemplo.titulo}</h3>
                  <code className="text-xs bg-white/20 px-3 py-1 rounded-lg font-mono">
                    {ejemplo.sintaxis}
                  </code>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Texto original */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wider">
                      Texto Original
                    </h4>
                    <div className="bg-gray-100 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                        {ejemplo.texto}
                      </pre>
                    </div>
                  </div>

                  {/* Vista previa renderizada */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wider">
                      Vista Previa Renderizada
                    </h4>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border-2 border-green-200 dark:border-green-800">
                      <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                        {renderWhatsAppFormattedText(ejemplo.texto)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Guía rápida */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-4">
            📚 Guía Rápida
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong className="text-blue-800 dark:text-blue-400">Negrita:</strong>
              <code className="ml-2 text-xs bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded">*texto*</code>
            </div>
            <div>
              <strong className="text-blue-800 dark:text-blue-400">Cursiva:</strong>
              <code className="ml-2 text-xs bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded">_texto_</code>
            </div>
            <div>
              <strong className="text-blue-800 dark:text-blue-400">Tachado:</strong>
              <code className="ml-2 text-xs bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded">~texto~</code>
            </div>
            <div>
              <strong className="text-blue-800 dark:text-blue-400">Monoespaciado:</strong>
              <code className="ml-2 text-xs bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded">```texto```</code>
            </div>
          </div>
          <p className="mt-4 text-xs text-blue-700 dark:text-blue-400 italic">
            💡 Los modificadores se aplican automáticamente en todas las vistas previas del módulo de campañas.
          </p>
        </div>
      </div>
    </div>
  );
};
