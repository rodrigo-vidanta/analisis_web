# Handover: PSTN Bridge Transfer System

**Fecha**: 2026-03-12
**Estado**: Implementado y probado E2E
**Version**: v2.31.15+

---

## Resumen Ejecutivo

Se implemento un sistema de **Bridge Transfer** para resolver el problema critico donde las llamadas PSTN outbound de VAPI no podian ser transferidas a ejecutivos en el browser. La solucion usa el numero `+523223080074` como puente intermedio con una cascada automatica de fallback.

---

## Problema Original

Cuando VAPI realiza llamadas outbound (PSTN), el SIP trunk de VAPI controla la sesion. Al intentar redirigir el `parentCallSid` via Twilio REST API (`POST /Calls/{sid}.json`), VAPI interpreta el redirect como un SIP BYE y **la llamada cae**. Las llamadas WhatsApp no tienen este problema porque son Twilio nativo (sin SIP).

---

## Solucion: Numero Puente con Cascada

En vez de redirigir el call SID (que mata el SIP), N8N le dice a VAPI que **transfiera nativamente** al numero puente `+523223080074`. VAPI hace la transferencia limpia (SIP REFER), se desconecta, y el prospecto queda en una llamada Twilio nativa. El puente sirve TwiML dinamico que conecta al ejecutivo via browser con cascada automatica.

### Flujo Completo

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
    |<========= LLAMADA VIVA ==================== >|                              |
    |                                              |-- TwiML <Dial><Client> ---->|
    |                                              |=========== RING 25s =======>|  Admin
    |                                              |              no contesta     |
    |                                              |-- cascade attempt=1 ------->|  Ejecutivo
    |                                              |=========== RING 25s =======>|
    |                                              |              ACEPTA!         |
    |<===================== CONECTADOS =========================================>|
    |                                              |         grabacion activa      |
```

### Prioridad de Cascada

| Prioridad | Rol | Razon |
|-----------|-----|-------|
| 0 | Admin | `admin_online` - Siempre pueden contestar cualquier llamada |
| 1 | Ejecutivo asignado | `assigned` - Primer contacto logico |
| 2 | Supervisores | `supervisor_online` - Escalacion inmediata |
| 3 | Coordinadores | `coordinator_online` - Escalacion directiva |
| 4 | Otros ejecutivos | `team_online` - Misma coordinacion |
| 5 | Linea 800 | Fallback final si nadie contesta |

---

## Componentes Implementados

### 1. Base de Datos

#### Tabla `bridge_transfer_context`
```sql
CREATE TABLE bridge_transfer_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_number TEXT NOT NULL,          -- Numero del prospecto (lookup)
  targets JSONB NOT NULL DEFAULT '[]', -- Cascada ordenada de targets
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

- **TTL**: 5 minutos (auto-expiracion)
- **Status lifecycle**: `pending` → `ringing` → `connected` | `exhausted` | `expired`
- **RLS**: Habilitado, solo service_role puede leer/escribir

#### Formato `targets` JSONB
```json
[
  { "identity": "agent_e8ced62c_3fd0_4328_b61a_a59ebea2e877", "name": "Samuel Rosales", "role": "admin", "reason": "admin_online" },
  { "identity": "agent_27c2cc84_22df_4fb3_a761_543c31b06d74", "name": "Karla Arellano", "role": "ejecutivo", "reason": "assigned" }
]
```

**IMPORTANTE**: El formato de identity es `agent_{uuid_con_underscores}`. Los guiones del UUID se reemplazan por underscores (`replace(/-/g, '_')`), NO se eliminan. Esto debe coincidir con el formato de `generate-twilio-token` Edge Function que usa `sanitizeIdentity()`.

#### Funcion `get_online_team_members` (modificada)

Se agrego una rama para llamadas de servicio (N8N via Postgres directo) donde `auth.uid()` es NULL:

```sql
IF auth.uid() IS NULL THEN
  -- Retorna miembros online de la coordinacion
  RETURN QUERY SELECT ... WHERE coordinacion = ANY(p_coordinacion_ids);
  -- Tambien retorna admins online (sin filtro de coordinacion)
  RETURN QUERY SELECT ... WHERE role_name = 'admin';
  RETURN;
END IF;
```

**Bug corregido**: Antes, `AND up.id != auth.uid()` con `auth.uid() = NULL` evaluaba a NULL (falsy), filtrando TODOS los resultados.

### 2. N8N Workflows

#### Workflow 1: `qpk8xsMI50IWltFV` — VAPI-Natalia_transfer_tool [PROD]

Workflow existente de 57 nodos. Se agregaron 10 nodos para el path PSTN bridge (5 por cada ruta: implicita y explicita).

**Nodos agregados por ruta**:

| Nodo | Tipo | Funcion |
|------|------|---------|
| `Is WhatsApp?` | IF | Verifica `tipo_llamada` — WhatsApp va a browser transfer, PSTN va a bridge |
| `Get Team Members` | Postgres | `SELECT * FROM get_online_team_members(ARRAY[coordinacion_id])` |
| `Build Bridge Context` | Code | Construye cascada de targets ordenados por prioridad + genera INSERT SQL |
| `Insert Bridge Context` | Postgres | Ejecuta el INSERT en `bridge_transfer_context` |
| `Transfer to Bridge` | HTTP | POST a VAPI controlUrl con `destination.number = "+523223080074"` |

**Flujo de decision**:
```
Es Browser Transfer?
  → [True] Is WhatsApp?
    → [WhatsApp] Fetch VAPI CallSid → Redirect (flujo existente)
    → [PSTN] Get Team Members → Build Bridge Context → Insert → Transfer to Bridge
  → [False] Ejecuta_transfer (PSTN directo, flujo legacy)
```

#### Workflow 2: `q5kespj4S6iwn0pJ` — Bridge Transfer Voice URL [PROD]

Workflow nuevo de 16 nodos con 2 webhooks:

**Webhook 1**: `POST /webhook/bridge-voice-url`
Twilio llama esto cuando el puente recibe la llamada.

```
Webhook → Lookup Context (Postgres) → Build Voice URL TwiML (Code) → Has Context? (IF)
  → [True] Mark Ringing (Postgres) → Respond TwiML
  → [False] Respond Fallback (TwiML → linea 800)
```

**Lookup Context** usa normalizacion de numero:
```sql
RIGHT(REGEXP_REPLACE(from_number, '[^0-9]', '', 'g'), 10) =
RIGHT(REGEXP_REPLACE('{{ From }}', '[^0-9]', '', 'g'), 10)
```
Esto resuelve el mismatch entre formato WhatsApp (`521XXXXXXXXXX`) y E.164 (`+52XXXXXXXXXX`).

**Webhook 2**: `POST /webhook/bridge-cascade?contextId={id}&attempt={N}`
Twilio llama esto cuando un `<Dial>` termina sin conexion.

```
Webhook → Parse Cascade Params (Code) → Call Connected? (IF)
  → [True] Mark Connected (Postgres) → Respond Connected (<Response/>)
  → [False] Get Context (Postgres) → Next Target TwiML (Code) → Update Attempt → Respond Cascade TwiML
```

### 3. Twilio

- **Numero puente**: `+523223080074` (SID: `PNc65c54045567873f3272bdac5e5a6270`)
- **Voice URL**: `https://primary-dev-d75a.up.railway.app/webhook/bridge-voice-url`
- **Antes**: Apuntaba a twimlet de voicemail
- **Rollback**: Revertir Voice URL al twimlet original

### 4. Frontend

#### `twilioVoiceService.ts` — Notificaciones del Sistema

Se agrego soporte para **notificaciones nativas del OS** (Windows/Mac) al recibir llamadas entrantes:

```typescript
private showIncomingCallNotification(call: Call): void {
  const notification = new Notification(`${typeLabel} entrante`, {
    body: nombre,
    icon: '/favicon.ico',
    tag: 'incoming-call',
    requireInteraction: true,  // Persiste hasta interaccion
  });
  notification.onclick = () => {
    window.focus();              // Trae browser al frente
    this.acceptIncomingCall();   // Acepta la llamada
    notification.close();
  };
}
```

- Solicita permiso al inicializar el Twilio Device
- Click en notificacion = aceptar + focus
- Se auto-cierra si la llamada se cancela/rechaza/acepta por otro medio

#### `VoiceSoftphoneModal.tsx` — Badge PSTN

Se agrego deteccion de `tipoLlamada === 'pstn_bridge'` con badge naranja:
- Minimizado: `PSTN` (naranja compacto)
- Expandido: `PSTN Bridge` con icono Phone (naranja con borde)

---

## Bugs Encontrados y Corregidos

| Bug | Causa | Fix |
|-----|-------|-----|
| `get_online_team_members` retorna vacio desde N8N | `auth.uid()` es NULL → `up.id != NULL` evalua a NULL (falsy) | Agregar rama `IF auth.uid() IS NULL` sin self-exclusion |
| Admins no aparecen en cascada | Admin no tiene coordinacion asignada | Segunda query en rama NULL que retorna admins online sin filtro coordinacion |
| Lookup Context no encuentra contexto | Formato numero: `5213333243333` vs `+523333243333` | `RIGHT(REGEXP_REPLACE(...), 10)` normaliza ultimos 10 digitos |
| Ningun target contesta en cascada | Identity `agent_27c2cc8422df...` (sin separador) vs `agent_27c2cc84_22df...` (con underscore) | Cambiar `replace(/-/g, '')` → `replace(/-/g, '_')` en Build Bridge Context |

---

## TwiML Generado (ejemplo)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="25"
        callerId="5213333243333"
        record="record-from-answer-dual"
        action="https://primary-dev-d75a.up.railway.app/webhook/bridge-cascade?contextId=fa963962-...&attempt=0">
    <Client>
      <Identity>agent_e8ced62c_3fd0_4328_b61a_a59ebea2e877</Identity>
      <Parameter name="llamadaId" value="019ce43e-6898-..."/>
      <Parameter name="prospectoId" value="7ef9d8fe-dbd6-..."/>
      <Parameter name="prospectoNombre" value="Darig Samuel Rosales"/>
      <Parameter name="tipoLlamada" value="pstn_bridge"/>
      <Parameter name="fromNumber" value="5213333243333"/>
      <Parameter name="coordinacionId" value="f33742b9-..."/>
      <Parameter name="parentCallSid" value="CA3ff4fa51..."/>
    </Client>
  </Dial>
</Response>
```

---

## Rollback

1. **Kill switch inmediato**: Revertir Voice URL de `+523223080074` al twimlet voicemail
2. **N8N**: Revertir `Ejecuta_transfer` para usar `target_phone` directo
3. **BD**: `DROP TABLE bridge_transfer_context` (sin dependencias)
4. **Frontend**: Badge `pstn_bridge` es cosmetico, no afecta funcionalidad
5. **Funcion**: `get_online_team_members` cambio es retrocompatible (no afecta frontend)

---

## Edge Cases

| Escenario | Comportamiento |
|-----------|---------------|
| Nadie online | Transfer directo al 800 (sin puente) |
| Context lookup falla | TwiML fallback: `<Number>+528002233444</Number>` |
| Target no contesta (25s) | Cascade al siguiente via action URL |
| Todos agotan cascada | Ultimo TwiML: `<Number>+528002233444</Number>`, status=exhausted |
| 2 transfers simultaneos | Cada uno crea su context row, lookup por from_number+pending |
| Re-transfer browser→browser | Funciona — post-puente la llamada es Twilio nativo |
| Contexts viejos | Auto-expiran via `expires_at` (5 min TTL) |

---

## Archivos Modificados

| Archivo/Recurso | Accion |
|-----------------|--------|
| BD: `bridge_transfer_context` | CREATE TABLE + index + RLS |
| BD: `get_online_team_members()` | Modificada — rama NULL auth + admins |
| N8N: `q5kespj4S6iwn0pJ` | Workflow NUEVO — Bridge Voice URL + Cascade |
| N8N: `qpk8xsMI50IWltFV` | Modificado — 10 nodos bridge agregados |
| Twilio: `+523223080074` | Voice URL cambiado a N8N webhook |
| `src/services/twilioVoiceService.ts` | Notificaciones nativas del sistema |
| `src/components/live-activity/VoiceSoftphoneModal.tsx` | Badge PSTN bridge |
| `docs/VOICE_TRANSFER_SYSTEM.md` | Seccion PSTN Bridge documentada |
