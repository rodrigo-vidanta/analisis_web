# 📚 Índice del Codebase - PQNC QA AI Platform

> **Propósito:** Mapa de navegación rápida para Composer y agentes de IA
> **Última actualización:** Enero 2026

---

## 🗂️ Estructura Principal

```
src/
├── components/     → Componentes React por módulo
├── services/       → Lógica de negocio y APIs
├── hooks/          → Custom hooks reutilizables
├── stores/         → Estado global (Zustand)
├── config/         → Configuración de Supabase
├── contexts/       → React Context (Auth)
├── utils/          → Utilidades helper
└── types/          → TypeScript types
```

---

## 📦 Componentes por Módulo

### 🔐 Auth (`src/components/auth/`)
| Archivo | Descripción |
|---------|-------------|
| `LoginScreen.tsx` | Pantalla de login principal |
| `ProtectedRoute.tsx` | HOC para rutas protegidas |

### 📊 Analysis (`src/components/analysis/`)
| Archivo | Descripción |
|---------|-------------|
| `AnalysisModule.tsx` | Módulo principal de análisis |
| `LiveMonitor.tsx` | Monitor en tiempo real de llamadas |
| `CallDetails.tsx` | Detalles de llamada individual |
| `AudioPlayer.tsx` | Reproductor de audio de llamadas |
| `TranscriptViewer.tsx` | Visor de transcripciones |

### 💬 Chat/WhatsApp (`src/components/chat/`)
| Archivo | Descripción |
|---------|-------------|
| `WhatsAppModule.tsx` | Módulo principal WhatsApp |
| `ConversationList.tsx` | Lista de conversaciones |
| `ChatWindow.tsx` | Ventana de chat activa |
| `MessageBubble.tsx` | Burbuja de mensaje |
| `QuickReplies.tsx` | Respuestas rápidas |
| `TemplateSelector.tsx` | Selector de plantillas |

### 👥 Prospectos (`src/components/prospectos/`)
| Archivo | Descripción |
|---------|-------------|
| `ProspectosModule.tsx` | Gestión de prospectos |
| `ProspectoCard.tsx` | Tarjeta de prospecto |
| `ProspectoDetails.tsx` | Detalle de prospecto |

### 👤 Admin (`src/components/admin/`)
| Archivo | Descripción |
|---------|-------------|
| `UserManagement.tsx` | Gestión de usuarios |
| `RoleManagement.tsx` | Gestión de roles |
| `PermissionsEditor.tsx` | Editor de permisos |
| `CoordinacionesManager.tsx` | Gestión de coordinaciones |

### 📢 Campaigns (`src/components/campaigns/`)
| Archivo | Descripción |
|---------|-------------|
| `CampaignsModule.tsx` | Gestión de campañas |
| `CampaignEditor.tsx` | Editor de campaña |

### 📅 Scheduled Calls (`src/components/scheduled-calls/`)
| Archivo | Descripción |
|---------|-------------|
| `ScheduledCallsModule.tsx` | Llamadas programadas |
| `CallScheduler.tsx` | Programador de llamadas |

### ☁️ AWS (`src/components/aws/`)
| Archivo | Descripción |
|---------|-------------|
| `AWSManager.tsx` | Manager de infraestructura AWS |
| `ECSServices.tsx` | Servicios ECS |
| `RDSInstances.tsx` | Instancias RDS |

### 🔔 Notifications (`src/components/notifications/`)
| Archivo | Descripción |
|---------|-------------|
| `NotificationCenter.tsx` | Centro de notificaciones |
| `NotificationBell.tsx` | Campana de notificaciones |

### 🎫 Support (`src/components/support/`)
| Archivo | Descripción |
|---------|-------------|
| `TicketSystem.tsx` | Sistema de tickets |
| `TicketDetail.tsx` | Detalle de ticket |

### 🔧 Shared (`src/components/shared/`)
| Archivo | Descripción |
|---------|-------------|
| `LoadingSpinner.tsx` | Spinner de carga |
| `Modal.tsx` | Modal reutilizable |
| `Button.tsx` | Botón estilizado |
| `Input.tsx` | Input estilizado |
| `Select.tsx` | Select estilizado |
| `Table.tsx` | Tabla reutilizable |
| `Pagination.tsx` | Paginación |
| `EmptyState.tsx` | Estado vacío |
| `ErrorBoundary.tsx` | Boundary de errores |

---

## 🔧 Servicios (`src/services/`)

### Supabase & Auth
| Servicio | Descripción |
|----------|-------------|
| `authService.ts` | Autenticación y sesiones |
| `authAdminProxyService.ts` | Operaciones admin via Edge Function |
| `permissionsService.ts` | Gestión de permisos |
| `supabaseService.ts` | Cliente Supabase general |

### Datos de Negocio
| Servicio | Descripción |
|----------|-------------|
| `prospectsService.ts` | CRUD de prospectos |
| `callAnalysisService.ts` | Análisis de llamadas |
| `liveMonitorService.ts` | Live Monitor |
| `liveMonitorOptimizedService.ts` | Live Monitor optimizado |
| `scheduledCallsService.ts` | Llamadas programadas |
| `coordinacionService.ts` | Coordinaciones |
| `assignmentService.ts` | Asignación de prospectos |

### WhatsApp
| Servicio | Descripción |
|----------|-------------|
| `whatsappTemplatesService.ts` | Gestión de plantillas |
| `whatsappLabelsService.ts` | Etiquetas WhatsApp |
| `quickRepliesService.ts` | Respuestas rápidas |
| `optimizedConversationsService.ts` | Conversaciones optimizadas |
| `botPauseService.ts` | Control de pausa del bot |

### Integraciones
| Servicio | Descripción |
|----------|-------------|
| `n8nService.ts` | Integración N8N |
| `n8nProxyService.ts` | Proxy N8N |
| `dynamicsLeadService.ts` | Dynamics CRM leads |
| `dynamicsReasignacionService.ts` | Reasignación Dynamics |
| `elevenLabsService.ts` | Text-to-speech |
| `credentialsService.ts` | Gestión de credenciales |

### AWS
| Servicio | Descripción |
|----------|-------------|
| `awsService.ts` | Cliente AWS general |
| `awsDiagramService.ts` | Diagramas de infraestructura |
| `awsRealDataService.ts` | Datos reales de AWS |

### Notificaciones
| Servicio | Descripción |
|----------|-------------|
| `notificationService.ts` | Notificaciones |
| `notificationSoundService.ts` | Sonidos de notificación |
| `userNotificationService.ts` | Notificaciones de usuario |
| `systemNotificationService.ts` | Notificaciones del sistema |

### Utilidades
| Servicio | Descripción |
|----------|-------------|
| `audioService.ts` | Procesamiento de audio |
| `translationService.ts` | Traducciones |
| `errorLogService.ts` | Logging de errores |
| `backupService.ts` | Backups |
| `tokenService.ts` | Gestión de tokens |

---

## 🪝 Hooks (`src/hooks/`)

| Hook | Descripción | Uso |
|------|-------------|-----|
| `useAuth.ts` | Autenticación | `const { user, login, logout } = useAuth()` |
| `useEffectivePermissions.ts` | Permisos efectivos | `const { hasPermission } = useEffectivePermissions()` |
| `useAnalysisPermissions.ts` | Permisos de análisis | `const { canView, canEdit } = useAnalysisPermissions()` |
| `useNotifications.ts` | Notificaciones | `const { notifications, markAsRead } = useNotifications()` |
| `useProspectosNotifications.ts` | Notificaciones prospectos | `const { unreadCount } = useProspectosNotifications()` |
| `useNetworkStatus.ts` | Estado de red | `const { isOnline } = useNetworkStatus()` |
| `useInactivityTimeout.ts` | Timeout inactividad | `useInactivityTimeout(30000, onTimeout)` |
| `useTheme.ts` | Tema de la app | `const { theme, toggleTheme } = useTheme()` |
| `useDesignTokens.ts` | Tokens de diseño | `const tokens = useDesignTokens()` |
| `useSystemConfig.ts` | Config del sistema | `const { config } = useSystemConfig()` |
| `useUserProfile.ts` | Perfil de usuario | `const { profile, updateProfile } = useUserProfile()` |
| `useAWS.ts` | Servicios AWS | `const { services, refresh } = useAWS()` |
| `useAWSDiagram.ts` | Diagramas AWS | `const { diagram } = useAWSDiagram()` |
| `usePhoneVisibility.ts` | Visibilidad teléfono | `const { isVisible, toggle } = usePhoneVisibility()` |
| `useNinjaAwarePermissions.ts` | Permisos ninja | `const { canNinja } = useNinjaAwarePermissions()` |

---

## 🏪 Stores (`src/stores/`)

### appStore.ts
```typescript
// Estado global de la aplicación
interface AppStore {
  sidebarOpen: boolean;
  currentModule: string;
  darkMode: boolean;
  setSidebarOpen: (open: boolean) => void;
  setCurrentModule: (module: string) => void;
  toggleDarkMode: () => void;
}
```

### notificationStore.ts
```typescript
// Estado de notificaciones
interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Notification) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}
```

### ninjaStore.ts
```typescript
// Estado del modo ninja (admin)
interface NinjaStore {
  isNinjaMode: boolean;
  impersonatingUser: User | null;
  enableNinja: () => void;
  disableNinja: () => void;
}
```

### networkStore.ts
```typescript
// Estado de conectividad
interface NetworkStore {
  isOnline: boolean;
  lastCheck: Date;
  setOnline: (online: boolean) => void;
}
```

### liveActivityStore.ts
```typescript
// Estado de actividad en vivo
interface LiveActivityStore {
  activeUsers: User[];
  activeCalls: Call[];
  refresh: () => void;
}
```

---

## ⚙️ Configuración (`src/config/`)

| Archivo | Descripción |
|---------|-------------|
| `analysisSupabase.ts` | Cliente principal PQNC_AI |
| `supabaseSystemUI.ts` | Cliente SystemUI (redirige a PQNC_AI) |
| `awsConfig.ts` | Configuración AWS |
| `permissionModules.ts` | Definición de módulos de permisos |

---

## 🛠️ Utilidades (`src/utils/`)

| Archivo | Descripción |
|---------|-------------|
| `formatters.ts` | Formateo de fechas, números, etc. |
| `validators.ts` | Validaciones |
| `helpers.ts` | Helpers generales |
| `constants.ts` | Constantes de la app |
| `dateUtils.ts` | Utilidades de fechas |
| `stringUtils.ts` | Utilidades de strings |

---

## 📄 Archivos Raíz Importantes

| Archivo | Descripción |
|---------|-------------|
| `src/main.tsx` | Entry point de la app |
| `src/App.tsx` | Componente root |
| `src/components/MainApp.tsx` | Router principal con rutas |
| `src/contexts/AuthContext.tsx` | Context de autenticación |
| `src/index.css` | Estilos globales Tailwind |

---

## 🔍 Búsqueda Rápida por Funcionalidad

| Quiero... | Buscar en... |
|-----------|--------------|
| Login/Auth | `AuthContext.tsx`, `authService.ts`, `LoginScreen.tsx` |
| Permisos | `permissionsService.ts`, `useEffectivePermissions.ts` |
| Prospectos | `prospectsService.ts`, `ProspectosModule.tsx` |
| Llamadas | `callAnalysisService.ts`, `LiveMonitor.tsx` |
| WhatsApp | `whatsappTemplatesService.ts`, `WhatsAppModule.tsx` |
| Notificaciones | `notificationStore.ts`, `notificationService.ts` |
| AWS | `awsService.ts`, `AWSManager.tsx` |
| N8N | `n8nService.ts`, `n8nProxyService.ts` |
| Usuarios | `UserManagement.tsx`, `authAdminProxyService.ts` |
| Configuración | `systemConfigService.ts`, `useSystemConfig.ts` |

---

## 📚 Documentación del Proyecto

### Documentación Principal (Raíz)
| Archivo | Descripción |
|---------|-------------|
| `ARCHITECTURE.md` | Arquitectura general del sistema |
| `CONVENTIONS.md` | Convenciones de código y desarrollo |
| `CHANGELOG.md` | Historial de cambios y versiones |
| `VERSIONS.md` | Control de versiones detallado |
| `README.md` | Introducción al proyecto |

### Índice Maestro
| Archivo | Descripción |
|---------|-------------|
| `docs/INDEX.md` | **Índice maestro** con navegación a toda la documentación |

### Documentación Técnica (`docs/`)

#### Arquitectura
- `NUEVA_ARQUITECTURA_BD_UNIFICADA.md` - BD unificada (PQNC_AI)
- `ARQUITECTURA_SEGURIDAD_2026.md` - Arquitectura de seguridad
- `ARQUITECTURA_AUTH_NATIVA_2026.md` - Sistema de autenticación
- `ARCHITECTURE_DIAGRAMS.md` - Diagramas visuales
- `DATABASE_README.md` - Documentación de BD

#### Edge Functions y MCPs
- `EDGE_FUNCTIONS_CATALOG.md` - Catálogo de Edge Functions
- `MCP_CATALOG.md` - Catálogo de MCPs
- `MCP_REST_SETUP.md` - Setup de MCP REST
- `N8N_MCP_CATALOG.md` - MCP de N8N
- `N8N_WORKFLOWS_INDEX.md` - Índice de workflows N8N

#### Permisos y Seguridad
- `PERMISSIONS_SYSTEM_README.md` - Sistema de permisos
- `PERMISSION_GROUPS_SYSTEM.md` - Grupos de permisos

#### Migraciones
- `MIGRACION_SYSTEM_UI_A_PQNC_AI_COMPLETA.md` - Migración principal
- `MIGRATION_INDEX.md` - Índice de migraciones
- `RESUMEN_EJECUTIVO_MIGRACION.md` - Resumen ejecutivo

#### WhatsApp
- `WHATSAPP_TEMPLATES_API.md` - API de plantillas
- `WHATSAPP_LABELS_SUMMARY.md` - Sistema de etiquetas
- `WHATSAPP_LABELS_QUICKSTART.md` - Inicio rápido

#### Optimizaciones
- `PLAN_OPTIMIZACIONES_JOINS.md` - Plan de optimización
- `REPORTE_OPTIMIZACIONES_BD_UNIFICADA.md` - Reporte de optimizaciones

### Documentación de Componentes (`src/components/`)
- `src/components/analysis/README_LIVEMONITOR.md`
- `src/components/analysis/CHANGELOG_LIVEMONITOR.md`
- `src/components/chat/README.md`
- `src/components/chat/CHANGELOG_LIVECHAT.md`
- `src/components/prospectos/README_PROSPECTOS.md`
- ... y más (ver docs/INDEX.md)

### Configuración Cursor (`.cursor/`)
| Archivo | Descripción |
|---------|-------------|
| `CODEBASE_INDEX.md` | Este archivo - Mapa del codebase |
| `ERROR_PATTERNS.md` | Patrones de errores comunes |
| `OPTIMIZATION_SUMMARY.md` | Resumen de optimizaciones |
| `rules/*.mdc` | Reglas de desarrollo |

### Scripts de Utilidad (`scripts/`)
| Archivo | Descripción |
|---------|-------------|
| `audit-documentation.ts` | Auditar documentación .md |
| `clean-documentation.ts` | Limpieza segura de duplicados |

### Reportes de Auditoría (Raíz)
| Archivo | Descripción |
|---------|-------------|
| `AUDIT_REPORT.md` | Reporte de auditoría 2026-01-22 |
| `CLEANUP_REPORT.md` | Reporte de limpieza ejecutada |
| `AUDIT_INVENTORY.json` | Inventario completo en JSON |

> **Nota**: Después de la limpieza del 2026-01-22, se eliminaron 464 archivos duplicados/obsoletos. El proyecto ahora tiene 519 archivos .md (antes 979).

---

## 📝 Notas para Composer

1. **Antes de crear un servicio nuevo**, verifica si existe uno similar
2. **Antes de crear un hook nuevo**, revisa `src/hooks/`
3. **Siempre usa TypeScript** con tipos explícitos
4. **Sigue el patrón** de servicios/componentes existentes
5. **Usa TailwindCSS** para estilos, nunca CSS custom
