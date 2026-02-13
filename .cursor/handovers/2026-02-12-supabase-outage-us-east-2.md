# Handover: Incidente Supabase US-East-2 - Outage Completo

**Fecha:** 2026-02-12 ~21:30 UTC en adelante
**Tipo:** Incidente de infraestructura externa (NO aplica commit)
**Estado:** En curso al momento de este handover

---

## Timeline del Incidente

| Hora (UTC) | Evento |
|------------|--------|
| ~21:30 | Primeros 522 en API logs. Queries empiezan a fallar con connection timeout |
| 21:32 | Supabase publica en status page: "Investigating - We have identified increasing 500 errors in some US regions" |
| ~21:40 | Confirmamos que proyecto PQNC_AI (us-east-2) esta directamente afectado |
| ~21:45 | Dashboard muestra estado RESTARTING brevemente, luego vuelve a ACTIVE_HEALTHY |
| ~21:50 | Creamos MaintenancePage.tsx y la desplegamos a AWS (estatica, MAINTENANCE_MODE=true) |
| ~22:00 | Iteraciones de UI: quitar palma/avion, cambiar a "No estamos de vacaciones", fix dark mode |
| ~22:15 | Deploy silencioso a AWS con pagina de mantenimiento estatica |
| ~22:20 | Se desactiva MAINTENANCE_MODE localmente (false) para desarrollo local mientras AWS muestra mto |
| ~22:30 | Se crea HealthCheckGuard.tsx - auto-deteccion de outage sin hardcodear MAINTENANCE_MODE |
| ~22:40 | Fix 1: pantalla blanca durante initializing (retornaba null, ahora muestra spinner) |
| ~22:50 | Fix 2: health check muy permisivo (status < 500 contaba 401 como healthy). Cambiado a response.ok + JSON valido |
| ~23:00 | Deploy a AWS con HealthCheckGuard (reemplaza pagina estatica) |
| ~23:05 | Deploy a AWS con tips de ventas WhatsApp (25 tips reemplazan fun facts) |
| 23:XX | BD sigue en timeout. Postgres internamente corre (pg_cron, REFRESH MV) pero API→DB roto |

## Diagnostico Tecnico

### Confirmacion: Problema 100% de Supabase

- **Proyecto:** glsmifhkoaifvaegsozd (PQNC_AI)
- **Region:** us-east-2 (directamente afectada por el incidente)
- **Estado dashboard:** ACTIVE_HEALTHY (contradice la realidad)
- **SQL via MCP:** `Connection terminated due to connection timeout`

### Logs Postgres
- pg_cron ejecuta normalmente (REFRESH MATERIALIZED VIEW cada minuto, cleanup active_sessions)
- Importaciones de prospectos se procesaron bien antes del corte
- `terminating walsender process due to replication timeout` - replicacion rota
- Las conexiones locales (::1) funcionan, el problema es routing externo

### Logs API
- 100% de GETs/POSTs a REST devuelven **522** (Connection Timed Out)
- OPTIONS (CORS preflight) devuelven **200** (no tocan BD)
- WebSocket (Realtime) devuelve **101** intermitentemente
- Afecta TODOS los endpoints: auth, rest, rpc, storage

### Usuarios Afectados
- 4+ IPs distintas intentando acceder durante el outage
- Todos reciben 522 en cada request
- AWS muestra MaintenancePage (primero estatica, luego con HealthCheckGuard)

## Que NO fue la causa

- **Importaciones masivas:** Descartado. Solo 5 INSERTs por usuario/minuto, PostgreSQL Pro maneja miles/seg
- **Codigo del frontend:** Descartado. El problema es a nivel infraestructura de Supabase
- **Edge Functions:** Descartado. El timeout es en la capa PostgREST → PostgreSQL

## Componentes Creados (parte del deploy pendiente)

### MaintenancePage.tsx (NUEVO)
- Fullscreen overlay z-index 99999
- Fuerza dark mode independiente del tema
- 25 tips de ventas por WhatsApp rotando cada 6s
- Estrellas animadas de fondo

### HealthCheckGuard.tsx (NUEVO)
- Wrapper que envuelve toda la app en App.tsx
- Health check contra `system_config_public?select=config_key&limit=1`
- Requiere `response.ok` + JSON array con datos reales
- 2 checks silenciosos al inicio (2s gap) para evitar falsos positivos
- Si ambos fallan: muestra MaintenancePage + widget corner con polling 60s
- Cuando pasa: carga app normal automaticamente
- Se detiene al cargar la app (no sigue haciendo polling en uso normal)

### App.tsx (MODIFICADO)
- MAINTENANCE_MODE flag (override manual, actualmente false)
- HealthCheckGuard envuelve AuthProvider + MainApp

## Deploys AWS Realizados (sin commit)

1. **Deploy 1:** MaintenancePage estatica (MAINTENANCE_MODE=true)
2. **Deploy 2:** Fix dark mode en MaintenancePage
3. **Deploy 3:** HealthCheckGuard (auto-deteccion, reemplaza pagina estatica)
4. **Deploy 4:** Tips de ventas WhatsApp (25 tips)

Todos via `npm run build` + `aws s3 sync` + `aws cloudfront create-invalidation`. Sin git commit.

## Acciones Post-Incidente

Cuando Supabase se recupere:
1. El HealthCheckGuard detectara automaticamente y cargara la app - usuarios no necesitan refrescar
2. Verificar que BD no perdio datos (pg_cron seguia ejecutando internamente)
3. Commit + deploy formal con versionado (incluye HealthCheckGuard como feature permanente)
4. Considerar si vale la pena migrar de region (conclusion: no, el guard protege contra cualquier outage futuro)
