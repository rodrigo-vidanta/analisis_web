# 🐛 Bug: Kanban No Muestra Prospectos en "Atendió llamada"

**Fecha:** 27 de Enero 2026  
**Módulo:** `ProspectosManager.tsx`  
**Problema:** Dos causas relacionadas con arquitectura legacy

---

## ❌ Problema Identificado

El Kanban de prospectos NO muestra prospectos en "Atendió llamada" a pesar de que existen **118 registros** en la base de datos.

**Síntomas:**
1. ✅ Contador muestra "118" correctamente
2. ❌ Columna muestra "0 cargados"

---

## 🔍 Causa Raíz (Doble Problema)

### Problema 1: Conteo de Totales usa Arquitectura Legacy

**La función que cuenta totales por etapa usa columna `etapa` (TEXT):**

**Archivo:** `src/components/prospectos/ProspectosManager.tsx`  
**Líneas:** 1455-1490

```typescript
// ❌ PROBLEMA: Selecciona columna 'etapa' (TEXT) en lugar de 'etapa_id' (FK)
let query = analysisSupabase
  .from('prospectos')
  .select('etapa', { count: 'exact', head: false });

// ❌ PROBLEMA: Agrupa por texto de etapa en lugar de etapa_id
const counts: Record<string, number> = {};
data?.forEach((row: { etapa?: string }) => {
  const etapa = row.etapa || 'Sin etapa';
  counts[etapa] = (counts[etapa] || 0) + 1;
});

setEtapaTotals(counts);
// Resultado: { "Atendió llamada": 120, "Interesado": 50, ... }
```

**El Kanban espera recibir totales con `etapa_id` como key:**

```typescript
// ProspectosKanban.tsx (líneas 350-355)
const getTotalForColumn = (checkpoint: CheckpointKey): number => {
  const etapaId = getEtapaIdForCheckpoint(checkpoint);
  if (!etapaId) return 0;
  
  // ✅ CORRECTO: Busca por etapa_id
  return etapaTotals[etapaId] || 0;
  // Espera: { "003ec594-6e7d-4bea-9cf4-09870626b182": 118, ... }
};
```

### Problema 2: Estados de Columnas Inicializados con Nombres Legacy ⭐

**El useEffect que inicializa estados de columnas usa nombres hardcodeados:**

**Archivo:** `src/components/prospectos/ProspectosManager.tsx`  
**Líneas:** 1163-1206

```typescript
// ❌ PROBLEMA: Lista hardcodeada de nombres de etapa
const etapasIniciales = [
  'Es miembro',
  'Activo PQNC',
  'Validando membresia',
  'En seguimiento',
  'Interesado',
  'Atendió llamada',  // ← String como key
  'Con ejecutivo',
  'Certificado adquirido'
];

const initialStates: Record<string, { loading: boolean; page: number; hasMore: boolean }> = {};
etapasIniciales.forEach(etapa => {
  initialStates[etapa] = { loading: false, page: -1, hasMore: true };
});

setColumnLoadingStates(initialStates);
// Resultado: { "Atendió llamada": { loading: false, ... } }
```

**El Kanban busca el estado por UUID:**

```typescript
// ProspectosKanban.tsx (línea 401)
const etapaId = getEtapaIdForCheckpoint(checkpointKey);
const columnState = columnLoadingStates[etapaId || ''];
// Busca: columnLoadingStates["003ec594-6e7d-4bea-9cf4-09870626b182"]
// Encuentra: undefined ❌
```

**Resultado:** Sin estado de columna → Kanban no muestra los prospectos cargados

---

## 🔍 Desajuste

| Componente | Key Esperada | Key Recibida | Resultado |
|------------|--------------|--------------|-----------|
| **ProspectosKanban** | `etapa_id` (UUID) | `etapa` (TEXT) | ❌ No coinciden |
| **Totales** | `003ec594-6e7d-4bea-9cf4-09870626b182` | `"Atendió llamada"` | **Contador funciona por casualidad** |
| **Estados** | `003ec594-6e7d-4bea-9cf4-09870626b182` | `"Atendió llamada"` | **0 prospectos mostrados** |

---

## ✅ Solución

### Cambio 1: loadEtapaTotals (Líneas 1455-1490)

```typescript
// ✅ CORRECTO: Seleccionar etapa_id
const loadEtapaTotals = async () => {
  try {
    let query = analysisSupabase
      .from('prospectos')
      .select('etapa_id', { count: 'exact', head: false }); // ← CAMBIO AQUÍ
    
    // ... filtros de permisos ...
    
    const { data, error } = await query;
    
    if (error) return;
    
    // ✅ CORRECTO: Agrupar por etapa_id
    const counts: Record<string, number> = {};
    data?.forEach((row: { etapa_id?: string }) => { // ← CAMBIO AQUÍ
      const etapaId = row.etapa_id || 'sin-etapa'; // ← CAMBIO AQUÍ
      counts[etapaId] = (counts[etapaId] || 0) + 1;
    });
    
    setEtapaTotals(counts);
  } catch (error) {
    console.error('❌ Error cargando totales por etapa:', error);
  }
};
```

### Cambio 2: Inicialización Estados de Columnas (Líneas 1163-1206) ⭐ **CRÍTICO**

```typescript
// ✅ CORRECTO: Cargar etapas dinámicamente desde servicio
if (user?.id && viewType === 'kanban') {
  hasInitialLoadRef.current = true;
  
  // ✅ Obtener etapas activas del servicio (ya cargadas)
  const etapasActivas = etapasService.getAllActive();
  
  const initialStates: Record<string, { loading: boolean; page: number; hasMore: boolean }> = {};
  etapasActivas.forEach(etapa => {
    initialStates[etapa.id] = { loading: false, page: -1, hasMore: true };
    // Key: UUID → "003ec594-6e7d-4bea-9cf4-09870626b182"
  });
  
  setColumnLoadingStates(initialStates);
  
  // Cargar todos los prospectos
  loadProspectos(true);
  loadEtapaTotals();
}
```

---

## 📊 Antes vs Después

### Antes (Legacy)

```json
{
  "Atendió llamada": 120,
  "Interesado": 85,
  "Discovery": 200
}
```

❌ Kanban busca por UUID → No encuentra → Muestra 0 prospectos

### Después (Nueva Arquitectura)

```json
{
  "003ec594-6e7d-4bea-9cf4-09870626b182": 118,
  "5327dcda-399a-460e-be96-0eb87e1d4d6b": 85,
  "328b8817-567b-480e-a3b1-5ecd198433dc": 200
}
```

✅ Kanban busca por UUID → Encuentra → Muestra 118 prospectos

---

## 🎯 Verificación

### 1. Revisar Interface

**TypeScript debe marcar error si se usa `etapa`:**

```typescript
data?.forEach((row: { etapa_id?: string }) => {
  const etapaId = row.etapa_id; // ✅ TypeScript correcto
  // const etapa = row.etapa; // ❌ TypeScript error si se elimina de interface
});
```

### 2. Console Log para Debugging

```typescript
console.log('📊 Totales por etapa:', counts);
// Debe mostrar UUIDs como keys, no nombres
```

### 3. Verificar en Kanban

Después del cambio, la columna "Atendió llamada" debe mostrar **118 prospectos**.

---

## ⚠️ Impacto en Otros Módulos

### Buscar Usos de `etapaTotals`

```bash
grep -r "etapaTotals" src/components/prospectos/
```

**Resultados esperados:**
- `ProspectosManager.tsx` - ✅ Productor (se corrige)
- `ProspectosKanban.tsx` - ✅ Consumidor (ya usa etapa_id)

### Otros Lugares a Verificar

1. **Dashboard** (`DashboardModule.tsx`):
   - Ya identificado en `docs/PROBLEMA_DASHBOARD_FILTROS_ETAPAS_LEGACY.md`
   - Necesita migración similar

2. **Widgets** (`ProspectosMetricsWidget.tsx`, etc.):
   - Revisar si usan `etapa` TEXT o `etapa_id` FK

---

## 📝 Cambios Requeridos

### Archivo: `ProspectosManager.tsx`

**Línea 1458:**
```typescript
// ANTES
.select('etapa', { count: 'exact', head: false });

// DESPUÉS
.select('etapa_id', { count: 'exact', head: false });
```

**Línea 1481-1484:**
```typescript
// ANTES
data?.forEach((row: { etapa?: string }) => {
  const etapa = row.etapa || 'Sin etapa';
  counts[etapa] = (counts[etapa] || 0) + 1;
});

// DESPUÉS
data?.forEach((row: { etapa_id?: string }) => {
  const etapaId = row.etapa_id || 'sin-etapa';
  counts[etapaId] = (counts[etapaId] || 0) + 1;
});
```

---

## 🔧 Código de Fix Completo

```typescript
const loadEtapaTotals = async () => {
  try {
    // Construir query base
    let query = analysisSupabase
      .from('prospectos')
      .select('etapa_id', { count: 'exact', head: false });
    
    // Aplicar filtros de permisos (usa queryUserId para modo ninja)
    if (queryUserId) {
      try {
        const filteredQuery = await permissionsService.applyProspectFilters(query, queryUserId);
        if (filteredQuery && typeof filteredQuery === 'object' && typeof filteredQuery.select === 'function') {
          query = filteredQuery;
        }
      } catch {
        // Error aplicando filtros - continuar con query original
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      return;
    }
    
    // Agrupar por etapa_id y contar
    const counts: Record<string, number> = {};
    data?.forEach((row: { etapa_id?: string }) => {
      const etapaId = row.etapa_id || 'sin-etapa';
      counts[etapaId] = (counts[etapaId] || 0) + 1;
    });
    
    setEtapaTotals(counts);
  } catch (error) {
    console.error('❌ Error cargando totales por etapa:', error);
  }
};
```

---

## ✅ Testing

### Después del Fix

1. **Refrescar** el módulo de Prospectos
2. Ir a **Vista Kanban**
3. Verificar columna **"Atendió llamada"**:
   - ✅ Debe mostrar **118 prospectos**
   - ✅ Header debe mostrar contador correcto
   - ✅ Prospectos deben ser visibles y clickeables

---

## 📚 Referencias

- **Bug original:** Reportado por usuario administrador
- **Base de datos:** 118 prospectos confirmados en etapa "Atendió llamada"
- **Reporte BD:** `docs/REPORTE_PROSPECTOS_ATENDIO_LLAMADA.md`
- **Kanban ya migrado:** ✅ Usa `etapa_id` correctamente
- **Manager pendiente:** ❌ Usa `etapa` TEXT (este fix)

---

**Estado:** ✅ PROBLEMA IDENTIFICADO - FIX LISTO PARA APLICAR
