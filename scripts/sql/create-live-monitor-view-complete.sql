-- ============================================
-- CREAR VISTA OPTIMIZADA LIVE MONITOR - COMPLETA
-- Base: glsmifhkoaifvaegsozd.supabase.co (Natalia - Análisis)
-- Ejecutar en SQL Editor de Supabase
-- ============================================
-- 
-- ⚠️ IMPORTANTE: Esta vista combina llamadas_ventas + prospectos
-- con clasificación inteligente automática de estados
-- ============================================

-- ============================================
-- PASO 1: CREAR FUNCIÓN DE CLASIFICACIÓN INTELIGENTE
-- ============================================

DROP FUNCTION IF EXISTS clasificar_estado_llamada(VARCHAR, JSONB, INTEGER, TIMESTAMP WITH TIME ZONE, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION clasificar_estado_llamada(
  p_call_status VARCHAR,
  p_datos_llamada JSONB,
  p_duracion_segundos INTEGER,
  p_fecha_llamada TIMESTAMP WITH TIME ZONE,
  p_audio_ruta_bucket TEXT
)
RETURNS VARCHAR AS $$
DECLARE
  razon_finalizacion TEXT;
  minutos_transcurridos INTEGER;
  tiene_audio BOOLEAN;
BEGIN
  -- Extraer razón de finalización de datos_llamada
  razon_finalizacion := COALESCE(p_datos_llamada->>'razon_finalizacion', '');
  
  -- Calcular minutos transcurridos desde fecha_llamada
  minutos_transcurridos := EXTRACT(EPOCH FROM (NOW() - p_fecha_llamada)) / 60;
  
  -- Verificar si tiene audio
  tiene_audio := (p_audio_ruta_bucket IS NOT NULL AND p_audio_ruta_bucket != '');
  
  -- LÓGICA DE CLASIFICACIÓN INTELIGENTE
  -- PRIORIDAD: call_status = 'activa' debe verificarse PRIMERO
  
  -- 1. PRIORIDAD MÁXIMA: Si call_status es 'activa', verificar si realmente está activa
  IF p_call_status = 'activa' THEN
    -- Solo marcar como 'perdida' si hay indicadores claros de terminación
    -- Si tiene razón de finalización explícita, respetarla
    IF razon_finalizacion != '' THEN
      -- Si tiene razón de finalización, verificar si es realmente terminada
      IF razon_finalizacion ILIKE '%customer-ended%' OR
         razon_finalizacion ILIKE '%customer-busy%' OR
         razon_finalizacion ILIKE '%customer-did-not-answer%' OR
         razon_finalizacion ILIKE '%no-answer%' OR
         razon_finalizacion ILIKE '%busy%' OR
         razon_finalizacion ILIKE '%assistant-ended%' OR
         razon_finalizacion ILIKE '%completed%' THEN
        -- Tiene razón de finalización explícita, clasificar según ella
        IF razon_finalizacion ILIKE '%transfer%' OR 
           razon_finalizacion ILIKE '%forwarded%' OR
           razon_finalizacion = 'assistant-forwarded-call' THEN
          RETURN 'transferida';
        ELSIF razon_finalizacion ILIKE '%assistant-ended%' OR
              razon_finalizacion ILIKE '%completed%' THEN
          RETURN 'finalizada';
        ELSE
          RETURN 'perdida';
        END IF;
      END IF;
    END IF;
    
    -- Si tiene duración > 0 Y audio, está finalizada (no activa)
    IF p_duracion_segundos > 0 AND tiene_audio THEN
      RETURN 'finalizada';
    END IF;
    
    -- Si han pasado más de 30 minutos Y no tiene audio, probablemente está perdida
    IF minutos_transcurridos > 30 AND NOT tiene_audio AND p_duracion_segundos IS NULL THEN
      RETURN 'perdida';
    END IF;
    
    -- Si no hay indicadores de terminación, está activa
    RETURN 'activa';
  END IF;
  
  -- 2. Si call_status es 'transferida', mantenerlo
  IF p_call_status = 'transferida' THEN
    RETURN 'transferida';
  END IF;
  
  -- 3. Si call_status es 'finalizada' o 'exitosa', mantenerlo
  IF p_call_status IN ('finalizada', 'exitosa') THEN
    RETURN 'finalizada';
  END IF;
  
  -- 4. Si call_status es 'perdida' o 'colgada', mantenerlo
  IF p_call_status IN ('perdida', 'colgada') THEN
    RETURN 'perdida';
  END IF;
  
  -- 5. Si tiene razón de finalización específica, clasificar según ella
  IF razon_finalizacion != '' THEN
    -- Transferida
    IF razon_finalizacion ILIKE '%transfer%' OR 
       razon_finalizacion ILIKE '%forwarded%' OR
       razon_finalizacion = 'assistant-forwarded-call' THEN
      RETURN 'transferida';
    END IF;
    
    -- Perdida (cliente colgó, no contestó, ocupado)
    IF razon_finalizacion ILIKE '%customer-ended%' OR
       razon_finalizacion ILIKE '%customer-busy%' OR
       razon_finalizacion ILIKE '%customer-did-not-answer%' OR
       razon_finalizacion ILIKE '%no-answer%' OR
       razon_finalizacion ILIKE '%busy%' THEN
      RETURN 'perdida';
    END IF;
    
    -- Finalizada (asistente terminó exitosamente)
    IF razon_finalizacion ILIKE '%assistant-ended%' OR
       razon_finalizacion ILIKE '%completed%' THEN
      RETURN 'finalizada';
    END IF;
  END IF;
  
  -- 6. Si tiene duración > 0 Y audio, está finalizada
  IF p_duracion_segundos > 0 AND tiene_audio THEN
    RETURN 'finalizada';
  END IF;
  
  -- 7. Si tiene duración = 0 o muy baja (< 10 segundos), está perdida
  IF p_duracion_segundos IS NOT NULL AND p_duracion_segundos < 10 THEN
    RETURN 'perdida';
  END IF;
  
  -- 8. Si han pasado más de 30 minutos desde fecha_llamada, está perdida
  IF minutos_transcurridos > 30 THEN
    RETURN 'perdida';
  END IF;
  
  -- 9. Fallback: usar el estado original
  RETURN COALESCE(p_call_status, 'perdida');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PASO 2: CREAR VISTA OPTIMIZADA CON JOIN Y CLASIFICACIÓN
-- ============================================

DROP VIEW IF EXISTS live_monitor_view CASCADE;

CREATE VIEW live_monitor_view AS
SELECT 
  -- IDs principales
  lv.call_id,
  lv.prospecto AS prospecto_id,
  
  -- Estados (clasificación inteligente)
  clasificar_estado_llamada(
    lv.call_status,
    lv.datos_llamada,
    lv.duracion_segundos,
    lv.fecha_llamada,
    lv.audio_ruta_bucket::text
  ) AS call_status_inteligente,
  lv.call_status AS call_status_bd,
  
  -- Datos temporales
  lv.fecha_llamada,
  COALESCE(lv.duracion_segundos, 0) AS duracion_segundos,
  EXTRACT(EPOCH FROM (NOW() - lv.fecha_llamada)) / 60 AS minutos_transcurridos,
  
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
  lv.propuesta_economica_ofrecida,
  lv.habitacion_ofertada,
  lv.resort_ofertado,
  lv.principales_objeciones,
  
  -- Audio
  lv.audio_ruta_bucket,
  lv.resumen_llamada,
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
  
  -- Composición familiar (prioridad: llamada > prospecto)
  -- prospectos NO tiene composicion_familiar_numero, solo tamano_grupo
  COALESCE(lv.composicion_familiar_numero, p.tamano_grupo) AS composicion_familiar_numero,
  
  -- Preferencias (prioridad: llamada > prospecto)
  -- destino_preferido: puede venir de llamada o primer elemento del array de prospecto
  CASE 
    WHEN lv.destino_preferido IS NOT NULL THEN lv.destino_preferido::text
    WHEN p.destino_preferencia IS NOT NULL AND array_length(p.destino_preferencia, 1) > 0 
      THEN p.destino_preferencia[1]
    ELSE NULL
  END AS destino_preferido,
  -- destino_preferencia completo (array)
  COALESCE(
    CASE WHEN lv.destino_preferido IS NOT NULL THEN ARRAY[lv.destino_preferido::text] ELSE NULL END,
    p.destino_preferencia
  ) AS destino_preferencia,
  COALESCE(lv.preferencia_vacaciones, p.preferencia_vacaciones) AS preferencia_vacaciones,
  COALESCE(lv.numero_noches, p.numero_noches) AS numero_noches,
  COALESCE(lv.mes_preferencia, p.mes_preferencia) AS mes_preferencia,
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
  
  -- Coordinación (desde prospecto)
  p.coordinacion_id,
  p.ejecutivo_id
  
FROM llamadas_ventas lv
LEFT JOIN prospectos p ON lv.prospecto = p.id
WHERE lv.call_id IS NOT NULL;

-- ============================================
-- PASO 3: COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON VIEW live_monitor_view IS 
'Vista optimizada para Live Monitor que combina llamadas_ventas + prospectos 
con clasificación inteligente automática de estados de llamadas';

COMMENT ON FUNCTION clasificar_estado_llamada IS 
'Función que clasifica inteligentemente el estado de una llamada basándose en:
- razón_finalizacion de datos_llamada
- duracion_segundos
- tiempo transcurrido desde fecha_llamada
- presencia de audio_ruta_bucket
- call_status original';

-- ============================================
-- PASO 4: HABILITAR REALTIME EN TABLAS BASE
-- ============================================

-- Habilitar realtime en llamadas_ventas (si no está ya habilitado)
DO $$
BEGIN
  BEGIN
    ALTER publication supabase_realtime ADD TABLE llamadas_ventas;
    RAISE NOTICE '✅ Realtime habilitado en llamadas_ventas';
  EXCEPTION 
    WHEN duplicate_object THEN
      RAISE NOTICE 'ℹ️ llamadas_ventas ya tiene realtime habilitado';
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Error habilitando realtime en llamadas_ventas: %', SQLERRM;
  END;
END $$;

-- Habilitar realtime en prospectos (si no está ya habilitado)
DO $$
BEGIN
  BEGIN
    ALTER publication supabase_realtime ADD TABLE prospectos;
    RAISE NOTICE '✅ Realtime habilitado en prospectos';
  EXCEPTION 
    WHEN duplicate_object THEN
      RAISE NOTICE 'ℹ️ prospectos ya tiene realtime habilitado';
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Error habilitando realtime en prospectos: %', SQLERRM;
  END;
END $$;

-- ============================================
-- PASO 5: CREAR FUNCIÓN Y TRIGGERS PARA NOTIFICACIONES
-- ============================================

CREATE OR REPLACE FUNCTION notify_live_monitor_change()
RETURNS trigger AS $$
BEGIN
  -- Notificar cambio en la vista usando NOTIFY
  PERFORM pg_notify(
    'live_monitor_change',
    json_build_object(
      'table', 'live_monitor_view',
      'type', TG_OP,
      'call_id', COALESCE(NEW.call_id, OLD.call_id),
      'prospecto_id', COALESCE(NEW.prospecto, OLD.prospecto),
      'checkpoint', COALESCE(NEW.checkpoint_venta_actual, OLD.checkpoint_venta_actual),
      'call_status', COALESCE(NEW.call_status, OLD.call_status),
      'call_status_inteligente', clasificar_estado_llamada(
        COALESCE(NEW.call_status, OLD.call_status),
        COALESCE(NEW.datos_llamada, OLD.datos_llamada),
        COALESCE(NEW.duracion_segundos, OLD.duracion_segundos),
        COALESCE(NEW.fecha_llamada, OLD.fecha_llamada),
        COALESCE(NEW.audio_ruta_bucket, OLD.audio_ruta_bucket)::text
      ),
      'timestamp', NOW()
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear triggers en llamadas_ventas (solo si no existen)
DROP TRIGGER IF EXISTS live_monitor_llamadas_trigger ON llamadas_ventas;
CREATE TRIGGER live_monitor_llamadas_trigger
  AFTER INSERT OR UPDATE OR DELETE ON llamadas_ventas
  FOR EACH ROW EXECUTE FUNCTION notify_live_monitor_change();

-- Crear triggers en prospectos (solo si no existen)
DROP TRIGGER IF EXISTS live_monitor_prospectos_trigger ON prospectos;
CREATE TRIGGER live_monitor_prospectos_trigger
  AFTER INSERT OR UPDATE OR DELETE ON prospectos
  FOR EACH ROW EXECUTE FUNCTION notify_live_monitor_change();

-- ============================================
-- PASO 6: VERIFICACIÓN FINAL
-- ============================================

-- Verificar que la vista existe y es accesible
SELECT 
  '✅ Vista live_monitor_view creada exitosamente' AS resultado,
  COUNT(*) AS total_registros
FROM live_monitor_view;

-- Verificar triggers
SELECT 
  'TRIGGERS' AS seccion,
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers 
WHERE trigger_name LIKE 'live_monitor%'
ORDER BY event_object_table, trigger_name;

-- Verificar realtime
SELECT 
  'REALTIME' AS seccion,
  tablename,
  'HABILITADO' AS estado
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('llamadas_ventas', 'prospectos')
ORDER BY tablename;

-- Estadísticas de la vista
SELECT 
  '=== ESTADÍSTICAS VISTA LIVE MONITOR ===' AS info,
  COUNT(*) AS total_registros,
  COUNT(*) FILTER (WHERE call_status_inteligente = 'activa') AS activas_reales,
  COUNT(*) FILTER (WHERE call_status_inteligente = 'perdida') AS perdidas,
  COUNT(*) FILTER (WHERE call_status_inteligente = 'transferida') AS transferidas,
  COUNT(*) FILTER (WHERE call_status_inteligente = 'finalizada') AS finalizadas,
  COUNT(*) FILTER (WHERE call_status_bd != call_status_inteligente) AS reclasificadas
FROM live_monitor_view;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- 
-- ✅ La vista live_monitor_view está lista para usar
-- ✅ Realtime habilitado en tablas base
-- ✅ Triggers configurados para notificaciones
-- ✅ Clasificación inteligente funcionando
-- 
-- El componente Live Monitor ahora podrá cargar llamadas correctamente
-- ============================================

