-- ============================================
-- MIGRACIÓN USANDO FOREIGN TABLES (postgres_fdw)
-- ============================================
-- 
-- Este script crea foreign tables temporales y migra datos directamente
-- REQUIERE: Que se haya ejecutado 12_setup_database_connection.sql primero
--
-- ============================================

-- ============================================
-- 1. CREAR FOREIGN TABLES TEMPORALES
-- ============================================

-- Foreign table para prospect_assignments
CREATE FOREIGN TABLE IF NOT EXISTS system_ui_prospect_assignments (
    id uuid,
    prospect_id uuid,
    coordinacion_id uuid,
    ejecutivo_id uuid,
    assigned_at timestamptz,
    assigned_by uuid,
    assignment_type text,
    assignment_reason text,
    unassigned_at timestamptz,
    is_active boolean,
    created_at timestamptz,
    updated_at timestamptz
)
SERVER system_ui_server
OPTIONS (schema_name 'public', table_name 'prospect_assignments');

-- Foreign table para assignment_logs
CREATE FOREIGN TABLE IF NOT EXISTS system_ui_assignment_logs (
    id uuid,
    prospect_id uuid,
    coordinacion_id uuid,
    ejecutivo_id uuid,
    action text,
    assigned_by uuid,
    reason text,
    metadata jsonb,
    created_at timestamptz
)
SERVER system_ui_server
OPTIONS (schema_name 'public', table_name 'assignment_logs');

-- Foreign table para whatsapp_conversation_labels
CREATE FOREIGN TABLE IF NOT EXISTS system_ui_whatsapp_conversation_labels (
    id uuid,
    prospecto_id uuid,
    label_id uuid,
    label_type text,
    shadow_cell boolean,
    added_by uuid,
    added_at timestamptz,
    assigned_by_role text,
    assigned_by_coordinacion_id uuid
)
SERVER system_ui_server
OPTIONS (schema_name 'public', table_name 'whatsapp_conversation_labels');

-- Foreign table para paraphrase_logs
CREATE FOREIGN TABLE IF NOT EXISTS system_ui_paraphrase_logs (
    id uuid,
    user_id uuid,
    user_email text,
    input_text text,
    option1 text,
    option2 text,
    output_selected text,
    selected_option_number integer,
    has_moderation_warning boolean,
    warning_id uuid,
    conversation_id uuid,
    prospect_id uuid,
    model_used text,
    processing_time_ms integer,
    created_at timestamptz
)
SERVER system_ui_server
OPTIONS (schema_name 'public', table_name 'paraphrase_logs');

-- ============================================
-- 2. VERIFICAR CONEXIÓN CON FOREIGN TABLES
-- ============================================

-- Probar consulta a foreign table
SELECT COUNT(*) as total_registros
FROM system_ui_prospect_assignments;

-- ============================================
-- 3. MIGRAR prospect_assignments (185 registros)
-- ============================================

INSERT INTO prospect_assignments (
    id, prospect_id, coordinacion_id, ejecutivo_id, 
    assigned_at, assigned_by, assignment_type, assignment_reason, 
    unassigned_at, is_active, created_at, updated_at
)
SELECT 
    id, prospect_id, coordinacion_id, ejecutivo_id,
    assigned_at, assigned_by, assignment_type, assignment_reason,
    unassigned_at, is_active, created_at, updated_at
FROM system_ui_prospect_assignments
WHERE NOT EXISTS (
    SELECT 1 FROM prospect_assignments WHERE prospect_assignments.id = system_ui_prospect_assignments.id
)
ON CONFLICT (id) DO UPDATE SET
    prospect_id = EXCLUDED.prospect_id,
    coordinacion_id = EXCLUDED.coordinacion_id,
    ejecutivo_id = EXCLUDED.ejecutivo_id,
    assigned_at = EXCLUDED.assigned_at,
    assigned_by = EXCLUDED.assigned_by,
    assignment_type = EXCLUDED.assignment_type,
    assignment_reason = EXCLUDED.assignment_reason,
    unassigned_at = EXCLUDED.unassigned_at,
    is_active = EXCLUDED.is_active,
    updated_at = EXCLUDED.updated_at;

-- ============================================
-- 4. MIGRAR assignment_logs (265 registros)
-- ============================================

INSERT INTO assignment_logs (
    id, prospect_id, coordinacion_id, ejecutivo_id,
    action, assigned_by, reason, metadata, created_at
)
SELECT 
    id, prospect_id, coordinacion_id, ejecutivo_id,
    action, assigned_by, reason, metadata, created_at
FROM system_ui_assignment_logs
WHERE NOT EXISTS (
    SELECT 1 FROM assignment_logs WHERE assignment_logs.id = system_ui_assignment_logs.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. MIGRAR whatsapp_conversation_labels (286 registros)
-- ============================================

INSERT INTO whatsapp_conversation_labels (
    id, prospecto_id, label_id, label_type, shadow_cell,
    added_by, added_at, assigned_by_role, assigned_by_coordinacion_id
)
SELECT 
    id, prospecto_id, label_id, label_type, shadow_cell,
    added_by, added_at, assigned_by_role, assigned_by_coordinacion_id
FROM system_ui_whatsapp_conversation_labels
WHERE NOT EXISTS (
    SELECT 1 FROM whatsapp_conversation_labels 
    WHERE whatsapp_conversation_labels.prospecto_id = system_ui_whatsapp_conversation_labels.prospecto_id
      AND whatsapp_conversation_labels.label_id = system_ui_whatsapp_conversation_labels.label_id
)
ON CONFLICT (prospecto_id, label_id) DO UPDATE SET
    label_type = EXCLUDED.label_type,
    shadow_cell = EXCLUDED.shadow_cell,
    added_by = EXCLUDED.added_by,
    added_at = EXCLUDED.added_at,
    assigned_by_role = EXCLUDED.assigned_by_role,
    assigned_by_coordinacion_id = EXCLUDED.assigned_by_coordinacion_id;

-- ============================================
-- 6. MIGRAR paraphrase_logs (2,545 registros) - EN LOTES
-- ============================================

DO $$
DECLARE
    batch_size INTEGER := 500;
    offset_val INTEGER := 0;
    total_records INTEGER;
    records_inserted INTEGER;
BEGIN
    -- Obtener total de registros
    SELECT COUNT(*) INTO total_records FROM system_ui_paraphrase_logs;
    
    RAISE NOTICE 'Total de registros a migrar: %', total_records;
    
    -- Migrar en lotes
    WHILE offset_val < total_records LOOP
        INSERT INTO paraphrase_logs (
            id, user_id, user_email, input_text, option1, option2,
            output_selected, selected_option_number, has_moderation_warning,
            warning_id, conversation_id, prospect_id, model_used,
            processing_time_ms, created_at
        )
        SELECT 
            id, user_id, user_email, input_text, option1, option2,
            output_selected, selected_option_number, has_moderation_warning,
            warning_id, conversation_id, prospect_id, model_used,
            processing_time_ms, created_at
        FROM system_ui_paraphrase_logs
        ORDER BY created_at
        LIMIT batch_size OFFSET offset_val
        ON CONFLICT (id) DO NOTHING;
        
        GET DIAGNOSTICS records_inserted = ROW_COUNT;
        offset_val := offset_val + batch_size;
        RAISE NOTICE 'Migrados % registros hasta offset: %', records_inserted, offset_val;
    END LOOP;
    
    RAISE NOTICE 'Migración de paraphrase_logs completada';
END $$;

-- ============================================
-- 7. VERIFICAR RESULTADOS
-- ============================================

SELECT 
    'prospect_assignments' as tabla,
    COUNT(*) as registros_migrados
FROM prospect_assignments
UNION ALL
SELECT 
    'assignment_logs' as tabla,
    COUNT(*) as registros_migrados
FROM assignment_logs
UNION ALL
SELECT 
    'whatsapp_conversation_labels' as tabla,
    COUNT(*) as registros_migrados
FROM whatsapp_conversation_labels
UNION ALL
SELECT 
    'paraphrase_logs' as tabla,
    COUNT(*) as registros_migrados
FROM paraphrase_logs;

-- ============================================
-- 8. LIMPIAR FOREIGN TABLES (OPCIONAL)
-- ============================================

-- Descomentar si quieres eliminar las foreign tables después de la migración
-- DROP FOREIGN TABLE IF EXISTS system_ui_prospect_assignments;
-- DROP FOREIGN TABLE IF EXISTS system_ui_assignment_logs;
-- DROP FOREIGN TABLE IF EXISTS system_ui_whatsapp_conversation_labels;
-- DROP FOREIGN TABLE IF EXISTS system_ui_paraphrase_logs;
