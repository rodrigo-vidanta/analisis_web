/**
 * ============================================
 * TUTORIAL INTERACTIVO: NOTAS INTERNAS (ADMIN)
 * ============================================
 *
 * Tutorial animado de 4 pasos sobre como usar
 * notas internas en conversaciones WhatsApp.
 * Dirigido a: admin, coordinadores, supervisores, calidad.
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
  Send,
  AlertTriangle,
  Eye,
  EyeOff,
  MousePointerClick,
  Type,
  Timer,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';

interface NotasInternasAdminTutorialProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 4;
const AUTO_ADVANCE_MS = 8000;

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

/** Animated note bubble mockup */
const NoteBubbleMockup: React.FC<{ role: string; name: string; text: string; delay?: number }> = ({
  role, name, text, delay = 0,
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
    className="flex justify-center"
  >
    <div className="w-full max-w-[280px] px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-amber-500/30">
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <StickyNote className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-bold text-amber-300">{role}:</span>
            <span className="text-[9px] text-amber-400/60">{name}</span>
          </div>
          <p className="text-xs text-gray-200">{text}</p>
        </div>
      </div>
    </div>
  </motion.div>
);

/** Send button mockup */
const SendButtonMockup: React.FC<{ isNoteMode: boolean; animating?: boolean }> = ({ isNoteMode, animating }) => (
  <motion.div
    animate={animating ? { rotateY: [0, 90, 0] } : {}}
    transition={{ duration: 0.5 }}
    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
      isNoteMode
        ? 'bg-gradient-to-r from-amber-500 to-amber-600'
        : 'bg-gradient-to-r from-blue-500 to-blue-600'
    }`}
  >
    {isNoteMode ? (
      <StickyNote className="w-4 h-4 text-white" />
    ) : (
      <Send className="w-4 h-4 text-white" />
    )}
  </motion.div>
);

const NotasInternasAdminTutorial: React.FC<NotasInternasAdminTutorialProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  // Demo states for step 2
  const [demoPhase, setDemoPhase] = useState(0); // 0=normal, 1=click send, 2=note mode, 3=typing, 4=sent

  useEffect(() => {
    if (!autoPlay || step === TOTAL_STEPS - 1) return;
    const timer = setTimeout(() => setStep(p => Math.min(p + 1, TOTAL_STEPS - 1)), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [step, autoPlay]);

  // Demo animation for step 2
  useEffect(() => {
    if (step !== 2) { setDemoPhase(0); return; }
    const timers = [
      setTimeout(() => setDemoPhase(1), 1000),  // click send
      setTimeout(() => setDemoPhase(2), 2000),   // note mode
      setTimeout(() => setDemoPhase(3), 3500),   // typing
      setTimeout(() => setDemoPhase(4), 5500),   // sent
    ];
    return () => timers.forEach(clearTimeout);
  }, [step]);

  const goToStep = useCallback((s: number) => {
    setAutoPlay(false);
    setStep(s);
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto p-6 bg-gray-900 rounded-2xl shadow-2xl border border-gray-800">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <StickyNote className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Notas Internas</h2>
          <p className="text-xs text-gray-400">Comunicate con tu equipo dentro del chat</p>
        </div>
        <div className="ml-auto px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-md">
          <span className="text-[10px] text-amber-400 font-medium">Nueva funcion</span>
        </div>
      </div>

      {/* Content area */}
      <div className="relative min-h-[280px]">
        <div className="overflow-hidden rounded-xl bg-gray-850 border border-gray-800">
          <AnimatePresence mode="wait">
            {/* Step 0: Que son las notas internas */}
            {step === 0 && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-4"
              >
                <div className="text-center mb-3">
                  <p className="text-sm text-gray-300">
                    <TypewriterText text="Deja instrucciones visibles solo para el equipo" speed={30} />
                  </p>
                </div>

                {/* Chat mockup */}
                <div className="space-y-2 bg-gray-800/50 rounded-lg p-3">
                  {/* Customer message */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex justify-start"
                  >
                    <div className="px-3 py-1.5 bg-gray-700 rounded-xl max-w-[200px]">
                      <p className="text-xs text-gray-200">Quiero mas informacion sobre el paquete</p>
                      <p className="text-[9px] text-gray-500 text-right mt-0.5">10:30</p>
                    </div>
                  </motion.div>

                  {/* Note */}
                  <NoteBubbleMockup
                    role="Coordinador"
                    name="Maria Lopez"
                    text="Ofrece el upgrade de suite, ya esta autorizado"
                    delay={1.5}
                  />

                  {/* Agent reply */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 2.5 }}
                    className="flex justify-end"
                  >
                    <div className="px-3 py-1.5 bg-purple-600 rounded-xl max-w-[200px]">
                      <p className="text-xs text-white">Con gusto, tenemos una suite disponible!</p>
                      <p className="text-[9px] text-purple-300 text-right mt-0.5">10:32</p>
                    </div>
                  </motion.div>
                </div>

                {/* Key point */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 3.5 }}
                  className="flex items-start gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-lg"
                >
                  <EyeOff className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-300">
                    El prospecto <span className="font-semibold text-amber-200">nunca vera</span> estas notas. Solo son visibles dentro de la plataforma.
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* Step 1: Quien puede usarlas */}
            {step === 1 && (
              <motion.div
                key="roles"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-3"
              >
                <div className="text-center mb-2">
                  <p className="text-sm font-medium text-white">Quien puede crear notas</p>
                </div>

                {[
                  { role: 'Administrador', icon: ShieldCheck, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
                  { role: 'Coordinador', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
                  { role: 'Supervisor', icon: Eye, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
                  { role: 'Calidad', icon: CheckCircle, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
                ].map((item, i) => (
                  <motion.div
                    key={item.role}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.25 }}
                    className={`flex items-center gap-3 p-3 bg-gray-800 rounded-lg border ${item.bg.split(' ')[1]}`}
                  >
                    <div className={`w-9 h-9 rounded-lg ${item.bg} border flex items-center justify-center flex-shrink-0`}>
                      <item.icon className={`w-4.5 h-4.5 ${item.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{item.role}</p>
                      <p className="text-[10px] text-gray-400">Puede crear y ver notas</p>
                    </div>
                    <StickyNote className="w-4 h-4 text-amber-400/50" />
                  </motion.div>
                ))}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.8 }}
                  className="flex items-start gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700"
                >
                  <Eye className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-400">
                    Los <span className="text-white font-medium">ejecutivos</span> pueden ver las notas pero no crearlas
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* Step 2: Como activar modo nota */}
            {step === 2 && (
              <motion.div
                key="how"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-4"
              >
                <div className="text-center mb-2">
                  <p className="text-sm font-medium text-white">Como crear una nota</p>
                </div>

                {/* Interactive demo */}
                <div className="bg-gray-800/80 rounded-lg p-3 space-y-3">
                  {/* Method 1: Empty send */}
                  <div className="space-y-2">
                    <p className="text-[10px] text-amber-400 font-medium uppercase tracking-wider">Opcion 1: Boton Enviar</p>
                    <div className="flex items-center gap-2">
                      <div className={`flex-1 h-9 rounded-lg border flex items-center px-3 transition-all duration-500 ${
                        demoPhase >= 2 ? 'bg-amber-900/20 border-amber-500/40' : 'bg-gray-700 border-gray-600'
                      }`}>
                        <span className={`text-xs ${demoPhase >= 3 ? 'text-gray-200' : 'text-gray-500'}`}>
                          {demoPhase >= 3 ? (
                            <TypewriterText text="Revisa el correo del cliente" delay={0} speed={40} />
                          ) : demoPhase >= 2 ? (
                            'Escribe una nota interna...'
                          ) : (
                            'Escribe un mensaje...'
                          )}
                        </span>
                      </div>

                      <SendButtonMockup isNoteMode={demoPhase >= 2} animating={demoPhase === 1} />

                      {demoPhase >= 2 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-7 h-7 rounded-lg bg-gray-700 flex items-center justify-center"
                        >
                          <X className="w-3.5 h-3.5 text-gray-400" />
                        </motion.div>
                      )}
                    </div>

                    {/* Step indicators */}
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ opacity: demoPhase === 0 ? [0.5, 1, 0.5] : 0.3 }}
                        transition={{ duration: 1.5, repeat: demoPhase === 0 ? Infinity : 0 }}
                        className="flex items-center gap-1"
                      >
                        <MousePointerClick className={`w-3 h-3 ${demoPhase === 0 ? 'text-amber-400' : 'text-gray-600'}`} />
                        <span className={`text-[10px] ${demoPhase === 0 ? 'text-amber-300' : 'text-gray-600'}`}>Sin texto</span>
                      </motion.div>
                      <motion.span className="text-gray-600 text-[10px]">→</motion.span>
                      <motion.div
                        animate={{ opacity: demoPhase >= 2 && demoPhase < 3 ? [0.5, 1, 0.5] : demoPhase >= 3 ? 1 : 0.3 }}
                        transition={{ duration: 1.5, repeat: demoPhase >= 2 && demoPhase < 3 ? Infinity : 0 }}
                        className="flex items-center gap-1"
                      >
                        <Type className={`w-3 h-3 ${demoPhase >= 2 ? 'text-amber-400' : 'text-gray-600'}`} />
                        <span className={`text-[10px] ${demoPhase >= 2 ? 'text-amber-300' : 'text-gray-600'}`}>Modo nota</span>
                      </motion.div>
                      <motion.span className="text-gray-600 text-[10px]">→</motion.span>
                      <motion.div
                        animate={{ opacity: demoPhase >= 4 ? 1 : 0.3 }}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className={`w-3 h-3 ${demoPhase >= 4 ? 'text-emerald-400' : 'text-gray-600'}`} />
                        <span className={`text-[10px] ${demoPhase >= 4 ? 'text-emerald-300' : 'text-gray-600'}`}>Enviada</span>
                      </motion.div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-700" />

                  {/* Method 2: Nota button */}
                  <div className="space-y-2">
                    <p className="text-[10px] text-amber-400 font-medium uppercase tracking-wider">Opcion 2: Boton Nota</p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-100/10 border border-amber-500/30 rounded-lg">
                        <StickyNote className="w-3 h-3 text-amber-400" />
                        <span className="text-[11px] text-amber-300 font-medium">Nota</span>
                      </div>
                      <span className="text-[10px] text-gray-500">en la barra de respuestas rapidas</span>
                    </div>
                  </div>
                </div>

                {/* Cooldown note */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                  className="flex items-start gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-lg"
                >
                  <Timer className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-300">
                    Si activas modo nota sin escribir, volvera a modo mensaje en <span className="font-semibold text-amber-200">17 segundos</span>
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* Step 3: Advertencias */}
            {step === 3 && (
              <motion.div
                key="warnings"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-3"
              >
                <div className="text-center mb-2">
                  <p className="text-sm font-medium text-white">Recuerda</p>
                </div>

                {[
                  {
                    icon: EyeOff,
                    title: 'Invisibles para el prospecto',
                    desc: 'Las notas NUNCA se envian por WhatsApp. Solo se ven en la plataforma.',
                    color: 'text-emerald-400',
                    bg: 'bg-emerald-500/10 border-emerald-500/30',
                  },
                  {
                    icon: Users,
                    title: 'Visibles para todo el equipo',
                    desc: 'Todos los que acceden a la conversacion (incluyendo ejecutivos) veran tus notas.',
                    color: 'text-blue-400',
                    bg: 'bg-blue-500/10 border-blue-500/30',
                  },
                  {
                    icon: AlertTriangle,
                    title: 'Contenido profesional',
                    desc: 'Las notas quedan registradas permanentemente. Usa un tono profesional y constructivo.',
                    color: 'text-amber-400',
                    bg: 'bg-amber-500/10 border-amber-500/30',
                  },
                  {
                    icon: StickyNote,
                    title: 'Usa notas para coordinar',
                    desc: 'Instrucciones, autorizaciones, recordatorios o feedback para el ejecutivo.',
                    color: 'text-purple-400',
                    bg: 'bg-purple-500/10 border-purple-500/30',
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.3 }}
                    className={`flex items-start gap-3 p-3 bg-gray-800 rounded-lg border ${item.bg.split(' ')[1]}`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${item.bg} border flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
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

export default NotasInternasAdminTutorial;
