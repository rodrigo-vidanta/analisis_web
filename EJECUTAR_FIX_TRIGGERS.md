# 🎯 ACCIÓN REQUERIDA: Fix Triggers Rotos en Support Tickets

**Fecha:** 02-02-2026  
**Prioridad:** 🔴 CRÍTICO  
**Tiempo estimado:** 2 minutos

---

## 🐛 Problema Identificado

El error 404 al enviar comentarios NO era de RLS (las políticas estaban correctas), sino de un **TRIGGER roto**:

```
ERROR: relation "auth_users" does not exist
CONTEXT: PL/pgSQL function is_support_admin(uuid)
         PL/pgSQL function notify_new_comment()
```

**Causa:** Funciones `is_support_admin()` y `get_support_admin_ids()` usan tabla `auth_users` (eliminada en migración de BD unificada).

---

## ✅ Solución

### Ejecutar 1 Script SQL

**Archivo:** `scripts/sql/FIX_TRIGGER_AUTH_USERS.sql`

**Pasos:**

1. Abrir Supabase Dashboard → SQL Editor
2. Copiar TODO el contenido del archivo
3. Click en "RUN"
4. Verificar mensajes:
   ```
   ✅ Función is_support_admin() funciona correctamente
   ✅ Función get_support_admin_ids() retorna X admins
   ```

**Eso es todo.** El fix corrige:
- `is_support_admin(UUID)` → usa `user_profiles_v2` en lugar de `auth_users`
- `get_support_admin_ids()` → usa `user_profiles_v2` en lugar de `auth_users`

---

## 🧪 Validación

Después de ejecutar el script:

```bash
# 1. Ir al ticket TKT-20260131-0065 en el frontend
# 2. Escribir un comentario
# 3. Enviar
# Esperado: ✅ Comentario enviado sin error 404
```

---

## 📁 Archivos Relevantes

| Archivo | Descripción |
|---------|-------------|
| `scripts/sql/FIX_TRIGGER_AUTH_USERS.sql` | **EJECUTAR ESTE** |
| `FIX_TRIGGER_AUTH_USERS_README.md` | Documentación completa |
| `.cursor/handovers/2026-02-02-fix-triggers-auth-users.md` | Handover detallado |

---

## 🔗 Qué Cambia

**ANTES (ROTO):**
```sql
SELECT 1 FROM auth_users WHERE role_id IN (...)  -- ❌ Tabla eliminada
```

**DESPUÉS (CORRECTO):**
```sql
SELECT 1 FROM user_profiles_v2 WHERE role_name IN ('admin', 'administrador_operativo', 'developer')  -- ✅
```

---

**Ejecuta el script y avísame si funciona.** 🚀
