# Handover: Modulo de Analitica de Plantillas WhatsApp

**Fecha:** 2026-03-10
**Autor:** Claude Code (Opus 4.6)
**Estado:** Implementado y compilando, pendiente deploy

---

## Resumen

Se creo un modulo completo de analitica de plantillas WhatsApp dentro del modulo de Campanas. El modulo muestra metricas de rendimiento de todos los template groups y plantillas individuales con datos en tiempo real de 3 vistas SQL y 2 funciones RPC nuevas.

---

## Arquitectura

### Componentes Frontend (3 archivos nuevos)

```
src/components/campaigns/analitica/
├── TemplateAnalyticsModule.tsx   (~580 lineas) - Contenedor principal
├── TemplateAnalyticsGrid.tsx     (~265 lineas) - Data grid con tabla
└── TemplateDetailPanel.tsx       (~480 lineas) - Panel lateral de detalle
```

### TemplateAnalyticsModule.tsx

Componente raiz con lazy loading desde `CampaignsDashboardTabs.tsx`.

**Subcomponentes internos:**
- `AnimatedNumber` — Numero animado con spring de Framer Motion
- `GroupHealthCard` — Tarjeta de salud por grupo con mini health bar (verde/amarillo/rojo/gris), KPIs (plantillas, envios 7d, tasa resp.)
- `RankingList` — Componente generico reutilizable para rankings (barra animada, medallas top 3, click para detalle)
- `GlobalTimelineChart` — AreaChart de Recharts (mismo estilo que Metricas de Comunicacion en DashboardModule)
- `DateRangeSelector` — Toggle 7 dias / 30 dias / 1 ano

**Secciones del modulo:**
1. Header con titulo + selector de periodo
2. 4 KPI cards animados: Plantillas Activas, Envios (7d), Tasa de Respuesta, Mejor Efectividad
3. Grid de Group Health Cards (click para filtrar)
4. Timeline de envios (ancho completo, AreaChart con gradientes)
5. Top 10 Mas Efectivas + Top 10 Mas Enviadas (side by side)
6. Data grid con todas las plantillas
7. Panel de detalle (slide-in desde derecha)

**Logica de rankings por periodo:**
- Los rankings respetan el selector de fecha usando `sends_last_7d`, `sends_last_30d`, o `total_sends`
- Tasas de respuesta por periodo: `reply_rate_7d_percent`, `reply_rate_30d_percent`, `reply_rate_percent`
- Umbral minimo de envios para "Mas Efectivas": semana=3, mes=10, ano=20
- "Mas Enviadas" excluye el grupo "Actualizacion de Numero" (broadcast masivo)

### TemplateAnalyticsGrid.tsx

Tabla interactiva con:
- 7 columnas ordenables: Nombre, Grupo, Estado, Envios 7d, Tasa Resp., Efectividad, Mejor Hora
- Busqueda por nombre o grupo
- Paginacion de 25 items
- Indicadores visuales: dots de salud (emerald/amber/red/gray), flechas de tendencia, barras de progreso
- Click en fila abre panel de detalle

### TemplateDetailPanel.tsx

Panel deslizable desde la derecha con spring animation:
- Preview del body text de la plantilla
- 5 KPI cards: Envios, Respuestas, Tasa Resp., Efectividad, Tiempo Resp. (mediana)
- Historial de Envios (AreaChart con mismo estilo que dashboard)
- Mapa de Calor horario (grid CSS 8h-22h x 7 dias, color por volumen + tasa de respuesta)
- Desglose de errores (barras horizontales animadas con codigo + porcentaje)
- Mejor momento de envio
- Selector de periodo propio (Semana/Mes/Ano)
- ESC para cerrar

---

## Capa de Datos

### Vistas SQL existentes (ya existian antes de este modulo)

| Vista | Proposito |
|-------|-----------|
| `v_template_group_health` | Metricas agregadas por grupo: total_templates, sends_7d, avg_reply_rate_24h, healthy/warning/critical counts |
| `v_template_health` | Salud individual: health_status, trend, confidence, delivery/failure rates, error_breakdown |
| `v_template_analytics` | Analytics historicos: total_sends, reply rates (all-time, 7d, 30d), effectiveness_score, best_send_hour/day, avg/median reply time |

### Funciones RPC nuevas (creadas en esta sesion)

**Migration:** `create_template_analytics_rpc_functions`

```sql
-- 1. Timeline de envios (agregacion temporal)
CREATE OR REPLACE FUNCTION get_template_sends_timeline(
  p_template_id UUID DEFAULT NULL,
  p_group_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_interval TEXT DEFAULT 'day'  -- 'day' | 'week' | 'month'
) RETURNS TABLE (
  period TIMESTAMPTZ,
  total_sends BIGINT,
  total_delivered BIGINT,
  total_read BIGINT,
  total_replied BIGINT,
  total_failed BIGINT,
  reply_rate NUMERIC
)

-- 2. Heatmap horario (hora x dia_semana)
CREATE OR REPLACE FUNCTION get_template_hourly_heatmap(
  p_template_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS TABLE (
  hour_of_day INT,
  day_of_week INT,
  day_name TEXT,
  total_sends BIGINT,
  total_replied BIGINT,
  reply_rate NUMERIC
)
```

Ambas con `SECURITY DEFINER` y `GRANT EXECUTE TO authenticated`.

### Metodos de servicio nuevos

**Archivo:** `src/services/whatsappTemplatesService.ts` (lineas 2237+)

| Metodo | Proposito |
|--------|-----------|
| `getAllTemplateAnalytics()` | Query `v_template_analytics` ordenado por effectiveness_score DESC |
| `getAnalyticsGridData()` | Enriquece templates con datos de health + analytics + groups via Promise.all |
| `getTemplateSendsTimeline(templateId, groupId, start, end, interval)` | RPC get_template_sends_timeline, cap reply_rate a 100% |
| `getTemplateHourlyHeatmap(templateId, start, end)` | RPC get_template_hourly_heatmap, cap reply_rate a 100% |

### Tipos TypeScript nuevos

**Archivo:** `src/types/whatsappTemplates.ts` (lineas 735+)

```typescript
export interface TemplateSendTimeline {
  period: string; total_sends: number; total_delivered: number;
  total_read: number; total_replied: number; total_failed: number; reply_rate: number;
}
export interface TemplateHourlyHeatmap {
  hour_of_day: number; day_of_week: number; day_name: string;
  total_sends: number; total_replied: number; reply_rate: number;
}
export type AnalyticsDateRange = 'week' | 'month' | 'year';
export type AnalyticsInterval = 'day' | 'week' | 'month';
export interface TemplateAnalyticsRow {
  template_id: string; template_name: string; group_name: string; group_id: string;
  category: string; body_text: string; health_status: TemplateHealthStatus;
  trend: TemplateHealthTrend; confidence: TemplateHealthConfidence; sends_7d: number;
  reply_rate_percent: number | null; effectiveness_score: number | null;
  best_send_hour: number | null; best_send_day: string | null;
  total_sends: number; total_replies: number;
}
```

---

## Integracion

### Tab en CampaignsDashboardTabs

**Archivo:** `src/components/campaigns/CampaignsDashboardTabs.tsx`

- Linea 10: `const TemplateAnalyticsModule = lazy(() => import('./analitica/TemplateAnalyticsModule'));`
- Tipo: `'analitica'` agregado a `CampaignTab` union type
- Posicion: PRIMER tab en la lista (antes de Plantillas)
- Render: Envuelto en `<Suspense>` con spinner fallback

### Patron de graficas

Las graficas AreaChart replican exactamente el estilo de "Metricas de Comunicacion" en DashboardModule:
- Gradientes lineales verticales (5% opacidad arriba, 0.05 abajo)
- Tooltip oscuro: `backgroundColor: '#1F2937'`, `borderRadius: '12px'`, sin borde
- CartesianGrid con `strokeDasharray="3 3"`, stroke="#374151", opacity 0.1
- Ejes sin linea ni ticks, font size 10, color #9CA3AF
- animationDuration: 1600ms
- Colores: Envios=#3B82F6 (blue-500), Respuestas=#8B5CF6 (purple-500)

---

## Decisiones de Diseno

### Remotion descartado
Remotion (v4.0.434 instalado) NO es adecuado para dashboards — es para renderizar video. Decision: Framer Motion + Recharts.

### Idioma unificado
Todos los textos visibles al usuario estan en espanol. No hay spanglish. Terminos tecnicos internos (variables, tipos) siguen en ingles por convencion del codebase.

Traducciones aplicadas:
- "Reply Rate" → "Tasa Resp." / "Tasa de Respuesta"
- "Effectiveness" → "Efectividad"
- "Templates" → "Plantillas"
- "Timeline" → "Historial"
- "Performance" → "Rendimiento"

### Rankings por periodo
Los rankings (Top 10) NO son all-time fijos. Respetan el selector de fecha:
- Semana: usa `sends_last_7d` y `reply_rate_7d_percent`
- Mes: usa `sends_last_30d` y `reply_rate_30d_percent`
- Ano: usa `total_sends` y `reply_rate_percent`

Umbral minimo de envios para "Mas Efectivas" evita que plantillas con 2-3 envios y alto reply rate contaminen el ranking.

### Exclusion de grupo broadcast
El grupo "Actualizacion de Numero" se excluye del ranking "Mas Enviadas" porque fue un broadcast masivo unico que distorsiona las metricas.

---

## Problemas conocidos y resueltos

### RPC reply_rate > 100%
La funcion `get_template_sends_timeline` podia retornar reply_rate > 100% cuando `replied=true` se setea antes de que el status se actualice (race condition en datos). Resuelto en capa de servicio con `Math.min(Number(row.reply_rate) || 0, 100)`.

### getTemplates() en DetailPanel
El panel de detalle llama `whatsappTemplatesService.getTemplates()` para obtener el body_text. Este metodo existe y funciona, pero carga TODOS los templates. Si la cantidad de templates crece mucho, considerar un metodo puntual `getTemplateById(id)`.

---

## Bundle

El modulo se code-splittea automaticamente via lazy loading:
- `TemplateAnalyticsModule-*.js`: ~38 kB (9.9 kB gzip)
- Recharts se comparte con DashboardModule (chunk `AreaChart-*.js`: ~322 kB)

---

## Archivos modificados/creados

| Archivo | Accion | Descripcion |
|---------|--------|-------------|
| `src/components/campaigns/analitica/TemplateAnalyticsModule.tsx` | NUEVO | Contenedor principal |
| `src/components/campaigns/analitica/TemplateAnalyticsGrid.tsx` | NUEVO | Tabla interactiva |
| `src/components/campaigns/analitica/TemplateDetailPanel.tsx` | NUEVO | Panel de detalle |
| `src/types/whatsappTemplates.ts` | EDITADO | +7 tipos nuevos (lineas 735+) |
| `src/services/whatsappTemplatesService.ts` | EDITADO | +4 metodos de analitica (lineas 2237+) |
| `src/components/campaigns/CampaignsDashboardTabs.tsx` | EDITADO | +lazy import, +tab analitica |
| Migration SQL (Supabase) | APLICADA | 2 RPCs: get_template_sends_timeline, get_template_hourly_heatmap |

---

## Mejoras futuras posibles

1. **getTemplateById**: Reemplazar `getTemplates()` en DetailPanel por query puntual
2. **Virtualizacion**: Si el grid supera ~200 templates, usar `@tanstack/react-virtual` (ya disponible en dependencies)
3. **Export CSV**: Boton para exportar datos del grid
4. **Comparativa temporal**: Mostrar delta vs periodo anterior (ej: +15% respuestas vs semana pasada)
5. **Cache**: Los datos de analytics no cambian frecuentemente — considerar SWR o cache manual de 5 min
