/**
 * ============================================
 * MAINTENANCE PAGE - Modo mantenimiento
 * ============================================
 *
 * Mascara fullscreen que cubre TODA la app (login incluido).
 * Para activar/desactivar: cambiar MAINTENANCE_MODE en App.tsx
 *
 * Fecha: 12 Febrero 2026
 */

import { useState, useEffect } from 'react';

const funFacts = [
  // Tips de ventas por WhatsApp
  "Tip: Responde en menos de 5 minutos. El 78% de los prospectos compran al primero que contesta.",
  "Tip: Usa el nombre del prospecto en los primeros 3 mensajes. La personalizacion aumenta respuesta un 26%.",
  "Tip: No envies audios largos. Maximo 60 segundos. Si necesitas mas, mejor haz una llamada.",
  "Tip: Los emojis aumentan la tasa de apertura un 25%. Pero no abuses, maximo 2-3 por mensaje.",
  "Tip: Envia mensajes entre 9am-12pm y 4pm-7pm. Son las horas con mayor tasa de respuesta.",
  "Tip: Nunca cierres con '¿Tiene alguna duda?' - mejor usa '¿Cual de las dos opciones le interesa mas?'",
  "Tip: El primer mensaje NO debe ser tu pitch. Primero saluda, genera confianza, luego presenta.",
  "Tip: Usa listas con viñetas para presentar beneficios. Son 40% mas faciles de leer que parrafos largos.",
  "Tip: Haz seguimiento al dia 1, 3 y 7 despues del primer contacto. El 80% de ventas necesitan 5+ toques.",
  "Tip: Si un prospecto no contesta, cambia el formato: texto, imagen, audio. Cada persona prefiere algo distinto.",
  "Tip: Termina siempre con una pregunta abierta. Las preguntas cerradas matan la conversacion.",
  "Tip: No copies y pegues el mismo mensaje a todos. Los prospectos notan cuando es generico.",
  "Tip: Un mensaje de WhatsApp ideal tiene 3-4 lineas maximo. Mas largo y no lo leen completo.",
  "Tip: Usa imagenes y videos cortos de las propiedades. El contenido visual convierte 65% mas que solo texto.",
  "Tip: Antes de mandar precio, asegurate de generar valor. Si el prospecto no ve beneficio, cualquier precio es caro.",
  "Tip: Los viernes despues de las 3pm la tasa de respuesta cae 40%. Mejor agenda para el lunes.",
  "Tip: Cuando un prospecto dice 'lo voy a pensar', agenda un follow-up concreto: '¿Le marco el jueves a las 11?'",
  "Tip: Graba audios con energia y sonriendo. Si, se nota la sonrisa aunque sea audio.",
  "Tip: No mandes solo texto. Alterna: texto → imagen → audio → video. La variedad mantiene el interes.",
  "Tip: El mejor momento para pedir referidos es justo despues de que el cliente diga algo positivo.",
  "Tip: Crea urgencia real: 'Esta promocion cierra el viernes' es mejor que 'Aprovecha ahora'.",
  "Tip: Si el prospecto te dejo en visto, espera 24h y envia algo de valor, no otro pitch.",
  "Tip: Un call center promedio recibe 4,400 llamadas al dia. Nosotros analizamos cada una.",
  "Tip: Los prospectos que reciben seguimiento por WhatsApp + llamada convierten 3x mas que solo llamada.",
  "Tip: Usa estados de WhatsApp para mostrar testimonios y casos de exito. Es publicidad gratuita.",
];

export default function MaintenancePage() {
  const [currentFact, setCurrentFact] = useState(0);
  const [dots, setDots] = useState('');

  // Forzar dark mode y fondo oscuro independiente del tema del usuario
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.style.backgroundColor = '#0f172a';
    document.body.style.colorScheme = 'dark';
  }, []);

  // Rotar fun facts cada 6 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % funFacts.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Animar puntos suspensivos
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)',
      }}
    >
      {/* Estrellas de fondo */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.1,
              animation: `pulse ${Math.random() * 3 + 2}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
        {/* Logo / Header */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
              boxShadow: '0 0 40px rgba(99, 102, 241, 0.3)',
            }}
          >
            <span className="text-5xl select-none" role="img" aria-label="herramientas">&#128736;&#65039;</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            No estamos de vacaciones
          </h1>
          <p className="text-indigo-300 text-lg font-medium">
            ...bueno, solo los servidores
          </p>
        </div>

        {/* Status card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
            <span className="text-amber-300 font-semibold text-sm tracking-wide uppercase">
              Mantenimiento en progreso{dots}
            </span>
          </div>

          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Estamos realizando tareas de mantenimiento en nuestra infraestructura.
            La plataforma volvera a estar disponible en breve.
          </p>

          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
            <p className="text-indigo-200 text-sm italic transition-all duration-500" key={currentFact}>
              &ldquo;{funFacts[currentFact]}&rdquo;
            </p>
          </div>
        </div>

        {/* Info footer */}
        <div className="space-y-3">
          <p className="text-gray-500 text-xs">
            PQNC QA AI Platform &bull; Vida Vacations
          </p>
          <p className="text-gray-600 text-xs">
            No necesitas hacer nada. Cuando el servicio se restablezca, la pagina cargara automaticamente.
          </p>
        </div>
      </div>

      {/* CSS para animacion pulse */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
