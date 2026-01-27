# 🔧 Fix Widget de Ejecutivos - Dashboard

**Fecha:** 27 de Enero 2026  
**Estado:** ⚠️ REQUIERE ACCIÓN MANUAL  
**Prioridad:** 🔴 ALTA

---

## 🐛 Problema Detectado

El widget de "Métricas de Ejecutivos" en el Dashboard **no funciona** porque falta el RPC `get_ejecutivos_metricas` en la base de datos.

### Error en Consola

```
POST https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/rpc/get_ejecutivos_metricas 404 (Not Found)

Error: {
  code: '42883',
  message: 'operator does not exist: uuid = text',
  hint: 'No operator matches the given name and argument types...'
}
```

**Causa:** El RPC nunca fue creado en PQNC_AI.

---

## ✅ Solución

Ejecutar el SQL que crea la función RPC.

---

## 📝 Pasos para Aplicar el Fix

### 1️⃣ Abrir Supabase SQL Editor

Ir a: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new

---

### 2️⃣ Copiar el SQL

Abrir el archivo:
```
docs/sql/create_get_ejecutivos_metricas.sql
```

**O copiar directamente este SQL:**

```sql
-- ============================================
-- RPC: get_ejecutivos_metricas
-- ============================================
-- Función para obtener métricas de ejecutivos
-- Fecha: 27 de Enero 2026
-- Uso: Dashboard Ejecutivo - Widget de Métricas de Ejecutivos
-- ============================================

CREATE OR REPLACE FUNCTION get_ejecutivos_metricas(
  p_fecha_inicio TIMESTAMPTZ,
  p_fecha_fin TIMESTAMPTZ,
  p_coordinacion_ids UUID[]
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Obtener métricas por ejecutivo
  WITH ejecutivos_base AS (
    SELECT 
      u.id AS ejecutivo_id,
      u.full_name AS nombre,
      u.email,
      u.coordinacion_id,
      c.nombre AS coordinacion_nombre
    FROM auth_users u
    LEFT JOIN coordinaciones c ON c.id = u.coordinacion_id
    WHERE 
      (u.is_ejecutivo = true OR u.is_admin = true)
      AND (p_coordinacion_ids IS NULL OR u.coordinacion_id = ANY(p_coordinacion_ids))
  ),
  
  mensajes_por_ejecutivo AS (
    SELECT 
      m.user_id AS ejecutivo_id,
      COUNT(*) AS mensajes_enviados,
      COUNT(*) FILTER (WHERE m.es_plantilla = true) AS plantillas_enviadas
    FROM mensajes_whatsapp m
    WHERE 
      m.rol = 'Agente'
      AND m.fecha_hora >= p_fecha_inicio
      AND m.fecha_hora <= p_fecha_fin
      AND m.user_id IS NOT NULL
    GROUP BY m.user_id
  ),
  
  llamadas_por_ejecutivo AS (
    SELECT 
      COALESCE(l.ejecutivo_asignado_id, (l.prospecto::jsonb->>'ejecutivo_id')::UUID) AS ejecutivo_id,
      COUNT(*) AS llamadas_atendidas
    FROM llamadas_ventas l
    WHERE 
      l.fecha_llamada >= p_fecha_inicio
      AND l.fecha_llamada <= p_fecha_fin
      AND l.call_status IN ('atendida', 'transferida')
      AND (COALESCE(l.ejecutivo_asignado_id, (l.prospecto::jsonb->>'ejecutivo_id')::UUID) IS NOT NULL)
    GROUP BY COALESCE(l.ejecutivo_asignado_id, (l.prospecto::jsonb->>'ejecutivo_id')::UUID)
  ),
  
  llamadas_programadas_por_ejecutivo AS (
    SELECT 
      lp.ejecutivo_id,
      COUNT(*) AS llamadas_programadas
    FROM llamadas_programadas lp
    WHERE 
      lp.fecha_programada >= p_fecha_inicio
      AND lp.fecha_programada <= p_fecha_fin
      AND lp.ejecutivo_id IS NOT NULL
    GROUP BY lp.ejecutivo_id
  ),
  
  prospectos_por_ejecutivo AS (
    SELECT 
      p.ejecutivo_asignado_id AS ejecutivo_id,
      COUNT(*) AS prospectos_asignados
    FROM prospectos p
    WHERE 
      p.ejecutivo_asignado_id IS NOT NULL
      AND (p_coordinacion_ids IS NULL OR p.coordinacion_id = ANY(p_coordinacion_ids))
    GROUP BY p.ejecutivo_asignado_id
  ),
  
  tiempos_respuesta AS (
    SELECT 
      m.user_id AS ejecutivo_id,
      AVG(
        EXTRACT(EPOCH FROM (m.fecha_hora - prev.fecha_hora)) / 60
      ) AS tiempo_respuesta_promedio,
      COUNT(*) AS conversaciones_con_handoff
    FROM mensajes_whatsapp m
    INNER JOIN LATERAL (
      SELECT fecha_hora
      FROM mensajes_whatsapp prev
      WHERE prev.prospecto_id = m.prospecto_id
        AND prev.rol = 'Prospecto'
        AND prev.fecha_hora < m.fecha_hora
      ORDER BY prev.fecha_hora DESC
      LIMIT 1
    ) prev ON true
    WHERE 
      m.rol = 'Agente'
      AND m.fecha_hora >= p_fecha_inicio
      AND m.fecha_hora <= p_fecha_fin
      AND m.user_id IS NOT NULL
    GROUP BY m.user_id
  ),
  
  tiempos_handoff AS (
    SELECT 
      m.user_id AS ejecutivo_id,
      AVG(
        EXTRACT(EPOCH FROM (m.fecha_hora - first.fecha_hora)) / 60
      ) AS tiempo_handoff_promedio
    FROM mensajes_whatsapp m
    INNER JOIN LATERAL (
      SELECT MIN(fecha_hora) AS fecha_hora
      FROM mensajes_whatsapp first
      WHERE first.prospecto_id = m.prospecto_id
    ) first ON true
    WHERE 
      m.rol = 'Agente'
      AND m.fecha_hora >= p_fecha_inicio
      AND m.fecha_hora <= p_fecha_fin
      AND m.user_id IS NOT NULL
    GROUP BY m.user_id
  )
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'ejecutivo_id', eb.ejecutivo_id,
      'nombre', eb.nombre,
      'email', eb.email,
      'coordinacion_id', eb.coordinacion_id,
      'coordinacion_nombre', eb.coordinacion_nombre,
      'mensajes_enviados', COALESCE(me.mensajes_enviados, 0),
      'plantillas_enviadas', COALESCE(me.plantillas_enviadas, 0),
      'llamadas_atendidas', COALESCE(le.llamadas_atendidas, 0),
      'llamadas_programadas', COALESCE(lp.llamadas_programadas, 0),
      'prospectos_asignados', COALESCE(pe.prospectos_asignados, 0),
      'tiempo_respuesta_promedio', COALESCE(tr.tiempo_respuesta_promedio, 0),
      'tiempo_handoff_promedio', COALESCE(th.tiempo_handoff_promedio, 0),
      'conversaciones_con_handoff', COALESCE(tr.conversaciones_con_handoff, 0)
    )
  ) INTO v_result
  FROM ejecutivos_base eb
  LEFT JOIN mensajes_por_ejecutivo me ON me.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN llamadas_por_ejecutivo le ON le.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN llamadas_programadas_por_ejecutivo lp ON lp.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN prospectos_por_ejecutivo pe ON pe.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN tiempos_respuesta tr ON tr.ejecutivo_id = eb.ejecutivo_id
  LEFT JOIN tiempos_handoff th ON th.ejecutivo_id = eb.ejecutivo_id;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario de la función
COMMENT ON FUNCTION get_ejecutivos_metricas IS 
'Obtiene métricas de rendimiento de ejecutivos para el dashboard. 
Incluye: mensajes, plantillas, llamadas, tiempos de respuesta y handoff.
Creada: 2026-01-27';
```

---

### 3️⃣ Ejecutar el SQL

1. Pegar el SQL en el editor
2. Click en **"Run"** (o presionar `Cmd + Enter` / `Ctrl + Enter`)
3. Verificar que aparezca: ✅ **Success. No rows returned**

---

### 4️⃣ Verificar que Funciona

1. Ir al Dashboard de tu app
2. Refrescar la página (`Cmd + R` / `F5`)
3. Click en la pestaña **"Ejecutivos"**
4. ✅ Debería cargar las métricas sin errores

---

## 📊 Qué Calcula la Función

La función `get_ejecutivos_metricas` obtiene las siguientes métricas por ejecutivo:

| Métrica | Descripción | Fuente |
|---------|-------------|--------|
| `mensajes_enviados` | Total de mensajes enviados | `mensajes_whatsapp` |
| `plantillas_enviadas` | Mensajes con `es_plantilla = true` | `mensajes_whatsapp` |
| `llamadas_atendidas` | Llamadas con status `atendida` o `transferida` | `llamadas_ventas` |
| `llamadas_programadas` | Llamadas agendadas | `llamadas_programadas` |
| `prospectos_asignados` | Prospectos asignados al ejecutivo | `prospectos` |
| `tiempo_respuesta_promedio` | Tiempo promedio de respuesta (minutos) | `mensajes_whatsapp` |
| `tiempo_handoff_promedio` | Tiempo promedio hasta handoff (minutos) | `mensajes_whatsapp` |
| `conversaciones_con_handoff` | Número de conversaciones con handoff | `mensajes_whatsapp` |

---

## 🔐 Seguridad

- La función usa `SECURITY DEFINER` (ejecuta con permisos del owner)
- Necesario para acceder a todas las tablas
- Filtra por coordinaciones si se especifica `p_coordinacion_ids`
- Solo considera ejecutivos (`is_ejecutivo = true`) o admins (`is_admin = true`)

---

## 🧪 Testing Manual (Opcional)

Puedes testear la función manualmente con:

```sql
-- Test con fechas del último mes
SELECT get_ejecutivos_metricas(
  NOW() - INTERVAL '30 days',
  NOW(),
  NULL -- Sin filtrar por coordinación
);

-- Test con coordinación específica
SELECT get_ejecutivos_metricas(
  NOW() - INTERVAL '7 days',
  NOW(),
  ARRAY['uuid-de-coordinacion']::UUID[]
);
```

---

## 🐛 Si Persiste el Error

Si después de ejecutar el SQL sigue sin funcionar:

### Verificar que la función existe

```sql
SELECT proname, proargnames 
FROM pg_proc 
WHERE proname = 'get_ejecutivos_metricas';
```

**Resultado esperado:**
```
proname                  | proargnames
------------------------|----------------------------------
get_ejecutivos_metricas | {p_fecha_inicio,p_fecha_fin,p_coordinacion_ids}
```

### Verificar permisos

```sql
-- Dar permisos explícitos si es necesario
GRANT EXECUTE ON FUNCTION get_ejecutivos_metricas TO anon, authenticated;
```

---

## 📝 Archivos Relacionados

- **SQL:** `docs/sql/create_get_ejecutivos_metricas.sql`
- **Widget:** `src/components/dashboard/widgets/EjecutivosMetricsWidget.tsx`
- **Dashboard:** `src/components/dashboard/DashboardModule.tsx`

---

## ✅ Checklist de Resolución

- [ ] Ejecutar SQL en Supabase Dashboard
- [ ] Verificar mensaje de éxito
- [ ] Refrescar la app
- [ ] Click en pestaña "Ejecutivos"
- [ ] Verificar que carguen las métricas
- [ ] Sin errores en consola

---

**Estado al finalizar:** ✅ RPC creado y funcional  
**Próximos pasos:** Testing exhaustivo del widget de ejecutivos
