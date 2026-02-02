## 🔴 ACCIÓN REQUERIDA: Fix RLS en Support Ticket Comments

**Fecha:** 2 de Febrero 2026  
**Prioridad:** 🔴 ALTA  
**Tiempo estimado:** 2 minutos  
**Downtime:** 0 segundos  

---

## 📋 Resumen Ejecutivo

El error 404 al enviar comentarios en tickets se debe a que las políticas RLS **no permiten SELECT inmediatamente después de INSERT**.

El código frontend hace:
```typescript
.insert({ ... })
.select()  // ❌ Falla aquí con 404
.single()
```

---

## ✅ Solución: 3 Pasos

### Paso 1: Abrir Supabase SQL Editor

```
https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new
```

### Paso 2: Ejecutar SQL Fix

Copiar y pegar el contenido de:
```
scripts/sql/fix_support_ticket_comments_rls.sql
```

**O copiar directamente este bloque:**

```sql
-- ============================================
-- FIX: RLS en support_ticket_comments
-- ============================================

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Users can view comments on own tickets" ON public.support_ticket_comments;
DROP POLICY IF EXISTS "Users can add comments to own tickets" ON public.support_ticket_comments;
DROP POLICY IF EXISTS "Admins full access to comments" ON public.support_ticket_comments;

-- LECTURA: Usuarios ven comentarios de sus tickets (no internos)
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

-- ESCRITURA: Usuarios pueden comentar sus tickets
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

-- ADMINS: Acceso completo
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

### Paso 3: Verificar

Ejecutar en el mismo SQL Editor:

```sql
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'support_ticket_comments'
ORDER BY cmd, policyname;
```

**Resultado esperado:**
| policyname | cmd |
|---|---|
| RLS: admins full access to comments | ALL |
| RLS: users can add comments to own tickets | INSERT |
| RLS: users can read own ticket comments | SELECT |

---

## 🧪 Test Post-Deploy

1. Ir al ticket: **TKT-20260131-0065**
2. Escribir un comentario de prueba
3. Enviar
4. ✅ Debe enviarse sin error 404
5. ✅ Debe aparecer inmediatamente en la conversación

---

## 📊 Impacto

### ✅ Ventajas
- Fix inmediato del error 404
- Seguridad mantenida (usuarios no ven internos)
- Compatible con código frontend existente

### ❌ Sin Riesgos
- Cambio solo en políticas RLS
- No afecta estructura de tablas
- No afecta código frontend
- Downtime: 0 segundos

---

## 📁 Archivos Creados

1. `scripts/sql/fix_support_ticket_comments_rls.sql` - Script SQL completo
2. `FIX_SUPPORT_COMMENTS_READY.md` - Documentación técnica
3. `CHANGELOG.md` - Actualizado con v2.5.75
4. `src/components/support/README_TICKETS.md` - Documentación actualizada
5. `public/docs/README_TICKETS.md` - Documentación pública actualizada

---

## ⏱️ Cronograma Sugerido

- **Ahora:** Ejecutar SQL fix (2 min)
- **+3 min:** Test manual en ticket TKT-20260131-0065
- **+5 min:** Confirmar fix a usuario

---

## 🔐 Seguridad

### ✅ Mantiene Políticas Seguras
- Usuarios NO ven comentarios internos
- Usuarios NO comentan en tickets ajenos
- Usuarios NO marcan sus comentarios como internos
- Admins tienen acceso completo

### ✅ Validaciones Adicionales
- `user_id = auth.uid()` (solo usuario autenticado)
- `is_internal = FALSE` (forzado en INSERT)
- `reporter_id = auth.uid()` (solo tickets propios)

---

## 📞 Siguiente Paso

**Ejecutar el SQL en Supabase Dashboard ahora.**

Una vez aplicado, el usuario podrá comentar sin problemas.
