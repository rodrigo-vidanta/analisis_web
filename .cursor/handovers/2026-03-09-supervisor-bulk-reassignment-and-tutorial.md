# Handover: Reasignación Masiva para Supervisores + Tutorial Interactivo

**Fecha:** 2026-03-09
**Estado:** Cambios aplicados, comunicado en borrador, pendiente deploy

---

## Resumen

Se delegó la funcionalidad de reasignación masiva a supervisores con restricciones específicas, y se creó un comunicado interactivo (tutorial animado de 6 pasos) dirigido exclusivamente a supervisores.

**Archivos modificados (4):**
- `src/components/prospectos/ProspectosManager.tsx` — Acceso al tab para supervisores
- `src/components/prospectos/BulkReassignmentTab.tsx` — Restricciones supervisor completas
- `src/services/coordinacionService.ts` — Fix `role_name` faltante en `getAllEjecutivos()`
- `src/components/comunicados/ComunicadoOverlay.tsx` — Registro del nuevo tutorial

**Archivos nuevos (1):**
- `src/components/comunicados/tutorials/BulkReassignmentSupervisorTutorial.tsx` — Tutorial animado

**Archivos de registro (1):**
- `src/types/comunicados.ts` — Entrada en `INTERACTIVE_COMUNICADOS`

**BD:**
- Comunicado insertado en `comunicados` (ID: `367b9c84-5046-4715-af6b-9eac43aa7043`, estado: borrador)

---

## Cambio 1: Acceso supervisor al tab de Reasignación Masiva

### ProspectosManager.tsx

Se agregó `isSupervisor` a la condición de visibilidad del tab "Reasignación Masiva":

```typescript
// ANTES:
{(isAdmin || isAdminOperativo || isCoordinadorCalidad) && (
  <button ... >Reasignación Masiva</button>
)}

// DESPUÉS:
{(isAdmin || isAdminOperativo || isCoordinadorCalidad || isSupervisor) && (
  <button ... >Reasignación Masiva</button>
)}
```

**Nota:** El tab de "Importación" sigue restringido a admin/adminOperativo/coordinadorCalidad (sin supervisor).

---

## Cambio 2: Restricciones de supervisor en BulkReassignmentTab

### Detección de rol y coordinación

```typescript
const { isSupervisor, isAdmin, isAdminOperativo } = useEffectivePermissions();
const [supervisorCoordinacionIds, setSupervisorCoordinacionIds] = useState<string[]>([]);

// Auto-carga coordinación del supervisor
useEffect(() => {
  if (!isSupervisor || !user?.id) return;
  const coordIds = await permissionsService.getCoordinacionesFilter(user.id);
  setSupervisorCoordinacionIds(coordIds);
  setFilterCoordinacion(coordIds[0]);      // Fija filtro
  setTargetCoordinacionId(coordIds[0]);     // Fija destino
}, [isSupervisor, user?.id]);
```

### Restricciones implementadas

| Restricción | Implementación |
|-------------|----------------|
| Solo prospectos con `id_dynamics` | `isProspectoSelectable()` — retorna `false` si supervisor y no tiene id_dynamics |
| Solo misma coordinación | `visibleCoordinaciones` filtra + dropdowns deshabilitados |
| No coordinadores como destino | Filtro en dropdown: `role_name === 'coordinador'` → hidden |
| No otras coordinaciones | `targetCoordinacionId` fijo, selector deshabilitado |
| Máximo 100 prospectos | Existente, no modificado |

### `isProspectoSelectable` (ANTES de funciones de selección)

```typescript
const isProspectoSelectable = useCallback((prospecto: Prospecto): boolean => {
  if (!isSupervisor) return true;
  return !!prospecto.id_dynamics;
}, [isSupervisor]);
```

**Importante:** `isProspectoSelectable` y `visibleCoordinaciones` están definidos en sección "CÁLCULOS PRE-SELECCIÓN", ANTES de `handleSelectProspecto` y demás funciones de selección. Esto evita el error `Cannot access before initialization` que ocurría cuando estaban después.

### Funciones de selección modificadas

- `handleSelectProspecto` → Verifica `isProspectoSelectable()`, muestra toast si no es seleccionable
- `handleSelectPage` → Filtra con `isProspectoSelectable()` antes de seleccionar
- `handleSelectAllResults` → Filtra prospectos sin `id_dynamics` para supervisores

### Target ejecutivos — Simplificación

Se eliminaron queries adicionales (`getEjecutivosByCoordinacion`, `auth_user_coordinaciones`) que fallaban por RLS. Ahora usa SOLO el estado global `ejecutivos`:

```typescript
useEffect(() => {
  if (targetCoordinacionId && ejecutivos.length > 0) {
    let usersForCoord = ejecutivos.filter(e => e.coordinacion_id === targetCoordinacionId);
    // Agregar supervisor actual si no aparece
    if (isSupervisor && user?.id && !usersForCoord.find(u => u.id === user.id)) {
      const selfUser = ejecutivos.find(e => e.id === user.id);
      if (selfUser) usersForCoord = [...usersForCoord, selfUser];
    }
    const usersWithFlags = usersForCoord.map(u => ({
      ...u,
      is_coordinator: u.role_name === 'coordinador',
      is_supervisor: u.role_name === 'supervisor'
    }));
    setTargetEjecutivos(usersWithFlags);
  }
}, [targetCoordinacionId, ejecutivos, isSupervisor, user?.id]);
```

### UI supervisor

- Badge "Modo Supervisor" azul en el header
- Warning "Solo puedes reasignar dentro de tu coordinación"
- Badge "No registrado en CRM" (amber) en tarjetas de prospectos no seleccionables
- Coordinadores ocultos en dropdown de destino
- Todos los supervisores visibles con "(Yo)" para el actual
- Usuarios inactivos ocultos para supervisores
- Botón "Limpiar" junto a pestañas Resultados/Mi Selección

---

## Cambio 3: Fix `role_name` en coordinacionService

### coordinacionService.ts — `getAllEjecutivos()`

```typescript
// ANTES: role_name se consultaba de BD pero NO se incluía en el return
return {
  id: user.id,
  // ... otros campos ...
  is_active: user.is_active,
  // role_name FALTABA AQUÍ
  email_verified: user.email_verified,
};

// DESPUÉS:
return {
  id: user.id,
  // ... otros campos ...
  is_active: user.is_active,
  role_name: user.role_name,  // AGREGADO
  email_verified: user.email_verified,
};
```

**Impacto:** Sin `role_name`, el filtro `e.role_name === 'ejecutivo'` retornaba `false` para todos, mostrando 0 ejecutivos en el dropdown de destino.

---

## Cambio 4: Tutorial Interactivo (Comunicado)

### Componente: `BulkReassignmentSupervisorTutorial.tsx`

Tutorial animado de 6 pasos siguiendo el patrón de `UtilityTemplateTutorial.tsx`:

| Paso | Título | Contenido |
|------|--------|-----------|
| 1 | Accede a la Reasignación Masiva | Breadcrumb animado + tab mockup + badge "Modo Supervisor" |
| 2 | Busca prospectos con los filtros | Coordinación fija (lock icon) + search bar + filter chips |
| 3 | Selecciona solo prospectos registrados en CRM | Cards de prospectos (seleccionable vs no-seleccionable) + máximo 100 |
| 4 | Elige el destino de reasignación | 4 cards: ejecutivos ✅, supervisores ✅, coordinadores ❌, otras coordinaciones ❌ |
| 5 | Ejecuta y controla el proceso | Progress bar animada + controles pausar/reanudar/cancelar |
| 6 | Recuerda estas limitaciones | 5 reglas con iconos + mensaje final |

**Características:**
- Auto-advance cada 7s (excepto último paso)
- Dots de navegación interactivos
- AnimatedCursor, TypewriterText, AnimatedCounter, ProgressBar
- Clases Tailwind estáticas (no dinámicas con template literals)
- Botón "Entendido" en último paso → `onComplete()`

### Registro

- **ComunicadoOverlay.tsx:** `'bulk-reassignment-supervisor-tutorial': lazy(() => import(...))`
- **comunicados.ts:** Entrada en `INTERACTIVE_COMUNICADOS` array

### BD

```sql
-- ID: 367b9c84-5046-4715-af6b-9eac43aa7043
-- Estado: borrador (no visible hasta activar)
-- Target: roles → ['supervisor']
-- component_key: 'bulk-reassignment-supervisor-tutorial'
```

Para activar después del deploy:
```sql
UPDATE comunicados
SET estado = 'activo', published_at = NOW()
WHERE id = '367b9c84-5046-4715-af6b-9eac43aa7043';
```

---

## Bugs encontrados y corregidos

| Bug | Causa raíz | Fix |
|-----|-----------|-----|
| Crash `Cannot access 'isProspectoSelectable' before initialization` | Hook definido después de su uso | Movido a sección PRE-SELECCIÓN |
| Solo 1 ejecutivo en dropdown destino | `role_name` faltante en `getAllEjecutivos()` return | Agregado `role_name: user.role_name` |
| 0 ejecutivos tras fix anterior | Queries adicionales fallaban por RLS | Simplificado a usar solo estado global `ejecutivos` |
| Solo auto-asignación en supervisores | Dropdown filtraba `e.id === user?.id` | Cambiado a mostrar todos con "(Yo)" para self |

---

## Decisiones de diseño

1. **Global `ejecutivos` vs queries directas**: Se optó por usar el estado global cargado al inicio (que usa `getAllEjecutivos()` con la vista `user_profiles_v2` SECURITY DEFINER) en lugar de queries adicionales que fallaban por RLS.

2. **Clases Tailwind estáticas**: Las clases dinámicas tipo `bg-${color}-500/5` se reemplazaron por clases estáticas escritas completas, porque Tailwind purga las clases que no encuentra literalmente en el código.

3. **Comunicado en borrador**: Se insertó como `borrador` intencionalmente — requiere deploy del componente React antes de activar.

---

## Pendientes

- [ ] Confirmar que el dropdown de destino muestra todos los ejecutivos y supervisores correctamente
- [ ] Deploy a producción (componente tutorial es nuevo, requiere build)
- [ ] Activar comunicado en BD después del deploy
- [ ] Verificar que el tutorial aparece solo a supervisores

---

## Archivos clave para referencia futura

| Archivo | Propósito |
|---------|-----------|
| `src/components/prospectos/BulkReassignmentTab.tsx` | Lógica completa de reasignación con restricciones supervisor |
| `src/hooks/useEffectivePermissions.ts` | Hook para detectar rol (isSupervisor, isAdmin, etc.) |
| `src/services/permissionsService.ts` | `getCoordinacionesFilter()` para obtener coordinaciones del usuario |
| `src/services/coordinacionService.ts` | `getAllEjecutivos()` — fuente de datos para dropdown destino |
| `src/components/comunicados/tutorials/BulkReassignmentSupervisorTutorial.tsx` | Tutorial animado 6 pasos |
