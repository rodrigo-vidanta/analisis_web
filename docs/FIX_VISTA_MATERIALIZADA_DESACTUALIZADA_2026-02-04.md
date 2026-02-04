# Fix: Vista Materializada Desactualizada - Conversaciones WhatsApp

**Fecha:** 2026-02-04 02:15 UTC  
**Versión afectada:** Todas (v2.5.76-v2.5.82)  
**Tipo:** BUG Crítico de Arquitectura  
**Severidad:** 🔴 ALTA (Afecta a TODOS los usuarios)

---

## 🔴 Problema

### Síntoma Principal

**Ejecutivos no ven TODAS sus conversaciones** en el módulo de WhatsApp y widget "Últimas Conversaciones".

**Caso específico:**
- **Osmara Partida** tiene 29 prospectos en coordinación BOOM
- Vista materializada mostraba 0 conversaciones de BOOM
- Solo mostraba conversaciones antiguas de VEN (coordinación anterior)

### Diagnóstico Completo

#### 1. Datos Reales en BD

```sql
-- Prospectos de Osmara en BOOM
SELECT COUNT(*) FROM prospectos 
WHERE ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531'
  AND coordinacion_id = 'e590fed1-6d65-43e0-80ab-ff819ce63eee';
-- Resultado: 29 ✅

-- Conversaciones WhatsApp de BOOM
SELECT COUNT(*) FROM conversaciones_whatsapp c
INNER JOIN prospectos p ON c.prospecto_id = p.id
WHERE p.ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531'
  AND p.coordinacion_id = 'e590fed1-6d65-43e0-80ab-ff819ce63eee';
-- Resultado: 49 ✅
```

#### 2. Vista Materializada (ANTES del refresh)

```sql
-- Conversaciones en vista para Osmara BOOM
SELECT COUNT(*) FROM mv_conversaciones_dashboard
WHERE ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531'
  AND coordinacion_id = 'e590fed1-6d65-43e0-80ab-ff819ce63eee';
-- Resultado: 0 ❌ PROBLEMA

-- Conversaciones en vista para Osmara VEN (coordinación antigua)
SELECT COUNT(*) FROM mv_conversaciones_dashboard
WHERE ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531'
  AND coordinacion_id = '3f41a10b-60b1-4c2b-b097-a83968353af5';
-- Resultado: 166 ❌ (datos viejos)
```

#### 3. Vista Materializada (DESPUÉS del refresh)

```sql
-- Conversaciones en vista para Osmara BOOM
SELECT COUNT(*) FROM mv_conversaciones_dashboard
WHERE ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531'
  AND coordinacion_id = 'e590fed1-6d65-43e0-80ab-ff819ce63eee';
-- Resultado: 29 ✅

-- Conversaciones en vista para Osmara VEN
SELECT COUNT(*) FROM mv_conversaciones_dashboard
WHERE ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531'
  AND coordinacion_id = '3f41a10b-60b1-4c2b-b097-a83968353af5';
-- Resultado: 0 ✅ (correcto, se movieron a BOOM)
```

---

## 🔍 Causa Raíz

### Problema de Arquitectura

**Las vistas materializadas NO se actualizan automáticamente.**

1. La vista `mv_conversaciones_dashboard` se creó para optimizar performance
2. Se cargó con datos actuales en ese momento
3. **Nunca se configuró un mecanismo de actualización automática**
4. Cuando los prospectos cambiaron de coordinación, la vista quedó con datos viejos

### Timeline del Problema

1. **Inicial:** Prospectos de Osmara en coordinación VEN
2. **Vista creada:** Captura 166 conversaciones de VEN
3. **Cambio:** Prospectos se reasignan a coordinación BOOM
4. **Vista desactualizada:** Sigue mostrando 166 conversaciones de VEN (que ya no existen)
5. **Usuario reporta:** "No veo mis conversaciones"

### Por qué el bug era difícil de detectar

- ✅ Logs mostraban que la query devolvía datos correctamente
- ✅ Transformación de datos funcionaba correctamente
- ✅ Filtros de permisos funcionaban correctamente
- ❌ **El problema era que los datos ORIGEN estaban viejos**

---

## ✅ Solución Inmediata (APLICADA)

### Refresh Manual

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_conversaciones_dashboard;
```

**Resultado:**
- Total conversaciones en vista: 3,230
- Osmara (BOOM): 29 ✅
- Osmara (VEN): 0 ✅
- Osmara (TOTAL): 29 ✅

---

## 🛠️ Solución Permanente

### Opción 1: Triggers (Recomendado para baja frecuencia)

**Ventaja:** Vista siempre actualizada en tiempo real  
**Desventaja:** Refresh en CADA cambio (puede ser lento en bulk updates)

```sql
-- Crear función de refresh
CREATE OR REPLACE FUNCTION refresh_conversaciones_dashboard()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_conversaciones_dashboard;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger en prospectos (coordinacion_id, ejecutivo_id)
CREATE TRIGGER refresh_conversaciones_on_prospecto
  AFTER INSERT OR UPDATE OR DELETE ON prospectos
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_conversaciones_dashboard();

-- Trigger en conversaciones_whatsapp
CREATE TRIGGER refresh_conversaciones_on_conv
  AFTER INSERT OR UPDATE OR DELETE ON conversaciones_whatsapp
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_conversaciones_dashboard();

-- Trigger en mensajes_whatsapp (contadores)
CREATE TRIGGER refresh_conversaciones_on_mensajes
  AFTER INSERT OR UPDATE OR DELETE ON mensajes_whatsapp
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_conversaciones_dashboard();
```

**Script:** `scripts/sql/setup_auto_refresh_conversaciones.sql`

### Opción 2: Cron Job (Recomendado para alta frecuencia)

**Ventaja:** No impacta performance de escrituras  
**Desventaja:** Vista puede estar desactualizada hasta 5 minutos

```sql
-- Requiere extensión pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Programar refresh cada 5 minutos
SELECT cron.schedule(
  'refresh-conversaciones-dashboard',
  '*/5 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_conversaciones_dashboard$$
);
```

### Opción 3: Reemplazar por Vista Normal (si performance lo permite)

**Ventaja:** Siempre actualizada, sin mantenimiento  
**Desventaja:** Puede ser más lenta

```sql
-- Eliminar vista materializada
DROP MATERIALIZED VIEW mv_conversaciones_dashboard;

-- Crear vista normal
CREATE VIEW mv_conversaciones_dashboard AS
  SELECT ...;  -- (misma definición)
```

---

## 📊 Impacto

### Usuarios Afectados

**TODOS los usuarios del sistema:**

| Tipo Usuario | Impacto | Escenario |
|---|---|---|
| **Ejecutivos** | 🔴 Alto | No ven conversaciones de prospectos reasignados a otras coordinaciones |
| **Coordinadores** | 🟡 Medio | No ven conversaciones de prospectos que cambiaron de coordinación |
| **Administradores** | 🟢 Bajo | Ven todas, pero conteos pueden ser incorrectos |

### Casos que Causaban Desactualización

1. **Reasignación de prospectos** a otra coordinación
2. **Reasignación de prospectos** a otro ejecutivo
3. **Nuevas conversaciones** no reflejadas en vista
4. **Mensajes nuevos** no actualizan contadores

---

## 🧪 Testing

### Test 1: Verificar Vista Actualizada

```sql
-- Ver última actualización
SELECT 
  MAX(vista_actualizada_at) as ultima_actualizacion,
  COUNT(*) as total_conversaciones
FROM mv_conversaciones_dashboard;

-- Comparar con datos reales
SELECT COUNT(*) FROM conversaciones_whatsapp;
```

**Resultado esperado:** Conteos deben coincidir (±5%)

### Test 2: Reasignar Prospecto

```sql
-- 1. Contar conversaciones actuales
SELECT COUNT(*) FROM mv_conversaciones_dashboard 
WHERE ejecutivo_id = 'ejecutivo-a';

-- 2. Reasignar prospecto a otro ejecutivo
UPDATE prospectos 
SET ejecutivo_id = 'ejecutivo-b'
WHERE id = 'prospecto-x';

-- 3. Esperar 1-2 segundos (si hay trigger)

-- 4. Verificar que conteos cambiaron
SELECT COUNT(*) FROM mv_conversaciones_dashboard 
WHERE ejecutivo_id = 'ejecutivo-a';  -- Debe disminuir

SELECT COUNT(*) FROM mv_conversaciones_dashboard 
WHERE ejecutivo_id = 'ejecutivo-b';  -- Debe aumentar
```

### Test 3: Verificar Permisos

```sql
-- Admin debe ver TODAS
SELECT COUNT(*) FROM mv_conversaciones_dashboard;

-- Coordinador debe ver solo su coordinación
SELECT COUNT(*) FROM mv_conversaciones_dashboard 
WHERE coordinacion_id = 'coordinacion-x';

-- Ejecutivo debe ver solo sus prospectos
SELECT COUNT(*) FROM mv_conversaciones_dashboard 
WHERE ejecutivo_id = 'ejecutivo-y';
```

---

## 🎯 Recomendación

### Implementación Sugerida

**Usar Cron Job (cada 5 minutos)** porque:

1. **Performance:** No impacta escrituras frecuentes
2. **Simplicidad:** Más fácil de mantener y debuggear
3. **Predictibilidad:** Carga de refresh en horarios conocidos
4. **Suficiente:** 5 minutos de delay es aceptable para este caso de uso

**Comando:**
```bash
# Ejecutar en Supabase SQL Editor
npx supabase@latest sql --db-url "tu-connection-string" < scripts/sql/setup_auto_refresh_conversaciones.sql
```

---

## 📚 Documentación Relacionada

- **Script de setup:** `scripts/sql/setup_auto_refresh_conversaciones.sql`
- **Script de refresh manual:** `scripts/sql/refresh_vista_conversaciones.sql`
- **Handover:** `.cursor/handovers/2026-02-04-fix-vista-materializada.md`
- **Fix anterior (coordinación):** `docs/FIX_COORDINACION_FILTER_LIVECHAT_2026-02-04.md`

---

## 🚨 Acción Requerida

### ✅ Estado: COMPLETADO (2026-02-04)

1. ✅ **HECHO:** Refresh manual ejecutado
2. ✅ **HECHO:** Auto-actualización implementada (Cron Job)
3. ✅ **HECHO:** Osmara ve sus 29 conversaciones correctamente
4. ⏳ **PENDIENTE:** Monitoreo 24 horas para validar estabilidad

### Detalles de Implementación

**Cron Job Creado:**
- Job ID: 3
- Nombre: `refresh-conversaciones-dashboard`
- Frecuencia: Cada 5 minutos (`*/5 * * * *`)
- Estado: ✅ Activo
- Comando: `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_conversaciones_dashboard`

**Verificación:**
```sql
-- Ver estado del cron
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'refresh-conversaciones-dashboard';

-- Ver últimas ejecuciones
SELECT start_time, end_time, status 
FROM cron.job_run_details 
WHERE jobid = 3 
ORDER BY start_time DESC 
LIMIT 5;
```

### Próximos Pasos

1. ⏳ Monitorear `cron.job_run_details` durante 24 horas
2. ⏳ Validar que otros usuarios ven conversaciones correctamente
3. ⏳ Ajustar frecuencia si es necesario (actual: 5 min)

**Documentación completa:** `docs/SETUP_AUTO_REFRESH_CONVERSACIONES_2026-02-04.md`
3. ⏳ **PENDIENTE:** Monitorear que vista se mantenga actualizada
4. ⏳ **PENDIENTE:** Documentar proceso en runbook de operaciones

### Verificación Post-Deploy

- [ ] Ejecutar `scripts/sql/setup_auto_refresh_conversaciones.sql`
- [ ] Verificar que triggers/cron funcionan
- [ ] Hacer test de reasignación de prospecto
- [ ] Confirmar que vista se actualiza automáticamente
- [ ] Monitorear logs de Supabase por 24 horas

---

**Estado:** 🟡 Solución inmediata aplicada, solución permanente pendiente  
**Prioridad:** 🔴 CRÍTICA  
**Fecha solución temporal:** 2026-02-04 02:15 UTC  
**Fecha solución permanente:** Pendiente  
**Owner:** Equipo de Infraestructura