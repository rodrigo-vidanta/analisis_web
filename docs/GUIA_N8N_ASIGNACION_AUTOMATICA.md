# 🚀 GUÍA: Asignación Automática de Prospectos desde N8N

## 🎯 Objetivo

Cuando N8N crea un prospecto desde un mensaje de WhatsApp (UChat), **DEBE** ejecutarse la asignación automática a una coordinación.

---

## ⚠️ PROBLEMA ACTUAL

Si creas el prospecto en la base de datos **SIN** ejecutar la asignación automática, el prospecto quedará con:
- `coordinacion_id = NULL`
- `ejecutivo_id = NULL`
- `assignment_date = NULL`

Esto significa que **NO aparecerá** en Live Monitor ni Live Chat para coordinadores/ejecutivos.

---

## ✅ SOLUCIÓN: Agregar Nodo de Asignación Automática en N8N

### **Flujo Completo en N8N:**

```
1. Webhook UChat → Recibe mensaje WhatsApp
2. Procesar mensaje → Extraer datos del cliente
3. Crear/Actualizar Prospecto → INSERT en tabla prospectos
4. ⚠️ ASIGNACIÓN AUTOMÁTICA → Llamar función RPC (OBLIGATORIO)
5. Actualizar Prospecto → Sincronizar coordinacion_id
```

---

## 📝 IMPLEMENTACIÓN EN N8N

### **Opción 1: Nodo Function (JavaScript)**

Después de crear el prospecto, agrega un nodo **Function** con este código:

```javascript
// Obtener ID del prospecto creado
const prospectId = $input.item.json.id; // O el campo donde guardaste el ID

if (!prospectId) {
  throw new Error('No se encontró ID del prospecto');
}

// Configuración de Supabase
const SYSTEM_UI_URL = 'https://zbylezfyagwrxoecioup.supabase.co';
const SYSTEM_UI_KEY = 'TU_SYSTEM_UI_ANON_KEY'; // Reemplazar con tu key

const ANALYSIS_URL = 'https://glsmifhkoaifvaegsozd.supabase.co';
const ANALYSIS_KEY = 'TU_ANALYSIS_ANON_KEY'; // Reemplazar con tu key

try {
  // 1. Llamar función RPC para asignación automática
  const assignResponse = await fetch(
    `${SYSTEM_UI_URL}/rest/v1/rpc/assign_prospect_to_coordinacion`,
    {
      method: 'POST',
      headers: {
        'apikey': SYSTEM_UI_KEY,
        'Authorization': `Bearer ${SYSTEM_UI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_prospect_id: prospectId,
        p_assigned_by: null
      })
    }
  );

  if (!assignResponse.ok) {
    const errorData = await assignResponse.json();
    throw new Error(`Error asignando prospecto: ${JSON.stringify(errorData)}`);
  }

  const coordinacionId = await assignResponse.json();

  if (!coordinacionId) {
    throw new Error('No se pudo asignar el prospecto a ninguna coordinación');
  }

  // 2. Actualizar prospecto con coordinacion_id
  const updateResponse = await fetch(
    `${ANALYSIS_URL}/rest/v1/prospectos?id=eq.${prospectId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': ANALYSIS_KEY,
        'Authorization': `Bearer ${ANALYSIS_KEY}`,
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
    console.warn('⚠️ Error actualizando coordinacion_id (no crítico, ya está asignado)');
  }

  // 3. Obtener información de la coordinación (opcional)
  const coordinacionResponse = await fetch(
    `${SYSTEM_UI_URL}/rest/v1/coordinaciones?id=eq.${coordinacionId}&select=codigo,nombre`,
    {
      headers: {
        'apikey': SYSTEM_UI_KEY,
        'Authorization': `Bearer ${SYSTEM_UI_KEY}`
      }
    }
  );

  let coordinacionInfo = null;
  if (coordinacionResponse.ok) {
    const coordinacionData = await coordinacionResponse.json();
    coordinacionInfo = coordinacionData[0];
  }

  return {
    json: {
      ...$input.item.json,
      coordinacion_id: coordinacionId,
      coordinacion_codigo: coordinacionInfo?.codigo,
      coordinacion_nombre: coordinacionInfo?.nombre,
      assignment_date: new Date().toISOString(),
      assignment_completed: true
    }
  };

} catch (error) {
  console.error('❌ Error en asignación automática:', error);
  // NO lanzar error para no romper el flujo, pero registrar
  return {
    json: {
      ...$input.item.json,
      assignment_error: error.message,
      assignment_completed: false
    }
  };
}
```

---

### **Opción 2: Nodo HTTP Request (Más Simple)**

Crea un nodo **HTTP Request** con esta configuración:

**Configuración del Nodo:**

- **Method:** `POST`
- **URL:** `https://zbylezfyagwrxoecioup.supabase.co/rest/v1/rpc/assign_prospect_to_coordinacion`
- **Authentication:** `Generic Credential Type`
  - **Name:** `apikey`
  - **Value:** `TU_SYSTEM_UI_ANON_KEY`
- **Send Headers:**
  ```
  Authorization: Bearer TU_SYSTEM_UI_ANON_KEY
  Content-Type: application/json
  ```
- **Body Content:**
  ```json
  {
    "p_prospect_id": "{{ $json.id }}",
    "p_assigned_by": null
  }
  ```

Luego agrega otro nodo **HTTP Request** para actualizar el prospecto:

- **Method:** `PATCH`
- **URL:** `https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/prospectos?id=eq.{{ $json.id }}`
- **Headers:** (mismo formato)
- **Body:**
  ```json
  {
    "coordinacion_id": "{{ $json.body }}",
    "assignment_date": "{{ $now }}"
  }
  ```

---

## 🔄 FLUJO COMPLETO RECOMENDADO EN N8N

```
┌─────────────────┐
│  Webhook UChat  │ → Recibe mensaje WhatsApp
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Procesar       │ → Extraer datos (nombre, teléfono, etc.)
│  Mensaje        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Crear/Actualizar│ → INSERT/UPSERT en prospectos
│  Prospecto      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ⚠️ ASIGNACIÓN   │ → Llamar assign_prospect_to_coordinacion
│  AUTOMÁTICA     │   (OBLIGATORIO)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Actualizar     │ → PATCH coordinacion_id en prospectos
│  Prospecto      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Crear          │ → INSERT en uchat_conversations (opcional)
│  Conversación   │
└─────────────────┘
```

---

## 📋 CHECKLIST PARA N8N

Cuando proceses un mensaje de WhatsApp desde UChat:

- [ ] ✅ Extraer datos del mensaje (nombre, teléfono, etc.)
- [ ] ✅ Crear/Actualizar prospecto en `prospectos` (Base de Análisis)
- [ ] ✅ **OBLIGATORIO:** Llamar a `assign_prospect_to_coordinacion` RPC
- [ ] ✅ Actualizar `coordinacion_id` y `assignment_date` en `prospectos`
- [ ] ✅ (Opcional) Crear conversación en `uchat_conversations`

---

## 🔧 CONFIGURACIÓN DE CREDENCIALES EN N8N

### **Credenciales para System_UI:**

- **Nombre:** `System UI Supabase`
- **Tipo:** `Generic Credential Type`
- **Fields:**
  - `apikey`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (TU_SYSTEM_UI_ANON_KEY)
  - `url`: `https://zbylezfyagwrxoecioup.supabase.co`

### **Credenciales para Analysis:**

- **Nombre:** `Analysis Supabase`
- **Tipo:** `Generic Credential Type`
- **Fields:**
  - `apikey`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (TU_ANALYSIS_ANON_KEY)
  - `url`: `https://glsmifhkoaifvaegsozd.supabase.co`

---

## ⚠️ IMPORTANTE

1. **SIEMPRE ejecuta la asignación automática** después de crear un prospecto
2. **NO confíes** en que el frontend lo hará (el frontend solo detecta conversaciones existentes)
3. **Si falla la asignación**, el prospecto quedará invisible para coordinadores/ejecutivos
4. **Registra errores** pero no rompas el flujo si falla (el prospecto ya fue creado)

---

## 🐛 DEBUGGING

Si la asignación no funciona:

1. **Verificar que el prospecto existe:**
   ```sql
   SELECT id, coordinacion_id FROM prospectos WHERE id = 'uuid-del-prospecto';
   ```

2. **Verificar asignación en System_UI:**
   ```sql
   SELECT * FROM prospect_assignments WHERE prospect_id = 'uuid-del-prospecto';
   ```

3. **Ejecutar script manual:**
   ```bash
   node scripts/assign_prospect_automatically.js uuid-del-prospecto
   ```

4. **Revisar logs de N8N** para ver errores en la llamada RPC

---

## 📝 EJEMPLO COMPLETO: Nodo Function en N8N

```javascript
// ============================================
// ASIGNACIÓN AUTOMÁTICA DE PROSPECTO
// Ejecutar DESPUÉS de crear el prospecto
// ============================================

const prospectId = $input.item.json.id;

if (!prospectId) {
  throw new Error('❌ No se encontró ID del prospecto');
}

const SYSTEM_UI_URL = 'https://zbylezfyagwrxoecioup.supabase.co';
const SYSTEM_UI_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzYyNzEsImV4cCI6MjA3NDkxMjI3MX0.W6Vt5h4r7vNSP_YQtd_fbTWuK7ERrcttwhcpe5Q7KoM';

const ANALYSIS_URL = 'https://glsmifhkoaifvaegsozd.supabase.co';
const ANALYSIS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E';

try {
  // 1. Asignar automáticamente
  const assignResponse = await fetch(
    `${SYSTEM_UI_URL}/rest/v1/rpc/assign_prospect_to_coordinacion`,
    {
      method: 'POST',
      headers: {
        'apikey': SYSTEM_UI_KEY,
        'Authorization': `Bearer ${SYSTEM_UI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_prospect_id: prospectId,
        p_assigned_by: null
      })
    }
  );

  if (!assignResponse.ok) {
    const error = await assignResponse.json();
    throw new Error(`Error asignando: ${JSON.stringify(error)}`);
  }

  const coordinacionId = await assignResponse.json();

  // 2. Actualizar prospecto
  await fetch(
    `${ANALYSIS_URL}/rest/v1/prospectos?id=eq.${prospectId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': ANALYSIS_KEY,
        'Authorization': `Bearer ${ANALYSIS_KEY}`,
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

} catch (error) {
  console.error('❌ Error en asignación:', error);
  return {
    json: {
      ...$input.item.json,
      assignment_error: error.message,
      assignment_completed: false
    }
  };
}
```

---

**Última actualización:** Enero 2025  
**Versión:** 1.0.0

