# Documentacion Backend: Sistema de Transferencias Voice

## Que es

Sistema que permite transferir llamadas VoIP activas entre miembros del mismo equipo (coordinacion). Un ejecutivo recibe una llamada y puede pasarla a un supervisor, otro ejecutivo, o coordinador.

## Flujo General

```
Prospecto llama por WhatsApp
        ↓
   Twilio recibe
        ↓
   N8N procesa (workflow qpk8xsMI50IWltFV)
        ↓
   VAPI atiende con IA (Natalia)
        ↓
   VAPI pide transferir → N8N genera TwiML
        ↓
   Twilio redirige llamada al browser del ejecutivo
   (via <Dial><Client>agent_{ejecutivoId}</Client></Dial>)
        ↓
   Ejecutivo atiende en browser (Twilio Voice SDK)
        ↓
   Ejecutivo quiere transferir a otro miembro
        ↓
   Frontend → Edge Function "voice-transfer"
        ↓
   Edge Function redirige parentCallSid via Twilio REST API
        ↓
   Nuevo miembro recibe la llamada en su browser
```

**Las re-transferencias NO pasan por N8N ni VAPI.** Van directo por la Edge Function.

---

## Base de Datos

### Tabla: `voice_transfers`

Registra cada transferencia realizada. Sirve como audit trail y para notificaciones Realtime.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID (PK) | Auto-generado |
| `llamada_call_id` | TEXT | ID de la llamada en `llamadas_ventas` |
| `parent_call_sid` | TEXT | CallSid de Twilio de la llamada original |
| `prospecto_id` | UUID | ID del prospecto |
| `coordinacion_id` | UUID | Coordinacion donde ocurre la transferencia |
| `from_user_id` | UUID (FK→auth.users) | Quien transfiere |
| `to_user_id` | UUID (FK→auth.users) | Quien recibe |
| `status` | TEXT | Estado actual (ver abajo) |
| `prospecto_nombre` | TEXT | Nombre del prospecto (para mostrar en UI) |
| `from_user_name` | TEXT | Nombre de quien transfiere |
| `to_user_name` | TEXT | Nombre de quien recibe |
| `tipo_llamada` | TEXT | Ej: `inbound_whatsapp` |
| `from_number` | TEXT | Numero del prospecto |
| `created_at` | TIMESTAMPTZ | Cuando se inicio la transferencia |
| `connected_at` | TIMESTAMPTZ | Cuando el destino acepto |
| `completed_at` | TIMESTAMPTZ | Cuando termino |

**Estados posibles de `status`:**
- `pending` → Se creo el registro, aun no suena
- `ringing` → Sonando en el browser del destino
- `connected` → El destino acepto la llamada
- `completed` → Llamada termino normalmente
- `failed` → Error tecnico (Twilio, red, etc)
- `rejected` → El destino rechazo la llamada
- `timeout` → El destino no contesto a tiempo

**Indices:**
- `from_user_id` — buscar transferencias enviadas
- `to_user_id` — buscar transferencias recibidas
- `parent_call_sid` — buscar por llamada Twilio

**RLS:** Cada usuario solo ve transfers donde es `from_user_id` o `to_user_id`. `service_role` tiene acceso completo.

**Realtime:** Habilitado. El frontend se suscribe para recibir notificaciones cuando alguien transfiere una llamada hacia el usuario.

---

### Funcion RPC: `get_online_team_members`

```sql
get_online_team_members(p_coordinacion_ids UUID[]) → SETOF RECORD
```

**Que hace:** Retorna los usuarios que estan online en las coordinaciones indicadas.

**Como determina "online":** Cruza estas tablas:
- `auth.users` → datos del usuario (nombre)
- `auth_user_coordinaciones` → a que coordinaciones pertenece
- `active_sessions` → sesiones activas con `last_activity > NOW() - '2 min'`

**Seguridad:** `SECURITY DEFINER` — se ejecuta con permisos del owner, no del caller. Esto es necesario porque lee `auth.users` (tabla interna de Supabase).

**Excluye** al usuario que hace la llamada (`auth.uid()`), para que no se vea a si mismo en la lista.

**Retorna:**
```
user_id        UUID      — ID del usuario
full_name      TEXT      — Nombre completo
role_name      TEXT      — Rol (ejecutivo, supervisor, coordinador)
coordinacion_ids UUID[]  — Coordinaciones a las que pertenece
```

---

## Edge Function: `voice-transfer`

**URL:** `POST https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/voice-transfer`

**Que hace:** Recibe la solicitud de transferencia del frontend y ejecuta el redirect en Twilio.

### Request

**Headers:**
- `Authorization: Bearer <jwt>` — Token JWT del usuario logueado
- `apikey: <anon_key>` — Clave publica de Supabase
- `Content-Type: application/json`

**Body:**
```json
{
  "parentCallSid": "CA3e8a60162d...",
  "targetUserId": "084ee6fd-27fb-41e7-...",
  "coordinacionId": "3f41a10b-60b1-4c2b-...",
  "llamadaCallId": "019cdb3f-d64e-...",
  "prospectoId": "7ef9d8fe-dbd6-49eb-...",
  "prospectoNombre": "Juan Perez",
  "fromNumber": "+525512345678",
  "tipoLlamada": "inbound_whatsapp"
}
```

### Que hace internamente (paso a paso)

1. **Valida JWT** — Extrae `user_id` del token
2. **Obtiene nombre del caller** — Consulta `auth.users` con `service_role`
3. **Valida permisos** — Verifica que AMBOS (caller y target) pertenecen a `coordinacionId` consultando `auth_user_coordinaciones`
4. **Verifica target online** — Consulta `active_sessions` del target (actividad < 5 min)
5. **Obtiene nombre del target** — Para mostrar en UI
6. **Construye TwiML:**
```xml
<Response>
  <Dial>
    <Client>
      <Identity>agent_084ee6fd_27fb_41e7_a16b_f9f717714eab</Identity>
      <Parameter name="llamadaId" value="019cdb3f-d64e-..." />
      <Parameter name="prospectoId" value="7ef9d8fe-dbd6-..." />
      <Parameter name="prospectoNombre" value="Juan Perez" />
      <Parameter name="tipoLlamada" value="inbound_whatsapp" />
      <Parameter name="fromNumber" value="+525512345678" />
      <Parameter name="parentCallSid" value="CA3e8a60162d..." />
      <Parameter name="coordinacionId" value="3f41a10b-60b1-..." />
      <Parameter name="transferredBy" value="agent_e8ced62c_3fd0_..." />
      <Parameter name="transferredByName" value="Maria Lopez" />
    </Client>
  </Dial>
</Response>
```
7. **Llama Twilio REST API:**
```
POST https://api.twilio.com/2010-04-01/Accounts/{SID}/Calls/{parentCallSid}.json
Body: Twiml=<el TwiML de arriba>
Auth: Basic (TWILIO_API_KEY_SID:TWILIO_API_KEY_SECRET)
```
Esto redirige la llamada original al nuevo destino.

8. **Inserta en `voice_transfers`** con status `ringing`

### Response

**Exito (200):**
```json
{
  "success": true,
  "transferId": "uuid-del-registro",
  "targetIdentity": "agent_084ee6fd_27fb_...",
  "targetName": "Carlos Garcia"
}
```

**Error (400/401/403/500):**
```json
{
  "error": "Mensaje descriptivo del error"
}
```

**Errores posibles:**
- `No autorizado` — JWT invalido o ausente
- `Faltan campos requeridos` — Body incompleto
- `No tienes permiso para transferir en esta coordinacion` — Caller no pertenece a la coordinacion
- `El destino no pertenece a esta coordinacion` — Target no pertenece
- `El destino no esta conectado` — Target sin sesion activa reciente
- `Error al redirigir llamada en Twilio` — Twilio REST API fallo

### Secrets de Supabase requeridos

Estos ya estan configurados como secrets del proyecto:
- `TWILIO_ACCOUNT_SID` — Account SID de Twilio
- `TWILIO_API_KEY_SID` — API Key para auth
- `TWILIO_API_KEY_SECRET` — Secret de la API Key
- `TWILIO_TWIML_APP_SID` — TwiML App ID (para el Client SDK)

---

## N8N: Workflow de Transfer (qpk8xsMI50IWltFV)

**Nombre:** VAPI-Natalia_transfer_tool [PROD]
**Servidor:** `primary-dev-d75a.up.railway.app`
**Nodos relevantes:** 45 total, 2 nodos Code modificados

### Que cambio

Los nodos `Prepare WhatsApp Transfer` y `Prepare WhatsApp Transfer (explicito)` generan el TwiML que Twilio usa para conectar al ejecutivo. Se agregaron 2 Parameters nuevos:

```xml
<Parameter name="parentCallSid" value="{callSid}" />
<Parameter name="coordinacionId" value="{coordinacion_id}" />
```

**Antes:** El ejecutivo recibia la llamada pero no tenia forma de saber el `parentCallSid` (necesario para redirigir la llamada a otro miembro).

**Ahora:** El browser del ejecutivo recibe estos datos y puede usarlos para transferir.

### De donde salen los datos

- `parentCallSid` = `call_sid` de la tabla `llamadas_ventas` (es el CallSid de Twilio de la llamada original)
- `coordinacionId` = `coordinacion_id` de la tabla `llamadas_ventas` (la coordinacion del prospecto)

Ambos campos ya existian en los queries del workflow. No se necesitaron cambios en la BD.

---

## Identity de Twilio Client

El formato de identity para cada usuario es:

```
agent_{userId_con_guiones_bajos}
```

Ejemplo: usuario `e8ced62c-3fd0-4328-b61a-a59ebea2e877` → `agent_e8ced62c_3fd0_4328_b61a_a59ebea2e877`

Reglas:
- Prefijo `agent_`
- UUID del usuario con `-` reemplazados por `_`
- Max 121 caracteres
- Solo `[a-zA-Z0-9_]`

Esta identity se usa tanto en el TwiML (`<Identity>`) como en el token JWT que genera `generate-twilio-token`.

---

## Tablas relacionadas (ya existentes)

| Tabla | Rol en el sistema |
|-------|-------------------|
| `llamadas_ventas` | Registro de la llamada original (contiene `call_sid`, `coordinacion_id`, `prospecto`) |
| `auth_user_coordinaciones` | Relacion usuario ↔ coordinacion (para validar permisos) |
| `active_sessions` | Sesiones activas con `last_activity` (para saber quien esta online) |
| `auth.users` | Datos del usuario (nombre, email) |

---

## Seguridad (5 capas)

1. **Edge Function** — Valida que caller Y target pertenecen a la misma coordinacion. Es la capa critica. Aunque el frontend se comprometa, no puede transferir fuera de la coordinacion.

2. **RPC `get_online_team_members`** — Solo retorna usuarios de las coordinaciones que se le piden. Un usuario malicioso no puede ver miembros de otra coordinacion.

3. **RLS en `voice_transfers`** — Cada usuario solo ve sus propios transfers.

4. **JWT requerido** — Todas las operaciones requieren sesion activa.

5. **Frontend** — Filtra adicionalmente por coordinacion y rol, pero es solo UX (la seguridad real esta server-side).

---

## Como probar

1. Necesitas 2 usuarios de la misma coordinacion logueados en 2 browsers
2. Genera una llamada WhatsApp que llegue al ejecutivo 1 (via VAPI → N8N)
3. El ejecutivo 1 ve el boton "Transferir" en el softphone
4. Click → aparece modal con el ejecutivo 2 como "online"
5. Click en ejecutivo 2 → llamada se redirige
6. Ejecutivo 2 recibe incoming en su browser
7. Verifica en BD: `SELECT * FROM voice_transfers ORDER BY created_at DESC LIMIT 5;`
