# 🎯 PROBLEMA IDENTIFICADO: Triggers con auth_users

## Error Real

```
ERROR: 42P01: relation "auth_users" does not exist
CONTEXT: PL/pgSQL function is_support_admin(uuid)
         SQL statement "SELECT is_support_admin(NEW.user_id)"
         PL/pgSQL function notify_new_comment()
```

## Causa Raíz

El problema NO era RLS, sino un **TRIGGER** que se ejecuta después del INSERT:

1. Cuando insertas un comentario en `support_ticket_comments`
2. Se dispara el trigger `trigger_notify_new_comment`
3. El trigger llama a la función `notify_new_comment()`
4. Esta función llama a `is_support_admin(NEW.user_id)`
5. **`is_support_admin()` usa la tabla `auth_users` que fue eliminada**

## Funciones Afectadas

| Función | Problema | Solución |
|---|---|---|
| `is_support_admin(UUID)` | Usa `auth_users.role_id` | Cambiar a `user_profiles_v2.role_name` |
| `get_support_admin_ids()` | Usa `auth_users.role_id` | Cambiar a `user_profiles_v2.role_name` |

## Solución

### 1. Ejecutar Script de Corrección

**Archivo:** `scripts/sql/FIX_TRIGGER_AUTH_USERS.sql`

**Cómo ejecutar:**

1. Ir a Supabase Dashboard → SQL Editor
2. Copiar todo el contenido de `FIX_TRIGGER_AUTH_USERS.sql`
3. Ejecutar (Run)
4. Verificar mensajes:
   ```
   ✅ Función is_support_admin() funciona correctamente
   ✅ Función get_support_admin_ids() retorna X admins
   ```

### 2. Validar Corrección

Después de ejecutar el fix, **prueba de nuevo en el frontend**:

```bash
# En Browser Console (Ticket TKT-20260131-0065)
# Agregar un comentario normalmente
```

Debería funcionar sin errores.

## Cambios Aplicados

### Antes (ROTO)

```sql
CREATE OR REPLACE FUNCTION is_support_admin(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth_users  -- ❌ Tabla eliminada
    WHERE id = user_id_param
    AND role_id IN (...)      -- ❌ Campo no existe en user_profiles_v2
  );
END;
$$ LANGUAGE plpgsql;
```

### Después (CORRECTO)

```sql
CREATE OR REPLACE FUNCTION is_support_admin(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles_v2  -- ✅ Vista correcta
    WHERE id = user_id_param
    AND role_name IN ('admin', 'administrador_operativo', 'developer')  -- ✅ Usa role_name
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;
```

## Por Qué Pasó Esto

La migración de consolidación de BD (Enero 2025) movió todos los datos de autenticación a PQNC_AI y eliminó `auth_users`, pero algunas funciones SQL antiguas no se actualizaron.

## Archivos Relacionados

- **Script de Fix:** `scripts/sql/FIX_TRIGGER_AUTH_USERS.sql`
- **Migración Original (con error):** `migrations/20260130_fix_notifications_system_complete.sql`
- **Función Trigger:** `notify_new_comment()` (se ejecuta automáticamente)

## Verificación Post-Fix

```sql
-- Test 1: Función is_support_admin
SELECT is_support_admin('e8ced62c-3fd0-4328-b61a-a59ebea2e877'::uuid);
-- Esperado: TRUE (Samuel es admin)

-- Test 2: Función get_support_admin_ids
SELECT * FROM get_support_admin_ids();
-- Esperado: Lista de UUIDs de admins

-- Test 3: Insertar comentario (debería funcionar ahora)
SET LOCAL request.jwt.claims TO '{"sub": "e8ced62c-3fd0-4328-b61a-a59ebea2e877", "role": "authenticated"}';
INSERT INTO support_ticket_comments (
  ticket_id, user_id, user_name, user_role, content, is_internal
) VALUES (
  '101da1ce-36ba-4af1-91ea-41f5f6a43df6',
  'e8ced62c-3fd0-4328-b61a-a59ebea2e877',
  'Samuel Rosales',
  'admin',
  'Test después de fix',
  FALSE
) RETURNING *;
-- Esperado: INSERT exitoso
```

---

**Ejecuta el script y avísame si funciona.** 🚀
