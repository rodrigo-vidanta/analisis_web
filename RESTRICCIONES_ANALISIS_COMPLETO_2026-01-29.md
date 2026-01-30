# 🔒 Restricciones UI - Prospectos "Importado Manual" - ANÁLISIS COMPLETO

**Fecha:** 29 de Enero 2026  
**Estado:** ✅ IMPLEMENTADO (con observaciones)

---

## 📋 Restricciones Solicitadas (Original)

### Módulo WhatsApp
- ❌ Icono de iniciar llamada
- ❌ Botón de pausar bot
- ❌ Botón de requiere atención humana

### Widget Últimas Conversaciones (Inicio)
- ❌ Botón de pausar bot
- ❌ Botón de requiere atención humana

### Sidebar de Prospecto (todas las vistas)
- ❌ Programar llamadas desde:
  - Widget Últimas Conversaciones > header nombre > sidebar
  - Módulo WhatsApp > clic en nombre > sidebar
  - Módulo Prospectos > clic en prospecto > sidebar

**Roles afectados:** Ejecutivos, Supervisores, Coordinadores

---

## ✅ Estado de Implementación

### Implementado Correctamente

| Ubicación | Restricción | Estado | Archivo |
|---|---|---|---|
| **WhatsApp - Botón Llamar** | ❌ Oculto | ✅ IMPLEMENTADO | `LiveChatCanvas.tsx:8618` |
| **WhatsApp - Pausar Bot** | ❌ Oculto | ✅ IMPLEMENTADO | `LiveChatCanvas.tsx:7696` |
| **WhatsApp - Req. Atención** | ❌ Oculto | ✅ IMPLEMENTADO | `LiveChatCanvas.tsx:7657` |
| **Widget Conversaciones - Pausar** | ❌ Oculto | ✅ IMPLEMENTADO | `ConversacionesWidget.tsx:2920` |
| **Widget Conversaciones - Atención** | ❌ Oculto | ✅ IMPLEMENTADO | `ConversacionesWidget.tsx:2952` |
| **Sidebar - Programar Llamada** | ❌ Deshabilitado | ✅ IMPLEMENTADO | `ScheduledCallsSection.tsx:82` |

### ⚠️ Casos Edge - Requieren Consideración

| Ubicación | Situación | Acción Recomendada |
|---|---|---|
| **Widget Llamadas Programadas** | Reprogramar llamada existente | 🤔 **PENDIENTE DECISIÓN** |
| **Módulo Llamadas Programadas** | Modificar llamada existente | 🤔 **PENDIENTE DECISIÓN** |

---

## 🎯 Casos Edge: Llamadas Ya Programadas

### Escenario
1. Prospecto está en etapa "Discovery"
2. Se programa una llamada
3. **DESPUÉS**, el prospecto cambia a "Importado Manual"

### Pregunta
¿Qué debe pasar con la llamada ya programada?

### Opciones

#### Opción A: Permitir Reprogramar/Eliminar
**Pros:**
- Usuario puede corregir si se programó por error
- Puede eliminar llamadas obsoletas
- Más flexible

**Cons:**
- Inconsistente con "no programar llamadas"
- Podría usarse para burlar restricción

**Implementación:**
- NO agregar restricción en `ManualCallModal` cuando se edita
- Mantener actual (permite reprogramar)

#### Opción B: Bloquear Todo (Más Estricto)
**Pros:**
- Consistente con "no programar llamadas"
- Más control

**Cons:**
- Menos flexible
- Llamadas quedan "atrapadas"

**Implementación:**
- Agregar validación en `ManualCallModal`
- Verificar etapa antes de guardar
- Mostrar error si es "Importado Manual"

#### Opción C: Solo Eliminar (Compromiso)
**Pros:**
- Permite limpiar llamadas obsoletas
- No permite crear/modificar

**Cons:**
- Más código condicional
- UX confusa

**Implementación:**
- Deshabilitar campos del formulario
- Solo mostrar botón "Eliminar"

---

## 📝 Recomendación

**Recomiendo Opción A** (Permitir Reprogramar/Eliminar):

### Razones:
1. **Caso raro:** Es poco probable que un prospecto cambie a "Importado Manual" después de tener llamadas programadas
2. **Flexibilidad:** Si pasa, el usuario necesita poder gestionar esas llamadas
3. **Simplicidad:** No requiere código adicional
4. **Eliminación natural:** Las llamadas eventualmente expirarán o se ejecutarán

### Casos de uso legítimos:
- Llamada programada antes de importar contacto manualmente
- Error de categorización (debería ser otra etapa)
- Necesidad de cancelar llamada obsoleta

---

## 🔧 Si Se Elige Opción B (Bloquear)

### Implementación en `ManualCallModal`:

```typescript
// src/components/shared/ManualCallModal.tsx

interface ManualCallModalProps {
  // ... props existentes
  etapaId?: string | null;     // ✅ AGREGAR
  etapaLegacy?: string | null;  // ✅ AGREGAR
}

// Dentro del componente:
const isRestricted = canScheduleCall(etapaId, etapaLegacy);

// Antes de handleScheduleCall:
if (!isRestricted) {
  toast.error(getRestrictionMessage('schedule'));
  return;
}

// En el render:
{isRestricted && (
  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
    <p className="text-sm text-yellow-700">
      ⚠️ {getRestrictionMessage('schedule')}
    </p>
  </div>
)}
```

### Actualizar llamadas donde se usa:

```typescript
// LiveChatCanvas.tsx
<ManualCallModal
  // ... props existentes
  etapaId={prospectoData?.etapa_id}
  etapaLegacy={prospectoData?.etapa}
/>

// LlamadasProgramadasWidget.tsx
<ManualCallModal
  // ... props existentes
  etapaId={selectedCall.etapa_id}    // ⚠️ Necesita agregarse a query
  etapaLegacy={selectedCall.etapa}   // ⚠️ Necesita agregarse a query
/>
```

---

## 🧪 Testing Checklist

### Prospectos "Importado Manual"

- [ ] WhatsApp: Botón llamar NO visible
- [ ] WhatsApp: Botón pausar NO visible
- [ ] WhatsApp: Botón atención NO visible
- [ ] Widget Conv.: Botón pausar NO visible
- [ ] Widget Conv.: Botón atención NO visible
- [ ] Sidebar: Botón programar DESHABILITADO
- [ ] Sidebar: Tooltip explicativo VISIBLE

### Prospectos Otras Etapas

- [ ] WhatsApp: Todos los botones VISIBLES
- [ ] Widget Conv.: Todos los botones VISIBLES
- [ ] Sidebar: Botón programar HABILITADO

### Casos Edge (Si Opción B)

- [ ] Llamada existente: Modal muestra ADVERTENCIA
- [ ] Llamada existente: Guardar BLOQUEADO
- [ ] Llamada existente: Eliminar PERMITIDO

---

## 📊 Logs de Debugging

En modo desarrollo, verificar console logs:

```javascript
// ✅ Prospecto "Importado Manual"
[prospectRestrictions] Verificando por etapa_id: {
  etapaId: "eed28f88-...",
  etapaCodigo: "importado_manual",
  isRestricted: true  // ✅ TRUE = botones ocultos
}

// ✅ Prospecto "Activo PQNC"
[prospectRestrictions] Verificando por etapa_id: {
  etapaId: "...",
  etapaCodigo: "activo_pqnc",
  isRestricted: false  // ✅ FALSE = botones visibles
}
```

---

## 🚀 Próximos Pasos

1. **Decisión de Negocio:** ¿Qué hacer con llamadas ya programadas?
2. **Si Opción A:** Nada más que hacer ✅
3. **Si Opción B:** Implementar validación en `ManualCallModal`
4. **Testing:** Verificar todos los casos en staging
5. **Deploy:** Liberar a producción con documentación

---

## 📚 Archivos de Referencia

- **Helper principal:** `src/utils/prospectRestrictions.ts`
- **LiveChat:** `src/components/chat/LiveChatCanvas.tsx`
- **Widget Conversaciones:** `src/components/dashboard/widgets/ConversacionesWidget.tsx`
- **Sidebar Compartido:** `src/components/shared/ScheduledCallsSection.tsx`
- **Modal Llamadas:** `src/components/shared/ManualCallModal.tsx`

---

**Última actualización:** 29 de Enero 2026  
**Autor:** Agent (Cursor AI)  
**Estado:** Esperando decisión sobre casos edge
