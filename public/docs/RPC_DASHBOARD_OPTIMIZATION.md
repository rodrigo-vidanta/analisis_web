# Optimización de Dashboard con Funciones RPC

**Fecha:** 15 de Enero 2026  
**Versión:** 1.0.0  
**Estado:** Implementado

---

## Resumen

Se implementaron 3 funciones RPC (Remote Procedure Call) en PostgreSQL para optimizar el tiempo de carga del Dashboard de Métricas Generales.

### Mejora Esperada

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Queries a BD | 10-15 | 3 | ~70% menos |
| Tiempo de carga | 3-8s | 0.5-1.5s | ~70% más rápido |
| Procesamiento cliente | Alto | Bajo | Clasificación en BD |

---

## Funciones RPC Creadas

### 1. `get_dashboard_call_metrics`

**Propósito:** Optimiza las métricas de llamadas combinando clasificación de estados y métricas de comunicación.

**Reemplaza:**
- `loadCallStatusData()`
- `loadCommunicationMetrics()`

**Parámetros:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `p_fecha_inicio` | TIMESTAMPTZ | NOW() - 1 year | Fecha de inicio |
| `p_fecha_fin` | TIMESTAMPTZ | NOW() | Fecha de fin |
| `p_coordinacion_ids` | UUID[] | NULL (todas) | Filtro de coordinaciones |
| `p_period_type` | TEXT | 'month' | Tipo de agrupación |

**Retorna:** JSON
```json
{
  "call_status_counts": { "activa": 0, "transferida": 0, "atendida": 0, ... },
  "metrics": { "avg_duration": 0, "transfer_rate": 0, "response_rate": 0, ... },
  "by_coordinacion": [ { "coordinacion_id": "...", ... } ],
  "by_period": [ { "period": "Ene 26", "total_calls": 0, ... } ]
}
```

**Uso:**
```typescript
const { data, error } = await analysisSupabase.rpc('get_dashboard_call_metrics', {
  p_fecha_inicio: startDate.toISOString(),
  p_fecha_fin: new Date().toISOString(),
  p_coordinacion_ids: coordIds,
  p_period_type: 'month'
});
```

---

### 2. `get_dashboard_pipeline`

**Propósito:** Calcula el funnel de conversión de prospectos con etapas acumulativas.

**Reemplaza:**
- `loadPipelineData()`

**Parámetros:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `p_fecha_inicio` | TIMESTAMPTZ | NOW() - 1 year | Fecha de inicio |
| `p_fecha_fin` | TIMESTAMPTZ | NOW() | Fecha de fin |
| `p_coordinacion_ids` | UUID[] | NULL (todas) | Filtro de coordinaciones |

**Retorna:** JSON
```json
{
  "total_prospectos": 0,
  "conversion_total": 0,
  "out_of_funnel_total": 0,
  "conversion_stages": [ 
    { "name": "Validando Membresía", "count": 0, "percentage": 0, ... }
  ],
  "out_of_funnel_stages": [ 
    { "name": "Activo PQNC", "count": 0, ... }
  ],
  "by_coordinacion": [ { "coordinacion_id": "...", "count": 0, ... } ]
}
```

**Etapas de Conversión (orden):**
1. Validando Membresía
2. En Seguimiento
3. Interesado
4. Atendió Llamada
5. Con Ejecutivo
6. Certificado Adquirido

**Etapas Fuera del Funnel:**
- Activo PQNC
- Es Miembro

---

### 3. `get_prospectos_metrics`

**Propósito:** Calcula métricas detalladas de prospectos nuevos para el widget.

**Reemplaza:**
- `loadMetrics()` en ProspectosMetricsWidget.tsx

**Parámetros:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `p_fecha_inicio` | TIMESTAMPTZ | NOW() - 1 year | Fecha de inicio |
| `p_fecha_fin` | TIMESTAMPTZ | NOW() | Fecha de fin |
| `p_coordinacion_ids` | UUID[] | NULL (todas) | Filtro de coordinaciones |
| `p_period_type` | TEXT | 'month' | Tipo de agrupación |

**Retorna:** JSON
```json
{
  "total": 0,
  "by_period": [ { "label": "...", "count": 0, "advanced": 0, "advanceRate": 0 } ],
  "by_hour": [ { "hour": 0, "label": "00:00", "count": 0, "advanceRate": 0 } ],
  "by_origin": [ { "origen": "...", "count": 0, "percentage": 0, "advanceRate": 0 } ],
  "by_destino": [ { "destino": "...", "count": 0, "percentage": 0 } ],
  "by_etapa": [ { "etapa": "...", "count": 0, "percentage": 0 } ],
  "best_hours": [10, 14, 11],
  "growth_rate": 0,
  "avg_daily_new": 0
}
```

---

## Lógica de Clasificación de Llamadas

La función `get_dashboard_call_metrics` replica la lógica de `callStatusClassifier.ts`:

### Estados

| Estado | Descripción | Regla |
|--------|-------------|-------|
| `transferida` | Transferida a agente | razón contiene 'forwarded' o 'transfer' |
| `no_contestada` | No contestó | razón contiene 'did-not-answer', 'busy', etc. |
| `buzon` | Buzón de voz | No contestó + grabación + 15-50s + ≤2 turnos |
| `atendida` | Hubo conversación | razón contiene 'ended-call' + ≥1 turno o ≥30s |
| `perdida` | Error técnico | razón contiene 'error', 'failed', etc. |
| `activa` | En curso | Sin indicadores de finalización |

### Orden de Prioridad

1. Transferidas (máxima prioridad)
2. No contestadas / Buzón
3. Atendidas
4. Errores técnicos
5. Inferir si no hay razón explícita
6. Llamadas stuck (>15 min sin actividad)
7. Default: Activa

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `DashboardModule.tsx` | Nuevas funciones `loadCallMetricsOptimized`, `loadPipelineOptimized` |
| `ProspectosMetricsWidget.tsx` | Nueva función `loadMetrics` con RPC |
| `docs/RPC_DASHBOARD_OPTIMIZATION.md` | Esta documentación |

---

## Funciones Originales (Fallback)

Las funciones originales se mantienen en el código como referencia:
- `loadCallStatusData()` - Ahora no se usa
- `loadCommunicationMetrics()` - Ahora no se usa
- `loadPipelineData()` - Ahora no se usa
- `loadMetricsOriginal()` - En ProspectosMetricsWidget

Se pueden eliminar después de verificar que las RPCs funcionan correctamente en producción.

---

## Mantenimiento

### Para modificar la lógica de clasificación:

1. Editar la función `get_dashboard_call_metrics` en Supabase
2. Mantener sincronizado con `callStatusClassifier.ts` si se usa como fallback

### Para agregar nuevas métricas:

1. Modificar el JSON de retorno de la RPC correspondiente
2. Actualizar el frontend para consumir los nuevos campos

### Para depurar:

```sql
-- Probar función de métricas de llamadas
SELECT get_dashboard_call_metrics(
  NOW() - INTERVAL '1 month',
  NOW(),
  NULL,
  'month'
);

-- Probar función de pipeline
SELECT get_dashboard_pipeline(
  NOW() - INTERVAL '1 month',
  NOW(),
  NULL
);

-- Probar función de métricas de prospectos
SELECT get_prospectos_metrics(
  NOW() - INTERVAL '1 week',
  NOW(),
  NULL,
  'week'
);
```

---

## Notas Importantes

1. **Las funciones son STABLE:** No modifican datos, solo leen
2. **JSON como tipo de retorno:** Simplifica la estructura del frontend
3. **Filtros opcionales:** NULL = sin filtro (todas las coordinaciones)
4. **Tipos de período:** '24hours', 'week', 'month', '6months', 'year'

---

**Autor:** AI Assistant  
**Proyecto:** PQNC QA AI Platform
