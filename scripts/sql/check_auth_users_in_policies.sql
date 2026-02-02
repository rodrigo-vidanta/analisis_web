-- Verificar si las políticas actuales tienen auth_users
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual::text LIKE '%auth_users%' THEN '❌ USA auth_users'
    WHEN with_check::text LIKE '%auth_users%' THEN '❌ USA auth_users'
    ELSE '✅ OK'
  END as status,
  substring(qual::text, 1, 100) as using_clause,
  substring(with_check::text, 1, 100) as with_check_clause
FROM pg_policies
WHERE tablename = 'support_ticket_comments'
ORDER BY cmd, policyname;
