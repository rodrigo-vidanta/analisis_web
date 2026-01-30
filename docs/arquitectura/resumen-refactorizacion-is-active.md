# ✅ Refactorización Completa: Eliminación de `is_active`

**Fecha:** 2026-01-30  
**Estado:** ✅ Código Actualizado | ⏳ Pendiente SQL en BD

---

## 📊 Resumen de Cambios

### 🗑️ Campo Eliminado
- **`is_active`** - Campo legacy confuso y redundante

### ✅ Campos Activos (Únicos)
- **`archivado`** - Borrado lógico (true = archivada, false = existe)
- **`is_operativo`** - Estado operativo (true = recibe trabajo, false = pausada)

---

## 📝 Archivos Modificados

### 1. Base de Datos
- ✅ **Datos sincronizados** vía MCP (coordinaciones con `is_active=false` marcadas como `archivado=true`)
- ⏳ **Pendiente:** Ejecutar SQL para eliminar columna y crear función RPC

### 2. Backend (TypeScript)

#### `src/services/coordinacionService.ts`
- ✅ Interface `Coordinacion` limpia (sin `is_active`)
- ✅ `getCoordinaciones()` simplificado (sin fallbacks)
- ✅ `getCoordinacionesParaAsignacion()` con filtros directos
- ✅ `createCoordinacion()` sin mapeos a `is_active`
- ✅ `updateCoordinacion()` limpio
- ✅ `getCoordinacionesByIds()` sin normalizaciones legacy

#### `src/components/admin/CoordinacionesManager.tsx`
- ✅ `loadCoordinaciones()` sin normalización de campos
- ✅ Filtros simplificados (solo `archivado`)
- ✅ Botón Power/PowerOff actualiza solo `is_operativo`
- ✅ Lógica de archivar/desarchivar limpia
- ✅ Modal de creación/edición simplificado

---

## 🎯 Lógica Actualizada

### Estados Posibles

| `archivado` | `is_operativo` | Visible | Recibe Asignaciones | Descripción |
|-------------|----------------|---------|---------------------|-------------|
| `false` | `true` | ✅ Sí | ✅ Sí | **Operativa** |
| `false` | `false` | ✅ Sí | ❌ No | **Pausada** |
| `true` | `true/false` | ❌ No | ❌ No | **Archivada** |

### Código Simplificado

```typescript
// ✅ Coordinación disponible para asignaciones
if (!coord.archivado && coord.is_operativo) {
  // Asignar prospectos
}

// ✅ Coordinación visible (no archivada)
if (!coord.archivado) {
  // Mostrar en lista
}

// ❌ ELIMINADO - Ya no existe
// if (coord.is_active) { ... }
```

---

## 🚀 Siguiente Paso (CRÍTICO)

### Ejecutar SQL en Supabase Dashboard

1. **Abrir:** https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new
2. **Copiar contenido de:** `supabase/migrations/EJECUTAR_ELIMINAR_IS_ACTIVE.sql`
3. **Ejecutar** el script completo
4. **Verificar** que aparezca la tabla de métricas al final

### El SQL hace:
1. ✅ Elimina columna `is_active`
2. ✅ Crea índices para performance
3. ✅ Agrega comentarios descriptivos
4. ✅ Crea función RPC `update_coordinacion_safe`
5. ✅ Configura permisos
6. ✅ Muestra métricas de verificación

---

## 🎉 Beneficios

| Antes | Después |
|-------|---------|
| 3 campos confusos | 2 campos claros |
| Lógica con fallbacks complejos | Lógica directa |
| Mapeos `is_active ↔ archivado` | Sin mapeos |
| ~150 líneas de código legacy | ~50 líneas limpias |
| Sincronización manual | Sin sincronización |

---

## ✅ Checklist Post-Deploy

Después de ejecutar el SQL:

- [ ] Recargar la aplicación
- [ ] Ir a Administración > Coordinaciones
- [ ] Verificar que coordinaciones archivadas NO aparezcan por defecto
- [ ] Probar botón Power/PowerOff (debe actualizar solo `is_operativo`)
- [ ] Probar archivar una coordinación
- [ ] Probar desarchivar una coordinación
- [ ] Verificar en BD que solo existen columnas `archivado` e `is_operativo`

```sql
-- Verificar estructura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'coordinaciones' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Debe mostrar: archivado, is_operativo (NO is_active)
```

---

## 📚 Documentación Actualizada

- ✅ `docs/arquitectura/analisis-is-active-vs-is-operativo.md` - Análisis completo
- ✅ `supabase/migrations/EJECUTAR_ELIMINAR_IS_ACTIVE.sql` - SQL limpio
- ✅ Código TypeScript comentado y limpio

---

**Conclusión:** Deuda técnica eliminada. Sistema más simple y mantenible. 🎯
