import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  Plus, Pencil, Trash2, X, Save, Loader2, ChevronRight,
  FileText, Eye, EyeOff, AlertCircle, Type, ListFilter,
  Bold, Italic, Strikethrough, Code, Variable,
  Mail, Landmark, Phone, DollarSign, Target, PenLine, Building,
  Plane, Palmtree, Star, Bell, BarChart3, Handshake, Briefcase,
  MapPin, Heart, Shield, Gift, Clock, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  presetMessagesService,
} from '../../services/presetMessagesService';
import type {
  PresetMessageCategory,
  PresetMessage,
  PresetVariable,
} from '../../services/presetMessagesService';

// ============================================
// ICON CATALOG - Vectores en lugar de emojis
// ============================================

const ICON_CATALOG: Record<string, React.FC<{ className?: string }>> = {
  FileText, Mail, Landmark, Phone, DollarSign, Target, PenLine, Building,
  Plane, Palmtree, Star, Bell, BarChart3, Handshake, Briefcase,
  MapPin, Heart, Shield, Gift, Clock, Users,
};

const ICON_NAMES = Object.keys(ICON_CATALOG);

const CategoryIcon: React.FC<{ iconName: string; className?: string }> = ({ iconName, className = 'w-4 h-4' }) => {
  const IconComponent = ICON_CATALOG[iconName];
  if (IconComponent) return <IconComponent className={className} />;
  return <FileText className={className} />;
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const PresetMessagesManager: React.FC = () => {
  const [categories, setCategories] = useState<PresetMessageCategory[]>([]);
  const [messages, setMessages] = useState<PresetMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Modales
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PresetMessageCategory | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<PresetMessage | null>(null);
  const [preFillCategoryId, setPreFillCategoryId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'category' | 'message'; id: string; name: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, msgs] = await Promise.all([
        presetMessagesService.getCategories(false),
        presetMessagesService.getMessages(false),
      ]);
      setCategories(cats);
      setMessages(msgs);
      if (!selectedCategory && cats.length > 0) setSelectedCategory(cats[0].id);
    } catch (err) {
      toast.error('Error al cargar mensajes predefinidos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredMessages = useMemo(() => {
    if (!selectedCategory) return messages;
    return messages.filter(m => m.category_id === selectedCategory);
  }, [messages, selectedCategory]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!showDeleteConfirm) return;
    try {
      if (showDeleteConfirm.type === 'category') {
        await presetMessagesService.deleteCategory(showDeleteConfirm.id);
        toast.success('Categoría eliminada');
        if (selectedCategory === showDeleteConfirm.id) setSelectedCategory(null);
      } else {
        await presetMessagesService.deleteMessage(showDeleteConfirm.id);
        toast.success('Mensaje eliminado');
      }
      loadData();
    } catch (err) {
      toast.error('Error al eliminar');
      console.error(err);
    } finally {
      setShowDeleteConfirm(null);
    }
  }, [showDeleteConfirm, loadData, selectedCategory]);

  const handleToggleActive = useCallback(async (type: 'category' | 'message', id: string, currentActive: boolean) => {
    try {
      if (type === 'category') {
        await presetMessagesService.updateCategory(id, { is_active: !currentActive });
      } else {
        await presetMessagesService.updateMessage(id, { is_active: !currentActive });
      }
      loadData();
      toast.success(currentActive ? 'Desactivado' : 'Activado');
    } catch (err) {
      toast.error('Error al actualizar');
      console.error(err);
    }
  }, [loadData]);

  const selectedCategoryData = useMemo(() =>
    categories.find(c => c.id === selectedCategory),
  [categories, selectedCategory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Mensajes Predefinidos</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {categories.length} categorías · {messages.length} mensajes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Categoría
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setEditingMessage(null); setPreFillCategoryId(selectedCategory); setShowMessageModal(true); }}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Mensaje
            </motion.button>
          </div>
        </div>
      </div>

      {/* Layout: Sidebar categorías + Data grid mensajes */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar de categorías */}
        <div className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
          <div className="p-3 space-y-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                !selectedCategory
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                <span>Todos</span>
                <span className="ml-auto text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{messages.length}</span>
              </div>
            </button>
            {categories.map(cat => {
              const count = messages.filter(m => m.category_id === cat.id).length;
              return (
                <div key={cat.id} className="group relative">
                  <button
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } ${!cat.is_active ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CategoryIcon iconName={cat.icon} className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{cat.name}</span>
                      <span className="ml-auto text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{count}</span>
                    </div>
                  </button>
                  {/* Acciones hover */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-0.5 py-0.5">
                    <button
                      onClick={() => { setEditingCategory(cat); setShowCategoryModal(true); }}
                      className="p-1 rounded text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm({ type: 'category', id: cat.id, name: cat.name })}
                      className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data Grid de mensajes */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header de categoría seleccionada */}
          {selectedCategoryData && (
            <div className="px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CategoryIcon iconName={selectedCategoryData.icon} className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{selectedCategoryData.name}</span>
                {selectedCategoryData.description && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">— {selectedCategoryData.description}</span>
                )}
                {!selectedCategoryData.is_active && (
                  <span className="text-[10px] text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full font-medium">Inactiva</span>
                )}
              </div>
              <button
                onClick={() => handleToggleActive('category', selectedCategoryData.id, selectedCategoryData.is_active)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {selectedCategoryData.is_active ? 'Desactivar categoría' : 'Activar categoría'}
              </button>
            </div>
          )}

          {/* Tabla */}
          <div className="flex-1 overflow-auto">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-20">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-base font-medium text-gray-700 dark:text-gray-300 mb-1">Sin mensajes</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Crea un mensaje predefinido para esta categoría</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Título</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contenido</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Variables</th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {filteredMessages.map((msg, idx) => {
                    const cat = categories.find(c => c.id === msg.category_id);
                    return (
                      <motion.tr
                        key={msg.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`group hover:bg-emerald-50/30 dark:hover:bg-emerald-900/5 transition-colors ${!msg.is_active ? 'opacity-50' : ''}`}
                      >
                        {/* Título + Categoría */}
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2.5">
                            {cat && !selectedCategory && (
                              <CategoryIcon iconName={cat.icon} className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                              {msg.title}
                            </span>
                          </div>
                          {cat && !selectedCategory && (
                            <p className="text-[10px] text-gray-400 mt-0.5">{cat.name}</p>
                          )}
                        </td>

                        {/* Contenido preview */}
                        <td className="px-4 py-3.5">
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 max-w-[300px] whitespace-pre-line leading-relaxed">
                            {msg.content.length > 120 ? msg.content.substring(0, 120) + '...' : msg.content}
                          </p>
                        </td>

                        {/* Variables */}
                        <td className="px-4 py-3.5">
                          {msg.variables.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {msg.variables.map(v => (
                                <span
                                  key={v.name}
                                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-medium rounded-md ${
                                    v.type === 'dropdown'
                                      ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                                      : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                  }`}
                                >
                                  {v.type === 'dropdown' ? <ListFilter className="w-2.5 h-2.5" /> : <Type className="w-2.5 h-2.5" />}
                                  {v.label}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-300 dark:text-gray-600">Sin variables</span>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => handleToggleActive('message', msg.id, msg.is_active)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                              msg.is_active
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {msg.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {msg.is_active ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => { setEditingMessage(msg); setPreFillCategoryId(null); setShowMessageModal(true); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              title="Editar mensaje"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setShowDeleteConfirm({ type: 'message', id: msg.id, name: msg.title })}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Eliminar mensaje"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modales */}
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => { setShowCategoryModal(false); setEditingCategory(null); }}
        onSaved={loadData}
        editing={editingCategory}
      />

      <MessageEditorModal
        isOpen={showMessageModal}
        onClose={() => { setShowMessageModal(false); setEditingMessage(null); setPreFillCategoryId(null); }}
        onSaved={loadData}
        editing={editingMessage}
        categories={categories}
        preFillCategoryId={preFillCategoryId}
      />

      <DeleteConfirmModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        itemName={showDeleteConfirm?.name || ''}
        itemType={showDeleteConfirm?.type || 'message'}
      />
    </div>
  );
};

// ============================================
// CategoryModal - con iconos vectorizados
// ============================================

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: PresetMessageCategory | null;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSaved, editing }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('FileText');
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editing) {
        setName(editing.name);
        setDescription(editing.description || '');
        setIcon(editing.icon);
        setSortOrder(editing.sort_order);
      } else {
        setName('');
        setDescription('');
        setIcon('FileText');
        setSortOrder(0);
      }
    }
  }, [isOpen, editing]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await presetMessagesService.updateCategory(editing.id, { name, description, icon, sort_order: sortOrder });
        toast.success('Categoría actualizada');
      } else {
        await presetMessagesService.createCategory({ name, description, icon, sort_order: sortOrder });
        toast.success('Categoría creada');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Error al guardar');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

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
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800"
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editing ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <motion.button onClick={onClose} whileHover={{ scale: 1.05, rotate: 90 }} whileTap={{ scale: 0.95 }} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Icono vectorizado */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Icono</label>
                <div className="grid grid-cols-7 gap-1.5">
                  {ICON_NAMES.map(name => {
                    const IconComp = ICON_CATALOG[name];
                    return (
                      <button
                        key={name}
                        onClick={() => setIcon(name)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                          icon === name
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 ring-2 ring-emerald-500 text-emerald-600 dark:text-emerald-400 scale-110'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                        title={name}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nombre */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej: Datos Bancarios"
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                />
              </div>

              {/* Descripción */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Descripción <span className="text-gray-400">(opcional)</span></label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Breve descripción de la categoría"
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                />
              </div>

              {/* Orden */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Orden</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={e => setSortOrder(parseInt(e.target.value) || 0)}
                  className="w-24 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing ? 'Guardar' : 'Crear'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

// ============================================
// MessageEditorModal - 30% más ancho (max-w-5xl)
// ============================================

interface MessageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: PresetMessage | null;
  categories: PresetMessageCategory[];
  preFillCategoryId: string | null;
}

const MessageEditorModal: React.FC<MessageEditorModalProps> = ({
  isOpen, onClose, onSaved, editing, categories, preFillCategoryId,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [variables, setVariables] = useState<PresetVariable[]>([]);
  const [saving, setSaving] = useState(false);
  const [showVarForm, setShowVarForm] = useState(false);
  const contentRef = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editing) {
        setTitle(editing.title);
        setContent(editing.content);
        setCategoryId(editing.category_id);
        setSortOrder(editing.sort_order);
        setVariables([...editing.variables]);
      } else {
        setTitle('');
        setContent('');
        setCategoryId(preFillCategoryId || (categories[0]?.id || ''));
        setSortOrder(0);
        setVariables([]);
      }
      setShowVarForm(false);
    }
  }, [isOpen, editing, preFillCategoryId, categories]);

  const insertFormat = useCallback((before: string, after: string) => {
    const ta = contentRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = `${before}${selected || 'texto'}${after}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      ta.focus();
      const newCursorPos = start + before.length;
      ta.setSelectionRange(newCursorPos, newCursorPos + (selected || 'texto').length);
    }, 0);
  }, [content]);

  const insertVariable = useCallback((varName: string) => {
    const ta = contentRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const newContent = content.substring(0, pos) + `{{${varName}}}` + content.substring(pos);
    setContent(newContent);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(pos + varName.length + 4, pos + varName.length + 4);
    }, 0);
  }, [content]);

  const addVariable = useCallback((newVar: PresetVariable) => {
    setVariables(prev => [...prev, newVar]);
    setShowVarForm(false);
    insertVariable(newVar.name);
  }, [insertVariable]);

  const removeVariable = useCallback((name: string) => {
    setVariables(prev => prev.filter(v => v.name !== name));
    setContent(prev => prev.replaceAll(`{{${name}}}`, ''));
  }, []);

  const handleSave = async () => {
    if (!title.trim() || !content.trim() || !categoryId) return;
    setSaving(true);
    try {
      const data = { title, content, category_id: categoryId, sort_order: sortOrder, variables };
      if (editing) {
        await presetMessagesService.updateMessage(editing.id, data);
        toast.success('Mensaje actualizado');
      } else {
        await presetMessagesService.createMessage(data);
        toast.success('Mensaje creado');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Error al guardar');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const preview = useMemo(() => {
    let text = content;
    for (const v of variables) {
      text = text.replaceAll(`{{${v.name}}}`, `[${v.label}]`);
    }
    return text;
  }, [content, variables]);

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
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editing ? 'Editar Mensaje' : 'Nuevo Mensaje Predefinido'}
              </h3>
              <motion.button onClick={onClose} whileHover={{ scale: 1.05, rotate: 90 }} whileTap={{ scale: 0.95 }} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x lg:divide-gray-200 lg:dark:divide-gray-700">
                {/* Columna izquierda: Editor */}
                <div className="px-6 py-5 space-y-4">
                  {/* Título */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Título del mensaje</label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Ej: Datos para depósito"
                      className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Categoría */}
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Categoría</label>
                      <select
                        value={categoryId}
                        onChange={e => setCategoryId(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                      >
                        <option value="">Seleccionar...</option>
                        {categories.filter(c => c.is_active).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-20 space-y-1">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Orden</label>
                      <input
                        type="number"
                        value={sortOrder}
                        onChange={e => setSortOrder(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Toolbar de formato WhatsApp */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Contenido del mensaje</label>
                    <div className="flex items-center gap-1 p-1.5 bg-gray-50 dark:bg-gray-800 rounded-t-xl border border-b-0 border-gray-200 dark:border-gray-700">
                      <button onClick={() => insertFormat('*', '*')} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Negrita (*texto*)">
                        <Bold className="w-4 h-4" />
                      </button>
                      <button onClick={() => insertFormat('_', '_')} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Cursiva (_texto_)">
                        <Italic className="w-4 h-4" />
                      </button>
                      <button onClick={() => insertFormat('~', '~')} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Tachado (~texto~)">
                        <Strikethrough className="w-4 h-4" />
                      </button>
                      <button onClick={() => insertFormat('```', '```')} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Monoespaciado">
                        <Code className="w-4 h-4" />
                      </button>
                      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
                      <button onClick={() => setShowVarForm(true)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center gap-1" title="Insertar variable">
                        <Variable className="w-3.5 h-3.5" />
                        Variable
                      </button>
                      {variables.length > 0 && (
                        <>
                          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
                          <div className="flex gap-1 flex-wrap">
                            {variables.map(v => (
                              <button key={v.name} onClick={() => insertVariable(v.name)} className="px-2 py-1 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors" title={`Insertar {{${v.name}}}`}>
                                {v.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <textarea
                      ref={contentRef}
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder={"Escribe el mensaje aquí...\n\nUsa *negritas*, _cursivas_, ~tachado~\nInserta variables con el botón Variable"}
                      rows={10}
                      className="w-full px-3 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-b-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white placeholder-gray-400 resize-none font-mono"
                    />
                  </div>

                  {/* Variables configuradas */}
                  {variables.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Variables configuradas</label>
                      <div className="space-y-2">
                        {variables.map(v => (
                          <div key={v.name} className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-md ${
                              v.type === 'dropdown'
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            }`}>
                              {v.type === 'dropdown' ? 'Dropdown' : 'Texto'}
                            </span>
                            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium flex-1">{v.label}</span>
                            <code className="text-[10px] text-gray-400">{`{{${v.name}}}`}</code>
                            {v.type === 'dropdown' && v.options && (
                              <span className="text-[10px] text-gray-400">{v.options.length} opciones</span>
                            )}
                            <button onClick={() => removeVariable(v.name)} className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Formulario inline para nueva variable */}
                  <AnimatePresence>
                    {showVarForm && (
                      <VariableForm
                        onAdd={addVariable}
                        onCancel={() => setShowVarForm(false)}
                        existingNames={variables.map(v => v.name)}
                      />
                    )}
                  </AnimatePresence>
                </div>

                {/* Columna derecha: Preview */}
                <div className="px-6 py-5 bg-gray-50 dark:bg-gray-800/30">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    Vista previa WhatsApp
                  </h4>
                  <div className="bg-[#e5ddd5] dark:bg-[#0b141a] rounded-xl p-4 min-h-[250px]"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'300\' height=\'300\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'a\' patternUnits=\'userSpaceOnUse\' width=\'20\' height=\'20\'%3E%3Ccircle cx=\'10\' cy=\'10\' r=\'0.5\' fill=\'%23ccc\' opacity=\'0.3\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23a)\'/%3E%3C/svg%3E")' }}
                  >
                    {content.trim() ? (
                      <div className="relative max-w-[90%] ml-auto">
                        <div className="bg-[#dcf8c6] dark:bg-[#005c4b] rounded-lg rounded-tr-sm p-3 shadow-sm">
                          <WhatsAppPreview text={preview} />
                          <div className="flex justify-end mt-1">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">12:00 PM</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-500 text-sm">
                        El mensaje aparecerá aquí
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                    *negritas* · _cursivas_ · ~tachado~ · ```monoespaciado```
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={!title.trim() || !content.trim() || !categoryId || saving}
                className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing ? 'Guardar cambios' : 'Crear mensaje'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

// ============================================
// VariableForm
// ============================================

interface VariableFormProps {
  onAdd: (variable: PresetVariable) => void;
  onCancel: () => void;
  existingNames: string[];
}

const VariableForm: React.FC<VariableFormProps> = ({ onAdd, onCancel, existingNames }) => {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'text' | 'dropdown'>('text');
  const [placeholder, setPlaceholder] = useState('');
  const [defaultValue, setDefaultValue] = useState('');
  const [optionsText, setOptionsText] = useState('');

  const sanitizedName = useMemo(() =>
    name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, ''),
  [name]);

  const isValid = label.trim() && sanitizedName && !existingNames.includes(sanitizedName)
    && (type !== 'dropdown' || optionsText.trim());

  const handleAdd = () => {
    if (!isValid) return;
    const variable: PresetVariable = {
      name: sanitizedName,
      label: label.trim(),
      type,
      placeholder: placeholder.trim() || undefined,
      default_value: defaultValue.trim() || undefined,
      options: type === 'dropdown' ? optionsText.split('\n').map(o => o.trim()).filter(Boolean) : undefined,
    };
    onAdd(variable);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
            <Variable className="w-3.5 h-3.5" />
            Nueva Variable
          </h5>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-gray-500">Etiqueta</label>
            <input type="text" value={label} onChange={e => { setLabel(e.target.value); if (!name) setName(e.target.value); }} placeholder="Ej: Correo" className="w-full px-2.5 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-gray-500">Tipo</label>
            <select value={type} onChange={e => setType(e.target.value as 'text' | 'dropdown')} className="w-full px-2.5 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white">
              <option value="text">Texto libre</option>
              <option value="dropdown">Dropdown (opciones)</option>
            </select>
          </div>
        </div>

        {sanitizedName && (
          <p className="text-[10px] text-gray-400">
            ID: <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{`{{${sanitizedName}}}`}</code>
          </p>
        )}

        {type === 'text' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-gray-500">Placeholder</label>
              <input type="text" value={placeholder} onChange={e => setPlaceholder(e.target.value)} placeholder="Texto de ayuda" className="w-full px-2.5 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-gray-500">Valor por defecto</label>
              <input type="text" value={defaultValue} onChange={e => setDefaultValue(e.target.value)} placeholder="Opcional" className="w-full px-2.5 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white" />
            </div>
          </div>
        )}

        {type === 'dropdown' && (
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-gray-500">Opciones (una por línea)</label>
              <textarea value={optionsText} onChange={e => setOptionsText(e.target.value)} placeholder={"vidavacations.com\ngrupovidanta.com"} rows={3} className="w-full px-2.5 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white resize-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-gray-500">Valor por defecto</label>
              <input type="text" value={defaultValue} onChange={e => setDefaultValue(e.target.value)} placeholder="Opcional" className="w-full px-2.5 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white" />
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAdd} disabled={!isValid} className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5">
            <Plus className="w-3 h-3" />
            Agregar variable
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// WhatsAppPreview
// ============================================

const WhatsAppPreview: React.FC<{ text: string }> = ({ text }) => {
  const renderFormatted = (input: string): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    const lines = input.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) result.push(<br key={`br-${i}`} />);
      result.push(...parseWhatsAppLine(lines[i], i));
    }
    return result;
  };

  const parseWhatsAppLine = (line: string, lineIdx: number): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    const regex = /(\*[^*]+\*)|(_[^_]+_)|(~[^~]+~)|(```[^`]+```)|\[([^\]]+)\]/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) result.push(line.substring(lastIndex, match.index));
      if (match[1]) result.push(<strong key={`b-${lineIdx}-${match.index}`} className="font-bold">{match[1].slice(1, -1)}</strong>);
      else if (match[2]) result.push(<em key={`i-${lineIdx}-${match.index}`} className="italic">{match[2].slice(1, -1)}</em>);
      else if (match[3]) result.push(<s key={`s-${lineIdx}-${match.index}`}>{match[3].slice(1, -1)}</s>);
      else if (match[4]) result.push(<code key={`c-${lineIdx}-${match.index}`} className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs font-mono">{match[4].slice(3, -3)}</code>);
      else if (match[5]) result.push(<span key={`v-${lineIdx}-${match.index}`} className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[10px] font-medium">{match[5]}</span>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length) result.push(line.substring(lastIndex));
    return result;
  };

  return (
    <p className="text-[13px] text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-line break-words">
      {renderFormatted(text)}
    </p>
  );
};

// ============================================
// DeleteConfirmModal
// ============================================

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: 'category' | 'message';
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ isOpen, onClose, onConfirm, itemName, itemType }) => {
  if (!isOpen) return null;
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Eliminar {itemType === 'category' ? 'categoría' : 'mensaje'}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              ¿Estás seguro que deseas eliminar <strong className="text-gray-900 dark:text-white">"{itemName}"</strong>?
              {itemType === 'category' && ' Todos los mensajes de esta categoría también serán eliminados.'}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/25">Eliminar</motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export { CategoryIcon, ICON_CATALOG };
export default PresetMessagesManager;
