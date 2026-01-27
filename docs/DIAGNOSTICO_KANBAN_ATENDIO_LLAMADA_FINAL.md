# 🔍 Diagnóstico Final: Kanban "Atendió llamada" No Muestra Prospectos

**Fecha:** 27 de Enero 2026  
**Estado:** ✅ PROBLEMA IDENTIFICADO - SOLUCIÓN DISPONIBLE

---

## ✅ Datos Verificados en Base de Datos

### Etapa "Atendió llamada"
```json
{
  "id": "003ec594-6e7d-4bea-9cf4-09870626b182",
  "codigo": "atendio_llamada",
  "nombre": "Atendió llamada",
  "orden_funnel": 5,
  "color_ui": "#EF4444",
  "icono": "phone",
  "is_active": true
}
```

### Prospectos Confirmados
- ✅ **118 prospectos** con `etapa_id = "003ec594-6e7d-4bea-9cf4-09870626b182"`
- ✅ Todos tienen `etapa_id` poblado correctamente
- ✅ Ejemplos confirmados:
  - Victor Manuel López García
  - Hugo Santos
  - Adriana Herrera Mendoza
  - Jimena Gutiérrez Peña
  - ... (114 más)

---

## ❌ Problema Identificado

### Síntoma
1. ✅ Contador muestra "118" correctamente
2. ❌ Columna muestra "0 cargados"
3. ✅ Fixes aplicados funcionan para conteo
4. ❌ Los prospectos no aparecen en la columna

### Causa Real

**Los prospectos "Atendió llamada" NO están en los primeros 100 registros cargados**

El `ProspectosManager` carga prospectos en lotes de 100:

```typescript
// ProspectosManager.tsx (línea 1007)
const BATCH_SIZE = 100;

// loadProspectos (línea 1516-1522)
const from = reset ? 0 : currentPage * BATCH_SIZE;
const to = from + BATCH_SIZE - 1;

let query = analysisSupabase
  .from('prospectos')
  .select('*', { count: 'exact' })
  .range(from, to)
  .order('created_at', { ascending: false }); // ← Orden más recientes primero
```

**El problema:**
- La query ordena por `created_at DESC` (más recientes primero)
- Los prospectos en "Atendió llamada" son más antiguos
- No están en los primeros 100 registros
- El Kanban solo muestra los que ya están cargados en `allProspectos`

---

## 🔍 Verificación del Flujo

### 1. ProspectosManager Carga Datos

```typescript
// Estado: allProspectos
const [allProspectos, setAllProspectos] = useState<Prospecto[]>([]);

// Carga inicial: 100 prospectos más recientes
loadProspectos(true); // range(0, 99)

// Resultado: Los 100 prospectos más nuevos, que probablemente son:
// - Discovery
// - Interesado
// - En seguimiento
// NO incluyen "Atendió llamada" (más antiguos)
```

### 2. Kanban Recibe Datos

```typescript
// ProspectosKanban.tsx
<ProspectosKanban
  prospectos={filteredAndSortedProspectos}  // ← Solo los 100 cargados
  etapaTotals={etapaTotals}                 // ← Conteo correcto (118)
/>

// El Kanban agrupa los prospectos que recibe:
prospectosPorCheckpoint = useMemo(() => {
  prospectosConMensajes.forEach(prospecto => {
    const checkpoint = getCheckpointForEtapa(prospecto.etapa, prospecto.etapa_id);
    grouped[checkpoint].push(prospecto);
  });
}, [prospectosConMensajes]);

// Resultado:
// - Columna "Discovery": 50 prospectos ✅
// - Columna "Interesado": 30 prospectos ✅
// - Columna "Atendió llamada": 0 prospectos ❌ (no están en allProspectos)
```

### 3. Contador vs Prospectos

```typescript
// Contador (loadEtapaTotals)
// Query SIN LIMIT → cuenta TODOS los prospectos
const { data, count } = await analysisSupabase
  .from('prospectos')
  .select('etapa_id', { count: 'exact', head: false });

// Resultado: counts["003ec594..."] = 118 ✅

// Prospectos (loadProspectos)
// Query CON LIMIT → solo primeros 100
.range(0, 99)

// Resultado: allProspectos.length = 100
// Ninguno con etapa_id "003ec594..." ❌
```

---

## ✅ Solución

### Opción 1: Aumentar BATCH_SIZE (Temporal)

```typescript
// ProspectosManager.tsx (línea 1007)
const BATCH_SIZE = 500; // ← Aumentar de 100 a 500

// Pros: Carga más prospectos, mayor probabilidad de incluir "Atendió llamada"
// Contras: Más lento, no es escalable
```

### Opción 2: Carga Inicial Estratificada (Recomendado)

Cargar prospectos de TODAS las etapas activas, no solo los más recientes:

```typescript
// Nueva función: loadProspectosKanbanInitial()
const loadProspectosKanbanInitial = async () => {
  const etapas = etapasService.getAllActive();
  const PROSPECTOS_POR_ETAPA = 20; // 20 por etapa → ~200 total
  
  const promises = etapas.map(etapa => 
    analysisSupabase
      .from('prospectos')
      .select('*')
      .eq('etapa_id', etapa.id)
      .order('created_at', { ascending: false })
      .limit(PROSPECTOS_POR_ETAPA)
  );
  
  const results = await Promise.all(promises);
  const prospectosInicio = results.flatMap(r => r.data || []);
  
  setAllProspectos(prospectosInicio);
};
```

### Opción 3: Lazy Loading por Columna (Mejor UX)

Cargar prospectos cuando el usuario hace scroll en cada columna:

```typescript
// Ya existe onLoadMoreForColumn, pero no está implementado correctamente

const loadMoreProspectosForColumn = async (etapaId: string) => {
  const currentPage = columnPages[etapaId] || 0;
  const from = currentPage * COLUMN_BATCH_SIZE;
  const to = from + COLUMN_BATCH_SIZE - 1;
  
  const { data, error } = await analysisSupabase
    .from('prospectos')
    .select('*')
    .eq('etapa_id', etapaId)
    .order('created_at', { ascending: false })
    .range(from, to);
  
  if (!error && data) {
    setAllProspectos(prev => [...prev, ...data]);
    setColumnPages(prev => ({ ...prev, [etapaId]: currentPage + 1 }));
  }
};
```

---

## 🎯 Solución Inmediata

### Implementar Opción 2: Carga Estratificada

**Ventajas:**
- ✅ Carga ~20 prospectos de CADA etapa
- ✅ Garantiza que todas las columnas tengan datos iniciales
- ✅ Total ~200 prospectos vs 100 actuales
- ✅ Experiencia mejorada sin cambiar lógica de paginación

**Implementación:**

1. Agregar nueva función `loadProspectosKanbanInitial` en `ProspectosManager.tsx`
2. Llamarla en lugar de `loadProspectos(true)` cuando `viewType === 'kanban'`
3. Mantener `loadProspectos` para cargas subsecuentes (scroll infinito)

---

## 📝 Resumen

| Aspecto | Estado | Nota |
|---------|--------|------|
| Contador etapa_id | ✅ CORRECTO | Muestra 118 |
| Estados columnas | ✅ CORRECTO | Usan UUIDs |
| Prospectos en BD | ✅ CORRECTO | 118 confirmados |
| **Carga inicial** | ❌ **PROBLEMA** | **No incluye prospectos antiguos** |

**Próximo paso:** Implementar carga estratificada por etapa para vista Kanban.

---

## 🧪 Testing Manual (Workaround Inmediato)

Para verificar que el fix de etapa_id funciona, el usuario puede:

1. Hacer scroll infinito en el Kanban (cargar más prospectos)
2. Eventualmente cargará los prospectos "Atendió llamada"
3. Una vez cargados, aparecerán en la columna correctamente

**Esto confirma que el fix funciona, pero la UX no es óptima.**

---

**Estado:** ✅ DIAGNÓSTICO COMPLETO  
**Recomendación:** Implementar carga estratificada  
**Prioridad:** Media (workaround disponible con scroll)
