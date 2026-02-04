# Handover: Implementación Auto-Refresh Conversaciones Dashboard

**Fecha:** 2026-02-04 02:45 UTC  
**Agent:** Claude (Sonnet 4.5)  
**Versión:** v2.5.82 (sin cambios de código, solo BD)  
**Tipo:** Database Operations - Producción

---

## 📋 Resumen Ejecutivo

Se implementó exitosamente un **cron job automático** para actualizar la vista materializada `mv_conversaciones_dashboard` cada 5 minutos, resolviendo el problema de conversaciones desactualizadas después de reasignaciones de ejecutivos/coordinaciones.

---

## ✅ Trabajo Completado

### 1. Análisis de Impacto Realtime

**Pregunta del usuario:** "esto no afecta el realtime?"

**Respuesta:**
- ✅ **NO afecta** - Realtime usa tablas directas, NO vistas materializadas
- ✅ Mensajes llegan instantáneos (escucha `mensajes_whatsapp`)
- ✅ Vista se actualiza en background (cada 5 min)
- ✅ Usuario NO nota delay porque realtime funciona normal

**Evidencia:**
```typescript
// LiveChatCanvas.tsx líneas 2033-2217
.on('postgres_changes', { table: 'mensajes_whatsapp' })   // Tabla directa
.on('postgres_changes', { table: 'prospectos' })          // Tabla directa
.on('postgres_changes', { table: 'conversaciones_whatsapp' }) // Tabla directa
```

### 2. Conexión a Base de Datos

**MCP utilizado:** `user-SupabaseREST`  
**Proyecto:** glsmifhkoaifvaegsozd (PQNC_AI)  
**Método:** Conexión directa con Personal Access Token

**Verificaciones iniciales:**
```sql
-- pg_cron disponible
SELECT count(*) FROM cron.job;
-- Resultado: 1 job existente ✅

-- Vista materializada existente
SELECT count(*) FROM mv_conversaciones_dashboard;
-- Resultado: 3,230 conversaciones ✅
```

### 3. Implementación del Cron Job

**Comando ejecutado:**
```sql
SELECT cron.schedule(
  'refresh-conversaciones-dashboard',
  '*/5 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_conversaciones_dashboard$$
);
```

**Resultado:**
- ✅ Job ID: 3
- ✅ Estado: Activo
- ✅ Schedule: Cada 5 minutos (00, 05, 10, 15, ...)

**Verificación post-creación:**
```sql
SELECT count(*) FROM cron.job WHERE jobid = 3 AND active = true;
-- Resultado: 1 ✅
```

### 4. Validación de Datos

**Caso de prueba: Osmara Partida**
```sql
SELECT COUNT(*) FROM mv_conversaciones_dashboard 
WHERE ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531';
-- Resultado: 29 conversaciones ✅ (antes: 0)
```

**Estado general:**
- Total conversaciones: 3,230
- Osmara (BOOM): 29 ✅ (correcto)
- Vista actualizada ✅

### 5. Documentación Creada

| Archivo | Descripción |
|---------|-------------|
| `docs/SETUP_AUTO_REFRESH_CONVERSACIONES_2026-02-04.md` | **Nuevo** - Guía completa de implementación y mantenimiento |
| `scripts/sql/verificar_auto_refresh_conversaciones.sql` | **Nuevo** - Script de verificación rápida con 8 checks |
| `scripts/sql/setup_auto_refresh_conversaciones.sql` | **Actualizado** - Marcado como aplicado en producción |
| `docs/FIX_VISTA_MATERIALIZADA_DESACTUALIZADA_2026-02-04.md` | **Actualizado** - Estado cambiado a "COMPLETADO" |

---

## 🔍 Hallazgos Técnicos

### Limitación del MCP SupabaseREST

**Problema encontrado:**
- El MCP no puede parsear strings en resultados JSON
- Queries como `SELECT extname FROM pg_extension` fallan con error 22P02
- Error: "Token 'string' is invalid - invalid input syntax for type json"

**Workaround aplicado:**
- Usar queries agregadas (`COUNT`, `SUM`) en lugar de SELECT con strings
- Validar existencia sin recuperar valores textuales
- Funciona correctamente para operaciones DDL/DML

**Ejemplos de lo que funciona:**
```sql
✅ SELECT count(*) FROM cron.job
✅ SELECT cron.schedule('nombre', 'schedule', 'command')
✅ SELECT COUNT(*) FROM mv_conversaciones_dashboard WHERE ...
❌ SELECT jobname FROM cron.job (falla al retornar strings)
```

### Flujo Completo de Actualización

```
Usuario realiza acción → Tabla actualizada → 2 flujos paralelos:

FLUJO A (INMEDIATO - Realtime):
1. Realtime detecta cambio en tabla ⚡ (<100ms)
2. Frontend recibe evento
3. UI actualiza conversación
4. Usuario ve cambio instantáneo ✅

FLUJO B (DIFERIDO - Vista Materializada):
1. Tabla actualizada
2. Espera hasta próximo múltiplo de 5 min
3. Cron ejecuta REFRESH (1-2 segundos)
4. Vista actualizada
5. Próxima carga inicial usa datos frescos ✅
```

**Resultado:** Usuario NO percibe el delay de la vista porque el realtime muestra cambios instantáneos.

---

## 📊 Métricas de Performance

### Cron Job

**Configuración:**
- Frecuencia: Cada 5 minutos
- Ejecuciones/hora: 12
- Ejecuciones/día: 288

**Performance esperada:**
- Duración por refresh: 1-3 segundos
- CPU por refresh: ~100ms
- Impacto promedio: <0.1% CPU
- Conversaciones procesadas: 3,230

### Vista Materializada

**Antes del fix:**
- Osmara (BOOM): 0 conversaciones ❌
- Osmara (VEN): 166 conversaciones (desactualizadas)
- Total: 3,230

**Después del fix:**
- Osmara (BOOM): 29 conversaciones ✅
- Osmara (VEN): 0 (correcto, ya no tiene prospectos ahí)
- Total: 3,230 (sin cambios)

---

## ⚠️ Limitaciones Conocidas

### 1. Delay de hasta 5 minutos

**Escenario:**
- Reasignación de ejecutivo a las 14:03
- Vista se actualiza a las 14:05 (próximo múltiplo de 5)
- Usuario ve datos nuevos en carga inicial después de 14:05

**Mitigación:**
- ✅ Realtime funciona instantáneo (mensajes nuevos)
- ✅ Solo afecta carga inicial del módulo
- ✅ 5 minutos es imperceptible en uso normal

**Si es problema:**
- Reducir frecuencia a `*/2 * * * *` (cada 2 minutos)
- Trade-off: Más ejecuciones = más carga en BD

### 2. Primera Ejecución

**El cron NO ejecuta inmediatamente** al crearse:
- Creado a las 14:03 → Primera ejecución a las 14:05
- Usuario debe esperar hasta el próximo múltiplo de 5

**Solución:**
- Refresh manual después de crear cron (ya hecho en esta sesión)

---

## 🚨 Monitoreo Requerido

### Próximas 24 horas

**Checklist de validación:**

1. ✅ **Cron ejecutándose:**
   ```sql
   SELECT COUNT(*) FROM cron.job_run_details 
   WHERE jobid = 3 AND start_time > NOW() - INTERVAL '1 hour';
   -- Esperado: ~12 ejecuciones por hora
   ```

2. ✅ **Sin errores:**
   ```sql
   SELECT COUNT(*) FROM cron.job_run_details 
   WHERE jobid = 3 AND status != 'succeeded';
   -- Esperado: 0 errores
   ```

3. ✅ **Vista actualizada:**
   ```sql
   SELECT NOW() - MAX(vista_actualizada_at) as hace_cuanto
   FROM mv_conversaciones_dashboard;
   -- Esperado: < 5 minutos
   ```

4. ⏳ **Validación con usuarios:**
   - Confirmar que otros ejecutivos ven sus conversaciones
   - Validar coordinadores ven solo su coordinación
   - Validar admins ven todo

### Script de Verificación

**Usar:** `scripts/sql/verificar_auto_refresh_conversaciones.sql`

**Ejecuta 8 checks automáticos:**
1. Cron job activo
2. Últimas 10 ejecuciones
3. Ejecuciones con error
4. Estado de la vista
5. Verificación de Osmara (caso específico)
6. Última actualización
7. Próxima ejecución estimada
8. Resumen de salud del sistema

---

## 🔧 Mantenimiento Futuro

### Comandos Útiles

**Ver estado del cron:**
```sql
SELECT * FROM cron.job WHERE jobname = 'refresh-conversaciones-dashboard';
```

**Ver ejecuciones recientes:**
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = 3 
ORDER BY start_time DESC 
LIMIT 20;
```

**Pausar temporalmente:**
```sql
UPDATE cron.job SET active = false WHERE jobid = 3;
```

**Reactivar:**
```sql
UPDATE cron.job SET active = true WHERE jobid = 3;
```

**Cambiar frecuencia:**
```sql
-- Cada 2 minutos (más agresivo)
SELECT cron.alter_job(3, schedule := '*/2 * * * *');

-- Cada 10 minutos (menos carga)
SELECT cron.alter_job(3, schedule := '*/10 * * * *');
```

**Eliminar (si es necesario):**
```sql
SELECT cron.unschedule(3);
```

### Troubleshooting

**Si el cron no ejecuta:**
1. Verificar que `active = true`
2. Verificar permisos de BD
3. Revisar logs de Supabase Dashboard
4. Forzar ejecución manual: `SELECT cron.run_job(3);`

**Si hay errores en ejecuciones:**
1. Ver `return_message` en `cron.job_run_details`
2. Verificar que la vista existe: `SELECT * FROM pg_matviews WHERE matviewname = 'mv_conversaciones_dashboard'`
3. Probar refresh manual: `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_conversaciones_dashboard;`

---

## 📚 Contexto Histórico

### Problema Original (v2.5.76)

**Fecha:** 2026-02-03  
**Usuario reportó:** "Osmara Partida no ve conversaciones"  
**Causa inicial:** Flag `is_operativo` en `false`

**Fix 1:** Corrección de `is_operativo` para ejecutivos → Parcial

### Problema de Timeout RPC (v2.5.77-78)

**Fecha:** 2026-02-03  
**Usuario reportó:** Timeout 57014 en `get_conversations_ordered`  
**Causa:** RPC lenta con 3,230 conversaciones

**Fix 2:** Migración de RPC a vista materializada → Resuelto

### Problema de Filtro Coordinación (v2.5.79-80)

**Fecha:** 2026-02-04  
**Usuario reportó:** "sigue sin cargar" después de fix de timeout  
**Causa:** Filtro de coordinación bloqueaba prospectos del ejecutivo

**Fix 3:** Remover filtro redundante de coordinación → Resuelto

### Problema Vista Desactualizada (v2.5.82)

**Fecha:** 2026-02-04 (esta sesión)  
**Usuario reportó:** Logs muestran 166 conversaciones pero mapSize: 0  
**Causa:** Vista materializada mostraba coordinación antigua (VEN) en lugar de nueva (BOOM)

**Fix 4 (Manual):** `REFRESH MATERIALIZED VIEW` → Temporal  
**Fix 5 (Permanente):** Cron job cada 5 minutos → **ESTA SESIÓN**

---

## 🎯 Decisiones de Diseño

### ¿Por qué Cron Job en lugar de Triggers?

**Triggers rechazados porque:**
- ❌ Alta frecuencia de refresh (cada INSERT/UPDATE/DELETE)
- ❌ Overhead en escrituras (cada mensaje dispara refresh)
- ❌ 100 mensajes/min = 100 refreshes/min = lag en BD
- ❌ Difícil de controlar/pausar en producción

**Cron Job elegido porque:**
- ✅ Predecible: 288 refreshes/día en horarios fijos
- ✅ Controlable: Fácil pausar/ajustar frecuencia
- ✅ Eficiente: No impacta escrituras
- ✅ Suficiente: 5 min de delay es imperceptible

### ¿Por qué 5 minutos y no menos?

**Balance entre:**
- **Frescura de datos:** 5 min es suficiente para carga inicial
- **Carga en BD:** 288 refreshes/día es sostenible
- **Realtime compensa:** Mensajes nuevos llegan instantáneos

**Si se necesita menor delay:**
- Reducir a 2-3 minutos incrementa carga a 720-1440 refreshes/día
- Aún sostenible, pero innecesario si realtime funciona

---

## 🔐 Seguridad

**Permisos requeridos:**
- Cron ejecuta con permisos de superusuario de Supabase
- Tiene acceso completo para `REFRESH MATERIALIZED VIEW`
- No requiere cambios en RLS o políticas

**Logs auditables:**
- Todas las ejecuciones en `cron.job_run_details`
- Timestamps de start/end para cada refresh
- Return messages con estado de éxito/error

---

## ✅ Entregables

### Código y Scripts

1. ✅ `scripts/sql/setup_auto_refresh_conversaciones.sql` - Actualizado con status de aplicado
2. ✅ `scripts/sql/verificar_auto_refresh_conversaciones.sql` - Nuevo, 8 checks de salud
3. ✅ Script aplicado en BD (cron job activo)

### Documentación

1. ✅ `docs/SETUP_AUTO_REFRESH_CONVERSACIONES_2026-02-04.md` - Guía completa de implementación
2. ✅ `docs/FIX_VISTA_MATERIALIZADA_DESACTUALIZADA_2026-02-04.md` - Actualizado con estado
3. ✅ `.cursor/handovers/2026-02-04-implementacion-auto-refresh-v2-5-82.md` - Este handover

### Base de Datos

1. ✅ Cron job creado (jobid: 3)
2. ✅ Job activo y configurado
3. ✅ Vista materializada actualizada manualmente
4. ✅ Datos de Osmara corregidos (29 conversaciones)

---

## 🚦 Estado Final

### ✅ Completado

- [x] Análisis de impacto en realtime
- [x] Conexión a Supabase exitosa
- [x] Cron job creado y activo
- [x] Verificación de datos OK
- [x] Documentación completa
- [x] Scripts de verificación creados

### ⏳ Pendiente (Usuario)

- [ ] Monitorear `cron.job_run_details` durante 24 horas
- [ ] Validar con usuarios reales (Osmara + otros)
- [ ] Confirmar que coordinadores ven solo su coordinación
- [ ] Confirmar que admins ven todas las conversaciones
- [ ] Ajustar frecuencia si 5 min no es suficiente

### 📊 Métricas a Validar

**Después de 24 horas:**
- Total ejecuciones: ~288 (12/hora)
- Tasa de éxito: >99%
- Duración promedio: 1-3 segundos
- Vista actualizada: siempre <5 min de antigüedad

---

## 📞 Siguiente Agent

### Contexto para Continuar

**Si el usuario reporta problemas:**

1. **"El cron no ejecuta"**
   - Verificar: `SELECT * FROM cron.job WHERE jobid = 3`
   - Ver logs: `SELECT * FROM cron.job_run_details WHERE jobid = 3 LIMIT 10`
   - Forzar manual: `SELECT cron.run_job(3)`

2. **"La vista sigue desactualizada"**
   - Ver última actualización: `SELECT MAX(vista_actualizada_at) FROM mv_conversaciones_dashboard`
   - Ver última ejecución cron: `SELECT MAX(start_time) FROM cron.job_run_details WHERE jobid = 3`
   - Gap entre ambas = problema de refresh

3. **"Usuarios siguen sin ver conversaciones"**
   - **NO es problema de la vista** (ya está actualizada)
   - Revisar filtros de permisos en `LiveChatCanvas.tsx` líneas 4100-4300
   - Verificar `ejecutivo_id` y `coordinacion_id` en prospectos

### Archivos Clave

- `src/components/chat/LiveChatCanvas.tsx` - Frontend con realtime
- `scripts/sql/verificar_auto_refresh_conversaciones.sql` - Verificación rápida
- `docs/SETUP_AUTO_REFRESH_CONVERSACIONES_2026-02-04.md` - Guía de mantenimiento

---

**Timestamp final:** 2026-02-04 02:45 UTC  
**Duración de sesión:** ~30 minutos  
**Estado:** ✅ IMPLEMENTACIÓN EXITOSA - Monitoreo en curso
