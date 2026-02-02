# 🚀 EJECUTAR MANUALMENTE - Fix Support Tickets RLS

**EJECUTA ESTO AHORA EN SUPABASE DASHBOARD**

---

## 📍 URL para ejecutar:
```
https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new
```

---

## 📋 SCRIPT A EJECUTAR (Copiar TODO):

```sql
-- ============================================
-- PASO 1: Eliminar políticas antiguas
-- ============================================

DROP POLICY IF EXISTS "RLS: admins full access comments" ON public.support_ticket_comments;
DROP POLICY IF EXISTS "RLS: users add comments" ON public.support_ticket_comments;
DROP POLICY IF EXISTS "RLS: users read own ticket comments" ON public.support_ticket_comments;
DROP POLICY IF EXISTS "Admins full access to comments" ON public.support_ticket_comments;
DROP POLICY IF EXISTS "Users can add comments to own tickets" ON public.support_ticket_comments;
DROP POLICY IF EXISTS "Users can view comments on own tickets" ON public.support_ticket_comments;

DROP POLICY IF EXISTS "RLS: admins manage all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "RLS: users create tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "RLS: users view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;

DROP POLICY IF EXISTS "RLS: admins manage history" ON public.support_ticket_history;
DROP POLICY IF EXISTS "RLS: users view history" ON public.support_ticket_history;

DROP POLICY IF EXISTS "RLS: admins manage attachments" ON public.support_ticket_attachments;
DROP POLICY IF EXISTS "RLS: users upload attachments" ON public.support_ticket_attachments;
DROP POLICY IF EXISTS "RLS: users view attachments" ON public.support_ticket_attachments;

-- ============================================
-- PASO 2: Crear políticas nuevas (SIN auth_users)
-- ============================================

-- SUPPORT_TICKETS
CREATE POLICY "users_view_own_tickets"
ON public.support_tickets FOR SELECT
TO authenticated
USING (reporter_id = auth.uid());

CREATE POLICY "users_create_tickets"
ON public.support_tickets FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "admins_manage_tickets"
ON public.support_tickets FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'developer')
  )
);

-- SUPPORT_TICKET_COMMENTS
CREATE POLICY "users_read_comments"
ON public.support_ticket_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_ticket_comments.ticket_id
    AND reporter_id = auth.uid()
  )
  AND is_internal = FALSE
);

CREATE POLICY "users_add_comments"
ON public.support_ticket_comments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_ticket_comments.ticket_id
    AND reporter_id = auth.uid()
  )
  AND user_id = auth.uid()
  AND is_internal = FALSE
);

CREATE POLICY "admins_manage_comments"
ON public.support_ticket_comments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'developer')
  )
);

-- SUPPORT_TICKET_HISTORY
CREATE POLICY "users_view_history"
ON public.support_ticket_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_ticket_history.ticket_id
    AND reporter_id = auth.uid()
  )
);

CREATE POLICY "admins_manage_history"
ON public.support_ticket_history FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'developer')
  )
);

-- SUPPORT_TICKET_ATTACHMENTS
CREATE POLICY "users_view_attachments"
ON public.support_ticket_attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_ticket_attachments.ticket_id
    AND reporter_id = auth.uid()
  )
);

CREATE POLICY "users_upload_attachments"
ON public.support_ticket_attachments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_ticket_attachments.ticket_id
    AND reporter_id = auth.uid()
  )
  AND uploaded_by = auth.uid()
);

CREATE POLICY "admins_manage_attachments"
ON public.support_ticket_attachments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'developer')
  )
);

-- ============================================
-- PASO 3: Grants
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_comments TO authenticated;
GRANT SELECT, INSERT ON public.support_ticket_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_attachments TO authenticated;

-- ============================================
-- PASO 4: Verificación
-- ============================================

SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('support_tickets', 'support_ticket_comments', 'support_ticket_history', 'support_ticket_attachments')
ORDER BY tablename, cmd, policyname;
```

---

## ✅ Resultado Esperado:

Deberías ver **11 políticas**:
- `support_tickets`: 3 políticas
- `support_ticket_comments`: 3 políticas
- `support_ticket_history`: 2 políticas
- `support_ticket_attachments`: 3 políticas

**TODAS** con nombres nuevos (sin prefijo "RLS:")

---

## 🧪 Después de Ejecutar:

1. **Refrescar la página del sistema**
2. **Ir al ticket:** TKT-20260131-0065
3. **Escribir comentario:** "Fix aplicado - testing final"
4. **Enviar**
5. **Resultado esperado:** ✅ Sin error 404, comentario aparece

---

## ⚠️ SI FALLA:

Copia el error completo y pégalo aquí para diagnosticar.

---

**EJECUTA EL SCRIPT COMPLETO AHORA EN:**
https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new
