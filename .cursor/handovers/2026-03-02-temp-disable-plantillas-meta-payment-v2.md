# Handover: Deshabilitacion temporal de envio de plantillas (v2) por problemas de pago META

**Fecha:** 2026-03-02
**Motivo:** Problemas persistentes con el metodo de pago de META que causan fallos en envio de plantillas WhatsApp
**Tipo:** Cambio temporal - rollback requerido cuando META resuelva el problema de pago
**Archivos modificados:** 3
**Marcador de busqueda:** `TEMP_DISABLED`
**Referencia anterior:** `.cursor/handovers/2026-02-19-temp-disable-import-reactivate-meta-payment.md`

---

## Que se deshabilito

### 1. Boton "Nueva conversacion" (importacion manual desde WhatsApp)
- **Archivo:** `src/components/chat/LiveChatModule.tsx`
- **Linea del comentario:** 187
- **Que hacia:** Boton verde animado con icono `MessageSquarePlus` que abria `ImportWizardModal` (wizard de 4 pasos para importar prospectos desde CRM y enviarles plantilla WhatsApp)
- **Que se ve ahora:** Icono estatico verde sin animacion ni click (preserva la identidad visual del modulo)

### 2. Tab "Importacion" (importacion manual desde Prospectos)
- **Archivo:** `src/components/prospectos/ProspectosManager.tsx`
- **Linea del comentario:** 2332
- **Que hacia:** Tercera pestana (Prospectos | Reasignacion Masiva | **Importacion**) visible solo para admin/admin_operativo/coordinador_calidad. Abria `ManualImportTab` con el mismo `ImportWizardModal`
- **Que se ve ahora:** Solo 2 pestanas (Prospectos | Reasignacion Masiva). El contenido de `ManualImportTab` no se renderiza porque nadie puede seleccionar la pestana

### 3. Boton "Reactivar con Plantilla" (reactivacion de conversaciones expiradas)
- **Archivo:** `src/components/chat/LiveChatCanvas.tsx`
- **Linea del comentario:** 9146
- **Que hacia:** Cuando la ventana de 24h de WhatsApp expiraba, mostraba boton azul-morado "Reactivar con Plantilla" que abria `ReactivateConversationModal`
- **Que se ve ahora:** El banner ambar de advertencia sigue visible ("Ventana de mensajeria cerrada") pero sin boton. En su lugar dice: "Envio de plantillas temporalmente suspendido por mantenimiento del proveedor."

---

## Componentes NO modificados (codigo intacto)

Estos componentes siguen existiendo con toda su logica, solo se ocultaron sus puntos de entrada:

| Componente | Archivo | Estado |
|-----------|---------|--------|
| `ImportWizardModal` | `src/components/chat/ImportWizardModal.tsx` | Intacto, sin acceso desde UI |
| `ManualImportTab` | `src/components/prospectos/ManualImportTab.tsx` | Intacto, sin acceso desde UI |
| `ReactivateConversationModal` | `src/components/chat/ReactivateConversationModal.tsx` | Intacto, sin acceso desde UI |
| `QuickImportModal` | `src/components/chat/QuickImportModal.tsx` | Dead code |
| `SendTemplateToProspectModal` | `src/components/chat/SendTemplateToProspectModal.tsx` | Dead code |

---

## ROLLBACK: Instrucciones paso a paso

### Localizar los 3 cambios

```bash
grep -rn "TEMP_DISABLED" src/
```

Resultado esperado:
```
src/components/chat/LiveChatModule.tsx:187:  {/* TEMP_DISABLED: ...
src/components/prospectos/ProspectosManager.tsx:2332:  {/* TEMP_DISABLED: ...
src/components/chat/LiveChatCanvas.tsx:9146:  {/* TEMP_DISABLED: ...
```

---

### Rollback 1: LiveChatModule.tsx (boton "Nueva conversacion")

**Archivo:** `src/components/chat/LiveChatModule.tsx`

**ELIMINAR** estas lineas:

```tsx
// ELIMINAR linea 187:
{/* TEMP_DISABLED: Importacion manual deshabilitada por problemas de pago META - eliminar {false &&} para re-habilitar */}

// ELIMINAR linea 188:
{false && (

// ELIMINAR linea ~221:
)}

// ELIMINAR lineas ~222-225 completas (el div estatico de reemplazo):
{/* Icono estatico mientras importacion esta deshabilitada */}
<div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30">
  <MessageSquarePlus className="w-6 h-6 text-white" />
</div>
```

**Resultado:** El `<motion.button>` original queda como unico hijo, con animacion y click funcional.

---

### Rollback 2: ProspectosManager.tsx (tab "Importacion")

**Archivo:** `src/components/prospectos/ProspectosManager.tsx`

**ELIMINAR** estas 3 lineas:

```tsx
// ELIMINAR linea 2332:
{/* TEMP_DISABLED: Tab importacion deshabilitada por problemas de pago META - eliminar {false &&} para re-habilitar */}

// ELIMINAR linea 2333:
{false && (

// ELIMINAR linea ~2348:
)}
```

**Resultado:** El `<button>` de la tab "Importacion" vuelve a ser visible para admin/admin_operativo/coordinador_calidad.

---

### Rollback 3: LiveChatCanvas.tsx (boton "Reactivar con Plantilla")

**Archivo:** `src/components/chat/LiveChatCanvas.tsx`

**ELIMINAR** estas lineas:

```tsx
// ELIMINAR linea 9146:
{/* TEMP_DISABLED: Reactivar con plantilla deshabilitado por problemas de pago META - eliminar {false &&} para re-habilitar */}

// ELIMINAR linea 9147:
{false && (

// ELIMINAR linea ~9216:
)}

// ELIMINAR lineas ~9217-9220 completas (mensaje temporal):
{/* Mensaje temporal mientras plantillas estan deshabilitadas */}
<p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-1">
  Envio de plantillas temporalmente suspendido por mantenimiento del proveedor.
</p>
```

**Resultado:** El `<motion.button>` "Reactivar con Plantilla" vuelve a aparecer cuando la ventana de 24h expira.

---

### Verificacion post-rollback

```bash
# 1. Confirmar que no quedan TEMP_DISABLED
grep -rn "TEMP_DISABLED" src/
# Esperado: sin resultados

# 2. Confirmar que no quedan {false && (
grep -rn "false &&" src/components/chat/LiveChatModule.tsx src/components/prospectos/ProspectosManager.tsx src/components/chat/LiveChatCanvas.tsx
# Esperado: sin resultados

# 3. Type check
npx tsc --noEmit --skipLibCheck

# 4. Build
npm run build

# 5. Deploy
# /deploy
```

---

## Patron tecnico utilizado

```tsx
{/* TEMP_DISABLED: [razon] - eliminar {false &&} para re-habilitar */}
{false && (
  <ComponenteOriginal ... />
)}
{/* Reemplazo temporal (eliminar en rollback) */}
<ElementoTemporal />
```

- `{false && (...)}` oculta JSX sin eliminar codigo
- TypeScript sigue validando el codigo dentro del bloque (no se "pudre")
- No se modifico ninguna logica, estado, hook, servicio ni store
- El rollback es solo eliminacion de lineas wrapper, cero riesgo de regresion

---

## Historial

| Fecha | Accion | Commit |
|-------|--------|--------|
| 2026-02-19 | Primera deshabilitacion | `30ec438` |
| 2026-02-28 | Re-habilitacion (rollback) | `e197fa9` |
| 2026-03-02 | Segunda deshabilitacion (este cambio) | pendiente |
