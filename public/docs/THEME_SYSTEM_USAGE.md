# 🎨 Sistema de Temas Global - Guía de Uso

---

## 📦 QUÉ ES

Un sistema centralizado de estilos basado en **variables CSS** que:
- ✅ Gestiona todos los colores desde un solo archivo
- ✅ Permite agregar temas fácilmente
- ✅ Grupos de estilos predefinidos
- ✅ Escalable y mantenible

---

## 📂 ARCHIVOS

```
src/styles/theme-system.css  ← Sistema completo de variables
src/index.css                ← Import del sistema
```

---

## 🎨 VARIABLES DISPONIBLES

### Backgrounds:
```css
--app-bg-primary      /* Fondo principal de la app */
--app-bg-secondary    /* Cards, modales, surfaces */
--app-bg-tertiary     /* Hover, disabled states */
--app-bg-sidebar      /* Sidebar específico */
--app-bg-header       /* Header específico */
```

### Textos:
```css
--app-text-primary    /* Texto principal, títulos */
--app-text-secondary  /* Texto normal, párrafos */
--app-text-muted      /* Texto desactivado, hints */
--app-text-inverse    /* Texto en fondos oscuros */
```

### Borders:
```css
--app-border-light    /* Borders sutiles */
--app-border-normal   /* Borders normales */
--app-border-strong   /* Borders destacados */
```

### Shadows:
```css
--app-shadow-sm
--app-shadow-md
--app-shadow-lg
```

---

## 🔧 CÓMO USAR

### Opción 1: Variables CSS (Recomendado)
```tsx
<div style={{ backgroundColor: 'var(--app-bg-secondary)' }}>
  Card
</div>

<p style={{ color: 'var(--app-text-primary)' }}>
  Texto
</p>
```

### Opción 2: Clases de Utilidad
```tsx
<div className="theme-bg-secondary theme-text-primary theme-border-normal">
  Card con clases predefinidas
</div>
```

### Opción 3: Clases Automáticas (Ya aplicadas)
Las clases de Tailwind se mapean automáticamente:
```tsx
<div className="bg-white">  {/* Se convierte en var(--app-bg-secondary) */}
<p className="text-gray-900">  {/* Se convierte en var(--app-text-primary) */}
<div className="border-gray-200">  {/* Se convierte en var(--app-border-normal) */}
```

---

## ➕ AGREGAR NUEVO TEMA

### Paso 1: Definir Variables
```css
/* En theme-system.css */
.mi-nuevo-tema {
  --app-bg-primary: #tu-color;
  --app-bg-secondary: #tu-color;
  --app-bg-tertiary: #tu-color;
  --app-bg-sidebar: #tu-color;
  --app-bg-header: #tu-color;
  
  --app-text-primary: #tu-color;
  --app-text-secondary: #tu-color;
  --app-text-muted: #tu-color;
  --app-text-inverse: #tu-color;
  
  --app-border-light: #tu-color;
  --app-border-normal: #tu-color;
  --app-border-strong: #tu-color;
  
  --app-shadow-sm: ...;
  --app-shadow-md: ...;
  --app-shadow-lg: ...;
}
```

### Paso 2: Aplicar Clase al HTML
```typescript
// En useTheme.ts o donde manejes temas
document.documentElement.classList.add('mi-nuevo-tema');
```

### Paso 3: ¡Listo!
Todos los componentes automáticamente usan los nuevos colores.

---

## 📋 GRUPOS DE ESTILOS PREDEFINIDOS

### Backgrounds:
```css
.theme-bg-primary    → var(--app-bg-primary)
.theme-bg-secondary  → var(--app-bg-secondary)
.theme-bg-tertiary   → var(--app-bg-tertiary)
.theme-bg-sidebar    → var(--app-bg-sidebar)
.theme-bg-header     → var(--app-bg-header)
```

### Textos:
```css
.theme-text-primary   → var(--app-text-primary)
.theme-text-secondary → var(--app-text-secondary)
.theme-text-muted     → var(--app-text-muted)
.theme-text-inverse   → var(--app-text-inverse)
```

### Borders:
```css
.theme-border-light  → var(--app-border-light)
.theme-border-normal → var(--app-border-normal)
.theme-border-strong → var(--app-border-strong)
```

### Shadows:
```css
.theme-shadow-sm → var(--app-shadow-sm)
.theme-shadow-md → var(--app-shadow-md)
.theme-shadow-lg → var(--app-shadow-lg)
```

### Componentes:
```css
.sidebar-container  → Estilos completos de sidebar
.header-container   → Estilos completos de header
.card-base          → Estilos completos de card
.modal-content      → Estilos completos de modal
.input-base         → Estilos completos de input
.button-secondary   → Estilos completos de button
```

---

## 🎯 EJEMPLO COMPLETO

### Antes (difícil de mantener):
```tsx
<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
  <h2 className="text-gray-900 dark:text-white">Título</h2>
  <p className="text-gray-600 dark:text-gray-400">Descripción</p>
</div>
```

### Después (fácil de mantener):
```tsx
<div className="theme-bg-secondary theme-border-normal">
  <h2 className="theme-text-primary">Título</h2>
  <p className="theme-text-secondary">Descripción</p>
</div>
```

O con clases automáticas (aún más simple):
```tsx
<div className="bg-white border-gray-200">
  <h2 className="text-gray-900">Título</h2>
  <p className="text-gray-600">Descripción</p>
</div>
```

---

## ✅ BENEFICIOS

1. **Centralizado:** Todos los colores en un archivo
2. **Escalable:** Agregar temas es trivial
3. **Automático:** Clases de Tailwind se mapean automáticamente
4. **Mantenible:** Cambios en un solo lugar
5. **Consistente:** Mismo sistema en toda la app

---

## 🚀 PRÓXIMOS PASOS

1. ✅ Sistema creado (`theme-system.css`)
2. ✅ Importado en `index.css`
3. ⏳ Verificar que funcione en Light/Dark
4. ⏳ Habilitar Twilight cuando esté probado
5. ⏳ Migrar componentes críticos a clases theme-*

---

**Fecha:** 26 de Enero 2025  
**Estado:** Sistema creado, listo para usar

