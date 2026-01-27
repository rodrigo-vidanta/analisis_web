# Testing del Realtime de WhatsApp - Logs de Debug

**Fecha:** 26 de Enero 2026  
**Tipo:** Debugging  
**Estado:** 🔍 En Diagnóstico

---

## 🎯 Problema Actual

El realtime del módulo de WhatsApp NO actualiza el orden de las conversaciones cuando llega un mensaje nuevo:

- ❌ La lista de conversaciones NO se reordena
- ❌ La conversación NO sube al principio
- ✅ El Dashboard SÍ se actualiza correctamente
- ✅ El contador de mensajes SÍ se actualiza

---

## 🔧 Logs de Debug Agregados

He agregado logs temporales en `LiveChatCanvas.tsx` para diagnosticar el problema:

### 1. Recepción de Mensaje (línea ~1940)
```
📨 [DEBUG REALTIME] MENSAJE RECIBIDO: { id, prospecto_id, rol, mensaje, timestamp }
```

### 2. Validación Inicial (línea ~1950)
```
⚠️ [DEBUG] Mensaje inválido, ignorando
```

### 3. Verificación de Permisos (línea ~1957-2000)
```
🔐 [DEBUG] Verificando permisos (no es admin)
🔍 [DEBUG] Prospecto en cache: true/false, Conversación existente: true/false
✅ [DEBUG] Permisos verificados - PROCESANDO mensaje
❌ [DEBUG] Prospecto no en cache ni en lista - IGNORANDO
```

### 4. Actualización de Estado (línea ~2020-2080)
```
🔍 [DEBUG REALTIME] Actualizando mensajes y conversaciones para: {prospecto_id}
✅ [DEBUG] Agregando mensaje a conversación
🔍 [DEBUG] Índice de conversación: X, Total conversaciones: Y
✅ [DEBUG] Moviendo conversación al principio. Índice actual: X
🔄 [DEBUG] Actualizando estado de conversations
✅ [DEBUG] Estado actualizado
```

---

## 📝 Instrucciones de Testing

### Paso 1: Abrir DevTools Console

1. Navegar a módulo de Live Chat
2. Abrir DevTools (F12)
3. Ir a tab "Console"
4. Limpiar consola (Clear console)

### Paso 2: Enviar Mensaje de Prueba

Desde otro dispositivo (WhatsApp real):
1. Enviar mensaje a un prospecto que esté en la lista
2. Observar logs en consola

### Paso 3: Analizar Logs

**Escenario A: Mensaje NO llega al handler**
```
(Sin logs en consola)
```
→ **Problema:** Canal realtime NO está suscrito o hay error de conexión

**Escenario B: Mensaje llega pero se ignora**
```
📨 [DEBUG REALTIME] MENSAJE RECIBIDO: {...}
❌ [DEBUG] Prospecto no en cache ni en lista - IGNORANDO
```
→ **Problema:** Filtro de permisos está bloqueando el mensaje

**Escenario C: Mensaje se procesa pero NO actualiza UI**
```
📨 [DEBUG REALTIME] MENSAJE RECIBIDO: {...}
✅ [DEBUG] Permisos verificados - PROCESANDO mensaje
🔍 [DEBUG REALTIME] Actualizando mensajes y conversaciones para: {...}
⚠️ [DEBUG] Conversación NO encontrada, cargando...
```
→ **Problema:** Conversación NO está en el array `conversations`

**Escenario D: Todo se ejecuta pero UI no re-renderiza**
```
📨 [DEBUG REALTIME] MENSAJE RECIBIDO: {...}
✅ [DEBUG] Permisos verificados - PROCESANDO mensaje
🔍 [DEBUG REALTIME] Actualizando mensajes y conversaciones para: {...}
✅ [DEBUG] Agregando mensaje a conversación
🔍 [DEBUG] Índice de conversación: 5, Total conversaciones: 20
✅ [DEBUG] Moviendo conversación al principio. Índice actual: 5
🔄 [DEBUG] Actualizando estado de conversations
✅ [DEBUG] Estado actualizado
```
→ **Problema:** Estado se actualiza pero React NO re-renderiza (posible problema de refs)

---

## 🎯 Próximos Pasos Según Resultado

### Si Escenario A (Mensaje NO llega)
1. Verificar que canal esté suscrito:
   ```javascript
   // En consola, buscar log:
   ✅ [REALTIME V4] Suscripción activa: mensajes y prospectos
   ```
2. Verificar WebSocket en tab "Network → WS"
3. Verificar que RLS permita eventos de realtime

### Si Escenario B (Mensaje bloqueado por permisos)
1. Verificar rol del usuario:
   ```javascript
   const user = JSON.parse(localStorage.getItem('user') || '{}');
   console.log('Rol:', user.rol);
   ```
2. Si es Ejecutivo, verificar que prospecto tenga `ejecutivo_id` asignado
3. Si es Coordinador, verificar que prospecto esté en su coordinación

### Si Escenario C (Conversación NO en lista)
1. Verificar que conversación esté cargada:
   ```javascript
   // En DevTools React Components:
   // LiveChatCanvas → State → conversations
   // Buscar prospecto_id en el array
   ```
2. Si NO está, verificar filtros de carga inicial
3. Puede ser prospecto nuevo que requiere asignación

### Si Escenario D (Estado actualiza pero UI no)
1. Verificar que `setConversations` esté retornando array nuevo (no mutado)
2. Verificar que componente `ConversationItem` tenga `React.memo` correcto
3. Posible problema: `conversations` usándose desde closure stale

---

## 🔧 Soluciones Potenciales

### Solución 1: Forzar Re-render con Timestamp
```typescript
// En lugar de solo reordenar, agregar un campo que cambie:
const updatedConv: Conversation = { 
  ...currentConv, 
  last_message_at: messageTimestamp, 
  updated_at: messageTimestamp,
  _forceUpdate: Date.now(), // ✅ Forzar detección de cambio
  // ... resto de campos
};
```

### Solución 2: Usar Callback en setConversations
```typescript
// Asegurar que usamos el estado más reciente:
setConversations(prevConversations => {
  console.log('📊 [DEBUG] Estado previo:', prevConversations.length, 'conversaciones');
  const updated = updateConversationsList(prevConversations);
  console.log('📊 [DEBUG] Estado nuevo:', updated.length, 'conversaciones');
  return updated;
});
```

### Solución 3: Verificar Identidad de Objetos
```typescript
// React puede no detectar cambios si usamos el mismo objeto
// Asegurar que SIEMPRE creamos nuevo array:
return [updatedConv, ...prev.slice(0, existingIndex), ...prev.slice(existingIndex + 1)];
// NO usar:
// prev[existingIndex] = updatedConv; // ❌ Mutación
// return prev; // ❌ Mismo array
```

---

## 📋 Checklist de Validación

- [ ] Logs de "MENSAJE RECIBIDO" aparecen en consola
- [ ] Permisos se verifican correctamente
- [ ] Conversación se encuentra en la lista (índice >= 0)
- [ ] Logs de "Moviendo conversación al principio" aparecen
- [ ] Logs de "Estado actualizado" aparecen
- [ ] UI se actualiza visualmente (conversación sube al tope)

---

**Nota:** Estos logs son TEMPORALES para debugging. Deben eliminarse después de identificar y resolver el problema.

**Última actualización:** 26 de Enero 2026  
**Agent responsable:** Cursor AI
