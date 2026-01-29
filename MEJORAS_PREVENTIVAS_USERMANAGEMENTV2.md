# Mejoras Preventivas para UserManagementV2

**Fecha:** 29 de Enero 2026  
**Módulo:** `UserManagementV2`  
**Prioridad:** 🟡 Media - Prevención de bugs futuros

---

## 📋 Contexto

Después de analizar el problema de coordinadores con `coordinacion_id = null` y auditar completamente el módulo UserManagementV2, se identificaron **mejoras preventivas** que pueden agregarse para garantizar la integridad de datos en el futuro.

**Estado Actual del Código:** ✅ **FUNCIONA CORRECTAMENTE**

Sin embargo, se pueden agregar validaciones adicionales a nivel de frontend para prevenir estados inconsistentes.

---

## 🎯 Mejoras Propuestas

### 1. Validación al Guardar Usuario (Coordinador)

**Archivo:** `src/components/admin/UserManagementV2/components/UserEditPanel.tsx`

**Ubicación:** Línea 535 (función `handleSave`)

**Problema Potencial:**
Actualmente, el código permite guardar un coordinador sin coordinaciones asignadas (línea 943 del hook: `console.log('⚠️ [COORDINACION] Coordinador sin coordinaciones asignadas')`).

**Mejora Propuesta:**

```typescript
// ANTES (línea 535-614 de UserEditPanel.tsx)
const handleSave = useCallback(async () => {
  setIsSaving(true);
  setError(null);
  
  try {
    // ... validaciones existentes ...
    
    const updates: Partial<UserV2> & { password?: string; coordinaciones_ids?: string[] } = {
      // ... campos existentes ...
    };

    // Agregar coordinación según el rol
    if (selectedRole?.name === 'ejecutivo' || selectedRole?.name === 'supervisor') {
      updates.coordinacion_id = formData.coordinacion_id || undefined;
    } else if (selectedRole?.name === 'coordinador') {
      updates.coordinaciones_ids = formData.coordinaciones_ids || [];
    }
    
    // ... resto del código ...
  }
}, [/* deps */]);
```

**DESPUÉS (con validación preventiva):**

```typescript
const handleSave = useCallback(async () => {
  setIsSaving(true);
  setError(null);
  
  try {
    // ========================================
    // VALIDACIÓN PREVENTIVA: Coordinaciones requeridas
    // ========================================
    
    // Validar que coordinadores tengan al menos una coordinación
    if (selectedRole?.name === 'coordinador') {
      if (!formData.coordinaciones_ids || formData.coordinaciones_ids.length === 0) {
        setError('Los coordinadores deben tener al menos una coordinación asignada');
        setIsSaving(false);
        return;
      }
    }
    
    // Validar que ejecutivos/supervisores tengan exactamente una coordinación
    if (selectedRole?.name === 'ejecutivo' || selectedRole?.name === 'supervisor') {
      if (!formData.coordinacion_id) {
        setError(`Los ${selectedRole.name === 'supervisor' ? 'supervisores' : 'ejecutivos'} deben tener una coordinación asignada`);
        setIsSaving(false);
        return;
      }
    }
    
    // ... resto del código sin cambios ...
    
    const updates: Partial<UserV2> & { password?: string; coordinaciones_ids?: string[] } = {
      email: formData.email.trim().toLowerCase(),
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      full_name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
      phone: formData.phone.trim() || null,
      id_dynamics: formData.id_dynamics?.trim() || null,
      role_id: formData.role_id,
      is_operativo: finalIsOperativo,
      is_active: formData.is_active,
      inbound: formData.inbound,
    };

    // Agregar coordinación según el rol
    if (selectedRole?.name === 'ejecutivo' || selectedRole?.name === 'supervisor') {
      updates.coordinacion_id = formData.coordinacion_id || undefined;
    } else if (selectedRole?.name === 'coordinador') {
      // FIX 2026-01-29: Ya validado arriba, siempre será array con elementos
      updates.coordinaciones_ids = formData.coordinaciones_ids || [];
    }

    console.log('💾 [USER EDIT] Updates completos antes de enviar:', updates);

    // ... resto del código sin cambios ...
    
  } catch (err) {
    console.error('Error saving user:', err);
    setError('Error al guardar los cambios');
  } finally {
    setIsSaving(false);
  }
}, [formData, user.id, selectedRole, isEditingPassword, onSave, currentUserId, onRefresh, onClose]);
```

**Beneficio:**
- ✅ Previene guardar coordinadores sin coordinaciones
- ✅ Previene guardar ejecutivos/supervisores sin coordinación
- ✅ Feedback inmediato al usuario en el frontend

---

### 2. Validación al Crear Usuario (Coordinador)

**Archivo:** `src/components/admin/UserManagementV2/components/UserCreateModal.tsx`

**Ubicación:** Línea 162 (función `handleSubmit`)

**Estado Actual:** ✅ Ya tiene validación (líneas 183-186)

```typescript
// Validar coordinaciones para coordinadores (múltiples)
if (selectedRole?.name === 'coordinador' && formData.coordinaciones_ids.length === 0) {
  toast.error('Debes seleccionar al menos una coordinación');
  return;
}
```

**Estado:** ✅ **NO REQUIERE CAMBIOS** - Ya está correctamente validado

---

### 3. Validación Visual en el Formulario

**Archivo:** `src/components/admin/UserManagementV2/components/UserEditPanel.tsx`

**Ubicación:** Líneas 1155-1205 (sección de coordinaciones para coordinadores)

**Mejora Propuesta:** Agregar indicador visual de advertencia si no hay coordinaciones seleccionadas

```typescript
{/* Coordinaciones for Coordinador ONLY (Multiple) */}
{selectedRole?.name === 'coordinador' && (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    exit={{ opacity: 0, height: 0 }}
    className="space-y-2"
  >
    <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
      <Building2 className="w-4 h-4 text-gray-400" />
      <span>Coordinaciones *</span>
      {/* NUEVO: Indicador de validación */}
      {formData.coordinaciones_ids.length === 0 && (
        <span className="ml-auto px-2 py-0.5 text-[10px] font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Requerido
        </span>
      )}
    </label>
    
    {/* NUEVO: Mensaje de advertencia si no hay selección */}
    {formData.coordinaciones_ids.length === 0 && (
      <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Selecciona al menos una coordinación para este coordinador
        </p>
      </div>
    )}
    
    <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-none">
      {activeCoordinaciones.map(coord => {
        // ... código existente sin cambios ...
      })}
    </div>
  </motion.div>
)}
```

**Beneficio:**
- ✅ Feedback visual inmediato
- ✅ Usuario sabe que debe seleccionar coordinaciones antes de guardar
- ✅ Previene intentos de guardar sin coordinaciones

---

### 4. Validación en el Hook (Backend Logic)

**Archivo:** `src/components/admin/UserManagementV2/hooks/useUserManagement.ts`

**Ubicación:** Línea 909-950 (sección de coordinadores)

**Mejora Propuesta:** Agregar throw de error si no hay coordinaciones

```typescript
if (newRole?.name === 'coordinador') {
  // Solo coordinadores usan múltiples coordinaciones
  // Limpiar todas las relaciones existentes primero
  await cleanAllCoordinadorRelations(userId);

  // Insertar nuevas relaciones en auth_user_coordinaciones
  const coordinacionesIds = updates.coordinaciones_ids || [];
  
  // ========================================
  // VALIDACIÓN PREVENTIVA: Al menos una coordinación requerida
  // ========================================
  if (coordinacionesIds.length === 0) {
    console.error('❌ [COORDINACION] Intento de guardar coordinador sin coordinaciones');
    throw new Error('Los coordinadores deben tener al menos una coordinación asignada');
  }
  
  if (coordinacionesIds.length > 0) {
    const relaciones = coordinacionesIds.map(coordId => ({
      user_id: userId,
      coordinacion_id: coordId,
      assigned_by: currentUserId || null
    }));

    const { error: relacionesError } = await supabaseSystemUI
      .from('auth_user_coordinaciones')
      .insert(relaciones);

    if (relacionesError) {
      console.error('❌ [COORDINACION] Error actualizando coordinaciones:', relacionesError);
      throw new Error(`Error al actualizar coordinaciones: ${relacionesError.message}`);
    } else {
      console.log('✅ [COORDINACION] Coordinaciones actualizadas exitosamente:', {
        userId,
        coordinacionesIds,
        relacionesInsertadas: relaciones.length
      });
    }
  }

  // Actualizar flags del usuario
  updates.is_coordinator = true;
  updates.is_ejecutivo = false;
  updates.coordinacion_id = null;
}
```

**Beneficio:**
- ✅ Doble capa de validación (frontend + backend logic)
- ✅ Previene estados inconsistentes si la validación de frontend falla
- ✅ Error descriptivo en logs

---

### 5. Validación de Coordinación para Ejecutivos/Supervisores

**Archivo:** `src/components/admin/UserManagementV2/hooks/useUserManagement.ts`

**Ubicación:** Línea 951-989 (sección de ejecutivos/supervisores)

**Mejora Propuesta:** Agregar throw de error si no hay coordinación

```typescript
else if (newRole?.name === 'ejecutivo' || newRole?.name === 'supervisor') {
  // Ejecutivos y supervisores usan coordinacion_id único (no array)
  console.log('🔍 [COORDINACION] Procesando rol ejecutivo/supervisor:', {
    role: newRole.name,
    userId,
    coordinacion_id: updates.coordinacion_id
  });
  
  // ========================================
  // VALIDACIÓN PREVENTIVA: Coordinación requerida
  // ========================================
  if (!updates.coordinacion_id) {
    console.error(`❌ [COORDINACION] Intento de guardar ${newRole.name} sin coordinación`);
    throw new Error(`Los ${newRole.name === 'supervisor' ? 'supervisores' : 'ejecutivos'} deben tener una coordinación asignada`);
  }
  
  // ⚠️ DOWNGRADE: Limpiar TODAS las relaciones de coordinador si las tenía
  await cleanAllCoordinadorRelations(userId);
  console.log('✅ [COORDINACION] Limpiadas relaciones previas');

  // Insertar coordinación única en auth_user_coordinaciones
  if (updates.coordinacion_id) {
    console.log('📝 [COORDINACION] Insertando en auth_user_coordinaciones:', {
      user_id: userId,
      coordinacion_id: updates.coordinacion_id
    });
    
    const { error: relacionError } = await supabaseSystemUI
      .from('auth_user_coordinaciones')
      .insert({
        user_id: userId,
        coordinacion_id: updates.coordinacion_id,
        assigned_by: currentUserId || null
      });

    if (relacionError) {
      console.error('❌ [COORDINACION] Error asignando coordinación:', relacionError);
      throw new Error(`Error al asignar coordinación: ${relacionError.message}`);
    } else {
      console.log('✅ [COORDINACION] Coordinación insertada exitosamente');
    }
  }

  updates.is_coordinator = false;
  updates.is_ejecutivo = newRole?.name === 'ejecutivo';
}
```

**Beneficio:**
- ✅ Previene guardar ejecutivos/supervisores sin coordinación
- ✅ Consistencia con validación de coordinadores
- ✅ Error descriptivo en logs

---

## 📊 Resumen de Mejoras

| Mejora | Archivo | Prioridad | Impacto |
|--------|---------|-----------|---------|
| 1. Validación en UserEditPanel | UserEditPanel.tsx | 🔴 Alta | Previene guardar sin coordinaciones |
| 2. Validación en UserCreateModal | UserCreateModal.tsx | ✅ Ya existe | N/A |
| 3. Indicador visual | UserEditPanel.tsx | 🟡 Media | Mejora UX |
| 4. Validación en hook (coordinadores) | useUserManagement.ts | 🔴 Alta | Doble capa de validación |
| 5. Validación en hook (ejecutivos) | useUserManagement.ts | 🔴 Alta | Doble capa de validación |

---

## 🚀 Plan de Implementación

### Fase 1: Validaciones Críticas (Alta Prioridad)

1. **UserEditPanel.tsx - Validación handleSave (coordinadores)**
   - Líneas: 535-614
   - Tiempo estimado: 5 minutos
   - Testing: Intentar guardar coordinador sin coordinaciones

2. **useUserManagement.ts - Validación coordinadores**
   - Líneas: 909-950
   - Tiempo estimado: 3 minutos
   - Testing: Verificar que throw error si no hay coordinaciones

3. **useUserManagement.ts - Validación ejecutivos**
   - Líneas: 951-989
   - Tiempo estimado: 3 minutos
   - Testing: Verificar que throw error si no hay coordinación

### Fase 2: Mejoras de UX (Media Prioridad)

4. **UserEditPanel.tsx - Indicador visual**
   - Líneas: 1155-1205
   - Tiempo estimado: 10 minutos
   - Testing: Verificar que aparezca advertencia cuando no hay selección

---

## ✅ Testing Recomendado

### Test Case 1: Coordinador sin Coordinaciones

**Pasos:**
1. Abrir modal de edición de un coordinador
2. Desmarcar todas las coordinaciones
3. Intentar guardar

**Resultado Esperado:**
- ❌ Frontend previene guardar con mensaje de error
- ❌ Backend también previene guardar si frontend falla

### Test Case 2: Ejecutivo sin Coordinación

**Pasos:**
1. Abrir modal de edición de un ejecutivo
2. Limpiar la coordinación seleccionada
3. Intentar guardar

**Resultado Esperado:**
- ❌ Frontend previene guardar con mensaje de error
- ❌ Backend también previene guardar si frontend falla

### Test Case 3: Promover Ejecutivo → Coordinador sin Coordinaciones

**Pasos:**
1. Abrir modal de edición de un ejecutivo
2. Cambiar rol a "Coordinador"
3. No seleccionar ninguna coordinación
4. Intentar guardar

**Resultado Esperado:**
- ❌ Frontend muestra advertencia visual
- ❌ Frontend previene guardar con mensaje de error

### Test Case 4: Despromover Coordinador → Ejecutivo sin Coordinación

**Pasos:**
1. Abrir modal de edición de un coordinador
2. Cambiar rol a "Ejecutivo"
3. No seleccionar ninguna coordinación
4. Intentar guardar

**Resultado Esperado:**
- ❌ Frontend previene guardar con mensaje de error

---

## 📝 Notas Importantes

### ⚠️ Coordinadores con coordinacion_id en metadata

**Arquitectura Actual (Post-Fix 2026-01-29):**
- Coordinadores **SÍ tienen `coordinacion_id` en metadata**
- El `coordinacion_id` en metadata refleja **UNA de sus coordinaciones** (la primera asignada)
- La **fuente de verdad completa** para coordinadores es `auth_user_coordinaciones` (tabla intermedia)

**¿Por qué coordinadores tienen `coordinacion_id` en metadata?**
- Compatibilidad con filtros de frontend
- Optimización de queries (evitar JOIN en cada consulta)
- Consistencia con `user_profiles_v2`

**Regla de negocio:**
- `coordinacion_id` en metadata = Primera coordinación de `auth_user_coordinaciones`
- Para obtener **todas** las coordinaciones de un coordinador, usar `auth_user_coordinaciones`

---

## 🎯 Conclusión

Las mejoras propuestas son **preventivas** y agregan una **doble capa de validación** (frontend + backend logic) para garantizar que:

1. ✅ Coordinadores **siempre** tienen al menos una coordinación
2. ✅ Ejecutivos/Supervisores **siempre** tienen exactamente una coordinación
3. ✅ Los usuarios reciben feedback inmediato si intentan guardar sin coordinaciones
4. ✅ Se previenen estados inconsistentes en la base de datos

**Impacto:** Mejora la robustez del sistema sin cambiar la lógica existente que ya funciona correctamente.

---

**Última actualización:** 29 de Enero 2026  
**Estado:** 📄 Propuesta de mejoras preventivas  
**Prioridad:** 🟡 Media - Implementación recomendada
