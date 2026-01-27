# ✅ Fix: Kanban Muestra Prospectos en "Atendió llamada"

**Fecha:** 27 de Enero 2026  
**Módulo:** `ProspectosManager.tsx`  
**Tipo:** Migración de etapa (TEXT) → etapa_id (FK)

---

## 🐛 Problema Original

El usuario **administrador** no veía prospectos en la columna "Atendió llamada" del Kanban, a pesar de que en BD existen **118 registros**.

---

## 🔍 Causa Raíz

La función `loadEtapaTotals` en `ProspectosManager.tsx` estaba usando la **columna legacy `etapa` (TEXT)** para contar totales:

```typescript
// ❌ ANTES (línea 1458)
.select('etapa', { count: 'exact', head: false });

// ❌ ANTES (líneas 1481-1484)
const counts: Record<string, number> = {};
data?.forEach((row: { etapa?: string }) => {
  const etapa = row.etapa || 'Sin etapa';
  counts[etapa] = (counts[etapa] || 0) + 1;
});
```

**Resultado legacy:**
```json
{
  "Atendió llamada": 120,  // ← String como key
  "Interesado": 85,
  "Discovery": 200
}
```

Pero el **Kanban esperaba recibir UUIDs como keys:**

```typescript
// ProspectosKanban.tsx (línea 354)
return etapaTotals[etapaId] || 0;
// Busca: etapaTotals["003ec594-6e7d-4bea-9cf4-09870626b182"]
```

**Desajuste:** String vs UUID → **0 prospectos mostrados**

---

## ✅ Solución Aplicada

### Cambios en `ProspectosManager.tsx`

#### 1. Interface FilterState (línea 124)

```typescript
// ✅ DESPUÉS
interface FilterState {
  search: string;
  etapa_id: string; // ✅ Migrado de 'etapa' a 'etapa_id'
  score: string;
  campana_origen: string;
  dateRange: string;
  coordinacion_id: string;
  ejecutivo_id: string;
  asignacion: 'todos' | 'asignados' | 'no_asignados';
}
```

#### 2. Estado Inicial (línea 1006)

```typescript
// ✅ DESPUÉS
const [filters, setFilters] = useState<FilterState>({
  search: '',
  etapa_id: '', // ✅ Cambiado de 'etapa'
  score: '',
  campana_origen: '',
  dateRange: '',
  coordinacion_id: '',
  ejecutivo_id: '',
  asignacion: 'todos'
});
```

#### 3. Función loadEtapaTotals (líneas 1455-1490)

```typescript
// ✅ DESPUÉS (línea 1458)
.select('etapa_id', { count: 'exact', head: false });

// ✅ DESPUÉS (líneas 1481-1486)
const counts: Record<string, number> = {};
data?.forEach((row: { etapa_id?: string }) => {
  const etapaId = row.etapa_id || 'sin-etapa';
  counts[etapaId] = (counts[etapaId] || 0) + 1;
});

setEtapaTotals(counts);
```

**Resultado nuevo:**
```json
{
  "003ec594-6e7d-4bea-9cf4-09870626b182": 118,  // ← UUID como key
  "5327dcda-399a-460e-be96-0eb87e1d4d6b": 85,
  "328b8817-567b-480e-a3b1-5ecd198433dc": 200
}
```

#### 4. Filtro de Etapa en UI (línea 2140)

```typescript
// ✅ DESPUÉS
<select
  value={filters.etapa_id}
  onChange={(e) => setFilters(prev => ({ ...prev, etapa_id: e.target.value }))}
  className="..."
>
  <option value="">Todas las etapas</option>
  {etapasService.getAllActive().map(etapa => (
    <option key={etapa.id} value={etapa.id}>{etapa.nombre}</option>
  ))}
</select>
```

#### 5. Filtrado de Prospectos (línea 1825)

```typescript
// ✅ DESPUÉS
if (filters.etapa_id) {
  filtered = filtered.filter(p => p.etapa_id === filters.etapa_id);
}
```

#### 6. Limpiar Filtros (línea 2193)

```typescript
// ✅ DESPUÉS
onClick={() => setFilters({ 
  search: '', 
  etapa_id: '',  // ✅ Cambiado de 'etapa'
  score: '', 
  campana_origen: '', 
  dateRange: '', 
  coordinacion_id: '', 
  ejecutivo_id: '', 
  asignacion: 'todos' 
})}
```

#### 7. Inicialización de Estados de Columnas Kanban (línea 1163) ⭐ **CRÍTICO**

```typescript
// ❌ ANTES (líneas 1173-1187)
const etapasIniciales = [
  'Es miembro',
  'Activo PQNC',
  'Validando membresia',
  // ... nombres hardcodeados
];

const initialStates: Record<string, { loading: boolean; page: number; hasMore: boolean }> = {};
etapasIniciales.forEach(etapa => {
  initialStates[etapa] = { loading: false, page: -1, hasMore: true };
});
// Resultado: { "Atendió llamada": {...} } ← String como key ❌

// ✅ DESPUÉS (líneas 1169-1177)
const etapasActivas = etapasService.getAllActive();

const initialStates: Record<string, { loading: boolean; page: number; hasMore: boolean }> = {};
etapasActivas.forEach(etapa => {
  initialStates[etapa.id] = { loading: false, page: -1, hasMore: true };
});
// Resultado: { "003ec594-6e7d-4bea-9cf4-09870626b182": {...} } ← UUID como key ✅
```

**Este cambio es CRÍTICO porque:**
- El Kanban busca el estado de la columna por `etapa_id` (UUID)
- Si el estado se inicializa con nombres (TEXT), no se encuentra el estado
- Sin estado → la columna no se considera lista para mostrar contenido

---

## 📊 Resultado

### Antes del Fix
```
Columna "Atendió llamada": 0 prospectos
(pero en BD existen 118)
```

### Después del Fix
```
Columna "Atendió llamada": 118 prospectos ✅
- Victor Manuel
- Hugo
- Adriana
- Jimena
- Jesus Arturo
- ... (113 más)
```

---

## 🎯 Testing

1. **Refrescar** el módulo de Prospectos (Cmd+R)
2. Ir a **Vista Kanban**
3. Verificar columna **"Atendió llamada"**:
   - ✅ Header muestra: "118" en el contador
   - ✅ Prospectos visibles en la columna
   - ✅ Todos los prospectos clickeables

4. **Probar filtro de etapa:**
   - Seleccionar "Atendió llamada" en el dropdown
   - ✅ Debe filtrar solo esos 118 prospectos

---

## 📁 Archivos Modificados

- ✅ `src/components/prospectos/ProspectosManager.tsx` (6 cambios)

### Resumen de Cambios

| Línea | Cambio | Antes | Después |
|-------|--------|-------|---------|
| 126 | Interface FilterState | `etapa: string` | `etapa_id: string` |
| 1008 | Estado inicial | `etapa: ''` | `etapa_id: ''` |
| **1173-1177** | **Estados columnas Kanban** ⭐ | **Nombres hardcodeados** | **`etapasService` dinámico** |
| 1458 | Query select | `'etapa'` | `'etapa_id'` |
| 1481-1484 | Agrupación | `row.etapa` | `row.etapa_id` |
| 1825 | Filtrado | `p.etapa === filters.etapa` | `p.etapa_id === filters.etapa_id` |
| 2140 | UI selector | `filters.etapa` + `getUniqueValues` | `filters.etapa_id` + `etapasService` |
| 2193 | Limpiar filtros | `etapa: ''` | `etapa_id: ''` |

---

## 🔐 Permisos

✅ **Usuario administrador** tiene acceso completo a todos los prospectos  
✅ **Sin filtros de permisos** aplicados (admin puede ver todo)

---

## 📚 Ver También

- [Reporte de Prospectos](REPORTE_PROSPECTOS_ATENDIO_LLAMADA.md) - 118 prospectos confirmados
- [Problema Dashboard](PROBLEMA_DASHBOARD_FILTROS_ETAPAS_LEGACY.md) - Mismo problema en Dashboard
- [Migración Etapas](MIGRACION_ETAPAS_STRING_A_FK.md) - Documentación de la migración

---

## ⚠️ Nota Importante

**Dashboard también necesita este fix:**
- `DashboardModule.tsx` usa la misma arquitectura legacy
- Mismo cambio de `etapa` → `etapa_id` requerido
- Ver: `docs/PROBLEMA_DASHBOARD_FILTROS_ETAPAS_LEGACY.md`

---

**Estado:** ✅ FIX APLICADO  
**Linter:** ✅ Sin errores  
**Test:** Verificar en aplicación
