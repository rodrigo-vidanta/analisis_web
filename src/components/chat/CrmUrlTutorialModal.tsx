/**
 * ============================================
 * TUTORIAL ANIMADO: CÓMO COPIAR URL DEL CRM
 * ============================================
 * 
 * Modal con animación paso-a-paso que simula un navegador
 * mostrando cómo obtener la URL de un lead en Dynamics CRM.
 * 
 * Pasos:
 * 1. Buscar el lead en el CRM
 * 2. Hacer clic en el lead
 * 3. Copiar URL de la barra de direcciones
 * 4. Pegar en el wizard
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Globe, Copy, Check, Mouse, ArrowRight } from 'lucide-react';

interface CrmUrlTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOTAL_STEPS = 4;
const AUTO_ADVANCE_MS = 4000;

/** Cursor animado que se mueve a una posición */
const AnimatedCursor: React.FC<{ x: number; y: number; clicking?: boolean; delay?: number }> = ({ x, y, clicking, delay = 0 }) => (
  <motion.div
    className="absolute z-50 pointer-events-none"
    initial={{ x: x - 30, y: y - 30, opacity: 0 }}
    animate={{ x, y, opacity: 1 }}
    transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {/* Cursor SVG */}
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="drop-shadow-lg">
      <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="#1e293b" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
    {/* Click ripple */}
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

export const CrmUrlTutorialModal: React.FC<CrmUrlTutorialModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  // Auto-advance steps
  useEffect(() => {
    if (!isOpen || !autoPlay) return;
    const timer = setTimeout(() => {
      setStep(prev => (prev + 1) % TOTAL_STEPS);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [step, isOpen, autoPlay]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setAutoPlay(true);
    }
  }, [isOpen]);

  const goToStep = useCallback((s: number) => {
    setStep(s);
    setAutoPlay(false);
  }, []);

  if (!isOpen) return null;

  const stepLabels = [
    'Busca al prospecto en el CRM',
    'Haz clic en el lead para abrirlo',
    'Copia la URL de la barra de direcciones',
    'Pega la URL en el campo de búsqueda',
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-950 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-800"
        >
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-gray-800">
            <div>
              <h3 className="text-base font-semibold text-white">Cómo obtener la URL del CRM</h3>
              <p className="text-xs text-gray-400 mt-0.5">Paso {step + 1} de {TOTAL_STEPS}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step Label */}
          <div className="px-6 pt-4 pb-2">
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

          {/* Browser Mockup */}
          <div className="px-6 py-4">
            <div className="rounded-xl overflow-hidden border border-gray-700 bg-gray-900 shadow-xl">
              {/* Browser Chrome */}
              <div className="bg-gray-800 px-3 py-2 flex items-center gap-2">
                {/* Traffic lights */}
                <div className="flex items-center gap-1.5 mr-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>

                {/* Address bar */}
                <div className={`flex-1 flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-1.5 border transition-all duration-500 ${
                  step === 2 ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-700'
                }`}>
                  <Globe className="w-3 h-3 text-gray-500 flex-shrink-0" />
                  <AnimatePresence mode="wait">
                    {step < 2 ? (
                      <motion.span
                        key="crm-home"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[10px] text-gray-400 truncate font-mono"
                      >
                        vidanta.crm.dynamics.com/main.aspx
                      </motion.span>
                    ) : (
                      <motion.span
                        key="crm-lead"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`text-[10px] truncate font-mono transition-colors duration-300 ${
                          step === 2 ? 'text-blue-400 bg-blue-500/10 px-1 -mx-1 rounded' : 'text-gray-400'
                        }`}
                      >
                        vidanta.crm.dynamics.com/...?id=<span className="text-emerald-400 font-semibold">4bbfb4b9-7b2b-f011</span>...
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Copy indicator */}
                  {step === 2 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.5, type: 'spring', stiffness: 300 }}
                      className="flex-shrink-0"
                    >
                      <div className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[9px] font-medium">
                        <Check className="w-2.5 h-2.5" /> Copiado
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Browser Content */}
              <div className="relative h-[260px] overflow-hidden bg-gray-900">
                <AnimatePresence mode="wait">
                  {/* Step 0-1: CRM Lead List */}
                  {(step === 0 || step === 1) && (
                    <motion.div
                      key="crm-list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 p-4"
                    >
                      {/* CRM Header */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
                          <span className="text-[8px] text-white font-bold">D</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-300">Dynamics 365 — Clientes potenciales</span>
                      </div>

                      {/* Search bar mockup */}
                      <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="w-3 h-3 rounded-full border border-gray-500" />
                        <motion.span
                          initial={{ width: 0 }}
                          animate={{ width: step === 0 ? 'auto' : 'auto' }}
                          className="text-[11px] text-gray-400"
                        >
                          {step === 0 ? (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              Buscar lead...
                            </motion.span>
                          ) : (
                            <span className="text-gray-200">Noe Garcia</span>
                          )}
                        </motion.span>
                      </div>

                      {/* Lead table */}
                      <div className="space-y-0 rounded-lg overflow-hidden border border-gray-700">
                        {/* Table header */}
                        <div className="grid grid-cols-12 gap-2 px-3 py-1.5 bg-gray-800 text-[9px] font-medium text-gray-400 uppercase tracking-wider">
                          <div className="col-span-4">Nombre</div>
                          <div className="col-span-3">Coordinación</div>
                          <div className="col-span-3">Propietario</div>
                          <div className="col-span-2">Estado</div>
                        </div>

                        {/* Lead rows */}
                        {[
                          { name: 'María López Torres', coord: 'VEN', owner: 'Ana Ruiz', status: 'Activo', highlight: false },
                          { name: 'Noe Garcia Rodriguez', coord: 'APEX', owner: 'Diego Barba', status: 'Activo', highlight: true },
                          { name: 'Carlos Mendez Ríos', coord: 'BOOM', owner: 'Pedro Díaz', status: 'Nuevo', highlight: false },
                        ].map((lead, i) => (
                          <motion.div
                            key={i}
                            className={`grid grid-cols-12 gap-2 px-3 py-2.5 border-t border-gray-800 transition-colors ${
                              lead.highlight && step === 1
                                ? 'bg-blue-500/10 border-l-2 border-l-blue-500'
                                : 'hover:bg-gray-800/50'
                            }`}
                            animate={lead.highlight && step === 1 ? { backgroundColor: 'rgba(59,130,246,0.1)' } : {}}
                          >
                            <div className={`col-span-4 text-[11px] ${lead.highlight ? 'text-blue-400 font-medium' : 'text-gray-300'}`}>
                              {lead.name}
                            </div>
                            <div className="col-span-3 text-[11px] text-gray-400">{lead.coord}</div>
                            <div className="col-span-3 text-[11px] text-gray-400">{lead.owner}</div>
                            <div className="col-span-2">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                lead.status === 'Activo' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                              }`}>{lead.status}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Animated cursor for step 1 */}
                      {step === 1 && <AnimatedCursor x={200} y={155} clicking delay={0.3} />}
                    </motion.div>
                  )}

                  {/* Step 2: Lead detail with URL highlight */}
                  {step === 2 && (
                    <motion.div
                      key="crm-detail"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 p-4"
                    >
                      {/* Detail header */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
                          <span className="text-[8px] text-white font-bold">D</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-300">Lead — Noe Garcia Rodriguez</span>
                      </div>

                      {/* Detail card */}
                      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">N</div>
                          <div>
                            <p className="text-sm font-semibold text-white">Noe Garcia Rodriguez</p>
                            <p className="text-[11px] text-gray-400">APEX · Diego Barba Salas</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-700">
                          {[
                            { label: 'Email', value: 'noe.garcia@email.com' },
                            { label: 'Teléfono', value: '(333) 123-4567' },
                            { label: 'Estado CRM', value: 'Activo PQNC' },
                            { label: 'Coordinación', value: 'APEX' },
                          ].map((field, i) => (
                            <div key={i}>
                              <p className="text-[9px] text-gray-500 uppercase tracking-wider">{field.label}</p>
                              <p className="text-[11px] text-gray-300 mt-0.5">{field.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Copy instruction with animated arrow */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mt-4 flex items-center justify-center gap-2"
                      >
                        <motion.div
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <ArrowRight className="w-4 h-4 text-blue-400 rotate-[-90deg]" />
                        </motion.div>
                        <span className="text-[11px] text-blue-400 font-medium">Clic derecho en la barra → Copiar</span>
                      </motion.div>

                      {/* Cursor pointing to address bar */}
                      <AnimatedCursor x={280} y={-55} clicking delay={0.6} />
                    </motion.div>
                  )}

                  {/* Step 3: Paste in wizard */}
                  {step === 3 && (
                    <motion.div
                      key="paste"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 p-4 flex flex-col items-center justify-center"
                    >
                      {/* Wizard mockup */}
                      <div className="w-full max-w-sm">
                        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center">
                              <span className="text-[6px] text-white font-bold">P</span>
                            </div>
                            <span className="text-[11px] font-medium text-gray-300">Buscar Prospectos</span>
                          </div>

                          {/* Textarea mockup */}
                          <div className="relative">
                            <motion.div
                              className="w-full px-3 py-2.5 bg-gray-900 rounded-lg border border-gray-600 font-mono text-[10px] text-gray-300 min-h-[60px] overflow-hidden"
                            >
                              <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-blue-400"
                              >
                                {/* Typing animation */}
                                <TypewriterText 
                                  text="https://vidanta.crm.dynamics.com/main.aspx?...&id=4bbfb4b9-7b2b-f011-8c4e-00224805f7a5"
                                  delay={0.6}
                                />
                              </motion.span>
                            </motion.div>

                            {/* Paste indicator */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.4, type: 'spring' }}
                              className="absolute -top-2 -right-2 flex items-center gap-1 bg-emerald-500 text-white px-2 py-1 rounded-lg text-[9px] font-semibold shadow-lg"
                            >
                              <Copy className="w-2.5 h-2.5" /> Ctrl+V
                            </motion.div>
                          </div>

                          {/* Fake button */}
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 2 }}
                            className="mt-3 px-3 py-1.5 bg-blue-600 rounded-lg text-[10px] text-white font-medium text-center"
                          >
                            Buscar Todos
                          </motion.div>
                        </div>

                        {/* Success message */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 2.5 }}
                          className="mt-3 text-center"
                        >
                          <span className="text-[11px] text-emerald-400 font-medium">
                            La búsqueda por URL tarda ~3 segundos
                          </span>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Footer: Step dots + navigation */}
          <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
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
                onClick={() => step === TOTAL_STEPS - 1 ? onClose() : goToStep(step + 1)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-white text-xs font-medium flex items-center gap-1"
              >
                {step === TOTAL_STEPS - 1 ? (
                  <span>Entendido</span>
                ) : (
                  <><span>Siguiente</span><ChevronRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/** Componente de efecto typewriter */
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
    }, 15);
    return () => clearTimeout(timer);
  }, [displayed, text, started]);

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

export default CrmUrlTutorialModal;
