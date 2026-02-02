-- ============================================
-- LIMPIEZA: Políticas Redundantes de Support Tickets
-- ============================================
-- Fecha: 2 de Febrero 2026
-- Las políticas nuevas (RLS:) ya existen, eliminar las antiguas

-- ============================================
-- Eliminar políticas redundantes
-- ============================================

-- support_tickets (redundantes con "RLS: admins manage all tickets")
DROP POLICY IF EXISTS "Admins can delete tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON public.support_tickets;

-- support_ticket_history (redundante con "RLS: admins manage history")
DROP POLICY IF EXISTS "Admins can insert history" ON public.support_ticket_history;

-- support_ticket_attachments (redundantes)
DROP POLICY IF EXISTS "Admins can manage attachments" ON public.support_ticket_attachments;
DROP POLICY IF EXISTS "Users can upload attachments to own tickets" ON public.support_ticket_attachments;

-- ============================================
-- Verificación Final
-- ============================================
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('support_tickets', 'support_ticket_comments', 'support_ticket_history', 'support_ticket_attachments')
ORDER BY tablename, cmd, policyname;

-- Resultado esperado: 11 políticas limpias (solo con prefijo "RLS:")
-- support_tickets: 3 (select, insert, all)
-- support_ticket_comments: 3 (select, insert, all)
-- support_ticket_history: 2 (select, all)
-- support_ticket_attachments: 3 (select, insert, all)
