-- =============================================
-- UNIFICACIÓN DE TRIGGERS - CONVERSACIONES WHATSAPP
-- =============================================
-- Fecha: 2026-01-14
-- Estado: ✅ EJECUTADO
-- Base de datos: PQNC_AI (glsmifhkoaifvaegsozd)
-- =============================================
--
-- RESUMEN:
-- - Eliminados: trg_increment_unread_on_new_message (apuntaba a tabla incorrecta)
-- - Eliminados: trg_update_conversation_last_message (WHERE incorrecto)
-- - Creado: trg_sync_conversation (unificado y corregido)
--
-- TRIGGERS ACTIVOS DESPUÉS DE EJECUCIÓN:
-- 1. trg_check_template_reply (AFTER) - tracking de respuestas a templates
-- 2. trg_force_leido_false (BEFORE) - forzar leido=false en nuevos mensajes
-- 3. trg_sync_conversation (AFTER) - NUEVO: sincroniza conversaciones_whatsapp
-- 4. (trigger interno de replicación si existe)
--
-- =============================================

-- =============================================
-- SECCIÓN 1: RESPALDO DE FUNCIONES ANTERIORES
-- =============================================
-- Estas funciones fueron reemplazadas por fn_sync_conversation_on_message

/*
-- FUNCIÓN ANTERIOR 1: fn_increment_unread_on_new_message
-- PROBLEMA: Apuntaba a uchat_conversations (tabla vacía) en lugar de conversaciones_whatsapp

CREATE OR REPLACE FUNCTION fn_increment_unread_on_new_message()
RETURNS trigger AS $$
BEGIN
  IF NEW.rol IS DISTINCT FROM 'Vendedor' THEN
    UPDATE public.uchat_conversations  -- ❌ TABLA INCORRECTA
    SET unread_count = COALESCE(unread_count,0) + 1,
        last_message_at = NEW.fecha_hora
    WHERE id = NEW.conversacion_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCIÓN ANTERIOR 2: fn_update_conversation_last_message
-- PROBLEMA: WHERE usaba prospecto_id en lugar de id, actualizando TODAS las conversaciones del prospecto

CREATE OR REPLACE FUNCTION fn_update_conversation_last_message()
RETURNS trigger AS $$
BEGIN
  UPDATE public.conversaciones_whatsapp
  SET 
    last_message_at = NEW.fecha_hora,
    updated_at = NOW()
  WHERE prospecto_id = NEW.prospecto_id;  -- ❌ WHERE INCORRECTO
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

-- =============================================
-- SECCIÓN 2: NUEVA FUNCIÓN UNIFICADA (YA EJECUTADA)
-- =============================================

/*
CREATE OR REPLACE FUNCTION fn_sync_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar si hay conversacion_id válido
  IF NEW.conversacion_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.conversaciones_whatsapp
  SET
    -- Timestamps
    last_message_at = NEW.fecha_hora,
    updated_at = NOW(),
    
    -- Preview del mensaje (primeros 100 caracteres)
    ultimo_mensaje_preview = LEFT(NEW.mensaje, 100),
    
    -- Quién envió el último mensaje
    ultimo_mensaje_sender = NEW.rol,
    
    -- Lógica de mensajes no leídos:
    -- - Vendedor responde → reset a 0 (humano atendió)
    -- - Prospecto escribe → +1 (nuevo mensaje entrante)
    -- - AI/Plantilla → mantener (respuestas automáticas)
    mensajes_no_leidos = CASE
      WHEN NEW.rol = 'Vendedor' THEN 0
      WHEN NEW.rol = 'Prospecto' THEN COALESCE(mensajes_no_leidos, 0) + 1
      ELSE COALESCE(mensajes_no_leidos, 0)
    END
    
  WHERE id = NEW.conversacion_id;  -- ✅ WHERE correcto por ID
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;  -- ✅ Bypassa RLS
*/

-- =============================================
-- SECCIÓN 3: COMANDOS EJECUTADOS
-- =============================================

/*
-- Eliminar triggers problemáticos
DROP TRIGGER IF EXISTS trg_increment_unread_on_new_message ON public.mensajes_whatsapp;
DROP TRIGGER IF EXISTS trg_update_conversation_last_message ON public.mensajes_whatsapp;

-- Crear trigger unificado
CREATE TRIGGER trg_sync_conversation
AFTER INSERT ON public.mensajes_whatsapp
FOR EACH ROW
EXECUTE FUNCTION fn_sync_conversation_on_message();
*/

-- =============================================
-- SECCIÓN 4: SCRIPT DE ROLLBACK (SI ES NECESARIO)
-- =============================================

/*
-- ROLLBACK COMPLETO

-- 1. Eliminar nuevo trigger
DROP TRIGGER IF EXISTS trg_sync_conversation ON public.mensajes_whatsapp;

-- 2. Eliminar nueva función
DROP FUNCTION IF EXISTS fn_sync_conversation_on_message();

-- 3. Recrear función del Trigger 3
CREATE OR REPLACE FUNCTION fn_increment_unread_on_new_message()
RETURNS trigger AS $$
BEGIN
  IF NEW.rol IS DISTINCT FROM 'Vendedor' THEN
    UPDATE public.uchat_conversations
    SET unread_count = COALESCE(unread_count,0) + 1,
        last_message_at = NEW.fecha_hora
    WHERE id = NEW.conversacion_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recrear Trigger 3
CREATE TRIGGER trg_increment_unread_on_new_message
AFTER INSERT ON public.mensajes_whatsapp
FOR EACH ROW
EXECUTE FUNCTION fn_increment_unread_on_new_message();

-- 5. Recrear función del Trigger 4
CREATE OR REPLACE FUNCTION fn_update_conversation_last_message()
RETURNS trigger AS $$
BEGIN
  UPDATE public.conversaciones_whatsapp
  SET 
    last_message_at = NEW.fecha_hora,
    updated_at = NOW()
  WHERE prospecto_id = NEW.prospecto_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Recrear Trigger 4
CREATE TRIGGER trg_update_conversation_last_message
AFTER INSERT ON public.mensajes_whatsapp
FOR EACH ROW
EXECUTE FUNCTION fn_update_conversation_last_message();
*/

-- =============================================
-- SECCIÓN 5: VERIFICACIÓN
-- =============================================

-- Ejecutar para verificar estado actual de triggers
SELECT 
    t.tgname AS trigger_name,
    p.proname AS function_name,
    CASE t.tgtype & 2 WHEN 2 THEN 'BEFORE' ELSE 'AFTER' END AS timing
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'mensajes_whatsapp'
AND NOT t.tgisinternal
ORDER BY t.tgname;

-- Ejecutar después de que llegue un mensaje nuevo para verificar
SELECT 
    id,
    ultimo_mensaje_sender,
    ultimo_mensaje_preview,
    mensajes_no_leidos,
    last_message_at
FROM conversaciones_whatsapp
WHERE last_message_at IS NOT NULL
ORDER BY last_message_at DESC
LIMIT 5;

-- =============================================
-- SECCIÓN 6: BACKFILL OPCIONAL (NO EJECUTADO)
-- =============================================
-- Ejecutar solo si se necesita llenar datos históricos

/*
UPDATE conversaciones_whatsapp cw
SET
  ultimo_mensaje_sender = sub.rol,
  ultimo_mensaje_preview = sub.preview,
  last_message_at = sub.fecha_hora,
  mensajes_no_leidos = sub.no_leidos,
  updated_at = NOW()
FROM (
  SELECT 
    m.conversacion_id,
    (ARRAY_AGG(m.rol ORDER BY m.fecha_hora DESC))[1] AS rol,
    LEFT((ARRAY_AGG(m.mensaje ORDER BY m.fecha_hora DESC))[1], 100) AS preview,
    MAX(m.fecha_hora) AS fecha_hora,
    COUNT(*) FILTER (WHERE m.rol = 'Prospecto' AND m.leido = false) AS no_leidos
  FROM mensajes_whatsapp m
  WHERE m.conversacion_id IS NOT NULL
  GROUP BY m.conversacion_id
) sub
WHERE cw.id = sub.conversacion_id;
*/
