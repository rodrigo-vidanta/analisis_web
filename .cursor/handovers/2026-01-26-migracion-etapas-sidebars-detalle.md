# Handover: Migración de Etapas en Sidebars de Detalle de Prospecto

**Fecha:** 26 de Enero 2026  
**Autor:** AI Assistant  
**Contexto:** Parte de la migración global de `etapa` (string) a `etapa_id` (FK)

---

## 📋 Resumen

Actualización de todos los sidebars de detalle de prospecto para usar el componente `EtapaBadge` dinámico en lugar de etapas hardcodeadas. Estos sidebars muestran información completa del prospecto desde diferentes módulos de la plataforma.

---

## ⚠️ Problema Detectado

Los siguientes sidebars de detalle estaban mostrando las etapas con un badge estático (sin colores ni iconos dinámicos):

1. **ProspectDetailSidebar.tsx** (Módulo WhatsApp)
2. **ProspectoSidebar.tsx** (Módulo Llamadas Programadas)
3. **ProspectoSidebar dentro de ProspectosManager.tsx** (Módulo Prospectos)
4. **ProspectoSidebar dentro de LiveMonitor.tsx** (Módulo Live Monitor)

**Ubicación:** Todos usan el componente centralizado `ProspectoEtapaAsignacion`.

---

## ✅ Solución Implementada

### 1. Componente `ProspectoEtapaAsignacion` (Centralizado)

**Archivo:** `src/components/shared/ProspectoEtapaAsignacion.tsx`

**Cambios:**

1. **Import de `EtapaBadge`:**
   ```typescript
   import { EtapaBadge } from './EtapaBadge';
   ```

2. **Actualización del interface `ProspectoAsignacionData`:**
   ```typescript
   export interface ProspectoAsignacionData {
     etapa?: string | null;
     etapa_id?: string | null; // ✅ AGREGADO para migración FK
     score?: string | null;
     coordinacion_codigo?: string | null;
     coordinacion_nombre?: string | null;
     ejecutivo_nombre?: string | null;
     asesor_asignado?: string | null;
     ejecutivo_email?: string | null;
     requiere_atencion_humana?: boolean;
     motivo_handoff?: string | null;
   }
   ```

3. **Reemplazo de badge estático por `EtapaBadge` (Variant: `inline`):**
   ```typescript
   // ANTES:
   <div className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700...">
     {prospecto.etapa || 'Sin etapa'}
   </div>
   
   // AHORA:
   <EtapaBadge 
     prospecto={{ 
       etapa_id: prospecto.etapa_id, 
       etapa: prospecto.etapa 
     }} 
     size="sm" 
     variant="solid"
   />
   ```

4. **Reemplazo en variant: `card`:**
   ```typescript
   // ANTES:
   <div className="flex-1 min-w-[120px]">
     <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Etapa Actual</p>
     <h3 className="text-lg font-bold text-gray-900 dark:text-white">
       {prospecto.etapa || 'Sin etapa'}
     </h3>
   </div>
   
   // AHORA:
   <div className="flex-1 min-w-[120px]">
     <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Etapa Actual</p>
     <EtapaBadge 
       prospecto={{ 
         etapa_id: prospecto.etapa_id, 
         etapa: prospecto.etapa 
       }} 
       size="md" 
       variant="solid"
       showIcon={!compact}
     />
   </div>
   ```

---

### 2. Actualización de Queries (JOIN con `etapas`)

Para que `EtapaBadge` funcione correctamente, necesita `etapa_id`. Se actualizaron las queries en todos los sidebars:

#### **ProspectDetailSidebar.tsx** (WhatsApp)

**Archivo:** `src/components/chat/ProspectDetailSidebar.tsx`

```typescript
// ANTES:
const { data, error } = await analysisSupabase
  .from('prospectos')
  .select('*')
  .eq('id', prospectoId)
  .single();

// AHORA:
const { data, error } = await analysisSupabase
  .from('prospectos')
  .select(`
    *,
    etapa_info:etapa_id (
      id, codigo, nombre, color_ui, icono
    )
  `)
  .eq('id', prospectoId)
  .single();
```

**Interface `ProspectData` actualizado:**
```typescript
interface ProspectData {
  // ... campos existentes
  etapa?: string;
  etapa_id?: string; // ✅ AGREGADO: FK a tabla etapas
  etapa_info?: { // ✅ AGREGADO: Datos desde JOIN
    id: string;
    codigo: string;
    nombre: string;
    color_ui: string;
    icono: string;
  } | null;
  // ... resto de campos
}
```

---

#### **ProspectoSidebar.tsx** (Llamadas Programadas)

**Archivo:** `src/components/scheduled-calls/ProspectoSidebar.tsx`

Cambios idénticos a `ProspectDetailSidebar.tsx`:
- Query con JOIN
- Interface `ProspectoData` con `etapa_id` y `etapa_info`

---

#### **LiveMonitor.tsx** (Live Monitor)

**Archivo:** `src/components/analysis/LiveMonitor.tsx`

**Query actualizada** (aplicada con `replace_all` a todas las queries de prospectos en el archivo):
```typescript
const { data, error } = await analysisSupabase
  .from('prospectos')
  .select(`
    *,
    etapa_info:etapa_id (
      id, codigo, nombre, color_ui, icono
    )
  `)
  .eq('id', prospectoId)
  .single();
```

---

#### **ProspectosManager.tsx** (Módulo Prospectos)

**Archivo:** `src/components/prospectos/ProspectosManager.tsx`

**Interface `Prospecto` actualizado:**
```typescript
interface Prospecto {
  id: string;
  nombre_completo?: string;
  nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  // ... campos existentes
  etapa?: string;
  etapa_id?: string; // ✅ AGREGADO: FK a tabla etapas
  // ... resto de campos
}
```

**Nota:** Este módulo carga prospectos mediante `.select('*')` en batch, que ya incluye el campo `etapa_id` de la tabla `prospectos`. No requiere JOIN explícito.

---

## 🎯 Widget Dashboard: Prospectos Requieren Atención

**Archivo:** `src/components/dashboard/widgets/ProspectosNuevosWidget.tsx`

**Cambios:**

1. **Import de `EtapaBadge`:**
   ```typescript
   import { EtapaBadge } from '../../shared/EtapaBadge';
   ```

2. **Reemplazo de badge estático (líneas 906-910):**
   ```typescript
   // ANTES:
   {prospecto.etapa && (
     <span className="inline-block px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
       {prospecto.etapa}
     </span>
   )}
   
   // AHORA:
   <EtapaBadge 
     prospecto={{ 
       etapa_id: prospecto.etapa_id, 
       etapa: prospecto.etapa 
     }} 
     size="xs" 
     variant="solid"
     showIcon={false}
   />
   ```

**Nota:** 
- El servicio `prospectsService.searchProspects()` ya incluye el JOIN con `etapa_info`
- El interface `Prospect` ya tiene `etapa_id` definido
- No se requirió cambio en la query de carga

---

## 📊 Archivos Modificados

| Archivo | Cambio | Tipo |
|------|------|-----|
| `src/components/shared/ProspectoEtapaAsignacion.tsx` | Import `EtapaBadge`, interface con `etapa_id`, reemplazo badges | Core |
| `src/components/chat/ProspectDetailSidebar.tsx` | Query con JOIN, interface con `etapa_id` | Query |
| `src/components/scheduled-calls/ProspectoSidebar.tsx` | Query con JOIN, interface con `etapa_id` | Query |
| `src/components/analysis/LiveMonitor.tsx` | Query con JOIN (replace_all) | Query |
| `src/components/prospectos/ProspectosManager.tsx` | Interface `Prospecto` con `etapa_id` | Interface |
| `src/components/dashboard/widgets/ProspectosNuevosWidget.tsx` | Import `EtapaBadge`, reemplazo badge hardcodeado | Widget |

---

## 🧪 Pruebas Realizadas

**Pendientes (requiere testing del usuario):**

1. **Módulo WhatsApp:**
   - Abrir conversación → Click en nombre del prospecto en header
   - Verificar que aparezca `EtapaBadge` con color/icono dinámico

2. **Módulo Prospectos:**
   - Click en un prospecto desde Kanban o DataGrid
   - Verificar sidebar con `EtapaBadge` correcto

3. **Módulo Llamadas Programadas:**
   - Click en una llamada programada → Ver prospecto
   - Verificar `EtapaBadge` en sidebar

4. **Módulo Live Monitor:**
   - Click en una llamada → Ver prospecto
   - Verificar `EtapaBadge` en sidebar

5. **Dashboard (Inicio):**
   - Widget "Últimas Conversaciones" → Click en nombre prospecto
   - Widget "Prospectos Requieren Atención" → Verificar badge de etapa con color/icono
   - Verificar `EtapaBadge` en sidebar (si usa el mismo componente)

---

## 🔗 Relaciones con Otros Cambios

### Dependencias:
1. **Tabla `etapas`:** Con columnas `id`, `codigo`, `nombre`, `color_ui`, `icono`
2. **Componente `EtapaBadge`:** Ya migrado (handover anterior)
3. **Campo `etapa_id` en `prospectos`:** FK a `etapas.id`

### Impacto:
- Los sidebars ahora muestran etapas con colores e iconos dinámicos desde BD
- Fallback a `etapa` string si `etapa_id` es `null` (compatibilidad)

---

## 📝 Notas Técnicas

### Performance:
- El JOIN `etapa_info:etapa_id(...)` es eficiente (1 lookup por FK)
- `ProspectosManager.tsx` NO necesita JOIN porque carga con `.select('*')` que ya incluye `etapa_id`

### Compatibilidad:
- `EtapaBadge` maneja casos donde `etapa_id` es `null` (fallback a `etapa` string)
- No rompe funcionalidad existente durante la transición

---

## ✅ Checklist de Completitud

- [x] `ProspectoEtapaAsignacion.tsx` actualizado con `EtapaBadge`
- [x] Queries actualizadas con JOIN en sidebars
- [x] Interfaces actualizados con `etapa_id` y `etapa_info`
- [x] Compatibilidad con fallback a `etapa` string
- [ ] Testing por parte del usuario (pendiente)

---

## 🔄 Próximos Pasos

1. **Testing del usuario:**
   - Verificar que todos los sidebars muestren badges correctos
   - Confirmar que no hay errores en console

2. **Si todo funciona:**
   - Marcar migración de sidebars como completa
   - Continuar con otros componentes que usen etapas hardcodeadas

---

**Última actualización:** 26 de Enero 2026 - 22:20 UTC
