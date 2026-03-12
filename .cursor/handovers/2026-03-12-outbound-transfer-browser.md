# Handover: Outbound Transfer → Browser (sin PSTN)

**Fecha**: 2026-03-12
**Estado**: BD + Frontend implementados | N8N pendiente autorización

---

## Problema

Las llamadas outbound (AI → VAPI → PSTN → cliente) se transfieren al ejecutivo via PSTN usando `get_best_transfer_target()` que busca DID (`phone` en `user_profiles_v2`). Solo 16/58 usuarios tienen DID. Costo: ~$0.02/min por leg PSTN.

## Solución

Nueva función `get_best_browser_transfer_target()` que busca usuarios **online en browser** (via `active_sessions`) en vez de requerir DID. La llamada se redirige con `<Dial><Client>agent_{id}</Client></Dial>` al softphone del ejecutivo. Costo: $0.

---

## Cambios Implementados

### 1. BD: `get_best_browser_transfer_target(p_ejecutivo_id, p_coordinacion_id)`

**Tipo**: SECURITY DEFINER
**Schema**: public
**Retorna**: `(target_user_id UUID, target_identity TEXT, target_name TEXT, target_role TEXT, target_reason TEXT)`

**Cascada de 5 niveles:**

| Nivel | Quién | Filtro | is_operativo |
|-------|-------|--------|--------------|
| 1 | Ejecutivo asignado | `id = p_ejecutivo_id`, online | Sí (requerido) |
| 2 | Supervisor de la coordinación | `role = 'supervisor'`, online | No (supervisores son is_operativo=false) |
| 3 | Coordinador de la coordinación | `role = 'coordinador'`, online | No (coordinadores pueden ser is_operativo=false) |
| 4 | Cualquier ejecutivo online | `coordinacion_id = X`, online | Sí (requerido) |
| 5 | Fallback PSTN | `system_config.transfer_fallback_phone` o `+528002233444` | N/A |

**Online = `active_sessions.last_activity > NOW() - INTERVAL '2 minutes'`**

**Diferencias clave vs `get_best_transfer_target`:**
- Usa `active_sessions` (online en browser) en vez de `phone != ''` (tiene DID)
- Niveles 2 y 3 NO requieren `is_operativo` (supervisores/coordinadores son is_operativo=false por diseño)
- Usa `auth_user_coordinaciones` para multi-coordinación correcta
- Retorna `target_identity` (formato `agent_{uuid_sin_guiones}`) listo para TwiML `<Client>`
- Nivel 5 retorna `target_user_id = NULL` como señal para N8N de usar PSTN fallback

**Tests realizados (2026-03-12, datos en vivo):**

| Coordinación | Sin ejecutivo asignado → | Nivel |
|---|---|---|
| APEX | Cesar Hugo Fausto Balbuena (supervisor) | 2: supervisor_coordinacion |
| BOOM | Plazola Robles Karina Adamaris (ejecutivo) | 4: ejecutivo_disponible |
| COB ACA | Manuel Gomez Pompa (supervisor) | 2: supervisor_coordinacion |
| MVP | Adriana Diaz Garcia (ejecutivo) | 4: ejecutivo_disponible |
| VEN | Wendy Karina Vazquez Roque (ejecutivo) | 4: ejecutivo_disponible |

### 2. Frontend: `VoiceSoftphoneModal.tsx`

- Nueva prop `tipoLlamada?: string | null`
- Badges dinámicos por tipo:
  - `inbound_whatsapp` → Badge verde "WA" / "WhatsApp"
  - `outbound_transfer` → Badge azul "OUT" / "Outbound"
  - `transfer` → Badge morado "TRF" / "Transferencia"
- Backwards-compatible: `isWhatsAppCall` sigue funcionando como fallback

### 3. Frontend: `LiveCallActivityWidget.tsx`

- `softphoneCallData` ahora incluye `tipo_llamada` extraído de `incomingCallInfo.tipoLlamada`
- `VoiceSoftphoneModal` recibe `tipoLlamada` dinámico en vez de `isWhatsAppCall={true}` hardcoded

### 4. `twilioVoiceService.ts`

- Sin cambios necesarios — `extractCallInfo()` ya extrae `tipoLlamada` genéricamente de `customParameters`

---

## Cambios Pendientes en N8N (requiere autorización)

### Workflow: `VAPI-Natalia_transfer_tool [PROD]` (ID: `qpk8xsMI50IWltFV`)

**Cambio principal**: Reemplazar `get_best_transfer_target` por `get_best_browser_transfer_target` para llamadas outbound.

#### Nodo a modificar: `Busqueda_did` (o crear nuevo nodo)

**Query actual:**
```sql
SELECT * FROM get_best_transfer_target($ejecutivo_id, $coordinacion_id)
```

**Query nuevo:**
```sql
SELECT * FROM get_best_browser_transfer_target($ejecutivo_id, $coordinacion_id)
```

#### Nuevo nodo IF: "¿Target es browser o PSTN?"

- **Condición**: `{{ $json.target_user_id }}` is not empty (no es NULL)
- **True** → Browser transfer (nuevo Code node)
- **False** → PSTN fallback (nodo existente `Ejecuta_transfer`, usando `target_identity` como phone)

#### Nuevo Code node: "Prepare Browser Outbound Transfer"

```javascript
const target = $('Busqueda_target').item.json;
const prospecto = $('Retorna detalles prospecto').item.json;
const llamada = $('Busqueda_prospecto').item.json;

const callSid = llamada.call_sid;
if (!callSid) throw new Error('No call_sid - cannot redirect');

const identity = target.target_identity;

const twiml = `<Response>
  <Dial callerId="client:transfer" record="record-from-answer-dual">
    <Client>
      <Identity>${identity}</Identity>
      <Parameter name="parentCallSid" value="${callSid}"/>
      <Parameter name="llamadaId" value="${llamada.call_id}"/>
      <Parameter name="prospectoId" value="${prospecto.id}"/>
      <Parameter name="prospectoNombre" value="${(prospecto.nombre_completo || '').replace(/"/g, '')}"/>
      <Parameter name="fromNumber" value="${prospecto.whatsapp || ''}"/>
      <Parameter name="tipoLlamada" value="outbound_transfer"/>
      <Parameter name="coordinacionId" value="${llamada.coordinacion_id || ''}"/>
    </Client>
  </Dial>
</Response>`;

return { json: { callSid, identity, twiml, targetName: target.target_name, targetReason: target.target_reason } };
```

#### Nuevo HTTP Request node: "Twilio Redirect Browser"

- **Method**: POST
- **URL**: `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/{{ $json.callSid }}.json`
- **Auth**: Basic Auth (API Key SID + Secret)
- **Body**: `Twiml={{ $json.twiml }}`

### Flujo resultante

```
Busqueda_target (get_best_browser_transfer_target)
    │
    ├─ target_user_id != NULL ──→ Prepare Browser Transfer ──→ Twilio REST redirect
    │                                                           <Dial><Client>agent_{id}</Client>
    │
    └─ target_user_id IS NULL ──→ Ejecuta_transfer existente (PSTN fallback +528002233444)
```

### Nodo `Ejecuta_transfer2` (retry path)

Misma bifurcación. Duplicar los 3 nodos para la rama retry.

---

## Workflow Outbound: `Trigger llamada vapi [PROD]` (ID: `TnOvzPaammFaYuHL`)

Este workflow INICIA la llamada outbound (AI → VAPI → PSTN → cliente). **No requiere cambios** — la transferencia ocurre en `qpk8xsMI50IWltFV` cuando VAPI llama al tool `transferCall`.

Pero se necesita asegurar que el payload del workflow de trigger incluya `coordinacion_id` del prospecto, porque la función `get_best_browser_transfer_target` lo necesita.

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| BD: `get_best_browser_transfer_target()` | Nueva función SQL (SECURITY DEFINER) |
| `src/components/live-activity/VoiceSoftphoneModal.tsx` | Props + badges dinámicos por tipoLlamada |
| `src/components/live-activity/LiveCallActivityWidget.tsx` | Pasar tipoLlamada a softphoneCallData y VoiceSoftphoneModal |

## Para aplicar cambios N8N

1. Autorizar escritura en workflow `qpk8xsMI50IWltFV`
2. Modificar nodo `Busqueda_did` → usar `get_best_browser_transfer_target`
3. Agregar IF + Code + HTTP (3 nodos) para browser path
4. Reconectar rama PSTN fallback
5. Duplicar para `Ejecuta_transfer2` (retry)
6. Testear con una llamada outbound real
7. Verificar que el browser recibe la llamada con badge "Outbound"
