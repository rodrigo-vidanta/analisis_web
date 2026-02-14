# Patrones UI - PQNC QA AI Platform

> Actualizado: 2026-02-13 | Design System V2.0

## Reglas Generales

- TailwindCSS exclusivo (NUNCA CSS custom)
- Dark mode obligatorio en TODOS los componentes
- Framer Motion para animaciones
- Lucide React para iconos
- Colores: `neutral-*` (NO usar `gray-*` ni `slate-*` legacy)

## Design System V2.0

### Paleta de Colores

```
Fondos:    neutral-50/neutral-900 (light/dark)
Cards:     white/neutral-800 (light/dark)
Borders:   neutral-200/neutral-700 (light/dark)
Text:      neutral-900/neutral-100 (light/dark)
Muted:     neutral-500/neutral-400 (light/dark)
```

### Colores Semanticos
- Primary: blue-500/600
- Secondary: purple-500/600
- Success: green-500/600 / emerald-500/600
- Warning: amber-500/600
- Danger: red-500/600
- Citas modulo: teal-500/600 (Montserrat font)

### 6 Gradientes Autorizados
```
blue → purple    (primary)
emerald → teal   (success)
amber → orange   (warning)
rose → pink      (danger)
violet → indigo  (special)
cyan → blue      (info)
```

### 3 Temas
- Light (default)
- Dark (obligatorio en todos los componentes)
- Twilight (variante intermedia)

## Modales

```typescript
// Backdrop
className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"

// Container V2.0
className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4"

// Animacion cascade
const containerVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1, scale: 1,
    transition: { staggerChildren: 0.05 }
  }
};
```

## Overlays por Z-Index

| Z-Index | Componente | Proposito |
|---------|-----------|-----------|
| z-50 | Modales | Modales estandar |
| z-[60] | ComunicadoOverlay | Comunicados/tutoriales real-time |
| z-[70] | ForceUpdateModal | Actualizacion obligatoria |

## Animaciones (Framer Motion)

```typescript
// Libreria de animaciones V2.0
SCALE_IN:  { initial: { scale: 0.95, opacity: 0 }, animate: { scale: 1, opacity: 1 } }
FADE_IN:   { initial: { opacity: 0 }, animate: { opacity: 1 } }
SLIDE_UP:  { initial: { y: 20, opacity: 0 }, animate: { y: 0, opacity: 1 } }
SPRING_POP: { transition: { type: "spring", stiffness: 500, damping: 30 } }
```

## Secciones con Barra Vertical

```typescript
<div className="flex items-start gap-3">
  <div className="w-1 h-full rounded-full bg-gradient-to-b from-blue-500 to-purple-500" />
  <div className="flex-1">{/* contenido */}</div>
</div>
```

## Toggle Switches

```typescript
transition={{ type: "spring", stiffness: 500, damping: 30 }}
```

## Cards

```typescript
// Card estandar V2.0
className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 hover:shadow-lg transition-shadow"

// Card con glassmorphism
className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl rounded-2xl border border-white/20"
```

## Plasma Gradient (Sidebar Headers)

```
3 capas: base + ::before + ::after
3 keyframes: plasma-move-x-fast, plasma-move-y, plasma-rotate
Usado en: ProspectosManager, ProspectDetailSidebar, LiveMonitorKanban
```

## Componentes Compartidos (`src/components/shared/`)

- `LoadingSpinner.tsx` - Spinner de carga
- `Modal.tsx` - Modal reutilizable
- `Button.tsx` - Boton estilizado
- `Input.tsx` - Input estilizado
- `Select.tsx` - Select estilizado
- `Table.tsx` - Tabla reutilizable
- `Pagination.tsx` - Paginacion
- `EmptyState.tsx` - Estado vacio
- `ErrorBoundary.tsx` - Boundary de errores
- `ManualCallModal.tsx` - Modal llamada manual (VAPI)

## Responsividad

- Mobile first con breakpoints Tailwind
- Sidebar colapsable en mobile
- Tablas con scroll horizontal en mobile
