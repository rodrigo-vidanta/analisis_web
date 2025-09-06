-- ============================================
-- FOREIGN KEYS CORREGIDOS - Sin IF NOT EXISTS
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- VERIFICAR SI LAS FOREIGN KEYS YA EXISTEN
SELECT 
    constraint_name, 
    table_name, 
    column_name
FROM information_schema.key_column_usage 
WHERE table_name = 'call_feedback' 
AND constraint_name LIKE 'fk_%';

-- FOREIGN KEY PARA created_by
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'call_feedback' 
        AND constraint_name = 'fk_call_feedback_created_by'
    ) THEN
        ALTER TABLE call_feedback 
        ADD CONSTRAINT fk_call_feedback_created_by 
        FOREIGN KEY (created_by) REFERENCES auth_users(id);
    END IF;
END $$;

-- FOREIGN KEY PARA updated_by
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'call_feedback' 
        AND constraint_name = 'fk_call_feedback_updated_by'
    ) THEN
        ALTER TABLE call_feedback 
        ADD CONSTRAINT fk_call_feedback_updated_by 
        FOREIGN KEY (updated_by) REFERENCES auth_users(id);
    END IF;
END $$;

-- FOREIGN KEY PARA call_id (relación con calls)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'call_feedback' 
        AND constraint_name = 'fk_call_feedback_call_id'
    ) THEN
        ALTER TABLE call_feedback 
        ADD CONSTRAINT fk_call_feedback_call_id 
        FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE;
    END IF;
END $$;

-- VERIFICAR RESULTADO FINAL
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
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'call_feedback';

-- RESULTADO ESPERADO:
-- Deberías ver 3 foreign keys:
-- 1. fk_call_feedback_created_by → auth_users(id)
-- 2. fk_call_feedback_updated_by → auth_users(id)  
-- 3. fk_call_feedback_call_id → calls(id)
