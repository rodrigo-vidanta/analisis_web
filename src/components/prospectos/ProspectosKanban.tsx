/**
 * ============================================
 * VISTA KANBAN DE PROSPECTOS
 * ============================================
 * 
 * Vista Kanban con columnas independientes
 * Cada columna tiene su propio header y contenido, sin afectar a las demás
 */

import React, { useState, useEffect, useMemo, memo, useRef } from 'react';
import {
  User, Phone, MessageSquare, MapPin, Loader2
} from 'lucide-react';
import { analysisSupabase } from '../../config/analysisSupabase';
import { AssignmentBadge } from '../analysis/AssignmentBadge';

interface Prospecto {
  id: string;
  nombre_completo?: string;
  nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  nombre_whatsapp?: string;
  whatsapp?: string;
  email?: string;
  telefono_principal?: string;
  etapa?: string;
  score?: string;
  campana_origen?: string;
  ciudad_residencia?: string;
  destino_preferencia?: string[];
  created_at?: string;
  updated_at?: string;
  fecha_ultimo_mensaje?: string;
  coordinacion_id?: string;
  ejecutivo_id?: string;
  coordinacion_codigo?: string;
  coordinacion_nombre?: string;
  ejecutivo_nombre?: string;
  ejecutivo_email?: string;
  asesor_asignado?: string;
}

interface ProspectosKanbanProps {
  prospectos: Prospecto[];
  onProspectoClick: (prospecto: Prospecto) => void;
  onProspectoContextMenu?: (e: React.MouseEvent, prospecto: Prospecto) => void;
  collapsedColumns?: string[];
  hiddenColumns?: string[];
  onToggleColumnCollapse: (columnId: string) => void;
  getStatusColor: (etapa: string) => string;
  getScoreColor: (score: string) => string;
  onLoadMoreForColumn?: (etapa: string) => void;
  columnLoadingStates?: Record<string, { loading: boolean; page: number; hasMore: boolean }>;
}

// Checkpoints fijos - ORDEN CORRECTO: Es miembro, Activo PQNC, Validando membresia, En seguimiento, Interesado, Atendió llamada, Con ejecutivo, Certificado adquirido
const CHECKPOINTS = {
  'checkpoint #es-miembro': {
    title: 'Es miembro',
    description: 'Prospecto es miembro activo',
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20'
  },
  'checkpoint #activo-pqnc': {
    title: 'Activo PQNC',
    description: 'Prospecto activo en PQNC',
    color: 'bg-teal-500',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20'
  },
  'checkpoint #1': {
    title: 'Validando membresia',
    description: 'Prospecto en validación inicial',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20'
  },
  'checkpoint #2': {
    title: 'En seguimiento',
    description: 'Prospecto en proceso activo',
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20'
  },
  'checkpoint #3': {
    title: 'Interesado',
    description: 'Prospecto ha mostrado interés',
    color: 'bg-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20'
  },
  'checkpoint #4': {
    title: 'Atendió llamada',
    description: 'Prospecto atendió llamada',
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20'
  },
  'checkpoint #5': {
    title: 'Con ejecutivo',
    description: 'Prospecto asignado a ejecutivo',
    color: 'bg-indigo-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20'
  },
  'checkpoint #6': {
    title: 'Certificado adquirido',
    description: 'Prospecto adquirió certificado',
    color: 'bg-rose-500',
    bgColor: 'bg-rose-50 dark:bg-rose-900/20'
  }
} as const;

type CheckpointKey = keyof typeof CHECKPOINTS;

// Definir checkpoint keys en el orden correcto (constante fuera del componente)
const CHECKPOINT_KEYS: CheckpointKey[] = [
  'checkpoint #es-miembro', // Es miembro (al principio, colapsado)
  'checkpoint #activo-pqnc', // Activo PQNC (al principio, colapsado)
  'checkpoint #1', // Validando membresia
  'checkpoint #2', // En seguimiento
  'checkpoint #3', // Interesado
  'checkpoint #4', // Atendió llamada
  'checkpoint #5', // Con ejecutivo
  'checkpoint #6'  // Certificado adquirido
] as const;

// Mapeo de etapas reales a checkpoints - ORDEN CORRECTO
const getCheckpointForEtapa = (etapa?: string): CheckpointKey => {
  if (!etapa) return 'checkpoint #1';
  
  const etapaLower = etapa.toLowerCase().trim();
  
  // Nuevos estados al principio: Es miembro → Activo PQNC
  if (etapaLower === 'es miembro' || etapaLower === 'es miembro activo') return 'checkpoint #es-miembro';
  if (etapaLower === 'activo pqnc' || etapaLower === 'activo pqnc' || etapaLower === 'activo en pqnc') return 'checkpoint #activo-pqnc';
  
  // Orden: Validando membresia → En seguimiento → Interesado → Atendió llamada
  if (etapaLower === 'validando membresia' || etapaLower === 'validando membresía') return 'checkpoint #1';
  if (etapaLower === 'en seguimiento' || etapaLower === 'seguimiento') return 'checkpoint #2';
  if (etapaLower === 'interesado' || etapaLower === 'interesada') return 'checkpoint #3';
  // Atendió llamada
  if (etapaLower === 'atendió llamada' || etapaLower === 'atendio llamada' || etapaLower === 'atendio la llamada') return 'checkpoint #4';
  
  // Con ejecutivo (después de Atendió llamada)
  if (etapaLower === 'con ejecutivo' || etapaLower === 'con ejecutiva' || etapaLower === 'asignado a ejecutivo' || etapaLower === 'asignada a ejecutivo') return 'checkpoint #5';
  
  // Certificado adquirido (al final)
  if (etapaLower === 'certificado adquirido' || etapaLower === 'certificado comprado' || etapaLower === 'certificado obtenido') return 'checkpoint #6';
  
  // Mapeos legacy (por si acaso)
  if (etapaLower === 'propuesta') return 'checkpoint #3'; // Mapear a Interesado como fallback
  if (['transferido', 'transferida', 'finalizado', 'finalizada', 'perdido', 'perdida', 'cerrado', 'cerrada'].includes(etapaLower)) {
    return 'checkpoint #4'; // Mapear a Atendió llamada como fallback
  }
  
  return 'checkpoint #1';
};

const ProspectosKanban: React.FC<ProspectosKanbanProps> = ({
  prospectos,
  onProspectoClick,
  onProspectoContextMenu,
  collapsedColumns = [],
  hiddenColumns = [],
  onToggleColumnCollapse,
  getScoreColor,
  onLoadMoreForColumn,
  columnLoadingStates = {}
}) => {
  const [ultimosMensajes, setUltimosMensajes] = useState<Record<string, string>>({});
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const observerRefs = useRef<Record<string, IntersectionObserver>>({});
  const loadingMensajesRef = useRef(false);
  const prospectosIdsRef = useRef<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const autoCollapseRef = useRef(false); // Prevenir loops infinitos

  // Cargar fechas de último mensaje (solo si cambian los IDs de prospectos)
  useEffect(() => {
    const currentIds = prospectos.map(p => p.id).sort().join(',');
    
    // Solo cargar si los IDs realmente cambiaron
    if (currentIds === prospectosIdsRef.current || loadingMensajesRef.current) {
      return;
    }
    
    prospectosIdsRef.current = currentIds;
    loadUltimosMensajes();
  }, [prospectos]);

  const loadUltimosMensajes = async () => {
    if (loadingMensajesRef.current) return;
    loadingMensajesRef.current = true;
    
    try {
      const prospectoIds = prospectos.map(p => p.id);
      
      if (prospectoIds.length === 0) {
        loadingMensajesRef.current = false;
        return;
      }

      // ⚡ OPTIMIZACIÓN: Procesar en batches para evitar error 400 con URLs largas
      const MAX_IDS_PER_BATCH = 100;
      let allMessages: any[] = [];
      
      if (prospectoIds.length > MAX_IDS_PER_BATCH) {
        // Procesar en batches
        for (let i = 0; i < prospectoIds.length; i += MAX_IDS_PER_BATCH) {
          const batch = prospectoIds.slice(i, i + MAX_IDS_PER_BATCH);
          try {
            const { data, error } = await analysisSupabase
              .from('mensajes_whatsapp')
              .select('prospecto_id, fecha_hora')
              .in('prospecto_id', batch)
              .order('fecha_hora', { ascending: false });

            if (!error && data) {
              allMessages.push(...data);
            }
          } catch {
            // Silenciar errores de batch individual
          }
        }
      } else {
        // Query normal si hay pocos IDs
        const { data, error } = await analysisSupabase
          .from('mensajes_whatsapp')
          .select('prospecto_id, fecha_hora')
          .in('prospecto_id', prospectoIds)
          .order('fecha_hora', { ascending: false });

        if (!error && data) {
          allMessages = data;
        }
      }

      const mensajesMap: Record<string, string> = {};
      
      allMessages.forEach(msg => {
        if (msg.prospecto_id && !mensajesMap[msg.prospecto_id]) {
          mensajesMap[msg.prospecto_id] = msg.fecha_hora;
        }
      });

      setUltimosMensajes(mensajesMap);
    } catch (error) {
      // Silenciar errores
    } finally {
      loadingMensajesRef.current = false;
    }
  };

  // Agregar fecha_ultimo_mensaje a cada prospecto
  const prospectosConMensajes = useMemo(() => {
    return prospectos.map(p => ({
      ...p,
      fecha_ultimo_mensaje: ultimosMensajes[p.id] || null
    }));
  }, [prospectos, ultimosMensajes]);
  
  // Filtrar columnas ocultas (usando constante externa)
  const visibleCheckpointKeys = useMemo(() => {
    return CHECKPOINT_KEYS.filter(key => !hiddenColumns.includes(key));
  }, [hiddenColumns]);

  // Columnas menos prioritarias que se colapsan automáticamente cuando no hay espacio
  // Orden de prioridad: Es miembro → Activo PQNC → Certificado adquirido
  const lowPriorityColumns: CheckpointKey[] = useMemo(() => [
    'checkpoint #es-miembro',
    'checkpoint #activo-pqnc',
    'checkpoint #6' // Certificado adquirido
  ], []);

  // Efecto para colapsar automáticamente columnas cuando no hay espacio suficiente
  useEffect(() => {
    if (!containerRef.current || autoCollapseRef.current) return;

    const checkAndAutoCollapse = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      if (containerWidth === 0) return; // Aún no está renderizado

      const totalVisibleColumns = visibleCheckpointKeys.length;
      const currentlyCollapsed = collapsedColumns.length;
      const currentlyExpanded = totalVisibleColumns - currentlyCollapsed;

      if (currentlyExpanded === 0) return; // Ya están todas colapsadas

      // Calcular el ancho mínimo necesario
      // Columnas colapsadas: 60px cada una
      // Columnas expandidas: mínimo 120px cada una para ser funcionales
      const collapsedWidth = currentlyCollapsed * 60;
      const minExpandedWidthPerColumn = 120; // Mínimo funcional por columna expandida
      const idealExpandedWidthPerColumn = 180; // Ancho ideal por columna expandida
      const totalMinWidth = collapsedWidth + (currentlyExpanded * minExpandedWidthPerColumn);
      const totalIdealWidth = collapsedWidth + (currentlyExpanded * idealExpandedWidthPerColumn);

      // Si el espacio disponible es menor que el ideal, colapsar columnas menos prioritarias
      if (containerWidth < totalIdealWidth) {
        autoCollapseRef.current = true;
        
        // Encontrar la primera columna menos prioritaria que esté expandida
        for (const lowPriorityKey of lowPriorityColumns) {
          if (visibleCheckpointKeys.includes(lowPriorityKey) && 
              !collapsedColumns.includes(lowPriorityKey)) {
            // Colapsar esta columna
            onToggleColumnCollapse(lowPriorityKey);
            // Usar setTimeout para permitir que React procese el cambio antes de verificar de nuevo
            setTimeout(() => {
              autoCollapseRef.current = false;
            }, 200);
            return;
          }
        }
        
        autoCollapseRef.current = false;
      }
    };

    // Verificar después de un pequeño delay para asegurar que el DOM está renderizado
    const timeoutId = setTimeout(checkAndAutoCollapse, 300);

    // También verificar cuando cambia el tamaño de la ventana
    let resizeTimeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeoutId);
      resizeTimeoutId = setTimeout(() => {
        autoCollapseRef.current = false;
        checkAndAutoCollapse();
      }, 200);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(resizeTimeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [visibleCheckpointKeys, collapsedColumns, onToggleColumnCollapse, hiddenColumns, lowPriorityColumns]);

  // Mapeo inverso: checkpoint → etapas posibles
  const getEtapasForCheckpoint = (checkpoint: CheckpointKey): string[] => {
    switch (checkpoint) {
      case 'checkpoint #es-miembro':
        return ['Es miembro', 'Es miembro activo'];
      case 'checkpoint #activo-pqnc':
        return ['Activo PQNC', 'Activo en PQNC'];
      case 'checkpoint #1':
        return ['Validando membresia', 'Validando membresía'];
      case 'checkpoint #2':
        return ['En seguimiento', 'Seguimiento'];
      case 'checkpoint #3':
        return ['Interesado', 'Interesada'];
      case 'checkpoint #4':
        return ['Atendió llamada', 'Atendio llamada', 'Atendio la llamada'];
      case 'checkpoint #5':
        return ['Con ejecutivo', 'Con ejecutiva', 'Asignado a ejecutivo', 'Asignada a ejecutivo'];
      case 'checkpoint #6':
        return ['Certificado adquirido', 'Certificado comprado', 'Certificado obtenido'];
      default:
        return [];
    }
  };

  // Agrupar prospectos por checkpoint
  const prospectosPorCheckpoint = useMemo(() => {
    const grouped: Record<CheckpointKey, typeof prospectosConMensajes> = {
      'checkpoint #es-miembro': [],
      'checkpoint #activo-pqnc': [],
      'checkpoint #1': [],
      'checkpoint #2': [],
      'checkpoint #3': [],
      'checkpoint #4': [],
      'checkpoint #5': [],
      'checkpoint #6': []
    };
    
    prospectosConMensajes.forEach(prospecto => {
      const checkpoint = getCheckpointForEtapa(prospecto.etapa);
      grouped[checkpoint].push(prospecto);
    });
    
    // Ordenar cada grupo por fecha de último mensaje
    Object.keys(grouped).forEach(checkpoint => {
      grouped[checkpoint as CheckpointKey].sort((a, b) => {
        const fechaA = a.fecha_ultimo_mensaje || a.created_at || '';
        const fechaB = b.fecha_ultimo_mensaje || b.created_at || '';
        
        if (!fechaA && !fechaB) return 0;
        if (!fechaA) return 1;
        if (!fechaB) return -1;
        
        return new Date(fechaB).getTime() - new Date(fechaA).getTime();
      });
    });
    
    return grouped;
  }, [prospectosConMensajes]);

  // Configurar Intersection Observer para cada columna
  useEffect(() => {
    if (!onLoadMoreForColumn) return;

    // Crear una copia estable de las keys para evitar recrear observers innecesariamente
    const keysToProcess = [...visibleCheckpointKeys];
    
    keysToProcess.forEach((checkpointKey) => {
      const etapas = getEtapasForCheckpoint(checkpointKey);
      const etapa = etapas[0]; // Usar la primera etapa como identificador
      const columnElement = columnRefs.current[checkpointKey];
      const columnState = columnLoadingStates[etapa];

      if (!columnElement) return;

      // Limpiar observer anterior si existe
      if (observerRefs.current[checkpointKey]) {
        observerRefs.current[checkpointKey].disconnect();
      }

      // Solo crear observer si hay más datos para cargar
      if (columnState?.hasMore) {
        // Crear nuevo observer
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting && columnState.hasMore && !columnState.loading) {
              onLoadMoreForColumn(etapa);
            }
          },
          {
            root: columnElement,
            rootMargin: '200px',
            threshold: 0.1
          }
        );

        // Buscar el elemento sentinela (último elemento con data-sentinel)
        const sentinel = columnElement.querySelector('[data-sentinel]');
        if (sentinel) {
          observer.observe(sentinel);
          observerRefs.current[checkpointKey] = observer;
        }
      }
    });

    return () => {
      Object.values(observerRefs.current).forEach(observer => observer.disconnect());
    };
  }, [prospectosPorCheckpoint, columnLoadingStates, onLoadMoreForColumn, visibleCheckpointKeys]);

  const formatFechaUltimoMensaje = (fecha: string | null) => {
    if (!fecha) return 'Sin mensajes';
    
    const fechaMsg = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora.getTime() - fechaMsg.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    
    return fechaMsg.toLocaleDateString('es-MX', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  // Renderizar card de prospecto
  const renderProspectoCard = (prospecto: Prospecto) => {
    return (
      <div
        onClick={() => onProspectoClick(prospecto)}
        onContextMenu={(e) => {
          if (onProspectoContextMenu) {
            e.preventDefault();
            onProspectoContextMenu(e, prospecto);
          }
        }}
        className="bg-white dark:bg-slate-800 rounded-lg p-2.5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 mb-2 min-w-0"
      >
        {/* Nombre con truncamiento inteligente */}
        <div className="mb-2 min-w-0">
          <h4 
            className="font-medium text-sm text-slate-900 dark:text-white truncate"
            title={prospecto.nombre_completo || 
                   `${prospecto.nombre || ''} ${prospecto.apellido_paterno || ''} ${prospecto.apellido_materno || ''}`.trim() || 
                   prospecto.nombre_whatsapp || 
                   'Sin nombre'}
          >
            {(() => {
              const nombreCompleto = prospecto.nombre_completo || 
                `${prospecto.nombre || ''} ${prospecto.apellido_paterno || ''} ${prospecto.apellido_materno || ''}`.trim() || 
                prospecto.nombre_whatsapp || 
                'Sin nombre';
              
              // Truncamiento inteligente: mostrar primeros nombres y primer apellido con puntos suspensivos
              // Ejemplo: "Darig Samuel Rosales Robledo" -> "Darig Samuel Ros..."
              const partes = nombreCompleto.trim().split(/\s+/).filter(p => p.length > 0);
              
              if (partes.length <= 2) {
                // Si tiene 2 palabras o menos, mostrar completo (el truncate CSS se encargará si es muy largo)
                return nombreCompleto;
              } else if (partes.length === 3) {
                // Si tiene 3 palabras: "Nombre Apellido1 Apellido2" -> "Nombre Apellido1..."
                return `${partes[0]} ${partes[1]}...`;
              } else {
                // Si tiene más de 3 palabras: mostrar primeros nombres + primeras 3 letras del primer apellido
                // Ejemplo: "Darig Samuel Rosales Robledo" -> "Darig Samuel Ros..."
                const primerosNombres = partes.slice(0, -2).join(' '); // Todos excepto los últimos 2 (apellidos)
                const primerApellido = partes[partes.length - 2]; // Primer apellido
                const primerApellidoTruncado = primerApellido.substring(0, 3); // Primeras 3 letras
                return `${primerosNombres} ${primerApellidoTruncado}...`;
              }
            })()}
          </h4>
        </div>

        {/* Información compacta */}
        <div className="space-y-1 mb-2">
          {prospecto.whatsapp && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Phone size={10} />
              <span className="font-mono truncate">{prospecto.whatsapp}</span>
            </div>
          )}
          {prospecto.ciudad_residencia && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <MapPin size={10} />
              <span className="truncate">{prospecto.ciudad_residencia}</span>
            </div>
          )}
          {prospecto.destino_preferencia && Array.isArray(prospecto.destino_preferencia) && prospecto.destino_preferencia.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <MapPin size={10} />
              <span className="truncate" title={prospecto.destino_preferencia.join(', ')}>
                {prospecto.destino_preferencia.slice(0, 2).join(', ')}
                {prospecto.destino_preferencia.length > 2 && '...'}
              </span>
            </div>
          )}
        </div>

        {/* Información de asignación */}
        {(prospecto.coordinacion_codigo || prospecto.ejecutivo_nombre || prospecto.asesor_asignado) && (
          <div className="mb-2">
            <AssignmentBadge
              call={{
                coordinacion_codigo: prospecto.coordinacion_codigo,
                coordinacion_nombre: prospecto.coordinacion_nombre,
                ejecutivo_nombre: prospecto.ejecutivo_nombre || prospecto.asesor_asignado,
                ejecutivo_email: prospecto.ejecutivo_email
              } as any}
              variant="compact"
            />
          </div>
        )}

        {/* Score y última actividad */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50">
          {prospecto.score && (
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getScoreColor(prospecto.score)}`}>
              {prospecto.score}
            </span>
          )}
          <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
            <MessageSquare size={9} />
            <span>{formatFechaUltimoMensaje(prospecto.fecha_ultimo_mensaje)}</span>
          </div>
        </div>
      </div>
    );
  };

  // Calcular ancho de cada columna (responsivo y adaptativo, respetando el contenedor)
  const getColumnWidth = (isCollapsed: boolean, totalExpanded: number) => {
    if (isCollapsed) {
      return '60px'; // Columna más delgada cuando está colapsada
    }
    // Calcular el ancho disponible para columnas expandidas
    // Asegurar que el total no exceda el 100% del contenedor
    const totalCollapsedWidth = collapsedColumns.length * 60; // Usar 60px para cálculo
    if (totalExpanded === 0) {
      return '0px'; // No hay columnas expandidas
    }
    // Dividir el espacio disponible entre las columnas expandidas
    // El ancho se calcula dinámicamente para que todas las columnas quepan
    const availableWidth = `calc((100% - ${totalCollapsedWidth}px) / ${totalExpanded})`;
    return availableWidth;
  };

  const totalExpanded = visibleCheckpointKeys.filter(key => !collapsedColumns.includes(key)).length;

  return (
    <div className="h-full flex flex-col w-full" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      <div className="rounded-lg overflow-hidden flex-1 flex flex-col w-full" style={{ height: '100%', maxHeight: '100%', width: '100%', maxWidth: '100%' }}>
        {/* Contenedor principal con flexbox horizontal - responsivo, sin scroll horizontal */}
        <div 
          ref={containerRef}
          className="flex gap-0 flex-1 w-full overflow-x-hidden scrollbar-hide" 
          style={{ 
            height: '100%', 
            maxHeight: '100%', 
            minHeight: 0,
            // Asegurar que el contenedor use exactamente el ancho disponible sin exceder
            width: '100%',
            maxWidth: '100%',
            overflowX: 'hidden' // Forzar sin scroll horizontal
          }}
        >
          {visibleCheckpointKeys.map((checkpointKey) => {
            const checkpoint = CHECKPOINTS[checkpointKey];
            const prospectosCheckpoint = prospectosPorCheckpoint[checkpointKey];
            const isCollapsed = collapsedColumns.includes(checkpointKey);
            
            return (
              <div
                key={checkpointKey}
                className="flex flex-col border-r border-slate-200 dark:border-slate-700 last:border-r-0"
                style={{
                  width: getColumnWidth(isCollapsed, totalExpanded),
                  // Ancho mínimo funcional que permite que se ajusten al espacio disponible
                  minWidth: isCollapsed ? '60px' : '100px', // Mínimo funcional para que el contenido sea legible
                  flexShrink: isCollapsed ? 0 : 1, // Permitir que se reduzcan si es necesario
                  flexGrow: isCollapsed ? 0 : 1, // Crecer para llenar espacio disponible
                  height: '100%',
                  maxHeight: '100%',
                  minHeight: 0, // Necesario para que el scroll funcione en flexbox
                  boxSizing: 'border-box' // Incluir padding y border en el cálculo del ancho
                }}
              >
                {/* Header de la columna */}
                <div
                  className={`${checkpoint.bgColor} border-b border-slate-200 dark:border-slate-700 cursor-pointer transition-all duration-300 flex-shrink-0 ${
                    isCollapsed ? 'p-2' : 'p-3'
                  }`}
                  onClick={() => onToggleColumnCollapse(checkpointKey)}
                  style={isCollapsed ? {
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  } : {}}
                >
                  {!isCollapsed ? (
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-xs leading-tight">
                          {checkpoint.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-tight">
                          {checkpoint.description}
                        </p>
                      </div>
                      <div className={`w-6 h-6 ${checkpoint.color} rounded-full flex items-center justify-center text-white text-xs font-bold ml-2 flex-shrink-0`}>
                        {prospectosCheckpoint.length}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full w-full relative">
                      {/* Contador arriba, en posición normal */}
                      <div className={`w-6 h-6 ${checkpoint.color} rounded-full flex items-center justify-center text-white text-xs font-bold absolute top-2`}>
                        {prospectosCheckpoint.length}
                      </div>
                      {/* Título rotado 90° y centrado */}
                      <div className="flex-1 flex items-center justify-center w-full">
                        <h3 
                          className="font-semibold text-slate-900 dark:text-white text-base whitespace-nowrap"
                          style={{ 
                            transform: 'rotate(-90deg)',
                            transformOrigin: 'center center',
                            letterSpacing: '0.05em'
                          }}
                        >
                          {checkpoint.title}
                        </h3>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Contenido de la columna - Solo visible si no está colapsada */}
                {!isCollapsed && (
                  <div 
                    ref={(el) => {
                      columnRefs.current[checkpointKey] = el;
                    }}
                    className="flex-1 overflow-y-auto bg-transparent p-2 scrollbar-hide min-w-0"
                    style={{
                      height: 0, // Necesario para que flex-1 funcione con overflow
                      minHeight: 0, // Necesario para que el scroll funcione
                      width: '100%',
                      maxWidth: '100%'
                    }}
                  >
                    {prospectosCheckpoint.length > 0 ? (
                      <div>
                        {prospectosCheckpoint.map((prospecto) => (
                          <div key={prospecto.id}>
                            {renderProspectoCard(prospecto)}
                          </div>
                        ))}
                        {/* Elemento sentinel para infinite scrolling */}
                        {(() => {
                          const etapas = getEtapasForCheckpoint(checkpointKey);
                          const etapa = etapas[0];
                          const columnState = columnLoadingStates[etapa];
                          return (
                            <div 
                              data-sentinel 
                              className="h-20 flex items-center justify-center py-2"
                            >
                              {columnState?.loading && (
                                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Cargando...</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-600 text-sm">
                        Sin prospectos
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Mensaje si no hay prospectos */}
      {prospectosConMensajes.length === 0 && (
        <div className="text-center py-12">
          <User size={48} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            No hay prospectos para mostrar
          </p>
        </div>
      )}
    </div>
  );
};

// Optimización: Solo re-renderizar si realmente cambian los datos relevantes
export default memo(ProspectosKanban, (prevProps, nextProps) => {
  // Si cambió la cantidad de prospectos, necesita re-render
  if (prevProps.prospectos.length !== nextProps.prospectos.length) return false;
  
  // Si cambió el estado de columnas colapsadas, necesita re-render
  if (prevProps.collapsedColumns.length !== nextProps.collapsedColumns.length) return false;
  if (!prevProps.collapsedColumns.every((col, i) => col === nextProps.collapsedColumns[i])) return false;
  
  // Si cambió el estado de columnas ocultas, necesita re-render
  const prevHidden = prevProps.hiddenColumns || [];
  const nextHidden = nextProps.hiddenColumns || [];
  if (prevHidden.length !== nextHidden.length) return false;
  if (!prevHidden.every((col, i) => col === nextHidden[i])) return false;
  
  // Crear mapas para comparación eficiente
  const prevMap = new Map(prevProps.prospectos.map(p => [p.id, p.etapa]));
  const nextMap = new Map(nextProps.prospectos.map(p => [p.id, p.etapa]));
  
  // Si hay IDs diferentes, necesita re-render
  if (prevMap.size !== nextMap.size) return false;
  
  // Si alguna etapa cambió, necesita re-render
  for (const [id, etapa] of prevMap) {
    if (nextMap.get(id) !== etapa) return false;
  }
  
  // Si no hay cambios relevantes, no re-renderizar
  return true;
});
