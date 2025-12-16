# 🚀 GUÍA: INSERTAR LEADS YA ASIGNADOS DESDE N8N (BACKEND)

## 🎯 Objetivo

Insertar leads **ya asignados** desde N8N, manteniendo el sistema de Supabase como **fallback** para leads sin asignación.

**⚠️ IMPORTANTE:** Si NO asignas manualmente, DEBES ejecutar la asignación automática después de crear el prospecto. Ver `docs/GUIA_N8N_ASIGNACION_AUTOMATICA.md` para detalles.

---

## 📊 FLUJO DE ASIGNACIÓN

```
┌─────────────────┐
│   N8N Backend   │
│  (Tu proceso)   │
└────────┬────────┘
         │
         │ 1. Calcula asignación
         │    (coordinación + ejecutivo)
         │
         ▼
┌─────────────────┐
│  INSERT Lead    │
│  con campos:    │
│  - coordinacion_id
│  - ejecutivo_id │
└────────┬────────┘
         │
         │ 2. Crea asignación en
         │    prospect_assignments
         │
         ▼
┌─────────────────┐
│  Supabase       │
│  (Fallback)     │
│                 │
│  Si coordinacion_id
│  = NULL →       │
│  Asigna auto    │
└─────────────────┘
```

---

## 🔧 PASO 1: INSERTAR PROSPECTO CON ASIGNACIÓN

### A) Insertar en `prospectos` (Base de Análisis)

**Base de datos:** `glsmifhkoaifvaegsozd.supabase.co` (analysisSupabase)

```sql
INSERT INTO prospectos (
  -- Campos básicos del prospecto
  nombre_completo,
  nombre,
  email,
  whatsapp,
  telefono_principal,
  -- ⚠️ CAMPOS CRÍTICOS DE ASIGNACIÓN
  coordinacion_id,        -- UUID de la coordinación (OBLIGATORIO si ya asignado)
  ejecutivo_id,           -- UUID del ejecutivo (OPCIONAL, solo si ya asignado)
  assignment_date,        -- Fecha de asignación (NOW())
  -- Otros campos...
  created_at,
  updated_at
) VALUES (
  'Juan Pérez',
  'Juan',
  'juan@ejemplo.com',
  '5213312345678',
  '3312345678',
  -- ⚠️ ASIGNACIÓN DESDE BACKEND
  '0008460b-a730-4f0b-ac1b-5aaa5c40f5b0',  -- UUID de COBACA (ejemplo)
  'uuid-del-ejecutivo',                     -- UUID del ejecutivo (opcional)
  NOW(),                                    -- Fecha de asignación
  NOW(),
  NOW()
) RETURNING id;
```

### B) Crear asignación en `prospect_assignments` (System_UI)

**Base de datos:** `zbylezfyagwrxoecioup.supabase.co` (System_UI)

```sql
INSERT INTO prospect_assignments (
  prospect_id,           -- ID del prospecto recién creado
  coordinacion_id,       -- UUID de la coordinación
  ejecutivo_id,         -- UUID del ejecutivo (NULL si no asignado)
  assigned_by,          -- NULL (asignación desde backend)
  assignment_type,      -- 'manual' o 'backend'
  assignment_reason,    -- 'Asignación desde N8N backend'
  is_active,            -- true
  assigned_at           -- NOW()
) VALUES (
  'uuid-del-prospecto-creado',  -- ID retornado del INSERT anterior
  '0008460b-a730-4f0b-ac1b-5aaa5c40f5b0',  -- UUID de COBACA
  'uuid-del-ejecutivo',         -- UUID del ejecutivo (NULL si no asignado)
  NULL,                          -- NULL porque es desde backend
  'backend',                     -- Tipo: 'backend' para distinguir de 'manual' y 'automatic'
  'Asignación desde N8N backend', -- Razón
  true,
  NOW()
);
```

### C) Registrar en logs (Opcional pero recomendado)

```sql
INSERT INTO assignment_logs (
  prospect_id,
  coordinacion_id,
  ejecutivo_id,
  action,
  assigned_by,
  reason,
  metadata
) VALUES (
  'uuid-del-prospecto',
  'uuid-coordinacion',
  'uuid-ejecutivo',  -- NULL si no asignado
  'assigned',
  NULL,              -- NULL porque es desde backend
  'Asignación desde N8N backend',
  '{"source": "n8n", "workflow": "lead_assignment"}'::jsonb
);
```

---

## 📝 ESTRUCTURA DEL PAYLOAD DESDE N8N

### Ejemplo completo en N8N:

```json
{
  "prospecto": {
    "nombre_completo": "Juan Pérez",
    "nombre": "Juan",
    "email": "juan@ejemplo.com",
    "whatsapp": "5213312345678",
    "telefono_principal": "3312345678",
    "edad": 35,
    "ciudad_residencia": "Guadalajara",
    "etapa": "nuevo",
    "campana_origen": "facebook_ads"
  },
  "asignacion": {
    "coordinacion_codigo": "COBACA",  // O usar coordinacion_id directamente
    "coordinacion_id": "0008460b-a730-4f0b-ac1b-5aaa5c40f5b0",
    "ejecutivo_id": "uuid-del-ejecutivo",  // Opcional
    "ejecutivo_email": "ejecutivo@ejemplo.com"  // Alternativa: buscar por email
  },
  "metadata": {
    "source": "n8n",
    "workflow_id": "lead-assignment-v1",
    "assignment_reason": "Asignación balanceada desde backend"
  }
}
```

---

## 🔄 PROCESO EN N8N (Paso a Paso)

### **⚠️ IMPORTANTE: Asignación Automática**

**SI NO QUIERES ASIGNAR MANUALMENTE**, después de crear el prospecto, **DEBES** llamar a la función RPC para asignación automática:

```javascript
// N8N Function Node - Después de crear prospecto
const prospectId = $input.item.json.prospecto_id; // ID del prospecto recién creado

// Llamar a función RPC para asignación automática
const { data: coordinacionId, error } = await fetch(
  'https://zbylezfyagwrxoecioup.supabase.co/rest/v1/rpc/assign_prospect_to_coordinacion',
  {
    method: 'POST',
    headers: {
      'apikey': 'TU_SYSTEM_UI_ANON_KEY',
      'Authorization': 'Bearer TU_SYSTEM_UI_ANON_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_prospect_id: prospectId,
      p_assigned_by: null
    })
  }
).then(r => r.json());

if (error) {
  console.error('Error asignando prospecto:', error);
  throw new Error('Error en asignación automática');
}

// Actualizar prospecto con coordinacion_id
await fetch(
  `https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/prospectos?id=eq.${prospectId}`,
  {
    method: 'PATCH',
    headers: {
      'apikey': 'TU_ANALYSIS_ANON_KEY',
      'Authorization': 'Bearer TU_ANALYSIS_ANON_KEY',
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      coordinacion_id: coordinacionId,
      assignment_date: new Date().toISOString()
    })
  }
);

return {
  json: {
    ...$input.item.json,
    coordinacion_id: coordinacionId,
    assignment_completed: true
  }
};
```

---

### **Nodo 1: Obtener Coordinación por Código** (Solo si asignas manualmente)

```javascript
// N8N Function Node
const coordinacionCodigo = $input.item.json.asignacion.coordinacion_codigo;

// Llamar a Supabase System_UI
const { data: coordinacion } = await fetch(
  'https://zbylezfyagwrxoecioup.supabase.co/rest/v1/coordinaciones?codigo=eq.' + coordinacionCodigo + '&is_active=eq.true&select=id,codigo,nombre',
  {
    headers: {
      'apikey': 'TU_SYSTEM_UI_ANON_KEY',
      'Authorization': 'Bearer TU_SYSTEM_UI_ANON_KEY'
    }
  }
).then(r => r.json());

if (!coordinacion || coordinacion.length === 0) {
  throw new Error('Coordinación no encontrada: ' + coordinacionCodigo);
}

return {
  json: {
    ...$input.item.json,
    asignacion: {
      ...$input.item.json.asignacion,
      coordinacion_id: coordinacion[0].id,
      coordinacion_nombre: coordinacion[0].nombre
    }
  }
};
```

### **Nodo 2: Obtener Ejecutivo (Si aplica)**

```javascript
// N8N Function Node
const ejecutivoEmail = $input.item.json.asignacion.ejecutivo_email;
const coordinacionId = $input.item.json.asignacion.coordinacion_id;

if (!ejecutivoEmail) {
  // No hay ejecutivo asignado, continuar sin él
  return $input.item;
}

// Buscar ejecutivo por email y coordinación
const { data: ejecutivo } = await fetch(
  `https://zbylezfyagwrxoecioup.supabase.co/rest/v1/auth_users?email=eq.${ejecutivoEmail}&coordinacion_id=eq.${coordinacionId}&is_ejecutivo=eq.true&is_active=eq.true&select=id,email,full_name`,
  {
    headers: {
      'apikey': 'TU_SYSTEM_UI_ANON_KEY',
      'Authorization': 'Bearer TU_SYSTEM_UI_ANON_KEY'
    }
  }
).then(r => r.json());

if (!ejecutivo || ejecutivo.length === 0) {
  throw new Error('Ejecutivo no encontrado o no pertenece a la coordinación');
}

return {
  json: {
    ...$input.item.json,
    asignacion: {
      ...$input.item.json.asignacion,
      ejecutivo_id: ejecutivo[0].id,
      ejecutivo_nombre: ejecutivo[0].full_name
    }
  }
};
```

### **Nodo 3: Insertar Prospecto en Base de Análisis**

**⚠️ IMPORTANTE:** Después de este paso, SI NO asignas manualmente, DEBES ejecutar la asignación automática (ver sección anterior).

### **Nodo 3.5: Asignación Automática (OBLIGATORIO si no asignas manualmente)**

```javascript
// N8N Function Node - Asignación Automática
const prospectId = $input.item.json.id; // ID del prospecto creado en paso anterior

// Llamar función RPC para asignación automática
const response = await fetch(
  'https://zbylezfyagwrxoecioup.supabase.co/rest/v1/rpc/assign_prospect_to_coordinacion',
  {
    method: 'POST',
    headers: {
      'apikey': 'TU_SYSTEM_UI_ANON_KEY',
      'Authorization': 'Bearer TU_SYSTEM_UI_ANON_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_prospect_id: prospectId,
      p_assigned_by: null
    })
  }
);

if (!response.ok) {
  const error = await response.json();
  throw new Error(`Error asignando prospecto: ${JSON.stringify(error)}`);
}

const coordinacionId = await response.json();

// Actualizar prospecto con coordinacion_id
const updateResponse = await fetch(
  `https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/prospectos?id=eq.${prospectId}`,
  {
    method: 'PATCH',
    headers: {
      'apikey': 'TU_ANALYSIS_ANON_KEY',
      'Authorization': 'Bearer TU_ANALYSIS_ANON_KEY',
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      coordinacion_id: coordinacionId,
      assignment_date: new Date().toISOString()
    })
  }
);

if (!updateResponse.ok) {
  console.warn('⚠️ Error actualizando coordinacion_id en prospectos (no crítico)');
}

return {
  json: {
    ...$input.item.json,
    coordinacion_id: coordinacionId,
    assignment_completed: true
  }
};
```

### **Nodo 4: Crear Asignación en System_UI** (Solo si asignas manualmente)

```javascript
// N8N Supabase Node - INSERT prospectos
// Configuración:
// - Table: prospectos
// - Operation: Insert
// - Data:
{
  "nombre_completo": "{{ $json.prospecto.nombre_completo }}",
  "nombre": "{{ $json.prospecto.nombre }}",
  "email": "{{ $json.prospecto.email }}",
  "whatsapp": "{{ $json.prospecto.whatsapp }}",
  "telefono_principal": "{{ $json.prospecto.telefono_principal }}",
  "edad": {{ $json.prospecto.edad }},
  "ciudad_residencia": "{{ $json.prospecto.ciudad_residencia }}",
  "etapa": "{{ $json.prospecto.etapa }}",
  "campana_origen": "{{ $json.prospecto.campana_origen }}",
  // ⚠️ CAMPOS CRÍTICOS DE ASIGNACIÓN
  "coordinacion_id": "{{ $json.asignacion.coordinacion_id }}",
  "ejecutivo_id": "{{ $json.asignacion.ejecutivo_id }}",
  "assignment_date": "{{ $now }}"
}
```

### **Nodo 4: Crear Asignación en System_UI**

```javascript
// N8N Supabase Node - INSERT prospect_assignments
// Configuración:
// - Table: prospect_assignments
// - Operation: Insert
// - Data:
{
  "prospect_id": "{{ $json.id }}",  // ID del prospecto creado en paso anterior
  "coordinacion_id": "{{ $json.asignacion.coordinacion_id }}",
  "ejecutivo_id": "{{ $json.asignacion.ejecutivo_id }}",  // NULL si no asignado
  "assigned_by": null,  // NULL porque es desde backend
  "assignment_type": "backend",  // Distinguir de 'automatic' y 'manual'
  "assignment_reason": "{{ $json.metadata.assignment_reason }}",
  "is_active": true,
  "assigned_at": "{{ $now }}"
}
```

### **Nodo 5: Registrar en Logs (Opcional)**

```javascript
// N8N Supabase Node - INSERT assignment_logs
{
  "prospect_id": "{{ $json.prospect_id }}",
  "coordinacion_id": "{{ $json.coordinacion_id }}",
  "ejecutivo_id": "{{ $json.ejecutivo_id }}",
  "action": "assigned",
  "assigned_by": null,
  "reason": "Asignación desde N8N backend",
  "metadata": {
    "source": "n8n",
    "workflow": "{{ $json.metadata.workflow_id }}"
  }
}
```

---

## ⚠️ VALIDACIONES EN N8N

### **Antes de insertar, validar:**

1. ✅ **Coordinación existe y está activa**
   ```javascript
   if (!coordinacion_id || coordinacion_id === '') {
     throw new Error('coordinacion_id es requerido');
   }
   ```

2. ✅ **Ejecutivo pertenece a la coordinación** (si se asigna ejecutivo)
   ```javascript
   if (ejecutivo_id && ejecutivo.coordinacion_id !== coordinacion_id) {
     throw new Error('Ejecutivo no pertenece a la coordinación asignada');
   }
   ```

3. ✅ **Ejecutivo está activo** (si se asigna ejecutivo)
   ```javascript
   if (ejecutivo_id && !ejecutivo.is_active) {
     throw new Error('Ejecutivo no está activo');
   }
   ```

4. ✅ **Prospecto no existe previamente** (opcional, según tu lógica)
   ```javascript
   const existing = await checkProspectExists(email, whatsapp);
   if (existing) {
     throw new Error('Prospecto ya existe');
   }
   ```

---

## 🔄 COMPORTAMIENTO DEL FALLBACK (SUPABASE)

### **Cómo funciona el fallback:**

El sistema de Supabase (`automationService.processNewProspect()`) verifica:

```typescript
// 1. Verificar si ya tiene asignación
const assignment = await assignmentService.getProspectAssignment(prospectId);
if (assignment) {
  return; // ✅ Ya tiene asignación, NO hacer nada
}

// 2. Si NO tiene asignación, asignar automáticamente
const result = await assignmentService.assignProspectToCoordinacion(prospectId);
```

### **Función RPC `assign_prospect_to_coordinacion`:**

```sql
-- Verificar si el prospecto ya tiene una asignación activa
SELECT coordinacion_id INTO v_coordinacion_id
FROM prospect_assignments
WHERE prospect_id = p_prospect_id
  AND is_active = true;

IF v_coordinacion_id IS NOT NULL THEN
  -- ✅ Ya tiene asignación, retornar sin hacer nada
  RETURN v_coordinacion_id;
END IF;

-- Si llega aquí, NO tiene asignación → asignar automáticamente
```

---

## ✅ RESULTADO ESPERADO

### **Escenario 1: Lead con asignación desde N8N**

```
1. N8N inserta prospecto con coordinacion_id = 'uuid-cobaca'
2. N8N crea asignación en prospect_assignments
3. Frontend detecta nuevo prospecto
4. automationService.processNewProspect() verifica asignación
5. ✅ Encuentra asignación existente → NO hace nada
6. ✅ Lead queda asignado a COBACA (como se configuró en N8N)
```

### **Escenario 2: Lead sin asignación (fallback)**

```
1. N8N inserta prospecto con coordinacion_id = NULL
2. N8N NO crea asignación en prospect_assignments
3. Frontend detecta nuevo prospecto
4. automationService.processNewProspect() verifica asignación
5. ❌ NO encuentra asignación → Asigna automáticamente
6. ✅ Lead queda asignado según balanceo automático
```

---

## 📋 CHECKLIST PARA N8N

- [ ] Obtener `coordinacion_id` desde código de coordinación
- [ ] (Opcional) Obtener `ejecutivo_id` si se asigna ejecutivo
- [ ] Validar que coordinación existe y está activa
- [ ] Validar que ejecutivo pertenece a coordinación (si aplica)
- [ ] Insertar prospecto en `prospectos` con `coordinacion_id` y `ejecutivo_id`
- [ ] Crear asignación en `prospect_assignments` con `assignment_type = 'backend'`
- [ ] (Opcional) Registrar en `assignment_logs`
- [ ] Manejar errores y rollback si falla alguna operación

---

## 🔧 EJEMPLO COMPLETO EN N8N (HTTP Request)

### **Endpoint para insertar lead asignado:**

```javascript
// N8N HTTP Request Node
// Method: POST
// URL: https://zbylezfyagwrxoecioup.supabase.co/rest/v1/rpc/insert_prospect_with_assignment

// Body:
{
  "p_prospecto_data": {
    "nombre_completo": "Juan Pérez",
    "email": "juan@ejemplo.com",
    "whatsapp": "5213312345678",
    "coordinacion_id": "0008460b-a730-4f0b-ac1b-5aaa5c40f5b0",
    "ejecutivo_id": "uuid-ejecutivo"  // Opcional
  },
  "p_assignment_reason": "Asignación desde N8N backend"
}
```

### **Función RPC recomendada (crear en Supabase):**

```sql
CREATE OR REPLACE FUNCTION insert_prospect_with_assignment(
  p_prospecto_data JSONB,
  p_assignment_reason TEXT DEFAULT 'Asignación desde backend'
)
RETURNS UUID AS $$
DECLARE
  v_prospect_id UUID;
  v_coordinacion_id UUID;
  v_ejecutivo_id UUID;
BEGIN
  -- 1. Insertar prospecto en base de análisis
  -- (Requiere Foreign Data Wrapper o llamada HTTP)
  -- Por ahora, asumimos que el prospecto ya fue insertado
  -- y recibimos el ID
  
  v_prospect_id := p_prospecto_data->>'id';
  v_coordinacion_id := (p_prospecto_data->>'coordinacion_id')::UUID;
  v_ejecutivo_id := NULLIF(p_prospecto_data->>'ejecutivo_id', '')::UUID;
  
  -- 2. Verificar si ya tiene asignación
  IF EXISTS (
    SELECT 1 FROM prospect_assignments
    WHERE prospect_id = v_prospect_id AND is_active = true
  ) THEN
    RAISE NOTICE 'Prospecto ya tiene asignación activa';
    RETURN v_prospect_id;
  END IF;
  
  -- 3. Crear asignación
  INSERT INTO prospect_assignments (
    prospect_id,
    coordinacion_id,
    ejecutivo_id,
    assigned_by,
    assignment_type,
    assignment_reason,
    is_active
  ) VALUES (
    v_prospect_id,
    v_coordinacion_id,
    v_ejecutivo_id,
    NULL,
    'backend',
    p_assignment_reason,
    true
  );
  
  -- 4. Registrar en logs
  INSERT INTO assignment_logs (
    prospect_id,
    coordinacion_id,
    ejecutivo_id,
    action,
    reason
  ) VALUES (
    v_prospect_id,
    v_coordinacion_id,
    v_ejecutivo_id,
    'assigned',
    p_assignment_reason
  );
  
  RETURN v_prospect_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🎯 RESUMEN: CAMPOS CRÍTICOS

### **Al insertar prospecto:**

| Campo | Base de Datos | Obligatorio | Descripción |
|-------|---------------|-------------|-------------|
| `coordinacion_id` | `prospectos` | ✅ Sí (si ya asignado) | UUID de coordinación |
| `ejecutivo_id` | `prospectos` | ❌ No | UUID de ejecutivo (opcional) |
| `assignment_date` | `prospectos` | ✅ Sí | Fecha de asignación |

### **Al crear asignación:**

| Campo | Base de Datos | Obligatorio | Valor |
|-------|---------------|-------------|-------|
| `prospect_id` | `prospect_assignments` | ✅ Sí | ID del prospecto |
| `coordinacion_id` | `prospect_assignments` | ✅ Sí | UUID de coordinación |
| `ejecutivo_id` | `prospect_assignments` | ❌ No | UUID de ejecutivo |
| `assignment_type` | `prospect_assignments` | ✅ Sí | `'backend'` |
| `assigned_by` | `prospect_assignments` | ✅ Sí | `NULL` (desde backend) |
| `is_active` | `prospect_assignments` | ✅ Sí | `true` |

---

## ⚠️ IMPORTANTE

1. **Orden de inserción:**
   - ✅ Primero insertar prospecto en `prospectos`
   - ✅ Luego crear asignación en `prospect_assignments`
   - ✅ El sistema de fallback verificará la asignación antes de asignar automáticamente

2. **Tipo de asignación:**
   - Usa `assignment_type = 'backend'` para distinguir de `'automatic'` y `'manual'`

3. **Sincronización:**
   - Los campos `coordinacion_id` y `ejecutivo_id` en `prospectos` se sincronizan automáticamente
   - Las llamadas y conversaciones se actualizan automáticamente cuando se crean

4. **Fallback:**
   - Si `coordinacion_id = NULL` en `prospectos` Y no hay asignación en `prospect_assignments`
   - El sistema asignará automáticamente usando balanceo

---

**Última actualización:** Enero 2025  
**Versión:** 1.0.0

