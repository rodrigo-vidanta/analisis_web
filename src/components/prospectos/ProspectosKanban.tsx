/**
 * ============================================
 * VISTA KANBAN DE PROSPECTOS
 * ============================================
 * 
 * Vista Kanban con columnas independientes
 * Cada columna tiene su propio header y contenido, sin afectar a las demás
 */

import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  User, Phone, MessageSquare, MapPin
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
}

interface ProspectosKanbanProps {
  prospectos: Prospecto[];
  onProspectoClick: (prospecto: Prospecto) => void;
  onProspectoContextMenu?: (e: React.MouseEvent, prospecto: Prospecto) => void;
  collapsedColumns?: string[];
  onToggleColumnCollapse: (columnId: string) => void;
  getStatusColor: (etapa: string) => string;
  getScoreColor: (score: string) => string;
}

// Checkpoints fijos - ORDEN CORRECTO: Es miembro, Activo PQNC, Validando membresia, En seguimiento, Interesado, Atendió llamada
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
  }
} as const;

type CheckpointKey = keyof typeof CHECKPOINTS;

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
  // Atendió llamada es la ÚLTIMA etapa
  if (etapaLower === 'atendió llamada' || etapaLower === 'atendio llamada' || etapaLower === 'atendio la llamada') return 'checkpoint #4';
  
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
  onToggleColumnCollapse,
  getScoreColor
}) => {
  const [ultimosMensajes, setUltimosMensajes] = useState<Record<string, string>>({});

  // Cargar fechas de último mensaje
  useEffect(() => {
    loadUltimosMensajes();
  }, [prospectos]);

  const loadUltimosMensajes = async () => {
    try {
      const prospectoIds = prospectos.map(p => p.id);
      
      if (prospectoIds.length === 0) return;

      const { data, error } = await analysisSupabase
        .from('mensajes_whatsapp')
        .select('prospecto_id, fecha_hora')
        .in('prospecto_id', prospectoIds)
        .order('fecha_hora', { ascending: false });

      if (error) {
        console.error('❌ Error loading últimos mensajes:', error);
        return;
      }

      const mensajesMap: Record<string, string> = {};
      
      if (data) {
        data.forEach(msg => {
          if (msg.prospecto_id && !mensajesMap[msg.prospecto_id]) {
            mensajesMap[msg.prospecto_id] = msg.fecha_hora;
          }
        });
      }

      setUltimosMensajes(mensajesMap);
    } catch (error) {
      console.error('❌ Error loading últimos mensajes:', error);
    }
  };

  // Agregar fecha_ultimo_mensaje a cada prospecto
  const prospectosConMensajes = useMemo(() => {
    return prospectos.map(p => ({
      ...p,
      fecha_ultimo_mensaje: ultimosMensajes[p.id] || null
    }));
  }, [prospectos, ultimosMensajes]);

  // Agrupar prospectos por checkpoint
  const prospectosPorCheckpoint = useMemo(() => {
    const grouped: Record<CheckpointKey, typeof prospectosConMensajes> = {
      'checkpoint #es-miembro': [],
      'checkpoint #activo-pqnc': [],
      'checkpoint #1': [],
      'checkpoint #2': [],
      'checkpoint #3': [],
      'checkpoint #4': []
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

  // Definir checkpoint keys en el orden correcto
  const checkpointKeys: CheckpointKey[] = [
    'checkpoint #es-miembro', // Es miembro (al principio, colapsado)
    'checkpoint #activo-pqnc', // Activo PQNC (al principio, colapsado)
    'checkpoint #1', // Validando membresia
    'checkpoint #2', // En seguimiento
    'checkpoint #3', // Interesado
    'checkpoint #4'  // Atendió llamada
  ];

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
        className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 mb-2"
      >
        {/* Nombre */}
        <div className="mb-2">
          <h4 className="font-medium text-sm text-slate-900 dark:text-white truncate">
            {prospecto.nombre_completo || 
             `${prospecto.nombre || ''} ${prospecto.apellido_paterno || ''} ${prospecto.apellido_materno || ''}`.trim() || 
             prospecto.nombre_whatsapp || 
             'Sin nombre'}
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
        {(prospecto.coordinacion_codigo || prospecto.ejecutivo_nombre) && (
          <div className="mb-2">
            <AssignmentBadge
              call={{
                coordinacion_codigo: prospecto.coordinacion_codigo,
                coordinacion_nombre: prospecto.coordinacion_nombre,
                ejecutivo_nombre: prospecto.ejecutivo_nombre,
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

  // Calcular ancho de cada columna
  const getColumnWidth = (isCollapsed: boolean, totalExpanded: number) => {
    if (isCollapsed) {
      return '60px'; // Columna más delgada cuando está colapsada
    }
    // Calcular el ancho disponible para columnas expandidas
    const totalCollapsedWidth = collapsedColumns.length * 60; // Usar 60px para cálculo
    const availableWidth = `calc((100% - ${totalCollapsedWidth}px) / ${totalExpanded})`;
    return availableWidth;
  };

  const totalExpanded = checkpointKeys.filter(key => !collapsedColumns.includes(key)).length;

  return (
    <div className="p-6">
      <div className="rounded-lg overflow-hidden" style={{ minHeight: 'calc(100vh - 280px)' }}>
        {/* Contenedor principal con flexbox horizontal */}
        <div className="flex gap-0 h-full" style={{ minHeight: 'calc(100vh - 280px)' }}>
          {checkpointKeys.map((checkpointKey) => {
            const checkpoint = CHECKPOINTS[checkpointKey];
            const prospectosCheckpoint = prospectosPorCheckpoint[checkpointKey];
            const isCollapsed = collapsedColumns.includes(checkpointKey);
            
            return (
              <div
                key={checkpointKey}
                className="flex flex-col border-r border-slate-200 dark:border-slate-700 last:border-r-0"
                style={{
                  width: getColumnWidth(isCollapsed, totalExpanded),
                  minWidth: isCollapsed ? '60px' : '200px', // Columna más delgada cuando está colapsada
                  flexShrink: 0,
                  flexGrow: isCollapsed ? 0 : 1
                }}
              >
                {/* Header de la columna */}
                <div
                  className={`${checkpoint.bgColor} border-b border-slate-200 dark:border-slate-700 cursor-pointer transition-all duration-300 flex-shrink-0 ${
                    isCollapsed ? 'p-2' : 'p-3'
                  }`}
                  onClick={() => onToggleColumnCollapse(checkpointKey)}
                  style={isCollapsed ? {
                    height: 'calc(100vh - 280px)',
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
                  <div className="flex-1 overflow-y-auto bg-transparent p-2">
                    {prospectosCheckpoint.length > 0 ? (
                      <div>
                        {prospectosCheckpoint.map((prospecto) => (
                          <div key={prospecto.id}>
                            {renderProspectoCard(prospecto)}
                          </div>
                        ))}
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
