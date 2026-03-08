# Template Health Metrics + Sending Restrictions

**Fecha:** 2026-03-07
**Scope:** Plantillas WhatsApp - métricas de salud individual + restricción de envío por grupo

---

## Cambios Realizados

### 1. Métricas de salud por plantilla en GroupTemplatesSubModal

**Problema:** Al abrir un grupo de plantillas, el grid solo mostraba nombre, status y preview. No había visibilidad de envíos ni salud por plantilla individual.

**Solución:** Se integró la vista `v_template_health` en el submodal de grupo para mostrar por cada plantilla:
- Estado de salud con dot colorido (Saludable/Atención/Crítico/Sin datos)
- Envíos en 7 días
- Reply rate 24h con color coding
- Failure rate 24h con color coding
- Tendencia (Mejorando/Degradando/Estable)

**Archivos modificados:**
| Archivo | Cambio |
|---------|--------|
| `src/components/campaigns/plantillas/WhatsAppTemplatesManager.tsx` | Interface `TemplateHealthData`, estado `groupTemplateHealth`, query `v_template_health` en `handleViewGroupTemplates`, UI metricas en `GroupTemplatesSubModal` |

### 2. Fix RPC `get_template_response_rates` — status filter

**Problema:** El RPC solo filtraba `status = 'SENT'` (48 registros), ignorando `DELIVERED` (1,282) y `READ` (3,228). Los envíos de N8N progresan a estos estados.

**Solución:** Migración para cambiar el filtro a `status IN ('SENT', 'DELIVERED', 'READ')`.

**Migración:** `fix_template_response_rates_status_filter`

### 3. Campo `exclude_from_sending` en `template_groups`

**Problema:** El grupo "Actualización de Número" (plantillas `act_numero_*`) aparecía en todos los contextos de envío, pero estas plantillas son operativas (notificar cambio de número) y solo aplican a prospectos que tuvieron comunicación previa por otro número (uChat).

**Solución:**
- Campo `exclude_from_sending` (boolean, default false) en `template_groups`
- Vista `v_template_group_health` recreada incluyendo el nuevo campo
- Tipo `TemplateGroupHealth` actualizado en frontend

**Migración:** `add_exclude_from_sending_to_template_groups` + `recreate_group_health_view_with_exclude`

### 4. Restricción de envío por contexto y provider

**Lógica implementada:**

| Contexto | Grupo excluido visible? | Condición |
|----------|------------------------|-----------|
| Reactivación | Solo si `whatsapp_provider = 'uchat'` | Prospecto tuvo comunicación por número anterior |
| SendTemplateToProspect | Solo si `whatsapp_provider = 'uchat'` | Idem |
| Importación | Nunca | Prospectos nuevos no saben del cambio |
| Campañas BD (masivo) | Nunca | Envío masivo no aplica |
| Gestor de plantillas | Siempre | Administración |

**Archivos modificados:**
| Archivo | Cambio |
|---------|--------|
| `src/types/whatsappTemplates.ts` | `exclude_from_sending: boolean` en `TemplateGroupHealth` |
| `src/components/chat/ReactivateConversationModal.tsx` | Filtro: `!g.exclude_from_sending \|\| isUchat` |
| `src/components/chat/SendTemplateToProspectModal.tsx` | Filtro: `!g.exclude_from_sending \|\| isUchat` |
| `src/components/chat/ImportWizardModal.tsx` | Filtro: `!g.exclude_from_sending` |
| `src/components/campaigns/bases-datos/TemplateSelectionModal.tsx` | Filtro: `!g.exclude_from_sending` |

---

## Datos de BD

- Grupo marcado: `6e84976c-c70b-4917-bea9-3f1bcf5d29cb` ("Actualización de Número")
- `actualizacion_numero_whatsapp`: 5,105 envíos en `whatsapp_template_sends`, 4,558 exitosos (SENT+DELIVERED+READ)
- Plantillas `act_numero_*`: 7 nuevas con 0-5 envíos cada una

## Migraciones aplicadas

1. `fix_template_response_rates_status_filter` — RPC ahora cuenta SENT+DELIVERED+READ
2. `add_exclude_from_sending_to_template_groups` — campo boolean + marca grupo
3. `recreate_group_health_view_with_exclude` — vista con nuevo campo + security_invoker

## Notas

- `v_template_health` ya existía y tiene datos ricos: health_status, sends_7d, failure_rate_24h, reply_rate_24h, trend, confidence, alert_reason, error_breakdown
- El campo `exclude_from_sending` es reutilizable para futuros grupos que no deban aparecer en envío directo
- La lógica de provider se evalúa en frontend vía `prospectoData.whatsapp_provider`
