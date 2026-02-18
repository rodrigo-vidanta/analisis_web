/**
 * ============================================
 * MODAL DE SELECCIÓN DE PLANTILLA (SIN VARIABLES)
 * ============================================
 *
 * Muestra plantillas WhatsApp APPROVED sin variables,
 * ordenadas por star rating (response rate).
 * Reutiliza patrones de ReactivateConversationModal.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, Star, MessageSquare, Loader2,
  TrendingUp, Send, Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import { importacionesService } from '../../../services/importacionesService';
import type { WhatsAppTemplate } from '../../../types/whatsappTemplates';
import { TemplateTagsSelector } from '../plantillas/TemplateTagsSelector';

interface TemplateConRating extends WhatsAppTemplate {
  starRating: number;
  replyRate: number;
  totalSent: number;
}

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: TemplateConRating) => void;
}

// ============================================
// STAR RATING COMPONENT
// ============================================

const StarRating: React.FC<{ rating: number; replyRate: number; totalSent: number }> = ({ rating, replyRate, totalSent }) => {
  if (rating === 0) {
    return (
      <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">Sin datos</span>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.div
            key={star}
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: star * 0.04, type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                star <= rating
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          </motion.div>
        ))}
      </div>
      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
        {replyRate}% <span className="text-gray-400 dark:text-gray-500">({totalSent})</span>
      </span>
    </div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const TemplateSelectionModal: React.FC<TemplateSelectionModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [templates, setTemplates] = useState<TemplateConRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'MARKETING' | 'UTILITY'>('all');

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await importacionesService.getTemplatesSinVariables();
      setTemplates(data as TemplateConRating[]);
    } catch (err) {
      console.error('Error loading templates:', err);
      toast.error('Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = t.name?.toLowerCase().includes(term);
        const matchesDesc = t.description?.toLowerCase().includes(term);
        if (!matchesName && !matchesDesc) return false;
      }

      // Category filter
      if (activeCategory !== 'all' && t.category !== activeCategory) return false;

      // Tags filter
      if (selectedTags.length > 0) {
        const templateTags = t.tags || [];
        const hasMatchingTag = selectedTags.some(tag => templateTags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  }, [templates, searchTerm, activeCategory, selectedTags]);

  const getBodyText = (template: WhatsAppTemplate): string => {
    const bodyComponent = template.components?.find((c: { type: string; text?: string }) => c.type === 'BODY');
    return (bodyComponent as { type: string; text?: string })?.text || '';
  };

  if (!isOpen) return null;

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
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Seleccionar Plantilla
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Solo plantillas sin variables · Ordenadas por efectividad
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </motion.button>
          </div>

          {/* Filters */}
          <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o descripción..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category tabs + Tags */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                {([['all', 'Todas'], ['MARKETING', 'Marketing'], ['UTILITY', 'Utilidad']] as const).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setActiveCategory(value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      activeCategory === value
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <TemplateTagsSelector
                  selectedTags={selectedTags}
                  onChange={setSelectedTags}
                />
              </div>
            </div>
          </div>

          {/* Templates List */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {templates.length === 0
                    ? 'No hay plantillas sin variables disponibles'
                    : 'No se encontraron plantillas con los filtros seleccionados'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTemplates.map((template, idx) => (
                  <motion.button
                    key={template.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => onSelect(template)}
                    className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {template.name}
                          </h4>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            template.category === 'MARKETING'
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                              : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                          }`}>
                            {template.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                          {getBodyText(template)}
                        </p>
                        <div className="flex items-center gap-3">
                          <StarRating
                            rating={template.starRating}
                            replyRate={template.replyRate}
                            totalSent={template.totalSent}
                          />
                          {template.tags && template.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Tag className="w-3 h-3 text-gray-400" />
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                {template.tags.slice(0, 3).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                          <Send className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <TrendingUp className="w-3 h-3 inline mr-1" />
                {filteredTemplates.length} plantilla{filteredTemplates.length !== 1 ? 's' : ''} disponible{filteredTemplates.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TemplateSelectionModal;
