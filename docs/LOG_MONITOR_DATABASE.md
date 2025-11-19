# Base de Datos Log Monitor

## Descripción
Base de datos dedicada para el sistema de monitoreo y gestión de logs de errores del sistema. Proporciona un dashboard completo para visualizar, analizar y gestionar errores críticos.

## Credenciales

### Conexión PostgreSQL
```
postgresql://postgres:tM8KO9@i&yG#%!Lg@db.dffuwdzybhypxfzrmdcz.supabase.co:5432/postgres
```

### Proyecto Supabase
- **Project ID**: `dffuwdzybhypxfzrmdcz`
- **URL**: `https://dffuwdzybhypxfzrmdcz.supabase.co`

### API Keys
- **Anon Public**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZnV3ZHp5Ymh5cHhmenJtZGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTgxNTksImV4cCI6MjA3NTQzNDE1OX0.dduh8ZV_vxWcC3u63DGjPG0U5DDjBpZTs3yjT3clkRc`
- **Service Role**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZnV3ZHp5Ymh5cHhmenJtZGN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg1ODE1OSwiZXhwIjoyMDc1NDM0MTU5fQ.GplT_sFvgkLjNDNg50MaXVI759u8LAMeS9SbJ6pf2yc`
- **API Key**: `system_ui`
- **Secret**: `sb_secret_LGrLFU7rvlTpXoIoD0AcWA_ULdhgqlF`
- **Publishable Key**: `sb_publishable_54tYDJIqPcKMt26kjS2ylA_tIBeTyG9`

## Esquema de Base de Datos

### Tabla Principal: `error_log`
Almacena los logs de errores recibidos del webhook.

**Columnas:**
- `id` (UUID, PK): Identificador único
- `prospecto_id` (TEXT, nullable): ID del prospecto relacionado
- `tipo` (ENUM): Tipo de error (`mensaje`, `llamada`, `ui`)
- `subtipo` (ENUM): Subtipo específico (`tools`, `dynamics`, `base_de_datos`, `http_request_servicio`, `llms_falla_servicio`, `llms_json_schema`, `vapi`, `guardrail_salida`, `guardrail_entrada`, `twilio`, `rate_limit`, `uchat`, `redis`, `airtable`, `s3`)
- `workflow_id` (TEXT, nullable): ID del workflow relacionado
- `execution_id` (TEXT, nullable): ID de ejecución
- `mensaje` (JSONB): Mensaje del error (estructura completa)
- `timestamp` (TIMESTAMP): Fecha y hora del error
- `whatsapp` (TEXT, nullable): Número de WhatsApp relacionado
- `severidad` (ENUM): Severidad (`baja`, `media`, `alta`, `critica`)
- `ambiente` (ENUM): Ambiente (`desarrollo`, `produccion`, `preproduccion`)
- `descripcion` (TEXT, nullable): Descripción adicional

### Tablas UI (Prefijo `ui_`)

#### `ui_error_log_status`
Estado de lectura y prioridad de cada log.

**Columnas:**
- `id` (UUID, PK)
- `error_log_id` (UUID, FK → error_log.id)
- `is_read` (BOOLEAN): Si el log ha sido leído
- `read_at` (TIMESTAMP, nullable): Fecha de lectura
- `read_by` (UUID, nullable): Usuario que marcó como leído
- `is_archived` (BOOLEAN): Si el log está archivado
- `archived_at` (TIMESTAMP, nullable): Fecha de archivado
- `archived_by` (UUID, nullable): Usuario que archivó
- `priority` (TEXT): Prioridad (`low`, `medium`, `high`, `critical`)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `ui_error_log_annotations`
Anotaciones y observaciones sobre logs específicos.

**Columnas:**
- `id` (UUID, PK)
- `error_log_id` (UUID, FK → error_log.id)
- `annotation_text` (TEXT): Texto de la anotación
- `created_by` (UUID): Usuario que creó la anotación
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `ui_error_log_tags`
Etiquetas personalizadas para logs.

**Columnas:**
- `id` (UUID, PK)
- `error_log_id` (UUID, FK → error_log.id)
- `tag_name` (TEXT): Nombre de la etiqueta
- `tag_color` (TEXT, nullable): Color hexadecimal para la UI
- `created_by` (UUID): Usuario que creó la etiqueta
- `created_at` (TIMESTAMP)

#### `ui_error_log_ai_analysis`
Análisis de IA realizados sobre logs.

**Columnas:**
- `id` (UUID, PK)
- `error_log_id` (UUID, FK → error_log.id)
- `analysis_text` (TEXT): Análisis completo (máx 2000 tokens)
- `analysis_summary` (TEXT): Resumen ejecutivo (máx 200 tokens)
- `suggested_fix` (TEXT, nullable): Solución sugerida (máx 500 tokens)
- `confidence_score` (INTEGER): Nivel de confianza (0-100)
- `tokens_used` (INTEGER): Tokens utilizados
- `model_used` (TEXT): Modelo utilizado (default: `claude-3-5-sonnet-20241022`)
- `status` (TEXT): Estado (`pending`, `completed`, `failed`)
- `created_at` (TIMESTAMP)
- `completed_at` (TIMESTAMP, nullable)
- `error_message` (TEXT, nullable): Mensaje de error si falló

### Vista: `v_error_logs_with_ui_status`
Vista combinada que une `error_log` con información de estado UI para consultas optimizadas.

## Configuración en el Código

### Archivo de Configuración
`src/config/supabaseLogMonitor.ts`

**Clientes disponibles:**
- `supabaseLogMonitor`: Cliente público (lectura)
- `supabaseLogMonitorAdmin`: Cliente admin (escritura)

### Servicio
`src/services/logMonitorService.ts`

**Funcionalidades principales:**
- `getLogs()`: Obtener logs con filtros avanzados
- `getLogById()`: Obtener un log específico
- `markAsRead()`: Marcar como leído
- `markMultipleAsRead()`: Marcar múltiples como leídos
- `addAnnotation()`: Añadir anotación
- `addTag()`: Añadir etiqueta
- `requestAIAnalysis()`: Solicitar análisis de IA
- `getStats()`: Obtener estadísticas

### Componente Dashboard
`src/components/admin/LogDashboard.tsx`

**Características:**
- Contadores en tiempo real
- Filtros avanzados de búsqueda
- Estado de lectura (leído/no leído)
- Anotaciones y etiquetas
- Análisis de IA a demanda
- Paginación
- Vista detallada de logs

## Integración con IA

El sistema utiliza la Edge Function `anthropic-proxy` del proyecto System UI para generar análisis de errores usando Claude (Anthropic).

**Configuración:**
- **URL**: `https://zbylezfyagwrxoecioup.supabase.co/functions/v1/anthropic-proxy`
- **Modelo**: `claude-3-5-sonnet-20241022`
- **Tokens máximos**: 2000 para análisis completo
- **Formato**: JSON estructurado con `analysis_text`, `analysis_summary`, `suggested_fix`, `confidence_score`

## Scripts SQL

### Crear Tablas UI
Ejecutar: `scripts/sql/create_log_monitor_ui_tables.sql`

Este script crea:
- Todas las tablas UI con prefijo `ui_`
- Índices para optimización
- Triggers para `updated_at`
- Políticas RLS (Row Level Security)
- Vista combinada `v_error_logs_with_ui_status`

## Uso en la UI

El dashboard de logs es la vista por defecto del módulo "Log Server" en el panel de administración.

**Acceso:**
- Solo administradores
- Ruta: Módulo "Log Server" → Pestaña "Dashboard"

**Funcionalidades disponibles:**
1. Visualizar todos los logs con filtros
2. Marcar logs como leídos/no leídos
3. Marcar todos como leídos
4. Añadir anotaciones a logs específicos
5. Añadir etiquetas con colores personalizados
6. Solicitar análisis de IA para un log
7. Ver estadísticas en tiempo real
8. Buscar logs por texto, severidad, tipo, etc.

## Notas Importantes

1. **Prefijo UI**: Todas las tablas de control UI llevan el prefijo `ui_` para diferenciarlas de las tablas principales
2. **RLS Habilitado**: Todas las tablas tienen Row Level Security habilitado
3. **Análisis IA**: Los análisis se generan a demanda y se almacenan en la base de datos para evitar regeneraciones innecesarias
4. **Tokens**: El sistema controla el número de tokens utilizados en cada análisis para mantener consistencia
5. **Estado de Lectura**: Se almacena por usuario para permitir seguimiento individual

