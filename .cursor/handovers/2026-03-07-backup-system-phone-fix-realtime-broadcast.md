# Handover: Fix Backup System - Phone Overwrite + Realtime Broadcast

**Fecha:** 2026-03-07
**Version:** B10.2.0N2.24.2
**Archivos modificados:** 2

## Problema

1. **Phone overwrite**: Cuando un ejecutivo hacia logout y seleccionaba backup, el sistema sobrescribia el campo `phone` del ejecutivo con el telefono del backup. Al hacer login, restauraba el original. Este comportamiento ya no era deseado.

2. **Badge sin Realtime**: El `BackupBadgeWrapper` (badge "Backup de X" en amber) solo consultaba una vez al montar. No tenia suscripcion Realtime, asi que si el backup se asignaba despues del mount, el badge nunca aparecia. Ademas `user_profiles_v2` es una VIEW y no soporta `postgres_changes`.

## Solucion

### 1. Eliminacion de phone overwrite

**`src/services/backupService.ts`:**
- `assignBackup()`: Ya no obtiene ni sobrescribe el telefono. Solo registra `backup_id` y `has_backup: true`.
- `removeBackup()`: Ya no restaura `telefono_original`. Solo limpia `backup_id`, `telefono_original` y `has_backup`.

### 2. Realtime Broadcast para badges

**`src/services/backupService.ts` - Nuevos metodos:**
- `initBackupListener(userId)`: Suscribe al canal broadcast `backup:{userId}`. Idempotente.
- `onBackupChange(callback)`: Registra callback, retorna cleanup.
- `cleanupBackupListener()`: Limpia canal y listeners.
- `broadcastBackupChange(targetUserId, eventType)` (privado): Crea canal temporal, envia broadcast, limpia con delay de 1s.

**Flujo broadcast:**
- `assignBackup()` exitoso → `broadcastBackupChange(backupId, 'assigned')`
- `removeBackup()` exitoso → obtiene `backup_id` previo antes de limpiar → `broadcastBackupChange(previousBackupId, 'removed')`

**`src/components/shared/BackupBadgeWrapper.tsx`:**
- `checkBackup` extraido como `useCallback` reutilizable
- Al montar: `backupService.initBackupListener(currentUserId)` + `backupService.onBackupChange(() => checkBackup())`
- Los 5 componentes que usan `BackupBadgeWrapper` se benefician automaticamente

### 3. Limpieza de BD

Se ejecuto limpieza manual via SQL:
- **4 telefonos restaurados** a su valor original (phone != telefono_original)
- **26 usuarios limpiados**: removidos `backup_id`, `has_backup`, `telefono_original` de `raw_user_meta_data`

```sql
-- Restaurar telefonos originales sobrescritos
UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{phone}', to_jsonb(raw_user_meta_data->>'telefono_original'))
WHERE raw_user_meta_data->>'telefono_original' IS NOT NULL
  AND raw_user_meta_data->>'telefono_original' != ''
  AND raw_user_meta_data->>'phone' IS NOT NULL
  AND raw_user_meta_data->>'phone' != raw_user_meta_data->>'telefono_original';

-- Limpiar estados de backup
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data - 'backup_id' - 'has_backup' - 'telefono_original'
WHERE raw_user_meta_data->>'backup_id' IS NOT NULL
   OR raw_user_meta_data->>'has_backup' = 'true'
   OR raw_user_meta_data->>'telefono_original' IS NOT NULL;
```

## Ubicaciones del BackupBadge (5 lugares)

1. `src/components/chat/LiveChatCanvas.tsx` - Header del chat
2. `src/components/prospectos/ProspectosManager.tsx` - Vista tarjeta (x1) + tabla (x1)
3. `src/components/analysis/LiveMonitorKanban.tsx` - Cards de llamadas
4. `src/components/dashboard/widgets/ConversacionesWidget.tsx` - Widget conversaciones
5. `src/components/dashboard/widgets/ProspectosNuevosWidget.tsx` - Widget prospectos nuevos

## Flujo completo post-fix

```
Ejecutivo B hace logout → selecciona A como backup
  → assignBackup(B.id, A.id)
  → metadata: B.backup_id = A.id, B.has_backup = true
  → broadcast a canal backup:A.id
  → BackupBadgeWrapper de A recibe evento → re-check → badge aparece
  → permissionsService: A puede ver prospectos de B

Ejecutivo B hace login
  → removeBackup(B.id)
  → obtiene previousBackupId = A.id
  → metadata: B.backup_id = null, B.has_backup = false
  → broadcast a canal backup:A.id
  → BackupBadgeWrapper de A recibe evento → re-check → badge desaparece
  → permissionsService: A ya no ve prospectos de B
```

## Notas importantes

- El campo `telefono_original` se sigue enviando como `null` en `removeBackup()` para limpiar residuos legacy
- `assignBackup()` ya no guarda `telefono_original` (no hay nada que guardar)
- La visibilidad de prospectos del backup depende de `backup_id` + `has_backup` en `permissionsService.ts` (queries a `user_profiles_v2`)
- Cache de backup en `permissionsService` tiene TTL de 30s, se limpia automaticamente
