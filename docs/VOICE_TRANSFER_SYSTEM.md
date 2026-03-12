# Sistema de Transferencia de Llamadas Voice - PQNC AI Platform

**Fecha:** 2026-03-11 | **Version:** 1.0.0 | **Estado:** Produccion Activa

---

## Resumen Ejecutivo

Sistema completo de llamadas VoIP y transferencias frias (cold transfer) que permite a los miembros de un equipo recibir, gestionar y transferir llamadas de prospectos directamente en el navegador usando Twilio Voice SDK. Las llamadas originan desde WhatsApp via VAPI (IA conversacional), son transferidas al ejecutivo asignado, y pueden re-transferirse entre miembros del mismo equipo.

**Capacidades principales:**
- Recepcion de llamadas WhatsApp transferidas desde VAPI al browser del ejecutivo
- Recepcion de llamadas PSTN transferidas via numero puente con cascada de fallback
- Notificaciones nativas del sistema (Windows/Mac) para llamadas entrantes con click-to-answer
- Softphone completo en el browser (aceptar, colgar, mute, pausar)
- Transferencia fria entre miembros de la misma coordinacion
- Admin puede transferir a cualquier usuario online (sin restriccion de coordinacion)
- Grabacion automatica Twilio de la conversacion ejecutivo-prospecto
- Notificacion automatica a N8N webhook al finalizar la llamada (con grabacion)
- Visibilidad por rol en el widget de llamadas activas

---

## Arquitectura del Sistema

### Diagrama de Flujo Completo

```
WhatsApp Prospecto
       |
       v
   Twilio PSTN
       |
       v
  N8N Workflow (qpk8xsMI50IWltFV)
       |
       v
  VAPI (IA Conversacional: Natalia)
       |
       v  [Transfer Tool → N8N redirect]
  Twilio REST API
       |  POST /Calls/{callSid}.json + TwiML
       v
  <Dial><Client>agent_{ejecutivoId}</Client></Dial>
       |
       v
  Browser Ejecutivo (Twilio Voice SDK)
       |
       +-- Acepta → startRecording (Edge Function)
       |            → Llamada activa (softphone)
       |
       +-- Transferir → VoiceTransferModal
       |                 → voice-transfer Edge Function
       |                 → Twilio redirect a nuevo agente
       |
       +-- Colgar → voice-call-end Edge Function
                    → N8N webhook (recording + metadata)
```

### Componentes del Sistema

| Capa | Componente | Archivo/Funcion |
|------|-----------|-----------------|
| **Edge Functions** | Token JWT | `generate-twilio-token` |
| | Transferencia | `voice-transfer` |
| | Iniciar grabacion | `voice-start-recording` |
| | Fin de llamada | `voice-call-end` |
| **Frontend Service** | Twilio Device | `src/services/twilioVoiceService.ts` |
| | Transferencia | `src/services/voiceTransferService.ts` |
| **Frontend Hook** | React integration | `src/hooks/useTwilioVoice.ts` |
| **Frontend UI** | Softphone | `VoiceSoftphoneModal.tsx` |
| | Modal transfer | `VoiceTransferModal.tsx` |
| | Widget lateral | `LiveCallActivityWidget.tsx` |
| | Cards | `CallCard.tsx` |
| **Store** | Estado global | `src/stores/liveActivityStore.ts` |
| **BD** | Transferencias | tabla `voice_transfers` |
| | Bridge context | tabla `bridge_transfer_context` |
| | Online status | tabla `active_sessions` |
| | RPC | `get_online_team_members()` |
| **N8N** | Workflow VAPI | `qpk8xsMI50IWltFV` |
| | Bridge Voice URL | `q5kespj4S6iwn0pJ` |
| | Webhook fin | `end-call-whatsapp` |

---

## Edge Functions (4)

### 1. generate-twilio-token

**Ruta:** `POST /functions/v1/generate-twilio-token`
**Proposito:** Genera Access Token JWT para Twilio Voice SDK en el browser.

| Campo | Detalle |
|-------|---------|
| Auth | Supabase JWT |
| Identity | `agent_{userId}` (UUID sin guiones, max 121 chars) |
| TTL | 3600s (1 hora) |
| Grants | VoiceGrant con TwiML App SID |
| Libreria | `jose` (ESM, compatible con Deno) |

**Secrets requeridos:**
- `TWILIO_ACCOUNT_SID` - Account SID de Twilio
- `TWILIO_API_KEY_SID` - API Key SID para firmar tokens
- `TWILIO_API_KEY_SECRET` - API Key Secret
- `TWILIO_TWIML_APP_SID` - TwiML App para Voice Client SDK

**Respuesta:**
```json
{
  "token": "eyJ...",
  "identity": "agent_e8ced62c3fd04328b61aa59ebea2e877",
  "expiresIn": 3600
}
```

### 2. voice-transfer (v6)

**Ruta:** `POST /functions/v1/voice-transfer`
**Proposito:** Cold transfer - redirige la llamada activa de un agente a otro via Twilio REST API.

| Campo | Detalle |
|-------|---------|
| Auth | Supabase JWT |
| Validacion | Caller y target en misma coordinacion (server-side) |
| Admin bypass | Admin puede transferir a cualquier usuario online |
| Redirect | `POST /Calls/{parentCallSid}.json` con TwiML |
| Grabacion | `record="record-from-answer-dual"` en TwiML Dial |
| Audit | INSERT en tabla `voice_transfers` |

**Body requerido:**
```json
{
  "parentCallSid": "CA...",
  "targetUserId": "uuid",
  "coordinacionId": "uuid",
  "llamadaCallId": "call_id",
  "prospectoId": "uuid",
  "prospectoNombre": "Juan Perez",
  "fromNumber": "+5215551234567",
  "tipoLlamada": "transfer"
}
```

**Flujo de validacion (6 pasos):**
1. Validar JWT de Supabase
2. Verificar rol del caller en `user_profiles_v2`
3. Si NO es admin: verificar caller Y target en `auth_user_coordinaciones` para `coordinacionId`
4. Si ES admin: skip checks de coordinacion
5. Verificar target online en `active_sessions` (< 2 min inactividad)
6. Obtener nombres de caller y target para UI

**TwiML generado:**
```xml
<Response>
  <Dial callerId="client:transfer" record="record-from-answer-dual">
    <Client>
      <Identity>agent_{targetId}</Identity>
      <Parameter name="parentCallSid" value="CA..."/>
      <Parameter name="llamadaId" value="call_id"/>
      <Parameter name="prospectoId" value="uuid"/>
      <Parameter name="prospectoNombre" value="Juan Perez"/>
      <Parameter name="fromNumber" value="+52..."/>
      <Parameter name="tipoLlamada" value="transfer"/>
      <Parameter name="coordinacionId" value="uuid"/>
      <Parameter name="transferredBy" value="agent_{callerId}"/>
      <Parameter name="transferredByName" value="Caller Name"/>
    </Client>
  </Dial>
</Response>
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "transferId": "uuid",
  "targetIdentity": "agent_...",
  "targetName": "Rodrigo Mora",
  "transferType": "cold"
}
```

**Codigos de error:**
| Status | Descripcion |
|--------|-------------|
| 401 | JWT invalido o expirado |
| 403 | Caller o target fuera de coordinacion (no-admin) |
| 409 | Target offline o llamada no activa |
| 502 | Error de Twilio al redirigir |

### 3. voice-start-recording (v1)

**Ruta:** `POST /functions/v1/voice-start-recording`
**Proposito:** Inicia grabacion dual-channel en una llamada Twilio activa cuando el ejecutivo acepta.

| Campo | Detalle |
|-------|---------|
| Auth | Supabase JWT |
| API | `POST /Calls/{parentCallSid}/Recordings.json` |
| Channels | `RecordingChannels: dual` (ejecutivo + prospecto separados) |
| Invocacion | Fire-and-forget desde frontend |

**Body requerido:**
```json
{
  "parentCallSid": "CA..."
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "recordingSid": "RE...",
  "callSid": "CA..."
}
```

**Comportamiento tolerante a fallos:** Si la grabacion falla, la llamada continua normalmente. El frontend no bloquea la interaccion.

### 4. voice-call-end (v5)

**Ruta:** `POST /functions/v1/voice-call-end`
**Proposito:** Proxy entre frontend y N8N webhook. Busca grabacion en Twilio, envia metadata + recording URL al webhook.

| Campo | Detalle |
|-------|---------|
| Auth | Supabase JWT (frontend) + `2025_livechat_auth` header (N8N) |
| Recording | Busca con retry (4 intentos, 3s delay) en Twilio REST API |
| Recording URL | Incluye Basic Auth embebida (API Key en URL) para N8N |
| Webhook | `POST end-call-whatsapp` en N8N (Railway) |
| Seguridad | URL del webhook NUNCA expuesta en frontend/bundle |

**Body requerido:**
```json
{
  "parentCallSid": "CA...",
  "prospectoId": "uuid",
  "llamadaId": "call_id",
  "callStartedAt": "2026-03-11T14:30:00Z",
  "callEndedAt": "2026-03-11T14:35:00Z"
}
```

**Flujo interno:**
1. Autenticar via JWT
2. Obtener `id_dynamics` y `ejecutivo_id` del prospecto
3. Obtener timestamps de `llamadas_ventas` si no vienen del body
4. Buscar grabacion en Twilio (4 retries, 3s cada uno)
5. Construir URL de grabacion con Basic Auth embebida
6. Enviar payload a N8N webhook con header `2025_livechat_auth`

**Payload enviado a N8N:**
```json
{
  "recording_url": "https://KEY:SECRET@api.twilio.com/.../Recordings/RE....mp3",
  "prospecto_id": "uuid",
  "ejecutivo_id": "uuid",
  "id_dynamics": "DYN-123",
  "timestamp_inicio": "2026-03-11T14:30:00Z",
  "timestamp_fin": "2026-03-11T14:35:00Z",
  "call_sid": "CA...",
  "llamada_id": "call_id"
}
```

**Respuesta al frontend (sanitizada):**
```json
{
  "success": true,
  "recordingUrl": "present",
  "webhookStatus": 200
}
```

**Nota de seguridad:** El frontend recibe `"present"` en lugar de la URL real con credenciales. Las credenciales Twilio solo viajan entre la Edge Function y N8N.

---

## Tabla de Secrets por Edge Function

| Secret | generate-twilio-token | voice-transfer | voice-start-recording | voice-call-end |
|--------|:--------------------:|:--------------:|:--------------------:|:--------------:|
| SUPABASE_URL | x | x | x | x |
| SUPABASE_ANON_KEY | x | x | x | x |
| SUPABASE_SERVICE_ROLE_KEY | | x | | x |
| TWILIO_ACCOUNT_SID | x | x | x | x |
| TWILIO_API_KEY_SID | x | x | x | x |
| TWILIO_API_KEY_SECRET | x | x | x | x |
| TWILIO_TWIML_APP_SID | x | | | |
| LIVECHAT_AUTH | | | | x |

---

## Frontend: Servicios

### twilioVoiceService.ts (526 lineas)

Singleton que gestiona el Twilio Voice SDK Device en el browser.

**Responsabilidades:**
- Inicializar/destruir Twilio Device con Access Token
- Registrar Device para recibir llamadas entrantes
- Manejar eventos: incoming, accept, disconnect, error
- Extraer metadata de llamada (customParameters)
- Mostrar notificaciones nativas del sistema (Web Notification API)
- Fire-and-forget: iniciar grabacion al aceptar
- Fire-and-forget: notificar call-end al colgar

**Constantes:**
```typescript
const TOKEN_ENDPOINT = 'generate-twilio-token'
const START_RECORDING_ENDPOINT = 'voice-start-recording'
const CALL_END_ENDPOINT = 'voice-call-end'
const MIN_CALL_DURATION_MS = 5000  // Filtro anti-duplicado
```

**Tipo IncomingCallInfo:**
```typescript
interface IncomingCallInfo {
  llamadaId: string | null
  prospectoId: string | null
  prospectoNombre: string | null
  tipoLlamada: string | null
  fromNumber: string | null
  parentCallSid: string | null
  coordinacionId: string | null
  transferredBy: string | null
  transferredByName: string | null
}
```

**Notificaciones del Sistema (Web Notification API):**

Al recibir una llamada entrante, el servicio muestra una notificacion nativa del OS (Windows Toast / Mac Notification Center):
- Solicita permiso al inicializar el Device
- Muestra tipo de llamada (PSTN / WhatsApp / Transferencia) + nombre del prospecto
- `requireInteraction: true` — persiste hasta que el usuario interactue
- Click en notificacion: `window.focus()` + acepta la llamada automaticamente
- Auto-cierra si la llamada se cancela, desconecta, rechaza o acepta por otro medio

```typescript
private showIncomingCallNotification(call: Call): void {
  const notification = new Notification(`${typeLabel} entrante`, {
    body: nombre,
    icon: '/favicon.ico',
    tag: 'incoming-call',
    requireInteraction: true,
  });
  notification.onclick = () => {
    window.focus();
    this.acceptIncomingCall();
    notification.close();
  };
}
```

**Ciclo de vida de una llamada:**

```
1. Device registrado → escuchando
2. incoming event → extractCallInfo() → showIncomingCallNotification() → callback
3. call.accept() → callStartedAt = now
                  → startRecording(parentCallSid) [fire-and-forget]
                  → dismissNotification()
4. Llamada activa → softphone visible
5. call.disconnect() → durationMs = now - callStartedAt
                     → if durationMs >= 5000: notifyCallEnd() [fire-and-forget]
                     → callback (estado libre)
```

**startRecording(parentCallSid):**
```typescript
// Fire-and-forget: no bloquea la llamada si falla
async startRecording(parentCallSid: string): Promise<void> {
  try {
    await authenticatedEdgeFetch(START_RECORDING_ENDPOINT, {
      method: 'POST',
      body: { parentCallSid }
    })
  } catch (err) {
    console.warn('Recording start failed — continuing call')
  }
}
```

**notifyCallEnd() — filtro anti-duplicado:**
```typescript
// Solo notifica si la llamada duro >= 5 segundos
// Previene doble webhook: transfer disconnect (~166ms) + real call (~40s)
if (startedAt) {
  const durationMs = Date.now() - new Date(startedAt).getTime()
  if (durationMs < MIN_CALL_DURATION_MS) {
    console.log(`Skipping — duration ${durationMs}ms < ${MIN_CALL_DURATION_MS}ms`)
    return
  }
}
```

### voiceTransferService.ts (191 lineas)

Servicio para transferencias VoIP entre miembros del equipo.

**Metodos:**

| Metodo | Proposito |
|--------|-----------|
| `getOnlineTeamMembers(coordinacionIds)` | Obtiene usuarios online via RPC |
| `transferCall(params)` | Ejecuta transferencia via Edge Function |
| `subscribeToTransfers(userId, cb)` | Suscripcion Realtime a `voice_transfers` |

**Admin handling:** El metodo `getOnlineTeamMembers` NO filtra por array vacio. Admin puede tener 0 coordinaciones y aun asi el RPC retorna todos los usuarios online (el RPC detecta admin server-side).

### useTwilioVoice.ts (~120 lineas)

React hook con reference counting para multiples componentes.

```typescript
const { isReady, isIncoming, activeCall, incomingCallInfo } = useTwilioVoice()
```

**Reference counting:** Multiples componentes pueden usar el hook. El Device se inicializa en el primer mount y se destruye en el ultimo unmount.

---

## Frontend: Componentes UI

### VoiceSoftphoneModal.tsx (~600 lineas)

Softphone flotante draggable que aparece al recibir una llamada entrante.

**Controles:**
| Boton | Icono | Accion |
|-------|-------|--------|
| Aceptar | Phone | `call.accept()` |
| Colgar | PhoneOff | `call.disconnect()` |
| Mute | Mic/MicOff | `call.mute(toggle)` |
| Pausar | Pause/Play | Hold via toggle |
| Transferir | ArrowRightLeft | Abre VoiceTransferModal |

**Props clave:**
- `parentCallSid` — necesario para transferir
- `coordinacionId` — filtro de equipo para modal transfer
- `onTransfer()` — callback que abre el modal

**Tabs de informacion:**
1. Observaciones (notas del prospecto)
2. Datos Prospecto (info del CRM)
3. Chat (historial WhatsApp)

**Comportamiento:**
- Draggable con Framer Motion
- Auto-minimiza a burbuja con heartbeat si se pierde foco
- z-index: 90 (sobre contenido, debajo de modales criticos)

### VoiceTransferModal.tsx (287 lineas)

Modal para seleccionar destino de transferencia VoIP.

**Grupos de rol (en orden de prioridad):**

| Grupo | Icono | Color | Roles que incluye |
|-------|-------|-------|-------------------|
| Administradores | Crown | Rojo | `admin` |
| Coordinadores | Crown | Amber | `coordinador` |
| Supervisores | Shield | Morado | `supervisor` |
| Ejecutivos | User | Azul | `ejecutivo`, `ejecutivo_pisos` |

**Cada miembro muestra:**
- Avatar con iniciales (fondo gradient)
- Nombre completo
- Badge de rol con color
- Punto verde (online)
- Coordinaciones asignadas (solo visible para admin)

**Flujo de interaccion:**
1. Se abre el modal → llama RPC `get_online_team_members`
2. Usuarios se agrupan por rol, ordenados por nombre
3. Click en usuario → confirmacion
4. Confirmacion → `voiceTransferService.transferCall()`
5. Loading state durante transfer
6. Exito → toast + cierra modal + softphone se cierra

**Validacion UUID (fix):**
```typescript
// Filtra strings vacios para evitar error "invalid input syntax for type uuid"
const rawIds = userCoordinacionIds.length > 0 ? userCoordinacionIds : [coordinacionId]
const coordIds = rawIds.filter(id => id && id.trim() !== '')
```

### CallCard.tsx (334 lineas)

Card en el widget lateral que muestra resumen de llamada activa.

**3 estados visuales:**
1. **Normal** — card con datos de llamada VAPI (checkpoint, ejecutivo, duracion)
2. **Incoming** — indicador de llamada entrante Twilio (pulsante verde)
3. **Active** — llamada VoIP activa con controles

**Props de permisos (por rol):**
```typescript
canTransferHere?: boolean    // Supervisor puede tomar esta llamada
canOnlyListen?: boolean      // Supervisor ya la tiene, ejecutivo solo escucha
onTransferHere?: () => void  // Callback para "Transferir Aqui"
```

---

## Base de Datos

### Tabla: voice_transfers

Audit trail y notificaciones Realtime para transferencias VoIP.

```sql
CREATE TABLE voice_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  llamada_call_id TEXT NOT NULL,
  parent_call_sid TEXT NOT NULL,
  prospecto_id UUID NOT NULL,
  coordinacion_id UUID NOT NULL,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','ringing','connected','completed','failed','rejected','timeout')),
  prospecto_nombre TEXT,
  from_user_name TEXT,
  to_user_name TEXT,
  tipo_llamada TEXT,
  from_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  connected_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

**Realtime habilitado** — el frontend se suscribe para notificaciones push de transferencias entrantes.

**RLS:** Usuarios pueden ver sus propios transfers (from_user_id o to_user_id). Service role tiene acceso completo.

### RPC: get_online_team_members(p_coordinacion_ids UUID[])

**Tipo:** SECURITY DEFINER
**Proposito:** Retorna usuarios online de las coordinaciones solicitadas.

**Logica (3 ramas):**
1. **`auth.uid()` IS NULL (N8N/Postgres directo):** Retorna miembros online de las coordinaciones solicitadas + admins online (sin filtro coordinacion)
2. **Admin path (`auth.uid()` presente, rol admin):** Retorna TODOS los usuarios online sin filtro de coordinacion
3. **Non-admin path:** Filtra por `auth_user_coordinaciones` intersectando con `p_coordinacion_ids`

**Filtros:**
- `active_sessions.last_activity > NOW() - '2 min'` (online)
- `is_operativo = true` (solo operativos)
- Excluye al caller (no transferir a si mismo) — solo cuando `auth.uid()` NO es NULL

**Retorna:**
```sql
(user_id UUID, full_name TEXT, role_name VARCHAR, coordinacion_ids UUID[])
```

**Rama NULL (N8N via Postgres directo):**
```sql
IF auth.uid() IS NULL THEN
  -- Retorna miembros online de la coordinacion (sin self-exclusion)
  RETURN QUERY SELECT ... WHERE coordinacion = ANY(p_coordinacion_ids);
  -- Tambien retorna admins online (sin filtro de coordinacion)
  RETURN QUERY SELECT ... WHERE role_name = 'admin' AND is_active AND last_activity > NOW() - '2 min';
  RETURN;
END IF;
```

**Bug corregido (2026-03-12):** Antes, `AND up.id != auth.uid()` con `auth.uid() = NULL` evaluaba a NULL (falsy), filtrando TODOS los resultados. La rama NULL resuelve esto.

**Seguridad admin (PostgREST):**
```sql
DECLARE v_is_admin BOOLEAN := false;
BEGIN
  SELECT (up.role_name = 'admin') INTO v_is_admin
  FROM user_profiles_v2 up WHERE up.id = auth.uid();

  IF v_is_admin THEN
    -- Return ALL online users without coordinacion filter
  ELSE
    -- Filter by p_coordinacion_ids (original behavior)
  END IF;
END;
```

**Importante:** `auth.uid()` es server-side y no puede ser spoofed desde el cliente. Solo usuarios con rol `admin` en la BD obtienen privilegios elevados.

---

## Seguridad

### Modelo de Permisos por Capa

| Capa | Validacion | Quien valida |
|------|-----------|-------------|
| **Edge Function** `voice-transfer` | Caller Y target en misma coordinacion | Server-side (service_role) |
| **Edge Function** `voice-transfer` | Admin bypass coordinacion | Server-side (`user_profiles_v2.role_name`) |
| **RPC** `get_online_team_members` | Admin ve todos, otros ven coordinacion | Server-side (`auth.uid()`) |
| **Frontend Store** | `loadActiveCalls()` filtra por coordinacion | `getCoordinacionesFilter()` |
| **Frontend CallCard** | Compara `user.role_name` + coordinacion | Client-side (UI only) |
| **Frontend Modal** | Solo muestra resultado de RPC | Pre-filtrado server-side |

### Principios de Seguridad

1. **Server-side first:** Toda validacion critica en Edge Functions y RPCs. Frontend es solo UI.
2. **Admin detection via auth.uid():** Imposible de spoofear. El JWT contiene el user_id verificado por Supabase.
3. **Aislamiento cross-coordinacion:** Edge Function `voice-transfer` es el checkpoint critico. Frontend comprometido no puede transferir fuera de su coordinacion.
4. **Credenciales nunca en frontend:** Twilio API Keys solo existen como Supabase secrets. Recording URLs con Basic Auth solo viajan Edge Function → N8N.
5. **Webhook protegido:** La URL del webhook N8N solo existe en la Edge Function `voice-call-end`. Frontend solo conoce el endpoint de la Edge Function.

### Roles y Privilegios

| Rol | Transferir | Ver online | Bypass coordinacion | Tomar llamada |
|-----|-----------|-----------|---------------------|---------------|
| admin | Cualquiera | Todos | Si | Cualquiera |
| coordinador | Su coordinacion | Su coordinacion | No | Su coordinacion |
| supervisor | Su coordinacion | Su coordinacion | No | Su coordinacion |
| ejecutivo | Su coordinacion | Su coordinacion | No | Solo asignadas |

---

## Grabacion de Llamadas

### Problema Original

El webhook recibia la grabacion de VAPI (conversacion con la IA) en lugar de la grabacion de Twilio (conversacion ejecutivo-prospecto).

**Causa raiz:** `voice-call-end` hacia fallback a `audio_ruta_bucket` de la tabla `llamadas_ventas`, que contiene la grabacion de VAPI, no la de Twilio.

### Solucion Implementada

**3 cambios coordinados:**

1. **voice-start-recording (nueva Edge Function):** Inicia grabacion Twilio con `RecordingChannels: dual` cuando el ejecutivo acepta la llamada en el browser. Invocada fire-and-forget desde el frontend.

2. **voice-call-end (v5):** Removido el fallback a `audio_ruta_bucket`. Solo busca grabacion en Twilio REST API con 4 retries.

3. **voice-transfer TwiML:** Incluye `record="record-from-answer-dual"` para que las llamadas transferidas tambien se graben automaticamente.

### Flujo de Grabacion

```
Llamada aceptada en browser
       |
       v
Frontend → startRecording(parentCallSid) [fire-and-forget]
       |
       v
Edge Function voice-start-recording
       |
       v
Twilio REST: POST /Calls/{sid}/Recordings.json
             RecordingChannels: dual
       |
       v
Grabacion activa (dual-channel: ejecutivo L, prospecto R)
       |
       ...llamada en progreso...
       |
       v
Llamada termina (disconnect)
       |
       v
Frontend → notifyCallEnd() [si duracion >= 5s]
       |
       v
Edge Function voice-call-end
       |
       v
Twilio REST: GET /Calls/{sid}/Recordings.json
             (4 retries, 3s delay — grabacion puede tardar en procesarse)
       |
       v
Construir URL: https://KEY:SECRET@api.twilio.com/.../Recordings/{recSid}.mp3
       |
       v
POST → N8N webhook end-call-whatsapp
       (header: 2025_livechat_auth)
```

### Filtro Anti-Duplicado

**Problema:** Cuando se transfiere una llamada, el agente original se desconecta (~166ms) y dispara `notifyCallEnd`. Luego cuando la llamada real termina (~40s), dispara otro `notifyCallEnd`. Resultado: dos webhooks para la misma llamada.

**Solucion:** `MIN_CALL_DURATION_MS = 5000` en `twilioVoiceService.ts`. Si la llamada duro menos de 5 segundos, no se notifica.

```
Transfer disconnect: ~166ms → SKIP (< 5000ms)
Real call end:       ~40s   → NOTIFY (>= 5000ms)
```

---

## Autenticacion N8N Webhook

### Patron de Autenticacion

El webhook `end-call-whatsapp` en N8N usa Header Auth:

| Campo | Valor |
|-------|-------|
| Header Name | `2025_livechat_auth` |
| Header Value | Valor del Supabase secret `LIVECHAT_AUTH` |

**Mismo patron usado por:** `send-audio-proxy`, `send-message-proxy`, y otros proxies N8N.

**Flujo:**
```
Frontend → Edge Function voice-call-end (JWT auth)
                |
                v
         Edge Function → N8N webhook (header auth: 2025_livechat_auth)
```

El frontend NUNCA conoce el valor de `LIVECHAT_AUTH` ni la URL del webhook. Solo conoce el nombre de la Edge Function.

---

## Integracion N8N

### Workflow VAPI Transfer (qpk8xsMI50IWltFV)

Workflow principal de VAPI que maneja la IA conversacional Natalia. Cuando VAPI decide transferir, el workflow bifurca segun `tipo_llamada`:

```
                                    +--- [WhatsApp] ---> Prepare WhatsApp Transfer ---> Twilio REST redirect
Busqueda_did ---> Is WhatsApp? -----+
                                    +--- [PSTN] ---> Get Team Members ---> Build Bridge Context
                                                      → Insert Context → Transfer to Bridge (+523223080074)
                                                      (si nadie online → +528002233444 directo)
```

**Nodo "Prepare WhatsApp Transfer":**
- Construye TwiML con `<Dial><Client><Identity>agent_{ejecutivoId}</Identity>...</Client></Dial>`
- Incluye `<Parameter>` tags con metadata del prospecto
- Redirige via `POST /Calls/{callSid}.json`

**Referencia handover:** `.cursor/handovers/2026-03-10-n8n-whatsapp-transfer-bifurcation.md`

### Webhook end-call-whatsapp

Recibe datos de fin de llamada desde Edge Function `voice-call-end`:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| recording_url | string/null | URL MP3 con Basic Auth embebida |
| prospecto_id | uuid | ID del prospecto |
| ejecutivo_id | uuid | ID del ejecutivo que atendio |
| id_dynamics | string/null | ID en CRM Dynamics |
| timestamp_inicio | ISO string | Inicio de la llamada |
| timestamp_fin | ISO string | Fin de la llamada |
| call_sid | string/null | Twilio CallSid |
| llamada_id | string/null | ID en llamadas_ventas |

---

## Twilio: Configuracion

### TwiML App

| Campo | Valor |
|-------|-------|
| SID | `AP48f74825865727ecdd327e1c6c5c821f` |
| Nombre | PQNC Voice Client SDK |
| Proposito | Registrar Devices del browser para recibir llamadas |

### Identity Format

```
agent_{userId_con_underscores}
```

- UUID: `e8ced62c-3fd0-4328-b61a-a59ebea2e877`
- Identity: `agent_e8ced62c_3fd0_4328_b61a_a59ebea2e877`
- Transformacion: `uuid.replace(/-/g, '_')` (guiones → underscores, NO eliminados)
- Regex valido: `[a-zA-Z0-9_]` max 121 chars
- Debe coincidir con `sanitizeIdentity()` en `generate-twilio-token`

**Bug corregido (2026-03-12):** N8N Build Bridge Context usaba `replace(/-/g, '')` (eliminaba guiones) produciendo `agent_27c2cc8422df...`. El Device registraba `agent_27c2cc84_22df_...`. El mismatch causaba que todos los targets dieran `no-answer`.

### API Keys

Autenticacion via API Key (NO Auth Token):
- **Basic Auth:** `base64(API_KEY_SID:API_KEY_SECRET)`
- Usadas en Edge Functions y N8N
- Las credenciales estan como Supabase secrets

---

## Historial de Versiones

### Edge Functions

| Funcion | Version | Fecha | Cambios |
|---------|---------|-------|---------|
| voice-transfer | v1 | 2026-03-10 | Creacion inicial, transferencia fria basica |
| voice-transfer | v2-v5 | 2026-03-10 | Mejoras iterativas, fix TwiML, parametros |
| voice-transfer | v6 | 2026-03-11 | Admin bypass coordinacion, `record="record-from-answer-dual"` |
| voice-call-end | v1 | 2026-03-11 | Creacion, proxy a webhook N8N |
| voice-call-end | v2 | 2026-03-11 | Webhook tolerante a fallos |
| voice-call-end | v3 | 2026-03-11 | Auth header `2025_livechat_auth` |
| voice-call-end | v4 | 2026-03-11 | Removido fallback VAPI (`audio_ruta_bucket`) |
| voice-call-end | v5 | 2026-03-11 | Recording URL con Basic Auth embebida, respuesta sanitizada |
| voice-start-recording | v1 | 2026-03-11 | Creacion, inicia grabacion Twilio en accept |
| generate-twilio-token | v1 | 2026-03-10 | Creacion, JWT con jose |

### Frontend

| Version | Fecha | Cambios |
|---------|-------|---------|
| v2.31.6 | 2026-03-11 | Voice transfer system base |
| v2.31.7 | 2026-03-11 | voice-call-end auth + callStartedAt fix |
| v2.31.8 | 2026-03-11 | voice-start-recording + anti-duplicado + sin fallback VAPI |
| v2.31.9 | 2026-03-11 | Admin transfer all users + UUID fix + recording auth URL |
| v2.31.10 | 2026-03-11 | Admin group en transfer modal |
| v2.31.15+ | 2026-03-12 | PSTN Bridge Transfer con cascada + badge pstn_bridge |

### RPC

| Funcion | Fecha | Cambios |
|---------|-------|---------|
| get_online_team_members | 2026-03-10 | Creacion, SECURITY DEFINER |
| get_online_team_members | 2026-03-11 | Admin bypass: retorna todos los usuarios online |
| get_online_team_members | 2026-03-12 | Rama NULL auth.uid() para N8N + admins sin filtro coordinacion |

---

## Problemas Resueltos

### 1. WhatsApp a PSTN bloqueado por Twilio
**Problema:** Twilio bloquea conexiones WhatsApp -> PSTN ("can't connect to PSTN endpoints")
**Solucion:** Usar Twilio Voice Client SDK en el browser (`<Dial><Client>`) en lugar de PSTN

### 2. Grabacion de VAPI en lugar de Twilio
**Problema:** Webhook recibia grabacion de la IA (VAPI), no de la conversacion ejecutivo-prospecto
**Solucion:** Nueva Edge Function `voice-start-recording` + remover fallback a `audio_ruta_bucket`

### 3. Doble webhook por misma llamada
**Problema:** Transfer disconnect (~166ms) + real call end (~40s) enviaban 2 webhooks
**Solucion:** `MIN_CALL_DURATION_MS = 5000` filtra llamadas muy cortas

### 4. Admin no veia usuarios de otras coordinaciones
**Problema:** Admin tiene 0 coordinaciones en `auth_user_coordinaciones` → RPC no retornaba nada
**Solucion:** Admin bypass en RPC que retorna todos los usuarios online

### 5. Error UUID con string vacio
**Problema:** `invalid input syntax for type uuid: ""` al pasar coordinacionId vacio
**Solucion:** Filtrar strings vacios antes de llamar al RPC

### 6. Recording URL requiere autenticacion
**Problema:** URL de grabacion Twilio requiere Basic Auth → N8N no podia descargar
**Solucion:** Embeber credenciales en URL (`KEY:SECRET@api.twilio.com/...`)

### 7. Admin no aparecia como grupo en modal
**Problema:** `ROLE_GROUPS` no tenia grupo 'admin' → admins caian en default 'ejecutivo'
**Solucion:** Agregar grupo admin con Crown rojo

### 8. N8N webhook sin autenticacion
**Problema:** Edge Function POSTing sin auth header → 403
**Solucion:** Agregar header `2025_livechat_auth` con valor del secret `LIVECHAT_AUTH`

### 9. Llamadas PSTN caen al redirigir via Twilio REST API
**Problema:** VAPI usa SIP trunk. Redirigir el `parentCallSid` via Twilio REST API mata la sesion SIP (VAPI envia BYE)
**Solucion:** Bridge transfer via numero puente `+523223080074`. VAPI transfiere nativamente (SIP REFER), el puente sirve TwiML con cascada de `<Dial><Client>` targets

### 10. get_online_team_members retorna vacio desde N8N
**Problema:** N8N conecta via Postgres directo (no PostgREST), `auth.uid()` es NULL → `up.id != NULL` evalua a NULL (falsy), filtrando todos los resultados
**Solucion:** Agregar rama `IF auth.uid() IS NULL` con queries separadas sin self-exclusion + admins sin filtro coordinacion

### 11. Admins no aparecen en cascada bridge
**Problema:** Admin no tiene coordinacion asignada → filtrado por JOIN con coordinaciones
**Solucion:** Segunda query en rama NULL que retorna admins online sin filtro de coordinacion, + prioridad 0 en Build Bridge Context

### 12. Formato numero impide lookup de contexto bridge
**Problema:** N8N guarda `5213333243333` (formato WhatsApp 521) pero Twilio envia `+523333243333` (E.164 +52)
**Solucion:** Normalizar ultimos 10 digitos: `RIGHT(REGEXP_REPLACE(..., '[^0-9]'), 10)`

### 13. Identity mismatch en cascada bridge
**Problema:** Build Bridge Context usaba `replace(/-/g, '')` (elimina guiones) pero `generate-twilio-token` usa `replace(/-/g, '_')` (guiones→underscores). Ningún Device matcheaba → 17 targets con `no-answer`
**Solucion:** Cambiar a `replace(/-/g, '_')` en ambos Build Bridge Context nodes (implicito y explicito)

---

## Inventario de Archivos

| Archivo | Lineas | Proposito |
|---------|--------|-----------|
| `supabase/functions/generate-twilio-token/index.ts` | ~120 | JWT para Voice SDK |
| `supabase/functions/voice-transfer/index.ts` | 298 | Cold transfer entre agentes |
| `supabase/functions/voice-start-recording/index.ts` | 126 | Iniciar grabacion Twilio |
| `supabase/functions/voice-call-end/index.ts` | 245 | Proxy fin de llamada a N8N |
| `src/services/twilioVoiceService.ts` | ~570 | Twilio Device + call management + notificaciones sistema |
| `src/services/voiceTransferService.ts` | 191 | Transfer service + Realtime |
| `src/hooks/useTwilioVoice.ts` | ~120 | React hook con reference counting |
| `src/components/live-activity/VoiceSoftphoneModal.tsx` | ~600 | Softphone draggable |
| `src/components/live-activity/VoiceTransferModal.tsx` | 287 | Modal seleccion destino |
| `src/components/live-activity/LiveCallActivityWidget.tsx` | 573 | Orquestador principal |
| `src/components/live-activity/CallCard.tsx` | 334 | Card de llamada |
| `src/stores/liveActivityStore.ts` | 739 | Store Zustand |

---

## PSTN Bridge Transfer (Cascada)

**Fecha:** 2026-03-12 | **Estado:** Produccion Activa

### Problema

Las llamadas PSTN (outbound: VAPI llama al prospecto por telefono) pasan por el SIP trunk de VAPI. Cuando N8N intenta redirigir el `parentCallSid` via Twilio REST API, la sesion SIP muere — VAPI interpreta el redirect como BYE y la llamada cae. Las llamadas WhatsApp funcionan porque son Twilio nativo (sin SIP).

### Solucion: Numero Puente

Usar `+523223080074` como **puente**. N8N le dice a VAPI que transfiera nativamente al numero puente. VAPI hace la transferencia limpia (SIP REFER), se desconecta, y el prospecto queda en una llamada Twilio nativa. El puente sirve TwiML dinamico que conecta al ejecutivo via browser.

### Diagrama de Flujo

```
PROSPECTO              VAPI                 BRIDGE (+523223080074)              BROWSER(S)
    |                   |                          |                              |
    |<-- VAPI llama -->|                          |                              |
    |                   |-- tool: transfer ------->| N8N                          |
    |                   |                          | 1. get_online_team_members() |
    |                   |                          | 2. Ordena cascada targets    |
    |                   |                          | 3. INSERT bridge_context     |
    |                   |<- dest: +523223080074 ---|                              |
    |                   |== TRANSFER NATIVO ======>|                              |
    |                   X  (VAPI se desconecta)    |                              |
    |                                              |                              |
    |                                              |-- Voice URL (attempt=0) --->|
    |                                              |<- TwiML: <Dial><Client> ----|  Ejecutivo
    |                                              |=========== RING 25s =======>|
    |                                              |              no contesta     |
    |                                              |-- action URL (attempt=1) -->|
    |                                              |<- TwiML: <Dial><Client> ----|  Supervisor
    |                                              |=========== RING 25s =======>|
    |                                              |              ACEPTA!         |
    |<===================== CONECTADOS =========================================>|
```

### Cascada de Prioridad

| Orden | Rol | Criterio |
|-------|-----|----------|
| 0 | Admin | Siempre puede contestar cualquier llamada (sin filtro coordinacion) |
| 1 | Ejecutivo asignado | Si esta online |
| 2 | Supervisores | Online en la coordinacion |
| 3 | Coordinadores | Online en la coordinacion |
| 4 | Otros ejecutivos | Online en la coordinacion |
| 5 | Linea 800 | `+528002233444` (fallback final) |

Cada target tiene **25 segundos** para contestar. Si no contesta, Twilio llama el `action` URL del `<Dial>` y el webhook retorna TwiML con el siguiente target.

### Tabla: bridge_transfer_context

Tabla efimera que conecta la preparacion de la transferencia en N8N con el webhook del puente. TTL de 5 minutos.

```sql
CREATE TABLE bridge_transfer_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_number TEXT NOT NULL,              -- Lookup: numero del prospecto
  targets JSONB NOT NULL DEFAULT '[]',    -- Cascada ordenada por prioridad
  current_attempt INT NOT NULL DEFAULT 0,
  prospecto_id UUID,
  prospecto_nombre TEXT,
  llamada_call_id TEXT,
  coordinacion_id UUID,
  ejecutivo_id UUID,
  from_number_display TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ringing', 'connected', 'exhausted', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  connected_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes')
);
```

**Formato targets JSONB:**
```json
[
  { "identity": "agent_abc123", "name": "Karla Arellano", "role": "ejecutivo", "reason": "assigned" },
  { "identity": "agent_def456", "name": "Maria Lopez", "role": "supervisor", "reason": "supervisor_online" },
  { "identity": "agent_ghi789", "name": "Pedro Ruiz", "role": "coordinador", "reason": "coordinator_online" }
]
```

### N8N Workflows

#### Bridge Transfer Voice URL [PROD] (`q5kespj4S6iwn0pJ`)

Workflow nuevo con 2 webhooks que sirven TwiML dinamico al numero puente.

| Webhook | URL | Proposito |
|---------|-----|-----------|
| Voice URL | `POST /webhook/bridge-voice-url` | Twilio llama al recibir llamada en el puente. Busca contexto y sirve TwiML para target[0] |
| Cascade | `POST /webhook/bridge-cascade` | Twilio llama cuando `<Dial>` termina sin conexion. Avanza al siguiente target |

**TwiML generado (por cada target):**
```xml
<Response>
  <Dial timeout="25"
        callerId="{from_number_display}"
        record="record-from-answer-dual"
        action="https://primary-dev-d75a.up.railway.app/webhook/bridge-cascade?contextId={id}&attempt={N}">
    <Client>
      <Identity>{targets[N].identity}</Identity>
      <Parameter name="llamadaId" value="{llamada_call_id}"/>
      <Parameter name="prospectoId" value="{prospecto_id}"/>
      <Parameter name="prospectoNombre" value="{prospecto_nombre}"/>
      <Parameter name="tipoLlamada" value="pstn_bridge"/>
      <Parameter name="fromNumber" value="{from_number}"/>
      <Parameter name="coordinacionId" value="{coordinacion_id}"/>
      <Parameter name="parentCallSid" value="{bridge_CallSid}"/>
    </Client>
  </Dial>
</Response>
```

**TwiML final (todos agotados):**
```xml
<Response>
  <Dial timeout="30">
    <Number>+528002233444</Number>
  </Dial>
</Response>
```

**Normalizacion de numero en Lookup Context:**
```sql
RIGHT(REGEXP_REPLACE(from_number, '[^0-9]', '', 'g'), 10) =
RIGHT(REGEXP_REPLACE('{{ From }}', '[^0-9]', '', 'g'), 10)
```
Resuelve mismatch entre formato WhatsApp (`521XXXXXXXXXX`) y E.164 (`+52XXXXXXXXXX`) comparando solo los ultimos 10 digitos.

**Patron COALESCE:** N8N Postgres nodes retornan 0 items en queries vacios, lo que rompe nodos downstream. Solucion: `SELECT COALESCE((SELECT row_to_json(t)::text FROM (...) t), '{"status":"not_found"}') as context_json`

#### VAPI-Natalia_transfer_tool [PROD] (`qpk8xsMI50IWltFV`)

Workflow existente modificado. Bifurcacion por `tipo_llamada`:

```
Es Browser Transfer? True
  → Is WhatsApp?
    → True  → [path existente: Twilio REST redirect]
    → False → Get Team Members → Build Bridge Context → Insert Context → Transfer to Bridge (+523223080074)
Es Browser Transfer? False
  → Ejecuta_transfer (+528002233444)
```

10 nodos nuevos (5 por path implicito + 5 por path explicito):
- `Is WhatsApp?` — IF: `tipo_llamada == 'inbound_whatsapp'`
- `Get Team Members` — Postgres: `get_online_team_members()`
- `Build Bridge Context` — Code: construye cascada + INSERT SQL
- `Insert Bridge Context` — Postgres: ejecuta INSERT
- `Transfer to Bridge` — HTTP POST a VAPI controlUrl con `dest: +523223080074`

### Twilio: Numero Puente

| Campo | Valor |
|-------|-------|
| Numero | `+523223080074` |
| SID | `PNc65c54045567873f3272bdac5e5a6270` |
| Voice URL | `https://primary-dev-d75a.up.railway.app/webhook/bridge-voice-url` |
| VoiceMethod | POST |

### Frontend: Badge pstn_bridge

`VoiceSoftphoneModal.tsx` soporta `tipoLlamada === 'pstn_bridge'`:
- **Barra minimizada:** Badge naranja "PSTN"
- **Vista expandida:** Badge naranja "PSTN Bridge" con icono Phone

### Edge Cases

| Escenario | Comportamiento |
|-----------|---------------|
| Nadie online | N8N responde a VAPI con `dest: +528002233444` directo |
| Context lookup falla | Webhook puente retorna TwiML fallback (linea 800) |
| Ejecutivo no contesta (25s) | Cascada al siguiente target |
| Ningun target contesta | Ultimo action URL → `<Number>+528002233444</Number>` |
| 2 transfers simultaneos | Cada uno crea su context row. Lookup por from_number + pending |
| Re-transfer post-puente | Funciona — llamada es Twilio nativo |
| Target contesta | `DialCallStatus=completed` → no-op |

### Rollback

1. Revertir Voice URL de +523223080074 al twimlet voicemail
2. Revertir `Transfer to Bridge` en N8N para usar `target_phone` directo
3. `DROP TABLE bridge_transfer_context`
4. Badge frontend es cosmetico, no afecta funcionalidad

---

## Futuro (Roadmap)

| Feature | Descripcion | Prioridad |
|---------|-------------|-----------|
| Warm Transfer | Conferencia 3 vias antes de transferir (briefing) | Media |
| Coach/Whisper | Supervisor escucha/susurra durante llamada | Media |
| Cross-coordinacion | Admin/CALIDAD transfiere entre coordinaciones | Baja |
| Analytics | Dashboard de frecuencia, tiempo, exito por coordinacion | Baja |
| Outbound | Ejecutivo inicia llamada desde el browser | Planificado |
