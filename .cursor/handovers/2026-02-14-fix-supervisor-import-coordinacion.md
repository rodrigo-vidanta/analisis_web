# Fix: Supervisor no puede importar prospectos de su misma coordinación

**Fecha:** 2026-02-14
**Ticket:** KT-20260214-0174
**Reporter:** Cesar Hugo Fausto Balbuena (cesarfausto@vidavacations.com)
**Versión:** B10.1.44N2.16.0 → B10.1.44N2.16.1

## Problema

Un supervisor de la coordinación APEX no podía importar prospectos de su misma coordinación. El sistema le indicaba "pertenece a APEX, que no pertenecía a mi coordinación" cuando él mismo es de APEX.

Logs de consola mostraban 10x: `Error obteniendo grupos del usuario: TypeError: Failed to fetch`

## Root Cause (3 bugs)

### Bug 1: Propiedades fantasma en destructuring
**Archivos:** `ImportWizardModal.tsx:256`, `QuickImportModal.tsx:66`

```typescript
// ANTES (ROTO): isCoordinadorCalidad e isOperativo NO EXISTEN en useEffectivePermissions
const { isAdmin, isCoordinadorCalidad, isOperativo } = useEffectivePermissions();
// Ambos siempre eran undefined → el bypass para estos roles nunca funcionó
```

`useEffectivePermissions()` retorna: `isAdmin, isAdminOperativo, isCoordinador, isSupervisor, isEjecutivo, isEvaluador, isDeveloper, isMarketing`. Las propiedades `isCoordinadorCalidad` e `isOperativo` son de `user_metadata` (en el objeto `user` de AuthContext), NO del hook de permisos efectivos.

### Bug 2: coordinacionesMap vacío por error de red
**Archivo:** `ImportWizardModal.tsx` (useEffect línea ~331)

Los errores `Failed to fetch` causaban que la carga de `coordinacionesMap` fallara silenciosamente (catch vacío). Con el Map vacío:
1. `coordinacionesMap.get(UUID)` → `undefined`
2. Fallback a UUID raw: `f33742b9-46cf-4716-bf7a-ce129a82bad2`
3. `normalizeCoordinacion(UUID)` → UUID en mayúsculas
4. `normalizeCoordinacion('APEX')` → `'i360'`
5. UUID ≠ 'i360' → **DENEGADO**

### Bug 3: Supervisores ignorados en QuickImportModal
**Archivo:** `QuickImportModal.tsx:89`

`canAccessProspect()` verificaba `user?.is_coordinador` (que es `false`/null para supervisores) sin fallback a `role_name === 'supervisor'`. Los supervisores siempre eran denegados.

## Datos del usuario afectado

```
id: 51dc4a3e-5524-40ca-8084-9bc11429e7e1
role_name: supervisor
coordinacion_id: f33742b9-46cf-4716-bf7a-ce129a82bad2 (APEX)
is_coordinador: null (en user_metadata)
is_ejecutivo: false
is_coordinador_calidad: null
is_operativo: false
```

## Fix aplicado

### ImportWizardModal.tsx
1. **Destructuring corregido**: `isAdmin, isAdminOperativo, isSupervisor, isCoordinador, isEjecutivo`
2. **validateDynamicsLeadPermissions reescrito**:
   - Bypass: `isAdmin || isAdminOperativo || user?.is_coordinador_calidad || user?.is_operativo`
   - Role check: `isSupervisor || isCoordinador || isEjecutivo` (usa permisos efectivos, no metadata)
   - Si `coordinacionesMap` está vacío (error de red): permite importación como fallback
   - Si map parcialmente cargado: intenta reverse lookup por ID

### QuickImportModal.tsx
1. **Destructuring corregido**: `isAdmin, isAdminOperativo, isSupervisor, isCoordinador`
2. **canAccessProspect reescrito**:
   - Bypass: `isAdmin || isAdminOperativo || user?.is_coordinador_calidad || user?.is_operativo`
   - Coordinación: `(isSupervisor || isCoordinador) && user?.coordinacion_id`
   - Ejecutivos: `user?.role_name === 'ejecutivo'`

## Archivos modificados
- `src/components/chat/ImportWizardModal.tsx` (destructuring + validateDynamicsLeadPermissions)
- `src/components/chat/QuickImportModal.tsx` (destructuring + canAccessProspect)

## Normalización de coordinaciones (referencia)
La función `normalizeCoordinacion` mapea variantes a un valor canónico:
- APEX, I360 → `'i360'`
- COB ACA, COBACA → `'COBACA'`
- VEN, VENTAS → `'VEN'`
- etc.

## Coordinaciones en BD
| ID | Nombre |
|----|--------|
| f33742b9... | APEX |
| e590fed1... | BOOM |
| 0008460b... | COB ACA |
| 4c1ece41... | MVP |
| 3f41a10b... | VEN |
| eea1c2ff... | CALIDAD |
| a5a7d72b... | Agente Virtual |
