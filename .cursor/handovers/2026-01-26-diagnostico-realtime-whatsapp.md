# Handover: Actualización - WhatsApp NO Carga Mensajes (Incluso con Refresh)

**Fecha:** 26 de Enero 2026  
**Tipo:** Bug Critical - Update  
**Estado:** 🔴 CRÍTICO

---

## 🚨 CAMBIO EN EL DIAGNÓSTICO

### Nueva Información
El usuario reporta que **incluso haciendo refresh manual**, los mensajes NO aparecen en la plataforma.

**Esto descarta la hipótesis de problema de realtime y apunta a:**
- ❌ NO es problema de WebSocket/Realtime
- ❌ NO es problema de handlers de eventos
- ✅ **ES problema de CARGA INICIAL de datos**

---

## 🔍 Análisis del Problema

### Datos Confirmados en BD

**Conversación:** `114b6e70-e423-4809-8cbf-565d87f041a4`  
**Prospecto:** `b2ddda2e-59f0-4897-9476-559daaa0cc71`

**Mensajes en BD (3 mensajes):**
| ID | Rol | Mensaje | Fecha | Leído |
|---|---|---|---|---|
| 55b7aae4-... | Vendedor | "Bienvenido, ¿en qué puedo ayudarle?" | 2026-01-26 19:22:24 | ❌ No |
| 588fe4d7-... | AI | "¡Hola! Soy Natalia..." | 2026-01-25 19:44:38 | ❌ No |
| a2874842-... | Prospecto | "¡Hola! Me gustaría..." | 2026-01-25 19:43:03 | ✅ Sí |

**✅ Los datos EXISTEN en la BD**  
**❌ Los datos NO aparecen en el frontend**

---

## 🧩 Flujo de Carga de Mensajes

### 1. Usuario Selecciona Conversación

**useEffect (línea 2986-3001):**
```typescript
useEffect(() => {
  if (selectedConversation) {
    selectedConversationRef.current = selectedConversation.prospecto_id;
    
    // ✅ ESTA ES LA LLAMADA CLAVE
    loadMessagesAndBlocks(selectedConversation.id, selectedConversation.prospecto_id);
    
    markConversationAsRead(selectedConversation.prospecto_id);
  }
}, [selectedConversation?.id]);
```

**Parámetros esperados:**
- `conversationId` = `selectedConversation.id` → ¿Qué valor tiene?
- `prospectoId` = `selectedConversation.prospecto_id` → Debe ser `b2ddda2e-59f0-4897-9476-559daaa0cc71`

### 2. Función loadMessagesAndBlocks (línea 4620-4819)

**Query SQL ejecutada:**
```typescript
const messagesPromise = analysisSupabase
  .from('mensajes_whatsapp')
  .select('*')
  .eq('prospecto_id', queryId) // ⚠️ queryId = conversationId
  .order('fecha_hora', { ascending: true });
```

**⚠️ PROBLEMA POTENCIAL:**
```typescript
const queryId = conversationId; // Línea 4623
```

**Si `conversationId` NO es el `prospecto_id`, la query falla.**

**Escenarios posibles:**
1. **Correcto:** `conversationId` = `b2ddda2e-59f0-4897-9476-559daaa0cc71` (prospecto_id) → Query funciona
2. **Incorrecto:** `conversationId` = `114b6e70-e423-4809-8cbf-565d87f041a4` (conversation_id real) → Query falla

---

## 🎯 Hipótesis Principal

### La conversación NO está en la lista `conversations`

**Posibles causas:**

#### A. Filtro de Permisos Bloquea la Conversación

**Datos del prospecto:**
- `ejecutivo_id` = **NULL** (sin asignar)
- `coordinacion_id` = `3f41a10b-60b1-4c2b-b097-a83968353af5`

**Si el usuario logueado es Ejecutivo:**
→ El prospecto NO tiene `ejecutivo_id` asignado
→ La conversación NO se carga en la lista inicial
→ NO se puede seleccionar
→ NO se cargan mensajes

**Verificación necesaria:**
```javascript
// En DevTools Console:
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log('Rol del usuario:', user.rol);
console.log('ID del usuario:', user.id);

// Si es Ejecutivo:
console.log('¿El prospecto b2ddda2e-59f0-4897-9476-559daaa0cc71 tiene ejecutivo_id?');
// Respuesta: NO (es NULL)
```

#### B. Vista Materializada No Incluye la Conversación

**Verificar en BD:**
```sql
-- Verificar si la conversación está en la vista optimizada
SELECT * FROM conversaciones_whatsapp_view 
WHERE prospecto_id = 'b2ddda2e-59f0-4897-9476-559daaa0cc71';

-- O en la tabla directa
SELECT * FROM conversaciones_whatsapp 
WHERE prospecto_id = 'b2ddda2e-59f0-4897-9476-559daaa0cc71';
```

#### C. Query de Conversaciones Filtra la Conversación

**Buscar función `loadConversationsOptimized` o `loadConversationsLegacy`:**

La lógica probablemente incluye filtros como:
```typescript
// Posible filtro que excluye prospectos sin ejecutivo
.not('ejecutivo_id', 'is', null)
```

---

## 🔧 Plan de Acción Inmediato

### Paso 1: Verificar Si la Conversación Está en la Lista (2 minutos)

**En DevTools Console (con Live Chat abierto):**

```javascript
// 1. Ver todas las conversaciones cargadas
const conversations = [...document.querySelectorAll('[data-conversation-id]')]
  .map(el => el.getAttribute('data-conversation-id'));
console.log('Conversaciones en UI:', conversations);

// 2. Buscar la conversación específica
const target = 'b2ddda2e-59f0-4897-9476-559daaa0cc71';
console.log('¿Conversación en lista?', conversations.includes(target));

// 3. Ver estado de React (requiere React DevTools)
// Buscar componente LiveChatCanvas → State → conversations
```

**Resultado esperado:**
- ✅ Si la conversación ESTÁ en la lista → Problema es de rendering
- ❌ Si la conversación NO ESTÁ en la lista → Problema es de carga/filtros

---

### Paso 2: Verificar Permisos del Usuario (3 minutos)

**En DevTools Console:**

```javascript
// 1. Ver datos del usuario
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log('Usuario actual:', {
  id: user.id,
  rol: user.rol,
  coordinaciones: user.coordinaciones
});

// 2. Verificar si puede ver prospectos sin ejecutivo
console.log('¿Es Admin?', user.rol === 'Admin');
console.log('¿Es Coordinador?', user.rol === 'Coordinador');
console.log('¿Es Ejecutivo?', user.rol === 'Ejecutivo');
```

**Si es Ejecutivo:**
→ **Confirmado: NO puede ver prospectos con `ejecutivo_id = NULL`**

**Solución inmediata:**
1. Asignar el prospecto al ejecutivo actual, O
2. Cambiar a un usuario Admin/Coordinador

---

### Paso 3: Asignar el Prospecto a un Ejecutivo (5 minutos)

**Ejecutar en Supabase SQL Editor:**

```sql
-- Opción A: Asignar al usuario actual (si es ejecutivo)
UPDATE prospectos 
SET ejecutivo_id = '8313be22-91b7-4c8b-a5c2-bc81caf1ab06' -- ID del vendedor del último mensaje
WHERE id = 'b2ddda2e-59f0-4897-9476-559daaa0cc71';

-- Opción B: Asignar a un coordinador/admin (para testing)
UPDATE prospectos 
SET ejecutivo_id = NULL, -- Dejarlo sin asignar
    coordinacion_id = '3f41a10b-60b1-4c2b-b097-a83968353af5' -- Ya tiene coordinación
WHERE id = 'b2ddda2e-59f0-4897-9476-559daaa0cc71';
```

**Después de ejecutar:**
1. Hacer logout/login en la plataforma
2. Ir a Live Chat
3. Verificar si ahora aparece la conversación

---

### Paso 4: Verificar Logs de Carga (Si aún no aparece)

**Agregar logs temporales en `loadMessagesAndBlocks` (línea 4620):**

```typescript
const loadMessagesAndBlocks = async (conversationId: string, prospectoId: string | undefined) => {
  console.log('🔍 [DEBUG] loadMessagesAndBlocks LLAMADO');
  console.log('🔍 [DEBUG] conversationId:', conversationId);
  console.log('🔍 [DEBUG] prospectoId:', prospectoId);
  
  try {
    const queryId = conversationId; 
    console.log('🔍 [DEBUG] queryId usado en query:', queryId);

    const messagesPromise = analysisSupabase
      .from('mensajes_whatsapp')
      .select('*')
      .eq('prospecto_id', queryId)
      .order('fecha_hora', { ascending: true });

    const [messagesResult] = await Promise.all([messagesPromise, ...]);
    
    console.log('🔍 [DEBUG] Mensajes encontrados:', messagesResult.data?.length || 0);
    console.log('🔍 [DEBUG] Error:', messagesResult.error);
    console.log('🔍 [DEBUG] Datos:', messagesResult.data);
    
    // ... resto del código
  }
}
```

---

### Paso 5: Test de Query Manual (5 minutos)

**Ejecutar en Supabase SQL Editor:**

```sql
-- 1. Verificar que los mensajes existen
SELECT 
  id, 
  prospecto_id, 
  mensaje, 
  rol, 
  fecha_hora, 
  leido
FROM mensajes_whatsapp
WHERE prospecto_id = 'b2ddda2e-59f0-4897-9476-559daaa0cc71'
ORDER BY fecha_hora ASC;

-- 2. Verificar que la conversación existe
SELECT * FROM conversaciones_whatsapp
WHERE prospecto_id = 'b2ddda2e-59f0-4897-9476-559daaa0cc71';

-- 3. Verificar datos del prospecto
SELECT 
  id, 
  nombre_completo, 
  whatsapp, 
  ejecutivo_id, 
  coordinacion_id,
  etapa
FROM prospectos
WHERE id = 'b2ddda2e-59f0-4897-9476-559daaa0cc71';
```

**Resultados esperados:**
- ✅ 3 mensajes encontrados
- ✅ 1 conversación encontrada
- ✅ Prospecto existe con `ejecutivo_id = NULL`

---

## 🎯 Soluciones Propuestas

### Solución A: Asignar Prospecto a Ejecutivo (INMEDIATA)

```sql
UPDATE prospectos 
SET ejecutivo_id = '8313be22-91b7-4c8b-a5c2-bc81caf1ab06' -- ID del vendedor
WHERE id = 'b2ddda2e-59f0-4897-9476-559daaa0cc71';
```

**Pros:**
- ✅ Solución inmediata
- ✅ Permite que el ejecutivo vea la conversación

**Contras:**
- ⚠️ Solo funciona para este prospecto específico
- ⚠️ No resuelve el problema general de prospectos sin asignar

---

### Solución B: Modificar Filtro de Conversaciones (PERMANENTE)

**Permitir que Coordinadores/Admins vean prospectos sin ejecutivo asignado.**

**Buscar función `loadConversationsOptimized` y modificar el filtro:**

```typescript
// ANTES (muy restrictivo)
if (user.rol === 'Ejecutivo') {
  query = query.eq('ejecutivo_id', user.id);
}

// DESPUÉS (más permisivo)
if (user.rol === 'Ejecutivo') {
  query = query.eq('ejecutivo_id', user.id);
} else if (user.rol === 'Coordinador') {
  // Coordinador puede ver:
  // 1. Prospectos de su coordinación con ejecutivo asignado
  // 2. Prospectos de su coordinación SIN ejecutivo asignado (para asignar)
  query = query.in('coordinacion_id', user.coordinaciones);
  // NO filtrar por ejecutivo_id (permite NULL)
}
```

**Pros:**
- ✅ Solución permanente
- ✅ Permite gestión de prospectos sin asignar

**Contras:**
- ⚠️ Requiere modificación de código
- ⚠️ Requiere testing de permisos

---

### Solución C: Forzar Asignación Automática (RECOMENDADA)

**Cuando llega un mensaje de un prospecto sin ejecutivo, asignarlo automáticamente.**

**Modificar handler de realtime (línea 1934):**

```typescript
if (!isAdminRef.current) {
  const prospectoData = prospectosDataRef.current.get(targetProspectoId);
  
  // Si no tenemos datos del prospecto, intentar cargarlo
  if (!prospectoData) {
    try {
      const { data: prospecto } = await analysisSupabase
        .from('prospectos')
        .select('id, ejecutivo_id, coordinacion_id')
        .eq('id', targetProspectoId)
        .single();
      
      if (prospecto) {
        // ✅ NUEVO: Si no tiene ejecutivo asignado, asignar al primer usuario disponible de la coordinación
        if (!prospecto.ejecutivo_id && prospecto.coordinacion_id) {
          const { data: ejecutivo } = await supabaseSystemUI
            .from('auth_users')
            .select('id')
            .eq('rol', 'Ejecutivo')
            .eq('is_active', true)
            .in('coordinaciones', [prospecto.coordinacion_id])
            .limit(1)
            .single();
          
          if (ejecutivo) {
            // Asignar ejecutivo al prospecto
            await analysisSupabase
              .from('prospectos')
              .update({ ejecutivo_id: ejecutivo.id })
              .eq('id', targetProspectoId);
            
            console.log(`✅ Prospecto ${targetProspectoId} asignado automáticamente a ${ejecutivo.id}`);
          }
        }
      }
    } catch (error) {
      console.error('Error cargando/asignando prospecto:', error);
    }
  }
}
```

**Pros:**
- ✅ Asignación automática sin intervención manual
- ✅ Funciona para todos los prospectos nuevos

**Contras:**
- ⚠️ Puede asignar a ejecutivo no deseado
- ⚠️ Requiere lógica de round-robin para distribución equitativa

---

## 📊 Checklist de Diagnóstico

### Estado de Datos
- [x] Mensajes existen en BD (3 mensajes confirmados)
- [x] Conversación existe en BD (ID: 114b6e70-e423-4809-8cbf-565d87f041a4)
- [x] Prospecto existe (ejecutivo_id = NULL)
- [ ] Conversación aparece en lista del frontend
- [ ] Mensajes se cargan al seleccionar conversación

### Permisos
- [ ] Usuario actual es Admin/Coordinador (puede ver prospectos sin asignar)
- [ ] Usuario actual es Ejecutivo (requiere asignación)
- [ ] Prospecto tiene `ejecutivo_id` asignado
- [ ] Prospecto tiene `coordinacion_id` que corresponde al usuario

### Testing
- [ ] Paso 1 ejecutado (verificar lista de conversaciones)
- [ ] Paso 2 ejecutado (verificar permisos)
- [ ] Paso 3 ejecutado (asignar prospecto si es necesario)
- [ ] Paso 4 ejecutado (logs de carga)
- [ ] Paso 5 ejecutado (test manual de queries)

---

## 🚀 Próximos Pasos

### Inmediato (Hoy)
1. ✅ Ejecutar Paso 1: Verificar si conversación está en lista
2. ✅ Ejecutar Paso 2: Verificar permisos del usuario
3. ✅ Ejecutar Paso 3: Asignar prospecto si es necesario
4. ✅ Verificar si los mensajes aparecen después de asignación

### Corto Plazo (Esta Semana)
5. Implementar Solución B o C (modificar filtros o asignación automática)
6. Testing exhaustivo con diferentes roles de usuario
7. Documentar flujo de asignación de prospectos

---

## 📝 Notas Adicionales

### Cambios Recientes

**Según git log:**
- Último cambio: v2.5.48 - Optimización módulo Logs
- **NO hubo cambios en módulo de WhatsApp/Live Chat**

**Conclusión:** El problema NO fue causado por cambios recientes en el código.

**Posibles causas:**
1. Datos nuevos que no cumplieron con los filtros existentes
2. Usuario cambió de rol/permisos
3. Prospecto quedó sin ejecutivo asignado por error

---

**Última actualización:** 26 de Enero 2026  
**Agent responsable:** Cursor AI  
**Prioridad:** 🔴 CRÍTICA
