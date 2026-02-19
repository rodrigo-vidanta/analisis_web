# Handover: Fix Sistema de Backup - 8 Bugs Post-Migración Auth Nativo

**Fecha**: 2026-02-19
**Versión antes**: v2.17.2 (B10.1.44N2.17.2)
**Estado**: Implementado, pendiente deploy frontend
**Migración BD**: Aplicada (`add_backup_support_to_user_can_see_prospecto`)

---

## Contexto del Problema

El sistema de backup permite que al hacer logout, un ejecutivo/supervisor asigne a otro usuario para atender sus prospectos mientras está fuera. **Dejó de funcionar** desde la migración a Supabase Auth nativo (`auth.users` con `raw_user_meta_data` JSONB), reemplazando la tabla legacy `auth_users`.

La **causa raíz** era que la función RLS `user_can_see_prospecto()` no contemplaba relaciones de backup — el backup asignado no podía ver los prospectos del ejecutivo ausente porque RLS los bloqueaba.

## Análisis is_operativo vs Backup

Se verificó que `is_operativo` está correctamente separado del sistema de backup:
- **Logout**: 1) `assignBackup` (has_backup=true) → 2) `is_operativo=false` (secuencial)
- **Login**: 1) `is_operativo=true` → 2) `removeBackup` (has_backup=false) (secuencial)
- **RLS** solo checa `has_backup=true AND backup_id=user`, NO usa `is_operativo` — correcto porque `has_backup` es el indicador canónico y hay un breve momento en login donde ambos son true
- `handleForceLogout` solo pone `is_operativo=false`, NO asigna backup (correcto para session expired)
- `handleLogoutWithoutBackup` llama `logout(undefined)`, no asigna backup (correcto)

---

## 8 Bugs Identificados y Corregidos

### BUG 1 (CRÍTICO) — RLS: `user_can_see_prospecto()` sin soporte backup
- **Archivo**: Función SQL en BD (migración aplicada)
- **Problema**: NIVEL 3 (ejecutivos) solo chequeaba `prospecto_ejecutivo_id = v_user_id`. Un backup asignado no podía ver prospectos.
- **Fix**: Agregada lógica de backup al NIVEL 3:
  ```sql
  -- Backup: soy backup del ejecutivo dueño del prospecto
  IF EXISTS (
      SELECT 1 FROM public.user_profiles_v2
      WHERE id = prospecto_ejecutivo_id
        AND backup_id = v_user_id
        AND has_backup = true
  ) AND (prospecto_coordinacion_id = v_user_coordinacion_id OR v_user_coordinacion_id IS NULL) THEN
      RETURN true;
  END IF;
  ```
- **Impacto**: Afecta RLS en 5 tablas: `prospectos`, `mensajes_whatsapp`, `conversaciones_whatsapp`, `llamadas_ventas`, `prospect_assignments`
- **Migración**: `20260219201739_add_backup_support_to_user_can_see_prospecto`

### BUG 2 (CRÍTICO) — Login: `handleExecutiveLogin` excluía supervisores
- **Archivo**: `src/services/authService.ts:250`
- **Problema**: Solo chequeaba `role_name === 'ejecutivo'`, excluyendo supervisores del removeBackup al relogin
- **Fix**: `(this.currentUser.role_name === 'ejecutivo' || this.currentUser.role_name === 'supervisor')`
- **Efecto**: Supervisores que re-loguean ahora también remueven su backup y restauran teléfono

### BUG 3 (CRÍTICO) — Cache: `invalidateAllCache()` no limpiaba backupCache
- **Archivo**: `src/services/permissionsService.ts:166-175`
- **Problema**: `invalidateAllCache()` limpiaba 5 cachés + 2 inflight maps pero omitía `backupCache` y `backupOfCache`
- **Fix**: Agregado `this.backupCache.clear()` y `this.backupOfCache.clear()`
- **Efecto**: Al hacer logout, los datos de backup stale ya no persisten

### BUG 4 (IMPORTANTE) — Query invertida en `getBackupEjecutivoInfo`
- **Archivo**: `src/services/backupService.ts:655-725` (antes) → `662-683` (después)
- **Problema**: Buscaba `WHERE id = currentUserId` (¿tengo yo backup?) en vez de `WHERE backup_id = currentUserId AND has_backup = true` (¿quién me tiene como backup?)
- **Fix**: Query corregida con `.eq('backup_id', currentUserId).eq('has_backup', true).maybeSingle()`
- **Efecto**: `BackupBadgeWrapper` ahora identifica correctamente prospectos de backup
- **Nota**: Se removió el cache manual complejo (70+ líneas) por una query directa simple. El `dedupe()` inflight ya previene thundering herd.

### BUG 5 (IMPORTANTE) — Self-join en `getBackupInfo` fallaba en VIEWs
- **Archivo**: `src/services/backupService.ts:345-381`
- **Problema**: Usaba embedded resource `backup:backup_id(id, email, full_name, phone)` que requiere FK constraint. `user_profiles_v2` es un VIEW sin FKs.
- **Fix**: Separado en 2 queries independientes. Query 1: datos del ejecutivo. Query 2 (condicional): teléfono del backup.
- **Efecto**: `getBackupInfo` ahora funciona correctamente con la VIEW

### BUG 6 (MODERADO) — `handleLogoutWithoutBackup` incompleto
- **Archivo**: `src/contexts/AuthContext.tsx:484-498`
- **Problema**: Faltaba `error: null` en state update, no hacía cleanup de caches ni Realtime
- **Fix**: Agregado `permissionsService.invalidateAllCache()`, cleanup de `useLiveActivityStore`, `realtimeHub`, `realtimeHubSystemUI`, y `error: null`
- **Efecto**: Logout sin backup ahora limpia todo correctamente, igual que `handleForceLogout`

### BUG 7 (MODERADO) — PRIORITY 1 incluía todos los roles
- **Archivo**: `src/services/backupService.ts:418-450`
- **Problema**: `getEjecutivosByCoordinacion` retorna ejecutivos, coordinadores y supervisores. PRIORITY 1 no filtraba por `role_name === 'ejecutivo'`, mapeando todos como `is_coordinator: false, is_supervisor: false`
- **Fix**: Agregado filtro `ejecutivo.role_name === 'ejecutivo'` en PRIORITY 1
- **Efecto**: Modal de backup muestra labels correctos (Ejecutivo/Supervisor/Coordinador) en cada prioridad

### BUG 8 (MODERADO) — `getEjecutivosByCoordinacion` no retornaba `role_name`
- **Archivo**: `src/services/coordinacionService.ts:406-428`
- **Problema**: El query SELECT incluía `role_name` pero el mapping no lo pasaba al objeto retornado
- **Fix**: Agregado `role_name: user.role_name` al mapping
- **Efecto**: Habilita el filtro de BUG 7 y permite labels correctos en el modal

---

## Archivos Modificados

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| BD: `user_can_see_prospecto()` | migración | Lógica backup en NIVEL 3 |
| `src/services/authService.ts` | 250 | Incluir supervisores en handleExecutiveLogin |
| `src/services/permissionsService.ts` | 169-171 | Limpiar backupCache en invalidateAllCache |
| `src/services/backupService.ts` | 345-381, 418-450, 655-725 | 3 métodos corregidos |
| `src/services/coordinacionService.ts` | 427 | Agregar role_name al mapping |
| `src/contexts/AuthContext.tsx` | 484-498 | Cleanup completo en handleLogoutWithoutBackup |

---

## Flujo Completo Post-Fix

### Logout con Backup
1. Usuario hace clic en logout → `AuthContext.logout()`
2. Si es ejecutivo/supervisor con coordinación y sin backupId → muestra `BackupSelectionModal`
3. Modal muestra candidatos en orden de prioridad (1: ejecutivos operativos, 2: supervisores, 3: coordinadores, etc.)
4. Usuario selecciona backup → `handleBackupSelected(backupId)` → `authService.logout(backupId)`
5. `handleExecutiveLogout`: `backupService.assignBackup(ejecutivoId, backupId)` → Edge Function escribe en `auth.users.raw_user_meta_data`:
   - `has_backup: true`, `backup_id: backupId`, `telefono_original: tel`, `phone: telBackup`
6. `updateUserMetadata` → `is_operativo: false`
7. Supabase signOut, cleanup caches/realtime

### Backup Person ve prospectos
1. Backup person está logueado (o se loguea)
2. Consulta a `prospectos` → RLS evalúa `user_can_see_prospecto(coordinacion_id, ejecutivo_id)`
3. NIVEL 3: ¿soy el ejecutivo asignado? NO → ¿existe ejecutivo dueño con `backup_id = yo AND has_backup = true`? SI → RETURN true
4. BackupBadgeWrapper llama `getBackupEjecutivoInfo` → `WHERE backup_id = currentUserId AND has_backup = true` → muestra badge

### Relogin del ejecutivo original
1. Ejecutivo/supervisor hace login → `authService.login()`
2. Paso 6: `is_operativo: true`
3. Paso 7: `handleExecutiveLogin` → `preloadBackupData` → si `has_backup=true` → `removeBackup(userId)`
4. `removeBackup`: Edge Function escribe `has_backup: false, backup_id: null, phone: telefonoOriginal, telefono_original: null`
5. RLS inmediatamente revoca acceso del backup person

---

## Verificación Post-Deploy

1. **RLS funciona**: Login como ejecutivo backup → debe ver prospectos del ejecutivo ausente
   ```sql
   -- Verificar función con UUIDs reales:
   SELECT public.user_can_see_prospecto(
     'coordinacion-uuid'::uuid,
     'ejecutivo-ausente-uuid'::uuid
   );
   -- Debe retornar true si el usuario autenticado es el backup_id del ejecutivo ausente
   ```

2. **Supervisor relogin**: Login como supervisor que tenía backup stuck → verificar `has_backup = false`
   ```sql
   SELECT id, email, has_backup, backup_id FROM user_profiles_v2
   WHERE role_name = 'supervisor' AND has_backup = true;
   -- Después del login, no debería haber ninguno con has_backup = true
   ```

3. **Modal labels correctos**: Hacer logout como ejecutivo → verificar que PRIORITY 1 muestra solo ejecutivos, PRIORITY 2 muestra supervisores con badge, etc.

4. **BackupBadge visible**: Login como backup → prospectos del ejecutivo ausente deben mostrar badge de backup

5. **Logout sin backup**: Hacer logout eligiendo "Sin backup" → verificar que la sesión se limpia completamente (no queda cache stale)

6. **Datos stuck actuales**: Verificar si hay datos de backup stuck en producción
   ```sql
   SELECT id, email, full_name, role_name, has_backup, backup_id
   FROM user_profiles_v2
   WHERE has_backup = true;
   -- Los que estén stuck se auto-limpiarán cuando el usuario haga login (fix BUG 2)
   ```

---

## Rollback

### Escenario 1: La migración BD causa problemas de rendimiento o acceso incorrecto

**Síntoma**: Queries lentas en tablas con RLS, o usuarios ven prospectos que no deberían ver.

**Rollback BD** (revertir función a versión anterior sin backup):
```sql
CREATE OR REPLACE FUNCTION public.user_can_see_prospecto(
  prospecto_coordinacion_id uuid,
  prospecto_ejecutivo_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $function$
DECLARE
  v_user_id uuid;
  v_role_name text;
  v_user_coordinacion_id uuid;
  v_coordinaciones_ids uuid[];
  v_is_admin boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT
    role_name,
    coordinacion_id,
    role_name IN ('admin', 'administrador_operativo', 'calidad')
  INTO v_role_name, v_user_coordinacion_id, v_is_admin
  FROM public.user_profiles_v2
  WHERE id = v_user_id;

  IF v_role_name IS NULL THEN
    RETURN false;
  END IF;

  IF v_is_admin THEN
    RETURN true;
  END IF;

  IF v_role_name IN ('coordinador', 'supervisor') THEN
    SELECT ARRAY_AGG(coordinacion_id)
    INTO v_coordinaciones_ids
    FROM public.auth_user_coordinaciones
    WHERE user_id = v_user_id;

    RETURN prospecto_coordinacion_id = ANY(v_coordinaciones_ids);
  END IF;

  IF v_role_name = 'ejecutivo' THEN
    RETURN prospecto_ejecutivo_id = v_user_id
           AND (prospecto_coordinacion_id = v_user_coordinacion_id OR v_user_coordinacion_id IS NULL);
  END IF;

  RETURN false;
END;
$function$;
```

**Ejecutar via MCP**:
```
mcp__supabase__execute_sql(project_id: 'glsmifhkoaifvaegsozd', query: <SQL arriba>)
```

**Efecto**: El backup dejará de funcionar a nivel RLS (backup person no verá prospectos), pero el resto del sistema sigue operando normalmente. No hay pérdida de datos.

### Escenario 2: Los cambios de frontend causan errores de runtime

**Síntoma**: Errores en consola al hacer login/logout, modal de backup no carga, crash en BackupBadge.

**Rollback frontend** (revertir commits y redesplegar):
```bash
# 1. Identificar el commit del fix
git log --oneline -5

# 2. Revertir el commit
git revert <commit-hash> --no-edit

# 3. Redesplegar
# O simplemente hacer checkout de v2.17.2 y deploy
```

**Archivos que revertir manualmente si no se hizo commit aún**:
```bash
git checkout HEAD -- \
  src/services/authService.ts \
  src/services/permissionsService.ts \
  src/services/backupService.ts \
  src/services/coordinacionService.ts \
  src/contexts/AuthContext.tsx
```

### Escenario 3: Rollback parcial (solo BD o solo frontend)

- **Solo BD**: Ejecutar el SQL de rollback del Escenario 1. El frontend seguirá intentando asignar backups pero el backup person no verá prospectos (estado pre-fix, no se rompe nada nuevo).
- **Solo frontend**: Revertir archivos del Escenario 2. La BD seguirá con la nueva función RLS, lo cual es inofensivo — solo agrega acceso que nadie puede activar sin el frontend funcional.

### Escenario 4: Datos corruptos en backup (has_backup stuck)

**Síntoma**: Un ejecutivo no puede ver sus prospectos o tiene teléfono incorrecto.

**Fix manual por usuario**:
```sql
-- Encontrar usuarios con backup stuck
SELECT id, email, full_name, has_backup, backup_id, phone, telefono_original
FROM user_profiles_v2
WHERE has_backup = true;

-- Limpiar backup de un usuario específico via Edge Function:
-- POST /auth-admin-proxy con body:
-- { "operation": "updateUserMetadata", "userId": "<user-id>", "metadata": { "has_backup": false, "backup_id": null, "phone": "<telefono-original>", "telefono_original": null } }
```

**Fix masivo** (limpiar TODOS los backups stuck):
```sql
-- Primero verificar cuántos hay
SELECT count(*) FROM user_profiles_v2 WHERE has_backup = true;

-- Para limpiar masivamente, usar la RPC update_user_metadata por cada uno
-- O hacer un script que llame a authAdminProxyService.updateUserMetadata() para cada usuario
```

---

## Notas Técnicas

### Performance
- La nueva lógica de backup en RLS agrega 1 `EXISTS` subquery con PK lookup en `user_profiles_v2` (índice por `id`)
- Solo se ejecuta cuando el usuario es `ejecutivo` Y la asignación directa falló
- Para mejorar: considerar agregar índice `CREATE INDEX idx_user_profiles_backup ON user_profiles_v2(backup_id) WHERE has_backup = true` si se detecta lentitud (no debería ser necesario con pocos registros)

### Seguridad
- La migración es **aditiva**: solo agrega acceso, nunca quita
- `user_profiles_v2` es SECURITY DEFINER (lee de `auth.users`), `user_can_see_prospecto` es SECURITY INVOKER
- La cadena de seguridad funciona: INVOKER llama DEFINER → DEFINER tiene acceso a auth.users → retorna datos filtrados

### Dependencias entre fixes
- BUG 8 (role_name en mapping) habilita BUG 7 (filtro PRIORITY 1)
- BUG 2 (supervisores en login) auto-limpia BUG 3 (cache stale) + datos stuck
- BUG 1 (RLS) es independiente de todos los demás
- BUGs 4 y 5 son independientes entre sí

### Datos de backup en auth.users.raw_user_meta_data
Los campos relevantes en el JSONB:
- `backup_id` (uuid | null): ID del usuario asignado como backup
- `has_backup` (boolean): Flag de backup activo
- `telefono_original` (text | null): Teléfono original guardado antes de swap
- `phone` (text): Teléfono actual (se swapea al del backup durante backup activo)
- `is_operativo` (boolean): Si el usuario está logueado (independiente de backup)

### Escritura a auth.users
Dos vías, ambas con JSONB merge (`...existing, ...updates`):
1. **RPC `update_user_metadata`** (SECURITY DEFINER): Para `is_operativo` en login/logout
2. **Edge Function `auth-admin-proxy`** → `supabase.auth.admin.updateUserById`: Para campos de backup (`backup_id`, `has_backup`, `telefono_original`, `phone`)

Ambos son secuenciales con `await`, sin race conditions.
