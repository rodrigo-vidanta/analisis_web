/**
 * ============================================
 * TUTORIAL INTERACTIVO: NOTAS INTERNAS (EJECUTIVOS)
 * ============================================
 *
 * Tutorial animado de 3 pasos explicando la nueva
 * funcion de notas internas desde la perspectiva
 * del ejecutivo que las recibe.
 *
 * Patron: DeliveryChecksTutorial.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  StickyNote,
  Sparkles,
  Eye,
  EyeOff,
  MessageCircle,
  ThumbsUp,
  Lightbulb,
  Shield,
  HeartHandshake,
} from 'lucide-react';

interface NotasInternasEjecutivoTutorialProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 3;
const AUTO_ADVANCE_MS = 9000;

/** Typewriter effect */
const TypewriterText: React.FC<{ text: string; delay?: number; speed?: number }> = ({ text, delay = 0, speed = 25 }) => {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay * 1000);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    if (displayed.length >= text.length) return;
    const timer = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, speed);
    return () => clearTimeout(timer);
  }, [displayed, text, started, speed]);

  return (
    <>
      {displayed}
      {started && displayed.length < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="text-amber-400"
        >
          |
        </motion.span>
      )}
    </>
  );
};

/** Interactive scenario demo */
const ScenarioDemo: React.FC = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1200),
      setTimeout(() => setPhase(2), 3000),
      setTimeout(() => setPhase(3), 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="space-y-2 bg-gray-800/50 rounded-lg p-3">
      {/* Customer message */}
      <motion.div
        initial={{ opacity: 0, x: -15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="flex justify-start"
      >
        <div className="px-3 py-1.5 bg-gray-700 rounded-xl max-w-[220px]">
          <p className="text-xs text-gray-200">Me interesa el paquete familiar</p>
          <p className="text-[9px] text-gray-500 text-right mt-0.5">09:15</p>
        </div>
      </motion.div>

      {/* Note from supervisor */}
      {phase >= 1 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="flex justify-center"
        >
          <div className="w-full max-w-[260px] px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-amber-500/30">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <StickyNote className="w-3 h-3 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-bold text-amber-300">Supervisor:</span>
                  <span className="text-[9px] text-amber-400/60">Ana Garcia</span>
                </div>
                <p className="text-[11px] text-gray-200">Este prospecto tiene presupuesto alto, ofrece suite premium</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Highlighted agent response */}
      {phase >= 2 && (
        <motion.div
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex justify-end"
        >
          <div className="px-3 py-1.5 bg-purple-600 rounded-xl max-w-[220px]">
            <p className="text-xs text-white">Tenemos una suite premium perfecta para su familia!</p>
            <p className="text-[9px] text-purple-300 text-right mt-0.5">09:17</p>
          </div>
        </motion.div>
      )}

      {/* Success indicator */}
      {phase >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <ThumbsUp className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] text-emerald-300">Mejor oferta gracias a la nota</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

const NotasInternasEjecutivoTutorial: React.FC<NotasInternasEjecutivoTutorialProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay || step === TOTAL_STEPS - 1) return;
    const timer = setTimeout(() => setStep(p => Math.min(p + 1, TOTAL_STEPS - 1)), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [step, autoPlay]);

  const goToStep = useCallback((s: number) => {
    setAutoPlay(false);
    setStep(s);
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto p-6 bg-gray-900 rounded-2xl shadow-2xl border border-gray-800">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Nueva funcion: Notas Internas</h2>
          <p className="text-xs text-gray-400">Tu supervisor ahora puede ayudarte en tiempo real</p>
        </div>
      </div>

      {/* Content area */}
      <div className="relative min-h-[280px]">
        <div className="overflow-hidden rounded-xl bg-gray-850 border border-gray-800">
          <AnimatePresence mode="wait">
            {/* Step 0: La novedad */}
            {step === 0 && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-4"
              >
                <div className="text-center space-y-2 mb-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                    className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30 flex items-center justify-center"
                  >
                    <StickyNote className="w-7 h-7 text-amber-400" />
                  </motion.div>
                  <p className="text-sm text-gray-300">
                    <TypewriterText text="Tu coordinador o supervisor ahora puede dejarte sugerencias directamente en el chat" speed={25} />
                  </p>
                </div>

                {/* Before/After comparison */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 2 }}
                    className="p-3 bg-gray-800 rounded-lg border border-gray-700 text-center"
                  >
                    <MessageCircle className="w-5 h-5 text-gray-500 mx-auto mb-1.5" />
                    <p className="text-[10px] text-gray-500 font-medium">ANTES</p>
                    <p className="text-[11px] text-gray-400 mt-1">Coordinaciones por llamada o chat aparte</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 2.5 }}
                    className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/20 text-center"
                  >
                    <StickyNote className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                    <p className="text-[10px] text-amber-400 font-medium">AHORA</p>
                    <p className="text-[11px] text-amber-300 mt-1">Indicaciones directamente en la conversacion</p>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 3.5 }}
                  className="flex items-start gap-2 px-3 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg"
                >
                  <EyeOff className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-emerald-300">
                    Estas notas son <span className="font-semibold text-emerald-200">100% internas</span>. El cliente nunca las vera.
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* Step 1: Como se ven y ejemplo interactivo */}
            {step === 1 && (
              <motion.div
                key="demo"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-4"
              >
                <div className="text-center mb-2">
                  <p className="text-sm font-medium text-white">Asi se ve en tu chat</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Observa como una nota puede mejorar tu atencion</p>
                </div>

                <ScenarioDemo />

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 5.5 }}
                  className="flex items-start gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-lg"
                >
                  <Eye className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-300">
                    Las notas aparecen <span className="font-semibold text-amber-200">centradas</span> con fondo dorado para que las identifiques facilmente
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* Step 2: Beneficios */}
            {step === 2 && (
              <motion.div
                key="benefits"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-3"
              >
                <div className="text-center mb-2">
                  <p className="text-sm font-medium text-white">Beneficios para ti</p>
                </div>

                {[
                  {
                    icon: Lightbulb,
                    title: 'Sugerencias en contexto',
                    desc: 'Recibe indicaciones justo cuando las necesitas, sin salir de la conversacion.',
                    color: 'text-amber-400',
                    bg: 'bg-amber-500/10 border-amber-500/30',
                  },
                  {
                    icon: Shield,
                    title: 'Autorizaciones rapidas',
                    desc: 'Tu coordinador puede autorizar descuentos u ofertas con una nota visible al instante.',
                    color: 'text-blue-400',
                    bg: 'bg-blue-500/10 border-blue-500/30',
                  },
                  {
                    icon: HeartHandshake,
                    title: 'Mejor atencion al cliente',
                    desc: 'Con apoyo de tu equipo en tiempo real, puedes dar respuestas mas completas y certeras.',
                    color: 'text-emerald-400',
                    bg: 'bg-emerald-500/10 border-emerald-500/30',
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.35 }}
                    className={`flex items-start gap-3 p-3 bg-gray-800 rounded-lg border ${item.bg.split(' ')[1]}`}
                  >
                    <div className={`w-9 h-9 rounded-lg ${item.bg} border flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <item.icon className={`w-4.5 h-4.5 ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.8 }}
                  className="text-center pt-2"
                >
                  <p className="text-xs text-gray-500">
                    No necesitas hacer nada diferente, las notas aparecen automaticamente en tus conversaciones
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer: dots + navigation */}
      <div className="pt-4 border-t border-gray-800 flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <button
              key={i}
              onClick={() => goToStep(i)}
              className={`transition-all duration-300 rounded-full ${
                i === step
                  ? 'w-6 h-2 bg-amber-500'
                  : i < step
                  ? 'w-2 h-2 bg-amber-500/50 hover:bg-amber-500/70'
                  : 'w-2 h-2 bg-gray-700 hover:bg-gray-600'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => goToStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="p-2 rounded-lg hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-400"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => (step === TOTAL_STEPS - 1 ? onComplete() : goToStep(step + 1))}
            className={`px-4 py-2 rounded-lg transition-colors text-white text-xs font-medium flex items-center gap-1 ${
              step === TOTAL_STEPS - 1
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {step === TOTAL_STEPS - 1 ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Entendido</span>
              </>
            ) : (
              <>
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotasInternasEjecutivoTutorial;
