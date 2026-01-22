# Fix: Coordinaciones Múltiples para Coordinadores

**Fecha:** 22 de Enero 2026  
**Versión:** v2.5.27  
**Estado:** ✅ Completado

---

## 🐛 Problema Identificado

Los coordinadores con múltiples coordinaciones asignadas perdían sus coordinaciones al recargar la página. El problema tenía dos causas:

1. **Guardado:** La condición requería que `coordinaciones_ids` fuera truthy, pero si era `undefined`, no se procesaban las coordinaciones.
2. **Carga:** La detección de coordinadores solo verificaba `auth_roles?.name`, ignorando otros campos como `role_name` o `is_coordinator`.
3. **Limpieza de metadatos:** El `coordinacion_id` no se limpiaba correctamente de los metadatos de coordinadores.

---

## ✅ Soluciones Implementadas

### 1. Fix en Guardado (`useUserManagement.ts`)

**Antes:**
```typescript
if (newRole?.name === 'coordinador' && updates.coordinaciones_ids) {
  // Solo se ejecutaba si coordinaciones_ids era truthy
}
```

**Después:**
```typescript
if (newRole?.name === 'coordinador') {
  // Siempre procesa coordinadores
  const coordinacionesIds = updates.coordinaciones_ids || [];
  // ... resto del código
}
```

**Cambios:**
- ✅ Siempre procesa coordinadores, incluso si `coordinaciones_ids` es `undefined`
- ✅ Convierte `undefined` a array vacío `[]`
- ✅ Limpia `coordinacion_id` de metadatos estableciéndolo como `null`
- ✅ Logging mejorado para debugging

### 2. Fix en Formulario (`UserEditPanel.tsx`)

**Antes:**
```typescript
updates.coordinaciones_ids = formData.coordinaciones_ids;
```

**Después:**
```typescript
updates.coordinaciones_ids = formData.coordinaciones_ids || [];
```

**Cambios:**
- ✅ Siempre envía un array (nunca `undefined`)
- ✅ Logging del length del array

### 3. Fix en Carga (`useUserManagement.ts`)

**Antes:**
```typescript
const isCoordinador = user.auth_roles?.name === 'coordinador';
```

**Después:**
```typescript
const isCoordinador = 
  user.auth_roles?.name === 'coordinador' || 
  user.role_name === 'coordinador' || 
  user.is_coordinator === true;
```

**Cambios:**
- ✅ Detecta coordinadores por múltiples campos
- ✅ Logging detallado para debugging
- ✅ Manejo de casos edge donde `auth_roles` puede no estar disponible

### 4. Cierre Automático del Modal

**Cambio en `UserEditPanel.tsx`:**
```typescript
if (success) {
  toast.success('Usuario actualizado correctamente');
  onRefresh(); // Recargar lista de usuarios
  onClose(); // Cerrar el modal de edición
}
```

**Beneficios:**
- ✅ Mejor UX: el modal se cierra automáticamente después de guardar
- ✅ Lista se actualiza inmediatamente con los cambios
- ✅ Feedback visual con toast de confirmación

---

## 📝 Archivos Modificados

1. **`src/components/admin/UserManagementV2/hooks/useUserManagement.ts`**
   - Línea 885: Condición de guardado mejorada
   - Línea 892: Conversión de `undefined` a array
   - Línea 977: Limpieza de `coordinacion_id` como `null`
   - Línea 1056-1060: Inclusión explícita de `null` en metadatos
   - Línea 354: Detección mejorada de coordinadores

2. **`src/components/admin/UserManagementV2/components/UserEditPanel.tsx`**
   - Línea 567: Asegurar array en lugar de `undefined`
   - Línea 601-604: Cierre automático y refresh después de guardar

---

## 🧪 Pruebas Realizadas

### Escenario 1: Coordinador con una coordinación
- ✅ Guardar coordinación → Se persiste correctamente
- ✅ Recargar página → Coordinación se carga correctamente
- ✅ Modal se cierra automáticamente después de guardar

### Escenario 2: Coordinador con múltiples coordinaciones
- ✅ Guardar múltiples coordinaciones → Todas se persisten
- ✅ Recargar página → Todas se cargan correctamente

### Escenario 3: Coordinador sin coordinaciones
- ✅ Guardar sin coordinaciones → Se limpian correctamente
- ✅ Recargar página → No tiene coordinaciones (correcto)

---

## 🔍 Logging Agregado

Se agregaron logs detallados para debugging:

```typescript
// En carga
console.log('🔍 [LOAD USERS] Coordinadores encontrados:', {...});
console.log('🔍 [LOAD USERS] Consulta auth_user_coordinaciones:', {...});
console.log('✅ [LOAD USERS] Mapa de coordinaciones construido:', {...});

// En guardado
console.log('✅ [COORDINACION] Coordinaciones actualizadas exitosamente:', {...});
```

---

## 📚 Referencias

- [Arquitectura BD Unificada](../.cursor/rules/arquitectura-bd-unificada.mdc)
- [Migración Coordinador Coordinaciones](../docs/MIGRATION_COORDINADOR_COORDINACIONES.md)
- [Análisis auth_user_coordinaciones](../docs/ANALISIS_AUTH_USER_COORDINACIONES_2026-01-22.md)

---

## ⚠️ Notas Importantes

1. **Coordinadores vs Ejecutivos/Supervisores:**
   - Coordinadores: Usan `auth_user_coordinaciones` (múltiples)
   - Ejecutivos/Supervisores: Usan `coordinacion_id` en metadatos (único)

2. **Limpieza de Metadatos:**
   - Para coordinadores, `coordinacion_id` debe ser `null` en metadatos
   - Las coordinaciones se almacenan solo en `auth_user_coordinaciones`

3. **Detección de Coordinadores:**
   - Se verifica por `auth_roles?.name`, `role_name` e `is_coordinator`
   - Esto asegura compatibilidad con diferentes estados de datos

---

**Última actualización:** 22 de Enero 2026
