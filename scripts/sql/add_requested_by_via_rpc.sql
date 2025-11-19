-- Función RPC temporal para agregar el campo requested_by
-- Esta función se ejecutará una vez y luego se puede eliminar

CREATE OR REPLACE FUNCTION add_requested_by_column()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Agregar columna si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ui_error_log_ai_analysis' 
    AND column_name = 'requested_by'
  ) THEN
    ALTER TABLE public.ui_error_log_ai_analysis 
    ADD COLUMN requested_by UUID;
    
    CREATE INDEX IF NOT EXISTS idx_ui_error_log_ai_analysis_requested_by 
    ON public.ui_error_log_ai_analysis(requested_by);
    
    COMMENT ON COLUMN public.ui_error_log_ai_analysis.requested_by IS 'ID del usuario que solicitó el análisis de IA';
    
    RAISE NOTICE 'Campo requested_by agregado exitosamente';
  ELSE
    RAISE NOTICE 'Campo requested_by ya existe';
  END IF;
END;
$$;

-- Ejecutar la función
SELECT add_requested_by_column();

-- Eliminar la función temporal (opcional)
-- DROP FUNCTION IF EXISTS add_requested_by_column();

