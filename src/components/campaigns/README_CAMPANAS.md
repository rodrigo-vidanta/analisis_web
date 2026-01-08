# 📋 DOCUMENTACIÓN TÉCNICA - MÓDULO DE CAMPAÑAS

## 🏗️ ARQUITECTURA GENERAL

**Módulo:** Sistema de Campañas de WhatsApp Broadcast
**Propósito:** Gestión completa de campañas de envío masivo de plantillas a audiencias segmentadas
**Base de datos:** `glsmifhkoaifvaegsozd.supabase.co` (PQNC_AI)
**Versión:** 2.3.0 (Enero 2025)
**Estado:** ✅ Producción activa

---

## 📁 ESTRUCTURA DE ARCHIVOS

```
src/components/campaigns/
├── CampaignsDashboardTabs.tsx    # Dashboard principal con tabs
├── campanas/
│   └── CampanasManager.tsx       # Gestor de campañas (principal)
├── audiencias/
│   └── AudienciasManager.tsx     # Gestor de audiencias
├── plantillas/
│   └── WhatsAppTemplatesManager.tsx  # Gestor de plantillas
├── README_CAMPANAS.md            # Esta documentación
└── CHANGELOG_CAMPANAS.md         # Historial de cambios
```

---

## 🗄️ ESQUEMA DE BASE DE DATOS

### Tabla `whatsapp_campaigns`

```sql
id UUID PRIMARY KEY
nombre VARCHAR(255) NOT NULL
descripcion TEXT
campaign_type VARCHAR(20) DEFAULT 'standard'  -- 'standard' | 'ab_test'
template_id UUID REFERENCES whatsapp_templates(id)
audience_id UUID REFERENCES whatsapp_audiences(id)
ab_template_b_id UUID REFERENCES whatsapp_templates(id)  -- Solo A/B
ab_distribution_a INTEGER  -- Porcentaje variante A (0-100)
ab_group_id UUID  -- Vincula variantes A/B
ab_variant VARCHAR(1)  -- 'A' o 'B'
batch_size INTEGER DEFAULT 10
batch_interval_seconds INTEGER DEFAULT 60
execute_at TIMESTAMPTZ
scheduled_at TIMESTAMPTZ
started_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
status VARCHAR(20) DEFAULT 'draft'  -- Ver estados abajo
total_recipients INTEGER DEFAULT 0
sent_count INTEGER DEFAULT 0
delivered_count INTEGER DEFAULT 0
read_count INTEGER DEFAULT 0
replied_count INTEGER DEFAULT 0
failed_count INTEGER DEFAULT 0
created_by UUID
created_by_email VARCHAR(255)
audience_query_snapshot TEXT  -- WHERE clause para N8N
webhook_execution_id VARCHAR(255)
webhook_response JSONB
metadata JSONB
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

### Estados de Campaña (`status`)

| Estado | Descripción | Acciones permitidas |
|--------|-------------|---------------------|
| `draft` | Borrador | Editar, Eliminar, Programar |
| `scheduled` | Programada | Editar, Cancelar |
| `running` | En ejecución | ❌ Sin acciones |
| `paused` | Pausada | Reanudar, Cancelar |
| `completed` | Completada | Ver estadísticas |
| `failed` | Fallida | Reintentar, Eliminar |
| `cancelled` | Cancelada | Eliminar |

### Tabla `whatsapp_audiences`

```sql
id UUID PRIMARY KEY
nombre VARCHAR(255) NOT NULL
descripcion TEXT
etapa VARCHAR(100)  -- Debe coincidir con PROSPECTO_ETAPAS
estado_civil VARCHAR(50)
destinos TEXT[]  -- Array de destinos
viaja_con TEXT[]  -- Array de tipos
dias_sin_contacto INTEGER  -- Días sin mensajes en mensajes_whatsapp
tiene_email BOOLEAN  -- true=con email, false=sin, null=todos
etiquetas TEXT[]  -- Array de IDs de whatsapp_labels_preset
prospectos_count INTEGER DEFAULT 0
is_active BOOLEAN DEFAULT true
created_by UUID
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

---

## 🔧 FILTROS DE AUDIENCIA

### Etapas Disponibles (sincronizadas con Kanban)

**IMPORTANTE:** Los valores deben coincidir EXACTAMENTE con `prospectos.etapa`

| Value (BD) | Label (UI) | Color |
|------------|------------|-------|
| `Es miembro` | Es miembro | emerald |
| `Activo PQNC` | Activo PQNC | teal |
| `Validando membresia` | Validando membresía | blue |
| `Primer contacto` | Primer contacto | sky |
| `En seguimiento` | En seguimiento | yellow |
| `Interesado` | Interesado | green |
| `Atendió llamada` | Atendió llamada | purple |
| `Con ejecutivo` | Con ejecutivo | indigo |
| `Certificado adquirido` | Certificado adquirido | rose |

**Archivo fuente:** `src/types/whatsappTemplates.ts` → `PROSPECTO_ETAPAS`

### Filtro de Días sin Contacto

- **Fuente:** Tabla `mensajes_whatsapp.timestamp`
- **Lógica:** Prospectos cuya última interacción sea anterior a `hoy - X días`
- **Incluye:** Mensajes humanos, bot y plantillas
- **Query generada:**
```sql
AND (id NOT IN (
  SELECT DISTINCT prospecto_id FROM mensajes_whatsapp 
  WHERE timestamp >= '${cutoffDate}'::timestamptz
) OR id NOT IN (SELECT DISTINCT prospecto_id FROM mensajes_whatsapp))
```

### Filtro de Email

| Valor | Descripción | Query |
|-------|-------------|-------|
| `null` | Todos | Sin filtro |
| `true` | Con email | `AND email IS NOT NULL AND email != ''` |
| `false` | Sin email | `AND (email IS NULL OR email = '')` |

### Filtro de Etiquetas

- **Fuente:** `whatsapp_labels_preset` (SystemUI) + `whatsapp_conversation_labels`
- **Lógica:** Prospectos que tengan CUALQUIERA de las etiquetas seleccionadas
- **Nota:** Las etiquetas están en otra BD, se consultan primero los IDs de prospectos

---

## 🚀 FLUJO DE CREACIÓN DE CAMPAÑA

### 1. Usuario selecciona audiencia
```typescript
// CampanasManager.tsx - useEffect countAndSample
const audience = audiences.find(a => a.id === formData.audience_id);
```

### 2. Sistema calcula prospectos con TODOS los filtros
- Etapa
- Estado civil
- Viaja con
- Destinos
- Tiene email
- Etiquetas (consulta a SystemUI)
- Días sin contacto (consulta a mensajes_whatsapp)

### 3. Análisis de cobertura de variables (Template A)
```typescript
// Si plantilla tiene variables, verificar cuántos prospectos las tienen
const coverage = (prospectsWithVariables / totalProspects) * 100;
if (coverage < 100) {
  // Forzar A/B test
  formData.campaign_type = 'ab_test';
  formData.ab_distribution_a = coverage;
}
```

### 4. Construcción de WHERE clauses

```typescript
// baseWhere incluye todos los filtros de audiencia
let baseWhere = 'WHERE 1=1';
baseWhere += ` AND etapa = '${audience.etapa}'`;
baseWhere += ` AND email IS NOT NULL AND email != ''`;
// ... más filtros

// whereA = baseWhere + condición de variables presentes
// whereB = baseWhere + condición de variables faltantes
```

### 5. Envío al Webhook

```typescript
const payload = {
  nombre, descripcion, campaign_type,
  template_id, audience_id,
  ab_template_b_id, ab_distribution_a,
  batch_size, batch_interval_seconds,
  execute_at, status,
  total_recipients,
  created_by, created_by_email,
  where_clause_a,  // Campaña estándar o variante A
  where_clause_b,  // Solo A/B test
  recipients_a, recipients_b,
  audience_etiquetas  // Para N8N si hay etiquetas
};

await fetch(BROADCAST_WEBHOOK_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'livechat_auth': authToken },
  body: JSON.stringify(payload)
});
```

### 6. N8N procesa y crea registros

```
Code Node → Guardrail → Postgres INSERT → uChat
```

---

## 🔄 CAMPAÑAS A/B TEST

### Estructura en BD

Las campañas A/B crean **2 registros** vinculados por `ab_group_id`:

| Campo | Variante A | Variante B |
|-------|-----------|-----------|
| `ab_group_id` | UUID compartido | UUID compartido |
| `ab_variant` | 'A' | 'B' |
| `template_id` | Template A | Template B |
| `ab_distribution_a` | % variante A | % variante B (100-A) |
| `total_recipients` | Conteo A | Conteo B |

### Agrupación en UI

```typescript
// CampanasManager.tsx - groupedCampaigns
const abGroups = new Map<string, WhatsAppCampaign[]>();
campaigns.forEach(c => {
  if (c.ab_group_id) {
    // Agrupar por ab_group_id
    if (!abGroups.has(c.ab_group_id)) {
      abGroups.set(c.ab_group_id, []);
    }
    abGroups.get(c.ab_group_id)!.push(c);
  }
});
// Se muestra UN solo card para cada grupo A/B
```

---

## 🌐 INTEGRACIÓN CON N8N

### Webhook URL
```
https://primary-dev-d75a.up.railway.app/webhook/broadcast
```

### Autenticación
```typescript
Header: 'livechat_auth'
Value: getApiToken('pause_bot_auth')  // '2025_livechat_auth'
```

### Code Node (Dinámico)

El Code Node de N8N **no hardcodea** valores de filtros:
- Recibe `where_clause_a` y `where_clause_b` ya construidos
- Genera UUIDs para campañas
- Construye SQL INSERT dinámicamente
- Construye SQL SELECT con UNION ALL para A/B

### Guardrail Node (Dinámico)

Valida estructura SQL, NO contenido:
- ✅ Detecta patrones peligrosos: DROP, DELETE, TRUNCATE, etc.
- ✅ Valida que queries empiecen correctamente
- ❌ NO valida valores específicos de etapas/filtros

---

## 📡 REALTIME

```typescript
// Suscripción a cambios en whatsapp_campaigns
const channel = analysisSupabase
  .channel('whatsapp_campaigns_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'whatsapp_campaigns'
  }, (payload) => {
    loadData(); // Recargar al recibir cambio
  })
  .subscribe();
```

---

## 🔒 SEGURIDAD

### SQL Injection Prevention

1. **Frontend:** Construye WHERE clauses sin concatenar input de usuario directamente
2. **Webhook:** No expone queries completos, solo WHERE clauses
3. **Guardrail:** Valida patrones peligrosos antes de ejecutar
4. **Postgres:** Usa prepared statements cuando es posible

### Validaciones

- Campañas con `status = 'running'` NO se pueden editar
- Etiquetas se validan contra `whatsapp_labels_preset` activas
- Templates se validan por cobertura de variables

---

## 📊 MÉTRICAS Y ESTADÍSTICAS

### Por Campaña

| Métrica | Campo | Descripción |
|---------|-------|-------------|
| Total | `total_recipients` | Prospectos objetivo |
| Enviados | `sent_count` | Mensajes enviados |
| Entregados | `delivered_count` | Confirmación de entrega |
| Leídos | `read_count` | Mensajes abiertos |
| Respondidos | `replied_count` | Respuestas recibidas |
| Fallidos | `failed_count` | Errores de envío |

### Cards de Campaña

- **Estándar:** Barra de progreso azul-esmeralda
- **A/B Test:** Dos barras separadas (A y B) con métricas individuales

---

## 🛠️ MANTENIMIENTO

### Agregar nueva etapa

1. Editar `src/types/whatsappTemplates.ts`
2. Agregar a `ProspectoEtapa` type
3. Agregar a `PROSPECTO_ETAPAS` array
4. **No requiere cambios en N8N**

### Agregar nuevo filtro

1. Agregar columna a `whatsapp_audiences` (SQL)
2. Agregar campo a `WhatsAppAudience` interface
3. Agregar campo a `CreateAudienceInput` interface
4. Agregar UI en `AudienciasManager.tsx`
5. Agregar lógica de conteo en `AudienciasManager.tsx`
6. Agregar lógica de WHERE en `CampanasManager.tsx`
7. Actualizar Code Node en N8N si requiere procesamiento especial

---

## 📚 ARCHIVOS RELACIONADOS

| Archivo | Descripción |
|---------|-------------|
| `src/types/whatsappTemplates.ts` | Tipos, etapas, interfaces |
| `src/components/campaigns/campanas/CampanasManager.tsx` | Componente principal |
| `src/components/campaigns/audiencias/AudienciasManager.tsx` | Gestor de audiencias |
| `src/config/analysisSupabase.ts` | Cliente Supabase PQNC_AI |
| `src/config/supabaseSystemUI.ts` | Cliente Supabase SystemUI |
| `src/services/apiTokensService.ts` | Servicio de tokens API |

---

## 📝 CHANGELOG

Ver `CHANGELOG_CAMPANAS.md` para historial detallado de cambios.

---

**Última actualización:** Enero 2025
**Mantenedor:** Team PQNC

