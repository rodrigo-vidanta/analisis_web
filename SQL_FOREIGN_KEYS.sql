-- ============================================
-- FOREIGN KEYS PARA TABLAS DE RETROALIMENTACIÓN
-- Ejecutar en Supabase SQL Editor después de crear las tablas
-- ============================================

-- Añadir foreign keys a call_feedback
ALTER TABLE call_feedback 
ADD CONSTRAINT fk_call_feedback_call_id 
FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE;

ALTER TABLE call_feedback 
ADD CONSTRAINT fk_call_feedback_created_by 
FOREIGN KEY (created_by) REFERENCES auth_users(id);

ALTER TABLE call_feedback 
ADD CONSTRAINT fk_call_feedback_updated_by 
FOREIGN KEY (updated_by) REFERENCES auth_users(id);

-- Añadir foreign keys a call_feedback_history
ALTER TABLE call_feedback_history 
ADD CONSTRAINT fk_feedback_history_feedback_id 
FOREIGN KEY (feedback_id) REFERENCES call_feedback(id) ON DELETE CASCADE;

ALTER TABLE call_feedback_history 
ADD CONSTRAINT fk_feedback_history_call_id 
FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE;

ALTER TABLE call_feedback_history 
ADD CONSTRAINT fk_feedback_history_changed_by 
FOREIGN KEY (changed_by) REFERENCES auth_users(id);

-- Verificar que las foreign keys se crearon correctamente
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('call_feedback', 'call_feedback_history');
