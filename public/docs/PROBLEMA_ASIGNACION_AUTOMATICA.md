# 🔍 Problema: Asignación Automática de Prospectos

## ❌ Problema Identificado

Cuando un prospecto se crea **directamente en la base de datos** (por ejemplo, desde un webhook de N8N o proceso externo), **NO se ejecuta automáticamente** la asignación a una coordinación.

### ¿Por qué pasa esto?

1. **El trigger SQL existe pero solo registra un aviso:**
   - El trigger `trigger_auto_assign_new_prospect` en `scripts/sql/create_automation_triggers.sql` solo hace un `RAISE NOTICE`
   - No ejecuta realmente la asignación porque requiere comunicación entre bases de datos diferentes

2. **La asignación automática se ejecuta desde el frontend:**
   - `automationService.processNewProspect()` se llama desde `LiveChatCanvas.tsx` cuando se detecta una nueva conversación
   - Si el prospecto se crea directamente en la BD, el frontend no lo detecta inmediatamente

3. **El prospecto se creó sin pasar por el frontend:**
   - El prospecto `8f14c180-b769-433e-8ccf-916c398655c3` se creó directamente en la base de datos
   - Los campos `coordinacion_id`, `ejecutivo_id` y `assignment_date` quedaron en `NULL`

---

## ✅ Solución Inmediata

### Script para Asignar Prospectos Manualmente

He creado un script que puedes ejecutar para asignar prospectos:

```bash
# Asignar un prospecto específico
node scripts/assign_prospect_automatically.js 8f14c180-b769-433e-8ccf-916c398655c3

# Procesar TODOS los prospectos sin asignación
node scripts/assign_prospect_automatically.js
```

**Resultado:** El prospecto fue asignado exitosamente a la coordinación **VEN**.

---

## 🔧 Soluciones a Futuro

### Opción 1: Mejorar el Trigger SQL (Recomendado)

Crear un trigger que llame directamente a la función RPC usando `dblink` o `http` extension:

```sql
-- Requiere habilitar extensión http o dblink
CREATE EXTENSION IF NOT EXISTS http;

CREATE OR REPLACE FUNCTION auto_assign_new_prospect()
RETURNS TRIGGER AS $$
DECLARE
  v_response jsonb;
BEGIN
  -- Solo asignar si no tiene coordinacion_id
  IF NEW.coordinacion_id IS NULL THEN
    -- Llamar función RPC en System_UI usando HTTP
    SELECT content::jsonb INTO v_response
    FROM http((
      'POST',
      'https://zbylezfyagwrxoecioup.supabase.co/rest/v1/rpc/assign_prospect_to_coordinacion',
      ARRAY[
        http_header('apikey', 'TU_SERVICE_KEY'),
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer TU_SERVICE_KEY')
      ],
      'application/json',
      json_build_object('p_prospect_id', NEW.id)::text
    )::http_request);
    
    -- Actualizar coordinacion_id si la asignación fue exitosa
    IF v_response->>'coordinacion_id' IS NOT NULL THEN
      NEW.coordinacion_id := (v_response->>'coordinacion_id')::uuid;
      NEW.assignment_date := NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**⚠️ Nota:** Requiere habilitar la extensión `http` en Supabase (puede requerir permisos especiales).

### Opción 2: Proceso Periódico en N8N

Crear un workflow en N8N que se ejecute cada X minutos y procese prospectos sin asignación:

1. Query: `SELECT id FROM prospectos WHERE coordinacion_id IS NULL`
2. Para cada prospecto, llamar a la función RPC `assign_prospect_to_coordinacion`
3. Actualizar `coordinacion_id` y `assignment_date` en `prospectos`

### Opción 3: Webhook desde N8N

Cuando N8N crea un prospecto, también debe llamar a un endpoint que ejecute la asignación:

```javascript
// En N8N, después de crear el prospecto:
const prospectId = 'uuid-del-prospecto-creado';

// Llamar a función RPC para asignación
const { data, error } = await supabaseSystemUI.rpc(
  'assign_prospect_to_coordinacion',
  { p_prospect_id: prospectId }
);

// Actualizar prospecto con coordinacion_id
if (data) {
  await analysisSupabase
    .from('prospectos')
    .update({
      coordinacion_id: data,
      assignment_date: new Date().toISOString()
    })
    .eq('id', prospectId);
}
```

---

## 📋 Checklist para Nuevos Prospectos

Cuando crees un prospecto desde N8N o proceso externo:

- [ ] ✅ Crear prospecto en `prospectos` (Base de Análisis)
- [ ] ✅ Llamar a `assign_prospect_to_coordinacion` RPC (System_UI)
- [ ] ✅ Actualizar `coordinacion_id` y `assignment_date` en `prospectos`
- [ ] ✅ Crear registro en `prospect_assignments` (System_UI)

**O usar el script:**
```bash
node scripts/assign_prospect_automatically.js [prospect_id]
```

---

## 🔄 Proceso Actual de Asignación

### Cuando se crea desde el Frontend:

1. Usuario abre Live Chat
2. Se detecta nueva conversación en `syncNewConversations()`
3. Se llama a `automationService.processNewProspect(prospectId)`
4. Se ejecuta `assignmentService.assignProspectToCoordinacion()`
5. Se sincroniza `coordinacion_id` en `prospectos`

### Cuando se crea desde N8N/Backend:

1. ❌ **NO se ejecuta automáticamente** (problema actual)
2. ✅ **Solución:** Ejecutar script manualmente o integrar en N8N

---

## 📝 Archivos Relacionados

- `scripts/assign_prospect_automatically.js` - Script para asignación manual
- `src/services/automationService.ts` - Servicio de automatización
- `src/services/assignmentService.ts` - Servicio de asignación
- `scripts/sql/create_automation_triggers.sql` - Triggers SQL (actualmente solo notifican)

---

**Última actualización:** Enero 2025  
**Estado:** ✅ Prospecto asignado manualmente, pendiente solución permanente

