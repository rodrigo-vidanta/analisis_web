import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Tag, ChevronDown, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { analysisSupabase } from '../../../config/analysisSupabase';

/**
 * ============================================
 * SELECTOR DE ETIQUETAS PARA PLANTILLAS
 * ============================================
 * 
 * Componente para seleccionar y crear etiquetas de clasificación
 * de plantillas WhatsApp.
 * 
 * Features:
 * - Muestra top 10 etiquetas más usadas
 * - Dropdown para ver todas las etiquetas
 * - Creación de nuevas etiquetas inline
 * - Validación: máx 18 chars, solo a-z0-9_
 */

interface TemplateLabelsSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

interface TagStats {
  tag: string;
  usage_count: number;
  active_templates_count: number;
}

export const TemplateTagsSelector: React.FC<TemplateLabelsSelectorProps> = ({
  selectedTags,
  onChange,
  disabled = false,
}) => {
  const [allTags, setAllTags] = useState<TagStats[]>([]);
  const [showAllTags, setShowAllTags] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [loading, setLoading] = useState(true);

  // Cargar tags desde la vista de estadísticas
  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      const { data, error } = await analysisSupabase
        .from('v_whatsapp_template_tags_stats')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) {
        // Si la vista no existe (404), simplemente no cargar tags
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.log('Vista de tags no existe aún. Ejecutar migración SQL.');
          setAllTags([]);
          return;
        }
        throw error;
      }
      setAllTags(data || []);
    } catch (error) {
      console.error('Error cargando tags:', error);
      // No mostrar toast de error si la vista no existe
      setAllTags([]);
    } finally {
      setLoading(false);
    }
  };

  // Validar formato de tag
  const validateTag = (tag: string): { valid: boolean; error?: string } => {
    if (!tag || tag.trim().length === 0) {
      return { valid: false, error: 'La etiqueta no puede estar vacía' };
    }

    if (tag.length > 18) {
      return { valid: false, error: 'Máximo 18 caracteres' };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(tag)) {
      return { valid: false, error: 'Solo letras, números y guión bajo (_)' };
    }

    if (selectedTags.includes(tag)) {
      return { valid: false, error: 'Etiqueta ya agregada' };
    }

    return { valid: true };
  };

  // Normalizar tag (convertir a minúsculas, reemplazar espacios por _)
  const normalizeTag = (tag: string): string => {
    return tag
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  };

  // Agregar tag
  const handleAddTag = (tag: string) => {
    if (disabled) return;
    
    const normalizedTag = normalizeTag(tag);
    const validation = validateTag(normalizedTag);

    if (!validation.valid) {
      toast.error(validation.error || 'Tag inválido');
      return;
    }

    onChange([...selectedTags, normalizedTag]);
    
    // Si es nuevo, agregarlo a la lista local
    if (!allTags.some(t => t.tag === normalizedTag)) {
      setAllTags([{ tag: normalizedTag, usage_count: 0, active_templates_count: 0 }, ...allTags]);
    }
  };

  // Remover tag
  const handleRemoveTag = (tag: string) => {
    if (disabled) return;
    onChange(selectedTags.filter(t => t !== tag));
  };

  // Crear nueva tag
  const handleCreateNewTag = () => {
    if (!newTagInput.trim()) {
      toast.error('Ingresa un nombre para la etiqueta');
      return;
    }

    handleAddTag(newTagInput);
    setNewTagInput('');
    setIsCreatingNew(false);
  };

  // Top 10 tags
  const top10Tags = allTags.slice(0, 10);
  const remainingTags = allTags.slice(10);

  return (
    <div className="space-y-3">
      {/* Tags seleccionados */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.filter(Boolean).map((tag, idx) => (
            <motion.div
              key={`${tag}-${idx}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium group"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{tag}</span>
              {!disabled && (
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded p-0.5 transition-colors"
                  type="button"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Top 10 tags disponibles */}
      {!loading && (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            Etiquetas disponibles {top10Tags.length > 0 && `(top ${Math.min(top10Tags.length, 10)})`}
          </label>
          
          {allTags.length === 0 ? (
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
              No hay etiquetas aún. Crea la primera usando el botón "Nueva".
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {top10Tags
                .filter(t => t.tag && !selectedTags.includes(t.tag))
                .map((tagStats, idx) => (
                  <button
                    key={`top-${tagStats.tag}-${idx}`}
                    type="button"
                    onClick={() => handleAddTag(tagStats.tag)}
                    disabled={disabled}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>{tagStats.tag}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      ({tagStats.usage_count})
                    </span>
                  </button>
                ))}

              {/* Botón Ver Más */}
              {remainingTags.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAllTags(!showAllTags)}
                    disabled={disabled}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-800/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Ver más ({remainingTags.length})</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAllTags ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown con todas las tags */}
                  <AnimatePresence>
                    {showAllTags && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 w-64 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700"
                      >
                        <div className="p-2 space-y-1">
                          {remainingTags
                            .filter(t => t.tag && !selectedTags.includes(t.tag))
                            .map((tagStats, idx) => (
                              <button
                                key={`rem-${tagStats.tag}-${idx}`}
                                type="button"
                                onClick={() => {
                                  handleAddTag(tagStats.tag);
                                  setShowAllTags(false);
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                              >
                                <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                  <Tag className="w-3.5 h-3.5" />
                                  {tagStats.tag}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {tagStats.usage_count}
                                </span>
                              </button>
                            ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Botón Crear Nueva */}
              <button
                type="button"
                onClick={() => setIsCreatingNew(!isCreatingNew)}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-800/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Input para crear nueva tag */}
      <AnimatePresence>
        {isCreatingNew && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <Tag className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateNewTag();
                  } else if (e.key === 'Escape') {
                    setIsCreatingNew(false);
                    setNewTagInput('');
                  }
                }}
                placeholder="nombre_de_etiqueta"
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                autoFocus
                maxLength={18}
              />
              <button
                type="button"
                onClick={handleCreateNewTag}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                Crear
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNew(false);
                  setNewTagInput('');
                }}
                className="px-3 py-1.5 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Cancelar
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Máximo 18 caracteres. Solo letras, números y guión bajo (_).
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};
