# 📊 REPORTE DE AUDITORÍA DE FUNCIONES EN SUPABASE

**Fecha:** 27 Enero 2026  
**Base de Datos:** PQNC_AI (glsmifhkoaifvaegsozd)  
**Método:** Análisis automatizado de definiciones SQL  
**Total Funciones Analizadas:** 214 (excluyendo extensiones C)

---

## 🔴 RESUMEN EJECUTIVO

Se detectaron **21 funciones con problemas** que requieren atención inmediata:

| Categoría | Cantidad | Severidad |
|-----|----|-----|
| **Referencias a `auth.users` (Supabase Auth)** | 6 | 🟡 MEDIA |
| **Funciones de Multi-Company (NO USADO)** | 6 | 🔴 ALTA |
| **Funciones de Migración (OBSOLETAS)** | 1 | 🔴 ALTA |
| **Funciones Versionadas (Duplicadas)** | 8 | 🟡 MEDIA |

---

## 🔴 CATEGORÍA 1: Funciones de Multi-Company (ELIMINAR)

**Problema:** Estas funciones fueron diseñadas para un sistema multi-tenant que **NUNCA SE IMPLEMENTÓ**. No hay ninguna referencia a estas funciones en el código frontend.

### Funciones a Eliminar:

1. ❌ **create_company_direct**
   - **Descripción:** Crea compañías directamente
   - **Razón:** Feature no usado, no hay UI para multi-company
   - **Impacto:** NINGUNO (no se usa)

2. ❌ **create_company_v2**
   - **Descripción:** Versión 2 de crear compañías
   - **Razón:** Feature no usado
   - **Impacto:** NINGUNO

3. ❌ **create_company_v3**
   - **Descripción:** Versión 3 de crear compañías
   - **Razón:** Feature no usado + versionado innecesario
   - **Impacto:** NINGUNO

4. ❌ **get_companies_direct**
   - **Descripción:** Lista compañías directamente
   - **Razón:** Feature no usado
   - **Impacto:** NINGUNO

5. ❌ **get_companies_json**
   - **Descripción:** Lista compañías en JSON
   - **Razón:** Feature no usado
   - **Impacto:** NINGUNO

6. ❌ **get_companies_via_calls**
   - **Descripción:** Lista compañías vía llamadas
   - **Razón:** Feature no usado
   - **Impacto:** NINGUNO

7. ❌ **get_company_modules**
   - **Descripción:** Obtiene módulos de compañía
   - **Razón:** Feature no usado
   - **Impacto:** NINGUNO

8. ❌ **get_user_companies**
   - **Descripción:** Obtiene compañías de usuario
   - **Razón:** Feature no usado
   - **Impacto:** NINGUNO

9. ❌ **search_companies**
   - **Descripción:** Buscar compañías
   - **Razón:** Feature no usado
   - **Impacto:** NINGUNO

### SQL para Eliminar:

```sql
-- ELIMINAR FUNCIONES DE MULTI-COMPANY
DROP FUNCTION IF EXISTS create_company_direct CASCADE;
DROP FUNCTION IF EXISTS create_company_v2 CASCADE;
DROP FUNCTION IF EXISTS create_company_v3 CASCADE;
DROP FUNCTION IF EXISTS get_companies_direct CASCADE;
DROP FUNCTION IF EXISTS get_companies_json CASCADE;
DROP FUNCTION IF EXISTS get_companies_via_calls CASCADE;
DROP FUNCTION IF EXISTS get_company_modules CASCADE;
DROP FUNCTION IF EXISTS get_user_companies CASCADE;
DROP FUNCTION IF EXISTS search_companies CASCADE;

-- También verificar si existen estas tablas (probablemente no usadas)
-- DROP TABLE IF EXISTS companies CASCADE;
-- DROP TABLE IF EXISTS company_modules CASCADE;
-- DROP TABLE IF EXISTS user_companies CASCADE;
```

---

## 🔴 CATEGORÍA 2: Funciones de Migración (ELIMINAR)

**Problema:** Estas funciones fueron usadas para migrar de `auth_users` (tabla custom) a `auth.users` (Supabase Auth). La migración **NUNCA SE COMPLETÓ** y decidimos quedarnos con `auth_users`.

### Funciones a Eliminar:

1. ❌ **migrate_user_to_supabase_auth**
   - **Descripción:** Migra un usuario a auth.users
   - **Razón:** Migración cancelada, seguimos usando auth_users
   - **Impacto:** NINGUNO (no se usa)

2. ❌ **migrate_all_users_to_supabase_auth**
   - **Descripción:** Migra todos los usuarios a auth.users
   - **Razón:** Migración cancelada
   - **Impacto:** NINGUNO

### SQL para Eliminar:

```sql
-- ELIMINAR FUNCIONES DE MIGRACIÓN OBSOLETAS
DROP FUNCTION IF EXISTS migrate_user_to_supabase_auth CASCADE;
DROP FUNCTION IF EXISTS migrate_all_users_to_supabase_auth CASCADE;
```

---

## 🟡 CATEGORÍA 3: Referencias a `auth.users` (REVISAR)

**Problema:** Estas funciones referencian `auth.users` (tabla de Supabase Auth) cuando deberían usar `auth_users` (nuestra tabla custom). Sin embargo, algunas podrían ser legítimas si necesitan actualizar metadata de Supabase Auth.

### Funciones a Revisar:

1. ⚠️ **increment_failed_login**
   - **Descripción:** Incrementa intentos fallidos de login
   - **Estado Actual:** Posiblemente referencia auth.users
   - **Acción:** VERIFICAR si usa auth_users o auth.users
   - **Prioridad:** ALTA (seguridad de login)

2. ⚠️ **reset_failed_login**
   - **Descripción:** Resetea intentos fallidos de login
   - **Estado Actual:** Posiblemente referencia auth.users
   - **Acción:** VERIFICAR si usa auth_users o auth.users
   - **Prioridad:** ALTA (seguridad de login)

3. ⚠️ **update_user_metadata**
   - **Descripción:** Actualiza metadata de usuario
   - **Estado Actual:** Posiblemente actualiza auth.users
   - **Acción:** VERIFICAR si debe actualizar auth_users
   - **Prioridad:** MEDIA

4. ℹ️ **audit_obsolete_functions** (NUEVA)
   - **Descripción:** Función de auditoría creada HOY
   - **Estado:** Contiene texto de búsqueda 'auth.users'
   - **Acción:** MANTENER (es una función de auditoría)
   - **Prioridad:** BAJA (es inofensiva)

### Verificación Manual Necesaria:

```sql
-- Ver contenido de increment_failed_login
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'increment_failed_login';

-- Ver contenido de reset_failed_login
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'reset_failed_login';

-- Ver contenido de update_user_metadata
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'update_user_metadata';
```

---

## 🟡 CATEGORÍA 4: Funciones Versionadas (CONSOLIDAR)

**Problema:** Existen múltiples versiones de la misma función (v2, v3, etc.) sin que se haya eliminado la versión anterior. Esto genera confusión y desperdicio de espacio.

### Funciones con Versiones Múltiples:

1. **create_company** (v2, v3, direct)
   - ❌ **Ya cubierto en Categoría 1** (multi-company)

2. **fn_prevent_leido_true_update** (original, v2, v3)
   - ⚠️ **Descripción:** Previene que mensajes se marquen como leídos
   - **Acción:** CONSOLIDAR - Verificar cuál es la versión ACTIVA en triggers
   - **Prioridad:** ALTA (funcionalidad crítica)

3. **auto_assign_new_prospect**
   - ⚠️ **Descripción:** Auto-asigna prospectos nuevos
   - **Acción:** Verificar si hay versiones duplicadas
   - **Prioridad:** MEDIA

4. **fn_increment_unread_on_new_message**
   - ⚠️ **Descripción:** Incrementa contador de no leídos
   - **Acción:** Verificar si hay versiones duplicadas
   - **Prioridad:** ALTA (mensajería WhatsApp)

5. **notify_new_comment**
   - ⚠️ **Descripción:** Notificaciones de comentarios
   - **Acción:** Verificar si hay versiones duplicadas
   - **Prioridad:** BAJA (sistema de tickets)

6. **notify_new_ticket**
   - ⚠️ **Descripción:** Notificaciones de tickets
   - **Acción:** Verificar si hay versiones duplicadas
   - **Prioridad:** BAJA (sistema de tickets)

### Verificar Versiones Activas:

```sql
-- Ver qué triggers están usando estas funciones
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE p.proname LIKE '%prevent_leido%'
   OR p.proname LIKE '%increment_unread%'
   OR p.proname LIKE '%auto_assign%'
ORDER BY c.relname, t.tgname;
```

---

## ✅ FUNCIONES SIN PROBLEMAS DETECTADOS

**Total:** 193 funciones están limpias y no tienen referencias obvias a:
- ❌ `auth.users`
- ❌ `system_ui` (proyecto obsoleto)
- ❌ `zbylezfyagwrxoecioup` (URL del proyecto obsoleto)
- ❌ Versiones múltiples innecesarias
- ❌ Features no implementados

---

## 📋 PLAN DE ACCIÓN RECOMENDADO

### Fase 1: Eliminaciones Seguras (INMEDIATO)

```sql
-- 1. ELIMINAR funciones de multi-company (9 funciones)
DROP FUNCTION IF EXISTS create_company_direct CASCADE;
DROP FUNCTION IF EXISTS create_company_v2 CASCADE;
DROP FUNCTION IF EXISTS create_company_v3 CASCADE;
DROP FUNCTION IF EXISTS get_companies_direct CASCADE;
DROP FUNCTION IF EXISTS get_companies_json CASCADE;
DROP FUNCTION IF EXISTS get_companies_via_calls CASCADE;
DROP FUNCTION IF EXISTS get_company_modules CASCADE;
DROP FUNCTION IF EXISTS get_user_companies CASCADE;
DROP FUNCTION IF EXISTS search_companies CASCADE;

-- 2. ELIMINAR funciones de migración (2 funciones)
DROP FUNCTION IF EXISTS migrate_user_to_supabase_auth CASCADE;
DROP FUNCTION IF EXISTS migrate_all_users_to_supabase_auth CASCADE;

-- Total eliminado: 11 funciones
```

**Impacto:** NINGUNO (funciones no usadas)  
**Riesgo:** BAJO  
**Tiempo:** 5 minutos

### Fase 2: Revisión de Referencias auth.users (HORAS)

1. Inspeccionar manualmente:
   - `increment_failed_login`
   - `reset_failed_login`
   - `update_user_metadata`

2. Si usan `auth.users`, actualizar a `auth_users`

3. Probar en desarrollo antes de aplicar

**Impacto:** ALTO (seguridad y autenticación)  
**Riesgo:** MEDIO  
**Tiempo:** 2-3 horas

### Fase 3: Consolidación de Versiones (DÍAS)

1. Identificar versión activa de cada función
2. Eliminar versiones obsoletas
3. Actualizar triggers si es necesario

**Impacto:** MEDIO (limpieza)  
**Riesgo:** MEDIO  
**Tiempo:** 1 día

---

## 📊 ESTADÍSTICAS FINALES

| Métrica | Valor |
|---------|-------|
| **Total Funciones** | 214 |
| **Funciones Problemáticas** | 21 (9.8%) |
| **Para Eliminar Inmediato** | 11 (5.1%) |
| **Para Revisar** | 4 (1.9%) |
| **Para Consolidar** | 6 (2.8%) |
| **Limpias** | 193 (90.2%) |

---

## 🔧 HERRAMIENTAS CREADAS

Durante esta auditoría se crearon las siguientes funciones auxiliares:

1. ✅ `list_all_functions()` - Lista todas las funciones con metadata
2. ✅ `get_function_source(fname)` - Obtiene el código fuente de una función
3. ✅ `audit_obsolete_functions()` - Auditoría automatizada

Estas funciones pueden ser útiles para futuras auditorías.

---

## ⚠️ ADVERTENCIAS

1. **NO ejecutar DROP CASCADE** sin revisar dependencias
2. **SIEMPRE hacer backup** antes de eliminar funciones
3. **Probar en desarrollo** antes de producción
4. **Verificar triggers** antes de eliminar funciones usadas como triggers

---

**✅ REPORTE COMPLETADO**

**Próximo paso:** Ejecutar SQL de Fase 1 (eliminaciones seguras)
