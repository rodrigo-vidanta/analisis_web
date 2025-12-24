# Catálogo de MCPs — PQNC QA AI Platform

**Actualizado:** 2025-12-23  
**Versión:** 1.0.0

---

## 📋 Resumen de MCPs Disponibles

| MCP | Proyecto Supabase | Uso Principal | Estado |
|-----|-------------------|---------------|--------|
| SupaVidanta | `glsmifhkoaifvaegsozd` | Análisis de llamadas, Live Monitor | ✅ Activo |
| SupaSystemUI | `zbylezfyagwrxoecioup` | Usuarios, auth, configuración sistema | ✅ Activo |
| SupaPQNC | `hmmfuhqgvsehkizlfzga` | PQNC Humans, ejecutivos, feedback | ✅ Activo |
| aws-infrastructure | AWS us-west-2 | ECS, RDS, S3, CloudWatch | ✅ Activo |
| N8N | Railway | Workflows, ejecuciones | ✅ Activo |
| vapi | VAPI | Agentes de voz | ✅ Activo |
| SupaClever | `rnhejbuubpbnojalljso` | **⛔ NO USAR** - Proyecto Clever Ideas | ❌ Removido |

---

## 🔴 REGLAS CRÍTICAS

### ⛔ NUNCA usar SupaClever
- Es de otro proyecto (clever-ideas-ai-platform)
- Contaminaría datos y documentación
- Si ves referencias a `rnhejbuubpbnojalljso`, NO conectar

### ✅ Reglas de uso por contexto

| Contexto | MCP a usar |
|----------|------------|
| Análisis de llamadas | `SupaVidanta` |
| Live Monitor | `SupaVidanta` |
| Prospectos | `SupaVidanta` |
| Conversaciones WhatsApp | `SupaVidanta` |
| Usuarios del sistema | `SupaSystemUI` |
| Sesiones y auth | `SupaSystemUI` |
| Mensajes admin | `SupaSystemUI` |
| Bot pause status | `SupaSystemUI` |
| Ejecutivos PQNC | `SupaPQNC` |
| Roles y permisos | `SupaPQNC` |
| Feedback de calidad | `SupaPQNC` |
| ECS/RDS/S3 | `aws-infrastructure` |
| Workflows N8N | `N8N` |
| Agentes VAPI | `vapi` |

---

## 📦 Detalle de cada MCP

### SupaVidanta (Análisis/Live Monitor)
- **URL:** `https://glsmifhkoaifvaegsozd.supabase.co`
- **Archivo servidor:** `mcp-supavidanta-server.ts`
- **Tablas principales:**
  - `llamadas_ventas` - Llamadas de ventas
  - `prospectos` - Base de prospectos
  - `live_monitor_view` - Vista de monitoreo
  - `call_analysis_summary` - Resumen de análisis
  - `conversaciones_whatsapp` - Chats de WhatsApp
- **Funciones RPC:** `exec_sql`, `get_database_schema`, `backup_table_data`

### SupaSystemUI (Autenticación/Config)
- **URL:** `https://zbylezfyagwrxoecioup.supabase.co`
- **Archivo servidor:** `mcp-supa-system-ui-server.ts`
- **Tablas principales:**
  - `auth_users` - Usuarios del sistema
  - `auth_sessions` - Sesiones activas
  - `admin_messages` - Mensajes para admins
  - `bot_pause_status` - Estado de pausa del bot
  - `system_config` - Configuración del sistema
- **Edge Functions:** Proxies de N8N, Anthropic, send-img

### SupaPQNC (PQNC Humans)
- **URL:** `https://hmmfuhqgvsehkizlfzga.supabase.co`
- **Archivo servidor:** `mcp-supa-pqnc-server.ts`
- **Tablas principales:**
  - `pqnc_usuarios` - Usuarios PQNC
  - `pqnc_roles` - Roles y permisos
  - `pqnc_ejecutivos` - Ejecutivos de ventas
  - `pqnc_analisis` - Análisis de calidad
  - `pqnc_feedback` - Retroalimentación

### aws-infrastructure
- **Región:** us-west-2
- **Archivo servidor:** `/Users/darigsamuelrosalesrobledo/mcp-server-aws/dist/index.js`
- **Servicios disponibles:**
  - ECS: Clusters, services, tasks
  - RDS: Instancias, snapshots
  - S3: Buckets
  - CloudWatch: Métricas, logs
  - EC2: Instancias, VPCs, Security Groups
  - ElastiCache: Clusters Redis

### N8N
- **URL:** `https://primary-dev-d75a.up.railway.app`
- **Servicios:**
  - Listar workflows
  - Ejecutar workflows
  - Ver detalles de workflow

### vapi
- **Servicios:**
  - Gestión de agentes de voz
  - Configuración de llamadas

---

## 🔧 Comandos útiles por MCP

### SupaVidanta / SupaSystemUI / SupaPQNC
```
mcp_[nombre]_query_table - Consultar tabla
mcp_[nombre]_insert_data - Insertar datos
mcp_[nombre]_update_data - Actualizar datos
mcp_[nombre]_delete_data - Eliminar datos
mcp_[nombre]_execute_sql - Ejecutar SQL
mcp_[nombre]_get_database_schema - Ver esquema
mcp_[nombre]_backup_table - Backup de tabla
```

### aws-infrastructure
```
mcp_aws-infrastructure_aws_ecs_list_clusters
mcp_aws-infrastructure_aws_ecs_list_services
mcp_aws-infrastructure_aws_ecs_describe_service
mcp_aws-infrastructure_aws_rds_list_instances
mcp_aws-infrastructure_aws_s3_list_buckets
mcp_aws-infrastructure_aws_get_infrastructure_summary
mcp_aws-infrastructure_aws_get_cost_estimation
```

### N8N
```
mcp_N8N_search_workflows
mcp_N8N_get_workflow_details
mcp_N8N_execute_workflow
```

---

## 📁 Archivos de configuración

| Archivo | Ubicación | Descripción |
|---------|-----------|-------------|
| MCP Global | `~/.cursor/mcp.json` | Configuración de todos los MCPs |
| SupaVidanta Server | `mcp-supavidanta-server.ts` | Servidor MCP Analysis |
| SupaSystemUI Server | `mcp-supa-system-ui-server.ts` | Servidor MCP System UI |
| SupaPQNC Server | `mcp-supa-pqnc-server.ts` | Servidor MCP PQNC |

---

## ⚠️ Troubleshooting

### MCP no responde
1. Verificar que el archivo servidor existe
2. Reiniciar Cursor IDE
3. Verificar logs en terminal

### Error de conexión Supabase
1. Verificar URL y keys en `~/.cursor/mcp.json`
2. Verificar que el proyecto Supabase está activo

### Error "function not found"
Ejecutar el script `enable_full_access_mcp.sql` en el dashboard de Supabase

