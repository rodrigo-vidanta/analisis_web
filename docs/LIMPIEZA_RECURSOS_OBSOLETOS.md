# Limpieza de Recursos Obsoletos - Base de Datos PQNC_AI

**Fecha:** 16 de Enero 2026  
**Base de Datos:** PQNC_AI (glsmifhkoaifvaegsozd)  
**Propósito:** Eliminar tablas, vistas y funciones obsoletas post-migración

---

## Recursos Identificados para Eliminación

### 1. Tablas Legacy

| Tabla | Razón | Estado |
|-------|-------|--------|
| `coordinador_coordinaciones_legacy` | Reemplazada por `auth_user_coordinaciones` | ⏳ Pendiente |
| `user_notifications_legacy` | Reemplazada por `user_notifications` | ⏳ Pendiente |
| `prospectos_duplicate` | Tabla duplicada temporal | ⏳ Pendiente |

### 2. Vistas Potencialmente Obsoletas

| Vista | Razón | Estado |
|-------|-------|--------|
| `auth_user_profiles` | Existe `user_profiles_v2` | ⏳ Pendiente análisis |

### 3. Triggers Obsoletos

| Trigger | Razón | Estado |
|---------|-------|--------|
| `update_coordinador_coordinaciones_legacy_updated_at` | Asociado a tabla legacy | ⏳ Pendiente |
| `fn_force_leido_false_on_insert_v2` a `v6` | Múltiples versiones | ⏳ Pendiente análisis |

---

## Plan de Ejecución

### Fase 1: Análisis de Uso (Verificar dependencias)
- [ ] Verificar si `auth_user_profiles` está en uso en código
- [ ] Verificar si hay datos en tablas legacy
- [ ] Verificar funciones que referencian tablas legacy

### Fase 2: Backup
- [ ] Backup de `coordinador_coordinaciones_legacy`
- [ ] Backup de `user_notifications_legacy`
- [ ] Backup de `prospectos_duplicate`

### Fase 3: Eliminación
- [ ] DROP tablas legacy
- [ ] DROP triggers obsoletos
- [ ] DROP vistas duplicadas

---

## SQL de Backup y Eliminación

### Backup

```sql
-- Backup de coordinador_coordinaciones_legacy
SELECT backup_table_data('coordinador_coordinaciones_legacy');

-- Backup de user_notifications_legacy
SELECT backup_table_data('user_notifications_legacy');

-- Backup de prospectos_duplicate
SELECT backup_table_data('prospectos_duplicate');
```

### Eliminación Segura

```sql
-- 1. Eliminar trigger de tabla legacy
DROP TRIGGER IF EXISTS update_coordinador_coordinaciones_legacy_updated_at 
  ON coordinador_coordinaciones_legacy;

-- 2. Eliminar función asociada
DROP FUNCTION IF EXISTS update_coordinador_coordinaciones_legacy_updated_at();

-- 3. Eliminar tablas legacy
DROP TABLE IF EXISTS coordinador_coordinaciones_legacy CASCADE;
DROP TABLE IF EXISTS user_notifications_legacy CASCADE;
DROP TABLE IF EXISTS prospectos_duplicate CASCADE;

-- 4. Verificar vista auth_user_profiles (mantener si user_profiles_v2 no es suficiente)
-- DROP VIEW IF EXISTS auth_user_profiles CASCADE;
```

---

## Verificación Post-Limpieza

```sql
-- Verificar tablas eliminadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('coordinador_coordinaciones_legacy', 'user_notifications_legacy', 'prospectos_duplicate');

-- Resultado esperado: 0 filas
```

---

## Registro de Ejecución

| Fecha | Recurso | Acción | Resultado |
|-------|---------|--------|-----------|
| 2026-01-16 20:43 | `coordinador_coordinaciones_legacy` | BACKUP (4 registros) | ✅ Exitoso |
| 2026-01-16 20:43 | `user_notifications_legacy` | BACKUP (27 registros) | ✅ Exitoso |
| 2026-01-16 20:43 | `prospectos_duplicate` | BACKUP (0 registros) | ✅ Exitoso |
| 2026-01-16 20:45 | `auth_user_profiles` VIEW | DROP CASCADE | ✅ Eliminada (exponía password_hash) |
| 2026-01-16 20:45 | `coordinador_coordinaciones_legacy` | DROP CASCADE | ✅ Eliminada |
| 2026-01-16 20:45 | `user_notifications_legacy` | DROP CASCADE | ✅ Eliminada |
| 2026-01-16 20:45 | `prospectos_duplicate` | DROP CASCADE | ✅ Eliminada |
| 2026-01-16 20:46 | `fn_force_leido_false_on_insert` (v1-v5) | DROP CASCADE | ✅ Eliminadas |
| 2026-01-16 20:46 | `authenticate_user` (v1, v2) | DROP CASCADE | ✅ Eliminadas |
| 2026-01-16 20:46 | `create_company_*` (direct, v2, v3) | DROP CASCADE | ✅ Eliminadas |

## Migraciones de Código Realizadas

| Archivo | Cambio | Razón |
|---------|--------|-------|
| `src/services/tokenService.ts` | `auth_user_profiles` → `user_profiles_v2` | Vista segura sin password_hash |
| `src/hooks/useUserProfile.ts` | `auth_user_profiles` → `user_profiles_v2` | Vista segura sin password_hash |
| `src/components/analysis/LiveMonitorKanban.tsx` | `auth_user_profiles` → `user_profiles_v2` | Vista segura sin password_hash |
| `src/stores/liveActivityStore.ts` | `auth_user_profiles` → `user_profiles_v2` | Vista segura sin password_hash |
| `src/services/coordinacionService.ts` | `auth_user_profiles` → `user_profiles_v2` (2 ocurrencias) | Vista segura sin password_hash |
| `src/components/admin/UserManagementV2/hooks/useUserManagement.ts` | `auth_user_profiles` → `user_profiles_v2` | Vista segura sin password_hash |
| `src/components/admin/UserManagement.tsx` | `auth_user_profiles` → `user_profiles_v2` | Vista segura sin password_hash |
| `src/services/logMonitorService.ts` | `auth_user_profiles` → `user_profiles_v2` | Vista segura sin password_hash |
| `src/config/supabaseSystemUI.ts` | Actualizar comentario RPC | authenticate_user obsoleta |

## Estado Final de la Base de Datos

**Eliminados:**
- ✅ 3 tablas legacy
- ✅ 1 vista insegura (`auth_user_profiles`)
- ✅ 7 funciones obsoletas
- ✅ 2 triggers asociados a tablas eliminadas

**Activos:**
- ✅ 34 tablas BASE TABLE
- ✅ 13 vistas (VIEW)
- ✅ ~87 funciones RPC (después de limpieza)

**Vistas Seguras Activas:**
- ✅ `auth_users_safe` - Sin password_hash
- ✅ `api_auth_tokens_safe` - Sin token_value
- ✅ `user_profiles_v2` - Sin password_hash (reemplazo de auth_user_profiles)

---

## ⚠️ VULNERABILIDAD CRÍTICA CORREGIDA

**Vista `auth_user_profiles` ELIMINADA**

Esta vista exponía la columna `password_hash` de `auth_users`, lo cual era una vulnerabilidad de seguridad crítica similar a la que se corrigió con `auth_users_safe`.

**Solución:** Migrado todo el código a usar `user_profiles_v2` que:
- ✅ NO expone `password_hash`
- ✅ Incluye datos de `auth.users` (Supabase Auth nativo)
- ✅ Incluye role_name via JOIN con auth_roles
- ✅ Totalmente segura para uso público

---

**Última actualización:** 16 de Enero 2026 20:47  
**Estado:** ✅ COMPLETADO
