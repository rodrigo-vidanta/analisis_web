/**
 * ============================================
 * TUTORIAL INTERACTIVO: GRUPOS DE PLANTILLAS
 * ============================================
 *
 * Tutorial animado de 5 pasos sobre el nuevo sistema
 * de envio de plantillas por grupos inteligentes.
 *
 * Patron: DeliveryChecksTutorial.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  FolderOpen,
  Star,
  Zap,
  Shield,
  TrendingUp,
  BarChart3,
  RotateCcw,
  Send,
  Sparkles,
} from 'lucide-react';

interface TemplateGroupsTutorialProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 5;
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

/** Animated star rating */
const AnimatedStars: React.FC<{ rating: number; delay?: number }> = ({ rating, delay = 0 }) => {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.25;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 20 }}
      className="inline-flex items-center gap-0.5"
    >
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i <= full
              ? 'text-amber-400 fill-amber-400'
              : i === full + 1 && hasHalf
              ? 'text-amber-400 fill-amber-400/50'
              : 'text-gray-600'
          }`}
        />
      ))}
      <span className="ml-1 text-xs font-semibold text-amber-300">{rating.toFixed(1)}</span>
    </motion.span>
  );
};

/** Mock group card */
const MockGroupCard: React.FC<{
  name: string;
  status: string;
  statusColor: string;
  rating: number;
  respRate: string;
  delivRate: string;
  delay?: number;
  highlight?: boolean;
}> = ({ name, status, statusColor, rating, respRate, delivRate, delay = 0, highlight = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className={`p-3 rounded-xl border transition-all ${
      highlight
        ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20'
        : 'border-gray-700 bg-gray-800/60'
    }`}
  >
    <div className="flex items-center justify-between mb-1.5">
      <div className="flex items-center gap-2">
        <FolderOpen className={`w-3.5 h-3.5 ${highlight ? 'text-amber-400' : 'text-gray-500'}`} />
        <span className="text-xs font-semibold text-white">{name}</span>
      </div>
      <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded-full border ${statusColor}`}>
        {status}
      </span>
    </div>
    <div className="flex items-center gap-3">
      <AnimatedStars rating={rating} delay={delay + 0.3} />
      <span className="text-[10px] text-gray-400">Resp: {respRate}</span>
      <span className="text-[10px] text-gray-400">Entrega: {delivRate}</span>
    </div>
  </motion.div>
);

const TemplateGroupsTutorial: React.FC<TemplateGroupsTutorialProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  // Auto-advance
  useEffect(() => {
    if (!autoPlay) return;
    if (step === TOTAL_STEPS - 1) return;
    const timer = setTimeout(() => {
      setStep(prev => Math.min(prev + 1, TOTAL_STEPS - 1));
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [step, autoPlay]);

  const goToStep = useCallback((s: number) => {
    setStep(s);
    setAutoPlay(false);
  }, []);

  const stepLabels = [
    'Tus plantillas ahora trabajan en equipo',
    'El sistema elige la mejor por ti',
    'Rating con estrellas: ve la calidad al instante',
    'Vista previa de hasta 5 plantillas por grupo',
    'Mas entregas, menos bloqueos, cero esfuerzo',
  ];

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="pb-4 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <FolderOpen className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Grupos Inteligentes de Plantillas</h3>
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
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-600 flex items-center justify-center text-white text-xs font-bold">
              {step + 1}
            </span>
            <p className="text-sm font-medium text-gray-200">{stepLabels[step]}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step Content */}
      <div className="py-4">
        <div className="rounded-xl overflow-hidden border border-gray-700 bg-gray-900 min-h-[320px] relative">
          <AnimatePresence mode="wait">

            {/* Step 0: Intro - Templates work as a team */}
            {step === 0 && (
              <motion.div
                key="intro"
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
                  <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      Nuevo sistema de envio
                    </span>
                  </div>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-gray-300 leading-relaxed"
                >
                  <TypewriterText
                    text="Antes envias una plantilla individual. Ahora tus plantillas se organizan en grupos inteligentes que trabajan juntos para maximizar entregas."
                    delay={0.6}
                    speed={20}
                  />
                </motion.p>

                {/* Before / After mockup */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 3.5 }}
                    className="p-3 rounded-xl bg-red-500/5 border border-red-500/20"
                  >
                    <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wide mb-2">Antes</p>
                    <div className="space-y-1.5">
                      {['plantilla_1', 'plantilla_2', 'plantilla_3'].map((name, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-gray-800/80 rounded text-[10px] text-gray-400">
                          <Send className="w-2.5 h-2.5" />
                          {name}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-red-400/70 mt-2">Elegias manualmente cual enviar</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 4.2 }}
                    className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
                  >
                    <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide mb-2">Ahora</p>
                    <div className="px-2 py-2 bg-gray-800/80 rounded space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-medium">
                        <FolderOpen className="w-3 h-3" />
                        Grupo Seguimiento
                      </div>
                      <div className="pl-5 space-y-0.5">
                        {['plantilla_1', 'plantilla_2', 'plantilla_3'].map((name, i) => (
                          <div key={i} className="text-[9px] text-gray-500">{name}</div>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] text-emerald-400/70 mt-2">El sistema elige la mejor</p>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Step 1: System picks the best */}
            {step === 1 && (
              <motion.div
                key="auto-select"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-4"
              >
                <AutoSelectDemo />

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 5.5 }}
                  className="flex items-start gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-lg"
                >
                  <Zap className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-300 leading-relaxed">
                    Al enviar, el sistema analiza la <span className="font-semibold">salud</span>, <span className="font-semibold">tasa de entrega</span> y <span className="font-semibold">respuesta</span> de cada plantilla y elige la que tiene mejor rendimiento en ese momento.
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* Step 2: Star rating explanation */}
            {step === 2 && (
              <motion.div
                key="rating"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-4"
              >
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm text-gray-300 leading-relaxed"
                >
                  Cada grupo muestra un <span className="text-amber-400 font-semibold">rating con estrellas</span> para que identifiques su calidad al instante:
                </motion.p>

                {/* Rating formula */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="p-3 rounded-xl bg-gray-800/60 border border-gray-700"
                >
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-300">
                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <Shield className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300 font-medium">Salud del grupo</span>
                    </div>
                    <span className="text-gray-500 font-bold">+</span>
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <BarChart3 className="w-3 h-3 text-blue-400" />
                      <span className="text-blue-300 font-medium">Tasa de respuesta</span>
                    </div>
                    <span className="text-gray-500 font-bold">=</span>
                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-amber-300 font-medium">Rating</span>
                    </div>
                  </div>
                </motion.div>

                {/* Example groups sorted */}
                <div className="space-y-2">
                  <MockGroupCard
                    name="Seguimiento Inicial"
                    status="Saludable"
                    statusColor="bg-emerald-900/20 text-emerald-400 border-emerald-800"
                    rating={4.2}
                    respRate="31.8%"
                    delivRate="95.2%"
                    delay={1.5}
                    highlight
                  />
                  <MockGroupCard
                    name="Recordatorio Cita"
                    status="Mixto"
                    statusColor="bg-yellow-900/20 text-yellow-400 border-yellow-800"
                    rating={3.1}
                    respRate="18.5%"
                    delivRate="81.5%"
                    delay={2.2}
                  />
                  <MockGroupCard
                    name="Promocion Especial"
                    status="Degradado"
                    statusColor="bg-orange-900/20 text-orange-400 border-orange-800"
                    rating={1.8}
                    respRate="8.2%"
                    delivRate="62.0%"
                    delay={2.9}
                  />
                </div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 4 }}
                  className="text-[11px] text-gray-400 text-center"
                >
                  Los grupos se ordenan automaticamente de mejor a menor rating
                </motion.p>
              </motion.div>
            )}

            {/* Step 3: Preview top 5 */}
            {step === 3 && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-3"
              >
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm text-gray-300 leading-relaxed"
                >
                  Al seleccionar un grupo, ves una <span className="text-amber-400 font-semibold">vista previa</span> de hasta 5 plantillas. Una expandida y las demas colapsadas:
                </motion.p>

                {/* Mock preview accordion */}
                <div className="space-y-1.5">
                  <PreviewAccordionDemo />
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 5 }}
                  className="flex items-start gap-2 px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded-lg"
                >
                  <Zap className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-300 leading-relaxed">
                    Las estadisticas ahora son mas claras: solo <span className="font-semibold">Tasa de Respuesta</span> y <span className="font-semibold">Tasa de Entrega</span>. Lo que realmente importa.
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* Step 4: Benefits summary */}
            {step === 4 && (
              <motion.div
                key="benefits"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="p-5 flex flex-col items-center justify-center min-h-[320px] space-y-5"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center"
                >
                  <FolderOpen className="w-8 h-8 text-amber-400" />
                </motion.div>

                <motion.h4
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-lg font-semibold text-white text-center"
                >
                  Mas entregas, menos bloqueos, cero esfuerzo
                </motion.h4>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="w-full max-w-sm space-y-2.5"
                >
                  {[
                    { icon: <TrendingUp className="w-4 h-4 text-emerald-400" />, text: 'Mayor tasa de entrega al rotar plantillas automaticamente' },
                    { icon: <Shield className="w-4 h-4 text-blue-400" />, text: 'Menos riesgo de bloqueo por Meta al no repetir la misma plantilla' },
                    { icon: <Zap className="w-4 h-4 text-amber-400" />, text: 'Seleccion inteligente: siempre se envia la plantilla mas sana' },
                    { icon: <RotateCcw className="w-4 h-4 text-purple-400" />, text: 'Cero trabajo manual: el sistema decide por ti' },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 + i * 0.35 }}
                      className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-lg border border-gray-700/50"
                    >
                      <div className="flex-shrink-0">{item.icon}</div>
                      <span className="text-sm text-gray-300">{item.text}</span>
                    </motion.div>
                  ))}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 3.2 }}
                  className="px-3 py-1.5 bg-amber-500/5 border border-amber-500/20 rounded-lg"
                >
                  <span className="text-[11px] text-amber-400/70">
                    Disponible en reactivacion de conversacion e importacion de prospectos
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer: dots + navigation */}
      <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
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

/** Demo: system auto-selects best template from group */
const AutoSelectDemo: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const templates = [
    { name: 'seguimiento_v1', health: 'Critica', healthColor: 'text-red-400', rate: '45%', rateColor: 'text-red-400' },
    { name: 'seguimiento_v2', health: 'Sana', healthColor: 'text-emerald-400', rate: '92%', rateColor: 'text-emerald-400' },
    { name: 'seguimiento_v3', health: 'Warning', healthColor: 'text-yellow-400', rate: '71%', rateColor: 'text-yellow-400' },
  ];

  useEffect(() => {
    const timers = [
      setTimeout(() => setSelectedIdx(0), 1500),
      setTimeout(() => setSelectedIdx(2), 2500),
      setTimeout(() => setSelectedIdx(1), 3500),
      setTimeout(() => setShowResult(true), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <FolderOpen className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-semibold text-white">Grupo: Seguimiento Inicial</span>
      </div>

      {templates.map((tpl, i) => (
        <motion.div
          key={tpl.name}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.3 }}
          className={`flex items-center justify-between p-2.5 rounded-lg border transition-all duration-300 ${
            selectedIdx === i
              ? i === 1 && showResult
                ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/20'
                : 'border-amber-500/30 bg-amber-500/5'
              : 'border-gray-700 bg-gray-800/40'
          }`}
        >
          <div className="flex items-center gap-2">
            {selectedIdx === i && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-1.5 h-1.5 rounded-full bg-amber-400"
              />
            )}
            <span className="text-xs text-gray-300">{tpl.name}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className={tpl.healthColor}>{tpl.health}</span>
            <span className={tpl.rateColor}>Entrega: {tpl.rate}</span>
          </div>
        </motion.div>
      ))}

      {showResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
        >
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-emerald-300 font-medium">
            Seleccionada: <span className="text-emerald-200">seguimiento_v2</span> (mejor salud + entrega)
          </span>
        </motion.div>
      )}
    </div>
  );
};

/** Demo: preview accordion with 1 expanded and others collapsed */
const PreviewAccordionDemo: React.FC = () => {
  const [expandedIdx, setExpandedIdx] = useState(0);

  const templates = [
    { name: 'seguimiento_inicial_v1', body: 'Hola {{1}} le saludamos de Vidanta. Tenemos informacion actualizada sobre el paquete que solicito. Nos encantaria compartirle los detalles.' },
    { name: 'seguimiento_inicial_v2', body: 'Buenos dias {{1}}, le contactamos de Vida Vacations con novedades sobre su solicitud.' },
    { name: 'seguimiento_inicial_v3', body: 'Hola {{1}}, esperamos que se encuentre bien. Queremos darle seguimiento a su interes.' },
  ];

  return (
    <div className="space-y-1">
      {templates.map((tpl, i) => {
        const isExp = i === expandedIdx;
        return (
          <motion.div
            key={tpl.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.4 }}
            className="rounded-lg border border-gray-700 overflow-hidden"
          >
            <button
              onClick={() => setExpandedIdx(i)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                isExp ? 'bg-emerald-900/20' : 'bg-gray-800/60 hover:bg-gray-800'
              }`}
            >
              <span className={`text-[11px] font-medium flex-1 truncate ${isExp ? 'text-emerald-300' : 'text-gray-400'}`}>
                {tpl.name}
              </span>
              <motion.span
                animate={{ rotate: isExp ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-gray-500"
              >
                <ChevronRight className="w-3 h-3 rotate-90" />
              </motion.span>
            </button>
            <AnimatePresence>
              {isExp && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 py-2 bg-gradient-to-br from-emerald-900/10 to-green-900/10 border-t border-gray-700/50">
                    <p className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-wrap">{tpl.body}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};

export default TemplateGroupsTutorial;
