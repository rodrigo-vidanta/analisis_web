# Handover: Fix Admin Email Update Not Persisting

**Fecha:** 2026-03-13
**Version:** Pendiente deploy
**Branch:** main

## Resumen

El campo email en la edicion de usuarios (Admin > Usuarios > Editar) no se persistia al guardar. El cambio se veia en la UI pero al recargar volvia al valor anterior.

## Causa Raiz

**Archivo:** `src/components/admin/UserManagementV2/hooks/useUserManagement.ts`

La funcion `updateUserStatus()` construye un objeto `metadataUpdates` filtrando solo campos listados en el array `metadataFields` (linea 1042). **El campo `email` no estaba en esa lista.**

El flujo era:
1. `UserEditPanel.tsx` recolecta el email correctamente del formulario
2. `updateUserStatus()` recibe el email en `filteredUpdates`
3. `metadataFields` NO incluye `email` → se excluye de `metadataUpdates`
4. Se llama `updateUserMetadata` sin el email
5. Estado local de React SI se actualiza (linea 1096) → ilusión de que funciono
6. Al recargar, auth.users tiene el email original

La Edge Function `auth-admin-proxy` ya tenia la operacion `updateUserEmail` (lineas 727-766) lista para usar, pero **nunca era invocada** desde el frontend.

## Solucion

Antes de la llamada a `updateUserMetadata`, se agrego una verificacion:
- Si `filteredUpdates.email` existe Y es diferente al email actual del usuario
- Se invoca `auth-admin-proxy` con operacion `updateUserEmail`
- Si falla, lanza error antes de actualizar metadata

La operacion `updateUserEmail` en la Edge Function:
- Normaliza email (trim + lowercase)
- Verifica que el usuario existe
- Usa `supabase.auth.admin.updateUserById()` para actualizar en `auth.users`

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/admin/UserManagementV2/hooks/useUserManagement.ts` | +29 lineas: llamada a `updateUserEmail` antes de `updateUserMetadata` |

## Accion Manual Realizada

- Email actualizado directamente en BD: `lidiaclavijom@vidavacations.com` → `lidiaclavijo@vidavacations.com` (user `c32a159c-1392-4099-a2ed-0c7f75351d8b`)

## Verificacion

- TypeScript compila sin errores (`npx tsc --noEmit`)
- La Edge Function `auth-admin-proxy` ya soportaba `updateUserEmail` — no requiere deploy de Edge Functions
- Solo requiere deploy frontend

## Notas

- La operacion `updateUserEmail` estaba implementada desde la creacion de `auth-admin-proxy` pero nunca se conecto al flujo de edicion de usuarios
- El estado local de React enmascaraba el bug — el usuario veia el cambio hasta refrescar la pagina
