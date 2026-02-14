# Arquitectura - PQNC QA AI Platform

> Actualizado: 2026-02-13 | Verificado contra codigo real

## Diagrama de Flujo

```
[Usuario] → [React 19 SPA] → [Supabase PQNC_AI]
                ↓                    ↓
          [Zustand Stores (6)]  [Edge Functions (25)]
                ↓                    ↓
          [TailwindCSS 3.4]    [N8N Workflows (Railway)]
                                     ↓
                              [AWS S3+CloudFront]
                              [Dynamics CRM]
                              [UChat WhatsApp]
                              [VAPI Voice AI]
```

## Estructura del Proyecto

```
src/
├── components/     # Componentes React organizados por modulo (25 directorios)
│   ├── admin/          # UserManagementV2, GroupManagement, ComunicadosManager
│   ├── ai-models/      # AIModelsManager (voz, imagen, repositorio)
│   ├── analysis/       # Analisis IA de llamadas, LiveMonitor
│   ├── auth/           # Login, ProtectedRoute
│   ├── aws/            # Gestor AWS con metricas
│   ├── base/           # Componentes base UI
│   ├── campaigns/      # Campanas WhatsApp (audiencias, plantillas, secuencias)
│   ├── chat/           # WhatsApp Live Chat (UChat, LiveChatCanvas)
│   ├── citas/          # Gestion de citas Vidanta
│   ├── common/         # Utilidades comunes
│   ├── comunicados/    # Sistema comunicados real-time (overlay, tutorials)
│   ├── dashboard/      # Dashboards personalizables con widgets
│   ├── direccion/      # Panel supervisores/coordinadores
│   ├── documentation/  # Visualizador docs embebido (markdown)
│   ├── editor/         # Editor de prompts/tools IA
│   ├── linear/         # Integracion Linear (issues)
│   ├── live-activity/  # Monitor llamadas activas real-time (CallCard, widgets)
│   ├── logos/          # Sistema de logos dinamicos (seasonal)
│   ├── ninja/          # Modo debug/suplantacion admin
│   ├── notifications/  # Notificaciones real-time
│   ├── prospectos/     # Gestion prospectos (Kanban, etapas dinamicas)
│   ├── scheduled-calls/# Llamadas programadas (N8N + VAPI)
│   ├── shared/         # Componentes reutilizables
│   └── support/        # Sistema de tickets
├── services/       # Logica de negocio (70 servicios)
├── hooks/          # Custom hooks (19)
├── stores/         # Zustand stores (6)
├── config/         # Config Supabase, AWS, permisos
├── contexts/       # React Context (AuthContext)
├── types/          # TypeScript types (aws, comunicados, errorCatalog, etapas, whatsappTemplates)
├── utils/          # Funciones helper (authenticatedFetch, authToken, etc.)
├── data/           # Datos estaticos
├── styles/         # Design tokens
└── workers/        # Web Workers (audioConverter)

supabase/
├── functions/      # 25 Edge Functions activas + 13 backups (z_backup_*)
└── migrations/     # SQL migrations

scripts/            # CLIs y utilidades (deploy-v2, uchat-cli, n8n-cli, vapi-cli)
docs/               # Documentacion formal del proyecto
```

## Rutas en MainApp (appMode)

| Ruta | Modulo |
|------|--------|
| `pqnc` | PQNC Humans (prospectos legacy) |
| `live-monitor` | Monitor llamadas real-time |
| `ai-models` | Gestion modelos IA (voz, imagen) |
| `live-chat` | WhatsApp Live Chat |
| `admin` | Panel administracion |
| `prospectos` | Gestion prospectos Kanban |
| `scheduled-calls` | Llamadas programadas |
| `direccion` | Panel direccion/supervisores |
| `operative-dashboard` | Dashboard operativo |
| `campaigns` | Campanas WhatsApp |
| `dashboard` | Dashboard personalizable |

## Patron de Datos

```
[Frontend Component]
  → useHook() (logica reutilizable)
    → service.method() (logica de negocio)
      → analysisSupabase.from('tabla').select() (query con RLS via vistas)
        → Si necesita privilegios: authenticatedEdgeFetch('function-name', { body })
```

## Realtime Architecture

```
[Supabase Realtime] → supabase_realtime publication (13 tablas)
       ↓
[RealtimeHub] → Singleton service, 1 canal por tabla
       ↓
[Stores/Components] → Pub/sub pattern, subscripcion centralizada
```

Tablas en publicacion Realtime: `prospectos`, `user_notifications`, `active_sessions`, `comunicados`, `uchat_conversations`, `mensajes_whatsapp`, `llamadas_ventas`, `support_tickets`, `bot_pause_status`, `system_config`, `whatsapp_labels_custom`, `whatsapp_conversation_labels`, `llamadas_programadas`

## Edge Functions Activas (25)

| Funcion | Proposito |
|---------|-----------|
| `agent-creator-proxy` | Crear agentes IA |
| `anthropic-proxy` | Proxy a Claude API |
| `auth-admin-proxy` | Operaciones admin de auth |
| `broadcast-proxy` | Envio masivo WhatsApp |
| `cleanup-inactive-sessions` | Limpiar sesiones inactivas |
| `dynamics-lead-proxy` | Proxy a Dynamics CRM |
| `dynamics-reasignar-proxy` | Reasignar leads Dynamics |
| `error-log-proxy` | Logging de errores |
| `generar-url-optimizada` | URLs optimizadas |
| `import-contact-proxy` | Importar contactos |
| `mcp-secure-proxy` | Proxy MCP seguro |
| `multi-db-proxy` | Proxy multi-base-datos |
| `paraphrase-proxy` | Parafraseo IA |
| `pause-bot-proxy` | Pausar bot WhatsApp |
| `pull-uchat-errors` | Pull errores UChat (cron via N8N) |
| `secure-query` | Queries seguras con CORS whitelist |
| `send-audio-proxy` | Enviar audio WhatsApp (MP3) |
| `send-img-proxy` | Enviar imagenes WhatsApp |
| `send-message-proxy` | Enviar mensajes WhatsApp |
| `timeline-proxy` | Timeline de prospecto |
| `tools-proxy` | Proxy de herramientas |
| `transfer-request-proxy` | Solicitudes de transferencia |
| `trigger-manual-proxy` | Triggers manuales (llamadas VAPI) |
| `whatsapp-templates-proxy` | Plantillas WhatsApp |

## Deploy

Deploy automatizado: `tsx scripts/deploy-v2.ts` → Vite build → AWS S3 → CloudFront invalidation
- Region: us-west-2
- Dominio: ai.vidavacations.com
- SSL: ACM certificate
- Versionado: Semantic dual `B{backend}N{frontend}`
- Script: `/deploy` skill via Claude Code
