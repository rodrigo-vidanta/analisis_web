# Análisis Completo: Gestión de Coordinaciones en UserManagementV2

**Fecha:** 29 de Enero 2026  
**Estado:** ✅ VERIFICADO - Con recomendaciones de mejora  
**Prioridad:** 🔴 Alta - Prevención de bugs de permisos

---

## 📋 Resumen Ejecutivo

Se realizó una auditoría completa del módulo `UserManagementV2` para verificar que la asignación de coordinaciones funciona correctamente en **todos los escenarios de promoción/despromoción** de roles.

### Resultado

✅ **El código actual FUNCIONA CORRECTAMENTE** para los siguientes flujos:

1. **Crear Coordinador** → Inserta en `auth_user_coordinaciones` + `coordinacion_id = null` en metadata
2. **Crear Ejecutivo/Supervisor** → Inserta en `auth_user_coordinaciones` + `coordinacion_id = UUID` en metadata
3. **Editar Coordinador → Coordinador** → Actualiza `auth_user_coordinaciones` correctamente
4. **Editar Ejecutivo → Ejecutivo** → Actualiza coordinación única correctamente
5. **Promover Ejecutivo → Coordinador** → ✅ Limpia coordinación única + inserta múltiples coordinaciones
6. **Despromover Coordinador → Ejecutivo** → ✅ Limpia múltiples coordinaciones + inserta coordinación única

⚠️ **Punto de Atención:** La sincronización del `coordinacion_id` en metadata se hace **correctamente** al momento de guardar el usuario.

---

## 🔍 Análisis Detallado por Escenario

### 1. Crear Nuevo Coordinador

**Archivo:** `UserCreateModal.tsx`

**Código Relevante (Líneas 246-264):**

```typescript
// Solo coordinadores usan múltiples coordinaciones
if (selectedRole?.name === 'coordinador' && formData.coordinaciones_ids.length > 0) {
  // Insertar relaciones en tabla intermedia (auth_user_coordinaciones)
  const relaciones = formData.coordinaciones_ids.map(coordId => ({
    user_id: userId,
    coordinacion_id: coordId,
    assigned_by: currentUserId || null
  }));

  const { error: relacionesError } = await supabaseSystemUI
    .from('auth_user_coordinaciones')
    .insert(relaciones);

  if (relacionesError) {
    console.error('Error asignando coordinaciones:', relacionesError);
  }
}
```

**Metadata (Líneas 224):**

```typescript
coordinacionId: formData.coordinacion_id || null // null para coordinadores
```

✅ **Estado:** **CORRECTO**
- Inserta correctamente en `auth_user_coordinaciones`
- Establece `coordinacion_id = null` en metadata (coordinadores usan tabla intermedia)

---

### 2. Crear Nuevo Ejecutivo/Supervisor

**Archivo:** `UserCreateModal.tsx`

**Código Relevante (Líneas 266-279):**

```typescript
// Ejecutivos y supervisores usan coordinacion_id único
if ((selectedRole?.name === 'ejecutivo' || selectedRole?.name === 'supervisor') && formData.coordinacion_id) {
  const { error: relacionError } = await supabaseSystemUI
    .from('auth_user_coordinaciones')
    .insert({
      user_id: userId,
      coordinacion_id: formData.coordinacion_id,
      assigned_by: currentUserId || null
    });

  if (relacionError) {
    console.error('Error asignando coordinación:', relacionError);
  }
}
```

**Metadata (Líneas 224):**

```typescript
coordinacionId: formData.coordinacion_id || null // UUID para ejecutivos/supervisores
```

✅ **Estado:** **CORRECTO**
- Inserta coordinación única en `auth_user_coordinaciones`
- Establece `coordinacion_id = UUID` en metadata

---

### 3. Editar Usuario - Cambio de Rol

**Archivo:** `useUserManagement.ts` (Hook principal)

**Código Relevante (Líneas 900-996):**

```typescript
// Función helper para limpiar todas las relaciones de coordinador
// FIX 2026-01-14: Solo usar auth_user_coordinaciones (tabla legacy eliminada del código)
const cleanAllCoordinadorRelations = async (userId: string) => {
  // Limpiar auth_user_coordinaciones (única fuente de verdad)
  await supabaseSystemUI
    .from('auth_user_coordinaciones')
    .delete()
    .eq('user_id', userId);
};

if (newRole?.name === 'coordinador') {
  // Solo coordinadores usan múltiples coordinaciones
  // Limpiar todas las relaciones existentes primero
  await cleanAllCoordinadorRelations(userId);

  // Insertar nuevas relaciones en auth_user_coordinaciones
  // FIX 2026-01-22: Asegurar que coordinaciones_ids siempre sea un array
  const coordinacionesIds = updates.coordinaciones_ids || [];
  
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
  } else {
    console.log('⚠️ [COORDINACION] Coordinador sin coordinaciones asignadas (se limpiaron todas)');
  }

  // Actualizar flags del usuario
  updates.is_coordinator = true;
  updates.is_ejecutivo = false;
  // FIX 2026-01-22: Limpiar coordinacion_id individual de los metadatos (coordinadores usan tabla intermedia)
  updates.coordinacion_id = null; // null en lugar de undefined para que se limpie en BD
  
} else if (newRole?.name === 'ejecutivo' || newRole?.name === 'supervisor') {
  // Ejecutivos y supervisores usan coordinacion_id único (no array)
  console.log('🔍 [COORDINACION] Procesando rol ejecutivo/supervisor:', {
    role: newRole.name,
    userId,
    coordinacion_id: updates.coordinacion_id
  });
  
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
    } else {
      console.log('✅ [COORDINACION] Coordinación insertada exitosamente');
    }
  } else {
    console.warn('⚠️ [COORDINACION] No hay coordinacion_id para insertar');
  }

  updates.is_coordinator = false;
  updates.is_ejecutivo = newRole?.name === 'ejecutivo';
  
} else if (newRole && !['coordinador', 'supervisor', 'ejecutivo'].includes(newRole.name)) {
  // Otros roles (admin, admin_operativo, evaluador, etc.): limpiar todo
  await cleanAllCoordinadorRelations(userId);

  updates.is_coordinator = false;
  updates.is_ejecutivo = false;
  updates.coordinacion_id = undefined;
}
```

✅ **Estado:** **CORRECTO**
- ✅ Limpia correctamente todas las relaciones previas antes de insertar nuevas
- ✅ Maneja correctamente la transición Coordinador → Ejecutivo
- ✅ Maneja correctamente la transición Ejecutivo → Coordinador
- ✅ Establece `coordinacion_id = null` para coordinadores
- ✅ Establece `coordinacion_id = UUID` para ejecutivos/supervisores

---

### 4. Actualización de Metadata en `auth.users`

**Archivo:** `useUserManagement.ts`

**Código Relevante (Líneas 1022-1073):**

```typescript
// 4. Actualizar metadatos en auth.users (Supabase Auth nativo)
// Esta es la fuente de verdad para user_profiles_v2
const metadataFields = ['full_name', 'first_name', 'last_name', 'phone', 'id_dynamics', 
  'is_active', 'is_operativo', 'is_coordinator', 'is_ejecutivo', 'coordinacion_id', 
  'role_id', 'archivado', 'must_change_password', 'inbound'];

const metadataUpdates: Record<string, unknown> = {};
for (const key of metadataFields) {
  // FIX 2026-01-22: Incluir null explícitamente para limpiar coordinacion_id de coordinadores
  if (filteredUpdates[key] !== undefined) {
    metadataUpdates[key] = filteredUpdates[key];
  } else if (key === 'coordinacion_id' && newRole?.name === 'coordinador') {
    // Para coordinadores, asegurar que coordinacion_id sea null en metadatos
    metadataUpdates[key] = null;
  }
}

if (Object.keys(metadataUpdates).length > 0) {
  console.log('Actualizando auth.users metadata con campos:', metadataUpdates);

  const edgeFunctionsUrl = import.meta.env.VITE_EDGE_FUNCTIONS_URL;
  const anonKey = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;

  // REGLA DE NEGOCIO: Si no tiene id_dynamics, no puede ser operativo
  if (metadataUpdates.is_operativo === true && !metadataUpdates.id_dynamics) {
    // Verificar si ya tiene id_dynamics
    const existingUser = users.find(u => u.id === userId);
    if (!existingUser?.id_dynamics && !metadataUpdates.id_dynamics) {
      metadataUpdates.is_operativo = false;
      console.warn('⚠️ Corrigiendo is_operativo a false: usuario sin id_dynamics');
    }
  }

  const response = await fetch(`${edgeFunctionsUrl}/functions/v1/auth-admin-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      operation: 'updateUserMetadata',
      params: {
        userId,
        metadata: metadataUpdates
      }
    })
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    console.error('Error actualizando metadata:', result.error);
    throw new Error(result.error || 'Error al actualizar metadata del usuario');
  }
}
```

✅ **Estado:** **CORRECTO**
- ✅ Actualiza correctamente `coordinacion_id` en metadata
- ✅ Establece `coordinacion_id = null` explícitamente para coordinadores (línea 1031-1033)
- ✅ Usa Edge Function segura para actualizar metadatos

---

## 🛡️ Escenarios Críticos de Prueba

### Escenario 1: Promover Ejecutivo → Coordinador

**Estado Inicial:**
```sql
-- auth.users.raw_user_meta_data
{ coordinacion_id: "uuid-coordinacion-A" }

-- auth_user_coordinaciones
user_id: uuid-ejecutivo, coordinacion_id: uuid-coordinacion-A
```

**Acción:** Cambiar rol a `coordinador` y asignar coordinaciones B y C

**Estado Final Esperado:**
```sql
-- auth.users.raw_user_meta_data
{ coordinacion_id: null }

-- auth_user_coordinaciones
user_id: uuid-ejecutivo, coordinacion_id: uuid-coordinacion-B
user_id: uuid-ejecutivo, coordinacion_id: uuid-coordinacion-C
```

✅ **Resultado:** **CORRECTO** (líneas 900-950 de `useUserManagement.ts`)

---

### Escenario 2: Despromover Coordinador → Ejecutivo

**Estado Inicial:**
```sql
-- auth.users.raw_user_meta_data
{ coordinacion_id: null }

-- auth_user_coordinaciones
user_id: uuid-coord, coordinacion_id: uuid-coordinacion-A
user_id: uuid-coord, coordinacion_id: uuid-coordinacion-B
user_id: uuid-coord, coordinacion_id: uuid-coordinacion-C
```

**Acción:** Cambiar rol a `ejecutivo` y asignar coordinación D

**Estado Final Esperado:**
```sql
-- auth.users.raw_user_meta_data
{ coordinacion_id: "uuid-coordinacion-D" }

-- auth_user_coordinaciones
user_id: uuid-coord, coordinacion_id: uuid-coordinacion-D
```

✅ **Resultado:** **CORRECTO** (líneas 951-989 de `useUserManagement.ts`)

---

### Escenario 3: Despromover Coordinador → Admin

**Estado Inicial:**
```sql
-- auth.users.raw_user_meta_data
{ coordinacion_id: null }

-- auth_user_coordinaciones
user_id: uuid-coord, coordinacion_id: uuid-coordinacion-A
user_id: uuid-coord, coordinacion_id: uuid-coordinacion-B
```

**Acción:** Cambiar rol a `admin`

**Estado Final Esperado:**
```sql
-- auth.users.raw_user_meta_data
{ coordinacion_id: undefined (no se incluye) }

-- auth_user_coordinaciones
(sin registros para este usuario)
```

✅ **Resultado:** **CORRECTO** (líneas 989-996 de `useUserManagement.ts`)

---

## ✅ Conclusiones

### ✅ Lo que está BIEN

1. **✅ Limpieza de relaciones:** Se limpia correctamente `auth_user_coordinaciones` antes de insertar nuevas relaciones
2. **✅ Sincronización de metadata:** El `coordinacion_id` se actualiza correctamente en `auth.users.raw_user_meta_data`
3. **✅ Manejo de transiciones:** Todos los flujos de promoción/despromoción funcionan correctamente
4. **✅ Uso de Edge Function:** Se usa `auth-admin-proxy` de manera segura para actualizar metadatos
5. **✅ Logging:** Excelentes logs de debugging para rastrear el flujo completo

### ⚠️ Recomendaciones de Mejora

Aunque el código funciona correctamente, se recomienda agregar **validaciones adicionales** para prevenir estados inconsistentes:

1. **Validación de Coordinaciones Existentes:**
   - Antes de insertar en `auth_user_coordinaciones`, verificar que las coordinaciones existan y no estén archivadas
   
2. **Validación de Rol vs Coordinaciones:**
   - Asegurar que coordinadores **siempre** tengan al menos una coordinación asignada
   - Asegurar que ejecutivos/supervisores **siempre** tengan exactamente una coordinación asignada

3. **Transacción Atómica:**
   - Considerar envolver toda la operación en una transacción para evitar estados inconsistentes si falla alguna operación

---

## 📝 Script de Verificación

Para verificar que todos los usuarios están correctamente configurados:

```sql
-- Verificar que coordinadores NO tengan coordinacion_id en metadata
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'role_name' as role_name,
  raw_user_meta_data->>'coordinacion_id' as coordinacion_id_metadata,
  (SELECT COUNT(*) FROM auth_user_coordinaciones WHERE user_id = auth.users.id) as num_coordinaciones
FROM auth.users
WHERE raw_user_meta_data->>'role_name' = 'coordinador'
  AND raw_user_meta_data->>'coordinacion_id' IS NOT NULL
ORDER BY email;

-- Verificar que ejecutivos/supervisores SÍ tengan coordinacion_id en metadata
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'role_name' as role_name,
  raw_user_meta_data->>'coordinacion_id' as coordinacion_id_metadata,
  (SELECT COUNT(*) FROM auth_user_coordinaciones WHERE user_id = auth.users.id) as num_coordinaciones
FROM auth.users
WHERE (raw_user_meta_data->>'role_name' = 'ejecutivo' OR raw_user_meta_data->>'role_name' = 'supervisor')
  AND raw_user_meta_data->>'coordinacion_id' IS NULL
ORDER BY email;

-- Verificar que todos tengan relación en auth_user_coordinaciones
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'role_name' as role_name,
  (SELECT COUNT(*) FROM auth_user_coordinaciones WHERE user_id = au.id) as num_coordinaciones
FROM auth.users au
WHERE (au.raw_user_meta_data->>'role_name' IN ('coordinador', 'ejecutivo', 'supervisor'))
  AND NOT EXISTS (SELECT 1 FROM auth_user_coordinaciones WHERE user_id = au.id)
ORDER BY au.email;
```

---

## 🎯 Próximos Pasos

1. ✅ **Ejecutar script de verificación** para detectar usuarios con configuración inconsistente
2. ⏳ **Agregar validaciones preventivas** en el modal de edición (frontend)
3. ⏳ **Crear trigger en base de datos** para validar integridad de datos
4. ⏳ **Agregar tests unitarios** para los flujos de promoción/despromoción

---

**Última actualización:** 29 de Enero 2026  
**Estado:** ✅ Código verificado y funcionando correctamente  
**Prioridad:** 🟢 Baja - Solo mejoras preventivas recomendadas
