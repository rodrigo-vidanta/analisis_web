/**
 * ============================================
 * TUTORIAL INTERACTIVO: PLANTILLAS NO ENTREGADAS
 * ============================================
 *
 * Tutorial animado de 4 pasos que explica a los usuarios
 * por que algunas plantillas aparecen borrosas y que hacer.
 *
 * Patron: DeliveryChecksTutorial.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  Eye,
  EyeOff,
  MousePointerClick,
  RefreshCw,
  MessageSquareWarning,
  Ban,
  Info,
} from 'lucide-react';

interface UndeliveredTemplateTutorialProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 4;
const AUTO_ADVANCE_MS = 8000;

/** Simulated blurred template bubble */
const BlurredTemplateBubble: React.FC<{
  text: string;
  time: string;
  errorTitle: string;
  blurred: boolean;
  onClickReveal?: () => void;
  delay?: number;
}> = ({ text, time, errorTitle, blurred, onClickReveal, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 15, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className="max-w-[85%] ml-auto"
  >
    <div
      className="relative rounded-xl rounded-tr-sm p-3 shadow-lg bg-gradient-to-br from-teal-600/95 to-emerald-700/95 overflow-hidden cursor-pointer"
      onClick={onClickReveal}
    >
      {/* Content with conditional blur */}
      <div className={`transition-all duration-500 ${blurred ? 'blur-[6px] select-none' : 'blur-0'}`}>
        <p className="text-sm text-white leading-relaxed">{text}</p>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[10px] text-white/40">{time}</span>
          <AlertTriangle className="w-3 h-3 text-rose-300" />
          <span className="text-[9px] text-rose-200">{errorTitle}</span>
        </div>
      </div>

      {/* Error overlay */}
      <AnimatePresence>
        {blurred && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4"
          >
            <AlertTriangle className="w-6 h-6 text-rose-200 mb-1.5" />
            <span className="text-sm font-semibold text-white text-center leading-tight">
              {errorTitle}
            </span>
            <span className="text-[10px] text-white/50 mt-2">
              Toca para ver el mensaje
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </motion.div>
);

/** Normal delivered template bubble for comparison */
const NormalTemplateBubble: React.FC<{
  text: string;
  time: string;
  delay?: number;
}> = ({ text, time, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 15, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className="max-w-[85%] ml-auto"
  >
    <div className="rounded-xl rounded-tr-sm p-3 shadow-lg bg-gradient-to-br from-teal-600/95 to-emerald-700/95">
      <p className="text-sm text-white leading-relaxed">{text}</p>
      <div className="flex items-center justify-end gap-1 mt-1">
        <span className="text-[10px] text-white/40">{time}</span>
        <span className="text-[9px] text-cyan-300">Leido</span>
      </div>
    </div>
  </motion.div>
);

const UndeliveredTemplateTutorial: React.FC<UndeliveredTemplateTutorialProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [demoBlurred, setDemoBlurred] = useState(true);

  // Reset demo state when entering step 2
  useEffect(() => {
    if (step === 2) setDemoBlurred(true);
  }, [step]);

  // Auto-advance
  useEffect(() => {
    if (!autoPlay) return;
    if (step === TOTAL_STEPS - 1) return;
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
    'Algunos mensajes pueden aparecer borrosos',
    'WhatsApp decide a quien entregar tus mensajes',
    'Haz clic para ver el mensaje original',
    'Resumen y recomendaciones',
  ];

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="pb-4 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
            <EyeOff className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Mensajes No Entregados</h3>
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
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-rose-600 flex items-center justify-center text-white text-xs font-bold">
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
            {/* Step 0: What are blurred messages */}
            {step === 0 && (
              <motion.div
                key="what"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-4"
              >
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <div className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                    <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                      <Info className="w-3 h-3" />
                      Nuevo indicador visual
                    </span>
                  </div>
                </motion.div>

                {/* Chat mockup */}
                <div className="space-y-3 pt-2">
                  <NormalTemplateBubble
                    text="Hola Maria! Te comparto informacion sobre nuestros paquetes vacacionales."
                    time="9:00 AM"
                    delay={0.4}
                  />
                  <BlurredTemplateBubble
                    text="Buenos dias Carlos! Tenemos una promocion especial para ti este mes."
                    time="9:15 AM"
                    errorTitle="Meta decidio no entregar este mensaje"
                    blurred={true}
                    delay={1.2}
                  />
                </div>

                {/* Explanation */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.5 }}
                  className="flex items-start gap-2 px-3 py-2 bg-rose-500/5 border border-rose-500/20 rounded-lg"
                >
                  <EyeOff className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-rose-300">
                    Cuando un mensaje aparece <span className="font-semibold">borroso</span>, significa que{' '}
                    <span className="font-semibold">no llego al prospecto</span>. El motivo se muestra encima del mensaje.
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* Step 1: Why it happens */}
            {step === 1 && (
              <motion.div
                key="why"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-3"
              >
                {[
                  {
                    icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
                    title: 'WhatsApp protege a sus usuarios',
                    desc: 'Si un contacto recibe muchos mensajes de empresas, WhatsApp puede bloquear algunos para no saturarlo',
                    iconBg: 'bg-amber-500/10 border-amber-500/30',
                    border: 'border-amber-600/30',
                  },
                  {
                    icon: <Ban className="w-5 h-5 text-rose-400" />,
                    title: 'El contacto opto por no recibir',
                    desc: 'El prospecto puede haber bloqueado los mensajes de marketing desde WhatsApp',
                    iconBg: 'bg-rose-500/10 border-rose-500/30',
                    border: 'border-rose-600/30',
                  },
                  {
                    icon: <MessageSquareWarning className="w-5 h-5 text-blue-400" />,
                    title: 'Numero inactivo o invalido',
                    desc: 'El numero ya no tiene WhatsApp instalado o no es un numero valido',
                    iconBg: 'bg-blue-500/10 border-blue-500/30',
                    border: 'border-blue-600/30',
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.35 }}
                    className={`flex items-center gap-3 p-3 bg-gray-800 rounded-lg border ${item.border}`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${item.iconBg} border flex items-center justify-center flex-shrink-0`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  className="flex items-start gap-2 px-3 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-emerald-300">
                    <span className="font-semibold">No es un error de la plataforma.</span>{' '}
                    Es una decision de WhatsApp o del contacto.
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* Step 2: Interactive demo - click to reveal */}
            {step === 2 && (
              <motion.div
                key="demo"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-4"
              >
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-xs text-gray-400 text-center"
                >
                  Haz clic en el mensaje borroso para revelarlo
                </motion.p>

                <BlurredTemplateBubble
                  text="Hola Juan! Aprovecha nuestra promocion de verano con hasta 40% de descuento."
                  time="11:30 AM"
                  errorTitle="Meta decidio no entregar este mensaje"
                  blurred={demoBlurred}
                  onClickReveal={() => setDemoBlurred(false)}
                  delay={0.4}
                />

                {/* Animated hand pointer hint */}
                <AnimatePresence>
                  {demoBlurred && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: 1.5 }}
                      className="flex justify-center"
                    >
                      <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="flex items-center gap-2 text-gray-500"
                      >
                        <MousePointerClick className="w-5 h-5" />
                        <span className="text-xs">Toca el mensaje</span>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Success message after reveal */}
                <AnimatePresence>
                  {!demoBlurred && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="space-y-3"
                    >
                      <div className="flex items-start gap-2 px-3 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                        <Eye className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-emerald-300">
                          Ahora puedes ver el contenido original. El mensaje{' '}
                          <span className="font-semibold">no llego al prospecto</span>, pero tu puedes revisarlo.
                        </p>
                      </div>
                      <div className="flex items-start gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                        <RefreshCw className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-300">
                          Si necesitas contactar a este prospecto, puedes intentar con{' '}
                          <span className="font-semibold">otra plantilla</span> o esperar a que el contacto escriba primero.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Step 3: Summary */}
            {step === 3 && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="p-5 flex flex-col items-center justify-center min-h-[300px] space-y-5"
              >
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center"
                >
                  <AlertTriangle className="w-8 h-8 text-rose-400" />
                </motion.div>

                <motion.h4
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-lg font-semibold text-white text-center"
                >
                  Recuerda
                </motion.h4>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="w-full max-w-sm space-y-2.5"
                >
                  {[
                    { icon: <EyeOff className="w-4 h-4 text-rose-400" />, text: 'Mensaje borroso = no llego al prospecto' },
                    { icon: <ShieldAlert className="w-4 h-4 text-amber-400" />, text: 'Es decision de WhatsApp, no un error nuestro' },
                    { icon: <MousePointerClick className="w-4 h-4 text-blue-400" />, text: 'Haz clic en el mensaje para ver que decia' },
                    { icon: <RefreshCw className="w-4 h-4 text-emerald-400" />, text: 'Puedes intentar contactar con otra plantilla' },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1 + i * 0.25 }}
                      className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-lg border border-gray-700/50"
                    >
                      <div className="flex-shrink-0">{item.icon}</div>
                      <span className="text-sm text-gray-300">{item.text}</span>
                    </motion.div>
                  ))}
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
                  ? 'w-6 h-2 bg-rose-500'
                  : i < step
                  ? 'w-2 h-2 bg-rose-500/50 hover:bg-rose-500/70'
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
                : 'bg-rose-600 hover:bg-rose-700'
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

export default UndeliveredTemplateTutorial;
