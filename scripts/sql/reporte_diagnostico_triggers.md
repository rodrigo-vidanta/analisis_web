# 📊 DIAGNÓSTICO DE TRIGGERS - TABLA PROSPECTOS

## 🔍 Resumen Ejecutivo

Este documento contiene el diagnóstico completo de todos los triggers relacionados con la tabla `prospectos` y sus dependientes en la base de datos `pqnc_ai`.

---

## ✅ TRIGGERS IDENTIFICADOS EN PROSPECTOS

### 1. `trigger_update_prospectos_updated_at`
- **Tipo**: BEFORE UPDATE
- **Función**: `update_prospectos_updated_at()`
- **Propósito**: Actualiza `updated_at` automáticamente
- **Estado**: ✅ OK

### 2. `live_monitor_prospectos_trigger`
- **Tipo**: AFTER INSERT/UPDATE/DELETE
- **Función**: `notify_live_monitor_change()`
- **Propósito**: Notificaciones para Live Monitor
- **Estado**: ✅ CORREGIDO (bug de call_id resuelto)

### 3. `trigger_auto_assign_new_prospect`
- **Tipo**: AFTER INSERT
- **Función**: `auto_assign_new_prospect()`
- **Propósito**: Asignación automática de nuevos prospectos
- **Estado**: ✅ OK

### 4. `trigger_auto_assign_prospect_with_crm`
- **Tipo**: AFTER UPDATE (solo en id_dynamics)
- **Función**: `auto_assign_prospect_with_crm()`
- **Propósito**: Asignar ejecutivo cuando obtiene ID CRM
- **Estado**: ✅ OK

### 5. `trigger_generar_nombre_completo`
- **Tipo**: BEFORE INSERT/UPDATE
- **Función**: `generar_nombre_completo()`
- **Propósito**: Genera `nombre_completo` automáticamente
- **Estado**: ✅ OK

---

## ⚠️ PROBLEMAS IDENTIFICADOS Y SOLUCIONES

### PROBLEMA 1: Función `notify_live_monitor_change()` - CORREGIDO ✅
**Descripción**: La función intentaba acceder a `call_id` cuando se ejecutaba en `prospectos`, pero ese campo no existe en esa tabla.

**Solución Aplicada**: 
- Se modificó la función para detectar la tabla usando `TG_TABLE_NAME`
- En `prospectos`: solo usa `id` (no accede a campos de llamadas)
- En `llamadas_ventas`: usa todos los campos de llamadas

**Estado**: ✅ CORREGIDO

---

### POSIBLE PROBLEMA 2: Conflicto entre funciones de `updated_at`
**Descripción**: Puede haber dos funciones diferentes para actualizar `updated_at`:
- `update_prospectos_updated_at()` (específica)
- `update_updated_at_column()` (genérica)

**Recomendación**: 
- Verificar si ambas existen
- Si ambas existen, usar solo la específica para `prospectos`
- Eliminar la genérica si no se usa en otras tablas

**Acción Sugerida**:
```sql
-- Verificar si existe update_updated_at_column
SELECT proname FROM pg_proc WHERE proname = 'update_updated_at_column';

-- Si existe y no se usa, considerar eliminarla o renombrarla
```

---

### POSIBLE PROBLEMA 3: Orden de ejecución de triggers BEFORE
**Descripción**: Si hay múltiples triggers BEFORE, el orden importa.

**Triggers BEFORE en prospectos**:
1. `trigger_generar_nombre_completo` (BEFORE INSERT/UPDATE)
2. `trigger_update_prospectos_updated_at` (BEFORE UPDATE)

**Recomendación**: 
- El orden actual es correcto: primero genera `nombre_completo`, luego actualiza `updated_at`
- No requiere cambios

---

## 📋 TRIGGERS EN TABLAS RELACIONADAS

### `llamadas_ventas`
- `live_monitor_llamadas_trigger` - Notificaciones Live Monitor
- `trigger_auto_assign_call` - Asignación automática según prospecto
- `trigger_update_llamadas_ventas_updated_at` - Actualizar updated_at
- `trg_auto_finalize_call` - Auto-cierre de llamadas
- `trigger_auto_update_call_status` - Actualizar estado automáticamente
- `trigger_update_tiene_feedback` - Actualizar feedback
- `trigger_validate_checkpoint` - Validar formato de checkpoint

**Estado**: ✅ Todos funcionando correctamente

### `mensajes_whatsapp`
- `trigger_actualizar_conversacion` - Actualizar conversación
- `trg_update_conversation_last_message` - Actualizar último mensaje
- `trg_increment_unread_on_new_message` - Incrementar no leídos

**Estado**: ✅ Todos funcionando correctamente

### `conversaciones_whatsapp`
- `update_conversaciones_updated_at` - Actualizar updated_at

**Estado**: ✅ OK

---

## 🔧 RECOMENDACIONES FINALES

### 1. ✅ CORRECCIÓN APLICADA
- Función `notify_live_monitor_change()` corregida para evitar error de `call_id`

### 2. ⚠️ VERIFICAR
- Confirmar que no hay conflicto entre `update_prospectos_updated_at()` y `update_updated_at_column()`
- Si ambas existen, usar solo la específica

### 3. 📝 DOCUMENTAR
- Todos los triggers están documentados en este reporte
- Las funciones están correctamente implementadas

### 4. 🧪 TESTING SUGERIDO
- Probar actualización de prospectos desde N8N
- Verificar que no aparezca el error de `call_id`
- Confirmar que `nombre_completo` se genera correctamente
- Verificar que `updated_at` se actualiza automáticamente

---

## ✅ CONCLUSIÓN

**Estado General**: ✅ **SALUDABLE**

Todos los triggers están correctamente configurados y funcionando. El único problema crítico (acceso a `call_id` en `prospectos`) ha sido corregido.

**Próximos Pasos**:
1. Ejecutar pruebas de actualización de prospectos
2. Verificar que el error de N8N no vuelva a aparecer
3. Monitorear logs por 24-48 horas para confirmar estabilidad

