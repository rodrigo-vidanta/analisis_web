-- =================================================================
-- SCRIPT: Corregir función RPC get_conversations_ordered
-- =================================================================
-- Este script actualiza la función RPC para usar los nombres
-- de columna correctos de la tabla prospectos.
--
-- IMPORTANTE: Ejecutar en Supabase SQL Editor
-- Base de datos: pqnc_ai (analysisSupabase)
-- =================================================================

-- Eliminar la función existente si existe
DROP FUNCTION IF EXISTS public.get_conversations_ordered();

-- Crear la función correcta
CREATE OR REPLACE FUNCTION public.get_conversations_ordered()
RETURNS TABLE (
  prospecto_id uuid,
  nombre_contacto text,
  numero_telefono text,
  estado_prospecto text,
  fecha_creacion_prospecto timestamptz,
  fecha_ultimo_mensaje timestamptz,
  ultimo_mensaje text,
  mensajes_totales bigint,
  mensajes_no_leidos bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    p.id AS prospecto_id,
    COALESCE(p.nombre_completo, p.nombre_whatsapp, 'Sin nombre') AS nombre_contacto,
    p.whatsapp AS numero_telefono,
    p.etapa AS estado_prospecto,
    p.created_at AS fecha_creacion_prospecto,
    MAX(m.fecha_hora) AS fecha_ultimo_mensaje,
    (
      SELECT m2.mensaje 
      FROM mensajes_whatsapp m2 
      WHERE m2.prospecto_id = p.id 
      ORDER BY m2.fecha_hora DESC 
      LIMIT 1
    ) AS ultimo_mensaje,
    COUNT(m.id) AS mensajes_totales,
    COUNT(m.id) FILTER (WHERE m.leido IS NULL OR m.leido = false) AS mensajes_no_leidos
  FROM 
    prospectos p
  LEFT JOIN 
    mensajes_whatsapp m ON m.prospecto_id = p.id
  GROUP BY 
    p.id, p.nombre_completo, p.nombre_whatsapp, p.whatsapp, p.etapa, p.created_at
  HAVING 
    COUNT(m.id) > 0  -- Solo prospectos con al menos 1 mensaje
  ORDER BY 
    fecha_ultimo_mensaje DESC NULLS LAST;
$$;

-- Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.get_conversations_ordered() TO anon, authenticated, service_role;

-- Mensaje de confirmación
SELECT 'Función get_conversations_ordered actualizada correctamente' AS status;

