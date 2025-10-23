# 🔧 HABILITAR REALTIME PARA `mensajes_whatsapp`

## ✅ ESTADO ACTUAL

**Realtime YA está funcionando** (confirmado por los logs):
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 [REALTIME V3] NUEVO MENSAJE RECIBIDO
🎯 Prospecto del mensaje: 06d27f92-2d7e-4093-b103-7b169b9484e8
🔄 [REALTIME] Actualizando lista de conversaciones...
```

## 🚨 PROBLEMA ACTUAL

El componente `LiveChatCanvas` se **desmonta** cuando cambias de módulo (ej: vas a Administración), lo que causa:

1. ❌ La suscripción de Realtime se **cierra**
2. ❌ El estado de `conversations` se **pierde**
3. ❌ Al regresar a Live Chat, se **recarga todo** desde cero

**Resultado:**
- Los mensajes llegan por Realtime SOLO si estás en Live Chat
- Si estás en otro módulo, no se actualiza
- Cuando regresas, ves un "reload" molesto

---

## 🎯 SOLUCIÓN: Context Global + Persistencia

Necesitamos mover el estado de conversaciones y la suscripción de Realtime a un **Context global** que persista durante toda la sesión.

### **Opción 1: Context de React (Recomendado)**

Crear un `LiveChatContext` que:
- Mantiene el estado de `conversations` global
- Mantiene la suscripción de Realtime activa
- Se actualiza independientemente del módulo actual

### **Opción 2: Polling cada 5-10 segundos**

Si el Context es muy complejo, podemos implementar un **polling inteligente**:
- Cada 5 segundos, verificar si hay nuevos mensajes
- Solo si detecta cambios, actualizar la lista
- Más simple pero menos eficiente

---

## 📋 PRÓXIMOS PASOS

### **Paso 1: Verificar que Realtime esté habilitado en Supabase**

1. Ir a: `https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/database/replication`
2. Buscar la tabla `mensajes_whatsapp`
3. Verificar que el checkbox de **"Enable Realtime"** esté activado
4. Si no está, activarlo y guardar

**O ejecutar este SQL:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes_whatsapp;
```

### **Paso 2: Implementar Context Global**

Crear `src/contexts/LiveChatContext.tsx`:
```typescript
export const LiveChatProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [realtimeChannel, setRealtimeChannel] = useState(null);
  
  // Suscripción de Realtime SIEMPRE activa
  useEffect(() => {
    const channel = analysisSupabase
      .channel('live-chat-global')
      .on('postgres_changes', { ... }, (payload) => {
        // Actualizar conversations
      })
      .subscribe();
    
    return () => { channel.unsubscribe(); };
  }, []);
  
  return (
    <LiveChatContext.Provider value={{ conversations, ... }}>
      {children}
    </LiveChatContext.Provider>
  );
};
```

### **Paso 3: Usar el Context en Live Chat**

En `LiveChatCanvas.tsx`:
```typescript
const { conversations, setConversations } = useLiveChat();
```

---

## 🔍 LOGS DE DIAGNÓSTICO

Para verificar que Realtime está funcionando, busca estos logs:

✅ **Cuando llega un mensaje:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 [REALTIME V3] NUEVO MENSAJE RECIBIDO
🎯 Prospecto del mensaje: [UUID]
🔄 [REALTIME] Actualizando lista de conversaciones...
📋 Total conversaciones en lista: 8
🔍 Índice de conversación encontrado: [número]
📝 Conversación encontrada: "[nombre]"
✅ Conversación movida a posición 1/8
```

❌ **Si NO llega nada:**
- Realtime no está habilitado en Supabase
- O el canal se cerró (verifica el estado)

---

## ⚡ SOLUCIÓN TEMPORAL (Polling)

Mientras se implementa el Context, puedes usar polling:

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    if (document.hidden) return; // No hacer nada si la pestaña no está visible
    loadConversations(); // Recargar conversaciones cada 5s
  }, 5000);
  
  return () => clearInterval(interval);
}, []);
```

**Ventajas:**
- ✅ Funciona sin Context
- ✅ Se actualiza incluso si cambias de módulo

**Desventajas:**
- ❌ Menos eficiente que Realtime
- ❌ Puede causar re-renders cada 5s

---

## 🎯 RECOMENDACIÓN FINAL

**Para producción:** Implementar el `LiveChatContext` con Realtime global.
**Para pruebas rápidas:** Usar polling cada 5-10 segundos.

¿Qué opción prefieres implementar? 🚀

