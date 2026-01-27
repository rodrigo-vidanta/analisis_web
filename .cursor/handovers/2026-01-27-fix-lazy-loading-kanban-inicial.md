# Fix: Carga Inicial de Columnas Kanban (Lazy Loading)

**Fecha:** 27 de Enero 2026  
**Módulo:** Prospectos → Vista Kanban  
**Archivos modificados:**
- `src/components/prospectos/ProspectosManager.tsx`

---

## 🐛 Problema

Las columnas del Kanban no cargaban sus primeros 100 prospectos automáticamente. Específicamente:

1. **Columnas con pocos prospectos** (<100) nunca mostraban datos
2. **Error 416 (Range Not Satisfiable)** al hacer scroll en columnas pequeñas
3. **"Atendió llamada" (118 prospectos)** mostraba "0 cargados"

### Causas Raíz

#### 1. Inicialización incorrecta de `page`

```typescript
// ANTES (línea ~1695)
newColumnStates[etapa.id] = {
  loading: false, 
  page: 0,  // ← ❌ Incorrecto: página 0 ya cargada
  hasMore: true
};
```

**Problema:** Al establecer `page: 0`, la función `loadMoreProspectosForColumn` calculaba:
- `currentPage = 0 + 1 = 1`
- `from = 1 * 100 = 100` ← **¡Saltaba los primeros 100!**

#### 2. `hasMore` global en lugar de por columna

```typescript
// ANTES
hasMore: hasMore  // ← ❌ Usaba hasMore global (de los 100 más recientes)
```

**Problema:** 
- Cargaba los 100 prospectos más recientes de TODOS (sin filtrar por etapa)
- Si había >100 prospectos totales, marcaba `hasMore: true` para TODAS las columnas
- Columnas con <100 prospectos intentaban cargar página 1 (offset 100) → Error 416

#### 3. Sincronización incorrecta de estados

```typescript
// ANTES (useEffect)
loadProspectos(true);       // ← Se ejecutaba primero
loadEtapaTotals();          // ← Se ejecutaba después (async)
```

**Problema:** `loadProspectos` inicializaba estados antes de conocer los totales reales.

---

## ✅ Solución Implementada

### 1. Cambio de `page: 0` → `page: -1`

```typescript
// DESPUÉS (línea ~1709)
newColumnStates[etapa.id] = {
  loading: false, 
  page: -1,  // ← ✅ -1 = página 0 NO cargada aún
  hasMore: totalEnColumna > 0
};
```

**Cálculo correcto en scroll:**
- `currentPage = -1 + 1 = 0`
- `from = 0 * 100 = 0`
- `to = 0 + 99 = 99` ← **Carga primeros 100 correctamente**

### 2. `hasMore` específico por columna

```typescript
// DESPUÉS
const counts = etapaCountsOverride || etapaTotals;
const totalEnColumna = counts[etapa.id] || 0;

newColumnStates[etapa.id] = {
  page: -1,
  hasMore: totalEnColumna > 0  // ← ✅ Basado en total real de la columna
};
```

**Beneficios:**
- Columnas sin prospectos: `hasMore: false` (no intentan cargar)
- Columnas con <100: `hasMore: true` inicialmente, luego se ajusta
- Columnas con >100: `hasMore: true` hasta agotar

### 3. Orden correcto de carga

```typescript
// DESPUÉS (useEffect - líneas 1170-1191)
(async () => {
  const counts = await loadEtapaTotals();  // ← 1. Primero: contar totales
  
  const initialStates = {};
  etapasActivas.forEach(etapa => {
    const totalEnColumna = counts[etapa.id] || 0;  // ← 2. Usar counts reales
    initialStates[etapa.id] = { 
      page: -1, 
      hasMore: totalEnColumna > 0 
    };
  });
  setColumnLoadingStates(initialStates);  // ← 3. Inicializar estados
  
  await loadProspectos(true, counts);  // ← 4. Cargar prospectos globales
})();
```

### 4. `loadEtapaTotals` retorna counts

```typescript
// ANTES
const loadEtapaTotals = async () => {
  // ...
  setEtapaTotals(counts);
};

// DESPUÉS (línea 1451)
const loadEtapaTotals = async (): Promise<Record<string, number>> => {
  // ...
  setEtapaTotals(counts);
  return counts;  // ← ✅ Retorna para uso inmediato
};
```

### 5. Manejo de error 416 (Range Not Satisfiable)

```typescript
// DESPUÉS (línea ~1790)
if (error) {
  // Error 416: Range Not Satisfiable - No hay más datos
  if (error.code === 'PGRST103') {
    console.log(`ℹ️ No hay más datos para columna ${etapaId} (OFFSET fuera de rango)`);
    setColumnLoadingStates(prev => ({
      ...prev,
      [etapaId]: {
        loading: false,
        page: currentPage,
        hasMore: false  // ← Marca que no hay más
      }
    }));
    return;
  }
  // ...
}
```

### 6. Cálculo correcto de `hasMore` post-carga

```typescript
// DESPUÉS (línea ~1819)
const totalCargados = from + data.length;
const hasMore = count ? totalCargados < count : data.length === COLUMN_BATCH_SIZE;
```

**Ejemplo con 51 prospectos:**
- Primera carga: `from=0`, `data.length=51`, `totalCargados=51`
- `hasMore = 51 < 51 = false` ✅ (correcto, no hay más)

---

## 🧪 Testing

### Caso 1: Columna con <100 prospectos
**Ejemplo:** "Atendió llamada" (118 prospectos)

1. ✅ **Inicial:** `page: -1, hasMore: true` (118 > 0)
2. ✅ **Al renderizar:** Dispara `loadMoreProspectosForColumn`
3. ✅ **Primera carga:** `from=0, to=99` → Carga 100
4. ✅ **Scroll:** `from=100, to=199` → Carga 18
5. ✅ **Resultado:** `hasMore: false` (118 total, todos cargados)

### Caso 2: Columna con <100 prospectos (ej: 51)
**Ejemplo:** "Es miembro" (51 prospectos)

1. ✅ **Inicial:** `page: -1, hasMore: true` (51 > 0)
2. ✅ **Al renderizar:** Dispara `loadMoreProspectosForColumn`
3. ✅ **Primera carga:** `from=0, to=99` → Carga 51
4. ✅ **Resultado:** `hasMore: false` (51 < 100)
5. ✅ **NO intenta cargar más** (no error 416)

### Caso 3: Columna con 0 prospectos
**Ejemplo:** Nueva etapa sin prospectos

1. ✅ **Inicial:** `page: -1, hasMore: false` (0 == 0)
2. ✅ **NO dispara carga** (hasMore: false)
3. ✅ **Muestra "0 de 0"**

---

## 📊 Flujo Completo

```
Usuario abre Kanban
       ↓
useEffect detecta viewType === 'kanban'
       ↓
1. loadEtapaTotals()
   → SELECT etapa_id, COUNT(*) FROM prospectos GROUP BY etapa_id
   → Retorna: { "003ec594...": 118, "e3b7dbea...": 51, ... }
       ↓
2. Inicializar columnLoadingStates
   → Para cada etapa: { page: -1, hasMore: totalEnColumna > 0 }
   → "Atendió llamada": { page: -1, hasMore: true }
   → "Es miembro": { page: -1, hasMore: true }
       ↓
3. loadProspectos(true, counts)
   → Carga 100 más recientes (global) para widgets/stats
       ↓
4. ProspectosKanban se renderiza
       ↓
5. IntersectionObserver detecta columnas visibles
       ↓
6. Para cada columna visible con hasMore: true
   → loadMoreProspectosForColumn(etapaId)
   → page = -1 + 1 = 0
   → SELECT * FROM prospectos WHERE etapa_id = 'xxx' OFFSET 0 LIMIT 100
       ↓
7. Datos cargados
   → setAllProspectos([...prev, ...nuevos])
   → setColumnLoadingStates({ page: 0, hasMore: calculado })
       ↓
8. Kanban muestra "100 de 118" o "51 de 51"
       ↓
9. Usuario hace scroll
   → Si hasMore: true, repite paso 6 con page + 1
```

---

## 🔍 Verificación

### Consola esperada (sin errores):

```
✅ Etapas cargadas: 8
🔄 Cargando más prospectos para columna 003ec594-6e7d-4bea-9cf4-09870626b182: {page: 0, from: 0, to: 99}
✅ Columna 003ec594... cargada: {nuevos: 100, totalCargados: 100, totalEnBD: 118, hasMore: true}
🔄 Cargando más prospectos para columna e3b7dbea-7eb7-4a28-9f9a-c0df609878d3: {page: 0, from: 0, to: 99}
✅ Columna e3b7dbea... cargada: {nuevos: 51, totalCargados: 51, totalEnBD: 51, hasMore: false}
```

### UI esperada:

| Columna | Contador | Comportamiento |
|---------|----------|----------------|
| Atendió llamada | 100 de 118 | ✅ Muestra primeros 100, scroll carga 18 más |
| Es miembro | 51 de 51 | ✅ Muestra todos, NO intenta cargar más |
| Nueva etapa | 0 de 0 | ✅ NO intenta cargar |

---

## 📚 Archivos Relacionados

- `src/components/prospectos/ProspectosKanban.tsx` - Componente Kanban (IntersectionObserver)
- `src/services/etapasService.ts` - Servicio de etapas
- `docs/LAZY_LOADING_COLUMNAS_KANBAN.md` - Documentación del feature
- `docs/DIAGNOSTICO_KANBAN_ATENDIO_LLAMADA_FINAL.md` - Diagnóstico previo

---

## ⚠️ Notas Importantes

1. **`page: -1` es un sentinel value**: Indica "página 0 no cargada". Al sumar 1, da 0 (offset correcto).
2. **Error 416 es normal si la paginación es incorrecta**: Ahora se maneja gracefully.
3. **`loadEtapaTotals` retorna counts**: Para uso inmediato sin esperar setState.
4. **Carga inicial NO es por columna**: `loadProspectos` carga 100 globales para stats, lazy loading carga por columna.

---

**Estado:** ✅ Resuelto  
**Próximos pasos:** Testing en producción con dataset completo
