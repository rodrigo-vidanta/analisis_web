/**
 * ============================================
 * TUTORIAL INTERACTIVO: GRUPOS DE PLANTILLAS
 * ============================================
 *
 * Tutorial de 6 pasos sobre el sistema de envio
 * por grupos inteligentes. SIN auto-avance: el usuario
 * controla la navegacion manualmente.
 *
 * v2: Rediseño enfocado en aclarar que el usuario
 * elige GRUPO (no plantilla individual) y el sistema
 * decide cual plantilla enviar.
 */

import React, { useState, useCallback } from 'react';
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
  AlertTriangle,
  XCircle,
  Users,
  Ban,
} from 'lucide-react';

interface TemplateGroupsTutorialProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 6;

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

  const goToStep = useCallback((s: number) => {
    setStep(s);
  }, []);

  const stepLabels = [
    'Cambio importante: ya no eliges plantilla individual',
    'Por que se hizo este cambio',
    'Tu eliges el GRUPO, el sistema elige la plantilla',
    'Grupos disponibles por tipo de prospecto',
    'Rating con estrellas: calidad al instante',
    'Resumen: lo que debes recordar',
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
              Paso {step + 1} de {TOTAL_STEPS} — Avanza manualmente
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

            {/* Step 0: Cambio importante - Ya no eliges plantilla individual */}
            {step === 0 && (
              <motion.div
                key="cambio"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-4"
              >
                {/* Alert callout */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/40"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span className="text-sm font-bold text-amber-300">Atencion: cambio en el envio de plantillas</span>
                  </div>
                  <p className="text-sm text-gray-200 leading-relaxed">
                    El envio de una <span className="font-bold text-white">plantilla individual ya no es posible</span>.
                    Ahora eliges un <span className="font-bold text-amber-300">grupo</span> (categoria) y el sistema
                    determina automaticamente cual plantilla enviar.
                  </p>
                </motion.div>

                {/* Before / After */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="p-3 rounded-xl bg-red-500/5 border border-red-500/20"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide">Ya no funciona asi</p>
                    </div>
                    <div className="space-y-1.5">
                      {['plantilla_seguimiento_1', 'plantilla_seguimiento_2'].map((name, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-800/80 rounded text-[10px] text-gray-400 line-through opacity-60">
                          <Send className="w-2.5 h-2.5" />
                          {name}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-red-400/70 mt-2 italic">Elegir manualmente una plantilla</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                    className="p-3 rounded-xl bg-emerald-500/5 border-2 border-emerald-500/30"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Asi funciona ahora</p>
                    </div>
                    <div className="px-2 py-2 bg-gray-800/80 rounded space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-medium">
                        <FolderOpen className="w-3 h-3" />
                        Grupo: Seguimiento
                      </div>
                      <div className="pl-5 space-y-0.5">
                        {['seguimiento_v1', 'seguimiento_v2', 'seguimiento_v3'].map((name, i) => (
                          <div key={i} className="text-[9px] text-gray-500 flex items-center gap-1">
                            {i === 1 && <Zap className="w-2 h-2 text-emerald-400" />}
                            <span className={i === 1 ? 'text-emerald-300' : ''}>{name}</span>
                            {i === 1 && <span className="text-[8px] text-emerald-500 ml-1">auto-seleccionada</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] text-emerald-400/70 mt-2 font-medium">Eliges grupo, sistema elige plantilla</p>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Step 1: Por que se hizo este cambio */}
            {step === 1 && (
              <motion.div
                key="porque"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-4"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm text-gray-300 leading-relaxed"
                >
                  <p className="mb-3">
                    Cuando todos los ejecutivos enviaban la <span className="font-bold text-white">misma plantilla</span> repetidamente,
                    Meta detectaba un patron y <span className="text-red-400 font-semibold">penalizaba la reputacion</span> de esa plantilla.
                  </p>
                  <p>
                    Esto causaba que los mensajes <span className="text-red-400 font-semibold">dejaran de llegar</span> a los prospectos.
                  </p>
                </motion.div>

                {/* Visual: Saturacion de plantilla */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="p-4 rounded-xl bg-red-500/5 border border-red-500/20"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Ban className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-bold text-red-300">Problema: saturacion de plantilla</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { user: 'Ejecutivo A', tpl: 'seguimiento_v1', time: '9:00 AM' },
                      { user: 'Ejecutivo B', tpl: 'seguimiento_v1', time: '9:15 AM' },
                      { user: 'Ejecutivo C', tpl: 'seguimiento_v1', time: '9:30 AM' },
                      { user: 'Ejecutivo D', tpl: 'seguimiento_v1', time: '9:45 AM' },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + i * 0.2 }}
                        className="flex items-center justify-between px-2.5 py-1.5 bg-gray-800/60 rounded-lg text-[10px]"
                      >
                        <span className="text-gray-400">{item.user} envio <span className="text-red-300 font-medium">{item.tpl}</span></span>
                        <span className="text-gray-600">{item.time}</span>
                      </motion.div>
                    ))}
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.8 }}
                    className="mt-2 flex items-center gap-1.5 text-[10px] text-red-400"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Meta reduce reputacion → mensajes dejan de llegar
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.2 }}
                  className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs text-emerald-300">
                      <span className="font-bold">Solucion:</span> el sistema rota automaticamente entre plantillas del grupo, evitando saturar una sola.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Step 2: Tu eliges GRUPO, sistema elige plantilla */}
            {step === 2 && (
              <motion.div
                key="como-funciona"
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
                  transition={{ delay: 4 }}
                  className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-300 leading-relaxed">
                      Al enviar, el sistema analiza la <span className="font-semibold">salud</span>, <span className="font-semibold">tasa de entrega</span> y <span className="font-semibold">respuesta</span> de cada plantilla y elige la mejor.
                    </p>
                  </div>
                  <p className="text-xs text-amber-200/70 pl-6">
                    Por eso la plantilla que llega puede ser diferente a la que ves en la vista previa. <span className="font-semibold text-amber-300">Esto es normal y esperado.</span>
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* Step 3: Grupos por tipo de prospecto */}
            {step === 3 && (
              <motion.div
                key="grupos"
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
                  className="text-sm text-gray-300 leading-relaxed"
                >
                  Elige el grupo <span className="font-bold text-white">segun el tipo de prospecto</span>.
                  Cada grupo tiene plantillas optimizadas para esa situacion:
                </motion.p>

                <div className="space-y-2">
                  {[
                    { icon: <Users className="w-4 h-4 text-blue-400" />, name: 'Primer Contacto', desc: 'Prospectos nuevos que nunca han recibido un mensaje', color: 'border-blue-500/30 bg-blue-500/5' },
                    { icon: <Send className="w-4 h-4 text-emerald-400" />, name: 'Seguimiento', desc: 'Prospectos con los que ya hubo conversacion previa', color: 'border-emerald-500/30 bg-emerald-500/5' },
                    { icon: <RotateCcw className="w-4 h-4 text-amber-400" />, name: 'Reactivacion', desc: 'Prospectos que dejaron de responder hace tiempo', color: 'border-amber-500/30 bg-amber-500/5' },
                    { icon: <Sparkles className="w-4 h-4 text-purple-400" />, name: 'Contacto en Frio', desc: 'Prospectos sin interaccion previa, primer acercamiento', color: 'border-purple-500/30 bg-purple-500/5' },
                  ].map((group, i) => (
                    <motion.div
                      key={group.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.25 }}
                      className={`flex items-start gap-3 p-3 rounded-xl border ${group.color}`}
                    >
                      <div className="mt-0.5 flex-shrink-0">{group.icon}</div>
                      <div>
                        <p className="text-xs font-semibold text-white">{group.name}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{group.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.8 }}
                  className="p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg"
                >
                  <p className="text-[11px] text-amber-300 text-center font-medium">
                    Elegir el grupo correcto segun tu prospecto mejora la tasa de respuesta
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* Step 4: Star rating */}
            {step === 4 && (
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
                  transition={{ delay: 0.2 }}
                  className="text-sm text-gray-300 leading-relaxed"
                >
                  Cada grupo muestra un <span className="text-amber-400 font-semibold">rating con estrellas</span> para que identifiques su calidad al instante:
                </motion.p>

                {/* Rating formula */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="p-3 rounded-xl bg-gray-800/60 border border-gray-700"
                >
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-300">
                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <Shield className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300 font-medium">Salud</span>
                    </div>
                    <span className="text-gray-500 font-bold">+</span>
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <BarChart3 className="w-3 h-3 text-blue-400" />
                      <span className="text-blue-300 font-medium">Respuesta</span>
                    </div>
                    <span className="text-gray-500 font-bold">=</span>
                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-amber-300 font-medium">Rating</span>
                    </div>
                  </div>
                </motion.div>

                {/* Example groups */}
                <div className="space-y-2">
                  <MockGroupCard
                    name="Seguimiento Inicial"
                    status="Saludable"
                    statusColor="bg-emerald-900/20 text-emerald-400 border-emerald-800"
                    rating={4.2}
                    respRate="31.8%"
                    delivRate="95.2%"
                    delay={0.8}
                    highlight
                  />
                  <MockGroupCard
                    name="Recordatorio Cita"
                    status="Mixto"
                    statusColor="bg-yellow-900/20 text-yellow-400 border-yellow-800"
                    rating={3.1}
                    respRate="18.5%"
                    delivRate="81.5%"
                    delay={1.2}
                  />
                  <MockGroupCard
                    name="Promocion Especial"
                    status="Degradado"
                    statusColor="bg-orange-900/20 text-orange-400 border-orange-800"
                    rating={1.8}
                    respRate="8.2%"
                    delivRate="62.0%"
                    delay={1.6}
                  />
                </div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.5 }}
                  className="text-[11px] text-gray-400 text-center"
                >
                  Los grupos se ordenan automaticamente de mejor a menor rating
                </motion.p>
              </motion.div>
            )}

            {/* Step 5: Resumen - lo que debes recordar */}
            {step === 5 && (
              <motion.div
                key="resumen"
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
                  transition={{ delay: 0.4 }}
                  className="text-lg font-semibold text-white text-center"
                >
                  Lo que debes recordar
                </motion.h4>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="w-full max-w-sm space-y-2.5"
                >
                  {[
                    { icon: <Ban className="w-4 h-4 text-red-400" />, text: 'Ya NO se puede enviar una plantilla individual', highlight: true },
                    { icon: <FolderOpen className="w-4 h-4 text-amber-400" />, text: 'Tu eliges el GRUPO segun el tipo de prospecto', highlight: true },
                    { icon: <Zap className="w-4 h-4 text-emerald-400" />, text: 'El sistema elige automaticamente la mejor plantilla del grupo', highlight: false },
                    { icon: <Shield className="w-4 h-4 text-blue-400" />, text: 'Esto protege la reputacion y asegura que los mensajes lleguen', highlight: false },
                    { icon: <TrendingUp className="w-4 h-4 text-purple-400" />, text: 'Es normal que la plantilla enviada sea diferente a la vista previa', highlight: false },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.3 }}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        item.highlight
                          ? 'bg-amber-500/5 border-amber-500/30'
                          : 'bg-gray-800/60 border-gray-700/50'
                      }`}
                    >
                      <div className="flex-shrink-0">{item.icon}</div>
                      <span className={`text-sm ${item.highlight ? 'text-white font-medium' : 'text-gray-300'}`}>{item.text}</span>
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

  React.useEffect(() => {
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
        <span className="text-[9px] text-gray-500">— El sistema evalua cada plantilla</span>
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

export default TemplateGroupsTutorial;
