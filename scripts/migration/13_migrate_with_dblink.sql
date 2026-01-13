-- ============================================
-- MIGRACIÓN USANDO dblink/postgres_fdw
-- ============================================
-- 
-- Este script migra las tablas grandes usando conexión directa entre bases de datos
-- REQUIERE: Que se haya ejecutado 12_setup_database_connection.sql primero
--
-- ============================================

-- ============================================
-- 1. MIGRAR prospect_assignments (185 registros)
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
FROM dblink('system_ui_server', 
    'SELECT id, prospect_id, coordinacion_id, ejecutivo_id, assigned_at, assigned_by, assignment_type, assignment_reason, unassigned_at, is_active, created_at, updated_at FROM prospect_assignments'
) AS t(
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
WHERE NOT EXISTS (
    SELECT 1 FROM prospect_assignments WHERE prospect_assignments.id = t.id
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
-- 2. MIGRAR assignment_logs (265 registros)
-- ============================================

INSERT INTO assignment_logs (
    id, prospect_id, coordinacion_id, ejecutivo_id,
    action, assigned_by, reason, metadata, created_at
)
SELECT 
    id, prospect_id, coordinacion_id, ejecutivo_id,
    action, assigned_by, reason, metadata, created_at
FROM dblink('system_ui_server',
    'SELECT id, prospect_id, coordinacion_id, ejecutivo_id, action, assigned_by, reason, metadata, created_at FROM assignment_logs'
) AS t(
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
WHERE NOT EXISTS (
    SELECT 1 FROM assignment_logs WHERE assignment_logs.id = t.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. MIGRAR whatsapp_conversation_labels (286 registros)
-- ============================================

INSERT INTO whatsapp_conversation_labels (
    id, prospecto_id, label_id, label_type, shadow_cell,
    added_by, added_at, assigned_by_role, assigned_by_coordinacion_id
)
SELECT 
    id, prospecto_id, label_id, label_type, shadow_cell,
    added_by, added_at, assigned_by_role, assigned_by_coordinacion_id
FROM dblink('system_ui_server',
    'SELECT id, prospecto_id, label_id, label_type, shadow_cell, added_by, added_at, assigned_by_role, assigned_by_coordinacion_id FROM whatsapp_conversation_labels'
) AS t(
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
WHERE NOT EXISTS (
    SELECT 1 FROM whatsapp_conversation_labels WHERE whatsapp_conversation_labels.id = t.id
)
ON CONFLICT (prospecto_id, label_id) DO UPDATE SET
    label_type = EXCLUDED.label_type,
    shadow_cell = EXCLUDED.shadow_cell,
    added_by = EXCLUDED.added_by,
    added_at = EXCLUDED.added_at,
    assigned_by_role = EXCLUDED.assigned_by_role,
    assigned_by_coordinacion_id = EXCLUDED.assigned_by_coordinacion_id;

-- ============================================
-- 4. MIGRAR paraphrase_logs (2,545 registros) - EN LOTES
-- ============================================

DO $$
DECLARE
    batch_size INTEGER := 500;
    offset_val INTEGER := 0;
    total_records INTEGER;
    records_inserted INTEGER;
BEGIN
    -- Obtener total de registros
    SELECT COUNT(*) INTO total_records
    FROM dblink('system_ui_server', 
        'SELECT COUNT(*) FROM paraphrase_logs'
    ) AS t(count bigint);
    
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
        FROM dblink('system_ui_server', 
            format('SELECT id, user_id, user_email, input_text, option1, option2, output_selected, selected_option_number, has_moderation_warning, warning_id, conversation_id, prospect_id, model_used, processing_time_ms, created_at FROM paraphrase_logs ORDER BY created_at LIMIT %s OFFSET %s', 
                batch_size, offset_val)
        ) AS t(
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
        ON CONFLICT (id) DO NOTHING;
        
        GET DIAGNOSTICS records_inserted = ROW_COUNT;
        offset_val := offset_val + batch_size;
        RAISE NOTICE 'Migrados % registros hasta offset: %', records_inserted, offset_val;
    END LOOP;
    
    RAISE NOTICE 'Migración de paraphrase_logs completada';
END $$;

-- ============================================
-- VERIFICAR RESULTADOS
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
