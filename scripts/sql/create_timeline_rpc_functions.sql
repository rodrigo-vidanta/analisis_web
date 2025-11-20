-- ============================================
-- FUNCIONES RPC PARA TIMELINE ACTIVITIES
-- Base de datos: system_ui (glsmifhkoaifvaegsozd.supabase.co)
-- ============================================
-- Funciones RPC para manejar timeline_activities con validación explícita
-- del user_id, evitando problemas con RLS y auth.uid()

-- Función para crear múltiples actividades
CREATE OR REPLACE FUNCTION create_timeline_activities(
  p_activities JSONB,
  p_user_id UUID
)
RETURNS SETOF timeline_activities
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  activity_item JSONB;
  inserted_row timeline_activities;
BEGIN
  -- Validar que el user_id no sea NULL
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id no puede ser NULL';
  END IF;

  -- Iterar sobre cada actividad en el array
  FOR activity_item IN SELECT * FROM jsonb_array_elements(p_activities)
  LOOP
    -- Insertar actividad asegurando que user_id coincida con el parámetro
    INSERT INTO timeline_activities (
      user_id,
      title,
      description,
      due_date,
      status,
      priority,
      metadata
    ) VALUES (
      p_user_id, -- Siempre usar el user_id del parámetro
      activity_item->>'title',
      NULLIF(activity_item->>'description', ''),
      (activity_item->>'due_date')::DATE,
      COALESCE(activity_item->>'status', 'pending'),
      COALESCE(activity_item->>'priority', 'medium'),
      COALESCE((activity_item->'metadata')::jsonb, '{}'::jsonb)
    )
    RETURNING * INTO inserted_row;
    
    -- Retornar la fila insertada
    RETURN NEXT inserted_row;
  END LOOP;
  
  RETURN;
END;
$$;

-- Función para obtener actividades de un usuario
CREATE OR REPLACE FUNCTION get_timeline_activities(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  title VARCHAR,
  description TEXT,
  due_date DATE,
  status VARCHAR,
  priority VARCHAR,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validar que el user_id no sea NULL
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id no puede ser NULL';
  END IF;

  RETURN QUERY
  SELECT 
    ta.id,
    ta.user_id,
    ta.title,
    ta.description,
    ta.due_date,
    ta.status,
    ta.priority,
    ta.metadata,
    ta.created_at,
    ta.updated_at,
    ta.completed_at
  FROM timeline_activities ta
  WHERE ta.user_id = p_user_id
  ORDER BY ta.due_date ASC, 
           CASE ta.priority
             WHEN 'urgent' THEN 1
             WHEN 'high' THEN 2
             WHEN 'medium' THEN 3
             WHEN 'low' THEN 4
           END ASC;
END;
$$;

-- Comentarios
COMMENT ON FUNCTION create_timeline_activities IS 'Crea múltiples actividades de timeline para un usuario específico';
COMMENT ON FUNCTION get_timeline_activities IS 'Obtiene todas las actividades de timeline de un usuario específico';

