# Handover: Redistribuir Comunicados + Rediseño Tutorial Grupos de Plantillas

**Fecha:** 2026-03-10
**Sesion:** Comunicados admin improvements + TemplateGroupsTutorial v2

---

## Resumen

Se implementaron 3 funcionalidades en el sistema de comunicados del admin:

1. **Boton Redistribuir** - permite reenviar un comunicado ya enviado a todos los usuarios
2. **Vista Previa** - permite ver como se ve un comunicado (simple o interactivo) antes de redistribuir
3. **Rediseño TemplateGroupsTutorial** - tutorial completamente rediseñado para aclarar confusion de ejecutivos

---

## Problema Original

Ejecutivos reportaban tickets diciendo: "La AI envia plantillas diferentes a la seleccionada". La confusion era que no entendian que el sistema de grupos inteligentes elige automaticamente la plantilla, no el usuario. El tutorial original existia pero avanzaba automaticamente (9s/slide) y los ejecutivos no lo leian con atencion.

---

## Archivos Modificados

### 1. `src/services/comunicadosService.ts`
- **Nuevo metodo:** `redistributeComunicado(id: string)`
  - Borra todos los `comunicado_reads` para ese comunicado_id
  - Resetea `read_count` a 0
  - Reactiva estado a `'activo'` con nuevo `published_at`
  - Nota: depende de que RLS permita DELETE en `comunicado_reads` para usuarios autenticados admin

### 2. `src/components/admin/ComunicadosManager.tsx`
- **Nuevos imports:** `RefreshCw`, `Suspense`, `lazy`, `ComunicadoCard`
- **Nuevo state:** `previewComunicado` para modal de vista previa
- **Nuevo handler:** `handleRedistribute` con confirmacion via `window.confirm`
- **Registry:** `INTERACTIVE_PREVIEW_REGISTRY` - lazy imports de todos los tutoriales interactivos
- **UI - Comunicados simples:** Botones Eye (preview) y RefreshCw (redistribuir) para estado !== 'borrador'
- **UI - Tutoriales interactivos:** Mismos botones Eye y RefreshCw
- **Modal Preview:** Renderiza ComunicadoCard para simples, componente lazy para interactivos

### 3. `src/components/comunicados/tutorials/TemplateGroupsTutorial.tsx`
- **Reescritura completa** del tutorial (v2)
- **6 pasos** (antes 5), todos con navegacion manual (sin auto-avance)
- Estructura de pasos:
  1. **Cambio importante** - Alerta amber: "El envio individual ya no es posible" + antes/despues
  2. **Por que** - Visual de 4 ejecutivos saturando misma plantilla → penalizacion Meta
  3. **Como funciona** - Demo animada + nota: "es normal que la plantilla sea diferente a la vista previa"
  4. **Grupos por tipo** - Primer contacto, Seguimiento, Reactivacion, Frio
  5. **Rating estrellas** - Conservado del original
  6. **Resumen** - 5 puntos clave, 2 resaltados en amber
- Eliminados: `autoPlay`, `AUTO_ADVANCE_MS`, `TypewriterText`, `PreviewAccordionDemo`
- Nuevos iconos: `AlertTriangle`, `XCircle`, `Users`, `Ban`

---

## Flujo de Redistribucion

1. Admin va a Administracion > Comunicados
2. En comunicado activo/archivado, ve iconos Eye (preview) y RefreshCw (redistribuir)
3. Click en Eye: modal con vista previa exacta del comunicado
4. Click en RefreshCw: confirmacion con conteo de lecturas a resetear
5. Al confirmar: se borran `comunicado_reads`, se reactiva, `read_count = 0`
6. Usuarios que ya lo leyeron lo vuelven a ver al entrar a la plataforma

---

## Consideraciones Tecnicas

- **RLS en `comunicado_reads`**: El metodo `redistributeComunicado` hace DELETE directo. Si RLS bloquea, se necesitaria crear un RPC SECURITY DEFINER similar a `mark_comunicado_read`
- **Realtime**: Al reactivar el comunicado, el canal Realtime de comunicados puede disparar el evento para usuarios conectados
- **Store `readIds`**: Los usuarios que tenian el ID en su `readIds` Set lo mantendran en memoria hasta refresh, pero al recargar la pagina el `getReadIds` devolvera sin ese ID
- **Preview modal z-index**: z-50 (misma capa que editor modal, no conflicto porque son mutuamente excluyentes)

---

## Pendiente

- [ ] Verificar que DELETE en `comunicado_reads` funciona con RLS actual (probar en UI)
- [ ] Si RLS bloquea: crear RPC `redistribute_comunicado` como SECURITY DEFINER
- [ ] Redistribuir el tutorial `template-groups-tutorial` desde la UI admin
