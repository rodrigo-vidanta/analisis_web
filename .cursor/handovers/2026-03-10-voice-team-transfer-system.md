# Voice Team Transfer System - Transferencias Intra-Coordinacion

**Fecha**: 2026-03-10/11
**Estado**: Implementado, pendiente prueba E2E con 2 usuarios
**Rama**: main (cambios no commiteados aun)

---

## Resumen

Sistema de transferencia fria (cold transfer) de llamadas VoIP entre miembros de la misma coordinacion. Permite que ejecutivos, supervisores y coordinadores se transfieran llamadas activas entre si, con validacion de permisos server-side.

## Arquitectura del Flujo

```
WhatsApp → Twilio → N8N → VAPI (AI) → Transfer tool → N8N redirect
  → <Dial><Client>agent_{ejecutivoId}</Client></Dial> → Browser SDK
    → Ejecutivo click "Transferir" → VoiceTransferModal
      → Edge Function voice-transfer → Twilio REST API redirect parentCallSid
        → <Dial><Client>agent_{targetId}</Client></Dial> → Browser target
```

**Re-transferencias**: Van directo por Edge Function (sin N8N/VAPI). El `parentCallSid` se mantiene en toda la cadena.

---

## Componentes Implementados

### Fase 1: Infraestructura BD + Edge Function

#### Tabla `voice_transfers`
- Campos: `id, llamada_call_id, parent_call_sid, prospecto_id, coordinacion_id, from_user_id, to_user_id, status, prospecto_nombre, from_user_name, to_user_name, tipo_llamada, from_number, created_at, connected_at, completed_at`
- Status: `pending | ringing | connected | completed | failed | rejected | timeout`
- RLS: usuarios ven sus transfers (from o to), service_role full access
- Realtime habilitado
- Indices en `from_user_id`, `to_user_id`, `parent_call_sid`

#### RPC `get_online_team_members(p_coordinacion_ids UUID[])`
- SECURITY DEFINER
- Fuente: `auth.users` JOIN `auth_user_coordinaciones` JOIN `active_sessions`
- Filtro: `last_activity > NOW() - '2 min'`, excluye caller (via `auth.uid()`)
- Retorna: `user_id, full_name, role_name, coordinacion_ids[]`

#### Edge Function `voice-transfer`
- Path: `supabase/functions/voice-transfer/index.ts`
- Desplegada en Supabase (proyecto `glsmifhkoaifvaegsozd`)
- **Flujo**:
  1. Valida JWT del caller
  2. Verifica caller Y target en misma coordinacion (via `auth_user_coordinaciones`)
  3. Verifica target online (via `active_sessions`)
  4. Construye TwiML: `<Dial><Client><Identity>agent_{targetId}</Identity>` + 7 Parameters
  5. Llama Twilio REST API: `POST /Calls/{parentCallSid}.json` con TwiML
  6. Inserta en `voice_transfers` con status `'ringing'`
- **Auth Twilio**: Basic Auth con API Key SID + Secret (secrets ya configurados)
- **Parameters enviados**: `llamadaId, prospectoId, prospectoNombre, parentCallSid, coordinacionId, transferredBy, transferredByName`

### Fase 2: Cambios N8N

#### Workflow `qpk8xsMI50IWltFV` (VAPI-Natalia_transfer_tool [PROD])
- **Servidor**: `primary-dev-d75a.up.railway.app` (maneja trafico real)
- **Nodos modificados**:
  - `Prepare WhatsApp Transfer` (path normal via `Busqueda_prospecto`)
  - `Prepare WhatsApp Transfer (explicito)` (path via `Retorna detalles llamada/prospecto`)
- **Cambios**: +2 `<Parameter>` en cada `<Client>` block (4 instancias total):
  - `parentCallSid` = `callSid` de la llamada
  - `coordinacionId` = `llamada.coordinacion_id` de `llamadas_ventas`
- **Nota**: `coordinacion_id` ya existia en los datos de ambos paths (confirmado via execution data)

### Fase 3: Frontend Services

#### `src/services/voiceTransferService.ts` (NUEVO)
```typescript
class VoiceTransferService {
  getOnlineTeamMembers(coordinacionIds: string[]): Promise<TeamMember[]>
  transferCall(params: TransferCallParams): Promise<TransferResult>
  subscribeToTransfers(userId: string, cb): () => void
}
```
- `getOnlineTeamMembers`: RPC `get_online_team_members` via `analysisSupabase`
- `transferCall`: POST a Edge Function `voice-transfer` con JWT
- `subscribeToTransfers`: Supabase Realtime en tabla `voice_transfers`

#### `src/services/twilioVoiceService.ts` (MODIFICADO)
- `IncomingCallInfo` extendido con 4 campos:
  - `parentCallSid: string | null`
  - `coordinacionId: string | null`
  - `transferredBy: string | null`
  - `transferredByName: string | null`
- `extractCallInfo()` lee nuevos campos de `call.customParameters`

#### `src/hooks/useTwilioVoice.ts` (MODIFICADO)
- Incoming event handler propaga 4 nuevos campos de transfer

#### `src/stores/liveActivityStore.ts` (MODIFICADO)
- `WidgetCallData` extendido con:
  - `parentCallSid?: string`
  - `currentHolderId?: string`
  - `currentHolderName?: string`
  - `coordinacionId?: string`

### Fase 4: UI Components

#### `src/components/live-activity/VoiceTransferModal.tsx` (NUEVO)
- Modal con lista de miembros online agrupados por rol (Coordinadores > Supervisores > Ejecutivos)
- Avatar con iniciales + dot verde online
- Click → `voiceTransferService.transferCall()`
- Loading state + success animation
- Props: `isOpen, onClose, parentCallSid, coordinacionId, llamadaCallId, prospectoId, prospectoNombre, fromNumber, tipoLlamada, userCoordinacionIds`

#### `src/components/live-activity/VoiceSoftphoneModal.tsx` (MODIFICADO)
- Boton "Transferir" (azul, redondo) entre Pausar y Colgar
- Props nuevas: `onTransfer?: () => void`, `canTransfer?: boolean`
- Solo visible cuando `canTransfer=true` (requiere `parentCallSid`)

#### `src/components/live-activity/CallCard.tsx` (MODIFICADO)
- Props nuevas: `canTransferHere?, canOnlyListen?, onTransferHere?, currentHolderName?`
- Badge del holder actual (quien tiene la llamada VoIP)
- Boton "Transferir Aqui" (cyan) para supervisores/coordinadores
- Logica de permisos: `canTransferHere` vs `canOnlyListen` segun rol

### Fase 5: Orquestacion

#### `src/components/live-activity/LiveCallActivityWidget.tsx` (MODIFICADO)
- Estado `showVoiceTransferModal`
- `handleOpenVoiceTransfer`: Abre modal desde softphone
- `handleTransferHere`: "Transferir Aqui" desde CallCard (supervisor)
- Propaga `parentCallSid` + `coordinacionId` desde `incomingCallInfo` a `softphoneCallData`
- Permisos por CallCard: calcula `canTransferHere`/`canOnlyListen` basado en rol y `currentHolderId`
- Renderiza `VoiceTransferModal` con todos los props

---

## Modelo de Permisos (5 capas)

| Capa | Validacion |
|------|-----------|
| Edge Function `voice-transfer` | Caller Y target en misma `coordinacion_id` (server-side) |
| RPC `get_online_team_members` | Solo retorna usuarios de coordinaciones solicitadas |
| Frontend Store | `loadActiveCalls()` filtra por `getCoordinacionesFilter()` |
| Frontend CallCard | Compara `user.role_name` + `call.coordinacion_id` |
| Frontend Modal | Solo muestra resultado filtrado de RPC |

---

## Escenarios de Transferencia

### A: Ejecutivo → Supervisor
1. Ejecutivo en llamada → click "Transferir" en softphone
2. VoiceTransferModal muestra miembros online
3. Click supervisor → Edge Function redirige `parentCallSid`
4. Ejecutivo se desconecta, supervisor recibe incoming
5. Supervisor acepta → softphone abre con datos del prospecto

### B: Supervisor "Transferir Aqui" desde widget
1. Ejecutivo en llamada → supervisor ve CallCard con "Transferir Aqui"
2. Click → Edge Function redirige a supervisor
3. Ejecutivo se desconecta, supervisor recibe incoming

### C: Re-transferencia (sin N8N)
1. Supervisor tiene llamada → click "Transferir" → modal → selecciona otro ejecutivo
2. Edge Function redirige `parentCallSid` directamente via Twilio REST API
3. No pasa por N8N ni VAPI

---

## Pendiente para Prueba E2E

1. **2 browsers**: Necesitas 2 usuarios de la misma coordinacion logueados simultaneamente
2. **Trigger**: Llamada WhatsApp que llegue al primer ejecutivo (via VAPI → N8N → Client SDK)
3. **Verificar**:
   - El boton "Transferir" aparece en el softphone (indica que `parentCallSid` llego correctamente)
   - El modal muestra al otro usuario como "online"
   - Click en transferir redirige la llamada al otro browser
   - El segundo usuario recibe incoming con datos del prospecto
4. **Si falla "Transferir" no aparece**:
   - Verificar en console que `parentCallSid` llega en `customParameters`
   - Revisar execution data en N8N: `node scripts/n8n-cli.cjs exec-node <exec-id> "Prepare WhatsApp Transfer (explicito)"`
   - Confirmar que el TwiML generado incluye los nuevos Parameters

---

## Notas Tecnicas

- **N8N Production API bug**: `"column user.role does not exist"` — GET/PUT bloqueados en `primary-production-5b63a.up.railway.app`. Usar `primary-dev-d75a.up.railway.app` que maneja el trafico real.
- **Identity format**: `agent_{userId}` con guiones reemplazados por `_` (ej: `agent_e8ced62c_3fd0_4328_b61a_a59ebea2e877`)
- **Twilio Auth**: Basic Auth con `TWILIO_API_KEY_SID:TWILIO_API_KEY_SECRET` (NO Auth Token)
- **Supabase secrets configurados**: `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_TWIML_APP_SID`
- **TypeScript**: Compila sin errores (`npx tsc --noEmit` verificado)

---

## Futuro (Phase 2+)

- Warm Transfer (conferencias con briefing)
- Coach/Whisper (supervisor escucha/susurra)
- Cross-coordinacion (admin/CALIDAD)
- Queue/Fallback (cola cuando target ocupado)
- Analytics dashboard de transferencias
