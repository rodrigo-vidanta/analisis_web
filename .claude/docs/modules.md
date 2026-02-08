# Mapa de Modulos - PQNC QA AI Platform

## Componentes por Modulo

### Auth (`src/components/auth/`)
- `LoginScreen.tsx` - Login principal
- `ProtectedRoute.tsx` - HOC rutas protegidas

### Analysis (`src/components/analysis/`)
- `AnalysisModule.tsx` - Modulo principal
- `LiveMonitor.tsx` - Monitor real-time llamadas
- `CallDetails.tsx` - Detalles de llamada
- `AudioPlayer.tsx` - Reproductor audio
- `TranscriptViewer.tsx` - Visor transcripciones

### Chat/WhatsApp (`src/components/chat/`)
- `WhatsAppModule.tsx` - Modulo principal
- `ConversationList.tsx` - Lista conversaciones
- `ChatWindow.tsx` - Ventana chat activa
- `MessageBubble.tsx` - Burbuja mensaje
- `QuickReplies.tsx` - Respuestas rapidas
- `TemplateSelector.tsx` - Selector plantillas

### Prospectos (`src/components/prospectos/`)
- `ProspectosModule.tsx` - Gestion prospectos (GOLD STANDARD)
- `ProspectoCard.tsx` - Tarjeta prospecto
- `ProspectoDetails.tsx` - Detalle prospecto

### Admin (`src/components/admin/`)
- `UserManagementV2/` - Gestion usuarios v2
- `GroupManagement/` - Gestion grupos permisos
- `CoordinacionesManager.tsx` - Coordinaciones

### Campaigns (`src/components/campaigns/`)
- `audiencias/` - Filtros y audiencias
- `bases-datos/` - Gestion bases datos
- `campanas/` - Editor campanas (A/B testing)
- `plantillas/` - Plantillas WhatsApp
- `secuencias/` - Secuencias automaticas

### Dashboard (`src/components/dashboard/`)
- Dashboards personalizables con widgets

### Direccion (`src/components/direccion/`)
- Panel supervisores y coordinadores

### Citas (`src/components/citas/`)
- Gestion citas Vidanta (UI tropical, Montserrat, teal)

### Live Activity (`src/components/live-activity/`)
- Monitor llamadas activas real-time

### Ninja (`src/components/ninja/`)
- Modo debug/suplantacion admin

## Servicios Principales (`src/services/`)

### Auth y Permisos
- `authService.ts` - Autenticacion y sesiones
- `authAdminProxyService.ts` - Ops admin via Edge Function
- `permissionsService.ts` - Gestion permisos
- `credentialsService.ts` - Gestion credenciales

### Prospectos
- `prospectsService.ts` - CRUD prospectos (GOLD STANDARD)
- `assignmentService.ts` - Asignacion prospectos
- `prospectsViewPreferencesService.ts` - Preferencias vista

### Analisis
- `callAnalysisService.ts` - Analisis llamadas
- `liveMonitorOptimizedService.ts` - Monitor optimizado (GOLD STANDARD)

### WhatsApp
- `whatsappTemplatesService.ts` - Plantillas
- `whatsappLabelsService.ts` - Etiquetas
- `quickRepliesService.ts` - Respuestas rapidas
- `optimizedConversationsService.ts` - Conversaciones
- `botPauseService.ts` - Control pausa bot

### Integraciones
- `n8nService.ts` / `n8nProxyService.ts` - N8N
- `dynamicsLeadService.ts` - Dynamics CRM
- `dynamicsReasignacionService.ts` - Reasignacion leads
- `elevenLabsService.ts` - TTS

### Notificaciones
- `notificationService.ts` - Core
- `notificationSoundService.ts` - Sonidos
- `userNotificationService.ts` - Por usuario
- `systemNotificationService.ts` - Sistema

### AWS
- `awsService.ts` - Cliente general
- `awsRealDataService.ts` - Datos reales
- `awsDiagramService.ts` - Diagramas

## Hooks (`src/hooks/`)

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
| `useHeartbeat` | Heartbeat de sesion activa |
| `useSystemConfig` | Config del sistema |

## Stores Zustand (`src/stores/`)

| Store | Estado |
|-------|--------|
| `appStore` | sidebar, currentModule, darkMode |
| `networkStore` | isOnline, lastCheck |
| `notificationStore` | notifications, unreadCount |
| `liveActivityStore` | activeUsers, activeCalls |
| `ninjaStore` | isNinjaMode, impersonatingUser |

## Gold Standards (Archivos Ejemplares)

Consultar ANTES de crear codigo nuevo similar:
- **Componentes:** `ProspectosModule.tsx`, `CallList.tsx`, `UserManagement.tsx`
- **Servicios:** `prospectsService.ts`, `liveMonitorOptimizedService.ts`
- **Hooks:** `useEffectivePermissions.ts`, `useAnalysisPermissions.ts`
- **Stores:** `appStore.ts`
