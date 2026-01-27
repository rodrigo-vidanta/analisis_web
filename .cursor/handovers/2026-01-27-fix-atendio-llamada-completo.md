# Handover: Fix Columna "Atendió Llamada" + Migración Etapas

**Fecha:** 27 de Enero 2026  
**Duración:** ~3 horas  
**Estado:** ✅ Código corregido, ⏳ SQL pendiente de ejecutar

---

## 🎯 Problema Original

Usuario reportó:
1. Columna "Atendió llamada" en Kanban muestra **0 prospectos** (pero contador dice 118)
2. **Lazy loading** no funciona al hacer scroll en columnas

---

## 🔍 Causa Raíz (VERIFICADA EN BD)

### Problema 1: Migración de etapas INCOMPLETA

**Diagnóstico verificado en BD:**
- Total prospectos: **2671**
- Con `etapa_id` (UUID) poblado: **1000** (37%)
- Sin `etapa_id`: **1671** (63%)

**Conteos reales por `etapa_id`:**
| Etapa | Conteo |
|-------|--------|
| Validando membresía | 532 |
| Discovery | 246 |
| Interesado | 83 |
| Primer contacto | 75 |
| Con ejecutivo | 24 |
| Activo PQNC | 17 |
| **Atendió llamada** | **17** (NO 118) |
| Es miembro | 6 |

**El handover anterior mencionaba 118** porque contaba el campo legacy `etapa` (string), pero:
- El Kanban filtra por `etapa_id` (UUID)
- Solo 17 prospectos tienen `etapa_id` = "atendio_llamada"

### Problema 2: Bug en código (línea 1846)

En `loadMoreProspectosForColumn`, se usaba `enrichedProspectos.length` pero esa variable NO existe en ese scope (existe en `loadProspectos`).

### Problema 3: Lógica de carga inicial bloqueada

En `ProspectosKanban.tsx`, la carga inicial para `page === -1` estaba después del check de `columnElement`, que es `null` en la primera renderización, bloqueando la carga inicial.

---

## ✅ Soluciones Aplicadas

### 1. SQL - Migración de etapas (EJECUTAR EN SUPABASE)

**Archivo:** `EJECUTAR_AHORA.sql`

Migra todos los prospectos del campo legacy `etapa` (string) al nuevo `etapa_id` (UUID):

| Campo legacy | UUID destino |
|--------------|--------------|
| "Primer contacto" | `9832d031-f7ef-4596-a66e-f922daaa9772` |
| "Validando membresia/membresía" | `3a8eff65-9bc2-4ac7-913d-2dd611ff8622` |
| "En seguimiento" / "Discovery" | `328b8817-567b-480e-a3b1-5ecd198433dc` |
| "Interesado" | `5327dcda-399a-460e-be96-0eb87e1d4d6b` |
| "Atendió llamada" | `003ec594-6e7d-4bea-9cf4-09870626b182` |
| "Con ejecutivo" | `9613d6a4-ef49-4bff-94fd-b995f8498ffb` |
| "Activo PQNC" | `3fd67703-d3b3-41f3-89f8-0b46c0eb33be` |
| "Es miembro" | `e3b7dbea-7eb7-4a28-9f9a-c0df609878d3` |

### 2. Frontend - Bug corregido (línea 1846)

**Archivo:** `src/components/prospectos/ProspectosManager.tsx`

```typescript
// ANTES (bug):
console.log(`✅ Columna ${etapaId} cargada:`, {
  nuevos: enrichedProspectos.length,  // ← Variable inexistente
  ...
});

// DESPUÉS (fix):
console.log(`✅ Columna ${etapaId} cargada:`, {
  nuevos: data.length,  // ← Variable correcta
  ...
});
```

### 3. Frontend - Lógica de carga inicial

**Archivo:** `src/components/prospectos/ProspectosKanban.tsx`

```typescript
// ANTES: La carga inicial estaba DESPUÉS del check de columnElement
if (!columnElement || !etapaId) return;  // ← Bloqueaba la carga
if (columnState?.page === -1 ...) onLoadMoreForColumn(etapaId);

// DESPUÉS: La carga inicial se ejecuta ANTES del check de columnElement
if (!etapaId) return;
if (columnState?.page === -1 ...) onLoadMoreForColumn(etapaId);  // ← Ahora funciona
// Solo después verificamos columnElement para el observer
const columnElement = columnRefs.current[checkpointKey];
if (!columnElement) return;
```

---

## 📁 Archivos Modificados

| Archivo | Cambios | Estado |
|---------|---------|--------|
| `EJECUTAR_AHORA.sql` | Script de migración completo | ⏳ Pendiente ejecutar |
| `migrations/20260127_migrate_etapa_string_to_uuid.sql` | Backup del script | ✅ Creado |
| `src/components/prospectos/ProspectosManager.tsx` | Fix bug línea 1846 | ✅ Aplicado |
| `src/components/prospectos/ProspectosKanban.tsx` | Fix lógica carga inicial | ✅ Aplicado |

---

## ⏳ Pendiente de Ejecutar

### 1. SQL en Supabase Dashboard

```
URL: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new
Archivo: EJECUTAR_AHORA.sql (106 líneas)
Tiempo: 1-2 minutos
```

**Verificaciones después de ejecutar:**
1. `sin_etapa_id` debe ser **0**
2. Conteo por etapa debe mostrar todos los prospectos distribuidos

### 2. Hard Refresh del Navegador

```
1. Cerrar TODAS las pestañas localhost:5173
2. DevTools → Click derecho en refresh → "Empty Cache and Hard Reload"
3. O abrir nueva ventana incógnito
```

---

## 🧪 Testing Checklist

- [ ] SQL ejecutado sin errores
- [ ] Verificación muestra `sin_etapa_id = 0`
- [ ] Hard refresh completado
- [ ] Todas las columnas del Kanban muestran prospectos
- [ ] Lazy loading funciona al hacer scroll
- [ ] Contadores muestran números correctos (ej: "17 de 17" no "0 de 118")

---

## 📊 Impacto Esperado

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| **Prospectos con etapa_id** | 1000 (37%) | 2671 (100%) | +167% |
| **Columnas visibles** | Parcial | Todas | ✅ |
| **Lazy loading** | No funciona | Funciona | ✅ |
| **Bugs de código** | 2 | 0 | ✅ |

---

## 📚 Documentación Relacionada

- `docs/MIGRACION_ETAPAS_STRING_A_FK.md` - Documentación de la migración
- `.cursor/handovers/2026-01-27-fix-kanban-etapa-totals.md` - Fix anterior de contadores
- `src/services/etapasService.ts` - Servicio de cache de etapas

---

## 🎯 Próximos Pasos (Inmediatos)

1. **Usuario ejecuta SQL** en Supabase Dashboard (`EJECUTAR_AHORA.sql`)
2. **Usuario verifica** que `sin_etapa_id = 0` en los resultados
3. **Usuario hace hard refresh** del navegador
4. **Usuario verifica** que todas las columnas muestran prospectos

---

**Resumen:** El problema principal era que la migración de `etapa` (string) a `etapa_id` (UUID) estaba incompleta - solo 37% de prospectos tenían `etapa_id`. Adicionalmente había 2 bugs en el código que impedían la carga inicial y el lazy loading.

**Estado:** ✅ Código listo | ⏳ SQL pendiente | Riesgo: Bajo
