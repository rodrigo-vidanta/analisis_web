# Patrones UI - PQNC QA AI Platform

## Reglas Generales

- TailwindCSS exclusivo (NUNCA CSS custom)
- Dark mode obligatorio en TODOS los componentes
- Framer Motion para animaciones
- Lucide React para iconos

## Modales

```typescript
// Backdrop
className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"

// Container
className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4"

// Animacion cascade
const containerVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1, scale: 1,
    transition: { staggerChildren: 0.05 }
  }
};
```

## Secciones con Barra Vertical

```typescript
// Patron de seccion con indicador lateral degradado
<div className="flex items-start gap-3">
  <div className="w-1 h-full rounded-full bg-gradient-to-b from-blue-500 to-purple-500" />
  <div className="flex-1">
    {/* contenido */}
  </div>
</div>
```

## Toggle Switches

```typescript
// Spring physics para toggles
transition={{ type: "spring", stiffness: 500, damping: 30 }}
```

## Cards

```typescript
// Card estandar
className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow"

// Card con glassmorphism (citas)
className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-white/20"
```

## Paleta de Colores

- Primary: blue-500/600
- Secondary: purple-500/600
- Success: green-500/600
- Warning: amber-500/600
- Danger: red-500/600
- Citas modulo: teal-500/600 (Montserrat font)

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

## Responsividad

- Mobile first con breakpoints Tailwind
- Sidebar colapsable en mobile
- Tablas con scroll horizontal en mobile
