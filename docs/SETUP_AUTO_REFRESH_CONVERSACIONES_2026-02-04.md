# Setup Auto-Refresh Conversaciones Dashboard

**Fecha:** 2026-02-04  
**Versión:** 1.0.0  
**Estado:** ✅ APLICADO EN PRODUCCIÓN

---

## 📋 Resumen

Se implementó un cron job en PostgreSQL para actualizar automáticamente la vista materializada `mv_conversaciones_dashboard` cada 5 minutos.

---

## 🎯 Problema Resuelto

**Síntoma:**
- Usuarios no veían conversaciones después de reasignaciones de coordinación/ejecutivo
- Vista materializada mostraba datos desactualizados
- Ejemplo: Osmara (ejecutivo_id: `d7847ffa-0758-4eb2-a97b-f80e54886531`) tenía 29 prospectos de BOOM pero vista mostraba 0

**Causa Raíz:**
- `mv_conversaciones_dashboard` es una vista materializada (snapshot estático)
- Requiere `REFRESH MATERIALIZED VIEW` para actualizarse
- Sin mecanismo automático de actualización

---

## ✅ Solución Implementada

### Opción Elegida: Cron Job (pg_cron)

**Ventajas:**
- ✅ Predecible y controlable
- ✅ No impacta performance de escrituras
- ✅ No afecta realtime (usa tablas directas)
- ✅ Suficiente para carga inicial (5 min delay imperceptible)

**Comando Ejecutado:**
```sql
SELECT cron.schedule(
  'refresh-conversaciones-dashboard',  -- Nombre del job
  '*/5 * * * *',                       -- Cada 5 minutos
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_conversaciones_dashboard$$
);
```

**Resultado:**
- ✅ Job ID: 3
- ✅ Estado: Activo
- ✅ Próxima ejecución: Cada múltiplo de 5 minutos (00, 05, 10, 15, ...)

---

## 🔍 Verificación Post-Implementación

### Estado del Cron Job

```sql
-- Ver jobs activos
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'refresh-conversaciones-dashboard';

-- Resultado esperado:
-- jobid: 3
-- jobname: refresh-conversaciones-dashboard
-- schedule: */5 * * * *
-- active: true
```

### Historial de Ejecuciones

```sql
-- Ver últimas 5 ejecuciones
SELECT 
  jobid,
  runid,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details 
WHERE jobid = 3 
ORDER BY start_time DESC 
LIMIT 5;
```

### Estado de la Vista

```sql
-- Total de conversaciones
SELECT COUNT(*) as total 
FROM mv_conversaciones_dashboard;
-- Resultado: 3,230 conversaciones

-- Verificar Osmara (ejemplo)
SELECT COUNT(*) as conversaciones_osmara
FROM mv_conversaciones_dashboard 
WHERE ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531';
-- Resultado: 29 conversaciones (✅ correcto)
```

---

## 📊 Impacto en el Sistema

### ✅ Realtime NO Afectado

El realtime usa **tablas directas**, NO la vista materializada:

```typescript
// Suscripciones realtime
.on('postgres_changes', { table: 'mensajes_whatsapp' })   // ✅ Tabla
.on('postgres_changes', { table: 'prospectos' })          // ✅ Tabla
.on('postgres_changes', { table: 'conversaciones_whatsapp' }) // ✅ Tabla
```

**Flujo cuando llega un mensaje:**
1. Mensaje → `mensajes_whatsapp` (tabla)
2. Realtime detecta INSERT ⚡ (instantáneo)
3. Frontend actualiza UI ✅
4. Cron ejecuta en próximo múltiplo de 5 min 🔄
5. Vista materializada actualizada 📊

**Resultado:** Usuario ve mensaje **instantáneo** (realtime), vista se actualiza en background.

### Performance

**Refresh Manual (Baseline):**
- Tiempo: ~1-2 segundos
- CPU: ~100ms
- Conversaciones procesadas: 3,230

**Con Cron (cada 5 min):**
- Ejecuciones/hora: 12
- Ejecuciones/día: 288
- Impacto: Mínimo (< 0.1% CPU promedio)

---

## 🛠️ Mantenimiento

### Monitorear Ejecuciones

```sql
-- Ver últimas 10 ejecuciones con errores
SELECT *
FROM cron.job_run_details 
WHERE jobid = 3 
  AND status != 'succeeded'
ORDER BY start_time DESC 
LIMIT 10;
```

### Pausar Temporalmente

```sql
-- Desactivar cron job
UPDATE cron.job 
SET active = false 
WHERE jobid = 3;

-- Reactivar
UPDATE cron.job 
SET active = true 
WHERE jobid = 3;
```

### Eliminar Job (si es necesario)

```sql
-- Eliminar cron job
SELECT cron.unschedule(3);
```

### Ajustar Frecuencia

```sql
-- Cambiar a cada 10 minutos
SELECT cron.alter_job(
  3,
  schedule := '*/10 * * * *'
);

-- Cambiar a cada 2 minutos (más agresivo)
SELECT cron.alter_job(
  3,
  schedule := '*/2 * * * *'
);
```

---

## 📚 Archivos Relacionados

| Archivo | Descripción |
|---------|-------------|
| `scripts/sql/setup_auto_refresh_conversaciones.sql` | Script con soluciones (triggers + cron) |
| `scripts/sql/refresh_vista_conversaciones.sql` | Script de refresh manual + diagnóstico |
| `docs/FIX_VISTA_MATERIALIZADA_DESACTUALIZADA_2026-02-04.md` | Documentación del problema |
| `docs/SETUP_AUTO_REFRESH_CONVERSACIONES_2026-02-04.md` | Este documento |

---

## 🔐 Permisos Requeridos

El cron job ejecuta con permisos del **superusuario de Supabase**, por lo que tiene acceso completo para refrescar vistas materializadas.

---

## ⚠️ Notas Importantes

1. **Primera ejecución:** El cron ejecutará en el próximo múltiplo de 5 minutos (ej: si son 14:03, ejecutará a las 14:05)

2. **Delay máximo:** 5 minutos desde el cambio en BD hasta que se refleja en la vista

3. **Realtime funciona independiente:** Los mensajes llegan instantáneos sin importar el estado de la vista

4. **Monitoring:** Revisar `cron.job_run_details` semanalmente para detectar fallos

5. **Backup:** Si el cron falla, la vista seguirá mostrando datos (solo desactualizados)

---

## ✅ Checklist de Validación

- [x] Cron job creado (jobid: 3)
- [x] Job está activo (`active = true`)
- [x] Schedule correcto (`*/5 * * * *`)
- [x] Vista tiene datos actuales (3,230 conversaciones)
- [x] Osmara ve sus 29 conversaciones ✅
- [x] Realtime funciona correctamente ✅
- [ ] Monitorear primeras 24 horas de ejecuciones
- [ ] Validar con más usuarios después de reasignaciones

---

## 📈 Próximos Pasos

1. **Monitoreo 24h:** Verificar que el cron ejecute sin errores
2. **Validación usuarios:** Confirmar que todos los perfiles ven datos correctos
3. **Ajuste frecuencia (opcional):** Si 5 min es mucho, reducir a 2-3 min
4. **Documentar en runbook:** Agregar a procedimientos operativos

---

**Estado:** ✅ APLICADO Y FUNCIONANDO  
**Última verificación:** 2026-02-04 (Osmara: 29 conversaciones ✅)  
**Responsable:** Sistema automatizado (pg_cron)
