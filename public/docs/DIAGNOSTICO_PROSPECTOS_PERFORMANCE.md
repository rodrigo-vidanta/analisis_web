# 🔍 Diagnóstico de Rendimiento - Módulo de Prospectos

**Fecha:** Enero 2025  
**Versión:** B4.0.1N6.0.0  
**Problema:** El módulo de Prospectos tarda mucho en cargar

---

## 📊 PROBLEMAS IDENTIFICADOS

### 🔴 **CRÍTICO: Problema N+1 Query**

**Ubicación:** `src/components/prospectos/ProspectosManager.tsx` líneas 1365-1394

**Problema:**
```typescript
const enrichedProspectos = await Promise.all(
  (data || []).map(async (prospecto: Prospecto) => {
    // ❌ Consulta individual por cada prospecto
    if (prospecto.coordinacion_id) {
      coordinacionInfo = await coordinacionService.getCoordinacionById(prospecto.coordinacion_id);
    }
    // ❌ Consulta individual por cada prospecto
    if (prospecto.ejecutivo_id) {
      ejecutivoInfo = await coordinacionService.getEjecutivoById(prospecto.ejecutivo_id);
    }
  })
);
```

**Impacto:**
- Si hay **100 prospectos**, se hacen **200 consultas adicionales** (100 coordinaciones + 100 ejecutivos)
- Cada consulta tiene latencia de red (~50-200ms)
- **Tiempo total estimado:** 100 prospectos × 2 consultas × 100ms = **20 segundos solo en enriquecimiento**

**Ejemplo real:**
- 500 prospectos = 1,000 consultas adicionales
- Tiempo estimado: **100+ segundos** (más de 1.5 minutos)

---

### 🟡 **ALTO: Sin Límite de Datos**

**Ubicación:** `src/components/prospectos/ProspectosManager.tsx` línea 1339

**Problema:**
```typescript
let query = analysisSupabase
  .from('prospectos')
  .select('*'); // ❌ Sin límite, carga TODOS los prospectos
```

**Impacto:**
- Carga todos los prospectos de la base de datos sin paginación
- Si hay miles de prospectos, carga todos en memoria
- Aumenta el tiempo de carga inicial y consumo de memoria

---

### 🟡 **ALTO: Sin Caché**

**Problema:**
- Cada vez que se carga el módulo, hace todas las consultas de nuevo
- No hay caché de coordinaciones ni ejecutivos
- Coordinaciones y ejecutivos raramente cambian, pero se consultan cada vez

**Impacto:**
- Consultas redundantes en cada carga
- Latencia innecesaria

---

### 🟢 **MEDIO: Sin Optimización de Consultas**

**Problema:**
- Podría hacer un JOIN o cargar todas las coordinaciones/ejecutivos de una vez
- Luego mapear en memoria (mucho más rápido)

**Solución sugerida:**
```typescript
// ✅ Cargar TODAS las coordinaciones y ejecutivos de una vez
const [coordinaciones, ejecutivos] = await Promise.all([
  coordinacionService.getAllCoordinaciones(), // 1 consulta
  coordinacionService.getAllEjecutivos()     // 1 consulta
]);

// ✅ Mapear en memoria (instantáneo)
const coordinacionesMap = new Map(coordinaciones.map(c => [c.id, c]));
const ejecutivosMap = new Map(ejecutivos.map(e => [e.id, e]));

// ✅ Enriquecer prospectos usando el mapa
const enrichedProspectos = data.map(prospecto => ({
  ...prospecto,
  coordinacion_codigo: coordinacionesMap.get(prospecto.coordinacion_id)?.codigo,
  coordinacion_nombre: coordinacionesMap.get(prospecto.coordinacion_id)?.nombre,
  ejecutivo_nombre: ejecutivosMap.get(prospecto.ejecutivo_id)?.full_name,
  ejecutivo_email: ejecutivosMap.get(prospecto.ejecutivo_id)?.email
}));
```

**Mejora estimada:**
- De **200 consultas** a **2 consultas** (100 prospectos)
- Reducción de tiempo: **20 segundos → 0.2 segundos** (100x más rápido)

---

## 📈 MÉTRICAS ESTIMADAS

### Escenario Actual (100 prospectos)
- Consulta principal: ~500ms
- Enriquecimiento: ~20,000ms (200 consultas × 100ms)
- **Total: ~20.5 segundos**

### Escenario Optimizado (100 prospectos)
- Consulta principal: ~500ms
- Carga coordinaciones/ejecutivos: ~200ms (2 consultas)
- Mapeo en memoria: ~10ms
- **Total: ~0.7 segundos**

### Mejora: **~29x más rápido** 🚀

---

## ✅ SOLUCIONES RECOMENDADAS

### 1. **Optimizar Enriquecimiento (CRÍTICO)**

**Prioridad:** 🔴 ALTA  
**Esfuerzo:** 🟢 BAJO  
**Impacto:** 🚀 ALTO

**Implementar:**
- Cargar todas las coordinaciones y ejecutivos de una vez
- Crear mapas en memoria para búsqueda O(1)
- Mapear prospectos usando los mapas

**Archivos a modificar:**
- `src/components/prospectos/ProspectosManager.tsx` (líneas 1365-1394)
- `src/services/coordinacionService.ts` (agregar métodos `getAllCoordinaciones` y `getAllEjecutivos` si no existen)

---

### 2. **Implementar Paginación**

**Prioridad:** 🟡 MEDIA  
**Esfuerzo:** 🟡 MEDIO  
**Impacto:** 🚀 ALTO

**Implementar:**
- Paginación inicial de 50-100 prospectos
- Carga incremental al hacer scroll
- Botón "Cargar más" o scroll infinito

**Archivos a modificar:**
- `src/components/prospectos/ProspectosManager.tsx` (función `loadProspectos`)

---

### 3. **Implementar Caché**

**Prioridad:** 🟡 MEDIA  
**Esfuerzo:** 🟡 MEDIO  
**Impacto:** 🟢 MEDIO

**Implementar:**
- Caché de coordinaciones y ejecutivos en `localStorage` o estado global
- Invalidar caché solo cuando sea necesario
- TTL de 5-10 minutos

**Archivos a modificar:**
- `src/services/coordinacionService.ts`
- `src/components/prospectos/ProspectosManager.tsx`

---

### 4. **Optimizar Consulta Principal**

**Prioridad:** 🟢 BAJA  
**Esfuerzo:** 🟢 BAJO  
**Impacto:** 🟢 BAJO

**Implementar:**
- Seleccionar solo campos necesarios (no `select('*')`)
- Agregar índices en base de datos si no existen
- Usar `limit()` incluso si hay paginación

---

## 🎯 PLAN DE ACCIÓN RECOMENDADO

### Fase 1: Optimización Crítica (Inmediata)
1. ✅ Optimizar enriquecimiento de prospectos (N+1 → batch)
2. ⏱️ **Tiempo estimado:** 30 minutos
3. 🎯 **Mejora esperada:** 20-30x más rápido

### Fase 2: Paginación (Corto plazo)
1. ✅ Implementar paginación inicial
2. ⏱️ **Tiempo estimado:** 1-2 horas
3. 🎯 **Mejora esperada:** Carga inicial instantánea

### Fase 3: Caché (Mediano plazo)
1. ✅ Implementar caché de coordinaciones/ejecutivos
2. ⏱️ **Tiempo estimado:** 1 hora
3. 🎯 **Mejora esperada:** Cargas subsecuentes aún más rápidas

---

## 📝 NOTAS TÉCNICAS

### Métodos Necesarios en `coordinacionService`

Si no existen, agregar:
```typescript
async getAllCoordinaciones(): Promise<Coordinacion[]> {
  const { data } = await supabaseSystemUI
    .from('coordinaciones')
    .select('*')
    .eq('archivado', false);
  return data || [];
}

async getAllEjecutivos(): Promise<Ejecutivo[]> {
  const { data } = await supabaseSystemUI
    .from('auth_users')
    .select('*')
    .eq('is_active', true)
    .not('coordinacion_id', 'is', null);
  return data || [];
}
```

### Consideraciones de Memoria

- Con paginación, solo se cargan 50-100 prospectos a la vez
- Mapas de coordinaciones/ejecutivos son pequeños (~KB)
- Impacto en memoria: mínimo

---

## 🔍 VERIFICACIÓN POST-OPTIMIZACIÓN

Después de implementar las optimizaciones, verificar:

1. ✅ Tiempo de carga inicial < 1 segundo (100 prospectos)
2. ✅ Número de consultas reducido de 200+ a < 5
3. ✅ Uso de memoria estable
4. ✅ Experiencia de usuario fluida

---

**Diagnóstico realizado por:** AI Assistant  
**Fecha:** Enero 2025  
**Próximos pasos:** Implementar Fase 1 (Optimización Crítica)

