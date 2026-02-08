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
  User, Phone, MessageSquare, MapPin, Loader2,
  CloudDownload, UserPlus, Search, ClipboardList,
  Flame, UserCheck, CheckCircle, BadgeCheck,
  UserX, HelpCircle
} from 'lucide-react';
import { analysisSupabase } from '../../config/analysisSupabase';
import { etapasService } from '../../services/etapasService';
import { AssignmentBadge } from '../analysis/AssignmentBadge';
import { PhoneText } from '../shared/PhoneDisplay';
import { EtapaBadge } from '../shared/EtapaBadge';

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
  /** @deprecated Usar etapa_id */
  etapa?: string;
  /** Campo principal - UUID FK → etapas.id */
  etapa_id?: string;
  id_dynamics?: string; // Campo necesario para visibilidad de teléfono
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
  onLoadAllColumnsInitial?: (etapaIds: string[]) => void;
  columnLoadingStates?: Record<string, { loading: boolean; page: number; hasMore: boolean }>;
  etapaTotals?: Record<string, number>;
}

// ============================================
// COLUMNAS DINÁMICAS DESDE BASE DE DATOS
// ============================================
// Migración: etapa (string) → etapa_id (FK) - 2026-01-26
// Las columnas del Kanban se generan dinámicamente desde la tabla `etapas`

const ProspectosKanban: React.FC<ProspectosKanbanProps> = ({
  prospectos,
  onProspectoClick,
  onProspectoContextMenu,
  collapsedColumns = [],
  hiddenColumns = [],
  onToggleColumnCollapse,
  getScoreColor,
  onLoadMoreForColumn,
  onLoadAllColumnsInitial,
  columnLoadingStates = {},
  etapaTotals = {}
}) => {
  const [ultimosMensajes, setUltimosMensajes] = useState<Record<string, string>>({});
  const [etapasLoaded, setEtapasLoaded] = useState(etapasService.isLoaded());
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const observerRefs = useRef<Record<string, IntersectionObserver>>({});
  const loadingMensajesRef = useRef(false);
  const prospectosIdsRef = useRef<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const autoCollapseRef = useRef(false); // Prevenir loops infinitos
  const initialLoadTriggeredRef = useRef<Set<string>>(new Set()); // Track columnas que ya iniciaron carga
  const batchLoadTriggeredRef = useRef(false); // Track si ya se disparó la carga en batch

  // Verificar si las etapas están cargadas
  useEffect(() => {
    if (!etapasService.isLoaded()) {
      etapasService.loadEtapas().then(() => {
        setEtapasLoaded(true);
      });
    } else {
      setEtapasLoaded(true);
    }
  }, []);

  // Generar checkpoints dinámicamente desde etapasService (dentro del componente)
  const CHECKPOINTS = useMemo(() => {
    if (!etapasLoaded) return {};
    
    const etapas = etapasService.getAllActive();
    const checkpoints: Record<string, {
      title: string;
      description: string;
      color: string;
      bgColor: string;
      etapaId: string;
      codigo: string;
      orden: number;
    }> = {};
    
    etapas.forEach((etapa) => {
      const checkpointKey = `checkpoint-${etapa.codigo}`;
      checkpoints[checkpointKey] = {
        title: etapa.nombre,
        description: etapa.descripcion || `Prospecto en ${etapa.nombre}`,
        color: etapa.color_ui, // Color hex desde BD
        bgColor: `${etapa.color_ui}15`, // 15% opacity para fondo
        etapaId: etapa.id,
        codigo: etapa.codigo,
        orden: etapa.orden_funnel
      };
    });
    
    return checkpoints;
  }, [etapasLoaded]);

  type CheckpointKey = keyof typeof CHECKPOINTS;

  // Generar keys ordenadas por orden_funnel
  const CHECKPOINT_KEYS: CheckpointKey[] = useMemo(() => {
    if (!etapasLoaded) return [];
    
    return Object.entries(CHECKPOINTS)
      .sort(([, a], [, b]) => a.orden - b.orden)
      .map(([key]) => key as CheckpointKey);
  }, [CHECKPOINTS, etapasLoaded]);

  // Mapeo de etapas reales a checkpoints - USA CÓDIGO DE ETAPA
  const getCheckpointForEtapa = (etapa?: string, etapaId?: string): CheckpointKey => {
    // 1. Si tenemos etapa_id, buscar por ID (preferido)
    if (etapaId) {
      const etapaData = etapasService.getById(etapaId);
      if (etapaData) {
        return `checkpoint-${etapaData.codigo}` as CheckpointKey;
      }
    }
    
    // 2. Si solo tenemos etapa (string legacy), buscar por nombre
    if (etapa) {
      const etapaData = etapasService.getByNombreLegacy(etapa);
      if (etapaData) {
        return `checkpoint-${etapaData.codigo}` as CheckpointKey;
      }
    }
    
    // 3. Fallback: primera etapa por orden
    const firstCheckpoint = CHECKPOINT_KEYS[0];
    return firstCheckpoint || 'checkpoint-validando_membresia' as CheckpointKey;
  };

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
  // Identificar etapas terminales o de baja prioridad desde la BD
  const lowPriorityColumns: CheckpointKey[] = useMemo(() => {
    const allEtapas = etapasService.getAllActive();
    // Identificar etapas terminales o con es_terminal=true
    const terminalKeys = allEtapas
      .filter(e => e.es_terminal)
      .map(e => `checkpoint-${e.codigo}` as CheckpointKey);
    
    return terminalKeys;
  }, []);

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

  // Mapeo inverso: checkpoint → etapa_id (usa código de etapa)
  const getEtapaIdForCheckpoint = (checkpoint: CheckpointKey): string | null => {
    const codigo = checkpoint.replace('checkpoint-', '');
    const etapa = etapasService.getByCodigo(codigo as any);
    return etapa?.id || null;
  };
  
  // Obtener el total real de prospectos para un checkpoint (desde BD, no del batch)
  const getTotalForCheckpoint = (checkpoint: CheckpointKey): number => {
    const etapaId = getEtapaIdForCheckpoint(checkpoint);
    if (!etapaId) return 0;
    
    // etapaTotals ahora usa etapa_id como key
    return etapaTotals[etapaId] || 0;
  };

  // Agrupar prospectos por checkpoint (dinámico)
  const prospectosPorCheckpoint = useMemo(() => {
    // Inicializar grupos vacíos para cada checkpoint
    const grouped: Record<CheckpointKey, typeof prospectosConMensajes> = {};
    CHECKPOINT_KEYS.forEach(key => {
      grouped[key] = [];
    });
    
    // Agrupar cada prospecto en su checkpoint correspondiente
    prospectosConMensajes.forEach(prospecto => {
      const checkpoint = getCheckpointForEtapa(prospecto.etapa, prospecto.etapa_id);
      if (grouped[checkpoint]) {
        grouped[checkpoint].push(prospecto);
      }
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
    
    // ✅ CARGA INICIAL EN BATCH: Si hay función de batch y no se ha disparado aún
    if (onLoadAllColumnsInitial && !batchLoadTriggeredRef.current) {
      // Recolectar todas las columnas que necesitan carga inicial
      const columnsNeedingInitialLoad: string[] = [];
      
      keysToProcess.forEach((checkpointKey) => {
        const etapaId = getEtapaIdForCheckpoint(checkpointKey);
        if (!etapaId) return;
        
        const columnState = columnLoadingStates[etapaId];
        if (columnState?.page === -1 && columnState.hasMore && !columnState.loading) {
          columnsNeedingInitialLoad.push(etapaId);
        }
      });
      
      // Si hay columnas que necesitan carga, disparar batch
      if (columnsNeedingInitialLoad.length > 0) {
        batchLoadTriggeredRef.current = true;
        console.log(`🚀 Carga inicial en BATCH para ${columnsNeedingInitialLoad.length} columnas`);
        onLoadAllColumnsInitial(columnsNeedingInitialLoad);
        return; // No continuar, esperar a que termine el batch
      }
    }
    
    // Para lazy loading (scroll), seguir usando el método individual
    keysToProcess.forEach((checkpointKey) => {
      const etapaId = getEtapaIdForCheckpoint(checkpointKey);
      if (!etapaId) return;
      
      const columnState = columnLoadingStates[etapaId];

      // Si aún está en page -1, esperar al batch
      if (columnState?.page === -1) {
        return;
      }

      // Para el observer, sí necesitamos el elemento renderizado
      const columnElement = columnRefs.current[checkpointKey];
      if (!columnElement) return;

      // Limpiar observer anterior si existe
      if (observerRefs.current[checkpointKey]) {
        observerRefs.current[checkpointKey].disconnect();
      }

      // Solo crear observer si hay más datos para cargar y página >= 0
      if (columnState?.hasMore && columnState.page >= 0) {
        // Crear nuevo observer
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting && columnState.hasMore && !columnState.loading) {
              onLoadMoreForColumn(etapaId);
            }
          },
          {
            root: columnElement,
            rootMargin: '400px', // ← Aumentado: comienza a cargar mucho antes
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
  }, [prospectosPorCheckpoint, columnLoadingStates, onLoadMoreForColumn, onLoadAllColumnsInitial, visibleCheckpointKeys]);

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
        className="bg-white dark:bg-gray-800 rounded-lg p-2.5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 mb-2 min-w-0"
      >
        {/* Nombre con truncamiento inteligente */}
        <div className="mb-2 min-w-0">
          <h4 
            className="font-medium text-sm text-gray-900 dark:text-white truncate"
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
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Phone size={10} />
              <PhoneText 
                phone={prospecto.whatsapp} 
                prospecto={prospecto}
                className="truncate"
              />
            </div>
          )}
          {prospecto.ciudad_residencia && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <MapPin size={10} />
              <span className="truncate">{prospecto.ciudad_residencia}</span>
            </div>
          )}
          {prospecto.destino_preferencia && Array.isArray(prospecto.destino_preferencia) && prospecto.destino_preferencia.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
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
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/50">
          {prospecto.score && (
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getScoreColor(prospecto.score)}`}>
              {prospecto.score}
            </span>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
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

  // Si las etapas no están cargadas o no hay checkpoints, mostrar loader
  if (!etapasLoaded || CHECKPOINT_KEYS.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando etapas...</p>
        </div>
      </div>
    );
  }

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
            
            // Obtener el componente de icono para esta etapa
            const etapaData = etapasService.getByCodigo(checkpoint.codigo as any);
            const ICON_MAP: Record<string, React.ElementType> = {
              'cloud-download': CloudDownload,
              'user-plus': UserPlus,
              'search': Search,
              'clipboard-list': ClipboardList,
              'flame': Flame,
              'phone': Phone,
              'user-check': UserCheck,
              'check-circle': CheckCircle,
              'badge-check': BadgeCheck,
              'user-x': UserX,
              'help-circle': HelpCircle,
            };
            const IconComponent = ICON_MAP[etapaData?.icono || 'help-circle'] || HelpCircle;
            
            return (
              <div
                key={checkpointKey}
                className="flex flex-col border-r border-gray-200 dark:border-gray-700 last:border-r-0"
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
                  className="border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-all duration-300 flex-shrink-0"
                  style={{
                    backgroundColor: checkpoint.bgColor,
                    padding: isCollapsed ? '0.5rem' : '0.75rem',
                    ...(isCollapsed ? {
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    } : {})
                  }}
                  onClick={() => onToggleColumnCollapse(checkpointKey)}
                >
                  {!isCollapsed ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <IconComponent 
                          size={16} 
                          className="flex-shrink-0 text-gray-700 dark:text-gray-300"
                          style={{ color: checkpoint.color }}
                        />
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                          {checkpoint.title}
                        </h3>
                      </div>
                      {/* Mostrar total real, con indicador de cargados si hay diferencia */}
                      {(() => {
                        const totalReal = getTotalForCheckpoint(checkpointKey);
                        const cargados = prospectosCheckpoint.length;
                        const hasTotalReal = totalReal > 0;
                        const showDiff = hasTotalReal && cargados < totalReal;
                        return (
                          <div className="flex flex-col items-end ml-2 flex-shrink-0">
                            <div 
                              className="min-w-6 h-6 px-1.5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: checkpoint.color }}
                            >
                              {hasTotalReal ? totalReal : cargados}
                            </div>
                            {showDiff && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 whitespace-nowrap">
                                {cargados} de {totalReal}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full w-full relative">
                      {/* Contador arriba - mostrar total real */}
                      {(() => {
                        const totalReal = getTotalForCheckpoint(checkpointKey);
                        const cargados = prospectosCheckpoint.length;
                        const hasTotalReal = totalReal > 0;
                        return (
                          <div 
                            className="min-w-6 h-6 px-1.5 rounded-full flex items-center justify-center text-white text-xs font-bold absolute top-2"
                            style={{ backgroundColor: checkpoint.color }}
                          >
                            {hasTotalReal ? totalReal : cargados}
                          </div>
                        );
                      })()}
                      {/* Título rotado 90° y centrado */}
                      <div className="flex-1 flex items-center justify-center w-full">
                        <h3 
                          className="font-semibold text-gray-900 dark:text-white text-base whitespace-nowrap"
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
                          const etapaId = getEtapaIdForCheckpoint(checkpointKey);
                          const columnState = columnLoadingStates[etapaId || ''];
                          return (
                            <div 
                              data-sentinel 
                              className="h-20 flex items-center justify-center py-2"
                            >
                              {columnState?.loading && (
                                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Cargando...</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600 text-sm">
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
          <User size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
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
