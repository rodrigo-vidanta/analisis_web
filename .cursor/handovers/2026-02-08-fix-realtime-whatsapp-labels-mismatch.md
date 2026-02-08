# Handover: Fix Realtime Roto en Módulo WhatsApp + Auth Templates

**Fecha:** 8 de Febrero 2026
**Sesión:** Diagnóstico y corrección de Realtime muerto en LiveChatCanvas + Fix auth plantillas
**Estado:** Fixes aplicados (BD + código), pendiente deploy

---

## Problema 1: Realtime Muerto en Módulo WhatsApp

### Síntomas

- El módulo WhatsApp (LiveChatCanvas) dejó de recibir eventos Realtime
- Ni la columna de conversaciones ni los mensajes del chat se actualizaban
- El módulo de Dashboard (inicio) SÍ funcionaba correctamente (contador de mensajes en tiempo real)
- Persistía después de refresh completo + re-login

### Causa Raíz

**Triple fallo en Suscripción 3 del canal Realtime:**

1. **Nombre de tabla incorrecto en el código**: La suscripción referenciaba `whatsapp_labels_conversation` pero la tabla real en BD es `whatsapp_conversation_labels` (nombre invertido)

2. **Tabla ausente de la publicación Realtime**: `whatsapp_conversation_labels` NO estaba incluida en `supabase_realtime` publication

3. **Handler de error silencioso**: Cuando el servidor detectaba el mismatch entre los bindings del cliente y la publicación, generaba `"mismatch between server and client bindings"`. El handler en LiveChatCanvas **ignoraba** este error sin reconectar:

```ts
// ANTES (bug): ignoraba el error, canal quedaba muerto
if (errorMsg.includes('mismatch between server and client bindings')) {
    logDev('⚠️ Warning de mismatch (no crítico), continuando...');
    return; // ← NO reconectaba, canal muerto para TODAS las suscripciones
}
```

### Por qué Dashboard funcionaba

Dashboard usa un canal Realtime **diferente** que solo subscribe a tablas que SÍ están en la publicación. El canal de LiveChatCanvas tiene 4 suscripciones en UN solo canal — si una falla con mismatch, **todo el canal muere**.

### Estado de suscripciones del canal LiveChatCanvas

| # | Tabla | Evento | En publicación | Estado |
|---|-------|--------|----------------|--------|
| 1 | `mensajes_whatsapp` | INSERT | ✅ Sí | OK |
| 2 | `prospectos` | UPDATE | ✅ Sí | OK |
| 3 | `whatsapp_labels_conversation` ❌ | * | ❌ No existía | **BUG** |
| 4 | `llamadas_programadas` | UPDATE | ✅ Sí | OK |

### Corrección Aplicada

#### Fix BD (migración aplicada):
```sql
-- Migración: add_whatsapp_conversation_labels_to_realtime
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_conversation_labels;
```

#### Fix Código (`src/components/chat/LiveChatCanvas.tsx`):

**Cambio 1 - Línea 2539**: Nombre de tabla corregido
```ts
// ANTES:
table: 'whatsapp_labels_conversation',
// DESPUÉS:
table: 'whatsapp_conversation_labels',
```

**Cambio 2 - Líneas 2662-2667**: Handler de mismatch ahora reconecta
```ts
// DESPUÉS: reconecta en vez de ignorar
if (errorMsg.includes('mismatch between server and client bindings')) {
    console.error('❌ [REALTIME V4] Mismatch en bindings - reconectando...');
    scheduleReconnect('mismatch_error');
    return;
}
```

---

## Problema 2: "Authentication required" al Crear Plantillas WhatsApp

### Síntomas

Error 401 al intentar crear plantilla en Campañas > Plantillas > Nueva Plantilla:
```
Error creando template en uChat: Error: Authentication required
```

### Causa Raíz

`whatsappTemplatesService.ts` enviaba la **anon key** (`VITE_ANALYSIS_SUPABASE_ANON_KEY`) como Bearer token a la Edge Function `whatsapp-templates-proxy`, que valida JWT de usuario via `/auth/v1/user`.

### Corrección Aplicada (`src/services/whatsappTemplatesService.ts`)

1. Import de `supabaseSystemUI` para obtener sesión del usuario
2. Nuevo método `getUserAccessToken()`:
```ts
private async getUserAccessToken(): Promise<string> {
    const { data: { session } } = await supabaseSystemUI!.auth.getSession();
    if (!session?.access_token) {
        throw new Error('Authentication required');
    }
    return session.access_token;
}
```
3. Actualizado 5 métodos: `createTemplateInUChat`, `getTemplateFromUChat`, `updateTemplateInUChat`, `deleteTemplateInUChat`, `syncTemplatesFromUChat`
4. Eliminada constante `SUPABASE_ANON_KEY` no usada

---

## Hallazgos Adicionales (No corregidos)

### Replica Identity de `prospectos` = DEFAULT
- Con `DEFAULT (pk)`, los UPDATE events solo envían PK en `payload.old`
- El código compara `oldProspecto.ejecutivo_id !== updatedProspecto.ejecutivo_id`, pero `oldProspecto.ejecutivo_id` siempre es `undefined`
- Genera detección de "cambios" falsos en cada UPDATE
- **Recomendación**: Cambiar a `REPLICA IDENTITY FULL` para detección correcta

### Indicadores visuales de error en chat (REVERTIDOS)
- Se implementaron indicadores visuales (ring rojo + AlertTriangle) para mensajes con `delivery_status === 'error_uchat'`
- Se revertieron durante el diagnóstico del Realtime
- **Pendiente**: Re-implementar una vez confirmado que Realtime funciona correctamente

---

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/components/chat/LiveChatCanvas.tsx` | Fix nombre tabla `whatsapp_conversation_labels` + handler mismatch reconecta |
| `src/services/whatsappTemplatesService.ts` | Fix auth: JWT de usuario en vez de anon key |

## Migraciones SQL

| Version | Nombre | Efecto |
|---------|--------|--------|
| 20260208* | `add_whatsapp_conversation_labels_to_realtime` | Agrega tabla a publicación `supabase_realtime` |

## Verificación Post-Deploy

1. **Realtime WhatsApp**: Abrir módulo WhatsApp, enviar mensaje desde UChat/celular → debe aparecer en tiempo real
2. **Realtime conversaciones**: El sidebar de conversaciones debe actualizarse (último mensaje, reordenamiento)
3. **Realtime labels**: Cambiar etiqueta de un prospecto → debe reflejarse sin refresh
4. **Crear plantilla**: Campañas > Plantillas > Nueva Plantilla → debe crear sin error 401
5. **Consola**: Verificar que NO aparezca `"mismatch between server and client bindings"` en consola

---

## Notas Técnicas

- La tabla `whatsapp_labels_conversation` nunca existió — el nombre correcto siempre fue `whatsapp_conversation_labels`
- El bug se introdujo en la sesión del 2026-02-07 (FIX BUG 4 - etiquetas) cuando se agregó la Suscripción 3 con nombre invertido
- El mismatch error era intermitente: a veces el canal se conectaba parcialmente antes de recibir el error, dando la impresión de que "funcionaba a veces"
- El Dashboard no se veía afectado porque su canal Realtime es independiente
