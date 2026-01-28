# Estructura de Respuesta - Webhook Import Contact

**Fecha:** 2026-01-27 
**Webhook:** `https://primary-dev-d75a.up.railway.app/webhook/import-contact-crm`

---

## 📋 Códigos de Estado HTTP

| Código | Significado | Descripción |
|--------|-------------|-------------|
| `200` | ✅ Exitoso | Prospecto importado correctamente |
| `400` | ⚠️ Error de datos | Payload inválido o datos incompletos |
| `401` | 🔒 Auth error | Token de autenticación inválido o expirado |
| `500` | 🔥 Server error | Error interno al procesar la importación |

---

## ✅ Respuesta Exitosa (200 OK)

### Estructura

```typescript
Array<{
  success: boolean;
  prospecto_id: string;
  es_nuevo: boolean;
  message: string;
  data: {
    id: string;
    nombre_completo: string;
    etapa: string;
    origen: string;
    ejecutivo_id: string;
    ejecutivo_nombre: string;
    coordinacion_id: string;
  };
}>
```

### Ejemplo Real

```json
[
  {
    "success": true,
    "prospecto_id": "91e5397c-cc9f-4416-a423-41e0f4835202",
    "es_nuevo": true,
    "message": "Prospecto importado correctamente",
    "data": {
      "id": "91e5397c-cc9f-4416-a423-41e0f4835202",
      "nombre_completo": "MARIA GONGAL",
      "etapa": "importado manual",
      "origen": "IMPORTADO_MANUAL",
      "ejecutivo_id": "7ac0ed39-77e8-4564-acdd-3c1117ca584a",
      "ejecutivo_nombre": "Lopez Toscano Rolando",
      "coordinacion_id": "4c1ece41-bb6b-49a1-b52b-f5236f54d60a"
    }
  }
]
```

### Campos Explicados

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `success` | `boolean` | Siempre `true` en respuesta 200 |
| `prospecto_id` | `UUID` | ID del prospecto creado/actualizado |
| `es_nuevo` | `boolean` | `true` si es nuevo, `false` si ya existía |
| `message` | `string` | Mensaje descriptivo del resultado |
| `data.id` | `UUID` | ID del prospecto (igual que `prospecto_id`) |
| `data.nombre_completo` | `string` | Nombre completo del prospecto |
| `data.etapa` | `string` | Etapa inicial: `"importado manual"` |
| `data.origen` | `string` | Origen: `"IMPORTADO_MANUAL"` |
| `data.ejecutivo_id` | `UUID` | ID del ejecutivo solicitante |
| `data.ejecutivo_nombre` | `string` | Nombre del ejecutivo |
| `data.coordinacion_id` | `UUID` | ID de la coordinación |

---

## ⚠️ Errores (400, 401, 500)

### Formato General

```json
{
  "error": "Descripción del error",
  "message": "Mensaje legible para el usuario",
  "statusCode": 400
}
```

### Ejemplo Error 400 (Datos Inválidos)

```json
{
  "error": "Missing required field: ejecutivo_id",
  "message": "Datos incompletos o inválidos",
  "statusCode": 400
}
```

### Ejemplo Error 401 (Auth)

```json
{
  "error": "Invalid or expired token",
  "message": "Error de autenticación",
  "statusCode": 401
}
```

### Ejemplo Error 500 (Server)

```json
{
  "error": "Database connection failed",
  "message": "Error interno del servidor",
  "statusCode": 500
}
```

---

## 🔄 Flujo de Manejo en Frontend

### 1. Llamada al Webhook (via Edge Function)

```typescript
const response = await fetch(
  `${EDGE_FUNCTIONS_URL}/functions/v1/import-contact-proxy`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userJWT}`
    },
    body: JSON.stringify(payload)
  }
);
```

### 2. Validación del Status Code

```typescript
const statusCode = response.status;

if (statusCode === 401) {
  // Mostrar error de autenticación
  toast.error('🔒 Error de autenticación');
}

if (statusCode === 400) {
  // Mostrar error de datos
  toast.error('⚠️ Datos inválidos');
}

if (statusCode === 500) {
  // Mostrar error del servidor
  toast.error('🔥 Error interno del servidor');
}

if (statusCode !== 200) {
  return; // Detener procesamiento
}
```

### 3. Parseo de Respuesta Exitosa

```typescript
// La respuesta es un ARRAY
const result: WebhookResponse[] = await response.json();

if (!Array.isArray(result) || result.length === 0) {
  throw new Error('Respuesta inválida del servidor');
}

const firstResult = result[0];

if (firstResult.success) {
  const prospectoId = firstResult.prospecto_id;
  const esNuevo = firstResult.es_nuevo;
  
  toast.success(firstResult.message);
  
  // Agregar a la lista de importados
  addToImportedList(prospectoId, firstResult.data.nombre_completo);
}
```

### 4. Búsqueda de Conversación Asociada

```typescript
// El webhook crea automáticamente la conversación
const { data: conversacion } = await supabase
  .from('conversaciones_whatsapp')
  .select('id')
  .eq('prospecto_id', prospectoId)
  .maybeSingle();

if (conversacion) {
  // Navegar a la conversación
  navigate(`/live-chat?conversation=${conversacion.id}`);
}
```

---

## 📝 Notas Importantes

### ⚠️ Formato de Respuesta

- **La respuesta SIEMPRE es un array** `[{...}]`, NO un objeto directo
- Debes acceder al primer elemento: `result[0]`
- Verificar que `Array.isArray(result)` y `result.length > 0`

### ✅ Validaciones Recomendadas

1. ✅ Verificar que la respuesta sea un array
2. ✅ Verificar que tenga al menos un elemento
3. ✅ Verificar `firstResult.success === true`
4. ✅ Verificar que `prospecto_id` exista y sea UUID válido

### 🔄 Comportamiento `es_nuevo`

- `true`: El prospecto fue creado en esta importación
- `false`: El prospecto ya existía (se actualizó)

### 🔍 Buscar Conversación

El webhook crea automáticamente:
- Registro en `prospectos`
- Registro en `conversaciones_whatsapp`
- Relación `prospecto_id` ↔ `conversacion_id`

Buscar la conversación:
```sql
SELECT id 
FROM conversaciones_whatsapp 
WHERE prospecto_id = '91e5397c-cc9f-4416-a423-41e0f4835202';
```

---

## 🔗 Referencias

- **Edge Function:** `supabase/functions/import-contact-proxy/index.ts`
- **Servicio Frontend:** `src/services/importContactService.ts`
- **Componente UI:** `src/components/prospectos/ManualImportTab.tsx`
- **Payload Estructura:** `docs/PAYLOAD_IMPORT_CONTACT_ESTRUCTURA.md`

---

**Última actualización:** 2026-01-27 
**Autor:** Sistema de Documentación Automática
