# Reformateo de Nombres de Ejecutivos en Toda la Plataforma

**Fecha:** 2026-02-19
**Versión:** Pre-deploy (cambios listos, build exitoso)

## Resumen

Reformateo completo de cómo se muestran los nombres de ejecutivos en toda la plataforma. Incluye corrección de datos en BD (63 usuarios), nueva utilidad centralizada, y aplicación en ~30 archivos (servicios, componentes UI, plantillas WhatsApp).

**Antes:** "Partida Bernal Osmara" (apellidos primero, confuso)
**Después:** "Osmara Partida B." (nombre(s), apellido principal, inicial segundo apellido)

---

## Parte 1: Corrección de Datos en BD

### Problema raíz

Los campos `first_name`/`last_name` en `auth.users.raw_user_meta_data` estaban **invertidos** para ~60% de usuarios activos. El `full_name` estaba en formato "Apellido1 Apellido2 Nombre(s)" (ej: "Partida Bernal Osmara"). Sin corregir esto, un formateador frontend no puede distinguir nombres de apellidos.

### Solución

UPDATE masivo via MCP `execute_sql` directo a `auth.users.raw_user_meta_data` usando CTE con mapeo de correcciones. Se usó el email como clave para determinar la separación correcta nombre/apellido.

**63 usuarios corregidos** — Ejemplo:

| Email | Antes (full_name) | Después (full_name) | first_name | last_name |
|-------|-------------------|---------------------|------------|-----------|
| osmarapartida@ | Partida Bernal Osmara | Osmara Partida Bernal | Osmara | Partida Bernal |
| diegobarba@ | Barba Salas Diego | Diego Barba Salas | Diego | Barba Salas |
| paolamaldonado@ | Maldonado Rodriguez Barbara Paola | Barbara Paola Maldonado Rodriguez | Barbara Paola | Maldonado Rodriguez |
| josevargasc@ | Jose Manue Vargas Campuzano | Jose Manuel Vargas Campuzano | Jose Manuel | Vargas Campuzano |

**15 usuarios ya correctos** (no se tocaron): rodrigomora@, samuelrosales@, angelicaguzman@, elizabethhernandez@, etc.

### Formato normalizado

- `full_name` = `"${first_name} ${last_name}"` (siempre "Nombre(s) Apellido(s)")
- `first_name` = Solo nombre(s) de pila
- `last_name` = Solo apellido(s)
- Un typo corregido: "Jose Manue" → "Jose Manuel" (josevargasc@)

### SQL ejecutado

```sql
WITH corrections(email, new_first, new_last) AS (VALUES
  ('diegobarba@grupovidanta.com', 'Diego', 'Barba Salas'),
  ('osmarapartida@grupovidanta.com', 'Osmara', 'Partida Bernal'),
  -- ... 61 rows más
)
UPDATE auth.users u
SET raw_user_meta_data = raw_user_meta_data
  || jsonb_build_object(
    'first_name', c.new_first,
    'last_name', c.new_last,
    'full_name', c.new_first || ' ' || c.new_last
  )
FROM corrections c
WHERE u.email = c.email;
-- 63 rows updated
```

### Impacto en BD

- **Vista `user_profiles_v2`**: Lee `full_name`, `first_name`, `last_name` de `raw_user_meta_data` → ahora muestra formato correcto automáticamente
- **Vista `prospectos_con_ejecutivo_y_coordinacion`**: JOIN a `user_profiles_v2` → `e.full_name AS ejecutivo_nombre` → dato correcto en origen
- **UserCreateModal / UserEditPanel**: Ya construyen `fullName = ${first_name} ${last_name}` → usuarios futuros se crearán correctamente

---

## Parte 2: Utilidad Centralizada

### Archivo: `src/utils/nameFormatter.ts` (NUEVO)

```typescript
export function formatExecutiveDisplayName(
  fullName: string | null | undefined,
  firstName?: string | null,
  lastName?: string | null
): string
```

**Lógica:**
1. Si tiene `firstName` + `lastName` separados → usar esos (más confiable)
2. Si solo tiene `fullName` → asumir últimas 2 palabras = apellidos, resto = nombres
3. Si 2+ apellidos → mostrar "Nombre(s) Apellido1 Inicial2."
4. Si 1 apellido → mostrar "Nombre(s) Apellido"
5. Si ≤2 palabras → retornar tal cual
6. Si null/undefined → retornar `''`

**Ejemplos:**
| Input | Output |
|-------|--------|
| "Darig Samuel Rosales Robledo" | "Darig Samuel Rosales R." |
| "Osmara Partida Bernal" | "Osmara Partida B." |
| "Rodrigo Mora" | "Rodrigo Mora" |
| "Elena Lemus" | "Elena Lemus" |
| null | "" |

---

## Parte 3: Aplicación en Codebase (~30 archivos)

### Categoría A — Origen de datos (15 archivos)

Archivos donde se **asigna** `ejecutivo_nombre` desde `full_name`. Al formatear aquí, el dato ya viaja formateado a cualquier componente que lo consuma.

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `src/services/prospectsService.ts` | `ejecutivoNombre = formatExecutiveDisplayName(ejecutivoInfo.full_name \|\| ...)` |
| 2 | `src/services/assignmentService.ts` | `ejecutivoNombre = formatExecutiveDisplayName(ejecutivo.full_name \|\| ...)` |
| 3 | `src/services/backupService.ts` | `ejecutivo_nombre: formatExecutiveDisplayName(ejecutivoData.full_name)` |
| 4 | `src/services/liveMonitorService.ts` | `ejecutivo_nombre: formatExecutiveDisplayName(ejecutivoInfo?.full_name)` |
| 5 | `src/services/scheduledCallsService.ts` | `ejecutivosData.map(e => [e.id, formatExecutiveDisplayName(e.full_name)])` |
| 6 | `src/services/dynamicsReasignacionService.ts` | 2 puntos: `reasignado_por_nombre` y `nuevo_ejecutivo_nombre` |
| 7 | `src/stores/liveActivityStore.ts` | `ejecutivosMap.set(e.id, formatExecutiveDisplayName(e.full_name))` |
| 8 | `src/components/chat/LiveChatCanvas.tsx` | 2 puntos: `agentName` y `ejecutivo_nombre` en asignación |
| 9 | `src/components/dashboard/widgets/ConversacionesWidget.tsx` | 4 puntos de `ejecutivo_nombre` en distintos flujos |
| 10 | `src/components/dashboard/widgets/ProspectosNuevosWidget.tsx` | Resolución de ejecutivo en widget |
| 11 | `src/components/chat/QuickImportModal.tsx` | `ejecutivo_nombre` en importación rápida |
| 12 | `src/components/chat/ImportWizardModal.tsx` | `ejecutivo_nombre` en wizard de importación |
| 13 | `src/components/admin/DynamicsCRMManager.tsx` | 2 puntos: búsqueda por email y asignación CRM |
| 14 | `src/components/prospectos/ProspectosManager.tsx` | 2 puntos: asignación manual y resolución de ejecutivo |
| 15 | `src/components/scheduled-calls/ProspectoSidebar.tsx` | Nombre del ejecutivo en sidebar de llamadas |

### Categoría B — Display UI directo (8 archivos)

Archivos que muestran `full_name` directamente en JSX. Se wrapeó solo en puntos de **display**, NO en búsquedas/filtros/sort.

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `src/components/shared/ProspectoEtapaAsignacion.tsx` | Eliminada función local `formatEjecutivoNombre`, reemplazada por import centralizado |
| 2 | `src/components/admin/EjecutivosManager.tsx` | Card header + stats modal title |
| 3 | `src/components/admin/CoordinacionesManager.tsx` | Ejecutivos modal list + 2 listas de reasignación |
| 4 | `src/components/chat/AgentAssignmentModal.tsx` | Callback `onAssign` + lista de agentes |
| 5 | `src/components/prospectos/ProspectosManager.tsx` | Dropdown search text + dropdown items + lógica inline reemplazada |
| 6 | `src/components/prospectos/BulkReassignmentTab.tsx` | 5 `<option>` elements en selects |
| 7 | `src/components/analysis/LiveMonitorKanban.tsx` | Vista admin + vista coordinador (title + text) |
| 8 | `src/components/shared/AssignmentContextMenu.tsx` | "Actualmente asignado a" + lista ejecutivos + user info |

**Intencionalmente NO modificados:**
- `ProspectosKanban.tsx` — Delega a `AssignmentBadge`, no renderiza `full_name` directamente
- `CallCard.tsx`, `MinimizedCallTab.tsx`, `ExpandedCallPanel.tsx` — Usan `call.ejecutivo_nombre` (ya formateado en origen)
- `BackupBadgeWrapper.tsx` — Pasa `ejecutivo_nombre` de backupService (ya formateado)
- `LiveMonitorDataGrid.tsx` — No tiene display de `full_name`

**Regla aplicada:** NO se formateó en:
- Comparaciones de búsqueda/filtro (`.toLowerCase().includes()`)
- Sort (`.localeCompare()`)
- Console/logging
- Toast messages
- Callbacks de datos (solo display)

### Categoría C — Plantillas WhatsApp (3 archivos)

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `src/services/whatsappTemplatesService.ts` | `case 'ejecutivo_nombre'`: ahora aplica `formatExecutiveDisplayName(ejecutivoNombre)` antes de retornar |
| 2 | `src/components/campaigns/plantillas/WhatsAppTemplatesManager.tsx` | Preview: `formatExecutiveDisplayName(user?.full_name)` |
| 3 | `src/components/admin/WhatsAppTemplatesManager.tsx` | Preview: `formatExecutiveDisplayName(user?.full_name)` |

**Impacto en plantillas enviadas:**
- Antes: "Hola, soy su ejecutivo Partida Bernal Osmara"
- Después: "Hola, soy su ejecutivo Osmara Partida B."

---

## Parte 4: Incidentes y resoluciones

### Conflicto de import duplicado

**Problema:** Los agentes A y B modificaron `ProspectosManager.tsx` en paralelo. Ambos agregaron `import { formatExecutiveDisplayName }`, resultando en:
```
Identifier 'formatExecutiveDisplayName' has already been declared
```

**Resolución:** El agente A detectó el error durante `vite build`, identificó la línea duplicada (57 vs 51), y eliminó el duplicado. Build subsecuente pasó limpio.

### Archivos con lógica inline reemplazada

**`ProspectosManager.tsx` (~líneas 2975-2990):** Tenía lógica inline que extraía primer nombre/primer apellido con `split(' ')`. Se reemplazó completamente por `formatExecutiveDisplayName()` para consistencia.

**`ProspectoEtapaAsignacion.tsx` (~líneas 52-61):** Tenía función local `formatEjecutivoNombre` con lógica similar pero diferente (solo primer nombre + primer apellido). Se eliminó y se importó la utilidad centralizada.

---

## Verificación

- **TypeScript compilation:** `tsc --noEmit` → 0 errores
- **Vite production build:** `npx vite build` → exitoso en ~20s
- **63 usuarios verificados en BD:** SELECT confirmó `full_name`, `first_name`, `last_name` correctos

---

## Consideraciones futuras

### Nuevos usuarios
- `UserCreateModal.tsx` y `UserEditPanel.tsx` ya construyen `full_name = ${first_name} ${last_name}` → formato correcto automático
- La función `formatExecutiveDisplayName` funciona con cualquier formato de entrada

### Si se agregan más puntos de display
- Importar `formatExecutiveDisplayName` de `src/utils/nameFormatter.ts`
- Aplicar SOLO en puntos de display (JSX, UI), NO en búsquedas/filtros/sort
- Si se tiene `firstName`/`lastName` separados, pasarlos como segundo/tercer argumento para mayor precisión

### Búsqueda por nombre
- Los filtros de búsqueda siguen usando `full_name` sin formatear → buscar "Osmara" o "Partida" seguirá funcionando
- Esto es intencional: el formateo es solo para display

### Vista en BD
- `prospectos_con_ejecutivo_y_coordinacion` retorna `e.full_name AS ejecutivo_nombre` → ahora es "Osmara Partida Bernal"
- El formateador frontend lo convierte a "Osmara Partida B." para display

---

## Archivos creados/modificados

### Nuevo (1)
- `src/utils/nameFormatter.ts`

### Modificados (26)
**Servicios (6):** prospectsService, assignmentService, backupService, liveMonitorService, scheduledCallsService, dynamicsReasignacionService
**Stores (1):** liveActivityStore
**Componentes (16):** LiveChatCanvas, ConversacionesWidget, ProspectosNuevosWidget, QuickImportModal, ImportWizardModal, DynamicsCRMManager, ProspectosManager, ProspectoSidebar, ProspectoEtapaAsignacion, EjecutivosManager, CoordinacionesManager, AgentAssignmentModal, BulkReassignmentTab, LiveMonitorKanban, AssignmentContextMenu, WhatsAppTemplatesManager (campaigns)
**Servicios plantillas (1):** whatsappTemplatesService
**Admin (1):** WhatsAppTemplatesManager (admin)
**Handover (1):** este archivo

### BD (migración directa)
- `auth.users.raw_user_meta_data` — 63 registros actualizados
