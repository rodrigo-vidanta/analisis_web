# 📚 Índice de Documentación - PQNC QA AI Platform

> **Última actualización**: 2026-01-22  
> **Versión**: v2.5.37  
> **Total de archivos**: ~138 archivos en docs/

---

## 🚀 Referencias Rápidas por Tarea

| Si necesitas... | Ve a... |
|-----------------|---------|
| **Conectar a BD PQNC_AI** | [Arquitectura BD Unificada](NUEVA_ARQUITECTURA_BD_UNIFICADA.md) + [MCP Catalog](MCP_CATALOG.md) + [MCP REST](MCP_REST_SETUP.md) |
| **Entender seguridad** | [Arquitectura Seguridad](ARQUITECTURA_SEGURIDAD_2026.md) + [Reglas de Seguridad](.cursor/rules/security-rules.mdc) + [Reportes Pentesting](PENTESTING_FINAL_2026-01-18.md) |
| **Modificar tablas** | [Arquitectura BD](NUEVA_ARQUITECTURA_BD_UNIFICADA.md) + [Migración Completa](MIGRACION_SYSTEM_UI_A_PQNC_AI_COMPLETA.md) + [Optimizaciones](PLAN_OPTIMIZACIONES_JOINS.md) |
| **Trabajar con Edge Functions** | [Edge Functions Catalog](EDGE_FUNCTIONS_CATALOG.md) + [Deploy Multi-DB Proxy](DEPLOY_MULTI_DB_PROXY.md) |
| **Configurar ambiente** | [Variables de Entorno](ENV_VARIABLES_REQUIRED.md) + [Arquitectura BD](NUEVA_ARQUITECTURA_BD_UNIFICADA.md) |
| **Entender términos técnicos** | [Glosario](GLOSARIO.md) - Definiciones de todos los conceptos |
| **Usar N8N** | [N8N MCP Catalog](N8N_MCP_CATALOG.md) + [N8N Workflows](N8N_WORKFLOWS_INDEX.md) + [Webhooks](INVENTARIO_WEBHOOKS_N8N.md) |
| **Sistema de permisos** | [Permissions System](PERMISSIONS_SYSTEM_README.md) + [Permission Groups](PERMISSION_GROUPS_SYSTEM.md) |

---

## 🚀 Inicio Rápido

| Si necesitas... | Ve a... |
|-----------------|---------|
| **Entender el proyecto** | [ARCHITECTURE.md](../ARCHITECTURE.md) |
| **Convenciones de código** | [CONVENTIONS.md](../CONVENTIONS.md) |
| **Ver cambios recientes** | [CHANGELOG.md](../CHANGELOG.md) |
| **Versiones detalladas** | [VERSIONS.md](../VERSIONS.md) |
| **Configurar ambiente** | [ENV_VARIABLES_REQUIRED.md](ENV_VARIABLES_REQUIRED.md) |

---

## 🏛️ Arquitectura y Diseño

### Arquitectura General
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Arquitectura general del sistema
- [ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md) - Diagramas de arquitectura visuales
- [COMPONENT_DEPENDENCIES.md](COMPONENT_DEPENDENCIES.md) - Dependencias entre componentes

### Base de Datos
- [NUEVA_ARQUITECTURA_BD_UNIFICADA.md](NUEVA_ARQUITECTURA_BD_UNIFICADA.md) - Arquitectura de BD unificada
- [DATABASE_README.md](DATABASE_README.md) - Documentación de la base de datos
- [GUIA_CONEXION_BASES_DATOS.md](GUIA_CONEXION_BASES_DATOS.md) - Guía de conexión

### Seguridad
- [ARQUITECTURA_SEGURIDAD_2026.md](ARQUITECTURA_SEGURIDAD_2026.md) - Arquitectura de seguridad
- [ARQUITECTURA_AUTH_NATIVA_2026.md](ARQUITECTURA_AUTH_NATIVA_2026.md) - Sistema de autenticación nativo

### Diseño UI/UX
- [DESIGN_SYSTEM_SUMMARY.md](DESIGN_SYSTEM_SUMMARY.md) - Sistema de diseño
- [DESIGN_GUIDE_MODALS_V2.md](DESIGN_GUIDE_MODALS_V2.md) - Guía de diseño de modales
- [DESIGN_TOKENS_IMPLEMENTATION.md](DESIGN_TOKENS_IMPLEMENTATION.md) - Tokens de diseño
- [THEME_SYSTEM_USAGE.md](THEME_SYSTEM_USAGE.md) - Sistema de temas

### Terminología y Conceptos
- [GLOSARIO.md](GLOSARIO.md) - 📖 **Definiciones de todos los términos técnicos** del proyecto

---

## 🔌 Integraciones y APIs

### Edge Functions
- [EDGE_FUNCTIONS_CATALOG.md](EDGE_FUNCTIONS_CATALOG.md) - Catálogo completo de Edge Functions

### N8N
- [N8N_MCP_CATALOG.md](N8N_MCP_CATALOG.md) - Catálogo de MCP N8N
- [N8N_WORKFLOWS_INDEX.md](N8N_WORKFLOWS_INDEX.md) - Índice de workflows
- [INVENTARIO_WEBHOOKS_N8N.md](INVENTARIO_WEBHOOKS_N8N.md) - Inventario de webhooks

### MCPs (Model Context Protocol)
- [MCP_CATALOG.md](MCP_CATALOG.md) - Catálogo de MCPs disponibles
- [MCP_REST_SETUP.md](MCP_REST_SETUP.md) - Setup de MCP REST

### APIs Externas
- [AI_ANALYSIS_WEBHOOK_PAYLOAD.md](AI_ANALYSIS_WEBHOOK_PAYLOAD.md) - Payload de webhooks IA

---

## 📦 Módulos y Componentes

### Live Monitor
- [../src/components/analysis/README_LIVEMONITOR.md](../src/components/analysis/README_LIVEMONITOR.md)
- [../src/components/analysis/CHANGELOG_LIVEMONITOR.md](../src/components/analysis/CHANGELOG_LIVEMONITOR.md)
- [LIVE_MONITOR_VIEW_DOCUMENTATION.md](LIVE_MONITOR_VIEW_DOCUMENTATION.md)
- [AUDIO_MONITORING_IMPLEMENTATION.md](AUDIO_MONITORING_IMPLEMENTATION.md)

### Live Chat
- [../src/components/chat/README.md](../src/components/chat/README.md)
- [../src/components/chat/CHANGELOG_LIVECHAT.md](../src/components/chat/CHANGELOG_LIVECHAT.md)
- [LIVE_CHAT_MIGRATION.md](LIVE_CHAT_MIGRATION.md)

### Análisis IA
- [../src/components/analysis/README_ANALISIS_IA.md](../src/components/analysis/README_ANALISIS_IA.md)
- [../src/components/analysis/CHANGELOG_ANALISIS_IA.md](../src/components/analysis/CHANGELOG_ANALISIS_IA.md)

### Prospectos
- [../src/components/prospectos/README_PROSPECTOS.md](../src/components/prospectos/README_PROSPECTOS.md)
- [../src/components/prospectos/CHANGELOG_PROSPECTOS.md](../src/components/prospectos/CHANGELOG_PROSPECTOS.md)
- [GUIA_ASIGNACION_MANUAL_PROSPECTOS.md](GUIA_ASIGNACION_MANUAL_PROSPECTOS.md)

### WhatsApp
- [WHATSAPP_TEMPLATES_API.md](WHATSAPP_TEMPLATES_API.md)
- [WHATSAPP_LABELS_SUMMARY.md](WHATSAPP_LABELS_SUMMARY.md)
- [WHATSAPP_LABELS_QUICKSTART.md](WHATSAPP_LABELS_QUICKSTART.md)
- [../src/components/chat/WHATSAPP_LABELS_README.md](../src/components/chat/WHATSAPP_LABELS_README.md)

### Llamadas Programadas
- [../src/components/scheduled-calls/CHANGELOG_SCHEDULED_CALLS.md](../src/components/scheduled-calls/CHANGELOG_SCHEDULED_CALLS.md)

### Sistema de Tickets
- [../src/components/support/README_TICKETS.md](../src/components/support/README_TICKETS.md)
- [../src/components/support/CHANGELOG_TICKETS.md](../src/components/support/CHANGELOG_TICKETS.md)

### Dynamics CRM
- [../src/components/admin/README_DYNAMICS_CRM.md](../src/components/admin/README_DYNAMICS_CRM.md)
- [../src/components/admin/CHANGELOG_DYNAMICS_CRM.md](../src/components/admin/CHANGELOG_DYNAMICS_CRM.md)

### PQNC Humans
- [../src/components/admin/README_PQNC_HUMANS.md](../src/components/admin/README_PQNC_HUMANS.md)
- [../src/components/admin/CHANGELOG_PQNC_HUMANS.md](../src/components/admin/CHANGELOG_PQNC_HUMANS.md)

---

## 🔐 Permisos y Roles

- [PERMISSIONS_SYSTEM_README.md](PERMISSIONS_SYSTEM_README.md) - Sistema de permisos completo
- [PERMISSION_GROUPS_SYSTEM.md](PERMISSION_GROUPS_SYSTEM.md) - Grupos de permisos
- [INSTRUCCIONES_NUEVO_SISTEMA_PERMISOS.md](INSTRUCCIONES_NUEVO_SISTEMA_PERMISOS.md)

---

## 🚀 Deployment y DevOps

### AWS
- [AWS_SERVICES_CATALOG.md](AWS_SERVICES_CATALOG.md) - Catálogo de servicios AWS
- [AWS_CLOUDFRONT_SECURITY_HEADERS.md](AWS_CLOUDFRONT_SECURITY_HEADERS.md)
- [AWS_FRONTEND_IP_RESTRICTION.md](AWS_FRONTEND_IP_RESTRICTION.md)
- [AWS_N8N_EXPOSURE_ANALYSIS.md](AWS_N8N_EXPOSURE_ANALYSIS.md)
- [AWS_COST_REDUCTION_ANALYSIS.md](AWS_COST_REDUCTION_ANALYSIS.md)

### Deployment
- [DEPLOYMENT_PRODUCTION_2025-11-25.md](DEPLOYMENT_PRODUCTION_2025-11-25.md)
- [DEPLOY_MULTI_DB_PROXY.md](DEPLOY_MULTI_DB_PROXY.md)

---

## 🔄 Migraciones

### Migración System_UI → PQNC_AI
- [MIGRACION_SYSTEM_UI_A_PQNC_AI_COMPLETA.md](MIGRACION_SYSTEM_UI_A_PQNC_AI_COMPLETA.md) - **Migración principal**
- [ANALISIS_MIGRACION_SYSTEM_UI_A_PQNC_AI.md](ANALISIS_MIGRACION_SYSTEM_UI_A_PQNC_AI.md)
- [RESUMEN_EJECUTIVO_MIGRACION.md](RESUMEN_EJECUTIVO_MIGRACION.md)
- [REPORTE_VERIFICACION_COMPLETA_MIGRACION.md](REPORTE_VERIFICACION_COMPLETA_MIGRACION.md)

### Otras Migraciones
- [MIGRATION_COORDINADOR_COORDINACIONES.md](MIGRATION_COORDINADOR_COORDINACIONES.md)
- [MIGRACION_AUTH_USERS_NATIVO_2026-01-20.md](MIGRACION_AUTH_USERS_NATIVO_2026-01-20.md)
- [MIGRACION_SUPABASE_AUTH_NATIVO.md](MIGRACION_SUPABASE_AUTH_NATIVO.md)

### Índices de Migración
- [MIGRATION_INDEX.md](MIGRATION_INDEX.md) - Índice de todas las migraciones

---

## 🐛 Debugging y Troubleshooting

### Guías de Debug
- [ERROR_LOGGING_GUIDE.md](ERROR_LOGGING_GUIDE.md)
- [ERROR_LOG_PAYLOAD_STRUCTURE.md](ERROR_LOG_PAYLOAD_STRUCTURE.md)
- [DEBUG_MODULO_EJECUTIVOS.md](DEBUG_MODULO_EJECUTIVOS.md)

### Problemas Conocidos y Soluciones
- [HOTFIX_LOOP_INFINITO_20251229.md](HOTFIX_LOOP_INFINITO_20251229.md)
- [FIX_ERR_INSUFFICIENT_RESOURCES.md](FIX_ERR_INSUFFICIENT_RESOURCES.md)
- [DUPLICATE_MESSAGE_PREVENTION.md](DUPLICATE_MESSAGE_PREVENTION.md)

---

## ⚡ Optimizaciones

### Base de Datos
- [PLAN_OPTIMIZACIONES_JOINS.md](PLAN_OPTIMIZACIONES_JOINS.md)
- [REPORTE_OPTIMIZACIONES_BD_UNIFICADA.md](REPORTE_OPTIMIZACIONES_BD_UNIFICADA.md)
- [RPC_DASHBOARD_OPTIMIZATION.md](RPC_DASHBOARD_OPTIMIZATION.md)

### Performance
- [../src/components/analysis/OPTIMIZACIONES_RENDIMIENTO.md](../src/components/analysis/OPTIMIZACIONES_RENDIMIENTO.md)
- [../src/components/chat/OPTIMIZACIONES_RENDIMIENTO_V4.md](../src/components/chat/OPTIMIZACIONES_RENDIMIENTO_V4.md)
- [DIAGNOSTICO_PROSPECTOS_PERFORMANCE.md](DIAGNOSTICO_PROSPECTOS_PERFORMANCE.md)

---

## 🔧 Configuración

### Variables de Entorno
- [ENV_VARIABLES_REQUIRED.md](ENV_VARIABLES_REQUIRED.md) - **Variables requeridas**

### Configuración de Sistemas
- [INSTRUCCIONES_FUNCIONES_RPC.md](INSTRUCCIONES_FUNCIONES_RPC.md)

---

## 📊 Reportes y Auditorías

### Pentesting y Seguridad
- [PENTESTING_FINAL_2026-01-18.md](PENTESTING_FINAL_2026-01-18.md)
- [PENTESTING_PROFUNDO_2026-01-17.md](PENTESTING_PROFUNDO_2026-01-17.md)
- [PENTESTING_2026-01-16_FINAL.md](PENTESTING_2026-01-16_FINAL.md)

### Auditorías
- [../AUDIT_REPORT.md](../AUDIT_REPORT.md) - Auditoría de documentación 2026-01-22
- [../CLEANUP_REPORT.md](../CLEANUP_REPORT.md) - Reporte de limpieza de docs

### Changelogs por Módulo
- [AWS_CHANGELOG.md](AWS_CHANGELOG.md)
- [CHANGELOG_LIMPIEZA_BD_2026-01-16.md](CHANGELOG_LIMPIEZA_BD_2026-01-16.md)

---

## 📝 Planes y Roadmaps

### Planes de Implementación
- [PLAN_DETALLADO_MIGRACION_SYSTEM_UI_PQNC_AI.md](PLAN_DETALLADO_MIGRACION_SYSTEM_UI_PQNC_AI.md)
- [PLAN_IMPLEMENTACION_ROLES_PERMISOS.md](PLAN_IMPLEMENTACION_ROLES_PERMISOS.md)
- [PLAN_MIGRACION_TRIGGERS_FUNCIONES.md](PLAN_MIGRACION_TRIGGERS_FUNCIONES.md)

### Roadmaps
- [TWILIGHT_THEME_ROADMAP.md](TWILIGHT_THEME_ROADMAP.md)
- [LIVECHAT_ESCALABILITY_ROADMAP.md](LIVECHAT_ESCALABILITY_ROADMAP.md)

---

## 🎓 Guías y Tutoriales

### Guías de Uso
- [GUIA_ASIGNACION_MANUAL_PROSPECTOS.md](GUIA_ASIGNACION_MANUAL_PROSPECTOS.md)
- [GUIA_CONEXION_BASES_DATOS.md](GUIA_CONEXION_BASES_DATOS.md)
- [GUIA_INSERTAR_LEAD_ASIGNADO_N8N.md](GUIA_INSERTAR_LEAD_ASIGNADO_N8N.md)
- [GUIA_N8N_ASIGNACION_AUTOMATICA.md](GUIA_N8N_ASIGNACION_AUTOMATICA.md)

### Quick Starts
- [QUICK_START_REDESIGN.md](QUICK_START_REDESIGN.md)
- [WHATSAPP_LABELS_QUICKSTART.md](WHATSAPP_LABELS_QUICKSTART.md)

---

## 📖 Documentación Cursor

### Configuración de Cursor
- [../.cursor/CODEBASE_INDEX.md](../.cursor/CODEBASE_INDEX.md) - Índice del codebase
- [../.cursor/ERROR_PATTERNS.md](../.cursor/ERROR_PATTERNS.md) - Patrones de error
- [../.cursor/OPTIMIZATION_SUMMARY.md](../.cursor/OPTIMIZATION_SUMMARY.md)

### Reglas de Cursor
- [../.cursor/rules/](../.cursor/rules/) - Directorio de reglas
- [../.cursor/rules/documentation-maintenance.mdc](../.cursor/rules/documentation-maintenance.mdc) - 📋 **Mantenimiento de documentación**
- [../.cursor/rules/handover-format.mdc](../.cursor/rules/handover-format.mdc) - 🎯 **Formato de handovers con REF**

### Handovers y Templates
- [../.cursor/handovers/](../.cursor/handovers/) - Directorio de handovers
- [../.cursor/templates/session-handover.md](../.cursor/templates/session-handover.md) - Template de handover completo
- [../.cursor/templates/checkpoint.md](../.cursor/templates/checkpoint.md) - Template de checkpoint rápido

---

## 🔍 Buscar Documentación

### Por Tema

| Tema | Archivos Relacionados |
|------|----------------------|
| **Autenticación** | ARQUITECTURA_AUTH_NATIVA_2026.md, MIGRACION_AUTH_USERS_NATIVO_2026-01-20.md |
| **Permisos** | PERMISSIONS_SYSTEM_README.md, PERMISSION_GROUPS_SYSTEM.md |
| **WhatsApp** | WHATSAPP_*.md, chat/WHATSAPP_LABELS_README.md |
| **N8N** | N8N_MCP_CATALOG.md, N8N_WORKFLOWS_INDEX.md, INVENTARIO_WEBHOOKS_N8N.md |
| **Edge Functions** | EDGE_FUNCTIONS_CATALOG.md, DEPLOY_MULTI_DB_PROXY.md |
| **Base de Datos** | NUEVA_ARQUITECTURA_BD_UNIFICADA.md, DATABASE_README.md |
| **Seguridad** | ARQUITECTURA_SEGURIDAD_2026.md, PENTESTING_*.md |
| **Optimización** | PLAN_OPTIMIZACIONES_JOINS.md, OPTIMIZACIONES_RENDIMIENTO.md |

---

## 🆘 ¿No encuentras lo que buscas?

1. **Busca en el codebase**: Usa la búsqueda de Cursor (Cmd+Shift+F)
2. **Revisa los CHANGELOGs**: Cada módulo tiene su propio CHANGELOG
3. **Consulta ARCHITECTURE.md**: Para entender la estructura general
4. **Revisa CONVENTIONS.md**: Para convenciones de código

---

**Última actualización**: 2026-01-22  
**Archivos totales**: ~138 archivos en docs/  
**Mantenido por**: Equipo PQNC
