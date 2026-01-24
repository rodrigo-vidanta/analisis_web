# FIX: Error PGRST203 en create_system_ticket

## 🐛 Problema

Error al crear tickets desde logs:
```
PGRST203: Could not choose the best candidate function between...
```

**Causa:** Existen 2 versiones de `create_system_ticket` con la misma signature pero diferentes tipos de retorno, y **ninguna** acepta el parámetro `p_log_id` que el frontend está enviando.

---

## ✅ Solución

Ejecutar el siguiente SQL en **Supabase SQL Editor** (Dashboard → SQL Editor):

### Paso 1: Eliminar funciones duplicadas

```sql
-- Eliminar TODAS las versiones existentes
DROP FUNCTION IF EXISTS create_system_ticket(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT);
DROP FUNCTION IF EXISTS create_system_ticket(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT, UUID);
```

### Paso 2: Crear función única correcta

```sql
CREATE OR REPLACE FUNCTION create_system_ticket(
  p_type TEXT,
  p_title TEXT,
  p_description TEXT,
  p_category TEXT,
  p_subcategory TEXT,
  p_priority TEXT,
  p_form_data JSONB,
  p_assigned_to UUID DEFAULT NULL,
  p_assigned_to_role TEXT DEFAULT NULL,
  p_log_id UUID DEFAULT NULL -- ✅ NUEVO: soporte para log_id
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_system_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_ticket_id UUID;
  v_ticket_number VARCHAR(20);
  v_status TEXT;
  v_result JSONB;
BEGIN
  -- Generar número de ticket
  v_ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- Determinar status
  IF p_assigned_to IS NOT NULL OR p_assigned_to_role IS NOT NULL THEN
    v_status := 'en_progreso';
  ELSE
    v_status := 'abierto';
  END IF;
  
  -- Insertar ticket
  INSERT INTO support_tickets (
    ticket_number,
    type,
    title,
    description,
    category,
    subcategory,
    priority,
    status,
    reporter_id,
    reporter_name,
    reporter_email,
    reporter_role,
    assigned_to,
    assigned_to_role,
    assigned_at,
    assigned_by,
    form_data,
    log_id -- ✅ NUEVO
  ) VALUES (
    v_ticket_number,
    p_type,
    p_title,
    p_description,
    p_category,
    p_subcategory,
    p_priority,
    v_status,
    v_system_user_id,
    'Sistema Automático',
    'system@internal',
    'system',
    p_assigned_to,
    p_assigned_to_role,
    CASE WHEN p_assigned_to IS NOT NULL OR p_assigned_to_role IS NOT NULL THEN NOW() ELSE NULL END,
    v_system_user_id,
    p_form_data,
    p_log_id -- ✅ NUEVO
  )
  RETURNING id INTO v_ticket_id;
  
  -- Construir JSON de respuesta
  SELECT jsonb_build_object(
    'id', t.id,
    'ticket_number', t.ticket_number,
    'type', t.type,
    'title', t.title,
    'description', t.description,
    'category', t.category,
    'subcategory', t.subcategory,
    'priority', t.priority,
    'status', t.status,
    'reporter_id', t.reporter_id,
    'reporter_name', t.reporter_name,
    'reporter_email', t.reporter_email,
    'reporter_role', t.reporter_role,
    'assigned_to', t.assigned_to,
    'assigned_to_role', t.assigned_to_role,
    'assigned_at', t.assigned_at,
    'assigned_by', t.assigned_by,
    'form_data', t.form_data,
    'log_id', t.log_id, -- ✅ NUEVO
    'created_at', t.created_at,
    'updated_at', t.updated_at
  ) INTO v_result
  FROM support_tickets t
  WHERE t.id = v_ticket_id;
  
  RETURN v_result;
END;
$$;

-- Verificación
COMMENT ON FUNCTION create_system_ticket IS 'Crea ticket automático con reporter_id=system (incluye log_id)';
```

---

## 🧪 Verificación

Después de ejecutar el SQL, verifica que funciona:

```sql
-- Ver signature de la función
SELECT 
  proname,
  proargtypes::regtype[],
  prorettype::regtype
FROM pg_proc 
WHERE proname = 'create_system_ticket';

-- Debería mostrar:
-- proname: create_system_ticket
-- proargtypes: {text,text,text,text,text,text,jsonb,uuid,text,uuid}
-- prorettype: jsonb

-- Debería haber SOLO 1 fila
```

---

## 🚀 Después del Fix

Una vez ejecutado el SQL:

1. ✅ Refresh de la aplicación
2. ✅ Ir a Log Monitor
3. ✅ Crear ticket desde un log
4. ✅ Verificar que se crea sin errores
5. ✅ Verificar en Admin Panel que el ticket tiene contexto completo del log

---

## 📋 Checklist

- [ ] Ejecutado Paso 1 (DROP funciones)
- [ ] Ejecutado Paso 2 (CREATE función)
- [ ] Verificado con query de signature
- [ ] Probado crear ticket desde log
- [ ] Verificado contexto en Admin Panel

---

## 🔄 Alternativa: Usar archivo de migración

Si prefieres ejecutar el archivo completo:

```bash
# Ir al dashboard de Supabase
# SQL Editor → New Query
# Copiar contenido de: migrations/20260124_fix_create_system_ticket_rpc.sql
# Ejecutar
```

---

**Fecha:** 24 de Enero 2026  
**Tiempo estimado:** 2 minutos  
**Impacto:** Sin downtime (función se reemplaza atómicamente)
