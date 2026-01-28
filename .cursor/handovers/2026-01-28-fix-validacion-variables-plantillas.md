# Fix Validación de Variables en Plantillas - Handover

**Fecha:** 2026-01-28  
**Versión:** B10.1.43N2.5.51 (fix v2)  
**Status:** ✅ CORREGIDO

---

## 🐛 Problemas Corregidos

### 1. ❌ **Plantillas se enviaban con datos faltantes**

**Descripción:** Las plantillas con variables de prospecto (ej: `{{1}}` = `titulo`) se mostraban como disponibles aunque el prospecto no tuviera esos campos en BD.

**Ejemplo:**
```
Plantilla: "Hola! {{1}} {{2}}, para una escapada en pareja..."
Variables:
  {{1}} → prospectos.titulo (FALTANTE en BD)
  {{2}} → prospectos.apellido_paterno (OK)

Resultado: Se enviaba "Hola! [Título] NOE, para una escapada..."
```

**✅ Solución Implementada:**

```typescript
// ANTES: No validaba datos reales del prospecto
const canSendTemplate = (template: WhatsAppTemplate) => {
  return { canSend: true }; // Siempre permitía
};

// AHORA: Valida campos del prospecto recién importado
const canSendTemplate = (template: WhatsAppTemplate): { 
  canSend: boolean; 
  reason?: string; 
  missingFields?: string[] 
} => {
  if (!importedProspectData) return { canSend: true };

  const missingFields: string[] = [];
  
  for (const mapping of template.variable_mappings || []) {
    if (mapping.table_name === 'prospectos') {
      // Verificar que el campo tenga valor en BD
      const fieldValue = importedProspectData[mapping.field_name];
      
      if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
        missingFields.push(mapping.display_name);
      }
    }
  }

  if (missingFields.length > 0) {
    return {
      canSend: false,
      reason: `Faltan datos del prospecto: ${missingFields.join(', ')}`,
      missingFields,
    };
  }

  return { canSend: true };
};
```

**Flujo Corregido:**
1. Prospecto se importa → `importedProspectData` se carga con `SELECT *`
2. Usuario avanza a "Seleccionar Plantilla"
3. Para cada plantilla, se valida:
   - Si tiene `variable_mappings` con `table_name = 'prospectos'`
   - Si el campo existe en `importedProspectData`
   - Si el campo tiene valor (no null, no string vacío)
4. Si falta algún campo → Plantilla se muestra como **bloqueada** con razón

---

### 2. ❌ **Mensaje de prospecto existente incompleto**

**Descripción:** Cuando un prospecto ya existía en BD, solo mostraba el nombre pero no el ejecutivo ni coordinación asignados.

**✅ Solución:**

```typescript
// Ahora muestra:
- Nombre completo
- Ejecutivo asignado (si existe)
- Coordinación (si existe)
- Estado de conversación WhatsApp (si existe)
- Botón "Ver conversación existente" (si tiene conversación)
```

**Vista del Modal:**
```
⚠ Prospecto ya existe

Nombre
NOE GARCIA RODRIGUEZ

Ejecutivo Asignado
Diego Barba Salas

Coordinación
APEX

Estado
✓ Tiene conversación de WhatsApp activa

[No se puede importar: Este prospecto ya está registrado...]

[Botón: Ver conversación existente →]
```

---

### 3. ✅ **UI Mejorada para Plantillas Bloqueadas**

**Cambios visuales:**
- Plantillas bloqueadas: borde rojo (`border-red-200`) + fondo rojo claro (`bg-red-50`)
- Card expandido con advertencia destacada: "⚠️ No se puede enviar"
- Lista de campos faltantes específicos

**Antes:**
```
[Plantilla X]
❌ Faltan datos: Título
```

**Ahora:**
```
[Plantilla X]
---
⚠️ No se puede enviar
Faltan datos del prospecto: Título
Campos faltantes: Título
```

---

### 4. ✅ **Mensaje Informativo en Paso 3**

Agregado banner al inicio de "Seleccionar Plantilla":

```
ℹ️ Importante: Solo se muestran plantillas que el prospecto 
puede recibir. Las plantillas bloqueadas requieren datos que 
el prospecto no tiene (ej: título, email, etc.).
```

---

## 📊 Ejemplo Completo

### Prospecto Importado (Datos Reales)
```typescript
{
  id: "4b4b2eaf-268e-4d4b-8f23-71012d03d523",
  nombre_completo: "NOE GARCIA RODRIGUEZ",
  nombre: "NOE",
  apellido_paterno: "GARCIA",
  apellido_materno: "RODRIGUEZ",
  titulo: null, // ⚠️ FALTANTE
  email: null,
  whatsapp: "1122334455",
  coordinacion_id: "...",
}
```

### Plantilla con Variable Faltante
```typescript
{
  name: "Escapada en pareja",
  components: [{
    type: "BODY",
    text: "Hola! {{1}} {{2}}, para una escapada en pareja..."
  }],
  variable_mappings: [
    { variable_number: 1, table_name: "prospectos", field_name: "titulo", display_name: "Título" },
    { variable_number: 2, table_name: "prospectos", field_name: "apellido_paterno", display_name: "Apellido Paterno" },
  ]
}
```

### Validación:
```typescript
canSendTemplate(template) = {
  canSend: false,
  reason: "Faltan datos del prospecto: Título",
  missingFields: ["Título"]
}
```

### UI:
```
[Card con borde rojo, deshabilitada]

Escapada en pareja
Para una escapada en pareja, nuestros resorts...

[tags...]

⚠️ No se puede enviar
Faltan datos del prospecto: Título
Campos faltantes: Título
```

---

## 📂 Archivos Modificados

- **`src/components/chat/ImportWizardModal.tsx`**
  - Línea ~137: Agregado `importedProspectData` state
  - Línea ~498: Cargar datos completos después de importar
  - Línea ~560: Función `canSendTemplate()` con validación real
  - Línea ~1007: Mensaje mejorado para prospecto existente
  - Línea ~1258: Banner informativo en paso 3
  - Línea ~1306: UI mejorada para plantillas bloqueadas

---

## 🧪 Testing

### Casos Validados:

✅ **Prospecto con todos los campos:** Todas las plantillas disponibles  
✅ **Prospecto sin `titulo`:** Plantillas con `{{titulo}}` bloqueadas  
✅ **Prospecto sin `email`:** Plantillas con `{{email}}` bloqueadas  
✅ **Plantilla solo con variables de sistema:** Siempre disponible  
✅ **Mensaje de error claro:** Lista exacta de campos faltantes  

### Logs de Debug:

```javascript
console.log('📤 Variables resueltas:', resolvedVariables);
// { 1: '[Título]', 2: 'NOE', 3: 'Nuevo Nayarit' }

console.log('📝 Texto final:', resolvedText);
// "Hola! [Título] NOE, para una escapada en pareja..."
```

**Nota:** Si una variable no se puede resolver, se deja como `[Display Name]` para debugging visual.

---

## ⚠️ Pendientes

### 1. Validación de Tablas Relacionadas

Actualmente solo valida campos de `prospectos`. Pendiente validar:
- `destinos.nombre` (si el prospecto tiene `destino_preferencia`)
- `resorts.nombre` (si el prospecto tiene `resort_id`)
- `llamadas_ventas.*` (si el prospecto tiene llamadas)

### 2. Auto-Completar Datos Faltantes

Sugerencia futura: Si falta un campo crítico (ej: `titulo`), ofrecer input para completarlo antes de enviar:

```typescript
// UI Propuesta:
<div>
  <p>Esta plantilla requiere "Título" pero el prospecto no lo tiene.</p>
  <input placeholder="Sr./Sra./Lic." onChange={...} />
  <button>Actualizar y Continuar</button>
</div>
```

---

**Última actualización:** 2026-01-28  
**Corregido por:** Agent AI (Claude Sonnet 4.5)
