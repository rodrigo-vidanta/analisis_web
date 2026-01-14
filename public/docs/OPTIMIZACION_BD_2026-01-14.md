# Optimización de Base de Datos PQNC_AI

**Fecha:** 2026-01-14  
**Versión:** v2.2.50 (B8.0.3N2.2.0)  
**Estado:** ✅ Completado y Validado

---

## Resumen Ejecutivo

Se realizó una optimización de la base de datos `pqnc_ai` eliminando **50 índices redundantes/sin uso** y **6 políticas RLS duplicadas**. Todas las validaciones pasaron exitosamente.

---

## Cambios Realizados

### Índices Eliminados (50 total)

| Categoría | Cantidad | Tablas Afectadas |
|-----------|----------|------------------|
| Duplicados en llamadas_ventas | 7 | llamadas_ventas |
| GIN sin uso (JSON) | 4 | llamadas_ventas |
| Tablas pequeñas (<20 filas) | 8 | coordinaciones, auth_roles, auth_permissions, etc. |
| Tablas legacy sin uso frontend | 7 | log_server_config, coordinacion_statistics, etc. |
| Columnas no filtradas | 7 | llamadas_ventas |
| Audit logs (solo INSERT) | 3 | auth_login_logs, auth_sessions |
| user_notifications | 4 | user_notifications |
| Otros sin uso detectado | 10 | varias |

### Políticas RLS Eliminadas (6 total)

| Política | Tabla | Razón |
|----------|-------|-------|
| `live_monitor_public_read` | llamadas_ventas | Duplicada - cubierta por `Users can view` |
| `realtime select llamadas_ventas` | llamadas_ventas | Duplicada - cubierta por `Users can view` |
| `Allow select for all` | whatsapp_audiences | Redundante - cubierta por `Authenticated users` |
| `Allow insert for all` | whatsapp_audiences | Redundante |
| `Allow update for all` | whatsapp_audiences | Redundante |
| `Allow delete for all` | whatsapp_audiences | Redundante |

---

## Validaciones Realizadas

### Queries del Frontend

| Módulo | Query | Índice Restante | Estado |
|--------|-------|-----------------|--------|
| Live Monitor Kanban | `ORDER BY fecha_llamada DESC` | `idx_live_monitor_fecha` | ✅ OK |
| Live Chat Canvas | `WHERE call_status = 'activa'` | `idx_llamadas_ventas_call_status` | ✅ OK |
| Prospectos Manager | `WHERE prospecto = X` | `idx_llamadas_prospecto` | ✅ OK |
| Audiencias Manager | `WHERE is_active = true` | Seq scan (10 filas) | ✅ OK |
| Notification Service | `WHERE user_id = X AND is_read = false` | Seq scan | ✅ OK |
| Assignment Service | `INSERT/SELECT` | Seq scan | ✅ OK |

### Realtime Subscriptions

| Tabla | Evento | Estado |
|-------|--------|--------|
| llamadas_ventas | INSERT | ✅ Funciona |
| llamadas_ventas | UPDATE | ✅ Funciona |
| user_notifications | INSERT | ✅ Funciona |

### Acceso RLS

| Tabla | Política Activa | Acceso | Estado |
|-------|-----------------|--------|--------|
| llamadas_ventas | `Users can view/insert/update/delete` | public | ✅ OK |
| whatsapp_audiences | `Authenticated users can manage` + `Service role full access` | authenticated | ✅ OK |

---

## Índices Restantes en llamadas_ventas (15)

```
idx_live_monitor_checkpoint
idx_live_monitor_fecha
idx_llamadas_call_id
idx_llamadas_coordinacion
idx_llamadas_destino
idx_llamadas_ended_at
idx_llamadas_estado_civil
idx_llamadas_last_event_at
idx_llamadas_prospecto
idx_llamadas_resort
idx_llamadas_ventas_call_status
idx_llamadas_ventas_fecha
idx_venta_exitosa
llamadas_ventas_call_id_key (UNIQUE)
llamadas_ventas_pkey (PRIMARY)
```

---

## Plan de Rollback (No Ejecutado)

En caso de problemas, ejecutar:

```sql
-- Recrear índices eliminados si es necesario
CREATE INDEX CONCURRENTLY idx_live_monitor_status ON public.llamadas_ventas(call_status);
CREATE INDEX CONCURRENTLY idx_datos_llamada ON public.llamadas_ventas USING gin(datos_llamada);
-- ... (ver script completo en scripts/optimizaciones/01_optimizacion_bajo_riesgo.sql)

-- Recrear políticas RLS
CREATE POLICY "live_monitor_public_read" ON public.llamadas_ventas FOR SELECT TO anon, authenticated USING (true);
-- ...
```

---

## Métricas

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Índices en llamadas_ventas | 26 | 15 | -42% |
| Políticas RLS en llamadas_ventas | 6 | 4 | -33% |
| Políticas RLS en whatsapp_audiences | 6 | 2 | -67% |
| Espacio recuperado (estimado) | - | ~2MB | - |

---

## Archivos Relacionados

- `scripts/optimizaciones/01_optimizacion_bajo_riesgo.sql` - Script ejecutado
- `docs/PLAN_OPTIMIZACIONES_JOINS.md` - Análisis previo

---

**Autor:** AI Assistant  
**Revisado por:** Samuel Rosales  
**Aprobado:** Pendiente validación en producción
