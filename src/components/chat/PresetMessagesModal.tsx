import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Send, Search, ChevronRight, FileText, AlertCircle, Loader2,
  Mail, Landmark, Phone, DollarSign, Target, PenLine, Building,
  Plane, Palmtree, Star, Bell, BarChart3, Handshake, Briefcase,
  MapPin, Heart, Shield, Gift, Clock, Users,
} from 'lucide-react';
import {
  presetMessagesService,
} from '../../services/presetMessagesService';
import type {
  PresetMessageCategory,
  PresetMessage,
  PresetVariable,
} from '../../services/presetMessagesService';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  FileText, Mail, Landmark, Phone, DollarSign, Target, PenLine, Building,
  Plane, Palmtree, Star, Bell, BarChart3, Handshake, Briefcase,
  MapPin, Heart, Shield, Gift, Clock, Users,
};

const CatIcon: React.FC<{ name: string; className?: string }> = ({ name, className = 'w-3.5 h-3.5' }) => {
  const Ic = ICON_MAP[name];
  return Ic ? <Ic className={className} /> : <FileText className={className} />;
};

interface PresetMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (message: string) => void;
}

const PresetMessagesModal: React.FC<PresetMessagesModalProps> = ({ isOpen, onClose, onSend }) => {
  const [categories, setCategories] = useState<PresetMessageCategory[]>([]);
  const [messages, setMessages] = useState<PresetMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<PresetMessage | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);

  // Cargar datos
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSelectedMessage(null);
    setSelectedCategory(null);
    setVariableValues({});
    setSearchQuery('');

    Promise.all([
      presetMessagesService.getCategories(),
      presetMessagesService.getMessages(),
    ]).then(([cats, msgs]) => {
      setCategories(cats);
      setMessages(msgs);
      if (cats.length > 0) setSelectedCategory(cats[0].id);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen]);

  // Inicializar variables al seleccionar mensaje
  useEffect(() => {
    if (selectedMessage) {
      const defaults: Record<string, string> = {};
      for (const v of selectedMessage.variables) {
        defaults[v.name] = v.default_value || '';
      }
      setVariableValues(defaults);
    }
  }, [selectedMessage]);

  // Mensajes filtrados por categoría y búsqueda
  const filteredMessages = useMemo(() => {
    let filtered = messages;
    if (selectedCategory) {
      filtered = filtered.filter(m => m.category_id === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(q) || m.content.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [messages, selectedCategory, searchQuery]);

  // Preview del mensaje resuelto
  const resolvedPreview = useMemo(() => {
    if (!selectedMessage) return '';
    return presetMessagesService.resolveContent(selectedMessage.content, variableValues);
  }, [selectedMessage, variableValues]);

  // Verificar si hay variables sin completar
  const hasEmptyRequiredVars = useMemo(() => {
    if (!selectedMessage) return false;
    return selectedMessage.variables.some(v => !variableValues[v.name]?.trim());
  }, [selectedMessage, variableValues]);

  const handleSend = useCallback(async () => {
    if (!selectedMessage || hasEmptyRequiredVars) return;
    setSending(true);
    try {
      onSend(resolvedPreview);
      onClose();
    } finally {
      setSending(false);
    }
  }, [selectedMessage, resolvedPreview, hasEmptyRequiredVars, onSend, onClose]);

  const handleVariableChange = useCallback((name: string, value: string) => {
    setVariableValues(prev => ({ ...prev, [name]: value }));
  }, []);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-emerald-500/5 to-blue-500/5 dark:from-emerald-500/10 dark:to-blue-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Mensajes Predefinidos
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Selecciona y personaliza un mensaje
                  </p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                whileHover={{ scale: 1.05, rotate: 90 }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {!selectedMessage ? (
                  /* ========== VISTA: Lista de mensajes ========== */
                  <motion.div
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col flex-1 min-h-0"
                  >
                    {/* Búsqueda */}
                    <div className="px-4 pt-4 pb-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Buscar mensaje..."
                          className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
                        />
                      </div>
                    </div>

                    {/* Tabs de categorías */}
                    <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
                      {categories.map(cat => (
                        <motion.button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-200 ${
                            selectedCategory === cat.id
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          <CatIcon name={cat.icon} className="w-3.5 h-3.5 mr-1 inline-block" />
                          {cat.name}
                        </motion.button>
                      ))}
                    </div>

                    {/* Lista de mensajes */}
                    <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                      {filteredMessages.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                          <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">No hay mensajes en esta categoría</p>
                        </div>
                      ) : (
                        filteredMessages.map((msg, index) => (
                          <motion.button
                            key={msg.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03, duration: 0.2 }}
                            onClick={() => setSelectedMessage(msg)}
                            className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all duration-200 group"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                                  {msg.title}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 whitespace-pre-line">
                                  {msg.content.length > 120 ? msg.content.substring(0, 120) + '...' : msg.content}
                                </p>
                                {msg.variables.length > 0 && (
                                  <div className="flex gap-1 mt-2 flex-wrap">
                                    {msg.variables.map(v => (
                                      <span
                                        key={v.name}
                                        className="px-2 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md"
                                      >
                                        {v.label}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-emerald-500 transition-colors flex-shrink-0 mt-1" />
                            </div>
                          </motion.button>
                        ))
                      )}
                    </div>
                  </motion.div>
                ) : (
                  /* ========== VISTA: Editar y enviar ========== */
                  <motion.div
                    key="editor"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col flex-1 min-h-0"
                  >
                    {/* Título del mensaje + botón volver */}
                    <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                      <motion.button
                        onClick={() => setSelectedMessage(null)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                      </motion.button>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{selectedMessage.title}</h4>
                        <p className="text-[11px] text-gray-400">
                          {categories.find(c => c.id === selectedMessage.category_id)?.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                      {/* Variables editables */}
                      {selectedMessage.variables.length > 0 && (
                        <div className="space-y-3">
                          <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Completar campos
                          </h5>
                          {selectedMessage.variables.map(v => (
                            <VariableField
                              key={v.name}
                              variable={v}
                              value={variableValues[v.name] || ''}
                              onChange={val => handleVariableChange(v.name, val)}
                            />
                          ))}
                        </div>
                      )}

                      {/* Preview del mensaje */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Vista previa
                        </h5>
                        <div className="relative">
                          {/* Burbuja estilo WhatsApp */}
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl rounded-tr-sm p-4 max-w-full">
                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line break-words leading-relaxed">
                              <MessagePreview content={resolvedPreview} variables={selectedMessage.variables} values={variableValues} />
                            </p>
                          </div>
                          {/* Tail de la burbuja */}
                          <div className="absolute top-0 right-[-6px] w-3 h-3 overflow-hidden">
                            <div className="w-4 h-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rotate-45 transform origin-bottom-left" />
                          </div>
                        </div>

                        {hasEmptyRequiredVars && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800"
                          >
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span className="text-xs">Completa todos los campos antes de enviar</span>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Footer: Enviar */}
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedMessage(null)}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Volver
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: hasEmptyRequiredVars ? 1 : 1.02 }}
                        whileTap={{ scale: hasEmptyRequiredVars ? 1 : 0.98 }}
                        onClick={handleSend}
                        disabled={hasEmptyRequiredVars || sending}
                        className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25 flex items-center gap-2"
                      >
                        {sending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Enviar mensaje
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

// ============================================
// Sub-componente: Campo de variable
// ============================================

interface VariableFieldProps {
  variable: PresetVariable;
  value: string;
  onChange: (value: string) => void;
}

const VariableField: React.FC<VariableFieldProps> = ({ variable, value, onChange }) => {
  if (variable.type === 'dropdown') {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {variable.label}
        </label>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white appearance-none cursor-pointer"
        >
          <option value="">Seleccionar...</option>
          {variable.options?.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
        {variable.label}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={variable.placeholder || `Ingresa ${variable.label.toLowerCase()}`}
        className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
      />
    </div>
  );
};

// ============================================
// Sub-componente: Preview con resaltado de variables
// ============================================

interface MessagePreviewProps {
  content: string;
  variables: PresetVariable[];
  values: Record<string, string>;
}

const MessagePreview: React.FC<MessagePreviewProps> = ({ content, variables, values }) => {
  // Primero resolvemos las variables con valores, y resaltamos las que faltan
  let parts: (string | React.ReactElement)[] = [content];

  for (const v of variables) {
    const val = values[v.name]?.trim();
    const placeholder = `{{${v.name}}}`;
    const newParts: (string | React.ReactElement)[] = [];

    for (const part of parts) {
      if (typeof part !== 'string') {
        newParts.push(part);
        continue;
      }
      const segments = part.split(placeholder);
      for (let i = 0; i < segments.length; i++) {
        if (segments[i]) newParts.push(segments[i]);
        if (i < segments.length - 1) {
          if (val) {
            newParts.push(
              <span key={`${v.name}-${i}`} className="font-medium text-emerald-700 dark:text-emerald-300">
                {val}
              </span>
            );
          } else {
            newParts.push(
              <span key={`${v.name}-${i}`} className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded text-xs font-medium">
                {v.label}
              </span>
            );
          }
        }
      }
    }
    parts = newParts;
  }

  return <>{parts}</>;
};

export default PresetMessagesModal;
