# 🚀 ROADMAP DE ESCALABILIDAD - MÓDULO LIVE CHAT

## 📋 INFORMACIÓN GENERAL

**Módulo:** Live Chat Canvas (WhatsApp)  
**Versión Actual:** v6.1.0 (Infinite Scroll Básico)  
**Versión Objetivo:** v7.0.0 (Virtualización Profesional)  
**Estado:** 📝 Planificación  
**Prioridad:** 🟡 Media (implementar cuando >5000 conversaciones simultáneas)

---

## 🎯 OBJETIVO

Optimizar el módulo Live Chat para manejar **10,000+ conversaciones simultáneas** con:
- ✅ Performance óptima (< 100ms render time)
- ✅ Memoria eficiente (< 200MB con 10k conversaciones)
- ✅ Realtime sin latencia
- ✅ Búsqueda instantánea
- ✅ UX fluida sin parpadeos

---

## 📊 ESTADO ACTUAL (v6.1.0)

### **Arquitectura de Carga**
```
┌─────────────────────────────────────┐
│  loadConversations()                │
├─────────────────────────────────────┤
│  1. UChat API (100 convs)           │
│  2. RPC get_conversations_ordered   │
│     → Batch 1: 200 convs            │
│     → Scroll 75%: Batch 2 (+200)    │
│     → Scroll 75%: Batch 3 (+200)    │
│     → ... hasta cargar todas        │
├─────────────────────────────────────┤
│  Total: Todas las conversaciones    │
│  Render: Todas (sin virtualización) │
└─────────────────────────────────────┘
```

### **Límites Actuales**
- **Carga inicial:** 200 conversaciones (rápido ✅)
- **Infinite scroll:** Carga en batches de 200 (funcional ✅)
- **Render:** Todos los cards (puede ser lento con >2000 ⚠️)
- **Memoria:** ~50MB con 1000 conversaciones, ~500MB con 10k (alto ⚠️)

### **Funcionalidades Críticas que NO se pueden romper**
1. **Realtime de mensajes** → Nuevos mensajes insertan conversación al tope
2. **Sistema de etiquetas** → Badges con shadow_cell
3. **Filtros por etapa** → Filtrado en cliente
4. **Asignaciones ejecutivo/coordinación** → Permisos en tiempo real
5. **Contador de no leídos** → Sincronización con BD
6. **Bot pause status** → Indicador visual en avatar
7. **Llamadas activas** → Badge de heartbeat en avatar

---

## 🏗️ PLAN DE MIGRACIÓN A v7.0.0 (VIRTUALIZACIÓN PROFESIONAL)

### **FASE 1: Preparación (1-2 días)**

#### **1.1 Análisis de Performance**
- [ ] Medir tiempo de render con 1000, 2000, 5000 conversaciones
- [ ] Identificar cuellos de botella con React DevTools Profiler
- [ ] Analizar uso de memoria con Chrome DevTools
- [ ] Documentar métricas baseline

#### **1.2 Selección de Librería**
**Opciones a evaluar:**

| Librería | Pros | Contras | Recomendación |
|----------|------|---------|---------------|
| `react-window` | Ligera (5KB), simple | Limitada flexibilidad | ⭐⭐⭐⭐ |
| `react-virtualized` | Muy completa, flexible | Pesada (200KB), legacy | ⭐⭐⭐ |
| `@tanstack/react-virtual` | Moderna, hooks, headless | Requiere más setup | ⭐⭐⭐⭐⭐ |

**Decisión sugerida:** `@tanstack/react-virtual`  
**Por qué:** Moderna, headless (total control del render), excelente con realtime.

#### **1.3 Crear Branch de Desarrollo**
```bash
git checkout -b feature/livechat-virtualization
```

---

### **FASE 2: Implementación Core (3-4 días)**

#### **2.1 Instalar Dependencias**
```bash
npm install @tanstack/react-virtual
```

#### **2.2 Crear Hook de Virtualización**
```typescript
// src/hooks/useVirtualizedConversations.ts
import { useVirtualizer } from '@tanstack/react-virtual';

export const useVirtualizedConversations = (
  conversations: Conversation[],
  containerRef: RefObject<HTMLDivElement>
) => {
  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 80, // Altura estimada de cada card
    overscan: 5, // Renderizar 5 items extra arriba/abajo
  });
  
  return virtualizer;
};
```

#### **2.3 Adaptar ConversationItem para Virtualización**
```typescript
// Cambiar de:
<div className="p-4 border-b ...">
  <ConversationItem />
</div>

// A:
<div
  key={virtualRow.key}
  data-index={virtualRow.index}
  ref={virtualizer.measureElement}
  style={{
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    transform: `translateY(${virtualRow.start}px)`,
  }}
>
  <ConversationItem conversation={conversations[virtualRow.index]} />
</div>
```

#### **2.4 Integrar Infinite Scroll con Virtualización**
```typescript
// Detectar cuando llega al 75% del total virtual
useEffect(() => {
  const [lastItem] = virtualizer.getVirtualItems().slice(-1);
  
  if (!lastItem) return;
  
  const percentageScrolled = (lastItem.index / conversations.length) * 100;
  
  if (percentageScrolled >= 75 && hasMore && !loading) {
    loadMoreConversations();
  }
}, [virtualizer.getVirtualItems()]);
```

---

### **FASE 3: Optimización de Realtime (2 días)**

#### **3.1 Realtime con Virtualización**
```typescript
// Problema: Nuevos mensajes al tope pueden causar "jump" visual
// Solución: Detectar si usuario está scrolleado y preservar posición

const handleNewMessage = (newMessage) => {
  const isAtTop = scrollTop < 100;
  
  setConversations(prev => {
    const updated = [movedConv, ...rest];
    
    // Si usuario NO está al tope, preservar scroll
    if (!isAtTop) {
      requestAnimationFrame(() => {
        // Ajustar scroll para mantener posición visual
        virtualizer.scrollToIndex(currentVisibleIndex);
      });
    }
    
    return updated;
  });
};
```

#### **3.2 Optimizar Filtros**
```typescript
// Los filtros deben aplicarse ANTES de virtualizar
const filteredConversations = useMemo(() => {
  return conversations.filter(applyAllFilters);
}, [conversations, searchTerm, selectedEtapas, labelFilters]);

// Virtualizar solo las filtradas
const virtualizer = useVirtualizer({
  count: filteredConversations.length, // ← Filtradas
  // ...
});
```

---

### **FASE 4: Testing y Validación (2 días)**

#### **4.1 Tests de Performance**
- [ ] Cargar 1000 conversaciones → Medir render time (objetivo: <50ms)
- [ ] Cargar 5000 conversaciones → Medir render time (objetivo: <100ms)
- [ ] Cargar 10000 conversaciones → Medir render time (objetivo: <150ms)
- [ ] Medir memoria con 10k conversaciones (objetivo: <200MB)

#### **4.2 Tests Funcionales**
- [ ] Realtime de mensajes nuevos funciona correctamente
- [ ] Conversación se mueve al tope cuando recibe mensaje
- [ ] Etiquetas se renderizan correctamente en vista virtual
- [ ] Filtros por etapa funcionan
- [ ] Búsqueda funciona en toda la lista
- [ ] Scroll preserva posición al recibir mensajes
- [ ] Llamadas activas se detectan correctamente

#### **4.3 Tests de Estrés**
- [ ] 100 mensajes nuevos en 1 minuto → No lag
- [ ] Scroll rápido arriba/abajo → Smooth
- [ ] Cambio rápido de filtros → Instantáneo
- [ ] Selección de conversación → No delay

---

### **FASE 5: Optimizaciones Avanzadas (2 días)**

#### **5.1 Memoización Inteligente**
```typescript
// Memoizar cards individuales
const ConversationItem = React.memo(({ conversation }) => {
  // ...
}, (prevProps, nextProps) => {
  // Solo re-renderizar si cambia algo relevante
  return prevProps.conversation.last_message_at === nextProps.conversation.last_message_at
    && prevProps.conversation.unread_count === nextProps.conversation.unread_count
    && prevProps.isSelected === nextProps.isSelected;
});
```

#### **5.2 Web Workers para Filtrado**
```typescript
// Mover filtrado pesado a Web Worker
const filterWorker = new Worker('filterWorker.js');
filterWorker.postMessage({ conversations, filters });
filterWorker.onmessage = (e) => {
  setFilteredConversations(e.data);
};
```

#### **5.3 IndexedDB para Cache Local**
```typescript
// Cachear conversaciones en IndexedDB
const cacheConversations = async (conversations) => {
  const db = await openDB('livechat-cache', 1);
  await db.put('conversations', conversations, 'all');
};

// Cargar desde cache mientras se actualiza desde servidor
const cachedConversations = await db.get('conversations', 'all');
setConversations(cachedConversations); // Render inmediato
loadConversations(); // Actualizar en background
```

---

## 📈 MÉTRICAS DE ÉXITO

### **Performance**
| Métrica | Actual | Objetivo v7.0 |
|---------|--------|---------------|
| Tiempo carga inicial | 3-5s | <1s |
| Render 1000 convs | 200-300ms | <50ms |
| Render 10k convs | N/A | <150ms |
| Memoria 1000 convs | 50MB | 30MB |
| Memoria 10k convs | N/A | 150MB |
| FPS durante scroll | 30-40 | 60 |

### **Funcionalidad**
- ✅ 100% de features actuales funcionando
- ✅ Realtime <200ms latency
- ✅ Búsqueda <100ms
- ✅ Filtros <50ms

---

## 🔧 CONSIDERACIONES TÉCNICAS

### **Riesgos Identificados**
1. **Scroll jump** - Al insertar conversación al tope mientras scrolleado
2. **Memory leaks** - Con 10k conversaciones y realtime
3. **Render thrashing** - Durante updates masivos de realtime
4. **Lost focus** - Al virtualizar, la conversación seleccionada puede salirse del viewport

### **Mitigaciones**
1. **Scroll preservation** - Detectar posición y ajustar después de inserción
2. **Cleanup agresivo** - Desuscribir channels al desmontar
3. **Batching** - Usar `startTransition` para updates no urgentes
4. **scrollToIndex** - Mantener conversación seleccionada visible

---

## 📁 ARCHIVOS A MODIFICAR (v7.0.0)

### **Core**
- `src/components/chat/LiveChatCanvas.tsx` - Implementación principal
- `src/hooks/useVirtualizedConversations.ts` - Hook de virtualización (NUEVO)
- `src/components/chat/VirtualConversationList.tsx` - Componente virtual (NUEVO)

### **SQL**
- `scripts/sql/update_get_conversations_ordered_v3_pagination.sql` - RPC con paginación (NUEVO)

### **Servicios**
- `src/services/uchatService.ts` - Agregar método paginado

### **Documentación**
- `src/components/chat/README.md` - Actualizar arquitectura
- `src/components/chat/CHANGELOG_LIVECHAT.md` - v7.0.0 entry
- `docs/LIVECHAT_VIRTUALIZATION_GUIDE.md` - Guía técnica (NUEVO)

---

## 🧪 PLAN DE TESTING

### **Casos de Prueba Críticos**
```typescript
describe('LiveChat Virtualizado', () => {
  test('Carga inicial muestra 200 conversaciones', async () => {
    // ...
  });
  
  test('Infinite scroll carga más conversaciones', async () => {
    // ...
  });
  
  test('Nuevo mensaje mueve conversación al tope', async () => {
    // ...
  });
  
  test('Filtros funcionan con 10k conversaciones', async () => {
    // ...
  });
  
  test('Búsqueda encuentra en toda la lista', async () => {
    // ...
  });
  
  test('Etiquetas se renderizan correctamente', async () => {
    // ...
  });
  
  test('No hay memory leaks después de 1 hora', async () => {
    // ...
  });
});
```

---

## 📅 TIMELINE ESTIMADO

### **v6.1.0 → v6.2.0 (Infinite Scroll Básico)** ✅ IMPLEMENTANDO AHORA
- Duración: 3-4 horas
- Cambios: RPC con paginación, estados de scroll, carga incremental
- Riesgo: Bajo
- Deploy: Inmediato

### **v6.2.0 → v7.0.0 (Virtualización Profesional)** 📝 FUTURO
- Duración: 1-2 semanas
- Cambios: React Virtual, Web Workers, IndexedDB, optimizaciones avanzadas
- Riesgo: Medio-Alto
- Deploy: Staging → QA → Producción

---

## 🔗 REFERENCIAS

### **Librerías Recomendadas**
- [@tanstack/react-virtual](https://tanstack.com/virtual/latest) - Virtualización
- [idb](https://github.com/jakearchibald/idb) - IndexedDB wrapper
- [comlink](https://github.com/GoogleChromeLabs/comlink) - Web Workers simplificados

### **Recursos Técnicos**
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Virtualization Best Practices](https://web.dev/virtualize-long-lists-react-window/)
- [Supabase Realtime Optimization](https://supabase.com/docs/guides/realtime/performance)

---

## 📝 NOTAS DE IMPLEMENTACIÓN

### **Patrón de Estado Recomendado**
```typescript
// Estado en capas para optimización
const [allConversationsRaw, setAllConversationsRaw] = useState([]); // Todas las cargadas
const [visibleConversations, setVisibleConversations] = useState([]); // Las virtualizadas
const [filteredConversations, setFilteredConversations] = useState([]); // Después de filtros

// Pipeline de datos:
allConversationsRaw → filteredConversations → visibleConversations (virtual)
```

### **Optimización de Realtime**
```typescript
// Throttle de updates para evitar render thrashing
const throttledUpdate = useCallback(
  throttle((update) => {
    setConversations(prev => applyUpdate(prev, update));
  }, 100),
  []
);
```

### **Gestión de Memoria**
```typescript
// Limpiar mensajes de conversaciones no visibles cada 5 min
useEffect(() => {
  const cleanup = setInterval(() => {
    const visibleIds = virtualItems.map(v => conversations[v.index].id);
    setMessagesByConversation(prev => {
      const cleaned = {};
      visibleIds.forEach(id => {
        if (prev[id]) cleaned[id] = prev[id];
      });
      return cleaned;
    });
  }, 300000); // 5 min
  
  return () => clearInterval(cleanup);
}, [virtualItems]);
```

---

## ⚠️ WARNINGS Y PRECAUCIONES

### **NO Hacer**
- ❌ Cambiar estructura de datos de `Conversation`
- ❌ Modificar lógica de permisos
- ❌ Alterar sistema de etiquetas
- ❌ Romper compatibilidad con realtime
- ❌ Deploy directo a producción sin staging

### **SÍ Hacer**
- ✅ Tests exhaustivos en staging
- ✅ Performance profiling antes y después
- ✅ Backup de BD antes de cambios en RPC
- ✅ Feature flags para rollback rápido
- ✅ Monitoreo de errores en producción

---

## 📊 COMPARATIVA DE VERSIONES

| Feature | v6.1.0 (Actual) | v6.2.0 (Infinite Scroll) | v7.0.0 (Virtual) |
|---------|-----------------|--------------------------|------------------|
| Carga inicial | 200 convs | 200 convs | 200 convs |
| Acceso total | ❌ Solo 1000 | ✅ Todas | ✅ Todas |
| Render time (1k) | 200ms | 200ms | 30ms |
| Render time (10k) | N/A | 2000ms | 150ms |
| Memoria (10k) | N/A | 500MB | 150MB |
| Realtime | ✅ | ✅ | ✅ |
| Infinite scroll | ❌ | ✅ | ✅ |
| Virtualización | ❌ | ❌ | ✅ |
| Web Workers | ❌ | ❌ | ✅ |
| IndexedDB cache | ❌ | ❌ | ✅ |

---

## 🎓 LECCIONES APRENDIDAS (Post-Implementación)

_Esta sección se llenará después de implementar v7.0.0_

---

**Última actualización:** Enero 2025  
**Responsable:** Team PQNC  
**Estado:** 📝 Documento de planificación activo

