# Handover: Fix Avatar Upload - Cliente Supabase Incorrecto

**Fecha:** 2026-02-11
**Estado:** Completado
**Archivo modificado:** `src/components/shared/UserProfileModal.tsx`

## Problema

Al subir un avatar desde el modal de perfil de usuario, se producía el error:

```
ReferenceError: supabaseSystemUI is not defined
    at handleAvatarFileSelect (UserProfileModal.tsx:140:34)
```

## Causa Raíz

El import en línea 5 usaba aliases que no coincidían con las referencias en el código:

```ts
// ANTES (línea 5) - import con aliases
import { supabaseSystemUI as supabase, supabaseSystemUI as supabaseAdmin } from '../../config/supabaseSystemUI';

// Líneas 108-135 usaban `supabaseAdmin` (alias) → funcionaba en storage
// Líneas 140, 171 usaban `supabaseSystemUI` (nombre original) → NO existía como variable local → ReferenceError
```

Había **3 nombres diferentes** para el mismo cliente en un solo archivo: `supabase`, `supabaseAdmin`, `supabaseSystemUI`. Solo los dos primeros existían como variables locales.

## Fix Aplicado

1. **Import simplificado** - Sin aliases, importar directamente como `supabaseSystemUI`:
   ```ts
   import { supabaseSystemUI } from '../../config/supabaseSystemUI';
   ```

2. **Todas las referencias unificadas** a `supabaseSystemUI` (storage upload, getPublicUrl, RPC, delete)

3. **Null checks agregados** antes de usar el cliente (TypeScript lo requiere porque `supabaseSystemUI` puede ser `null`):
   ```ts
   if (!supabaseSystemUI) {
     throw new Error('Cliente Supabase no inicializado');
   }
   ```

4. **Logs de debug removidos** (console.log de configuración del cliente que ya no son necesarios)

## Infraestructura Verificada

Todo existe en PQNC_AI (`glsmifhkoaifvaegsozd`):

| Recurso | Estado | Detalle |
|---------|--------|---------|
| Bucket `user-avatars` | Existe, público | `storage.buckets` |
| Tabla `user_avatars` | Existe en `public` | Almacena metadata del avatar |
| RPC `upload_user_avatar` | Existe en `public` | SECURITY DEFINER, acepta `p_file_name` y `p_filename` (COALESCE) |

## Nota: AvatarUpload.tsx (Admin)

El componente `src/components/admin/AvatarUpload.tsx` también maneja avatares pero importa `supabaseSystemUI` correctamente (sin aliases). Usa el parámetro `p_filename` en lugar de `p_file_name` en la RPC, pero la función en BD acepta ambos via `COALESCE(p_file_name, p_filename)`. No requirió cambios.

## Archivos Tocados

| Archivo | Cambio |
|---------|--------|
| `src/components/shared/UserProfileModal.tsx` | Fix import, unificar cliente, null checks, limpiar logs |
