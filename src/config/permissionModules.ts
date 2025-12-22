/**
 * ============================================
 * CATÁLOGO DE MÓDULOS Y PERMISOS
 * ============================================
 * 
 * Fuente única de verdad para todos los módulos del sistema
 * y sus acciones/permisos disponibles.
 * 
 * Este archivo define:
 * 1. Módulos del sistema
 * 2. Acciones disponibles por módulo
 * 3. Permisos por defecto según rol base
 * 4. Widgets del dashboard de inicio
 */

// ============================================
// TIPOS E INTERFACES
// ============================================

export type PermissionAction = 
  | 'view'           // Ver/leer
  | 'view_details'   // Ver detalles completos
  | 'view_all'       // Ver todos (sin filtros de propiedad)
  | 'create'         // Crear
  | 'edit'           // Editar
  | 'delete'         // Eliminar
  | 'assign'         // Asignar/reasignar
  | 'bulk_assign'    // Asignación masiva
  | 'export'         // Exportar datos
  | 'archive'        // Archivar
  | 'block'          // Bloquear
  | 'unblock'        // Desbloquear
  | 'manage_permissions' // Gestionar permisos
  | 'reset_password' // Resetear contraseña
  | 'toggle_operativo' // Cambiar estado operativo
  | 'send_messages'  // Enviar mensajes
  | 'send_images'    // Enviar imágenes
  | 'send_voice'     // Enviar audio
  | 'schedule_call'  // Programar llamada
  | 'use_paraphrase' // Usar IA de parafraseo
  | 'view_analytics' // Ver analíticas
  | 'manage_quick_replies' // Gestionar respuestas rápidas
  | 'assign_conversation' // Asignar conversación
  | 'listen_live'    // Escuchar en vivo
  | 'view_transcription' // Ver transcripción
  | 'send_whisper'   // Enviar mensaje whisper
  | 'take_over'      // Tomar control de llamada
  | 'view_metrics'   // Ver métricas
  | 'export_report'  // Exportar reporte
  | 'view_natalia'   // Ver análisis Natalia
  | 'view_pqnc'      // Ver análisis PQNC
  | 'play_audio'     // Reproducir audio
  | 'download_audio' // Descargar audio
  | 'export_analysis' // Exportar análisis
  | 'view_agent_performance' // Ver rendimiento de agente
  | 'change_stage'   // Cambiar etapa
  | 'view_history'   // Ver historial
  | 'create_activity' // Crear actividad
  | 'edit_activity'  // Editar actividad
  | 'delete_activity' // Eliminar actividad
  | 'archive_activity' // Archivar actividad
  | 'add_subtask'    // Añadir subtarea
  | 'process_with_ai' // Procesar con IA
  | 'assign_backup'  // Asignar backup
  | 'change_status'  // Cambiar estatus
  | 'assign_coordinador' // Asignar coordinador
  | 'revoke'         // Revocar token
  | 'filter'         // Filtrar
  | 'clear'          // Limpiar
  | 'start_service'  // Iniciar servicio
  | 'stop_service'   // Detener servicio
  | 'scale_service'  // Escalar servicio
  | 'view_costs'     // Ver costos
  | 'download'       // Descargar
  | 'deploy'         // Desplegar
  | 'import'         // Importar
  | 'duplicate';     // Duplicar

export type RoleBase = 
  | 'admin'
  | 'administrador_operativo'
  | 'coordinador'
  | 'ejecutivo'
  | 'evaluador'
  | 'developer'
  | 'direccion';

export interface ModuleAction {
  id: PermissionAction;
  name: string;
  description: string;
  /** Roles que tienen este permiso por defecto */
  defaultRoles: RoleBase[];
  /** Si el permiso está restringido al scope del usuario (su coordinación, sus prospectos, etc.) */
  scopeRestricted?: boolean;
}

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  /** Acciones disponibles en este módulo */
  actions: ModuleAction[];
  /** Sub-módulos (para módulos compuestos como admin) */
  subModules?: ModuleDefinition[];
}

export interface DashboardWidget {
  id: string;
  name: string;
  description: string;
  /** Módulo asociado (para heredar permisos) */
  relatedModule: string;
  /** Acción requerida para ver este widget */
  requiredAction: PermissionAction;
}

// ============================================
// WIDGETS DEL DASHBOARD DE INICIO
// ============================================

export const DASHBOARD_WIDGETS: DashboardWidget[] = [
  {
    id: 'prospectos',
    name: 'Prospectos Nuevos',
    description: 'Muestra prospectos que requieren atención',
    relatedModule: 'prospectos',
    requiredAction: 'view'
  },
  {
    id: 'conversaciones',
    name: 'Últimas Conversaciones',
    description: 'Conversaciones de chat recientes',
    relatedModule: 'live-chat',
    requiredAction: 'view'
  },
  {
    id: 'llamadas-activas',
    name: 'Llamadas Activas',
    description: 'Llamadas en curso en tiempo real',
    relatedModule: 'live-monitor',
    requiredAction: 'view'
  },
  {
    id: 'llamadas-programadas',
    name: 'Llamadas Programadas',
    description: 'Calendario de llamadas del día',
    relatedModule: 'scheduled-calls',
    requiredAction: 'view'
  }
];

// ============================================
// CATÁLOGO DE MÓDULOS
// ============================================

export const MODULE_CATALOG: ModuleDefinition[] = [
  // ========== DASHBOARD DE INICIO ==========
  {
    id: 'operative-dashboard',
    name: 'Dashboard Inicio',
    description: 'Pantalla principal con widgets operativos',
    icon: 'LayoutDashboard',
    color: 'from-blue-500 to-indigo-600',
    actions: [
      {
        id: 'view',
        name: 'Ver dashboard',
        description: 'Acceder al dashboard principal',
        defaultRoles: ['admin', 'administrador_operativo', 'coordinador', 'ejecutivo', 'developer']
      },
      {
        id: 'view_all',
        name: 'Ver todos los widgets',
        description: 'Ver todos los widgets sin restricción de propiedad',
        defaultRoles: ['admin', 'administrador_operativo']
      }
    ]
  },

  // ========== PROSPECTOS ==========
  {
    id: 'prospectos',
    name: 'Prospectos',
    description: 'Gestión completa de prospectos',
    icon: 'Users',
    color: 'from-emerald-500 to-teal-600',
    actions: [
      {
        id: 'view',
        name: 'Ver prospectos',
        description: 'Ver lista de prospectos',
        defaultRoles: ['admin', 'administrador_operativo', 'coordinador', 'ejecutivo', 'developer'],
        scopeRestricted: true
      },
      {
        id: 'view_details',
        name: 'Ver detalles',
        description: 'Ver información completa del prospecto',
        defaultRoles: ['admin', 'administrador_operativo', 'coordinador', 'ejecutivo', 'developer'],
        scopeRestricted: true
      },
      {
        id: 'view_all',
        name: 'Ver todos',
        description: 'Ver prospectos de todas las coordinaciones',
        defaultRoles: ['admin', 'administrador_operativo']
      },
      {
        id: 'create',
        name: 'Crear prospecto',
        description: 'Crear nuevos prospectos',
        defaultRoles: ['admin', 'administrador_operativo', 'coordinador']
      },
      {
        id: 'edit',
        name: 'Editar prospecto',
        description: 'Modificar información del prospecto',
        defaultRoles: ['admin', 'administrador_operativo', 'coordinador', 'ejecutivo'],
        scopeRestricted: true
      },
      {
        id: 'delete',
        name: 'Eliminar prospecto',
        description: 'Eliminar prospectos del sistema',
        defaultRoles: ['admin']
      },
      {
        id: 'assign',
        name: 'Asignar prospecto',
        description: 'Reasignar prospecto a otro ejecutivo',
        defaultRoles: ['admin', 'administrador_operativo', 'coordinador'],
        scopeRestricted: true
      },
      {
        id: 'bulk_assign',
        name: 'Asignación masiva',
        description: 'Reasignar múltiples prospectos',
        defaultRoles: ['admin', 'administrador_operativo', 'coordinador']
      },
      {
        id: 'export',
        name: 'Exportar datos',
        description: 'Exportar prospectos a archivo',
        defaultRoles: ['admin', 'administrador_operativo', 'coordinador']
      },
      {
        id: 'change_stage',
        name: 'Cambiar etapa',
        description: 'Modificar la etapa del prospecto',
        defaultRoles: ['admin', 'administrador_operativo', 'coordinador', 'ejecutivo'],
        scopeRestricted: true
      },
      {
        id: 'view_history',
        name: 'Ver historial',
        description: 'Ver historial de interacciones',
        defaultRoles: ['admin', 'administrador_operativo', 'coordinador', 'ejecutivo'],
        scopeRestricted: true
      }
    ]
  },

  // ========== LIVE CHAT ==========
  {
    id: 'live-chat',
    name: 'Live Chat',
    description: 'Gestión de conversaciones de WhatsApp',
    icon: 'MessageCircle',
    color: 'from-green-500 to-emerald-600',
    actions: [
      {
        id: 'view',
        name: 'Ver conversaciones',
        description: 'Acceder al módulo de chat',
        defaultRoles: ['admin', 'administrador_operativo', 'coordinador', 'ejecutivo', 'developer'],
        scopeRestricted: true
      },
      {
        id: 'view_all',
        name: 'Ver todas las conversaciones',
        description: 'Ver conversaciones de todos los prospectos',
        defaultRoles: ['admin', 'administrador_operativo']
      },
      {
        id: 'send_messages',
        name: 'Enviar mensajes',
        description: 'Enviar mensajes de texto',
        defaultRoles: ['admin', 'coordinador', 'ejecutivo'],
        scopeRestricted: true
      },
      {
        id: 'send_images',
        name: 'Enviar imágenes',
        description: 'Enviar archivos multimedia',
        defaultRoles: ['admin', 'coordinador', 'ejecutivo'],
        scopeRestricted: true
      },
      {
        id: 'send_voice',
        name: 'Enviar audio',
        description: 'Enviar mensajes de voz',
        defaultRoles: ['admin', 'coordinador', 'ejecutivo'],
        scopeRestricted: true
      },
      {
        id: 'schedule_call',
        name: 'Programar llamada',
        description: 'Agendar llamadas desde el chat',
        defaultRoles: ['admin', 'coordinador', 'ejecutivo'],
        scopeRestricted: true
      },
      {
        id: 'use_paraphrase',
        name: 'Usar parafraseo IA',
        description: 'Utilizar IA para parafrasear mensajes',
        defaultRoles: ['admin', 'coordinador', 'ejecutivo']
      },
      {
        id: 'view_analytics',
        name: 'Ver analíticas',
        description: 'Ver estadísticas del chat',
        defaultRoles: ['admin', 'administrador_operativo', 'coordinador']
      },
      {
        id: 'manage_quick_replies',
        name: 'Gestionar respuestas rápidas',
        description: 'Administrar plantillas de respuestas',
        defaultRoles: ['admin']
      },
      {
        id: 'assign_conversation',
        name: 'Asignar conversación',
        description: 'Reasignar conversación a otro ejecutivo',
        defaultRoles: ['admin', 'coordinador'],
        scopeRestricted: true
      }
    ]
  },

  // ========== LIVE MONITOR ==========
  {
    id: 'live-monitor',
    name: 'Live Monitor',
    description: 'Monitoreo de llamadas en tiempo real',
    icon: 'Radio',
    color: 'from-purple-500 to-violet-600',
    actions: [
      {
        id: 'view',
        name: 'Ver llamadas activas',
        description: 'Acceder al monitor de llamadas',
        defaultRoles: ['admin', 'administrador_operativo', 'coordinador', 'ejecutivo', 'evaluador', 'developer'],
        scopeRestricted: true
      },
      {
        id: 'view_all',
        name: 'Ver todas las llamadas',
        description: 'Ver llamadas de todas las coordinaciones',
        defaultRoles: ['admin', 'administrador_operativo', 'evaluador']
      },
      {
        id: 'listen_live',
        name: 'Escuchar en vivo',
        description: 'Escuchar llamadas en tiempo real',
        defaultRoles: ['admin', 'administrador_operativo', 'coordinador', 'ejecutivo', 'evaluador'],
        scopeRestricted: true
      },
      {
        id: 'view_transcription',
        name: 'Ver transcripción',
        description: 'Ver transcripción en tiempo real',
        defaultRoles: ['admin', 'administrador_operativo', 'coordinador', 'ejecutivo', 'evaluador'],
        scopeRestricted: true
      },
      {
        id: 'send_whisper',
        name: 'Enviar whisper',
        description: 'Enviar mensaje susurrado al agente',
        defaultRoles: ['admin', 'coordinador']
      },
      {
        id: 'take_over',
        name: 'Tomar control',
        description: 'Tomar control de la llamada',
        defaultRoles: ['admin', 'coordinador']
      },
      {
        id: 'view_metrics',
        name: 'Ver métricas',
        description: 'Ver estadísticas de llamadas',
        defaultRoles: ['admin', 'administrador_operativo', 'coordinador', 'evaluador']
      },
      {
        id: 'export_report',
        name: 'Exportar reporte',
        description: 'Exportar reporte de llamadas',
        defaultRoles: ['admin', 'administrador_operativo', 'coordinador']
      }
    ]
  },

  // ========== ANÁLISIS IA ==========
  {
    id: 'analisis',
    name: 'Análisis IA',
    description: 'Análisis de llamadas con inteligencia artificial',
    icon: 'Brain',
    color: 'from-amber-500 to-orange-600',
    actions: [
      {
        id: 'view',
        name: 'Acceder al módulo',
        description: 'Ver módulo de análisis',
        defaultRoles: ['admin', 'coordinador', 'ejecutivo', 'evaluador', 'developer']
      },
      {
        id: 'view_natalia',
        name: 'Ver análisis Natalia',
        description: 'Acceder a análisis de Natalia IA',
        defaultRoles: ['admin', 'coordinador', 'ejecutivo', 'evaluador', 'developer']
      },
      {
        id: 'view_pqnc',
        name: 'Ver análisis PQNC',
        description: 'Acceder a análisis de PQNC Humans',
        defaultRoles: ['admin', 'coordinador', 'ejecutivo', 'evaluador', 'developer']
      },
      {
        id: 'view_details',
        name: 'Ver detalle de llamada',
        description: 'Ver información detallada de análisis',
        defaultRoles: ['admin', 'coordinador', 'ejecutivo', 'evaluador', 'developer'],
        scopeRestricted: true
      },
      {
        id: 'play_audio',
        name: 'Reproducir audio',
        description: 'Escuchar grabaciones de llamadas',
        defaultRoles: ['admin', 'coordinador', 'ejecutivo', 'evaluador', 'developer'],
        scopeRestricted: true
      },
      {
        id: 'download_audio',
        name: 'Descargar audio',
        description: 'Descargar archivos de audio',
        defaultRoles: ['admin', 'coordinador']
      },
      {
        id: 'export_analysis',
        name: 'Exportar análisis',
        description: 'Exportar datos de análisis',
        defaultRoles: ['admin', 'coordinador', 'evaluador']
      },
      {
        id: 'view_agent_performance',
        name: 'Ver rendimiento de agente',
        description: 'Ver métricas de desempeño',
        defaultRoles: ['admin', 'coordinador', 'evaluador']
      }
    ]
  },

  // ========== LLAMADAS PROGRAMADAS ==========
  {
    id: 'scheduled-calls',
    name: 'Llamadas Programadas',
    description: 'Gestión de calendario de llamadas',
    icon: 'Calendar',
    color: 'from-cyan-500 to-blue-600',
    actions: [
      {
        id: 'view',
        name: 'Ver calendario',
        description: 'Ver llamadas programadas',
        defaultRoles: ['admin', 'administrador_operativo', 'coordinador', 'ejecutivo'],
        scopeRestricted: true
      },
      {
        id: 'view_all',
        name: 'Ver todas las llamadas',
        description: 'Ver llamadas de todas las coordinaciones',
        defaultRoles: ['admin', 'administrador_operativo']
      },
      {
        id: 'create',
        name: 'Programar llamada',
        description: 'Crear nueva llamada programada',
        defaultRoles: ['admin', 'coordinador', 'ejecutivo'],
        scopeRestricted: true
      },
      {
        id: 'edit',
        name: 'Reprogramar',
        description: 'Modificar fecha/hora de llamada',
        defaultRoles: ['admin', 'coordinador', 'ejecutivo'],
        scopeRestricted: true
      },
      {
        id: 'delete',
        name: 'Cancelar llamada',
        description: 'Eliminar llamada programada',
        defaultRoles: ['admin', 'coordinador', 'ejecutivo'],
        scopeRestricted: true
      }
    ]
  },

  // ========== DIRECCIÓN ==========
  {
    id: 'direccion',
    name: 'Dirección',
    description: 'Timeline y gestión de actividades para dirección',
    icon: 'Briefcase',
    color: 'from-slate-600 to-gray-700',
    actions: [
      {
        id: 'view',
        name: 'Ver timeline',
        description: 'Acceder al módulo de dirección',
        defaultRoles: ['admin', 'direccion']
      },
      {
        id: 'create_activity',
        name: 'Crear actividad',
        description: 'Crear nuevas actividades',
        defaultRoles: ['admin', 'direccion']
      },
      {
        id: 'edit_activity',
        name: 'Editar actividad',
        description: 'Modificar actividades existentes',
        defaultRoles: ['admin', 'direccion']
      },
      {
        id: 'delete_activity',
        name: 'Eliminar actividad',
        description: 'Eliminar actividades',
        defaultRoles: ['admin', 'direccion']
      },
      {
        id: 'archive_activity',
        name: 'Archivar actividad',
        description: 'Archivar actividades completadas',
        defaultRoles: ['admin', 'direccion']
      },
      {
        id: 'add_subtask',
        name: 'Añadir subtarea',
        description: 'Agregar subtareas a actividades',
        defaultRoles: ['admin', 'direccion']
      },
      {
        id: 'process_with_ai',
        name: 'Procesar con IA',
        description: 'Usar IA para estructurar actividades',
        defaultRoles: ['admin', 'direccion']
      }
    ]
  },

  // ========== ADMINISTRACIÓN ==========
  {
    id: 'admin',
    name: 'Administración',
    description: 'Gestión del sistema y usuarios',
    icon: 'Settings',
    color: 'from-red-500 to-rose-600',
    actions: [
      {
        id: 'view',
        name: 'Acceder a administración',
        description: 'Ver módulo de administración',
        defaultRoles: ['admin', 'administrador_operativo', 'coordinador']
      }
    ],
    subModules: [
      {
        id: 'admin.usuarios',
        name: 'Usuarios',
        description: 'Gestión de usuarios del sistema',
        icon: 'Users',
        color: 'from-blue-500 to-indigo-600',
        actions: [
          {
            id: 'view',
            name: 'Ver usuarios',
            description: 'Ver lista de usuarios',
            defaultRoles: ['admin', 'administrador_operativo', 'coordinador'],
            scopeRestricted: true
          },
          {
            id: 'create',
            name: 'Crear usuario',
            description: 'Crear nuevos usuarios',
            defaultRoles: ['admin', 'administrador_operativo']
          },
          {
            id: 'edit',
            name: 'Editar usuario',
            description: 'Modificar información de usuarios',
            defaultRoles: ['admin', 'administrador_operativo']
          },
          {
            id: 'delete',
            name: 'Eliminar usuario',
            description: 'Eliminar usuarios del sistema',
            defaultRoles: ['admin']
          },
          {
            id: 'archive',
            name: 'Archivar usuario',
            description: 'Archivar usuarios inactivos',
            defaultRoles: ['admin', 'administrador_operativo']
          },
          {
            id: 'block',
            name: 'Bloquear usuario',
            description: 'Bloquear acceso de usuarios',
            defaultRoles: ['admin', 'administrador_operativo']
          },
          {
            id: 'unblock',
            name: 'Desbloquear usuario',
            description: 'Restaurar acceso de usuarios',
            defaultRoles: ['admin', 'administrador_operativo']
          },
          {
            id: 'toggle_operativo',
            name: 'Cambiar estado operativo',
            description: 'Activar/desactivar modo operativo',
            defaultRoles: ['admin', 'administrador_operativo']
          },
          {
            id: 'manage_permissions',
            name: 'Gestionar permisos',
            description: 'Administrar permisos individuales',
            defaultRoles: ['admin']
          },
          {
            id: 'reset_password',
            name: 'Resetear contraseña',
            description: 'Restablecer contraseñas de usuarios',
            defaultRoles: ['admin', 'administrador_operativo']
          }
        ]
      },
      {
        id: 'admin.grupos',
        name: 'Grupos de Permisos',
        description: 'Gestión de grupos de permisos',
        icon: 'Shield',
        color: 'from-purple-500 to-violet-600',
        actions: [
          {
            id: 'view',
            name: 'Ver grupos',
            description: 'Ver lista de grupos',
            defaultRoles: ['admin', 'administrador_operativo']
          },
          {
            id: 'create',
            name: 'Crear grupo',
            description: 'Crear nuevos grupos de permisos',
            defaultRoles: ['admin']
          },
          {
            id: 'edit',
            name: 'Editar grupo',
            description: 'Modificar configuración de grupos',
            defaultRoles: ['admin']
          },
          {
            id: 'delete',
            name: 'Eliminar grupo',
            description: 'Eliminar grupos de permisos',
            defaultRoles: ['admin']
          },
          {
            id: 'assign',
            name: 'Asignar usuarios',
            description: 'Asignar usuarios a grupos',
            defaultRoles: ['admin', 'administrador_operativo']
          }
        ]
      },
      {
        id: 'admin.ejecutivos',
        name: 'Ejecutivos',
        description: 'Gestión de ejecutivos y backups',
        icon: 'UserCheck',
        color: 'from-emerald-500 to-teal-600',
        actions: [
          {
            id: 'view',
            name: 'Ver ejecutivos',
            description: 'Ver lista de ejecutivos',
            defaultRoles: ['admin', 'administrador_operativo', 'coordinador'],
            scopeRestricted: true
          },
          {
            id: 'assign_backup',
            name: 'Asignar backup',
            description: 'Configurar ejecutivo de respaldo',
            defaultRoles: ['admin', 'administrador_operativo', 'coordinador']
          },
          {
            id: 'change_status',
            name: 'Cambiar estatus',
            description: 'Modificar estado del ejecutivo',
            defaultRoles: ['admin', 'administrador_operativo', 'coordinador']
          }
        ]
      },
      {
        id: 'admin.coordinaciones',
        name: 'Coordinaciones',
        description: 'Gestión de coordinaciones',
        icon: 'Building',
        color: 'from-orange-500 to-amber-600',
        actions: [
          {
            id: 'view',
            name: 'Ver coordinaciones',
            description: 'Ver lista de coordinaciones',
            defaultRoles: ['admin', 'administrador_operativo']
          },
          {
            id: 'create',
            name: 'Crear coordinación',
            description: 'Crear nuevas coordinaciones',
            defaultRoles: ['admin']
          },
          {
            id: 'edit',
            name: 'Editar coordinación',
            description: 'Modificar configuración',
            defaultRoles: ['admin', 'administrador_operativo']
          },
          {
            id: 'delete',
            name: 'Eliminar coordinación',
            description: 'Eliminar coordinaciones',
            defaultRoles: ['admin']
          },
          {
            id: 'assign_coordinador',
            name: 'Asignar coordinador',
            description: 'Asignar coordinador a coordinación',
            defaultRoles: ['admin', 'administrador_operativo']
          }
        ]
      },
      {
        id: 'admin.tokens',
        name: 'Tokens API',
        description: 'Gestión de tokens de API',
        icon: 'Key',
        color: 'from-yellow-500 to-amber-600',
        actions: [
          {
            id: 'view',
            name: 'Ver tokens',
            description: 'Ver tokens de API',
            defaultRoles: ['admin']
          },
          {
            id: 'create',
            name: 'Crear token',
            description: 'Generar nuevos tokens',
            defaultRoles: ['admin']
          },
          {
            id: 'edit',
            name: 'Editar límites',
            description: 'Modificar límites de tokens',
            defaultRoles: ['admin']
          },
          {
            id: 'revoke',
            name: 'Revocar token',
            description: 'Invalidar tokens existentes',
            defaultRoles: ['admin']
          }
        ]
      },
      {
        id: 'admin.horarios',
        name: 'Horarios',
        description: 'Configuración de horarios operativos',
        icon: 'Clock',
        color: 'from-cyan-500 to-blue-600',
        actions: [
          {
            id: 'view',
            name: 'Ver horarios',
            description: 'Ver configuración de horarios',
            defaultRoles: ['admin']
          },
          {
            id: 'edit',
            name: 'Editar horarios',
            description: 'Modificar horarios',
            defaultRoles: ['admin']
          }
        ]
      },
      {
        id: 'admin.preferencias',
        name: 'Preferencias',
        description: 'Preferencias del sistema',
        icon: 'Sliders',
        color: 'from-gray-500 to-slate-600',
        actions: [
          {
            id: 'view',
            name: 'Ver preferencias',
            description: 'Ver configuración del sistema',
            defaultRoles: ['admin']
          },
          {
            id: 'edit',
            name: 'Editar preferencias',
            description: 'Modificar preferencias',
            defaultRoles: ['admin']
          }
        ]
      },
      {
        id: 'admin.configuracion-db',
        name: 'Configuración BD',
        description: 'Configuración de base de datos',
        icon: 'Database',
        color: 'from-indigo-500 to-purple-600',
        actions: [
          {
            id: 'view',
            name: 'Ver configuración',
            description: 'Ver configuración de BD',
            defaultRoles: ['admin']
          },
          {
            id: 'edit',
            name: 'Editar configuración',
            description: 'Modificar configuración',
            defaultRoles: ['admin']
          }
        ]
      }
    ]
  },

  // ========== LOGS ==========
  {
    id: 'logs',
    name: 'Logs del Sistema',
    description: 'Visualización de logs y errores',
    icon: 'FileText',
    color: 'from-gray-500 to-slate-600',
    actions: [
      {
        id: 'view',
        name: 'Ver logs',
        description: 'Acceder a logs del sistema',
        defaultRoles: ['admin']
      },
      {
        id: 'filter',
        name: 'Filtrar logs',
        description: 'Aplicar filtros a los logs',
        defaultRoles: ['admin']
      },
      {
        id: 'export',
        name: 'Exportar logs',
        description: 'Descargar logs',
        defaultRoles: ['admin']
      },
      {
        id: 'clear',
        name: 'Limpiar logs',
        description: 'Eliminar logs antiguos',
        defaultRoles: ['admin']
      }
    ]
  },

  // ========== AWS MANAGER ==========
  {
    id: 'aws-manager',
    name: 'AWS Manager',
    description: 'Gestión de infraestructura AWS',
    icon: 'Cloud',
    color: 'from-orange-500 to-amber-600',
    actions: [
      {
        id: 'view',
        name: 'Ver infraestructura',
        description: 'Ver recursos AWS',
        defaultRoles: ['admin', 'developer']
      },
      {
        id: 'start_service',
        name: 'Iniciar servicio',
        description: 'Iniciar servicios detenidos',
        defaultRoles: ['admin']
      },
      {
        id: 'stop_service',
        name: 'Detener servicio',
        description: 'Detener servicios en ejecución',
        defaultRoles: ['admin']
      },
      {
        id: 'scale_service',
        name: 'Escalar servicio',
        description: 'Modificar capacidad de servicios',
        defaultRoles: ['admin']
      },
      {
        id: 'view_metrics',
        name: 'Ver métricas',
        description: 'Ver métricas de CloudWatch',
        defaultRoles: ['admin', 'developer']
      },
      {
        id: 'view_costs',
        name: 'Ver costos',
        description: 'Ver estimación de costos',
        defaultRoles: ['admin', 'developer']
      }
    ]
  },

  // ========== DOCUMENTACIÓN ==========
  {
    id: 'documentacion',
    name: 'Documentación',
    description: 'Documentación técnica del sistema',
    icon: 'BookOpen',
    color: 'from-teal-500 to-cyan-600',
    actions: [
      {
        id: 'view',
        name: 'Ver documentación',
        description: 'Acceder a documentación',
        defaultRoles: ['admin', 'developer']
      },
      {
        id: 'download',
        name: 'Descargar docs',
        description: 'Descargar archivos de documentación',
        defaultRoles: ['admin', 'developer']
      }
    ]
  },

  // NOTA: Constructor de Agentes y Plantillas fueron eliminados del sistema
  // Los módulos ya no existen en producción
];

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Obtiene un módulo por su ID
 */
export const getModuleById = (moduleId: string): ModuleDefinition | undefined => {
  // Buscar en módulos principales
  const mainModule = MODULE_CATALOG.find(m => m.id === moduleId);
  if (mainModule) return mainModule;

  // Buscar en submódulos
  for (const module of MODULE_CATALOG) {
    if (module.subModules) {
      const subModule = module.subModules.find(sm => sm.id === moduleId);
      if (subModule) return subModule;
    }
  }

  return undefined;
};

/**
 * Obtiene todas las acciones de un módulo
 */
export const getModuleActions = (moduleId: string): ModuleAction[] => {
  const module = getModuleById(moduleId);
  return module?.actions || [];
};

/**
 * Verifica si un rol tiene un permiso por defecto
 */
export const roleHasDefaultPermission = (
  moduleId: string,
  actionId: PermissionAction,
  role: RoleBase
): boolean => {
  const module = getModuleById(moduleId);
  if (!module) return false;

  const action = module.actions.find(a => a.id === actionId);
  if (!action) return false;

  return action.defaultRoles.includes(role);
};

/**
 * Obtiene todos los permisos por defecto de un rol
 */
export const getDefaultPermissionsForRole = (role: RoleBase): Array<{ moduleId: string; actionId: PermissionAction }> => {
  const permissions: Array<{ moduleId: string; actionId: PermissionAction }> = [];

  const processModule = (module: ModuleDefinition) => {
    for (const action of module.actions) {
      if (action.defaultRoles.includes(role)) {
        permissions.push({ moduleId: module.id, actionId: action.id });
      }
    }

    if (module.subModules) {
      for (const subModule of module.subModules) {
        processModule(subModule);
      }
    }
  };

  for (const module of MODULE_CATALOG) {
    processModule(module);
  }

  return permissions;
};

/**
 * Obtiene la lista plana de todos los módulos (incluyendo submódulos)
 */
export const getAllModulesFlat = (): ModuleDefinition[] => {
  const modules: ModuleDefinition[] = [];

  const processModule = (module: ModuleDefinition) => {
    modules.push(module);
    if (module.subModules) {
      for (const subModule of module.subModules) {
        processModule(subModule);
      }
    }
  };

  for (const module of MODULE_CATALOG) {
    processModule(module);
  }

  return modules;
};

export default MODULE_CATALOG;

