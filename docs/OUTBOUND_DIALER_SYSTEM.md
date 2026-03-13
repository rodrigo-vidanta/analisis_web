# Sistema de Marcacion Saliente (Outbound Dialer) - PQNC AI Platform

**Fecha:** 2026-03-13 | **Version:** 1.0.0 | **Estado:** UI Completa, Telefonia Pendiente

---

## Resumen

Sistema de marcacion saliente que permite a ejecutivos iniciar llamadas desde la plataforma. Compuesto por un softphone modal completo (OutboundDialerModal), un boton flotante global (FloatingDialerButton), y un menu contextual glassmorphism en el chat de WhatsApp (LiveChatCanvas dropup). Visualmente identico al VoiceSoftphoneModal (llamadas entrantes) para mantener consistencia UX.

**Estado actual:** La interfaz esta 100% funcional con sound engine completo, busqueda de prospectos, tabs de informacion, y controles de llamada. Sin embargo, todas las acciones de marcacion muestran un banner "Funcion en desarrollo" ya que la integracion real con telefonia (Twilio outbound) aun no esta implementada.

---

## Arquitectura

### Diagrama del Sistema

```
MainApp.tsx
  |
  |-- FloatingDialerButton (FAB, fixed bottom-8 right-8, z-40)
  |     |-- HIDDEN_MODULES: live-chat, campaigns, dashboard, admin
  |     |-- onClick -> setShowOutboundDialer(true)
  |
  |-- OutboundDialerModal (Portal en document.body, z-90)
  |     |-- isOpen/onClose (sin preSelectedProspecto)
  |     |-- Tabs idle: Teclado | Buscar
  |     |-- Tabs connected: Llamada | Notas | Chat
  |     |-- Sound Engine (Web Audio API)
  |     |-- Minimized Bar (z-100)
  |
LiveChatCanvas.tsx
  |
  |-- WhatsApp Dropup Menu (z-61, glassmorphism)
  |     |-- Llamada WhatsApp -> OutboundDialerModal(callType='whatsapp')
  |     |-- Llamada IA -> ManualCallModal (existente, VAPI)
  |     |-- Llamada Telefonica -> OutboundDialerModal(callType='telefonica')
  |
  |-- OutboundDialerModal (Portal, con preSelectedProspecto del chat activo)
```

### Jerarquia de Componentes

```
OutboundDialerModal (1532 lineas)
  |-- ProspectSearch (inline, lineas 365-469)
  |     |-- Busqueda con debounce 300ms
  |     |-- Filtro por permisos (admin/supervisor/ejecutivo)
  |
  |-- DialerPad (inline, lineas 1426-1479)
  |     |-- Grid 4x3 con DTMF tones
  |     |-- Display numerico + delete
  |
  |-- Connected Controls (inline, lineas 1033-1323)
  |     |-- Mute/Hold + Transfer + Conference + Hangup
  |     |-- Tab Llamada: InfoRow helpers
  |     |-- Tab Notas: ObsSection helpers
  |     |-- Tab Chat: WhatsApp messages grouped by date
  |
  |-- Minimized Bar (inline, lineas 800-868)
  |     |-- Heartbeat ring + pulsing dot
  |     |-- Name + timer + mute/hangup/expand buttons
  |
  |-- InfoRow (helper, lineas 1493-1503)
  |-- ObsSection (helper, lineas 1506-1530)

FloatingDialerButton (80 lineas)
  |-- Ping rings (2, staggered)
  |-- Heartbeat scale animation
  |-- Tooltip "Nueva llamada"
```

---

## Maquina de Estados

### DialerState

```
                         +----------+
          (isOpen)       |          |
      +----------------->   idle   |
      |                  |          |
      |                  +----+-----+
      |                       |
      |                  handleDial()
      |                  startRinging()    [Sound: 440+480 Hz dual tone]
      |                  setCallDuration(0)
      |                       |
      |                  +----v-----+
      |                  |          |
      |                  | dialing  |     [2000ms timeout]
      |                  |          |
      |                  +----+-----+
      |                       |
      |                  stopRinging()
      |                  playConnectedChime()  [Sound: C5 -> E5]
      |                  showDevMessage after 1500ms
      |                       |
      |                  +----v------+
      |                  |           |
      |                  | connected |    [Timer running, controls active]
      |                  |           |    [Click outside -> minimize]
      |                  +----+------+
      |                       |
      |                  handleHangup()
      |                  stopRinging()
      |                  stopHoldMusic()
      |                  playHangupTone()  [Sound: 480->300 Hz sweep]
      |                       |
      |                  +----v-----+
      |                  |          |
      |                  |  ended   |     [800ms -> onClose()]
      |                  |          |
      |                  +----------+
```

### Transiciones de Vista

| Estado | Vista Principal | Minimizable |
|--------|----------------|-------------|
| `idle` | Tabs Teclado/Buscar + header azul | No (X cierra) |
| `dialing` | Animacion pulsante + boton cancelar | No |
| `connected` | Controles + tabs Llamada/Notas/Chat | Si (barra inferior) |
| `ended` | Icono + "Llamada finalizada" + duracion | No (auto-close 800ms) |

### DialerTab (estado `idle`)

| Tab | Descripcion |
|-----|-------------|
| `teclado` | Dialer pad numerico 4x3 con DTMF + display + boton Marcar |
| `buscar` | Busqueda de prospectos por nombre/telefono con filtro permisos |

### CallTab (estado `connected`)

| Tab | Descripcion |
|-----|-------------|
| `llamada` | Datos de contacto, info personal, preferencias de viaje |
| `observaciones` | Observaciones parseadas en 5 secciones (insight, situacion, objeciones, accion, pendientes) |
| `chat` | Historial de mensajes WhatsApp agrupados por fecha (query a `mensajes_whatsapp`) |

---

## Sound Engine (Web Audio API)

### Referencia Completa

#### `playDTMF(digit: string)`

Tono DTMF standard al presionar tecla del dialer.

| Parametro | Detalle |
|-----------|---------|
| Frecuencias | Pares standard ITU-T: fila (697-941 Hz) x columna (1209-1477 Hz) |
| Duracion | 120ms |
| Gain | 0.06, exponential ramp to 0.001 |
| Waveform | Sine (2 osciladores simultaneos) |
| Cleanup | AudioContext.close() despues de 200ms |

**Mapa de frecuencias:**
```
       1209 Hz   1336 Hz   1477 Hz
697 Hz:  1         2         3
770 Hz:  4         5         6
852 Hz:  7         8         9
941 Hz:  *         0         #
```

#### `startRinging(): RingingEngine | null`

Tono de marcacion estilo US. Retorna objeto para detener.

| Parametro | Detalle |
|-----------|---------|
| Frecuencias | 440 Hz + 480 Hz (US standard ring) |
| Patron | 2 bursts (0-0.5s + 0.6-1.1s) cada 4s |
| Gain | 0.08, linear ramp envelope |
| Retorno | `{ ctx: AudioContext, intervalId }` o `null` |

```typescript
interface RingingEngine {
  ctx: AudioContext;
  intervalId: ReturnType<typeof setInterval>;
}
```

#### `stopRinging(engine: RingingEngine | null)`

Detiene el ringing. Limpia interval + cierra AudioContext.

#### `playConnectedChime()`

Chime de conexion exitosa. Dos notas ascendentes.

| Parametro | Detalle |
|-----------|---------|
| Nota 1 | C5 (523.25 Hz), 0-150ms, gain 0.07 |
| Nota 2 | E5 (659.25 Hz), 150-400ms, gain 0.07 |
| Waveform | Sine |
| Cleanup | AudioContext.close() despues de 600ms |

#### `playHangupTone()`

Tono descendente al colgar.

| Parametro | Detalle |
|-----------|---------|
| Frecuencia | 480 Hz -> 300 Hz (exponential sweep) |
| Duracion | 350ms |
| Gain | 0.06, exponential ramp to 0.001 |
| Cleanup | AudioContext.close() despues de 500ms |

#### `createHoldMusic(): HoldMusicEngine | null`

Musica de espera ambiente. Identica a la de VoiceSoftphoneModal.

| Parametro | Detalle |
|-----------|---------|
| Pad | 4 osciladores: C3 (130.81), E3 (164.81), G3 (196), B3 (246.94) Hz |
| Melodia | 1 oscilador: C5 (523.25 Hz), gain 0.08 |
| LFO | 0.15 Hz sine, modula master gain +/- 0.04 |
| Master gain | 0.12 |
| Detune | Spread -4.5 a +4.5 cents entre osciladores |

```typescript
interface HoldMusicEngine {
  audioCtx: AudioContext;
  masterGain: GainNode;
  oscillators: OscillatorNode[];
  lfo: OscillatorNode;
}
```

#### `stopHoldMusic(engine: HoldMusicEngine | null)`

Detiene hold music. Para todos los osciladores + LFO + cierra AudioContext.

---

## Modelo de Permisos para Busqueda de Prospectos

La busqueda de prospectos respeta el modelo de permisos de la plataforma:

| Rol | Filtro | Query |
|-----|--------|-------|
| `admin`, `admin_operativo`, `coordinador_calidad` | Sin filtro | Todos los prospectos |
| `ejecutivo` | Solo propios | `.eq('ejecutivo_id', userId)` |
| `supervisor`, `coordinador` | Coordinacion | Query team members via `user_profiles_v2` -> `.in('ejecutivo_id', teamMemberIds)` |

**Flujo para supervisor/coordinador:**
1. Query `user_profiles_v2` filtrando por `coordinacion_id IN coordinacionesIds`
2. Extraer IDs de miembros del equipo
3. Filtrar prospectos con `ejecutivo_id IN teamMemberIds`

**Debounce:** 300ms entre keystroke y query.
**Limite:** 10 resultados max.
**Campos buscados:** `nombre_completo`, `whatsapp`, `telefono_principal` (ilike).

---

## Interfaces de Props

### OutboundDialerModalProps

```typescript
interface OutboundDialerModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedProspecto?: {
    id: string;
    nombre: string;
    telefono: string;
  } | null;
  callType?: 'whatsapp' | 'telefonica';  // default: 'telefonica'
}
```

### FloatingDialerButtonProps

```typescript
interface FloatingDialerButtonProps {
  onClick: () => void;
  appMode: string;
}
```

### Tipos Internos

```typescript
interface ProspectoResult {
  id: string;
  nombre_completo: string;
  whatsapp: string | null;
  telefono_principal: string | null;
  email: string | null;
  ciudad_residencia: string | null;
  etapa: string | null;
  ejecutivo_id: string | null;
  ejecutivo_nombre?: string | null;
  estado_civil?: string | null;
  edad?: number | null;
  viaja_con?: string | null;
  tamano_grupo?: number | null;
  destino_preferencia?: string[] | null;
  observaciones?: string | null;
  score?: number | null;
}

interface WhatsAppMsg {
  id: string;
  mensaje: string | null;
  rol: string;
  fecha_hora: string;
  adjuntos: Record<string, unknown> | null;
  status_delivery?: string | null;
}

type DialerState = 'idle' | 'dialing' | 'connected' | 'ended';
type DialerTab = 'buscar' | 'teclado';
type CallTab = 'llamada' | 'observaciones' | 'chat';
```

---

## Z-Index Layering

```
z-40    FloatingDialerButton (FAB)
z-50    LiveCallActivityWidget (existing)
z-60    WhatsApp Dropup backdrop (bg-black/20 backdrop-blur-[2px])
z-61    WhatsApp Dropup menu
z-89    OutboundDialerModal backdrop (bg-black/40 backdrop-blur-sm)
z-90    OutboundDialerModal panel (draggable)
z-95    VoiceTransferModal (existing)
z-100   OutboundDialerModal minimized bar
z-200   TransferModal VAPI (existing)
```

---

## localStorage Keys

| Key | Tipo | Default | Uso |
|-----|------|---------|-----|
| `outbound-dialer-position` | `{ top: string, left: string }` | `{ top: '4%', left: 'calc(50% - 210px)' }` | Posicion persistida del modal draggable |

Se guarda en: drag end, minimizar, cerrar, click-outside, blur, resize.
Se lee en: apertura del modal (style initial position).

---

## Puntos de Integracion

### MainApp.tsx (Global)

```
MainApp
  |-- state: showOutboundDialer (boolean)
  |-- <FloatingDialerButton appMode={appMode} onClick={toggle} />
  |-- <OutboundDialerModal isOpen={state} onClose={toggle} />
  |
  |-- Lazy loaded (React.lazy + Suspense)
  |-- Rendered in both mobile and desktop layout branches
```

**Lineas relevantes:** 34-35 (lazy imports), 79 (state), 536-537 (mobile render), 599-600 (desktop render).

### LiveChatCanvas.tsx (Contextual)

```
LiveChatCanvas
  |-- state: showCallDropup, showOutboundDialer, outboundCallType
  |
  |-- Toolbar inferior
  |     |-- Phone button -> toggles dropup
  |     |-- Dropup menu (3 opciones)
  |           |-- WhatsApp -> callType='whatsapp' + open dialer
  |           |-- IA -> ManualCallModal (existing)
  |           |-- Telefonica -> callType='telefonica' + open dialer
  |
  |-- <OutboundDialerModal
  |       isOpen={showOutboundDialer}
  |       callType={outboundCallType}
  |       preSelectedProspecto={{
  |         id: selectedConversation.prospecto_id,
  |         nombre: customer_name || nombre_contacto,
  |         telefono: customer_phone || numero_telefono
  |       }}
  |     />
```

**Lineas relevantes:** 99 (import), 1315-1317 (state), 10035-10216 (dropup), 10530-10542 (modal render).

---

## Tokens de Diseno CSS/Tailwind

### Container Principal

```
w-[420px] max-h-[85vh]
bg-gray-900/98 backdrop-blur-xl
border border-gray-700/60
rounded-3xl
shadow-2xl shadow-black/50
overflow-hidden flex flex-col
```

### Header (Drag Handle)

```
// Gradientes por estado:
idle:       bg-gradient-to-b from-blue-900/30 to-transparent
active:     bg-gradient-to-b from-emerald-900/40 to-transparent
muted/hold: bg-gradient-to-b from-amber-900/40 to-transparent

px-5 pt-4 pb-3
cursor-grab active:cursor-grabbing select-none
```

### Avatar

```
w-12 h-12 rounded-full shadow-lg

idle:  bg-gradient-to-br from-blue-500 to-cyan-600 shadow-blue-500/20
active: bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-emerald-500/20
hold:  bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20
```

### Control Buttons

```
// Standard control:
w-14 h-14 rounded-full shadow-lg

// Mute (off):  bg-gray-700 hover:bg-gray-600 shadow-gray-700/30
// Mute (on):   bg-amber-600 hover:bg-amber-500 shadow-amber-500/30 ring-2 ring-amber-400/40
// Transfer:    bg-blue-600/40 hover:bg-blue-600/60 shadow-blue-500/10
// Conference:  bg-cyan-600/30 hover:bg-cyan-600/50 shadow-cyan-500/10

// Hangup (prominente):
w-[64px] h-[64px] rounded-full
bg-red-600 hover:bg-red-500
shadow-xl shadow-red-500/40 hover:shadow-red-500/60
```

### Tabs

```
// Tab container:
flex border-b border-gray-800/80 px-3

// Active tab:
text-white border-b-2 border-emerald-500

// Inactive tab:
text-gray-500 border-transparent
hover:text-gray-300 hover:border-gray-600
```

### Minimized Bar

```
fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]

bg-gray-900/95 backdrop-blur-xl
border rounded-2xl
px-5 py-3
shadow-2xl shadow-black/40

// Active:
border-emerald-500/40 hover:border-emerald-400/60

// On hold:
border-amber-500/40 hover:border-amber-400/60
```

### Heartbeat Animation

```
// Ring:
animate: scale [1, 1.08, 1], opacity [0.5, 0.2, 0.5]
duration: 1.5s, repeat: Infinity, ease: easeInOut

// Pulsing dot:
<span class="animate-ping absolute ... rounded-full opacity-75 bg-emerald-400" />
<span class="relative ... rounded-full bg-emerald-500" />
```

### Dialer Pad Buttons

```
w-[72px] h-[72px] mx-auto rounded-full
bg-gray-800/50 hover:bg-gray-700/70
border border-gray-700/30 hover:border-gray-600/50
text-white text-xl font-semibold
active:scale-90 active:bg-gray-600/80
shadow-lg shadow-black/20
```

### WhatsApp Dropup (LiveChatCanvas)

```
// Backdrop:
fixed inset-0 z-[60]
bg-black/20 backdrop-blur-[2px]

// Menu container:
absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-[61] w-[230px]
bg-gray-900/85
backdrop-blur-2xl backdrop-saturate-150
border border-gray-700/50
shadow-[0_8px_40px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)_inset]
rounded-2xl

// Option icons:
w-9 h-9 rounded-xl bg-{color}-500/15 border border-{color}-500/20

// Arrow:
w-3 h-3 rotate-45 bg-gray-900/85 border-r border-b border-gray-700/50
```

---

## Guia de Testing

### Flujo Basico

1. **FAB visible:** Navegar a modulos analysis, tickets, documentation - verificar que el FAB aparece en bottom-8 right-8
2. **FAB oculto:** Navegar a live-chat, campaigns, dashboard, admin - verificar que el FAB no aparece
3. **Abrir modal:** Click en FAB - modal debe aparecer con tabs Teclado/Buscar
4. **Teclado DTMF:** Presionar digitos - verificar que suena tono DTMF y numero aparece en display
5. **Delete:** Presionar delete - verificar que borra ultimo digito
6. **Marcar:** Escribir numero + click "Marcar" - verificar transicion a `dialing` con ringing
7. **Ringing:** Verificar tono US ring (440+480 Hz) durante 2s
8. **Conexion:** Despues de 2s, verificar chime C5->E5 y transicion a `connected`
9. **Banner desarrollo:** Verificar que aparece "Funcion en desarrollo" despues de 1.5s
10. **Timer:** Verificar que timer incrementa cada segundo

### Busqueda de Prospectos

11. **Tab Buscar:** Cambiar a tab Buscar - verificar que aparece input de busqueda
12. **Busqueda:** Escribir nombre/telefono (min 2 chars) - verificar resultados despues de 300ms debounce
13. **Seleccion:** Click en resultado - verificar que se llena nombre y telefono
14. **Permisos ejecutivo:** Login como ejecutivo - verificar que solo ve sus prospectos
15. **Permisos admin:** Login como admin - verificar que ve todos los prospectos
16. **Datos completos:** Al seleccionar - verificar que se cargan datos adicionales (email, ciudad, observaciones)

### Controles de Llamada

17. **Mute/Hold:** Click mute - verificar musica de espera + cambio visual a amber
18. **Unmute:** Click mute de nuevo - verificar que para la musica y vuelve a emerald
19. **Hangup:** Click colgar - verificar tono hangup + transicion a `ended` + auto-close 800ms

### Tabs Connected

20. **Tab Llamada:** Verificar datos de contacto (WhatsApp, email, ciudad), personal, viaje
21. **Tab Notas:** Verificar observaciones parseadas en 5 secciones con colores
22. **Tab Chat:** Verificar carga de mensajes WhatsApp agrupados por fecha
23. **Badge notas:** Verificar dot verde en tab Notas cuando hay observaciones

### Minimizacion

24. **Click outside:** Con llamada activa, click fuera - verificar que minimiza a barra
25. **Cambio tab:** Con llamada activa, cambiar de browser tab - verificar minimiza
26. **Resize:** Con llamada activa, resize ventana - verificar minimiza
27. **Expandir:** Click en barra minimizada - verificar que vuelve al modal completo
28. **Controles minimizados:** Verificar mute/hangup/expand en barra minimizada

### Persistencia Posicion

29. **Drag:** Arrastrar modal - verificar que se puede mover
30. **Persistencia:** Cerrar y reabrir - verificar que recuerda posicion
31. **Reset:** Borrar `outbound-dialer-position` de localStorage - verificar default centrado

### Dropup (LiveChatCanvas)

32. **Abrir dropup:** Click en boton telefono en barra inferior chat - verificar menu glassmorphism
33. **Backdrop:** Verificar backdrop blur detras del menu
34. **WhatsApp option:** Click - verificar que abre OutboundDialerModal con callType='whatsapp'
35. **IA option:** Click - verificar que abre ManualCallModal
36. **Telefonica option:** Click - verificar que abre OutboundDialerModal con callType='telefonica'
37. **PreSelected:** Verificar que el modal se abre con el prospecto del chat pre-seleccionado
38. **Badge tipo:** Verificar badge WhatsApp (emerald) o Telefonica (blue) en header del modal

### Bug Regression

39. **Flickering:** Abrir/cerrar modal multiples veces rapidamente - verificar que no hay flickering
40. **Audio cleanup:** Cerrar modal durante ringing/hold - verificar que audio se detiene
41. **Timer cleanup:** Cerrar modal durante llamada - verificar que timer se detiene

---

## Inventario de Archivos

| Archivo | Lineas | Estado | Proposito |
|---------|--------|--------|-----------|
| `src/components/live-activity/OutboundDialerModal.tsx` | 1532 | Nuevo | Modal softphone outbound completo |
| `src/components/live-activity/FloatingDialerButton.tsx` | 80 | Nuevo | FAB con heartbeat animation |
| `src/components/live-activity/index.ts` | 10 | Modificado | Barrel exports (+2) |
| `src/components/MainApp.tsx` | 618 | Modificado | Montaje global FAB + modal |
| `src/components/chat/LiveChatCanvas.tsx` | 10700 | Modificado | Dropup glassmorphism + modal contextual |
| `src/components/live-activity/VoiceSoftphoneModal.tsx` | 1109 | Modificado | +Boton Conferencia placeholder |

---

## Relacion con VoiceSoftphoneModal

Ambos modales son softphones pero para direcciones opuestas:

| Aspecto | VoiceSoftphoneModal | OutboundDialerModal |
|---------|--------------------|--------------------|
| Direccion | Llamadas entrantes (Twilio SDK) | Llamadas salientes (placeholder) |
| Trigger | Incoming call Twilio Device | Click FAB o dropup |
| Telefonia real | Si (Twilio Voice SDK) | No (pendiente) |
| Busqueda prospectos | No (prospecto viene con la llamada) | Si (tab Buscar) |
| Teclado numerico | No | Si (tab Teclado con DTMF) |
| Hold music | Si (identica implementacion) | Si (identica implementacion) |
| Transfer | Si (VoiceTransferModal) | No (boton placeholder) |
| Conference | No (boton placeholder) | No (boton placeholder) |
| Grabacion | Si (Twilio Recording) | No |
| Tabs connected | Observaciones, Datos, Chat | Llamada, Notas, Chat |
| Visual | Identico | Identico |
| Portal | document.body | document.body |
| Draggable | Si (framer-motion) | Si (framer-motion) |
| Minimizable | Si (heartbeat bar) | Si (heartbeat bar) |

No hay comunicacion directa entre ambos modales. Pueden coexistir pero el caso de uso tipico es uno u otro activo a la vez.

---

## Pendiente / Futuro

1. Conectar telefonia real (Twilio outbound via TwiML App + Edge Function)
2. Implementar conferencia (boton placeholder en ambos modales)
3. Transferencia para llamadas salientes
4. Grabacion automatica de llamadas salientes
5. Webhook N8N al finalizar llamada saliente
6. Persistencia de historial de llamadas en BD
7. Metricas de llamadas salientes en dashboard
