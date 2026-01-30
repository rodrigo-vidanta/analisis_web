-- Verificar si la función get_dashboard_conversations incluye etapa_id
SELECT 
  routine_name,
  routine_type,
  specific_name,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_dashboard_conversations';

-- Ver las columnas de retorno de la función
SELECT 
  parameter_name,
  data_type,
  parameter_mode
FROM information_schema.parameters
WHERE specific_name IN (
  SELECT specific_name 
  FROM information_schema.routines
  WHERE routine_name = 'get_dashboard_conversations'
)
ORDER BY ordinal_position;
