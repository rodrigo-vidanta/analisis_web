# Errores Finales a Corregir

**Fecha:** 13 de Enero 2025  
**Estado:** Migración funcional pero con errores menores

---

## Errores Activos

### 1. `role_name=eq.ejecutivo` en Consultas (400 Bad Request)

**Archivos afectados:**
- `src/services/notificationsService.ts` - ✅ CORREGIDO (4 ocurrencias)
- `src/services/automationService.ts` - ✅ CORREGIDO (1 ocurrencia)

**Archivos que usan `role_name` como propiedad (NO SQL):**
- `src/components/admin/UserManagement.tsx` - ✅ OK (usa propiedad del objeto, no query)
- `src/components/admin/UserManagementV2/*` - ✅ OK (usa propiedad del objeto)
- `src/components/admin/GroupManagement/*` - SELECT lo incluye pero NO lo filtra ✅ OK

**Estado:** ✅ CORREGIDO en consultas SQL

---

### 2. `triggerCallNotification is not a function`

**Archivo:** `src/components/analysis/LiveMonitorKanban.tsx` (línea 3534)

**Causa:** La función `triggerCallNotification` fue eliminada de `notificationStore`

**Opciones:**
A) Restaurar función en `notificationStore`
B) Comentar la línea (deshabilitar notificación de checkpoint #5)
C) Reemplazar con función alternativa

**Estado:** ⏳ PENDIENTE

---

### 3. Contador de Historial No Se Muestra

**Archivo:** `src/components/analysis/LiveMonitorKanban.tsx`

**Problema:** `totalHistoryCount` se setea a 0 o no se calcula correctamente

**Solución aplicada:** COUNT inicial en reset

**Estado:** ⚠️ VERIFICAR si funcionó

---

### 4. `uchat_conversations` Sin Datos

**Estado:** ✅ RESUELTO
- Tabla recreada con esquema completo
- 0 registros (correcto, no había datos en system_ui)

---

## Acciones Pendientes

1. ✅ Corregir `role_name` en queries SQL
2. ⏳ Resolver `triggerCallNotification`
3. ⏳ Verificar contador de historial
4. ⏳ Testing completo de todos los módulos

---

**Prioridad:** Resolver `triggerCallNotification` para que Live Monitor funcione sin errores
