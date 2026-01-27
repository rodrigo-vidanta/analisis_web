# Handover: Migración Campo `etapa` → `etapa_id` (Solo Frontend)

**Fecha:** 26 de Enero 2026  
**Contexto:** Migración de campo string a FK en tabla prospectos  
**Alcance:** Solo código frontend (backend ya sincroniza)  
**Duración estimada:** 2-3 horas de implementación activa

---

## 📊 Estado Actual

### Base de Datos
- ✅ Tabla `etapas` existe (10 etapas activas, 25 columnas)
- ✅ Columna `prospectos.etapa` (VARCHAR) - Campo legacy
- ✅ Columna `prospectos.etapa_id` (UUID FK → etapas.id) - Campo nuevo
- ✅ 2,654 prospectos con ambos campos sincronizados
- ✅ Backend ya maneja sincronización (NO crear trigger)

### Código Frontend
- ❌ 50+ queries usan `.eq('etapa', string)`
- ❌ 10+ componentes usan `prospecto.etapa` directamente
- ❌ 4 subscripciones realtime detectan cambios en `etapa`
- ❌ Constantes hardcodeadas en `PROSPECTO_ETAPAS` array

---

## 🎯 Objetivo

Migrar código frontend para usar `etapa_id` (FK) en lugar de `etapa` (string), manteniendo compatibilidad temporal durante validación.

---

## 📝 Plan de Implementación

### Fase 1: Servicios Base (30 min)

#### 1.1 Crear tipos TypeScript

**Archivo nuevo:** `src/types/etapas.ts`

```typescript
export type EtapaCodigo =
  | 'importado_manual'
  | 'primer_contacto'
  | 'validando_membresia'
  | 'discovery'
  | 'interesado'
  | 'atendio_llamada'
  | 'con_ejecutivo'
  | 'activo_pqnc'
  | 'es_miembro'
  | 'no_interesado';

export interface Etapa {
  id: string;
  codigo: EtapaCodigo;
  nombre: string;
  descripcion: string;
  orden_funnel: number;
  color_ui: string;
  icono: string;
  es_terminal: boolean;
  grupo_objetivo: 'ENGAGEMENT' | 'LLAMADA' | null;
  agente_default: string | null;
  ai_responde_auto: boolean;
  actualiza_db_auto: boolean;
  actualiza_crm_auto: boolean;
  permite_llamadas_auto: boolean;
  mensajes_reactivacion_auto: boolean;
  plantillas_reactivacion_auto: boolean;
  permite_templates: boolean;
  es_etapa_crm: boolean;
  mapeo_status_crm: string[] | null;
  max_reactivaciones: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

#### 1.2 Crear servicio de etapas con cache

**Archivo nuevo:** `src/services/etapasService.ts`

Funciones principales:
- `loadEtapas()` - Cargar desde BD al inicio
- `getById(id)` - Obtener por UUID (principal)
- `getByCodigo(codigo)` - Por código (estable)
- `getByNombreLegacy(nombre)` - Por nombre (compatibilidad)
- `getColor(idOrNombre)` - Helper para UI
- `getAllActive()` - Lista ordenada
- `getOptions()` - Para selects

**Código completo:** Ver `docs/PLAN_PASO_A_PASO_MIGRACION_ETAPAS.md` líneas 340-461

#### 1.3 Inicializar en App

**Archivo:** `src/main.tsx` o `src/App.tsx`

```typescript
import { etapasService } from './services/etapasService';

useEffect(() => {
  etapasService.loadEtapas().catch(console.error);
}, []);
```

---

### Fase 2: Componentes Compartidos (15 min)

#### 2.1 Badge de Etapa

**Archivo nuevo:** `src/components/shared/EtapaBadge.tsx`

```typescript
import { etapasService } from '../../services/etapasService';

export const EtapaBadge = ({ prospecto, showIcon = true }) => {
  const etapa = prospecto.etapa_info || 
                etapasService.getById(prospecto.etapa_id) ||
                etapasService.getByNombreLegacy(prospecto.etapa);

  if (!etapa) return <span>Sin etapa</span>;

  return (
    <span style={{ 
      backgroundColor: etapa.color_ui + '20', 
      color: etapa.color_ui 
    }}>
      {showIcon && <Icon name={etapa.icono} />}
      {etapa.nombre}
    </span>
  );
};
```

#### 2.2 Selector de Etapas

**Archivo nuevo:** `src/components/shared/EtapaSelector.tsx`

```typescript
export const EtapaSelector = ({ value, onChange }) => {
  const opciones = etapasService.getOptions();

  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">Todas las etapas</option>
      {opciones.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
};
```

---

### Fase 3: Servicios Core (20 min)

#### 3.1 prospectsService.ts

**Cambios:**

1. Actualizar interface `Prospect`:
```typescript
export interface Prospect {
  // ... otros campos
  etapa_id: string;  // ← NUEVO (principal)
  etapa_info?: Etapa;  // ← OPCIONAL (desde JOIN)
  /** @deprecated Usar etapa_id */ 
  etapa?: string;  // ← LEGACY (mantener temporalmente)
}
```

2. Actualizar `searchProspects()`:
```typescript
async searchProspects(criteria: SearchCriteria) {
  let query = analysisSupabase
    .from('prospectos')
    .select(`
      *,
      etapa_info:etapa_id (
        id, codigo, nombre, color_ui, icono,
        orden_funnel, grupo_objetivo, es_terminal
      )
    `);

  // Filtrar por etapa_id (nuevo)
  if (criteria.etapa_id) {
    query = query.eq('etapa_id', criteria.etapa_id);
  }
  
  // Compatibilidad: filtrar por nombre (legacy)
  if (criteria.etapa && !criteria.etapa_id) {
    query = query.eq('etapa', criteria.etapa);
  }

  return query;
}
```

3. Actualizar `updateProspect()`:
```typescript
async updateProspect(prospectId: string, data: Partial<Prospect>) {
  // Backend sincronizará automáticamente etapa ↔ etapa_id
  return analysisSupabase
    .from('prospectos')
    .update(data)
    .eq('id', prospectId);
}
```

#### 3.2 liveMonitorService.ts

Aplicar cambios similares a `prospectsService.ts`

---

### Fase 4: Componentes UI (60-90 min)

**Archivos a actualizar (en orden de prioridad):**

#### Alta Prioridad (CRÍTICOS)
1. `src/components/prospectos/ProspectosManager.tsx`
   - Línea 502: `getStatusColor(etapa)` → Usar `etapasService.getColor()`
   - Línea 1239: Cambio etapa en realtime
   - Línea 1823: Filtro en memoria → Cambiar a `etapa_id`
   - Línea 2169: Input filtro → Usar `EtapaSelector`
   - Líneas 2450, 2652: Badges → Usar `EtapaBadge`

2. `src/components/chat/LiveChatCanvas.tsx`
   - Línea 938, 942: Renderizado → Usar `EtapaBadge`
   - Línea 2218: Realtime → Mantener (backend sincroniza)
   - Línea 4935: Filtro hardcodeado → Cambiar a IDs
   - Línea 6343: Obtener etapa → Usar service

3. `src/components/analysis/LiveMonitor.tsx`
   - Línea 1133: `getStatusColor()` → Usar service
   - Línea 2239, 3522: `mapEtapaToCheckpoint()` → Ajustar
   - Líneas 1962, 3630, 4895: Renderizado → `EtapaBadge`

4. `src/components/dashboard/DashboardModule.tsx`
   - Línea 3541: `classifyEtapa()` → Usar `etapa.codigo`
   - Línea 1714: Obtener etapa → Usar service

5. `src/components/campaigns/campanas/CampanasManager.tsx`
   - Líneas 198, 200, 2031, etc.: `.eq('etapa')` → `.eq('etapa_id')`
   - Cambiar a usar IDs en filtros

#### Media Prioridad
6. `src/components/admin/WhatsAppTemplatesManager.tsx`
7. `src/components/campaigns/audiencias/AudienciasManager.tsx`
8. `src/components/dashboard/widgets/ProspectosMetricsWidget.tsx`
9. `src/components/dashboard/widgets/ProspectosNuevosWidget.tsx`
10. `src/components/prospectos/BulkReassignmentTab.tsx`

#### Baja Prioridad
11. `src/components/analysis/LiveMonitorKanban.tsx`
12. `src/components/chat/ReactivateConversationModal.tsx`
13. `src/hooks/usePhoneVisibility.ts`

---

### Fase 5: Actualizar Constantes (10 min)

#### 5.1 Deprecar PROSPECTO_ETAPAS hardcodeado

**Archivo:** `src/types/whatsappTemplates.ts`

```typescript
// ANTES
export const PROSPECTO_ETAPAS = [ /* array hardcodeado */ ];

// DESPUÉS (temporal - mantener para compatibilidad)
/** @deprecated Usar etapasService.getOptions() */
export const PROSPECTO_ETAPAS = [ /* array hardcodeado */ ];

// TODO: Remover después de validar que nadie lo usa
```

---

### Fase 6: Realtime (15 min)

**Archivos a revisar (NO cambiar lógica, solo documentar):**

Las subscripciones detectan cambios en `etapa` (string). Como backend sincroniza ambos campos, seguirán funcionando:

1. `LiveChatCanvas.tsx:2218`
2. `ProspectosManager.tsx:1239`
3. `ProspectosNuevosWidget.tsx:230`
4. `liveMonitorKanbanOptimized.ts:384`

**Acción:** Agregar comentarios explicando que funciona porque backend sincroniza.

---

## 🔍 Validación

### Scripts de Testing

```sql
-- Verificar que todos tengan etapa_id
SELECT COUNT(*) FILTER (WHERE etapa_id IS NULL) as sin_id FROM prospectos;
-- Esperado: 0

-- Verificar consistencia
SELECT COUNT(*) FROM prospectos p
LEFT JOIN etapas e ON p.etapa_id = e.id
WHERE p.etapa != e.nombre;
-- Esperado: 0
```

### Tests Frontend

- [ ] Filtros por etapa funcionan
- [ ] Kanban agrupa correctamente
- [ ] Colores/iconos desde BD
- [ ] Realtime detecta cambios
- [ ] Updates con etapa_id funcionan
- [ ] Compatibilidad legacy (queries con `etapa` string)

---

## ⚠️ Decisiones Importantes

### ✅ LO QUE SÍ HACEMOS
1. Crear servicio `etapasService` con cache
2. Actualizar queries para usar `etapa_id`
3. Crear componentes compartidos (`EtapaBadge`, `EtapaSelector`)
4. Mantener compatibilidad temporal con `etapa` (string)

### ❌ LO QUE NO HACEMOS
1. **NO crear trigger SQL** - Backend ya sincroniza
2. **NO modificar vistas existentes** - Puede romper backend
3. **NO eliminar campo `etapa` legacy** - Mantener varias semanas
4. **NO crear vistas nuevas** - Consumir directo con JOINs

---

## 📚 Referencias

### Documentos Generados
- `docs/PLAN_PASO_A_PASO_MIGRACION_ETAPAS.md` - Plan completo detallado
- `docs/RESUMEN_EJECUTIVO_MIGRACION_ETAPAS.md` - Resumen con checklist
- `docs/MIGRACION_ETAPAS_STRING_A_FK.md` - Documentación técnica

### Análisis Realizado
- Subagent f845844e-c77d-48f7-8bf3-cfc29c2a0d8f
- 50+ queries identificadas
- 10+ componentes críticos
- 4 subscripciones realtime

---

## 🚀 Orden de Implementación

1. **Fase 1:** Tipos + Servicio (30 min)
2. **Fase 2:** Componentes compartidos (15 min)
3. **Fase 3:** Servicios core (20 min)
4. **Fase 4:** Componentes UI críticos (60-90 min)
5. **Fase 5:** Deprecar constantes (10 min)
6. **Fase 6:** Documentar realtime (15 min)

**Total:** 2.5-3 horas de implementación activa

---

## ✅ Criterios de Éxito

- [ ] Servicio `etapasService` carga 10 etapas
- [ ] Queries usan `etapa_id` como filtro principal
- [ ] Componentes renderizan colores/iconos desde BD
- [ ] Realtime sigue funcionando (backend sincroniza)
- [ ] Tests E2E pasan
- [ ] Deploy a staging exitoso
- [ ] Validación manual OK
- [ ] Deploy a producción

---

## 🔄 Post-Implementación

### Semanas 1-4
- Monitoreo en producción
- Logs de errores
- Validar que queries sean rápidas

### Semanas 5-10 (OPCIONAL)
- Evaluar eliminar campo `etapa` legacy
- Actualizar tipos para remover `@deprecated`

---

**Última actualización:** 26 de Enero 2026  
**Próxima acción:** Implementar Fase 1 (Tipos + Servicio)
