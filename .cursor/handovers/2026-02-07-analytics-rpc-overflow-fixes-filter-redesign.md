# HANDOVER-2026-02-07-ANALYTICS-OVERFLOW-FILTERS

**Fecha**: 2026-02-07 | **Version**: v2.5.93+ | **Build**: ok (tsc + vite)

## Contexto

Sesion inaugural Claude Code (migracion desde Cursor). 6 bloques: (1) WhatsApp Analytics 7 queries → 1 RPC, (2) overflow Header/Dashboard, (3) rediseno toolbar filtros Prospectos, (4) botones icon-only en WhatsApp, (5) overflow global layout, (6) Kanban responsive.

## Delta

| Bloque | Descripcion |
|--------|-------------|
| 1 | WhatsApp Analytics: 7 queries frontend → 1 funcion RPC `get_whatsapp_analytics` server-side con SECURITY DEFINER |
| 2 | Header overflow: botones icon-only, flex constraints |
| 3 | Toolbar filtros Prospectos: fila unica glassmorphism, selects con highlight activo, busqueda reducida |
| 4 | LiveChatCanvas: botones CRM (Building2 icon) y RequiereAtencion → icon-only estilo BotPause |
| 5 | MainApp: `min-w-0 overflow-hidden` en contenedor principal → elimina overflow horizontal global |
| 6 | Kanban: columnas colapsadas 48px, expandidas `minWidth: 0`, calc responsive sin desborde |

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/components/MainApp.tsx` | L603: `min-w-0 overflow-hidden` en flex container; L622: `overflow-hidden` en main |
| `src/components/Header.tsx` | Botones icon-only, left `min-w-0 flex-shrink`, title `truncate` |
| `src/components/chat/LiveChatAnalytics.tsx` | 7 queries → 1 RPC `get_whatsapp_analytics`, badge metadata ShieldCheck |
| `src/components/chat/LiveChatCanvas.tsx` | CRM: Search→Building2 icon-only `w-10 h-10 bg-gray-100`; RequiereAtencion: icon-only mismo estilo |
| `src/components/dashboard/OperativeDashboard.tsx` | `overflow-hidden` en grid cells |
| `src/components/prospectos/ProspectosManager.tsx` | Toolbar glassmorphism unificado, selects `min-w-0` (no flex-shrink-0), busqueda `min-w-[120px] max-w-[200px]`, contenedor `overflow-y-auto overflow-x-hidden` |
| `src/components/prospectos/ProspectosKanban.tsx` | Columnas: colapsadas 48px, expandidas minWidth 0, `overflow: hidden`, calc ancho consistente |
| `src/services/permissionsService.ts` | Fail-closed: error → `[]` |
| `src/services/liveMonitorService.ts` | Safety net non-admin sin filtros |

## Migraciones SQL

| Version | Nombre | Efecto |
|---------|--------|--------|
| - | `create_get_alertas_criticas_function` | Funcion RPC alertas dashboard |
| - | `create_whatsapp_analytics_function` | Funcion RPC analytics WhatsApp v1 |
| - | `update_whatsapp_analytics_function_duration_fix` | Fix duracion: last_message_at |
| - | `fix_analytics_role_vendedor_and_plantilla` | Fix rol Asesor→Vendedor + categoria Plantilla |
| - | `fix_analytics_transferidas_and_handoff` | Fix transferidas JOIN llamadas_ventas + handoff |
| - | `fix_sync_metadata_role_name_from_auth_roles` | Fix sync metadata roles |

## Decisiones Tecnicas

- **MainApp overflow-hidden global**: Se agrego `min-w-0 overflow-hidden` al contenedor flex-1 de MainApp (L603) para eliminar overflow horizontal en TODOS los modulos. Alternativa: fix por modulo → rechazada por fragil y repetitiva.
- **Selects sin flex-shrink-0**: Los selects del toolbar usan `min-w-0` en vez de `flex-shrink-0` para permitir compresion. flex-shrink-0 causaba desborde cuando sidebar expandido.
- **Kanban minWidth 0**: Columnas expandidas con `minWidth: '0'` en vez de `'100px'`. El calc CSS `(100% - collapsedPx) / expandedCount` ya garantiza distribucion correcta sin necesidad de minimo.
- **CRM icon Building2**: Reemplazo de Search (lupa) por Building2 — mas representativo de CRM.
- **Botones icon-only patron**: CRM, RequiereAtencion y BotPause usan mismo estilo: `w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200`. Sin borde, sin sombra, sin resplandor.

## Trampas y Gotchas

- `mensajes_whatsapp.rol` = 'Vendedor' (NO 'Asesor'), 'AI' (NO 'Bot'), 'Plantilla' (4ta categoria)
- `llamadas_ventas.call_status` = 'transferida' para JOIN correcto (NO `conversaciones_whatsapp.estado`)
- `conversaciones_whatsapp.fecha_fin` siempre es +24h desde inicio → usar `last_message_at - fecha_inicio` para duracion real
- `overflow-hidden` en toolbar corta dropdowns absolutos → no poner overflow-hidden en contenedores con dropdowns
- `flex-shrink-0` en todos los hijos de un flex container causa desborde si la suma de anchos > contenedor

## Pendiente

1. Deploy a produccion: build limpio, verificar visualmente todos los modulos afectados
2. Plan pendiente en `.claude/plans/`: 6 mejoras WhatsApp + Prospectos (filtro ejecutivo, filtro etiquetas 3 secciones, sorting conversaciones, layout compacto filtros, scrollbar quick replies)

## Estado

- Build: tsc ok, vite ok
- Deploy: pendiente
- Archivos sin commit: MainApp.tsx, ProspectosManager.tsx, ProspectosKanban.tsx, LiveChatCanvas.tsx, Header.tsx, OperativeDashboard.tsx, LiveChatAnalytics.tsx + archivos Claude Code (.claude/, CLAUDE.md, .claudeignore, .mcp.json)
