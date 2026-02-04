# 🔍 Diagnóstico: import-contact-crm devuelve prospecto_id null

**Fecha:** 3 de Febrero 2026  
**Módulo:** WhatsApp Manual Import  
**Edge Function:** `import-contact-proxy`  
**Webhook N8N:** `import-contact-crm`

---

## 📋 Problema

Al importar un prospecto desde el módulo de WhatsApp, el sistema reporta éxito pero no puede encontrar el prospecto creado porque `prospecto_id` viene como `null`.

### Logs del Frontend

```javascript
✅ [ImportContact] Resultado normalizado a array: 
Array [ {…} ]

⚠️ [ImportContact] No hay prospecto_id en respuesta. Buscando por teléfono...

🔍 [ImportContact] Buscando prospecto con whatsapp: 8332727818

⚠️ [ImportContact] No se pudo encontrar el prospecto creado
📞 Teléfono buscado: 8332727818
🆔 ID Dynamics: 8bce1871-d8fe-4414-b91e-374e72d3b2a7
```

### Respuesta Recibida

```json
[{
  "success": true,
  "message": "Importación procesada correctamente",
  "prospecto_id": null, // ❌ PROBLEMA: viene null
  "es_nuevo": true,
  "data": {
    "id": null, // ❌ PROBLEMA: viene null
    "nombre_completo": "ANDRES MARTINEZ",
    "etapa": "importado manual",
    "origen": "IMPORTADO_MANUAL",
    ...
  }
}]
```

---

## 🔎 Análisis

### 1. Edge Function: `import-contact-proxy/index.ts`

**Líneas 99-121:**

```typescript
// Verificar si la respuesta está vacía
if (!responseText || responseText.trim() === '') {
  console.warn('⚠️ [import-contact-proxy] Respuesta vacía del webhook. Asumiendo éxito.');
  // Si el status es 200 y no hay error, asumimos que fue exitoso
  return new Response(
    JSON.stringify([{
      success: true,
      message: 'Importación procesada correctamente',
      prospecto_id: null, // ❌ N8N no devuelve el ID
      es_nuevo: true,
      data: {
        id: null,
        nombre_completo: payload.nombre_completo || '',
        ...
      }
    }]),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

**Causa raíz:** El webhook de N8N está devolviendo una respuesta **vacía** (sin cuerpo), por lo que la edge function construye un mock response con `prospecto_id: null`.

---

## 🎯 Solución

### Paso 1: Revisar Workflow N8N

Acceder al workflow `import-contact-crm` en N8N (Railway):

1. **Ir a:** https://primary-dev-d75a.up.railway.app
2. **Login** con credenciales de N8N
3. **Buscar workflow:** `import-contact-crm` o buscar por webhook path `/webhook/import-contact-crm`
4. **Revisar nodo de respuesta**

### Paso 2: Verificar Nodo de Respuesta

El workflow **debe tener** un nodo `Respond to Webhook` o `Response` al final con el siguiente formato:

```json
{
  "success": true,
  "prospecto_id": "{{ $json.prospecto_id }}",
  "es_nuevo": {{ $json.es_nuevo }},
  "message": "Prospecto importado correctamente",
  "data": {
    "id": "{{ $json.prospecto_id }}",
    "nombre_completo": "{{ $json.nombre_completo }}",
    "etapa": "{{ $json.etapa }}",
    "origen": "{{ $json.origen }}",
    "ejecutivo_id": "{{ $json.ejecutivo_id }}",
    "ejecutivo_nombre": "{{ $json.ejecutivo_nombre }}",
    "coordinacion_id": "{{ $json.coordinacion_id }}"
  }
}
```

**⚠️ Nota:** Los valores deben venir del nodo de Supabase/PostgreSQL que **inserta** el prospecto.

### Paso 3: Verificar Nodo de INSERT a Supabase

El workflow debe tener un nodo de PostgreSQL o Supabase que:

1. **Inserte** el prospecto en la tabla `prospectos`
2. **Retorne** el ID del registro creado (usar `RETURNING id`)
3. **Pase** el ID al nodo de respuesta

**Ejemplo SQL:**

```sql
INSERT INTO prospectos (
  nombre_completo,
  whatsapp,
  id_dynamics,
  ejecutivo_id,
  coordinacion_id,
  etapa,
  origen,
  fecha_solicitud,
  -- otros campos...
)
VALUES (
  $1, $2, $3, $4, $5, 'importado manual', 'IMPORTADO_MANUAL', NOW()
)
RETURNING id, nombre_completo, etapa, origen, ejecutivo_id, coordinacion_id;
```

### Paso 4: Verificar Conversación WhatsApp

El workflow también debe crear la conversación en `conversaciones_whatsapp`:

```sql
INSERT INTO conversaciones_whatsapp (
  prospecto_id,
  numero_prospecto,
  etiqueta,
  estado,
  started_at
)
VALUES (
  $1, $2, 'lead', 'activo', NOW()
)
RETURNING id;
```

---

## 🧪 Test Manual

### Opción 1: Test via Edge Function

```bash
# Obtener token JWT del usuario
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/import-contact-proxy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "ejecutivo_nombre": "Test User",
    "ejecutivo_id": "51dc4a3e-5524-40ca-8084-9bc11429e7e1",
    "coordinacion_id": "f33742b9-46cf-4716-bf7a-ce129a82bad2",
    "fecha_solicitud": "2026-02-03T23:30:00.000Z",
    "telefono": "1234567890",
    "nombre_completo": "Test Prospecto",
    "id_dynamics": "test-dynamics-id-123",
    "lead_dynamics": {
      "LeadID": "test-dynamics-id-123",
      "Nombre": "Test Prospecto",
      "Email": "test@example.com",
      "Pais": "MEXICO"
    }
  }'
```

**Respuesta esperada:**

```json
[{
  "success": true,
  "prospecto_id": "UUID-VALIDO-AQUI", // ✅ NO null
  "es_nuevo": true,
  "message": "Prospecto importado correctamente",
  "data": {
    "id": "UUID-VALIDO-AQUI", // ✅ NO null
    "nombre_completo": "Test Prospecto",
    ...
  }
}]
```

### Opción 2: Test Directo al Webhook

```bash
# Obtener token de N8N desde Supabase
# Ver: system_credentials o api_auth_tokens con module_name='N8N' y token_key='LIVECHAT_AUTH'

curl -X POST https://primary-dev-d75a.up.railway.app/webhook/import-contact-crm \
  -H "Content-Type: application/json" \
  -H "livechat_auth: VALOR-DEL-TOKEN" \
  -d '{
    "ejecutivo_nombre": "Test User",
    ...
  }'
```

---

## 📝 Checklist de Verificación

Verificar en N8N workflow `import-contact-crm`:

- [ ] Existe nodo de respuesta (Respond to Webhook)
- [ ] Nodo de respuesta está **conectado** al flujo principal
- [ ] Nodo de respuesta incluye `prospecto_id` del INSERT
- [ ] El INSERT a `prospectos` usa `RETURNING id`
- [ ] El ID del INSERT se pasa al nodo de respuesta
- [ ] El workflow está **activo** (no en draft)
- [ ] El trigger del webhook está **habilitado**

---

## 🔄 Fallback Actual (Frontend)

El frontend actualmente intenta recuperarse buscando el prospecto por:

1. **Teléfono (`whatsapp`):** `whatsapp.eq.${normalizedPhone}`
2. **Teléfono principal:** `telefono_principal.eq.${normalizedPhone}`
3. **ID Dynamics:** `id_dynamics.eq.${payload.id_dynamics}`

```typescript
// src/services/importContactService.ts líneas 229-235
const { data: prospecto, error: searchError } = await analysisSupabase
  .from('prospectos')
  .select('id, whatsapp, telefono_principal, id_dynamics')
  .or(`whatsapp.eq.${normalizedPhone},telefono_principal.eq.${normalizedPhone},id_dynamics.eq.${payload.id_dynamics}`)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

**⚠️ Problema:** Este fallback NO está encontrando el prospecto, lo que indica:

1. El prospecto NO se está insertando en la BD, **O**
2. El prospecto se inserta con datos diferentes (teléfono mal formateado, id_dynamics diferente)

---

## 🛠️ Acciones Inmediatas

### 1. Verificar si el prospecto se insertó

```sql
-- Buscar prospecto por ID Dynamics
SELECT id, nombre_completo, whatsapp, telefono_principal, id_dynamics, created_at
FROM prospectos
WHERE id_dynamics = '8bce1871-d8fe-4414-b91e-374e72d3b2a7'
ORDER BY created_at DESC
LIMIT 1;

-- Buscar prospecto por teléfono
SELECT id, nombre_completo, whatsapp, telefono_principal, id_dynamics, created_at
FROM prospectos
WHERE whatsapp = '8332727818' OR telefono_principal = '8332727818'
ORDER BY created_at DESC
LIMIT 1;

-- Buscar prospecto por nombre (aproximado)
SELECT id, nombre_completo, whatsapp, telefono_principal, id_dynamics, created_at
FROM prospectos
WHERE nombre_completo ILIKE '%ANDRES MARTINEZ%'
ORDER BY created_at DESC
LIMIT 5;
```

### 2. Revisar Logs de N8N

1. Ir a N8N Dashboard
2. Ver **Executions** del workflow `import-contact-crm`
3. Buscar ejecución alrededor de `2026-02-03 23:15:14`
4. Verificar:
   - ✅ Webhook recibió el payload
   - ✅ INSERT se ejecutó sin errores
   - ✅ RETURNING devolvió el ID
   - ✅ Nodo de respuesta se ejecutó

### 3. Habilitar Logs Verbose en Edge Function

Agregar más logs en `import-contact-proxy/index.ts`:

```typescript
// Después de línea 96
const responseText = await response.text();
console.log(`📥 [import-contact-proxy] Raw response (full): "${responseText}"`);
console.log(`📏 [import-contact-proxy] Response length: ${responseText.length} chars`);
console.log(`📊 [import-contact-proxy] Response isEmpty: ${!responseText || responseText.trim() === ''}`);
```

---

## 🔗 Referencias

- **Edge Function:** `supabase/functions/import-contact-proxy/index.ts`
- **Servicio Frontend:** `src/services/importContactService.ts`
- **Docs Payload:** `docs/PAYLOAD_IMPORT_CONTACT_ESTRUCTURA.md`
- **Docs Respuesta:** `docs/WEBHOOK_IMPORT_RESPONSE_STRUCTURE.md`
- **N8N Dashboard:** https://primary-dev-d75a.up.railway.app
- **Webhook URL:** https://primary-dev-d75a.up.railway.app/webhook/import-contact-crm

---

**Estado:** 🟡 Pendiente de verificación en N8N  
**Prioridad:** 🔥 Alta (bloquea importación de prospectos)  
**Asignado a:** Dev que tenga acceso a N8N Dashboard
