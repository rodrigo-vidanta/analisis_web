# HANDOVER-2026-02-08-AUTH-TIMEZONE-FIX

**Fecha**: 2026-02-08 | **Version**: v2.5.93+ | **Build**: ok (tsc + vite)

## Contexto

Cinco bloques: (1) Fix errores 401 Unauthorized por race condition auth + concurrencia refresh token, (2) Correccion timezone UTC-6 en modulo llamadas programadas, (3) Fix critico permisos: ejecutivos podian ver prospectos de toda su coordinacion en WhatsApp search/listing por logica OR en RPCs, (4) Fix import duplicados: deteccion de prospectos existentes fallaba por RLS + formato telefono, (5) Limpieza console.logs debug en produccion.

## Delta

| Bloque | Descripcion |
|--------|-------------|
| 1 | authAwareFetch: boolean `_isRefreshing` → shared promise `_refreshPromise`. Todos los 401 concurrentes esperan el mismo refresh y reintentan. |
| 2 | LiveChatCanvas: auth guard antes de `initializeChat()` — espera session antes de queries. |
| 3 | ManualCallModal: timestamp submit con `-06:00` explicito, extraccion fecha/hora existente con `timeZone: 'America/Mexico_City'`, funciones auxiliares con TZ Mexico. |
| 4 | DailyView: agrupacion por hora usa `getTime() - 6h` + `getUTCHours()` en vez de `getHours()` del browser. |
| 5 | WeeklyView, LlamadasProgramadasWidget, ScheduledCallsSection: `timeZone: 'America/Mexico_City'` en formateo de hora/fecha. |
| 6 | RPCs `search_dashboard_conversations` y `get_dashboard_conversations` (2 overloads): logica OR → AND condicional. `p_ejecutivo_ids` tiene prioridad; `p_coordinacion_ids` solo aplica cuando `p_ejecutivo_ids IS NULL` (coordinadores/supervisores). |
| 7 | Import duplicados: nueva RPC `check_prospect_exists_by_phone` (SECURITY DEFINER) + QuickImportModal y ImportWizardModal usan RPC en vez de queries directas a `prospectos`. Normaliza ultimos 10 digitos, bypasea RLS. |
| 8 | Limpieza console.logs: eliminados `[LiveActivityStore] Filtrado por coordinaciones` y 3 bloques `[prospectRestrictions] Verificando por etapa_id` que aparecian en consola de produccion. |

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/config/supabaseSystemUI.ts` | `_isRefreshing` boolean → `_refreshPromise` shared promise. Todas las peticiones 401 esperan un unico refresh y reintentan con nuevo token. `setTimeout 500ms` para limpiar promesa. |
| `src/components/chat/LiveChatCanvas.tsx` | Auth guard en useEffect: `getSession()` antes de cargar datos. Si no hay session, subscribe a `onAuthStateChange` y espera. |
| `src/components/shared/ManualCallModal.tsx` | L184: default date usa `toLocaleDateString('en-CA', {timeZone: 'America/Mexico_City'})`. L236-237: fecha/hora existente extraidas con TZ Mexico (`en-CA` + `en-GB`). L397: `new Date(\`\${date}T\${time}:00-06:00\`).toISOString()`. L497/503: getMinDate/getMaxDate con TZ Mexico. L509/521: `new Date(date + 'T12:00:00')` evita dia incorrecto por UTC midnight. |
| `src/components/scheduled-calls/views/DailyView.tsx` | L80-83: `callDate.getHours()` → `getTime() - 6h` + `getUTCHours()` para agrupar llamadas en hora Mexico. |
| `src/components/scheduled-calls/views/WeeklyView.tsx` | L159: `timeZone: 'America/Mexico_City'` en `formatTime`. |
| `src/components/dashboard/widgets/LlamadasProgramadasWidget.tsx` | L210: `timeZone: 'America/Mexico_City'` en `formatTime`. |
| `src/components/shared/ScheduledCallsSection.tsx` | L140: `timeZone: 'America/Mexico_City'` en `toLocaleDateString`. |
| `src/components/chat/QuickImportModal.tsx` | `searchLocalProspect`: `.eq('whatsapp', phone)` → RPC `check_prospect_exists_by_phone`. Fix doble: formato telefono (10 vs 13 digitos) + RLS bypass. |
| `src/components/chat/ImportWizardModal.tsx` | `searchLocalProspect`: `.or('whatsapp.like.%phone')` → RPC `check_prospect_exists_by_phone`. Fix RLS bypass + simplifica 5 queries a 1 RPC. |
| `src/stores/liveActivityStore.ts` | L380: eliminado `console.log('[LiveActivityStore] Filtrado por coordinaciones')`. |
| `src/utils/prospectRestrictions.ts` | Eliminados 3 bloques `console.log` de verificacion de etapas. Mantenido `console.warn` para errores reales. |

## Migraciones SQL

| Version | Nombre | Efecto |
|---------|--------|--------|
| - | `fix_rpc_permissions_ejecutivo_or_to_and` | Fix 3 RPCs: OR → AND condicional en filtro permisos. Ejecutivos solo ven prospectos asignados, no toda la coordinacion. |
| - | `create_check_prospect_exists_by_phone_rpc` | Nueva RPC SECURITY DEFINER: busca prospecto por telefono (ultimos 10 digitos) sin RLS. Retorna prospecto + ejecutivo + coordinacion + conversacion. |

## Decisiones Tecnicas

- **Shared promise vs boolean refresh**: El boolean `_isRefreshing` solo reintentaba la primera peticion 401; las demas retornaban el 401 original. Con `_refreshPromise`, TODAS esperan el mismo refresh. Alternativa: queue de peticiones → rechazada por complejidad innecesaria.
- **UTC-6 hardcodeado en ManualCallModal**: Mexico abolio DST en 2022. `America/Mexico_City` = UTC-6 permanente para Guadalajara/PV. Se usa `-06:00` en el ISO string del submit para ser explicito.
- **`en-CA` locale para YYYY-MM-DD**: Formato ISO consistente para `<input type="date">`. `en-GB` con `hour12: false` para HH:MM en `<input type="time">`.
- **`T12:00:00` trick**: `new Date("2026-02-08")` se interpreta como UTC midnight → en UTC-6 es Feb 7 18:00 → `getDay()` devuelve dia anterior. Agregar `T12:00:00` lo fuerza a mediodia local → dia correcto.
- **RPC permisos OR → AND condicional**: Logica anterior `(ejecutivo_ids match) OR (coordinacion_ids match)` permitia que ejecutivos vieran prospectos de otros ejecutivos de su misma coordinacion. Fix: `p_ejecutivo_ids IS NOT NULL` tiene prioridad absoluta; `p_coordinacion_ids` solo se evalua cuando `p_ejecutivo_ids IS NULL` (rol coordinador/supervisor). Alternativa: fix en frontend (no pasar coordinacion_ids para ejecutivos) → rechazada porque seguridad debe estar en la capa de datos.
- **RPC SECURITY DEFINER para import duplicados**: La deteccion de duplicados DEBE ignorar permisos — un ejecutivo debe saber si un prospecto ya existe aunque no sea suyo, para evitar importacion duplicada. El RPC solo devuelve datos basicos (nombre, ejecutivo, coordinacion) — no expone datos sensibles. Alternativa: query directa sin RLS → no viable con `anon_key`.

## Trampas y Gotchas

- `llamadas_programadas.fecha_programada` = `timestamptz` (con TZ) — Supabase devuelve ISO con `+00`
- `llamadas_ventas.ended_at` y `last_event_at` = `timestamp without time zone` — NO tienen info de TZ, se interpretan como UTC
- `new Date("YYYY-MM-DD")` sin hora = UTC midnight → en UTC-6 retrocede al dia anterior para `getDay()`, `getDate()`, etc.
- `toLocaleTimeString('es-MX')` SIN `timeZone` usa TZ del browser — funciona si browser esta en CST, falla en cualquier otro TZ
- `toISOString().split('T')[0]` da fecha UTC, no local — cerca de medianoche puede dar dia incorrecto
- `prospectos.whatsapp` almacena con prefijo pais (ej: `5213333243333`) — `.eq('whatsapp', '3333243333')` nunca matchea. Siempre normalizar a ultimos 10 digitos para comparar.

## Pendiente

1. ~250 instancias de `toLocaleString`/`toLocaleDateString`/`toLocaleTimeString` en otros modulos sin `timeZone` explicito — funcionan mientras todos los usuarios esten en Mexico, pero son fragiles
2. `llamadas_ventas.ended_at` y `last_event_at` deberian migrarse a `timestamptz` para consistencia
3. `LlamadasProgramadasWidget` L50-76: filtrado de "llamadas del dia" usa `toISOString().split('T')[0]` que da fecha UTC — podria perder llamadas cerca de medianoche
4. Auditar otros RPCs/queries que usen logica OR similar de permisos
5. Deploy pendiente

## Estado

- Build: tsc ok, vite ok
- Deploy: pendiente
- Migraciones BD: `fix_rpc_permissions_ejecutivo_or_to_and` (3 RPCs) + `create_check_prospect_exists_by_phone_rpc` (1 RPC nuevo)
- Archivos sin commit: supabaseSystemUI.ts, LiveChatCanvas.tsx, ManualCallModal.tsx, DailyView.tsx, WeeklyView.tsx, LlamadasProgramadasWidget.tsx, ScheduledCallsSection.tsx, QuickImportModal.tsx, ImportWizardModal.tsx, liveActivityStore.ts, prospectRestrictions.ts + cambios previos de HANDOVER-2026-02-07-ANALYTICS-OVERFLOW-FILTERS
