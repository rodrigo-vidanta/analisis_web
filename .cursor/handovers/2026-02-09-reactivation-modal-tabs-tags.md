# HANDOVER-2026-02-09-REACTIVATION-MODAL-TABS

**Fecha**: 2026-02-09 | **Versión**: v2.8.3 (sin deploy) | **Build**: tsc ok

## Contexto

Rediseño del modal de reactivación de conversación WhatsApp (`ReactivateConversationModal`): agregar menú de 4 tabs por categoría de plantilla, filtro por etiquetas reutilizando `TemplateTagsSelector`, y ampliar ancho del modal.

## Delta

| Bloque | Descripción |
|--------|-------------|
| 1 | Tabs expandidos de 2 (`top`, `mis`) a 4 (`top`, `utilidades`, `marketing`, `mis`) con iconos y contadores |
| 2 | Tab "Plantillas" (top) limitado a Top 10, excluye categoría UTILITY |
| 3 | Tab "Utilidades" muestra solo `category === 'UTILITY'` + sección especial `seguimiento_contacto_utilidad` |
| 4 | Tab "Marketing" muestra solo `category === 'MARKETING'` |
| 5 | Filtro por etiquetas integrado usando `TemplateTagsSelector` (componente reutilizable existente) |
| 6 | Modal ampliado de `max-w-6xl` a `max-w-7xl` |

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/components/chat/ReactivateConversationModal.tsx` | `TabType` ampliado, lógica de filtrado por categoría y tags, UI de 4 tabs, integración `TemplateTagsSelector`, contadores `utilityTemplatesCount`/`marketingTemplatesCount`, estado `selectedTags`, modal más ancho |

## Decisiones Técnicas

- **4 tabs en vez de filtro de categoría**: El usuario pidió explícitamente tabs separados para utilidades y marketing. Los tabs usan el mismo pill-bar pattern pero con `text-[11px]` y `gap-0.5` para que quepan 4.
- **Top 10 en tab Plantillas**: El tab "Plantillas" excluye UTILITY (`t.category !== 'UTILITY'`) y limita a `.slice(0, 10)` tras ordenar por starRating/replyRate/audienceScore.
- **Sección especial de utilidad solo en tab Utilidades**: La plantilla `seguimiento_contacto_utilidad` con sus restricciones (max 2/semestre, bloqueada para "Es miembro") solo aparece en el tab "Utilidades", nunca en "Plantillas".
- **Reutilizar `TemplateTagsSelector`**: Mismo componente de `src/components/campaigns/plantillas/TemplateTagsSelector.tsx` usado en `ImportWizardModal`. Consulta vista `v_whatsapp_template_tags_stats` para tags disponibles.
- **Tags seleccionadas visibles**: Se muestran como pills azules con X para remover encima del selector, con botón "Limpiar" para resetear.

## Trampas y Gotchas

- `TemplateTagsSelector` consulta `v_whatsapp_template_tags_stats` (vista en BD) — si no existe, muestra estado vacío sin error.
- El filtro por tags usa `t.tags?.some(tag => selectedTags.includes(tag))` — plantillas sin tags nunca aparecen cuando hay tags seleccionadas.
- `selectedTags` se resetea al abrir el modal (`isOpen` effect) pero NO al cambiar de tab — las tags filtran en todos los tabs.
- Iconos nuevos importados: `Wrench` (utilidades), `Megaphone` (marketing), `Tag` (etiquetas).

## Estado

- Build: tsc ok
- Deploy: pendiente (sin commit aún)
- Archivos sin commit: `src/components/chat/ReactivateConversationModal.tsx` (+107/-40)
- Dev server corriendo en `http://localhost:5173/`
