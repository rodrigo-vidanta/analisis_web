# Handover: Refactor Analítica de Plantillas — 6 Cambios

**Fecha:** 2026-03-10
**Autor:** Claude Code (Opus 4.6)
**Estado:** Completado
**Versión:** Pendiente deploy (cambios locales en main)

---

## Resumen Ejecutivo

Refactor mayor del módulo de Analítica de Plantillas (`src/components/campaigns/analitica/`). 6 cambios solicitados por el usuario, todos implementados y verificados con build exitoso.

---

## Cambios Implementados

### 1. Filtros Globales (TemplateAnalyticsModule.tsx)

**Antes:** Solo selector de período (semana/mes/año)
**Después:**
- **FilterSelector**: 3 modos — Todo / Grupo / Plantilla
  - Modo "Grupo": dropdown con grupos activos (excluye inactivos y excluidos de envío)
  - Modo "Plantilla": dropdown con todas las plantillas ordenadas alfabéticamente
- **DateRangeSelector**: 5 opciones — 24h / 7d / 30d / 6m / 1 año

```typescript
type FilterMode = 'all' | 'group' | 'template';
type AnalyticsDateRange = '24h' | 'week' | 'month' | '6months' | 'year';
```

### 2. Funnel de Conversión (reemplaza Health Cards)

**Antes:** Cards de salud por grupo (sección eliminada)
**Después:** Embudo Plotly con 3 etapas: Enviados → Recibidos → Respondidos

- Usa `react-plotly.js` (mismo que Dashboard)
- Responde SOLO al filtro de grupo (no plantilla, no fecha)
- Siempre usa ventana de 30 días para datos significativos
- Colores: azul → púrpura → verde
- Labels muestran valor absoluto + porcentaje respecto al total enviado

### 3. Timeline Global con 4 Líneas (TemplateAnalyticsModule.tsx)

**Antes:** 2 líneas (envíos + respuestas)
**Después:** 4 líneas con Recharts AreaChart:
- **Azul** (#3B82F6): Enviados (`total_sends`)
- **Púrpura** (#8B5CF6): Recibidos (`total_delivered`)
- **Verde** (#10B981): Respondidos (`total_replied`)
- **Rojo punteado** (#EF4444): Fallidos (`total_failed`) — `strokeDasharray="4 2"`

- Responde SOLO al filtro de fecha (global, no grupo/plantilla)
- Gradientes suaves en cada área
- Formato de fecha adaptado: hora para 24h, día-mes para 7d/30d, mes-año para 6m/1a

### 4. Rankings con Filtros Duales

**Antes:** Rankings fijos sin responder a filtros
**Después:** Ambos rankings responden a:
- **Filtro de grupo/plantilla**: filtra el pool de templates para el ranking
- **Filtro de fecha**: usa envíos y reply rates del período correspondiente

Mapeo de campos por período:
| Período | Envíos | Reply Rate |
|---------|--------|------------|
| 24h | `sends_24h` | `reply_rate_24h` |
| 7d | `sends_7d` | `reply_rate_7d_percent` |
| 30d | `sends_last_30d` | `reply_rate_30d_percent` |
| 6m / 1a | `total_sends` | `reply_rate_percent` |

Umbrales mínimos para Top Efectivas: 24h=1, 7d=3, 30d=10, default=20

### 5. DataGrid Agrupado/Colapsable (TemplateAnalyticsGrid.tsx — REESCRITURA COMPLETA)

**Antes:** Tabla plana con todas las plantillas, 7 columnas
**Después:** Tabla agrupada por grupos de plantillas con filas colapsables

#### Estructura:
- **Fila de grupo** (click para expandir): nombre, # plantillas, envíos agregados, tasa resp. promedio, tasa fallo promedio, efectividad promedio, estado dominante, tendencia dominante
- **Filas de plantilla** (expandidas): indentadas con borde indigo izquierdo, datos individuales

#### Columnas nuevas vs anteriores:
| Antes | Después |
|-------|---------|
| Nombre | Nombre (grupo o plantilla) |
| Grupo | Plantillas (count en grupo) / Categoría (en plantilla) |
| Estado (dot + trend juntos) | Estado (solo health dot + label) |
| — | Tendencia (separada, con símbolo + label) |
| Envíos 7d | Envíos {período} (dinámico) |
| Tasa Resp. | Tasa Resp. {período} (dinámico) |
| — | **Tasa Fallo** (nueva, con barra invertida: verde < 10%, amarillo < 25%, rojo >= 25%) |
| Efectividad | Efectividad |
| Mejor Hora | (eliminada del grid, disponible en detail panel) |

#### Comportamiento:
- Default: todos los grupos colapsados
- Búsqueda filtra y resetea expansiones
- Paginación por grupos (20 por página)
- Ordenamiento por columnas del grupo
- Al hacer click en plantilla individual → abre detail panel

#### Lógica de estado/tendencia dominante del grupo:
```typescript
// Prioridad: el peor estado domina
healthPriority: ['critical', 'warning', 'dead', 'healthy', 'no_data']
trendPriority: ['spiraling', 'degrading', 'stable', 'improving', 'no_data']
```

### 6. Heatmap Semáforo (TemplateDetailPanel.tsx)

**Antes:** Colores emerald/indigo (bonito pero difícil de interpretar rápidamente)
**Después:** Semáforo intuitivo:
- **Rojo** (`bg-red-500` / `bg-red-300`): reply rate ≤ 10%
- **Amarillo** (`bg-amber-500` / `bg-amber-300`): reply rate 10-20%
- **Verde** (`bg-emerald-500` / `bg-emerald-300`): reply rate > 20%
- **Gris**: sin datos
- Intensidad (claro/oscuro) basada en volumen de envíos relativo al máximo

Leyenda actualizada con los 4 niveles.

---

## Archivos Modificados

| Archivo | Acción | Líneas aprox. |
|---------|--------|---------------|
| `src/types/whatsappTemplates.ts` | EDITADO | +35 (nuevos tipos AnalyticsDateRange, TemplateAnalyticsRow ampliado) |
| `src/services/whatsappTemplatesService.ts` | EDITADO | +30 (getAnalyticsGridData con nuevos campos) |
| `src/components/campaigns/analitica/TemplateAnalyticsModule.tsx` | REESCRITO | ~735 líneas (filtros, funnel, timeline 4 líneas, rankings filtrados) |
| `src/components/campaigns/analitica/TemplateAnalyticsGrid.tsx` | REESCRITO | ~330 líneas (agrupado/colapsable, 9 columnas) |
| `src/components/campaigns/analitica/TemplateDetailPanel.tsx` | EDITADO | ~10 líneas (getColor semáforo + leyenda) |

---

## Tipos Nuevos/Modificados

```typescript
// whatsappTemplates.ts
export type AnalyticsDateRange = '24h' | 'week' | 'month' | '6months' | 'year';

export interface TemplateAnalyticsRow {
  template_id: string;
  template_name: string;
  group_name: string;
  group_id: string;
  category: string;
  body_text: string;
  health_status: TemplateHealthStatus;
  trend: TemplateHealthTrend;
  confidence: TemplateHealthConfidence;
  sends_24h: number;        // NEW
  sends_7d: number;
  sends_last_30d: number;   // NEW
  total_sends: number;
  total_replies: number;
  reply_rate_24h: number | null;        // NEW
  reply_rate_7d_percent: number | null; // NEW
  reply_rate_30d_percent: number | null;// NEW
  reply_rate_percent: number | null;
  failure_rate_7d: number | null;       // NEW
  effectiveness_score: number | null;
  best_send_hour: number | null;
  best_send_day: string | null;
}
```

---

## Dependencias de Datos

### Funnel requiere de `TemplateSendTimeline`:
- `total_sends`, `total_delivered`, `total_replied`
- RPC: `get_template_sends_timeline(null, group_id, start_30d, end, 'month')`

### Grid requiere de `TemplateAnalyticsRow`:
- Combina datos de `v_template_analytics` + `v_template_health`
- Servicio: `whatsappTemplatesService.getAnalyticsGridData()`

### Timeline requiere de `TemplateSendTimeline`:
- 4 campos: `total_sends`, `total_delivered`, `total_replied`, `total_failed`
- RPC: `get_template_sends_timeline(null, null, start, end, interval)`

---

## Arquitectura de Filtros

```
DateRangeSelector ────────────┐
                               ├──→ Timeline (solo fecha)
FilterSelector ───────────────┤
  ├─ mode: all/group/template ├──→ KPIs (ambos filtros)
  ├─ selectedGroupId          ├──→ Rankings (ambos filtros)
  └─ selectedFilterTemplateId ├──→ Grid (solo fecha, agrupación interna)
                               └──→ Funnel (solo grupo, siempre 30d)
```

---

## Verificación

- TypeScript: `tsc --noEmit` ✅ sin errores
- Vite build: ✅ exitoso en 1m 53s
- Chunk `CampaignsDashboardTabs`: 330KB (incluye analítica + Plotly separado)

---

## Notas para Desarrollo Futuro

1. **24h granularity**: El campo `sends_24h` viene de `v_template_health` (ventana 24h real). Para timeline de 24h se usa intervalo `'day'` que da un solo punto — considerar añadir intervalo `'hour'` al RPC para granularidad horaria.
2. **Failure rate por período**: Actualmente solo `failure_rate_7d` disponible. Para otros períodos habría que extender la vista.
3. **Expandir todos/colapsar todos**: Posible mejora UX con botón toggle en el header del grid.
4. **Export CSV**: El grid agrupado podría exportar datos con columna de grupo.
