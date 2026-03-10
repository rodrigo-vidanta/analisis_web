# Memoria Técnica: Vistas y RPCs de Analítica de Plantillas WhatsApp

**Fecha:** 2026-03-10
**Proyecto Supabase:** PQNC_AI (`glsmifhkoaifvaegsozd`)
**Propósito:** Documentación completa para automatizar reactivaciones inteligentes con envíos de plantillas

---

## Arquitectura de 3 Capas

```
┌─────────────────────────────────┐
│   v_template_group_health       │  ← Salud por grupo (¿qué grupo usar?)
│   Agrega v_template_health      │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│   v_template_health             │  ← Salud operativa en tiempo real (¿está sano?)
│   Ventanas: 6h / 24h / 7d      │
│   Errores, tendencias, alertas  │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│   v_template_analytics          │  ← Performance histórico (¿cuál es mejor?)
│   Ventanas: 7d / 30d / all-time │
│   Reply rates, tiempos, score   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   get_template_sends_timeline() │  ← Serie temporal de envíos (gráficas)
│   get_template_hourly_heatmap() │  ← Mapa de calor hora × día (mejor momento)
└─────────────────────────────────┘
```

---

## Tablas Base

### `whatsapp_templates` (23 columnas)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid PK | ID único del template |
| `name` | varchar | Nombre snake_case (ej: `reeng_algo_paso`) |
| `language` | varchar | Siempre `es_MX` |
| `category` | varchar | `MARKETING` o `UTILITY` |
| `components` | jsonb | Array de componentes Meta. Body = `components->0->>'text'` |
| `status` | varchar | Estado en Meta: `approved`, `pending`, `rejected` |
| `is_active` | boolean | Si está habilitado para envío |
| `is_deleted` | boolean | Soft delete (siempre filtrar `is_deleted = false`) |
| `template_group_id` | uuid FK | Grupo al que pertenece |
| `variable_mappings` | jsonb | Mapeo de variables `{{1}}`, `{{2}}`, etc. |
| `tags` | text[] | Array de tags para categorización |
| `twilio_content_sid` | text | Content SID de Twilio (necesario para envío) |
| `quality_paused` | boolean | Si Meta pausó por calidad |
| `quality_paused_at` | timestamptz | Cuándo fue pausado |
| `quality_paused_reason` | text | Razón del pause |
| `created_at` | timestamptz | Fecha de creación |

### `whatsapp_template_sends` (24 columnas)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid PK | ID único del envío |
| `template_id` | uuid FK | Template enviado |
| `prospecto_id` | uuid FK | Prospecto destinatario |
| `phone_number` | varchar | Número WhatsApp |
| `status` | varchar | `PENDING`, `SENT`, `DELIVERED`, `READ`, `FAILED` |
| `error_message` | text | Código de error Meta si falló |
| `sent_at` | timestamptz | Cuándo se envió |
| `delivered_at` | timestamptz | Cuándo se entregó |
| `read_at` | timestamptz | Cuándo se leyó |
| `replied` | boolean | Si el prospecto respondió |
| `replied_at` | timestamptz | Cuándo respondió |
| `time_to_reply_seconds` | integer | Segundos entre envío y respuesta |
| `reply_count` | integer | Cantidad de mensajes en la conversación |
| `first_reply_mensaje_id` | uuid FK | ID del primer mensaje de respuesta |
| `triggered_by` | varchar | Quién disparó el envío (`manual`, `broadcast`, `automation`) |
| `triggered_by_user` | uuid FK | Usuario que disparó (si manual) |
| `broadcast_id` | uuid FK | ID del broadcast (si aplica) |
| `conversacion_id` | uuid FK | Conversación asociada |

### `template_groups` (7 columnas)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid PK | ID del grupo |
| `name` | varchar | Nombre del grupo (ej: `Reenganche Suave`) |
| `description` | text | Descripción del propósito |
| `is_active` | boolean | Si el grupo está activo |
| `exclude_from_sending` | boolean | Si se excluye de envíos automáticos |

---

## Vista 1: `v_template_analytics`

### Propósito
Performance histórico de cada template. Responde: **¿cuál template es mejor?**

### Columnas (28)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `template_id` | uuid | ID del template |
| `template_name` | varchar | Nombre |
| `category` | varchar | MARKETING/UTILITY |
| `language` | varchar | es_MX |
| `template_status` | varchar | Estado en Meta |
| `is_active` | boolean | Habilitado |
| **Métricas All-Time** | | |
| `total_sends` | integer | Total de envíos históricos |
| `total_replies` | integer | Total de respuestas |
| `pending_replies` | integer | Envíos últimas 24h sin respuesta aún |
| `total_reply_messages` | integer | Total mensajes en conversaciones |
| `reply_rate_percent` | numeric | Tasa de respuesta all-time (%) |
| **Tiempos de Respuesta** | | |
| `avg_reply_time_minutes` | numeric | Promedio de tiempo de respuesta (minutos) |
| `median_reply_time_minutes` | numeric | Mediana de tiempo de respuesta (minutos) |
| `min_reply_time_minutes` | numeric | Respuesta más rápida (minutos) |
| `max_reply_time_minutes` | numeric | Respuesta más lenta (minutos) |
| `avg_messages_per_reply` | numeric | Profundidad promedio de conversación |
| **Métricas 7 Días** | | |
| `sends_last_7d` | integer | Envíos últimos 7 días |
| `replies_last_7d` | integer | Respuestas últimos 7 días |
| `reply_rate_7d_percent` | numeric | Tasa de respuesta 7d (%) |
| **Métricas 30 Días** | | |
| `sends_last_30d` | integer | Envíos últimos 30 días |
| `replies_last_30d` | integer | Respuestas últimos 30 días |
| `reply_rate_30d_percent` | numeric | Tasa de respuesta 30d (%) |
| **Mejor Momento de Envío** | | |
| `best_send_hour` | integer | Hora con más respuestas (0-23) |
| `best_send_day` | text | Día de la semana con más respuestas |
| **Temporales** | | |
| `first_send_at` | timestamptz | Primer envío del template |
| `last_send_at` | timestamptz | Último envío |
| `template_created_at` | timestamptz | Creación del template |
| **Score Compuesto** | | |
| `effectiveness_score` | numeric | Score 0-100 (ver fórmula abajo) |

### Fórmula del `effectiveness_score`

```
effectiveness_score = reply_component + speed_component + depth_component

reply_component (máx 60 pts):
  = MIN(reply_rate_30d * 60, 60)

speed_component (máx 20 pts):
  avg_reply_time_30d <= 5 min  → 20 pts
  avg_reply_time_30d <= 15 min → 15 pts
  avg_reply_time_30d <= 30 min → 10 pts
  avg_reply_time_30d <= 60 min → 5 pts
  más de 60 min                → 0 pts

depth_component (máx 20 pts):
  = MIN(avg_messages_30d * 5, 20)
```

**Interpretación:**
- 70+ = Excelente (alta respuesta + rápida + conversación profunda)
- 40-70 = Bueno
- 20-40 = Regular
- < 20 = Bajo rendimiento
- NULL = Sin datos suficientes (0 envíos en 30d)

### Queries de ejemplo

```sql
-- Top 10 templates más efectivos (con envíos significativos)
SELECT template_id, template_name, effectiveness_score,
       reply_rate_percent, total_sends, best_send_hour, best_send_day
FROM v_template_analytics
WHERE total_sends >= 20 AND effectiveness_score IS NOT NULL
ORDER BY effectiveness_score DESC
LIMIT 10;

-- Mejor template por grupo para automatización
SELECT DISTINCT ON (tg.name)
       tg.name AS grupo, va.template_name, va.effectiveness_score,
       va.reply_rate_30d_percent, va.best_send_hour, va.best_send_day
FROM v_template_analytics va
JOIN whatsapp_templates wt ON wt.id = va.template_id
JOIN template_groups tg ON tg.id = wt.template_group_id
WHERE va.sends_last_30d >= 10
  AND va.effectiveness_score IS NOT NULL
  AND wt.is_active = true
  AND wt.is_deleted = false
ORDER BY tg.name, va.effectiveness_score DESC;

-- Templates con mejor reply rate en los últimos 7 días
SELECT template_name, sends_last_7d, reply_rate_7d_percent,
       effectiveness_score, best_send_hour
FROM v_template_analytics
WHERE sends_last_7d >= 5
ORDER BY reply_rate_7d_percent DESC
LIMIT 20;

-- Mejor hora de envío global (agregando todos los templates)
SELECT best_send_hour, COUNT(*) as templates_con_esta_hora,
       AVG(reply_rate_percent) as avg_reply_rate
FROM v_template_analytics
WHERE best_send_hour IS NOT NULL AND total_sends >= 10
GROUP BY best_send_hour
ORDER BY avg_reply_rate DESC;
```

### Llamada desde Supabase JS

```typescript
const { data } = await supabase
  .from('v_template_analytics')
  .select('*')
  .gte('sends_last_30d', 10)
  .not('effectiveness_score', 'is', null)
  .order('effectiveness_score', { ascending: false })
  .limit(10);
```

---

## Vista 2: `v_template_health`

### Propósito
Salud operativa en tiempo real. Responde: **¿está sano para enviar?**

### Columnas (29)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `template_id` | uuid | ID del template |
| `template_name` | varchar | Nombre |
| `category` | varchar | MARKETING/UTILITY |
| `is_active` | boolean | Habilitado |
| `quality_paused` | boolean | Pausado por Meta |
| **Volumen** | | |
| `sends_6h` | bigint | Envíos últimas 6 horas |
| `sends_24h` | bigint | Envíos últimas 24 horas |
| `sends_7d` | bigint | Envíos últimos 7 días |
| **Delivery** | | |
| `delivery_rate_6h` | numeric | % entregados en 6h |
| `delivery_rate_24h` | numeric | % entregados en 24h |
| `delivery_rate_7d` | numeric | % entregados en 7d |
| **Failures** | | |
| `failure_rate_6h` | numeric | % fallidos en 6h |
| `failure_rate_24h` | numeric | % fallidos en 24h |
| `failure_rate_7d` | numeric | % fallidos en 7d |
| **Meta Quality** | | |
| `meta_block_rate_6h` | numeric | % bloqueados por Meta en 6h |
| `meta_block_rate_24h` | numeric | % bloqueados por Meta en 24h |
| **Engagement** | | |
| `read_rate_24h` | numeric | % leídos en 24h |
| `reply_rate_24h` | numeric | % respondidos en 24h |
| **Tendencias** | | |
| `delta_failure_rate` | numeric | Cambio failure 24h vs 7d (positivo = empeorando) |
| `acceleration` | numeric | Cambio failure 6h vs 24h (positivo = acelerando) |
| `trend` | text | `improving` / `stable` / `degrading` / `spiraling` / `no_data` |
| **Diagnóstico** | | |
| `primary_failure_cause` | text | Causa principal de fallas (ver tabla abajo) |
| `error_breakdown` | jsonb | Desglose de errores `{"63049": 5, "63024": 2}` |
| `last_success_at` | timestamptz | Último envío exitoso |
| `hours_since_last_success` | numeric | Horas desde último éxito |
| `confidence` | text | `high` (>20 envíos/24h) / `medium` (>=5) / `low` |
| **Clasificación** | | |
| `health_status` | text | `healthy` / `warning` / `critical` / `dead` / `no_data` |
| `alert_reason` | text | Explicación legible del status |
| **Baseline Categoría** | | |
| `category_avg_failure` | numeric | Promedio failure de la categoría |
| `category_p75_failure` | numeric | P75 failure de la categoría |

### Clasificación de Errores Meta

| Código | Causa Clasificada | Significado |
|--------|-------------------|-------------|
| `63049` | `meta_quality` | Meta bloqueó por baja calidad / spam |
| `63032`, `63024` | `invalid_audience` | Número inválido o no tiene WhatsApp |
| `63016` | `window_expired` | Ventana de 24h expirada (timing, no calidad) |
| `63021`, `63005` | `content_rejected` | Contenido rechazado por Meta |
| Otros + FAILED | `service_error` | Error de servicio (Twilio/UChat) |

### Lógica de `health_status`

```
no_data  → 0 envíos en 7 días
dead     → ≥3 envíos en 24h Y ≥95% failure
critical → ≥3 envíos Y ≥50% meta blocks
           O ≥3 envíos Y ≥40% failure Y acceleration > 10
warning  → delta_failure ≥ 15 puntos vs 7d
           O meta_blocks emergentes (≥20% en 24h cuando era <10% en 7d)
           O failure > P75 de su categoría (con ≥5 envíos)
healthy  → Ninguna de las anteriores
```

### Lógica de `trend`

```
no_data    → 0 envíos en 6h Y 0 en 24h
spiraling  → acceleration > 20 Y delta_failure > 15 Y failure_24h > 50%
degrading  → delta_failure > 10
improving  → delta_failure < -10
stable     → Ninguna de las anteriores
```

### Queries de ejemplo

```sql
-- Templates seguros para enviar (healthy + active + no paused)
SELECT template_id, template_name, health_status, trend, confidence,
       delivery_rate_24h, reply_rate_24h
FROM v_template_health
WHERE health_status = 'healthy'
  AND is_active = true
  AND COALESCE(quality_paused, false) = false
ORDER BY reply_rate_24h DESC NULLS LAST;

-- Templates que necesitan atención urgente
SELECT template_name, health_status, trend, alert_reason,
       failure_rate_24h, meta_block_rate_24h, error_breakdown
FROM v_template_health
WHERE health_status IN ('critical', 'dead')
  AND is_active = true;

-- Templates mejorando (candidatos para escalar volumen)
SELECT template_name, trend, delivery_rate_24h, reply_rate_24h,
       sends_24h, delta_failure_rate
FROM v_template_health
WHERE trend = 'improving' AND is_active = true
ORDER BY reply_rate_24h DESC NULLS LAST;

-- Verificar si un template específico es seguro antes de enviar
SELECT health_status, trend, confidence, delivery_rate_24h,
       failure_rate_24h, primary_failure_cause, alert_reason
FROM v_template_health
WHERE template_id = 'UUID_AQUI';
```

### Llamada desde Supabase JS

```typescript
const { data } = await supabase
  .from('v_template_health')
  .select('template_id, template_name, health_status, trend, confidence, reply_rate_24h')
  .eq('health_status', 'healthy')
  .eq('is_active', true)
  .eq('quality_paused', false);
```

---

## Vista 3: `v_template_group_health`

### Propósito
Salud agregada por grupo. Responde: **¿qué grupo usar para reactivaciones?**

### Columnas (17)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `group_id` | uuid | ID del grupo |
| `group_name` | varchar | Nombre del grupo |
| `description` | text | Descripción |
| `group_is_active` | boolean | Si el grupo está activo |
| `exclude_from_sending` | boolean | Si está excluido de envíos automáticos |
| `total_templates` | bigint | Total de templates en el grupo |
| `sendable_count` | bigint | Templates enviables (activos + sanos + no pausados) |
| `healthy_count` | bigint | Templates con health_status = 'healthy' |
| `warning_count` | bigint | Templates con health_status = 'warning' |
| `critical_count` | bigint | Templates con health_status = 'critical' |
| `dead_or_paused_count` | bigint | Templates muertos o pausados por Meta |
| `avg_failure_rate_24h` | numeric | Promedio de failure rate del grupo |
| `avg_delivery_rate_24h` | numeric | Promedio de delivery rate del grupo |
| `total_sends_24h` | numeric | Total envíos del grupo en 24h |
| `total_sends_7d` | numeric | Total envíos del grupo en 7d |
| `avg_reply_rate_24h` | numeric | Promedio de reply rate del grupo |
| `group_status` | text | `healthy` / `mixed` / `degraded` / `blocked` / `disabled` |

### Lógica de `group_status`

```
disabled → grupo desactivado (is_active = false)
blocked  → 0 templates enviables
degraded → algún template critical o dead
mixed    → algún template warning
healthy  → todos los templates están sanos
```

### Queries de ejemplo

```sql
-- Grupos aptos para envío automático
SELECT group_id, group_name, group_status, sendable_count,
       avg_reply_rate_24h, total_sends_7d
FROM v_template_group_health
WHERE group_is_active = true
  AND exclude_from_sending = false
  AND group_status IN ('healthy', 'mixed')
  AND sendable_count > 0
ORDER BY avg_reply_rate_24h DESC NULLS LAST;

-- Dashboard de salud de todos los grupos
SELECT group_name, group_status,
       healthy_count || '/' || total_templates as salud,
       sendable_count as enviables,
       avg_reply_rate_24h as reply_rate,
       total_sends_7d as envios_7d
FROM v_template_group_health
WHERE group_is_active = true
ORDER BY group_status, group_name;
```

---

## RPC 1: `get_template_sends_timeline()`

### Propósito
Serie temporal de envíos agrupados por intervalo. Para gráficas de tendencia y análisis temporal.

### Parámetros

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `p_template_id` | uuid | NULL | Filtrar por template específico (NULL = todos) |
| `p_group_id` | uuid | NULL | Filtrar por grupo (NULL = todos) |
| `p_start_date` | timestamptz | now() - 30 days | Inicio del rango |
| `p_end_date` | timestamptz | now() | Fin del rango |
| `p_interval` | text | `'day'` | Agrupación: `'day'`, `'week'`, `'month'` |

### Retorno

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `period` | timestamptz | Inicio del período |
| `total_sends` | bigint | Total enviados |
| `total_delivered` | bigint | Entregados (DELIVERED + READ) |
| `total_read` | bigint | Leídos (READ) |
| `total_replied` | bigint | Respondidos |
| `total_failed` | bigint | Fallidos |
| `reply_rate` | numeric | % respuesta del período |

### Queries de ejemplo

```sql
-- Timeline diario del último mes para un grupo
SELECT * FROM get_template_sends_timeline(
  p_group_id := 'c6219741-e7fa-431d-bbc2-cbc5f3570dab',  -- Reenganche Suave
  p_start_date := now() - interval '30 days',
  p_end_date := now(),
  p_interval := 'day'
);

-- Timeline semanal del último año para un template específico
SELECT * FROM get_template_sends_timeline(
  p_template_id := 'UUID_TEMPLATE',
  p_start_date := now() - interval '1 year',
  p_end_date := now(),
  p_interval := 'week'
);

-- Timeline global mensual (todos los templates)
SELECT * FROM get_template_sends_timeline(
  p_start_date := now() - interval '6 months',
  p_end_date := now(),
  p_interval := 'month'
);
```

### Llamada desde Supabase JS

```typescript
const { data } = await supabase.rpc('get_template_sends_timeline', {
  p_group_id: 'c6219741-e7fa-431d-bbc2-cbc5f3570dab',
  p_start_date: new Date(Date.now() - 30 * 86400000).toISOString(),
  p_end_date: new Date().toISOString(),
  p_interval: 'day'
});
```

---

## RPC 2: `get_template_hourly_heatmap()`

### Propósito
Mapa de calor hora × día de la semana para un template. Responde: **¿cuándo es mejor enviar este template?**

### Parámetros

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `p_template_id` | uuid | **REQUERIDO** | Template a analizar |
| `p_start_date` | timestamptz | now() - 30 days | Inicio del rango |
| `p_end_date` | timestamptz | now() | Fin del rango |

### Retorno

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `hour_of_day` | integer | Hora del día (0-23) |
| `day_of_week` | integer | Día de la semana (0=Dom, 1=Lun, ..., 6=Sáb) |
| `day_name` | text | Nombre del día (`Dom`, `Lun`, `Mar`, etc.) |
| `total_sends` | bigint | Envíos en esa celda hora×día |
| `total_replied` | bigint | Respuestas en esa celda |
| `reply_rate` | numeric | % respuesta en esa celda |

### Queries de ejemplo

```sql
-- Heatmap de un template (últimos 30 días)
SELECT * FROM get_template_hourly_heatmap(
  p_template_id := 'UUID_TEMPLATE'
);

-- Heatmap del último año
SELECT * FROM get_template_hourly_heatmap(
  p_template_id := 'UUID_TEMPLATE',
  p_start_date := now() - interval '1 year',
  p_end_date := now()
);

-- Mejor hora y día para un template (una sola fila)
SELECT hour_of_day, day_name, reply_rate, total_sends
FROM get_template_hourly_heatmap(p_template_id := 'UUID_TEMPLATE')
WHERE total_sends >= 5
ORDER BY reply_rate DESC
LIMIT 1;
```

### Llamada desde Supabase JS

```typescript
const { data } = await supabase.rpc('get_template_hourly_heatmap', {
  p_template_id: 'UUID_TEMPLATE',
  p_start_date: new Date(Date.now() - 90 * 86400000).toISOString(),
  p_end_date: new Date().toISOString()
});
```

---

## Algoritmo Sugerido: Selección Inteligente de Template

Para automatizar reactivaciones, el backend puede seguir este algoritmo:

```
PASO 1: Seleccionar grupo candidato
─────────────────────────────────────
SELECT group_id, group_name, sendable_count, avg_reply_rate_24h
FROM v_template_group_health
WHERE group_is_active = true
  AND exclude_from_sending = false
  AND group_status IN ('healthy', 'mixed')
  AND sendable_count > 0;

PASO 2: De ese grupo, obtener templates enviables y sanos
──────────────────────────────────────────────────────────
SELECT vh.template_id, vh.template_name, vh.health_status, vh.trend,
       va.effectiveness_score, va.reply_rate_30d_percent,
       va.best_send_hour, va.best_send_day, va.sends_last_7d
FROM v_template_health vh
JOIN v_template_analytics va ON va.template_id = vh.template_id
JOIN whatsapp_templates wt ON wt.id = vh.template_id
WHERE wt.template_group_id = :group_id
  AND vh.health_status IN ('healthy', 'warning')  -- NO critical/dead
  AND vh.is_active = true
  AND COALESCE(vh.quality_paused, false) = false
  AND wt.is_deleted = false
ORDER BY va.effectiveness_score DESC NULLS LAST;

PASO 3: Filtrar por hora actual (mejor momento)
────────────────────────────────────────────────
-- De los candidatos del paso 2, priorizar los que tienen
-- best_send_hour cercano a la hora actual
-- O consultar el heatmap para decisión más granular:
SELECT hour_of_day, reply_rate
FROM get_template_hourly_heatmap(p_template_id := :template_id)
WHERE hour_of_day = EXTRACT(HOUR FROM now())
  AND day_of_week = EXTRACT(DOW FROM now());

PASO 4: Evitar repetir template al mismo prospecto
───────────────────────────────────────────────────
-- Verificar que no se haya enviado el mismo template
-- al prospecto recientemente
SELECT template_id, MAX(sent_at) as ultimo_envio
FROM whatsapp_template_sends
WHERE prospecto_id = :prospecto_id
  AND template_id IN (:template_candidates)
GROUP BY template_id
HAVING MAX(sent_at) > now() - interval '7 days';
-- Excluir estos del pool de candidatos

PASO 5: Rotar templates para evitar fatiga
──────────────────────────────────────────
-- Seleccionar el template con mejor effectiveness_score
-- que NO haya sido enviado al prospecto recientemente
-- Esto previene que Meta baje quality por repetición
```

### Ejemplo completo en una sola query

```sql
-- Seleccionar el mejor template para enviar AHORA a un prospecto
WITH sendable AS (
  SELECT vh.template_id, va.template_name, va.effectiveness_score,
         va.best_send_hour, va.reply_rate_30d_percent,
         tg.name as group_name
  FROM v_template_health vh
  JOIN v_template_analytics va ON va.template_id = vh.template_id
  JOIN whatsapp_templates wt ON wt.id = vh.template_id
  JOIN template_groups tg ON tg.id = wt.template_group_id
  WHERE vh.health_status IN ('healthy')
    AND vh.is_active = true
    AND COALESCE(vh.quality_paused, false) = false
    AND wt.is_deleted = false
    AND tg.is_active = true
    AND tg.exclude_from_sending = false
    AND wt.template_group_id = :group_id  -- grupo deseado
),
already_sent AS (
  SELECT DISTINCT template_id
  FROM whatsapp_template_sends
  WHERE prospecto_id = :prospecto_id
    AND sent_at > now() - interval '14 days'
)
SELECT s.template_id, s.template_name, s.effectiveness_score,
       s.reply_rate_30d_percent, s.best_send_hour
FROM sendable s
LEFT JOIN already_sent a ON a.template_id = s.template_id
WHERE a.template_id IS NULL  -- no enviado recientemente
ORDER BY
  -- Priorizar templates cuya mejor hora es cercana a la actual
  ABS(COALESCE(s.best_send_hour, 12) - EXTRACT(HOUR FROM now())),
  s.effectiveness_score DESC NULLS LAST
LIMIT 1;
```

---

## Grupos Activos (referencia rápida)

| Grupo | ID | Excl. Auto | Propósito |
|-------|----|:---:|-----------|
| Actualización de Número | `6e84976c-c70b-4917-bea9-3f1bcf5d29cb` | SI | Cambio WhatsApp (UTILITY) |
| Con Reserva Pendiente | `ef6b3dd0-9692-4a4d-b9a4-95cb2a4fa796` | NO | Certificado o reservación iniciada |
| Concierto: El Buki | `d7ddb4ee-9f4a-4a72-8e26-d0e9760e6084` | NO | Marco Antonio Solís en Vidanta |
| Concierto: Michael Bublé | `9b406cde-deb8-415e-9178-8561215c2318` | NO | Michael Bublé en Vidanta |
| Concierto: Series 2026 | `de337b35-4521-4e97-9f98-72214f3fce3f` | NO | Combo conciertos 2026 |
| Gancho de Oportunidad | `44249a5e-a4e1-4355-9d74-48b3cece8254` | NO | Hook de escasez/exclusividad |
| Pendientes | `17e749e6-d967-4a02-bae3-492267e92b41` | NO | Templates sin aprobar |
| Primer Contacto Frío | `848103f1-c18b-4091-8321-e01109f9099c` | NO | Primer contacto cold |
| Reenganche Suave | `c6219741-e7fa-431d-bbc2-cbc5f3570dab` | NO | Reactivar prospectos fríos |
| Retomar Negociación | `40447d01-9e93-4d9a-b848-5387cb6ef562` | NO | Propuesta previa sin cierre |
| Seguimiento de Llamada | `e5ee1d31-13ef-48c8-ae50-3cec8ba78557` | NO | Post-intento llamada fallida |
| Seguimiento Post-Contacto | `ce2d9a8d-e0c1-41b0-b343-e806711893a4` | NO | Post-llamada |
| Viaje en Familia | `d3d6ddfa-fcba-484d-86a0-c6d3b68d4827` | NO | Segmento familias |
| Viaje en Pareja | `3051d075-e890-48ce-9cdf-8f659937adc2` | NO | Segmento parejas |

---

## Notas Importantes para Automatización

### Rate Limits Meta
- Templates nuevos empiezan con ~50 envíos (pacing gradual)
- Máximo ~2 mensajes MARKETING por usuario por día (cross-business)
- Si un template recibe 3 pauses por quality → **deshabilitado permanentemente**

### Interpretar `primary_failure_cause`
| Causa | Acción |
|-------|--------|
| `meta_quality` (63049) | Pausar template, revisar contenido. Meta penalizó. |
| `invalid_audience` (63032/63024) | No es culpa del template. Limpiar audiencia. |
| `window_expired` (63016) | Problema de timing (24h window). Ajustar hora de envío. |
| `content_rejected` (63021/63005) | Template tiene contenido que Meta rechaza. Reescribir. |
| `service_error` | Error técnico (Twilio/UChat). Reintentar. |
| `none` | Sin errores significativos. |
| `mixed` | Múltiples causas. Revisar `error_breakdown` para detalle. |

### Buenas Prácticas
1. **Siempre verificar `health_status`** antes de enviar. NUNCA enviar templates `critical` o `dead`.
2. **Respetar `best_send_hour`** — los templates tienen horas óptimas basadas en datos reales.
3. **Rotar templates** — no enviar el mismo template al mismo prospecto en menos de 14 días.
4. **Confiar solo en `confidence: 'high'`** — templates con < 20 envíos/24h tienen métricas poco fiables.
5. **Monitorear `trend`** — si un template pasa a `degrading`, reducir volumen antes de que llegue a `critical`.
6. **`exclude_from_sending`** en grupo significa NO usar en automáticos (ej: Actualización de Número fue broadcast manual).

### Security
- Todas las vistas y RPCs son `SECURITY DEFINER` con `GRANT EXECUTE TO authenticated`
- Se requiere autenticación Supabase (token JWT) para acceder
- RLS está habilitado en las tablas base
