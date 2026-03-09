/**
 * ============================================
 * TUTORIAL INTERACTIVO: IMPORTA HASTA 10 PROSPECTOS
 * ============================================
 *
 * Comunicado animado celebrando el aumento del limite
 * de importacion de 5 a 10 URLs simultaneas.
 *
 * Patron: TemplateGroupsTutorial.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Zap,
  Rocket,
  Link,
  Users,
  ArrowRight,
  Shield,
  Sparkles,
  TrendingUp,
  Clock,
} from 'lucide-react';

interface Import10UrlsTutorialProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 4;
const AUTO_ADVANCE_MS = 10000;

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
          className="text-blue-400"
        >
          |
        </motion.span>
      )}
    </>
  );
};

/** Animated counter from start to end */
const AnimatedCounter: React.FC<{ from: number; to: number; delay?: number; duration?: number }> = ({
  from,
  to,
  delay = 0,
  duration = 1.5,
}) => {
  const [value, setValue] = useState(from);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    const steps = to - from;
    const stepDuration = (duration * 1000) / steps;
    let current = from;
    const interval = setInterval(() => {
      current++;
      setValue(current);
      if (current >= to) clearInterval(interval);
    }, stepDuration);
    return () => clearInterval(interval);
  }, [started, from, to, duration]);

  return <>{value}</>;
};

/** Mock URL row for visual demo */
const MockUrlRow: React.FC<{
  index: number;
  name: string;
  status: 'waiting' | 'searching' | 'found' | 'denied';
  delay: number;
}> = ({ index, name, status, delay }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.3 }}
    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] transition-all ${
      status === 'found'
        ? 'border-emerald-500/30 bg-emerald-500/5'
        : status === 'searching'
        ? 'border-blue-500/30 bg-blue-500/5'
        : status === 'denied'
        ? 'border-red-500/30 bg-red-500/5'
        : 'border-gray-700 bg-gray-800/40'
    }`}
  >
    <span className="w-4 text-gray-600 font-mono">{index}</span>
    {status === 'searching' ? (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full"
      />
    ) : status === 'found' ? (
      <CheckCircle className="w-3 h-3 text-emerald-400" />
    ) : status === 'denied' ? (
      <Shield className="w-3 h-3 text-red-400" />
    ) : (
      <div className="w-3 h-3 rounded-full border border-gray-600" />
    )}
    <span className={`flex-1 truncate font-mono ${
      status === 'found' ? 'text-emerald-300' : status === 'denied' ? 'text-red-300' : 'text-gray-400'
    }`}>
      {name}
    </span>
    {status === 'found' && (
      <motion.span
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-[9px] text-emerald-400 font-medium"
      >
        Listo
      </motion.span>
    )}
    {status === 'denied' && (
      <motion.span
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-[9px] text-red-400 font-medium"
      >
        Otra coord.
      </motion.span>
    )}
  </motion.div>
);

const Import10UrlsTutorial: React.FC<Import10UrlsTutorialProps> = ({ onComplete }) => {
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
    'Duplicamos tu capacidad de importacion',
    'Busqueda en paralelo: 10 URLs al mismo tiempo',
    'Validacion inteligente por coordinacion',
    'Importa mas, en menos tiempo',
  ];

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="pb-4 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Rocket className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Importa hasta 10 Prospectos</h3>
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
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
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

            {/* Step 0: Big reveal - 5 to 10 */}
            {step === 0 && (
              <motion.div
                key="reveal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-5"
              >
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <div className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      Nuevo limite de importacion
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
                    text="Ahora puedes importar el doble de prospectos en una sola operacion. Pega hasta 10 URLs de Dynamics CRM y el sistema las procesa todas en paralelo."
                    delay={0.6}
                    speed={20}
                  />
                </motion.p>

                {/* Big counter animation */}
                <div className="flex items-center justify-center py-4">
                  <div className="flex items-center gap-6">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 4, type: 'spring', stiffness: 200 }}
                      className="text-center"
                    >
                      <div className="text-5xl font-bold text-gray-600 line-through decoration-red-500/50">5</div>
                      <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Antes</p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 5, type: 'spring', stiffness: 300 }}
                    >
                      <ArrowRight className="w-8 h-8 text-blue-500" />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 5.5, type: 'spring', stiffness: 200 }}
                      className="text-center"
                    >
                      <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400">
                        <AnimatedCounter from={5} to={10} delay={6} duration={1} />
                      </div>
                      <p className="text-[10px] text-blue-400 mt-1 uppercase tracking-wider font-semibold">Ahora</p>
                    </motion.div>
                  </div>
                </div>

                {/* Subtle badge */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 7.5 }}
                  className="flex justify-center"
                >
                  <div className="px-4 py-2 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/20 rounded-full">
                    <span className="text-xs text-blue-300 font-medium flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-blue-400" />
                      2x mas prospectos por importacion
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Step 1: Parallel search demo */}
            {step === 1 && (
              <motion.div
                key="parallel"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-3"
              >
                <ParallelSearchDemo />
              </motion.div>
            )}

            {/* Step 2: Smart validation */}
            {step === 2 && (
              <motion.div
                key="validation"
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
                  El sistema valida <span className="text-blue-400 font-semibold">automaticamente</span> que cada prospecto pertenezca a tu coordinacion:
                </motion.p>

                <ValidationDemo />

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 6 }}
                  className="flex items-start gap-2 px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded-lg"
                >
                  <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-300 leading-relaxed">
                    Los prospectos de <span className="font-semibold">otra coordinacion</span> se marcan automaticamente y no se importan. Los de <span className="font-semibold">tu coordinacion</span> avanzan sin problema.
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* Step 3: Benefits + CTA */}
            {step === 3 && (
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
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-blue-500/30 flex items-center justify-center"
                >
                  <Rocket className="w-8 h-8 text-blue-400" />
                </motion.div>

                <motion.h4
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-lg font-semibold text-white text-center"
                >
                  Importa mas, en menos tiempo
                </motion.h4>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="w-full max-w-sm space-y-2.5"
                >
                  {[
                    { icon: <TrendingUp className="w-4 h-4 text-emerald-400" />, text: 'Hasta 10 URLs de Dynamics CRM en una sola operacion' },
                    { icon: <Zap className="w-4 h-4 text-blue-400" />, text: 'Busqueda en paralelo: todas las URLs se procesan al mismo tiempo' },
                    { icon: <Shield className="w-4 h-4 text-purple-400" />, text: 'Validacion automatica de coordinacion para cada prospecto' },
                    { icon: <Clock className="w-4 h-4 text-amber-400" />, text: 'Mismo tiempo de espera: ~3 segundos sin importar cuantas URLs' },
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
                  className="px-3 py-1.5 bg-blue-500/5 border border-blue-500/20 rounded-lg"
                >
                  <span className="text-[11px] text-blue-400/70">
                    Disponible ahora en WhatsApp y Prospectos
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
                  ? 'w-6 h-2 bg-blue-500'
                  : i < step
                  ? 'w-2 h-2 bg-blue-500/50 hover:bg-blue-500/70'
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
                : 'bg-blue-600 hover:bg-blue-700'
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

/** Demo: 10 URLs being searched in parallel */
const ParallelSearchDemo: React.FC = () => {
  const [statuses, setStatuses] = useState<Array<'waiting' | 'searching' | 'found'>>([
    'waiting', 'waiting', 'waiting', 'waiting', 'waiting',
    'waiting', 'waiting', 'waiting', 'waiting', 'waiting',
  ]);

  const names = [
    'Ana Maria Martinez',
    'Carlos Lopez Hernandez',
    'Maria Fernanda Ruiz',
    'Jorge Alberto Diaz',
    'Patricia Moreno Cruz',
    'Roberto Sanchez Luna',
    'Laura Garcia Mendez',
    'Fernando Torres Vega',
    'Gabriela Flores Reyes',
    'Miguel Angel Ramirez',
  ];

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // All start searching at once (parallel)
    timers.push(setTimeout(() => {
      setStatuses(prev => prev.map(() => 'searching'));
    }, 800));

    // Results come back staggered
    const completionOrder = [2, 0, 5, 7, 3, 1, 9, 4, 8, 6];
    completionOrder.forEach((idx, i) => {
      timers.push(setTimeout(() => {
        setStatuses(prev => {
          const next = [...prev];
          next[idx] = 'found';
          return next;
        });
      }, 2000 + i * 400));
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  const foundCount = statuses.filter(s => s === 'found').length;
  const searchingCount = statuses.filter(s => s === 'searching').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-white">10 URLs pegadas</span>
        </div>
        <motion.div
          key={`${foundCount}-${searchingCount}`}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="text-[10px] text-gray-400"
        >
          {foundCount === 10 ? (
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> 10/10 encontrados
            </span>
          ) : searchingCount > 0 ? (
            <span className="text-blue-400">Buscando {searchingCount} en paralelo...</span>
          ) : null}
        </motion.div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {names.map((name, i) => (
          <MockUrlRow
            key={i}
            index={i + 1}
            name={name}
            status={statuses[i]}
            delay={0.1 + i * 0.08}
          />
        ))}
      </div>

      {foundCount === 10 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
        >
          <Zap className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-emerald-300 font-medium">
            10 prospectos listos en ~3 segundos
          </span>
        </motion.div>
      )}
    </div>
  );
};

/** Demo: validation showing some denied by coordination */
const ValidationDemo: React.FC = () => {
  const [phase, setPhase] = useState<'initial' | 'validating' | 'done'>('initial');

  const prospects = [
    { name: 'Ana Maria Martinez', coord: 'APEX', status: 'valid' as const },
    { name: 'Carlos Lopez', coord: 'APEX', status: 'valid' as const },
    { name: 'Maria Fernanda Ruiz', coord: 'VEN', status: 'denied' as const },
    { name: 'Jorge Alberto Diaz', coord: 'APEX', status: 'valid' as const },
    { name: 'Patricia Moreno', coord: 'BOOM', status: 'denied' as const },
    { name: 'Roberto Sanchez', coord: 'APEX', status: 'valid' as const },
  ];

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('validating'), 800);
    const t2 = setTimeout(() => setPhase('done'), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const validCount = prospects.filter(p => p.status === 'valid').length;
  const deniedCount = prospects.filter(p => p.status === 'denied').length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-white">Tu coordinacion: APEX</span>
        </div>
        {phase === 'done' && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] text-emerald-400 font-medium"
          >
            {validCount} importables, {deniedCount} de otra coord.
          </motion.span>
        )}
      </div>

      <div className="space-y-1.5">
        {prospects.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.15 }}
            className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-500 ${
              phase === 'done'
                ? p.status === 'valid'
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-red-500/30 bg-red-500/5 opacity-60'
                : 'border-gray-700 bg-gray-800/40'
            }`}
          >
            <div className="flex items-center gap-2">
              {phase === 'done' ? (
                p.status === 'valid' ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 3.5 + i * 0.1, type: 'spring' }}>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  </motion.div>
                ) : (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 3.5 + i * 0.1, type: 'spring' }}>
                    <Shield className="w-3.5 h-3.5 text-red-400" />
                  </motion.div>
                )
              ) : phase === 'validating' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-3.5 h-3.5 border border-blue-400 border-t-transparent rounded-full"
                />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-gray-600" />
              )}
              <span className={`text-xs ${phase === 'done' && p.status === 'denied' ? 'text-gray-500' : 'text-gray-300'}`}>
                {p.name}
              </span>
            </div>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              phase === 'done'
                ? p.status === 'valid'
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-red-400 bg-red-500/10'
                : 'text-gray-500 bg-gray-800'
            }`}>
              {p.coord}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Import10UrlsTutorial;
