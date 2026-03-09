/**
 * ============================================
 * TUTORIAL INTERACTIVO: REASIGNACIÓN MASIVA (SUPERVISORES)
 * ============================================
 *
 * Tutorial animado de 6 pasos que explica a supervisores
 * cómo usar la reasignación masiva de prospectos,
 * restricciones y limitaciones.
 *
 * Target: solo supervisores (target_type: 'roles', target_ids: ['supervisor'])
 * Patron: UtilityTemplateTutorial.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  ArrowRightLeft,
  Pause,
  Play,
  UserCheck,
  UserX,
  Lock,
  Database,
  BarChart3,
} from 'lucide-react';

interface BulkReassignmentSupervisorTutorialProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 6;
const AUTO_ADVANCE_MS = 7000;

/** Cursor animado que se mueve a una posición */
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
    }, 25);
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

/** Counter animado */
const AnimatedCounter: React.FC<{ target: number; delay?: number; suffix?: string }> = ({
  target,
  delay = 0,
  suffix = '',
}) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started || count >= target) return;
    const step = Math.max(1, Math.floor(target / 20));
    const timer = setTimeout(() => setCount(c => Math.min(c + step, target)), 80);
    return () => clearTimeout(timer);
  }, [started, count, target]);

  return (
    <span>
      {count}
      {suffix}
    </span>
  );
};

/** Barra de progreso animada */
const ProgressBar: React.FC<{ progress: number; delay?: number }> = ({ progress, delay = 0 }) => (
  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
    <motion.div
      initial={{ width: '0%' }}
      animate={{ width: `${progress}%` }}
      transition={{ delay, duration: 2, ease: 'easeOut' }}
      className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
    />
  </div>
);

const BulkReassignmentSupervisorTutorial: React.FC<BulkReassignmentSupervisorTutorialProps> = ({
  onComplete,
}) => {
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
    'Accede a la Reasignación Masiva',
    'Busca prospectos con los filtros',
    'Selecciona solo prospectos registrados en CRM',
    'Elige el destino de reasignación',
    'Ejecuta y controla el proceso',
    'Recuerda estas limitaciones',
  ];

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="pb-4 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <ArrowRightLeft className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Reasignación Masiva para Supervisores
            </h3>
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
            {/* ═══ PASO 1: Cómo acceder ═══ */}
            {step === 0 && (
              <motion.div
                key="acceso"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-4"
              >
                {/* Navigation breadcrumb mockup */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="text-gray-500">Inicio</span>
                  <ChevronRight className="w-3 h-3 text-gray-600" />
                  <span className="text-gray-400">Prospectos</span>
                  <ChevronRight className="w-3 h-3 text-gray-600" />
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-blue-400 font-medium"
                  >
                    Reasignación Masiva
                  </motion.span>
                </motion.div>

                {/* Tab mockup */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
                >
                  <div className="flex border-b border-gray-700">
                    {['Búsqueda', 'Reasignación Masiva'].map((tab, i) => (
                      <motion.div
                        key={tab}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 + i * 0.2 }}
                        className={`px-4 py-2.5 text-xs font-medium ${
                          i === 1
                            ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5'
                            : 'text-gray-500'
                        }`}
                      >
                        {tab}
                      </motion.div>
                    ))}
                  </div>

                  {/* Modo supervisor badge */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.2, type: 'spring' }}
                    className="p-3 flex items-center gap-3"
                  >
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <Shield className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs font-medium text-blue-300">Modo Supervisor</span>
                    </div>
                    <span className="text-[10px] text-gray-500">
                      Solo puedes reasignar dentro de tu coordinación
                    </span>
                  </motion.div>
                </motion.div>

                {/* Info tip */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                  className="flex items-start gap-2 px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded-lg"
                >
                  <Users className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-300">
                    <TypewriterText
                      text="Como supervisor, tienes acceso a reasignar prospectos masivamente dentro de tu equipo de trabajo."
                      delay={2.3}
                    />
                  </p>
                </motion.div>

                <AnimatedCursor x={230} y={65} clicking delay={0.8} />
              </motion.div>
            )}

            {/* ═══ PASO 2: Búsqueda y filtros ═══ */}
            {step === 1 && (
              <motion.div
                key="busqueda"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-4"
              >
                {/* Coordinación locked */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Coordinación fija</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Se configura automáticamente a tu coordinación. No se puede cambiar.
                    </p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, type: 'spring' }}
                    className="px-2.5 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-gray-300 font-mono"
                  >
                    APEX
                  </motion.div>
                </motion.div>

                {/* Search filters mockup */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="space-y-2"
                >
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Filtros disponibles
                  </p>

                  {/* Search bar mockup */}
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-800 rounded-lg border border-gray-700">
                    <Search className="w-4 h-4 text-gray-500" />
                    <motion.span className="text-sm text-gray-400">
                      <TypewriterText text="Buscar por nombre o teléfono..." delay={1} />
                    </motion.span>
                  </div>

                  {/* Filter chips */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Etapa', example: 'En seguimiento' },
                      { label: 'Ejecutivo', example: 'Juan Pérez' },
                      { label: 'Nombre', example: 'María...' },
                    ].map((filter, i) => (
                      <motion.div
                        key={filter.label}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1.5 + i * 0.2 }}
                        className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg"
                      >
                        <span className="text-[10px] text-gray-500">{filter.label}: </span>
                        <span className="text-xs text-gray-300">{filter.example}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Results hint */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.5 }}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <p className="text-xs text-emerald-300">
                    Los resultados solo muestran prospectos de tu coordinación
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* ═══ PASO 3: Selección de prospectos ═══ */}
            {step === 2 && (
              <motion.div
                key="seleccion"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-4"
              >
                {/* Prospect cards mockup */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2"
                >
                  {/* Selectable prospect */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-emerald-500/30 cursor-pointer"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1, type: 'spring' }}
                      className="w-5 h-5 rounded border-2 border-emerald-500 bg-emerald-500 flex items-center justify-center flex-shrink-0"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    </motion.div>
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">María García López</p>
                      <p className="text-xs text-gray-400">+52 322 123 4567</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Database className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400 font-medium">CRM</span>
                    </div>
                  </motion.div>

                  {/* Selectable prospect 2 */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-emerald-500/30 cursor-pointer"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.3, type: 'spring' }}
                      className="w-5 h-5 rounded border-2 border-emerald-500 bg-emerald-500 flex items-center justify-center flex-shrink-0"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    </motion.div>
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">Carlos Hernández R.</p>
                      <p className="text-xs text-gray-400">+52 322 987 6543</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Database className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400 font-medium">CRM</span>
                    </div>
                  </motion.div>

                  {/* NON-selectable prospect (no CRM) */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700 opacity-60"
                  >
                    <div className="w-5 h-5 rounded border-2 border-gray-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-400 font-medium">Roberto Sánchez P.</p>
                      <p className="text-xs text-gray-500">+52 322 555 1234</p>
                    </div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.5, type: 'spring' }}
                      className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-[10px] text-amber-400 font-medium whitespace-nowrap"
                    >
                      No registrado en CRM
                    </motion.div>
                  </motion.div>
                </motion.div>

                {/* Max 100 warning */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2 }}
                  className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-200">Máximo 100 prospectos</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Puedes seleccionar hasta 100 prospectos por operación
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-amber-400">
                    <AnimatedCounter target={100} delay={2.3} />
                  </span>
                </motion.div>

                <AnimatedCursor x={20} y={55} clicking delay={0.8} />
              </motion.div>
            )}

            {/* ═══ PASO 4: Destino de reasignación ═══ */}
            {step === 3 && (
              <motion.div
                key="destino"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-3"
              >
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  Puedes reasignar a:
                </motion.p>

                {/* Allowed: Ejecutivos */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-emerald-500/30"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                    <UserCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Ejecutivos de tu coordinación</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Todos los ejecutivos activos de tu equipo
                    </p>
                  </div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8, type: 'spring' }}
                    className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded text-xs text-emerald-400 font-medium"
                  >
                    Permitido
                  </motion.div>
                </motion.div>

                {/* Allowed: Supervisores */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-emerald-500/30"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Supervisores (incluido tú)</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Puedes auto-asignarte o reasignar a otro supervisor
                    </p>
                  </div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.2, type: 'spring' }}
                    className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded text-xs text-emerald-400 font-medium"
                  >
                    Permitido
                  </motion.div>
                </motion.div>

                {/* Blocked: Coordinadores */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                  className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-red-500/30"
                >
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                    <UserX className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Coordinadores</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      No puedes reasignar prospectos a coordinadores
                    </p>
                  </div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.6, type: 'spring' }}
                    className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-400 font-medium"
                  >
                    Bloqueado
                  </motion.div>
                </motion.div>

                {/* Blocked: Otras coordinaciones */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-red-500/30"
                >
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Otras coordinaciones</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Solo puedes reasignar dentro de tu propia coordinación
                    </p>
                  </div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 2, type: 'spring' }}
                    className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-400 font-medium"
                  >
                    Bloqueado
                  </motion.div>
                </motion.div>
              </motion.div>
            )}

            {/* ═══ PASO 5: Ejecución ═══ */}
            {step === 4 && (
              <motion.div
                key="ejecucion"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="p-5 space-y-4"
              >
                {/* Progress mockup */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">Reasignando prospectos...</span>
                    <span className="text-xs text-emerald-400 font-mono">
                      <AnimatedCounter target={47} delay={0.5} />
                      /50
                    </span>
                  </div>
                  <ProgressBar progress={94} delay={0.5} />
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Procesando en paralelo (10 simultáneos)</span>
                  </div>
                </motion.div>

                {/* Control buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="space-y-2"
                >
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Controles disponibles
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.3, type: 'spring' }}
                      className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-center"
                    >
                      <Pause className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                      <p className="text-xs font-medium text-amber-300">Pausar</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Detener temporalmente</p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.5, type: 'spring' }}
                      className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-center"
                    >
                      <Play className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                      <p className="text-xs font-medium text-emerald-300">Reanudar</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Continuar proceso</p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.7, type: 'spring' }}
                      className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-center"
                    >
                      <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
                      <p className="text-xs font-medium text-red-300">Cancelar</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Detener todo</p>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Result summary mockup */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.5 }}
                  className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg"
                >
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-300">Resultado al finalizar</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Verás un resumen con exitosos, fallidos y errores detallados
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ═══ PASO 6: Limitaciones ═══ */}
            {step === 5 && (
              <motion.div
                key="limitaciones"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="p-5 flex flex-col items-center justify-center min-h-[320px] space-y-4"
              >
                {/* Warning icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center"
                >
                  <AlertTriangle className="w-7 h-7 text-amber-400" />
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm font-semibold text-amber-200"
                >
                  Recuerda estas reglas
                </motion.p>

                {/* Rules list */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="w-full max-w-md space-y-2"
                >
                  <motion.div
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex items-center gap-3 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg"
                  >
                    <Database className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="text-xs text-gray-300">Solo prospectos registrados en CRM son seleccionables</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.05 }}
                    className="flex items-center gap-3 p-2.5 bg-blue-500/5 border border-blue-500/20 rounded-lg"
                  >
                    <Lock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="text-xs text-gray-300">Solo puedes reasignar dentro de tu coordinación</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.3 }}
                    className="flex items-center gap-3 p-2.5 bg-red-500/5 border border-red-500/20 rounded-lg"
                  >
                    <UserX className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-xs text-gray-300">Nunca podrás reasignar a un coordinador</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.55 }}
                    className="flex items-center gap-3 p-2.5 bg-purple-500/5 border border-purple-500/20 rounded-lg"
                  >
                    <BarChart3 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span className="text-xs text-gray-300">Máximo 100 prospectos por operación</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.8 }}
                    className="flex items-center gap-3 p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-xs text-gray-300">Verifica siempre el destino antes de ejecutar</span>
                  </motion.div>
                </motion.div>

                {/* Final note */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 2.5 }}
                  className="w-full max-w-md p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-center"
                >
                  <p className="text-sm text-blue-300 font-medium">
                    Si tienes dudas, consulta con tu{' '}
                    <span className="text-blue-400 font-bold">coordinador</span> antes de reasignar
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
                  ? 'w-6 h-2 bg-blue-500'
                  : i < step
                  ? 'w-2 h-2 bg-blue-500/50 hover:bg-blue-500/70'
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

export default BulkReassignmentSupervisorTutorial;
