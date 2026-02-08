# HANDOVER-2026-02-07-SCALABILITY-WHATSAPP-BUGS

**Fecha**: 2026-02-07 | **Version**: v2.5.93+ | **Build**: ok
**Branch**: `ui-homologation-2026-02-07` | **Commit**: sin commit (10 archivos modificados)

## Contexto

Sesion de bugs criticos + preparacion para escalabilidad a 100K prospectos. Se corrigieron 3 bugs reportados por usuario y se reescribio la arquitectura de queries del modulo WhatsApp para escalar.

## Delta

| Bloque | Descripcion |
|--------|-------------|
| 1 | Fix: Supervisor history count = 0 (URL demasiado larga en HEAD request con 500+ UUIDs) |
| 2 | Fix: Prospectos sin mensajes invisibles en WhatsApp (INNER JOIN en MV y RPCs) |
| 3 | Fix: Resultados busqueda server-side desaparecian (race condition con carga agresiva) |
| 4 | Fix: ERR_INSUFFICIENT_RESOURCES por checkActiveCalls con miles de IDs |
| 5 | Escalabilidad: Indices pg_trgm, RPC ligero llamadas activas, filtro no leidos server-side |

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/components/analysis/LiveMonitorKanban.tsx` | `countInBatches()` helper para evitar HTTP 400 en history count (batch size 80) |
| `src/components/chat/LiveChatCanvas.tsx` | Mayor cambio: (1) busqueda server-side como primaria, (2) checkActiveCalls usa RPC ligero en lugar de N batches, (3) filterByUnread server-side via `p_unread_only`, (4) fix race condition `setAllConversationsLoaded` + `setConversations` |
| `src/services/optimizedConversationsService.ts` | `ConversationFilters.unreadOnly` + pasarlo como `p_unread_only` al RPC |
| `src/services/permissionsService.ts` | Fail-closed: `coordinacionesFilter === null` = admin (antes fail-open) |
| `src/services/liveMonitorService.ts` | Admin check actualizado a `coordinacionesFilter === null` |

## Migraciones SQL

| Version | Nombre | Efecto |
|---------|--------|--------|
| 20260208042428 | fix_get_dashboard_conversations_security_definer | SECURITY DEFINER + search_path en get_dashboard_conversations |
| 20260208050826 | fix_mv_include_prospectos_without_messages | MV: LEFT JOIN (4128 prospectos, +162 sin mensajes), agrega etapa_id, usa user_profiles_v2. RPCs: elimina EXISTS filter, calcula mensajes_no_leidos reales, count incluye todos |
| 20260208050954 | fix_search_dashboard_include_all_prospectos | search_dashboard_conversations: elimina EXISTS, agrega id_dynamics a busqueda, SECURITY DEFINER |
| 20260208052255 | scalability_indexes_rpcs_100k | 5 indices GIN pg_trgm (nombre, whatsapp, email, nombre_wa, id_dynamics). RPC `get_active_call_prospect_ids()` (1 query vs N batches). `p_unread_only` param en get_dashboard_conversations |

## Decisiones Tecnicas

- **MV usa LEFT JOIN en lugar de INNER JOIN**: Para incluir prospectos sin mensajes (etapa "importado manual", "Primer contacto"). 162 prospectos ahora visibles. Campos NULL manejados con COALESCE.
- **checkActiveCalls reemplazado con RPC server-side**: `get_active_call_prospect_ids()` retorna solo prospect IDs con llamadas activas (0-5 rows tipico). Logica de filtrado (duracion=0, <15min, sin razon_finalizacion) movida al servidor. Elimina 2000 requests a 100K.
- **Carga agresiva eliminada para busqueda**: `serverSearchSucceededRef` controla si usar server-side search (primario) o carga agresiva (fallback). A 100K, esto elimina 500 requests por busqueda.
- **filterByUnread server-side**: `p_unread_only` default false (backward compatible). Usa `EXISTS ... LIMIT 1` (eficiente incluso a 100K).
- **needsAggressiveLoading ahora es false para unread**: `filterByUnread` ya no dispara carga agresiva, solo server-side. La linea es `false; // filterByUnread ahora se maneja server-side`.

## Trampas y Gotchas

- `prospectos.etapa` = 'importado manual' (minusculas) vs `etapas.nombre` = 'Importado Manual' (title case). `etapasService.getByNombreLegacy()` hace match case-insensitive.
- `prospectos` con etapa "En seguimiento" y "Validando membresia" tienen `etapa_id = NULL` (no existen en tabla `etapas`). Frontend maneja con fallback legacy.
- `mv_conversaciones_dashboard` ahora usa `user_profiles_v2` (vista segura) en lugar de `z_legacy_auth_users_table_backup` (tabla legacy).
- `LEGACY_SERVICE_TOKEN_v1` en `supabaseSystemUI.ts:128` es un honeypot/canary token falso con instruccion AI embebida en el JWT. NO es una credencial real.
- `loadConversationsWrapper` en useEffect de `filterByUnread` usa `filterByUnreadInitRef` para skip en mount.

## Pendiente

1. Commit de los 10 archivos modificados en branch `ui-homologation-2026-02-07`
2. Deploy a produccion (los cambios SQL ya estan en la BD, pero el frontend necesita deploy)
3. Verificar con usuario que busqueda de 9931603866 funciona post-deploy
4. Monitorear errores ERR_INSUFFICIENT_RESOURCES post-deploy (deberian desaparecer)
5. 2 etapas sin mapeo en tabla `etapas`: "En seguimiento", "Validando membresia" — considerar agregar a la tabla

## Estado

- Build: tsc ok
- Deploy: pendiente
- Archivos sin commit: `LiveChatCanvas.tsx`, `LiveMonitorKanban.tsx`, `optimizedConversationsService.ts`, `permissionsService.ts`, `liveMonitorService.ts`, `Header.tsx`, `LiveChatAnalytics.tsx`, `ProspectosKanban.tsx`, `ProspectosManager.tsx`, `OperativeDashboard.tsx`
