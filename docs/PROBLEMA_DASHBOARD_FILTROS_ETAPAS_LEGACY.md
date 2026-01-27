# 🐛 Problema Identificado: Filtros de Dashboard Usando Arquitectura Legacy

**Fecha:** 27 de Enero 2026  
**Módulo:** `DashboardModule.tsx`  
**Tipo:** Migración incompleta de etapas

---

## ❌ Problema

El módulo de Dashboard está usando la **columna `etapa` (TEXT)** legacy en lugar de la **nueva arquitectura con `etapa_id` (FK)**.

### Código Problemático

**Línea 3687:** Query solo selecciona `etapa` (TEXT)
```typescript
.select('id, etapa, coordinacion_id, created_at')
```

**Línea 3717:** Usa función `classifyEtapa` con strings
```typescript
const { category, name } = classifyEtapa(p.etapa);
```

**Función `classifyEtapa` (líneas 3657-3675):** Matching por strings
```typescript
const classifyEtapa = (etapa: string): { category: 'conversion' | 'out_of_funnel'; name: string } => {
  const e = (etapa || '').toLowerCase().trim();
  
  if (e.includes('validando')) return { category: 'conversion', name: 'Validando Membresía' };
  if (e.includes('seguimiento') || e.includes('discovery')) return { category: 'conversion', name: 'Discovery' };
  if (e.includes('interesado')) return { category: 'conversion', name: 'Interesado' };
  if (e.includes('atendi')) return { category: 'conversion', name: 'Atendió Llamada' };
  // ...
}
```

---

## 🔍 Impacto

1. **No usa la tabla `etapas`** (nueva arquitectura)
2. **No usa `etapa_id` FK** (relación correcta)
3. **Matching frágil por strings** (puede fallar con cambios de nombre)
4. **Inconsistencias** entre columna TEXT y FK

### Ejemplo de Inconsistencia

Según el reporte anterior:
- **`etapa_id` (FK):** 118 prospectos en "Atendió llamada"
- **`etapa` (TEXT):** 120 prospectos con texto "Atendió llamada"

**Diferencia:** 2 registros sin sincronizar

---

## ✅ Solución Requerida

### 1. Actualizar Query para Incluir FK y JOIN

```typescript
// ❌ ACTUAL (línea 3687)
.select('id, etapa, coordinacion_id, created_at')

// ✅ CORRECTO
.select(`
  id, 
  coordinacion_id, 
  created_at,
  etapa_id,
  etapas:etapa_id (
    id,
    nombre,
    codigo,
    grupo_objetivo,
    orden_funnel,
    es_terminal
  )
`)
```

### 2. Reemplazar `classifyEtapa` con Clasificación por FK

```typescript
// ❌ ACTUAL
const { category, name } = classifyEtapa(p.etapa);

// ✅ CORRECTO
const etapaData = p.etapas; // Datos de JOIN
const category = getEtapaCategory(etapaData);
const name = etapaData.nombre;
```

### 3. Crear Función de Clasificación Basada en Metadata

```typescript
const getEtapaCategory = (etapa: Etapa): 'conversion' | 'out_of_funnel' => {
  // Usar campo grupo_objetivo de la tabla etapas
  if (etapa.es_terminal) return 'out_of_funnel';
  if (etapa.grupo_objetivo === 'conversion') return 'conversion';
  
  // Fallback: usar nombres conocidos
  const nombre = etapa.nombre.toLowerCase();
  if (nombre.includes('activo pqnc') || nombre.includes('es miembro')) {
    return 'out_of_funnel';
  }
  
  return 'conversion';
};
```

### 4. Actualizar Definición de Etapas del Funnel

```typescript
// En lugar de hardcodear nombres, cargar dinámicamente
const [funnelStages, setFunnelStages] = useState<Etapa[]>([]);

useEffect(() => {
  const loadEtapas = async () => {
    const etapas = await etapasService.getEtapas();
    // Filtrar solo etapas de conversión, ordenadas
    const conversion = etapas
      .filter(e => e.grupo_objetivo === 'conversion' && e.is_active)
      .sort((a, b) => (a.orden_funnel || 0) - (b.orden_funnel || 0));
    setFunnelStages(conversion);
  };
  loadEtapas();
}, []);
```

---

## 📋 Otros Lugares Afectados

Buscar en todo el archivo `DashboardModule.tsx`:

1. **Línea 3818:** Otro uso de `classifyEtapa(p.etapa)`
2. **Constantes hardcodeadas:** `FUNNEL_CONVERSION_STAGES`, `OUT_OF_FUNNEL_STAGES`
3. **Widgets hijos:** Verificar si usan `etapa` TEXT

### Archivos Relacionados a Revisar

```bash
grep -r "p\.etapa" src/components/dashboard/
grep -r "classifyEtapa" src/components/dashboard/
grep -r "FUNNEL.*STAGES" src/components/dashboard/
```

---

## 🎯 Plan de Migración

### Paso 1: Actualizar Tipos

```typescript
interface ProspectoConEtapa {
  id: string;
  coordinacion_id: string;
  created_at: string;
  etapa_id: string;
  etapas: {
    id: string;
    nombre: string;
    codigo: string;
    grupo_objetivo: string;
    orden_funnel: number;
    es_terminal: boolean;
  } | null;
}
```

### Paso 2: Actualizar Queries

Reemplazar todos los `select('id, etapa, ...')` por JOINs con `etapas`.

### Paso 3: Eliminar `classifyEtapa`

Reemplazar con lógica basada en metadata de la tabla `etapas`.

### Paso 4: Cargar Etapas Dinámicamente

En lugar de constantes hardcodeadas, cargar desde BD.

### Paso 5: Actualizar Widgets Hijos

Verificar `ProspectosMetricsWidget`, `EjecutivosMetricsWidget`, etc.

### Paso 6: Testing

1. Verificar que el funnel muestra las etapas correctas
2. Verificar que los conteos coinciden
3. Verificar filtros por coordinación
4. Verificar filtros por período

---

## ⚠️ Riesgos

1. **Breaking change:** El código actual funciona (aunque con datos legacy)
2. **Performance:** JOINs pueden ser más lentos (optimizar con índices)
3. **NULL handling:** Prospectos sin `etapa_id` pueden romper el dashboard
4. **Sincronización:** Migración debe estar 100% completa

---

## 🔧 Migración Segura

### Opción 1: Dual Mode (Recomendado)

```typescript
// Intentar usar etapa_id primero, fallback a etapa TEXT
const getEtapaNombre = (prospecto: any): string => {
  if (prospecto.etapas?.nombre) return prospecto.etapas.nombre;
  if (prospecto.etapa) return prospecto.etapa;
  return 'Sin etapa';
};
```

### Opción 2: Migración Completa Inmediata

Requiere que todos los prospectos tengan `etapa_id` sincronizado.

---

## 📊 Estado Actual de la Migración

Según análisis previo:
- **Tabla `etapas`:** ✅ Existe con 10 etapas activas
- **Columna `etapa_id` en `prospectos`:** ✅ Existe
- **Prospectos con `etapa_id`:** ✅ ~118 (ejemplo: "Atendió llamada")
- **Prospectos con `etapa` TEXT:** ✅ ~120 (diferencia de 2)
- **Sincronización:** ⚠️ 98-99% completa

---

## 📚 Referencias

- Tabla de etapas: `etapas` (10 etapas activas)
- Servicio: `src/services/etapasService.ts`
- Tipos: `src/types/etapas.ts`
- Reporte: `docs/REPORTE_PROSPECTOS_ATENDIO_LLAMADA.md`
- Handovers: `.cursor/handovers/2026-01-26-migracion-etapas-*.md`

---

**Conclusión:** El Dashboard necesita actualizarse para usar la nueva arquitectura de etapas con `etapa_id` (FK) en lugar de la columna `etapa` (TEXT) legacy.
