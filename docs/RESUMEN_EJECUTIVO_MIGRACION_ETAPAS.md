# 🎯 Resumen Ejecutivo: Migración Etapas (Foco en Código Frontend)

**Fecha:** 26 de Enero 2026  
**Estado BD:** ✅ Migrada (dual column: etapa + etapa_id sincronizados)  
**Estado Código:** ❌ Usa solo campo `etapa` (string)  
**Trigger sincronización:** ❌ NO existe (necesario crear)  
**Vista con etapas:** ❌ NO existe (vistas actuales no incluyen tabla etapas)

---

## 🔍 Hallazgos Clave

### ✅ Lo que YA tienes

1. **Tabla `etapas` completa** (10 etapas activas, 25 columnas)
2. **Dual column en `prospectos`:** `etapa` (VARCHAR) + `etapa_id` (UUID FK)
3. **2,653 prospectos con ambos campos poblados**
4. **Vista existente:** `prospectos_con_ejecutivo_y_coordinacion` (pero NO incluye tabla etapas)

### ❌ Lo que FALTA

1. **Trigger de sincronización** - Para mantener ambos campos actualizados automáticamente
2. **Vista con JOIN a etapas** - Para obtener color_ui, icono, grupo_objetivo, etc.
3. **Servicio `etapasService.ts`** - Cache y helpers para el frontend
4. **Actualizar 200+ referencias** en componentes, servicios y hooks

---

## 📋 Plan de Ejecución Simplificado

### Fase 1: Infraestructura BD (1 día)

#### Script SQL a ejecutar

```sql
-- ============================================
-- 1. TRIGGER DE SINCRONIZACIÓN AUTOMÁTICA
-- ============================================
CREATE OR REPLACE FUNCTION sync_etapa_dual_fields()
RETURNS TRIGGER AS $$
DECLARE
  v_etapa_id UUID;
  v_etapa_nombre VARCHAR;
BEGIN
  -- Si viene solo etapa (string), buscar etapa_id
  IF NEW.etapa IS NOT NULL AND (NEW.etapa_id IS NULL OR NEW.etapa_id != COALESCE(OLD.etapa_id, '00000000-0000-0000-0000-000000000000'::UUID)) THEN
    SELECT id INTO v_etapa_id
    FROM etapas
    WHERE nombre = NEW.etapa AND is_active = true
    LIMIT 1;
    
    IF v_etapa_id IS NOT NULL THEN
      NEW.etapa_id := v_etapa_id;
    END IF;
  END IF;

  -- Si viene solo etapa_id, actualizar etapa (string)
  IF NEW.etapa_id IS NOT NULL AND (NEW.etapa IS NULL OR NEW.etapa != COALESCE(OLD.etapa, '')) THEN
    SELECT nombre INTO v_etapa_nombre
    FROM etapas
    WHERE id = NEW.etapa_id;
    
    IF v_etapa_nombre IS NOT NULL THEN
      NEW.etapa := v_etapa_nombre;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS sync_etapa_fields_trigger ON prospectos;
CREATE TRIGGER sync_etapa_fields_trigger
BEFORE INSERT OR UPDATE OF etapa, etapa_id ON prospectos
FOR EACH ROW
EXECUTE FUNCTION sync_etapa_dual_fields();

-- ============================================
-- 2. ACTUALIZAR VISTA EXISTENTE CON ETAPAS
-- ============================================
CREATE OR REPLACE VIEW prospectos_con_ejecutivo_y_coordinacion AS
SELECT 
  p.*,
  -- Datos del ejecutivo
  e.full_name as ejecutivo_nombre,
  e.email as ejecutivo_email,
  e.phone as ejecutivo_telefono,
  e.is_operativo as ejecutivo_is_operativo,
  e.backup_id as ejecutivo_backup_id,
  e.has_backup as ejecutivo_has_backup,
  -- Datos de la coordinación
  c.nombre as coordinacion_nombre,
  c.codigo as coordinacion_codigo,
  c.descripcion as coordinacion_descripcion,
  -- ✨ NUEVO: Datos de la etapa
  et.id as etapa_fk_id,
  et.codigo as etapa_codigo,
  et.nombre as etapa_nombre,
  et.color_ui as etapa_color,
  et.icono as etapa_icono,
  et.orden_funnel as etapa_orden,
  et.es_terminal as etapa_es_terminal,
  et.grupo_objetivo as etapa_grupo,
  et.agente_default as etapa_agente,
  et.ai_responde_auto,
  et.actualiza_crm_auto,
  et.permite_llamadas_auto,
  et.permite_templates,
  et.max_reactivaciones
FROM prospectos p
LEFT JOIN auth_users e ON p.ejecutivo_id = e.id
LEFT JOIN coordinaciones c ON p.coordinacion_id = c.id
LEFT JOIN etapas et ON p.etapa_id = et.id;  -- ← JOIN a etapas

COMMENT ON VIEW prospectos_con_ejecutivo_y_coordinacion IS 
'Vista optimizada con ejecutivo, coordinación Y ETAPA completa. Post-migración etapas 2026-01-26';

-- ============================================
-- 3. ÍNDICE OPTIMIZADO
-- ============================================
CREATE INDEX IF NOT EXISTS idx_prospectos_etapa_id ON prospectos(etapa_id);
CREATE INDEX IF NOT EXISTS idx_prospectos_etapa_coordinacion 
ON prospectos(etapa_id, coordinacion_id) WHERE etapa_id IS NOT NULL;

-- ============================================
-- 4. VALIDACIÓN
-- ============================================
-- Verificar sincronización
SELECT 
  COUNT(*) as total,
  COUNT(etapa_id) as con_etapa_id,
  COUNT(etapa) as con_etapa_string,
  COUNT(*) FILTER (WHERE etapa_id IS NULL) as sin_etapa_id
FROM prospectos;

-- Detectar inconsistencias
SELECT 
  p.id,
  p.etapa as string_field,
  et.nombre as nombre_from_fk,
  CASE 
    WHEN p.etapa = et.nombre THEN 'OK'
    ELSE 'INCONSISTENTE'
  END as estado
FROM prospectos p
LEFT JOIN etapas et ON p.etapa_id = et.id
WHERE p.etapa IS DISTINCT FROM et.nombre
LIMIT 10;

-- Test del trigger
DO $$
DECLARE
  test_id UUID;
BEGIN
  -- Crear prospecto de prueba con solo etapa (string)
  INSERT INTO prospectos (nombre_completo, etapa, coordinacion_id)
  VALUES ('Test Trigger', 'Interesado', (SELECT id FROM coordinaciones LIMIT 1))
  RETURNING id INTO test_id;
  
  -- Verificar que etapa_id se llenó automáticamente
  RAISE NOTICE 'Test ID: %', test_id;
  
  PERFORM 1 FROM prospectos 
  WHERE id = test_id 
  AND etapa_id IS NOT NULL 
  AND etapa = 'Interesado';
  
  IF FOUND THEN
    RAISE NOTICE '✅ Trigger funcionando: etapa → etapa_id';
  ELSE
    RAISE WARNING '❌ Trigger NO funcionó';
  END IF;
  
  -- Limpiar
  DELETE FROM prospectos WHERE id = test_id;
END $$;
```

**Guardar como:** `migrations/20260126_add_etapas_sync_trigger.sql`

---

### Fase 2: Servicio de Etapas (1 día)

#### Crear servicio centralizado

**Archivo:** `src/services/etapasService.ts`

```typescript
import { analysisSupabase } from '../config/analysisSupabase';
import type { Etapa, EtapaCodigo } from '../types/etapas';

class EtapasService {
  private cache: Map<string, Etapa> = new Map();
  private cacheByNombre: Map<string, Etapa> = new Map();
  private cacheByCodigo: Map<EtapaCodigo, Etapa> = new Map();
  private isLoaded = false;

  async loadEtapas(): Promise<Etapa[]> {
    const { data, error } = await analysisSupabase
      .from('etapas')
      .select('*')
      .eq('is_active', true)
      .order('orden_funnel', { ascending: true });

    if (error) throw error;

    this.cache.clear();
    this.cacheByNombre.clear();
    this.cacheByCodigo.clear();

    data.forEach(etapa => {
      this.cache.set(etapa.id, etapa);
      this.cacheByNombre.set(etapa.nombre, etapa);
      this.cacheByCodigo.set(etapa.codigo, etapa);
    });

    this.isLoaded = true;
    return data;
  }

  getById(id: string | null | undefined): Etapa | undefined {
    return id ? this.cache.get(id) : undefined;
  }

  getByCodigo(codigo: EtapaCodigo): Etapa | undefined {
    return this.cacheByCodigo.get(codigo);
  }

  getByNombreLegacy(nombre: string | null | undefined): Etapa | undefined {
    return nombre ? this.cacheByNombre.get(nombre) : undefined;
  }

  getColor(idOrCodigoOrNombre: string): string {
    let etapa = this.cache.get(idOrCodigoOrNombre) ||
                this.cacheByCodigo.get(idOrCodigoOrNombre as EtapaCodigo) ||
                this.cacheByNombre.get(idOrCodigoOrNombre);
    return etapa?.color_ui || '#6B7280';
  }

  getAllActive(): Etapa[] {
    return Array.from(this.cache.values())
      .filter(e => e.is_active)
      .sort((a, b) => a.orden_funnel - b.orden_funnel);
  }

  getOptions(): Array<{ value: string; label: string; color: string; icono: string }> {
    return this.getAllActive().map(e => ({
      value: e.id,
      label: e.nombre,
      color: e.color_ui,
      icono: e.icono
    }));
  }

  isReady(): boolean {
    return this.isLoaded && this.cache.size > 0;
  }
}

export const etapasService = new EtapasService();
```

#### Crear tipos TypeScript

**Archivo:** `src/types/etapas.ts`

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

#### Inicializar en App

```typescript
// src/main.tsx o src/App.tsx
import { etapasService } from './services/etapasService';

useEffect(() => {
  etapasService.loadEtapas().catch(console.error);
}, []);
```

---

### Fase 3: Migración de Componentes (Por Módulo)

#### Prioridad 1: Componente de Badge Centralizado

**Archivo:** `src/components/shared/EtapaBadge.tsx` (NUEVO)

```typescript
import { etapasService } from '../../services/etapasService';
import type { Prospecto } from '../../services/prospectsService';

interface EtapaBadgeProps {
  prospecto: Prospecto;
  showIcon?: boolean;
}

export const EtapaBadge = ({ prospecto, showIcon = true }: EtapaBadgeProps) => {
  // NUEVO: Preferir etapa desde JOIN
  const etapa = prospecto.etapa_info || 
                etapasService.getById(prospecto.etapa_id) ||
                etapasService.getByNombreLegacy(prospecto.etapa); // Fallback

  if (!etapa) return <span className="text-gray-400 text-xs">Sin etapa</span>;

  return (
    <span
      className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
      style={{ 
        backgroundColor: etapa.color_ui + '20', 
        color: etapa.color_ui 
      }}
    >
      {showIcon && <Icon name={etapa.icono} size={12} />}
      {etapa.nombre}
    </span>
  );
};
```

#### Prioridad 2: Selector de Etapas

**Archivo:** `src/components/shared/EtapaSelector.tsx` (NUEVO)

```typescript
import { etapasService } from '../../services/etapasService';

interface EtapaSelectorProps {
  value: string | null;
  onChange: (etapaId: string | null) => void;
  placeholder?: string;
}

export const EtapaSelector = ({ value, onChange, placeholder = 'Todas las etapas' }: EtapaSelectorProps) => {
  const opciones = etapasService.getOptions();

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="px-3 py-2 border rounded-lg"
    >
      <option value="">{placeholder}</option>
      {opciones.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};
```

#### Prioridad 3: Actualizar servicios clave

**Cambios en:** `src/services/prospectsService.ts`

```typescript
// Actualizar interface
export interface Prospect {
  id: string;
  nombre: string;
  // ...
  etapa_id: string;  // ← NUEVO como campo principal
  etapa_info?: Etapa;  // ← Opcional desde JOIN
  /** @deprecated Usar etapa_id */ 
  etapa?: string;  // ← Mantener temporalmente
}

// Actualizar query
async searchProspects(filters: ProspectFilters) {
  let query = analysisSupabase
    .from('prospectos')
    .select(`
      *,
      etapa_info:etapa_id (
        id, codigo, nombre, color_ui, icono,
        orden_funnel, grupo_objetivo, es_terminal
      )
    `);

  // NUEVO: Filtrar por etapa_id
  if (filters.etapa_id) {
    query = query.eq('etapa_id', filters.etapa_id);
  }
  
  return query;
}
```

---

## 📊 Módulos a Migrar (Orden Sugerido)

| Prioridad | Módulo | Componentes | Esfuerzo |
|-----------|--------|-------------|----------|
| 🔴 **1** | Componentes compartidos | EtapaBadge, EtapaSelector | 2h |
| 🔴 **2** | prospectsService | searchProspects, updateProspect, stats | 2h |
| 🟡 **3** | ProspectosManager | Filtros, tabla, kanban | 4h |
| 🟡 **4** | LiveMonitor | Visualización, filtros | 3h |
| 🟢 **5** | WhatsApp/LiveChat | Sidebar, badges, filtros | 3h |
| 🟢 **6** | Dashboard | Widgets, métricas | 2h |
| 🟢 **7** | Campañas | Audiencias, filtros | 2h |
| 🟢 **8** | Hooks | usePhoneVisibility, otros | 1h |

**Total estimado:** ~19 horas de desarrollo

---

## ✅ Checklist Simplificado

### Semana 1
- [ ] Ejecutar script SQL (trigger + vista actualizada)
- [ ] Crear `src/types/etapas.ts`
- [ ] Crear `src/services/etapasService.ts`
- [ ] Inicializar en App
- [ ] Crear `EtapaBadge.tsx` y `EtapaSelector.tsx`
- [ ] Tests de servicio

### Semana 2
- [ ] Actualizar `prospectsService.ts`
- [ ] Migrar `ProspectosManager.tsx`
- [ ] Migrar `LiveMonitor.tsx`
- [ ] Tests E2E

### Semana 3
- [ ] Migrar WhatsApp/LiveChat
- [ ] Migrar Dashboard
- [ ] Migrar Campañas
- [ ] Actualizar hooks

### Semanas 4-10
- [ ] Monitoreo en producción
- [ ] Validar 100% funcionamiento
- [ ] Logs y métricas

### Semana 11+ (OPCIONAL)
- [ ] Evaluar eliminar campo `etapa` legacy

---

## ⚠️ NO Hacer

1. ❌ **NO** eliminar campo `etapa` hasta validar 10+ semanas
2. ❌ **NO** asumir que `etapa_id` siempre existe (usar fallbacks)
3. ❌ **NO** hardcodear nombres de etapas (usar código)

---

## 📚 Documentos Relacionados

- **Plan completo:** `docs/MIGRACION_ETAPAS_STRING_A_FK.md`
- **Análisis inicial:** Output del subagent (26 Enero 2026)
- **Vista existente:** `scripts/optimizaciones/crear_vistas_optimizadas.sql`

---

**Próximos pasos inmediatos:**
1. Ejecutar script SQL de Fase 1
2. Crear servicio de etapas
3. Crear componentes compartidos (Badge, Selector)
