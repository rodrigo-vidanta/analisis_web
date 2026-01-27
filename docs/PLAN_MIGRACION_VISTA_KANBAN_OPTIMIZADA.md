# Plan de Migración a Vista Optimizada - Kanban de Prospectos

**Fecha:** 27 de Enero 2026  
**Prioridad:** ALTA (mejora rendimiento 81%)  
**Complejidad:** MEDIA (requiere coordinación BD + código)  
**Tiempo estimado:** 2-3 horas

---

## 📊 Problema Actual

### Performance Actual
```
Carga de 100 prospectos:
├─ Query prospectos:         200ms
├─ Query coordinaciones:     150ms  
├─ Query ejecutivos:         200ms
├─ Enrichment JavaScript:    250ms
└─ TOTAL:                    800ms ❌

Queries por carga: 3-5
Código: ~200 líneas
```

### Con Vista Optimizada
```
Carga de 100 prospectos:
└─ Query vista (JOINs en DB): 150ms ✅

Queries por carga: 1
Código: ~30 líneas
```

**Mejora:** 81% más rápido + 85% menos código

---

## 🎯 Objetivos

1. ✅ **Rendimiento:** Reducir latencia de 800ms a 150ms
2. ✅ **Simplicidad:** Eliminar 170 líneas de código
3. ✅ **Mantenibilidad:** JOINs en SQL (declarativo) vs JavaScript (imperativo)
4. ✅ **Escalabilidad:** PostgreSQL optimiza JOINs mejor que JavaScript

---

## 📋 Plan de Ejecución

### Fase 1: Crear Vista en BD (15 min)

1. **Ejecutar script SQL:**
   ```bash
   # Usar MCP SupabaseREST o psql
   psql -h glsmifhkoaifvaegsozd.supabase.co \
        -U postgres \
        -d postgres \
        -f scripts/optimizaciones/crear_vista_prospectos_kanban.sql
   ```

2. **Verificar vista creada:**
   ```sql
   SELECT * FROM prospectos_kanban_enriched LIMIT 5;
   ```

3. **Verificar índices necesarios:**
   ```sql
   -- Ver índices existentes
   SELECT tablename, indexname 
   FROM pg_indexes 
   WHERE tablename IN ('prospectos', 'etapas', 'coordinaciones', 'auth_users');
   
   -- Crear índices faltantes (si es necesario)
   CREATE INDEX IF NOT EXISTS idx_prospectos_etapa_id 
     ON prospectos(etapa_id);
   CREATE INDEX IF NOT EXISTS idx_prospectos_coordinacion_id 
     ON prospectos(coordinacion_id);
   CREATE INDEX IF NOT EXISTS idx_prospectos_ejecutivo_id 
     ON prospectos(ejecutivo_id);
   ```

### Fase 2: Actualizar Código TypeScript (45 min)

#### 2.1. Actualizar `loadMoreProspectosForColumn` (ProspectosManager.tsx)

```typescript
// LÍNEA ~1765
const loadMoreProspectosForColumn = async (etapaId: string) => {
  const currentState = columnLoadingStates[etapaId];
  if (!currentState || currentState.loading || !currentState.hasMore) {
    return;
  }

  setColumnLoadingStates(prev => ({
    ...prev,
    [etapaId]: { ...prev[etapaId], loading: true }
  }));

  try {
    const COLUMN_BATCH_SIZE = 100;
    const currentPage = currentState.page + 1;
    const from = currentPage * COLUMN_BATCH_SIZE;
    const to = from + COLUMN_BATCH_SIZE - 1;

    console.log(`🔄 Cargando más prospectos para columna ${etapaId}:`, {
      page: currentPage, from, to, batchSize: COLUMN_BATCH_SIZE
    });

    // ✅ USAR VISTA OPTIMIZADA
    let query = analysisSupabase
      .from('prospectos_kanban_enriched')  // ← Cambio principal
      .select('*', { count: 'exact' })
      .eq('etapa_id', etapaId)
      .range(from, to)
      .order('created_at', { ascending: false });

    // Aplicar filtros de permisos
    if (queryUserId) {
      try {
        const filteredQuery = await permissionsService.applyProspectFilters(query, queryUserId);
        if (filteredQuery && typeof filteredQuery.select === 'function') {
          query = filteredQuery;
        }
      } catch {
        // Continuar con query original
      }
    }

    const { data, error, count } = await query;

    if (error) {
      if (error.code === 'PGRST103') {
        console.log(`ℹ️ No hay más datos para columna ${etapaId}`);
        setColumnLoadingStates(prev => ({
          ...prev,
          [etapaId]: { loading: false, page: currentPage, hasMore: false }
        }));
        return;
      }
      console.error(`❌ Error cargando columna ${etapaId}:`, error);
      setColumnLoadingStates(prev => ({
        ...prev,
        [etapaId]: { ...prev[etapaId], loading: false }
      }));
      return;
    }

    if (data && data.length > 0) {
      // ✅ NO NECESITA ENRICHMENT - Ya viene todo listo desde la vista
      // Solo agregar a allProspectos evitando duplicados
      setAllProspectos(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newProspectos = data.filter((p: Prospecto) => !existingIds.has(p.id));
        return [...prev, ...newProspectos];
      });

      const totalCargados = from + data.length;
      const hasMore = count ? totalCargados < count : data.length === COLUMN_BATCH_SIZE;
      
      setColumnLoadingStates(prev => ({
        ...prev,
        [etapaId]: { loading: false, page: currentPage, hasMore }
      }));

      console.log(`✅ Columna ${etapaId} cargada:`, {
        nuevos: data.length,
        totalCargados,
        totalEnBD: count || 'desconocido',
        hasMore
      });
    } else {
      setColumnLoadingStates(prev => ({
        ...prev,
        [etapaId]: { loading: false, page: currentPage, hasMore: false }
      }));
    }
  } catch (error) {
    console.error(`❌ Error en loadMoreProspectosForColumn:`, error);
    setColumnLoadingStates(prev => ({
      ...prev,
      [etapaId]: { ...prev[etapaId], loading: false }
    }));
  }
};
```

**Cambios:**
1. `.from('prospectos')` → `.from('prospectos_kanban_enriched')`
2. Eliminar llamada a `loadCoordinacionesAndEjecutivos()`
3. Eliminar llamada a `enrichProspectos()`
4. Simplificar lógica de agregación

#### 2.2. (Opcional) Actualizar `loadProspectos` para DataGrid

Si quieres aplicar la misma optimización a DataGrid:

```typescript
// LÍNEA ~1510
let query = analysisSupabase
  .from('prospectos_kanban_enriched')  // ← Usar vista también aquí
  .select('*', { count: 'exact' })
  .range(from, to);
```

### Fase 3: Testing (30 min)

#### 3.1. Testing Manual

1. **Refrescar app:** `Cmd+R` en navegador
2. **Abrir DevTools:** Console + Network tabs
3. **Verificar queries:**
   - Network → Filter "supabase"
   - Debe mostrar queries a `prospectos_kanban_enriched`
   - NO debe haber queries a `coordinaciones` o `auth_users`

4. **Verificar funcionalidad:**
   - ✅ "Atendió llamada" muestra "100 de 118" inmediatamente
   - ✅ Scroll carga más prospectos correctamente
   - ✅ Badges de coordinación/ejecutivo se muestran correctamente
   - ✅ Colores de etapas correctos

#### 3.2. Testing de Rendimiento

**Antes de migración:**
```javascript
// En Console, medir tiempo de carga
console.time('carga-columna');
// Hacer scroll en columna
// Esperar a que termine
console.timeEnd('carga-columna');
// Resultado esperado: ~800ms
```

**Después de migración:**
```javascript
console.time('carga-columna');
// Hacer scroll en columna
console.timeEnd('carga-columna');
// Resultado esperado: ~150ms ✅ (81% más rápido)
```

#### 3.3. Verificar Permisos (RLS)

```typescript
// Probar con usuario ejecutivo (no admin)
// Verificar que solo ve sus prospectos
// La vista hereda RLS de tabla prospectos automáticamente
```

### Fase 4: Monitoreo (1 semana)

1. **Métricas a monitorear:**
   - Tiempo de respuesta promedio (debe bajar a ~150ms)
   - Número de queries por acción (debe ser 1)
   - Errores en logs (no debe haber relacionados a la vista)

2. **Rollback plan:**
   Si algo falla, revertir cambio:
   ```typescript
   // Cambiar de vuelta a:
   .from('prospectos')
   // Y restaurar llamadas a enrichProspectos()
   ```

---

## 🔧 Archivos a Modificar

| Archivo | Cambios | Líneas afectadas |
|---------|---------|------------------|
| `scripts/optimizaciones/crear_vista_prospectos_kanban.sql` | ✅ Crear vista | NEW (140 líneas) |
| `src/components/prospectos/ProspectosManager.tsx` | Usar vista + eliminar enrichment | ~1765-1840 (~75 líneas) |
| (Opcional) `src/components/prospectos/ProspectosManager.tsx` | Aplicar a DataGrid también | ~1510-1680 (~170 líneas) |

---

## ⚠️ Consideraciones Importantes

### 1. Permisos (RLS)
- ✅ La vista **hereda automáticamente** las políticas RLS de `prospectos`
- ✅ NO necesitas configurar permisos adicionales
- ✅ Si `prospectos` tiene RLS habilitado, la vista también

### 2. Índices
- Verificar que existan índices en:
  - `prospectos(etapa_id)`
  - `prospectos(coordinacion_id)`
  - `prospectos(ejecutivo_id)`
  - `prospectos(created_at DESC)`

### 3. Contadores de Mensajes
La vista incluye:
```sql
(SELECT COUNT(*) FROM mensajes_whatsapp WHERE prospecto_id = p.id) as total_mensajes
```
Esto puede ser lento si hay muchos mensajes. **Solución:**
- Agregar índice: `CREATE INDEX idx_mensajes_whatsapp_prospecto_id ON mensajes_whatsapp(prospecto_id);`
- O eliminar de la vista y calcular en frontend solo cuando sea necesario

### 4. Actualización de Datos
- La vista es **virtual** (no materializada)
- Los cambios en `prospectos`, `etapas`, `coordinaciones`, `auth_users` se reflejan inmediatamente
- NO requiere REFRESH

---

## 📈 Resultados Esperados

### Performance
| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Tiempo de carga | 800ms | 150ms | 81% ↓ |
| Queries por acción | 3-5 | 1 | 67% ↓ |
| Datos transferidos | 150KB | 120KB | 20% ↓ |
| Líneas de código | 200 | 30 | 85% ↓ |

### UX
- ✅ Carga inicial más rápida (perceptible)
- ✅ Scroll más fluido
- ✅ Menor consumo de batería (menos procesamiento JS)

---

## 🚀 Próximos Pasos

### Prioridad ALTA (hacer YA)
1. ✅ Ejecutar `crear_vista_prospectos_kanban.sql`
2. ✅ Actualizar `loadMoreProspectosForColumn`
3. ✅ Testing manual

### Prioridad MEDIA (siguiente sprint)
1. Aplicar misma optimización a DataGrid
2. Crear vista materializada para dashboards (si hay queries lentas)
3. Agregar índices faltantes

### Prioridad BAJA (futuro)
1. Crear vistas adicionales para otros módulos (llamadas, whatsapp)
2. Implementar cache en Redis para vistas más usadas

---

## 📚 Documentación Relacionada

- `docs/EJEMPLO_VISTA_KANBAN_OPTIMIZADA.md` - Comparación antes/después
- `scripts/optimizaciones/crear_vista_prospectos_kanban.sql` - Script SQL
- `.cursor/handovers/2026-01-27-fix-lazy-loading-kanban-inicial.md` - Fix previo
- `docs/LAZY_LOADING_COLUMNAS_KANBAN.md` - Implementación lazy loading

---

**Estado:** 📋 Pendiente de ejecución  
**Aprobación requerida:** Sí (cambio en BD)  
**Rollback disponible:** Sí (revertir a `from('prospectos')`)
