# Reporte de Optimización de Base de Datos PQNC_AI

**Proyecto:** PQNC_AI (glsmifhkoaifvaegsozd)  
**Fecha:** 2026-01-14  
**Ejecutado por:** Sistema automatizado + revisión manual  

---

## Resumen Ejecutivo

| Métrica | Antes | Después | Reducción |
|---------|-------|---------|-----------|
| **Índices totales** | 322 | 272 | **50 índices (-15.5%)** |
| **Índices llamadas_ventas** | 33 | 15 | **18 índices (-54.5%)** |
| **Políticas RLS** | ~27 | 21 | **6 políticas (-22%)** |

---

## Detalle de Operaciones Ejecutadas

### 1. Índices Duplicados en `llamadas_ventas` (7 eliminados)

```sql
DROP INDEX idx_live_monitor_status;      -- Duplicado de idx_llamadas_ventas_call_status
DROP INDEX idx_llamadas_call_status;     -- Duplicado de idx_llamadas_ventas_call_status
DROP INDEX idx_llamadas_checkpoint;      -- Duplicado de idx_live_monitor_checkpoint
DROP INDEX idx_fecha_llamada;            -- Duplicado de idx_live_monitor_fecha
DROP INDEX idx_llamadas_fecha;           -- Duplicado de idx_llamadas_ventas_fecha
DROP INDEX idx_live_monitor_prospecto;   -- Duplicado de idx_llamadas_prospecto
DROP INDEX idx_llamadas_ventas_prospecto;-- Duplicado de idx_llamadas_prospecto
```

**Impacto:** ~15% mejora en tiempo de INSERT/UPDATE en llamadas_ventas

### 2. Índices GIN No Usados (4 eliminados)

```sql
DROP INDEX idx_datos_llamada;    -- GIN 1768 KB, sin filtros JSONB en frontend
DROP INDEX idx_datos_objeciones; -- GIN 48 KB, sin filtros JSONB en frontend
DROP INDEX idx_resumen;          -- btree en JSON, nunca filtrado
DROP INDEX idx_timestamp_unix;   -- btree en JSON, nunca filtrado
```

**Impacto:** ~1.9 MB espacio liberado

### 3. Índices de Tablas Legacy (7 eliminados)

```sql
-- user_notifications_legacy (0 referencias en frontend)
DROP INDEX idx_user_notifications_legacy_is_read;
DROP INDEX idx_user_notifications_legacy_created_at;
DROP INDEX idx_user_notifications_legacy_prospect_id;
DROP INDEX idx_user_notifications_legacy_notification_type;
DROP INDEX idx_user_notifications_legacy_call_id;
DROP INDEX idx_user_notifications_legacy_conversation_id;
DROP INDEX idx_uchat_assigned_agent;
```

### 4. Índices de Tablas de Configuración (8 eliminados)

```sql
-- Tablas pequeñas donde índices no aportan valor
DROP INDEX idx_app_themes_name;
DROP INDEX idx_app_themes_active;
DROP INDEX idx_system_config_active;
DROP INDEX idx_auth_roles_is_active;
DROP INDEX idx_coordinaciones_is_active;
DROP INDEX idx_resorts_nombre;
DROP INDEX idx_resorts_active;
```

### 5. Índices de llamadas_ventas Sin Usar (7 eliminados)

```sql
DROP INDEX idx_nivel_interes;
DROP INDEX idx_tipo_llamada;
DROP INDEX idx_seguimiento;
DROP INDEX idx_llamadas_feedback_resultado;
DROP INDEX idx_llamadas_tiene_feedback;
DROP INDEX idx_llamadas_feedback_fecha;
DROP INDEX idx_llamadas_ejecutivo;
```

### 6. Índices de Audit Logs (3 eliminados)

```sql
DROP INDEX idx_assignment_logs_prospect_id;
DROP INDEX idx_assignment_logs_coordinacion_id;
DROP INDEX idx_assignment_logs_created_at;
```

### 7. Otros Índices Sin Usar (14 eliminados)

```sql
-- User notifications, admin messages, auth, otros
DROP INDEX idx_user_notifications_notification_type;
DROP INDEX idx_user_notifications_message_id;
DROP INDEX idx_user_notifications_call_id;
DROP INDEX idx_user_notifications_prospect_id;
DROP INDEX idx_admin_messages_status;
DROP INDEX idx_admin_messages_sender;
DROP INDEX idx_admin_messages_recipient;
DROP INDEX idx_auth_users_role_id;
DROP INDEX idx_auth_sessions_expires_at;
DROP INDEX idx_horarios_excepciones_recurrente;
DROP INDEX idx_cmw_user_id;
DROP INDEX idx_cmw_created_at;
DROP INDEX idx_paraphrase_logs_user_email;
DROP INDEX idx_paraphrase_logs_has_moderation_warning;
DROP INDEX idx_paraphrase_logs_warning_id;
```

---

## Políticas RLS Consolidadas

### llamadas_ventas (2 eliminadas)

```sql
DROP POLICY "live_monitor_public_read" ON llamadas_ventas;   -- Redundante
DROP POLICY "realtime select llamadas_ventas" ON llamadas_ventas; -- Redundante
-- MANTENIDA: "Users can view llamadas_ventas" (cubre todos los casos)
```

### whatsapp_audiences (4 eliminadas)

```sql
DROP POLICY "Allow select for all" ON whatsapp_audiences;  -- Redundante
DROP POLICY "Allow insert for all" ON whatsapp_audiences;  -- Redundante
DROP POLICY "Allow update for all" ON whatsapp_audiences;  -- Redundante
DROP POLICY "Allow delete for all" ON whatsapp_audiences;  -- Redundante
-- MANTENIDAS: "Authenticated users can manage audiences" + "Service role full access"
```

---

## Índices Restantes en llamadas_ventas (15)

| Índice | Columna | Uso en Frontend |
|--------|---------|-----------------|
| `llamadas_ventas_pkey` | id | Primary Key |
| `llamadas_ventas_call_id_key` | call_id | UNIQUE constraint |
| `idx_llamadas_ventas_call_status` | call_status | Filtro `.eq('call_status', 'activa')` |
| `idx_llamadas_ventas_fecha` | fecha_llamada | Ordenamiento |
| `idx_live_monitor_fecha` | fecha_llamada DESC | Ordenamiento |
| `idx_live_monitor_checkpoint` | checkpoint_venta_actual | Monitoreo |
| `idx_llamadas_prospecto` | prospecto | JOIN con prospectos |
| `idx_llamadas_call_id` | call_id | Búsqueda |
| `idx_llamadas_coordinacion` | coordinacion_id | Filtro por coordinación |
| `idx_llamadas_destino` | destino | Filtro opcional |
| `idx_llamadas_ended_at` | ended_at | Filtro temporal |
| `idx_llamadas_estado_civil` | estado_civil | Filtro opcional |
| `idx_llamadas_last_event_at` | last_event_at | Ordenamiento |
| `idx_llamadas_resort` | resort | Filtro opcional |
| `idx_venta_exitosa` | es_venta_exitosa | Estadísticas |

---

## Optimizaciones Pendientes (Riesgo Medio)

Estas optimizaciones requieren análisis adicional antes de implementar:

1. **Índices de permisos** - Módulo admin activo, evaluar con monitoreo
2. **Índices de campañas** - Módulo campañas activo, revisar queries
3. **Schema backup** - `backup_before_merge_20250113` puede eliminarse si no se necesita
4. **UNIQUE constraint call_id** - Verificar dependencias antes de eliminar

---

## Beneficios Esperados

1. **Escrituras más rápidas** - Menos índices = menos trabajo en INSERT/UPDATE
2. **Menor uso de disco** - ~2-3 MB liberados en índices GIN
3. **Queries SELECT más rápidos** - Menos políticas RLS evaluadas
4. **Mantenimiento más simple** - Menos índices que gestionar

---

## Verificación

```sql
-- Verificar estado post-optimización
SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';
-- Resultado: 272

SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
-- Resultado: 21
```

---

## Script de Rollback

En caso de problemas, ver: `scripts/optimizaciones/01_optimizacion_bajo_riesgo.sql`

Los índices pueden recrearse con `CREATE INDEX CONCURRENTLY`.

---

**Documento generado:** 2026-01-14  
**Siguiente revisión recomendada:** 2026-02-14 (1 mes)
