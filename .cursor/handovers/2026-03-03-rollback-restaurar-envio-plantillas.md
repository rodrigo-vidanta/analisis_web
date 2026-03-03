# Handover: Rollback - Restauracion de envio de plantillas WhatsApp

**Fecha:** 2026-03-03
**Motivo:** Re-habilitacion de las 3 funcionalidades de envio de plantillas que fueron deshabilitadas el 2026-03-02
**Tipo:** Rollback de cambio temporal
**Archivos modificados:** 2 (el tercero ya estaba restaurado)
**Referencia:** `.cursor/handovers/2026-03-02-temp-disable-plantillas-meta-payment-v2.md`

---

## Que se restauro

### 1. Boton "Nueva conversacion" (LiveChatModule.tsx)
- **Archivo:** `src/components/chat/LiveChatModule.tsx` (linea 187)
- **Cambio:** Se elimino el wrapper `{false && (`, el comentario `TEMP_DISABLED`, y el div estatico de reemplazo
- **Estado actual:** Boton verde animado con `MessageSquarePlus` funcional, abre `ImportWizardModal`

### 2. Tab "Importacion" (ProspectosManager.tsx)
- **Archivo:** `src/components/prospectos/ProspectosManager.tsx` (linea 2332)
- **Cambio:** Se elimino el wrapper `{false && (` y el comentario `TEMP_DISABLED`
- **Estado actual:** Tab visible para admin/admin_operativo/coordinador_calidad (Prospectos | Reasignacion Masiva | Importacion)

### 3. Boton "Reactivar con Plantilla" (LiveChatCanvas.tsx)
- **Archivo:** `src/components/chat/LiveChatCanvas.tsx`
- **Cambio:** Ya estaba restaurado en la version de trabajo (cambios de soporte multi-proveedor uchat/twilio sobrescribieron el TEMP_DISABLED)
- **Estado actual:** Boton funcional cuando la ventana de 24h expira, ahora con logica multi-proveedor (detecta uchat vs twilio)

---

## Verificacion realizada

```bash
grep -rn "TEMP_DISABLED" src/
# Resultado: sin coincidencias

grep -rn "false &&" src/components/chat/LiveChatModule.tsx src/components/prospectos/ProspectosManager.tsx src/components/chat/LiveChatCanvas.tsx
# Resultado: sin coincidencias
```

---

## Historial completo de deshabilitacion/habilitacion de plantillas

| Fecha | Accion | Commit | Archivos |
|-------|--------|--------|----------|
| 2026-02-19 | Primera deshabilitacion | `30ec438` | 3 archivos |
| 2026-02-28 | Primera re-habilitacion | `e197fa9` | 3 archivos |
| 2026-03-02 | Segunda deshabilitacion | `a015ce3` | 3 archivos |
| 2026-03-03 | Segunda re-habilitacion (este cambio) | pendiente | 2 archivos (LiveChatCanvas ya restaurado) |

---

## Patron de deshabilitacion para referencia futura

Si se necesita volver a deshabilitar, el patron documentado es:

```tsx
{/* TEMP_DISABLED: [razon] - eliminar {false &&} para re-habilitar */}
{false && (
  <ComponenteOriginal ... />
)}
{/* Reemplazo temporal (eliminar en rollback) */}
<ElementoTemporal />
```

Los 3 puntos de entrada son:
1. `src/components/chat/LiveChatModule.tsx` - `<motion.button>` del boton verde "Nueva conversacion"
2. `src/components/prospectos/ProspectosManager.tsx` - `<button>` de la tab "Importacion"
3. `src/components/chat/LiveChatCanvas.tsx` - `<motion.button>` de "Reactivar con Plantilla"
