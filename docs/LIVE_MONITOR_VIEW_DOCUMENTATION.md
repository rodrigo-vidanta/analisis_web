# 📋 DOCUMENTACIÓN COMPLETA - VISTA LIVE_MONITOR_VIEW

## 🎯 PROPÓSITO

La vista `live_monitor_view` es una vista optimizada de PostgreSQL que combina datos de las tablas `llamadas_ventas` y `prospectos` con clasificación inteligente automática de estados de llamadas. Esta vista elimina la necesidad de hacer JOINs manuales en el frontend y proporciona datos pre-calculados y clasificados para el módulo Live Monitor.

**Base de datos:** `glsmifhkoaifvaegsozd.supabase.co` (Base Natalia - Análisis IA)  
**Fecha de creación:** 25 de Noviembre 2025  
**Versión:** 1.0.0  
**Estado:** ✅ Producción

---

## 🏗️ ESTRUCTURA DE LA VISTA

### **Definición SQL**

```sql
CREATE VIEW live_monitor_view AS
SELECT 
  -- IDs principales
  lv.call_id,
  lv.prospecto AS prospecto_id,
  
  -- Estados (clasificación inteligente)
  clasificar_estado_llamada(
    COALESCE(lv.call_status, 'activa'),
    COALESCE(lv.datos_llamada, '{}'::jsonb),
    COALESCE(lv.duracion_segundos, 0),
    COALESCE(lv.fecha_llamada, NOW()),
    COALESCE(lv.audio_ruta_bucket::text, '')
  ) AS call_status_inteligente,
  lv.call_status AS call_status_bd,
  
  -- Datos temporales
  lv.fecha_llamada,
  COALESCE(lv.duracion_segundos, 0) AS duracion_segundos,
  EXTRACT(EPOCH FROM (NOW() - COALESCE(lv.fecha_llamada, NOW()))) / 60 AS minutos_transcurridos,
  
  -- Progreso VAPI
  lv.checkpoint_venta_actual,
  COALESCE(lv.datos_llamada->>'razon_finalizacion', '') AS razon_finalizacion,
  
  -- URLs de control
  lv.monitor_url,
  lv.control_url,
  lv.call_sid,
  lv.provider,
  lv.account_sid,
  
  -- Datos de venta
  lv.nivel_interes,
  lv.es_venta_exitosa,
  lv.probabilidad_cierre,
  lv.costo_total,
  lv.precio_ofertado,
  lv.audio_ruta_bucket,
  lv.conversacion_completa,
  
  -- Datos del prospecto (JOIN)
  p.nombre_completo,
  COALESCE(p.nombre_whatsapp, p.nombre_completo, 'Sin nombre') AS nombre_whatsapp,
  COALESCE(p.whatsapp, p.telefono_principal, '') AS whatsapp,
  p.telefono_principal,
  p.email,
  p.ciudad_residencia,
  p.estado_civil,
  p.edad,
  p.etapa AS etapa_prospecto,
  
  -- Composición familiar
  COALESCE(lv.composicion_familiar_numero, p.tamano_grupo) AS composicion_familiar_numero,
  
  -- Preferencias
  lv.destino_preferido,
  p.destino_preferencia,
  lv.preferencia_vacaciones,
  lv.numero_noches,
  lv.mes_preferencia,
  p.viaja_con,
  p.cantidad_menores,
  
  -- Seguimiento
  p.observaciones,
  p.asesor_asignado,
  p.campana_origen,
  p.interes_principal,
  
  -- Feedback
  COALESCE(lv.tiene_feedback, false) AS tiene_feedback,
  lv.feedback_resultado,
  lv.feedback_comentarios,
  lv.feedback_user_email,
  lv.feedback_fecha,
  
  -- Timestamps
  lv.last_event_at,
  lv.ended_at,
  p.created_at AS prospecto_created_at,
  COALESCE(p.updated_at, p.created_at) AS prospecto_updated_at,
  
  -- Datos VAPI (JSON)
  lv.datos_proceso,
  lv.datos_llamada,
  lv.datos_objeciones,
  
  -- Metadata
  p.id_uchat,
  p.id_airtable,
  p.crm_data,
  
  -- Coordinación
  p.coordinacion_id,
  p.ejecutivo_id
  
FROM llamadas_ventas lv
LEFT JOIN prospectos p ON lv.prospecto = p.id
WHERE lv.call_id IS NOT NULL;
```

---

## 🧠 FUNCIÓN DE CLASIFICACIÓN INTELIGENTE

### **Función: `clasificar_estado_llamada`**

La función `clasificar_estado_llamada` determina automáticamente el estado real de una llamada basándose en múltiples criterios.

#### **Parámetros:**
- `p_call_status` (VARCHAR): Estado original de la llamada en BD
- `p_datos_llamada` (JSONB): Datos JSON de la llamada (incluye `razon_finalizacion`)
- `p_duracion_segundos` (INTEGER): Duración de la llamada en segundos
- `p_fecha_llamada` (TIMESTAMP WITH TIME ZONE): Fecha y hora de inicio de la llamada
- `p_audio_ruta_bucket` (TEXT): Ruta del archivo de audio (si existe)

#### **Lógica de Clasificación:**

1. **Razón de finalización específica** (prioridad más alta):
   - Si `razon_finalizacion` contiene "transfer" o "forwarded" → `'transferida'`
   - Si contiene "customer-ended", "customer-busy", "no-answer" → `'perdida'`
   - Si contiene "assistant-ended", "completed" → `'finalizada'`

2. **Duración y audio**:
   - Si `duracion_segundos > 0` Y tiene `audio_ruta_bucket` → `'finalizada'`
   - Si `duracion_segundos < 10` Y `> 0` → `'perdida'`

3. **Estados específicos** (mantener):
   - `call_status = 'transferida'` → `'transferida'`
   - `call_status IN ('finalizada', 'exitosa')` → `'finalizada'`
   - `call_status IN ('perdida', 'colgada')` → `'perdida'`

4. **Llamadas activas** (prioridad):
   - Si `call_status = 'activa'`:
     - Si tiene duración + audio → `'finalizada'`
     - Si tiene razón de finalización → usar esa razón
     - **Por defecto:** Mantener como `'activa'` (incluso si han pasado más de 30 minutos)

5. **Fallback:**
   - Usar el `call_status` original o `'perdida'` si es NULL

#### **Estados posibles:**
- `'activa'`: Llamada en curso
- `'perdida'`: Llamada que no se completó exitosamente
- `'transferida'`: Llamada transferida a agente humano
- `'finalizada'`: Llamada completada exitosamente

---

## 📊 CAMPOS DE LA VISTA

### **IDs Principales**
- `call_id` (VARCHAR): Identificador único de la llamada
- `prospecto_id` (UUID): ID del prospecto asociado

### **Estados**
- `call_status_inteligente` (VARCHAR): Estado clasificado automáticamente
- `call_status_bd` (VARCHAR): Estado original en la base de datos

### **Datos Temporales**
- `fecha_llamada` (TIMESTAMP): Fecha y hora de inicio de la llamada
- `duracion_segundos` (INTEGER): Duración en segundos (0 si no tiene)
- `minutos_transcurridos` (NUMERIC): Minutos transcurridos desde `fecha_llamada` (calculado)

### **Progreso VAPI**
- `checkpoint_venta_actual` (VARCHAR): Checkpoint actual del proceso de venta
- `razon_finalizacion` (TEXT): Razón de finalización extraída de `datos_llamada`

### **URLs de Control**
- `monitor_url` (TEXT): URL para monitorear la llamada
- `control_url` (TEXT): URL para controlar la llamada
- `call_sid` (VARCHAR): SID de la llamada (Twilio/VAPI)
- `provider` (VARCHAR): Proveedor de telefonía
- `account_sid` (VARCHAR): SID de la cuenta

### **Datos de Venta**
- `nivel_interes` (JSONB): Nivel de interés del prospecto
- `es_venta_exitosa` (BOOLEAN): Si la venta fue exitosa
- `probabilidad_cierre` (DECIMAL): Probabilidad de cierre
- `costo_total` (DECIMAL): Costo total de la llamada
- `precio_ofertado` (JSONB): Precio ofertado al cliente

### **Audio y Conversación**
- `audio_ruta_bucket` (TEXT): Ruta del archivo de audio
- `conversacion_completa` (JSONB): Conversación completa de la llamada

### **Datos del Prospecto** (JOIN automático)
- `nombre_completo` (VARCHAR): Nombre completo
- `nombre_whatsapp` (VARCHAR): Nombre en WhatsApp (fallback: nombre_completo o 'Sin nombre')
- `whatsapp` (VARCHAR): Número de WhatsApp (fallback: telefono_principal)
- `telefono_principal` (VARCHAR): Teléfono principal
- `email` (VARCHAR): Email del prospecto
- `ciudad_residencia` (VARCHAR): Ciudad de residencia
- `estado_civil` (VARCHAR): Estado civil
- `edad` (INTEGER): Edad del prospecto
- `etapa_prospecto` (VARCHAR): Etapa del prospecto en el proceso

### **Composición Familiar**
- `composicion_familiar_numero` (INTEGER): Número de personas (prioridad: llamada > prospecto)

### **Preferencias**
- `destino_preferido` (VARCHAR): Destino preferido (desde llamada o primer elemento del array)
- `destino_preferencia` (TEXT[]): Array completo de destinos preferidos
- `preferencia_vacaciones` (TEXT[]): Preferencias de vacaciones
- `numero_noches` (INTEGER): Número de noches preferidas
- `mes_preferencia` (VARCHAR): Mes preferido para viajar
- `viaja_con` (VARCHAR): Con quién viaja
- `cantidad_menores` (INTEGER): Cantidad de menores

### **Seguimiento**
- `observaciones` (TEXT): Observaciones del prospecto
- `asesor_asignado` (VARCHAR): Asesor asignado
- `campana_origen` (VARCHAR): Campaña de origen
- `interes_principal` (VARCHAR): Interés principal

### **Feedback**
- `tiene_feedback` (BOOLEAN): Si tiene feedback procesado
- `feedback_resultado` (VARCHAR): Resultado del feedback
- `feedback_comentarios` (TEXT): Comentarios del feedback
- `feedback_user_email` (VARCHAR): Email del usuario que dio feedback
- `feedback_fecha` (TIMESTAMP): Fecha del feedback

### **Timestamps**
- `last_event_at` (TIMESTAMP): Último evento registrado
- `ended_at` (TIMESTAMP): Fecha de finalización (NULL si sigue activa)
- `prospecto_created_at` (TIMESTAMP): Fecha de creación del prospecto
- `prospecto_updated_at` (TIMESTAMP): Fecha de última actualización del prospecto

### **Datos VAPI (JSON)**
- `datos_proceso` (JSONB): Datos dinámicos del proceso de venta
- `datos_llamada` (JSONB): Datos completos de la llamada
- `datos_objeciones` (JSONB): Datos de objeciones presentadas

### **Metadata**
- `id_uchat` (VARCHAR): ID en UChat
- `id_airtable` (VARCHAR): ID en Airtable
- `crm_data` (JSONB): Datos del CRM

### **Coordinación**
- `coordinacion_id` (UUID): ID de la coordinación asignada
- `ejecutivo_id` (UUID): ID del ejecutivo asignado

---

## ⚡ CONFIGURACIÓN DE REALTIME

### **Tablas Base con Realtime Habilitado**
- `llamadas_ventas`: Habilitada en publicación `supabase_realtime`
- `prospectos`: Habilitada en publicación `supabase_realtime`

### **Triggers para Notificaciones**

#### **Trigger en `llamadas_ventas`:**
```sql
CREATE TRIGGER live_monitor_llamadas_trigger
  AFTER INSERT OR UPDATE OR DELETE ON llamadas_ventas
  FOR EACH ROW EXECUTE FUNCTION notify_live_monitor_change();
```

#### **Trigger en `prospectos`:**
```sql
CREATE TRIGGER live_monitor_prospectos_trigger
  AFTER INSERT OR UPDATE OR DELETE ON prospectos
  FOR EACH ROW EXECUTE FUNCTION notify_live_monitor_change();
```

### **Función de Notificación**

La función `notify_live_monitor_change()` envía notificaciones PostgreSQL (`pg_notify`) cuando hay cambios en las tablas base. Esto permite que el frontend se suscriba a cambios en tiempo real.

**Canal de notificación:** `live_monitor_change`  
**Formato:** JSON con información del cambio (call_id, prospecto_id, checkpoint, call_status, call_status_inteligente, timestamp)

---

## 🔧 USO EN EL FRONTEND

### **Servicio Optimizado**

El servicio `liveMonitorOptimizedService` utiliza esta vista directamente:

```typescript
const { data, error } = await analysisSupabase
  .from('live_monitor_view')
  .select('*')
  .order('fecha_llamada', { ascending: false })
  .limit(50);
```

### **Ventajas sobre el Servicio Legacy**

1. **Una sola consulta** en lugar de múltiples JOINs manuales
2. **Clasificación automática** sin lógica compleja en el frontend
3. **Datos pre-calculados** como `minutos_transcurridos`
4. **Mejor rendimiento** al evitar procesamiento en el cliente

---

## 🐛 RESOLUCIÓN DE PROBLEMAS

### **Problema: Vista no existe**
**Solución:** Ejecutar el script `scripts/sql/create-live-monitor-view-complete.sql`

### **Problema: Función de clasificación no existe**
**Solución:** La función se crea automáticamente en el script de creación de la vista

### **Problema: Llamadas activas no aparecen**
**Verificar:**
1. Que `call_status = 'activa'` en la tabla `llamadas_ventas`
2. Que la función `clasificar_estado_llamada` esté actualizada
3. Que la vista esté usando la función correcta

### **Problema: Realtime no funciona**
**Verificar:**
1. Que las tablas estén en la publicación `supabase_realtime`
2. Que los triggers estén creados
3. Que la función `notify_live_monitor_change` exista

---

## 📝 MANTENIMIENTO

### **Recrear la Vista**

Si es necesario recrear la vista:

```sql
DROP VIEW IF EXISTS live_monitor_view CASCADE;
-- Luego ejecutar el script completo de creación
```

### **Actualizar la Función de Clasificación**

```sql
CREATE OR REPLACE FUNCTION clasificar_estado_llamada(...)
-- Ver script completo en scripts/sql/create-live-monitor-view-complete.sql
```

### **Verificar Estado**

```sql
-- Verificar que la vista existe
SELECT COUNT(*) FROM live_monitor_view;

-- Verificar triggers
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE 'live_monitor%';

-- Verificar realtime
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('llamadas_ventas', 'prospectos');
```

---

## 📚 REFERENCIAS

- **Script de creación:** `scripts/sql/create-live-monitor-view-complete.sql`
- **Documentación del módulo:** `src/components/analysis/README_LIVEMONITOR.md`
- **Changelog:** `src/components/analysis/CHANGELOG_LIVEMONITOR.md`
- **Servicio optimizado:** `src/services/liveMonitorOptimizedService.ts`
- **Servicio Kanban:** `src/services/liveMonitorKanbanOptimized.ts`

---

## 🔄 HISTORIAL DE CAMBIOS

### **v1.0.0** - 25 de Noviembre 2025
- ✅ Vista creada inicialmente
- ✅ Función de clasificación inteligente implementada
- ✅ Realtime configurado con triggers
- ✅ Corrección: Priorización de `call_status = 'activa'` sin límite de tiempo
- ✅ Corrección: Llamadas activas se mantienen activas incluso después de 30 minutos

---

**Última actualización:** 25 de Noviembre 2025  
**Versión:** 1.0.0  
**Estado:** ✅ Producción

