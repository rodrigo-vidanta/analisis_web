/**
 * ============================================
 * TUTORIAL INTERACTIVO: DELIVERY CHECKS
 * ============================================
 *
 * Tutorial animado de 4 pasos sobre los checks
 * de entrega de mensajes WhatsApp (queued → sent → delivered → read).
 *
 * Patron: UtilityTemplateTutorial.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  Eye,
  Zap,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';

interface DeliveryChecksTutorialProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 4;
const AUTO_ADVANCE_MS = 7000;

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
          className="text-emerald-400"
        >
          |
        </motion.span>
      )}
    </>
  );
};

/** Animated check icon that morphs between delivery states */
const AnimatedDeliveryCheck: React.FC<{
  status: 'queued' | 'sent' | 'delivered' | 'read';
  delay?: number;
  size?: 'sm' | 'lg';
}> = ({ status, delay = 0, size = 'sm' }) => {
  const iconSize = size === 'lg' ? 'w-6 h-6' : 'w-3.5 h-3.5';

  const configs = {
    queued: { icon: <Clock className={iconSize} />, color: 'text-gray-400', label: 'En cola' },
    sent: { icon: <Check className={iconSize} />, color: 'text-gray-400', label: 'Enviado' },
    delivered: { icon: <CheckCheck className={iconSize} />, color: 'text-gray-400', label: 'Recibido' },
    read: { icon: <CheckCheck className={iconSize} />, color: 'text-cyan-400', label: 'Leido' },
  };

  const config = configs[status];

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 20 }}
      className={`inline-flex items-center gap-1 ${config.color}`}
    >
      {config.icon}
      {size === 'sm' && <span className="text-[9px]">{config.label}</span>}
    </motion.span>
  );
};

/** WhatsApp-style message bubble */
const MessageBubble: React.FC<{
  text: string;
  time: string;
  deliveryStatus?: 'queued' | 'sent' | 'delivered' | 'read';
  isOutgoing?: boolean;
  delay?: number;
  typewriter?: boolean;
}> = ({ text, time, deliveryStatus, isOutgoing = true, delay = 0, typewriter = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 15, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className={`max-w-[85%] ${isOutgoing ? 'ml-auto' : 'mr-auto'}`}
  >
    <div
      className={`rounded-xl p-3 shadow-lg ${
        isOutgoing
          ? 'bg-[#005c4b] rounded-tr-sm'
          : 'bg-gray-700 rounded-tl-sm'
      }`}
    >
      <p className="text-sm text-white leading-relaxed">
        {typewriter ? <TypewriterText text={text} delay={delay + 0.3} /> : text}
      </p>
      <div className="flex items-center justify-end gap-1 mt-1">
        <span className="text-[10px] text-white/40">{time}</span>
        {deliveryStatus && isOutgoing && (
          <AnimatedDeliveryCheck status={deliveryStatus} delay={delay + 0.5} />
        )}
      </div>
    </div>
  </motion.div>
);

/** Step: Animated progression from queued to read */
const DeliveryProgressionDemo: React.FC = () => {
  const [currentStatus, setCurrentStatus] = useState<'queued' | 'sent' | 'delivered' | 'read'>('queued');

  useEffect(() => {
    const timers = [
      setTimeout(() => setCurrentStatus('sent'), 1500),
      setTimeout(() => setCurrentStatus('delivered'), 3000),
      setTimeout(() => setCurrentStatus('read'), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const statuses: Array<{ key: 'queued' | 'sent' | 'delivered' | 'read'; label: string; sublabel: string }> = [
    { key: 'queued', label: 'En cola', sublabel: 'Procesando envio' },
    { key: 'sent', label: 'Enviado', sublabel: 'Entregado al servidor' },
    { key: 'delivered', label: 'Recibido', sublabel: 'Llego al telefono' },
    { key: 'read', label: 'Leido', sublabel: 'El prospecto lo abrio' },
  ];

  const statusOrder = ['queued', 'sent', 'delivered', 'read'];
  const currentIndex = statusOrder.indexOf(currentStatus);

  return (
    <div className="space-y-4">
      {/* Message with live status */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <div className="bg-[#005c4b] rounded-xl rounded-tr-sm p-3 shadow-lg max-w-[80%] ml-auto">
          <p className="text-sm text-white">
            Hola Maria, te envio la informacion del paquete que solicitaste.
          </p>
          <div className="flex items-center justify-end gap-1.5 mt-1.5">
            <span className="text-[10px] text-white/40">2:45 PM</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={currentStatus}
                initial={{ opacity: 0, scale: 0.5, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: -5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`inline-flex items-center gap-0.5 ${
                  currentStatus === 'read' ? 'text-cyan-300' : 'text-white/50'
                }`}
              >
                {currentStatus === 'queued' && <Clock className="w-3 h-3" />}
                {currentStatus === 'sent' && <Check className="w-3.5 h-3.5" />}
                {currentStatus === 'delivered' && <CheckCheck className="w-4 h-4" />}
                {currentStatus === 'read' && <CheckCheck className="w-4 h-4" />}
                <span className="text-[9px]">
                  {statuses.find(s => s.key === currentStatus)?.label}
                </span>
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Progress timeline */}
      <div className="flex items-center justify-between px-2">
        {statuses.map((s, i) => (
          <React.Fragment key={s.key}>
            <motion.div
              animate={{
                opacity: i <= currentIndex ? 1 : 0.3,
                scale: i === currentIndex ? 1.05 : 1,
              }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-1"
            >
              <motion.div
                animate={{
                  backgroundColor: i <= currentIndex
                    ? (s.key === 'read' ? 'rgba(34, 211, 238, 0.15)' : 'rgba(139, 92, 246, 0.15)')
                    : 'rgba(55, 65, 81, 0.5)',
                  borderColor: i <= currentIndex
                    ? (s.key === 'read' ? 'rgba(34, 211, 238, 0.4)' : 'rgba(139, 92, 246, 0.4)')
                    : 'rgba(75, 85, 99, 0.5)',
                }}
                className="w-8 h-8 rounded-full border flex items-center justify-center"
              >
                {s.key === 'queued' && <Clock className={`w-3.5 h-3.5 ${i <= currentIndex ? 'text-purple-400' : 'text-gray-600'}`} />}
                {s.key === 'sent' && <Check className={`w-3.5 h-3.5 ${i <= currentIndex ? 'text-purple-400' : 'text-gray-600'}`} />}
                {s.key === 'delivered' && <CheckCheck className={`w-3.5 h-3.5 ${i <= currentIndex ? 'text-purple-400' : 'text-gray-600'}`} />}
                {s.key === 'read' && <CheckCheck className={`w-3.5 h-3.5 ${i <= currentIndex ? 'text-cyan-400' : 'text-gray-600'}`} />}
              </motion.div>
              <span className={`text-[10px] font-medium ${i <= currentIndex ? (s.key === 'read' ? 'text-cyan-400' : 'text-purple-300') : 'text-gray-600'}`}>
                {s.label}
              </span>
            </motion.div>
            {i < statuses.length - 1 && (
              <motion.div
                animate={{
                  backgroundColor: i < currentIndex ? 'rgba(139, 92, 246, 0.4)' : 'rgba(75, 85, 99, 0.3)',
                }}
                className="flex-1 h-0.5 mx-1 rounded-full"
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const DeliveryChecksTutorial: React.FC<DeliveryChecksTutorialProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

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
    'Ahora puedes ver el estado de tus mensajes',
    'Que significa cada check',
    'Mira como cambian en tiempo real',
    'Tu comunicacion, mas transparente',
  ];

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="pb-4 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <CheckCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Checks de Entrega WhatsApp</h3>
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
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-cyan-600 flex items-center justify-center text-white text-xs font-bold">
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
            {/* Step 0: Intro - Before & After */}
            {step === 0 && (
              <motion.div
                key="intro"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-4"
              >
                {/* Feature announcement */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <div className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                    <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                      <Zap className="w-3 h-3" />
                      Nueva funcionalidad
                    </span>
                  </div>
                </motion.div>

                {/* Chat mockup showing checks */}
                <div className="space-y-3 pt-2">
                  <MessageBubble
                    text="Buenos dias Carlos, le comparto la cotizacion del paquete familiar."
                    time="10:30 AM"
                    deliveryStatus="read"
                    delay={0.4}
                  />
                  <MessageBubble
                    text="Hola! Si me interesa, cuando podemos agendar?"
                    time="10:32 AM"
                    isOutgoing={false}
                    delay={1.2}
                  />
                  <MessageBubble
                    text="Con gusto! Le envio las fechas disponibles."
                    time="10:33 AM"
                    deliveryStatus="delivered"
                    delay={2}
                  />
                </div>

                {/* Callout */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 3 }}
                  className="flex items-start gap-2 px-3 py-2 bg-cyan-500/5 border border-cyan-500/20 rounded-lg"
                >
                  <Eye className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-cyan-300">
                    Ahora cada mensaje muestra si fue <span className="font-semibold">enviado</span>,{' '}
                    <span className="font-semibold">recibido</span> o{' '}
                    <span className="font-semibold text-cyan-200">leido</span> por el prospecto.
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* Step 1: What each check means */}
            {step === 1 && (
              <motion.div
                key="checks"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-3"
              >
                {[
                  {
                    status: 'queued' as const,
                    icon: <Clock className="w-5 h-5 text-gray-400" />,
                    title: 'En cola',
                    desc: 'Tu mensaje esta siendo procesado para enviarse',
                    color: 'border-gray-600',
                    iconBg: 'bg-gray-500/10 border-gray-500/30',
                    badge: null,
                  },
                  {
                    status: 'sent' as const,
                    icon: <Check className="w-5 h-5 text-gray-400" />,
                    title: 'Enviado',
                    desc: 'El mensaje salio del servidor exitosamente',
                    color: 'border-gray-600',
                    iconBg: 'bg-gray-500/10 border-gray-500/30',
                    badge: <span className="text-[10px] text-gray-500">1 check gris</span>,
                  },
                  {
                    status: 'delivered' as const,
                    icon: <CheckCheck className="w-5 h-5 text-gray-400" />,
                    title: 'Recibido',
                    desc: 'Llego al telefono del prospecto',
                    color: 'border-gray-600',
                    iconBg: 'bg-gray-500/10 border-gray-500/30',
                    badge: <span className="text-[10px] text-gray-500">2 checks grises</span>,
                  },
                  {
                    status: 'read' as const,
                    icon: <CheckCheck className="w-5 h-5 text-cyan-400" />,
                    title: 'Leido',
                    desc: 'El prospecto abrio y leyo tu mensaje',
                    color: 'border-cyan-500/30',
                    iconBg: 'bg-cyan-500/10 border-cyan-500/30',
                    badge: (
                      <span className="text-[10px] text-cyan-400 font-medium flex items-center gap-0.5">
                        2 checks azules
                        <motion.span
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400"
                        />
                      </span>
                    ),
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.status}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.3 }}
                    className={`flex items-center gap-3 p-3 bg-gray-800 rounded-lg border ${item.color}`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${item.iconBg} border flex items-center justify-center flex-shrink-0`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        {item.badge}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                    {i < 3 && (
                      <ArrowRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Step 2: Real-time progression */}
            {step === 2 && (
              <motion.div
                key="realtime"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5"
              >
                <DeliveryProgressionDemo />

                {/* Info note */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 5 }}
                  className="mt-4 flex items-start gap-2 px-3 py-2 bg-purple-500/5 border border-purple-500/20 rounded-lg"
                >
                  <Zap className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-purple-300">
                    Los checks se actualizan <span className="font-semibold">automaticamente</span> en
                    tiempo real. No necesitas refrescar la pagina.
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* Step 3: Summary / Call to action */}
            {step === 3 && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="p-5 flex flex-col items-center justify-center min-h-[300px] space-y-5"
              >
                {/* Success icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center"
                >
                  <CheckCheck className="w-8 h-8 text-cyan-400" />
                </motion.div>

                <motion.h4
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-lg font-semibold text-white text-center"
                >
                  Tu comunicacion, mas transparente
                </motion.h4>

                {/* Benefits */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="w-full max-w-sm space-y-2.5"
                >
                  {[
                    { icon: <Eye className="w-4 h-4 text-emerald-400" />, text: 'Saber si el prospecto leyo tu mensaje' },
                    { icon: <MessageSquare className="w-4 h-4 text-blue-400" />, text: 'Decidir cuando dar seguimiento' },
                    { icon: <AlertTriangle className="w-4 h-4 text-amber-400" />, text: 'Detectar mensajes no entregados' },
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

                {/* Twilio badge */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                  className="px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg"
                >
                  <span className="text-[11px] text-emerald-400/70">
                    Disponible para prospectos con proveedor Twilio
                  </span>
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
                  ? 'w-6 h-2 bg-cyan-500'
                  : i < step
                  ? 'w-2 h-2 bg-cyan-500/50 hover:bg-cyan-500/70'
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
                : 'bg-cyan-600 hover:bg-cyan-700'
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

export default DeliveryChecksTutorial;
