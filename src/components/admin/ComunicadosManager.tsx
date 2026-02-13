/**
 * ============================================
 * COMUNICADOS MANAGER - Panel Admin
 * ============================================
 *
 * Panel para crear, publicar y gestionar comunicados.
 * Incluye editor de comunicados simples, preview en tiempo real,
 * targeting por coordinacion/usuarios/roles, y gestion de tutoriales interactivos.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Megaphone,
  Send,
  Archive,
  Eye,
  Copy,
  Trash2,
  Edit3,
  X,
  Info,
  Sparkles,
  GraduationCap,
  Wrench,
  AlertTriangle,
  Bell,
  Shield,
  Zap,
  Star,
  Heart,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Settings,
  Globe,
  TrendingUp,
  ChevronDown,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { comunicadosService } from '../../services/comunicadosService';
import { coordinacionService } from '../../services/coordinacionService';
import type { Coordinacion } from '../../services/coordinacionService';
import { useAuth } from '../../contexts/AuthContext';
import type {
  Comunicado,
  ComunicadoTipo,
  ComunicadoEstado,
  ComunicadoTargetType,
  ComunicadoContenido,
  CreateComunicadoParams,
} from '../../types/comunicados';
import {
  COMUNICADO_PRESETS,
  COMUNICADO_TIPO_COLORS,
  INTERACTIVE_COMUNICADOS,
} from '../../types/comunicados';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Info, Sparkles, GraduationCap, Wrench, AlertTriangle, Bell, Shield, Zap,
  Star, Heart, MessageSquare, Calendar, Clock, CheckCircle, XCircle,
  Users, Settings, Globe, Megaphone, TrendingUp,
};

const ICON_NAMES = Object.keys(ICON_MAP);

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'administrador_operativo', label: 'Admin Operativo' },
  { value: 'coordinador', label: 'Coordinador' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'ejecutivo', label: 'Ejecutivo' },
];

const ESTADO_FILTERS: { value: ComunicadoEstado | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'borrador', label: 'Borradores' },
  { value: 'activo', label: 'Activos' },
  { value: 'archivado', label: 'Archivados' },
];

const ComunicadosManager: React.FC = () => {
  const { user } = useAuth();
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [coordinaciones, setCoordinaciones] = useState<Coordinacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [estadoFilter, setEstadoFilter] = useState<ComunicadoEstado | 'all'>('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editingComunicado, setEditingComunicado] = useState<Comunicado | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Editor state
  const [editorTitulo, setEditorTitulo] = useState('');
  const [editorSubtitulo, setEditorSubtitulo] = useState('');
  const [editorBody, setEditorBody] = useState('');
  const [editorBullets, setEditorBullets] = useState<string[]>([]);
  const [editorIcon, setEditorIcon] = useState('Info');
  const [editorTipo, setEditorTipo] = useState<ComunicadoTipo>('info');
  const [editorTargetType, setEditorTargetType] = useState<ComunicadoTargetType>('todos');
  const [editorTargetIds, setEditorTargetIds] = useState<string[]>([]);
  const [editorPrioridad, setEditorPrioridad] = useState(5);
  const [editorExpiresAt, setEditorExpiresAt] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [coms, coords] = await Promise.all([
      comunicadosService.getComunicadosAdmin(
        estadoFilter !== 'all' ? { estado: estadoFilter } : undefined
      ),
      coordinacionService.getCoordinaciones(),
    ]);
    setComunicados(coms);
    setCoordinaciones(coords);
    setIsLoading(false);
  }, [estadoFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredComunicados = useMemo(() => {
    return comunicados.filter(c => !c.is_interactive);
  }, [comunicados]);

  const interactiveComunicados = useMemo(() => {
    return comunicados.filter(c => c.is_interactive);
  }, [comunicados]);

  // Editor helpers
  const resetEditor = useCallback(() => {
    setEditorTitulo('');
    setEditorSubtitulo('');
    setEditorBody('');
    setEditorBullets([]);
    setEditorIcon('Info');
    setEditorTipo('info');
    setEditorTargetType('todos');
    setEditorTargetIds([]);
    setEditorPrioridad(5);
    setEditorExpiresAt('');
    setEditingComunicado(null);
  }, []);

  const openEditor = useCallback(
    (comunicado?: Comunicado) => {
      if (comunicado) {
        setEditingComunicado(comunicado);
        setEditorTitulo(comunicado.titulo);
        setEditorSubtitulo(comunicado.subtitulo || '');
        setEditorBody(comunicado.contenido?.body || '');
        setEditorBullets(comunicado.contenido?.bullets || []);
        setEditorIcon(comunicado.contenido?.icon || 'Info');
        setEditorTipo(comunicado.tipo);
        setEditorTargetType(comunicado.target_type);
        setEditorTargetIds(comunicado.target_ids || []);
        setEditorPrioridad(comunicado.prioridad);
        setEditorExpiresAt(comunicado.expires_at?.split('T')[0] || '');
      } else {
        resetEditor();
      }
      setShowEditor(true);
    },
    [resetEditor]
  );

  const handleSave = useCallback(async () => {
    if (!user?.id || !editorTitulo.trim()) return;
    setIsSaving(true);

    const contenido: ComunicadoContenido = {
      body: editorBody || undefined,
      bullets: editorBullets.filter(b => b.trim()) || undefined,
      icon: editorIcon,
    };

    if (editingComunicado) {
      await comunicadosService.updateComunicado(editingComunicado.id, {
        titulo: editorTitulo,
        subtitulo: editorSubtitulo || undefined,
        contenido,
        tipo: editorTipo,
        target_type: editorTargetType,
        target_ids: editorTargetIds,
        prioridad: editorPrioridad,
        expires_at: editorExpiresAt ? new Date(editorExpiresAt).toISOString() : null,
      });
    } else {
      const params: CreateComunicadoParams = {
        titulo: editorTitulo,
        subtitulo: editorSubtitulo || undefined,
        contenido,
        tipo: editorTipo,
        target_type: editorTargetType,
        target_ids: editorTargetIds,
        prioridad: editorPrioridad,
        expires_at: editorExpiresAt ? new Date(editorExpiresAt).toISOString() : undefined,
      };
      await comunicadosService.createComunicado(params, user.id);
    }

    setIsSaving(false);
    setShowEditor(false);
    resetEditor();
    loadData();
  }, [
    user?.id,
    editorTitulo,
    editorSubtitulo,
    editorBody,
    editorBullets,
    editorIcon,
    editorTipo,
    editorTargetType,
    editorTargetIds,
    editorPrioridad,
    editorExpiresAt,
    editingComunicado,
    resetEditor,
    loadData,
  ]);

  const handlePublish = useCallback(
    async (id: string) => {
      setActionLoading(id);
      await comunicadosService.publishComunicado(id);
      setActionLoading(null);
      loadData();
    },
    [loadData]
  );

  const handleArchive = useCallback(
    async (id: string) => {
      setActionLoading(id);
      await comunicadosService.archiveComunicado(id);
      setActionLoading(null);
      loadData();
    },
    [loadData]
  );

  const handleDuplicate = useCallback(
    async (comunicado: Comunicado) => {
      if (!user?.id) return;
      setActionLoading(comunicado.id);
      await comunicadosService.createComunicado(
        {
          titulo: `${comunicado.titulo} (copia)`,
          subtitulo: comunicado.subtitulo || undefined,
          contenido: comunicado.contenido,
          tipo: comunicado.tipo,
          prioridad: comunicado.prioridad,
          target_type: comunicado.target_type,
          target_ids: comunicado.target_ids,
        },
        user.id
      );
      setActionLoading(null);
      loadData();
    },
    [user?.id, loadData]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setActionLoading(id);
      await comunicadosService.deleteComunicado(id);
      setActionLoading(null);
      loadData();
    },
    [loadData]
  );

  const getTargetLabel = (c: Comunicado) => {
    switch (c.target_type) {
      case 'todos':
        return 'Todos los usuarios';
      case 'coordinacion': {
        const names = c.target_ids
          .map(id => coordinaciones.find(co => co.id === id)?.nombre || id)
          .join(', ');
        return names || 'Coordinaciones';
      }
      case 'usuarios':
        return `${c.target_ids.length} usuario(s)`;
      case 'roles':
        return c.target_ids.join(', ');
      default:
        return c.target_type;
    }
  };

  const getEstadoBadge = (estado: ComunicadoEstado) => {
    switch (estado) {
      case 'borrador':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'activo':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'archivado':
        return 'bg-gray-600/20 text-gray-500 border-gray-600/30';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Comunicados</h2>
          <span className="text-xs text-gray-500">
            {comunicados.length} total
          </span>
        </div>
        <button
          onClick={() => openEditor()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo comunicado
        </button>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-gray-800 flex items-center gap-2">
        {ESTADO_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setEstadoFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              estadoFilter === f.value
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'text-gray-400 hover:bg-gray-800 border border-transparent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Comunicados simples */}
            {filteredComunicados.length === 0 && interactiveComunicados.length === 0 && (
              <div className="text-center py-20">
                <Megaphone className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500">No hay comunicados</p>
                <p className="text-xs text-gray-600 mt-1">
                  Crea un comunicado para notificar a los usuarios
                </p>
              </div>
            )}

            {filteredComunicados.length > 0 && (
              <div className="space-y-3">
                {filteredComunicados.map(c => {
                  const colors = COMUNICADO_TIPO_COLORS[c.tipo];
                  return (
                    <div
                      key={c.id}
                      className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
                            >
                              {c.tipo}
                            </span>
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getEstadoBadge(c.estado)}`}
                            >
                              {c.estado}
                            </span>
                          </div>
                          <h3 className="text-sm font-medium text-white truncate">
                            {c.titulo}
                          </h3>
                          {c.subtitulo && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {c.subtitulo}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {getTargetLabel(c)}
                            </span>
                            <span className="flex items-center gap-1">
                              <BarChart3 className="w-3 h-3" />
                              {c.read_count} leidos
                            </span>
                            {c.published_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(c.published_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {actionLoading === c.id ? (
                            <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                          ) : (
                            <>
                              {c.estado === 'borrador' && (
                                <button
                                  onClick={() => handlePublish(c.id)}
                                  className="p-1.5 rounded hover:bg-emerald-500/10 text-gray-400 hover:text-emerald-400 transition-colors"
                                  title="Publicar"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {c.estado === 'activo' && (
                                <button
                                  onClick={() => handleArchive(c.id)}
                                  className="p-1.5 rounded hover:bg-amber-500/10 text-gray-400 hover:text-amber-400 transition-colors"
                                  title="Archivar"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => openEditor(c)}
                                className="p-1.5 rounded hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 transition-colors"
                                title="Editar"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDuplicate(c)}
                                className="p-1.5 rounded hover:bg-purple-500/10 text-gray-400 hover:text-purple-400 transition-colors"
                                title="Duplicar"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              {c.estado === 'borrador' && (
                                <button
                                  onClick={() => handleDelete(c.id)}
                                  className="p-1.5 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tutoriales interactivos */}
            {interactiveComunicados.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Tutoriales interactivos
                </h3>
                {interactiveComunicados.map(c => {
                  const info = INTERACTIVE_COMUNICADOS.find(
                    ic => ic.component_key === c.component_key
                  );
                  return (
                    <div
                      key={c.id}
                      className="bg-gray-800 rounded-lg border border-purple-500/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-400 border-purple-500/30">
                              tutorial
                            </span>
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getEstadoBadge(c.estado)}`}
                            >
                              {c.estado}
                            </span>
                            <span className="text-[10px] text-gray-600 font-mono">
                              {c.component_key}
                            </span>
                          </div>
                          <h3 className="text-sm font-medium text-white">{c.titulo}</h3>
                          {info && (
                            <p className="text-xs text-gray-400 mt-0.5">{info.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {getTargetLabel(c)}
                            </span>
                            <span className="flex items-center gap-1">
                              <BarChart3 className="w-3 h-3" />
                              {c.read_count} completados
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {actionLoading === c.id ? (
                            <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                          ) : (
                            <>
                              {c.estado === 'borrador' && (
                                <button
                                  onClick={() => handlePublish(c.id)}
                                  className="p-1.5 rounded hover:bg-emerald-500/10 text-gray-400 hover:text-emerald-400 transition-colors"
                                  title="Activar"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {c.estado === 'activo' && (
                                <button
                                  onClick={() => handleArchive(c.id)}
                                  className="p-1.5 rounded hover:bg-amber-500/10 text-gray-400 hover:text-amber-400 transition-colors"
                                  title="Archivar"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowEditor(false);
              resetEditor();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Editor Header */}
              <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">
                  {editingComunicado ? 'Editar comunicado' : 'Nuevo comunicado'}
                </h3>
                <button
                  onClick={() => {
                    setShowEditor(false);
                    resetEditor();
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Editor Content - Two columns */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 divide-x divide-gray-700">
                  {/* Left: Form */}
                  <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
                    {/* Presets */}
                    <div>
                      <label className="text-xs font-medium text-gray-400 block mb-2">
                        Tipo
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {COMUNICADO_PRESETS.map(p => {
                          const Icon = ICON_MAP[p.icon] || Info;
                          return (
                            <button
                              key={p.tipo}
                              onClick={() => {
                                setEditorTipo(p.tipo);
                                setEditorIcon(p.icon);
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                editorTipo === p.tipo
                                  ? `${COMUNICADO_TIPO_COLORS[p.tipo].bg} ${COMUNICADO_TIPO_COLORS[p.tipo].text} ${COMUNICADO_TIPO_COLORS[p.tipo].border}`
                                  : 'border-gray-700 text-gray-400 hover:bg-gray-800'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="text-xs font-medium text-gray-400 block mb-1">
                        Titulo *
                      </label>
                      <input
                        type="text"
                        value={editorTitulo}
                        onChange={(e) => setEditorTitulo(e.target.value)}
                        placeholder="Titulo del comunicado"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    {/* Subtitle */}
                    <div>
                      <label className="text-xs font-medium text-gray-400 block mb-1">
                        Subtitulo
                      </label>
                      <input
                        type="text"
                        value={editorSubtitulo}
                        onChange={(e) => setEditorSubtitulo(e.target.value)}
                        placeholder="Subtitulo opcional"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    {/* Body */}
                    <div>
                      <label className="text-xs font-medium text-gray-400 block mb-1">
                        Contenido
                      </label>
                      <textarea
                        value={editorBody}
                        onChange={(e) => setEditorBody(e.target.value)}
                        placeholder="Texto del comunicado. Soporta **negritas** y saltos de linea."
                        rows={4}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                      />
                    </div>

                    {/* Bullets */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-400">
                          Puntos clave
                        </label>
                        <button
                          onClick={() => setEditorBullets([...editorBullets, ''])}
                          className="text-xs text-purple-400 hover:text-purple-300"
                        >
                          + Agregar
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {editorBullets.map((b, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={b}
                              onChange={(e) => {
                                const updated = [...editorBullets];
                                updated[i] = e.target.value;
                                setEditorBullets(updated);
                              }}
                              placeholder={`Punto ${i + 1}`}
                              className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                            />
                            <button
                              onClick={() => setEditorBullets(editorBullets.filter((_, j) => j !== i))}
                              className="p-1 text-gray-500 hover:text-red-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Icon picker */}
                    <div>
                      <label className="text-xs font-medium text-gray-400 block mb-1">
                        Icono
                      </label>
                      <div className="relative">
                        <button
                          onClick={() => setShowIconPicker(!showIconPicker)}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white hover:border-gray-600"
                        >
                          {(() => {
                            const Icon = ICON_MAP[editorIcon] || Info;
                            return <Icon className="w-4 h-4" />;
                          })()}
                          <span className="text-xs">{editorIcon}</span>
                          <ChevronDown className="w-3 h-3 text-gray-500" />
                        </button>
                        {showIconPicker && (
                          <div className="absolute top-full left-0 mt-1 p-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 grid grid-cols-5 gap-1 w-64">
                            {ICON_NAMES.map(name => {
                              const Icon = ICON_MAP[name];
                              return (
                                <button
                                  key={name}
                                  onClick={() => {
                                    setEditorIcon(name);
                                    setShowIconPicker(false);
                                  }}
                                  className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                                    editorIcon === name
                                      ? 'bg-purple-500/20 text-purple-400'
                                      : 'text-gray-400 hover:bg-gray-700'
                                  }`}
                                  title={name}
                                >
                                  <Icon className="w-4 h-4" />
                                  <span className="text-[8px] truncate w-full text-center">
                                    {name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Targeting */}
                    <div>
                      <label className="text-xs font-medium text-gray-400 block mb-2">
                        Audiencia
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(
                          [
                            { value: 'todos', label: 'Todos', icon: Globe },
                            { value: 'coordinacion', label: 'Coordinacion', icon: Users },
                            { value: 'roles', label: 'Roles', icon: Shield },
                          ] as const
                        ).map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setEditorTargetType(opt.value);
                              setEditorTargetIds([]);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                              editorTargetType === opt.value
                                ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                : 'border-gray-700 text-gray-400 hover:bg-gray-800'
                            }`}
                          >
                            <opt.icon className="w-3.5 h-3.5" />
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* Coordinacion selector */}
                      {editorTargetType === 'coordinacion' && (
                        <div className="space-y-1.5 mt-2">
                          {coordinaciones.map(coord => (
                            <label
                              key={coord.id}
                              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750"
                            >
                              <input
                                type="checkbox"
                                checked={editorTargetIds.includes(coord.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditorTargetIds([...editorTargetIds, coord.id]);
                                  } else {
                                    setEditorTargetIds(editorTargetIds.filter(id => id !== coord.id));
                                  }
                                }}
                                className="rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                              />
                              <span className="text-xs text-gray-300">
                                {coord.nombre} ({coord.codigo})
                              </span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Roles selector */}
                      {editorTargetType === 'roles' && (
                        <div className="space-y-1.5 mt-2">
                          {ROLE_OPTIONS.map(role => (
                            <label
                              key={role.value}
                              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750"
                            >
                              <input
                                type="checkbox"
                                checked={editorTargetIds.includes(role.value)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditorTargetIds([...editorTargetIds, role.value]);
                                  } else {
                                    setEditorTargetIds(editorTargetIds.filter(id => id !== role.value));
                                  }
                                }}
                                className="rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                              />
                              <span className="text-xs text-gray-300">{role.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Priority + Expiration */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">
                          Prioridad ({editorPrioridad})
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          value={editorPrioridad}
                          onChange={(e) => setEditorPrioridad(Number(e.target.value))}
                          className="w-full accent-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 block mb-1">
                          Expiracion
                        </label>
                        <input
                          type="date"
                          value={editorExpiresAt}
                          onChange={(e) => setEditorExpiresAt(e.target.value)}
                          className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Preview */}
                  <div className="p-5 bg-gray-950 overflow-y-auto max-h-[60vh]">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                      Vista previa
                    </p>
                    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
                      {/* Icon + Badge */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl border flex items-center justify-center ${COMUNICADO_TIPO_COLORS[editorTipo].bg} ${COMUNICADO_TIPO_COLORS[editorTipo].border}`}
                        >
                          {(() => {
                            const Icon = ICON_MAP[editorIcon] || Info;
                            return (
                              <Icon
                                className={`w-6 h-6 ${COMUNICADO_TIPO_COLORS[editorTipo].text}`}
                              />
                            );
                          })()}
                        </div>
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full border ${COMUNICADO_TIPO_COLORS[editorTipo].bg} ${COMUNICADO_TIPO_COLORS[editorTipo].text} ${COMUNICADO_TIPO_COLORS[editorTipo].border}`}
                        >
                          {editorTipo.charAt(0).toUpperCase() + editorTipo.slice(1)}
                        </span>
                      </div>

                      {/* Title */}
                      <div>
                        <h2 className="text-lg font-bold text-white">
                          {editorTitulo || 'Titulo del comunicado'}
                        </h2>
                        {editorSubtitulo && (
                          <p className="text-sm text-gray-400 mt-0.5">{editorSubtitulo}</p>
                        )}
                      </div>

                      {/* Body */}
                      {editorBody && (
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {editorBody}
                        </p>
                      )}

                      {/* Bullets */}
                      {editorBullets.filter(b => b.trim()).length > 0 && (
                        <ul className="space-y-1.5">
                          {editorBullets
                            .filter(b => b.trim())
                            .map((b, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-sm text-gray-300"
                              >
                                <div
                                  className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${COMUNICADO_TIPO_COLORS[editorTipo].text.replace('text-', 'bg-')}`}
                                />
                                {b}
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Editor Footer */}
              <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowEditor(false);
                    resetEditor();
                  }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={!editorTitulo.trim() || isSaving}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {editingComunicado ? 'Guardar cambios' : 'Crear borrador'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ComunicadosManager;
