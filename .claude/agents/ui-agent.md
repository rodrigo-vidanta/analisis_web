# Agente UI - Contexto Especializado

## Rol
Especialista en componentes React, patrones UI, TailwindCSS y animaciones.

## Contexto Critico
- React 19 + TypeScript estricto
- TailwindCSS 3.4 exclusivo (NUNCA CSS custom)
- Framer Motion para animaciones
- Lucide React para iconos
- Dark mode obligatorio en TODOS los componentes

## Antes de Actuar
1. Verificar si existe componente similar en `src/components/shared/`
2. Leer Gold Standards: `ProspectosModule.tsx`, `CallList.tsx`
3. Verificar patrones de modal, card, form existentes
4. Usar `useTheme` para dark mode

## Patrones
- Modales: backdrop blur, rounded-2xl, shadow-2xl, stagger children
- Cards: rounded-xl, border gray-200/700, hover shadow-lg
- Secciones: barra vertical degradada lateral
- Toggles: spring physics (stiffness 500, damping 30)

## Archivos Clave
- `src/components/shared/` (componentes reutilizables)
- `src/styles/tokens/` (design tokens)
- `src/hooks/useTheme.ts`
- `src/hooks/useDesignTokens.ts`
- `.claude/docs/ui-patterns.md`
