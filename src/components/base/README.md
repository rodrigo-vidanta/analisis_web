# 🧩 Componentes Base Corporativos

Biblioteca de componentes homologados que usan el sistema de tokens de diseño.

---

## 📦 Componentes Disponibles

1. [Button](#button) - Botones con variantes y tamaños
2. [Card](#card) - Cards con headers y footers
3. [Badge](#badge) - Badges de estado y etiquetas
4. [Modal](#modal) - Modales animados con backdrop
5. [Input](#input) - Inputs con validación visual
6. [Tabs](#tabs) - Sistema de pestañas con indicador deslizante

---

## 🚀 Instalación

```typescript
// Importar componentes
import { Button, Card, Badge, Modal, Input } from '@/components/base';

// O importar individualmente
import Button from '@/components/base/Button';
import { PrimaryButton, SecondaryButton } from '@/components/base/Button';
```

---

## 📘 BUTTON

### Variantes:
- `primary` - Botón principal con gradiente (default)
- `secondary` - Botón secundario con fondo neutral
- `ghost` - Botón transparente
- `danger` - Botón de acción destructiva
- `success` - Botón de éxito
- `warning` - Botón de advertencia

### Tamaños:
- `sm` - Pequeño
- `md` - Normal (default)
- `lg` - Grande

### Props:
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  // + todas las props nativas de button
}
```

### Ejemplos:

```tsx
// Botón primario básico
<Button>Guardar</Button>

// Botón con icono
<Button icon={<Save className="w-4 h-4" />}>
  Guardar
</Button>

// Botón de carga
<Button loading>Cargando...</Button>

// Botón secundario grande
<Button variant="secondary" size="lg">
  Cancelar
</Button>

// Helpers predefinidos
<PrimaryButton>Primario</PrimaryButton>
<DangerButton>Eliminar</DangerButton>
```

---

## 📘 CARD

### Variantes:
- `default` - Card básico con borde sutil
- `elevated` - Card con sombra elevada
- `outlined` - Card con solo borde
- `gradient` - Card con gradiente header

### Tamaños:
- `sm` - Compacto (padding 16px)
- `md` - Normal (padding 24px) (default)
- `lg` - Espacioso (padding 32px)

### Props:
```typescript
interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean; // Hover effect
  gradient?: string; // Gradiente personalizado para header
  header?: React.ReactNode;
  footer?: React.ReactNode;
  // + todas las props nativas de div
}
```

### Ejemplos:

```tsx
// Card básico
<Card>
  <p>Contenido del card</p>
</Card>

// Card con header y footer
<Card
  header={<h3>Título del Card</h3>}
  footer={<Button>Acción</Button>}
>
  Contenido
</Card>

// Card elevado con hover
<ElevatedCard interactive>
  Card interactivo
</ElevatedCard>

// Card con sub-componentes
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descripción</CardDescription>
  </CardHeader>
  <CardContent>
    Contenido principal
  </CardContent>
  <CardFooter>
    <Button>Acción</Button>
  </CardFooter>
</Card>
```

---

## 📘 BADGE

### Variantes:
- `default` - Badge neutral
- `primary` - Badge primario
- `success` - Badge de éxito
- `warning` - Badge de advertencia
- `error` - Badge de error
- `info` - Badge informativo

### Tamaños:
- `sm` - Pequeño
- `md` - Normal (default)
- `lg` - Grande

### Props:
```typescript
interface BadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean; // Mostrar punto indicador
  removable?: boolean; // Mostrar X
  onRemove?: () => void;
  // + todas las props nativas de span
}
```

### Ejemplos:

```tsx
// Badge básico
<Badge>Nuevo</Badge>

// Badge con variante
<SuccessBadge>Activo</SuccessBadge>
<ErrorBadge>Error</ErrorBadge>

// Badge con dot
<Badge variant="success" dot>
  En línea
</Badge>

// Badge removible
<Badge 
  removable 
  onRemove={() => console.log('Removed')}
>
  Etiqueta
</Badge>

// Helpers predefinidos
<PrimaryBadge>Primario</PrimaryBadge>
<DotBadge variant="success">Con punto</DotBadge>
```

---

## 📘 MODAL

### Tamaños:
- `sm` - 400px max-width
- `md` - 600px max-width (default)
- `lg` - 800px max-width
- `xl` - 1000px max-width
- `full` - 95vw max-width

### Props:
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}
```

### Ejemplos:

```tsx
// Modal básico
const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Título del Modal"
  description="Descripción opcional"
>
  Contenido del modal
</Modal>

// Modal con footer
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirmar acción"
  footer={
    <ModalFooter>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>
        Cancelar
      </Button>
      <Button>Confirmar</Button>
    </ModalFooter>
  }
>
  ¿Estás seguro de realizar esta acción?
</Modal>

// Modal grande sin cerrar con ESC
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  size="lg"
  closeOnEscape={false}
  closeOnBackdrop={false}
>
  Contenido importante
</Modal>
```

---

## 📘 INPUT

### Variantes:
- `default` - Input normal
- `success` - Input con validación exitosa
- `error` - Input con error
- `warning` - Input con advertencia

### Tamaños:
- `sm` - Pequeño
- `md` - Normal (default)
- `lg` - Grande

### Props:
```typescript
interface InputProps {
  variant?: 'default' | 'success' | 'error' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  // + todas las props nativas de input
}
```

### Ejemplos:

```tsx
// Input básico
<Input 
  label="Nombre"
  placeholder="Ingresa tu nombre"
/>

// Input con helper text
<Input 
  label="Email"
  helperText="Usaremos este email para contactarte"
  type="email"
/>

// Input con error
<Input 
  label="Contraseña"
  errorMessage="La contraseña debe tener al menos 8 caracteres"
  type="password"
/>

// Input con iconos
<Input 
  label="Buscar"
  leftIcon={<Search className="w-5 h-5" />}
  placeholder="Buscar..."
/>

// Input de éxito
<SuccessInput 
  label="Usuario"
  helperText="Usuario disponible"
/>

// Helpers predefinidos
<ErrorInput errorMessage="Campo requerido" />
<WarningInput helperText="Verifica este dato" />
```

---

## 🎨 Integración con Tokens

Todos los componentes usan el sistema de tokens de diseño:

```typescript
import { COLORS, GRADIENTS, ANIMATIONS } from '@/styles/tokens';

// Los componentes internamente usan:
- COLORS.primary[500]  // Colores
- GRADIENTS.primary    // Gradientes
- SCALE_IN             // Animaciones
- RADIUS.md            // Border radius
- SHADOWS.sm           // Sombras
```

---

## ✅ Checklist de Uso

Al usar estos componentes:

- [x] Usar variantes predefinidas en vez de estilos custom
- [x] Respetar tamaños estandarizados (sm, md, lg)
- [x] Aprovechar sub-componentes (CardHeader, ModalFooter, etc.)
- [x] Usar helpers predefinidos cuando sea posible
- [x] Mantener consistencia visual en toda la app

---

## 🔗 Referencias

- **Tokens de Diseño:** `src/styles/tokens/`
- **Hook de Tokens:** `src/hooks/useDesignTokens.ts`
- **Guía de Diseño:** `docs/DESIGN_SYSTEM_AUDIT_2025.md`

---

**Versión:** 2.0.0  
**Fecha:** 26 de Enero 2025  
**Compatibilidad:** React 19 + Tailwind CSS 3 + Framer Motion 11

