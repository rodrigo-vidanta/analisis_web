# ☁️ Módulo AWS Manager

## Descripción
Sistema completo de gestión de infraestructura AWS con consola unificada, métricas en tiempo real y monitoreo.

## Componentes
- **AWSManager.tsx**: Componente principal con pestañas
- **AWSOverviewOptimized.tsx**: Resumen con métricas dinámicas
- **AWSConsoleUnified.tsx**: Consola unificada con agrupación de servicios
- **AWSRealTimeMonitorOptimized.tsx**: Monitor en tiempo real
- **InteractiveArchitectureDiagram.tsx**: Diagrama interactivo
- **AWSMigrationController.tsx**: Herramientas de migración

## Servicios AWS
- **ECS Fargate**: n8n-production cluster
- **RDS PostgreSQL**: n8n-postgres instance
- **CloudFront**: 2 distribuciones (frontend + n8n)
- **S3**: pqnc-qa-ai-frontend bucket
- **ALB**: n8n-alb load balancer
- **ElastiCache**: 2 instancias Redis

## Funcionalidades

### Resumen
- Métricas dinámicas cada 5 segundos
- Auto-refresh silencioso sin logs
- Iconos vectoriales sin emojis
- Datos reales de AWS

### Consola Unificada
- Agrupación por funcionalidad (N8N, Frontend, Database, etc.)
- Sidebar 3/5 pantalla con configuraciones
- CLI Terminal integrado
- Navegación a Monitor

### Monitor
- 7 servicios AWS reales sincronizados
- Gráficas dinámicas por servicio
- Métricas expandibles

## Dependencias
- **awsConsoleServiceProduction**: Servicio de descubrimiento AWS
- **AWSMetricsService**: Métricas dinámicas con cache
- **Lucide React**: Iconos vectoriales

## Permisos
- **Admin**: Acceso completo
- **Developer**: Acceso completo (módulos no restringidos)

## Datos
- **Región**: us-west-2
- **Servicios**: Detección automática
- **Métricas**: Tiempo real con variación suave
- **Estado**: running/available/pending desde AWS
