# HANDOVER-2026-02-08-REACTIVATE-MODAL-REBUILD

**Fecha**: 2026-02-08 | **Versión**: v2.5.93+ | **Build**: ok

## Contexto
1. Errores 42501 (permission denied) en consola al cerrar sesión — race condition entre invalidación de token y polling de `LiveCallActivityWidget`.
2. Reconstrucción completa de `ReactivateConversationModal` con ranking por tasa de respuesta, star ratings, nuevos límites de envío, tabs Top/Mis Plantillas, y detección de compatibilidad prospecto-plantilla.

## Delta

| Bloque | Descripción |
|--------|-------------|
| 1 | Fix 42501: silenciar errores `permission denied` en `permissionsService` y `liveActivityStore` durante logout |
| 2 | Nuevos límites de envío: DAILY=1, WEEKLY=2 (era 3), MONTHLY=5 (era 8), SEMESTER=8 (NUEVO, 180 días) |
| 3 | Nuevo método `getTemplateResponseRates()` — calcula tasa de respuesta y star rating (1-5) por plantilla |
| 4 | Reescritura completa del modal: layout 2 paneles, tabs Top/Mis, star ratings, limit pills, plantillas incompatibles visibles con campos faltantes |

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/services/permissionsService.ts` | `getCoordinacionesFilter()`: guard `error.code !== '42501'` antes de `console.error` |
| `src/stores/liveActivityStore.ts` | 2 guards para 42501: en query de prospectos coordinación (~L360) y catch principal (~L547). Limpia state silenciosamente |
| `src/services/whatsappTemplatesService.ts` | `TemplateSendLimits.semesterLimit` nuevo campo. `checkTemplateSendLimits()`: WEEKLY_MAX=2, MONTHLY_MAX=5, SEMESTER_MAX=8, query ampliada a 180 días. `canSendTemplateToProspect()`: check semestre. Nuevo `getTemplateResponseRates()`: agrupa `whatsapp_template_sends` por `template_id`, min 5 envíos, star rating 1-5 |
| `src/components/chat/ReactivateConversationModal.tsx` | Reescritura completa (~1565 líneas, era 1978). Layout 2 paneles (45/55%). Tabs: Top Plantillas (por starRating desc) + Mis Plantillas (por `suggested_by`). `StarRating` inline con spring animation. `LimitPill` con 4 pills (día/semana/mes/semestre). `canProspectFulfillTemplate` retorna `{ canFulfill, missingFields }`. Plantillas incompatibles visibles al final, grises, con badge "Faltan: campo1, campo2". Botón "Sugerir plantilla" siempre visible. Scrollbars invisibles. Dark mode completo. Portal rendering |

## Decisiones Técnicas

- **Star rating calibrado a datos reales**: Top template real = 23.1% reply rate. Escalas: 0-5%→1★, 5-10%→2★, 10-15%→3★, 15-20%→4★, 20%+→5★. Mínimo 5 envíos para mostrar rating (evitar sesgo de muestras pequeñas). Alternativa descartada: percentiles dinámicos — demasiado volátil con pocos datos.
- **Plantillas incompatibles visibles**: Se muestran al final grises con campos faltantes específicos, NO ocultas. Permite al usuario saber que existen y qué les falta al prospecto para poder usarlas.
- **Semestre como nuevo período**: 180 días rolling window (no semestre calendario) para máx 8 plantillas únicas. Evita fatiga del prospecto a largo plazo.
- **Suggest siempre visible**: Botón "Sugerir plantilla" no condicionado a `sendLimits.canSend`. Funciona incluso cuando bloqueado por límites.

## Trampas y Gotchas

- `whatsapp_template_sends.replied` = boolean (NOT null para no enviados, `true`/`false` para enviados)
- `getTemplateResponseRates()` filtra `status = 'SENT'` — no cuenta errores ni pendientes
- `semesterLimit.usedTemplateIds` contiene IDs únicos de templates enviados en 180 días (para verificar unicidad en `canSendTemplateToProspect`)
- `canProspectFulfillTemplate` solo verifica campos donde `mapping.table_name === 'prospectos'` — variables custom (fecha, hora, destino) se ignoran ya que son editables

## Pendiente

1. Testing visual en producción: verificar que star ratings se muestran correctamente con datos reales
2. Verificar que tab "Mis Plantillas" filtra correctamente por `suggested_by === user.id`
3. Considerar aplicar el mismo diseño de star ratings al modal de importación (`ImportWizardModal`)

## Estado

- Build: vite ok
- Deploy: pendiente
- Archivos sin commit: `src/services/whatsappTemplatesService.ts`, `src/components/chat/ReactivateConversationModal.tsx`, `src/services/permissionsService.ts`, `src/stores/liveActivityStore.ts` (+ cambios previos de homologación UI y horarios dinámicos en branch `ui-homologation-2026-02-07`)
