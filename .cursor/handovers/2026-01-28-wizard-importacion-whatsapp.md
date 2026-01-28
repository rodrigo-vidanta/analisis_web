# Wizard de Importación WhatsApp - Handover

**Fecha:** 2026-01-28  
**Versión:** B10.1.43N2.5.51  
**Componente:** `ImportWizardModal.tsx`  
**Status:** ✅ IMPLEMENTADO

---

## 🎯 Objetivo

Reemplazar el flujo actual de importación de prospectos (2 modales separados) por un wizard unificado de 4 pasos que valida permisos por coordinación y permite seleccionar plantillas con filtros por tags.

---

## 📋 Features Implementadas

### 1. Wizard Multi-Paso

**Pasos:**
1. **Búsqueda** - Input de teléfono + búsqueda en BD local y Dynamics
2. **Validación de Permisos** - Confirmación de datos y validación por coordinación
3. **Selección de Plantilla** - Filtros por tags + búsqueda + validación de variables
4. **Configuración de Variables** - Campos editables (fecha/hora) + preview

**Navegación:**
- Botones "Atrás" y "Continuar" con estado disabled según validaciones
- Barra de progreso visual (4 pasos)
- Animaciones suaves entre pasos (framer-motion)

### 2. Validación de Permisos por Coordinación

**Reglas:**
- **Admin, Coordinador de Calidad, Operativo:** Acceso total (cualquier coordinación)
- **Coordinador:** Solo puede importar de su coordinación
- **Ejecutivo:** Solo puede importar de su coordinación

**Equivalencias de Coordinación:**
```typescript
const equivalencias = {
  'COB ACAPULCO': 'COBACA',
  'COBACA': 'COBACA',
  'APEX': 'i360',
  'I360': 'i360',
};
```

**Flujo:**
1. Si el prospecto **ya existe en BD local:**
   - Muestra advertencia con datos del dueño
   - Valida permisos (puede ver solo si es su coordinación o es admin)
   - **NO permite continuar** (ya existe)

2. Si el prospecto **viene de Dynamics:**
   - Compara `lead.Coordinacion` con `user.coordinacion_id` (normalizado)
   - Si **NO coincide** y **NO es admin/coordinador-calidad/operativo:** bloquea
   - Si **coincide** o **es admin:** permite continuar

### 3. Selector de Plantillas con Filtros

**Filtros Disponibles:**
- **Por tags:** Multi-select de etiquetas (top 10 + dropdown "Ver más")
- **Por búsqueda:** Input de texto (busca en nombre y descripción)
- **Por variables:** Valida automáticamente si la plantilla puede enviarse

**Validación de Variables:**
```typescript
const canSendTemplate = (template: WhatsAppTemplate): { canSend: boolean; reason?: string } => {
  const requiredVariables = template.variable_mappings?.filter(v => v.is_required) || [];
  
  // Si no tiene variables requeridas, puede enviar
  if (requiredVariables.length === 0) return { canSend: true };
  
  // Validar que el prospecto tenga los datos necesarios
  // (implementado con lógica del servicio whatsappTemplatesService)
};
```

**UI:**
- Cards de plantillas con checkbox de selección
- Muestra tags, descripción y razón de bloqueo (si aplica)
- Scroll vertical para lista larga
- Estado disabled para plantillas no enviables

### 4. Configuración de Variables Editables

**Variables del Sistema:**
- `fecha_actual`: Generada automáticamente (sin input)
- `fecha_personalizada`: Input `type="date"` → Formateado a "11 de abril"
- `hora_actual`: Generada automáticamente (sin input)
- `hora_personalizada`: Input `type="time"` → Formateado a "4:30pm"
- `ejecutivo_nombre`: Del usuario actual (sin input)

**Preview del Mensaje:**
- Muestra el texto final con variables reemplazadas
- Se actualiza en tiempo real al editar fecha/hora

### 5. Envío de Plantilla

**Payload:**
```typescript
const payload = {
  template_id: selectedTemplate.id,
  template_name: selectedTemplate.name,
  prospecto_id: importedProspectId,
  variables: variableValues, // Record<number, string>
  resolved_text: resolvedText.trim(),
  triggered_by: 'MANUAL' as const,
  triggered_by_user: user.id,
  triggered_by_user_name: user.full_name || user.email,
};
```

**Endpoint:** `whatsapp-templates-send-proxy` (Edge Function)

**Respuesta:**
- Extrae `conversacion_id` del response
- Cierra wizard
- Llama `onSuccess(prospectoId, conversacionId)`
- Navega automáticamente a la conversación (si existe ID)

---

## 📂 Archivos Modificados

### Nuevos
- **`src/components/chat/ImportWizardModal.tsx`** (1,400 líneas)
  - Wizard completo con 4 pasos
  - Validaciones de permisos
  - Selector de plantillas con filtros
  - Configuración de variables

### Modificados
- **`src/components/chat/LiveChatModule.tsx`**
  - Reemplazado import de `QuickImportModal` + `SendTemplateToProspectModal`
  - Por: `ImportWizardModal`
  - Simplificado `handleQuickImportSuccess` (ahora recibe conversacionId)
  - Eliminado estado de `showTemplateModal`, `selectedProspectoId`, `prospectoData`

---

## 🎨 Diseño y UX

### Estilo del Modal
- Width: `max-w-3xl` (más ancho que el modal anterior)
- Height: `max-h-[92vh]` (con scroll interno)
- Header con título dinámico según paso
- Footer con botones "Atrás" / "Continuar"
- Barra de progreso visual (4 segmentos)

### Colores de Estado
- **Paso actual:** `bg-blue-500`
- **Paso completado:** `bg-emerald-500`
- **Paso pendiente:** `bg-gray-200`

### Animaciones
- **Transiciones entre pasos:** `x: -20 → 0` (slide-in desde izquierda)
- **Salida:** `x: 20` (slide-out a derecha)
- **Duración:** `0.25s` con easing custom

---

## 🔍 Validaciones Implementadas

### 1. Búsqueda (Paso 1)
- [x] Teléfono debe tener 10 dígitos
- [x] Buscar primero en BD local por `whatsapp`
- [x] Si existe, mostrar advertencia y validar permisos (no continuar)
- [x] Si no existe, buscar en Dynamics
- [x] Si existe en Dynamics, validar coordinación

### 2. Permisos (Paso 2)
- [x] Admin/Coordinador-Calidad/Operativo: acceso total
- [x] Coordinador: validar coordinación coincidente (normalizada)
- [x] Ejecutivo: validar coordinación coincidente o que sea su prospecto
- [x] Mostrar información del prospecto para confirmar antes de importar

### 3. Plantillas (Paso 3)
- [x] Solo plantillas aprobadas (`status = 'APPROVED'`)
- [x] Filtro por tags (multi-select)
- [x] Filtro por búsqueda (nombre/descripción)
- [x] Validación de variables requeridas
- [x] Mostrar razón de bloqueo si no puede enviar

### 4. Variables (Paso 4)
- [x] Variables del sistema auto-generadas
- [x] Fecha personalizada: input date → formato "11 de abril"
- [x] Hora personalizada: input time → formato "4:30pm"
- [x] Preview en tiempo real del mensaje final

---

## 🐛 Casos Edge Manejados

### 1. Prospecto Existente
```typescript
// Muestra advertencia con:
- Nombre completo
- Ejecutivo asignado
- Coordinación
- Razón de bloqueo (si no tiene permiso)
```

### 2. Sin Coordinación en Dynamics
```typescript
// Si lead.Coordinacion es null/undefined:
return {
  canImport: false,
  reason: 'Este prospecto no tiene coordinación asignada en Dynamics',
};
```

### 3. Plantilla Sin Variables
```typescript
// Si la plantilla NO tiene variable_mappings:
- Muestra mensaje: "Esta plantilla no requiere configuración adicional"
- Permite avanzar directamente al envío
```

### 4. Error en Envío
```typescript
// Captura errores del Edge Function:
- Muestra toast de error con mensaje específico
- Mantiene el wizard abierto (no cierra automáticamente)
- Usuario puede reintentar o volver atrás
```

---

## 📊 Estado del Wizard

### Variables de Estado
```typescript
// Navegación
const [currentStep, setCurrentStep] = useState<WizardStep>('search');

// Búsqueda
const [phoneNumber, setPhoneNumber] = useState('');
const [leadData, setLeadData] = useState<DynamicsLeadInfo | null>(null);
const [existingProspect, setExistingProspect] = useState<ExistingProspect | null>(null);

// Permisos
const [permissionValidation, setPermissionValidation] = useState<PermissionValidation | null>(null);

// Importación
const [importedProspectId, setImportedProspectId] = useState<string | null>(null);

// Plantillas
const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
const [selectedTags, setSelectedTags] = useState<string[]>([]);

// Variables
const [variableValues, setVariableValues] = useState<Record<number, string>>({});
```

---

## 🔗 Integración con LiveChatModule

### Antes (2 modales)
```typescript
// 1. QuickImportModal: Buscar + Importar
<QuickImportModal onSuccess={(prospectoId) => {
  // Abrir segundo modal
  setShowTemplateModal(true);
}} />

// 2. SendTemplateToProspectModal: Seleccionar plantilla + Enviar
<SendTemplateToProspectModal onSuccess={(conversacionId) => {
  // Navegar a conversación
}} />
```

### Ahora (1 wizard)
```typescript
// ImportWizardModal: TODO en uno
<ImportWizardModal onSuccess={(prospectoId, conversacionId) => {
  // Ya importó y envió plantilla
  // Solo navegar a conversación
  if (conversacionId) {
    window.dispatchEvent(new CustomEvent('select-livechat-conversation', { 
      detail: conversacionId 
    }));
  }
}} />
```

---

## ⚠️ Pendientes / Mejoras Futuras

### 1. Validación Completa de Variables
- Actualmente solo valida variables del sistema
- TODO: Validar que el prospecto tenga campos de BD (ej: `prospectos.nombre_completo`)
- Usar `whatsappTemplatesService.getTableExampleData()` para verificar

### 2. Caché de Plantillas
- Actualmente carga plantillas cada vez que entra al paso 3
- TODO: Cachear en estado del módulo padre para evitar fetch repetidos

### 3. Historial de Importaciones
- Actualmente no guarda log de quién importó qué
- TODO: Agregar tabla `import_history` con:
  - `prospecto_id`, `imported_by`, `coordinacion_source`, `timestamp`

### 4. Testing
- No hay tests unitarios del wizard
- TODO: Agregar tests para:
  - Validación de permisos
  - Normalización de coordinaciones
  - Flujo completo end-to-end

---

## 🚀 Próximos Pasos

1. **Testing Manual:**
   - [ ] Ejecutivo intentando importar de otra coordinación
   - [ ] Coordinador importando de su coordinación
   - [ ] Admin importando de cualquier coordinación
   - [ ] Plantilla con fecha/hora personalizada
   - [ ] Plantilla sin variables

2. **Deploy:**
   - [ ] Build en local para verificar no hay errores TS
   - [ ] Deploy a staging
   - [ ] Pruebas funcionales completas
   - [ ] Deploy a producción

3. **Documentación:**
   - [ ] Actualizar `CHANGELOG_LIVECHAT.md`
   - [ ] Actualizar `README.md` del módulo chat
   - [ ] Agregar ejemplos de uso

---

## 📚 Referencias

- **Componente de Tags:** `src/components/campaigns/plantillas/TemplateTagsSelector.tsx`
- **Servicio de Plantillas:** `src/services/whatsappTemplatesService.ts`
- **Servicio de Importación:** `src/services/importContactService.ts`
- **Servicio de Dynamics:** `src/services/dynamicsLeadService.ts`

---

**Última actualización:** 2026-01-28  
**Implementado por:** Agent AI (Claude Sonnet 4.5)
