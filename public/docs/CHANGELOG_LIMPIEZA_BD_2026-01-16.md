# Changelog - Limpieza de Base de Datos

**Fecha:** 16 de Enero 2026  
**Hora:** 20:43 - 20:47 UTC  
**Ejecutado por:** Samuel Rosales (con asistencia de Claude AI)  
**Base de Datos:** PQNC_AI (glsmifhkoaifvaegsozd.supabase.co)

---

## Resumen Ejecutivo

✅ **Limpieza completada exitosamente**

- 🗑️ 4 tablas/vistas eliminadas
- 🧹 7 funciones obsoletas eliminadas
- 🔒 1 vulnerabilidad crítica corregida
- 📝 8 archivos de código actualizados
- 💾 Backups realizados antes de eliminación

---

## Vulnerabilidad Crítica Encontrada y Corregida

### 🔴 CRÍTICO: Vista `auth_user_profiles` exponía `password_hash`

**Descripción:**  
La vista `auth_user_profiles` incluía la columna `password_hash` de la tabla `auth_users`, lo que permitía a cualquier código con acceso a la vista leer los hashes de contraseñas.

**Impacto:**  
- Riesgo ALTO
- Exposición de hashes de contraseñas (aunque hasheados con bcrypt)
- Similar a la vulnerabilidad de `auth_users` que se corrigió con `auth_users_safe`

**Solución:**  
1. ✅ Vista `auth_user_profiles` eliminada completamente
2. ✅ Código migrado a usar `user_profiles_v2` (vista segura sin `password_hash`)
3. ✅ 8 archivos de código actualizados

**Estado:** ✅ CORREGIDO (2026-01-16 20:45 UTC)

---

## Backups Realizados

### 1. coordinador_coordinaciones_legacy

```json
{
  "table": "coordinador_coordinaciones_legacy",
  "timestamp": "2026-01-16T20:43:09.156447+00:00",
  "row_count": 4,
  "registros": [
    { "coordinador_id": "938077b1-ba83-4b6a-91a8-24bbf15d4284", "coordinacion_id": "eea1c2ff-b50c-48ba-a694-0dc4c96706ca" },
    { "coordinador_id": "c0026bee-029c-45c7-a6c4-3ca38aad96e4", "coordinacion_id": "0008460b-a730-4f0b-ac1b-5aaa5c40f5b0" },
    { "coordinador_id": "2513037a-6739-46ff-93a6-c995e7324309", "coordinacion_id": "4c1ece41-bb6b-49a1-b52b-f5236f54d60a" },
    { "coordinador_id": "90303228-29d4-4938-8245-4c5275bc881d", "coordinacion_id": "eea1c2ff-b50c-48ba-a694-0dc4c96706ca" }
  ]
}
```

**Nota:** Todos estos registros ya existen en `auth_user_coordinaciones` (migrados previamente)

### 2. user_notifications_legacy

```json
{
  "table": "user_notifications_legacy",
  "timestamp": "2026-01-16T20:43:10.723984+00:00",
  "row_count": 27,
  "primeras_5_filas": [
    { "id": "a737f51c-edb5-4069-9d3b-9ec7fe31a0ea", "user_id": "af827437-9be7-4f68-a8b0-ae332dd56fd7", "notification_type": "new_message" },
    { "id": "90279ce3-4769-496f-93e7-a53a9affb799", "user_id": "97e0637a-78c0-4d9c-9522-a8f66097e2fb", "notification_type": "new_message" }
  ]
}
```

**Nota:** Notificaciones de prueba de noviembre 2025, ya migradas a `user_notifications`

### 3. prospectos_duplicate

```json
{
  "table": "prospectos_duplicate",
  "timestamp": "2026-01-16T20:43:11.712768+00:00",
  "row_count": 0,
  "data": []
}
```

**Nota:** Tabla vacía, creada temporalmente y nunca usada

---

## SQL Ejecutado

### Paso 1: Eliminar Vista Insegura

```sql
DROP VIEW IF EXISTS auth_user_profiles CASCADE;
```

**Resultado:** ✅ Vista eliminada  
**Tiempo:** 2026-01-16 20:45:12 UTC

### Paso 2-4: Eliminar Tablas Legacy

```sql
DROP TABLE IF EXISTS coordinador_coordinaciones_legacy CASCADE;
DROP TABLE IF EXISTS user_notifications_legacy CASCADE;
DROP TABLE IF EXISTS prospectos_duplicate CASCADE;
```

**Resultado:** ✅ 3 tablas eliminadas  
**Tiempo:** 2026-01-16 20:45:18 UTC

### Paso 5: Limpiar Versiones Antiguas de Funciones

```sql
-- Versiones antiguas de fn_force_leido_false_on_insert
DROP FUNCTION IF EXISTS fn_force_leido_false_on_insert() CASCADE;
DROP FUNCTION IF EXISTS fn_force_leido_false_on_insert_v2() CASCADE;
DROP FUNCTION IF EXISTS fn_force_leido_false_on_insert_v3() CASCADE;
DROP FUNCTION IF EXISTS fn_force_leido_false_on_insert_v4() CASCADE;
DROP FUNCTION IF EXISTS fn_force_leido_false_on_insert_v5() CASCADE;
```

**Resultado:** ✅ 5 funciones eliminadas (mantener v6)  
**Tiempo:** 2026-01-16 20:46:32 UTC

### Paso 6: Eliminar Funciones de Autenticación Obsoletas

```sql
-- authenticate_user ya no se usa (migrado a Supabase Auth nativo)
DROP FUNCTION IF EXISTS authenticate_user(text, text) CASCADE;
DROP FUNCTION IF EXISTS authenticate_user_v2(text, text) CASCADE;
```

**Resultado:** ✅ 2 funciones eliminadas  
**Tiempo:** 2026-01-16 20:46:45 UTC

### Paso 7: Eliminar Versiones de create_company

```sql
DROP FUNCTION IF EXISTS create_company_direct(jsonb) CASCADE;
DROP FUNCTION IF EXISTS create_company_v2(jsonb) CASCADE;
DROP FUNCTION IF EXISTS create_company_v3(jsonb) CASCADE;
```

**Resultado:** ✅ No eliminadas (no existen en la BD actual)  
**Tiempo:** 2026-01-16 20:46:52 UTC

---

## Migraciones de Código

### Archivos Modificados (8 archivos)

| # | Archivo | Línea(s) | Cambio |
|---|---------|----------|--------|
| 1 | `src/services/tokenService.ts` | 90 | `auth_user_profiles` → `user_profiles_v2` |
| 2 | `src/hooks/useUserProfile.ts` | 116 | `auth_user_profiles` → `user_profiles_v2` |
| 3 | `src/components/analysis/LiveMonitorKanban.tsx` | 1338 | `auth_user_profiles` → `user_profiles_v2` |
| 4 | `src/stores/liveActivityStore.ts` | 305, 408 | `auth_user_profiles` → `user_profiles_v2` (2x) |
| 5 | `src/services/coordinacionService.ts` | 503, 601 | `auth_user_profiles` → `user_profiles_v2` (2x) |
| 6 | `src/components/admin/UserManagementV2/hooks/useUserManagement.ts` | 166 | `auth_user_profiles` → `user_profiles_v2` |
| 7 | `src/components/admin/UserManagement.tsx` | 218 | `auth_user_profiles` → `user_profiles_v2` |
| 8 | `src/services/logMonitorService.ts` | 1128 | `auth_user_profiles` → `user_profiles_v2` |

### Archivo de Configuración Actualizado

| Archivo | Cambio | Razón |
|---------|--------|-------|
| `src/config/supabaseSystemUI.ts` | Actualizar comentario sobre RPCs | `authenticate_user` ya no existe |

---

## Estado Antes vs Después

### Tablas BASE TABLE
- **Antes:** 37 tablas
- **Después:** 34 tablas
- **Eliminadas:** 3 tablas legacy

### Vistas (VIEW)
- **Antes:** 14 vistas
- **Después:** 13 vistas
- **Eliminadas:** 1 vista insegura (`auth_user_profiles`)

### Funciones RPC
- **Antes:** ~94 funciones custom
- **Después:** ~87 funciones custom
- **Eliminadas:** 7 funciones obsoletas

---

## Verificación Post-Limpieza

```sql
-- ✅ Verificar tablas eliminadas (debe retornar 0 filas)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'coordinador_coordinaciones_legacy',
    'user_notifications_legacy',
    'prospectos_duplicate',
    'auth_user_profiles'
  );
-- Resultado: 0 filas ✅

-- ✅ Verificar funciones eliminadas (debe retornar 0 filas)
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'authenticate_user',
    'authenticate_user_v2',
    'fn_force_leido_false_on_insert',
    'fn_force_leido_false_on_insert_v2',
    'fn_force_leido_false_on_insert_v3',
    'fn_force_leido_false_on_insert_v4',
    'fn_force_leido_false_on_insert_v5'
  );
-- Resultado: 0 filas ✅

-- ✅ Verificar vista segura user_profiles_v2 existe
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles_v2';
-- Resultado: 1 fila (VIEW) ✅

-- ✅ Verificar que user_profiles_v2 NO expone password_hash
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles_v2'
  AND column_name = 'password_hash';
-- Resultado: 0 filas ✅
```

---

## Impacto en Producción

**🟢 CERO impacto negativo esperado**

- ✅ Todos los backups realizados
- ✅ Código migrado antes de eliminar recursos
- ✅ Vistas seguras verificadas y activas
- ✅ No hay downtime
- ✅ Mejora de seguridad (vulnerabilidad corregida)

---

## Rollback (Si Fuera Necesario)

### Restaurar coordinador_coordinaciones_legacy

```sql
CREATE TABLE coordinador_coordinaciones_legacy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinador_id UUID NOT NULL REFERENCES auth_users(id),
  coordinacion_id UUID NOT NULL REFERENCES coordinaciones(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar datos del backup (4 registros)
INSERT INTO coordinador_coordinaciones_legacy VALUES
  ('444bfdc5-4d41-4cae-9b79-51ade07b1009', '938077b1-ba83-4b6a-91a8-24bbf15d4284', 'eea1c2ff-b50c-48ba-a694-0dc4c96706ca', '2025-11-27T16:15:04.968526+00:00', '2025-11-27T16:15:04.968526+00:00'),
  -- ... (resto de registros del backup)
```

**⚠️ NO RECOMENDADO:** La tabla legacy fue reemplazada por `auth_user_coordinaciones`

---

## Referencias

- **Backups completos:** Disponibles en MCP Server (llamar a `backup_table_data()`)
- **Documentación:** `docs/LIMPIEZA_RECURSOS_OBSOLETOS.md`
- **Pentesting:** `docs/PENTESTING_2026-01-16.md`
- **Arquitectura:** `.cursor/rules/arquitectura-bd-unificada.mdc`
- **Seguridad:** `.cursor/rules/security-rules.mdc`

---

**Aprobado por:** Samuel Rosales  
**Estado:** ✅ COMPLETADO  
**Próximos pasos:** Deploy a producción (después de pruebas locales)
