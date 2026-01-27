# Handover: Migración de Etapas en Módulo de Campañas WhatsApp

**Fecha:** 27 de Enero 2026  
**Autor:** AI Assistant  
**Contexto:** Migración completa de etapas (string → FK) en módulo de Campañas y Audiencias  
**Handover de Referencia:** `.cursor/handovers/2026-01-26-auditoria-edge-functions-etapas.md`

---

## 📋 Resumen Ejecutivo

Migración completa del módulo de Campañas WhatsApp de la arquitectura legacy de etapas (strings hardcodeados) a la nueva arquitectura con FK a tabla `etapas`. Se actualizaron 2 componentes principales, 1 tabla BD, y se creó script de migración de datos.

**Componentes afectados:**
- `AudienciasManager.tsx` - Gestión de audiencias
- `CampanasManager.tsx` - Envío de campañas (WHERE clause SQL)
- `types/whatsappTemplates.ts` - Interfaces
- Tabla `whatsapp_audiences` - Agregadas columnas FK

---

## 🔍 Problema Detectado

Durante la auditoría de Edge Functions se detectó que:

1. **CampanasManager** construía SQL WHERE con `etapa IN ('string1', 'string2')`
2. Esta cláusula se enviaba a `broadcast-proxy` → N8N → `SELECT * FROM prospectos WHERE ...`
3. Las audiencias filtraban por string en lugar de FK
4. Los filtros rápidos usaban valores hardcodeados en lugar de cargar desde BD

---

## ✅ Cambios Implementados

### 1. Tabla `whatsapp_audiences` (Base de Datos)

**Script SQL:** `migrations/20260127_migrate_whatsapp_audiences_etapas.sql`

**Columnas agregadas:**
```sql
-- FK singular (para compatibilidad con etapa legacy)
ALTER TABLE whatsapp_audiences 
ADD COLUMN etapa_id UUID REFERENCES etapas(id);

-- Array de FKs (para múltiples etapas)
ALTER TABLE whatsapp_audiences 
ADD COLUMN etapa_ids UUID[];

-- Índices para performance
CREATE INDEX idx_whatsapp_audiences_etapa_id ON whatsapp_audiences(etapa_id);
CREATE INDEX idx_whatsapp_audiences_etapa_ids ON whatsapp_audiences USING GIN(etapa_ids);
```

**Migración de datos:**
- Mapea `etapa` string → `etapa_id` UUID
- Mapea `etapas` string[] → `etapa_ids` UUID[]
- Mantiene campos legacy para compatibilidad temporal

**⚠️ ACCIÓN REQUERIDA:**
Ejecutar script SQL en Supabase Dashboard (PQNC_AI):
```bash
# Copiar contenido de:
migrations/20260127_migrate_whatsapp_audiences_etapas.sql
```

---

### 2. Interfaces TypeScript (types/whatsappTemplates.ts)

**`WhatsAppAudience` actualizado:**
```typescript
export interface WhatsAppAudience {
  // ... campos existentes
  
  // ⚠️ DEPRECADO - Campos legacy
  etapa?: ProspectoEtapa | null;
  etapas?: ProspectoEtapa[];
  
  // ✅ NUEVO - Arquitectura con FK
  etapa_id?: string | null;
  etapa_ids?: string[] | null;
  
  // ... resto de campos
}
```

**`CreateAudienceInput` actualizado:**
```typescript
export interface CreateAudienceInput {
  nombre: string;
  descripcion?: string;
  
  // ⚠️ DEPRECADO
  etapas?: ProspectoEtapa[];
  
  // ✅ NUEVO
  etapa_ids?: string[];
  
  // ... resto de campos
}
```

---

### 3. AudienciasManager.tsx (Gestión de Audiencias)

**Cambios principales:**

#### 3.1. Imports y Estados

**Agregado:**
```typescript
import type { Etapa } from '../../../types/etapas';
import { etapasService } from '../../../services/etapasService';

// En el componente:
const [etapas, setEtapas] = useState<Etapa[]>([]);
const [loadingEtapas, setLoadingEtapas] = useState(true);
```

**Líneas:** ~1-50

#### 3.2. Carga de Etapas desde BD

**Agregado:**
```typescript
useEffect(() => {
  loadEtapas();
  loadAudiences();
}, []);

const loadEtapas = async () => {
  try {
    setLoadingEtapas(true);
    const etapasData = await etapasService.getEtapas();
    setEtapas(etapasData);
  } catch (error) {
    console.error('Error loading etapas:', error);
    toast.error('Error al cargar etapas');
  } finally {
    setLoadingEtapas(false);
  }
};
```

**Líneas:** ~82-98

#### 3.3. Query de Carga con FK

**ANTES:**
```typescript
// Filtro de etapa
if (aud.etapa) {
  query = query.eq('etapa', aud.etapa);
}
```

**AHORA:**
```typescript
// Filtro de etapa con FK (priorizar etapa_ids, fallback a etapa_id, legacy a etapa)
if (aud.etapa_ids && aud.etapa_ids.length > 0) {
  query = query.in('etapa_id', aud.etapa_ids);
} else if (aud.etapa_id) {
  query = query.eq('etapa_id', aud.etapa_id);
} else if (aud.etapa) {
  // Fallback legacy: buscar por string
  query = query.eq('etapa', aud.etapa);
}
```

**Líneas:** ~106-115

#### 3.4. Filtros Rápidos Dinámicos

**ANTES:**
```typescript
{PROSPECTO_ETAPAS.map((etapa) => (
  <button
    key={`etapa-${etapa.value}`}
    onClick={() => toggleQuickFilter(`etapa-${etapa.value}`)}
  >
    {etapa.label}
  </button>
))}
```

**AHORA:**
```typescript
{loadingEtapas ? (
  <div className="animate-spin ...">Cargando etapas...</div>
) : (
  etapas.map((etapa) => (
    <button
      key={`etapa-${etapa.id}`}
      onClick={() => toggleQuickFilter(`etapa-${etapa.id}`)}
    >
      {etapa.nombre}
    </button>
  ))
)}
```

**Líneas:** ~441-465

#### 3.5. Filtro de Búsqueda

**Actualizado:**
```typescript
// Verificar tanto etapa_ids (array) como etapa_id (singular)
return a.etapa_ids?.includes(etapaId) || a.etapa_id === etapaId || a.etapa === etapaId; // Legacy fallback
```

**Líneas:** ~259-264

#### 3.6. Modal: Selector de Etapas

**ANTES:**
```typescript
{PROSPECTO_ETAPAS.map((etapa) => (
  <button onClick={() => toggleEtapa(etapa.value)}>
    {etapa.label}
  </button>
))}
```

**AHORA:**
```typescript
{loadingEtapas ? (
  <div className="animate-spin ..."></div>
) : (
  etapas.map((etapa) => (
    <button 
      onClick={() => toggleEtapa(etapa.id)}
      style={isSelected ? { 
        backgroundColor: `${etapa.color_ui}20`, 
        borderColor: etapa.color_ui, 
        color: etapa.color_ui 
      } : {}}
    >
      {isSelected && '✓ '}{etapa.nombre}
    </button>
  ))
)}
```

**Características:**
- Carga etapas desde BD (`etapasService`)
- Usa colores dinámicos de `etapa.color_ui`
- Selecciona por ID en lugar de string
- Loading state mientras carga

**Líneas:** ~1371-1425

#### 3.7. Handler Toggle de Etapa

**Agregado:**
```typescript
const toggleEtapa = (etapaId: string) => {
  const current = formData.etapa_ids || [];
  if (current.includes(etapaId)) {
    setFormData({ ...formData, etapa_ids: current.filter(id => id !== etapaId) });
  } else {
    setFormData({ ...formData, etapa_ids: [...current, etapaId] });
  }
};
```

**Líneas:** ~1274-1282

#### 3.8. Submit: Guardar con FK

**ANTES:**
```typescript
const audienceData = {
  etapas: formData.etapas?.length ? formData.etapas : null,
  etapa: formData.etapas?.length === 1 ? formData.etapas[0] : null,
  // ...
};
```

**AHORA:**
```typescript
const audienceData: any = {
  // ... otros campos
};

// Guardar etapas con FK (priorizar etapa_ids)
if (formData.etapa_ids && formData.etapa_ids.length > 0) {
  audienceData.etapa_ids = formData.etapa_ids;
  // Compatibilidad legacy: si solo hay 1 etapa, también guardar en etapa_id singular
  if (formData.etapa_ids.length === 1) {
    audienceData.etapa_id = formData.etapa_ids[0];
  }
  // Mantener etapas/etapa legacy para compatibilidad temporal
  const etapasStrings = etapas.filter(e => formData.etapa_ids!.includes(e.id)).map(e => e.nombre);
  audienceData.etapas = etapasStrings;
  audienceData.etapa = etapasStrings.length === 1 ? etapasStrings[0] : null;
} else {
  // Limpiar todos los campos de etapa
  audienceData.etapa_ids = null;
  audienceData.etapa_id = null;
  audienceData.etapas = null;
  audienceData.etapa = null;
}
```

**Características:**
- Guarda `etapa_ids` (principal)
- Guarda `etapa_id` si solo hay 1 etapa
- Mantiene campos legacy (`etapa`, `etapas`) para compatibilidad
- Convierte IDs → strings para campos legacy

**Líneas:** ~1183-1204

#### 3.9. useEffect: Dependencias Actualizadas

**ANTES:**
```typescript
}, [formData.etapas, formData.destinos, ...]);
```

**AHORA:**
```typescript
}, [formData.etapa_ids, formData.destinos, ...]);
```

**Líneas:** ~1172

#### 3.10. Props del Modal

**Actualizado:**
```typescript
interface CreateAudienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  editingAudience?: WhatsAppAudience | null;
  etapas: Etapa[]; // ✅ AGREGADO
  loadingEtapas: boolean; // ✅ AGREGADO
}

// Uso:
<CreateAudienceModal
  etapas={etapas}
  loadingEtapas={loadingEtapas}
  // ... otras props
/>
```

**Líneas:** ~884-896, ~809-822

---

### 4. CampanasManager.tsx (Envío de Campañas)

**Cambio crítico:** Construcción de WHERE clause SQL

**ANTES (líneas 2706-2712):**
```typescript
// Filtro de etapas (IN - múltiple)
if (audience?.etapas?.length) {
  baseWhere += ` AND etapa IN ('${audience.etapas.join("','")}')`;
} else if (audience?.etapa) {
  baseWhere += ` AND etapa = '${audience.etapa}'`;
}
```

**AHORA:**
```typescript
// Filtro de etapas con FK (priorizar etapa_ids)
if (audience?.etapa_ids?.length) {
  // ✅ NUEVO - Usar FKs a tabla etapas
  baseWhere += ` AND etapa_id IN ('${audience.etapa_ids.join("','")}')`;
} else if (audience?.etapa_id) {
  // ✅ NUEVO - FK singular
  baseWhere += ` AND etapa_id = '${audience.etapa_id}'`;
} else if (audience?.etapas?.length) {
  // ⚠️ FALLBACK LEGACY - etapas string array
  baseWhere += ` AND etapa IN ('${audience.etapas.join("','")}')`;
} else if (audience?.etapa) {
  // ⚠️ FALLBACK LEGACY - etapa string singular
  baseWhere += ` AND etapa = '${audience.etapa}'`;
}
```

**Impacto:**
- Las campañas ahora filtran por `etapa_id` (UUID FK)
- Compatibilidad con audiencias legacy (fallback a string)
- N8N ejecuta SQL con FK correcto

**Líneas:** ~2703-2716

---

## 📊 Resumen de Archivos Modificados

| Archivo | Cambios | Líneas Afectadas | Estado |
|---------|---------|------------------|--------|
| `migrations/20260127_migrate_whatsapp_audiences_etapas.sql` | Script SQL completo | N/A | ✅ Creado |
| `src/types/whatsappTemplates.ts` | Interfaces con etapa_id/etapa_ids | ~168-215 | ✅ Actualizado |
| `src/components/campaigns/audiencias/AudienciasManager.tsx` | Queries, filtros, modal, handlers | ~1-2135 | ✅ Actualizado |
| `src/components/campaigns/campanas/CampanasManager.tsx` | WHERE clause SQL | ~2703-2716 | ✅ Actualizado |

**Total:** 3 archivos código + 1 script SQL

---

## 🧪 Checklist de Testing

**⚠️ IMPORTANTE: Ejecutar SQL de migración ANTES de testing**

```bash
# 1. Acceder a Supabase Dashboard
https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd

# 2. SQL Editor → Ejecutar:
migrations/20260127_migrate_whatsapp_audiences_etapas.sql

# 3. Verificar que las columnas existan:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_audiences' 
  AND column_name IN ('etapa_id', 'etapa_ids');
```

### Testing Frontend

#### 1. AudienciasManager

**Carga inicial:**
- [ ] Módulo Campañas → Tab "Audiencias"
- [ ] Verificar que los **filtros rápidos** muestran etapas desde BD (no hardcodeadas)
- [ ] Verificar que las **audiencias existentes** se cargan correctamente
- [ ] Verificar colores dinámicos en filtros (si están aplicados en el código)

**Crear audiencia nueva:**
- [ ] Click en "Crear Audiencia"
- [ ] Selector de etapas carga desde BD (loading state visible)
- [ ] Seleccionar 2-3 etapas
- [ ] Verificar que el **contador de prospectos** se actualiza automáticamente
- [ ] Guardar audiencia
- [ ] Verificar que se guardó con `etapa_ids` (UUID[]) en BD

**Editar audiencia existente (legacy):**
- [ ] Editar audiencia creada antes de migración (tiene `etapas` string)
- [ ] Verificar que las etapas se **convierten automáticamente** a IDs
- [ ] Selector muestra etapas correctas seleccionadas
- [ ] Guardar audiencia
- [ ] Verificar que ahora tiene `etapa_ids` en BD

**Filtros rápidos:**
- [ ] Click en filtro de etapa → Verificar que filtra audiencias correctamente
- [ ] Verificar que audiencias legacy (con `etapa` string) también se filtran

#### 2. CampanasManager

**Crear campaña con audiencia:**
- [ ] Módulo Campañas → Tab "Campañas"
- [ ] Crear nueva campaña
- [ ] Seleccionar audiencia con etapas
- [ ] Enviar campaña (ejecutar ahora o programar)
- [ ] **CRÍTICO:** Verificar en logs de N8N que el WHERE clause use `etapa_id IN (...)` y no `etapa IN (...)`

**Testing de SQL generado:**
```sql
-- El WHERE clause enviado a N8N debe ser:
WHERE 1=1 AND etapa_id IN ('uuid1','uuid2','uuid3')

-- Y NO:
WHERE 1=1 AND etapa IN ('Interesado','En seguimiento')
```

---

## 🔄 Compatibilidad y Fallbacks

### Audiencias Legacy

El código mantiene **compatibilidad total** con audiencias creadas antes de la migración:

| Escenario | Campo BD | Comportamiento |
|-----------|----------|----------------|
| Audiencia nueva | `etapa_ids` (UUID[]) | ✅ Usa FK directamente |
| Audiencia legacy con `etapas` string | `etapas` (text[]) | ✅ Convierte a IDs al editar |
| Audiencia legacy con `etapa` string | `etapa` (text) | ✅ Convierte a ID al editar |
| Audiencia sin etapas | NULL | ✅ Funciona sin filtro de etapa |

### Proceso de Conversión Automática

Cuando se edita una audiencia legacy:

1. **Detecta** si tiene `etapas` string o `etapa` string
2. **Busca** en tabla `etapas` por nombre o código
3. **Convierte** a UUIDs automáticamente
4. **Al guardar:** actualiza con `etapa_ids` (nuevo) + `etapas` (legacy para compatibilidad)

---

## 📝 Notas Técnicas

### Performance

- **Índices creados:** `idx_whatsapp_audiences_etapa_id`, `idx_whatsapp_audiences_etapa_ids` (GIN)
- **Queries optimizadas:** Usan FK con índice en lugar de string matching
- **Cache de etapas:** `etapasService` mantiene cache en memoria

### Realtime

- Los componentes **no usan subscripciones** realtime para audiencias
- El conteo de prospectos se recalcula **on-demand** (con debounce de 300ms)
- No requiere cambios en subscripciones

### Edge Functions

- **broadcast-proxy:** NO requiere cambios (usa WHERE clause tal cual)
- **Otras 15 Edge Functions:** NO requieren cambios (no usan etapas)

---

## ⚠️ Limitaciones Conocidas

### 1. Migración Manual Requerida

El script SQL NO se ejecuta automáticamente. El usuario debe:
1. Copiar contenido de `migrations/20260127_migrate_whatsapp_audiences_etapas.sql`
2. Ejecutar en Supabase Dashboard → SQL Editor
3. Verificar que la migración fue exitosa

### 2. Campos Legacy Mantenidos

Los campos `etapa` y `etapas` (string) se mantienen temporalmente para:
- Compatibilidad con código que aún no se ha migrado
- Rollback seguro si hay problemas
- Debugging y comparación

**Recomendación:** Eliminar en próxima versión major (v3.0.0)

### 3. N8N Workflows

Los workflows de N8N deben soportar AMBOS formatos:
- `WHERE etapa_id IN (...)` (nuevo)
- `WHERE etapa IN (...)` (legacy)

**Acción sugerida:** Auditoría manual de workflows en Railway

---

## 🎯 Próximos Pasos

### Inmediatos (CRÍTICO):
1. ⚠️ **Ejecutar script SQL** en Supabase Dashboard
2. 🧪 **Testing completo** siguiendo checklist arriba
3. 🔍 **Verificar logs N8N** al enviar campaña con audiencia migrada

### Corto plazo:
1. Auditoría de workflows N8N (verificar compatibilidad con ambos formatos)
2. Testing de audiencias legacy sin migrar
3. Documentar comportamiento de fallbacks

### Futuro (v3.0.0):
1. Eliminar campos legacy (`etapa`, `etapas` string)
2. Simplificar queries (solo FK, sin fallbacks)
3. Actualizar workflows N8N para solo usar FK

---

## 📚 Referencias

### Handovers Relacionados:
- `.cursor/handovers/2026-01-26-auditoria-edge-functions-etapas.md` - Auditoría de Edge Functions
- `.cursor/handovers/2026-01-26-migracion-etapas-sidebars-y-widgets.md` - Migración de sidebars
- `.cursor/handovers/2026-01-26-migracion-etapas-frontend.md` - Migración inicial `EtapaBadge`

### Documentación Técnica:
- `docs/MIGRACION_ETAPAS_STRING_A_FK.md` - Plan de migración completo
- `src/types/etapas.ts` - Tipos de etapas
- `src/services/etapasService.ts` - Servicio de cache de etapas

### Componentes Clave:
- `src/components/shared/EtapaBadge.tsx` - Componente de badge dinámico
- `src/components/shared/EtapaSelector.tsx` - Selector de etapas reutilizable

---

## 🔗 Dependencias

### Servicios:
- `etapasService.getEtapas()` - Carga etapas desde BD con cache

### Tabla BD:
- `etapas` - Tabla maestra de etapas (debe existir y estar poblada)
- `whatsapp_audiences` - Requiere columnas `etapa_id`, `etapa_ids`

### Edge Functions:
- `broadcast-proxy` - Recibe WHERE clause con `etapa_id IN (...)`

---

## 📊 Métricas de Éxito

| Métrica | Objetivo | Estado |
|---------|----------|--------|
| Componentes migrados | 2/2 | ✅ Completo |
| Queries con FK | 6/6 | ✅ Implementado |
| Filtros dinámicos desde BD | 100% | ✅ Implementado |
| Compatibilidad legacy | 100% | ✅ Mantenida |
| Script SQL creado | 1 | ✅ Listo |
| Testing por usuario | 0% | ⏳ Pendiente |

---

**Última actualización:** 27 de Enero 2026 - 00:45 UTC  
**Sesión:** Completa con migración total del módulo Campañas  
**Status:** ✅ Código migrado - ⏳ Requiere ejecutar SQL y testing
