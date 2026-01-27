# Handover: Fix Realtime Reordering + Deduplicación de Mensajes

**Fecha:** 26 de Enero 2026  
**Problema Reportado:** Realtime NO reordenaba conversaciones después de migración de etapas  
**Root Cause Real:** Usuario tenía un filtro de etapa activo que ocultaba el reordenamiento  
**Mejoras Adicionales:** Deduplicación de mensajes y simplificación del handler  
**Estado:** ✅ RESUELTO

---

## 🔍 Diagnóstico

### Problema Inicial Reportado
- Las conversaciones no se reordenaban al recibir mensajes nuevos
- Logs mostraban el mismo mensaje procesándose múltiples veces
- El índice alternaba entre valores diferentes

### Root Cause Real
**El usuario tenía un filtro de etapa activo** que causaba que:
1. La conversación se movía al principio de `conversations` (estado)
2. Pero `filteredConversations` (lo que se renderiza) aplicaba el filtro de etapa
3. La conversación filtrada no aparecía al principio visualmente

---

## ✅ Mejoras Implementadas

Aunque el problema original era el filtro, se implementaron mejoras importantes:

### 1. Deduplicación de Mensajes
**Archivo:** `src/components/chat/LiveChatCanvas.tsx`

```typescript
const processedMessagesRef = useRef<Set<string>>(new Set());

// En el handler de realtime:
if (processedMessagesRef.current.has(newMessage.id)) {
  return; // Mensaje ya procesado, ignorar
}
processedMessagesRef.current.add(newMessage.id);

// Limpieza para evitar memory leak
if (processedMessagesRef.current.size > 100) {
  const arr = Array.from(processedMessagesRef.current);
  processedMessagesRef.current = new Set(arr.slice(-50));
}
```

**Beneficio:** Evita procesar el mismo mensaje múltiples veces si Supabase envía eventos duplicados.

### 2. Simplificación del Handler de Realtime
**Removido:** `requestAnimationFrame` + `startTransition`

```typescript
// ANTES (complejo):
requestAnimationFrame(() => {
  startTransition(() => {
    setConversations(updateFn);
  });
});

// DESPUÉS (simple y directo):
setConversations(updateFn);
```

**Beneficio:** Actualizaciones más predecibles y menos race conditions.

### 3. Ref Global para Canal Activo
**Prevención de canales duplicados en React 18 Strict Mode:**

```typescript
const activeChannelRef = useRef<...>(null);

// En setupRealtimeSubscription:
if (activeChannelRef.current) {
  const state = (activeChannelRef.current as any).state;
  if (state === 'joined' || state === 'joining') {
    return; // No crear duplicado
  }
}
```

### 4. Memoización Mejorada de EtapaBadge
**Archivo:** `src/components/shared/EtapaBadge.tsx`

- Estado local para `isLoaded` en lugar de check global
- Custom comparator en `React.memo` para evitar re-renders innecesarios

### 5. Custom Comparator en ConversationItem
**Evita re-renders innecesarios cuando cambian props no relevantes:**

```typescript
}, (prevProps, nextProps) => {
  return (
    prevProps.conversation.id === nextProps.conversation.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.conversation.last_message_at === nextProps.conversation.last_message_at &&
    // ... otras propiedades importantes
  );
});
```

---

## 📚 Lecciones Aprendidas

1. **Verificar filtros activos** antes de diagnosticar problemas de UI
2. **Deduplicación es importante** para eventos de realtime
3. **`requestAnimationFrame` + `startTransition`** pueden causar comportamiento inesperado con múltiples setState
4. **React 18 Strict Mode** monta componentes 2 veces, requiere protección contra canales duplicados

---

## 📁 Archivos Modificados

1. `src/components/chat/LiveChatCanvas.tsx`
   - Agregado `processedMessagesRef` para deduplicación
   - Agregado `activeChannelRef` para prevenir canales duplicados
   - Simplificado handler de realtime (removido requestAnimationFrame/startTransition)
   - Agregado custom comparator a `ConversationItem`

2. `src/components/shared/EtapaBadge.tsx`
   - Estado local para `isLoaded`
   - Custom comparator en `React.memo`

---

**Última actualización:** 26 de Enero 2026
