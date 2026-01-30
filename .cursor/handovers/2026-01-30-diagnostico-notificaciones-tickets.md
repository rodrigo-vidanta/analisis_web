# Handover: Diagnostico notificaciones tickets

---

## Informacion de Sesion

- **Fecha:** 2026-01-30
- **Duracion aproximada:** 1.5 horas
- **Modelo utilizado:** GPT-5.2
- **Mensajes aproximados:** 2

---

## Tarea Principal

**Objetivo:** Diagnosticar por que las notificaciones de tickets llegan mal y documentar hallazgos.

**Modulo afectado:** `src/services/ticketService.ts`, `src/components/support/`, migraciones SQL de tickets.

---

## Estado Actual

### Archivos Modificados:

1. Ninguno (solo diagnostico).

### Cambios Completados:

- [x] Conexion MCP a PQNC_AI validada.
- [x] Revision de tablas tickets/notificaciones via MCP.
- [x] Revision de triggers y funciones SQL en migraciones.
- [x] Analisis de flujo frontend (suscripcion realtime, badges).
- [x] Diagnostico y evidencia con ejemplos reales de notificaciones.

### Cambios Pendientes:

- [ ] Implementar correcciones en SQL (alinear admin, dedupe, last_comment).
- [ ] Ajustar frontend para sincronizar badge con UPDATE/mark-read.
- [ ] Pruebas E2E de notificaciones y badges.

---

## Contexto Tecnico Critico

### Decisiones Tomadas:

1. **No ejecutar cambios en BD:** solo diagnostico solicitado.
2. **Usar MCP SupabaseREST:** queries via `query_table` por bloqueo de `information_schema`.

### Problemas Encontrados:

1. **Inconsistencia de admin en triggers:**
   - `get_support_admin_ids()` usa `auth_users.role_id` (admin/admin_operativo/developer)
   - `notify_new_comment()` usa `user_profiles_v2.role_name` (admin/admin_operativo/coordinador)
   - Impacto: destinatarios incorrectos y notificaciones perdidas/extra.
2. **Duplicacion por asignacion:**
   - `notify_new_ticket()` ya notifica a todos los admins.
   - `notify_ticket_assignment()` vuelve a notificar al mismo usuario sin dedupe.
3. **Badge desincronizado en frontend:**
   - `SupportButton` incrementa en INSERT y no escucha UPDATE/mark-read.
4. **Race en badges de mensaje:**
   - `mark_ticket_viewed()` marca `last_comment_read_at` y notificaciones leidas; si entra comentario en medio, badge puede quedar mal.
5. **Limitacion MCP:** `get_schema/get_table_info/execute_sql` fallan por `information_schema` no expuesta en `public`.

### Dependencias Importantes:

- Servicio: `ticketService` (notificaciones + badges)
- Triggers SQL: `notify_new_ticket`, `notify_new_comment`, `notify_ticket_assignment`, `mark_ticket_viewed`
- Realtime: tabla `support_ticket_notifications`

---

## Evidencia MCP

- `support_tickets`: 65
- `support_ticket_notifications`: 1172
- `support_ticket_views`: 35
- `support_ticket_comments`: 76
- `support_ticket_history`: 53
- `user_notifications`: 256

Ejemplo real:
- Ticket `b4d68fe8-0c51-484e-941d-0c696e895cad` genero 15 notificaciones `new_ticket` a multiples `user_id` (contexto `all_admins`).

---

## Archivos Clave Revisados

- `migrations/20260120_realtime_notifications.sql`
- `migrations/20260123_fix_ticket_notifications.sql`
- `migrations/20260124_system_user_no_notifications.sql`
- `src/services/ticketService.ts`
- `src/components/support/SupportButton.tsx`
- `src/components/support/AdminTicketsPanel.tsx`
- `src/components/support/MyTicketsModal.tsx`
- `src/components/support/README_TICKETS.md`
- `.cursor/rules/tickets-system.mdc`

---

## Para Continuar

### Proximo Paso Inmediato:

```
Crear migracion SQL para:
1) is_support_admin(user_id)
2) dedupe en notify_ticket_assignment()
3) trigger separado update last_comment_at
Luego ajustar frontend para recalculo de badge en UPDATE/mark-read.
```

### Archivos a Cargar en Nueva Sesion:

```
@migrations/20260123_fix_ticket_notifications.sql
@migrations/20260124_system_user_no_notifications.sql
@src/services/ticketService.ts
@src/components/support/SupportButton.tsx
```

### Comando para Iniciar Nueva Sesion:

```
"Continuo desde handover del 2026-01-30.
Trabajando en: diagnostico y fix de notificaciones de tickets
Archivo principal: src/services/ticketService.ts
Proximo paso: migracion SQL (admin/dedupe/last_comment) + ajuste badge frontend"
```

---

## Notas Adicionales

- MCP SupabaseREST responde OK con `query_table`, pero no permite `information_schema` en `public`.
- Existe diagnostico previo en `.cursor/handovers/2026-01-30-diagnostico-sistema-tickets-notificaciones.md` con hallazgos similares.

---

**Guardado por:** Assistant  
**Timestamp:** 2026-01-30T21:20:00.000Z
