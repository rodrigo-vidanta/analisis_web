-- Migración de admin_messages de system_ui a pqnc_ai
-- Solo inserta registros que no existen en pqnc_ai (basado en ID)

INSERT INTO admin_messages (
  id, category, title, message, sender_id, sender_email, recipient_id, 
  recipient_role, status, priority, metadata, resolved_at, resolved_by, 
  resolved_note, read_at, read_by, created_at, updated_at
)
SELECT 
  id, category, title, message, sender_id, sender_email, recipient_id, 
  recipient_role, status, priority, metadata, resolved_at, resolved_by, 
  resolved_note, read_at, read_by, created_at, updated_at
FROM backup_migration_20250113.admin_messages
WHERE id NOT IN (SELECT id FROM admin_messages)
ON CONFLICT (id) DO NOTHING;
