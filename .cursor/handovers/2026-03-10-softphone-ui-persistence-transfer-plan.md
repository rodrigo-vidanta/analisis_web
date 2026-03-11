# Handover: Softphone UI, Persistencia y Plan de Transferencias

**Fecha:** 2026-03-10 ~11:00 PM CST
**Sesiones:** S188-S197 (continuación compactada) + sesión actual

## Resumen

Refinamiento del VoiceSoftphoneModal y LiveCallActivityWidget para mejorar la UX de llamadas VoIP transferidas vía Twilio Voice SDK. Se implementaron overlay con blur, persistencia del softphone al cambiar de pestaña, ocultamiento del side widget durante llamadas activas, y manejo correcto de cierre de página.

## Cambios Realizados

### 1. VoiceSoftphoneModal.tsx — Backdrop overlay con blur
- Agregado `<motion.div>` backdrop `bg-black/40 backdrop-blur-sm` en z-[89] detrás del panel
- Click en backdrop minimiza a burbuja (`setIsMinimized(true)`)
- Portal ahora usa fragment `<>...</>` para renderizar backdrop + constraint container

### 2. LiveCallActivityWidget.tsx — Persistencia del softphone
- **`softphoneIsOpen`**: `(showSoftphone || hasActiveVoiceCall) && softphoneCallData !== null`
  - Ya no depende solo de `showSoftphone` — usa `hasActiveVoiceCall` como fallback
  - Evita que el softphone desaparezca cuando `widgetCalls` se vacía pero la VoIP sigue activa
- **Early return**: `widgetCalls.length === 0 && !isLoading && !softphoneIsOpen` — portal sobrevive sin widgetCalls
- **`isOpen` del softphone**: Cambiado de `showSoftphone && (hasActiveVoiceCall || hasIncomingCall)` a `softphoneIsOpen`

### 3. LiveCallActivityWidget.tsx — Side widget filtrado
- **`sideWidgetCalls`**: Durante llamada VoIP activa, solo muestra cards con `voiceTransferStatus === 'incoming'`
- `expandedCall` usa `sideWidgetCalls` en vez de `widgetCalls`
- Card mapping y "más llamadas" usan `sideWidgetCalls`

### 4. twilioVoiceService.ts — beforeunload handler
- `boundBeforeUnload`: Desconecta `activeCall` al cerrar/recargar página
- Se registra en `initialize()`, se remueve en `destroy()`
- Garantiza terminación limpia de llamadas al cerrar browser

### 5. useTwilioVoice.ts — Recovery de incomingCallInfo
- `incomingCallInfo` se inicializa con lazy initializer desde `twilioVoiceService.getState()`
- Si hay `activeCall` o `incomingCall` en el servicio, extrae la info con `extractCallInfo()`
- Permite recovery del softphone tras SPA re-login sin page reload

## Archivos Modificados
- `src/components/live-activity/VoiceSoftphoneModal.tsx` — backdrop overlay
- `src/components/live-activity/LiveCallActivityWidget.tsx` — softphoneIsOpen, sideWidgetCalls, isOpen
- `src/services/twilioVoiceService.ts` — beforeunload handler
- `src/hooks/useTwilioVoice.ts` — incomingCallInfo recovery

## Estado Actual
- TypeScript compila sin errores
- Todos los cambios son frontend (no hay deploy de edge functions ni cambios de BD)
- NO se ha hecho commit ni push

## Bugs Conocidos / Pendientes
1. **Widget "Llamadas Activas" en Inicio**: El módulo de inicio tiene su propio widget de llamadas activas que debería seguir mostrando las llamadas aunque el side widget esté oculto
2. **Visibilidad cross-coordinación**: El side widget muestra llamadas según permisos del usuario (coordinación). La notificación de Voice Transfer debería respetar estos mismos permisos
3. **Transferencia entre ejecutivos**: Feature planificado pero NO implementado — ver sección siguiente

## Próximo: Plan de Transferencia Voice entre Miembros del Equipo

### Requerimientos (del usuario)
- Ejecutivo que toma llamada: botón "Transferir" a ejecutivos/supervisores/coordinadores de su coordinación conectados
- Coordinador/Supervisor: ven llamada activa del ejecutivo en side widget con "Escuchar" y "Transferir Aquí"
- Coordinador/Supervisor con llamada: modal con "Transferir" (a cualquiera de su coordinación activo) y "Colgar"
- Si supervisor/coordinador ya tiene la llamada: ejecutivo asignado solo puede "Escuchar"
- Restricciones de permisos:
  - Solo misma coordinación
  - Solo usuarios conectados/online
  - Notificación de incoming solo al ejecutivo asignado y su coordinación
  - No cross-coordinación
