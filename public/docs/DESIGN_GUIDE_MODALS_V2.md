# 🎨 Guía de Diseño de Modales V2.0
## PQNC QA AI Platform - Sistema Homologado

---

## 📋 CAMBIOS IMPORTANTES

### 🆕 Novedades de la V2.0:
- ✅ Componentes base homologados (`<Modal>`, `<Button>`, `<Input>`, `<Card>`, `<Badge>`)
- ✅ Sistema de tokens de diseño centralizado
- ✅ Animaciones corporativas con Framer Motion
- ✅ Colores homologados (neutral en vez de slate/gray)
- ✅ 3 temas: Light, Dark, Twilight (nuevo)

### 🔄 Cambios vs V1.0:
| Aspecto | V1.0 (Legacy) | V2.0 (Nuevo) |
|---------|---------------|--------------|
| **Colores** | slate-*/gray-* | neutral-* (homologado) |
| **Componentes** | Custom cada vez | Componentes base reutilizables |
| **Gradientes** | 680+ diferentes | 6 corporativos |
| **Animaciones** | Manual | Biblioteca centralizada |
| **Border radius** | 4-24px variable | 6 valores fijos |
| **Iconos** | 12-64px | 3 tamaños (16, 20, 24px) |

---

## 🏗️ ESTRUCTURA DEL MODAL V2.0

### 1. Uso del Componente Base

```tsx
import { Modal, ModalFooter, Button } from '@/components/base';

const MyModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"                    // sm, md, lg, xl, full
      title="Título del Modal"
      description="Descripción opcional"
      showCloseButton={true}
      closeOnEscape={true}
      closeOnBackdrop={true}
      footer={
        <ModalFooter align="right">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar
          </Button>
        </ModalFooter>
      }
    >
      {/* Contenido del modal */}
    </Modal>
  );
};
```

### 2. Backdrop (Automático)

El componente `<Modal>` incluye automáticamente:
- ✅ Backdrop con `bg-black/50`
- ✅ Blur: `backdrop-blur-md`
- ✅ Animación FADE_IN (0.2s)
- ✅ Click outside para cerrar (configurable)
- ✅ Z-index: 50

### 3. Container (Automático)

El componente incluye:
- ✅ Animación SCALE_IN con ease smooth
- ✅ Border radius: `rounded-2xl` (24px)
- ✅ Shadow: `shadow-2xl`
- ✅ Max height: `92vh`
- ✅ Scroll interno automático
- ✅ Border sutil: `border-neutral-100 dark:border-neutral-700`

---

## 🎨 SISTEMA DE COLORES V2.0

### Colores Neutrales (antes slate/gray):

```tsx
// ✅ CORRECTO (V2.0)
bg-neutral-50        // Backgrounds muy claros
bg-neutral-100       // Surface claro
bg-neutral-800       // Backgrounds oscuros
text-neutral-900     // Texto principal
text-neutral-600     // Texto secundario
border-neutral-200   // Borders sutiles

// ❌ EVITAR (V1.0 legacy)
bg-slate-50 / bg-gray-50
dark:bg-gray-900
text-slate-900
border-slate-200
```

### Colores de Estado:

```tsx
// Success
bg-success-500, text-success-700, border-success-300

// Warning
bg-warning-500, text-warning-700, border-warning-300

// Error
bg-error-500, text-error-700, border-error-300

// Info
bg-info-500, text-info-700, border-info-300

// Primary (acción principal)
bg-primary-500, text-primary-700, border-primary-300

// Accent (destacados)
bg-accent-500, text-accent-700, border-accent-300
```

---

## ✨ ANIMACIONES CORPORATIVAS

### Variantes Predefinidas:

```tsx
import { 
  SCALE_IN,          // Modales
  FADE_IN,           // Elementos simples
  SLIDE_UP,          // Tooltips, notificaciones
  SPRING_POP,        // Iconos, badges
  COLLAPSE,          // Acordeones
  createStagger,     // Listas
} from '@/styles/tokens';

// Uso:
<motion.div {...SCALE_IN}>
  Modal animado
</motion.div>
```

### Duraciones Estandarizadas:

```tsx
import { ANIMATION_DURATIONS } from '@/styles/tokens';

// instant: 0.1s - Micro-interactions
// fast: 0.2s    - Hover effects
// normal: 0.3s  - Default (modales)
// slow: 0.4s    - Sidebars grandes
```

---

## 🧩 SECCIONES DEL MODAL

### Con Componente Base (Recomendado):

```tsx
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Información Personal"
  size="lg"
>
  {/* Sección 1 */}
  <div className="mb-6">
    <div className="flex items-center space-x-2 mb-4">
      <div className="w-1 h-5 bg-gradient-to-b from-primary-500 to-accent-500 rounded-full"></div>
      <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
        Datos Personales
      </h4>
    </div>
    
    <div className="space-y-3">
      <Input label="Nombre completo" placeholder="Juan Pérez" />
      <Input label="Email" type="email" placeholder="juan@ejemplo.com" />
    </div>
  </div>

  {/* Sección 2 */}
  <div className="mb-6">
    <div className="flex items-center space-x-2 mb-4">
      <div className="w-1 h-5 bg-gradient-to-b from-success-500 to-info-500 rounded-full"></div>
      <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
        Configuración
      </h4>
    </div>
    
    <div className="space-y-3">
      <Input label="Teléfono" placeholder="+52 123 456 7890" />
    </div>
  </div>
</Modal>
```

### Barras de Sección (Section Dividers):

```tsx
<div className="flex items-center space-x-2 mb-4">
  <div className="w-1 h-5 bg-gradient-to-b from-primary-500 to-accent-500 rounded-full"></div>
  <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
    Título de Sección
  </h4>
</div>
```

**Gradientes por Sección (Sugeridos):**
- Información Personal: `from-primary-500 to-accent-500`
- Roles y Permisos: `from-accent-500 to-primary-600`
- Configuración: `from-success-500 to-info-500`
- Datos Técnicos: `from-info-500 to-primary-500`

---

## 🎨 COMPONENTES EN MODALES

### Botones en Footer:

```tsx
<Modal
  footer={
    <ModalFooter align="right">
      <Button variant="secondary" onClick={onClose}>
        Cancelar
      </Button>
      <Button onClick={handleSave} loading={isSaving}>
        Guardar
      </Button>
    </ModalFooter>
  }
>
  {/* Contenido */}
</Modal>
```

### Inputs con Validación:

```tsx
<Input 
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  errorMessage={emailError}
  leftIcon={<Mail className="w-5 h-5" />}
/>

<Input 
  label="Contraseña"
  type="password"
  variant="success"
  helperText="Contraseña válida"
/>
```

### Badges de Estado:

```tsx
<div className="flex items-center gap-2">
  <Badge variant="success" dot>Activo</Badge>
  <Badge variant="warning">Pendiente</Badge>
  <Badge variant="error" removable onRemove={handleRemove}>
    Error
  </Badge>
</div>
```

### Cards Internas:

```tsx
<Card variant="outlined" size="sm">
  <CardHeader>
    <CardTitle>Información Adicional</CardTitle>
  </CardHeader>
  <CardContent>
    Contenido de la card interna
  </CardContent>
</Card>
```

---

## 📐 TAMAÑOS Y FORMAS

### Border Radius (6 valores):

```tsx
rounded-md    // 12px - Default para la mayoría
rounded-lg    // 16px - Modales, cards grandes
rounded-xl    // 20px - Elementos destacados
rounded-2xl   // 24px - Modales principales
rounded-full  // 9999px - Avatares, pills
```

### Iconos (3 tamaños):

```tsx
className="w-4 h-4"   // 16px - Inline text, badges
className="w-5 h-5"   // 20px - Botones, labels (DEFAULT)
className="w-6 h-6"   // 24px - Headers, títulos
```

### Shadows:

```tsx
shadow-sm    // Sutil
shadow-md    // Normal
shadow-lg    // Elevado
shadow-xl    // Destacado
shadow-2xl   // Modales
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Al crear un modal nuevo:

- [ ] Usar componente `<Modal>` base
- [ ] Colores neutrales (neutral-*) en vez de slate/gray
- [ ] Iconos de 16-24px según contexto
- [ ] Botones con componente `<Button>`
- [ ] Inputs con componente `<Input>`
- [ ] Badges con componente `<Badge>`
- [ ] Barras de sección con gradientes corporativos
- [ ] Animaciones de la biblioteca (SCALE_IN, FADE_IN, etc.)
- [ ] Footer con `<ModalFooter>` y alineación
- [ ] Testing en 3 temas (light, dark, twilight)

---

## 🌗 SOPORTE DE TEMAS

### Tema Light:
```tsx
bg-white
text-neutral-900
border-neutral-200
```

### Tema Dark:
```tsx
dark:bg-neutral-800
dark:text-white
dark:border-neutral-700
```

### Tema Twilight (NUEVO):
```tsx
// Automático con data-theme="twilight"
// Colores intermedios entre light y dark
// Ver: src/styles/tokens/colors.ts → TWILIGHT_COLORS
```

---

## 📚 EJEMPLOS COMPLETOS

### Modal Simple:

```tsx
import { Modal, Button } from '@/components/base';

const SimpleModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirmación"
      description="¿Estás seguro de realizar esta acción?"
      footer={
        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>No</Button>
          <Button onClick={handleConfirm}>Sí, continuar</Button>
        </ModalFooter>
      }
    >
      <p className="text-neutral-600 dark:text-neutral-400">
        Esta acción no se puede deshacer.
      </p>
    </Modal>
  );
};
```

### Modal con Formulario:

```tsx
import { Modal, Input, Button, ModalFooter } from '@/components/base';

const FormModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({});

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Editar Usuario"
      description="Actualiza la información del usuario"
      footer={
        <ModalFooter align="right">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={isSaving} onClick={handleSave}>
            Guardar
          </Button>
        </ModalFooter>
      }
    >
      <div className="space-y-4">
        <Input 
          label="Nombre completo"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          errorMessage={errors.name}
          leftIcon={<User className="w-5 h-5" />}
        />
        
        <Input 
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          errorMessage={errors.email}
          leftIcon={<Mail className="w-5 h-5" />}
        />
      </div>
    </Modal>
  );
};
```

### Modal con Secciones:

```tsx
import { Modal, Input, Badge, ModalFooter, Button } from '@/components/base';

const SectionsModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Información Completa"
      footer={
        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </ModalFooter>
      }
    >
      {/* Sección 1: Información Personal */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-1 h-5 bg-gradient-to-b from-primary-500 to-accent-500 rounded-full"></div>
          <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
            Información Personal
          </h4>
        </div>
        
        <div className="space-y-3">
          <Input label="Nombre" placeholder="Juan Pérez" />
          <Input label="Email" type="email" />
          <div className="flex items-center gap-2">
            <Badge variant="success" dot>Activo</Badge>
            <Badge variant="info">Verificado</Badge>
          </div>
        </div>
      </div>

      {/* Sección 2: Configuración */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-1 h-5 bg-gradient-to-b from-success-500 to-info-500 rounded-full"></div>
          <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
            Configuración
          </h4>
        </div>
        
        <div className="space-y-3">
          <Input label="Teléfono" placeholder="+52 123 456 7890" />
          <Input label="Departamento" placeholder="Ventas" />
        </div>
      </div>
    </Modal>
  );
};
```

---

## 🎯 GRADIENTES CORPORATIVOS

### Solo 6 Gradientes Autorizados:

```tsx
import { GRADIENTS } from '@/styles/tokens';

// Gradiente primario (Indigo suave)
bg-gradient-primary   o   style={{ background: GRADIENTS.primary }}

// Gradiente de acento (Purple sutil)
bg-gradient-accent    o   style={{ background: GRADIENTS.accent }}

// Gradiente de éxito (Emerald profesional)
bg-gradient-success   o   style={{ background: GRADIENTS.success }}

// Gradiente de advertencia (Amber contenido)
bg-gradient-warning   o   style={{ background: GRADIENTS.warning }}

// Gradiente informativo (Blue moderado)
bg-gradient-info      o   style={{ background: GRADIENTS.info }}

// Gradiente neutral (Grises elegantes)
bg-gradient-neutral   o   style={{ background: GRADIENTS.neutral }}
```

### Uso en Barras de Sección:

```tsx
// Información Personal
<div className="w-1 h-5 bg-gradient-to-b from-primary-500 to-accent-500 rounded-full"></div>

// Roles y Permisos
<div className="w-1 h-5 bg-gradient-to-b from-accent-500 to-primary-600 rounded-full"></div>

// Información Profesional
<div className="w-1 h-5 bg-gradient-to-b from-success-500 to-info-500 rounded-full"></div>

// Fuentes de Análisis
<div className="w-1 h-5 bg-gradient-to-b from-info-500 to-primary-500 rounded-full"></div>
```

---

## 📝 PATRONES DE CÓDIGO V2.0

### Estructura Completa de un Modal:

```tsx
import { Modal, ModalFooter, Button, Input, Badge } from '@/components/base';
import { GRADIENTS } from '@/styles/tokens';

const MyModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Título del Modal"
      description="Descripción breve"
      footer={
        <ModalFooter align="right">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={loading} onClick={handleSave}>
            Guardar
          </Button>
        </ModalFooter>
      }
    >
      {/* Sección con barra de color */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-1 h-5 bg-gradient-to-b from-primary-500 to-accent-500 rounded-full"></div>
          <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
            Sección
          </h4>
        </div>
        
        <div className="space-y-3">
          <Input label="Campo 1" />
          <Input label="Campo 2" />
        </div>
      </div>
    </Modal>
  );
};
```

---

## 🎭 ANIMACIONES

### Delays Escalonados:

```tsx
import { createStagger } from '@/styles/tokens';

// En una lista de elementos
{items.map((item, index) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={createStagger(index)}
  >
    {item.content}
  </motion.div>
))}
```

### Spring Physics:

```tsx
import { SPRING_PHYSICS } from '@/styles/tokens';

<motion.button
  whileTap={{ scale: 0.98 }}
  transition={SPRING_PHYSICS.normal}
>
  Botón
</motion.button>
```

---

## 🔄 MIGRACIÓN DE MODALES LEGACY

### Paso 1: Identificar Estructura

```tsx
// ❌ LEGACY
<div className="fixed inset-0 bg-black/50 backdrop-blur-md...">
  <div className="bg-white dark:bg-gray-900 rounded-2xl...">
    {/* Header custom */}
    {/* Content custom */}
    {/* Footer custom */}
  </div>
</div>
```

### Paso 2: Usar Componente Base

```tsx
// ✅ V2.0
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="..."
  footer={<ModalFooter>...</ModalFooter>}
>
  {/* Solo el contenido */}
</Modal>
```

### Paso 3: Actualizar Colores

```diff
- bg-slate-50        → bg-neutral-50
- dark:bg-gray-900   → dark:bg-neutral-900
- text-slate-900     → text-neutral-900
- border-slate-200   → border-neutral-200
```

### Paso 4: Usar Componentes

```diff
- <button className="px-4 py-2 bg-blue-500...">
+ <Button>Guardar</Button>

- <div className="bg-white border rounded-lg p-6...">
+ <Card variant="elevated">

- <input className="w-full px-4 py-2 border...">
+ <Input label="Campo" />
```

---

## ✅ CHECKLIST FINAL

### Al implementar un modal:

- [ ] Usar componente `<Modal>` base
- [ ] Título y descripción en props del Modal
- [ ] Footer con `<ModalFooter>` y componentes `<Button>`
- [ ] Inputs con componente `<Input>`
- [ ] Badges con componente `<Badge>`
- [ ] Cards internas con componente `<Card>`
- [ ] Colores neutrales (neutral-*)
- [ ] Gradientes corporativos (6 autorizados)
- [ ] Iconos de 16-24px
- [ ] Border radius homologado
- [ ] Animaciones de la biblioteca
- [ ] Testing en 3 temas

---

## 📚 REFERENCIAS

- **Componentes Base:** `src/components/base/`
- **Tokens de Diseño:** `src/styles/tokens/`
- **Hook de Tokens:** `src/hooks/useDesignTokens.ts`
- **Auditoría Completa:** `docs/DESIGN_SYSTEM_AUDIT_2025.md`
- **Guía V1.0 (Legacy):** Workspace rules (referencia histórica)

---

## 🔄 VERSIONES

| Versión | Fecha | Cambios |
|---------|-------|---------|
| **V2.0** | 2025-01-26 | Sistema de componentes base, tokens de diseño, 3 temas |
| **V1.0** | 2024 | Guía original (workspace rules) |

---

**Versión Actual:** 2.0.0  
**Fecha:** 26 de Enero 2025  
**Estado:** ✅ Aprobada y en producción  
**Compatibilidad:** React 19 + Tailwind 3 + Framer Motion 11

---

**Creado por:** AI Assistant  
**Proyecto:** PQNC QA AI Platform

