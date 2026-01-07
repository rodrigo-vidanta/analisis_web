# Catálogo de MCPs — PQNC QA AI Platform

**Actualizado:** 2026-01-07  
**Versión:** 2.1.0

---

## 📋 Resumen de MCPs de Supabase

| MCP | Nombre del Proyecto | URL Base | Estado |
|-----|---------------------|----------|--------|
| **Supa_PQNC_AI** | pqnc_ai | `glsmifhkoaifvaegsozd.supabase.co` | ✅ Activo |
| **Supa_SystemUI** | system_ui | `zbylezfyagwrxoecioup.supabase.co` | ✅ Activo |

### MCPs Desactivados/Removidos

| MCP | Razón | Estado |
|-----|-------|--------|
| SupaClever | Proyecto ajeno (clever-ideas-ai-platform) | ⛔ NO USAR |
| SupaPQNC | No requerido actualmente | 🔇 Removido |

---

## 🔴 REGLAS CRÍTICAS DE USO

### ⛔ NUNCA usar SupaClever
- Es de otro proyecto (clever-ideas-ai-platform)
- Proyecto Supabase: `rnhejbuubpbnojalljso`
- Contaminaría datos y documentación
- **SI VES REFERENCIAS A ESTE PROYECTO, NO CONECTAR**

### 📝 Documentación Obligatoria
- **ANTES** de cualquier operación destructiva (DELETE, DROP, TRUNCATE): hacer backup
- **DESPUÉS** de cualquier cambio: documentar en `MCP_CHANGELOG.local.md`
- Los archivos `.local.md` NO se suben a git (están en .gitignore)

---

## 📦 Detalle de MCPs Activos

### 1. Supa_PQNC_AI

| Propiedad | Valor |
|-----------|-------|
| **Nombre interno** | `Supa_PQNC_AI` |
| **Proyecto Supabase** | pqnc_ai |
| **Project Ref** | `glsmifhkoaifvaegsozd` |
| **URL** | `https://glsmifhkoaifvaegsozd.supabase.co` |
| **Archivo servidor** | `mcp-supa-pqnc-ai-server.ts` |
| **Acceso** | Full R/W (Read/Write) |
| **Versión** | 2.0.0 |

#### Propósito
- Análisis de llamadas de ventas (PQNC)
- Live Monitor (monitoreo en tiempo real)
- Gestión de prospectos
- Conversaciones de WhatsApp
- Dashboard y métricas

#### ⚠️ TABLAS EXCLUSIVAS DE ESTE MCP - NO CREAR EN SystemUI

| Tabla | Descripción | Módulo UI |
|-------|-------------|-----------|
| `prospectos` | Base de datos de prospectos y clientes potenciales | Prospectos, Live Monitor |
| `llamadas_ventas` | Llamadas de ventas y análisis PQNC | Live Monitor, Análisis |
| `llamadas_programadas` | Llamadas agendadas para ejecutar | Scheduled Calls |
| `conversaciones_whatsapp` | Historial de conversaciones WhatsApp | Live Chat |
| `mensajes_whatsapp` | Mensajes individuales de WhatsApp | Live Chat |
| `call_analysis` | Análisis de calidad de llamadas | Análisis IA |
| `whatsapp_templates` | Templates de mensajes WA | WhatsApp Templates |
| `whatsapp_template_sends` | Registro de envíos de templates | WhatsApp Templates |
| `whatsapp_audiences` | Audiencias para campañas WA | WhatsApp Audiences |
| `crm_data` | Datos sincronizados de Dynamics CRM | CRM Sync |
| `dynamics_audit_log` | Log de operaciones con Dynamics | Audit Log |
| `destinos` | Catálogo de destinos turísticos | Content Management |
| `resorts` | Catálogo de resorts | Content Management |
| `info_resorts` | Información vectorizada de resorts (RAG) | RAG/Search |
| `content_management` | Gestión de contenido multimedia | Content Management |
| `config_horarios_base` | Horarios base de operación | Config Horarios |
| `config_horarios_bloqueos` | Bloqueos de horarios | Config Horarios |
| `config_horarios_excepciones` | Días festivos/especiales | Config Horarios |

#### Vistas

| Vista | Descripción |
|-------|-------------|
| `live_monitor_view` | Vista optimizada para monitoreo en vivo |
| `call_analysis_summary` | Resumen de análisis de llamadas |
| `call_analysis_executive_summary` | Resumen ejecutivo |
| `v_audit_pending_retry` | Operaciones pendientes de reintento |
| `v_horario_hoy` | Horario del día actual |
| `v_template_analytics` | Analíticas de templates WA |

#### Cuándo Usar
- ✅ Análisis de llamadas
- ✅ Live Monitor
- ✅ Prospectos y leads
- ✅ Conversaciones WhatsApp
- ✅ Métricas de ventas
- ✅ Gestión de contenido
- ✅ Configuración de horarios

---

### 2. Supa_SystemUI

| Propiedad | Valor |
|-----------|-------|
| **Nombre interno** | `Supa_SystemUI` |
| **Proyecto Supabase** | system_ui |
| **Project Ref** | `zbylezfyagwrxoecioup` |
| **URL** | `https://zbylezfyagwrxoecioup.supabase.co` |
| **Archivo servidor** | `mcp-supa-system-ui-server.ts` |
| **Acceso** | Full R/W (Read/Write) |
| **Versión** | 2.0.0 |

#### Propósito
- Gestión de usuarios y autenticación
- Grupos de permisos y roles
- Mensajes administrativos
- Estado de pausas de bots
- Configuración del sistema
- Logs de auditoría

#### ⚠️ TABLAS EXCLUSIVAS DE ESTE MCP - NO CREAR EN PQNC_AI

| Tabla | Descripción | Módulo UI |
|-------|-------------|-----------|
| `admin_messages` | Mensajes para administradores | Admin Panel |
| `permission_groups` | Grupos de permisos del sistema | User Management |
| `group_permissions` | Permisos asociados a grupos | User Management |
| `user_permission_groups` | Relación usuarios-grupos | User Management |
| `group_audit_log` | Log de auditoría de cambios | Audit Log |
| `bot_pause_status` | Estado de pausas de bots | Bot Control |
| `system_config` | Configuración global del sistema | System Config |
| `user_sessions` | Sesiones activas de usuarios | Auth |

#### Cuándo Usar
- ✅ Usuarios del sistema
- ✅ Sesiones y auth
- ✅ Permisos y roles
- ✅ Mensajes admin
- ✅ Bot pause status
- ✅ Configuración del sistema

---

## 🔧 Herramientas Disponibles (Ambos MCPs)

### Operaciones de Lectura
| Herramienta | Descripción |
|-------------|-------------|
| `query_table` | Consultar tabla con filtros, orden y límite |
| `get_database_schema` | Obtener esquema completo de la BD |
| `get_table_info` | Información de columnas de una tabla |
| `backup_table` | Hacer backup de una tabla en JSON |

### Operaciones de Escritura
| Herramienta | Descripción |
|-------------|-------------|
| `insert_data` | Insertar registros |
| `update_data` | Actualizar registros (requiere filtro) |
| `delete_data` | Eliminar registros (requiere filtro, ⚠️ destructivo) |

### Operaciones Avanzadas
| Herramienta | Descripción |
|-------------|-------------|
| `execute_sql` | Ejecutar SQL arbitrario (DDL/DML) |
| `execute_rpc` | Ejecutar función RPC de Supabase |
| `exec_sql_transaction` | Múltiples queries en una transacción |

---

## 📋 Guía Rápida: ¿Dónde Crear/Modificar Tablas?

### Si la tabla es sobre...

| Tema | MCP Correcto | Ejemplos |
|------|--------------|----------|
| Prospectos/Leads | `Supa_PQNC_AI` | prospectos, leads, clientes |
| Llamadas de venta | `Supa_PQNC_AI` | llamadas_ventas, call_analysis |
| WhatsApp | `Supa_PQNC_AI` | mensajes_whatsapp, conversaciones |
| Templates WA | `Supa_PQNC_AI` | whatsapp_templates, template_sends |
| Contenido/Resorts | `Supa_PQNC_AI` | destinos, resorts, content |
| Horarios | `Supa_PQNC_AI` | config_horarios_* |
| CRM/Dynamics | `Supa_PQNC_AI` | crm_data, dynamics_audit |
| Usuarios | `Supa_SystemUI` | users, profiles |
| Permisos | `Supa_SystemUI` | permissions, groups |
| Auth | `Supa_SystemUI` | sessions, tokens |
| Admin/Sistema | `Supa_SystemUI` | admin_messages, system_config |
| Bots | `Supa_SystemUI` | bot_pause_status |

---

## 📝 Ejemplos de Uso

### Consultar tabla
```
mcp_Supa_PQNC_AI_query_table
  table: "prospectos"
  select: "id,nombre_completo,etapa,score"
  filter: {"etapa": "Calificado"}
  limit: 10
  order: "created_at.desc"
```

### Insertar datos
```
mcp_Supa_SystemUI_insert_data
  table: "admin_messages"
  data: {"title": "Nuevo mensaje", "message": "Contenido...", "category": "system_alert"}
```

### Ejecutar SQL
```
mcp_Supa_PQNC_AI_execute_sql
  sql: "SELECT COUNT(*) FROM prospectos WHERE etapa = 'Calificado'"
  description: "Contar prospectos calificados"
```

---

## ⚙️ Configuración

### Archivo de Configuración Global
**Ubicación:** `~/.cursor/mcp.json`

### Archivos de Servidores MCP
| Archivo | MCP |
|---------|-----|
| `mcp-supa-pqnc-ai-server.ts` | Supa_PQNC_AI |
| `mcp-supa-system-ui-server.ts` | Supa_SystemUI |

### Requisitos de Base de Datos
Para que los MCPs funcionen con acceso completo, ejecutar en **cada** proyecto de Supabase:

1. Ir a Supabase Dashboard > SQL Editor
2. Ejecutar el script: `enable_full_access_mcp.sql`
3. Esto crea las funciones RPC necesarias:
   - `exec_sql` - Ejecutar SQL arbitrario
   - `get_database_schema` - Obtener esquema
   - `backup_table_data` - Hacer backups
   - `exec_sql_transaction` - Transacciones

---

## 📊 Auditoría y Rollback

### Archivos Locales (NO se suben a git)
| Archivo | Propósito |
|---------|-----------|
| `MCP_CHANGELOG.local.md` | Log de cambios realizados vía MCP |
| `MCP_SCHEMAS.local.md` | Esquemas actualizados de ambas BDs |

### Reglas de Seguridad
1. **DELETE sin WHERE está bloqueado** por los servidores MCP
2. **Backup antes de DELETE masivo** usando `backup_table`
3. **Documentar en changelog** después de cada operación

---

## ❓ Troubleshooting

### MCP no responde
1. Verificar que el archivo servidor existe
2. Reiniciar Cursor IDE
3. Verificar logs en terminal

### Error "function not found"
1. Ejecutar `enable_full_access_mcp.sql` en Supabase Dashboard
2. Verificar que se crearon las funciones RPC

### Error de conexión
1. Verificar URL y keys en `~/.cursor/mcp.json`
2. Verificar que el proyecto Supabase está activo
3. Verificar conectividad de red

---

## 🗂️ Otros MCPs (No Supabase)

| MCP | Servicio | Descripción |
|-----|----------|-------------|
| `aws-infrastructure` | AWS us-west-2 | ECS, RDS, S3, CloudWatch |
| `N8N` | Railway | Workflows, ejecuciones |
| `vapi` | VAPI | Agentes de voz |
| `Magic MCP` | 21st.dev | Componentes UI |
| `cursor-ide-browser` | Browser | Automatización navegador |

---

## 📚 Documentación Relacionada

- `enable_full_access_mcp.sql` - Script de habilitación de funciones
- `MCP_CHANGELOG.local.md` - Log local de cambios (no en git)
- `MCP_SCHEMAS.local.md` - Esquemas de BD (no en git)
- `.cursor/rules/mcp-rules.mdc` - Reglas de uso de MCPs

---

**Última actualización:** 2026-01-07 por Cursor AI
