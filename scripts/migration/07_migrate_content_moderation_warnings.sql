-- Migración de content_moderation_warnings de system_ui a pqnc_ai
-- Inserta todos los registros ya que pqnc_ai no tiene registros en esta tabla

INSERT INTO content_moderation_warnings (
  id, user_id, user_email, input_text, warning_reason, warning_category,
  output_selected, was_sent, conversation_id, prospect_id, ip_address,
  user_agent, created_at
)
SELECT 
  id, user_id, user_email, input_text, warning_reason, warning_category,
  output_selected, was_sent, conversation_id, prospect_id, ip_address,
  user_agent, created_at
FROM backup_migration_20250113.content_moderation_warnings
ON CONFLICT (id) DO NOTHING;
