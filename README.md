# PQNC QA AI Platform - Alpha 1.0

Sistema avanzado de construcción y análisis de agentes de IA con dashboard de análisis de llamadas PQNC Humans.

## Tecnologías Principales

- **React 18.3.1** + **TypeScript 5.5.3**
- **Vite 6.0.5** - Build tool optimizado
- **Tailwind CSS 3.4.17** - Styling avanzado con tema dinámico
- **Supabase 2.48.1** - Backend completo (Auth + Database + Storage)
- **Zustand 5.0.2** - State management global

## Funcionalidades Críticas

### Sistema de Autenticación
- Login con Supabase Auth
- Gestión de roles (admin, developer, user)
- Redirección automática basada en permisos
- Session management persistente

### Dashboard de Análisis PQNC
- **Métricas principales**: Total llamadas, calidad estándar/ponderada, probabilidad conversión
- **Filtros avanzados**: Fecha, agente, calidad, resultado, dirección, tipo de llamada
- **Búsqueda inteligente**: Busca por agente, cliente, ID, resultado, calidad, texto libre
- **Paginación optimizada**: Máximo 50 elementos por página
- **Sincronización automática**: Datos en tiempo real desde Supabase
- **Top Records**: 10, 30, 50, 100, 200 registros

### Mejoras de UX/UI
- **Scroll optimizado**: Sin bounce effect, transiciones suaves
- **Tema dinámico**: Claro/oscuro con variables CSS personalizadas
- **Responsive**: Optimizado para móviles y desktop
- **Animaciones**: Entrada suave, scroll reveal, indicador de progreso
- **Glassmorphism**: Efectos de cristal modernos

## Configuraciones Críticas

### Variables de Entorno
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Base de Datos (Supabase)
- **Tabla principal**: `calls` - Registros de llamadas procesadas
- **RLS configurado**: Row Level Security por organización/usuario
- **RPC functions**: Funciones personalizadas para análisis avanzado
- **Triggers**: Sincronización automática de datos

### CSS Personalizado Crítico
```css
/* Overscroll behavior - Elimina bounce effect */
html {
  overscroll-behavior: none !important;
  background-color: #0f172a !important; /* Modo oscuro por defecto */
}

/* Variables de tema dinámicas */
:root {
  --theme-primary: 59 130 246;
  --theme-gradient-from: 59 130 246;
  --theme-gradient-to: 129 140 248;
}
```

### Estado Global (Zustand)
- **appStore**: Configuración principal, tema, modo de aplicación
- **Persistencia**: localStorage para configuraciones de usuario
- **Estados críticos**: darkMode, appMode, currentStep, projectType

## Instalación y Desarrollo

### Requisitos
- Node.js 18+
- npm 9+
- Cuenta Supabase configurada

### Setup Inicial
```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# Desarrollo
npm run dev

# Build para producción
npm run build
```

### Scripts Disponibles
- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build optimizado
- `npm run preview` - Preview del build
- `npm run lint` - Verificar código

## Estructura del Proyecto

```
src/
├── components/           # Componentes React
│   ├── analysis/        # Dashboard de análisis PQNC
│   ├── admin/           # Panel administrativo
│   └── Header.tsx       # Header principal con navegación
├── contexts/            # Context providers
│   └── AuthContext.tsx  # Autenticación y permisos
├── hooks/               # Custom hooks
│   └── useAuth.ts       # Hook de autenticación
├── stores/              # Estado global Zustand
│   └── appStore.ts      # Store principal de la app
└── index.css           # Estilos globales y variables CSS
```

## Configuraciones de Deployment

### Vite Configuration
- HMR optimizado para desarrollo
- Build optimizado para producción
- Soporte completo para TypeScript

### Tailwind CSS
- Configuración de tema personalizada
- Modo oscuro con class strategy
- Componentes personalizados

### PostCSS
- Autoprefixer para compatibilidad
- Optimización de CSS para producción

## Issues Conocidos Resueltos

### Dashboard de Análisis
- **Widgets ocultos**: Filtros automáticos deshabilitados por defecto
- **Métricas inconsistentes**: Separación entre métricas generales y filtradas
- **Paginación incorrecta**: Corregida para mostrar registros reales
- **Scroll bounce**: Eliminado completamente con CSS optimizado

### Autenticación
- **Redirección automática**: Basada en permisos del usuario
- **Session persistence**: Mantiene login entre recargas
- **Múltiples instancias**: Configuración optimizada de Supabase client

## Siguientes Versiones

### Alpha 1.1
- Constructor de agentes mejorado
- Sistema de plantillas avanzado
- Optimizaciones de rendimiento

### Beta 1.0
- Testing completo
- Documentación técnica avanzada
- Deployment automatizado

## Soporte

Para issues técnicos, revisar:
1. VERSIONS.md - Historial de cambios
2. backup_alpha_1.0/ - Archivos de referencia
3. Logs de Vite en desarrollo