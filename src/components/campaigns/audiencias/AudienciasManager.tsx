import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  X, 
  Users, 
  Heart, 
  User as UserIcon, 
  UserPlus, 
  Baby,
  FileText,
  MessageSquare,
  Tag,
  MapPin,
  Check,
  Edit2,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { analysisSupabase } from '../../../config/analysisSupabase';
import type {
  WhatsAppAudience,
  CreateAudienceInput,
  ProspectoEtapa,
  EstadoCivil,
} from '../../../types/whatsappTemplates';
import {
  PROSPECTO_ETAPAS,
  DESTINOS,
  ESTADOS_CIVILES,
  VIAJA_CON_OPTIONS,
} from '../../../types/whatsappTemplates';

const AudienciasManager: React.FC = () => {
  const [audiences, setAudiences] = useState<WhatsAppAudience[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAudience, setEditingAudience] = useState<WhatsAppAudience | null>(null);

  useEffect(() => {
    loadAudiences();
  }, []);

  const loadAudiences = async () => {
    try {
      setLoading(true);
      
      // Cargar todas las audiencias de la BD (incluyendo Global y las de etapa)
      const dynamicAudiences: WhatsAppAudience[] = [];
      
      try {
        const { data: savedAudiences, error } = await analysisSupabase
          .from('whatsapp_audiences')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (!error && savedAudiences && savedAudiences.length > 0) {
          // Recalcular conteo para cada audiencia guardada usando filtros de prospectos
          for (const aud of savedAudiences) {
            let query = analysisSupabase
              .from('prospectos')
              .select('id', { count: 'exact', head: true });
            
            // Filtro de etapa
            if (aud.etapa) {
              query = query.eq('etapa', aud.etapa);
            }
            
            // Filtro de estado civil
            if (aud.estado_civil) {
              query = query.eq('estado_civil', aud.estado_civil);
            }
            
            // Filtro de viaja_con
            if (aud.viaja_con && aud.viaja_con.length > 0) {
              query = query.in('viaja_con', aud.viaja_con);
            }
            
            // Filtro de destinos (overlaps con el array)
            if (aud.destinos && aud.destinos.length > 0) {
              query = query.overlaps('destino_preferencia', aud.destinos);
            }
            
            const { count } = await query;
            
            dynamicAudiences.push({
              ...aud,
              prospectos_count: count || 0,
            });
          }
        }
      } catch (dbError) {
        console.log('Error cargando audiencias de BD:', dbError);
      }
      
      setAudiences(dynamicAudiences);
    } catch (error) {
      console.error('Error loading audiences:', error);
      toast.error('Error al cargar audiencias');
      
      // Fallback: mostrar al menos la audiencia Global
      setAudiences([{
        id: 'global',
        nombre: 'Global - Todos los Prospectos',
        descripcion: 'Incluye a todos los prospectos',
        etapa: null,
        destinos: [],
        estado_civil: null,
        viaja_con: [],
        prospectos_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === 'global' || id.startsWith('etapa-')) {
      toast.error('No se pueden eliminar audiencias del sistema');
      return;
    }

    if (!confirm('¿Estás seguro de eliminar esta audiencia?')) {
      return;
    }

    try {
      const { error } = await analysisSupabase
        .from('whatsapp_audiences')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast.success('Audiencia eliminada');
      loadAudiences();
    } catch (error) {
      console.error('Error deleting audience:', error);
      toast.error('Error al eliminar audiencia');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestión de Audiencias
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Crea y gestiona audiencias para tus campañas de WhatsApp
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setEditingAudience(null);
            setShowCreateModal(true);
          }}
          className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/25"
        >
          <Plus className="w-4 h-4" />
          Crear Audiencia
        </motion.button>
      </div>

      {/* Lista de audiencias */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : audiences.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">No hay audiencias creadas</p>
          <button
            onClick={() => {
              setEditingAudience(null);
              setShowCreateModal(true);
            }}
            className="mt-3 text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            Crear primera audiencia
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {audiences.map((audience) => {
            const isSystem = audience.id === 'global' || audience.id.startsWith('etapa-');
            return (
              <motion.div
                key={audience.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="text-base font-semibold text-gray-900 dark:text-white">
                        {audience.nombre}
                      </h5>
                      {isSystem && (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md">
                          Sistema
                        </span>
                      )}
                    </div>
                    {audience.descripcion && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {audience.descripcion}
                      </p>
                    )}
                  </div>
                  {!isSystem && (
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => {
                          setEditingAudience(audience);
                          setShowCreateModal(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(audience.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-right mb-3">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {audience.prospectos_count.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">prospectos</p>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {audience.etapa && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-md">
                      {audience.etapa}
                    </span>
                  )}
                  {audience.destinos && audience.destinos.length > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" />
                      {audience.destinos.length === 1 ? audience.destinos[0] : `${audience.destinos.length} destinos`}
                    </span>
                  )}
                  {audience.viaja_con && audience.viaja_con.map((tipo) => (
                    <span 
                      key={tipo}
                      className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-md"
                    >
                      {tipo}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal de crear/editar audiencia */}
      <CreateAudienceModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingAudience(null);
        }}
        onCreated={() => {
          loadAudiences();
          setShowCreateModal(false);
          setEditingAudience(null);
        }}
        editingAudience={editingAudience}
      />
    </div>
  );
};

// ============================================
// MODAL DE CREACIÓN/EDICIÓN DE AUDIENCIA
// ============================================

interface CreateAudienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  editingAudience?: WhatsAppAudience | null;
}

const CreateAudienceModal: React.FC<CreateAudienceModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  editingAudience,
}) => {
  const [formData, setFormData] = useState<CreateAudienceInput>({
    nombre: '',
    descripcion: '',
    etapa: null,
    destinos: [],
    estado_civil: null,
    viaja_con: [],
  });
  const [saving, setSaving] = useState(false);
  const [prospectCount, setProspectCount] = useState<number>(0);
  const [countingProspects, setCountingProspects] = useState(false);

  useEffect(() => {
    if (editingAudience) {
      setFormData({
        nombre: editingAudience.nombre,
        descripcion: editingAudience.descripcion || '',
        etapa: editingAudience.etapa,
        destinos: editingAudience.destinos || [],
        estado_civil: editingAudience.estado_civil,
        viaja_con: editingAudience.viaja_con || [],
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        etapa: null,
        destinos: [],
        estado_civil: null,
        viaja_con: [],
      });
    }
  }, [editingAudience, isOpen]);

  // Calcular prospectos en tiempo real desde la BD
  useEffect(() => {
    if (!isOpen) return;

    const countProspects = async () => {
      setCountingProspects(true);
      try {
        let query = analysisSupabase
          .from('prospectos')
          .select('id', { count: 'exact', head: true });
        
        if (formData.etapa) {
          query = query.eq('etapa', formData.etapa);
        }
        
        if (formData.estado_civil) {
          query = query.eq('estado_civil', formData.estado_civil);
        }
        
        if (formData.viaja_con && formData.viaja_con.length > 0) {
          query = query.in('viaja_con', formData.viaja_con);
        }
        
        if (formData.destinos && formData.destinos.length > 0) {
          query = query.overlaps('destino_preferencia', formData.destinos);
        }
        
        const { count, error } = await query;
        
        if (error) {
          console.error('Error counting prospectos:', error);
          setProspectCount(0);
        } else {
          setProspectCount(count || 0);
        }
      } catch (err) {
        console.error('Error in countProspects:', err);
        setProspectCount(0);
      } finally {
        setCountingProspects(false);
      }
    };
    
    const timer = setTimeout(countProspects, 300);
    return () => clearTimeout(timer);
  }, [formData.etapa, formData.destinos, formData.estado_civil, formData.viaja_con, isOpen]);

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre de la audiencia es requerido');
      return;
    }

    try {
      setSaving(true);
      
      const audienceData: any = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion?.trim() || null,
        etapa: formData.etapa || null,
        estado_civil: formData.estado_civil || null,
        prospectos_count: prospectCount,
        is_active: true,
      };
      
      if (formData.destinos && formData.destinos.length > 0) {
        audienceData.destinos = formData.destinos;
      }
      if (formData.viaja_con && formData.viaja_con.length > 0) {
        audienceData.viaja_con = formData.viaja_con;
      }
      
      if (editingAudience) {
        // Actualizar
        const { error } = await analysisSupabase
          .from('whatsapp_audiences')
          .update(audienceData)
          .eq('id', editingAudience.id);
        
        if (error) throw error;
        toast.success(`Audiencia "${formData.nombre}" actualizada`);
      } else {
        // Crear
        const { error } = await analysisSupabase
          .from('whatsapp_audiences')
          .insert(audienceData)
          .select()
          .single();
        
        if (error) throw error;
        toast.success(`Audiencia "${formData.nombre}" guardada (${prospectCount} prospectos)`);
      }
      
      setFormData({
        nombre: '',
        descripcion: '',
        etapa: null,
        destinos: [],
        estado_civil: null,
        viaja_con: [],
      });
      
      onCreated();
    } catch (error: any) {
      console.error('Error saving audience:', error);
      if (error.message?.includes('destinos') || error.message?.includes('viaja_con')) {
        toast.error(
          'Error: Las columnas destinos/viaja_con no existen. Por favor ejecuta el script SQL: docs/sql/add_destinos_viaja_con_to_audiences.sql',
          { duration: 8000 }
        );
      } else {
        toast.error('Error al guardar audiencia: ' + (error.message || 'Error desconocido'));
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleDestino = (destino: string) => {
    const current = formData.destinos || [];
    if (current.includes(destino)) {
      setFormData({ ...formData, destinos: current.filter(d => d !== destino) });
    } else {
      setFormData({ ...formData, destinos: [...current, destino] });
    }
  };

  const toggleViajaCon = (tipo: string) => {
    const current = formData.viaja_con || [];
    if (current.includes(tipo)) {
      setFormData({ ...formData, viaja_con: current.filter(t => t !== tipo) });
    } else {
      setFormData({ ...formData, viaja_con: [...current, tipo] });
    }
  };

  const getIconForViajaCon = (tipo: string) => {
    switch (tipo) {
      case 'Familia': return Users;
      case 'Pareja': return Heart;
      case 'Solo': return UserIcon;
      case 'Amigos': return UserPlus;
      case 'Hijos': return Baby;
      default: return Users;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-[60]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {editingAudience ? 'Editar Audiencia' : 'Crear Nueva Audiencia'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Define los criterios de segmentación
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Nombre de audiencia */}
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <FileText className="w-4 h-4" />
                  <span>Nombre de Audiencia</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Interesados Riviera Maya"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
                />
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <label className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>Descripción de Audiencia</span>
                  </div>
                  <span className={`${(formData.descripcion?.length || 0) > 300 ? 'text-red-500' : ''}`}>
                    {formData.descripcion?.length || 0}/300
                  </span>
                </label>
                <textarea
                  value={formData.descripcion || ''}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value.slice(0, 300) })}
                  placeholder="Describe el propósito de esta audiencia..."
                  maxLength={300}
                  rows={2}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white resize-none"
                />
              </div>

              {/* Grid de criterios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Etapa */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <Tag className="w-4 h-4" />
                    <span>Etapa del Prospecto</span>
                  </label>
                  <select
                    value={formData.etapa || ''}
                    onChange={(e) => setFormData({ ...formData, etapa: e.target.value as ProspectoEtapa || null })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
                  >
                    <option value="">No aplica</option>
                    {PROSPECTO_ETAPAS.map((etapa) => (
                      <option key={etapa.value} value={etapa.value}>
                        {etapa.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Estado Civil */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <Heart className="w-4 h-4" />
                    <span>Estado Civil</span>
                  </label>
                  <select
                    value={formData.estado_civil || ''}
                    onChange={(e) => setFormData({ ...formData, estado_civil: e.target.value as EstadoCivil || null })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white"
                  >
                    <option value="">No aplica</option>
                    {ESTADOS_CIVILES.map((ec) => (
                      <option key={ec.value} value={ec.value}>
                        {ec.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Destinos (Multi-select) */}
                <div className="space-y-2 md:col-span-2">
                  <label className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>Destinos Preferidos</span>
                    </div>
                    {(formData.destinos?.length || 0) > 0 && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {formData.destinos?.length} seleccionados
                      </span>
                    )}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DESTINOS.map((destino) => {
                      const isSelected = formData.destinos?.includes(destino.value);
                      return (
                        <button
                          key={destino.value}
                          type="button"
                          onClick={() => toggleDestino(destino.value)}
                          className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {destino.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Viaja Con (Multi-select) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Viaja Con
                    </h4>
                  </div>
                  {(formData.viaja_con?.length || 0) > 0 && (
                    <span className="text-xs text-purple-600 dark:text-purple-400">
                      {formData.viaja_con?.length} seleccionados
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {VIAJA_CON_OPTIONS.map((tipo) => {
                    const Icon = getIconForViajaCon(tipo.value);
                    const isSelected = formData.viaja_con?.includes(tipo.value);
                    return (
                      <button
                        key={tipo.value}
                        type="button"
                        onClick={() => toggleViajaCon(tipo.value)}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`} />
                        <span className={`text-xs font-medium ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-600 dark:text-gray-400'}`}>
                          {tipo.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contador de prospectos */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Prospectos que coinciden
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Basado en los criterios seleccionados
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <motion.p 
                      key={prospectCount}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-2xl font-bold text-blue-600 dark:text-blue-400"
                    >
                      {countingProspects ? '...' : prospectCount.toLocaleString()}
                    </motion.p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">prospectos</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Cancelar
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={saving || !formData.nombre.trim()}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25"
              >
                {saving ? 'Guardando...' : editingAudience ? 'Actualizar' : 'Crear Audiencia'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AudienciasManager;

