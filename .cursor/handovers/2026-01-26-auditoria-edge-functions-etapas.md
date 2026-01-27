# Handover: Auditoría de Edge Functions - Uso de Etapas

**Fecha:** 26 de Enero 2026  
**Autor:** AI Assistant  
**Contexto:** Análisis de todas las Edge Functions para detectar uso de `etapa` previo a migración FK  
**Handover de Referencia:** `.cursor/handovers/2026-01-26-migracion-etapas-sidebars-y-widgets.md`

---

## 📋 Resumen Ejecutivo

Se realizó auditoría completa de las 16 Edge Functions desplegadas en producción (PQNC_AI) para detectar cuáles utilizan el campo `etapa` (string) o `etapa_id` (FK), ya que requieren actualización a la nueva arquitectura de etapas.

**Resultado:** ⚠️ **1 Edge Function ENVÍA etapas desde el frontend**

### ✅ Edge Functions (Proxies)
- **15/16 Edge Functions:** No usan etapas (actúan como proxies transparentes)
- **1/16 Edge Function:** `broadcast-proxy` recibe payload con `etapa` string

### ⚠️ Componente Frontend Crítico
- **Archivo:** `src/components/campaigns/campanas/CampanasManager.tsx`
- **Problema:** Líneas 2706-2712 construyen SQL WHERE con `etapa IN ('...')` 
- **Impacto:** Las campañas WhatsApp filtran prospectos por etapa string
- **Acción:** Actualizar a `etapa_id IN ('...')`

### ⚠️ Tabla Base de Datos
- **Tabla:** `whatsapp_audiences`
- **Problema:** Columna `etapa` (varchar) sin FK a tabla `etapas`
- **Acción:** Agregar columnas `etapa_id` (UUID FK) y `etapa_ids` (UUID[])

---

## 🎯 Acciones Inmediatas Requeridas

| Prioridad | Acción | Archivo/Tabla | Líneas |
|-----------|--------|---------------|--------|
| 🔴 **CRÍTICO** | Actualizar WHERE clause | `CampanasManager.tsx` | 2706-2712 |
| 🔴 **CRÍTICO** | Migrar tabla | `whatsapp_audiences` | SQL |
| 🟡 **MEDIA** | Actualizar interface | `WhatsAppAudience` | types/whatsappTemplates.ts |
| 🟢 **BAJA** | Auditoría N8N | Workflows Railway | Manual |

---

## 🔍 Metodología de Auditoría

### 1. Identificación de Edge Functions

**Fuentes consultadas:**
- Grep de todo el código frontend para encontrar invocaciones a Edge Functions
- Lectura de `docs/EDGE_FUNCTIONS_CATALOG.md`
- Listado de archivos en `supabase/functions/`

**Edge Functions encontradas (16 activas):**

| Función | Propósito | Endpoint N8N/API |
|---------|-----------|------------------|
| `send-message-proxy` | Envío mensajes WhatsApp | N8N Railway |
| `send-img-proxy` | Envío imágenes WhatsApp | N8N Railway |
| `pause-bot-proxy` | Pausar/reanudar bot | N8N Railway |
| `broadcast-proxy` | Broadcast mensajes | N8N Railway |
| `dynamics-lead-proxy` | Consulta lead Dynamics | N8N Railway |
| `dynamics-reasignar-proxy` | Reasignación Dynamics | N8N Railway |
| `transfer-request-proxy` | Solicitar transferencia | N8N Railway |
| `tools-proxy` | Herramientas llamadas | N8N Railway |
| `trigger-manual-proxy` | Llamadas manuales | N8N Railway |
| `anthropic-proxy` | API Claude | Anthropic API |
| `paraphrase-proxy` | Parafraseo IA | N8N Railway |
| `auth-admin-proxy` | Operaciones admin | Supabase PQNC_AI |
| `multi-db-proxy` | Proxy multi-BD | PQNC_QA/LOGMONITOR |
| `secure-query` | Consultas seguras | Supabase PQNC_AI |
| `generar-url-optimizada` | URLs optimizadas | N8N Railway |
| `error-log-proxy` | Log de errores | N8N Railway |

### 2. Análisis de Código

Para cada Edge Function se verificó:
- ✅ Lectura completa del archivo `index.ts`
- ✅ Búsqueda de la palabra clave `etapa` (case insensitive)
- ✅ Análisis del payload que se envía a N8N/APIs externas
- ✅ Verificación de si se lee/modifica campos de prospectos

---

## 📊 Resultados Detallados

### ⚠️ Edge Function que SÍ usa etapas (1/16)

#### `broadcast-proxy` - Envío masivo de mensajes WhatsApp

**Archivo frontend:** `src/components/campaigns/campanas/CampanasManager.tsx`

**Problema detectado (líneas 2706-2712):**
```typescript
// WHERE base de la audiencia
let baseWhere = 'WHERE 1=1';

// Filtro de etapas (IN - múltiple)
if (audience?.etapas?.length) {
  baseWhere += ` AND etapa IN ('${audience.etapas.join("','")}')`;
} else if (audience?.etapa) {
  // Compatibilidad legacy: etapa singular
  baseWhere += ` AND etapa = '${audience.etapa}'`;
}
```

**Análisis:**
- El frontend construye una cláusula SQL WHERE que filtra por `etapa` (string)
- Esta cláusula se envía en el payload a `broadcast-proxy` (líneas 2813-2844)
- El workflow de N8N usa esta cláusula para hacer `SELECT * FROM prospectos WHERE ...`
- **IMPACTO:** Las campañas WhatsApp filtran prospectos por etapa string

**Payload enviado a `broadcast-proxy`:**
```typescript
const payload = {
  nombre: formData.nombre,
  // ... otros campos
  where_clause_a: whereA, // ⚠️ Contiene "etapa IN ('valor1', 'valor2')"
  where_clause_b: whereB, // ⚠️ Contiene "etapa IN ('valor1', 'valor2')"
  // ... más campos
};
```

**✅ Solución requerida:**
Actualizar líneas 2706-2712 para usar `etapa_id` en lugar de `etapa`:

```typescript
// ANTES (líneas 2706-2712):
if (audience?.etapas?.length) {
  baseWhere += ` AND etapa IN ('${audience.etapas.join("','")}')`;
} else if (audience?.etapa) {
  baseWhere += ` AND etapa = '${audience.etapa}'`;
}

// DESPUÉS (propuesto):
if (audience?.etapa_ids?.length) {
  baseWhere += ` AND etapa_id IN ('${audience.etapa_ids.join("','")}')`;
} else if (audience?.etapa_id) {
  baseWhere += ` AND etapa_id = '${audience.etapa_id}'`;
}
```

**⚠️ CRÍTICO:**
- También se debe actualizar la tabla `whatsapp_audiences` para tener campos `etapa_ids` (UUID[]) en lugar de `etapas` (text[])
- O bien, si ya tiene `etapa_ids`, actualizar el código para usarlo
- El workflow N8N **NO requiere cambios** (usa la cláusula WHERE tal cual)

---

### Edge Functions que NO usan etapas (15/16)

#### Grupo 1: Proxies WhatsApp (4)

| Función | Análisis | Payload |
|---------|----------|---------|
| `send-message-proxy` | ✅ No usa etapas | `{ message, uchat_id, type, ttl, id_sender? }` |
| `send-img-proxy` | ✅ No usa etapas | `[{ imagenes, caption, request_id }]` |
| `pause-bot-proxy` | ✅ No usa etapas | `{ uchat_id, ttl }` |
| `broadcast-proxy` | ✅ No usa etapas | `{ payload_campaña_completo }` |

**Conclusión:** Operan con conversaciones (uchat_id), no con prospectos.

---

#### Grupo 2: Proxies Dynamics CRM (2)

| Función | Análisis | Payload |
|---------|----------|---------|
| `dynamics-lead-proxy` | ✅ No usa etapas | `{ id_dynamics?, email?, phone? }` |
| `dynamics-reasignar-proxy` | ✅ No usa etapas | `{ prospecto_id, nuevo_ejecutivo_id, nueva_coordinacion_id, ... }` |

**Análisis detallado:**

**`dynamics-lead-proxy`:**
```typescript
// Payload enviado a N8N:
{
  id_dynamics?: string,
  email?: string,
  phone?: string
}
```
- Solo consulta leads por ID/email/teléfono
- No lee ni envía campo `etapa`
- **No requiere actualización**

**`dynamics-reasignar-proxy`:**
```typescript
// Payload enviado a N8N (líneas 225-248):
{
  prospecto_id: string,
  nuevo_ejecutivo_id: string,
  nueva_coordinacion_id: string,
  ejecutivo_anterior_id?: string,
  coordinacion_anterior_id?: string,
  reasignado_por_id: string,
  reasignado_por_nombre?: string,
  reasignado_por_email?: string,
  reasignado_por_rol?: string,
  motivo?: string,
  // Datos del prospecto:
  id_dynamics?: string,
  nombre_prospecto?: string,
  whatsapp_prospecto?: string,
  email_prospecto?: string,
  // Datos del nuevo ejecutivo:
  nuevo_ejecutivo_nombre?: string,
  nuevo_ejecutivo_email?: string,
  nueva_coordinacion_nombre?: string,
  nueva_coordinacion_codigo?: string
}
```

**⚠️ IMPORTANTE:**
- El servicio `dynamicsReasignacionService.ts` (líneas 148-197) **enriquece los datos** consultando la tabla `prospectos` antes de enviar al webhook
- **NO incluye el campo `etapa` ni `etapa_id` en el payload**
- La lógica de N8N maneja la reasignación en Dynamics CRM (no usa etapas)
- **No requiere actualización**

---

#### Grupo 3: Proxies de Llamadas (3)

| Función | Análisis | Payload |
|---------|----------|---------|
| `transfer-request-proxy` | ✅ No usa etapas | `{ prospect_id }` |
| `tools-proxy` | ✅ No usa etapas | `{ action?, call_id?, ...payload }` |
| `trigger-manual-proxy` | ✅ No usa etapas | `{ prospecto_id, user_id, justificacion, scheduled_timestamp, ... }` |

**Análisis detallado:**

**`trigger-manual-proxy`:**
```typescript
// Payload enviado a N8N (líneas 115-137):
{
  prospecto_id: string,
  motivo: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  user_id: string,
  user_email: string,
  programada_por_nombre: string,
  scheduled_timestamp?: string,
  schedule_type?: 'now' | 'scheduled',
  customer_phone?: string,
  customer_name?: string,
  conversation_id?: string,
  llamada_programada_id?: string,
  timestamp: string,
  source: 'edge-function'
}
```
- **NO incluye `etapa` ni `etapa_id`**
- La lógica de N8N inserta en `llamadas_programadas` (tabla separada)
- **No requiere actualización**

---

#### Grupo 4: Proxies de IA (2)

| Función | Análisis | Payload |
|---------|----------|---------|
| `anthropic-proxy` | ✅ No usa etapas | `{ model, max_tokens, messages }` |
| `paraphrase-proxy` | ✅ No usa etapas | `{ text, style?, length? }` |

**Conclusión:** Operaciones de IA puras, sin contexto de prospectos.

---

#### Grupo 5: Proxies de Sistema (5)

| Función | Análisis | Payload |
|---------|----------|---------|
| `auth-admin-proxy` | ✅ No usa etapas | Operaciones auth (usuarios, roles, permisos) |
| `multi-db-proxy` | ✅ No usa etapas | Consultas SQL a PQNC_QA/LOGMONITOR |
| `secure-query` | ✅ No usa etapas | Consultas SQL a PQNC_AI |
| `generar-url-optimizada` | ✅ No usa etapas | `{ url, width?, height? }` |
| `error-log-proxy` | ✅ No usa etapas | `{ error, stack, user_id }` |

**Conclusión:** Funciones de infraestructura sin relación con prospectos.

---

## ⚠️ Workflows de N8N a Revisar

Aunque las **Edge Functions NO usan etapas**, los **workflows de N8N** que reciben los payloads **SÍ PODRÍAN** leer/modificar etapas.

### Workflows Críticos para Revisar:

| Workflow N8N | Endpoint | Posible Uso de Etapas |
|-------------|----------|----------------------|
| `Logica de llamadas programadas [PROD]` | `/webhook/trigger-manual` | ⚠️ **REVISAR** - Podría actualizar etapa al programar llamada |
| `Guardrail agentic logic [PROD]` | `/webhook/tools` | ⚠️ **REVISAR** - Lógica de decisiones basada en etapa? |
| Workflow de reasignación | `/webhook/reasignar-prospecto` | ⚠️ **REVISAR** - Podría cambiar etapa al reasignar |

**⚠️ ACCIÓN REQUERIDA:**
1. Acceder a N8N Railway (`https://primary-dev-d75a.up.railway.app`)
2. Revisar los workflows listados arriba
3. Buscar nodos que lean/modifiquen el campo `etapa` en tabla `prospectos`
4. Actualizar a `etapa_id` si es necesario

---

## ✅ Conclusiones

### Edge Functions (Frontend → N8N/APIs)

| Estado | Cantidad | Acción Requerida |
|--------|----------|------------------|
| ✅ No usan etapas | 15/16 | **NINGUNA** - No requieren actualización |
| ⚠️ Usan etapas | 1/16 | **ACTUALIZAR** - `CampanasManager.tsx` (líneas 2706-2712) |

### Workflows N8N (N8N → BD)

| Estado | Cantidad | Acción Requerida |
|--------|----------|------------------|
| 🔍 Pendiente revisión | 3 | **REVISAR** workflows en N8N Railway |

---

## 📝 Recomendaciones

### 1. Frontend: CampanasManager.tsx (CRÍTICO)

⚠️ **REQUIERE ACTUALIZACIÓN INMEDIATA**

**Archivo:** `src/components/campaigns/campanas/CampanasManager.tsx`

**Cambios requeridos:**

#### Paso 1: Actualizar construcción de WHERE clause (líneas 2706-2712)

```typescript
// ❌ ANTES (usa etapa string):
if (audience?.etapas?.length) {
  baseWhere += ` AND etapa IN ('${audience.etapas.join("','")}')`;
} else if (audience?.etapa) {
  baseWhere += ` AND etapa = '${audience.etapa}'`;
}

// ✅ DESPUÉS (usa etapa_id FK):
if (audience?.etapa_ids?.length) {
  baseWhere += ` AND etapa_id IN ('${audience.etapa_ids.join("','")}')`;
} else if (audience?.etapa_id) {
  baseWhere += ` AND etapa_id = '${audience.etapa_id}'`;
}
```

#### Paso 2: Verificar interface `WhatsAppAudience`

Debe incluir campos de etapa_id:

```typescript
interface WhatsAppAudience {
  id: string;
  nombre: string;
  // ... otros campos
  etapa?: string | null;           // ⚠️ DEPRECADO - mantener solo temporalmente
  etapa_id?: string | null;        // ✅ NUEVO - FK a etapas.id
  etapas?: string[] | null;        // ⚠️ DEPRECADO - mantener solo temporalmente
  etapa_ids?: string[] | null;     // ✅ NUEVO - array de FKs
}
```

#### Paso 3: Actualizar tabla `whatsapp_audiences` en BD

```sql
-- Agregar columna etapa_id (singular)
ALTER TABLE whatsapp_audiences 
ADD COLUMN IF NOT EXISTS etapa_id UUID REFERENCES etapas(id);

-- Agregar columna etapa_ids (array para múltiples)
ALTER TABLE whatsapp_audiences 
ADD COLUMN IF NOT EXISTS etapa_ids UUID[];

-- Migrar datos existentes (si hay):
-- Para etapa singular:
UPDATE whatsapp_audiences 
SET etapa_id = (SELECT id FROM etapas WHERE codigo = whatsapp_audiences.etapa OR nombre = whatsapp_audiences.etapa)
WHERE etapa IS NOT NULL;

-- Para etapas array (más complejo - requiere script):
-- Ver .cursor/handovers para script de migración
```

#### Paso 4: Actualizar componente de selección de audiencias

El componente que crea/edita audiencias debe usar `EtapaSelector` en lugar de input de texto.

**Buscar en:** `src/components/campaigns/audiencias/` (si existe componente de creación)

---

### 2. Edge Function: broadcast-proxy
✅ **NO requiere cambios** - Usa la cláusula WHERE tal cual la recibe

---

### 3. Workflows N8N (Backend)
⚠️ **Requieren auditoría manual** - Acciones:

1. **Acceder a N8N:**
   ```bash
   # URL: https://primary-dev-d75a.up.railway.app
   # Credenciales: En `api_auth_tokens` (N8N → API_KEY)
   ```

2. **Revisar cada workflow:**
   - `Logica de llamadas programadas [PROD]`
   - `Guardrail agentic logic [PROD]`
   - Workflow de reasignación (si existe)

3. **Buscar nodos que usen etapas:**
   ```javascript
   // ❌ BUSCAR (formato antiguo):
   prospectos.etapa
   UPDATE prospectos SET etapa = 'Nueva Etapa'
   
   // ✅ REEMPLAZAR (formato nuevo):
   prospectos.etapa_id
   UPDATE prospectos SET etapa_id = (SELECT id FROM etapas WHERE codigo = 'codigo_etapa')
   ```

4. **Documentar cambios:**
   - Crear handover con cambios en workflows N8N
   - Actualizar `docs/N8N_WORKFLOWS_INDEX.md`

---

## 🔗 Archivos Relacionados

### Documentación:
- `.cursor/handovers/2026-01-26-migracion-etapas-sidebars-y-widgets.md` - Migración frontend
- `docs/EDGE_FUNCTIONS_CATALOG.md` - Catálogo completo de Edge Functions
- `docs/N8N_WORKFLOWS_INDEX.md` - Índice de workflows N8N
- `docs/MIGRACION_ETAPAS_STRING_A_FK.md` - Plan de migración completo

### Código:
- `supabase/functions/**/index.ts` - 16 Edge Functions (todas revisadas)
- `src/services/dynamicsReasignacionService.ts` - Enriquecimiento de datos (no usa etapas)
- `src/services/dynamicsLeadService.ts` - Consulta leads (no usa etapas)
- `src/services/scheduledCallsService.ts` - Llamadas manuales (no usa etapas)

---

## 📊 Estadísticas

| Métrica | Valor |
|---------|-------|
| Edge Functions revisadas | 16/16 (100%) |
| Edge Functions que usan etapas (directamente) | 0 (0%) |
| Componentes frontend que envían etapas | 1 (`CampanasManager.tsx`) |
| Líneas de código a modificar | ~10 líneas |
| Tablas BD a actualizar | 1 (`whatsapp_audiences`) |
| Edge Functions que requieren cambios | 0 (0%) |
| Workflows N8N pendientes auditoría | 3 |
| Tiempo de auditoría | ~45 min |

---

## 🎯 Próximos Pasos

### Prioridad 1: CRÍTICO - Frontend (CampanasManager.tsx)
1. ⚠️ **Actualizar construcción WHERE clause** (líneas 2706-2712)
2. ⚠️ **Verificar/actualizar interface `WhatsAppAudience`**
3. ⚠️ **Migrar tabla `whatsapp_audiences`** (agregar columnas `etapa_id`, `etapa_ids`)
4. ⚠️ **Actualizar componente de creación/edición de audiencias**
5. ✅ **Testing:** Crear campaña con filtro de etapas y verificar SQL generado

### Prioridad 2: Edge Functions
1. ✅ **Edge Functions:** Marcar como **COMPLETO** - No requieren actualización
2. ✅ **broadcast-proxy:** Confirmado que NO requiere cambios

### Prioridad 3: Workflows N8N
1. 🔍 **Workflows N8N:** Realizar auditoría manual (acceso a Railway)
2. Verificar si workflows leen/modifican `etapa` al procesar campañas

### Después de Completar:
- Crear handover con cambios aplicados a `CampanasManager.tsx`
- Documentar migración de `whatsapp_audiences`
- Testing exhaustivo del módulo de campañas

---

**Última actualización:** 27 de Enero 2026 - 00:15 UTC  
**Estado:** ⚠️ Detectado 1 componente frontend que envía `etapa` string  
**Resultado:** `CampanasManager.tsx` requiere actualización + migración tabla `whatsapp_audiences`

---

## 🔍 Hallazgos Clave

| Componente | Estado | Etapa String | Etapa FK | Acción |
|------------|--------|--------------|----------|--------|
| Edge Functions (16) | ✅ | No | No | Ninguna |
| CampanasManager.tsx | ⚠️ | **SÍ** | No | **Actualizar** |
| whatsapp_audiences (tabla BD) | ⚠️ | **SÍ** (columna `etapa`) | No | **Migrar** |
