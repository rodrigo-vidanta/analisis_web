# Handover: Refactor Plantillas WhatsApp — Vista por Grupos Inteligentes

**Fecha:** 2026-03-06
**Tipo:** Feature (major refactor)
**Estado:** Completado

---

## Contexto

Las plantillas WhatsApp se organizaban individualmente. El usuario seleccionaba manualmente cual enviar. Con este refactor, las plantillas se agrupan en **grupos inteligentes** donde el sistema N8N selecciona automaticamente la mejor plantilla segun salud y rendimiento, rotando para evitar bloqueos de Meta.

---

## Cambios Realizados

### 1. Servicio: `whatsappTemplatesService.ts`

| Metodo | Cambio |
|--------|--------|
| `getTemplatesByGroup(groupId)` | **Nuevo** — Query templates por grupo |
| `deleteGroup(groupId)` | **Nuevo** — Eliminar grupo via Edge Function proxy (`whatsapp-templates-proxy`) |
| `sendTemplateByGroup()` | **Fix** — Cambiado de webhook directo (403) a Edge Function proxy (`whatsapp-templates-send-proxy`) |

**Fix critico**: Tanto `sendTemplateByGroup` como `deleteGroup` llamaban directamente al webhook N8N (`https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates*`) sin autenticacion, causando 403. Ahora ambos pasan por Edge Functions con Bearer token.

### 2. `WhatsAppTemplatesManager.tsx` — Vista principal por grupos

Refactor completo: la vista principal ahora muestra **GRUPOS** en lugar de templates individuales.

- **Estado nuevo**: `groupsWithHealth`, `filteredGroups`, `loadingGroups`, `selectedGroupForView`, `groupTemplates`, `showDeleteGroupModal`, `groupToDelete`, `isDeletingGroup`
- **Quick filters**: Cambiados de categoria/status a status de grupo (healthy/mixed/degraded/blocked/disabled)
- **Vista Cards**: GroupCard con FolderOpen icon, GroupStatusBadge, GroupStarRating, metricas 2x2
- **Vista Grid/Table**: Columnas de grupo (nombre, estado, templates, enviables, reply rate, envios 7d)
- **3 componentes inline nuevos**:
  - `GroupCard` — Tarjeta animada para vista cards
  - `GroupTemplatesSubModal` — Portal sub-modal con templates individuales del grupo (editar, preview, eliminar)
  - `DeleteGroupConfirmationModal` — Confirmacion de borrado con barra de progreso

### 3. `ReactivateConversationModal.tsx` — Reactivacion con plantilla

- **Vista Previa**: Ahora carga top 5 templates APPROVED+activas via `getTemplatesByGroup()`. Muestra 1 expandida con preview completo y 4 colapsadas (acordeon animado)
- **Estadisticas**: Simplificadas a solo **Tasa de Respuesta** y **Tasa de Entrega** (eliminadas "Plantillas activas" y "Envios 24h")
- **Star Rating**: Rating con estrellas (promedio salud + reply rate) debajo del nombre del grupo
- **Ordenamiento**: Grupos ordenados de mayor a menor rating

### 4. `ImportWizardModal.tsx` — Importacion de prospectos (Step 3)

- **Step 3 refactored**: Grupos como acordeones expandibles (antes: lista flat de templates)
- **Header grupo**: GroupStarRating + Resp% + Entrega% (antes: sendable/total + sends/7d)
- **Seccion expandida**: Top 5 templates como acordeon con vista previa (1 expandida, 4 colapsadas). Click selecciona + expande simultaneamente
- **Stats inline**: Tasa respuesta + Tasa entrega dentro de cada grupo expandido
- **Ordenamiento**: Grupos ordenados de mayor a menor rating

### 5. Componente compartido: `GroupStarRating.tsx` (NUEVO)

- **Ubicacion**: `src/components/shared/GroupStarRating.tsx`
- **Funcion exportada**: `calcGroupRating(status, replyRate)` — calcula rating 0-5
  - Salud: healthy=5, mixed=3.5, degraded=2, blocked=0.5, disabled=0
  - Reply rate: 0-100% mapeado a 0-5 (rate/20)
  - Rating = promedio de ambos
- **Componente**: Renderiza 1-5 estrellas con medias estrellas, valor decimal opcional
- **Props**: `status`, `replyRate`, `size` (sm/md), `showValue`

### 6. Comunicado interactivo: `TemplateGroupsTutorial.tsx` (NUEVO)

- **Ubicacion**: `src/components/comunicados/tutorials/TemplateGroupsTutorial.tsx`
- **Component key**: `template-groups-tutorial`
- **5 pasos** con 9s de auto-advance (mas tiempo para leer):
  1. Antes/Despues: plantillas individuales vs grupo inteligente
  2. Demo animada: sistema escanea y selecciona la mejor plantilla
  3. Rating con estrellas: formula visual + 3 grupos ejemplo ordenados
  4. Vista previa acordeon interactivo + nota sobre stats simplificadas
  5. 4 beneficios clave + badge de disponibilidad
- **Registrado en**: `ComunicadoOverlay.tsx` (lazy import) + `comunicados.ts` (INTERACTIVE_COMUNICADOS)

---

## Archivos Modificados

| Archivo | Tipo |
|---------|------|
| `src/services/whatsappTemplatesService.ts` | Modificado (+3 metodos, 2 fixes auth) |
| `src/components/campaigns/plantillas/WhatsAppTemplatesManager.tsx` | Refactor mayor (vista grupos) |
| `src/components/chat/ReactivateConversationModal.tsx` | Modificado (top 5 preview, stats, rating, sort) |
| `src/components/chat/ImportWizardModal.tsx` | Modificado (acordeon grupos, stats, rating, sort) |
| `src/components/shared/GroupStarRating.tsx` | **Nuevo** |
| `src/components/shared/GroupStatusBadge.tsx` | Sin cambios (ya existia) |
| `src/components/comunicados/tutorials/TemplateGroupsTutorial.tsx` | **Nuevo** |
| `src/components/comunicados/ComunicadoOverlay.tsx` | Modificado (+1 lazy entry) |
| `src/types/comunicados.ts` | Modificado (+1 INTERACTIVE_COMUNICADOS entry) |

---

## Tipos y Dependencias Clave

- `TemplateGroupHealth` — tipo de `v_template_group_health` (BD view)
- `GROUP_STATUS_CONFIG` — config visual por status de grupo
- `TemplateGroupStatus` — 'healthy' | 'mixed' | 'degraded' | 'blocked' | 'disabled'
- `GroupStatusBadge` — componente badge reutilizable
- `GroupStarRating` / `calcGroupRating` — rating y calculo
- Edge Function: `whatsapp-templates-proxy` (CRUD + delete group)
- Edge Function: `whatsapp-templates-send-proxy` (send by group)

---

## Lecciones Aprendidas

1. **N8N webhooks tienen auth habilitada**: Cualquier llamada directa desde frontend retorna 403. SIEMPRE usar Edge Functions como proxy.
2. **Patron proxy**: Frontend → Edge Function (Bearer anon/user token) → N8N webhook (con su propia auth). Dos proxies distintos: `whatsapp-templates-proxy` (CRUD, usa user JWT) y `whatsapp-templates-send-proxy` (send, usa anon key).
3. **sortColumn type**: Al cambiar de templates a grupos, el tipo `keyof WhatsAppTemplate | null` ya no aplica. Cambiado a `string | null`.

---

## Testing Manual

1. Vista Campanas > Plantillas: muestra grupos con badges, estrellas, metricas
2. Click en grupo (cards/grid) → sub-modal con templates individuales
3. Eliminar grupo → barra progreso → todas eliminadas
4. LiveChat > 24h expired > Reactivar con Plantilla: grupos ordenados por rating, top 5 preview acordeon, stats simplificadas
5. LiveChat > Importar Prospecto > Step 3: grupos acordeon con stats y preview top 5
6. Comunicado tutorial: 5 pasos animados con 9s delay
