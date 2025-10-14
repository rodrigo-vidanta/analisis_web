-- =============================================
-- TRIGGERS Y RPC PARA LIVE CHAT
-- - Mantener last_message_at en conversaciones
-- - Actualizar preview y unread
-- - RPC para marcar conversación como leída
-- =============================================

-- =============================================
-- BACKFILL FEEDBACK EN LLAMADAS FINALIZADAS
-- Genera feedback basado en resumen/razón sin tocar feedback ya existente
-- =============================================
BEGIN;

-- 1) Transferidas (por razón de finalización)
UPDATE public.llamadas_ventas
SET 
  tiene_feedback = true,
  feedback_resultado = 'transferida',
  feedback_comentarios = COALESCE(resumen_llamada, datos_llamada->>'resumen', 'Transferida (sin resumen)'),
  ended_at = COALESCE(ended_at, NOW())
WHERE 
  (call_status IN ('finalizada','transferida'))
  AND COALESCE(tiene_feedback,false) = false
  AND (COALESCE(datos_llamada->>'razon_finalizacion','') ILIKE '%transfer%');

-- 2) Perdida por desinterés/cliente colgó
UPDATE public.llamadas_ventas
SET 
  tiene_feedback = true,
  feedback_resultado = 'perdida',
  feedback_comentarios = COALESCE(resumen_llamada, datos_llamada->>'resumen', 'Cliente finalizó la llamada por desinterés'),
  ended_at = COALESCE(ended_at, NOW())
WHERE 
  (call_status IN ('finalizada','perdida'))
  AND COALESCE(tiene_feedback,false) = false
  AND (
    COALESCE(datos_llamada->>'razon_finalizacion','') ILIKE '%customer-ended-call%'
    OR COALESCE(datos_llamada->>'razon_finalizacion','') ILIKE '%no interesado%'
  );

-- 3) Exitosa (si está marcada como exitosa y sin feedback)
UPDATE public.llamadas_ventas
SET 
  tiene_feedback = true,
  feedback_resultado = 'exitosa',
  feedback_comentarios = COALESCE(resumen_llamada, datos_llamada->>'resumen', 'Llamada exitosa (sin resumen)'),
  ended_at = COALESCE(ended_at, NOW())
WHERE 
  (call_status = 'exitosa' OR es_venta_exitosa = true)
  AND COALESCE(tiene_feedback,false) = false;

-- 4) Colgada (si quedó colgada y hay algún resumen)
UPDATE public.llamadas_ventas
SET 
  tiene_feedback = true,
  feedback_resultado = 'colgada',
  feedback_comentarios = COALESCE(resumen_llamada, datos_llamada->>'resumen', 'Llamada colgada (sin resumen)'),
  ended_at = COALESCE(ended_at, NOW())
WHERE 
  call_status = 'colgada'
  AND COALESCE(tiene_feedback,false) = false
  AND (resumen_llamada IS NOT NULL OR datos_llamada ? 'resumen');

COMMIT;

-- =============================================
-- LIVE MONITOR: AUTO-CIERRE Y FEEDBACK EN llamadas_ventas
-- No destructivo: agrega columnas si no existen y trigger idempotente
-- =============================================

-- 1) Agregar columnas seguras (si no existen)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'llamadas_ventas' AND column_name = 'last_event_at'
  ) THEN
    ALTER TABLE public.llamadas_ventas ADD COLUMN last_event_at TIMESTAMP NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'llamadas_ventas' AND column_name = 'ended_at'
  ) THEN
    ALTER TABLE public.llamadas_ventas ADD COLUMN ended_at TIMESTAMP NULL;
  END IF;
END $$;

-- 2) Función: auto-cierre y feedback por razon_finalizacion
CREATE OR REPLACE FUNCTION public.fn_auto_finalize_call()
RETURNS trigger AS $$
DECLARE
  razon TEXT;
  resumen TEXT;
  checkpoint TEXT;
BEGIN
  -- tomar razon finalización del JSON si existe
  razon := COALESCE(NEW.datos_llamada->>'razon_finalizacion', '');
  resumen := COALESCE(NEW.resumen_llamada, NEW.datos_llamada->>'resumen');
  checkpoint := COALESCE(NEW.checkpoint_venta_actual, NEW.datos_proceso->>'checkpoint_alcanzado');

  -- mantener last_event_at fresco cuando llegan updates significativos
  IF TG_OP = 'UPDATE' THEN
    NEW.last_event_at := COALESCE(NEW.last_event_at, NOW());
  END IF;

  -- si ya finalizó con feedback, no tocar
  IF COALESCE(NEW.tiene_feedback, false) = true AND NEW.call_status <> 'activa' THEN
    RETURN NEW;
  END IF;

  -- si hay razón conocida de fin, auto-cerrar con feedback
  IF razon <> '' THEN
    IF razon ILIKE '%transfer%' THEN
      NEW.call_status := 'finalizada';
      NEW.tiene_feedback := true;
      NEW.feedback_resultado := 'transferida';
      NEW.feedback_comentarios := COALESCE(resumen, CONCAT('Transferida en ', COALESCE(checkpoint,'checkpoint desconocido')));
      NEW.ended_at := COALESCE(NEW.ended_at, NOW());
    ELSIF razon ILIKE '%customer-ended-call%' OR razon ILIKE '%no interesado%' THEN
      NEW.call_status := 'finalizada';
      NEW.tiene_feedback := true;
      NEW.feedback_resultado := 'perdida';
      NEW.feedback_comentarios := COALESCE(resumen, 'Cliente finalizó la llamada por desinterés');
      NEW.ended_at := COALESCE(NEW.ended_at, NOW());
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_finalize_call ON public.llamadas_ventas;
CREATE TRIGGER trg_auto_finalize_call
BEFORE UPDATE ON public.llamadas_ventas
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_finalize_call();

-- 1) Trigger: al insertar en mensajes_whatsapp, actualizar conversaciones_whatsapp.last_message_at
-- Nota: ajusta nombres de columnas según tu esquema exacto

-- function
CREATE OR REPLACE FUNCTION public.fn_update_conversation_last_message()
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

-- trigger
DROP TRIGGER IF EXISTS trg_update_conversation_last_message ON public.mensajes_whatsapp;
CREATE TRIGGER trg_update_conversation_last_message
AFTER INSERT ON public.mensajes_whatsapp
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_conversation_last_message();

-- 2) RPC: marcar conversación como leída (reset unread_count)
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.uchat_conversations
  SET unread_count = 0
  WHERE id = p_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Opcional: trigger para unread_count (incrementar cuando llegue mensaje del cliente/bot)
-- Ajustar si manejas multiusuario con tabla conversation_reads
CREATE OR REPLACE FUNCTION public.fn_increment_unread_on_new_message()
RETURNS trigger AS $$
BEGIN
  -- solo si no es agente
  IF NEW.rol IS DISTINCT FROM 'Vendedor' THEN
    UPDATE public.uchat_conversations
    SET unread_count = COALESCE(unread_count,0) + 1,
        last_message_at = NEW.fecha_hora
    WHERE id = NEW.conversacion_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_increment_unread_on_new_message ON public.mensajes_whatsapp;
CREATE TRIGGER trg_increment_unread_on_new_message
AFTER INSERT ON public.mensajes_whatsapp
FOR EACH ROW
EXECUTE FUNCTION public.fn_increment_unread_on_new_message();


