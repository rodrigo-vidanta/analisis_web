# Sistema de clasificación `bloqueo_meta` para errores de ecosistema WhatsApp

**Fecha:** 2026-02-19
**Tipo:** Feature (backend + frontend)
**Estado:** Implementado, pendiente deploy frontend

## Contexto

Meta/WhatsApp tiene un sistema de "salud de ecosistema" que bloquea mensajes de marketing cuando un usuario ya recibió demasiada publicidad. Estos bloqueos NO son errores de entrega ni problemas nuestros - son decisiones de Meta para proteger a los usuarios.

Anteriormente, todos los errores de entrega se clasificaban como `bloqueado_whatsapp`. Ahora se distinguen en dos categorías con tratamiento visual diferente.

## Clasificación de error codes

### `bloqueo_meta` (decisión de Meta, informativo)
| Código | Descripción | Total histórico |
|--------|-------------|-----------------|
| 131049 | "Not delivered to maintain healthy ecosystem engagement" | 456 |
| 130472 | "User's number is part of an experiment" | 47 |
| 131050 | "Recipient has chosen to stop receiving marketing messages" | 2 |

### `bloqueado_whatsapp` (error real de entrega)
| Código | Descripción | Total histórico |
|--------|-------------|-----------------|
| 131042 | "Business eligibility payment issue" | 1,872 |
| 131026 | "Message undeliverable" | 190 |
| 131053 | "Media upload error" | 92 |
| 131000 | "Something went wrong" | 8 |
| Otros | Timeouts, parámetros | 7 |

## Cambios implementados

### 1. Base de datos

#### Check constraint actualizado
```sql
-- Migration: add_bloqueo_meta_to_status_check
ALTER TABLE mensajes_whatsapp DROP CONSTRAINT mensajes_whatsapp_status_check;
ALTER TABLE mensajes_whatsapp ADD CONSTRAINT mensajes_whatsapp_status_check
  CHECK (status = ANY (ARRAY[
    'enviado', 'bloqueado_guardrail', 'bloqueado_whatsapp',
    'bloqueo_meta', 'sin_respuesta'
  ]));
```
- Se eliminó `error_uchat` obsoleto (renombrado a `bloqueado_whatsapp` en sesión anterior)

#### Trigger actualizado
```sql
-- Migration: add_bloqueo_meta_status
-- propagate_error_to_template_sends() ahora dispara para AMBOS status
IF (NEW.status IN ('bloqueado_whatsapp', 'bloqueo_meta')) AND OLD.status = 'enviado'
```

#### Datos migrados
- **265 registros** en `mensajes_whatsapp` cambiados de `bloqueado_whatsapp` → `bloqueo_meta`
- Criterio: mensajes de plantilla vinculados a errores con codes 131049, 130472, 131050

### 2. Edge Function `receive-uchat-error` v6

**Cambio clave:** Nueva función `classifyStatus()` que determina el status según el error code.

```typescript
const META_ECOSYSTEM_CODES = new Set(["131049", "130472", "131050"]);

function classifyStatus(errorCode: string | null): string {
  if (errorCode && META_ECOSYSTEM_CODES.has(errorCode)) {
    return "bloqueo_meta";
  }
  return "bloqueado_whatsapp";
}
```

- El status clasificado se aplica a `mensajes_whatsapp.status`
- Response incluye `status_applied` para debugging
- `verify_jwt: false` restaurado después del deploy (MCP siempre resetea a true)

### 3. Frontend - Tratamiento visual diferenciado

| Status | Color | Icono | Texto | Significado |
|--------|-------|-------|-------|-------------|
| `bloqueado_whatsapp` | Naranja | `AlertTriangle` | "No entregado" | Error real de entrega |
| `bloqueo_meta` | Azul/slate | `Info` | "Limitado por Meta" | Restricción externa |

#### Archivos modificados

| Archivo | Línea | Cambio |
|---------|-------|--------|
| `LiveChatCanvas.tsx` | 84 | Import `Info` de lucide-react |
| `LiveChatCanvas.tsx` | 197 | `bloqueo_meta` agregado al tipo `Message.status` |
| `LiveChatCanvas.tsx` | 2258 | Realtime UPDATE incluye `bloqueo_meta` en `blockedStatuses` |
| `LiveChatCanvas.tsx` | 8753 | Timestamp: `Info` icon azul + "Limitado por Meta" (tooltip explicativo) |
| `LiveChatCanvas.tsx` | 8796 | Avatar: gradiente `from-slate-400 to-blue-500` con icono `Info` |

#### Detalle del render (timestamp area)
```tsx
{message.status === 'bloqueo_meta' && (
  <span className="flex items-center gap-1 text-blue-300"
        title="Meta limitó este envío para proteger al usuario de exceso de marketing">
    <Info className="w-3 h-3" />
    <span className="text-[10px]">Limitado por Meta</span>
  </span>
)}
```

#### Detalle del avatar
```tsx
message.status === 'bloqueo_meta'
  ? 'bg-gradient-to-br from-slate-400 to-blue-500'  // azul informativo
  // vs bloqueado_whatsapp:
  // 'bg-gradient-to-br from-orange-400 to-orange-600'  // naranja advertencia
```

## Status actuales del sistema de mensajes WhatsApp

| Status | Significado | Visual |
|--------|-------------|--------|
| `enviado` | Mensaje enviado correctamente | Normal (verde/violeta/azul) |
| `bloqueado_whatsapp` | Error de entrega WhatsApp | Naranja + AlertTriangle + "No entregado" |
| `bloqueo_meta` | Meta limitó el envío (ecosistema) | Azul + Info + "Limitado por Meta" |
| `bloqueado_guardrail` | Bloqueado por guardrail AI | (preexistente) |
| `sin_respuesta` | Sin respuesta del prospecto | (preexistente) |

## Flujo completo de clasificación

```
UChat Push Error → Edge Function receive-uchat-error v6
  ↓
  extractErrorCode() → "131049"
  ↓
  classifyStatus("131049") → "bloqueo_meta"
  ↓
  UPDATE mensajes_whatsapp SET status = 'bloqueo_meta'
  ↓
  TRIGGER propagate_error_to_template_sends
  ↓
  UPDATE whatsapp_template_sends SET status = 'FAILED'
  ↓
  Realtime UPDATE → Frontend actualiza visual en tiempo real
```

## Notas importantes
- `verify_jwt` se resetea a `true` en cada deploy de Edge Function via MCP → siempre hacer PATCH después:
  ```bash
  curl -X PATCH "https://api.supabase.com/v1/projects/glsmifhkoaifvaegsozd/functions/receive-uchat-error" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"verify_jwt": false}'
  ```
- Build verificado exitosamente (tsc + vite build)
- No se deployó frontend en esta sesión
