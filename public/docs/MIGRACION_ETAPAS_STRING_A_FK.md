# 🔄 Plan de Migración: Campo `etapa` (string) → `etapa_id` (FK)

**Fecha de análisis:** 26 de Enero 2026  
**Estado actual:** BD migrada con dual column (etapa + etapa_id), código SIN actualizar  
**Impacto:** 200+ referencias en el código frontend  
**Estrategia:** Migración gradual SIN eliminar campo legacy

---

## 📊 Estado Actual de Base de Datos

### Tabla: `etapas` (10 etapas activas)

**Estructura completa con 25 columnas:**

| Grupo | Columnas |
|-------|----------|
| **Identificación** | `id` (UUID PK), `codigo` (snake_case único), `nombre` (legible) |
| **Metadatos** | `descripcion`, `orden_funnel`, `color_ui` (#HEX), `icono` (lucide-react) |
| **Clasificación** | `es_terminal`, `grupo_objetivo` (ENGAGEMENT/LLAMADA/NULL) |
| **Comportamiento AI** | `agente_default`, `ai_responde_auto`, `actualiza_db_auto` |
| **Integraciones** | `actualiza_crm_auto`, `es_etapa_crm`, `mapeo_status_crm` (JSONB) |
| **Automatizaciones** | `permite_llamadas_auto`, `mensajes_reactivacion_auto`, `plantillas_reactivacion_auto` |
| **Límites** | `max_reactivaciones`, `permite_templates` |
| **Auditoría** | `created_at`, `updated_at`, `is_active` |

### Tabla: `prospectos`

**Estado actual:**
- ✅ Columna `etapa` (VARCHAR) → **EXISTE Y POBLADA** (campo legacy)
- ✅ Columna `etapa_id` (UUID FK) → **EXISTE Y POBLADA** (nuevo campo)
- ✅ FK constraint: `etapa_id → etapas.id`
- ✅ **2,653 prospectos con ambos campos sincronizados**

**Ejemplo:**
```json
{
  "nombre": "Fernando",
  "etapa": "Con ejecutivo",  // ← Legacy (string)
  "etapa_id": "9613d6a4-ef49-4bff-94fd-b995f8498ffb"  // ← Nuevo (FK)
}
```

---

## ⚠️ Impacto en el Código: 200+ Referencias

Según análisis del 26 de Enero 2026:

| Categoría | Cantidad | Archivos Principales |
|-----------|----------|----------------------|
| **Tipos TypeScript** | 3 | `whatsappTemplates.ts`, `prospectsService.ts`, interfaces |
| **Componentes UI** | 15+ | ProspectosManager, LiveMonitor, LiveChat, Dashboard |
| **Servicios consulta** | 8 | prospectsService, liveMonitorService, campañas |
| **Servicios escritura** | 3 | prospectsService, liveMonitorService |
| **Filtros/Búsquedas** | 10+ | Múltiples componentes |
| **Lógica negocio** | 5 | usePhoneVisibility, mapeos, clasificación |

**Ver análisis completo:** (Subagent ejecutado 2026-01-26)

---

## 🎯 Estrategia: Migración Gradual con Dual Column

### Principios

1. **NO eliminar campo `etapa` legacy** hasta validar 100% (varias semanas)
2. **Mantener sincronización automática** entre ambos campos
3. **Migración por módulo** (testing incremental)
4. **Rollback fácil** si algo falla

### Ventajas

✅ Sin downtime  
✅ Testing progresivo  
✅ Código legacy sigue funcionando  
✅ Validación en producción durante semanas

---

## 📝 Plan de Ejecución

### Fase 1: Infraestructura Base (Semana 1)

#### 1.1 Vista SQL Unificada

**Verificar si ya existe:**
```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND (table_name LIKE '%etapa%' OR table_name LIKE '%prospectos%');
```

**Si NO existe, crear:**
```sql
-- Vista con JOIN automático para tener toda la info de etapa
CREATE OR REPLACE VIEW prospectos_with_etapa_info AS
SELECT 
  p.*,
  -- Info completa de la etapa
  e.id as etapa_fk_id,
  e.codigo as etapa_codigo,
  e.nombre as etapa_nombre,
  e.descripcion as etapa_descripcion,
  e.orden_funnel as etapa_orden,
  e.color_ui as etapa_color,
  e.icono as etapa_icono,
  e.es_terminal as etapa_es_terminal,
  e.grupo_objetivo as etapa_grupo,
  -- Flags de comportamiento
  e.agente_default,
  e.ai_responde_auto,
  e.actualiza_db_auto,
  e.actualiza_crm_auto,
  e.permite_llamadas_auto,
  e.mensajes_reactivacion_auto,
  e.plantillas_reactivacion_auto,
  e.permite_templates,
  -- Integración CRM
  e.es_etapa_crm,
  e.mapeo_status_crm,
  -- Límites
  e.max_reactivaciones
FROM prospectos p
LEFT JOIN etapas e ON p.etapa_id = e.id;

-- Permisos
GRANT SELECT ON prospectos_with_etapa_info TO authenticated;
```

#### 1.2 Trigger de Sincronización Automática

**Para mantener ambos campos sincronizados:**

```sql
-- Función de sincronización bidireccional
CREATE OR REPLACE FUNCTION sync_etapa_dual_fields()
RETURNS TRIGGER AS $$
DECLARE
  v_etapa_id UUID;
  v_etapa_nombre VARCHAR;
BEGIN
  -- CASO 1: Si viene solo etapa (string), buscar etapa_id
  IF NEW.etapa IS NOT NULL AND (NEW.etapa_id IS NULL OR NEW.etapa_id != OLD.etapa_id) THEN
    SELECT id INTO v_etapa_id
    FROM etapas
    WHERE nombre = NEW.etapa AND is_active = true
    LIMIT 1;
    
    IF v_etapa_id IS NOT NULL THEN
      NEW.etapa_id := v_etapa_id;
    END IF;
  END IF;

  -- CASO 2: Si viene solo etapa_id, actualizar etapa (string) para compatibilidad
  IF NEW.etapa_id IS NOT NULL AND (NEW.etapa IS NULL OR NEW.etapa != OLD.etapa) THEN
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

-- Trigger BEFORE INSERT/UPDATE
DROP TRIGGER IF EXISTS sync_etapa_fields_trigger ON prospectos;
CREATE TRIGGER sync_etapa_fields_trigger
BEFORE INSERT OR UPDATE OF etapa, etapa_id ON prospectos
FOR EACH ROW
EXECUTE FUNCTION sync_etapa_dual_fields();
```

**Validar trigger:**
```sql
-- Test: Actualizar por nombre (legacy)
UPDATE prospectos SET etapa = 'Interesado' WHERE id = 'test-uuid';
-- Verificar que etapa_id se actualizó automáticamente
SELECT etapa, etapa_id FROM prospectos WHERE id = 'test-uuid';

-- Test: Actualizar por ID (nuevo)
UPDATE prospectos SET etapa_id = '5327dcda-399a-460e-be96-0eb87e1d4d6b' WHERE id = 'test-uuid';
-- Verificar que etapa se actualizó automáticamente
SELECT etapa, etapa_id FROM prospectos WHERE id = 'test-uuid';
```

#### 1.3 Índice Optimizado

```sql
-- Remover índice antiguo si existe
DROP INDEX IF EXISTS idx_prospectos_etapa;

-- Crear índice en etapa_id
CREATE INDEX IF NOT EXISTS idx_prospectos_etapa_id ON prospectos(etapa_id);

-- Índice compuesto para queries comunes
CREATE INDEX IF NOT EXISTS idx_prospectos_etapa_coordinacion 
ON prospectos(etapa_id, coordinacion_id) WHERE etapa_id IS NOT NULL;
```

---

### Fase 2: Tipos TypeScript (Semana 1)

#### 2.1 Nuevo archivo de tipos de etapas

```typescript
// src/types/etapas.ts (NUEVO ARCHIVO)

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

export type GrupoObjetivo = 'ENGAGEMENT' | 'LLAMADA' | null;

export interface Etapa {
  // Identificación
  id: string;
  codigo: EtapaCodigo;
  nombre: string;
  descripcion: string;
  
  // Visualización
  orden_funnel: number;
  color_ui: string;
  icono: string;
  
  // Clasificación
  es_terminal: boolean;
  grupo_objetivo: GrupoObjetivo;
  
  // Comportamiento AI
  agente_default: string | null;
  ai_responde_auto: boolean;
  actualiza_db_auto: boolean;
  
  // Integraciones
  actualiza_crm_auto: boolean;
  es_etapa_crm: boolean;
  mapeo_status_crm: string[] | null;
  
  // Automatizaciones
  permite_llamadas_auto: boolean;
  mensajes_reactivacion_auto: boolean;
  plantillas_reactivacion_auto: boolean;
  permite_templates: boolean;
  
  // Límites
  max_reactivaciones: number;
  
  // Auditoría
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Helper type para opciones de UI
export interface EtapaOption {
  value: string; // etapa.id
  label: string; // etapa.nombre
  codigo: EtapaCodigo;
  color: string;
  icono: string;
}
```

#### 2.2 Actualizar tipos de Prospecto

```typescript
// src/services/prospectsService.ts (ACTUALIZAR)
import type { Etapa } from '../types/etapas';

export interface Prospect {
  id: string;
  nombre: string;
  // ... otros campos
  
  // NUEVO: Usar etapa_id como campo principal
  etapa_id: string;
  
  // OPCIONAL: Info completa si viene de JOIN
  etapa_info?: Etapa;
  
  // DEPRECADO: Mantener temporalmente para compatibilidad
  /** @deprecated Usar etapa_id y etapa_info. Se removerá en Q2 2026 */
  etapa?: string;
}
```

---

### Fase 3: Servicio de Etapas (Semana 1-2)

#### 3.1 Crear servicio centralizado

```typescript
// src/services/etapasService.ts (NUEVO ARCHIVO)

import { analysisSupabase } from '../config/analysisSupabase';
import type { Etapa, EtapaOption, EtapaCodigo } from '../types/etapas';

class EtapasService {
  private cache: Map<string, Etapa> = new Map(); // Por ID
  private cacheByNombre: Map<string, Etapa> = new Map(); // Por nombre legacy
  private cacheByCodigo: Map<EtapaCodigo, Etapa> = new Map(); // Por código
  private isLoaded = false;

  /**
   * Cargar todas las etapas activas
   * Se debe ejecutar al inicio de la app
   */
  async loadEtapas(): Promise<Etapa[]> {
    try {
      const { data, error } = await analysisSupabase
        .from('etapas')
        .select('*')
        .eq('is_active', true)
        .order('orden_funnel', { ascending: true });

      if (error) throw error;

      // Poblar todos los caches
      this.cache.clear();
      this.cacheByNombre.clear();
      this.cacheByCodigo.clear();

      data.forEach(etapa => {
        this.cache.set(etapa.id, etapa);
        this.cacheByNombre.set(etapa.nombre, etapa);
        this.cacheByCodigo.set(etapa.codigo, etapa);
      });

      this.isLoaded = true;
      console.log(`✅ Etapas cargadas: ${data.length}`);
      
      return data;
    } catch (error) {
      console.error('❌ Error cargando etapas:', error);
      throw error;
    }
  }

  /**
   * Obtener etapa por ID (método principal)
   */
  getById(etapaId: string | null | undefined): Etapa | undefined {
    if (!etapaId) return undefined;
    return this.cache.get(etapaId);
  }

  /**
   * Obtener etapa por código
   */
  getByCodigo(codigo: EtapaCodigo): Etapa | undefined {
    return this.cacheByCodigo.get(codigo);
  }

  /**
   * Obtener etapa por nombre legacy
   * SOLO para migración gradual
   */
  getByNombreLegacy(nombre: string | null | undefined): Etapa | undefined {
    if (!nombre) return undefined;
    return this.cacheByNombre.get(nombre);
  }

  /**
   * Migrar nombre legacy → etapa_id
   * Útil para código que aún usa strings
   */
  migrateNombreToId(nombreLegacy: string): string | null {
    const etapa = this.getByNombreLegacy(nombreLegacy);
    return etapa?.id || null;
  }

  /**
   * Obtener color para UI (compatible con legacy)
   * Acepta ID, código o nombre
   */
  getColor(etapaIdOrNombreOrCodigo: string): string {
    // Intentar como ID
    let etapa = this.cache.get(etapaIdOrNombreOrCodigo);
    
    // Si no, intentar como código
    if (!etapa) {
      etapa = this.cacheByCodigo.get(etapaIdOrNombreOrCodigo as EtapaCodigo);
    }
    
    // Si no, intentar como nombre legacy
    if (!etapa) {
      etapa = this.cacheByNombre.get(etapaIdOrNombreOrCodigo);
    }

    return etapa?.color_ui || '#6B7280'; // Gray default
  }

  /**
   * Obtener todas las etapas para selectores
   */
  getAllActive(): Etapa[] {
    return Array.from(this.cache.values())
      .filter(e => e.is_active)
      .sort((a, b) => a.orden_funnel - b.orden_funnel);
  }

  /**
   * Obtener opciones para dropdowns
   */
  getOptions(): EtapaOption[] {
    return this.getAllActive().map(e => ({
      value: e.id,
      label: e.nombre,
      codigo: e.codigo,
      color: e.color_ui,
      icono: e.icono
    }));
  }

  /**
   * Filtrar por grupo objetivo
   */
  getByGrupo(grupo: 'ENGAGEMENT' | 'LLAMADA'): Etapa[] {
    return this.getAllActive().filter(e => e.grupo_objetivo === grupo);
  }

  /**
   * Obtener etapas terminales
   */
  getTerminales(): Etapa[] {
    return this.getAllActive().filter(e => e.es_terminal);
  }

  /**
   * Obtener etapas del funnel (excluyendo terminales)
   */
  getFunnel(): Etapa[] {
    return this.getAllActive()
      .filter(e => !e.es_terminal && e.orden_funnel > 0)
      .sort((a, b) => a.orden_funnel - b.orden_funnel);
  }

  /**
   * Verificar si está cargado
   */
  isReady(): boolean {
    return this.isLoaded && this.cache.size > 0;
  }
}

export const etapasService = new EtapasService();
```

#### 3.2 Inicializar en App

```typescript
// src/main.tsx o src/App.tsx (ACTUALIZAR)

import { etapasService } from './services/etapasService';

// Al inicio de la app
useEffect(() => {
  const initApp = async () => {
    try {
      await etapasService.loadEtapas();
      console.log('✅ App inicializada');
    } catch (error) {
      console.error('❌ Error inicializando app:', error);
    }
  };

  initApp();
}, []);
```

---

### Fase 4: Actualizar Servicios (Semana 2)

#### 4.1 prospectsService.ts

```typescript
// src/services/prospectsService.ts (CAMBIOS GRADUALES)

import { etapasService } from './etapasService';

// ========== QUERIES ==========

async searchProspects(filters: ProspectFilters) {
  let query = analysisSupabase
    .from('prospectos')
    .select(`
      *,
      etapa_info:etapa_id (
        id,
        codigo,
        nombre,
        color_ui,
        icono,
        orden_funnel,
        grupo_objetivo,
        es_terminal
      )
    `);

  // NUEVO: Filtro por etapa_id
  if (filters.etapa_id) {
    query = query.eq('etapa_id', filters.etapa_id);
  }

  // COMPATIBILIDAD: Filtro por etapa (string legacy)
  // TODO: Remover después de migración completa
  if (filters.etapa && !filters.etapa_id) {
    const etapaId = etapasService.migrateNombreToId(filters.etapa);
    if (etapaId) {
      query = query.eq('etapa_id', etapaId);
    }
  }

  return query;
}

// ========== UPDATES ==========

async updateProspect(prospectId: string, data: Partial<Prospect>) {
  const updates: any = { ...data };

  // MIGRACIÓN AUTOMÁTICA: etapa (string) → etapa_id
  if (updates.etapa && !updates.etapa_id) {
    const etapaId = etapasService.migrateNombreToId(updates.etapa);
    if (etapaId) {
      updates.etapa_id = etapaId;
      // NO eliminar updates.etapa - el trigger de BD se encarga
    }
  }

  // PREFERIR: Usar etapa_id directamente
  // El trigger de BD sincronizará automáticamente el campo 'etapa'

  return analysisSupabase
    .from('prospectos')
    .update(updates)
    .eq('id', prospectId);
}

// ========== STATS ==========

async getProspectsStats() {
  // NUEVO: Agrupar por etapa_id con JOIN
  const { data, error } = await analysisSupabase
    .from('prospectos')
    .select(`
      etapa_id,
      etapa_info:etapa_id (
        nombre,
        codigo,
        color_ui,
        orden_funnel
      )
    `);

  if (error) throw error;

  // Agrupar manualmente
  const byEtapa: Record<string, number> = {};
  data.forEach(p => {
    const etapaNombre = p.etapa_info?.nombre || 'Sin etapa';
    byEtapa[etapaNombre] = (byEtapa[etapaNombre] || 0) + 1;
  });

  return {
    total: data.length,
    byEtapa
  };
}
```

---

### Fase 5: Actualizar Componentes UI (Semana 2-3)

#### 5.1 Ejemplo: ProspectosManager.tsx

```typescript
// src/components/prospectos/ProspectosManager.tsx (CAMBIOS GRADUALES)

import { etapasService } from '../../services/etapasService';

// ========== SELECTOR DE ETAPAS ==========

const EtapaSelector = ({ value, onChange }: { value: string | null, onChange: (id: string | null) => void }) => {
  const etapas = etapasService.getOptions();

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="..."
    >
      <option value="">Todas las etapas</option>
      {etapas.map(etapa => (
        <option key={etapa.value} value={etapa.value}>
          {etapa.label}
        </option>
      ))}
    </select>
  );
};

// ========== BADGE DE ETAPA ==========

const EtapaBadge = ({ prospecto }: { prospecto: Prospecto }) => {
  // PREFERIR: Info desde JOIN
  const etapa = prospecto.etapa_info || etapasService.getById(prospecto.etapa_id);

  // FALLBACK: Usar campo legacy si no hay FK
  const etapaLegacy = !etapa && prospecto.etapa ? 
    etapasService.getByNombreLegacy(prospecto.etapa) : null;

  const etapaFinal = etapa || etapaLegacy;

  if (!etapaFinal) return <span>Sin etapa</span>;

  return (
    <span
      className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
      style={{ 
        backgroundColor: etapaFinal.color_ui + '20', 
        color: etapaFinal.color_ui 
      }}
    >
      <Icon name={etapaFinal.icono} size={12} />
      {etapaFinal.nombre}
    </span>
  );
};

// ========== FILTROS ==========

const [filters, setFilters] = useState<{
  etapa_id: string | null;  // NUEVO
  // ... otros filtros
}>({
  etapa_id: null
});

// Cargar prospectos con nuevo filtro
const loadProspectos = async () => {
  const { data } = await prospectsService.searchProspects({
    etapa_id: filters.etapa_id,  // Usar ID en vez de string
    // ... otros filtros
  });
  
  setProspectos(data);
};
```

---

### Fase 6: Actualizar Lógica de Negocio (Semana 3)

#### 6.1 usePhoneVisibility.ts

```typescript
// src/hooks/usePhoneVisibility.ts (ACTUALIZAR)

import { etapasService } from '../services/etapasService';

export const usePhoneVisibility = (prospecto: Prospecto) => {
  const hasVisibleEtapa = useMemo(() => {
    // NUEVO: Usar código de etapa (más robusto que nombre)
    const etapa = etapasService.getById(prospecto.etapa_id);
    if (!etapa) return false;
    
    return ['activo_pqnc', 'es_miembro'].includes(etapa.codigo);
    
    // FALLBACK: Si no hay etapa_id, usar campo legacy
    // TODO: Remover después de validación
    // if (!etapa && prospecto.etapa) {
    //   return ['Activo PQNC', 'Es miembro'].includes(prospecto.etapa);
    // }
  }, [prospecto.etapa_id]);

  return { hasVisibleEtapa };
};
```

#### 6.2 Mapeo etapa → checkpoint (Kanban)

```typescript
// src/components/prospectos/ProspectosKanban.tsx (CENTRALIZAR)

import { etapasService } from '../../services/etapasService';

// NUEVO: Función centralizada usando código
export const getCheckpointForEtapa = (etapaId: string): string => {
  const etapa = etapasService.getById(etapaId);
  if (!etapa) return 'checkpoint #1';

  // Mapeo por código (más robusto)
  const checkpointMap: Record<string, string> = {
    'es_miembro': 'checkpoint #es-miembro',
    'activo_pqnc': 'checkpoint #activo-pqnc',
    'validando_membresia': 'checkpoint #1',
    'discovery': 'checkpoint #2',
    'interesado': 'checkpoint #3',
    'atendio_llamada': 'checkpoint #4',
    'con_ejecutivo': 'checkpoint #5',
    'certificado_adquirido': 'checkpoint #6',
  };

  return checkpointMap[etapa.codigo] || `checkpoint #${etapa.orden_funnel}`;
};
```

---

## ✅ Validación y Testing

### Scripts SQL de Validación

```sql
-- 1. Verificar sincronización de campos
SELECT 
  COUNT(*) as total,
  COUNT(etapa_id) as con_etapa_id,
  COUNT(etapa) as con_etapa_string,
  COUNT(*) FILTER (WHERE etapa_id IS NULL AND etapa IS NOT NULL) as solo_string,
  COUNT(*) FILTER (WHERE etapa_id IS NOT NULL AND etapa IS NULL) as solo_id
FROM prospectos;

-- 2. Detectar inconsistencias
SELECT 
  p.id,
  p.etapa as string_field,
  e.nombre as nombre_from_fk,
  CASE 
    WHEN p.etapa = e.nombre THEN 'OK'
    ELSE 'INCONSISTENTE'
  END as estado
FROM prospectos p
LEFT JOIN etapas e ON p.etapa_id = e.id
WHERE p.etapa != e.nombre OR p.etapa_id IS NULL;

-- 3. Distribución por etapa
SELECT 
  e.nombre,
  e.codigo,
  e.orden_funnel,
  COUNT(p.id) as total_prospectos
FROM etapas e
LEFT JOIN prospectos p ON p.etapa_id = e.id
WHERE e.is_active = true
GROUP BY e.id, e.nombre, e.codigo, e.orden_funnel
ORDER BY e.orden_funnel;
```

### Tests del Servicio

```typescript
// tests/etapasService.test.ts

import { etapasService } from '../services/etapasService';

describe('EtapasService', () => {
  beforeAll(async () => {
    await etapasService.loadEtapas();
  });

  test('Cache se carga correctamente', () => {
    expect(etapasService.isReady()).toBe(true);
    expect(etapasService.getAllActive().length).toBeGreaterThan(0);
  });

  test('Obtener etapa por ID', () => {
    const etapa = etapasService.getById('9832d031-f7ef-4596-a66e-f922daaa9772');
    expect(etapa?.nombre).toBe('Primer contacto');
    expect(etapa?.codigo).toBe('primer_contacto');
  });

  test('Obtener etapa por código', () => {
    const etapa = etapasService.getByCodigo('interesado');
    expect(etapa?.nombre).toBe('Interesado');
  });

  test('Migración de nombre legacy a ID', () => {
    const id = etapasService.migrateNombreToId('Primer contacto');
    expect(id).toBe('9832d031-f7ef-4596-a66e-f922daaa9772');
  });

  test('Obtener color funciona con ID, código y nombre', () => {
    const colorById = etapasService.getColor('9832d031-...');
    const colorByCodigo = etapasService.getColor('primer_contacto');
    const colorByNombre = etapasService.getColor('Primer contacto');
    
    expect(colorById).toBe('#3B82F6');
    expect(colorByCodigo).toBe('#3B82F6');
    expect(colorByNombre).toBe('#3B82F6');
  });

  test('Filtrar por grupo objetivo', () => {
    const engagement = etapasService.getByGrupo('ENGAGEMENT');
    const llamada = etapasService.getByGrupo('LLAMADA');
    
    expect(engagement.length).toBeGreaterThan(0);
    expect(llamada.length).toBeGreaterThan(0);
  });

  test('Obtener etapas terminales', () => {
    const terminales = etapasService.getTerminales();
    const codigos = terminales.map(e => e.codigo);
    
    expect(codigos).toContain('activo_pqnc');
    expect(codigos).toContain('es_miembro');
  });
});
```

---

## 📊 Beneficios de la Nueva Estructura

### 1. Configuración Dinámica sin Deploy

- ✅ Cambiar colores/iconos desde BD
- ✅ Agregar/quitar etapas sin tocar código
- ✅ Ajustar comportamiento por etapa (AI, llamadas, CRM)

### 2. Lógica de Negocio Rica

```typescript
// Ejemplo: Decidir si AI responde automáticamente
const etapa = etapasService.getById(prospecto.etapa_id);
if (etapa.ai_responde_auto) {
  await enviarRespuestaAI(prospecto);
}

// Ejemplo: Limitar reactivaciones por etapa
if (prospecto.intentos_reactivacion >= etapa.max_reactivaciones) {
  console.log('Máximo de reactivaciones alcanzado');
}
```

### 3. Integración CRM Mejorada

```typescript
// Mapeo multiidioma automático
const etapa = etapasService.getByCodigo('primer_contacto');
// etapa.mapeo_status_crm = ["Primer contacto", "First Contact"]

// Sincronización condicional
if (etapa.actualiza_crm_auto) {
  await syncToCRM(prospecto);
}
```

### 4. UI Consistente Centralizada

```typescript
// Colores desde BD
<Badge color={etapa.color_ui} />

// Iconos configurables
<Icon name={etapa.icono} />

// Orden explícito
const etapasOrdenadas = etapasService.getAllActive(); // Ya ordenadas por orden_funnel
```

---

## ⚠️ NO Hacer (Anti-Patterns)

### ❌ NO Eliminar Campo Legacy Pronto

```typescript
// ❌ MAL - Eliminar campo demasiado pronto
ALTER TABLE prospectos DROP COLUMN etapa;

// ✅ BIEN - Mantener ambos campos sincronizados varias semanas
// El trigger se encarga de la sincronización automática
```

### ❌ NO Asumir que etapa_id Siempre Existe

```typescript
// ❌ MAL - Asumir que siempre hay etapa_id
const etapa = etapasService.getById(prospecto.etapa_id); // Puede ser undefined
const color = etapa.color_ui; // Error si undefined

// ✅ BIEN - Usar fallbacks
const etapa = prospecto.etapa_info || 
              etapasService.getById(prospecto.etapa_id) ||
              etapasService.getByNombreLegacy(prospecto.etapa);
const color = etapa?.color_ui || '#6B7280';
```

### ❌ NO Hardcodear Nombres de Etapas

```typescript
// ❌ MAL - Hardcodear nombre (puede cambiar en BD)
if (prospecto.etapa === 'Primer contacto') { ... }

// ✅ BIEN - Usar código (estable)
const etapa = etapasService.getById(prospecto.etapa_id);
if (etapa?.codigo === 'primer_contacto') { ... }
```

---

## 🚀 Timeline Recomendado

| Semana | Fase | Tareas |
|--------|------|--------|
| **1** | Infraestructura | Vista SQL, trigger, índices, tipos TS, servicio base |
| **2** | Servicios Core | Actualizar prospectsService, liveMonitorService |
| **3** | UI Principal | Prospectos, Live Monitor, WhatsApp |
| **4** | UI Secundaria | Dashboard, Campañas, Audiencias |
| **5-6** | Testing | E2E, validación en producción |
| **7-10** | Monitoreo | Validar 100% funcionamiento, logs, métricas |
| **11+** | Limpieza (OPCIONAL) | Evaluar si remover campo legacy |

**Total: 10+ semanas con campo legacy activo**

---

## 📚 Documentación a Actualizar

- [ ] `ARQUITECTURA_BD_UNIFICADA.md` - Agregar sección tabla etapas
- [ ] `CONVENTIONS.md` - Convenciones de uso de etapas (preferir código sobre nombre)
- [ ] `API_REFERENCE.md` - Endpoints y tipos de etapas
- [ ] `CHANGELOG.md` - Documentar migración
- [ ] README de servicios - Documentar etapasService

---

## ✅ Criterios de Éxito

1. **Funcionalidad:**
   - ✅ Todos los filtros por etapa funcionan (ID y legacy)
   - ✅ Kanban muestra etapas correctas
   - ✅ Colores e iconos desde BD
   - ✅ Updates propagan en realtime
   - ✅ Trigger sincroniza ambos campos automáticamente

2. **Performance:**
   - ✅ Queries más rápidas (índice en etapa_id)
   - ✅ Cache reduce llamadas a BD
   - ✅ JOINs optimizados con vista

3. **Compatibilidad:**
   - ✅ Código legacy sigue funcionando
   - ✅ Migración gradual sin downtime
   - ✅ Rollback fácil si necesario

4. **Validación:**
   - ✅ Sin inconsistencias entre etapa y etapa_id
   - ✅ 100% de prospectos con ambos campos poblados
   - ✅ Tests E2E pasando

---

**Próximos pasos:** Validar si ya existe vista SQL y ejecutar Fase 1 (Infraestructura Base)

**Fecha estimada de limpieza campo legacy:** Mayo 2026 (después de 10+ semanas de validación)
