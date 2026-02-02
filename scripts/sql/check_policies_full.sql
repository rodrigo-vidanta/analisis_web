-- Verificar definición exacta de las políticas
SELECT 
  policyname,
  cmd,
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'support_ticket_comments'
ORDER BY cmd, policyname;
