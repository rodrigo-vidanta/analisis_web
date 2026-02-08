---
name: frontend-design
description: Genera componentes React con la identidad visual de PQNC QA AI Platform. Usa cuando el usuario pida crear interfaces, componentes UI, paginas, modales, o cualquier elemento visual.
argument-hint: <descripcion del componente o interfaz a crear>
---

# Frontend Design - PQNC QA AI Platform

Eres un experto en diseño de interfaces para la plataforma PQNC QA AI. Tu trabajo es generar componentes React + TypeScript de calidad produccion que sigan EXACTAMENTE el sistema de diseno establecido.

## Reglas Absolutas

1. **SOLO TailwindCSS** - NUNCA CSS custom, NUNCA styled-components, NUNCA CSS modules
2. **Dark mode obligatorio** - TODO componente debe verse perfecto en `dark:`
3. **Framer Motion** para animaciones (importar de `motion/react`)
4. **Lucide React** para iconos - NUNCA otros icon packs
5. **TypeScript estricto** - NUNCA `any`, interfaces tipadas para props
6. **Inter** como font primaria, **JetBrains Mono** para codigo/datos
7. **Mobile first** - Responsivo con breakpoints Tailwind (`sm:`, `md:`, `lg:`, `xl:`)

## Paleta de Colores Autorizada

| Rol | Light | Dark | Uso |
|-----|-------|------|-----|
| Primary | `indigo-500` / `indigo-600` | `indigo-400` / `indigo-500` | CTAs, botones primarios, enlaces activos |
| Accent | `purple-500` / `purple-600` | `purple-400` / `purple-500` | Acentos secundarios, badges |
| Success | `emerald-500` / `emerald-600` | `emerald-400` / `emerald-500` | Estados exitosos, confirmaciones |
| Warning | `amber-500` / `amber-600` | `amber-400` / `amber-500` | Alertas, precauciones |
| Danger | `red-500` / `red-600` | `red-400` / `red-500` | Errores, acciones destructivas |
| Info | `blue-500` / `blue-600` | `blue-400` / `blue-500` | Informacion, tooltips |
| Neutral | `slate-50` a `slate-900` | Invertido | Textos, fondos, bordes |

### Colores por Modulo (accent contextual)

- PQNC Humans: `indigo-600`
- Natalia IA: `emerald-500`
- Prospectos: `sky-500`
- Live Monitor: `cyan-500`
- Live Chat: `blue-500`
- AI Models: `fuchsia-500`
- AWS Manager: `amber-500`
- Admin: `violet-500`
- Citas: `teal-500` (font Montserrat)

## 6 Gradientes Autorizados (UNICOS)

```
1. Primary:  bg-gradient-to-br from-indigo-500 to-indigo-300
2. Accent:   bg-gradient-to-br from-purple-500 to-purple-300
3. Success:  bg-gradient-to-br from-emerald-500 to-emerald-300
4. Warning:  bg-gradient-to-br from-amber-500 to-amber-300
5. Info:     bg-gradient-to-br from-blue-500 to-blue-300
6. Neutral:  bg-gradient-to-br from-slate-50 to-slate-200
```

## Animaciones Estandar (Framer Motion)

```typescript
import { motion, AnimatePresence } from 'motion/react';

// Fade in
const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
};

// Scale in (modales, popovers)
const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
};

// Slide up (sheets, drawers)
const slideUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
  transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
};

// Stagger children (listas)
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const staggerItem = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 }
};

// Spring para toggles/switches
const springToggle = {
  type: "spring", stiffness: 500, damping: 30
};

// Hover lift (cards interactivas)
whileHover={{ y: -2, boxShadow: "0 8px 16px rgba(0,0,0,0.10)" }}
whileTap={{ scale: 0.98 }}
```

## Patrones de Componentes

### Cards

```tsx
// Card estandar
<div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow">

// Card elevada
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6">

// Card glassmorphism (premium)
<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/30 p-6">
```

### Modales

```tsx
// Backdrop
<motion.div
  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
/>

// Container
<motion.div
  className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4"
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
>
```

### Botones

```tsx
// Primary
<button className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">

// Secondary
<button className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors">

// Ghost
<button className="hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg font-medium transition-colors">

// Danger
<button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
```

### Secciones con Barra Vertical

```tsx
<div className="flex items-start gap-3">
  <div className="w-1 h-full rounded-full bg-gradient-to-b from-blue-500 to-purple-500" />
  <div className="flex-1">{/* contenido */}</div>
</div>
```

### Inputs

```tsx
<input className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
```

## Sombras

| Nivel | Clase | Uso |
|-------|-------|-----|
| xs | `shadow-sm` | Inputs, badges |
| sm | `shadow` | Cards reposo |
| md | `shadow-md` | Cards hover |
| lg | `shadow-lg` | Dropdowns, popovers |
| xl | `shadow-xl` | Modales |
| 2xl | `shadow-2xl` | Modales principales |

## Bordes Redondeados

| Nivel | Clase | Uso |
|-------|-------|-----|
| sm | `rounded-lg` (8px) | Inputs, badges, botones |
| md | `rounded-xl` (12px) | Cards |
| lg | `rounded-2xl` (16px) | Modales, cards premium |

## Scrollbars

```
- Sutil: className="custom-scrollbar" (slate, 6px)
- Invisible: className="scrollbar-none"
- Ultra-thin: className="scrollbar-ultra-thin" (3px, para chats)
- Analysis: className="analysis-scroll" (blue-tinted)
```

## Estructura de Archivos

- Componentes en `src/components/{modulo}/`
- Hooks en `src/hooks/`
- Servicios en `src/services/`
- Types en `src/types/`
- Stores en `src/stores/`
- Componentes compartidos en `src/components/shared/`

## Proceso de Generacion

Cuando el usuario pida un componente o interfaz:

1. **Entender** - Que necesita, donde va, que modulo
2. **Verificar** - Leer componentes existentes similares para mantener consistencia
3. **Disenar** - Aplicar el sistema de diseno de arriba
4. **Implementar** - Codigo React + TS + Tailwind + Framer Motion
5. **Validar** - Dark mode, responsive, accesibilidad basica, tipado estricto

## Componentes Compartidos Existentes

Antes de crear algo nuevo, verificar si ya existe en `src/components/shared/`:
- `LoadingSpinner.tsx` - Spinner de carga
- `Modal.tsx` - Modal reutilizable
- `Button.tsx` - Boton estilizado
- `Input.tsx` - Input estilizado
- `Select.tsx` - Select estilizado
- `Table.tsx` - Tabla reutilizable
- `Pagination.tsx` - Paginacion
- `EmptyState.tsx` - Estado vacio
- `ErrorBoundary.tsx` - Boundary de errores

## Estetica General

La plataforma tiene una estetica **moderna, profesional y sofisticada**:
- Glassmorphism sutil en elementos premium (backdrop-blur + transparencia)
- Efectos plasma en headers de modulos (gradientes animados)
- Micro-interacciones (hover lift, tap scale, shimmer en botones)
- Transiciones suaves (200-400ms) con easing `[0.16, 1, 0.3, 1]`
- Espaciado generoso y jerarquia visual clara
- Contraste WCAG AA minimo en todos los estados

## Anti-Patrones (NUNCA hacer)

- NUNCA usar `style={{}}` inline
- NUNCA crear componentes sin dark mode
- NUNCA usar `px-[17px]` valores arbitrarios sin justificacion
- NUNCA omitir estados hover/focus/active en elementos interactivos
- NUNCA usar fonts diferentes a Inter / JetBrains Mono / Montserrat (solo citas)
- NUNCA hardcodear colores hex - usar siempre clases Tailwind
- NUNCA crear un componente que ya existe en shared/
- NUNCA usar `onClick` sin feedback visual (loading, disabled, etc.)
