# 📋 GUÍA COMPLETA: ASIGNACIÓN MANUAL DE PROSPECTOS

## 🎯 Resumen Ejecutivo

Esta guía explica **qué campos afectar** y **qué catálogos usar** cuando asignas manualmente un prospecto a una coordinación y/o ejecutivo.

---

## 📊 CAMPOS QUE SE DEBEN AFECTAR

### 1. **Tabla Principal: `prospect_assignments` (System_UI)**

**Base de datos:** `zbylezfyagwrxoecioup.supabase.co` (System_UI)

Esta es la tabla **maestra** que controla todas las asignaciones.

#### Campos a actualizar/insertar:

```typescript
{
  prospect_id: string,           // UUID del prospecto (OBLIGATORIO)
  coordinacion_id: string,      // UUID de la coordinación (OBLIGATORIO)
  ejecutivo_id?: string,        // UUID del ejecutivo (OPCIONAL - solo si asignas ejecutivo)
  assigned_by: string,           // UUID del usuario que hace la asignación (OBLIGATORIO)
  assignment_type: 'manual',    // Siempre 'manual' para asignaciones manuales
  assignment_reason?: string,    // Razón de la asignación (OPCIONAL)
  is_active: true,              // Siempre true para asignaciones activas
  assigned_at: timestamp        // Se genera automáticamente
}
```

#### ⚠️ IMPORTANTE:
- **SIEMPRE** desactivar asignaciones anteriores antes de crear una nueva:
  ```sql
  UPDATE prospect_assignments 
  SET is_active = false, unassigned_at = NOW()
  WHERE prospect_id = '...' AND is_active = true;
  ```

---

### 2. **Tabla de Sincronización: `prospectos` (Base de Análisis)**

**Base de datos:** `glsmifhkoaifvaegsozd.supabase.co` (analysisSupabase)

Esta tabla se sincroniza automáticamente desde `prospect_assignments`.

#### Campos a actualizar:

```typescript
{
  coordinacion_id: string,      // UUID de la coordinación (OBLIGATORIO)
  ejecutivo_id?: string,        // UUID del ejecutivo (OPCIONAL)
  assignment_date: timestamp   // Fecha de asignación (se genera automáticamente)
}
```

---

### 3. **Tabla de Auditoría: `assignment_logs` (System_UI)**

**Base de datos:** `zbylezfyagwrxoecioup.supabase.co` (System_UI)

Se crea automáticamente un registro de auditoría.

#### Campos que se insertan:

```typescript
{
  prospect_id: string,          // UUID del prospecto
  coordinacion_id: string,      // UUID de la coordinación
  ejecutivo_id?: string,        // UUID del ejecutivo (si aplica)
  action: 'assigned',           // Tipo de acción
  assigned_by: string,          // UUID del usuario que asignó
  reason?: string,              // Razón de la asignación
  created_at: timestamp        // Se genera automáticamente
}
```

---

### 4. **Tablas Relacionadas (Sincronización Automática)**

Estas tablas se actualizan automáticamente cuando asignas un prospecto:

#### A) `llamadas_ventas` (Base de Análisis)
```typescript
{
  coordinacion_id: string,      // Se actualiza automáticamente
  ejecutivo_id?: string         // Se actualiza automáticamente si existe
}
```

#### B) `uchat_conversations` (System_UI)
```typescript
{
  coordinacion_id: string,      // Se actualiza automáticamente
  ejecutivo_id?: string         // Se actualiza automáticamente si existe
}
```

---

## 📚 CATÁLOGOS DISPONIBLES

### 1. **COORDINACIONES**

**Tabla:** `coordinaciones` (System_UI)  
**Servicio:** `coordinacionService.getCoordinaciones()`

#### Coordinaciones disponibles:

| Código | Nombre | ID (ejemplo) |
|--------|--------|--------------|
| **VEN** | Coordinación VEN | `uuid-ven` |
| **I360** | Coordinación I360 | `uuid-i360` |
| **MVP** | Coordinación MVP | `uuid-mvp` |
| **COBACA** | Coordinación COBACA | `uuid-cobaca` |
| **BOOM** | Coordinación BOOM | `uuid-boom` |

#### Estructura del objeto:

```typescript
interface Coordinacion {
  id: string;              // UUID de la coordinación
  codigo: string;         // 'VEN', 'I360', 'MVP', 'COBACA', 'BOOM'
  nombre: string;          // 'Coordinación COBACA'
  descripcion?: string;    // Descripción opcional
  is_active: boolean;      // true si está activa
  created_at: string;
  updated_at: string;
}
```

#### Cómo obtenerlas:

```typescript
import { coordinacionService } from '@/services/coordinacionService';

// Obtener todas las coordinaciones activas
const coordinaciones = await coordinacionService.getCoordinaciones();

// Obtener una coordinación por código
const cobaca = await coordinacionService.getCoordinacionByCodigo('COBACA');

// Obtener una coordinación por ID
const coordinacion = await coordinacionService.getCoordinacionById(uuid);
```

---

### 2. **EJECUTIVOS**

**Tabla:** `auth_users` (System_UI)  
**Servicio:** `coordinacionService.getEjecutivosByCoordinacion(coordinacionId)`

#### Filtros aplicados:
- `is_ejecutivo = true`
- `is_active = true`
- `coordinacion_id = coordinacionId` (solo ejecutivos de esa coordinación)

#### Estructura del objeto:

```typescript
interface Ejecutivo {
  id: string;                    // UUID del ejecutivo
  email: string;                 // Email del ejecutivo
  full_name: string;             // Nombre completo
  first_name?: string;           // Nombre
  last_name?: string;            // Apellido
  phone?: string;                // Teléfono
  coordinacion_id: string;       // UUID de la coordinación
  coordinacion_codigo?: string;  // 'COBACA', 'VEN', etc.
  coordinacion_nombre?: string;  // 'Coordinación COBACA'
  is_active: boolean;            // true si está activo
  email_verified: boolean;       // Si el email está verificado
  last_login?: string;           // Último inicio de sesión
  created_at: string;
}
```

#### Cómo obtenerlos:

```typescript
import { coordinacionService } from '@/services/coordinacionService';

// Obtener ejecutivos de una coordinación específica
const ejecutivos = await coordinacionService.getEjecutivosByCoordinacion(coordinacionId);

// Obtener un ejecutivo específico por ID
const ejecutivo = await coordinacionService.getEjecutivoById(ejecutivoId);
```

#### ⚠️ IMPORTANTE:
- Solo puedes asignar ejecutivos que pertenezcan a la coordinación del prospecto
- Si asignas un ejecutivo, el prospecto DEBE tener `coordinacion_id` primero

---

## 🔧 FUNCIONES DE ASIGNACIÓN MANUAL

### 1. **Asignar a Coordinación**

```typescript
import { assignmentService } from '@/services/assignmentService';

const result = await assignmentService.assignProspectManuallyToCoordinacion(
  prospectId,        // UUID del prospecto
  coordinacionId,    // UUID de la coordinación
  assignedBy,        // UUID del usuario que asigna (tu ID)
  reason             // Razón opcional: 'Reasignación por carga de trabajo'
);

if (result.success) {
  console.log('✅ Asignado a:', result.coordinacion_id);
} else {
  console.error('❌ Error:', result.error);
}
```

**Lo que hace:**
1. ✅ Desactiva asignaciones anteriores del prospecto
2. ✅ Crea nueva asignación en `prospect_assignments`
3. ✅ Registra en `assignment_logs`
4. ✅ Sincroniza `prospectos.coordinacion_id`
5. ✅ Actualiza `llamadas_ventas.coordinacion_id` (si existen)
6. ✅ Actualiza `uchat_conversations.coordinacion_id` (si existen)

---

### 2. **Asignar a Ejecutivo**

```typescript
import { assignmentService } from '@/services/assignmentService';

const result = await assignmentService.assignProspectManuallyToEjecutivo(
  prospectId,        // UUID del prospecto
  coordinacionId,    // UUID de la coordinación (DEBE existir)
  ejecutivoId,       // UUID del ejecutivo
  assignedBy,        // UUID del usuario que asigna (tu ID)
  reason             // Razón opcional: 'Asignación directa por coordinador'
);

if (result.success) {
  console.log('✅ Asignado a ejecutivo:', result.ejecutivo_id);
} else {
  console.error('❌ Error:', result.error);
}
```

**Lo que hace:**
1. ✅ Actualiza o crea asignación en `prospect_assignments`
2. ✅ Asigna `ejecutivo_id` a la asignación existente
3. ✅ Registra en `assignment_logs`
4. ✅ Sincroniza `prospectos.ejecutivo_id`
5. ✅ Actualiza `llamadas_ventas.ejecutivo_id` (si existen)
6. ✅ Actualiza `uchat_conversations.ejecutivo_id` (si existen)

---

## 📝 EJEMPLO COMPLETO DE ASIGNACIÓN MANUAL

```typescript
import { coordinacionService } from '@/services/coordinacionService';
import { assignmentService } from '@/services/assignmentService';
import { useAuth } from '@/contexts/AuthContext';

async function asignarProspectoManual() {
  const { user } = useAuth();
  const prospectId = 'uuid-del-prospecto';
  
  // 1. Obtener coordinaciones disponibles
  const coordinaciones = await coordinacionService.getCoordinaciones();
  console.log('Coordinaciones disponibles:', coordinaciones);
  // Resultado: [{ id: '...', codigo: 'COBACA', nombre: '...' }, ...]
  
  // 2. Seleccionar coordinación (ejemplo: COBACA)
  const cobaca = coordinaciones.find(c => c.codigo === 'COBACA');
  if (!cobaca) {
    throw new Error('Coordinación COBACA no encontrada');
  }
  
  // 3. Asignar prospecto a coordinación
  const resultCoordinacion = await assignmentService.assignProspectManuallyToCoordinacion(
    prospectId,
    cobaca.id,
    user.id,  // Tu ID como coordinador/admin
    'Asignación manual a COBACA'
  );
  
  if (!resultCoordinacion.success) {
    throw new Error(resultCoordinacion.error);
  }
  
  // 4. Obtener ejecutivos de COBACA
  const ejecutivos = await coordinacionService.getEjecutivosByCoordinacion(cobaca.id);
  console.log('Ejecutivos disponibles:', ejecutivos);
  // Resultado: [{ id: '...', full_name: 'Ejecutivo 1', ... }, ...]
  
  // 5. (OPCIONAL) Asignar a ejecutivo específico
  if (ejecutivos.length > 0) {
    const ejecutivoSeleccionado = ejecutivos[0]; // O seleccionar por algún criterio
    
    const resultEjecutivo = await assignmentService.assignProspectManuallyToEjecutivo(
      prospectId,
      cobaca.id,
      ejecutivoSeleccionado.id,
      user.id,
      'Asignación directa a ejecutivo'
    );
    
    if (!resultEjecutivo.success) {
      throw new Error(resultEjecutivo.error);
    }
  }
  
  console.log('✅ Asignación completada exitosamente');
}
```

---

## 🔍 VERIFICAR ASIGNACIÓN ACTUAL

```typescript
import { assignmentService } from '@/services/assignmentService';

// Obtener asignación actual de un prospecto
const assignment = await assignmentService.getProspectAssignment(prospectId);

if (assignment) {
  console.log('Coordinación:', assignment.coordinacion_id);
  console.log('Ejecutivo:', assignment.ejecutivo_id || 'Sin asignar');
  console.log('Tipo:', assignment.assignment_type); // 'automatic' o 'manual'
  console.log('Asignado por:', assignment.assigned_by);
  console.log('Fecha:', assignment.assigned_at);
} else {
  console.log('Prospecto sin asignación');
}
```

---

## ⚠️ REGLAS IMPORTANTES

### 1. **Orden de Asignación**
- ✅ **SIEMPRE** asigna primero a coordinación
- ✅ **LUEGO** puedes asignar a ejecutivo (opcional)

### 2. **Validaciones**
- ❌ No puedes asignar un ejecutivo de otra coordinación
- ❌ No puedes asignar a coordinación inexistente
- ❌ No puedes asignar a ejecutivo inactivo

### 3. **Desactivación de Asignaciones**
- ✅ Las asignaciones anteriores se desactivan automáticamente
- ✅ Solo puede haber UNA asignación activa por prospecto
- ✅ El historial se mantiene en `assignment_logs`

### 4. **Sincronización**
- ✅ Los cambios se sincronizan automáticamente entre bases de datos
- ✅ Las llamadas y conversaciones se actualizan automáticamente
- ✅ No necesitas actualizar manualmente las tablas relacionadas

---

## 📊 RESUMEN DE CAMPOS POR TABLA

| Tabla | Campo | Tipo | Obligatorio | Descripción |
|-------|-------|------|-------------|-------------|
| **prospect_assignments** | `prospect_id` | UUID | ✅ Sí | ID del prospecto |
| | `coordinacion_id` | UUID | ✅ Sí | ID de la coordinación |
| | `ejecutivo_id` | UUID | ❌ No | ID del ejecutivo (opcional) |
| | `assigned_by` | UUID | ✅ Sí | ID del usuario que asigna |
| | `assignment_type` | string | ✅ Sí | 'manual' o 'automatic' |
| | `assignment_reason` | string | ❌ No | Razón de la asignación |
| | `is_active` | boolean | ✅ Sí | true para activa |
| **prospectos** | `coordinacion_id` | UUID | ✅ Sí | Se sincroniza automáticamente |
| | `ejecutivo_id` | UUID | ❌ No | Se sincroniza automáticamente |
| | `assignment_date` | timestamp | ✅ Sí | Se genera automáticamente |
| **llamadas_ventas** | `coordinacion_id` | UUID | ✅ Sí | Se sincroniza automáticamente |
| | `ejecutivo_id` | UUID | ❌ No | Se sincroniza automáticamente |
| **uchat_conversations** | `coordinacion_id` | UUID | ✅ Sí | Se sincroniza automáticamente |
| | `ejecutivo_id` | UUID | ❌ No | Se sincroniza automáticamente |

---

## 🎯 CHECKLIST DE ASIGNACIÓN MANUAL

- [ ] Obtener catálogo de coordinaciones disponibles
- [ ] Seleccionar coordinación destino
- [ ] Verificar que el prospecto no tenga asignación activa (o desactivarla)
- [ ] Asignar prospecto a coordinación usando `assignProspectManuallyToCoordinacion()`
- [ ] (OPCIONAL) Obtener catálogo de ejecutivos de esa coordinación
- [ ] (OPCIONAL) Seleccionar ejecutivo destino
- [ ] (OPCIONAL) Asignar prospecto a ejecutivo usando `assignProspectManuallyToEjecutivo()`
- [ ] Verificar que la asignación se completó correctamente
- [ ] Confirmar sincronización en `prospectos`, `llamadas_ventas`, `uchat_conversations`

---

## 📞 CONTACTO Y SOPORTE

Para dudas sobre asignaciones manuales, consulta:
- `src/services/assignmentService.ts` - Lógica de asignación
- `src/services/coordinacionService.ts` - Catálogos de coordinaciones y ejecutivos
- `docs/ROLES_PERMISOS_README.md` - Documentación completa del sistema

---

**Última actualización:** Enero 2025  
**Versión:** 1.0.0

