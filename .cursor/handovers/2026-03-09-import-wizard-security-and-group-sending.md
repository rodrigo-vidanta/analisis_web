# Handover: ImportWizardModal — Fix validación coordinación + envío por grupo

**Fecha:** 2026-03-09
**Estado:** Cambios aplicados, pendiente deploy

---

## Resumen

3 cambios en ImportWizardModal y 1 en QuickImportModal:

1. **Fix crítico de seguridad**: Validación de coordinación estaba bypaseada para TODOS los usuarios logueados
2. **Refactor envío de plantilla**: Step de template cambiado de selección individual a selección por grupo (backend elige plantilla)
3. **Límite de URLs**: Aumentado de 5 a 10

---

## Bug 1: Bypass de validación de coordinación (SEGURIDAD)

### Root Cause

La función `validateDynamicsLeadPermissions()` tenía este bypass en línea 507:

```typescript
// ANTES (ROTO):
if (isAdmin || isAdminOperativo || user?.is_coordinador_calidad || user?.is_operativo)
```

**Problema:** `is_operativo` es el indicador de "usuario en línea" (se pone `true` al hacer login, `false` al logout/inactividad). NO es un rol. Todo usuario logueado tiene `is_operativo = true`, lo que significaba que **todos los usuarios bypaseaban la validación de coordinación**.

**Impacto:** 47 usuarios activos podían importar prospectos de cualquier coordinación sin restricción.

`is_coordinador_calidad` viene de `user_metadata`, no de `useEffectivePermissions()` — era `null` para la mayoría, pero igualmente incorrecto tenerlo aquí.

### Fix

```typescript
// DESPUÉS (CORRECTO):
if (isAdmin || isAdminOperativo)
```

Solo admin y admin operativo pueden importar cross-coordinación. Supervisores, coordinadores y ejecutivos solo pueden importar prospectos de **su misma coordinación**, validado con `normalizeCoordinacion()`.

### Archivos

| Archivo | Cambio |
|---------|--------|
| `src/components/chat/ImportWizardModal.tsx` | Línea 459: bypass reducido a `isAdmin \|\| isAdminOperativo` |
| `src/components/chat/QuickImportModal.tsx` | Línea 92: mismo fix (nota: QuickImportModal es dead code, no se importa en ningún lado) |

---

## Cambio 2: Envío de plantilla por grupo (backend elige)

### Antes
- Step 3: Selección individual de plantilla WhatsApp con filtros por tags
- Step 4: Configuración manual de variables (fecha, hora, nombre, etc.)
- El frontend resolvía variables y enviaba la plantilla específica

### Después
- Step 3: Selección de **grupo** de plantillas (misma UX que `ReactivateConversationModal`)
- Step 4: **Eliminado** (ya no existe)
- El backend (`sendTemplateByGroup()`) selecciona automáticamente la mejor plantilla del grupo
- Sin resolución de variables en frontend

### Función de envío

```typescript
const handleSendTemplate = async () => {
  for (const prospect of importedProspects) {
    const result: GroupSendResponse = await whatsappTemplatesService.sendTemplateByGroup(
      selectedGroup.group_id,
      prospect.id,
      'MANUAL',
      user.id
    );
  }
};
```

Payload que envía `sendTemplateByGroup()`:
```json
{ "group_id": "uuid", "prospecto_id": "uuid", "triggered_by": "MANUAL", "triggered_by_user": "uuid" }
```

### Estado eliminado
- `templates`, `filteredTemplates`, `filteredSpecialTemplates` → ya no se cargan plantillas individuales
- `selectedTemplate` → reemplazado por `selectedGroup: TemplateGroupHealth | null`
- `selectedTags`, `variableValues` → eliminados
- `getFilteredGroupTemplates()` → eliminada (referenciaba `selectedTags`)

### Estado conservado
- `templateGroups`, `groupTemplatesMap` → se usan para mostrar grupos y preview de templates
- `searchTerm` → filtra grupos por nombre

### WizardStep type
```typescript
// ANTES:
type WizardStep = 'search' | 'permissions' | 'select_template' | 'configure_variables';

// DESPUÉS:
type WizardStep = 'search' | 'permissions' | 'select_template';
```

### Navegación
- `canGoNext` en step `select_template`: requiere `!!selectedGroup`
- `handleNext` en step `select_template`: llama `handleSendTemplate()`
- El wizard ahora tiene 3 pasos (antes 4)

---

## Cambio 3: Límite de URLs aumentado a 10

| Ubicación | Antes | Después |
|-----------|-------|---------|
| `parseSearchInput()` línea 174 | `lines.length > 5` | `lines.length > 10` |
| Error message | `'Máximo 5 entradas permitidas'` | `'Máximo 10 entradas permitidas'` |
| Placeholder textarea | `'Pega 1 a 5 URLs...'` | `'Pega 1 a 10 URLs...'` |
| Comentarios header | `1-5` | `1-10` |

---

## Flujo actual del wizard (post-cambios)

```
Paso 1: Pegar hasta 10 URLs de CRM → Buscar leads en Dynamics (paralelo, ~3s c/u)
  ↳ Validación de coordinación por cada lead
  ↳ Leads de otra coordinación: canImport=false, no seleccionables
  ↳ Leads válidos: seleccionados automáticamente

Paso 2: Revisión → Solo muestra leads con canImport=true → Importar (N8N webhook)
  ↳ Si 5 de 10 son de otra coordinación: solo importa los 5 válidos
  ↳ Botón: "Importar (5/5)"

Paso 3: Seleccionar grupo → Backend elige mejor plantilla → Enviar a todos los importados
  ↳ sendTemplateByGroup() por cada prospecto importado
  ↳ Sin resolución de variables en frontend
```

---

## Archivos modificados

| Archivo | Cambios |
|---------|---------|
| `src/components/chat/ImportWizardModal.tsx` | Bypass validación, grupo-based sending, límite 10, UI steps 3-4 reescritos |
| `src/components/chat/QuickImportModal.tsx` | Solo bypass validación (dead code) |

## Archivos NO modificados (contexto)

| Archivo | Razón |
|---------|-------|
| `src/services/whatsappTemplatesService.ts` | `sendTemplateByGroup()` ya existía, sin cambios |
| `src/components/chat/ReactivateConversationModal.tsx` | Referencia de implementación grupo-based, no tocado |
| `src/components/prospectos/ManualImportTab.tsx` | Wrapper de ImportWizardModal, hereda cambios |

---

## Validación de coordinación: cómo funciona

1. `searchSingleEntry()` llama `validateDynamicsLeadPermissions(lead)` por cada URL
2. La función compara `normalizeCoordinacion(userCoordName)` vs `normalizeCoordinacion(lead.Coordinacion)`
3. `normalizeCoordinacion` mapea variantes: APEX/I360 → `'i360'`, COB ACA → `'COBACA'`, etc.
4. Si no coinciden → `canImport: false` con razón descriptiva
5. `selectedEntries` filtra solo los que tienen `canImport: true`
6. El usuario puede avanzar si hay al menos 1 prospecto importable

### Caso especial: coordinacionesMap vacío
Si la carga de coordinaciones falla por error de red (`coordinacionesMap.size === 0`), se permite la importación como fallback para no bloquear al usuario. Esto es intencional (ver handover 2026-02-14).
