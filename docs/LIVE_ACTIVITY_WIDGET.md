# Live Activity Widget - Monitoreo de Llamadas en Tiempo Real

**Fecha:** 2026-03-11 | **Version:** 2.0.0

---

## Resumen

Widget flotante en el borde derecho de la pantalla que muestra llamadas VAPI activas en tiempo real. Proporciona cards colapsables, panel expandido con transcripcion en vivo, monitoreo de audio via WebSocket, transferencia de llamadas VAPI, y **Twilio Voice SDK softphone** para recibir y transferir llamadas VoIP entre miembros del equipo. 100% event-driven (0 polling).

---

## Arquitectura

```
live_monitor_view (PostgreSQL)
  |
  v  Query inicial
liveActivityStore.loadActiveCalls()
  |
  v  Realtime (INSERT/UPDATE via RealtimeHub)
liveActivityStore.updateCall() / addCall()
  |
  v
LiveCallActivityWidget (React Portal, z-50)
  |-- CallCard (collapsed, 320px)
  |-- MinimizedCallTab (vertical, 48px)
  |-- ExpandedCallPanel (55vw, 2 columnas)
  |-- TransferModal (z-200, compartido con analysis)
  |-- VoiceSoftphoneModal (draggable, z-90, Twilio Voice SDK)
  |-- VoiceTransferModal (z-95, team transfer)
```

---

## Componentes

### LiveCallActivityWidget (`src/components/live-activity/LiveCallActivityWidget.tsx`, 573 lineas)

Orquestador principal. Renderiza via React Portal en `document.body`.

**Features:**
- Auto-minimize despues de 10s (a menos que se abra manualmente)
- Monitoreo de audio via WebSocket + Web Audio API
- Audio estereo: Humano (izquierda, gain 5.0), IA (derecha, gain 0.5)
- Sample rate: 16kHz, latency hint: interactive
- Permisos: requiere `canAccessLiveMonitor()`

**Montaje:** MainApp.tsx lineas 585, 606, 664 (3 branches de layout)

### CallCard (`src/components/live-activity/CallCard.tsx`, 334 lineas)

Card colapsada mostrando resumen de llamada.

| Elemento | Descripcion |
|----------|-------------|
| Duracion | Contador en vivo (actualiza cada 1s) |
| Checkpoint | Badges CP1-CP5 con colores (blue, purple, green, orange, red) |
| Ejecutivo | Badge si hay asignado |
| Boton Listen | 3 estados: "Marcando..." (amber), "Escuchar" (emerald), "Escuchando..." (red pulsante) |
| Indicador | Punto verde pulsante (llamada activa) |

### MinimizedCallTab (`src/components/live-activity/MinimizedCallTab.tsx`, 148 lineas)

Tab vertical ultra-compacto (48px ancho, 180px alto). Muestra iniciales, duracion vertical, tooltip con nombre completo. Expande a 56px en hover.

### ExpandedCallPanel (`src/components/live-activity/ExpandedCallPanel.tsx`, 371 lineas)

Panel completo con 2 columnas:

**Columna izquierda (1/3):** Info del prospecto + datos discovery
- Destino preferido, composicion familiar, noches, mes, propuesta economica, resort, habitacion

**Columna derecha (2/3):** Transcripcion en vivo
- Auto-scroll (desactiva con scroll manual)
- Color-coded: IA (blue bg, izquierda), Cliente (green bg, derecha)
- Timestamps por mensaje

**Footer:** Botones Listen/Stop + Transfer + indicador de audio

---

## Store Zustand

### `liveActivityStore` (`src/stores/liveActivityStore.ts`, 739 lineas)

**Estado:**

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| widgetCalls | WidgetCallData[] | Llamadas activas visibles |
| expandedCallId | string \| null | ID de llamada expandida |
| minimizedCallIds | Set\<string\> | IDs minimizados |
| permanentOpenCallIds | Set\<string\> | IDs abiertos manualmente (no auto-minimize) |
| isWidgetEnabled | boolean | Habilitado por usuario |
| liveTranscriptions | Record\<string, TranscriptEntry[]\> | Transcripciones por llamada |
| notifiedCallIds | Set\<string\> | IDs ya notificados (sin sonido duplicado) |
| reportedZombieIds | Set\<string\> | IDs zombie ya reportados |

**Metodos principales (19):**

| Metodo | Descripcion |
|--------|-------------|
| `initialize(userId, roleName)` | Suscripcion Realtime via RealtimeHub |
| `cleanup()` | Desuscribir y limpiar estado |
| `loadActiveCalls()` | Fetch con filtro de permisos + deteccion zombies |
| `updateCall(callId, updates)` | Update incremental (0 queries) |
| `addCall(call)` | Nueva llamada + sonido notificacion |
| `removeCall(callId)` | Remover con grace period 5s |
| `expandCall(callId)` | Abrir panel completo |
| `minimizeCall(callId)` | Convertir a tab vertical |
| `restoreCall(callId)` | Restaurar + marcar como permanente |

### Realtime (via RealtimeHub)

```typescript
realtimeHub.subscribe('llamadas_ventas', '*', (payload) => {
  // INSERT/UPDATE -> parse JSON fields -> updateCall (existente) o debouncedLoadActiveCalls (nuevo)
  // call_status != 'activa' -> setTimeout 5s -> removeCall (grace period)
});
```

Campos JSON parseados de Realtime (llegan como strings):
- `datos_proceso`, `datos_llamada`, `conversacion_completa`

### Deteccion de Zombies

```
ZOMBIE_THRESHOLD = 10 min sin update
GRACE_PERIOD = 10 min para llamadas nuevas
Si timeSinceCreation < 10min -> permitir (nueva)
Si timeSinceUpdate > 10min -> remover (zombie)
```

---

## Permisos (3 niveles)

| Nivel | Roles | Filtro |
|-------|-------|--------|
| Full Access | admin, admin_operativo, coordinador_calidad | Todas las llamadas |
| Ejecutivo | ejecutivo | Solo prospectos propios + backup |
| Coordinacion | coordinador, supervisor | Prospectos de coordinaciones asignadas |

Validacion final por llamada: `permissionsService.canUserAccessProspect(userId, prospectoId)`

---

## Integracion VAPI

### Datos de llamada

| Campo | Origen | Uso |
|-------|--------|-----|
| `monitor_url` | VAPI | WebSocket para audio en vivo |
| `control_url` | VAPI | REST para transferir/colgar |
| `call_sid` | Twilio | ID unico de llamada |
| `datos_proceso` | VAPI/N8N | Checkpoints, variables discovery |
| `conversacion_completa` | VAPI | Array de transcripciones |

### Flujo de Audio

```
1. Click "Escuchar" -> startAudioMonitoring(monitor_url)
2. Crear AudioContext (16kHz, interactive)
3. Abrir WebSocket a monitor_url
4. Recibir chunks binarios (ArrayBuffer)
5. Decodificar Int16 PCM a Float32 estereo
6. Programar playback con AudioContext.currentTime
7. Gain: Humano * 5.0, IA * 0.5
```

---

## Optimizaciones de Performance

### CPU (Feb 2026)

| Antes | Despues |
|-------|---------|
| Polling cada 3s | 100% event-driven |
| ~720 queries/hora/tab | 0 polling queries |
| ~85-90% reduccion CPU en live_monitor_view |

### Memoria

- Cleanup de todos los timers en unmount
- Cierre de AudioContext en unmount
- Desuscripcion de canales Realtime
- Limpieza de Sets (notified, zombie)
- Prevencion de carga concurrente (`isLoadingCalls` flag)

---

## Preferencias de Usuario

Persistidas en tabla `user_ui_preferences` via RPCs SECURITY DEFINER.

| Rol | Widget habilitado por default |
|-----|-------------------------------|
| ejecutivo, supervisor | Si |
| coordinador, admin, admin_operativo, direccion | No |

---

## Dependencias

### Servicios internos
- `liveMonitorKanbanOptimized.ts` - Datos de `live_monitor_view`
- `realtimeHub.ts` - Suscripciones centralizadas
- `permissionsService.ts` - Filtros de acceso
- `userUIPreferencesService.ts` - Persistencia on/off

### VoiceSoftphoneModal (`src/components/live-activity/VoiceSoftphoneModal.tsx`)

Softphone flotante draggable para llamadas Twilio Voice SDK (browser-to-browser).

**Features:**
- Draggable con framer-motion
- Controles: Aceptar, Colgar, Mute, Pausar, Transferir
- Tabs: Observaciones, Datos Prospecto, Chat
- Auto-minimiza a burbuja con heartbeat animation
- Boton "Transferir" visible solo cuando hay `parentCallSid`

### VoiceTransferModal (`src/components/live-activity/VoiceTransferModal.tsx`)

Modal para seleccionar destino de transferencia VoIP intra-coordinacion.

**Features:**
- Lista miembros online agrupados por rol (Coordinadores > Supervisores > Ejecutivos)
- Avatar con iniciales + dot verde online
- Click → transferencia via Edge Function `voice-transfer`
- Validacion server-side de permisos de coordinacion

### Componente compartido
- `TransferModal` (`src/components/analysis/TransferModal.tsx`) - Modal de transferencia de llamada VAPI (z-200)

---

## Twilio Voice SDK

### Servicios

| Servicio | Archivo | Proposito |
|----------|---------|-----------|
| `twilioVoiceService` | `src/services/twilioVoiceService.ts` | Singleton Twilio Device, incoming/outgoing calls |
| `voiceTransferService` | `src/services/voiceTransferService.ts` | Transfer entre team members, Realtime subs |
| `useTwilioVoice` | `src/hooks/useTwilioVoice.ts` | React hook con reference counting |

### Flujo de Transferencia

```
1. N8N genera TwiML con <Parameter parentCallSid, coordinacionId>
2. Ejecutivo recibe llamada en browser (Twilio Voice SDK)
3. Click "Transferir" → VoiceTransferModal muestra miembros online
4. Click miembro → Edge Function voice-transfer
5. Edge Function redirige parentCallSid via Twilio REST API
6. Nuevo miembro recibe incoming en su browser
7. Re-transferencias van directo (sin N8N/VAPI)
```

### BD: `voice_transfers`

Tabla de audit trail + Realtime notifications para transferencias VoIP.

| Campo | Tipo |
|-------|------|
| `id` | UUID PK |
| `parent_call_sid` | TEXT (CallSid Twilio) |
| `from_user_id` / `to_user_id` | UUID FK auth.users |
| `status` | pending/ringing/connected/completed/failed/rejected/timeout |
| `coordinacion_id` | UUID |

**RLS Policies:**
- SELECT: authenticated (own transfers)
- UPDATE: `from_user_id OR to_user_id = auth.uid()` (actualizar status)
- INSERT: `from_user_id = auth.uid()` (crear transferencia)

### RPC: `get_online_team_members(p_coordinacion_ids UUID[])`

SECURITY DEFINER. Retorna usuarios online de coordinaciones dadas (active_sessions < 2 min).

---

## Inventario de Archivos

| Archivo | Lineas | Proposito |
|---------|--------|-----------|
| `src/components/live-activity/index.ts` | 9 | Barrel exports |
| `src/components/live-activity/LiveCallActivityWidget.tsx` | 573 | Orquestador principal |
| `src/components/live-activity/CallCard.tsx` | 334 | Card colapsada |
| `src/components/live-activity/MinimizedCallTab.tsx` | 148 | Tab vertical minimizado |
| `src/components/live-activity/ExpandedCallPanel.tsx` | 371 | Panel expandido 2 columnas |
| `src/stores/liveActivityStore.ts` | 739 | Store Zustand |
| `src/components/live-activity/VoiceSoftphoneModal.tsx` | ~600 | Softphone draggable |
| `src/components/live-activity/VoiceTransferModal.tsx` | 287 | Modal transfer team |
| `src/services/twilioVoiceService.ts` | 526 | Twilio Voice SDK service |
| `src/services/voiceTransferService.ts` | 191 | Transfer service |
| `src/hooks/useTwilioVoice.ts` | ~120 | React hook Voice SDK |

---

## Relacion con LiveMonitor

Ambos sistemas leen de `live_monitor_view` pero son independientes:
- **Live Activity Widget:** Sidebar flotante, solo llamadas activas, event-driven
- **LiveMonitor Kanban:** Dashboard completo con historial, feedback, analytics

No hay comunicacion directa entre ambos.
