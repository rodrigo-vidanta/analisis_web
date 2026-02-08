# Arquitectura - PQNC QA AI Platform

## Diagrama de Flujo

```
[Usuario] → [React 19 SPA] → [Supabase PQNC_AI]
                ↓                    ↓
          [Zustand Store]    [Edge Functions (24)]
                ↓                    ↓
          [TailwindCSS]      [N8N Workflows]
                                     ↓
                              [AWS S3+CloudFront]
                              [Dynamics CRM]
                              [UChat WhatsApp]
```

## Estructura del Proyecto

```
src/
├── components/     # Componentes React organizados por modulo
│   ├── admin/          # UserManagementV2, GroupManagement
│   ├── analysis/       # Analisis IA de llamadas, LiveMonitor
│   ├── auth/           # Login, ProtectedRoute
│   ├── aws/            # Gestor AWS con metricas
│   ├── campaigns/      # Campanas WhatsApp (audiencias, plantillas, secuencias)
│   ├── chat/           # WhatsApp Live Chat (UChat)
│   ├── citas/          # Gestion de citas Vidanta
│   ├── dashboard/      # Dashboards personalizables
│   ├── direccion/      # Panel supervisores/coordinadores
│   ├── documentation/  # Visualizador docs embebido
│   ├── editor/         # Editor de prompts/tools IA
│   ├── linear/         # Integracion Linear (issues)
│   ├── live-activity/  # Monitor llamadas activas real-time
│   ├── ninja/          # Modo debug/suplantacion admin
│   ├── notifications/  # Notificaciones real-time
│   ├── prospectos/     # Gestion prospectos (Kanban)
│   ├── scheduled-calls/# Llamadas programadas (N8N)
│   ├── shared/         # Componentes reutilizables
│   └── support/        # Sistema de tickets
├── services/       # Logica de negocio (30+ servicios)
├── hooks/          # Custom hooks (18+)
├── stores/         # Zustand stores (5)
├── config/         # Config Supabase, AWS, permisos
├── contexts/       # React Context (AuthContext)
├── types/          # TypeScript types
├── utils/          # Funciones helper
├── data/           # Datos estaticos
├── styles/         # Design tokens
└── workers/        # Web Workers

supabase/
├── functions/      # 24 Edge Functions activas
└── migrations/     # SQL migrations

scripts/            # Utilidades (AWS, SQL, migracion)
docs/               # 270+ archivos de documentacion
```

## Patron de Datos

```
[Frontend Component]
  → useHook() (logica reutilizable)
    → service.method() (logica de negocio)
      → analysisSupabase.from('tabla').select() (query con RLS)
        → Si necesita privilegios: Edge Function via fetch()
```

## Edge Functions Activas (24)

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
| `secure-query` | Queries seguras |
| `send-audio-proxy` | Enviar audio WhatsApp |
| `send-img-proxy` | Enviar imagenes WhatsApp |
| `send-message-proxy` | Enviar mensajes WhatsApp |
| `timeline-proxy` | Timeline de prospecto |
| `tools-proxy` | Proxy de herramientas |
| `transfer-request-proxy` | Solicitudes de transferencia |
| `trigger-manual-proxy` | Triggers manuales |
| `whatsapp-templates-proxy` | Plantillas WhatsApp |

## Deploy

Deploy automatizado: `scripts/` → Vite build → AWS S3 → CloudFront invalidation
- Region: us-west-2
- Dominio: ai.vidavacations.com
- SSL: ACM certificate
