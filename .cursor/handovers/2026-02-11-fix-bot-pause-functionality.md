# Handover: Fix Bot Pause Functionality

**Fecha:** 2026-02-11
**Sesion:** Revisión y corrección completa del sistema de pausa de bot
**Estado:** Implementado, pendiente deploy a producción

---

## Contexto

El botón de "Pausar Bot" existe en dos ubicaciones:
1. **Módulo WhatsApp** (`LiveChatCanvas.tsx`) — en la barra superior de conversación seleccionada
2. **Módulo Inicio** (`ConversacionesWidget.tsx`) — en el widget de conversaciones recientes

El sistema permite pausar el bot de UChat para que no responda automáticamente mientras un agente humano atiende.

---

## Problemas Diagnosticados (6 total)

### 1. IDs incorrectos en `bot_pause_status` (48 registros basura)
- **Causa:** Fallback en `LiveChatCanvas.tsx:1722` usaba `waConv.id` (UUID de `conversaciones_whatsapp`) cuando `prospectoData?.id_uchat` era null
- **Impacto:** Pausas escritas con ID equivocado, backend no las encontraba
- **Fix:** Cambió fallback a `''` (string vacío) que es rechazado por validación

### 2. Tabla `bot_pause_status` NO estaba en Realtime
- **Causa:** Nunca fue agregada a `supabase_realtime` publication
- **Impacto:** Suscripciones Realtime nunca recibían eventos, solo funcionaba polling
- **Fix:** `ALTER PUBLICATION supabase_realtime ADD TABLE bot_pause_status`

### 3. 848 registros expirados nunca se limpiaban
- **Causa:** No había cron/trigger de limpieza. Solo `getPauseStatus()` limpiaba individualmente
- **Impacto:** Tabla crecía sin límite, queries lentos
- **Fix:** Limpieza manual + constraint CHECK + método `cleanupExpired()`

### 4. localStorage como fallback tóxico
- **Causa:** localStorage se usaba como respaldo y podía contradecir BD
- **Impacto:** Estado fantasma - bot aparecía pausado cuando ya no lo estaba
- **Fix:** Eliminado completamente. BD es fuente única de verdad

### 5. Edge Function → N8N innecesario
- **Causa:** El flujo original era Frontend → Edge Function → N8N → UChat API
- **Impacto:** Latencia, complejidad, punto de fallo adicional
- **Fix:** Ahora solo escribe en BD. Backend lee directamente de BD

### 6. Timer visual del BotPauseButton roto
- **Causa:** `Date.now() - Date.now()` siempre daba 0
- **Impacto:** Contador nunca decrementaba por sí solo
- **Fix:** Captura `startTime` al montar y calcula elapsed real

---

## Cambios Realizados

### Base de Datos (migraciones aplicadas)

```sql
-- Migration 1: fix_bot_pause_status_realtime_and_cleanup
ALTER PUBLICATION supabase_realtime ADD TABLE bot_pause_status;
DELETE FROM bot_pause_status WHERE is_paused = true AND paused_until < NOW();
DELETE FROM bot_pause_status WHERE uchat_id NOT LIKE 'f190385u%';
ALTER TABLE bot_pause_status ADD CONSTRAINT chk_uchat_id_format CHECK (uchat_id ~ '^f[0-9]+u[0-9]+$');

-- Migration 2: fix_bot_pause_status_replica_identity_full
ALTER TABLE bot_pause_status REPLICA IDENTITY FULL;
```

**Resultado:** 1,413 → 545 registros (868 eliminados: 48 IDs inválidos + 848 expirados)

### Archivos Modificados

#### `src/services/botPauseService.ts` (reescrito)
- `isValidUchatId()` — valida formato `f{digits}u{digits}` con regex
- `savePauseStatus()` — select + update/insert (upsert causaba 400)
- `resumeBot()` — UPDATE `is_paused=false` en vez de DELETE (auditoría)
- `getPauseStatus()` — ya no llama resumeBot al encontrar expirados
- `cleanupExpired()` — nueva función de mantenimiento
- Eliminado todo uso de localStorage

#### `src/components/chat/BotPauseButton.tsx`
- Timer corregido: captura `startTime = Date.now()` y calcula `elapsed` real

#### `src/components/chat/LiveChatCanvas.tsx`
- `pauseBot()`: ~100 → ~30 líneas. Solo `botPauseService.savePauseStatus()`
- `resumeBot()`: ~90 → ~20 líneas. Solo `botPauseService.resumeBot()`
- Eliminado: Edge Function `pause-bot-proxy`, N8N webhook, localStorage
- Fix ID fallback L1722: `waConv.id` → `''`
- Agregada suscripción Realtime a `bot_pause_status` (no existía)
- Timer expiración: eliminada escritura a localStorage

#### `src/components/dashboard/widgets/ConversacionesWidget.tsx`
- `pauseBot()` y `resumeBot()`: misma simplificación, solo BD
- Eliminado: Edge Function, localStorage, auth session para proxy

---

## Arquitectura Nueva (simplificada)

### Antes
```
Frontend → Edge Function (pause-bot-proxy) → N8N webhook → UChat API
    ↓
BD (bot_pause_status) + localStorage + estado React
```

### Ahora
```
Frontend → botPauseService → BD (bot_pause_status)
                                    ↓
                              Realtime → Todos los clientes sincronizados
Backend (N8N/Edge Functions) ← Lee directamente de BD
```

### Flujo de datos
1. **Pausar:** `botPauseService.savePauseStatus()` → INSERT/UPDATE en BD → Realtime notifica a todos los clientes
2. **Reanudar:** `botPauseService.resumeBot()` → UPDATE `is_paused=false` → Realtime notifica
3. **Lectura:** `botPauseService.getAllActivePauses()` filtra `is_paused=true AND paused_until > NOW()`
4. **UI inmediata:** `setBotPauseStatus()` actualiza estado local para feedback inmediato, Realtime sincroniza entre pestañas/usuarios

---

## Tabla `bot_pause_status` (estado actual)

```sql
CREATE TABLE bot_pause_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uchat_id VARCHAR(255) NOT NULL UNIQUE,
  is_paused BOOLEAN DEFAULT false,
  paused_until TIMESTAMPTZ,
  paused_by VARCHAR(100) DEFAULT 'agent',
  duration_minutes INTEGER,
  paused_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraints
CONSTRAINT chk_uchat_id_format CHECK (uchat_id ~ '^f[0-9]+u[0-9]+$')
UNIQUE (uchat_id)

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE bot_pause_status;
ALTER TABLE bot_pause_status REPLICA IDENTITY FULL;

-- RLS
POLICY auth_read_bot_pause: SELECT true (authenticated)
POLICY auth_manage_bot_pause: ALL true (authenticated)
```

---

## Notas Importantes

- **Edge Function `pause-bot-proxy`** ya no se usa desde el frontend, pero sigue desplegada. Puede eliminarse cuando se confirme que backend tampoco la usa
- **N8N workflow `pause_bot`** ya no recibe llamadas del frontend. El backend ahora lee directamente de `bot_pause_status`
- **`resumeBot` no borra registros** — hace UPDATE `is_paused=false` para conservar historial de auditoría
- **Constraint CHECK** previene insertar IDs que no sean formato uchat (`f{digits}u{digits}`)
- **REPLICA IDENTITY FULL** necesario para que DELETE/UPDATE events de Realtime incluyan todas las columnas (no solo PK)
- **localStorage `bot-pause-status`** completamente eliminado del código. Puede quedar en browsers de usuarios existentes pero será ignorado

---

## Pendiente

- [ ] Deploy a producción
- [ ] Verificar que N8N/backend lee correctamente de `bot_pause_status` sin depender del webhook
- [ ] Considerar eliminar Edge Function `pause-bot-proxy` si ya no se usa
- [ ] Monitorear que Realtime funcione estable en producción (nuevo para esta tabla)
