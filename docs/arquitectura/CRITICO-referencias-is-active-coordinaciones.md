# 🚨 ANÁLISIS CRÍTICO: Referencias a `is_active` en Coordinaciones

**Fecha:** 2026-01-30  
**Estado:** ⚠️ NO EJECUTAR MIGRACIÓN BD AÚN

---

## ❌ PROBLEMA DETECTADO

Encontradas **3 referencias críticas** a `coordinacion.is_active` que romperían el sistema:

### 1. BulkAssignmentModal.tsx (LÍNEA 67)
```typescript
// ❌ PROBLEMA
setCoordinaciones(coordinacionesData.filter(c => c.is_active && !c.archivado));

// ✅ DEBE SER
setCoordinaciones(coordinacionesData.filter(c => !c.archivado));
```

**Impacto:** Modal de asignación masiva no mostraría coordinaciones.

### 2. BulkAssignmentModal.tsx (LÍNEAS 103, 146)
```typescript
// ❌ PROBLEMA
const isActive = coord.is_active;
const isActive = e.is_active;

// ✅ DEBE SER
// Eliminar esta validación, usar solo hasCoordinacion
```

**Impacto:** Coordinadores y ejecutivos no aparecerían en el modal.

---

## 📋 OTROS ARCHIVOS CON `is_active`

Estos archivos usan `is_active` pero para **USUARIOS**, NO para coordinaciones:

| Archivo | Uso | Afecta Coordinaciones? |
|---------|-----|------------------------|
| `UserManagementV2/*` | Usuario.is_active | ❌ No |
| `assignmentService.ts` | prospect_assignments.is_active | ❌ No |
| `authService.ts` | auth_users.is_active | ❌ No |
| `liveMonitorService.ts` | user_profiles_v2.is_active | ❌ No |
| `whatsappTemplatesService.ts` | templates.is_active | ❌ No |

**Conclusión:** Solo `BulkAssignmentModal.tsx` usa `coordinacion.is_active`

---

## ✅ PLAN DE CORRECCIÓN

### Paso 1: Corregir BulkAssignmentModal.tsx
1. Línea 67: Eliminar `c.is_active &&` del filtro
2. Líneas 103, 146: Eliminar validaciones de `is_active` para coordinadores/ejecutivos

### Paso 2: Verificar otros componentes
Buscar si hay más referencias en:
- ProspectosManager.tsx (usa user.is_active, NO coord.is_active)
- AssignmentContextMenu.tsx (usa ejecutivo.is_active, NO coord.is_active)

### Paso 3: Ejecutar migración BD
Solo después de corregir el código.

---

## 🎯 CORRECCIÓN INMEDIATA REQUERIDA

**Archivos a modificar:**
1. `src/components/shared/BulkAssignmentModal.tsx`

**Cambios específicos:**
- Línea 67: `filter(c => !c.archivado)` (sin `is_active`)
- Línea 103: Eliminar `const isActive = coord.is_active;`
- Línea 146: Eliminar `const isActive = e.is_active;`

---

## ⚠️ ADVERTENCIA

**NO ejecutar el SQL de migración hasta corregir BulkAssignmentModal.tsx**

Si se ejecuta antes:
- ❌ Modal de asignación masiva dejará de funcionar
- ❌ No se podrán asignar prospectos en bulk
- ❌ Coordinaciones no aparecerán en el selector

---

**Siguiente paso:** Corregir BulkAssignmentModal.tsx AHORA
