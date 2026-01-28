# ✅ FIX: Filtros de Etapa en WhatsApp Conversaciones

**Fecha:** 28 de Enero 2026  
**Módulo:** WhatsApp - LiveChatCanvas  
**Issue:** Filtros de etapa no coinciden con nuevas etapas de BD

---

## 🔍 Problema Identificado

El módulo de conversaciones de WhatsApp usaba un array hardcodeado de etapas legacy (`PROSPECTO_ETAPAS` en `whatsappTemplates.ts`) que no coincidía con las etapas actuales de la base de datos después de la migración de etapas string → UUID FK (2026-01-27).

### Etapas Legacy (Hardcodeadas)
```typescript
// whatsappTemplates.ts - OBSOLETO
'Es miembro'
'Activo PQNC'
'Validando membresia'
'Primer contacto'
'En seguimiento'  // ❌ YA NO EXISTE
'Interesado'
'Atendió llamada'
'Con ejecutivo'
'Certificado adquirido'  // ❌ YA NO EXISTE
```

### Etapas Actuales (BD)
```sql
-- Tabla: etapas (10 etapas activas)
importado_manual
primer_contacto
validando_membresia
discovery  -- ✅ NUEVA (reemplazó "En seguimiento")
interesado
atendio_llamada
con_ejecutivo
activo_pqnc
es_miembro
no_interesado  -- ✅ NUEVA
```

---

## 🔧 Cambios Implementados

### 1. Integración con `etapasService`

Se importó el servicio centralizado de etapas que carga las etapas dinámicas desde la BD:

```typescript
import { etapasService } from '../../services/etapasService';
```

### 2. Estado para Etapas Dinámicas

Se agregó estado para almacenar las etapas cargadas desde la BD:

```typescript
const [etapasDinamicas, setEtapasDinamicas] = useState<Array<{
  id: string;
  nombre: string;
  color_ui: string;
  icono: string;
  orden_funnel: number;
}>>([]);
const [etapasLoading, setEtapasLoading] = useState(true);
```

### 3. Carga de Etapas al Montar

Se agregó un `useEffect` para cargar las etapas dinámicas:

```typescript
useEffect(() => {
  const cargarEtapas = async () => {
    try {
      if (!etapasService.isLoaded()) {
        await etapasService.loadEtapas();
      }
      const opciones = etapasService.getOptions();
      setEtapasDinamicas(opciones.map(opt => ({
        id: opt.value,
        nombre: opt.label,
        color_ui: opt.color,
        icono: opt.icono,
        orden_funnel: opt.orden
      })));
    } catch (error) {
      console.error('❌ Error cargando etapas dinámicas:', error);
    } finally {
      setEtapasLoading(false);
    }
  };
  
  cargarEtapas();
}, []);
```

### 4. Actualización de Lógica de Filtrado

Se actualizó el filtrado para usar `etapa_id` (UUID) en lugar de `etapa` (string legacy):

```typescript
// ANTES (filtraba por nombre string)
const etapa = prospectoData?.etapa || conv.metadata?.etapa || conv.etapa || null;
return etapa && selectedEtapas.has(etapa);

// DESPUÉS (filtra por UUID con fallback a legacy)
const etapaId = prospectoData?.etapa_id || null;

if (etapaId && selectedEtapas.has(etapaId)) {
  return true;
}

// FALLBACK: Compatibilidad con nombres legacy
const etapaLegacy = prospectoData?.etapa || conv.metadata?.etapa || conv.etapa || null;
if (etapaLegacy) {
  const etapaByNombre = etapasService.getByNombreLegacy(etapaLegacy);
  return etapaByNombre && selectedEtapas.has(etapaByNombre.id);
}

return false;
```

### 5. Actualización del Dropdown UI

Se actualizó el dropdown de filtros para usar las etapas dinámicas:

```typescript
{etapasLoading ? (
  <div className="flex items-center justify-center py-4">
    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
    <span className="ml-2 text-xs text-slate-500">Cargando etapas...</span>
  </div>
) : etapasDinamicas.length === 0 ? (
  <div className="px-2 py-4 text-center text-xs text-slate-500">
    No hay etapas disponibles
  </div>
) : (
  <>
    {etapasDinamicas.map((etapa) => {
      // Renderizar checkboxes con etapa.id (UUID)
    })}
  </>
)}
```

### 6. Eliminación de Dependencias Legacy

Se eliminó el import innecesario:

```typescript
// ❌ REMOVIDO
import { PROSPECTO_ETAPAS } from '../../types/whatsappTemplates';
```

---

## 🎯 Beneficios

### ✅ Sincronización Automática
- Los filtros ahora siempre muestran las etapas actuales de la BD
- No se requiere modificar código frontend al cambiar etapas

### ✅ Compatibilidad con Migración
- Usa `etapa_id` (UUID FK) como método principal
- Fallback a nombres legacy para datos antiguos

### ✅ Consistencia
- Mismas etapas en todos los módulos (Kanban, Dashboard, WhatsApp)
- Una sola fuente de verdad (`etapasService`)

### ✅ Rendimiento
- Etapas cargadas una vez en memoria (cache)
- No se repiten queries a BD por cada componente

---

## 📋 Verificación

Para verificar que los filtros funcionan correctamente:

1. **Abrir módulo WhatsApp:**
   - Ir a Live Chat Canvas
   - Hacer clic en el filtro "Todas las etapas"

2. **Verificar etapas mostradas:**
   - Debe mostrar las 10 etapas actuales de BD
   - NO debe mostrar "En seguimiento" ni "Certificado adquirido"
   - Debe incluir "Discovery" y "No interesado"

3. **Probar filtrado:**
   - Seleccionar una o más etapas
   - Verificar que solo se muestren conversaciones con esas etapas
   - El conteo de conversaciones debe actualizar correctamente

4. **Verificar persistencia:**
   - Los filtros seleccionados se guardan en localStorage
   - Al recargar la página, los filtros deben mantenerse

---

## 🔄 Compatibilidad con Código Legacy

El código mantiene compatibilidad con datos legacy que aún tengan solo `etapa` (string):

```typescript
// Orden de búsqueda:
1. Primero: etapa_id (UUID) - Método preferido
2. Fallback: etapa (string) → convertir a UUID usando etapasService.getByNombreLegacy()
3. Si no se encuentra: filtrar fuera de resultados
```

Esto garantiza que:
- Conversaciones migradas funcionan con UUID
- Conversaciones legacy siguen funcionando durante la transición
- No hay downtime en producción

---

## 📚 Archivos Modificados

| Archivo | Cambios |
|--------|---------|
| `src/components/chat/LiveChatCanvas.tsx` | Import etapasService, estado dinámico, filtrado por UUID, dropdown actualizado |

---

## 🔗 Referencias

- **Migración de Etapas:** `MIGRACION_ETAPAS_STRING_A_FK.md`
- **Servicio de Etapas:** `src/services/etapasService.ts`
- **Tipos de Etapas:** `src/types/etapas.ts`
- **Reporte de Migración WhatsApp:** `REPORTE_MIGRACION_ETAPAS_WHATSAPP.md`

---

**✅ FIX COMPLETADO**

Los filtros de etapa en el módulo WhatsApp ahora están sincronizados con la base de datos y usan la arquitectura de etapas UUID FK.
