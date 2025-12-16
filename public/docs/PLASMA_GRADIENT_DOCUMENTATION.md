# Documentación: Gradiente Plasma para Sidebars de Prospectos

## 📋 Índice
1. [Descripción General](#descripción-general)
2. [Estructura del Gradiente](#estructura-del-gradiante)
3. [Sistema de Animación](#sistema-de-animación)
4. [Implementación Técnica](#implementación-técnica)
5. [Aplicación en Componentes](#aplicación-en-componentes)

---

## 🎨 Descripción General

El gradiente plasma es un efecto visual avanzado que crea un fondo animado con movimiento fluido tipo plasma para los headers de los sidebars de prospectos. Este efecto proporciona profundidad visual y un aspecto moderno sin distraer del contenido principal.

### Características Principales
- **Movimiento suave y difuminado**: Efecto tipo plasma con múltiples capas
- **Animación continua**: Movimiento infinito y fluido
- **Alto rendimiento**: Optimizado con CSS puro (sin JavaScript)
- **Responsive**: Se adapta a diferentes tamaños de pantalla

---

## 🏗️ Estructura del Gradiente

### Capa Base (`.plasma-gradient-header`)

El gradiente base utiliza tonos azules oscuros con variaciones sutiles:

```css
background: linear-gradient(
  135deg,
  #1e293b 0%,    /* slate-800 - Azul oscuro base */
  #1e3a8a 20%,   /* blue-900 - Azul más intenso */
  #1e293b 40%,   /* slate-800 - Retorno al base */
  #1e3a8a 60%,   /* blue-900 - Azul intenso */
  #1e293b 80%,   /* slate-800 - Retorno al base */
  #1e3a8a 100%   /* blue-900 - Final intenso */
);
```

**Características:**
- **Ángulo**: 135 grados (diagonal de arriba-izquierda a abajo-derecha)
- **Tamaño**: `200% 200%` (más grande que el contenedor para permitir movimiento)
- **Colores**: Alternancia entre `slate-800` (#1e293b) y `blue-900` (#1e3a8a)

### Capa Intermedia (`::before`)

Capa de superposición con gradiente lineal y rotación:

```css
background: linear-gradient(
  45deg,
  rgba(30, 41, 59, 0.6) 0%,      /* slate-800 con 60% opacidad */
  rgba(30, 58, 138, 0.4) 25%,    /* blue-900 con 40% opacidad */
  rgba(30, 41, 59, 0.6) 50%,     /* slate-800 con 60% opacidad */
  rgba(30, 58, 138, 0.4) 75%,    /* blue-900 con 40% opacidad */
  rgba(30, 41, 59, 0.6) 100%     /* slate-800 con 60% opacidad */
);
```

**Características:**
- **Ángulo**: 45 grados (diagonal opuesta a la capa base)
- **Opacidad**: 0.7 (70% de opacidad total)
- **Blur**: `blur(15px)` para efecto difuminado
- **Tamaño**: `200% 200%` (extendido para movimiento)
- **Posición**: `top: -50%, left: -50%` (centrado con overflow)

### Capa Superior (`::after`)

Capa radial para efectos de luz y profundidad:

```css
background: radial-gradient(
  ellipse at center,
  rgba(59, 130, 246, 0.4) 0%,      /* blue-500 con 40% opacidad */
  rgba(30, 58, 138, 0.2) 30%,       /* blue-900 con 20% opacidad */
  transparent 60%                    /* Transparente desde el 60% */
);
```

**Características:**
- **Tipo**: Radial (elipse desde el centro)
- **Blur**: `blur(25px)` (más difuminado que `::before`)
- **Tamaño**: `150% 150%`
- **Posición**: `top: -50%, right: -50%` (desde esquina superior derecha)

---

## ✨ Sistema de Animación

### Keyframes Principales

#### 1. `plasma-move-x-fast` (Movimiento Horizontal Rápido)

```css
@keyframes plasma-move-x-fast {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
```

**Uso**: Capa base principal
- **Duración**: 1.5 segundos
- **Easing**: `ease-in-out`
- **Repetición**: Infinita
- **Efecto**: Movimiento horizontal suave de izquierda a derecha

#### 2. `plasma-move-y` (Movimiento Vertical)

```css
@keyframes plasma-move-y {
  0% {
    background-position: 50% 0%;
  }
  50% {
    background-position: 50% 100%;
  }
  100% {
    background-position: 50% 0%;
  }
}
```

**Uso**: Capa `::after` (radial)
- **Duración**: 2.5 segundos
- **Easing**: `ease-in-out`
- **Repetición**: Infinita
- **Efecto**: Movimiento vertical de arriba a abajo

#### 3. `plasma-rotate` (Rotación Continua)

```css
@keyframes plasma-rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
```

**Uso**: Capas `::before` y `::after`
- **Duración**: 8s (`::before`) y 10s (`::after`)
- **Easing**: `linear` (velocidad constante)
- **Repetición**: Infinita
- **Efecto**: Rotación completa continua

### Aplicación de Animaciones

#### Capa Base
```css
animation: plasma-move-x-fast 1.5s ease-in-out infinite;
```

#### Capa `::before`
```css
animation: 
  plasma-move-x-fast 2s ease-in-out infinite reverse,  /* Movimiento inverso */
  plasma-rotate 8s linear infinite;                    /* Rotación */
```

#### Capa `::after`
```css
animation: 
  plasma-move-y 2.5s ease-in-out infinite,              /* Movimiento vertical */
  plasma-rotate 10s linear infinite reverse;           /* Rotación inversa */
```

### Efectos Combinados

Las tres capas trabajan juntas para crear el efecto plasma:

1. **Capa Base**: Movimiento horizontal rápido (1.5s)
2. **Capa `::before`**: Movimiento horizontal inverso (2s) + rotación (8s)
3. **Capa `::after`**: Movimiento vertical (2.5s) + rotación inversa (10s)

**Resultado**: Movimiento orgánico tipo plasma con múltiples direcciones y velocidades diferentes.

---

## 🔧 Implementación Técnica

### Estructura CSS Completa

```css
.plasma-gradient-header {
  /* Capa base */
  background: linear-gradient(135deg, #1e293b 0%, #1e3a8a 20%, ...) !important;
  background-size: 200% 200% !important;
  animation: plasma-move-x-fast 1.5s ease-in-out infinite !important;
  position: relative !important;
  overflow: hidden !important;
}

.plasma-gradient-header::before {
  /* Capa intermedia */
  content: '' !important;
  position: absolute !important;
  top: -50% !important;
  left: -50% !important;
  width: 200% !important;
  height: 200% !important;
  background: linear-gradient(45deg, ...) !important;
  background-size: 200% 200% !important;
  animation: plasma-move-x-fast 2s ease-in-out infinite reverse, 
             plasma-rotate 8s linear infinite !important;
  opacity: 0.7 !important;
  pointer-events: none !important;
  z-index: 0 !important;
  filter: blur(15px) !important;
}

.plasma-gradient-header::after {
  /* Capa superior */
  content: '' !important;
  position: absolute !important;
  top: -50% !important;
  right: -50% !important;
  width: 200% !important;
  height: 200% !important;
  background: radial-gradient(...) !important;
  background-size: 150% 150% !important;
  animation: plasma-move-y 2.5s ease-in-out infinite, 
             plasma-rotate 10s linear infinite reverse !important;
  pointer-events: none !important;
  z-index: 0 !important;
  filter: blur(25px) !important;
}
```

### Uso de `!important`

Todas las propiedades críticas usan `!important` para:
- **Asegurar aplicación**: Sobrescribir estilos de Tailwind CSS
- **Prioridad**: Garantizar que el efecto se aplique correctamente
- **Consistencia**: Evitar conflictos con otros estilos

### Optimizaciones de Rendimiento

1. **CSS Puro**: Sin JavaScript, mejor rendimiento
2. **GPU Acceleration**: `transform` y `opacity` usan aceleración por hardware
3. **`will-change`**: No necesario (las animaciones son simples)
4. **`pointer-events: none`**: Las capas no interfieren con la interacción

---

## 📱 Aplicación en Componentes

### Componentes que Usan el Gradiente Plasma

1. **`ProspectosManager.tsx`** - Sidebar de prospectos en módulo principal
2. **`ProspectDetailSidebar.tsx`** - Sidebar de detalle en Live Chat
3. **`LiveMonitorKanban.tsx`** - Sidebar en AI Call Monitor
4. **`ProspectoSidebar.tsx`** - Sidebar en Scheduled Calls

### Implementación en React

```tsx
<div className="flex items-center justify-between p-6 border-b border-white/10 plasma-gradient-header relative">
  {/* Contenido del header */}
  <div className="flex items-center gap-4 relative z-10">
    {/* Avatar y título */}
  </div>
  {/* Botones de acción */}
</div>
```

### Consideraciones de Z-Index

- **Capa base**: `z-index: auto` (por defecto)
- **Capa `::before`**: `z-index: 0`
- **Capa `::after`**: `z-index: 0`
- **Contenido**: `z-index: 10` (debe estar por encima de las capas)

---

## 🎯 Personalización

### Cambiar Velocidad de Animación

Para hacer la animación más rápida o lenta, ajusta las duraciones:

```css
/* Más rápido */
animation: plasma-move-x-fast 1s ease-in-out infinite;

/* Más lento */
animation: plasma-move-x-fast 3s ease-in-out infinite;
```

### Cambiar Colores

Para usar diferentes colores, modifica los valores hex en el gradiente:

```css
background: linear-gradient(
  135deg,
  #nuevo-color-1 0%,
  #nuevo-color-2 20%,
  ...
);
```

### Ajustar Intensidad del Blur

```css
/* Más difuminado */
filter: blur(30px) !important;

/* Menos difuminado */
filter: blur(10px) !important;
```

---

## 📚 Referencias

- **Archivo CSS**: `src/index.css` (líneas 7-116)
- **Tailwind Colors**: https://tailwindcss.com/docs/customizing-colors
- **CSS Animations**: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations

---

## 🔄 Versión

**Versión**: 1.0.0  
**Última actualización**: Enero 2025  
**Autor**: Sistema de Diseño PQNC QA AI Platform

