# Errores Restantes en Migración - Requieren Corrección

**Fecha:** 13 de Enero 2025  
**Estado:** LOGIN FUNCIONA - Errores en widgets y consultas avanzadas

---

## Errores Críticos Detectados

### 1. Foreign Key Embed Inválido: `coordinaciones:coordinacion_id`

**Error:** `Could not find a relationship between 'auth_users' and 'coordinacion_id'`

**Causa:** Supabase intenta hacer un JOIN por foreign key, pero el campo `coordinacion_id` en `auth_users` NO es una FK a `coordinaciones`, es solo un UUID suelto.

**Archivos afectados (10):**
1. `src/components/campaigns/plantillas/TemplateSuggestionsTab.tsx` (línea 67)
2. `src/services/permissionsService.ts` (línea 839)
3. `src/services/coordinacionService.ts` (líneas 512, 604, 665, 721, 848, 971, 1055, 1119)

**Solución:** Eliminar el embed `coordinaciones:coordinacion_id(...)` y hacer consulta separada, como ya hicimos en `useUserProfile.ts`.

---

### 2. Columna `is_ejecutivo` No Existe

**Error:** Consultas con `.eq('is_ejecutivo', true)` fallan

**Causa:** `auth_users` NO tiene columna `is_ejecutivo`, solo hay `role_id` que se une a `auth_roles`.

**Archivos afectados (6):**
1. `src/services/coordinacionService.ts` (líneas 405, 518, 610, 1124, 1173)
2. `src/components/admin/CoordinacionesManager.tsx` (línea 108)

**Solución:** Cambiar a JOIN con `auth_roles` y filtrar por `role_name = 'ejecutivo'`.

---

### 3. Tablas No Migradas

#### `bot_pause_status` (10 registros en system_ui)
- Usado por: `botPauseService.ts`, `ConversacionesWidget.tsx`
- Impacto: No puede mostrar bots pausados
- Solución: Migrar tabla completa

#### `uchat_conversations` (0 registros en system_ui)
- Usado por: `ConversacionesWidget.tsx`, `uchatService.ts`
- Impacto: No puede cargar conversaciones de UChat
- Solución: Crear tabla vacía (no hay datos)

---

## Plan de Corrección

### Opción A: Corrección Quirúrgica (RECOMENDADA)

Corregir cada archivo uno por uno para evitar romper otras cosas.

**Prioridad:**
1. Migrar `bot_pause_status` (10 registros)
2. Crear `uchat_conversations` (vacía)
3. Corregir `coordinacionService.ts` (más afectado - 9 líneas)
4. Corregir `permissionsService.ts`
5. Corregir `TemplateSuggestionsTab.tsx`
6. Corregir `CoordinacionesManager.tsx`

### Opción B: Buscar y Reemplazar Global

Hacer búsqueda y reemplazo en todos los archivos simultáneamente.

**Riesgos:**
- Puede romper lógica en algunos archivos
- Difícil de revertir

---

## Pregunta al Usuario

¿Prefieres que:

a) Migre las tablas faltantes y corrija archivos uno por uno (más seguro, toma más tiempo)
b) Haga corrección global (más rápido, mayor riesgo)
c) Solo migre las tablas y te muestro un resumen de lo que hay que cambiar

---

**Recomendación:** Opción A - Corrección quirúrgica para mantener estabilidad.
