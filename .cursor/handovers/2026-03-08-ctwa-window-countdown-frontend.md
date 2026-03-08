# Handover: Ventana CTWA 72h + Countdown en Navegación de Fechas

**Fecha:** 2026-03-08
**Módulo:** WhatsApp / LiveChatCanvas
**Archivo principal:** `src/components/chat/LiveChatCanvas.tsx`
**Prioridad:** Completado (frontend), pendiente backend

---

## Resumen

Se implementó soporte completo en el frontend para detectar conversaciones originadas desde anuncios **Click-to-WhatsApp (CTWA)** de Meta y aplicar una ventana de mensajería de **72 horas** (en lugar de las 24h estándar). Se agregó un countdown en tiempo real en la columna de navegación por fechas que muestra el tiempo restante, con semáforo de colores.

---

## Cambios Realizados

### 1. Campo `referral_source` en interface Message (línea ~211)

```typescript
// Campo de origen CTWA (Click-to-WhatsApp ads) - permite detectar ventana de 72h
referral_source?: string | null; // 'ctwa_ad' | 'organic' | null
```

**Valores posibles:**
- `'ctwa_ad'` — Mensaje originado desde anuncio Click-to-WhatsApp
- `'organic'` — Mensaje orgánico
- `null` — No determinado (mensajes históricos)

**Nota:** La columna `referral_source` aún **no existe** en la tabla `mensajes_whatsapp`. Ver handover de backend: `2026-03-08-backend-ctwa-referral-source-capture.md`.

---

### 2. Función `getConversationWindowHours()` (línea ~7460)

Determina si la conversación tiene ventana de 24h o 72h.

```typescript
const getConversationWindowHours = (conversation: Conversation | null): number => {
  if (!conversation) return 24;
  const messages = messagesByConversation[conversation.id] || [];
  const firstUserMessage = messages
    .filter(m => m.sender_type === 'customer')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
  if (firstUserMessage?.referral_source === 'ctwa_ad') return 72;
  return 24;
};
```

**Lógica:** Si el **primer mensaje del cliente** tiene `referral_source = 'ctwa_ad'`, retorna 72. Caso contrario, 24.

---

### 3. `isWithin24HourWindow()` actualizada (línea ~7470)

Usa `getConversationWindowHours()` para determinar dinámicamente la ventana:

```typescript
const windowHours = getConversationWindowHours(conversation);
return hoursSinceLastMessage < windowHours;
```

Esto afecta:
- Si se muestra el input de texto libre o el botón de reactivación con plantilla
- El banner de "ventana cerrada" en la parte inferior del chat

---

### 4. Mini-componente `WindowCountdown` (línea ~1058)

Componente aislado con su propio timer interno. **Solo este `<span>` se re-renderiza cada 60 segundos**, sin provocar re-render del LiveChatCanvas completo.

```typescript
const WindowCountdown: React.FC<{
  lastMessageAt: string;
  windowHours: number;
  isCTWA: boolean;
}> = ({ lastMessageAt, windowHours, isCTWA }) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Calcula tiempo restante basado en new Date()
  // Re-calcula cada 60s gracias al setTick
  const lastMessageDate = new Date(lastMessageAt);
  const now = new Date();
  const elapsedMs = now.getTime() - lastMessageDate.getTime();
  const windowMs = windowHours * 60 * 60 * 1000;
  const remainingMs = Math.max(0, windowMs - elapsedMs);
  const totalMinutes = Math.floor(remainingMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Semáforo de colores
  const colorClass = totalMinutes <= 0 || totalMinutes <= 60
    ? 'text-red-500 dark:text-red-400'       // Rojo: ≤1 hora o expirado
    : totalMinutes <= 300
      ? 'text-amber-500 dark:text-amber-400'  // Naranja: ≤5 horas
      : 'text-emerald-500 dark:text-emerald-400'; // Verde: >5 horas

  return (
    <span className={`text-[11px] font-bold mt-1 leading-none ${colorClass}`}
      title={`Ventana ${isCTWA ? 'CTWA 72h' : '24h'} — ...`}>
      {totalMinutes <= 0 ? '⏱ 0:00' : `⏱ ${hours}:${minutes.toString().padStart(2, '0')}`}
    </span>
  );
};
```

**Decisión de arquitectura:** El timer vivía inicialmente como `useState` en LiveChatCanvas, lo cual provocaba re-render completo del componente (~10,000 líneas) cada 60 segundos con parpadeo visible. Se extrajo a componente aislado para que solo el `<span>` del countdown se actualice.

---

### 5. Integración en navegación de fechas (línea ~8600)

El countdown se muestra en los pills de **HOY** y **AYE** (ayer) de la columna de navegación por fechas:

```typescript
// Solo para HOY y AYE, y solo si hay conversación seleccionada con provider Twilio
let countdownProps = null;
if ((isToday || isYesterday) && selectedConversation) {
  // Verificar que NO sea uchat (uchat no tiene ventana Twilio)
  if (provider !== 'uchat') {
    // Buscar último mensaje del cliente
    const lastCustMsg = msgs.filter(m => m.sender_type === 'customer')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    if (lastCustMsg) {
      const wh = getConversationWindowHours(selectedConversation);
      countdownProps = { lastMessageAt: lastCustMsg.created_at, windowHours: wh, isCTWA: wh === 72 };
    }
  }
}

// Render
{countdownProps ? (
  <WindowCountdown {...countdownProps} />
) : (
  <span>{block.message_count} msj</span>
)}
```

**AYE (ayer):** Se incluye porque la ventana de 24h/72h puede cruzar la medianoche. Si son las 2am y el último mensaje fue a las 11pm de ayer, quedan ~21h de ventana.

---

### 6. Banner de ventana cerrada actualizado (línea ~9855)

Cuando la ventana expira, el banner muestra texto dinámico:

```
"Han pasado Xh desde el último mensaje. WhatsApp Business API solo permite responder
dentro de las 72 horas siguientes. (Ventana extendida CTWA)"
```

Solo muestra "(Ventana extendida CTWA)" cuando `getConversationWindowHours() === 72`.

---

## Semáforo de Colores

| Color | Condición | Significado |
|-------|-----------|-------------|
| Verde (`emerald-500`) | > 5 horas restantes | Ventana abierta, sin urgencia |
| Naranja (`amber-500`) | ≤ 5 horas restantes | Ventana por cerrar, atender pronto |
| Rojo (`red-500`) | ≤ 1 hora o expirado | Crítico, ventana a punto de cerrar o cerrada |

---

## Flujo Completo

```
1. Cliente envía mensaje desde anuncio CTWA
   ↓
2. Twilio recibe con ReferralCtwaClid → N8N guarda referral_source='ctwa_ad' [PENDIENTE BACKEND]
   ↓
3. Frontend carga mensajes (SELECT * incluye referral_source automáticamente)
   ↓
4. getConversationWindowHours() detecta primer mensaje con referral_source='ctwa_ad' → 72h
   ↓
5. isWithin24HourWindow() usa 72h en vez de 24h → input libre habilitado
   ↓
6. WindowCountdown muestra "⏱ 71:45" con color verde
   ↓
7. A las 67h → naranja | A las 71h → rojo | A las 72h → "⏱ 0:00" rojo
   ↓
8. Ventana cerrada → Banner + botón de reactivación con plantilla
```

---

## Dependencia de Backend

**El frontend está 100% listo.** En cuanto el backend escriba `referral_source = 'ctwa_ad'` en `mensajes_whatsapp`, todo se activa automáticamente:

- `SELECT *` ya incluye la columna nueva sin cambios
- `getConversationWindowHours()` detecta el valor y retorna 72
- El countdown muestra el tiempo correcto
- El banner muestra el texto CTWA

Ver: `.cursor/handovers/2026-03-08-backend-ctwa-referral-source-capture.md`

---

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/components/chat/LiveChatCanvas.tsx` | Interface Message + `getConversationWindowHours()` + `isWithin24HourWindow()` dinámico + componente `WindowCountdown` + integración en date nav + banner CTWA |

---

## Templates WhatsApp Creados (misma sesión)

40 plantillas nuevas subidas via Edge Function/webhook:

| Grupo | Templates | Group ID |
|-------|-----------|----------|
| Gancho de Oportunidad | 10 | `44249a5e-a4e1-4355-9d74-48b3cece8254` |
| Concierto: El Buki | 10 | `d7ddb4ee-9f4a-4a72-8e26-d0e9760e6084` |
| Concierto: Michael Bublé | 10 | `9b406cde-deb8-415e-9178-8561215c2318` |
| Viaje en Familia (nuevo) | 10 | `d3d6ddfa-fcba-484d-86a0-c6d3b68d4827` |

Scripts de creación en `scripts/`:
- `create-gancho-oportunidad-templates.cjs`
- `create-conciertos-templates.cjs`
- `create-familia-templates.cjs`

Todas MARKETING, 0 variables (contactos en frío), aprobadas por Meta.

---

## Notas Técnicas

- **Performance:** `WindowCountdown` es componente aislado para evitar re-render del LiveChatCanvas cada 60s. Solo el `<span>` del countdown se actualiza.
- **uChat:** Conversaciones con `whatsapp_provider = 'uchat'` NO muestran countdown (no tienen ventana Twilio).
- **Tamaño del countdown:** `text-[11px]` (ligeramente más grande que el contador de mensajes `text-[9px]`).
- **Tooltip:** Hover sobre el countdown muestra "Ventana CTWA 72h — Xh Ym restantes" o "Ventana 24h — ...".
