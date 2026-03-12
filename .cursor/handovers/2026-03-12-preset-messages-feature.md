# Handover: Mensajes Predefinidos (Preset Messages)

**Fecha**: 2026-03-12
**Estado**: Feature completa, pendiente deploy + insert BD comunicado
**Build**: Verificado sin errores

---

## Resumen

Sistema completo de mensajes predefinidos para el módulo WhatsApp. Los ejecutivos pueden seleccionar mensajes pre-aprobados organizados por categorías, personalizar variables (texto libre o dropdown), previsualizar con formato WhatsApp, y enviar directamente al prospecto. Incluye panel admin CRUD y tutorial interactivo (comunicado).

---

## Archivos Nuevos (4)

| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| `src/services/presetMessagesService.ts` | 183 | Servicio CRUD via Supabase RPCs (`manage_preset_category`, `manage_preset_message`) |
| `src/components/chat/PresetMessagesModal.tsx` | 470 | Modal de selección en chat: búsqueda, categorías, variables, preview WhatsApp, envío |
| `src/components/admin/PresetMessagesManager.tsx` | 1093 | Panel admin: sidebar categorías + data grid mensajes, CRUD completo, icon picker |
| `src/components/comunicados/tutorials/PresetMessagesTutorial.tsx` | 742 | Tutorial animado 5 pasos, avance manual, Framer Motion |

## Archivos Modificados (5)

| Archivo | Cambio |
|---------|--------|
| `src/components/chat/LiveChatCanvas.tsx` | Botón BookText entre adjuntar y llamada + render PresetMessagesModal |
| `src/components/admin/AdminDashboardTabs.tsx` | Tab "Predefinidos" (admin, admin_operativo, coordinador CALIDAD) |
| `src/components/comunicados/ComunicadoOverlay.tsx` | Registry: `'preset-messages-tutorial'` → lazy import |
| `src/types/comunicados.ts` | INTERACTIVE_COMUNICADOS: entry para preset-messages-tutorial |
| `src/components/support/AdminTicketsPanel.tsx` | Cambios no relacionados (ya estaba modified) |

## Archivos Modificados No Relacionados

Estos cambios son de sesiones anteriores del mismo día (voice transfer / PSTN bridge):
- `docs/VOICE_TRANSFER_SYSTEM.md` — Documentación PSTN bridge transfer
- `src/components/live-activity/VoiceSoftphoneModal.tsx` — Badge PSTN en softphone

---

## Base de Datos

### Migración aplicada (via MCP execute_sql)

```sql
-- Tablas creadas
preset_message_categories (id uuid, name, description, icon, sort_order, is_active, created_at, updated_at)
preset_messages (id uuid, category_id FK, title, content, variables jsonb, sort_order, is_active, created_by, created_at, updated_at)

-- RLS habilitado, anon revoked, authenticated SELECT
-- 2 RPCs SECURITY DEFINER: manage_preset_category, manage_preset_message
-- Verifican admin || admin_operativo || coordinador CALIDAD server-side
```

### Seed data insertado

3 categorías con iconos vectorizados:
- **Información General** (icon: `Mail`) — 2 mensajes seed
- **Datos Bancarios** (icon: `Landmark`)
- **Seguimiento** (icon: `Target`)

### Iconos actualizados

```sql
UPDATE preset_message_categories SET icon = 'Mail' WHERE icon = '📧';
UPDATE preset_message_categories SET icon = 'Landmark' WHERE icon = '🏦';
UPDATE preset_message_categories SET icon = 'Target' WHERE icon = '📋';
```

---

## Arquitectura

### Sistema de Variables

```typescript
interface PresetVariable {
  name: string;      // ID sanitizado (snake_case)
  label: string;     // Label visible
  type: 'text' | 'dropdown';
  placeholder?: string;
  default_value?: string;
  options?: string[];  // Solo para dropdown
}
```

- Variables en contenido: `{{nombre_variable}}`
- `resolveContent(content, variableValues)` reemplaza placeholders
- Ejemplo texto libre: `{{correo_electronico}}` → usuario escribe email
- Ejemplo dropdown: `{{dominio}}` → selecciona vidavacations.com o grupovidanta.com

### Flujo de envío

```
PresetMessagesModal → seleccionar categoría → seleccionar mensaje
→ llenar variables → preview WhatsApp → "Enviar mensaje"
→ onSend(resolvedText) → sendMessageWithText(message) en LiveChatCanvas
```

### Formato WhatsApp soportado

`*bold*`, `_italic_`, `~strikethrough~`, `` ```monospace``` ``
Preview en modal simula apariencia de burbuja WhatsApp con parsing regex.

### Panel Admin

- Sidebar izquierdo: lista de categorías con icon picker (21 iconos lucide-react)
- Área principal: data grid tabla con columnas (Título, Contenido, Variables, Estado, Acciones)
- Modal categoría: nombre, descripción, icono (grid 7 cols), orden
- Modal mensaje: `max-w-5xl` (30% más ancho), toolbar formato WhatsApp, editor variables inline, preview en vivo
- Permisos: admin, admin_operativo, coordinador de CALIDAD

### Icon Catalog (21 iconos)

```typescript
const ICON_CATALOG = {
  FileText, Mail, Landmark, Phone, DollarSign, Target, PenLine,
  Building, Plane, Palmtree, Star, Bell, BarChart3, Handshake,
  Briefcase, MapPin, Heart, Shield, Gift, Clock, Users
};
```

---

## Tutorial Interactivo (Comunicado)

### Estructura: 5 pasos manuales

1. **Nuevo botón** — Muestra ubicación del icono BookText en la barra del chat
2. **Categorías** — Modal con tabs de categorías y lista de mensajes
3. **Variables de texto** — Campos de entrada libre (ej: correo electrónico)
4. **Variables dropdown** — Selección de opciones predefinidas (ej: dominio)
5. **Preview y envío** — Vista previa WhatsApp + botón enviar + mensaje sobre depto. Calidad

### Características

- NO auto-advance: navegación por clic (dots + botones prev/next)
- `onComplete()` en botón "Entendido" del último paso
- Framer Motion: AnimatePresence mode="wait", staggerChildren
- TypewriterText para títulos, AnimatedCursor para interacciones simuladas
- Mock UI fiel al diseño real del módulo WhatsApp

### Registro

- `ComunicadoOverlay.tsx` → `INTERACTIVE_REGISTRY['preset-messages-tutorial']`
- `comunicados.ts` → `INTERACTIVE_COMUNICADOS` entry

---

## Errores Encontrados y Soluciones

### verbatimModuleSyntax (tsconfig)

**Problema**: `Uncaught SyntaxError: module does not provide export named 'PresetMessage'`
**Causa**: `tsconfig.app.json` tiene `verbatimModuleSyntax: true` — requiere `import type` para tipos
**Fix**: Separar imports de valor y tipo:
```typescript
import { presetMessagesService } from '../../services/presetMessagesService';
import type { PresetMessageCategory, PresetMessage, PresetVariable } from '../../services/presetMessagesService';
```

---

## Pendiente

### 1. Deploy a producción (REQUIERE AUTORIZACIÓN)
```bash
/deploy
```
Necesario porque hay componentes React nuevos (tutorial + modal + admin).

### 2. Insert comunicado en BD (REQUIERE AUTORIZACIÓN)
```sql
INSERT INTO comunicados (
  titulo, subtitulo, contenido, tipo, prioridad,
  is_interactive, component_key, target_type, target_ids,
  estado, published_at, created_by
) VALUES (
  'Nuevo: Mensajes Predefinidos',
  'Envía mensajes pre-aprobados con un clic',
  '{}'::jsonb,
  'feature',
  7,
  true,
  'preset-messages-tutorial',
  'todos',
  '{}',
  'activo',
  NOW(),
  'e8ced62c-3fd0-4328-b61a-a59ebea2e877'
) RETURNING id, titulo, estado;
```

**IMPORTANTE**: El insert debe hacerse DESPUÉS del deploy, porque el componente React del tutorial debe estar disponible en producción.

---

## Decisiones de Diseño

1. **Iconos vectorizados en vez de emojis**: Toda la UI usa lucide-react. La BD almacena nombres de iconos (string) que se mapean a componentes React via `ICON_MAP`/`ICON_CATALOG`.
2. **RPCs SECURITY DEFINER**: Las operaciones CRUD verifican permisos server-side (admin/operativo/calidad), no dependen del frontend.
3. **Data grid sobre accordions**: El admin usa tabla con columnas y acciones inline para mejor UX con muchos mensajes.
4. **sendMessageWithText reutilizado**: El envío usa el mismo flujo que quick replies — optimistic UI, pause bot, proxy Edge Function.
5. **Tutorial manual**: Sin auto-advance para que el usuario lea a su ritmo. 5 pasos cubren todo el flujo sin ser excesivo.
