/**
 * ============================================
 * TUTORIAL INTERACTIVO: MENSAJES PREDEFINIDOS
 * ============================================
 *
 * Tutorial animado de 5 pasos explicando el nuevo
 * boton de mensajes predefinidos en el modulo WhatsApp.
 * Avance MANUAL (clic para continuar).
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  BookText,
  Sparkles,
  Search,
  Send,
  Paperclip,
  Phone,
  Mic,
  Mail,
  Landmark,
  ChevronDown,
  Type,
  ListFilter,
  AlertCircle,
  FileText,
  MessageSquare,
} from 'lucide-react';

interface PresetMessagesTutorialProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 5;

const STEP_LABELS = [
  'Nuevo boton: Mensajes Predefinidos',
  'Explora por categorias',
  'Variables de texto libre',
  'Variables de seleccion (Dropdown)',
  'Vista previa y envio',
];

/** Typewriter effect */
const TypewriterText: React.FC<{ text: string; delay?: number; speed?: number }> = ({ text, delay = 0, speed = 22 }) => {
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
        <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} className="text-emerald-400">|</motion.span>
      )}
    </>
  );
};

/** Animated cursor */
const AnimatedCursor: React.FC<{ x: number; y: number; clicking?: boolean; delay?: number }> = ({ x, y, clicking, delay = 0 }) => (
  <motion.div
    className="absolute z-50 pointer-events-none"
    initial={{ x: x - 30, y: y - 30, opacity: 0 }}
    animate={{ x, y, opacity: 1 }}
    transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="drop-shadow-lg">
      <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="#1e293b" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
    {clicking && (
      <motion.div
        className="absolute top-0 left-0 w-6 h-6 rounded-full bg-emerald-500/30"
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.6, delay: delay + 0.8, ease: 'easeOut' }}
      />
    )}
  </motion.div>
);

// ============================================
// STEP 1: Nuevo boton
// ============================================
const Step1NewButton: React.FC = () => {
  const [highlighted, setHighlighted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHighlighted(true), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="p-5 space-y-4">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-gray-300 leading-relaxed">
        <TypewriterText text="Ahora cuentas con un nuevo boton en la barra de herramientas del chat para enviar mensajes predefinidos de forma rapida y precisa." delay={0.3} />
      </motion.p>

      {/* Mock de la barra de herramientas */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="bg-gray-800 rounded-xl p-3 border border-gray-700 relative"
      >
        <div className="flex items-center gap-2">
          {/* Boton Adjuntar */}
          <div className="p-2.5 rounded-xl bg-gray-700/50 text-gray-400">
            <Paperclip className="w-4 h-4" />
          </div>

          {/* NUEVO BOTON - Predefinidos */}
          <motion.div
            animate={highlighted ? {
              boxShadow: ['0 0 0 0 rgba(16, 185, 129, 0)', '0 0 0 8px rgba(16, 185, 129, 0.3)', '0 0 0 0 rgba(16, 185, 129, 0)'],
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className={`p-2.5 rounded-xl transition-all duration-500 ${
              highlighted
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-gray-700/50 text-gray-400'
            }`}
          >
            <BookText className="w-4 h-4" />
          </motion.div>

          {/* Boton Llamada */}
          <div className="p-2.5 rounded-xl bg-gray-700/50 text-gray-400">
            <Phone className="w-4 h-4" />
          </div>

          {/* Textarea mock */}
          <div className="flex-1 px-3 py-2 bg-gray-700/50 rounded-xl">
            <span className="text-xs text-gray-500">Escribe un mensaje...</span>
          </div>

          {/* Boton Enviar */}
          <div className="p-2.5 rounded-xl bg-blue-600/30 text-blue-400">
            <Send className="w-4 h-4" />
          </div>

          {/* Boton Audio */}
          <div className="p-2.5 rounded-xl bg-purple-600/30 text-purple-400">
            <Mic className="w-4 h-4" />
          </div>
        </div>

        {/* Cursor animado */}
        {highlighted && <AnimatedCursor x={68} y={8} clicking delay={1.5} />}

        {/* Label del boton */}
        {highlighted && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5, duration: 0.4 }}
            className="absolute -bottom-8 left-14 flex items-center gap-1.5"
          >
            <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-emerald-500/50 ml-4" />
            <motion.span
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30 -ml-6 mt-1"
            >
              Mensajes Predefinidos
            </motion.span>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.5 }}
        className="mt-6 flex items-start gap-2 text-xs text-gray-400"
      >
        <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <span>Este boton abre un catalogo de mensajes listos para enviar, organizados por categorias y con campos personalizables.</span>
      </motion.div>
    </div>
  );
};

// ============================================
// STEP 2: Categorias
// ============================================
const Step2Categories: React.FC = () => {
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [showMessages, setShowMessages] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setSelectedCat(0), 1500);
    const t2 = setTimeout(() => setShowMessages(true), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const cats = [
    { name: 'Informacion General', icon: Mail },
    { name: 'Datos Bancarios', icon: Landmark },
    { name: 'Seguimiento', icon: Phone },
  ];

  const messages = [
    { title: 'Correo Electronico', vars: 2 },
    { title: 'Horario de Atencion', vars: 0 },
    { title: 'Datos de Contacto', vars: 1 },
  ];

  return (
    <div className="p-5 space-y-4">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-gray-300 leading-relaxed">
        <TypewriterText text="Al abrir el modal, veras los mensajes organizados por categorias. Puedes filtrar por categoria o buscar por texto." delay={0.3} />
      </motion.p>

      {/* Mock del modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
      >
        {/* Header mock */}
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-semibold text-white">Mensajes Predefinidos</span>
        </div>

        {/* Barra de busqueda */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 rounded-lg">
            <Search className="w-3 h-3 text-gray-500" />
            <span className="text-[10px] text-gray-500">Buscar mensaje...</span>
          </div>
        </div>

        {/* Tabs de categorias */}
        <div className="px-3 py-2 flex gap-1.5">
          {cats.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + i * 0.15 }}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium flex items-center gap-1.5 transition-all cursor-default ${
                  selectedCat === i
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-gray-700/50 text-gray-400'
                }`}
              >
                <Icon className="w-3 h-3" />
                {cat.name}
              </motion.div>
            );
          })}
        </div>

        {/* Lista de mensajes */}
        <div className="px-3 pb-3 space-y-1.5">
          {showMessages && messages.map((msg, i) => (
            <motion.div
              key={msg.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15, duration: 0.3 }}
              className="px-3 py-2.5 rounded-lg border border-gray-700 hover:border-emerald-600/40 flex items-center justify-between group"
            >
              <div>
                <span className="text-[11px] font-medium text-gray-200">{msg.title}</span>
                {msg.vars > 0 && (
                  <div className="flex gap-1 mt-1">
                    {Array.from({ length: msg.vars }).map((_, vi) => (
                      <span key={vi} className="px-1.5 py-0.5 text-[8px] font-medium bg-blue-500/15 text-blue-400 rounded">
                        Variable {vi + 1}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <ChevronRight className="w-3 h-3 text-gray-600" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3 }}
        className="text-[11px] text-gray-500 flex items-center gap-1.5"
      >
        <Search className="w-3 h-3" />
        Tambien puedes buscar directamente escribiendo en la barra de busqueda.
      </motion.p>
    </div>
  );
};

// ============================================
// STEP 3: Variables de texto libre
// ============================================
const Step3TextVariables: React.FC = () => {
  const [typingPhase, setTypingPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setTypingPhase(1), 1500);
    const t2 = setTimeout(() => setTypingPhase(2), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="p-5 space-y-4">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-gray-300 leading-relaxed">
        <TypewriterText text="Algunos mensajes tienen campos de texto libre. Tu escribes el valor que necesites, como tu correo electronico o el nombre del prospecto." delay={0.3} />
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3"
      >
        <div className="flex items-center gap-2 mb-2">
          <Type className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-semibold text-white">Campo de texto libre</span>
        </div>

        {/* Campo Correo */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-gray-400">Correo</label>
          <div className="px-3 py-2 bg-gray-700/50 rounded-lg border border-gray-600 text-xs text-gray-200 min-h-[32px] flex items-center">
            {typingPhase >= 1 ? (
              <TypewriterText text="karla.arellano" delay={0} speed={50} />
            ) : (
              <span className="text-gray-500">nombre.apellido</span>
            )}
          </div>
        </div>

        {/* Indicador visual */}
        {typingPhase >= 1 && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg"
          >
            <Type className="w-3 h-3 text-blue-400 flex-shrink-0" />
            <span className="text-[10px] text-blue-300">
              El ejecutivo escribe libremente el valor que necesita
            </span>
          </motion.div>
        )}

        {/* Preview resultado */}
        {typingPhase >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 space-y-1"
          >
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Resultado en el mensaje:</span>
            <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-[11px] text-gray-200">
                Le comparto mi correo electronico <span className="font-bold text-emerald-300">karla.arellano</span>@vidavacations.com, estoy a sus ordenes.
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

// ============================================
// STEP 4: Variables dropdown
// ============================================
const Step4DropdownVariables: React.FC = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    const t1 = setTimeout(() => setDropdownOpen(true), 1500);
    const t2 = setTimeout(() => { setSelected('vidavacations.com'); setDropdownOpen(false); }, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="p-5 space-y-4">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-gray-300 leading-relaxed">
        <TypewriterText text="Otros campos son de seleccion (dropdown): eliges una opcion de una lista predefinida. Esto evita errores de escritura y asegura que la informacion sea correcta." delay={0.3} />
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3"
      >
        <div className="flex items-center gap-2 mb-2">
          <ListFilter className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-semibold text-white">Campo de seleccion (Dropdown)</span>
        </div>

        {/* Dropdown campo */}
        <div className="space-y-1 relative">
          <label className="text-[10px] font-medium text-gray-400">Dominio</label>
          <motion.div
            animate={dropdownOpen ? { borderColor: 'rgba(168, 85, 247, 0.5)' } : {}}
            className="px-3 py-2 bg-gray-700/50 rounded-lg border border-gray-600 text-xs text-gray-200 flex items-center justify-between cursor-default"
          >
            <span className={selected ? 'text-gray-200' : 'text-gray-500'}>
              {selected || 'Seleccionar...'}
            </span>
            <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </motion.div>

          {/* Dropdown options */}
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -5, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -5, height: 0 }}
                className="absolute left-0 right-0 top-full mt-1 bg-gray-700 rounded-lg border border-gray-600 overflow-hidden z-10"
              >
                {['vidavacations.com', 'grupovidanta.com'].map((opt, i) => (
                  <motion.div
                    key={opt}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className={`px-3 py-2 text-[11px] text-gray-200 hover:bg-gray-600/50 flex items-center justify-between ${
                      i === 0 ? 'bg-purple-500/10' : ''
                    }`}
                  >
                    {opt}
                    {i === 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        <AnimatedCursor x={-15} y={-8} clicking delay={0.8} />
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Indicador visual */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg"
        >
          <ListFilter className="w-3 h-3 text-purple-400 flex-shrink-0" />
          <span className="text-[10px] text-purple-300">
            Las opciones son definidas por el equipo de Calidad, asi los datos siempre son correctos
          </span>
        </motion.div>

        {/* Preview resultado */}
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 space-y-1"
          >
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Resultado en el mensaje:</span>
            <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-[11px] text-gray-200">
                ...correo electronico karla.arellano@<span className="font-bold text-purple-300">{selected}</span>, estoy a sus ordenes.
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

// ============================================
// STEP 5: Preview y envio + cierre con Calidad
// ============================================
const Step5PreviewAndSend: React.FC = () => {
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSent(true), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="p-5 space-y-4">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-gray-300 leading-relaxed">
        <TypewriterText text="Antes de enviar, veras una vista previa tipo burbuja de WhatsApp con el mensaje completo. Al confirmar, se envia directamente al prospecto." delay={0.3} />
      </motion.p>

      {/* Mock preview burbuja */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8 }}
        className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3"
      >
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Vista previa</span>

        {/* Burbuja WhatsApp */}
        <div className="relative max-w-[80%] ml-auto">
          <div className="bg-[#005c4b] rounded-lg rounded-tr-sm p-3 shadow-sm">
            <p className="text-[11px] text-gray-100 leading-relaxed">
              Le comparto mi correo electronico <span className="font-bold text-emerald-300">karla.arellano</span>@<span className="font-bold text-purple-300">vidavacations.com</span>, estoy a sus ordenes.
            </p>
            <div className="flex justify-end mt-1">
              <span className="text-[9px] text-gray-400">12:00 PM</span>
            </div>
          </div>
        </div>

        {/* Boton enviar */}
        <div className="flex justify-end">
          <motion.div
            animate={sent ? { scale: [1, 0.95, 1], backgroundColor: ['#059669', '#047857', '#059669'] } : {}}
            transition={{ duration: 0.3 }}
            className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 ${
              sent ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-600 text-white'
            }`}
          >
            {sent ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                Enviado
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Enviar mensaje
              </>
            )}
          </motion.div>
        </div>

        {/* Resultado exitoso */}
        {sent && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-[10px] text-emerald-300">
              El mensaje se envia al prospecto usando el mismo canal de WhatsApp
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Mensaje final sobre Calidad */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: sent ? 1 : 5 }}
        className="mt-2 px-4 py-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl"
      >
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div>
            <p className="text-[11px] text-gray-200 font-medium mb-1">
              ¿Necesitas un nuevo mensaje predefinido?
            </p>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Si requieres que se agreguen nuevos mensajes al catalogo, contacta al <span className="text-blue-300 font-semibold">departamento de Calidad</span>. Ellos se encargan de crear y administrar los mensajes disponibles.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
const PresetMessagesTutorial: React.FC<PresetMessagesTutorialProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const goToStep = (s: number) => {
    setStep(Math.max(0, Math.min(s, TOTAL_STEPS - 1)));
  };

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="pb-4 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <BookText className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Mensajes Predefinidos</h3>
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
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
              {step + 1}
            </span>
            <p className="text-sm font-medium text-gray-200">{STEP_LABELS[step]}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step Content */}
      <div className="py-4">
        <div className="rounded-xl overflow-hidden border border-gray-700 bg-gray-900 min-h-[320px] relative">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.4 }}>
                <Step1NewButton />
              </motion.div>
            )}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.4 }}>
                <Step2Categories />
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.4 }}>
                <Step3TextVariables />
              </motion.div>
            )}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.4 }}>
                <Step4DropdownVariables />
              </motion.div>
            )}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.4 }}>
                <Step5PreviewAndSend />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer: Dots + Navigation */}
      <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
        {/* Step dots */}
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <button
              key={i}
              onClick={() => goToStep(i)}
              className={`transition-all duration-300 rounded-full ${
                i === step
                  ? 'w-6 h-2 bg-emerald-500'
                  : i < step
                  ? 'w-2 h-2 bg-emerald-500/50 hover:bg-emerald-500/70'
                  : 'w-2 h-2 bg-gray-700 hover:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToStep(step - 1)}
            disabled={step === 0}
            className="p-2 rounded-lg hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-400"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => step === TOTAL_STEPS - 1 ? onComplete() : goToStep(step + 1)}
            className={`px-4 py-2 rounded-lg transition-colors text-white text-xs font-medium flex items-center gap-1.5 ${
              step === TOTAL_STEPS - 1
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
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

export default PresetMessagesTutorial;
