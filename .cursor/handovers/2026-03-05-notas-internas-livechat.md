# Handover: Notas Internas en Conversaciones WhatsApp

**Fecha:** 2026-03-05
**Version:** v2.24.0 (pendiente deploy)
**Autor:** Claude Code (Opus 4.6)

---

## Resumen

Se implemento un sistema de notas internas dentro de las conversaciones de WhatsApp del LiveChat. Los roles privilegiados (admin, administrador_operativo, coordinador, supervisor, calidad) pueden dejar notas visibles para todo el equipo pero que NO se envian al prospecto. Los ejecutivos pueden VER las notas pero NO crearlas.

---

## Archivos Modificados/Creados

| Archivo | Accion | Descripcion |
|---------|--------|-------------|
| `src/services/notasInternasService.ts` | **NUEVO** | Servicio CRUD para notas internas via analysisSupabase |
| `src/components/chat/LiveChatCanvas.tsx` | Modificado | 7 zonas: interface, estados, carga, realtime, render, input toggle, handleSend |
| Migracion SQL (MCP) | Aplicada | Tabla `notas_internas` con RLS, indices, Realtime |

---

## Base de Datos

### Tabla: `notas_internas`

```sql
CREATE TABLE public.notas_internas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospecto_id uuid NOT NULL REFERENCES public.prospectos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL,       -- snapshot del nombre al momento
  user_role text NOT NULL,       -- snapshot del rol al momento
  contenido text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Indices:**
- `idx_notas_internas_prospecto` en `prospecto_id`
- `idx_notas_internas_created` en `created_at`

**RLS:**
- SELECT: `authenticated` que puedan ver el prospecto via `user_can_see_prospecto()`
- INSERT: `user_id = auth.uid()` + role IN (`admin`, `administrador_operativo`, `coordinador`, `supervisor`)
- Coordinadores de calidad: la BD almacena `user_role = 'calidad'` (deteccion via `isCoordinadorCalidad` en frontend)
- `REVOKE ALL FROM anon`
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE notas_internas`

---

## Servicio: notasInternasService.ts

```typescript
interface NotaInterna {
  id: string; prospecto_id: string; user_id: string;
  user_name: string; user_role: string; contenido: string; created_at: string;
}

// getByProspecto(prospectoId) → NotaInterna[]
// create({ prospectoId, userId, userName, userRole, contenido }) → NotaInterna | null
```

Usa `analysisSupabase` (anon_key + RLS valida permisos).

---

## LiveChatCanvas.tsx - Zonas Modificadas

### 1. Interface Message (~linea 198)
- `sender_type` union: agregado `'note'`
- Campo opcional `note_data?: { user_name: string; user_role: string }`

### 2. Estados y permisos (~linea 1428)
- `canSendNotes` = isAdmin || isAdminOperativo || isCoordinador || isSupervisor || isCoordinadorCalidad
- `isNoteMode` (boolean) - controla modo nota vs mensaje
- `noteFlipping` (boolean) - animacion flip 3D del textarea/boton
- Web Animations API para cooldown (refs, 0 re-renders):
  - `cooldownOverlayRef` - ref al div overlay
  - `cooldownAnimRef` - ref a la Animation activa
  - `COOLDOWN_DURATION_MS = 17000` (17 segundos)
  - `clipPath: inset(1px 2px 8px 2px round 18px)` animado a `inset(1px 2px 8px 100% round 18px)`

### 3. Carga de notas (~linea 5475)
- `notasInternasService.getByProspecto()` en Promise.all con mensajes y templates
- Notas convertidas a Message con `sender_type: 'note'`, mezcladas por `created_at`

### 4. Realtime (~linea 2870)
- `realtimeHub.subscribe('notas_internas', 'INSERT', callback)`
- Reemplaza notas optimistas (`note_temp_*`) con la nota real del servidor
- Deduplicacion por contenido + timestamp (30s ventana)

### 5. Renderizado centrado (~linea 9050)
- Globo centrado ambar con gradiente `from-amber-500/10 to-yellow-500/10`
- Icono StickyNote + etiqueta de rol mapeado:
  - `admin` → "Administrador"
  - `administrador_operativo` → "Admin Operativo"
  - `calidad` → "Calidad"
  - `supervisor` → "Supervisor"
  - `coordinador` → "Coordinador"
- Nombre del usuario + hora
- Visible para TODOS (ejecutivos ven pero no crean)

### 6. Toggle input (~linea 9596)
**Mecanicas de activacion:**
1. Click en Send con campo vacio (si tiene permiso) → activa modo nota
2. Boton "Nota" en barra de respuestas rapidas (siempre visible para roles con permiso)
3. Textarea: fondo ambar, placeholder "Escribe una nota interna para el ejecutivo..."
4. Boton Send: icono StickyNote ambar
5. Boton X para volver a modo mensaje
6. Focus automatico en textarea al cambiar de modo

**Cooldown (Web Animations API):**
- Overlay con degradado ambar que se consume de derecha a izquierda en 17s
- `clipPath` animado via `element.animate()` (imperativo, 0 re-renders)
- Si el usuario escribe: cooldown se pausa (overlay vuelve a full)
- Si borra todo: cooldown se reinicia desde el principio
- Si expira: flip animation vuelve a modo mensaje
- Si cambia de conversacion: reset automatico

**Flip 3D:**
- Textarea: `rotateX(90deg)` con `perspective: 600px`
- Boton Send: `rotateY(90deg)` con `perspective: 400px`
- Duracion: 300ms, `cubic-bezier(0.4, 0, 0.2, 1)`

### 7. handleSendNote (~linea 6855)
- Update optimista con `note_temp_${Date.now()}`
- Realtime reemplaza temp por nota real
- `combinedMessages` filtra duplicados (temp vs real)
- Toast error si falla el INSERT

---

## Deduplicacion de Notas

Tres capas de proteccion contra duplicados:
1. **Realtime handler**: detecta nota optimista con mismo contenido y reemplaza
2. **combinedMessages useMemo**: `seenNoteContents` Map filtra `note_temp_*` cuando existe la nota real
3. **Realtime subscription**: `if (current.some(m => m.id === adaptedNote.id)) return prev`

---

## Consideraciones de Seguridad

- RLS en BD: solo roles privilegiados pueden INSERT
- Frontend: `canSendNotes` controla visibilidad de UI (defensa en profundidad)
- `user_name` y `user_role` son snapshots al momento de crear la nota (no se actualizan si el rol cambia)
- Coordinadores de calidad detectados via `permissionsService.isCoordinadorCalidad()` → se guarda como `user_role: 'calidad'`

---

## Colores y Estilos

| Elemento | Light | Dark |
|----------|-------|------|
| Globo nota | `from-amber-500/10 to-yellow-500/10` | `from-amber-900/30 to-yellow-900/30` |
| Borde globo | `border-amber-300/40` | `border-amber-700/40` |
| Icono | `bg-amber-100` | `bg-amber-900/50` |
| Textarea modo nota | `bg-amber-50` | `bg-amber-900/20` |
| Borde textarea | `border-amber-400/60` | `border-amber-700/60` |
| Boton Send nota | `from-amber-500 to-amber-600` | mismo |
| Cooldown overlay | `rgba(245,158,11,0.22)` → `rgba(234,179,8,0.10)` | mismo |
| Toggle "Nota" activo | `bg-amber-100 text-amber-700` | `bg-amber-900/40 text-amber-300` |

---

## Lecciones Aprendidas

1. **CSS transitions no funcionan con render condicional en React**: React batea mount + setState en un solo render, el browser nunca ve el estado "antes" para transicionar. Solucion: Web Animations API imperativa.
2. **`setInterval` en componentes grandes = performance killer**: Un interval de 100ms en un componente de 10k lineas causa ~10 re-renders/segundo. Solucion: animacion imperativa con refs.
3. **`clipPath: inset(... round ...)` es mejor que position+overflow para contener overlays**: El recorte esta integrado en el propio elemento, imposible que se desborde.
4. **Focus automatico mejora UX**: Siempre hacer `.focus()` en el textarea despues de cambiar de modo.
