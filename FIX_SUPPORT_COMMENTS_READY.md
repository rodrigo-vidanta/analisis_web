# Fix: RLS en support_ticket_comments

**Fecha:** 2 de Febrero 2026  
**Problema:** Error 404 al enviar comentarios en tickets  
**Ticket afectado:** TKT-20260131-0065  
**Usuario reportante:** Usuario actual  

---

## 🔍 Diagnóstico

### Error Observado
```
POST https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/support_ticket_comments?select=*
404 (Not Found)
```

### Causa Raíz
El código frontend hace:
```typescript
.insert({ ... })
.select()
.single()
```

Esto requiere permisos de **SELECT inmediatamente después del INSERT**.

Las políticas RLS actuales **NO permiten** que el usuario vea el comentario recién insertado porque:
- Política de INSERT: ✅ Permite insertar
- Política de SELECT: ❌ No permite leer inmediatamente (falla en el `.select()`)

---

## ✅ Solución

### Archivo SQL
`scripts/sql/fix_support_ticket_comments_rls.sql`

### Cambios Aplicados
1. Eliminadas políticas antiguas conflictivas
2. Creadas 3 políticas nuevas:
   - **SELECT:** Usuarios ven comentarios públicos de sus tickets
   - **INSERT:** Usuarios pueden comentar sus tickets (solo públicos)
   - **ALL:** Admins tienen acceso completo

### Políticas Nuevas

#### 1. Lectura de comentarios
```sql
CREATE POLICY "RLS: users can read own ticket comments"
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
```

#### 2. Escritura de comentarios
```sql
CREATE POLICY "RLS: users can add comments to own tickets"
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
```

#### 3. Acceso administrativo
```sql
CREATE POLICY "RLS: admins full access to comments"
ON public.support_ticket_comments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'developer')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'developer')
  )
);
```

---

## 🚀 Pasos para Aplicar

### Opción 1: Supabase Dashboard (RECOMENDADO)

1. Ir a: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new
2. Copiar el contenido de `scripts/sql/fix_support_ticket_comments_rls.sql`
3. Ejecutar el script completo
4. Verificar que aparecen 3 políticas nuevas

### Opción 2: psql CLI

```bash
psql "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres" \
  -f scripts/sql/fix_support_ticket_comments_rls.sql
```

---

## 🧪 Test

### Test Manual en Frontend

1. Ir a un ticket (ej. TKT-20260131-0065)
2. Escribir un comentario
3. Enviar
4. **Resultado esperado:** ✅ Comentario se envía sin error 404
5. **Resultado esperado:** ✅ Comentario aparece inmediatamente en la conversación

### Test SQL en Supabase Dashboard

```sql
-- Simular usuario autenticado comentando
SET LOCAL request.jwt.claims TO '{"sub": "UUID_USUARIO_REAL", "role": "authenticated"}';

INSERT INTO support_ticket_comments (
  ticket_id, 
  user_id, 
  user_name, 
  user_role, 
  content, 
  is_internal
) VALUES (
  'UUID_TICKET_REAL',  -- TKT-20260131-0065
  'UUID_USUARIO_REAL',
  'Test User',
  'ejecutivo',
  'Test comment from RLS fix',
  FALSE
) RETURNING *;

-- Si retorna el registro, el fix está OK
```

---

## 📊 Verificación Post-Deploy

### Query de Verificación
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'support_ticket_comments'
ORDER BY cmd, policyname;
```

### Resultado Esperado
| policyname | cmd | roles |
|---|---|---|
| RLS: admins full access to comments | ALL | {authenticated} |
| RLS: users can add comments to own tickets | INSERT | {authenticated} |
| RLS: users can read own ticket comments | SELECT | {authenticated} |

---

## ⚠️ Consideraciones

### Seguridad Mantenida
- ✅ Usuarios NO pueden ver comentarios internos (is_internal = TRUE)
- ✅ Usuarios NO pueden comentar en tickets de otros
- ✅ Usuarios NO pueden marcar sus comentarios como internos
- ✅ Admins tienen acceso completo a todos los comentarios

### No Afecta a Otras Tablas
- ✅ `support_tickets`: Sin cambios
- ✅ `support_ticket_history`: Sin cambios
- ✅ `support_ticket_attachments`: Sin cambios

---

## 📝 Impacto

### Tablas Afectadas
- `support_ticket_comments` (3 políticas reemplazadas)

### Componentes Afectados
- `src/components/support/MyTicketsModal.tsx` (usuarios)
- `src/components/support/AdminTicketsPanel.tsx` (admins)
- `src/services/ticketService.ts` (método `addComment`)

### Downtime
- **0 segundos** - El script es idempotente y se ejecuta en <1s

---

## ✅ Estado

- [x] Script SQL creado
- [ ] **PENDIENTE:** Ejecutar en Supabase Dashboard
- [ ] Verificar que 3 políticas nuevas existen
- [ ] Test manual: Comentar en ticket
- [ ] Confirmar que no hay más errores 404

---

**Ejecutar este fix ANTES de continuar con el ticket del usuario.**
