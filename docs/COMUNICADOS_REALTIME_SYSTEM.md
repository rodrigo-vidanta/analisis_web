# Sistema de Comunicados en Tiempo Real

**Fecha:** 2026-02-13 | **Version:** 1.0.0

---

## Resumen

Sistema bidireccional de comunicacion admin-a-usuarios via Supabase Realtime. Permite enviar anuncios, tutoriales y alertas que aparecen como overlay modal fullscreen (z-[60]). Soporta comunicados simples (texto/markdown) e interactivos (componentes React con lazy loading).

---

## Arquitectura

```
Admin (ComunicadosManager)
  |
  v
Supabase BD (comunicados table)
  |
  v  Realtime (INSERT/UPDATE events)
  |
Frontend (comunicadosStore)
  |
  v
ComunicadoOverlay (z-[60])
  |-- Simple: ComunicadoCard
  |-- Interactivo: INTERACTIVE_REGISTRY[component_key]
```

---

## Base de Datos

### Tabla: `comunicados`

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | UUID (PK) | Identificador unico |
| titulo | TEXT | Titulo (requerido) |
| subtitulo | TEXT | Subtitulo opcional |
| contenido | JSONB | `{ body?, bullets?, icon? }` |
| tipo | TEXT | `info`, `feature`, `tutorial`, `mantenimiento`, `urgente` |
| prioridad | INTEGER | 0-10 (default 5, mayor = se muestra primero) |
| is_interactive | BOOLEAN | Si es tutorial interactivo |
| component_key | TEXT | Key del componente en INTERACTIVE_REGISTRY |
| target_type | TEXT | `todos`, `coordinacion`, `usuarios`, `roles` |
| target_ids | TEXT[] | IDs de coordinacion, usuarios o roles |
| estado | TEXT | `borrador`, `activo`, `archivado` |
| published_at | TIMESTAMPTZ | Fecha de publicacion |
| expires_at | TIMESTAMPTZ | Fecha de expiracion (opcional) |
| created_by | UUID | Admin que lo creo |
| read_count | INTEGER | Auto-actualizado por RPC |

### Tabla: `comunicado_reads`

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| comunicado_id | UUID (PK compuesto) | FK a comunicados |
| user_id | UUID (PK compuesto) | FK a auth.users |
| read_at | TIMESTAMPTZ | Cuando se leyo |

### RPC: `mark_comunicado_read`

- **Tipo:** SECURITY DEFINER (necesario para UPDATE read_count sin ser creator)
- **Parametros:** `p_comunicado_id UUID, p_user_id UUID`
- **Logica:** Valida `p_user_id = auth.uid()`, INSERT comunicado_reads (ON CONFLICT DO NOTHING), UPDATE read_count

### RLS

- `comunicados`: SELECT authenticated (activos o propios borradores), INSERT/UPDATE/DELETE solo creator
- `comunicado_reads`: SELECT propias + admin, INSERT solo propias
- REVOKE ALL ON comunicados FROM anon
- Realtime habilitado: `ALTER PUBLICATION supabase_realtime ADD TABLE comunicados`

---

## Componentes Frontend

### ComunicadoOverlay (`src/components/comunicados/ComunicadoOverlay.tsx`, 113 lineas)

Container modal fullscreen z-[60]. Lee del store, renderiza simple o interactivo.

**Registry de componentes interactivos:**
```typescript
const INTERACTIVE_REGISTRY = {
  'utility-template-tutorial': lazy(() => import('./tutorials/UtilityTemplateTutorial')),
};
```

Para agregar un tutorial nuevo:
1. Crear componente en `tutorials/` con prop `{ onComplete: () => void }`
2. Agregar al INTERACTIVE_REGISTRY
3. Agregar a INTERACTIVE_COMUNICADOS en `src/types/comunicados.ts`
4. Deploy (cambio de codigo)
5. INSERT comunicado con `is_interactive=true`, `component_key='...'`

### ComunicadoCard (`src/components/comunicados/ComunicadoCard.tsx`, 183 lineas)

Card presentacional para comunicados simples. Soporta:
- 19 iconos de lucide-react
- Badge de tipo con colores semanticos
- Body con `**bold**` y `[links](url)`
- Lista de bullets
- Animaciones Framer Motion (stagger)

### UtilityTemplateTutorial (`src/components/comunicados/tutorials/UtilityTemplateTutorial.tsx`, 578 lineas)

Tutorial interactivo de 4 pasos sobre plantilla utility `seguimiento_contacto_utilidad`:
- Step 0: Introduccion (mockup WhatsApp con typewriter)
- Step 1: Reglas (max 2/semestre, min 48h, bloqueo miembros)
- Step 2: Como usar (selector de plantillas animado)
- Step 3: Advertencia (no reenviar, no masivo)
- Auto-advance cada 6s (se detiene con interaccion manual)

### ComunicadosManager (`src/components/admin/ComunicadosManager.tsx`, 967 lineas)

Panel admin completo (tab "Comunicados" en AdminDashboardTabs):
- CRUD comunicados con editor 2 columnas (form + live preview)
- Filtros por estado (borrador/activo/archivado)
- Targeting: todos, coordinacion (checkboxes), roles (5 roles), usuarios
- Icon picker (19 iconos, grid 5 columnas)
- Bullets dinamicos (agregar/eliminar)
- Prioridad slider (0-10)
- Fecha expiracion
- Duplicar comunicados
- Seccion separada para tutoriales interactivos

---

## Store Zustand

### `comunicadosStore` (`src/stores/comunicadosStore.ts`, 170 lineas)

| Estado | Tipo | Descripcion |
|--------|------|-------------|
| pendingComunicados | Comunicado[] | Cola de comunicados no leidos |
| currentComunicado | Comunicado \| null | Comunicado visible en overlay |
| isOverlayVisible | boolean | Visibilidad del overlay |
| readIds | Set\<string\> | IDs ya leidos (anti-loop) |

**Acciones criticas:**

- `loadPending(userId, coordId?, role?)` - Carga pendientes + readIds de BD
- `addComunicado(comunicado, ...)` - Agrega desde Realtime (con checks anti-loop)
- `markCurrentAsRead(userId)` - Marca como leido (orden critico, ver abajo)
- `showNext()` - Muestra siguiente por prioridad DESC, published_at DESC

---

## Patron Anti-Loop (CRITICO)

El problema: `mark_comunicado_read` actualiza `read_count`, lo que dispara UPDATE Realtime, que intenta re-agregar el comunicado.

**Solucion - Orden de operaciones en `markCurrentAsRead`:**

```
1. readIds.add(id)          // PRIMERO: agregar a Set local
2. Remove from pending       // Optimistic UI
3. Hide overlay              // UX inmediato
4. await markAsRead(...)     // DB call (dispara UPDATE Realtime)
   --> Realtime callback --> addComunicado --> readIds.has(id)? SI --> RETURN
5. showNext() after 300ms    // Siguiente comunicado
```

Si se invierte el orden (DB primero, Set despues), se crea loop infinito.

---

## Tipos (`src/types/comunicados.ts`, 106 lineas)

```typescript
type ComunicadoTipo = 'info' | 'feature' | 'tutorial' | 'mantenimiento' | 'urgente';
type ComunicadoEstado = 'borrador' | 'activo' | 'archivado';
type ComunicadoTargetType = 'todos' | 'coordinacion' | 'usuarios' | 'roles';

// Colores por tipo
COMUNICADO_TIPO_COLORS: {
  info: blue, feature: emerald, tutorial: purple,
  mantenimiento: amber, urgente: red
}

// Iconos default por tipo
info: 'Info', feature: 'Sparkles', tutorial: 'GraduationCap',
mantenimiento: 'Wrench', urgente: 'AlertTriangle'
```

---

## Servicio (`src/services/comunicadosService.ts`, 348 lineas)

| Metodo | Uso |
|--------|-----|
| `getComunicadosAdmin(filtros?)` | Admin: todos los comunicados |
| `createComunicado(params, userId)` | Crear borrador |
| `publishComunicado(id)` | borrador -> activo (dispara Realtime) |
| `archiveComunicado(id)` | activo -> archivado |
| `deleteComunicado(id)` | Eliminar permanente |
| `getComunicadosPendientes(userId, coordId?, role?)` | User: activos no leidos con targeting |
| `markAsRead(comunicadoId, userId)` | RPC mark_comunicado_read |
| `getReadIds(userId)` | IDs leidos para poblar readIds Set |
| `subscribeToNewComunicados(callback)` | Realtime INSERT/UPDATE (estado=activo) |
| `getReadStats(comunicadoId)` | Admin: conteo + lista de lectores |

---

## Inicializacion (MainApp.tsx)

```typescript
useEffect(() => {
  if (!isAuthenticated || !user?.id) return;
  loadPendingComunicados(user.id, user.coordinacion_id, user.role_name);
  const unsub = comunicadosService.subscribeToNewComunicados((comunicado) => {
    addComunicado(comunicado, user.id, user.coordinacion_id, user.role_name);
  });
  return () => unsub();
}, [isAuthenticated, user?.id]);
```

ComunicadoOverlay se renderiza en 3 branches de layout en MainApp (mobile, desktop collapsed, desktop expanded) - React Portal asegura 1 instancia visual.

---

## Workflows

### Comunicado Simple (sin deploy)

1. Admin abre ComunicadosManager
2. Crea comunicado (estado=borrador)
3. Publica (estado=activo, published_at=NOW())
4. Realtime notifica a todos los clientes suscritos
5. Store verifica targeting client-side
6. Overlay muestra comunicado
7. Usuario click "Entendido" -> markAsRead -> siguiente en cola

### Tutorial Interactivo (requiere deploy)

1. Developer crea componente React en `tutorials/`
2. Registra en INTERACTIVE_REGISTRY + INTERACTIVE_COMUNICADOS
3. Deploy frontend (build + S3 + CloudFront)
4. Admin crea comunicado con `is_interactive=true`, `component_key`
5. Publica
6. Overlay carga componente via lazy import + Suspense
7. Tutorial maneja su propio boton "Entendido" via `onComplete`

---

## Skill

Usar `/comunicado` para crear y publicar comunicados. Ver `.claude/skills/comunicado/SKILL.md`.

---

## Inventario de Archivos

| Archivo | Lineas | Proposito |
|---------|--------|-----------|
| `src/types/comunicados.ts` | 106 | Tipos, presets, colores |
| `src/services/comunicadosService.ts` | 348 | CRUD, Realtime, targeting |
| `src/stores/comunicadosStore.ts` | 170 | Estado, cola, anti-loop |
| `src/components/comunicados/ComunicadoOverlay.tsx` | 113 | Modal overlay z-[60] |
| `src/components/comunicados/ComunicadoCard.tsx` | 183 | Card presentacional |
| `src/components/comunicados/tutorials/UtilityTemplateTutorial.tsx` | 578 | Tutorial 4 pasos |
| `src/components/admin/ComunicadosManager.tsx` | 967 | Panel admin CRUD |
| `sql/comunicados-schema.sql` | 153 | Schema BD + RLS + RPC |
| **Total** | **2,618** | |
