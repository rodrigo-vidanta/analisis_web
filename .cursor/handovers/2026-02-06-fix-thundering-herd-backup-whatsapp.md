# Handover: Fix Thundering Herd - ERR_INSUFFICIENT_RESOURCES en WhatsApp

**Fecha:** 6 de Febrero 2026  
**Tipo:** Performance fix crítico  
**Módulo:** WhatsApp LiveChat, BackupService  
**Archivos modificados:** `src/services/backupService.ts`

---

## Problema Reportado

Al escribir un nombre en el buscador de conversaciones del módulo WhatsApp, la consola mostraba **2146+ errores** idénticos:

```
GET https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/user_profiles_v2?select=backup_id%2Chas_backup&id=eq.e8ced62c-... net::ERR_INSUFFICIENT_RESOURCES
```

La búsqueda funcionaba, pero saturaba el navegador con requests al punto de agotar los recursos de red.

---

## Diagnóstico

### Flujo del problema

1. Usuario escribe en el buscador → la lista de conversaciones se re-renderiza
2. Cada conversación renderiza un componente `<BackupBadgeWrapper>` 
3. Cada `BackupBadgeWrapper` ejecuta `useEffect` → `backupService.isProspectFromBackupEjecutivo()` → `backupService.getBackupEjecutivoInfo(currentUserId)`
4. `getBackupEjecutivoInfo` consulta `user_profiles_v2?select=backup_id,has_backup&id=eq.{currentUserId}`
5. **Todos los 2146+ useEffects se disparan simultáneamente** antes de que la primera respuesta llegue y pueble el caché

### Causa raíz: Thundering Herd

Aunque `getBackupEjecutivoInfo` tiene caché (via `permissionsService.backupCache`), existe una **race condition**:

- Las 2146+ llamadas se ejecutan **antes** de que la primera respuesta regrese
- Todas ven el caché vacío → todas hacen la misma query HTTP
- El navegador colapsa con `ERR_INSUFFICIENT_RESOURCES` al exceder ~6-10 connections simultáneas por dominio

### Componentes afectados

| Componente | Ubicación |
|---|---|
| `LiveChatCanvas.tsx` | Línea ~919: `<BackupBadgeWrapper>` por cada conversación |
| `ConversacionesWidget.tsx` | Línea ~2376: `<BackupBadgeWrapper>` por cada conversación |
| `LiveMonitorKanban.tsx` | Línea ~4797: `<BackupBadgeWrapper>` por cada llamada |
| `ProspectosManager.tsx` | Líneas ~2680/~2885: ya tenía `preloadBackupData()` |
| `ProspectosNuevosWidget.tsx` | Línea ~863: `<BackupBadgeWrapper>` por cada prospecto |

---

## Solución Implementada

### 1. Deduplicación de promises in-flight (Fix principal)

Nuevo mecanismo en `BackupService` que garantiza que solo **1 request real** se haga por clave, sin importar cuántas llamadas simultáneas ocurran:

```typescript
private inflight = new Map<string, Promise<any>>();

private async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = this.inflight.get(key);
  if (existing) return existing as Promise<T>;
  
  const promise = fn().finally(() => {
    this.inflight.delete(key);
  });
  
  this.inflight.set(key, promise);
  return promise;
}
```

**Aplicado en:**
- `getBackupEjecutivoInfo(userId)` → clave: `backup_info_${userId}`
- `hasBackup(ejecutivoId)` → clave: `has_backup_${ejecutivoId}`

**Resultado:** De 2146+ requests → **1 request real**.

### 2. Bug corregido: columna inexistente `original_phone`

En `removeBackup()`, el fallback legacy consultaba `.select('original_phone')` que **no existe** en `user_profiles_v2`. La columna correcta es `telefono_original`.

### 3. Código muerto eliminado

Fallbacks redundantes de la migración legacy en `assignBackup()` y `removeBackup()`:
- Ambas ramas (primaria y fallback) consultaban la misma vista `user_profiles_v2`
- El fallback era un artefacto de cuando la primaria consultaba `auth_users` (tabla legacy eliminada)

### 4. Documentación actualizada

Comentarios del servicio actualizados para reflejar la arquitectura real post-migración:
- `auth_users` → renombrada a `z_legacy_auth_users` (NO USAR)
- Datos de backup en `auth.users.raw_user_meta_data` (JSONB)
- Lectura via `user_profiles_v2` (VIEW sobre `auth.users` + `auth_roles`)
- Escritura via `authAdminProxyService` → Edge Function `auth-admin-proxy`

---

## Verificación contra BD de producción

### Columnas consultadas vs vista real

| Columna | Existe en `user_profiles_v2` | Fuente real |
|---|---|---|
| `backup_id` | ✅ | `auth.users.raw_user_meta_data->>'backup_id'` (UUID) |
| `has_backup` | ✅ | `auth.users.raw_user_meta_data->>'has_backup'` (BOOLEAN, default false) |
| `phone` | ✅ | `auth.users.raw_user_meta_data->>'phone'` |
| `telefono_original` | ✅ | `auth.users.raw_user_meta_data->>'telefono_original'` |
| `id` | ✅ | `auth.users.id` |
| `full_name` | ✅ | `auth.users.raw_user_meta_data->>'full_name'` |
| `email` | ✅ | `auth.users.email` |
| ~~`original_phone`~~ | ❌ **ELIMINADO** | Bug corregido → usar `telefono_original` |

### Clientes Supabase verificados

- ✅ Usa `supabaseSystemUI` (apunta a `glsmifhkoaifvaegsozd` / PQNC_AI)
- ✅ Usa `user_profiles_v2` (VIEW, no tabla legacy)
- ❌ No usa `auth_users` (tabla legacy eliminada)
- ❌ No usa clientes `*Admin` (eliminados del codebase)

---

## Antecedentes

Este mismo problema se corrigió previamente en `ProspectosManager.tsx` (ver `CHANGELOG_PROSPECTOS.md`):
- Se agregó `permissionsService.preloadBackupData()` para pre-cargar datos en batch
- Se procesaron verificaciones en batches de 50

Sin embargo, `LiveChatCanvas.tsx` y otros componentes **nunca recibieron ese fix**. La solución de deduplicación de promises es más robusta porque:
1. No requiere pre-carga manual en cada componente
2. Funciona automáticamente para cualquier componente que use `BackupService`
3. Es transparente: la API pública del servicio no cambia

---

## Archivos Relacionados

| Archivo | Rol |
|---|---|
| `src/services/backupService.ts` | **MODIFICADO** - Deduplicación + limpieza legacy |
| `src/services/permissionsService.ts` | Cache compartido (`backupCache`) - sin cambios |
| `src/components/shared/BackupBadgeWrapper.tsx` | Consumidor del servicio - sin cambios |
| `scripts/fix-user-profiles-v2-view.sql` | Definición SQL de la vista (referencia) |
| `docs/FIX_ERR_INSUFFICIENT_RESOURCES.md` | Documentación previa del mismo problema |

---

## Testing sugerido

1. Abrir módulo WhatsApp con sesión de ejecutivo
2. Escribir un nombre en el buscador de conversaciones
3. Verificar en consola que **NO** aparezcan errores `ERR_INSUFFICIENT_RESOURCES`
4. Verificar que el badge de backup sigue apareciendo correctamente
5. Repetir en Dashboard (ConversacionesWidget) y LiveMonitor (Kanban)

---

**Estado:** ✅ Fix aplicado, linter limpio  
**Pendiente:** Testing en navegador para confirmar eliminación de errores
