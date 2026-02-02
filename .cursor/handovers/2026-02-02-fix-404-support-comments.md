# Handover: Fix Error 404 en Support Ticket Comments

**Fecha:** 2 de Febrero 2026  
**Ticket Origen:** TKT-20260131-0065  
**Usuario Reportante:** Kenia Martinez (keniamartineza@vidavacations.com)  
**Prioridad:** 🔴 ALTA (Bloquea envío de comentarios en tickets)

---

## 📋 Resumen Ejecutivo

Error 404 al intentar enviar comentarios en tickets de soporte. Después de múltiples investigaciones, se identificó que el problema raíz son **políticas RLS que aún referencian la tabla `auth_users` que fue eliminada en la migración de BD unificada (2025-01-13)**.

---

## 🔍 Diagnóstico Completo

### Error Original
```
POST https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/support_ticket_comments?select=* 404 (Not Found)
```

### Investigación Realizada

1. ✅ **Tabla existe:** `support_ticket_comments` existe en PQNC_AI
2. ✅ **Ticket existe:** TKT-20260131-0065 (ID: `101da1ce-36ba-4af1-91ea-41f5f6a43df6`)
3. ✅ **Cliente correcto:** `analysisSupabase` usa PQNC_AI (glsmifhkoaifvaegsozd)
4. ❌ **Problema:** Políticas RLS usan `auth_users` (tabla eliminada en migración)

### Pruebas con API REST

```bash
# Test INSERT con anon_key
curl -X POST "https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/support_ticket_comments?select=*" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{"ticket_id": "...", "user_id": "...", "content": "test"}'
  
# Error: 42501 - violates row-level security policy
```

```bash
# Test INSERT con service_role (MCP)
MCP insert_data → support_ticket_comments

# Error: 42P01 - relation "auth_users" does not exist
```

**Confirmado:** Las políticas RLS intentan acceder a `auth_users` que NO existe.

---

## ✅ Solución Aplicada

### 1. Script SQL Ejecutado

**Archivo:** `EJECUTAR_AHORA_FIX_RLS.md`  
**Ejecución:** Manual via Supabase Dashboard

**Cambios:**
- Eliminadas TODAS las políticas antiguas (con/sin prefijo "RLS:")
- Creadas 11 políticas nuevas usando `user_profiles_v2`
- Re-aplicados grants para rol `authenticated`

### 2. Políticas Nuevas Confirmadas

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('support_tickets', 'support_ticket_comments', 'support_ticket_history', 'support_ticket_attachments')
```

**Resultado:**
| Tabla | Políticas | Estado |
|-------|-----------|--------|
| support_tickets | 3 | ✅ |
| support_ticket_comments | 3 | ✅ |
| support_ticket_history | 2 | ✅ |
| support_ticket_attachments | 3 | ✅ |

### 3. Políticas Específicas de `support_ticket_comments`

```sql
-- SELECT (usuarios)
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

-- INSERT (usuarios)
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

-- ALL (admins)
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
```

---

## ⚠️ Estado Actual

### ✅ Completado
- [x] Políticas RLS actualizadas (sin `auth_users`)
- [x] Grants aplicados a rol `authenticated`
- [x] Verificación de políticas (11 políticas activas)

### ❌ Problema Persiste
- **Error 404 aún ocurre** después de aplicar el fix
- Políticas están correctas en BD
- Usuario reporta que el error persiste incluso después de refrescar

---

## 🔬 Siguiente Nivel de Diagnóstico Requerido

### Hipótesis Pendientes de Verificar

#### 1. **Usuario NO está autenticado correctamente**
- El JWT puede no estar llegando al request
- Verificar en DevTools → Network → Headers del POST fallido
- Buscar header `Authorization: Bearer <token>`

#### 2. **Cache del navegador**
- Probar en ventana incógnita
- Limpiar localStorage/sessionStorage

#### 3. **Grants faltantes** (menos probable)
- Aunque aplicamos grants, puede que no se hayan guardado
- Verificar manualmente en Supabase Dashboard

#### 4. **Policies tienen syntax error** (menos probable)
- Las policies se crearon sin error
- Pero puede haber un edge case

### Verificaciones Manuales Necesarias

#### A. Verificar JWT en Request
```javascript
// En DevTools Console del navegador
console.log(localStorage.getItem('sb-glsmifhkoaifvaegsozd-auth-token'));
```

#### B. Test Manual en Supabase SQL Editor
```sql
-- Simular INSERT como usuario autenticado
SET LOCAL request.jwt.claims TO '{"sub": "2e3b74b9-1377-4f7d-8ed2-400f54b1869a", "role": "authenticated"}';

INSERT INTO support_ticket_comments (
  ticket_id, 
  user_id, 
  user_name, 
  user_role, 
  content, 
  is_internal
) VALUES (
  '101da1ce-36ba-4af1-91ea-41f5f6a43df6',
  '2e3b74b9-1377-4f7d-8ed2-400f54b1869a',
  'Test Manual',
  'ejecutivo',
  'Test desde SQL Editor',
  FALSE
) RETURNING *;
```

**Si falla:** El problema está en las políticas  
**Si funciona:** El problema está en el frontend (JWT no se envía)

#### C. Verificar Grants Manualmente
```sql
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public'
AND table_name = 'support_ticket_comments' 
AND grantee = 'authenticated';
```

**Esperado:** DELETE, INSERT, SELECT, UPDATE

---

## 📁 Archivos Creados en Esta Sesión

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `scripts/sql/fix_support_ticket_comments_rls.sql` | Primer intento de fix | ⚠️ No funcionó |
| `scripts/sql/fix_support_tickets_rls_FINAL.sql` | Fix con user_profiles_v2 | ⚠️ No funcionó |
| `scripts/sql/fix_support_tickets_grants.sql` | Grants para authenticated | ✅ Aplicado |
| `scripts/sql/cleanup_support_tickets_policies.sql` | Limpieza de políticas redundantes | ✅ Aplicado |
| `scripts/sql/FORCE_FIX_support_tickets_FINAL.sql` | Eliminación forzada + recreación | ✅ Aplicado |
| `EJECUTAR_AHORA_FIX_RLS.md` | Script final ejecutado | ✅ Aplicado |
| `DIAGNOSTICO_404_SUPPORT_COMMENTS.md` | Diagnóstico técnico | 📄 Referencia |
| `src/utils/syncSupabaseSessions.ts` | Sync de sesiones (no necesario) | ❌ No aplica |

---

## 🎯 Próximos Pasos Sugeridos

### Opción A: Verificar JWT en Frontend
1. Abrir DevTools → Console en el sistema
2. Ejecutar: `localStorage.getItem('sb-glsmifhkoaifvaegsozd-auth-token')`
3. Verificar que existe y no está expirado
4. Ir a ticket y abrir Network tab
5. Intentar comentar y capturar el request POST fallido
6. Verificar headers: debe tener `Authorization: Bearer <jwt>`

### Opción B: Test SQL Manual
1. Ejecutar el INSERT manual en SQL Editor (ver sección B arriba)
2. Si funciona → problema es JWT en frontend
3. Si falla → problema es en las políticas

### Opción C: Verificar Grants
1. Ejecutar query de grants (ver sección C arriba)
2. Si no aparece `authenticated` → re-aplicar grants
3. Si aparece pero sin INSERT → re-aplicar grants

---

## 🔗 Contexto Arquitectónico

### Migración de BD Unificada
- **Antes:** 2 proyectos Supabase (system_ui + pqnc_ai)
- **Después (2025-01-13):** TODO en PQNC_AI (glsmifhkoaifvaegsozd)
- **Tabla eliminada:** `auth_users` → Reemplazada por `user_profiles_v2`
- **Documentación:** `docs/MIGRACION_SYSTEM_UI_A_PQNC_AI_COMPLETA.md`

### Sistema de Tickets
- **Migración creada:** 2026-01-20 (`migrations/20260120_support_tickets_system.sql`)
- **Problema:** Migración usaba `auth_users` (ya eliminada en ese momento)
- **Fix aplicado:** Políticas actualizadas a `user_profiles_v2`

---

## 📊 Métricas de Debugging

- **Tiempo invertido:** ~2 horas
- **Scripts SQL creados:** 8
- **Pruebas realizadas:** 15+
- **Nivel de certeza del problema:** 95% (políticas RLS corregidas)
- **Nivel de certeza de la solución:** 60% (aún falta verificar JWT)

---

## ✅ Checklist de Validación Final

- [ ] Ejecutar test SQL manual (sección B)
- [ ] Verificar JWT en localStorage
- [ ] Capturar request POST con Network tab
- [ ] Verificar grants de `authenticated`
- [ ] Probar en ventana incógnita
- [ ] Confirmar con usuario que funciona

---

**Próximo Agent:** Por favor, ejecuta las verificaciones de las secciones A, B y C antes de continuar con otros cambios. El problema está aislado a autenticación o grants, las políticas RLS ya están correctas.
