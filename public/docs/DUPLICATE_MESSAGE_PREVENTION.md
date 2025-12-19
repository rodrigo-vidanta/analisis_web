# 🛡️ Sistema de Prevención de Mensajes Duplicados

## 📋 Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Problema Identificado](#problema-identificado)
3. [Análisis de Causa Raíz](#análisis-de-causa-raíz)
4. [Solución Implementada](#solución-implementada)
5. [Componentes Modificados](#componentes-modificados)
6. [Flujo de Protección](#flujo-de-protección)
7. [Detalles Técnicos](#detalles-técnicos)
8. [Pruebas y Validación](#pruebas-y-validación)

---

## 📊 Resumen Ejecutivo

**Fecha de Implementación:** 19 de Diciembre 2025  
**Versión:** v2.1.35 (B6.1.2N6.0.0)  
**Módulos Afectados:** Live Chat, Plantillas WhatsApp, Catálogo de Imágenes

### Problema
Se detectaron mensajes duplicados enviados a prospectos, con diferencias de tiempo de ~0.2-0.4 segundos entre ellos.

### Causa
- Doble clic en botones de quick reply (sin protección `disabled`)
- Race conditions en funciones de envío asíncronas
- Falta de debounce para prevenir múltiples llamadas simultáneas

### Solución
Sistema multi-capa de prevención:
1. Refs de bloqueo (`useRef`) para funciones asíncronas
2. Mapa de mensajes recientes con ventana de 5 segundos
3. Botones deshabilitados durante envío
4. Limpieza automática de entradas expiradas

---

## 🔍 Problema Identificado

### Evidencia en Base de Datos

Se identificaron mensajes duplicados del usuario `raya salas roberto alejandro` al prospecto `e15641da-e370-47ad-9ad0-743df44b6dff`:

| Mensaje | Timestamp 1 | Timestamp 2 | Δ Tiempo |
|---------|-------------|-------------|----------|
| "Buenos días Sr. Emmanuel..." | 15:08:53.105 | 15:08:53.303 | 0.198s |
| "¿Prefiere entrar el 16 de julio...?" | 16:11:11.393 | 16:11:11.804 | 0.411s |
| "Verificando disponibilidad..." | 17:56:59.757 | 17:57:00.118 | 0.361s |

### Patrón Detectado
- Todos los duplicados tienen el mismo contenido exacto
- Diferencia temporal menor a 0.5 segundos
- `direction: 'outgoing'` y `is_bot: false` (enviados por humano)
- Webhook ejecutado dos veces consecutivas

---

## 🧪 Análisis de Causa Raíz

### 1. Vulnerabilidad en Quick Replies
```typescript
// ANTES (vulnerable)
<button onClick={() => handleQuickReply(reply)}>
  {reply.text}
</button>

// Problema: Sin protección disabled, permite múltiples clics
```

### 2. Race Condition en Función Asíncrona
```typescript
// ANTES (vulnerable)
const sendMessageWithText = async (text: string) => {
  setSending(true); // ← No bloquea llamadas simultáneas
  // ... envío
  setSending(false);
};

// Problema: Entre setSending(true) y la lectura del state,
// otra llamada puede pasar la verificación
```

### 3. Sin Historial de Envíos Recientes
```typescript
// ANTES: No existía verificación de mensajes recientes
// Cada clic intentaba enviar sin verificar duplicados
```

---

## ✅ Solución Implementada

### Arquitectura Multi-Capa

```
┌────────────────────────────────────────────────────────────────┐
│                     CAPA 1: UI BLOCKING                        │
│  Botones disabled={sending || isSendingRef.current}            │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│                   CAPA 2: REF GUARD                            │
│  if (isSendingRef.current) return; // Bloqueo inmediato        │
│  isSendingRef.current = true;                                  │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│                CAPA 3: DUPLICATE CHECK                         │
│  if (lastSentMessagesRef.has(hash) &&                         │
│      Date.now() - lastSent < 5000) return;                    │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│                CAPA 4: REGISTER & SEND                         │
│  lastSentMessagesRef.set(hash, Date.now());                   │
│  await sendToWebhook(message);                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 📁 Componentes Modificados

### 1. LiveChatCanvas.tsx (Mensajes de Texto y Quick Replies)

#### Nuevas Referencias
```typescript
// Ref para prevenir doble envío
const isSendingRef = useRef(false);

// Mapa de mensajes enviados recientemente (hash -> timestamp)
const lastSentMessagesRef = useRef<Map<string, number>>(new Map());
```

#### Función de Generación de Hash
```typescript
const generateMessageHash = (text: string, prospectId: string): string => {
  const normalized = text.trim().toLowerCase();
  return `${prospectId}::${normalized}`;
};
```

#### Limpieza Automática
```typescript
const cleanupOldMessages = () => {
  const now = Date.now();
  const expirationTime = 30000; // 30 segundos
  lastSentMessagesRef.current.forEach((timestamp, hash) => {
    if (now - timestamp > expirationTime) {
      lastSentMessagesRef.current.delete(hash);
    }
  });
};
```

#### Verificación en sendMessageWithText
```typescript
const sendMessageWithText = async (text: string) => {
  // CAPA 2: Verificar ref de bloqueo
  if (isSendingRef.current || sending) {
    console.warn('⚠️ Mensaje bloqueado: ya hay un envío en proceso');
    return;
  }
  
  // CAPA 3: Verificar mensajes recientes
  cleanupOldMessages();
  const messageHash = generateMessageHash(text, selectedConversation.whatsapp);
  const lastSent = lastSentMessagesRef.current.get(messageHash);
  
  if (lastSent && Date.now() - lastSent < 5000) {
    console.warn('⚠️ Mensaje bloqueado: enviado hace menos de 5 segundos');
    return;
  }
  
  // CAPA 4: Registrar y enviar
  isSendingRef.current = true;
  lastSentMessagesRef.current.set(messageHash, Date.now());
  setSending(true);
  
  try {
    // ... lógica de envío
  } finally {
    isSendingRef.current = false;
    setSending(false);
  }
};
```

#### Botones Quick Reply Protegidos
```typescript
<button
  onClick={() => !sending && !isSendingRef.current && handleQuickReply(reply)}
  disabled={sending}
  className={`${sending ? 'opacity-50 cursor-not-allowed' : ''}`}
>
  {reply.text}
</button>
```

---

### 2. ReactivateConversationModal.tsx (Plantillas WhatsApp)

#### Nueva Referencia
```typescript
const isSendingRef = useRef(false);
```

#### Protección en handleSend
```typescript
const handleSend = async () => {
  // Verificación doble: state + ref
  if (isSendingRef.current || isSending) {
    console.warn('⚠️ Plantilla bloqueada: ya hay un envío en proceso');
    return;
  }
  
  isSendingRef.current = true;
  setIsSending(true);
  
  try {
    // ... lógica de envío
  } finally {
    isSendingRef.current = false;
    setIsSending(false);
  }
};
```

---

### 3. ImageCatalogModal.tsx (Imágenes de Catálogo)

#### Nueva Referencia
```typescript
const isSendingRef = useRef(false);
```

#### Protección en sendImageWithCaption
```typescript
const sendImageWithCaption = async (imageItem: ContentItem, finalCaption: string) => {
  // Verificación doble: state + ref
  if (isSendingRef.current || sending) {
    console.warn('⚠️ Imagen bloqueada: ya hay un envío en proceso');
    return;
  }
  
  isSendingRef.current = true;
  setSending(true);
  
  try {
    // ... lógica de envío
  } finally {
    isSendingRef.current = false;
    setSending(false);
  }
};
```

---

## 🔄 Flujo de Protección

### Diagrama de Decisión

```
Usuario hace clic en "Enviar"
            │
            ▼
    ┌───────────────────┐
    │ ¿sending === true?│
    └─────────┬─────────┘
              │
        ┌─────┴─────┐
        ▼           ▼
       SÍ          NO
        │           │
        ▼           ▼
    BLOQUEAR   ┌───────────────────┐
    + Warning  │isSendingRef.current?│
               └─────────┬─────────┘
                         │
                   ┌─────┴─────┐
                   ▼           ▼
                  SÍ          NO
                   │           │
                   ▼           ▼
               BLOQUEAR   ┌─────────────────────┐
               + Warning  │ ¿Mensaje en últimos │
                         │     5 segundos?      │
                         └─────────┬────────────┘
                                   │
                             ┌─────┴─────┐
                             ▼           ▼
                            SÍ          NO
                             │           │
                             ▼           ▼
                         BLOQUEAR    REGISTRAR
                         + Warning   + ENVIAR
```

---

## 🔧 Detalles Técnicos

### ¿Por qué useRef en lugar de useState?

| Característica | useState | useRef |
|---------------|----------|--------|
| Trigger re-render | ✅ Sí | ❌ No |
| Actualización síncrona | ❌ No (batched) | ✅ Sí |
| Disponible inmediatamente | ❌ No | ✅ Sí |
| Ideal para flags de bloqueo | ❌ | ✅ |

**Razón:** Los refs se actualizan **sincrónicamente**, lo que evita que una segunda llamada pase la verificación antes de que el estado se actualice.

### Ventana de Tiempo de 5 Segundos

```typescript
const DUPLICATE_WINDOW_MS = 5000; // 5 segundos
```

**Justificación:**
- Tiempo suficiente para que el usuario vea el mensaje enviado
- Tiempo corto para no bloquear reenvíos intencionales
- Basado en el análisis de duplicados (~0.2-0.4s entre duplicados)

### Hash de Mensaje

```typescript
const generateMessageHash = (text: string, prospectId: string): string => {
  // Normalización: lowercase + trim
  const normalized = text.trim().toLowerCase();
  // Formato: prospectId::mensaje_normalizado
  return `${prospectId}::${normalized}`;
};
```

**Propósito:** Identificar mensajes únicos por contenido Y prospecto, permitiendo enviar el mismo mensaje a diferentes prospectos.

---

## 🧪 Pruebas y Validación

### Casos de Prueba

| # | Escenario | Resultado Esperado | Validado |
|---|-----------|-------------------|----------|
| 1 | Doble clic rápido en Quick Reply | Solo 1 mensaje enviado | ✅ |
| 2 | Clic durante envío en proceso | Bloqueo + warning en consola | ✅ |
| 3 | Mismo mensaje < 5s después | Bloqueo + warning en consola | ✅ |
| 4 | Mismo mensaje > 5s después | Envío normal | ✅ |
| 5 | Diferente mensaje inmediatamente | Envío normal | ✅ |
| 6 | Mismo mensaje a diferente prospecto | Envío normal | ✅ |

### Logs de Depuración

```javascript
// Cuando se bloquea por ref
console.warn('⚠️ Mensaje bloqueado: ya hay un envío en proceso');

// Cuando se bloquea por tiempo
console.warn('⚠️ Mensaje bloqueado: enviado hace menos de 5 segundos');

// Cuando se bloquea imagen
console.warn('⚠️ Imagen bloqueada: ya hay un envío en proceso');

// Cuando se bloquea plantilla
console.warn('⚠️ Plantilla bloqueada: ya hay un envío en proceso');
```

---

## 📝 Notas de Mantenimiento

### Si necesitas modificar los tiempos:

1. **Ventana de duplicados:** Cambiar `5000` en la comparación de tiempo
2. **Limpieza de cache:** Cambiar `30000` en `cleanupOldMessages()`

### Si necesitas agregar logs:

```typescript
// En el punto de bloqueo, agregar:
console.log({
  action: 'message_blocked',
  reason: 'duplicate_prevention',
  messageHash,
  timeSinceLastSend: Date.now() - lastSent,
  prospectId: selectedConversation.whatsapp
});
```

---

## 📚 Referencias

- **Issue Original:** Mensajes duplicados reportados por usuario
- **Commit:** v2.1.35
- **Archivos Modificados:**
  - `src/components/chat/LiveChatCanvas.tsx`
  - `src/components/chat/ReactivateConversationModal.tsx`
  - `src/components/chat/ImageCatalogModal.tsx`
- **Base de Datos Afectada:** `mensajes_whatsapp` (pqnc_ai)

---

## 🔄 Historial de Cambios del Documento

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2025-12-19 | 1.0.0 | Documento inicial |

---

**Documento creado por:** AI Division  
**Última actualización:** 19 de Diciembre 2025

