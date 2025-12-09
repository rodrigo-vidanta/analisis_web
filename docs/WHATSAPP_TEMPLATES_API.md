# WhatsApp Templates API - Documentación Oficial

> **Versión:** 1.0.0  
> **Última actualización:** 2025-12-05  
> **Base URL:** `https://primary-dev-d75a.up.railway.app`

---

## Índice

1. [Autenticación](#autenticación)
2. [API de Gestión de Templates](#api-de-gestión-de-templates)
   - [Listar Templates](#1-listar-templates)
   - [Obtener Template](#2-obtener-template)
   - [Crear Template](#3-crear-template)
   - [Actualizar Template](#4-actualizar-template)
   - [Eliminar Template](#5-eliminar-template)
   - [Sincronizar desde uChat](#6-sincronizar-desde-uchat)
3. [API de Envío de Templates](#api-de-envío-de-templates)
   - [Enviar Template](#enviar-template)
4. [Modelos de Datos](#modelos-de-datos)
5. [Códigos de Error](#códigos-de-error)
6. [Ejemplos de Integración](#ejemplos-de-integración)

---

## Autenticación

Todas las peticiones requieren autenticación mediante header.

```http
Auth: {token}
```

| Header | Valor | Descripción |
|--------|-------|-------------|
| `Auth` | `string` | Token de autenticación proporcionado |
| `Content-Type` | `application/json` | Tipo de contenido (requerido para peticiones con body) |

### Ejemplo de headers

```javascript
const headers = {
  'Auth': 'TU_TOKEN_DE_AUTENTICACION',
  'Content-Type': 'application/json'
};
```

---

## API de Gestión de Templates

**Endpoint Base:** `/webhook/whatsapp-templates`  
**Método:** `POST` (todas las operaciones)

---

### 1. Listar Templates

Obtiene todos los templates activos del sistema.

#### Request

```http
POST /webhook/whatsapp-templates
Auth: {token}
Content-Type: application/json
```

**Query Parameters:** Ninguno  
**Body:** Vacío o `{}`

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "c38b4baf-b206-417c-a1ad-c3d35b1ece31",
      "name": "second_call_attempt",
      "language": "es_MX",
      "category": "MARKETING",
      "components": [
        {
          "type": "BODY",
          "text": "Disculpe {{1}}, intenté marcarle nuevamente...",
          "example": {
            "body_text": [["Carlos"]]
          }
        }
      ],
      "status": "APPROVED",
      "rejection_reason": null,
      "uchat_synced": true,
      "last_synced_at": "2025-12-05T20:27:56.893Z",
      "is_active": true,
      "description": null,
      "created_by": null,
      "created_at": "2025-12-05T20:27:57.316Z",
      "updated_at": "2025-12-05T20:27:57.316Z"
    }
  ],
  "timestamp": "2025-12-05T22:00:00.000Z"
}
```

#### Código de ejemplo

```javascript
async function listTemplates() {
  const response = await fetch('https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates', {
    method: 'POST',
    headers: {
      'Auth': 'TU_TOKEN',
      'Content-Type': 'application/json'
    }
  });
  return response.json();
}
```

---

### 2. Obtener Template

Obtiene un template específico por su ID.

#### Request

```http
POST /webhook/whatsapp-templates?id={template_id}
Auth: {token}
Content-Type: application/json
```

**Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `uuid` | ✅ | ID del template |

**Body:** Vacío o `{}`

#### Response

```json
{
  "success": true,
  "data": {
    "id": "c38b4baf-b206-417c-a1ad-c3d35b1ece31",
    "name": "second_call_attempt",
    "language": "es_MX",
    "category": "MARKETING",
    "components": [
      {
        "type": "BODY",
        "text": "Disculpe {{1}}, intenté marcarle nuevamente pero creo que esta ocupado en este momento.\nLe regreso la llamada el día de mañana a las 9 am\nCualquier duda hágamelo saber",
        "example": {
          "body_text": [["Carlos"]]
        }
      }
    ],
    "status": "APPROVED",
    "rejection_reason": null,
    "uchat_synced": true,
    "last_synced_at": "2025-12-05T20:27:56.893Z",
    "is_active": true,
    "description": null,
    "created_at": "2025-12-05T20:27:57.316Z",
    "updated_at": "2025-12-05T20:27:57.316Z"
  },
  "timestamp": "2025-12-05T22:00:00.000Z"
}
```

#### Código de ejemplo

```javascript
async function getTemplate(templateId) {
  const response = await fetch(
    `https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates?id=${templateId}`,
    {
      method: 'POST',
      headers: {
        'Auth': 'TU_TOKEN',
        'Content-Type': 'application/json'
      }
    }
  );
  return response.json();
}
```

---

### 3. Crear Template

Crea un nuevo template en el sistema y opcionalmente en uChat.

#### Request

```http
POST /webhook/whatsapp-templates
Auth: {token}
Content-Type: application/json

{
  "name": "confirmacion_cita",
  "language": "es_MX",
  "category": "UTILITY",
  "components": [
    {
      "type": "BODY",
      "text": "Hola {{1}}, tu cita está confirmada para el {{2}} a las {{3}}."
    }
  ],
  "description": "Template para confirmación de citas"
}
```

**Query Parameters:** Ninguno

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | `string` | ✅ | Nombre único del template (snake_case, sin espacios) |
| `language` | `string` | ✅ | Código de idioma (ver tabla abajo) |
| `category` | `string` | ✅ | Categoría del template (ver tabla abajo) |
| `components` | `array` | ✅ | Array de componentes del template |
| `description` | `string` | ❌ | Descripción interna del template |

**Valores permitidos para `language`:**

| Código | Idioma |
|--------|--------|
| `es` | Español |
| `es_MX` | Español (México) |
| `es_ES` | Español (España) |
| `en` | Inglés |
| `en_US` | Inglés (USA) |

**Valores permitidos para `category`:**

| Categoría | Uso |
|-----------|-----|
| `UTILITY` | Confirmaciones, recordatorios, actualizaciones |
| `MARKETING` | Promociones, ofertas, newsletters |
| `AUTHENTICATION` | Códigos OTP, verificación |

#### Estructura de Components

```json
{
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Título del mensaje"
    },
    {
      "type": "HEADER",
      "format": "IMAGE"
    },
    {
      "type": "BODY",
      "text": "Texto principal con {{1}} variables {{2}}"
    },
    {
      "type": "FOOTER",
      "text": "Texto del pie de mensaje"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "QUICK_REPLY",
          "text": "Confirmar"
        },
        {
          "type": "QUICK_REPLY",
          "text": "Cancelar"
        },
        {
          "type": "URL",
          "text": "Ver detalles",
          "url": "https://ejemplo.com/{{1}}"
        },
        {
          "type": "PHONE_NUMBER",
          "text": "Llamar",
          "phone_number": "+525512345678"
        }
      ]
    }
  ]
}
```

**Tipos de Header (`format`):**

| Format | Descripción |
|--------|-------------|
| `TEXT` | Header de texto |
| `IMAGE` | Header con imagen |
| `VIDEO` | Header con video |
| `DOCUMENT` | Header con documento |

**Tipos de Buttons:**

| Type | Descripción | Campos adicionales |
|------|-------------|-------------------|
| `QUICK_REPLY` | Botón de respuesta rápida | `text` |
| `URL` | Botón con URL | `text`, `url` |
| `PHONE_NUMBER` | Botón para llamar | `text`, `phone_number` |

#### Response

```json
{
  "success": true,
  "data": {
    "id": "nuevo-uuid-generado",
    "name": "confirmacion_cita",
    "language": "es_MX",
    "category": "UTILITY",
    "components": [...],
    "status": "PENDING",
    "is_active": true,
    "created_at": "2025-12-05T22:00:00.000Z"
  },
  "timestamp": "2025-12-05T22:00:00.000Z"
}
```

#### Código de ejemplo

```javascript
async function createTemplate(template) {
  const response = await fetch('https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates', {
    method: 'POST',
    headers: {
      'Auth': 'TU_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(template)
  });
  return response.json();
}

// Uso
const newTemplate = {
  name: 'confirmacion_cita',
  language: 'es_MX',
  category: 'UTILITY',
  components: [
    {
      type: 'BODY',
      text: 'Hola {{1}}, tu cita está confirmada para el {{2}}.'
    }
  ],
  description: 'Template para confirmaciones'
};

const result = await createTemplate(newTemplate);
```

---

### 4. Actualizar Template

Actualiza campos de un template existente.

#### Request

```http
POST /webhook/whatsapp-templates?id={template_id}
Auth: {token}
Content-Type: application/json

{
  "description": "Nueva descripción",
  "is_active": true
}
```

**Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `uuid` | ✅ | ID del template a actualizar |

**Body Parameters (todos opcionales):**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | `string` | Nuevo nombre |
| `language` | `string` | Nuevo idioma |
| `category` | `string` | Nueva categoría |
| `description` | `string` | Nueva descripción |
| `is_active` | `boolean` | Activar/desactivar template |

#### Response

```json
{
  "success": true,
  "data": {
    "id": "c38b4baf-b206-417c-a1ad-c3d35b1ece31",
    "description": "Nueva descripción",
    "is_active": true,
    "updated_at": "2025-12-05T22:00:00.000Z"
  },
  "timestamp": "2025-12-05T22:00:00.000Z"
}
```

#### Código de ejemplo

```javascript
async function updateTemplate(templateId, updates) {
  const response = await fetch(
    `https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates?id=${templateId}`,
    {
      method: 'POST',
      headers: {
        'Auth': 'TU_TOKEN',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }
  );
  return response.json();
}

// Uso
await updateTemplate('c38b4baf-b206-417c-a1ad-c3d35b1ece31', {
  description: 'Descripción actualizada',
  is_active: true
});
```

---

### 5. Eliminar Template

Realiza un soft delete del template (marca `is_active = false`).

#### Request

```http
POST /webhook/whatsapp-templates?id={template_id}
Auth: {token}
Content-Type: application/json

{
  "_method": "DELETE"
}
```

**Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `uuid` | ✅ | ID del template a eliminar |

**Body:**

```json
{
  "_method": "DELETE"
}
```

> ⚠️ **Importante:** El body debe contener exactamente `{"_method": "DELETE"}` para que se ejecute la eliminación.

#### Response

```json
{
  "success": true,
  "data": {
    "id": "c38b4baf-b206-417c-a1ad-c3d35b1ece31",
    "is_active": false,
    "updated_at": "2025-12-05T22:00:00.000Z"
  },
  "timestamp": "2025-12-05T22:00:00.000Z"
}
```

#### Código de ejemplo

```javascript
async function deleteTemplate(templateId) {
  const response = await fetch(
    `https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates?id=${templateId}`,
    {
      method: 'POST',
      headers: {
        'Auth': 'TU_TOKEN',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ _method: 'DELETE' })
    }
  );
  return response.json();
}
```

---

### 6. Sincronizar desde uChat

Sincroniza los templates desde uChat hacia la base de datos local.

#### Request

```http
POST /webhook/whatsapp-templates?action=sync
Auth: {token}
Content-Type: application/json
```

**Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `action` | `string` | ✅ | Debe ser `sync` |

**Body:** Vacío o `{}`

#### Response

```json
{
  "success": true,
  "data": {
    "synced": 5,
    "templates": [
      {
        "name": "template_1",
        "status": "APPROVED"
      },
      {
        "name": "template_2",
        "status": "APPROVED"
      }
    ]
  },
  "timestamp": "2025-12-05T22:00:00.000Z"
}
```

#### Código de ejemplo

```javascript
async function syncTemplates() {
  const response = await fetch(
    'https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates?action=sync',
    {
      method: 'POST',
      headers: {
        'Auth': 'TU_TOKEN',
        'Content-Type': 'application/json'
      }
    }
  );
  return response.json();
}
```

---

## API de Envío de Templates

**Endpoint:** `/webhook/whatsapp-templates-send`  
**Método:** `POST`

---

### Enviar Template

Envía un template de WhatsApp a un prospecto o suscriptor.

#### Request

```http
POST /webhook/whatsapp-templates-send
Auth: {token}
Content-Type: application/json

{
  "template_id": "c38b4baf-b206-417c-a1ad-c3d35b1ece31",
  "template_name": "second_call_attempt",
  "prospecto_id": "98e04be4-af91-4adf-a455-17e4fdfb2776",
  "variables": {
    "1": "Antonio"
  },
  "triggered_by": "MANUAL"
}
```

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `template_id` | `uuid` | ✅ | ID del template en la base de datos |
| `template_name` | `string` | ✅ | Nombre del template (debe coincidir) |
| `prospecto_id` | `uuid` | ⚠️ | ID del prospecto (obtiene `id_uchat` automáticamente) |
| `subscriber_ns` | `string` | ⚠️ | ID de suscriptor en uChat (alternativa a prospecto_id) |
| `phone_number` | `string` | ❌ | Número de teléfono (se obtiene del prospecto si no se envía) |
| `variables` | `object` | ❌ | Variables del template |
| `triggered_by` | `string` | ❌ | Origen del envío (default: `API`) |

> ⚠️ Se requiere `prospecto_id` **O** `subscriber_ns`, no ambos.

**Valores para `triggered_by`:**

| Valor | Descripción |
|-------|-------------|
| `MANUAL` | Enviado manualmente por usuario |
| `WORKFLOW` | Enviado por otro workflow de n8n |
| `API` | Enviado por integración externa |

#### Formato de Variables

Las variables se envían como objeto con keys numéricas:

```json
{
  "variables": {
    "1": "Valor para {{1}}",
    "2": "Valor para {{2}}",
    "3": "Valor para {{3}}"
  }
}
```

El sistema convierte automáticamente al formato requerido por uChat:

```
{"1": "Antonio"} → {"BODY_{{1}}": "Antonio"}
```

#### Response Exitoso

```json
{
  "success": true,
  "message": "Template enviado exitosamente",
  "data": {
    "send_id": "fd26f8a1-d005-484c-9552-acf382e4e42c",
    "template_name": "second_call_attempt",
    "prospecto_nombre": "Antonio Lomelí Galván",
    "phone_number": "5213334403059",
    "subscriber_ns": "f190385u464774809",
    "triggered_by": "API",
    "sent_at": "2025-12-05T22:12:29.201Z"
  },
  "timestamp": "2025-12-05T22:12:29.237Z"
}
```

#### Response de Error

```json
{
  "success": false,
  "error": "Template no encontrado, inactivo o no aprobado",
  "timestamp": "2025-12-05T22:12:29.237Z"
}
```

#### Código de ejemplo

```javascript
async function sendTemplate({
  templateId,
  templateName,
  prospectoId,
  subscriberNs,
  variables,
  triggeredBy = 'API'
}) {
  const payload = {
    template_id: templateId,
    template_name: templateName,
    variables: variables || {},
    triggered_by: triggeredBy
  };

  // Usar prospecto_id o subscriber_ns
  if (prospectoId) {
    payload.prospecto_id = prospectoId;
  } else if (subscriberNs) {
    payload.subscriber_ns = subscriberNs;
  }

  const response = await fetch(
    'https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates-send',
    {
      method: 'POST',
      headers: {
        'Auth': 'TU_TOKEN',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );
  return response.json();
}

// Uso con prospecto_id
await sendTemplate({
  templateId: 'c38b4baf-b206-417c-a1ad-c3d35b1ece31',
  templateName: 'second_call_attempt',
  prospectoId: '98e04be4-af91-4adf-a455-17e4fdfb2776',
  variables: { '1': 'Antonio' },
  triggeredBy: 'MANUAL'
});

// Uso con subscriber_ns directo
await sendTemplate({
  templateId: 'c38b4baf-b206-417c-a1ad-c3d35b1ece31',
  templateName: 'second_call_attempt',
  subscriberNs: 'f190385u464774809',
  variables: { '1': 'Antonio' }
});
```

---

## Modelos de Datos

### Template

```typescript
interface Template {
  id: string;                    // UUID
  name: string;                  // Nombre único (snake_case)
  language: string;              // Código de idioma
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  components: Component[];       // Array de componentes
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED';
  rejection_reason: string | null;
  uchat_synced: boolean;
  last_synced_at: string | null; // ISO timestamp
  is_active: boolean;
  description: string | null;
  created_by: string | null;
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
}
```

### Component

```typescript
interface Component {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'; // Solo para HEADER
  text?: string;
  buttons?: Button[];            // Solo para BUTTONS
  example?: {
    body_text?: string[][];
    header_handle?: string[];
  };
}
```

### Button

```typescript
interface Button {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;                  // Solo para URL
  phone_number?: string;         // Solo para PHONE_NUMBER
}
```

### TemplateSend (Log de envío)

```typescript
interface TemplateSend {
  id: string;                    // UUID
  template_id: string;           // UUID
  prospecto_id: string | null;   // UUID
  phone_number: string;
  subscriber_ns: string;
  variables: Record<string, string>;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  uchat_response: object;
  triggered_by: 'MANUAL' | 'WORKFLOW' | 'API';
  sent_at: string;               // ISO timestamp
  created_at: string;            // ISO timestamp
}
```

---

## Códigos de Error

### Errores HTTP

| Código | Descripción |
|--------|-------------|
| `200` | Éxito |
| `400` | Bad Request - Parámetros inválidos |
| `403` | Forbidden - Token inválido o no autorizado |
| `404` | Not Found - Recurso no encontrado |
| `422` | Unprocessable Entity - Error de validación |
| `500` | Internal Server Error |

### Errores de Negocio

| Error | Causa | Solución |
|-------|-------|----------|
| `Se requiere template_id o template_name` | Falta identificador del template | Enviar `template_id` y/o `template_name` |
| `Se requiere prospecto_id o subscriber_ns` | Falta identificador del destinatario | Enviar `prospecto_id` o `subscriber_ns` |
| `Template no encontrado, inactivo o no aprobado` | Template inexistente o no disponible | Verificar ID y status del template |
| `No se encontró subscriber_ns` | Prospecto sin `id_uchat` | Verificar datos del prospecto en DB |

### Errores de uChat/WhatsApp

| Código | Error | Causa | Solución |
|--------|-------|-------|----------|
| `422` | `content.namespace field is required` | Falta namespace en payload | Error interno - contactar soporte |
| `#132000` | `Number of parameters does not match` | Variables incorrectas | Verificar número de variables del template |
| `#131008` | `Required parameter is missing` | Falta parámetro requerido | Enviar todas las variables |
| `#131048` | `Message failed to send` | Restricciones de cuenta | Verificar estado de cuenta en uChat |

---

## Ejemplos de Integración

### Cliente TypeScript/JavaScript completo

```typescript
// lib/whatsapp-api.ts

const BASE_URL = 'https://primary-dev-d75a.up.railway.app';

interface ApiConfig {
  authToken: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export class WhatsAppTemplatesAPI {
  private authToken: string;

  constructor(config: ApiConfig) {
    this.authToken = config.authToken;
  }

  private async request<T>(
    endpoint: string,
    body?: object
  ): Promise<ApiResponse<T>> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Auth': this.authToken,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    return response.json();
  }

  // ==================== GESTIÓN ====================

  async listTemplates() {
    return this.request<Template[]>('/webhook/whatsapp-templates');
  }

  async getTemplate(id: string) {
    return this.request<Template>(`/webhook/whatsapp-templates?id=${id}`);
  }

  async createTemplate(template: CreateTemplateInput) {
    return this.request<Template>('/webhook/whatsapp-templates', template);
  }

  async updateTemplate(id: string, updates: UpdateTemplateInput) {
    return this.request<Template>(`/webhook/whatsapp-templates?id=${id}`, updates);
  }

  async deleteTemplate(id: string) {
    return this.request<Template>(
      `/webhook/whatsapp-templates?id=${id}`,
      { _method: 'DELETE' }
    );
  }

  async syncTemplates() {
    return this.request<{ synced: number; templates: Template[] }>(
      '/webhook/whatsapp-templates?action=sync'
    );
  }

  // ==================== ENVÍO ====================

  async sendTemplate(input: SendTemplateInput) {
    return this.request<SendTemplateResponse>(
      '/webhook/whatsapp-templates-send',
      {
        template_id: input.templateId,
        template_name: input.templateName,
        prospecto_id: input.prospectoId,
        subscriber_ns: input.subscriberNs,
        variables: input.variables,
        triggered_by: input.triggeredBy || 'API'
      }
    );
  }
}

// ==================== TIPOS ====================

interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  components: Component[];
  status: string;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface Component {
  type: string;
  format?: string;
  text?: string;
  buttons?: Button[];
}

interface Button {
  type: string;
  text: string;
  url?: string;
  phone_number?: string;
}

interface CreateTemplateInput {
  name: string;
  language: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  components: Component[];
  description?: string;
}

interface UpdateTemplateInput {
  name?: string;
  language?: string;
  category?: string;
  description?: string;
  is_active?: boolean;
}

interface SendTemplateInput {
  templateId: string;
  templateName: string;
  prospectoId?: string;
  subscriberNs?: string;
  variables?: Record<string, string>;
  triggeredBy?: 'MANUAL' | 'WORKFLOW' | 'API';
}

interface SendTemplateResponse {
  send_id: string;
  template_name: string;
  prospecto_nombre: string;
  phone_number: string;
  subscriber_ns: string;
  triggered_by: string;
  sent_at: string;
}

// ==================== USO ====================

const api = new WhatsAppTemplatesAPI({
  authToken: 'TU_TOKEN_AQUI'
});

// Listar
const templates = await api.listTemplates();

// Obtener uno
const template = await api.getTemplate('uuid-del-template');

// Crear
const newTemplate = await api.createTemplate({
  name: 'mi_template',
  language: 'es_MX',
  category: 'UTILITY',
  components: [{ type: 'BODY', text: 'Hola {{1}}' }]
});

// Enviar
const result = await api.sendTemplate({
  templateId: 'uuid-template',
  templateName: 'mi_template',
  prospectoId: 'uuid-prospecto',
  variables: { '1': 'Juan' }
});
```

### React Hook

```typescript
// hooks/useWhatsAppTemplates.ts
import { useState, useCallback } from 'react';
import { WhatsAppTemplatesAPI } from '@/lib/whatsapp-api';

const api = new WhatsAppTemplatesAPI({
  authToken: process.env.NEXT_PUBLIC_WHATSAPP_TOKEN!
});

export function useWhatsAppTemplates() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.listTemplates();
      if (!result.success) throw new Error(result.error);
      return result.data;
    } catch (e) {
      setError(e.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const sendTemplate = useCallback(async (input) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.sendTemplate(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    listTemplates,
    sendTemplate,
    // ... otros métodos
  };
}
```

---

## Notas Adicionales

### Límites y Restricciones

- Los nombres de templates deben ser únicos y en `snake_case`
- El body del template tiene un límite de 1024 caracteres
- El footer tiene un límite de 60 caracteres
- Los botones tienen un límite de 25 caracteres
- Máximo 3 botones por template
- Las variables usan formato `{{n}}` donde n es un número secuencial

### Flujo de Aprobación

1. **PENDING** - Template recién creado, esperando aprobación de Meta
2. **APPROVED** - Aprobado y listo para usar
3. **REJECTED** - Rechazado por Meta (ver `rejection_reason`)
4. **PAUSED** - Pausado temporalmente
5. **DISABLED** - Deshabilitado permanentemente

### Mejores Prácticas

1. Siempre sincronizar templates después de crear/modificar en WhatsApp Business Manager
2. Verificar que el template esté en status `APPROVED` antes de enviar
3. Usar `prospecto_id` cuando sea posible para mantener trazabilidad
4. Incluir `triggered_by` para auditoría de envíos
5. Manejar errores de forma graceful y mostrar mensajes claros al usuario

---

> **Soporte:** Para dudas o problemas, contactar al equipo de desarrollo.

