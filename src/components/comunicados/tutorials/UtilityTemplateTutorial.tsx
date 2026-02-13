/**
 * ============================================
 * TUTORIAL INTERACTIVO: PLANTILLA UTILITY
 * ============================================
 *
 * Tutorial animado de 4 pasos sobre la plantilla
 * seguimiento_contacto_utilidad.
 *
 * Patron: CrmUrlTutorialModal.tsx
 * (AnimatedCursor, TypewriterText, auto-advance, dots)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Calendar,
  Clock,
  XCircle,
  AlertTriangle,
  CheckCircle,
  Send,
  Shield,
} from 'lucide-react';

interface UtilityTemplateTutorialProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 4;
const AUTO_ADVANCE_MS = 6000;

/** Cursor animado que se mueve a una posicion */
const AnimatedCursor: React.FC<{ x: number; y: number; clicking?: boolean; delay?: number }> = ({
  x,
  y,
  clicking,
  delay = 0,
}) => (
  <motion.div
    className="absolute z-50 pointer-events-none"
    initial={{ x: x - 30, y: y - 30, opacity: 0 }}
    animate={{ x, y, opacity: 1 }}
    transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="drop-shadow-lg">
      <path
        d="M5 3L19 12L12 13L9 20L5 3Z"
        fill="white"
        stroke="#1e293b"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
    {clicking && (
      <motion.div
        className="absolute top-0 left-0 w-6 h-6 rounded-full bg-blue-500/30"
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.6, delay: delay + 0.8, ease: 'easeOut' }}
      />
    )}
  </motion.div>
);

/** Efecto typewriter */
const TypewriterText: React.FC<{ text: string; delay?: number }> = ({ text, delay = 0 }) => {
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
    }, 20);
    return () => clearTimeout(timer);
  }, [displayed, text, started]);

  return (
    <>
      {displayed}
      {started && displayed.length < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="text-emerald-400"
        >
          |
        </motion.span>
      )}
    </>
  );
};

/** Counter animado de 0 a target */
const AnimatedCounter: React.FC<{ target: number; delay?: number }> = ({ target, delay = 0 }) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started || count >= target) return;
    const timer = setTimeout(() => setCount(c => c + 1), 300);
    return () => clearTimeout(timer);
  }, [started, count, target]);

  return <span>{count}</span>;
};

const UtilityTemplateTutorial: React.FC<UtilityTemplateTutorialProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  // Auto-advance
  useEffect(() => {
    if (!autoPlay) return;
    if (step === TOTAL_STEPS - 1) return; // No auto-advance en ultimo paso
    const timer = setTimeout(() => {
      setStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [step, autoPlay]);

  const goToStep = useCallback((s: number) => {
    setStep(s);
    setAutoPlay(false);
  }, []);

  const stepLabels = [
    'Nueva plantilla de seguimiento disponible',
    'Reglas importantes de uso',
    'Como enviar correctamente',
    'Protege el WhatsApp del equipo',
  ];

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="pb-4 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Tutorial: Plantilla Utility</h3>
            <p className="text-xs text-gray-400">
              Paso {step + 1} de {TOTAL_STEPS}
            </p>
          </div>
        </div>
      </div>

      {/* Step Label */}
      <div className="pt-4 pb-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
              {step + 1}
            </span>
            <p className="text-sm font-medium text-gray-200">{stepLabels[step]}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step Content */}
      <div className="py-4">
        <div className="rounded-xl overflow-hidden border border-gray-700 bg-gray-900 min-h-[300px] relative">
          <AnimatePresence mode="wait">
            {/* Step 0: Intro - WhatsApp message preview */}
            {step === 0 && (
              <motion.div
                key="intro"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-4"
              >
                {/* Template name badge */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <span className="text-xs font-mono text-emerald-400">
                      seguimiento_contacto_utilidad
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">Tipo: Utility</span>
                </motion.div>

                {/* WhatsApp message mockup */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="max-w-sm"
                >
                  <div className="bg-[#005c4b] rounded-lg rounded-tl-none p-3 shadow-lg">
                    <p className="text-sm text-white leading-relaxed">
                      <TypewriterText
                        text="Hola {{nombre_prospecto}}, soy {{nombre_ejecutivo}} de Vida Vacations. Me comunico para dar seguimiento a tu solicitud de informacion. Estoy a tus ordenes para cualquier duda."
                        delay={0.8}
                      />
                    </p>
                    <div className="flex justify-end mt-1">
                      <span className="text-[10px] text-emerald-200/60">12:30 PM</span>
                    </div>
                  </div>
                </motion.div>

                {/* Info note */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 3 }}
                  className="flex items-start gap-2 px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded-lg"
                >
                  <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-300">
                    Esta plantilla es tipo <span className="font-semibold">Utility</span> y tiene
                    reglas diferentes a las plantillas de marketing.
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* Step 1: Reglas */}
            {step === 1 && (
              <motion.div
                key="reglas"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-3"
              >
                {/* Rule 1: Max 2 per semester */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Maximo 2 envios por semestre</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Cada prospecto solo puede recibir esta plantilla 2 veces en 180 dias
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400">
                    <span className="text-2xl font-bold">
                      <AnimatedCounter target={2} delay={0.5} />
                    </span>
                    <span className="text-xs text-gray-500">/sem</span>
                  </div>
                </motion.div>

                {/* Rule 2: Min 48h between sends */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Minimo 48 horas entre envios</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Debes esperar al menos 2 dias entre cada envio al mismo prospecto
                    </p>
                  </div>
                  {/* Animated time bar */}
                  <div className="w-16">
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ delay: 1, duration: 2, ease: 'easeOut' }}
                        className="h-full bg-blue-500 rounded-full"
                      />
                    </div>
                    <p className="text-[10px] text-blue-400 mt-1 text-center font-medium">48h</p>
                  </div>
                </motion.div>

                {/* Rule 3: Blocked for "Es miembro" */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-red-500/30"
                >
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      Prohibida para &quot;Es miembro&quot;
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      No se puede enviar a prospectos que ya son miembros
                    </p>
                  </div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.5, type: 'spring' }}
                    className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-400 font-medium"
                  >
                    Bloqueada
                  </motion.div>
                </motion.div>
              </motion.div>
            )}

            {/* Step 2: Como usar */}
            {step === 2 && (
              <motion.div
                key="como-usar"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-4 relative"
              >
                {/* Template selector mockup */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
                >
                  {/* Selector header */}
                  <div className="px-3 py-2 bg-gray-750 border-b border-gray-700 flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-medium text-gray-300">
                      Seleccionar plantilla
                    </span>
                  </div>

                  {/* Template list */}
                  <div className="divide-y divide-gray-700/50">
                    {[
                      { name: 'bienvenida_prospecto', type: 'Marketing', selected: false },
                      { name: 'seguimiento_contacto_utilidad', type: 'Utility', selected: true },
                      { name: 'recordatorio_cita', type: 'Marketing', selected: false },
                    ].map((tpl, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 + i * 0.15 }}
                        className={`px-3 py-2.5 flex items-center justify-between ${
                          tpl.selected
                            ? 'bg-purple-500/10 border-l-2 border-l-purple-500'
                            : 'hover:bg-gray-750'
                        }`}
                      >
                        <div>
                          <span
                            className={`text-xs font-mono ${
                              tpl.selected ? 'text-purple-300' : 'text-gray-400'
                            }`}
                          >
                            {tpl.name}
                          </span>
                          <span
                            className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${
                              tpl.type === 'Utility'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {tpl.type}
                          </span>
                        </div>
                        {tpl.selected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1, type: 'spring' }}
                          >
                            <CheckCircle className="w-4 h-4 text-purple-400" />
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Variables section */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="space-y-2"
                >
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Variables requeridas
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="px-3 py-2 bg-gray-800 rounded-lg border border-emerald-500/30">
                      <p className="text-[10px] text-gray-500 mb-0.5">Variable 1</p>
                      <p className="text-xs text-emerald-400 font-mono">{'{{nombre_prospecto}}'}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Se llena automaticamente</p>
                    </div>
                    <div className="px-3 py-2 bg-gray-800 rounded-lg border border-emerald-500/30">
                      <p className="text-[10px] text-gray-500 mb-0.5">Variable 2</p>
                      <p className="text-xs text-emerald-400 font-mono">{'{{nombre_ejecutivo}}'}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Se llena automaticamente</p>
                    </div>
                  </div>
                </motion.div>

                {/* Animated cursor */}
                <AnimatedCursor x={200} y={100} clicking delay={0.5} />
              </motion.div>
            )}

            {/* Step 3: Advertencia */}
            {step === 3 && (
              <motion.div
                key="advertencia"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="p-5 flex flex-col items-center justify-center min-h-[300px] space-y-4"
              >
                {/* Warning icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center"
                >
                  <AlertTriangle className="w-8 h-8 text-amber-400" />
                </motion.div>

                {/* Warning card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="w-full max-w-md p-4 bg-amber-500/5 border border-amber-500/30 rounded-xl space-y-3"
                >
                  <p className="text-sm text-amber-200 leading-relaxed">
                    Solo enviar a prospectos con los que{' '}
                    <motion.span
                      animate={{ color: ['#fbbf24', '#f59e0b', '#fbbf24'] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="font-bold"
                    >
                      YA hablaste por telefono
                    </motion.span>{' '}
                    o que solicitaron un mensaje.
                  </p>
                  <div className="space-y-2">
                    {[
                      'No reenviar si no responden',
                      'No usar masivamente',
                    ].map((rule, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1 + i * 0.3 }}
                        className="flex items-center gap-2"
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        <span className="text-xs text-gray-300">{rule}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Critical message */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.8 }}
                  className="w-full max-w-md p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-center"
                >
                  <p className="text-sm text-red-300 font-medium">
                    El mal uso de esta plantilla{' '}
                    <span className="text-red-400 font-bold">
                      bloquea el WhatsApp de todo el equipo
                    </span>
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer: dots + navigation */}
      <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
        {/* Step dots */}
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <button
              key={i}
              onClick={() => goToStep(i)}
              className={`transition-all duration-300 rounded-full ${
                i === step
                  ? 'w-6 h-2 bg-purple-500'
                  : i < step
                  ? 'w-2 h-2 bg-purple-500/50 hover:bg-purple-500/70'
                  : 'w-2 h-2 bg-gray-700 hover:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
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
                : 'bg-purple-600 hover:bg-purple-700'
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

export default UtilityTemplateTutorial;
