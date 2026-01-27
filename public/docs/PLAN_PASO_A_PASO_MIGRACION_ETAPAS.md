# 🎯 Plan Paso a Paso: Migración Etapa → Etapa_ID

**Fecha:** 26 de Enero 2026  
**Análisis base:** Subagent f845844e (análisis exhaustivo BD + Frontend)  
**Estrategia:** Migración gradual con CERO downtime  
**Duración estimada:** 3-4 semanas

---

## 📊 Contexto del Análisis

### Hallazgos Críticos

1. **✅ YA TIENES:**
   - Tabla `etapas` completa (25 columnas)
   - Dual column: `etapa` (VARCHAR) + `etapa_id` (UUID FK)
   - 2,653 prospectos sincronizados

2. **⚠️ RIESGOS CRÍTICOS:**
   - **50+ queries** usan `.eq('etapa', string)` o `.in('etapa', array)`
   - **4 subscripciones realtime** detectan cambios en `etapa`
   - **10+ componentes** renderizan `prospecto.etapa` directamente
   - Vista `live_monitor_view` usa `p.etapa` sin JOIN a etapas

3. **❌ NO ENCONTRADO:**
   - Vista `prospectos_con_ejecutivo_y_coordinacion` (mencionada pero no existe)
   - Trigger de sincronización entre `etapa` y `etapa_id`

---

## 🚀 Plan de Ejecución

### Fase 0: Preparación y Validación (Día 1)

#### Paso 0.1: Verificar estado actual de BD

```sql
-- 1. Verificar que tabla etapas exista y tenga datos
SELECT COUNT(*) as total_etapas, 
       COUNT(*) FILTER (WHERE is_active = true) as activas
FROM etapas;

-- 2. Verificar sincronización actual
SELECT 
  COUNT(*) as total,
  COUNT(etapa_id) as con_etapa_id,
  COUNT(etapa) as con_etapa_string,
  COUNT(*) FILTER (WHERE etapa_id IS NULL AND etapa IS NOT NULL) as solo_string,
  COUNT(*) FILTER (WHERE etapa_id IS NOT NULL AND etapa IS NULL) as solo_id,
  COUNT(*) FILTER (WHERE etapa_id IS NOT NULL AND etapa IS NOT NULL) as ambos
FROM prospectos;

-- 3. Detectar inconsistencias
SELECT 
  p.id,
  p.etapa as string_field,
  e.nombre as nombre_from_fk,
  CASE 
    WHEN p.etapa = e.nombre THEN 'OK'
    WHEN p.etapa IS NULL AND e.nombre IS NULL THEN 'AMBOS_NULL'
    ELSE 'INCONSISTENTE'
  END as estado
FROM prospectos p
LEFT JOIN etapas e ON p.etapa_id = e.id
WHERE p.etapa IS DISTINCT FROM e.nombre
LIMIT 20;

-- 4. Verificar que FK constraint exista
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'prospectos'
  AND kcu.column_name = 'etapa_id';
```

**Guardar como:** `scripts/validation/validate_etapas_migration_pre.sql`

#### Paso 0.2: Crear backup de seguridad

```bash
# Backup de prospectos (estructura y datos)
pg_dump -h HOST -U USER -d DATABASE \
  -t prospectos -t etapas \
  --clean --if-exists \
  -f backup_prospectos_etapas_$(date +%Y%m%d_%H%M%S).sql
```

---

### Fase 1: Infraestructura Base (Días 2-3)

#### Paso 1.1: Crear trigger de sincronización automática

**Por qué:** Garantiza que ambos campos (`etapa` y `etapa_id`) siempre estén sincronizados durante la transición.

```sql
-- ============================================
-- TRIGGER DE SINCRONIZACIÓN BIDIRECCIONAL
-- ============================================
CREATE OR REPLACE FUNCTION sync_etapa_dual_fields()
RETURNS TRIGGER AS $$
DECLARE
  v_etapa_id UUID;
  v_etapa_nombre VARCHAR;
BEGIN
  -- CASO 1: Si viene solo etapa (string), buscar etapa_id
  IF NEW.etapa IS NOT NULL AND 
     (NEW.etapa_id IS NULL OR 
      (OLD.etapa_id IS NOT NULL AND NEW.etapa_id != OLD.etapa_id)) 
  THEN
    SELECT id INTO v_etapa_id
    FROM etapas
    WHERE nombre = NEW.etapa AND is_active = true
    LIMIT 1;
    
    IF v_etapa_id IS NOT NULL THEN
      NEW.etapa_id := v_etapa_id;
      RAISE DEBUG 'Trigger: etapa "%" → etapa_id "%"', NEW.etapa, v_etapa_id;
    ELSE
      RAISE WARNING 'Trigger: No se encontró etapa con nombre "%"', NEW.etapa;
    END IF;
  END IF;

  -- CASO 2: Si viene solo etapa_id, actualizar etapa (string)
  IF NEW.etapa_id IS NOT NULL AND 
     (NEW.etapa IS NULL OR 
      (OLD.etapa IS NOT NULL AND NEW.etapa != OLD.etapa))
  THEN
    SELECT nombre INTO v_etapa_nombre
    FROM etapas
    WHERE id = NEW.etapa_id;
    
    IF v_etapa_nombre IS NOT NULL THEN
      NEW.etapa := v_etapa_nombre;
      RAISE DEBUG 'Trigger: etapa_id "%" → etapa "%"', NEW.etapa_id, v_etapa_nombre;
    ELSE
      RAISE WARNING 'Trigger: No se encontró etapa con ID "%"', NEW.etapa_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger (solo si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'sync_etapa_fields_trigger'
  ) THEN
    CREATE TRIGGER sync_etapa_fields_trigger
    BEFORE INSERT OR UPDATE OF etapa, etapa_id ON prospectos
    FOR EACH ROW
    EXECUTE FUNCTION sync_etapa_dual_fields();
    
    RAISE NOTICE '✅ Trigger sync_etapa_fields_trigger creado';
  ELSE
    RAISE NOTICE 'ℹ️ Trigger sync_etapa_fields_trigger ya existe';
  END IF;
END $$;
```

**Guardar como:** `migrations/20260126_create_etapa_sync_trigger.sql`

#### Paso 1.2: Test del trigger

```sql
-- Test 1: Insertar con solo etapa (string)
DO $$
DECLARE
  test_id UUID;
  test_etapa_id UUID;
BEGIN
  -- Insertar prospecto con solo etapa (string)
  INSERT INTO prospectos (nombre_completo, etapa, coordinacion_id)
  VALUES ('Test Trigger String', 'Interesado', (SELECT id FROM coordinaciones LIMIT 1))
  RETURNING id, etapa_id INTO test_id, test_etapa_id;
  
  -- Verificar que etapa_id se llenó
  IF test_etapa_id IS NOT NULL THEN
    RAISE NOTICE '✅ Test 1 OK: etapa → etapa_id (ID: %)', test_etapa_id;
  ELSE
    RAISE WARNING '❌ Test 1 FALLÓ: etapa_id es NULL';
  END IF;
  
  -- Limpiar
  DELETE FROM prospectos WHERE id = test_id;
END $$;

-- Test 2: Actualizar con solo etapa_id
DO $$
DECLARE
  test_id UUID;
  test_etapa VARCHAR;
  test_etapa_id_discovery UUID;
BEGIN
  -- Crear prospecto inicial
  INSERT INTO prospectos (nombre_completo, etapa, coordinacion_id)
  VALUES ('Test Trigger ID', 'Primer contacto', (SELECT id FROM coordinaciones LIMIT 1))
  RETURNING id INTO test_id;
  
  -- Obtener ID de etapa "Discovery"
  SELECT id INTO test_etapa_id_discovery FROM etapas WHERE codigo = 'discovery' LIMIT 1;
  
  -- Actualizar con etapa_id
  UPDATE prospectos SET etapa_id = test_etapa_id_discovery WHERE id = test_id
  RETURNING etapa INTO test_etapa;
  
  -- Verificar que etapa se actualizó
  IF test_etapa = 'Discovery' THEN
    RAISE NOTICE '✅ Test 2 OK: etapa_id → etapa ("%")', test_etapa;
  ELSE
    RAISE WARNING '❌ Test 2 FALLÓ: etapa es "%" (esperado "Discovery")', test_etapa;
  END IF;
  
  -- Limpiar
  DELETE FROM prospectos WHERE id = test_id;
END $$;
```

**Guardar como:** `migrations/20260126_test_etapa_sync_trigger.sql`

---

### Fase 2: Servicios y Tipos Base (Días 4-5)

#### Paso 2.1: Crear tipos TypeScript

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
  
  // Comportamiento
  agente_default: string | null;
  ai_responde_auto: boolean;
  actualiza_db_auto: boolean;
  actualiza_crm_auto: boolean;
  permite_llamadas_auto: boolean;
  mensajes_reactivacion_auto: boolean;
  plantillas_reactivacion_auto: boolean;
  permite_templates: boolean;
  
  // CRM
  es_etapa_crm: boolean;
  mapeo_status_crm: string[] | null;
  
  // Límites
  max_reactivaciones: number;
  
  // Auditoría
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Helper para opciones de selects
export interface EtapaOption {
  value: string; // id
  label: string; // nombre
  codigo: EtapaCodigo;
  color: string; // color_ui
  icono: string;
}
```

#### Paso 2.2: Crear servicio de etapas con cache

```typescript
// src/services/etapasService.ts (NUEVO ARCHIVO)

import { analysisSupabase } from '../config/analysisSupabase';
import type { Etapa, EtapaOption, EtapaCodigo } from '../types/etapas';

class EtapasService {
  private cache: Map<string, Etapa> = new Map(); // Por ID
  private cacheByNombre: Map<string, Etapa> = new Map(); // Por nombre (legacy)
  private cacheByCodigo: Map<EtapaCodigo, Etapa> = new Map(); // Por código
  private isLoaded = false;

  /**
   * Cargar todas las etapas activas desde BD
   * Se debe ejecutar al inicio de la app
   */
  async loadEtapas(): Promise<Etapa[]> {
    try {
      console.log('🔄 Cargando etapas desde BD...');
      
      const { data, error } = await analysisSupabase
        .from('etapas')
        .select('*')
        .eq('is_active', true)
        .order('orden_funnel', { ascending: true });

      if (error) throw error;

      // Limpiar caches
      this.cache.clear();
      this.cacheByNombre.clear();
      this.cacheByCodigo.clear();

      // Poblar caches
      data.forEach(etapa => {
        this.cache.set(etapa.id, etapa);
        this.cacheByNombre.set(etapa.nombre, etapa);
        this.cacheByCodigo.set(etapa.codigo, etapa);
      });

      this.isLoaded = true;
      console.log(`✅ ${data.length} etapas cargadas`);
      
      return data;
    } catch (error) {
      console.error('❌ Error cargando etapas:', error);
      throw error;
    }
  }

  /**
   * Obtener etapa por ID (método principal - RECOMENDADO)
   */
  getById(id: string | null | undefined): Etapa | undefined {
    if (!id) return undefined;
    return this.cache.get(id);
  }

  /**
   * Obtener etapa por código (estable, mejor que nombre)
   */
  getByCodigo(codigo: EtapaCodigo): Etapa | undefined {
    return this.cacheByCodigo.get(codigo);
  }

  /**
   * Obtener etapa por nombre legacy
   * SOLO para compatibilidad durante migración
   * @deprecated Usar getById o getByCodigo
   */
  getByNombreLegacy(nombre: string | null | undefined): Etapa | undefined {
    if (!nombre) return undefined;
    return this.cacheByNombre.get(nombre);
  }

  /**
   * Obtener color para UI
   * Acepta ID, código o nombre (fallback legacy)
   */
  getColor(idOrCodigoOrNombre: string): string {
    // Intentar como ID
    let etapa = this.cache.get(idOrCodigoOrNombre);
    
    // Si no, intentar como código
    if (!etapa) {
      etapa = this.cacheByCodigo.get(idOrCodigoOrNombre as EtapaCodigo);
    }
    
    // Si no, intentar como nombre (legacy)
    if (!etapa) {
      etapa = this.cacheByNombre.get(idOrCodigoOrNombre);
    }

    return etapa?.color_ui || '#6B7280'; // Gray por defecto
  }

  /**
   * Obtener todas las etapas activas (ordenadas por orden_funnel)
   */
  getAllActive(): Etapa[] {
    return Array.from(this.cache.values())
      .filter(e => e.is_active)
      .sort((a, b) => a.orden_funnel - b.orden_funnel);
  }

  /**
   * Obtener opciones para dropdowns/selects
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
   * Filtrar etapas por grupo objetivo
   */
  getByGrupo(grupo: 'ENGAGEMENT' | 'LLAMADA'): Etapa[] {
    return this.getAllActive().filter(e => e.grupo_objetivo === grupo);
  }

  /**
   * Obtener etapas terminales (es_terminal = true)
   */
  getTerminales(): Etapa[] {
    return this.getAllActive().filter(e => e.es_terminal);
  }

  /**
   * Obtener etapas del funnel (excluyendo terminales y orden 0)
   */
  getFunnel(): Etapa[] {
    return this.getAllActive()
      .filter(e => !e.es_terminal && e.orden_funnel > 0)
      .sort((a, b) => a.orden_funnel - b.orden_funnel);
  }

  /**
   * Verificar si el servicio está listo para usar
   */
  isReady(): boolean {
    return this.isLoaded && this.cache.size > 0;
  }

  /**
   * Recargar etapas (útil si cambian en BD)
   */
  async reload(): Promise<void> {
    await this.loadEtapas();
  }
}

export const etapasService = new EtapasService();
```

#### Paso 2.3: Inicializar servicio en App

```typescript
// src/main.tsx o src/App.tsx (ACTUALIZAR)

import { etapasService } from './services/etapasService';

// Al inicio de la app (useEffect en componente raíz)
useEffect(() => {
  const initializeApp = async () => {
    try {
      console.log('🚀 Inicializando aplicación...');
      
      // Cargar etapas
      await etapasService.loadEtapas();
      
      console.log('✅ Aplicación inicializada');
    } catch (error) {
      console.error('❌ Error inicializando aplicación:', error);
      // Mostrar toast o modal de error
    }
  };

  initializeApp();
}, []);
```

#### Paso 2.4: Crear componentes compartidos base

```typescript
// src/components/shared/EtapaBadge.tsx (NUEVO ARCHIVO)

import { etapasService } from '../../services/etapasService';
import type { Prospect } from '../../services/prospectsService';

interface EtapaBadgeProps {
  prospecto: Prospect;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export const EtapaBadge = ({ 
  prospecto, 
  showIcon = true, 
  size = 'sm' 
}: EtapaBadgeProps) => {
  // Estrategia de obtención (en orden de preferencia):
  // 1. Desde JOIN (si existe etapa_info)
  // 2. Desde cache por etapa_id
  // 3. Fallback legacy por nombre
  const etapa = prospecto.etapa_info || 
                etapasService.getById(prospecto.etapa_id) ||
                etapasService.getByNombreLegacy(prospecto.etapa);

  if (!etapa) {
    return <span className="text-gray-400 text-xs">Sin etapa</span>;
  }

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-1 text-xs' 
    : 'px-3 py-1.5 text-sm';

  return (
    <span
      className={`${sizeClasses} rounded font-medium flex items-center gap-1 inline-flex`}
      style={{ 
        backgroundColor: etapa.color_ui + '20', 
        color: etapa.color_ui 
      }}
    >
      {showIcon && <Icon name={etapa.icono} size={size === 'sm' ? 12 : 14} />}
      {etapa.nombre}
    </span>
  );
};
```

```typescript
// src/components/shared/EtapaSelector.tsx (NUEVO ARCHIVO)

import { etapasService } from '../../services/etapasService';

interface EtapaSelectorProps {
  value: string | null;
  onChange: (etapaId: string | null) => void;
  placeholder?: string;
  grupoObjetivo?: 'ENGAGEMENT' | 'LLAMADA';
  className?: string;
}

export const EtapaSelector = ({ 
  value, 
  onChange, 
  placeholder = 'Todas las etapas',
  grupoObjetivo,
  className = ''
}: EtapaSelectorProps) => {
  const opciones = grupoObjetivo
    ? etapasService.getByGrupo(grupoObjetivo).map(e => ({
        value: e.id,
        label: e.nombre,
        color: e.color_ui
      }))
    : etapasService.getOptions();

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
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

---

### Fase 3: Migración de Servicios Core (Días 6-8)

**Prioridad:** Migrar servicios ANTES que componentes UI

#### Paso 3.1: Actualizar prospectsService.ts

**Archivo:** `src/services/prospectsService.ts`

```typescript
// CAMBIOS MÍNIMOS - Compatibilidad total

// 1. Actualizar interface (agregar campos nuevos, deprecar legacy)
export interface Prospect {
  id: string;
  nombre: string;
  // ... otros campos
  
  // NUEVO: Campo principal
  etapa_id: string;
  
  // NUEVO: Opcional desde JOIN
  etapa_info?: Etapa;
  
  // LEGACY: Mantener por compatibilidad
  /** @deprecated Usar etapa_id y etapa_info. Se removerá en Q2 2026 */
  etapa?: string;
}

// 2. Actualizar searchProspects (CRÍTICO - usado en toda la app)
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

  // NUEVO: Filtrar por etapa_id
  if (criteria.etapa_id) {
    query = query.eq('etapa_id', criteria.etapa_id);
  }
  
  // COMPATIBILIDAD: Filtrar por etapa (string legacy)
  // TODO: Remover después de migración completa (Q2 2026)
  if (criteria.etapa && !criteria.etapa_id) {
    const etapaId = etapasService.migrateNombreToId(criteria.etapa);
    if (etapaId) {
      query = query.eq('etapa_id', etapaId);
    } else {
      // Fallback: buscar por string
      query = query.eq('etapa', criteria.etapa);
    }
  }

  return query;
}

// 3. Actualizar updateProspect
async updateProspect(prospectId: string, data: Partial<Prospect>) {
  const updates: any = { ...data };

  // MIGRACIÓN AUTOMÁTICA: Si viene etapa (string), convertir a etapa_id
  if (updates.etapa && !updates.etapa_id) {
    const etapaId = etapasService.migrateNombreToId(updates.etapa);
    if (etapaId) {
      updates.etapa_id = etapaId;
      // NO eliminar updates.etapa - el trigger de BD se encargará
    }
  }

  return analysisSupabase
    .from('prospectos')
    .update(updates)
    .eq('id', prospectId);
}
```

#### Paso 3.2: Actualizar liveMonitorService.ts

Similar a `prospectsService.ts`, agregar soporte para `etapa_id` manteniendo compatibilidad con `etapa`.

---

### Fase 4: NO Modificar Vistas Existentes (IMPORTANTE)

**Decisión:** NO modificar `live_monitor_view` ni crear vistas nuevas en esta fase.

**Razón:**
- `live_monitor_view` usa `p.etapa` directamente
- No se encontró uso extensivo de `prospectos_con_ejecutivo_y_coordinacion`
- Modificar vistas puede romper código de backend no analizado

**Estrategia:** 
- Consumir directamente desde tabla `prospectos` con JOIN a `etapas`
- Evitar crear capas de abstracción innecesarias
- Mantener simplicidad y control

---

### Fase 5: Migración de Componentes UI (Días 9-15)

**Ver documento:** `RESUMEN_EJECUTIVO_MIGRACION_ETAPAS.md` - Sección "Módulos a Migrar"

**Orden sugerido:**
1. ProspectosManager
2. LiveChatCanvas
3. LiveMonitor
4. Dashboard widgets
5. Campañas (audiencias, plantillas)

---

### Fase 6: Actualizar Realtime Subscriptions (Días 16-17)

**CRÍTICO:** Cambiar SOLO cuando componentes usen `etapa_id`

#### Componentes a actualizar:
1. `LiveChatCanvas.tsx` (línea 2218)
2. `ProspectosManager.tsx` (línea 1239)
3. `ProspectosNuevosWidget.tsx` (línea 230)
4. `liveMonitorKanbanOptimized.ts` (línea 384)

**Patrón:** La lógica seguirá funcionando porque el trigger mantiene ambos campos sincronizados.

---

### Fase 7: Testing y Monitoreo (Días 18-21)

#### Tests a ejecutar:
- [ ] Filtros por etapa funcionan
- [ ] Kanban agrupa correctamente
- [ ] Colores se muestran bien
- [ ] Realtime detecta cambios de etapa
- [ ] Updates funcionan con etapa_id
- [ ] Compatibilidad legacy sigue funcionando

---

### Fase 8: Deprecación y Limpieza (Semanas 4-10)

**NO ejecutar hasta validar 100% en producción durante varias semanas**

---

## ✅ Checklist General

### Pre-Requisitos
- [ ] Backup completo de BD
- [ ] Validar estado actual (Paso 0.1)
- [ ] Crear rama de feature en Git
- [ ] Comunicar cambios al equipo

### Infraestructura
- [ ] Crear trigger de sincronización
- [ ] Test del trigger
- [ ] Crear índices si no existen

### Código Base
- [ ] Crear tipos TypeScript
- [ ] Crear etapasService
- [ ] Inicializar en App
- [ ] Crear componentes compartidos

### Migración
- [ ] Actualizar prospectsService
- [ ] Actualizar liveMonitorService
- [ ] Actualizar componentes (por prioridad)
- [ ] Actualizar realtime subscriptions

### Validación
- [ ] Tests unitarios
- [ ] Tests E2E
- [ ] Monitoreo en staging
- [ ] Deploy a producción

---

**Próximo paso:** Ejecutar Fase 0 (Validación)
