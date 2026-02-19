# Handover: Deshabilitación temporal de importación y reactivación por problemas de pago META

**Fecha:** 2026-02-19
**Motivo:** Problemas con el método de pago de META que causan acumulación de errores en envío de plantillas WhatsApp
**Tipo:** Cambio temporal - rollback requerido cuando META se resuelva
**Archivos modificados:** 3
**Marcador de búsqueda:** `TEMP_DISABLED`

---

## Qué se deshabilitó

### 1. Botón "Nueva conversación" (importación manual desde WhatsApp)
- **Archivo:** `src/components/chat/LiveChatModule.tsx`
- **Línea del comentario:** 187
- **Qué hacía:** Botón verde animado con ícono `MessageSquarePlus` que abría `ImportWizardModal` (wizard de 4 pasos para importar prospectos desde CRM y enviarles plantilla WhatsApp)
- **Qué se ve ahora:** Ícono estático verde sin animación ni click (preserva la identidad visual del módulo)

### 2. Tab "Importación" (importación manual desde Prospectos)
- **Archivo:** `src/components/prospectos/ProspectosManager.tsx`
- **Línea del comentario:** 2331
- **Qué hacía:** Tercera pestaña (Prospectos | Reasignación Masiva | **Importación**) visible solo para admin/admin_operativo/coordinador_calidad. Abría `ManualImportTab` con el mismo `ImportWizardModal`
- **Qué se ve ahora:** Solo 2 pestañas (Prospectos | Reasignación Masiva). El contenido de `ManualImportTab` no se renderiza porque nadie puede seleccionar la pestaña

### 3. Botón "Reactivar con Plantilla" (reactivación de conversaciones expiradas)
- **Archivo:** `src/components/chat/LiveChatCanvas.tsx`
- **Línea del comentario:** 8931
- **Qué hacía:** Cuando la ventana de 24h de WhatsApp expiraba, reemplazaba el input de chat con un banner ámbar + botón azul-morado "Reactivar con Plantilla" que abría `ReactivateConversationModal`
- **Qué se ve ahora:** El banner ámbar de advertencia sigue visible ("Ventana de mensajería cerrada") pero sin botón. En su lugar dice: "Envío de plantillas temporalmente suspendido por mantenimiento del proveedor."

---

## Componentes NO modificados (código intacto)

Estos componentes siguen existiendo con toda su lógica, solo se ocultaron sus puntos de entrada:

| Componente | Archivo | Estado |
|-----------|---------|--------|
| `ImportWizardModal` | `src/components/chat/ImportWizardModal.tsx` | Intacto, sin acceso desde UI |
| `ManualImportTab` | `src/components/prospectos/ManualImportTab.tsx` | Intacto, sin acceso desde UI |
| `ReactivateConversationModal` | `src/components/chat/ReactivateConversationModal.tsx` | Intacto, sin acceso desde UI |
| `QuickImportModal` | `src/components/chat/QuickImportModal.tsx` | Ya era dead code antes |
| `SendTemplateToProspectModal` | `src/components/chat/SendTemplateToProspectModal.tsx` | Ya era dead code antes |

---

## ROLLBACK: Instrucciones paso a paso

### Localizar los 3 cambios

```bash
grep -rn "TEMP_DISABLED" src/
```

Resultado esperado:
```
src/components/chat/LiveChatModule.tsx:187:  {/* TEMP_DISABLED: ...
src/components/prospectos/ProspectosManager.tsx:2331:  {/* TEMP_DISABLED: ...
src/components/chat/LiveChatCanvas.tsx:8931:  {/* TEMP_DISABLED: ...
```

---

### Rollback 1: LiveChatModule.tsx (botón "Nueva conversación")

**Archivo:** `src/components/chat/LiveChatModule.tsx`

**ELIMINAR** estas líneas (comentario + `{false && (` + cierre `)}` + div estático):

```tsx
// ELIMINAR línea 187:
{/* TEMP_DISABLED: Importación manual deshabilitada por problemas de pago META - eliminar {false &&} para re-habilitar */}

// ELIMINAR línea 188:
{false && (

// ELIMINAR línea 221:
)}

// ELIMINAR líneas 222-225 completas (el div estático de reemplazo):
{/* Icono estático mientras importación está deshabilitada */}
<div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30">
  <MessageSquarePlus className="w-6 h-6 text-white" />
</div>
```

**Resultado:** El `<motion.button>` original queda como único hijo, con animación y click funcional.

---

### Rollback 2: ProspectosManager.tsx (tab "Importación")

**Archivo:** `src/components/prospectos/ProspectosManager.tsx`

**ELIMINAR** estas 3 líneas:

```tsx
// ELIMINAR línea 2331:
{/* TEMP_DISABLED: Tab importación deshabilitada por problemas de pago META - eliminar {false &&} para re-habilitar */}

// ELIMINAR línea 2332:
{false && (

// ELIMINAR línea 2346:
)}
```

**Resultado:** El `<button>` de la tab "Importación" vuelve a ser visible para admin/admin_operativo/coordinador_calidad.

---

### Rollback 3: LiveChatCanvas.tsx (botón "Reactivar con Plantilla")

**Archivo:** `src/components/chat/LiveChatCanvas.tsx`

**ELIMINAR** estas líneas:

```tsx
// ELIMINAR línea 8931:
{/* TEMP_DISABLED: Reactivar con plantilla deshabilitado por problemas de pago META - eliminar {false &&} para re-habilitar */}

// ELIMINAR línea 8932:
{false && (

// ELIMINAR línea 9001:
)}

// ELIMINAR líneas 9002-9005 completas (mensaje temporal):
{/* Mensaje temporal mientras plantillas están deshabilitadas */}
<p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-1">
  Envío de plantillas temporalmente suspendido por mantenimiento del proveedor.
</p>
```

**Resultado:** El `<motion.button>` "Reactivar con Plantilla" vuelve a aparecer cuando la ventana de 24h expira.

---

### Verificación post-rollback

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

## Patrón técnico utilizado

```tsx
{/* TEMP_DISABLED: [razón] - eliminar {false &&} para re-habilitar */}
{false && (
  <ComponenteOriginal ... />
)}
{/* Reemplazo temporal (eliminar en rollback) */}
<ElementoTemporal />
```

- `{false && (...)}` es la forma más simple de ocultar JSX sin eliminar código
- El compilador de TypeScript sigue validando el código dentro del bloque (no se "pudre")
- No se modificó ninguna lógica, estado, hook, servicio ni store
- El rollback es solo eliminación de líneas wrapper, cero riesgo de regresión

---

## Notas adicionales

- El `ConversacionesWidget` tiene un botón "Reactivar Bot" que NO fue tocado - ese es para pausar/reanudar el bot automatizado, no para enviar plantillas
- Los componentes `QuickImportModal` y `SendTemplateToProspectModal` ya eran dead code antes de este cambio (no importados en ningún lugar)
- Este cambio requiere deploy para que los usuarios lo vean en producción
