# HANDOVER-2026-02-08-TRANSFER-CASCADA

**Fecha**: 2026-02-08 | **Versión**: N/A (cambio backend/N8N) | **Build**: N/A

## Contexto

Workflow `VAPI-Natalia_transfer_tool [PROD]` transferia llamadas ciegamente al ejecutivo asignado sin validar conexion ni DID. Si el ejecutivo no estaba conectado o no tenia DID, la llamada se perdia.

## Delta

| Bloque | Descripcion |
|--------|-------------|
| 1 | Funcion Postgres `get_best_transfer_target(UUID, UUID)` con cascada de 4 niveles |
| 2 | Nodo `Busqueda_did` cambiado de `SELECT auth.users` a `executeQuery` con funcion |
| 3 | Nodo `Retorna DID` cambiado de `SELECT public.auth_users` a `executeQuery` con funcion |
| 4 | Nodos `Ejecuta_transfer` y `Ejecuta_transfer2` usan `target_phone` en vez de `raw_user_meta_data.phone` / `phone` |

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| BD: `get_best_transfer_target()` | Nueva funcion SECURITY DEFINER en public schema |
| N8N: `qpk8xsMI50IWltFV` nodo `Busqueda_did` | `operation: select` auth.users -> `operation: executeQuery` con funcion |
| N8N: `qpk8xsMI50IWltFV` nodo `Retorna DID` | `operation: select` public.auth_users -> `operation: executeQuery` con funcion |
| N8N: `qpk8xsMI50IWltFV` nodo `Ejecuta_transfer` | jsonBody: `raw_user_meta_data.phone` -> `target_phone` |
| N8N: `qpk8xsMI50IWltFV` nodo `Ejecuta_transfer2` | jsonBody: `phone` -> `target_phone` |

## Migraciones SQL

| Version | Nombre | Efecto |
|---------|--------|--------|
| (via MCP) | create_get_best_transfer_target | Funcion con cascada: ejecutivo_asignado -> companero_conectado -> login_mas_reciente -> fallback +1528002233444 |

## Decisiones Tecnicas

- **SECURITY DEFINER en funcion**: Necesario porque N8N conecta con credentials limitados y la funcion consulta `user_profiles_v2` (vista). Alternativa: dar permisos directos a los roles de N8N — descartada por principio de minimo privilegio.
- **Cascada en SQL vs Code node N8N**: SQL es atomico, mas rapido, y evita multiples round-trips. Alternativa: Code node con multiples queries — descartada por latencia en llamadas en vivo.
- **Prioridad paso 2**: ejecutivo > supervisor > coordinador. Razon: minimizar impacto operativo, los ejecutivos son pares del original.
- **DID = `user_profiles_v2.phone`**: No existe columna DID dedicada. El campo `phone` (espejo de `auth.users.raw_user_meta_data->>'phone'`) es el DID. Solo 16/58 usuarios activos (ejecutivo/supervisor/coordinador) tienen DID.

## Trampas y Gotchas

- `user_profiles_v2.phone` puede ser `''` (string vacio) ademas de NULL — la funcion valida ambos
- `Busqueda_ejecutivo` devuelve `prospectos.*` (incluye `ejecutivo_id` + `coordinacion_id`) — ambos campos necesarios para la funcion
- `Retorna detalles prospecto` tambien devuelve `prospectos.*` — mismos campos disponibles
- El workflow tiene 2 caminos de transferencia (AI decide vs solicitud explicita) — ambos fueron actualizados
- `auth_users` (public) NO es lo mismo que `auth.users` — el nodo `Retorna DID` usaba la tabla publica legacy

## Estado

- Build: N/A (cambio backend)
- Deploy: completado (N8N workflow actualizado 2026-02-09T00:35:31Z)
- Backup: `backups/VAPI-Natalia_transfer_tool_BACKUP_20260208_183418.json`
- Funcion BD: activa, probada con 5 escenarios (ejecutivo_asignado, companero_conectado, login_mas_reciente, sin_did_en_coordinacion, fallback)

## Cascada de Transferencia (referencia)

```
get_best_transfer_target(p_ejecutivo_id, p_coordinacion_id) -> (target_phone, target_name, target_id, target_role, target_reason)

1. ejecutivo_asignado:    WHERE id = ejecutivo_id AND is_operativo = true AND phone != ''
2. companero_conectado:   WHERE coordinacion_id = X AND is_operativo = true AND phone != '' ORDER BY role_priority, last_login DESC
3. login_mas_reciente:    WHERE coordinacion_id = X AND phone != '' ORDER BY last_login DESC
4. sin_did_en_coordinacion: fallback '+1528002233444'
```
