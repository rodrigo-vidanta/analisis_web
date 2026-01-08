# Índice de Workflows N8N — PQNC QA AI Platform

**Actualizado:** 2025-01-07
**Total Workflows:** 5

---

## 📊 Resumen de Workflows

| Estado | Cantidad |
|--------|----------|
| ✅ Activos | 5 |
| ⏸️ Inactivos | 0 |
| 🗑️ Archivados | 0 |

---

## 🔥 Workflows Críticos (Producción)

### 1. Guardrail agentic logic [PROD]

| Propiedad | Valor |
|-----------|-------|
| **ID** | `Q5pWOsixILUmnWP3` |
| **Estado** | ✅ Activo |
| **Creado** | 2025-10-15 |
| **Actualizado** | 2025-12-04 |
| **Triggers** | Execute Workflow Trigger, Webhook |
| **Total Nodos** | 79 |

**Descripción:**
Este flujo valida que todos los mensajes generados por el agente cumplan con los requerimientos y normativas de la empresa, que estén validados con información de la base de conocimiento y no prometan acciones fuera de su alcance.

**Capas de Validación:**
1. **Capa 1:** White & Black list (palabras prohibidas, URLs, emails, teléfonos)
2. **Capa 2:** Longitud, emojis, saludo repetido
3. **Capa 3:** Detección de alucinaciones (LLM)
4. **Capa 4:** Validación de capacidades y limitaciones

**Nodos LLM:**
- Anthropic Claude Haiku 4.5
- Azure OpenAI GPT-4.1-mini
- Google Vertex

**Webhook de Prueba:**
- URL: `POST /webhook/test-guardrail`
- Auth: Header `Authorization`

---

### 2. Logica de llamadas programadas [PROD]

| Propiedad | Valor |
|-----------|-------|
| **ID** | `HYRGSVN86YY64pBS` |
| **Estado** | ✅ Activo |
| **Creado** | 2025-11-10 |
| **Actualizado** | 2025-12-18 |
| **Triggers** | Execute Workflow Trigger, Webhook |
| **Total Nodos** | 48 |

**Descripción:**
Centraliza la lógica de si debe realizarse una llamada o no en base a reglas de negocio e interpretación de conversaciones de WhatsApp o llamadas telefónicas.

**Funcionalidades:**
- Análisis de historial de llamadas
- Lógica de reintentos inteligente
- Patrones de comportamiento
- Validación de horarios (DB configurable)
- Estrategia de llamadas (LLM)

**Integraciones:**
- PostgreSQL (historial, horarios)
- Redis (cache retroalimentación)
- Airtable (prompts agentes)
- LLMs (Anthropic, Azure, Google)

---

### 3. VAPI-Natalia_transfer_tool [PROD]

| Propiedad | Valor |
|-----------|-------|
| **ID** | `qpk8xsMI50IWltFV` |
| **Estado** | ✅ Activo |
| **Creado** | 2025-09-22 |
| **Actualizado** | 2025-12-22 |
| **Trigger** | Webhook |
| **Total Nodos** | 38 |

**Descripción:**
Herramienta de transferencia para el agente de voz VAPI Natalia. Maneja la lógica de cuándo y cómo transferir llamadas a ejecutivos humanos.

**Funcionalidades:**
- Búsqueda de prospectos por ID
- Búsqueda de ejecutivos disponibles
- Búsqueda de DIDs
- Determinación de necesidad de transferencia
- Ejecución de transferencia vía API
- Actualización de estado en BD

**Webhook:**
- Recibe solicitudes de VAPI
- Retorna detalles de la llamada
- Ejecuta transfers cuando es necesario

---

## 📱 Workflows de WhatsApp

### 4. [api]-whatsapp-templates-gestion

| Propiedad | Valor |
|-----------|-------|
| **ID** | `99xohF9xOZT2nIe5` |
| **Estado** | ✅ Activo |
| **Creado** | 2025-12-05 |
| **Actualizado** | 2025-12-11 |
| **Trigger** | Webhook |
| **Total Nodos** | 23 |

**Descripción:**
API para gestión de plantillas de WhatsApp. Proporciona operaciones CRUD y sincronización con uChat.

**Operaciones:**
| Operación | Descripción |
|-----------|-------------|
| `LIST` | Listar todas las plantillas |
| `GET` | Obtener plantilla por ID |
| `CREATE` | Crear nueva plantilla |
| `DELETE` | Soft delete de plantilla |
| `SYNC` | Sincronizar con uChat |

**Respuestas:**
- Formato JSON estandarizado
- Manejo de errores con logging

---

### 5. [api]-whatsapp-templates-envio-v2

| Propiedad | Valor |
|-----------|-------|
| **ID** | `pZSsb89s4ZqN8Pl6` |
| **Estado** | ✅ Activo |
| **Creado** | 2025-12-05 |
| **Actualizado** | 2025-12-12 |
| **Trigger** | Webhook |
| **Total Nodos** | 31 |

**Descripción:**
API para envío de plantillas de WhatsApp con soporte para imágenes almacenadas en Google Cloud Storage.

**Flujo:**
1. Validar request
2. Obtener template + datos prospecto
3. Si tiene imagen header → subir a GCS
4. Construir payload para uChat
5. Enviar template
6. Registrar mensaje en BD
7. Vincular a conversación
8. Actualizar datos plantilla

**Integraciones:**
- uChat API (envío WhatsApp)
- Google Cloud Storage (imágenes)
- PostgreSQL (mensajes, templates)

---

## 🏷️ Tipos de Trigger por Workflow

| Workflow | Execute Workflow | Webhook | Scheduled |
|----------|-----------------|---------|-----------|
| Guardrail agentic logic | ✅ | ✅ | ❌ |
| Logica de llamadas programadas | ✅ | ✅ | ❌ |
| VAPI-Natalia_transfer_tool | ❌ | ✅ | ❌ |
| whatsapp-templates-gestion | ❌ | ✅ | ❌ |
| whatsapp-templates-envio-v2 | ❌ | ✅ | ❌ |

---

## 🔌 Nodos Más Utilizados

| Tipo de Nodo | Cantidad Total | Workflows |
|--------------|----------------|-----------|
| `n8n-nodes-base.postgres` | 30+ | Todos |
| `n8n-nodes-base.code` | 25+ | Todos |
| `n8n-nodes-base.set` | 20+ | Todos |
| `n8n-nodes-base.if` | 15+ | Guardrail, Llamadas |
| `n8n-nodes-base.webhook` | 5 | Todos |
| `n8n-nodes-base.httpRequest` | 8+ | Templates, VAPI |
| `@n8n/n8n-nodes-langchain.chainLlm` | 8 | Guardrail, Llamadas |
| `n8n-nodes-base.redis` | 12 | Guardrail, Llamadas |
| `n8n-nodes-base.airtable` | 6 | Guardrail, Llamadas |
| `n8n-nodes-base.merge` | 10+ | Guardrail |

---

## 📈 Estadísticas de Ejecución

### Configuración de Retención
- **Máximo de ejecuciones:** 50,000
- **Edad máxima:** 720 horas (30 días)
- **Pruning:** Habilitado

### Concurrencia
- **Límite:** 50 ejecuciones simultáneas
- **Modo:** Scaling (single-main)

---

## 🔐 Seguridad de Webhooks

### Autenticación Requerida

| Workflow | Auth Type | Header |
|----------|-----------|--------|
| Guardrail | Header Auth | `Authorization` |
| Llamadas | Header Auth | `Authorization` |
| VAPI Transfer | Sin auth pública | N/A |
| Templates Gestión | Sin auth pública | N/A |
| Templates Envío | Sin auth pública | N/A |

⚠️ **Nota:** Algunos webhooks están expuestos sin autenticación. Se recomienda agregar auth para producción.

---

## 📝 Notas de Mantenimiento

### Workflows Críticos
- **NUNCA** desactivar sin notificar al equipo
- **Siempre** probar en webhook-test primero
- **Documentar** cualquier cambio en este índice

### Recomendaciones
1. Revisar logs de error periódicamente
2. Monitorear uso de recursos LLM
3. Verificar rate limits de APIs externas
4. Mantener credenciales actualizadas

---

## 🔄 Historial de Cambios

| Fecha | Cambio |
|-------|--------|
| 2025-01-07 | Creación inicial del índice |
| 2025-12-22 | Última actualización VAPI Transfer |
| 2025-12-18 | Última actualización Lógica Llamadas |
| 2025-12-12 | Última actualización Templates Envío |

---

**Última actualización:** 2025-01-07

