# 📋 Estructura del Payload: import-contact-crm

**Webhook:** `https://primary-dev-d75a.up.railway.app/webhook/import-contact-crm`  
**Método:** POST  
**Header:** `livechat_auth: 2025_livechat_auth`

---

## 📦 Estructura Completa

```json
{
  // === DATOS DEL EJECUTIVO QUE SOLICITA ===
  "ejecutivo_nombre": "Samuel Rosales",
  "ejecutivo_id": "e8ced62c-3fd0-4328-b61a-a59ebea2e877",
  "coordinacion_id": "f5a8c9d1-2b3e-4f6a-8d9c-1e2f3a4b5c6d",
  "fecha_solicitud": "2026-01-27T17:00:00.000Z",
  
  // === DATOS COMPLETOS DE DYNAMICS ===
  "lead_dynamics": {
    "LeadID": "919a8b2f-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
    "Nombre": "Darig Samuel Rosales Robledo",
    "Email": "darig.soporte@grupovidanta.com",
    "EstadoCivil": null,        // ⚠️ Incluir incluso si es null
    "Ocupacion": null,          // ⚠️ Incluir incluso si es null
    "Pais": "MEXICO",
    "EntidadFederativa": null,  // ⚠️ Incluir incluso si es null
    "Coordinacion": "Telemarketing",
    "CoordinacionID": "coord-123-dynamics",
    "Propietario": "Vanessa Valentina Perez Moreno",
    "OwnerID": "owner-456-dynamics",
    "FechaUltimaLlamada": null, // ⚠️ Incluir incluso si es null
    "Calificacion": null        // ⚠️ Incluir incluso si es null
  },
  
  // === DATOS ADICIONALES PARA PROCESAMIENTO ===
  "telefono": "3333243333",
  "nombre_completo": "Darig Samuel Rosales Robledo",
  "id_dynamics": "919a8b2f-3c4d-5e6f-7a8b-9c0d1e2f3a4b"  // ⚠️ Cambio: antes era "lead_id"
}
```

---

## ⚠️ CAMBIOS IMPORTANTES

### 1. Campo `id_dynamics` (antes `lead_id`)
```diff
- "lead_id": "919a..."
+ "id_dynamics": "919a..."
```

### 2. Todos los datos de Dynamics en objeto `lead_dynamics`
```json
{
  "lead_dynamics": {
    // ⚠️ TODOS los campos de Dynamics van aquí
    // ⚠️ Incluir valores null si están vacíos
  }
}
```

---

## 📋 Campos del Objeto `lead_dynamics`

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `LeadID` | string | ID único del lead en Dynamics | `"919a8b2f..."` |
| `Nombre` | string | Nombre completo del prospecto | `"Darig Samuel..."` |
| `Email` | string | Email del prospecto | `"email@domain.com"` |
| `EstadoCivil` | string \| null | Estado civil | `"Casado"` o `null` |
| `Ocupacion` | string \| null | Ocupación/profesión | `"Ingeniero"` o `null` |
| `Pais` | string \| null | País de residencia | `"MEXICO"` o `null` |
| `EntidadFederativa` | string \| null | Estado/provincia | `"Jalisco"` o `null` |
| `Coordinacion` | string \| null | Coordinación en CRM | `"Telemarketing"` o `null` |
| `CoordinacionID` | string \| null | ID coordinación CRM | `"coord-123"` o `null` |
| `Propietario` | string \| null | Nombre del propietario | `"Vanessa..."` o `null` |
| `OwnerID` | string \| null | ID del propietario | `"owner-456"` o `null` |
| `FechaUltimaLlamada` | string \| null | Última llamada (ISO) | `"2026-01-20T..."` o `null` |
| `Calificacion` | string \| null | Calificación del lead | `"A"` o `null` |

---

## ✅ Validaciones

### Campos Requeridos (no pueden estar vacíos)

```typescript
// Nivel raíz
ejecutivo_nombre: string (no vacío)
ejecutivo_id: string (UUID válido)
coordinacion_id: string (UUID válido)
fecha_solicitud: string (ISO 8601)
telefono: string (10 dígitos)
nombre_completo: string (no vacío)
id_dynamics: string (no vacío)

// Dentro de lead_dynamics
LeadID: string (no vacío)
Nombre: string (no vacío)
Email: string (no vacío)
```

### Campos Opcionales (pueden ser null)

```typescript
// Dentro de lead_dynamics
EstadoCivil: string | null
Ocupacion: string | null
Pais: string | null
EntidadFederativa: string | null
Coordinacion: string | null
CoordinacionID: string | null
Propietario: string | null
OwnerID: string | null
FechaUltimaLlamada: string | null
Calificacion: string | null
```

---

## 🔄 Respuesta Esperada del Webhook

```json
{
  "success": true,
  "prospecto_id": "uuid-del-prospecto-creado",
  "conversacion_id": "uuid-de-conversacion-creada"
}
```

### En caso de error

```json
{
  "success": false,
  "error": "Descripción del error"
}
```

---

## 🧪 Ejemplo de Request Completo

```bash
curl -X POST https://primary-dev-d75a.up.railway.app/webhook/import-contact-crm \
  -H "Content-Type: application/json" \
  -H "livechat_auth: 2025_livechat_auth" \
  -d @docs/PAYLOAD_EJEMPLO_IMPORT_CONTACT.json
```

---

## 📝 Notas Importantes

1. **Todos los campos de Dynamics deben estar presentes** en `lead_dynamics`
2. **Valores null deben enviarse explícitamente** (no omitir campos)
3. **El campo `id_dynamics`** está al nivel raíz (antes era `lead_id`)
4. **El objeto `lead_dynamics`** contiene TODOS los datos tal como vienen de Dynamics
5. **El webhook debe validar** el header `livechat_auth`
6. **La respuesta debe incluir** `prospecto_id` y `conversacion_id` para que el frontend funcione

---

**Última actualización:** 27 de Enero 2026  
**Versión:** 2.0 (con objeto lead_dynamics)
