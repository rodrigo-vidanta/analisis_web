# Catálogo MCP N8N — PQNC QA AI Platform

**Actualizado:** 2025-01-07
**Versión:** 1.0.0

---

## 📋 Información de la Instancia

| Propiedad | Valor |
|-----------|-------|
| **n8n Version** | 1.121.3 |
| **Platform** | Docker (self-hosted) |
| **Hosting** | Railway |
| **Base URL** | `https://primary-dev-d75a.up.railway.app` |
| **API Docs** | `https://primary-dev-d75a.up.railway.app/api/v1/docs/` |
| **Instance ID** | `cd55aa12663cca66c362f6923b086640c04692cadff2ee7c0ba1470b0885fdd7` |
| **Consumer ID** | `d32b4e22-58cd-4089-ae80-705a73593ee4` |
| **License** | Enterprise (production) |
| **Database** | PostgreSQL |
| **Node.js** | 22.21.0 |
| **Execution Mode** | Scaling (single-main) |
| **Concurrency** | 50 |

---

## 🔧 Configuración del MCP

### Conexión Actual

El MCP de N8N está configurado en `~/.cursor/mcp.json` usando **supergateway** para conectar al endpoint MCP de n8n:

```json
{
  "N8N": {
    "command": "npx",
    "args": [
      "-y",
      "supergateway",
      "--streamableHttp",
      "https://primary-dev-d75a.up.railway.app/mcp-server/http",
      "--header",
      "Authorization: Bearer <API_KEY>"
    ]
  }
}
```

### API Keys Disponibles

| Nombre | Audiencia | Uso | Almacenamiento |
|--------|-----------|-----|----------------|
| API_KEY | `public-api` | API REST general | SystemUI: `system_credentials` |
| MCP_API_KEY | `mcp-server-api` | Conexión MCP | SystemUI: `system_credentials` |
| BASE_URL | N/A | URL de la instancia | SystemUI: `system_credentials` |

### 🔐 Almacenamiento Seguro de Credenciales

Las credenciales de N8N están almacenadas en la tabla `system_credentials` de **Supabase SystemUI**:

```sql
-- Consultar credenciales de N8N
SELECT service_name, credential_key, description, service_url, is_active, created_at
FROM system_credentials
WHERE service_name = 'N8N' AND is_active = true;
```

**Servicio TypeScript:** `src/services/credentialsService.ts`

```typescript
import { credentialsService } from '../services/credentialsService';

// Obtener todas las credenciales de N8N
const n8nCreds = await credentialsService.getN8NCredentials();
console.log(n8nCreds.apiKey, n8nCreds.baseUrl);

// Obtener una credencial específica
const apiKey = await credentialsService.getCredential('N8N', 'API_KEY');
```

⚠️ **IMPORTANTE**: Las API keys están en base de datos y NO deben hardcodearse en código ni exponerse en logs.

---

## 📊 Capacidades de Storage y Pruning

### Storage Configuration
| Setting | Value |
|---------|-------|
| Success Executions | All |
| Error Executions | All |
| Progress | Disabled |
| Manual Executions | Enabled |
| Binary Mode | Memory |

### Pruning Configuration
| Setting | Value |
|---------|-------|
| Enabled | Yes |
| Max Age | 720 hours (30 días) |
| Max Count | 50,000 executions |

---

## 🔌 API Endpoints Completos

### 👤 Users (`/users`)

| Método | Endpoint | Descripción | Riesgo |
|--------|----------|-------------|--------|
| GET | `/users` | Listar todos los usuarios | 🟢 Bajo |
| POST | `/users` | Crear múltiples usuarios | 🟡 Medio |
| GET | `/users/{id}` | Obtener usuario por ID o Email | 🟢 Bajo |
| DELETE | `/users/{id}` | Eliminar usuario | 🔴 Alto |
| PATCH | `/users/{id}/role` | Cambiar rol global del usuario | 🟡 Medio |

### 🔐 Audit (`/audit`)

| Método | Endpoint | Descripción | Riesgo |
|--------|----------|-------------|--------|
| POST | `/audit` | Generar auditoría de seguridad | 🟢 Bajo |

### ⚡ Executions (`/executions`)

| Método | Endpoint | Descripción | Riesgo |
|--------|----------|-------------|--------|
| GET | `/executions` | Listar todas las ejecuciones | 🟢 Bajo |
| GET | `/executions/{id}` | Obtener detalle de ejecución | 🟢 Bajo |
| DELETE | `/executions/{id}` | Eliminar ejecución | 🟡 Medio |
| POST | `/executions/{id}/retry` | Reintentar ejecución fallida | 🟡 Medio |

### 🔄 Workflows (`/workflows`)

| Método | Endpoint | Descripción | Riesgo |
|--------|----------|-------------|--------|
| GET | `/workflows` | Listar todos los workflows | 🟢 Bajo |
| POST | `/workflows` | Crear nuevo workflow | 🟡 Medio |
| GET | `/workflows/{id}` | Obtener workflow completo | 🟢 Bajo |
| PUT | `/workflows/{id}` | Actualizar workflow | 🟡 Medio |
| DELETE | `/workflows/{id}` | Eliminar workflow | 🔴 Alto |
| POST | `/workflows/{id}/activate` | Activar workflow | 🟡 Medio |
| POST | `/workflows/{id}/deactivate` | Desactivar workflow | 🔴 Alto |
| PUT | `/workflows/{id}/transfer` | Transferir a otro proyecto | 🟡 Medio |
| GET | `/workflows/{id}/tags` | Obtener tags del workflow | 🟢 Bajo |
| PUT | `/workflows/{id}/tags` | Actualizar tags | 🟢 Bajo |

### 🔑 Credentials (`/credentials`)

| Método | Endpoint | Descripción | Riesgo |
|--------|----------|-------------|--------|
| POST | `/credentials` | Crear nueva credencial | 🟡 Medio |
| DELETE | `/credentials/{id}` | Eliminar credencial | 🔴 Alto |
| GET | `/credentials/schema/{type}` | Ver esquema de tipo de credencial | 🟢 Bajo |
| PUT | `/credentials/{id}/transfer` | Transferir credencial | 🟡 Medio |

### 🏷️ Tags (`/tags`)

| Método | Endpoint | Descripción | Riesgo |
|--------|----------|-------------|--------|
| GET | `/tags` | Listar todos los tags | 🟢 Bajo |
| POST | `/tags` | Crear tag | 🟢 Bajo |
| GET | `/tags/{id}` | Obtener tag | 🟢 Bajo |
| PUT | `/tags/{id}` | Actualizar tag | 🟢 Bajo |
| DELETE | `/tags/{id}` | Eliminar tag | 🟡 Medio |

### 🔧 Variables (`/variables`)

| Método | Endpoint | Descripción | Riesgo |
|--------|----------|-------------|--------|
| GET | `/variables` | Listar variables | 🟢 Bajo |
| POST | `/variables` | Crear variable | 🟡 Medio |
| PUT | `/variables/{id}` | Actualizar variable | 🟡 Medio |
| DELETE | `/variables/{id}` | Eliminar variable | 🟡 Medio |

### 📁 Projects (`/projects`)

| Método | Endpoint | Descripción | Riesgo |
|--------|----------|-------------|--------|
| GET | `/projects` | Listar proyectos | 🟢 Bajo |
| POST | `/projects` | Crear proyecto | 🟡 Medio |
| PUT | `/projects/{projectId}` | Actualizar proyecto | 🟡 Medio |
| DELETE | `/projects/{projectId}` | Eliminar proyecto | 🔴 Alto |
| POST | `/projects/{projectId}/users` | Agregar usuarios al proyecto | 🟡 Medio |
| DELETE | `/projects/{projectId}/users/{userId}` | Remover usuario | 🟡 Medio |
| PATCH | `/projects/{projectId}/users/{userId}` | Cambiar rol de usuario | 🟡 Medio |

### 📥 Source Control (`/source-control`)

| Método | Endpoint | Descripción | Riesgo |
|--------|----------|-------------|--------|
| POST | `/source-control/pull` | Pull desde repositorio remoto | 🟡 Medio |

---

## 🔧 Herramientas MCP Disponibles

### Actualmente Habilitadas

| Tool | Descripción | Uso |
|------|-------------|-----|
| `mcp_N8N_search_workflows` | Buscar workflows con filtros opcionales | Listar y buscar |
| `mcp_N8N_get_workflow_details` | Obtener detalles completos de un workflow | Inspección |
| `mcp_N8N_execute_workflow` | Ejecutar workflow por ID | Ejecución |

### Ejemplos de Uso

#### Buscar Workflows
```
mcp_N8N_search_workflows
  query: "PROD"
  limit: 50
```

#### Obtener Detalles
```
mcp_N8N_get_workflow_details
  workflowId: "Q5pWOsixILUmnWP3"
```

#### Ejecutar Workflow (Webhook)
```
mcp_N8N_execute_workflow
  workflowId: "Q5pWOsixILUmnWP3"
  inputs:
    type: "webhook"
    webhookData:
      method: "POST"
      body: { "key": "value" }
```

#### Ejecutar Workflow (Chat)
```
mcp_N8N_execute_workflow
  workflowId: "xxx"
  inputs:
    type: "chat"
    chatInput: "Mensaje del usuario"
```

#### Ejecutar Workflow (Form)
```
mcp_N8N_execute_workflow
  workflowId: "xxx"
  inputs:
    type: "form"
    formData: { "campo1": "valor1" }
```

---

## 📊 Inventario de Workflows

### Workflows Activos en Producción

| ID | Nombre | Descripción | Trigger | Estado |
|----|--------|-------------|---------|--------|
| `Q5pWOsixILUmnWP3` | **Guardrail agentic logic [PROD]** | Validación de mensajes del agente contra normativas y base de conocimiento | Execute Workflow Trigger + Webhook | ✅ Activo |
| `HYRGSVN86YY64pBS` | **Logica de llamadas programadas [PROD]** | Lógica centralizada para determinar si se debe realizar una llamada | Execute Workflow Trigger + Webhook | ✅ Activo |
| `qpk8xsMI50IWltFV` | **VAPI-Natalia_transfer_tool [PROD]** | Herramienta de transferencia para agente VAPI Natalia | Webhook | ✅ Activo |
| `99xohF9xOZT2nIe5` | **[api]-whatsapp-templates-gestion** | Gestión de plantillas de WhatsApp (CRUD) | Webhook | ✅ Activo |
| `pZSsb89s4ZqN8Pl6` | **[api]-whatsapp-templates-envio-v2** | Envío de plantillas de WhatsApp con soporte GCS | Webhook | ✅ Activo |

### Detalle de Workflows

#### 1. Guardrail agentic logic [PROD]

**ID:** `Q5pWOsixILUmnWP3`
**Creado:** 2025-10-15
**Actualizado:** 2025-12-04

**Propósito:**
- Validar que mensajes del agente cumplan normativas
- Verificar información contra base de conocimiento
- Prevenir promesas fuera del alcance del agente

**Nodos Principales:**
- Execute Workflow Trigger
- Airtable (Detalles agente, Black&White list)
- Code (Guardrail capas 1 y 2)
- LangChain (Detector de alucinaciones)
- Redis (Cache de iteraciones)
- Postgres (Error logging)

**Modelos LLM Usados:**
- Claude Haiku 4.5 (Anthropic)
- GPT-4.1-mini (Azure OpenAI)
- Google Vertex

---

#### 2. Logica de llamadas programadas [PROD]

**ID:** `HYRGSVN86YY64pBS`
**Creado:** 2025-11-10
**Actualizado:** 2025-12-18

**Propósito:**
- Centralizar lógica de si debe realizarse una llamada
- Interpretar conversaciones de WhatsApp/llamadas
- Aplicar reglas de negocio para scheduling

**Nodos Principales:**
- Execute Workflow Trigger + Webhook
- Switch (Router de lógica)
- Postgres (Historial llamadas, horarios)
- Code (Lógica de reintentos, patrones)
- LangChain (Estratega de llamadas)
- Redis (Cache retroalimentación)
- Airtable (Prompts agentes)

---

#### 3. VAPI-Natalia_transfer_tool [PROD]

**ID:** `qpk8xsMI50IWltFV`
**Creado:** 2025-09-22
**Actualizado:** 2025-12-22

**Propósito:**
- Manejar transferencias de llamadas VAPI
- Buscar prospectos y ejecutivos
- Generar queries dinámicas para actualización

**Nodos Principales:**
- Webhook
- Postgres (Búsquedas y actualizaciones)
- HTTP Request (Ejecutar transfer)
- Code (Sanitización, generación queries)
- Wait (Delays para sincronización)

---

#### 4. [api]-whatsapp-templates-gestion

**ID:** `99xohF9xOZT2nIe5`
**Creado:** 2025-12-05
**Actualizado:** 2025-12-11

**Propósito:**
- CRUD de plantillas de WhatsApp
- Sincronización con uChat
- Gestión de templates en base de datos

**Endpoints:**
- List Templates
- Get Template
- Create Template
- Soft Delete Template
- Sync with uChat

---

#### 5. [api]-whatsapp-templates-envio-v2

**ID:** `pZSsb89s4ZqN8Pl6`
**Creado:** 2025-12-05
**Actualizado:** 2025-12-12

**Propósito:**
- Envío de plantillas de WhatsApp
- Soporte para imágenes con Google Cloud Storage
- Registro de mensajes y vinculación a conversaciones

**Nodos Principales:**
- Webhook
- Postgres (Templates, prospectos, mensajes)
- HTTP Request (uChat API)
- Execute Workflow (Subir imagen a GCS)
- Code (Validación, formateo)

---

## 🔗 Integraciones Externas

### Servicios Conectados

| Servicio | Tipo | Uso |
|----------|------|-----|
| **PostgreSQL** | Base de datos | Storage principal (pqnc_ai) |
| **Redis** | Cache | Variables temporales, rate limiting |
| **Airtable** | Base de datos | Prompts, configuración agentes |
| **uChat** | API WhatsApp | Envío y recepción mensajes |
| **VAPI** | Voice AI | Agentes de voz |
| **Google Cloud Storage** | Storage | Imágenes para templates |
| **Azure OpenAI** | LLM | Modelos GPT |
| **Anthropic** | LLM | Modelos Claude |
| **Google Vertex AI** | LLM | Modelos Google |

### Credenciales Configuradas (Tipos)

⚠️ **Los valores de credenciales NO se exponen por seguridad**

| Tipo de Credencial | Descripción |
|--------------------|-------------|
| `postgresApi` | Conexión a PostgreSQL |
| `redisApi` | Conexión a Redis |
| `airtableTokenApi` | Token de Airtable |
| `httpHeaderAuth` | Auth para webhooks |
| `anthropicApi` | API Key Anthropic |
| `azureOpenAiApi` | Credenciales Azure OpenAI |
| `googleCloudVertex` | Credenciales GCP |
| `googleCloudStorage` | Credenciales GCS |

---

## ⚠️ Reglas de Seguridad

### Operaciones de Alto Riesgo

| Operación | Riesgo | Recomendación |
|-----------|--------|---------------|
| DELETE workflow | 🔴 Crítico | Confirmar con usuario, hacer backup |
| Deactivate workflow PROD | 🔴 Crítico | Confirmar impacto, notificar equipo |
| DELETE credential | 🔴 Crítico | Verificar que no esté en uso |
| Modificar workflow PROD | 🟠 Alto | Revisar cambios, probar en staging |

### Buenas Prácticas

1. **Antes de modificar [PROD]:**
   - Verificar hora (evitar horario de alta actividad)
   - Informar al equipo
   - Tener plan de rollback

2. **Para debugging:**
   - Revisar ejecuciones recientes primero
   - Verificar logs de error
   - Comprobar conexiones de servicios externos

3. **Para nuevos workflows:**
   - Probar con webhook-test primero
   - Documentar en este catálogo
   - Agregar tags apropiados

---

## 📚 Documentación Relacionada

| Archivo | Descripción |
|---------|-------------|
| `.cursor/rules/n8n-rules.mdc` | Reglas de Cursor para N8N |
| `docs/N8N_WORKFLOWS_INDEX.md` | Índice detallado de workflows |
| `~/.cursor/mcp.json` | Configuración MCP (NO compartir) |

---

## 🔄 Historial de Cambios

| Fecha | Versión | Cambio |
|-------|---------|--------|
| 2025-01-07 | 1.0.0 | Creación inicial del catálogo |

---

**Última actualización:** 2025-01-07 por Samuel Rosales

