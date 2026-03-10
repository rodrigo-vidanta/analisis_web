# Handover: Sesión Analítica + Templates Reenganche Suave

**Fecha:** 2026-03-10
**Autor:** Claude Code (Opus 4.6)
**Estado:** Completado

---

## Resumen Ejecutivo

Sesión de 3 entregables principales:
1. **Fix y mejoras al módulo de Analítica de Plantillas** — rankings por período, Top 10 más enviadas, eliminación de spanglish
2. **14 templates nuevas de Reenganche Suave** — generadas con skill factory-templates, integración natural de VP + Vidanta
3. **Memoria técnica de backend** — documentación completa de vistas, RPCs y algoritmo de selección inteligente

---

## 1. Fix Módulo Analítica de Plantillas

### Problema reportado
- Top 10 mostraba envíos muy bajos (8, 5, 2) — no respetaba el período seleccionado
- Solo había ranking por effectiveness, faltaba ranking por volumen de envíos
- Spanglish en la interfaz: mezclaba "Reply Rate", "Effectiveness", "Templates" con español

### Cambios realizados

#### TemplateAnalyticsModule.tsx (~600 líneas)
- **Refactored** `TopTemplatesRanking` → componente genérico `RankingList` reutilizable
- **Rankings por período**: `getPeriodSends()` y `getPeriodReplyRate()` usan campos correctos según dateRange:
  - Semana: `sends_last_7d`, `reply_rate_7d_percent`
  - Mes: `sends_last_30d`, `reply_rate_30d_percent`
  - Año: `total_sends`, `reply_rate_percent`
- **Umbral mínimo de envíos** para Top 10 Efectivas: semana=3, mes=10, año=20
- **Top 10 Más Enviadas** (nuevo): excluye grupo "Actualización de Número" (broadcast masivo)
- **Layout**: Timeline ancho completo, ambos rankings side-by-side (grid-cols-2)
- **Español completo**: "Plantillas Activas", "Tasa de Respuesta", "Mejor Efectividad", "Rendimiento y métricas", "Top 10 — Más Efectivas", "Top 10 — Más Enviadas"

#### TemplateAnalyticsGrid.tsx (~266 líneas)
- Headers: "Reply Rate" → "Tasa Resp.", "Effectiveness" → "Efectividad"

#### TemplateDetailPanel.tsx (~480 líneas)
- "% reply" → "% resp." (replace_all)
- "Reply Rate" → "Tasa Resp."
- "Effectiveness" → "Efectividad"
- "Timeline de Envíos" → "Historial de Envíos"

### Tipo genérico RankingItem

```typescript
interface RankingItem {
  id: string;
  name: string;
  primaryValue: number;
  primaryLabel: string;
  secondaryValue: string;
  secondaryLabel: string;
}
```

---

## 2. Templates Reenganche Suave (14 nuevas)

### Contexto
- Grupo tenía solo 6 templates, se necesitaban 14 más
- Sin variables (cold — solo tenemos teléfono)
- Feedback del usuario: integrar VP + Vidanta de manera natural y no repetitiva

### Análisis data-driven previo
- Top performer sin variables: `ultima_oportunidad` (14.78% reply, Reactance)
- Zeigarnik sobreusado (3/6 templates)
- Sweet spot: 102-155 chars para cold
- Error dominante: 63049 (timing, no calidad)

### Templates creadas

| # | Nombre | Chars | Técnica | Integración VP |
|---|--------|-------|---------|----------------|
| 1 | `reeng_algo_paso` | 143 | Curiosity Gap | VP como razón de prioridad |
| 2 | `reeng_no_quedarse` | 158 | Loss Aversion | Vidanta como origen, "me asignaron" |
| 3 | `reeng_plan_vacaciones` | 164 | Pattern Interrupt | Pregunta primero, VP como explicación |
| 4 | `reeng_mes_favorito` | 146 | FITD | Asignación como contexto |
| 5 | `reeng_seguimiento_personal` | 162 | Reciprocity | Da contacto directo, VP credencial |
| 6 | `reeng_costos_sorpresa` | 166 | Anchoring | Valor primero, asignación al final |
| 7 | `reeng_viajero_exigente` | 184 | Identity Labeling | Identidad → VP como puente |
| 8 | `reeng_suite_vista_mar` | 177 | Self-Reference Effect | Visualización → VP habilitador |
| 9 | `reeng_cena_frente_mar` | 152 | Future Pacing | Escena → asignación como puente |
| 10 | `reeng_no_arrepentirse` | 157 | Regret Aversion | Filosofía → asignación como cuidado |
| 11 | `reeng_solo_escuchar` | 164 | DITF | Presión removida → VP presentación |
| 12 | `reeng_lujo_accesible` | 155 | Contrast Effect | Contraste → VP credencial |
| 13 | `reeng_encontre_para_usted` | 169 | Endowment Effect | Expediente → VP autoridad |
| 14 | `reeng_destino_ideal` | 148 | Choice Architecture | Opciones → asignación como misión |

### Resultado
- **14/14 creadas exitosamente** via webhook
- Grupo Reenganche Suave: 6 existentes + 14 nuevas = **20 templates**
- Todas: MARKETING, es_MX, sin variables, activas
- Script de creación eliminado post-ejecución
- Promedio: 163 chars (dentro del sweet spot)
- 14 patrones de integración VP únicos (0 fórmulas repetidas)
- Pendiente: aprobación Meta (pacing gradual ~50 envíos iniciales)

### Decisiones de diseño
- **"Hola 👋/😊" obligatorio** — datos muestran 0% reply sin emoji en saludo
- **VP después de hook/valor, nunca como opener** — regla confirmada por datos
- **"Me asignaron su contacto"** como estrategia central — da legitimidad al mensaje
- **14 técnicas distintas** — evita Zeigarnik (sobreusado) y Reactance (ya en grupo)
- **2 sin VP** (#1 Curiosity Gap, #3 Pattern Interrupt) — técnicas que funcionan mejor sin formalidad
- **CTA "¿Le cuento?"** preferido — top performer histórico (36.36%)
- **NUNCA "¿Le interesa?"** — peor CTA (3.53% promedio)

---

## 3. Memoria Técnica Backend

### Archivo
`.cursor/handovers/2026-03-10-memoria-tecnica-analytics-backend.md`

### Contenido
Documentación completa para ingeniero de backend que quiere automatizar reactivaciones:

1. **Arquitectura 3 capas** — diagrama de relación entre vistas
2. **Tablas base** — whatsapp_templates (23 cols), whatsapp_template_sends (24 cols), template_groups (7 cols)
3. **v_template_analytics** — 28 columnas, fórmula del effectiveness_score desglosada (reply 60pts + speed 20pts + depth 20pts)
4. **v_template_health** — 29 columnas, clasificación de errores Meta (63049/63032/63024/63016/63021), lógica de health_status y trend
5. **v_template_group_health** — 17 columnas, lógica de group_status
6. **get_template_sends_timeline()** — RPC con 5 parámetros, retorna serie temporal
7. **get_template_hourly_heatmap()** — RPC con 3 parámetros, retorna matriz hora×día
8. **Algoritmo de selección inteligente** — query paso a paso: grupo → templates sanos → hora óptima → evitar repetición → rotación
9. **14 group IDs reales** con propósito y flag de exclusión
10. **Guía de errores Meta** y buenas prácticas de automatización

---

## Archivos Modificados/Creados

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/components/campaigns/analitica/TemplateAnalyticsModule.tsx` | EDITADO | Rankings por período, Top 10 más enviadas, español |
| `src/components/campaigns/analitica/TemplateAnalyticsGrid.tsx` | EDITADO | Labels en español |
| `src/components/campaigns/analitica/TemplateDetailPanel.tsx` | EDITADO | Labels en español |
| `.cursor/handovers/2026-03-10-template-analytics-module.md` | CREADO | Handover del módulo analítica |
| `.cursor/handovers/2026-03-10-memoria-tecnica-analytics-backend.md` | CREADO | Memoria técnica para backend |
| `.cursor/handovers/2026-03-10-session-analitica-templates-reenganche.md` | CREADO | Este handover |
| 14 templates en BD (Supabase) | CREADO | Templates Reenganche Suave v2 |
| `scripts/create-reenganche-suave-v2.cjs` | CREADO → ELIMINADO | Script temporal de creación |

---

## Handovers Relacionados

- [Módulo Analítica (arquitectura completa)](.cursor/handovers/2026-03-10-template-analytics-module.md)
- [Memoria Técnica Backend (RPCs y vistas)](.cursor/handovers/2026-03-10-memoria-tecnica-analytics-backend.md)
- [Factory Templates Skill](.claude/skills/factory-templates/SKILL.md)

---

## Estado del Grupo Reenganche Suave Post-Sesión

| Métrica | Antes | Después |
|---------|-------|---------|
| Templates totales | 6 | 20 |
| Técnicas psicológicas | 4 (Zeigarnik x3) | 18 únicas |
| Con VP integrado | 2 (con variables) | 14 (12 sin variables + 2 con) |
| Sin variables (cold) | 4 | 18 |
| Promedio chars | 120 | 150 |
| Pendiente Meta | — | 14 templates en proceso de aprobación |
