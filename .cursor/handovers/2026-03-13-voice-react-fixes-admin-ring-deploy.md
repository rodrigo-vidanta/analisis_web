# Handover: Voice React Fixes, Admin Ring, WhatsApp Invalido & Deploy v2.32.3

**Fecha:** 2026-03-13
**Version:** B10.3.0N2.32.3
**Sesion:** Fixes criticos de produccion + mejoras voice transfer + deploy

---

## Resumen

Sesion enfocada en resolver errores de produccion que afectaban a ejecutivos al recibir llamadas transferidas, agregar admin como target simultaneo en transferencias WhatsApp, mejorar el prompt LOBBY para transferencias mas eficientes, y agregar soporte para `whatsapp_invalido` en el frontend.

---

## Cambios Realizados

### 1. Fix React Error #321 — Invalid Hook Call

**Archivo:** `src/services/twilioVoiceService.ts`
**Problema:** `notification.onclick` llamaba `acceptIncomingCall()` que ejecuta `setState()` desde el callback de la Browser Notification API (fuera del event system de React).
**Solucion:** Envolver en `setTimeout(() => this.acceptIncomingCall(), 0)` para diferir al siguiente tick del event loop.

### 2. Fix React Error #185 — Maximum Update Depth

**Archivos:** `src/stores/liveActivityStore.ts`, `src/components/live-activity/LiveCallActivityWidget.tsx`
**Problema:** `minimizeCall()` creaba una nueva referencia de `Set` cada segundo (auto-minimize interval). `minimizedCallIds` estaba en el dependency array del Effect 1, causando re-renders infinitos.
**Solucion (2 partes):**
- **liveActivityStore.ts:** Early return guard — si `callId` ya esta en el Set, no crear nueva referencia
- **LiveCallActivityWidget.tsx:** Remover `minimizedCallIds` y `showSoftphone` del dependency array del Effect 1. Mover `audioOutputService.playOnAllDevices()` dentro del guard `if (!showSoftphone)` para que solo suene una vez

### 3. Admin Simultaneous Ring — WhatsApp Transfers (N8N)

**Workflow:** `qpk8xsMI50IWltFV` (VAPI-Natalia_transfer_tool)
**Problema:** Las transferencias WhatsApp no sonaban al admin, solo al ejecutivo asignado.
**Solucion:** Agregar nodo "Get Admins Online" (Postgres) + "Merge Admin + VAPI" (modo append) antes del "Prepare Browser Transfer" code node. El Merge espera ambos inputs (VAPI data + admin list) antes de ejecutar el Code.
**Aprendizaje clave:**
- `.item.json` usa paired item resolution — se rompe con multiples inputs
- `.first().json` no usa paired items — funciona con Merge
- Dos nodos conectados al mismo input index (0) NO garantiza que ambos completen antes de ejecutar. Se necesita Merge node con inputs separados (0 y 1)
- Merge mode "combine/multiplex" requiere match fields. Mode "append" simplemente espera ambos y concatena

### 4. LOBBY Transfer Prompt Update (N8N)

**Nodo:** "Sanitizar y estructurar body-prompt" en workflow `qpk8xsMI50IWltFV`
**Cambios:**
- Agregado `solicitudExplicita` que escanea la conversacion buscando frases como "pasame con alguien", "quiero hablar con una persona", etc.
- Prompt modificado: solicitud explicita = transferir inmediatamente, senales positivas = transferir, solo rechazar en negativa explicita
- Regla: "EN CASO DE DUDA → transferir = true"

### 5. RLS Policies — voice_transfers

**Tabla:** `voice_transfers`
**Problema:** Solo existia SELECT policy. Sin UPDATE/INSERT, los registros se quedaban stuck en "ringing".
**Solucion:**
```sql
CREATE POLICY "Users can update own transfers" ON voice_transfers FOR UPDATE TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid())
  WITH CHECK (from_user_id = auth.uid() OR to_user_id = auth.uid());
CREATE POLICY "Users can insert transfers" ON voice_transfers FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid());
```

### 6. Soporte whatsapp_invalido — Frontend

**Archivos:** `src/components/chat/LiveChatCanvas.tsx`, `src/services/optimizedConversationsService.ts`
**Cambios:**
- Agregado `whatsapp_invalido` al tipo de cache de prospectos
- Auto-desbloqueo: si prospecto envia mensaje, se limpia `bloqueado_whatsapp` Y `whatsapp_invalido`
- Query SELECT incluye `whatsapp_invalido`
- Cache Realtime actualiza campo `whatsapp_invalido` en tiempo real
- `DashboardConversation` interface incluye `whatsapp_invalido`

### 7. Railway Build Fix — nixpacks.json

**Archivo:** `nixpacks.json`
**Problema:** `npm ci` fallaba en Railway (npm 10) por `source-map@0.6.1` faltante en lock file generado por npm 11 local.
**Solucion:** Cambiar `npm ci` a `npm install` para tolerancia cross-version.

### 8. Comunicado — Navegador Abierto para Llamadas

**ID:** `a097f550-0225-4f8a-8299-dab4dff6a38c`
**Tipo:** tutorial (simple, no interactivo)
**Audiencia:** todos
**Contenido:** 7 bullets didacticos sobre mantener browser abierto, notificaciones, audio, timeout 25s, cascada automatica, no cerrar/suspender, avisar supervisor.

---

## Deploy v2.32.3

- **Commit:** `c21dadc`
- **AWS:** 35s (S3 + CloudFront invalidation)
- **BD:** Actualizada con `force_update: true` y release notes completas
- **Archivos deployados:**
  - `src/services/twilioVoiceService.ts`
  - `src/stores/liveActivityStore.ts`
  - `src/components/live-activity/LiveCallActivityWidget.tsx`
  - `src/components/chat/LiveChatCanvas.tsx`
  - `src/services/optimizedConversationsService.ts`
  - `package-lock.json`

---

## Pendiente

| Item | Prioridad | Notas |
|------|-----------|-------|
| WhatsApp cascade/fallback | Media | TwiML cascade con action URL como PSTN bridge. Usuario dijo "haremos eso" |
| voice_transfers records stuck "ringing" | Baja | RLS fix aplicado, records existentes necesitan update manual |
| llamadas_ventas tipo WhatsApp | Baja | No distingue llamadas originadas por WhatsApp (todas logueadas como 'pstn') |
| Bridge transfer plan completo | En plan | Plan en `.claude/plans/wild-kindling-puzzle.md` — Fase 1 (BD) y parcial Fase 4 (N8N) completadas |

---

## Lecciones Aprendidas

1. **N8N paired items**: Siempre usar `.first().json` o `.all()` cuando hay Merge node upstream. `.item.json` se rompe con multiples inputs.
2. **N8N Merge modes**: "append" para esperar sin match fields, "combine" requiere match fields.
3. **React setState fuera de event system**: Browser APIs (Notification, setTimeout, etc.) pueden ejecutar setState fuera de React. Siempre usar `setTimeout(() => ..., 0)` para diferir.
4. **Zustand + Sets**: Crear nuevo Set en cada update causa re-renders si el Set esta en dependency arrays. Agregar early return guards.
5. **npm ci vs npm install**: `npm ci` es strict sobre formato de lock file. Si local y CI usan npm versions diferentes, usar `npm install`.
