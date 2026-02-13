# Handover: Deploy Pendiente - Auth Fix + Audio Error Handling + HealthCheckGuard

**Fecha:** 2026-02-12
**Tipo:** Deploy pendiente (commit + deploy cuando Supabase se recupere)
**Estado:** Codigo listo, build exitoso, ya desplegado a AWS sin commit

---

## Resumen de Cambios

3 mejoras independientes agrupadas en un deploy:

1. **Auth token refresh** en dynamicsLeadService (fix)
2. **Audio error handling** en 5 componentes de reproduccion (fix)
3. **HealthCheckGuard + MaintenancePage** auto-deteccion de outages (feat)

---

## 1. Auth Token Refresh - dynamicsLeadService.ts

**Handover detallado:** `2026-02-12-auth-token-refresh-edge-functions.md`

Este archivo fue el ultimo pendiente de la migracion auth (los otros 9 ya se deployaron en v2.14.0/v2.14.1).

### Cambio:
```typescript
// ANTES
import { supabaseSystemUI } from '../config/supabaseSystemUI';
const { data: { session } } = await supabaseSystemUI!.auth.getSession();
// Token stale, sin refresh, sin force logout en 401

// DESPUES
import { getValidAccessToken, triggerSessionExpired } from '../utils/authenticatedFetch';
const accessToken = await getValidAccessToken();
// Refresh proactivo si <60s, triggerSessionExpired en 401
```

### Archivo:
- `src/services/dynamicsLeadService.ts` - 17 lineas cambiadas

---

## 2. Audio Error Handling - 5 Componentes

**Handover detallado:** `2026-02-12-audio-error-handling-vapi-storage.md`

### Problema:
Reproductor de audio quedaba en estado "cargando" o silencioso cuando `storage.vapi.ai` fallaba (firewall corporativo).

### Solucion:
Estado `audioError` + UI de error con boton "Reintentar" en todos los reproductores.

### Archivos:
| Archivo | Cambio |
|---------|--------|
| `src/components/analysis/AnalysisIAComplete.tsx` | `audioError` en AudioPlayerInline + `audioErrorId` en tabla |
| `src/components/analysis/LiveMonitor.tsx` | `audioError` en FinishedCallModal |
| `src/components/analysis/LiveMonitorKanban.tsx` | `recordingError` (evitar conflicto con audioError existente) |
| `src/components/chat/CallDetailModal.tsx` | `audioError` + ternario error/audio nativo |
| `src/components/chat/CallDetailModalSidebar.tsx` | `audioError` + reset en cleanup + `onError` en audio element |

---

## 3. HealthCheckGuard + MaintenancePage (NUEVO)

### Problema:
Cuando Supabase cae, los usuarios ven errores cripticos o pantalla blanca. No hay forma de comunicar el estado.

### Solucion:
Auto-deteccion de outage con pagina de mantenimiento y recuperacion automatica.

### Archivos nuevos:
| Archivo | Descripcion |
|---------|-------------|
| `src/components/HealthCheckGuard.tsx` | Wrapper que verifica BD antes de renderizar app |
| `src/components/MaintenancePage.tsx` | Pagina fullscreen con tips de ventas WhatsApp |

### Archivo modificado:
| Archivo | Cambio |
|---------|--------|
| `src/App.tsx` | MAINTENANCE_MODE flag + HealthCheckGuard envuelve AuthProvider |

### Flujo:
```
Carga pagina
  → HealthCheckGuard: spinner "Conectando..." (silencioso)
    → Check 1: GET system_config_public (8s timeout)
      → OK? → Cargar app normal
      → Fallo? → Esperar 2s → Check 2
        → OK? → Cargar app normal
        → Fallo? → MaintenancePage + widget health check (polling 60s)
          → Cuando pase → Cargar app automaticamente
```

### Health check endpoint:
```
GET /rest/v1/system_config_public?select=config_key&limit=1
Headers: apikey: SUPABASE_ANON_KEY
Requiere: response.ok (200-299) + Array.isArray(data) && data.length > 0
```

---

## Inventario Completo de Archivos para Commit

### Modificados (7):
1. `src/App.tsx` - HealthCheckGuard wrapper + MAINTENANCE_MODE
2. `src/services/dynamicsLeadService.ts` - Auth token refresh
3. `src/components/analysis/AnalysisIAComplete.tsx` - Audio error handling
4. `src/components/analysis/LiveMonitor.tsx` - Audio error handling
5. `src/components/analysis/LiveMonitorKanban.tsx` - Audio error handling
6. `src/components/chat/CallDetailModal.tsx` - Audio error handling
7. `src/components/chat/CallDetailModalSidebar.tsx` - Audio error handling

### Nuevos (2):
8. `src/components/HealthCheckGuard.tsx` - Health check guard
9. `src/components/MaintenancePage.tsx` - Pagina de mantenimiento

### NO incluir en commit (docs/tools):
- `.claude/agents/aws-agent.md` - actualizacion docs interna
- `.claude/skills/aws/SKILL.md` - actualizacion skill interna
- `docs/AWS_FRONTEND_IP_RESTRICTION.md` - documentacion WAF
- `.cursor/handovers/*` - handovers

---

## Conventional Commits Sugeridos

```
fix(auth): migrate dynamicsLeadService to proactive token refresh

feat(maintenance): add HealthCheckGuard + MaintenancePage for auto outage detection

fix(audio): add error handling and retry UI to all audio players
```

O consolidado:
```
feat(platform): add health check guard, auth token fix, audio error handling
```

## Build

- TypeScript: sin errores
- Vite build: exitoso (~17s)
- Ya desplegado a AWS (4 deploys silenciosos durante outage)
