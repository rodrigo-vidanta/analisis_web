# Mapa de Modulos - PQNC QA AI Platform

> Actualizado: 2026-02-13 | Verificado contra codigo real

## Componentes por Modulo (25 directorios)

### Auth (`src/components/auth/`)
- `LoginScreen.tsx` - Login principal
- `ProtectedRoute.tsx` - HOC rutas protegidas

### Analysis (`src/components/analysis/`)
- `AnalysisModule.tsx` - Modulo principal
- `LiveMonitor.tsx` - Monitor real-time llamadas
- `CallDetails.tsx` - Detalles de llamada
- `AudioPlayer.tsx` - Reproductor audio
- `TranscriptViewer.tsx` - Visor transcripciones

### AI Models (`src/components/ai-models/`)
- `AIModelsManager.tsx` - Gestor modelos IA
- `VoiceModelsSection.tsx` - Modelos de voz (ElevenLabs)
- `ImageGenerationSection.tsx` - Generacion imagenes
- `ImageRepositorySection.tsx` - Repositorio imagenes generadas

### Chat/WhatsApp (`src/components/chat/`)
- `WhatsAppModule.tsx` - Modulo principal
- `LiveChatCanvas.tsx` - Canvas principal chat (6800+ lineas)
- `ConversationList.tsx` - Lista conversaciones
- `ChatWindow.tsx` / `ChatWindowReal.tsx` - Ventana chat activa
- `MessageBubble.tsx` - Burbuja mensaje
- `QuickReplies.tsx` - Respuestas rapidas
- `TemplateSelector.tsx` - Selector plantillas
- `ReactivateConversationModal.tsx` - Modal reactivacion (4 tabs, tag filtering)
- `ImageCatalogModal.tsx` / `ImageCatalogModalV2.tsx` - Catalogo imagenes
- `ProspectDetailSidebar.tsx` - Sidebar detalle prospecto
- `CallDetailModal.tsx` / `CallDetailModalSidebar.tsx` - Detalle llamadas
- `media-selector/` - Selector media con `useImageCatalog.ts`

### Comunicados (`src/components/comunicados/`)
- `ComunicadoOverlay.tsx` - Overlay z-[60] con registry componentes lazy
- `ComunicadoCard.tsx` - Card presentacional (icon, badge, body, markdown)
- `tutorials/UtilityTemplateTutorial.tsx` - Tutorial animado 4 pasos

### Prospectos (`src/components/prospectos/`)
- `ProspectosModule.tsx` - Gestion prospectos Kanban (GOLD STANDARD)
- `ProspectoCard.tsx` - Tarjeta prospecto
- `ProspectoDetails.tsx` - Detalle prospecto
- Etapas dinamicas desde tabla `etapas`

### Admin (`src/components/admin/`)
- `UserManagementV2/` - Gestion usuarios v2 (hooks, componentes)
- `GroupManagement/` - Gestion grupos permisos
- `CoordinacionesManager.tsx` - Coordinaciones
- `ComunicadosManager.tsx` - Panel comunicados (CRUD, preview, targeting)
- `WhatsAppTemplatesManager.tsx` - Gestion plantillas WhatsApp
- `UChatErrorLogs.tsx` - Visor errores WhatsApp
- `DynamicsCRMManager.tsx` - Gestion Dynamics
- `SystemPreferences.tsx` - Preferencias del sistema
- `AdminDashboardTabs.tsx` - Tabs admin (incluye tab Comunicados)

### Campaigns (`src/components/campaigns/`)
- `audiencias/` - Filtros y audiencias
- `bases-datos/` - Gestion bases datos
- `campanas/` - Editor campanas (A/B testing)
- `plantillas/` - Plantillas WhatsApp
- `secuencias/` - Secuencias automaticas

### Dashboard (`src/components/dashboard/`)
- Dashboards personalizables con widgets
- `widgets/LlamadasActivasWidget.tsx` - Widget llamadas activas

### Direccion (`src/components/direccion/`)
- Panel supervisores y coordinadores

### Live Activity (`src/components/live-activity/`)
- `LiveCallActivityWidget.tsx` - Widget actividad llamadas
- `CallCard.tsx` - Card de llamada activa
- `ExpandedCallPanel.tsx` - Panel expandido
- `MinimizedCallTab.tsx` - Tab minimizado

### Logos (`src/components/logos/`)
- Sistema logos dinamicos (Default, Christmas, NewYear, Valentine)
- Animaciones interactivas (tinkling, fireworks, etc.)

### Otros Modulos
- `citas/` - Gestion citas Vidanta (UI tropical, Montserrat, teal)
- `ninja/` - Modo debug/suplantacion admin
- `notifications/` - Notificaciones real-time
- `scheduled-calls/` - Llamadas programadas
- `shared/` - Componentes reutilizables (Modal, Button, ManualCallModal, etc.)
- `support/` - Sistema tickets (ReportIssueModal, etc.)
- `documentation/` - Visualizador docs markdown
- `editor/` - Editor prompts/tools IA
- `linear/` - Integracion Linear
- `base/` - Componentes base UI
- `common/` - Utilidades comunes

## Servicios (70) (`src/services/`)

### Auth y Permisos (7)
- `authService.ts` - Autenticacion y sesiones
- `authAdminProxyService.ts` - Ops admin via Edge Function
- `permissionsService.ts` - Gestion permisos
- `credentialsService.ts` - Gestion credenciales
- `loginLogService.ts` - Registro logins
- `apiTokensService.ts` / `tokenService.ts` - Tokens API

### Prospectos y Asignaciones (5)
- `prospectsService.ts` - CRUD prospectos (GOLD STANDARD)
- `assignmentService.ts` - Asignacion prospectos
- `prospectsViewPreferencesService.ts` - Preferencias vista
- `etapasService.ts` - Etapas dinamicas
- `coordinacionService.ts` - Coordinaciones

### Analisis y Monitoreo (7)
- `callAnalysisService.ts` - Analisis llamadas
- `liveMonitorOptimizedService.ts` - Monitor optimizado (GOLD STANDARD)
- `liveMonitorService.ts` / `liveMonitorKanbanOptimized.ts` - Variantes monitor
- `callStatusClassifier.ts` - Clasificador estados
- `logMonitorService.ts` / `logMonitorSecureClient.ts` - Monitor logs

### WhatsApp (7)
- `whatsappTemplatesService.ts` - Plantillas
- `whatsappLabelsService.ts` - Etiquetas
- `quickRepliesService.ts` - Respuestas rapidas
- `optimizedConversationsService.ts` - Conversaciones
- `botPauseService.ts` - Control pausa bot
- `whatsappTemplateSuggestionsService.ts` - Sugerencias IA
- `uchatService.ts` - Interaccion UChat API

### Notificaciones (6)
- `notificationService.ts` - Core
- `notificationSoundService.ts` - Sonidos
- `userNotificationService.ts` - Por usuario
- `systemNotificationService.ts` - Sistema
- `notificationsService.ts` - Wrapper
- `adminMessagesService.ts` - Mensajes admin

### Integraciones (9)
- `n8nService.ts` / `n8nProxyService.ts` - N8N
- `n8nLocalProxyService.ts` - Proxy local N8N
- `dynamicsLeadService.ts` - Dynamics CRM
- `dynamicsReasignacionService.ts` - Reasignacion leads
- `elevenLabsService.ts` - TTS
- `importContactService.ts` - Importar contactos
- `automationService.ts` - Automatizaciones
- `timelineService.ts` - Timeline actividades

### AWS (6)
- `awsService.ts` - Cliente general
- `awsRealDataService.ts` - Datos reales
- `awsDiagramService.ts` - Diagramas
- `awsConsoleService.ts` / `awsConsoleServiceBrowser.ts` / `awsConsoleServiceProduction.ts`

### Real-time y Comunicaciones (3)
- `realtimeHub.ts` - Singleton Realtime centralizado (pub/sub)
- `comunicadosService.ts` - CRUD comunicados + Realtime
- `horariosService.ts` - Horarios dinamicos

### Features y Herramientas (10)
- `feedbackService.ts` - Feedback
- `bookmarkService.ts` - Bookmarks
- `audioService.ts` - Audio general
- `errorLogService.ts` - Logs errores
- `scheduledCallsService.ts` - Llamadas programadas
- `ticketService.ts` - Tickets soporte
- `paraphraseLogService.ts` - Logs parafraseo
- `moderationService.ts` - Moderacion contenido
- `gcsUrlService.ts` - URLs GCS
- `permissionsService.ts` - Core permisos

### Datos y Config (9)
- `supabaseService.ts` - Base Supabase
- `multiDbProxyService.ts` - Proxy multi-DB
- `secureQueryService.ts` / `pqncSecureClient.ts` - Queries seguras
- `groupsService.ts` - Grupos permisos
- `userUIPreferencesService.ts` - Preferencias UI
- `translationService.ts` - Traducciones
- `backupService.ts` - Backups
- `aiModelsDbService.ts` - Modelos IA en BD

## Hooks (19) (`src/hooks/`)

| Hook | Uso |
|------|-----|
| `useAuth` | `const { user, login, logout } = useAuth()` |
| `useEffectivePermissions` | `const { hasPermission } = useEffectivePermissions()` (GOLD) |
| `useAnalysisPermissions` | `const { canView, canEdit } = useAnalysisPermissions()` (GOLD) |
| `useNotifications` | `const { notifications, markAsRead } = useNotifications()` |
| `useNetworkStatus` | `const { isOnline } = useNetworkStatus()` |
| `useNinjaAwarePermissions` | Permisos con soporte ninja mode |
| `useTheme` | `const { theme, toggleTheme } = useTheme()` |
| `useAWS` | `const { services, refresh } = useAWS()` |
| `useAWSDiagram` | Diagrama infraestructura AWS |
| `useDesignTokens` | Tokens de diseno |
| `useHeartbeat` | Heartbeat de sesion activa |
| `useInactivityTimeout` | Timeout por inactividad |
| `usePhoneVisibility` | Visibilidad telefono |
| `useProspectosNotifications` | Notificaciones prospectos |
| `useSystemConfig` | Config del sistema |
| `useTokenExpiryMonitor` | Monitor expiracion token (cada 5 min) |
| `useVersionCheck` | Verificacion version app |
| `useVersionHistory` | Historial versiones |

## Stores Zustand (6) (`src/stores/`)

| Store | Estado |
|-------|--------|
| `appStore` | sidebar, currentModule, darkMode |
| `networkStore` | isOnline, lastCheck |
| `notificationStore` | notifications, unreadCount |
| `liveActivityStore` | activeUsers, activeCalls |
| `ninjaStore` | isNinjaMode, impersonatingUser |
| `comunicadosStore` | pending, current, overlay, readIds (Set persistente) |

## Utils Clave (`src/utils/`)

| Util | Proposito |
|------|-----------|
| `authenticatedFetch.ts` | `authenticatedEdgeFetch()` - OBLIGATORIO para Edge Functions |
| `authToken.ts` | `getAuthTokenOrThrow()`, `getValidAccessToken()` |

## Gold Standards (Archivos Ejemplares)

Consultar ANTES de crear codigo nuevo similar:
- **Componentes:** `ProspectosModule.tsx`, `CallList.tsx`, `UserManagement.tsx`
- **Servicios:** `prospectsService.ts`, `liveMonitorOptimizedService.ts`
- **Hooks:** `useEffectivePermissions.ts`, `useAnalysisPermissions.ts`
- **Stores:** `appStore.ts`
