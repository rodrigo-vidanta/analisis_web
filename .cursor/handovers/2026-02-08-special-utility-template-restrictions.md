# HANDOVER-2026-02-08-UTILITY-TEMPLATE

**Fecha**: 2026-02-08 | **Version**: v2.5.94 (sin deploy) | **Build**: ok

## Contexto
Nueva plantilla `seguimiento_contacto_utilidad` (UTILITY) requiere restricciones especiales y UI diferenciada en modales de envio. Alto riesgo operativo: mal uso bloquea WhatsApp de todo el equipo.

## Delta

| Bloque | Descripcion |
|--------|-------------|
| 1 | Constantes `SPECIAL_UTILITY_TEMPLATE_NAME` y `SPECIAL_UTILITY_TEMPLATE_CONFIG` en tipos |
| 2 | Metodo `checkSpecialUtilityRestrictions()` en servicio con 3 validaciones |
| 3 | Seccion amber independiente en ReactivateConversationModal con warning |
| 4 | Seccion amber independiente en ImportWizardModal con warning |

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/types/whatsappTemplates.ts` | +24 lineas: constante nombre, config con `maxSendsSemester: 2`, `minHoursBetweenSends: 48`, `blockedEtapas: ['Es miembro']`, `warningMessage` |
| `src/services/whatsappTemplatesService.ts` | +import config. Nuevo metodo `checkSpecialUtilityRestrictions(prospectoId, templateId, templateName, prospectoEtapa)` que consulta `whatsapp_template_sends` filtrado por template_id. `canSendTemplateToProspect()` extendido con params opcionales `templateName?`, `prospectoEtapa?` — backward-compatible |
| `src/components/chat/ReactivateConversationModal.tsx` | +import constantes. `filteredAndSortedTemplates` useMemo retorna `{ regular, specialUtility }` en vez de array plano. Panel izquierdo usa `.regular.map()`. Nueva seccion amber despues de lista regular con: header, warning banner, card amber con badge UTILIDAD + Max 2/6 meses. `handleSelectTemplate` pasa `template.name` y `prospectoEtapa` al servicio |
| `src/components/chat/ImportWizardModal.tsx` | +import constantes. Nuevo state `filteredSpecialTemplates`. useEffect de filtrado separa por nombre. `canSendTemplate()` bloquea si plantilla especial + etapa "Es miembro". Seccion amber en paso 3 select_template con misma estructura visual |

## Decisiones Tecnicas

- **Identificacion por `template.name`**: Se usa nombre exacto (`seguimiento_contacto_utilidad`) para detectar la plantilla especial, no un flag en BD. Alternativa descartada: agregar columna `is_special` — requiere migracion y no hay otras plantillas especiales previsibles.
- **Restricciones en servicio + UI**: La logica de bloqueo esta en `checkSpecialUtilityRestrictions()` (servidor) Y en el useMemo del modal (cliente para etapa). Doble capa: UI previene seleccion, servicio previene envio.
- **Retorno del useMemo cambiado**: `filteredAndSortedTemplates` en ReactivateConversationModal ahora retorna objeto `{ regular, specialUtility }` en vez de array. Todos los consumidores actualizados.
- **`canSendTemplateToProspect` backward-compatible**: Nuevos params son opcionales. Llamadores existentes que no pasan `templateName` siguen funcionando igual.

## Trampas y Gotchas

- `whatsapp_templates.name` = `'seguimiento_contacto_utilidad'` — la plantilla debe existir en BD con este nombre exacto para que la UI la detecte
- `analysisSupabase` puede ser null (tipo TS) — se usa `!` non-null assertion en la query nueva, igual que el patron existente en el resto del servicio
- `SPECIAL_UTILITY_TEMPLATE_CONFIG.blockedEtapas` es `readonly` (`as const`) — se castea a `readonly string[]` para `.includes()` en TS strict
- La plantilla tiene 2 variables: `{{1}}` = nombre prospecto, `{{2}}` = nombre ejecutivo — ambas se auto-rellenan por el sistema existente de variable_mappings, no se necesito logica adicional
- `SendTemplateToProspectModal` NO fue tocado — solo muestra plantillas SIN variables, esta plantilla tiene 2 variables asi que no aparece ahi por diseno
- NO se toco Realtime, triggers, ni subscripciones

## Pendiente

1. La plantilla `seguimiento_contacto_utilidad` debe estar creada en tabla `whatsapp_templates` con status APPROVED y `variable_mappings` configurados ({{1}} -> prospectos.nombre, {{2}} -> system.ejecutivo_nombre)
2. Deploy a produccion cuando se apruebe
3. Verificar visualmente ambos modales con la plantilla real en BD

## Estado

- Build: vite ok (22.9s, sin errores TS)
- Deploy: pendiente
- Archivos sin commit: `src/types/whatsappTemplates.ts`, `src/services/whatsappTemplatesService.ts`, `src/components/chat/ReactivateConversationModal.tsx`, `src/components/chat/ImportWizardModal.tsx` (+ otros archivos de sesiones previas: CLAUDE.md, DashboardModule, LiveChatCanvas)
