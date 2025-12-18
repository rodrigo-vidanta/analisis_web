/**
 * ============================================
 * SCHEDULE MANAGER - GESTIÓN DE HORARIOS DE SERVICIO
 * ============================================
 *
 * Módulo interactivo para configurar:
 * - Horarios base (lunes a domingo)
 * - Bloqueos temporales (cambios de horario por fecha)
 * - Excepciones (feriados, cierres especiales)
 *
 * Accesible para: admin, administrador_operativo
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  CalendarOff,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ToggleLeft,
  ToggleRight,
  CalendarDays,
  Timer,
  RefreshCw
} from 'lucide-react';
import {
  horariosService,
  type HorarioBase,
  type HorarioBloqueo,
  type HorarioExcepcion
} from '../../services/horariosService';

// ===============================
// COMPONENTE PRINCIPAL
// ===============================

const ScheduleManager: React.FC = () => {
  // Estados principales
  const [activeTab, setActiveTab] = useState<'base' | 'excepciones' | 'bloqueos'>('base');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Datos
  const [horariosBase, setHorariosBase] = useState<HorarioBase[]>([]);
  const [excepciones, setExcepciones] = useState<HorarioExcepcion[]>([]);
  const [bloqueos, setBloqueos] = useState<HorarioBloqueo[]>([]);

  // Estados de edición
  const [showExcepcionModal, setShowExcepcionModal] = useState(false);
  const [showBloqueoModal, setShowBloqueoModal] = useState(false);
  const [editingExcepcion, setEditingExcepcion] = useState<HorarioExcepcion | null>(null);
  const [editingBloqueo, setEditingBloqueo] = useState<HorarioBloqueo | null>(null);

  // Cargar datos iniciales
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [baseData, excepcionesData, bloqueosData] = await Promise.all([
        horariosService.getHorariosBase(),
        horariosService.getHorariosExcepciones(),
        horariosService.getHorariosBloqueos()
      ]);
      setHorariosBase(baseData);
      setExcepciones(excepcionesData);
      setBloqueos(bloqueosData);
    } catch (err) {
      console.error('Error cargando horarios:', err);
      setError('Error al cargar los horarios. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mostrar toast de éxito discreto y temporal
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  // Calcular estadísticas
  const stats = {
    diasActivos: horariosBase.filter(h => h.activo).length,
    horasSemanales: horariosBase
      .filter(h => h.activo)
      .reduce((acc, h) => acc + (h.hora_fin - h.hora_inicio), 0),
    excepcionesProximas: excepciones.filter(e => {
      const hoy = new Date().toISOString().split('T')[0];
      return e.fecha >= hoy && e.activo;
    }).length,
    bloqueosActivos: bloqueos.filter(b => b.status === 'activo' || b.status === 'pendiente').length
  };

  return (
    <div className="space-y-5">
      {/* Header minimalista */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Clock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Horarios de Servicio</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gestión de horarios operativos</p>
          </div>
        </div>
        
        {/* Métricas inline */}
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">{stats.diasActivos}</span>/7 días
            </span>
          </div>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">{stats.horasSemanales}</span> hrs/sem
            </span>
          </div>
          {stats.excepcionesProximas > 0 && (
            <>
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
              <div className="flex items-center gap-2">
                <CalendarOff className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-amber-600 dark:text-amber-400">
                  {stats.excepcionesProximas} excepción{stats.excepcionesProximas > 1 ? 'es' : ''}
                </span>
              </div>
            </>
          )}
          {stats.bloqueosActivos > 0 && (
            <>
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600 dark:text-red-400">
                  {stats.bloqueosActivos} bloqueo{stats.bloqueosActivos > 1 ? 's' : ''}
                </span>
              </div>
            </>
          )}
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Mensajes */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center space-x-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4 text-red-500" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast de éxito flotante - esquina superior derecha */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-emerald-500/30"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs de navegación */}
      <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1.5">
        {[
          { id: 'base' as const, label: 'Horario Semanal', icon: CalendarDays },
          { id: 'excepciones' as const, label: 'Días Especiales', icon: CalendarOff },
          { id: 'bloqueos' as const, label: 'Bloqueos', icon: AlertTriangle }
        ].map((tab) => (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Contenido según tab */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-20"
          >
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </motion.div>
        ) : activeTab === 'base' ? (
          <HorarioBaseSection
            horarios={horariosBase}
            onUpdate={async (id, updates) => {
              try {
                setSaving(true);
                await horariosService.updateHorarioBase(id, updates);
                // Actualizar estado local sin recargar todo
                setHorariosBase(prev => prev.map(h => 
                  h.id === id ? { ...h, ...updates } : h
                ));
                showSuccess('Horario actualizado');
              } catch (err) {
                setError('Error al actualizar el horario');
              } finally {
                setSaving(false);
              }
            }}
            onToggle={async (id, activo) => {
              try {
                await horariosService.toggleDiaActivo(id, activo);
                // Actualizar estado local sin recargar todo
                setHorariosBase(prev => prev.map(h => 
                  h.id === id ? { ...h, activo } : h
                ));
                showSuccess(activo ? 'Día activado' : 'Día desactivado');
              } catch (err) {
                setError('Error al cambiar estado del día');
              }
            }}
            saving={saving}
          />
        ) : activeTab === 'excepciones' ? (
          <ExcepcionesSection
            excepciones={excepciones}
            onAdd={() => {
              setEditingExcepcion(null);
              setShowExcepcionModal(true);
            }}
            onEdit={(exc) => {
              setEditingExcepcion(exc);
              setShowExcepcionModal(true);
            }}
            onDelete={async (id) => {
              try {
                await horariosService.deleteHorarioExcepcion(id);
                // Actualizar estado local sin recargar
                setExcepciones(prev => prev.filter(e => e.id !== id));
                showSuccess('Eliminado');
              } catch (err) {
                setError('Error al eliminar');
              }
            }}
            onToggle={async (id, activo) => {
              try {
                await horariosService.updateHorarioExcepcion(id, { activo });
                // Actualizar estado local sin recargar
                setExcepciones(prev => prev.map(e => 
                  e.id === id ? { ...e, activo } : e
                ));
              } catch (err) {
                setError('Error al cambiar estado');
              }
            }}
          />
        ) : (
          <BloqueosSection
            bloqueos={bloqueos}
            onAdd={() => {
              setEditingBloqueo(null);
              setShowBloqueoModal(true);
            }}
            onEdit={(blq) => {
              setEditingBloqueo(blq);
              setShowBloqueoModal(true);
            }}
            onDelete={async (id) => {
              try {
                await horariosService.deleteHorarioBloqueo(id);
                // Actualizar estado local sin recargar
                setBloqueos(prev => prev.filter(b => b.id !== id));
                showSuccess('Eliminado');
              } catch (err) {
                setError('Error al eliminar el bloqueo');
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Modales */}
      <ExcepcionModal
        isOpen={showExcepcionModal}
        onClose={() => setShowExcepcionModal(false)}
        excepcion={editingExcepcion}
        onSave={async (data) => {
          try {
            setSaving(true);
            if (editingExcepcion) {
              await horariosService.updateHorarioExcepcion(editingExcepcion.id, data);
              showSuccess('Excepción actualizada');
            } else {
              await horariosService.createHorarioExcepcion(data as Omit<HorarioExcepcion, 'id' | 'created_at' | 'updated_at'>);
              showSuccess('Excepción creada');
            }
            await loadData();
            setShowExcepcionModal(false);
          } catch (err) {
            setError('Error al guardar la excepción');
          } finally {
            setSaving(false);
          }
        }}
        saving={saving}
      />

      <BloqueoModal
        isOpen={showBloqueoModal}
        onClose={() => setShowBloqueoModal(false)}
        bloqueo={editingBloqueo}
        onSave={async (data) => {
          try {
            setSaving(true);
            if (editingBloqueo) {
              await horariosService.updateHorarioBloqueo(editingBloqueo.id, data);
              showSuccess('Bloqueo actualizado');
            } else {
              await horariosService.createHorarioBloqueo(data as Omit<HorarioBloqueo, 'id' | 'created_at' | 'updated_at' | 'status'>);
              showSuccess('Bloqueo creado');
            }
            await loadData();
            setShowBloqueoModal(false);
          } catch (err) {
            setError('Error al guardar el bloqueo');
          } finally {
            setSaving(false);
          }
        }}
        saving={saving}
      />
    </div>
  );
};

// ===============================
// COMPONENTE TIME RANGE SLIDER
// ===============================

// Constantes para el rango horario: 6:00 AM a 1:00 AM (+1 día)
const HORA_MIN = 6;  // 6:00 AM
const HORA_MAX = 25; // 1:00 AM del día siguiente (representado como hora 25)
const TOTAL_HORAS = HORA_MAX - HORA_MIN; // 19 horas
const HORA_MIN_DURACION = 1; // Mínimo 1 hora de diferencia

// Formatea hora considerando que 24+ es del día siguiente
const formatHora = (hora: number): string => {
  const h = hora >= 24 ? hora - 24 : hora;
  const suffix = hora >= 12 && hora < 24 ? 'PM' : 'AM';
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayHour}:00 ${suffix}`;
};

interface TimeRangeSliderProps {
  horaInicio: number;
  horaFin: number;
  onChange: (inicio: number, fin: number) => void;
  onDragEnd: () => void; // Callback para guardar cuando suelte
  activo: boolean;
  diaNombre: string;
  saving?: boolean;
}

const TimeRangeSlider: React.FC<TimeRangeSliderProps> = ({
  horaInicio,
  horaFin,
  onChange,
  onDragEnd,
  activo,
  diaNombre,
  saving = false
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const [isHovering, setIsHovering] = useState<'start' | 'end' | null>(null);

  // Convertir hora a porcentaje
  const horaToPercent = (hora: number): number => {
    return ((hora - HORA_MIN) / TOTAL_HORAS) * 100;
  };

  // Convertir posición del mouse a hora
  const percentToHora = (percent: number): number => {
    const hora = Math.round((percent / 100) * TOTAL_HORAS + HORA_MIN);
    return Math.max(HORA_MIN, Math.min(HORA_MAX, hora));
  };

  // Calcular posición del mouse relativa al track
  const getMousePercent = useCallback((e: React.MouseEvent | MouseEvent): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return Math.max(0, Math.min(100, (x / rect.width) * 100));
  }, []);

  // Handler para iniciar drag en los handles
  const handleMouseDown = (e: React.MouseEvent, type: 'start' | 'end') => {
    if (!activo) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(type);
  };

  // Handler para movimiento del mouse
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !trackRef.current) return;

    const percent = getMousePercent(e);
    const nuevaHora = percentToHora(percent);

    if (isDragging === 'start') {
      // Mover solo el inicio, mantener mínimo HORA_MIN_DURACION horas de diferencia
      const nuevoInicio = Math.max(HORA_MIN, Math.min(nuevaHora, horaFin - HORA_MIN_DURACION));
      if (nuevoInicio !== horaInicio) {
        onChange(nuevoInicio, horaFin);
      }
    } else if (isDragging === 'end') {
      // Mover solo el fin, mantener mínimo HORA_MIN_DURACION horas de diferencia
      const nuevoFin = Math.min(HORA_MAX, Math.max(nuevaHora, horaInicio + HORA_MIN_DURACION));
      if (nuevoFin !== horaFin) {
        onChange(horaInicio, nuevoFin);
      }
    }
  }, [isDragging, horaInicio, horaFin, onChange, getMousePercent]);

  // Handler para soltar el mouse - dispara guardado
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(null);
      onDragEnd(); // Guardar automáticamente
    }
  }, [isDragging, onDragEnd]);

  // Registrar listeners globales
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const leftPercent = horaToPercent(horaInicio);
  const widthPercent = horaToPercent(horaFin) - leftPercent;
  const duracionHoras = horaFin - horaInicio;

  return (
    <div 
      className="relative h-11 select-none group/slider"
      onMouseLeave={() => setIsHovering(null)}
    >
      {/* Track background con marcas horarias */}
      <div 
        ref={trackRef}
        className={`absolute inset-0 rounded-xl overflow-hidden transition-all duration-300 ${
          isDragging 
            ? 'bg-gradient-to-r from-slate-100 via-emerald-50 to-slate-100 dark:from-slate-700/60 dark:via-emerald-900/20 dark:to-slate-700/60 ring-2 ring-emerald-400/50' 
            : 'bg-gray-100 dark:bg-gray-700/40 hover:bg-gray-50 dark:hover:bg-gray-700/60'
        }`}
      >
        {/* Marcas de horas (líneas verticales sutiles) */}
        {Array.from({ length: TOTAL_HORAS + 1 }, (_, i) => i + HORA_MIN).map((hora) => (
          <div
            key={hora}
            className={`absolute top-0 bottom-0 w-px transition-colors ${
              hora % 3 === 0 
                ? 'bg-gray-300/70 dark:bg-gray-600/70' 
                : 'bg-gray-200/40 dark:bg-gray-700/40'
            }`}
            style={{ left: `${horaToPercent(hora)}%` }}
          />
        ))}
      </div>

      {/* Barra de horario activo */}
      {activo && (
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ 
            scaleX: 1, 
            opacity: 1,
            boxShadow: isDragging 
              ? '0 0 25px rgba(16, 185, 129, 0.5), 0 0 50px rgba(20, 184, 166, 0.25)' 
              : '0 2px 10px rgba(16, 185, 129, 0.25)'
          }}
          transition={{ 
            duration: 0.5, 
            ease: [0.16, 1, 0.3, 1],
            boxShadow: { duration: 0.15 }
          }}
          style={{
            left: `${leftPercent}%`,
            width: `${widthPercent}%`,
            transformOrigin: 'left'
          }}
          className={`absolute top-1 bottom-1 rounded-lg transition-colors duration-200 ${
            isDragging 
              ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400' 
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400'
          }`}
        >
          {/* Animación de brillo continua (muy sutil y lenta) */}
          <motion.div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
              animate={{
                x: ['-100%', '200%']
              }}
              transition={{
                duration: isDragging ? 1.5 : 8,
                repeat: Infinity,
                ease: 'linear'
              }}
              style={{ width: '30%' }}
            />
          </motion.div>

          {/* Texto de horario centrado */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.span 
              className="text-white text-xs font-semibold tracking-wide drop-shadow-md px-2"
              animate={{ 
                scale: isDragging ? 1.05 : 1,
                opacity: saving ? 0.5 : 1
              }}
              transition={{ duration: 0.15 }}
            >
              {saving ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Guardando...
                </span>
              ) : (
                `${formatHora(horaInicio)} - ${formatHora(horaFin)}`
              )}
            </motion.span>
          </div>

          {/* Handle izquierdo (inicio) - Integrado con la barra */}
          <motion.div
            className="absolute left-0 top-0 bottom-0 w-5 rounded-l-lg flex items-center justify-center cursor-ew-resize z-10"
            onMouseDown={(e) => handleMouseDown(e, 'start')}
            onMouseEnter={() => setIsHovering('start')}
            animate={{
              backgroundColor: isDragging === 'start' 
                ? 'rgba(5, 150, 105, 0.4)' 
                : isHovering === 'start' 
                  ? 'rgba(16, 185, 129, 0.25)' 
                  : 'rgba(16, 185, 129, 0.1)'
            }}
            transition={{ duration: 0.15 }}
          >
            {/* Línea grip vertical */}
            <div className={`w-1 h-6 rounded-full transition-all duration-150 ${
              isDragging === 'start' 
                ? 'bg-white shadow-sm' 
                : isHovering === 'start'
                  ? 'bg-white/90'
                  : 'bg-white/60'
            }`} />
            {/* Tooltip de hora */}
            <AnimatePresence>
              {(isDragging === 'start' || isHovering === 'start') && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.9 }}
                  className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded-md shadow-lg whitespace-nowrap"
                >
                  {formatHora(horaInicio)}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Handle derecho (fin) - Integrado con la barra */}
          <motion.div
            className="absolute right-0 top-0 bottom-0 w-5 rounded-r-lg flex items-center justify-center cursor-ew-resize z-10"
            onMouseDown={(e) => handleMouseDown(e, 'end')}
            onMouseEnter={() => setIsHovering('end')}
            animate={{
              backgroundColor: isDragging === 'end' 
                ? 'rgba(13, 148, 136, 0.4)' 
                : isHovering === 'end' 
                  ? 'rgba(20, 184, 166, 0.25)' 
                  : 'rgba(20, 184, 166, 0.1)'
            }}
            transition={{ duration: 0.15 }}
          >
            {/* Línea grip vertical */}
            <div className={`w-1 h-6 rounded-full transition-all duration-150 ${
              isDragging === 'end' 
                ? 'bg-white shadow-sm' 
                : isHovering === 'end'
                  ? 'bg-white/90'
                  : 'bg-white/60'
            }`} />
            {/* Tooltip de hora */}
            <AnimatePresence>
              {(isDragging === 'end' || isHovering === 'end') && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.9 }}
                  className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded-md shadow-lg whitespace-nowrap"
                >
                  {formatHora(horaFin)}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}

      {/* Indicador de día inactivo */}
      {!activo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
            {diaNombre} - Cerrado
          </span>
        </div>
      )}

      {/* Indicador de duración mínima alcanzada */}
      {activo && duracionHoras <= HORA_MIN_DURACION && isDragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-amber-600 dark:text-amber-400 font-medium"
        >
          Mínimo {HORA_MIN_DURACION}h
        </motion.div>
      )}
    </div>
  );
};

// ===============================
// SECCIÓN HORARIOS BASE
// ===============================

interface HorarioBaseSectionProps {
  horarios: HorarioBase[];
  onUpdate: (id: string, updates: Partial<HorarioBase>) => Promise<void>;
  onToggle: (id: string, activo: boolean) => Promise<void>;
  saving: boolean;
}

// ===============================
// MODAL DE CONFIRMACIÓN ELEGANTE
// ===============================

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel
}) => {
  const variantStyles = {
    danger: {
      icon: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      button: 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
    },
    warning: {
      icon: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      button: 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600'
    }
  };

  const styles = variantStyles[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-700"
          >
            {/* Contenido */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                {/* Icono */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full ${styles.icon} flex items-center justify-center`}>
                  <AlertTriangle className={`w-5 h-5 ${styles.iconColor}`} />
                </div>
                
                {/* Texto */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {message}
                  </p>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${styles.button}`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const HorarioBaseSection: React.FC<HorarioBaseSectionProps> = ({
  horarios,
  onUpdate,
  onToggle,
  saving
}) => {
  // Estado local para valores mientras se arrastra (antes de guardar)
  const [tempValues, setTempValues] = useState<{ [key: string]: { hora_inicio: number; hora_fin: number } }>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Obtener valores actuales (temporales si existen, sino del horario original)
  const getCurrentValues = (horario: HorarioBase) => {
    return tempValues[horario.id] || {
      hora_inicio: horario.hora_inicio,
      hora_fin: horario.hora_fin
    };
  };

  // Actualiza valores temporales mientras arrastra
  const handleSliderChange = (id: string, inicio: number, fin: number) => {
    setTempValues(prev => ({
      ...prev,
      [id]: { hora_inicio: inicio, hora_fin: fin }
    }));
  };

  // Guarda automáticamente cuando suelta el slider
  const handleDragEnd = async (id: string) => {
    const values = tempValues[id];
    const horario = horarios.find(h => h.id === id);
    
    if (!values || !horario) return;
    
    // Solo guardar si realmente cambió
    if (values.hora_inicio !== horario.hora_inicio || values.hora_fin !== horario.hora_fin) {
      setSavingId(id);
      try {
        await onUpdate(id, {
          hora_inicio: values.hora_inicio,
          hora_fin: values.hora_fin
        });
      } finally {
        setSavingId(null);
        // Limpiar valores temporales después de guardar
        setTempValues(prev => {
          const newTemp = { ...prev };
          delete newTemp[id];
          return newTemp;
        });
      }
    }
  };

  // Generar las marcas horarias para el header
  const horaLabels = [
    { hora: 6, label: '6 AM' },
    { hora: 9, label: '9 AM' },
    { hora: 12, label: '12 PM' },
    { hora: 15, label: '3 PM' },
    { hora: 18, label: '6 PM' },
    { hora: 21, label: '9 PM' },
    { hora: 24, label: '12 AM' },
    { hora: 25, label: '1 AM' }
  ];

  return (
    <div className="space-y-4">
      {/* Vista de Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Header del timeline */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-500" />
                Horario Semanal
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Arrastra los extremos de cada barra para ajustar el horario
              </p>
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1.5">
                <motion.div 
                  className="w-4 h-4 rounded-md bg-gradient-to-r from-emerald-400 to-teal-500"
                  animate={{ 
                    boxShadow: ['0 0 0px rgba(16, 185, 129, 0)', '0 0 8px rgba(16, 185, 129, 0.5)', '0 0 0px rgba(16, 185, 129, 0)']
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span>Activo</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-4 h-4 rounded-md bg-gray-200 dark:bg-gray-600" />
                <span>Inactivo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Escala horaria superior */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-end ml-28 mr-2">
            {horaLabels.map((item) => (
              <div 
                key={item.hora} 
                className="flex-1 text-xs text-gray-400 dark:text-gray-500 text-center font-medium first:text-left last:text-right"
              >
                {item.label}
              </div>
            ))}
          </div>
          {/* Línea de escala */}
          <div className="ml-28 mr-2 h-2 flex items-end">
            <div className="w-full h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
          </div>
        </div>

        {/* Timeline visual con sliders */}
        <div className="px-6 pb-6 pt-2 space-y-3">
          {horarios.map((horario) => {
            const currentValues = getCurrentValues(horario);
            const isSaving = savingId === horario.id;

            return (
              <div
                key={horario.id}
                className={`flex items-center group rounded-xl transition-opacity duration-200 ${
                  !horario.activo ? 'opacity-50' : ''
                }`}
              >
                {/* Día y toggle */}
                <div className="w-28 flex items-center space-x-2 pr-2 flex-shrink-0">
                  <button
                    onClick={() => onToggle(horario.id, !horario.activo)}
                    disabled={saving}
                    className={`p-1.5 rounded-lg transition-all hover:scale-105 active:scale-95 ${
                      horario.activo 
                        ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' 
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {horario.activo ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <span className={`text-sm font-medium ${
                    horario.activo 
                      ? 'text-gray-900 dark:text-white' 
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {horario.dia_nombre.slice(0, 3)}
                  </span>
                </div>

                {/* Slider de tiempo */}
                <div className="flex-1">
                  <TimeRangeSlider
                    horaInicio={currentValues.hora_inicio}
                    horaFin={currentValues.hora_fin}
                    onChange={(inicio, fin) => handleSliderChange(horario.id, inicio, fin)}
                    onDragEnd={() => handleDragEnd(horario.id)}
                    activo={horario.activo}
                    diaNombre={horario.dia_nombre}
                    saving={isSaving}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Leyenda de instrucciones */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1.5">
              <div className="w-3 h-5 rounded bg-white/50 border border-gray-300 dark:border-gray-600 flex items-center justify-center">
                <div className="w-0.5 h-2 bg-gray-400 rounded-full" />
              </div>
              <span>Arrastra los extremos para ajustar</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <ToggleRight className="w-4 h-4 text-emerald-500" />
              <span>Click para activar/desactivar día</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Save className="w-3.5 h-3.5" />
              <span>Guarda automáticamente al soltar</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===============================
// SECCIÓN EXCEPCIONES (DÍAS ESPECIALES)
// ===============================

interface ExcepcionesSectionProps {
  excepciones: HorarioExcepcion[];
  onAdd: () => void;
  onEdit: (exc: HorarioExcepcion) => void;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string, activo: boolean) => Promise<void>;
}

const ExcepcionesSection: React.FC<ExcepcionesSectionProps> = ({
  excepciones,
  onAdd,
  onEdit,
  onDelete,
  onToggle
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nombre: string } | null>(null);
  const hoy = new Date().toISOString().split('T')[0];
  const proximas = excepciones.filter(e => e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pasadas = excepciones.filter(e => e.fecha < hoy).sort((a, b) => b.fecha.localeCompare(a.fecha));

  const handleConfirmDelete = () => {
    if (confirmDelete) {
      onDelete(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  const formatFechaCorta = (fecha: string) => {
    const date = new Date(fecha + 'T12:00:00');
    return {
      dia: date.getDate(),
      mes: date.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase(),
      diaSemana: date.toLocaleDateString('es-MX', { weekday: 'short' })
    };
  };

  // Colores por tipo más sutiles y profesionales
  const getTipoStyles = (tipo: HorarioExcepcion['tipo']) => {
    const styles = {
      'feriado': { bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-200 dark:border-red-800/30', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
      'cierre_temprano': { bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-200 dark:border-amber-800/30', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
      'apertura_especial': { bg: 'bg-emerald-50 dark:bg-emerald-900/10', border: 'border-emerald-200 dark:border-emerald-800/30', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
      'evento': { bg: 'bg-blue-50 dark:bg-blue-900/10', border: 'border-blue-200 dark:border-blue-800/30', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' }
    };
    return styles[tipo] || styles['evento'];
  };

  return (
    <div className="space-y-4">
      {/* Contenedor principal */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarOff className="w-5 h-5 text-blue-500" />
                Días Especiales
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Feriados, cierres y horarios especiales
              </p>
            </div>
            <button
              onClick={onAdd}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-700 dark:bg-slate-600 rounded-lg hover:bg-slate-600 dark:hover:bg-slate-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar</span>
            </button>
          </div>
        </div>

        {/* Lista de excepciones */}
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {proximas.length === 0 && pasadas.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CalendarOff className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No hay días especiales programados</p>
            </div>
          ) : (
            <>
              {/* Próximos */}
              {proximas.map((exc) => {
                const fecha = formatFechaCorta(exc.fecha);
                const styles = getTipoStyles(exc.tipo);
                
                return (
                  <div
                    key={exc.id}
                    className={`group flex items-center gap-4 px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      !exc.activo ? 'opacity-40' : ''
                    }`}
                  >
                    {/* Fecha compacta */}
                    <div className="flex-shrink-0 w-12 text-center">
                      <div className="text-xs text-gray-400 dark:text-gray-500 uppercase">{fecha.mes}</div>
                      <div className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">{fecha.dia}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{fecha.diaSemana}</div>
                    </div>

                    {/* Línea divisora */}
                    <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${styles.dot}`} />
                        <span className="font-medium text-gray-900 dark:text-white truncate">{exc.nombre}</span>
                        {exc.recurrente_anual && (
                          <span title="Recurrente anual"><RefreshCw className="w-3 h-3 text-gray-400" /></span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        <span className={styles.text}>{horariosService.getTipoExcepcionLabel(exc.tipo)}</span>
                        {exc.cerrado ? (
                          <span className="text-red-500">Cerrado todo el día</span>
                        ) : exc.hora_inicio !== null && (
                          <span>{horariosService.formatHoraRange(exc.hora_inicio, exc.hora_fin!)}</span>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onToggle(exc.id, !exc.activo)}
                        className={`p-1.5 rounded-md transition-colors ${
                          exc.activo 
                            ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' 
                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        title={exc.activo ? 'Desactivar' : 'Activar'}
                      >
                        {exc.activo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => onEdit(exc)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ id: exc.id, nombre: exc.nombre })}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Separador historial */}
              {pasadas.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full px-6 py-2 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <span>{showHistory ? 'Ocultar' : 'Ver'} historial ({pasadas.length})</span>
                  <ChevronRight className={`w-3 h-3 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
                </button>
              )}

              {/* Historial */}
              {showHistory && pasadas.map((exc) => {
                const fecha = formatFechaCorta(exc.fecha);
                
                return (
                  <div
                    key={exc.id}
                    className="flex items-center gap-4 px-6 py-2.5 bg-gray-50/50 dark:bg-gray-800/50 opacity-50"
                  >
                    <div className="flex-shrink-0 w-12 text-center">
                      <div className="text-xs text-gray-400">{fecha.mes}</div>
                      <div className="text-lg font-medium text-gray-500">{fecha.dia}</div>
                    </div>
                    <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{exc.nombre}</span>
                    </div>
                    <button
                      onClick={() => setConfirmDelete({ id: exc.id, nombre: exc.nombre })}
                      className="p-1 rounded text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={confirmDelete !== null}
        title="Eliminar día especial"
        message={`¿Estás seguro de eliminar "${confirmDelete?.nombre || ''}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

// ===============================
// SECCIÓN BLOQUEOS
// ===============================

interface BloqueosSectionProps {
  bloqueos: HorarioBloqueo[];
  onAdd: () => void;
  onEdit: (blq: HorarioBloqueo) => void;
  onDelete: (id: string) => Promise<void>;
}

const BloqueosSection: React.FC<BloqueosSectionProps> = ({
  bloqueos,
  onAdd,
  onEdit,
  onDelete
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nombre: string } | null>(null);
  const activos = bloqueos.filter(b => b.status === 'activo' || b.status === 'pendiente');
  const ejecutados = bloqueos.filter(b => b.status === 'ejecutado');

  const handleConfirmDelete = () => {
    if (confirmDelete) {
      onDelete(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha + 'T12:00:00');
    return {
      dia: date.getDate(),
      mes: date.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase()
    };
  };

  return (
    <div className="space-y-4">
      {/* Contenedor principal */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Timer className="w-5 h-5 text-amber-500" />
                Bloqueos Temporales
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Intervalos fuera de servicio (pausas, juntas, etc.)
              </p>
            </div>
            <button
              onClick={onAdd}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 dark:bg-amber-500 rounded-lg hover:bg-amber-500 dark:hover:bg-amber-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar</span>
            </button>
          </div>
        </div>

        {/* Lista de bloqueos */}
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {activos.length === 0 && ejecutados.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Timer className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No hay bloqueos programados</p>
            </div>
          ) : (
            <>
              {/* Activos */}
              {activos.map((blq) => {
                const fecha = formatFecha(blq.fecha);
                const statusColor = blq.status === 'activo' 
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
                
                return (
                  <div
                    key={blq.id}
                    className="group flex items-center gap-4 px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    {/* Fecha compacta */}
                    <div className="flex-shrink-0 w-12 text-center">
                      <div className="text-xs text-gray-400 dark:text-gray-500 uppercase">{fecha.mes}</div>
                      <div className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">{fecha.dia}</div>
                    </div>

                    {/* Línea divisora */}
                    <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="font-medium text-gray-900 dark:text-white truncate">{blq.nombre}</span>
                        <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${statusColor}`}>
                          {blq.status === 'activo' ? 'Activo' : 'Pendiente'}
                        </span>
                        {blq.recurrente && (
                          <span title="Recurrente semanal"><RefreshCw className="w-3 h-3 text-gray-400" /></span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        <span>{horariosService.formatHoraRange(blq.hora_inicio, blq.hora_fin)}</span>
                        {blq.descripcion && (
                          <span className="truncate max-w-48">{blq.descripcion}</span>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(blq)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ id: blq.id, nombre: blq.nombre })}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Separador historial */}
              {ejecutados.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full px-6 py-2 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <span>{showHistory ? 'Ocultar' : 'Ver'} historial ({ejecutados.length})</span>
                  <ChevronRight className={`w-3 h-3 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
                </button>
              )}

              {/* Historial */}
              {showHistory && ejecutados.map((blq) => {
                const fecha = formatFecha(blq.fecha);
                
                return (
                  <div
                    key={blq.id}
                    className="flex items-center gap-4 px-6 py-2.5 bg-gray-50/50 dark:bg-gray-800/50 opacity-50"
                  >
                    <div className="flex-shrink-0 w-12 text-center">
                      <div className="text-xs text-gray-400">{fecha.mes}</div>
                      <div className="text-lg font-medium text-gray-500">{fecha.dia}</div>
                    </div>
                    <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{blq.nombre}</span>
                    </div>
                    <button
                      onClick={() => setConfirmDelete({ id: blq.id, nombre: blq.nombre })}
                      className="p-1 rounded text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={confirmDelete !== null}
        title="Eliminar bloqueo"
        message={`¿Estás seguro de eliminar "${confirmDelete?.nombre || ''}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

// ===============================
// MODAL EXCEPCIÓN
// ===============================

interface ExcepcionModalProps {
  isOpen: boolean;
  onClose: () => void;
  excepcion: HorarioExcepcion | null;
  onSave: (data: Partial<HorarioExcepcion>) => Promise<void>;
  saving: boolean;
}

const ExcepcionModal: React.FC<ExcepcionModalProps> = ({
  isOpen,
  onClose,
  excepcion,
  onSave,
  saving
}) => {
  const [form, setForm] = useState({
    fecha: '',
    tipo: 'feriado' as HorarioExcepcion['tipo'],
    hora_inicio: 10,
    hora_fin: 14,
    cerrado: true,
    nombre: '',
    descripcion: '',
    recurrente_anual: false,
    activo: true
  });

  useEffect(() => {
    if (excepcion) {
      setForm({
        fecha: excepcion.fecha,
        tipo: excepcion.tipo,
        hora_inicio: excepcion.hora_inicio || 10,
        hora_fin: excepcion.hora_fin || 14,
        cerrado: excepcion.cerrado,
        nombre: excepcion.nombre,
        descripcion: excepcion.descripcion || '',
        recurrente_anual: excepcion.recurrente_anual,
        activo: excepcion.activo
      });
    } else {
      setForm({
        fecha: new Date().toISOString().split('T')[0],
        tipo: 'feriado',
        hora_inicio: 10,
        hora_fin: 14,
        cerrado: true,
        nombre: '',
        descripcion: '',
        recurrente_anual: false,
        activo: true
      });
    }
  }, [excepcion, isOpen]);

  const handleSubmit = () => {
    onSave({
      ...form,
      hora_inicio: form.cerrado ? null : form.hora_inicio,
      hora_fin: form.cerrado ? null : form.hora_fin
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-800 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CalendarOff className="w-6 h-6" />
                  <h3 className="text-lg font-semibold">
                    {excepcion ? 'Editar Día Especial' : 'Nuevo Día Especial'}
                  </h3>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-5">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Navidad, Día de la Independencia..."
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all"
                />
              </div>

              {/* Fecha y Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo
                  </label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value as HorarioExcepcion['tipo'] })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all"
                  >
                    <option value="feriado">Feriado</option>
                    <option value="cierre_temprano">Cierre Temprano</option>
                    <option value="apertura_especial">Apertura Especial</option>
                    <option value="evento">Evento</option>
                  </select>
                </div>
              </div>

              {/* Toggle cerrado */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Día cerrado</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Sin operaciones este día</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setForm({ ...form, cerrado: !form.cerrado })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    form.cerrado ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <motion.div
                    animate={{ x: form.cerrado ? 24 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg"
                  />
                </motion.button>
              </div>

              {/* Horarios (si no está cerrado) */}
              <AnimatePresence>
                {!form.cerrado && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-2 gap-4 overflow-hidden"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Hora Apertura
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={form.hora_inicio}
                        onChange={(e) => setForm({ ...form, hora_inicio: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Hora Cierre
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={form.hora_fin}
                        onChange={(e) => setForm({ ...form, hora_fin: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  rows={2}
                  placeholder="Notas adicionales..."
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-all resize-none"
                />
              </div>

              {/* Toggle recurrente */}
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-3">
                  <RefreshCw className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Recurrente anual</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Repetir cada año</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setForm({ ...form, recurrente_anual: !form.recurrente_anual })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    form.recurrente_anual ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <motion.div
                    animate={{ x: form.recurrente_anual ? 24 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg"
                  />
                </motion.button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={saving || !form.nombre || !form.fecha}
                className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-blue-600 rounded-xl hover:from-indigo-600 hover:to-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>Guardar</span>
                  </span>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ===============================
// MODAL BLOQUEO
// ===============================

interface BloqueoModalProps {
  isOpen: boolean;
  onClose: () => void;
  bloqueo: HorarioBloqueo | null;
  onSave: (data: Partial<HorarioBloqueo>) => Promise<void>;
  saving: boolean;
}

const BloqueoModal: React.FC<BloqueoModalProps> = ({
  isOpen,
  onClose,
  bloqueo,
  onSave,
  saving
}) => {
  const [form, setForm] = useState({
    fecha: '',
    hora_inicio: 14,
    hora_fin: 16,
    nombre: '',
    descripcion: '',
    recurrente: false,
    activo: true
  });
  const [dateError, setDateError] = useState<string | null>(null);

  // Obtener fecha mínima (hoy)
  const hoy = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (bloqueo) {
      setForm({
        fecha: bloqueo.fecha,
        hora_inicio: bloqueo.hora_inicio,
        hora_fin: bloqueo.hora_fin,
        nombre: bloqueo.nombre,
        descripcion: bloqueo.descripcion || '',
        recurrente: bloqueo.recurrente || false,
        activo: bloqueo.activo
      });
    } else {
      setForm({
        fecha: hoy,
        hora_inicio: 14,
        hora_fin: 16,
        nombre: '',
        descripcion: '',
        recurrente: false,
        activo: true
      });
    }
    setDateError(null);
  }, [bloqueo, isOpen, hoy]);

  const handleDateChange = (newDate: string) => {
    // Validar que no sea fecha pasada (solo para nuevos bloqueos)
    if (!bloqueo && newDate < hoy) {
      setDateError('No se pueden programar bloqueos en fechas pasadas');
    } else {
      setDateError(null);
    }
    setForm({ ...form, fecha: newDate });
  };

  const handleSubmit = () => {
    if (form.fecha < hoy && !bloqueo) {
      setDateError('No se pueden programar bloqueos en fechas pasadas');
      return;
    }
    if (form.hora_inicio >= form.hora_fin) {
      setDateError('La hora de inicio debe ser anterior a la hora de fin');
      return;
    }
    onSave(form);
  };

  const isFormValid = form.nombre.trim() && form.fecha && !dateError && form.hora_inicio < form.hora_fin;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-6 h-6" />
                  <h3 className="text-lg font-semibold">
                    {bloqueo ? 'Editar Bloqueo' : 'Nuevo Bloqueo'}
                  </h3>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-5">
              {/* Nombre/Motivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre del bloqueo
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Junta de equipo, Capacitación, Comida..."
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:bg-gray-800 dark:text-white transition-all"
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fecha
                </label>
                <input
                  type="date"
                  value={form.fecha}
                  min={bloqueo ? undefined : hoy}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white transition-all ${
                    dateError 
                      ? 'border-red-300 dark:border-red-700 focus:ring-red-500/20 focus:border-red-500' 
                      : 'border-gray-200 dark:border-gray-700 focus:ring-amber-500/20 focus:border-amber-500'
                  }`}
                />
                {dateError && (
                  <p className="mt-1 text-xs text-red-500">{dateError}</p>
                )}
              </div>

              {/* Horarios del bloqueo (intervalo dentro del horario) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hora Inicio
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={form.hora_inicio}
                      onChange={(e) => setForm({ ...form, hora_inicio: parseInt(e.target.value) || 0 })}
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:bg-gray-800 dark:text-white transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hora Fin
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={form.hora_fin}
                      onChange={(e) => setForm({ ...form, hora_fin: parseInt(e.target.value) || 0 })}
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:bg-gray-800 dark:text-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  rows={2}
                  placeholder="Detalles adicionales del intervalo bloqueado..."
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:bg-gray-800 dark:text-white transition-all resize-none"
                />
              </div>

              {/* Recurrente */}
              <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="flex items-center space-x-3">
                  <RefreshCw className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Recurrente semanal</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Repetir cada semana en el mismo día</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setForm({ ...form, recurrente: !form.recurrente })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    form.recurrente ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <motion.div
                    animate={{ x: form.recurrente ? 24 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg"
                  />
                </motion.button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={saving || !isFormValid}
                className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/25"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>Guardar</span>
                  </span>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ScheduleManager;

