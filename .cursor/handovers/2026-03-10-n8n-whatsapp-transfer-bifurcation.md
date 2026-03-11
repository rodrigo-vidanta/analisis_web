# Handover: N8N WhatsApp Transfer Bifurcation

**Fecha**: 2026-03-10
**Workflow**: `VAPI-Natalia_transfer_tool [PROD]` (ID: `qpk8xsMI50IWltFV`)
**Estado**: Documentado, pendiente autorizacion para aplicar

---

## Problema

Cuando VAPI decide transferir una llamada que origino por WhatsApp, el nodo `Ejecuta_transfer` envia:
```json
{
  "type": "transfer",
  "destination": {
    "type": "number",
    "number": "+52..."
  }
}
```

Esto FALLA porque Twilio bloquea conexiones WhatsApp -> PSTN.

## Solucion: Bifurcacion por `tipo_llamada`

### Nodos a agregar (3 nodos nuevos)

#### 1. Nodo IF: "Es WhatsApp?" (despues de `Busqueda_did`)

- **Tipo**: IF
- **Condicion**: `{{ $('Busqueda_prospecto').item.json.tipo_llamada }}` equals `inbound_whatsapp`
- **True**: → nodo "Transfer WhatsApp Client"
- **False**: → nodo existente `Ejecuta_transfer` (sin cambios)

#### 2. Nodo Code: "Prepare WhatsApp Transfer" (rama True)

```javascript
// Obtener datos necesarios para la transferencia via Twilio Client SDK
const llamada = $('Busqueda_prospecto').item.json;
const did = $('Busqueda_did').item.json;
const sanitizacion = $('Sanitizacion').item.json;

// El call_sid es el SID de Twilio (no el VAPI call_id)
const callSid = llamada.call_sid;
const prospecto = $('Retorna detalles prospecto').item.json;

if (!callSid) {
  throw new Error('No call_sid found - cannot redirect WhatsApp call');
}

// Construir identity del ejecutivo target
// Format: agent_{userId} con guiones reemplazados por _
const ejecutivoId = did.target_user_id || llamada.ejecutivo_id;
if (!ejecutivoId) {
  throw new Error('No ejecutivo_id found for transfer');
}
const identity = `agent_${ejecutivoId.replace(/-/g, '_')}`;

// TwiML para redirigir al Client SDK del ejecutivo
const twiml = `<Response><Dial><Client><Identity>${identity}</Identity><Parameter name="llamadaId" value="${llamada.call_id}"/><Parameter name="prospectoId" value="${prospecto.id}"/><Parameter name="prospectoNombre" value="${(prospecto.nombre_completo || prospecto.nombre_whatsapp || '').replace(/"/g, '')}"/><Parameter name="tipoLlamada" value="inbound_whatsapp"/><Parameter name="fromNumber" value="${prospecto.whatsapp || ''}"/></Client></Dial></Response>`;

return {
  json: {
    callSid,
    identity,
    twiml,
    llamadaCallId: llamada.call_id,
    prospectoId: prospecto.id,
    ejecutivoId,
  }
};
```

#### 3. Nodo HTTP Request: "Transfer WhatsApp Client" (despues del Code)

- **Method**: POST
- **URL**: `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/{{ $json.callSid }}.json`
- **Auth**: Basic Auth
  - Username: `${TWILIO_API_KEY_SID}`
  - Password: (API Key Secret - usar credential de N8N)
- **Body** (form-urlencoded):
  - `Twiml`: `{{ $json.twiml }}`
- **Headers**:
  - Content-Type: `application/x-www-form-urlencoded`

### Nodos a modificar

#### `Ejecuta_transfer2` (el retry de transferencia)

Misma bifurcacion IF + Code + HTTP que `Ejecuta_transfer`. Duplicar los 3 nodos para la rama retry.

### Flujo resultante

```
                                       ┌─── [WhatsApp] ──→ Prepare WhatsApp Transfer ──→ Twilio REST /Calls/{sid}
Busqueda_did ──→ Es WhatsApp? ──────────┤
                                       └─── [PSTN] ──→ Ejecuta_transfer (sin cambios)
```

### Datos disponibles en el workflow

| Dato | Fuente | Campo |
|------|--------|-------|
| call_sid (Twilio) | `Busqueda_prospecto` | `call_sid` |
| tipo_llamada | `Busqueda_prospecto` | `tipo_llamada` |
| ejecutivo_id | `Busqueda_did` | `target_user_id` |
| prospecto_id | `Retorna detalles prospecto` | `id` |
| nombre_completo | `Retorna detalles prospecto` | `nombre_completo` |
| whatsapp | `Retorna detalles prospecto` | `whatsapp` |
| VAPI call_id | `Busqueda_prospecto` | `call_id` |
| controlUrl | `Sanitizacion` | `controlUrl` |

### Credenciales necesarias en N8N

- Twilio API Key: `${TWILIO_API_KEY_SID}` (ya existe como credential "Claude Code API Key")
- Se puede reusar la credential existente de Twilio en N8N

### Validaciones importantes

1. **call_sid requerido**: Si la llamada no tiene `call_sid`, el redirect falla. Log error y devolver voicemail.
2. **Identity format**: Debe ser exactamente `agent_{uuid_sin_guiones}` para coincidir con el Access Token del browser.
3. **TwiML encoding**: Los `<Parameter>` permiten pasar metadata al browser. El frontend lee via `call.customParameters.get('llamadaId')`.
4. **Fallback**: Si el redirect falla (ejecutivo no conectado), Twilio ejecutara el fallback del TwiML App que es voicemail.

### Insert en transfer_requests (opcional, post-MVP)

Despues del redirect, insertar en `transfer_requests`:
```sql
INSERT INTO transfer_requests (llamada_call_id, prospecto_id, ejecutivo_id, call_sid, status, context_json)
VALUES ($1, $2, $3, $4, 'ringing', $5)
```

Esto permite al frontend trackear la transferencia via Realtime.

---

## Para aplicar estos cambios

1. Autorizar escritura en N8N workflow `qpk8xsMI50IWltFV`
2. Agregar 3 nodos (IF + Code + HTTP) despues de `Busqueda_did`
3. Reconectar las conexiones del IF → rama PSTN al `Ejecuta_transfer` existente
4. Testear con una llamada WhatsApp inbound real
5. Verificar que el browser recibe la llamada via Device.on('incoming')
