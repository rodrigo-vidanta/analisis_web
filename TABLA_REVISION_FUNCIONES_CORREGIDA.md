# 📊 TABLA DE FUNCIONES QUE REQUIEREN REVISIÓN (ANÁLISIS CORREGIDO)

**Contexto:** La app YA MIGRÓ a `auth.users` (nativo de Supabase)  
**Fecha:** 27 Enero 2026  
**Tabla Custom Obsoleta:** `public.auth_users` → Renombrada a `z_legacy_auth_users`

---

## ⚠️ FUNCIONES QUE REQUIEREN ACCIÓN

| # | Función | Estado Actual | Problema | Prioridad | Acción Requerida |
|---|---------|---------------|----------|-----------|------------------|
| 1 | `create_user_with_role` | ❌ **USA `auth_users` OBSOLETA** | Inserta en tabla vieja que ya no existe | 🔴 CRÍTICA | ELIMINAR o ACTUALIZAR a `auth.users` vía `auth-admin-proxy` |
| 2 | `increment_failed_login` | ✅ **USA `auth.users` CORRECTO** | Lee de `auth.users`, actualiza metadata correctamente | 🟢 OK | **NINGUNA** - Funciona correctamente |
| 3 | `reset_failed_login` | ✅ **USA `auth.users` CORRECTO** | Lee de `auth.users`, resetea intentos fallidos | 🟢 OK | **NINGUNA** - Funciona correctamente |
| 4 | `update_user_metadata` | ✅ **USA `auth.users` CORRECTO** | Actualiza `raw_user_meta_data` en `auth.users` | 🟢 OK | **NINGUNA** - Funciona correctamente |
| 5 | `migrate_user_to_supabase_auth` | ❌ **FUNCIÓN DE MIGRACIÓN** | Función obsoleta, migración ya completada | 🔴 ALTA | **ELIMINAR** - Ya no es necesaria |
| 6 | `migrate_all_users_to_supabase_auth` | ❌ **FUNCIÓN DE MIGRACIÓN** | Función obsoleta, migración ya completada | 🔴 ALTA | **ELIMINAR** - Ya no es necesaria |
| 7 | `change_user_password` | ⚠️ **VERIFICAR** | Podría usar tabla vieja | 🟡 MEDIA | Revisar código, asegurar que usa `auth.users` |
| 8 | `audit_password_changes` | ⚠️ **VERIFICAR** | Trigger de auditoría | 🟡 MEDIA | Revisar si audita tabla correcta |
| 9 | `update_auth_users_updated_at` | ⚠️ **TRIGGER OBSOLETO?** | Trigger para tabla `auth_users` | 🟡 MEDIA | Verificar si aún existe tabla, eliminar trigger si está huérfano |
| 10 | `security_status_report` | ⚠️ **VERIFICAR** | Reporte de seguridad | 🟢 BAJA | Revisar qué tablas consulta |
| 11 | `archivar_coordinacion_y_reasignar` | ⚠️ **VERIFICAR** | Reasigna usuarios de coordinación | 🟡 MEDIA | Verificar si consulta tabla correcta |

---

## 🔴 CRÍTICO - ACCIÓN INMEDIATA REQUERIDA

### 1. `create_user_with_role` - ROTA ❌

**Problema:**
```sql
INSERT INTO auth_users (...)  -- ❌ Esta tabla YA NO EXISTE
```

**Razón:** Esta función **NO FUNCIONA** porque intenta insertar en `public.auth_users` que fue renombrada a `z_legacy_auth_users`.

**Opciones:**

#### Opción A: ELIMINAR (Recomendado)
```sql
DROP FUNCTION IF EXISTS create_user_with_role CASCADE;
```
**Razón:** Ya tienes `auth-admin-proxy` Edge Function que hace esto correctamente.

#### Opción B: ACTUALIZAR a auth.users
```sql
-- Reemplazar la función para usar auth.users + auth-admin-proxy
-- NO RECOMENDADO: Mejor usar Edge Function directamente
```

---

## ✅ FUNCIONES CORRECTAS - NO TOCAR

Las siguientes funciones **YA ESTÁN ACTUALIZADAS** y usan `auth.users` correctamente:

| Función | Código Validado | Estado |
|---------|----------------|--------|
| `increment_failed_login` | Lee de `auth.users`, actualiza metadata | ✅ CORRECTO |
| `reset_failed_login` | Lee de `auth.users`, resetea metadata | ✅ CORRECTO |
| `update_user_metadata` | Actualiza `raw_user_meta_data` en `auth.users` | ✅ CORRECTO |

**Evidencia:**
```sql
-- increment_failed_login
SELECT id FROM auth.users WHERE email = LOWER(p_email); -- ✅ CORRECTO

-- reset_failed_login  
SELECT id FROM auth.users WHERE email = LOWER(p_email); -- ✅ CORRECTO

-- update_user_metadata
UPDATE auth.users SET raw_user_meta_data = v_new_metadata WHERE id = p_user_id; -- ✅ CORRECTO
```

---

## 📋 FUNCIONES A VERIFICAR MANUALMENTE

Ejecuta este SQL para ver su código:

```sql
-- Ver código de funciones pendientes
SELECT 
  p.proname as funcion,
  pg_get_functiondef(p.oid) as codigo
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'change_user_password',
    'audit_password_changes',
    'update_auth_users_updated_at',
    'security_status_report',
    'archivar_coordinacion_y_reasignar'
  )
ORDER BY p.proname;
```

---

## 🎯 RESUMEN EJECUTIVO

| Categoría | Cantidad | Acción |
|-----------|----------|--------|
| ✅ **Funciones Correctas** | 3 | Ninguna - Ya usan `auth.users` |
| ❌ **Funciones Rotas** | 1 | ELIMINAR `create_user_with_role` |
| ❌ **Funciones Obsoletas** | 2 | ELIMINAR funciones de migración |
| ⚠️ **Funciones a Verificar** | 5 | Revisar código manualmente |

---

## 🚀 SQL PARA EJECUTAR AHORA

```sql
-- ============================================
-- ELIMINAR FUNCIONES ROTAS Y OBSOLETAS
-- ============================================

-- 1. FUNCIÓN ROTA (usa tabla que no existe)
DROP FUNCTION IF EXISTS create_user_with_role CASCADE;

-- 2. FUNCIONES DE MIGRACIÓN (ya completadas)
DROP FUNCTION IF EXISTS migrate_user_to_supabase_auth CASCADE;
DROP FUNCTION IF EXISTS migrate_all_users_to_supabase_auth CASCADE;

-- Verificación
SELECT 
  'Funciones eliminadas' as status,
  COUNT(*) as funciones_restantes
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'create_user_with_role',
    'migrate_user_to_supabase_auth',
    'migrate_all_users_to_supabase_auth'
  );
-- Debe retornar 0
```

---

## ⚠️ ADVERTENCIAS CRÍTICAS

1. **NO TOCAR** `increment_failed_login`, `reset_failed_login`, `update_user_metadata` - Estas funciones **YA ESTÁN ACTUALIZADAS** y funcionan correctamente con `auth.users`.

2. **ELIMINAR** `create_user_with_role` - Esta función está **ROTA** porque intenta insertar en una tabla que ya no existe.

3. **VERIFICAR** antes de eliminar las 5 funciones pendientes - Podrían estar en uso.

---

**✅ ANÁLISIS CORREGIDO COMPLETADO**
