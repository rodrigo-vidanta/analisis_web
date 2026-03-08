# Handover: Captura de Referral Source (CTWA) en mensajes WhatsApp

**Fecha:** 2026-03-08
**Para:** Ingeniero de Backend (N8N)
**Prioridad:** Media-Alta
**Frontend:** Ya implementado y listo para recibir el campo

---

## Contexto

Cuando un prospecto llega desde un anuncio **Click-to-WhatsApp (CTWA)** de Meta (Facebook/Instagram), la API de WhatsApp Business (via Twilio) otorga una **ventana de 72 horas** de mensajería gratuita, en lugar de las 24 horas estándar.

Actualmente no estamos capturando este dato. El frontend ya fue actualizado para detectar el campo `referral_source` en `mensajes_whatsapp` y aplicar la ventana correcta (24h vs 72h), pero **el backend necesita escribir ese campo**.

---

## Lo que Twilio envía

Cuando un mensaje inbound de WhatsApp viene de un anuncio CTWA, Twilio incluye estos parámetros **adicionales** en el webhook:

| Parámetro Twilio | Descripción | Ejemplo |
|------------------|-------------|---------|
| `ReferralCtwaClid` | Click ID único del anuncio Meta (para Conversions API) | `ARA...long_string` |
| `ReferralSourceType` | Tipo de fuente que generó el mensaje | `ad` |
| `ReferralSourceId` | ID del anuncio en Meta | `120212...` |
| `ReferralSourceUrl` | URL del anuncio | `https://fb.me/...` |
| `ReferralBody` | Texto del cuerpo del anuncio | `Vacaciones de lujo en Vidanta...` |
| `ReferralHeadline` | Headline del anuncio | `Vidanta Acapulco` |
| `ReferralMediaUrl` | URL de la imagen/video del anuncio | `https://scontent...` |
| `ReferralMediaContentType` | Content-type del media | `image/jpeg` |
| `ReferralMediaId` | ID del media en Meta | `123456...` |
| `ReferralNumMedia` | Número de media items en el referral | `1` |

**Fuente oficial:** https://www.twilio.com/docs/messaging/guides/webhook-request

### Cómo detectar si es CTWA

Si el parámetro `ReferralCtwaClid` **existe y no está vacío** en el payload del webhook, el mensaje viene de un anuncio Click-to-WhatsApp.

Alternativamente, si `ReferralSourceType === "ad"`.

---

## Qué se necesita hacer

### Paso 1: Agregar columna a `mensajes_whatsapp`

```sql
ALTER TABLE mensajes_whatsapp
ADD COLUMN referral_source VARCHAR(20) DEFAULT NULL;

COMMENT ON COLUMN mensajes_whatsapp.referral_source IS
  'Origen del mensaje: ctwa_ad (Click-to-WhatsApp ad), organic (orgánico), NULL (no determinado).
   Se usa para calcular la ventana de mensajería: 72h para ctwa_ad, 24h para orgánico.';
```

**Valores posibles:**
- `'ctwa_ad'` — El mensaje llegó desde un anuncio Click-to-WhatsApp
- `'organic'` — El mensaje llegó de forma orgánica (el prospecto escribió directo)
- `NULL` — No se pudo determinar (mensajes históricos)

### Paso 2: Modificar el workflow N8N que recibe mensajes de Twilio

**Workflow:** `QmpXVdF5LYWHIEAj` (es el workflow que procesa mensajes entrantes de Twilio)

En el nodo que recibe el webhook de Twilio y hace INSERT en `mensajes_whatsapp`, agregar lógica para capturar el referral_source:

```javascript
// En el nodo de N8N que procesa el webhook de Twilio
const referralCtwaClid = $input.body.ReferralCtwaClid || null;
const referralSourceType = $input.body.ReferralSourceType || null;

// Determinar el referral_source
let referral_source = 'organic'; // Default: orgánico
if (referralCtwaClid || referralSourceType === 'ad') {
  referral_source = 'ctwa_ad';
}

// Incluir en el INSERT a mensajes_whatsapp
// ... junto con los demás campos existentes
```

### Paso 3: (Opcional pero recomendado) Guardar datos completos del referral

Para analytics y tracking de campañas, se recomienda guardar los datos completos del referral en una tabla separada o en un campo JSONB:

**Opción A: Campo JSONB en mensajes_whatsapp**

```sql
ALTER TABLE mensajes_whatsapp
ADD COLUMN referral_data JSONB DEFAULT NULL;
```

```javascript
// Solo si hay referral
const referral_data = referralCtwaClid ? {
  ctwa_clid: $input.body.ReferralCtwaClid,
  source_type: $input.body.ReferralSourceType,
  source_id: $input.body.ReferralSourceId,
  source_url: $input.body.ReferralSourceUrl,
  headline: $input.body.ReferralHeadline,
  body: $input.body.ReferralBody,
  media_url: $input.body.ReferralMediaUrl,
} : null;
```

**Opción B: Tabla separada (si se quiere analytics de campañas)**

```sql
CREATE TABLE whatsapp_referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mensaje_id UUID REFERENCES mensajes_whatsapp(id),
  prospecto_id UUID REFERENCES prospectos(id),
  ctwa_clid TEXT NOT NULL,
  source_type VARCHAR(20),
  source_id TEXT,
  source_url TEXT,
  headline TEXT,
  body TEXT,
  media_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para buscar por prospecto
CREATE INDEX idx_whatsapp_referrals_prospecto ON whatsapp_referrals(prospecto_id);
```

### Paso 4: (Opcional) Actualizar `prospectos.campana_origen`

Si el primer mensaje de un prospecto viene de CTWA, también se puede actualizar el campo `campana_origen` en la tabla `prospectos`:

```javascript
// Solo si es el primer mensaje del prospecto Y viene de CTWA
if (referral_source === 'ctwa_ad' && esNuevoProspecto) {
  // UPDATE prospectos SET campana_origen = ReferralHeadline o ReferralSourceId
  // WHERE id = prospecto_id
}
```

---

## Cómo verificar

### Test manual

1. Crear un anuncio CTWA en Meta Business (o usar uno existente)
2. Hacer click en el anuncio desde un teléfono de prueba
3. Enviar un mensaje desde WhatsApp
4. Verificar en N8N que el webhook incluye `ReferralCtwaClid`
5. Verificar en BD que `mensajes_whatsapp.referral_source = 'ctwa_ad'`

### Verificar en logs de N8N

Para ver si los parámetros ya están llegando (sin necesidad de crear anuncio nuevo):

1. Ir al workflow `QmpXVdF5LYWHIEAj`
2. Ver las últimas ejecuciones de prospectos que llegaron por campaña
3. En el nodo del webhook, revisar el body completo
4. Buscar campos que empiecen con `Referral*`

### Query de verificación post-implementación

```sql
-- Verificar que se están guardando los referral_source
SELECT
  referral_source,
  COUNT(*) as total,
  MIN(created_at) as primer_mensaje,
  MAX(created_at) as ultimo_mensaje
FROM mensajes_whatsapp
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY referral_source;
```

---

## Lo que el frontend ya hace

El frontend (LiveChatCanvas.tsx) ya fue actualizado para:

1. **Tipo Message** — Incluye campo `referral_source?: string | null`
2. **`getConversationWindowHours()`** — Retorna 72 si el primer mensaje del cliente tiene `referral_source = 'ctwa_ad'`, 24 en caso contrario
3. **`isWithin24HourWindow()`** — Usa la ventana dinámica (24h o 72h) según el source
4. **Countdown en pill "HOY"** — Muestra cuenta regresiva con el tiempo correcto
5. **Banner de ventana cerrada** — Muestra "72 horas (Ventana extendida CTWA)" cuando aplica

**En cuanto el backend escriba `referral_source = 'ctwa_ad'` en la columna, el frontend lo detectará automáticamente.**

---

## Prioridad de implementación

| Paso | Esfuerzo | Impacto | Prioridad |
|------|----------|---------|-----------|
| 1. Agregar columna `referral_source` | 5 min | Alto | **Obligatorio** |
| 2. Modificar workflow N8N | 15-30 min | Alto | **Obligatorio** |
| 3. Guardar referral_data completo | 15 min | Medio | Recomendado |
| 4. Actualizar campana_origen | 10 min | Bajo | Opcional |

---

## Diagrama de flujo

```
Prospecto hace click en anuncio Meta (CTWA)
    ↓
WhatsApp envía mensaje a Twilio
    ↓
Twilio envía webhook a N8N con parámetros Referral*
    ↓
N8N detecta ReferralCtwaClid → referral_source = 'ctwa_ad'
    ↓
INSERT en mensajes_whatsapp con referral_source = 'ctwa_ad'
    ↓
Frontend detecta referral_source en primer mensaje del cliente
    ↓
isWithin24HourWindow() usa 72h en lugar de 24h
    ↓
Countdown muestra "⏱ 71:45" en lugar de "⏱ 23:45"
    ↓
Ejecutivo tiene 3 días para atender en lugar de 1
```
