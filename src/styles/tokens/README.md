# 🎨 Tokens de Diseño Corporativo - Guía de Uso

## 📦 Estructura de Archivos

```
src/styles/tokens/
├── index.ts         # Punto de entrada principal
├── colors.ts        # Sistema de colores
├── gradients.ts     # Gradientes corporativos
├── animations.ts    # Biblioteca de animaciones
├── spacing.ts       # Espaciado y formas
└── README.md        # Esta guía
```

---

## 🚀 Inicio Rápido

### Importación Básica:

```typescript
// Importar todo
import { COLORS, GRADIENTS, ANIMATIONS, SPACING } from '@/styles/tokens';

// O importar selectivamente
import { PRIMARY_COLORS, NEUTRAL_COLORS } from '@/styles/tokens';
import { FADE_IN, SCALE_IN } from '@/styles/tokens';
```

### Uso con Hook:

```typescript
import { useDesignTokens } from '@/hooks/useDesignTokens';

function MyComponent() {
  const { colors, gradients, animations, spacing } = useDesignTokens();
  
  return (
    <div style={{ color: colors.primary[500] }}>
      Contenido
    </div>
  );
}
```

---

## 🎨 COLORES

### Sistema de Colores:

```typescript
import { COLORS } from '@/styles/tokens';

// Neutrales (Slate)
COLORS.neutral[50]   // #f8fafc - Muy claro
COLORS.neutral[500]  // #64748b - Medio
COLORS.neutral[900]  // #0f172a - Muy oscuro

// Primario (Indigo)
COLORS.primary[500]  // #6366f1 - Principal
COLORS.primary[600]  // #4f46e5 - Hover

// Acento (Purple)
COLORS.accent[500]   // #a855f7 - Principal

// Estados
COLORS.success[500]  // #10b981 - Éxito
COLORS.warning[500]  // #f59e0b - Advertencia
COLORS.error[500]    // #ef4444 - Error
COLORS.info[500]     // #3b82f6 - Info
```

### Uso en Tailwind:

```tsx
<div className="bg-primary-500 text-neutral-50">
  Botón Primario
</div>

<div className="border-neutral-200 bg-neutral-50">
  Card
</div>
```

### Tema Twilight:

```typescript
import { TWILIGHT_COLORS } from '@/styles/tokens';

TWILIGHT_COLORS.bg.primary    // #1a202e
TWILIGHT_COLORS.text.primary  // #e8eaf0
TWILIGHT_COLORS.border.normal // #4a556b
```

---

## 🌈 GRADIENTES

### Solo 6 Gradientes Autorizados:

```typescript
import { GRADIENTS } from '@/styles/tokens';

GRADIENTS.primary   // Indigo suave
GRADIENTS.accent    // Purple sutil
GRADIENTS.success   // Emerald profesional
GRADIENTS.warning   // Amber contenido
GRADIENTS.info      // Blue moderado
GRADIENTS.neutral   // Grises elegantes
```

### Uso en CSS-in-JS:

```typescript
<div style={{ background: GRADIENTS.primary }}>
  Header con gradiente primario
</div>
```

### Uso en Tailwind:

```tsx
<div className="bg-gradient-primary">
  Fondo con gradiente
</div>
```

### Gradientes por Módulo:

```typescript
import { getModuleGradient } from '@/styles/tokens';

// Obtener gradiente apropiado para un módulo
const gradient = getModuleGradient('liveChat', 'primary', 'light');
```

---

## ✨ ANIMACIONES

### Variantes Predefinidas (Framer Motion):

```typescript
import { FADE_IN, SCALE_IN, SLIDE_UP } from '@/styles/tokens';

// Fade in simple
<motion.div {...FADE_IN}>
  Contenido
</motion.div>

// Scale in para modales
<motion.div {...SCALE_IN}>
  Modal
</motion.div>

// Slide up para tooltips
<motion.div {...SLIDE_UP}>
  Tooltip
</motion.div>
```

### Duraciones Estandarizadas:

```typescript
import { ANIMATION_DURATIONS } from '@/styles/tokens';

ANIMATION_DURATIONS.instant  // 0.1s
ANIMATION_DURATIONS.fast     // 0.2s
ANIMATION_DURATIONS.normal   // 0.3s
ANIMATION_DURATIONS.slow     // 0.4s
```

### Spring Physics:

```typescript
import { SPRING_PHYSICS } from '@/styles/tokens';

<motion.button
  whileTap={{ scale: 0.98 }}
  transition={SPRING_PHYSICS.normal}
>
  Botón
</motion.button>
```

### Stagger Escalonado:

```typescript
import { createStagger } from '@/styles/tokens';

{items.map((item, index) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={createStagger(index)}
  >
    {item.name}
  </motion.div>
))}
```

---

## 📐 ESPACIADO Y FORMAS

### Border Radius:

```typescript
import { RADIUS } from '@/styles/tokens';

RADIUS.sm    // 8px  - Badges, botones pequeños
RADIUS.md    // 12px - Cards, inputs
RADIUS.lg    // 16px - Modales, sidebars
RADIUS.xl    // 20px - Elementos destacados
RADIUS['2xl'] // 24px - Especiales
RADIUS.full  // 9999px - Avatares, pills
```

```tsx
<div className="rounded-md">Card</div>
<div className="rounded-lg">Modal</div>
<div className="rounded-full">Avatar</div>
```

### Shadows:

```typescript
import { SHADOWS, getShadow } from '@/styles/tokens';

// Uso directo
<div style={{ boxShadow: SHADOWS.md }}>
  Card elevado
</div>

// Con detección de tema
const shadow = getShadow('md', isDark);
```

```tsx
<div className="shadow-sm">Sutil</div>
<div className="shadow-md">Normal</div>
<div className="shadow-lg">Destacado</div>
```

### Iconos:

```typescript
import { ICON_SIZES } from '@/styles/tokens';

ICON_SIZES.sm  // 16px - Inline text, badges
ICON_SIZES.md  // 20px - Botones, navegación
ICON_SIZES.lg  // 24px - Headers, destacados
```

```tsx
<Icon className="w-5 h-5" /> {/* 20px - md */}
<Icon className="w-6 h-6" /> {/* 24px - lg */}
```

---

## 🎯 EJEMPLOS PRÁCTICOS

### Botón Primario:

```tsx
import { motion } from 'framer-motion';
import { GRADIENTS, RADIUS, SHADOWS, createButtonVariants } from '@/styles/tokens';

function PrimaryButton({ children }) {
  return (
    <motion.button
      className="px-4 py-2 text-white rounded-md shadow-sm"
      style={{
        background: GRADIENTS.primary,
        borderRadius: RADIUS.md,
        boxShadow: SHADOWS.sm,
      }}
      variants={createButtonVariants()}
      whileHover="hover"
      whileTap="tap"
    >
      {children}
    </motion.button>
  );
}
```

### Card Elevado:

```tsx
import { motion } from 'framer-motion';
import { SCALE_IN, createCardVariants } from '@/styles/tokens';

function Card({ children }) {
  return (
    <motion.div
      className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-6"
      {...SCALE_IN}
      variants={createCardVariants()}
      whileHover="hover"
    >
      {children}
    </motion.div>
  );
}
```

### Modal con Backdrop:

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BACKDROP_VARIANTS, 
  BACKDROP_TRANSITION,
  SCALE_IN,
  MODAL_TRANSITION 
} from '@/styles/tokens';

function Modal({ isOpen, onClose, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-md z-50"
            {...BACKDROP_VARIANTS}
            transition={BACKDROP_TRANSITION}
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-lg w-full"
              {...SCALE_IN}
              transition={MODAL_TRANSITION}
            >
              {children}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### Lista con Stagger:

```tsx
import { motion } from 'framer-motion';
import { LIST_CONTAINER, LIST_ITEM } from '@/styles/tokens';

function List({ items }) {
  return (
    <motion.ul
      variants={LIST_CONTAINER}
      initial="initial"
      animate="animate"
      className="space-y-2"
    >
      {items.map((item) => (
        <motion.li
          key={item.id}
          variants={LIST_ITEM}
          className="bg-neutral-50 dark:bg-neutral-800 rounded-md p-4"
        >
          {item.name}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

---

## 🌗 SOPORTE DE TEMAS

### Tema Actual con Hook:

```typescript
import { useDesignTokens } from '@/hooks/useDesignTokens';

function MyComponent() {
  const { theme, isDark, isTwilight } = useDesignTokens();
  
  if (isTwilight) {
    // Usar colores Twilight
  }
  
  if (isDark) {
    // Usar colores oscuros
  }
  
  // Usar colores claros
}
```

---

## ✅ CHECKLIST DE MIGRACIÓN

Al migrar un componente al nuevo sistema:

- [ ] Reemplazar colores hardcodeados con tokens
- [ ] Usar gradientes corporativos en vez de custom
- [ ] Aplicar border-radius estandarizado
- [ ] Usar shadows homologadas
- [ ] Aplicar animaciones de la biblioteca
- [ ] Verificar iconos (16, 20, 24px)
- [ ] Testing en tema claro, oscuro y Twilight

---

## 📚 REFERENCIAS

- **Auditoría Completa:** `docs/DESIGN_SYSTEM_AUDIT_2025.md`
- **Resumen Ejecutivo:** `docs/DESIGN_SYSTEM_SUMMARY.md`
- **Guía de Modales:** Workspace rules

---

**Versión:** 2.0.0  
**Fecha:** 26 de Enero 2025  
**Compatibilidad:** React 19 + Tailwind CSS 3 + Framer Motion 11

