# Outbound Dialer Modal - Implementacion Completa

**Fecha:** 2026-03-13 | **Version:** 1.0.0 | **Estado:** Parcial (UI completa, telefonia pendiente)

---

## Resumen Ejecutivo

Sistema completo de marcacion saliente (outbound dialing) compuesto por:
1. **OutboundDialerModal** - Softphone completo para llamadas salientes con busqueda de prospectos, teclado numerico, controles de llamada, y 3 tabs de informacion
2. **FloatingDialerButton** - FAB (Floating Action Button) con animacion heartbeat en esquina inferior derecha
3. **WhatsApp Dropup Menu** - Menu glassmorphism en LiveChatCanvas con 3 opciones de llamada (WhatsApp, IA, Telefonica)

**Estado actual:** La UI esta 100% funcional pero todas las acciones de llamada muestran banner "Funcion en desarrollo". No hay integracion real con telefonia (Twilio outbound) aun.

---

## Archivos Creados

### `src/components/live-activity/OutboundDialerModal.tsx` (1532 lineas)

Modal tipo softphone para marcacion saliente. Visualmente IDENTICO al `VoiceSoftphoneModal` (llamadas entrantes).

**Secciones principales:**
- **Lineas 62-97:** Tipos (`ProspectoResult`, `WhatsAppMsg`, `ParsedObservaciones`)
- **Lineas 99-121:** `parseObservaciones()` - Parser de observaciones estructuradas (INSIGHT, SITUACION, OBJECIONES, ACCION, PENDIENTES)
- **Lineas 128-333:** Sound Engine completo (Web Audio API) - 5 funciones de audio
- **Lineas 335-348:** Tipos de estado y props (`DialerState`, `DialerTab`, `CallTab`, `OutboundDialerModalProps`)
- **Lineas 354-359:** `DIALER_DIGITS` - Layout del teclado numerico 4x3
- **Lineas 365-469:** `ProspectSearch` - Componente inline de busqueda con filtro por permisos
- **Lineas 475-1489:** `OutboundDialerModal` - Componente principal
- **Lineas 1491-1530:** Helpers compartidos (`InfoRow`, `ObsSection`)

**Props:**
```typescript
interface OutboundDialerModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedProspecto?: {
    id: string;
    nombre: string;
    telefono: string;
  } | null;
  callType?: 'whatsapp' | 'telefonica';
}
```

### `src/components/live-activity/FloatingDialerButton.tsx` (80 lineas)

FAB en esquina inferior derecha con animacion heartbeat.

**Props:**
```typescript
interface FloatingDialerButtonProps {
  onClick: () => void;
  appMode: string;  // Modulo actual para determinar visibilidad
}
```

**Visibilidad:** Oculto en modulos `live-chat`, `campaigns`, `dashboard`, `admin` (Set `HIDDEN_MODULES`, linea 27).

**Animacion:**
- 2 ping rings con delay staggered (0s y 0.5s)
- Scale heartbeat: `[1, 1.05, 1, 1.03, 1]` cada 2.5s
- Spring entry: stiffness 400, damping 25, delay 0.3s
- Tooltip "Nueva llamada" en hover

**Posicion:** `fixed bottom-8 right-8 z-40`

---

## Archivos Modificados

### `src/components/MainApp.tsx` (618 lineas)

**Cambios:**
- **Linea 34-35:** Lazy imports de `FloatingDialerButton` y `OutboundDialerModal`
- **Linea 79:** Estado `showOutboundDialer` (boolean)
- **Lineas 536-537:** Render en branch mobile layout (dentro de Suspense)
- **Lineas 599-600:** Render en branch desktop layout (dentro de Suspense)

El FAB y modal se montan globalmente, independiente del modulo activo. El FAB se auto-oculta en modulos donde no aplica via `HIDDEN_MODULES`.

### `src/components/chat/LiveChatCanvas.tsx` (10700 lineas)

**Cambios:**
- **Linea 99:** Import de `OutboundDialerModal`
- **Lineas 1315-1317:** Nuevos estados: `showCallDropup`, `showOutboundDialer`, `outboundCallType`
- **Lineas 10035-10216:** Reemplazo del boton de telefono simple por dropup glassmorphism con 3 opciones
- **Lineas 10530-10542:** Render de `OutboundDialerModal` con `preSelectedProspecto` del prospecto seleccionado en chat

**Dropup menu (3 opciones):**
1. **Llamada WhatsApp** (emerald) - Abre OutboundDialerModal con `callType='whatsapp'`
2. **Llamada IA** (violet) - Abre ManualCallModal (existente, programar llamada VAPI)
3. **Llamada Telefonica** (blue) - Abre OutboundDialerModal con `callType='telefonica'`

### `src/components/live-activity/VoiceSoftphoneModal.tsx` (1109 lineas)

**Cambio:** Boton "Conferencia" agregado en los controles de llamada activa (lineas 782-789). Actualmente placeholder con title "proximamente".

### `src/components/live-activity/index.ts` (10 lineas)

**Cambio:** Agregados exports para `OutboundDialerModal` y `FloatingDialerButton` (lineas 9-10).

---

## Arquitectura

### Maquina de Estados (DialerState)

```
                    +---------+
                    |  idle   | <-- Estado inicial (teclado + busqueda)
                    +----+----+
                         |
                    handleDial()
                    startRinging()
                         |
                    +----v----+
                    | dialing | <-- Ringing 2s (audio 440+480 Hz)
                    +----+----+
                         |
                    setTimeout(2000)
                    stopRinging()
                    playConnectedChime()
                         |
                    +----v------+
                    | connected | <-- Controles activos + tabs + dev banner
                    +----+------+
                         |
                    handleHangup()
                    playHangupTone()
                         |
                    +----v----+
                    |  ended  | <-- "Llamada finalizada" + auto-close 800ms
                    +---------+
```

### Tabs por Estado

**Estado `idle`:**
- Tab "Teclado" (`teclado`) - Dialer pad numerico con display
- Tab "Buscar" (`buscar`) - Busqueda de prospectos con filtro permisos

**Estado `connected`:**
- Tab "Llamada" (`llamada`) - Contacto, personal, viaje del prospecto
- Tab "Notas" (`observaciones`) - Observaciones parseadas (5 secciones)
- Tab "Chat" (`chat`) - Historial WhatsApp del prospecto

### Sound Engine (Web Audio API)

5 funciones de audio, todas con try/catch silencioso y auto-cleanup:

| Funcion | Frecuencias | Duracion | Proposito |
|---------|-------------|----------|-----------|
| `playDTMF(digit)` | Standard DTMF pairs (697-941 x 1209-1477 Hz) | 120ms, gain 0.06 | Tono al presionar digito |
| `startRinging()` | 440 + 480 Hz (US ring tone) | 1.1s bursts cada 4s, gain 0.08 | Tono de marcacion |
| `stopRinging(engine)` | - | - | Detener ringing |
| `playConnectedChime()` | 523.25 Hz (C5) + 659.25 Hz (E5) | 400ms, gain 0.07 | Chime al conectar |
| `playHangupTone()` | 480 -> 300 Hz sweep | 350ms, gain 0.06 | Tono al colgar |
| `createHoldMusic()` | 130.81, 164.81, 196, 246.94, 523.25 Hz + LFO 0.15 Hz | Continuo, gain 0.12 | Musica de espera (mute) |
| `stopHoldMusic(engine)` | - | - | Detener hold music |

### Busqueda de Prospectos (ProspectSearch)

Filtro por permisos del usuario:
- **admin/admin_operativo/coordinador_calidad:** Sin filtro (todos los prospectos)
- **ejecutivo:** Solo `ejecutivo_id = userId`
- **supervisor/coordinador:** Prospectos de miembros en sus coordinaciones (query a `user_profiles_v2`)

Debounce de 300ms. Limite 10 resultados. Busca en `nombre_completo`, `whatsapp`, `telefono_principal`.

### Carga de Datos Completos

Al seleccionar un prospecto, se hace una segunda query para traer datos completos:
- Campos adicionales: `estado_civil`, `edad`, `viaja_con`, `tamano_grupo`, `destino_preferencia`, `observaciones`, `score`
- Si tiene `ejecutivo_id`, carga nombre del ejecutivo desde `user_profiles_v2`

### Persistencia de Posicion

- **Key:** `outbound-dialer-position` en `localStorage`
- **Default:** `{ top: '4%', left: 'calc(50% - 210px)' }`
- Se guarda al: drag end, minimizar, cerrar, click outside, blur, resize

### Comportamiento Click-Outside / Blur / Resize

Solo cuando la llamada esta activa (`isCallActive`):
- Click fuera del panel -> minimiza a barra
- `visibilitychange` (cambio de tab) -> minimiza
- `window.blur` (perdida de foco) -> minimiza
- `window.resize` -> minimiza
- Delay de 300ms para evitar false positives al abrir

### Bug Fix: preSelectedProspecto Flickering

**Problema:** El prop `preSelectedProspecto` del padre (LiveChatCanvas) cambiaba referencia en cada render, causando que el `useEffect` de reset se disparara continuamente y el modal flickeara.

**Solucion:** Pattern `prevIsOpenRef` (lineas 485-487, 559-599):
```typescript
const prevIsOpenRef = useRef(false);
const preSelectedRef = useRef(preSelectedProspecto);
preSelectedRef.current = preSelectedProspecto;  // Sync ref sin trigger

useEffect(() => {
  const wasOpen = prevIsOpenRef.current;
  prevIsOpenRef.current = isOpen;
  if (isOpen && !wasOpen) {
    // Solo resetear en transicion false -> true
    const pre = preSelectedRef.current;  // Leer de ref estable
    // ...
  }
}, [isOpen]);  // Solo depende de isOpen, no de preSelectedProspecto
```

---

## Consistencia Visual con VoiceSoftphoneModal

Ambos modales comparten tokens de diseno identicos:

| Elemento | Clase Tailwind |
|----------|---------------|
| Container | `w-[420px] bg-gray-900/98 backdrop-blur-xl border border-gray-700/60 rounded-3xl shadow-2xl shadow-black/50` |
| Header gradient (activa) | `bg-gradient-to-b from-emerald-900/40 to-transparent` |
| Header gradient (espera) | `bg-gradient-to-b from-amber-900/40 to-transparent` |
| Header gradient (idle) | `bg-gradient-to-b from-blue-900/30 to-transparent` |
| Avatar activo | `bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-emerald-500/20` |
| Avatar espera | `bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20` |
| Control buttons | `w-14 h-14 rounded-full` con shadows |
| Hangup button | `w-[64px] h-[64px] rounded-full bg-red-600 shadow-xl shadow-red-500/40` |
| Tab activo | `border-b-2 border-emerald-500 text-white` |
| Tab inactivo | `border-transparent text-gray-500 hover:text-gray-300` |
| Minimized bar | `bg-gray-900/95 border-emerald-500/40 rounded-2xl backdrop-blur-xl` |
| Heartbeat ring | `animate: scale [1, 1.08, 1], opacity [0.5, 0.2, 0.5]` 1.5s loop |
| Pulsing dot | `animate-ping` + solid circle |
| Backdrop | `bg-black/40 backdrop-blur-sm z-[89]` |
| Modal z-index | `z-[90]` |
| Minimized z-index | `z-[100]` |

---

## WhatsApp Dropup Menu (LiveChatCanvas)

**Ubicacion:** Barra inferior de chat, reemplaza boton de telefono simple.

**Diseno glassmorphism:**
```
Container: bg-gray-900/85 backdrop-blur-2xl backdrop-saturate-150
           border border-gray-700/50
           shadow-[0_8px_40px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)_inset]
           rounded-2xl w-[230px]

Backdrop: bg-black/20 backdrop-blur-[2px] z-[60]
Menu:     z-[61]
```

**Animacion de entrada:**
- Menu: spring stiffness 500, damping 30, con blur transition
- Items: staggered x: -10 -> 0 con delays 0.05, 0.10, 0.15
- Separadores: `border-t border-gray-700/40` entre opciones

**3 opciones:**
1. Llamada WhatsApp (emerald-500 icon + bg)
2. Llamada IA (violet-500 icon + bg) - Abre ManualCallModal existente
3. Llamada Telefonica (blue-500 icon + bg)

**Arrow:** Triangulo rotado 45deg con matching border/shadow

---

## FAB Visibilidad

Ocultado en modulos via `HIDDEN_MODULES` Set:
- `live-chat` - LiveChatCanvas ya tiene su propio dropup con mas contexto
- `campaigns` - No aplica
- `dashboard` - No aplica
- `admin` - No aplica

Visible en: analysis, tickets, documentation, ai-models, y cualquier otro modulo.

---

## Banner "Funcion en desarrollo"

Cuando el usuario marca (handleDial), la llamada transiciona a `connected` y despues de 1.5s aparece:

```html
<div class="bg-amber-500/10 border border-amber-500/20 rounded-xl">
  <Construction /> Funcion en desarrollo. Proximamente
</div>
```

Esto indica que la UI esta lista pero la integracion real con telefonia aun no existe.

---

## Pendiente / Futuro

1. **Integracion Twilio outbound:** Conectar `handleDial` con Twilio REST API para llamadas salientes reales (requiere TwiML App para outbound + Edge Function)
2. **Conferencia:** Implementar boton "Conferencia" (placeholder en ambos modales)
3. **Transferencia outbound:** Implementar transfer para llamadas salientes
4. **Grabacion outbound:** Recording via Twilio para llamadas salientes
5. **Webhook N8N:** Notificar fin de llamada saliente al workflow
6. **Historial de llamadas:** Persistir llamadas salientes en BD

---

## Dependencias

| Dependencia | Uso |
|-------------|-----|
| `framer-motion` | Drag, AnimatePresence, motion animations |
| `lucide-react` | 30+ iconos |
| `react-dom` (createPortal) | Render en document.body |
| `AuthContext` | Usuario actual, rol, coordinaciones |
| `analysisSupabase` | Queries a prospectos, user_profiles_v2, mensajes_whatsapp |
| Web Audio API | DTMF, ringing, chime, hangup, hold music |

---

## Inventario de Archivos

| Archivo | Lineas | Tipo | Proposito |
|---------|--------|------|-----------|
| `src/components/live-activity/OutboundDialerModal.tsx` | 1532 | Nuevo | Modal softphone outbound |
| `src/components/live-activity/FloatingDialerButton.tsx` | 80 | Nuevo | FAB heartbeat |
| `src/components/live-activity/index.ts` | 10 | Modificado | +2 exports |
| `src/components/MainApp.tsx` | 618 | Modificado | FAB + modal global |
| `src/components/chat/LiveChatCanvas.tsx` | 10700 | Modificado | Dropup + modal con preSelected |
| `src/components/live-activity/VoiceSoftphoneModal.tsx` | 1109 | Modificado | +Boton Conferencia |
