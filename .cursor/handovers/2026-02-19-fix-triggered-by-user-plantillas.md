# Fix: "Plantilla enviada por: Usuario" no muestra nombre del ejecutivo

**Fecha:** 2026-02-19
**Tipo:** Bug fix
**Estado:** Implementado, pendiente deploy

## Problema

En el chat de WhatsApp, las plantillas mostraban "Plantilla enviada por: Usuario" en lugar del nombre real del ejecutivo que envió la plantilla.

## Causa raíz (3 problemas encontrados)

### 1. Query filtraba solo `status = 'SENT'`
- **Archivo:** `LiveChatCanvas.tsx:5173`, `ConversacionesWidget.tsx:1762`
- La query a `whatsapp_template_sends` filtraba `.eq('status', 'SENT')`, excluyendo los registros con `status = 'FAILED'` (mensajes bloqueados).
- Resultado: cualquier plantilla bloqueada (`bloqueado_whatsapp` o `bloqueo_meta`) no tenía info de `triggered_by_user`.

### 2. `SendTemplateToProspectModal` no guardaba `triggered_by_user` en BD
- **Archivo:** `SendTemplateToProspectModal.tsx`
- El modal enviaba `triggered_by_user` en el payload al Edge Function → N8N, pero N8N no siempre lo guardaba en `whatsapp_template_sends`.
- `ReactivateConversationModal` ya tenía un workaround: update post-envío directo a BD (líneas 909-920).
- `SendTemplateToProspectModal` e `ImportWizardModal` NO tenían este workaround.

### 3. `mensajes_whatsapp.id_sender` siempre NULL para plantillas
- Las plantillas nunca registran `id_sender` en `mensajes_whatsapp` - el dato del ejecutor solo existe en `whatsapp_template_sends.triggered_by_user`.

## Datos del problema
- 6,062 registros en `whatsapp_template_sends`
- **2,273 (37%) tenían `triggered_by_user = NULL`**
- El problema empezó semana del 26 de enero 2026
- Antes de esa fecha: 100% de registros tenían el campo poblado
- N8N dejó de guardar `triggered_by_user` de forma intermitente

## Solución implementada

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/chat/LiveChatCanvas.tsx:5173` | `.eq('status', 'SENT')` → `.in('status', ['SENT', 'FAILED'])` |
| `src/components/dashboard/widgets/ConversacionesWidget.tsx:1762` | Mismo cambio de filtro |
| `src/components/chat/SendTemplateToProspectModal.tsx:200` | Agregado update post-envío de `triggered_by_user` (igual que ReactivateConversationModal) |
| `src/components/chat/ImportWizardModal.tsx:913` | Agregado update post-envío de `triggered_by_user` |

### Patrón del fix (update post-envío)
```typescript
// Después de envío exitoso, actualizar triggered_by_user directamente en BD
if (user?.id && prospectoId && selectedTemplate) {
  try {
    await analysisSupabase
      .from('whatsapp_template_sends')
      .update({ triggered_by_user: user.id })
      .eq('prospecto_id', prospectoId)
      .eq('template_id', selectedTemplate.id)
      .is('triggered_by_user', null)
      .order('created_at', { ascending: false })
      .limit(1);
  } catch { /* silent */ }
}
```

## Resultado
- Plantillas con `triggered_by_user` poblado ahora muestran el nombre correcto
- Nuevos envíos siempre guardan `triggered_by_user` como fallback (no dependen de N8N)
- Los 2,273 registros históricos sin `triggered_by_user` seguirán mostrando "Usuario" (irrecuperable)

## Notas
- El flujo en N8N (`[api]-whatsapp-templates-envio-v2`) sigue sin guardar `triggered_by_user` de forma confiable
- El workaround frontend es necesario mientras N8N no se corrija
- La corrección de N8N requiere editar el workflow (no se hizo en esta sesión)
