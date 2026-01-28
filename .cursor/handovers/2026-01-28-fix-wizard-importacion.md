# Fix Wizard de Importación - Handover

**Fecha:** 2026-01-28  
**Versión:** B10.1.43N2.5.51 (fix)  
**Status:** ✅ CORREGIDO

---

## 🐛 Problemas Identificados y Corregidos

### 1. ❌ **Problema:** Búsqueda en Dynamics antes que en BD local
**Descripción:** Si un prospecto ya existía en BD local, el wizard buscaba en Dynamics y permitía continuar al paso de "Validar Permisos", mostrando información incorrecta.

**Causa:** La validación `if (localProspect)` no detenía el flujo correctamente.

**✅ Solución:**
```typescript
if (localProspect) {
  setExistingProspect(localProspect);
  const validation = validateProspectPermissions(localProspect);
  setPermissionValidation(validation);
  
  // ⛔ DETENER AQUÍ - No continuar a Dynamics
  toast.error('Este prospecto ya existe en el sistema');
  setIsSearching(false);
  return; // NO avanzar al paso de permisos
}
```

**Resultado:** Ahora si el prospecto existe en BD local, se muestra la advertencia y NO se permite continuar.

---

### 2. ❌ **Problema:** Mensaje incorrecto "Se asignará a"
**Descripción:** El paso de "Validar Permisos" mostraba "Se asignará a: [Usuario actual]", lo cual es incorrecto porque el backend asigna automáticamente al propietario de Dynamics.

**✅ Solución:**
```typescript
// ANTES:
<div>
  <p>Se asignará a</p>
  <p>{user?.full_name || user?.email}</p>
</div>

// AHORA:
{leadData.Propietario && (
  <div>
    <p>Propietario en Dynamics</p>
    <p>{leadData.Propietario}</p>
  </div>
)}

{/* Advertencia sobre asignación */}
<div className="p-3 bg-amber-50">
  <p>
    <strong>Nota:</strong> El prospecto se asignará automáticamente 
    al propietario que tiene en Dynamics CRM.
  </p>
</div>
```

**Resultado:** Ahora muestra correctamente el propietario de Dynamics y aclara que la asignación es automática.

---

### 3. ❌ **Problema:** Validación de permisos incorrecta
**Descripción:** La lógica de permisos no consideraba correctamente las reglas:
- Admin/Coordinador-Calidad/Operativo: pueden importar de cualquier coordinación
- Coordinador/Ejecutivo: solo de su coordinación

**✅ Solución:** La validación ya estaba implementada correctamente en `validateDynamicsLeadPermissions()`, pero el mensaje del paso 2 era confuso. Ahora se muestra claramente:

```typescript
const validateDynamicsLeadPermissions = (lead: DynamicsLeadInfo) => {
  // Admin, Coordinador de Calidad y Operativo: pueden importar cualquier coordinación
  if (isAdmin || isCoordinadorCalidad || isOperativo) {
    return { canImport: true, reason: null };
  }

  // Coordinador: verificar coordinación
  if (user?.is_coordinador && user?.coordinacion_id && lead.Coordinacion) {
    const userCoordNorm = normalizeCoordinacion(user.coordinacion_id);
    const leadCoordNorm = normalizeCoordinacion(lead.Coordinacion);
    
    if (userCoordNorm === leadCoordNorm) {
      return { canImport: true, reason: null };
    }
    
    return {
      canImport: false,
      reason: `Este prospecto pertenece a ${lead.Coordinacion}, no a tu coordinación (${user.coordinacion_id})`,
    };
  }

  // Ejecutivo: verificar coordinación
  if (user?.is_ejecutivo && user?.coordinacion_id && lead.Coordinacion) {
    const userCoordNorm = normalizeCoordinacion(user.coordinacion_id);
    const leadCoordNorm = normalizeCoordinacion(lead.Coordinacion);
    
    if (userCoordNorm === leadCoordNorm) {
      return { canImport: true, reason: null };
    }
    
    return {
      canImport: false,
      reason: `Este prospecto es de ${lead.Coordinacion}. Solo puedes importar de ${user.coordinacion_id}`,
    };
  }

  return { canImport: true, reason: null };
};
```

---

### 4. ❌ **Problema:** Variables de plantilla no se resolvían correctamente
**Descripción:** Al enviar plantillas, las variables `{{1}}`, `{{2}}`, etc. no se reemplazaban con los datos del prospecto, quedaban como texto literal.

**Causa:** El código solo usaba `variableValues` (que solo contenía variables del sistema), sin cargar los datos del prospecto.

**✅ Solución:**
```typescript
const handleSendTemplate = async () => {
  // ...

  // 1. Obtener datos completos del prospecto
  const { data: prospectoData } = await analysisSupabase
    .from('prospectos')
    .select('*')
    .eq('id', importedProspectId)
    .single();

  // 2. Resolver TODAS las variables
  const resolvedVariables: Record<number, string> = {};
  
  if (selectedTemplate.variable_mappings) {
    for (const mapping of selectedTemplate.variable_mappings) {
      if (mapping.table_name === 'system') {
        // Variables del sistema (fecha, hora, ejecutivo)
        resolvedVariables[mapping.variable_number] = 
          variableValues[mapping.variable_number] || 
          whatsappTemplatesService.getSystemVariableValue(...);
      } else if (mapping.table_name === 'prospectos') {
        // Variables del prospecto (nombre, email, etc.)
        const fieldValue = prospectoData[mapping.field_name];
        resolvedVariables[mapping.variable_number] = 
          fieldValue ? String(fieldValue) : `[${mapping.display_name}]`;
      } else {
        // Otras tablas (destinos, resorts, etc.)
        const exampleValue = await whatsappTemplatesService.getTableExampleData(...);
        resolvedVariables[mapping.variable_number] = 
          exampleValue || `[${mapping.display_name}]`;
      }
    }
  }

  // 3. Resolver texto con TODAS las variables
  let resolvedText = '';
  selectedTemplate.components.forEach(component => {
    if (component.type === 'BODY' && component.text) {
      let text = component.text;
      
      // Reemplazar en orden descendente para evitar conflictos
      const sortedVarNums = Object.keys(resolvedVariables)
        .map(n => parseInt(n, 10))
        .sort((a, b) => b - a);
      
      sortedVarNums.forEach(varNum => {
        const value = resolvedVariables[varNum];
        text = text.replace(new RegExp(`\\{\\{${varNum}\\}\\}`, 'g'), value);
      });
      
      resolvedText += text + '\n';
    }
  });

  console.log('📤 Variables resueltas:', resolvedVariables);
  console.log('📝 Texto final:', resolvedText);

  // 4. Enviar con variables resueltas
  const payload = {
    template_id: selectedTemplate.id,
    template_name: selectedTemplate.name,
    prospecto_id: importedProspectId,
    variables: resolvedVariables, // Ahora incluye TODAS las variables
    resolved_text: resolvedText.trim(),
    triggered_by: 'MANUAL',
    triggered_by_user: user.id,
    triggered_by_user_name: user.full_name || user.email,
  };

  // Enviar a Edge Function...
};
```

**Resultado:** Ahora las plantillas se envían con TODAS las variables correctamente resueltas:
- Variables del sistema: `fecha_actual`, `hora_actual`, `ejecutivo_nombre`, etc.
- Variables del prospecto: `nombre_completo`, `email`, `whatsapp`, etc.
- Variables de otras tablas: Usando `getTableExampleData()`

---

### 5. ✅ **Mejora:** Preview del mensaje mejorado
**Descripción:** El preview ahora muestra correctamente:
- Variables del sistema: con sus valores reales
- Variables del prospecto: como placeholders `[Nombre del Prospecto]`
- Nota explicativa: "Los campos entre corchetes se reemplazarán automáticamente..."

```typescript
<div className="p-4 bg-gray-50">
  {selectedTemplate.components
    .filter(c => c.type === 'BODY' && c.text)
    .map((component) => {
      let text = component.text || '';
      
      // Reemplazar TODAS las variables
      selectedTemplate.variable_mappings?.forEach(mapping => {
        const varPattern = new RegExp(`\\{\\{${mapping.variable_number}\\}\\}`, 'g');
        
        if (mapping.table_name === 'system') {
          // Variables del sistema: mostrar valor real
          const value = variableValues[mapping.variable_number] || `[${mapping.display_name}]`;
          text = text.replace(varPattern, value);
        } else {
          // Otras variables: mostrar placeholder
          text = text.replace(varPattern, `[${mapping.display_name}]`);
        }
      });
      
      return <p className="whitespace-pre-wrap">{text}</p>;
    })}
</div>

{selectedTemplate.variable_mappings?.some(m => m.table_name !== 'system') && (
  <p className="mt-2 text-xs text-gray-500">
    Los campos entre corchetes se reemplazarán automáticamente con los datos del prospecto al enviar.
  </p>
)}
```

---

## 📝 Ejemplo Completo

### Plantilla Original:
```
Buen día, {{1}} {{2}}, vemos que ya le brindamos una propuesta 
para vacacionar, pero no hemos tenido la oportunidad de traerlos 
a que vivan esta increíble experiencia.
```

### Mapeos de Variables:
```typescript
variable_mappings: [
  { variable_number: 1, table_name: 'prospectos', field_name: 'nombre' },
  { variable_number: 2, table_name: 'prospectos', field_name: 'apellido_paterno' },
]
```

### Preview (Paso 4):
```
Buen día, [Nombre] [Apellido Paterno], vemos que ya le brindamos...
```

### Texto Final Enviado:
```
Buen día, Noe Garcia, vemos que ya le brindamos...
```

---

## 🧪 Testing

### Casos Probados:
- [x] Prospecto existente en BD local → No permite continuar
- [x] Prospecto nuevo de Dynamics → Muestra propietario correcto
- [x] Ejecutivo intentando importar de otra coordinación → Bloqueado
- [x] Admin importando de cualquier coordinación → Permitido
- [x] Plantilla con variables del prospecto → Resuelve correctamente
- [x] Plantilla con variables del sistema → Resuelve correctamente
- [x] Preview del mensaje → Muestra placeholders y valores reales

---

## 📂 Archivos Modificados

- **`src/components/chat/ImportWizardModal.tsx`**
  - Línea ~252: Fix búsqueda local (no continuar a Dynamics)
  - Línea ~1028: Reemplazado "Se asignará a" por "Propietario en Dynamics"
  - Línea ~593: Implementación completa de `handleSendTemplate` con resolución de variables
  - Línea ~1327: Preview mejorado con placeholders

---

## ⚠️ Notas Importantes

1. **Asignación automática:** El backend (N8N webhook) asigna el prospecto al `OwnerID` de Dynamics, NO al usuario que importa.

2. **Normalización de coordinaciones:** Se mantienen las equivalencias:
   - `COB ACAPULCO` = `COBACA`
   - `APEX` = `i360`

3. **Logs de debugging:** Ahora se loguean las variables resueltas y el texto final en consola para facilitar debugging:
   ```typescript
   console.log('📤 Variables resueltas:', resolvedVariables);
   console.log('📝 Texto final:', resolvedText);
   ```

4. **Performance:** La resolución de variables hace una query adicional a `prospectos` por cada envío, pero es necesaria para obtener los datos actualizados.

---

**Última actualización:** 2026-01-28  
**Corregido por:** Agent AI (Claude Sonnet 4.5)
