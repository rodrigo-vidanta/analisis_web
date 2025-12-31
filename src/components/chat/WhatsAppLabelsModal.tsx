/**
 * ============================================
 * MODAL DE GESTIÓN DE ETIQUETAS - WHATSAPP
 * ============================================
 * 
 * Modal para agregar, remover y gestionar etiquetas en conversaciones de WhatsApp
 * Sigue las guías de diseño de modales del proyecto
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Tag,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  Palette,
} from 'lucide-react';
import {
  whatsappLabelsService,
  type WhatsAppLabel,
  type ConversationLabel,
  CUSTOM_LABEL_COLORS,
  LABEL_LIMITS,
} from '../../services/whatsappLabelsService';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

// ============================================
// INTERFACES
// ============================================

interface WhatsAppLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospectoId: string;
  prospectoName: string;
  onLabelsUpdate?: () => void;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export const WhatsAppLabelsModal: React.FC<WhatsAppLabelsModalProps> = ({
  isOpen,
  onClose,
  prospectoId,
  prospectoName,
  onLabelsUpdate,
}) => {
  const { user } = useAuth();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableLabels, setAvailableLabels] = useState<{
    preset: WhatsAppLabel[];
    custom: WhatsAppLabel[];
  }>({ preset: [], custom: [] });
  const [prospectoLabels, setProspectoLabels] = useState<ConversationLabel[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form para crear etiqueta personalizada
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(CUSTOM_LABEL_COLORS[0].hex);
  const [newLabelDescription, setNewLabelDescription] = useState('');
  const [creating, setCreating] = useState(false);
  
  // ============================================
  // EFECTOS
  // ============================================
  
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, prospectoId]);
  
  // ============================================
  // FUNCIONES DE CARGA
  // ============================================
  
  const loadData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const [labels, prospLabels] = await Promise.all([
        whatsappLabelsService.getAvailableLabels(user.id),
        whatsappLabelsService.getProspectoLabels(prospectoId, user.id), // Pasar userId para permisos
      ]);
      
      setAvailableLabels(labels);
      setProspectoLabels(prospLabels);
    } catch (error) {
      console.error('Error cargando etiquetas:', error);
      toast.error('Error al cargar las etiquetas');
    } finally {
      setLoading(false);
    }
  };
  
  // ============================================
  // FUNCIONES DE GESTIÓN DE ETIQUETAS
  // ============================================
  
  const handleToggleLabel = async (label: WhatsAppLabel) => {
    if (!user?.id) return;
    
    const isActive = prospectoLabels.some(
      cl => cl.label_id === label.id && cl.label_type === label.type
    );
    
    setSaving(true);
    try {
      if (isActive) {
        // Remover etiqueta
        await whatsappLabelsService.removeLabelFromProspecto(
          prospectoId,
          label.id,
          label.type
        );
        setProspectoLabels(prev => 
          prev.filter(cl => !(cl.label_id === label.id && cl.label_type === label.type))
        );
        toast.success(`Etiqueta "${label.name}" removida`);
      } else {
        // Validar antes de agregar
        const validation = await whatsappLabelsService.canAddLabel(
          prospectoId,
          label.id,
          label.type
        );
        
        if (!validation.canAdd) {
          toast.error(validation.reason || 'No se puede agregar la etiqueta');
          return;
        }
        
        // Agregar etiqueta
        const newLabel = await whatsappLabelsService.addLabelToProspecto(
          prospectoId,
          label.id,
          label.type,
          false, // shadow_cell por defecto false
          user.id
        );
        
        // Esperar 100ms para asegurar que la BD confirme la transacción
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setProspectoLabels(prev => [...prev, newLabel]);
        toast.success(`Etiqueta "${label.name}" agregada`);
      }
      
      onLabelsUpdate?.();
    } catch (error: any) {
      console.error('Error al gestionar etiqueta:', error);
      toast.error(error.message || 'Error al gestionar la etiqueta');
    } finally {
      setSaving(false);
    }
  };
  
  const handleToggleShadow = async (label: ConversationLabel) => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      await whatsappLabelsService.toggleShadowCell(
        prospectoId,
        label.label_id,
        label.label_type,
        !label.shadow_cell,
        user.id
      );
      
      // Actualizar estado local
      setProspectoLabels(prev =>
        prev.map(cl => ({
          ...cl,
          shadow_cell: cl.id === label.id ? !cl.shadow_cell : false, // Solo una puede tener shadow
        }))
      );
      
      toast.success(
        !label.shadow_cell ? 'Sombreado activado' : 'Sombreado desactivado'
      );
      onLabelsUpdate?.();
    } catch (error) {
      console.error('Error al cambiar sombreado:', error);
      toast.error('Error al cambiar el sombreado');
    } finally {
      setSaving(false);
    }
  };
  
  // ============================================
  // FUNCIONES PARA ETIQUETAS PERSONALIZADAS
  // ============================================
  
  const handleCreateCustomLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !newLabelName.trim()) return;
    
    setCreating(true);
    try {
      const newLabel = await whatsappLabelsService.createCustomLabel(
        user.id,
        newLabelName.trim(),
        newLabelColor,
        newLabelDescription.trim() || undefined
      );
      
      // Agregar al estado con TODOS los campos necesarios (isOwner, creatorName, etc.)
      setAvailableLabels(prev => ({
        ...prev,
        custom: [
          {
            ...newLabel,
            isOwner: true, // El usuario actual la acaba de crear
            creatorName: user.full_name || user.email || 'Tú',
            creatorId: user.id,
          },
          ...prev.custom
        ],
      }));
      
      // Limpiar form
      setNewLabelName('');
      setNewLabelDescription('');
      setNewLabelColor(CUSTOM_LABEL_COLORS[0].hex);
      setShowCreateForm(false);
      
      toast.success(`Etiqueta "${newLabel.name}" creada y lista para usar`);
    } catch (error: any) {
      console.error('Error creando etiqueta:', error);
      toast.error(error.message || 'Error al crear la etiqueta');
    } finally {
      setCreating(false);
    }
  };
  
  const handleDeleteCustomLabel = async (labelId: string, labelName: string) => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      await whatsappLabelsService.deleteCustomLabel(labelId, user.id);
      
      // Actualizar estado local inmediatamente
      setAvailableLabels(prev => ({
        ...prev,
        custom: prev.custom.filter(l => l.id !== labelId),
      }));
      
      // Remover del prospecto actual si estaba aplicada
      setProspectoLabels(prev =>
        prev.filter(cl => !(cl.label_id === labelId && cl.label_type === 'custom'))
      );
      
      toast.success(`Etiqueta "${labelName}" eliminada`);
      onLabelsUpdate?.();
    } catch (error) {
      console.error('Error eliminando etiqueta:', error);
      toast.error('Error al eliminar la etiqueta');
    } finally {
      setSaving(false);
    }
  };
  
  // ============================================
  // UTILIDADES
  // ============================================
  
  const isLabelActive = (labelId: string, labelType: 'preset' | 'custom'): boolean => {
    return prospectoLabels.some(cl => cl.label_id === labelId && cl.label_type === labelType);
  };
  
  const getActiveLabel = (labelId: string, labelType: 'preset' | 'custom'): ConversationLabel | undefined => {
    return prospectoLabels.find(cl => cl.label_id === labelId && cl.label_type === labelType);
  };
  
  const canCreateMore = availableLabels.custom.length < LABEL_LIMITS.MAX_CUSTOM_LABELS_PER_USER;
  const canAddMore = prospectoLabels.length < LABEL_LIMITS.MAX_LABELS_PER_CONVERSATION;
  
  // ============================================
  // RENDER
  // ============================================
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-[9999]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
        >
          {/* Header */}
          <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-0.5 shadow-lg"
                  >
                    <div className="w-full h-full rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center">
                      <Tag className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Gestionar Etiquetas
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {prospectoName}
                    </p>
                  </div>
                </div>
                
                {/* Contador de etiquetas */}
                <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400 mt-3">
                  <span className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span>{prospectoLabels.length}/{LABEL_LIMITS.MAX_LABELS_PER_CONVERSATION} etiquetas aplicadas</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span>{availableLabels.custom.length}/{LABEL_LIMITS.MAX_CUSTOM_LABELS_PER_USER} personalizadas</span>
                  </span>
                </div>
              </div>
              
              <motion.button
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.25 }}
                onClick={onClose}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 group"
              >
                <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
              </motion.button>
            </div>
          </div>
          
          {/* Content */}
          <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Etiquetas Predefinidas */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Etiquetas del Sistema
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {availableLabels.preset.map((label, index) => {
                      const isActive = isLabelActive(label.id, 'preset');
                      const activeLabel = getActiveLabel(label.id, 'preset');
                      
                      return (
                        <motion.div
                          key={label.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 + index * 0.03 }}
                        >
                          <button
                            onClick={() => handleToggleLabel(label)}
                            disabled={saving || (!isActive && !canAddMore)}
                            className={`w-full p-3 rounded-xl border-2 transition-all duration-200 text-left group ${
                              isActive
                                ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            } ${!isActive && !canAddMore ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 flex-1">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: label.color }}
                                ></div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {label.name}
                                </span>
                              </div>
                              {isActive && (
                                <Check className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                            {label.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {label.description}
                              </p>
                            )}
                          </button>
                          
                          {/* Checkbox de sombrear celda */}
                          {isActive && activeLabel && (
                            <motion.label
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="flex items-center space-x-2 mt-2 px-3 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={activeLabel.shadow_cell}
                                onChange={() => handleToggleShadow(activeLabel)}
                                disabled={saving}
                                className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                Sombrear celda
                              </span>
                            </motion.label>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
                
                {/* Etiquetas Personalizadas - Mis Etiquetas */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Mis Etiquetas
                      </h4>
                    </div>
                    
                    {!showCreateForm && canCreateMore && (
                      <button
                        onClick={() => setShowCreateForm(true)}
                        className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nueva</span>
                      </button>
                    )}
                  </div>
                  
                  {/* Formulario de creación */}
                  {showCreateForm && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleCreateCustomLabel}
                      className="mb-4 p-4 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/10"
                    >
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                            Nombre de la etiqueta
                          </label>
                          <input
                            type="text"
                            value={newLabelName}
                            onChange={(e) => setNewLabelName(e.target.value)}
                            placeholder="Ej: VIP, Urgente, etc."
                            maxLength={50}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50 dark:text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center space-x-1">
                            <Palette className="w-3.5 h-3.5" />
                            <span>Color</span>
                          </label>
                          <div className="grid grid-cols-6 gap-2">
                            {CUSTOM_LABEL_COLORS.map(color => (
                              <button
                                key={color.hex}
                                type="button"
                                onClick={() => setNewLabelColor(color.hex)}
                                className={`w-full h-8 rounded-lg transition-all ${
                                  newLabelColor === color.hex
                                    ? 'ring-2 ring-offset-2 ring-purple-500 dark:ring-offset-gray-900'
                                    : 'hover:scale-110'
                                }`}
                                style={{ backgroundColor: color.hex }}
                                title={color.name}
                              />
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            type="submit"
                            disabled={!newLabelName.trim() || creating}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-purple-500/25"
                          >
                            {creating ? (
                              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                            ) : (
                              'Crear Etiqueta'
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCreateForm(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </motion.form>
                  )}
                  
                  {/* Lista de MIS etiquetas personalizadas */}
                  {(() => {
                    const myLabels = availableLabels.custom.filter(l => l.isOwner);
                    
                    // Etiquetas del Equipo: SOLO las que están aplicadas a ESTE prospecto Y no son mías
                    const otherLabelsApplied = prospectoLabels
                      .filter(pl => pl.label_type === 'custom')
                      .map(pl => {
                        const labelData = availableLabels.custom.find(l => l.id === pl.label_id);
                        return labelData && !labelData.isOwner ? labelData : null;
                      })
                      .filter(Boolean);
                    
                    return (
                      <>
                        {myLabels.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No tienes etiquetas personalizadas</p>
                            <p className="text-xs mt-1">Crea hasta {LABEL_LIMITS.MAX_CUSTOM_LABELS_PER_USER} etiquetas personalizadas</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {myLabels.map((label, index) => {
                        const isActive = isLabelActive(label.id, 'custom');
                        const activeLabel = getActiveLabel(label.id, 'custom');
                        
                        return (
                          <motion.div
                            key={label.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.25 + index * 0.03 }}
                            className="space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleToggleLabel(label)}
                                disabled={saving || (!isActive && !canAddMore)}
                                className={`flex-1 p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                                  isActive
                                    ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                } ${!isActive && !canAddMore ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: label.color }}
                                    ></div>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      {label.name}
                                    </span>
                                  </div>
                                  {isActive && (
                                    <Check className="w-4 h-4 text-green-600" />
                                  )}
                                </div>
                              </button>
                              
                              <button
                                onClick={() => handleDeleteCustomLabel(label.id, label.name)}
                                disabled={saving}
                                className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
                                title="Eliminar etiqueta"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            {/* Checkbox de sombrear celda */}
                            {isActive && activeLabel && (
                              <motion.label
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center space-x-2 px-3 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={activeLabel.shadow_cell}
                                  onChange={() => handleToggleShadow(activeLabel)}
                                  disabled={saving}
                                  className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  Sombrear celda
                                </span>
                              </motion.label>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Etiquetas del Equipo - SOLO las aplicadas a este prospecto */}
                  {otherLabelsApplied.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-1 h-5 bg-gradient-to-b from-gray-400 to-gray-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Etiquetas de Otros Usuarios
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Estas etiquetas fueron aplicadas por otros usuarios en esta conversación.
                      </p>
                      <div className="space-y-2">
                        {otherLabelsApplied.map((label: any, index: number) => {
                          // Buscar la etiqueta aplicada para obtener permisos
                          const appliedLabel = prospectoLabels.find(
                            pl => pl.label_id === label.id && pl.label_type === 'custom'
                          );
                          const canRemove = appliedLabel?.can_remove || false;
                          
                          console.log(`🔐 [Permisos] ${label.name}:`, {
                            appliedLabel: appliedLabel?.id,
                            can_remove: canRemove,
                            remove_reason: appliedLabel?.remove_reason
                          });
                          
                          return (
                            <motion.div
                              key={label.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.35 + index * 0.03 }}
                            >
                              <div className="flex items-center space-x-2">
                                <div className={`flex-1 p-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 ${!canRemove ? 'opacity-60' : ''}`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: label.color }}
                                      ></div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                          {label.name}
                                        </span>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          Creada por: {label.creatorName}
                                        </p>
                                      </div>
                                    </div>
                                    {!canRemove && (
                                      <div className="text-xs text-gray-400">
                                        Solo referencia
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Botón quitar si tiene permisos */}
                                {canRemove && appliedLabel && (
                                  <button
                                    onClick={async () => {
                                      if (!user?.id) return;
                                      setSaving(true);
                                      try {
                                        await whatsappLabelsService.removeLabelFromProspecto(
                                          prospectoId,
                                          label.id,
                                          'custom'
                                        );
                                        setProspectoLabels(prev => 
                                          prev.filter(pl => !(pl.label_id === label.id && pl.label_type === 'custom'))
                                        );
                                        toast.success(`Etiqueta "${label.name}" removida`);
                                        onLabelsUpdate?.();
                                      } catch (error: any) {
                                        console.error('Error removiendo etiqueta:', error);
                                        toast.error(error.message || 'Error al remover la etiqueta');
                                      } finally {
                                        setSaving(false);
                                      }
                                    }}
                                    disabled={saving}
                                    className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
                                    title="Remover etiqueta (tienes permisos)"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
                </motion.div>
                
                {/* Advertencias */}
                {!canAddMore && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start space-x-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                        Máximo de etiquetas alcanzado
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                        Solo puedes agregar hasta {LABEL_LIMITS.MAX_LABELS_PER_CONVERSATION} etiquetas por conversación. Remueve alguna para agregar otra.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
            >
              Cerrar
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

