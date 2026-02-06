# Handover: Fix uchat_messages table does not exist

**Fecha:** 6 de Febrero 2026  
**Tipo:** Bugfix crítico  
**Módulo:** WhatsApp LiveChat  
**Archivos modificados:** `LiveChatCanvas.tsx`, `ConversacionesWidget.tsx`

---

## Problema Reportado

Un usuario no podía enviar mensajes desde el módulo de WhatsApp. La consola mostraba:

```
❌ Error verificando mensajes existentes: {"code":"42P01","message":"relation \"public.uchat_messages\" does not exist"}
⚠️ [LiveChatCanvas] Conversación no encontrada en la lista actual. Recargando...
```

---

## Diagnóstico

### Verificación contra BD de producción (via MCP SupabaseREST)

| Tabla | Existe | Filas | Rol |
|---|---|---|---|
| `mensajes_whatsapp` | ✅ | 42,676 | **Fuente real** de mensajes WhatsApp |
| `conversaciones_whatsapp` | ✅ | 6,839 | **Fuente real** de conversaciones |
| `mv_conversaciones_dashboard` | ✅ | 3,525 | Vista materializada para UI |
| `user_profiles_v2` | ✅ | 145 | Vista segura post-auth nativo |
| `whatsapp_template_sends` | ✅ | 3,154 | Envíos de plantillas |
| `uchat_conversations` | ✅ | **0** | Existe pero vacía, sin uso real |
| `uchat_messages` | ❌ | — | **NO EXISTE** (script SQL nunca ejecutado) |
| `uchat_bots` | ✅ | 7 | Configuración de bots |

### Causa raíz

El script `scripts/sql/create_uchat_tables.sql` define la tabla `uchat_messages`, pero **nunca fue ejecutado** en producción. Tres funciones de sincronización en `LiveChatCanvas.tsx` intentaban leer/escribir en esta tabla inexistente:

1. **`syncMessagesForConversationWithUnread`** — INSERT a `uchat_messages` → error → `return` temprano → bloquea actualización de estado UI
2. **`syncMessagesForConversation`** — INSERT a `uchat_messages` → error silencioso → no actualiza estado
3. **`syncMessagesForOpenConversation`** — SELECT de `uchat_messages` → error 42P01 → `return` temprano → bloquea toda la sincronización

Estas funciones leían mensajes correctamente de `mensajes_whatsapp`, pero al fallar escribiendo/leyendo `uchat_messages`, hacían `return` antes de actualizar el estado en memoria (`setMessagesByConversation`), causando que los mensajes no se reflejaran en la UI.

---

## Solución Aplicada

### Principio: Los mensajes ya existen en `mensajes_whatsapp`. No necesitan duplicarse en `uchat_messages`.

### Cambios en `src/components/chat/LiveChatCanvas.tsx`

**1. `syncMessagesForConversationWithUnread` (línea ~5560)**
- Eliminado: INSERT a `uchat_messages` + UPDATE a `uchat_conversations`
- Agregado: Deduplicación en memoria con `Set` antes de actualizar estado
- El flujo ahora: `mensajes_whatsapp` → deduplicar con estado en memoria → `setMessagesByConversation`

**2. `syncMessagesForConversation` (línea ~5638)**
- Eliminado: INSERT a `uchat_messages` + UPDATE condicional a `uchat_conversations`
- Agregado: Actualización directa del estado en memoria con deduplicación
- El flujo ahora: `mensajes_whatsapp` → deduplicar → `setMessagesByConversation`

**3. `syncMessagesForOpenConversation` (línea ~5677)**
- Eliminado: SELECT de `uchat_messages` para verificar existentes (causa del error 42P01)
- Eliminado: UPSERT a `uchat_messages`
- Reemplazado: Verificación de existentes usando `messagesByConversation[id]` (estado en memoria)
- Se mantiene: `cleanupCacheForRealMessage`, actualización de estado, reordenamiento de conversaciones

### Cambios en `src/components/dashboard/widgets/ConversacionesWidget.tsx`

**Fallback de `loadMessages` (línea ~1979)**
- Eliminado: Fallback que cargaba desde `uchat_messages` cuando no hay `prospect_id`
- Reemplazado: Warning en consola + `setMessages([])` (las conversaciones sin `prospect_id` no tienen mensajes)

### Archivos NO modificados (no activos en producción)
- `ChatWindowReal.tsx` — No importado en ningún otro archivo
- `LiveChatComplete.tsx` — No importado en ningún otro archivo
- `uchatService.ts` — Tiene métodos que usan `uchat_messages` pero no son llamados por las funciones corregidas
- Suscripciones realtime a `uchat_messages` en `ConversacionesWidget.tsx` — Son inofensivas (no generan errores, simplemente no reciben eventos)

---

## Validaciones Realizadas

### Contra BD de producción
- ✅ `uchat_messages` confirmado como **NO existente** (error 42P01)
- ✅ `uchat_conversations` existe pero tiene **0 filas** (tabla vacía)
- ✅ `mensajes_whatsapp` tiene **42,676 filas** (fuente real)
- ✅ `user_profiles_v2` funciona correctamente (145 perfiles, post-migración auth nativo)
- ✅ `mv_conversaciones_dashboard` funciona (3,525 filas)

### Documentación revisada
- ✅ Migración BD unificada PQNC_AI — Ambos clientes apuntan a `glsmifhkoaifvaegsozd`
- ✅ Migración auth custom → auth nativo (enero 2026) — `user_profiles_v2` es la vista correcta
- ✅ Refactors de seguridad (pentesting enero 2026) — RLS habilitado, clientes `*Admin` eliminados
- ✅ No hay planes de crear/usar `uchat_messages` documentados

### Técnicas
- ✅ TypeScript compila limpio (`tsc --noEmit` exit code 0)
- ✅ 0 referencias a `uchat_messages` restantes en `LiveChatCanvas.tsx`
- ✅ 0 errores de lint

---

## Flujo de datos corregido

```
ANTES (roto):
mensajes_whatsapp → sync function → INSERT uchat_messages (❌ NO EXISTE) → return → UI nunca se actualiza

AHORA (correcto):
mensajes_whatsapp → sync function → deduplicar en memoria → setMessagesByConversation → UI actualizada
```

---

## Deuda técnica pendiente

### Baja prioridad
1. **`uchat_conversations` (0 filas):** La tabla existe pero está vacía. Hay código que escribe a ella (ej: `syncNewConversations`, updates de `message_count`). Estas escrituras son no-ops efectivos (no match por ID) pero generan requests innecesarios. Considerar eliminar estas escrituras.

2. **`uchatService.ts`:** Servicio completo con métodos que operan sobre `uchat_messages` y `uchat_conversations`. No causa errores porque los métodos no son llamados directamente por las funciones corregidas, pero es código muerto.

3. **`ChatWindowReal.tsx` y `LiveChatComplete.tsx`:** Componentes que usan `uchat_messages` pero no están importados/montados. Código muerto.

4. **Suscripciones realtime a `uchat_messages`** en `ConversacionesWidget.tsx`: Son silenciosas (tabla no existe → no reciben eventos) pero podrían limpiarse.

### Decisión pendiente
- ¿Crear `uchat_messages` ejecutando `scripts/sql/create_uchat_tables.sql`? — **No recomendado**. La tabla sería redundante con `mensajes_whatsapp`. Mejor eliminar las referencias.
- ¿Eliminar `uchat_conversations`? — Requiere auditar todos los usos primero. Prioridad baja ya que no causa errores.

---

## Archivos clave de referencia

| Archivo | Propósito |
|---|---|
| `src/components/chat/LiveChatCanvas.tsx` | Componente principal de LiveChat (modificado) |
| `src/components/dashboard/widgets/ConversacionesWidget.tsx` | Widget del dashboard (modificado) |
| `src/services/uchatService.ts` | Servicio UChat (código muerto, no modificado) |
| `scripts/sql/create_uchat_tables.sql` | Script SQL nunca ejecutado |
| `src/services/optimizedConversationsService.ts` | Feature flag para vista optimizada |
| `docs/MIGRACION_AUTH_USERS_NATIVO_2026-01-20.md` | Migración auth nativo |
| `docs/PENTESTING_2026-01-16_FINAL.md` | Refactors de seguridad |

---

**Estado:** Fix aplicado, pendiente de deploy  
**Riesgo:** Bajo — Solo elimina dependencias de tabla inexistente  
**Rollback:** Revertir los 2 archivos al estado anterior (pero el error regresaría)
