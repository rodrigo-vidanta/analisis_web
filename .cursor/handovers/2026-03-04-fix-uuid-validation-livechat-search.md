# Fix: UUID Validation in LiveChat user_profiles_v2 Queries

**Fecha:** 2026-03-04
**Tipo:** Bug fix
**Archivo modificado:** `src/components/chat/LiveChatCanvas.tsx`

## Problema

Al buscar un usuario (ej: "rodrigo mora") en el modulo de WhatsApp/LiveChat, la query a `user_profiles_v2` fallaba con error `22P02: invalid input syntax for type uuid`.

**Causa raiz:** El campo `id_sender` en `mensajes_whatsapp` almacena tanto:
- UUIDs reales de agentes del sistema (ej: `e8ced62c-3fd0-4328-b61a-a59ebea2e877`)
- IDs de subscribers de UChat (ej: `f190385u341675607`, `f190385u579138545`)

Cuando el frontend recolecta `id_sender` de los mensajes y los pasa a `user_profiles_v2.id` (columna tipo UUID), los IDs de UChat rompen la query completa, causando que NINGUN nombre de agente se resuelva.

## Solucion

Se agrego validacion UUID en 6 puntos del archivo `LiveChatCanvas.tsx`:

### Constantes agregadas (linea ~113)
```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUUID = (id: string): boolean => UUID_REGEX.test(id);
```

### Puntos de aplicacion

1. **`loadMessagesAndBlocks()`** - Filtro en `allUserIds` antes de `.in('id', ...)` query
2. **`syncMessagesForConversation()`** (mensajes nuevos) - `.filter(isValidUUID)` en `senderIds`
3. **Sync mensajes recientes** - `.filter(isValidUUID)` en `senderIds`
4. **Sync con dedup** - `.filter(isValidUUID)` en `senderIds`
5. **Realtime handler** - `&& isValidUUID(...)` en condicion antes de `.eq('id', ...)`
6. **Assigned agent lookup** - `&& isValidUUID(...)` en condicion antes de `.eq('id', ...)`

### Comportamiento resultante

- IDs de UChat se ignoran silenciosamente (el agente se muestra como "Usuario", fallback existente)
- La query ya no falla para los IDs validos restantes
- No hay cambio en BD, solo frontend

## Nota sobre datos

El problema de fondo es que `mensajes_whatsapp.id_sender` mezcla dos tipos de identificadores. Una solucion mas profunda seria resolver los IDs de UChat a UUIDs del sistema en el backend (N8N/Edge Function) antes de guardarlos. Este fix es defensivo en frontend.

## Patron reutilizable

El regex `UUID_REGEX` ya existia en `src/services/botPauseService.ts`. Ahora tambien esta en `LiveChatCanvas.tsx`. Si se necesita en mas archivos, considerar extraer a un util compartido.
