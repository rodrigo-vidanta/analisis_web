# 🔧 Servicios del Sistema

## Descripción
Servicios centralizados para manejo de datos, autenticación y funcionalidades específicas.

## Servicios Principales

### authService.ts
- **Función**: Autenticación y autorización
- **Base de datos**: pqncSupabase
- **Funcionalidades**: Login, permisos por módulo, roles

### awsConsoleServiceProduction.ts
- **Función**: Descubrimiento de recursos AWS
- **Datos**: ECS, RDS, CloudFront, S3, ALB
- **Uso**: AWS Manager, métricas dinámicas

### liveMonitorService.ts
- **Función**: Gestión de llamadas activas y prospectos
- **Base de datos**: analysisSupabase
- **Tablas**: `llamadas_ventas`, `prospectos`

### feedbackService.ts
- **Función**: Sistema de retroalimentación
- **Base de datos**: analysisSupabase
- **Uso**: PQNC Humans, evaluaciones

### bookmarkService.ts
- **Función**: Sistema de marcadores
- **Base de datos**: analysisSupabase
- **Uso**: PQNC Humans, organización

### tokenService.ts
- **Función**: Gestión de tokens API
- **Base de datos**: supabase
- **Uso**: AI Models, límites de uso


## Servicios Específicos

### elevenLabsService.ts
- **Función**: Integración ElevenLabs
- **API**: ElevenLabs Voice Models
- **Uso**: AI Models

### prospectsService.ts
- **Función**: Gestión de prospectos
- **Base de datos**: analysisSupabase
- **Uso**: Módulo Prospectos

- **Función**: Servicios de Agent Studio
- **Base de datos**: supabase
- **Uso**: Agent Studio

## Dependencias
- **Supabase Clients**: Múltiples bases de datos
- **APIs Externas**: ElevenLabs, AWS
- **Autenticación**: AuthContext
