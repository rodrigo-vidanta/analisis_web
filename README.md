# PQNC QA AI Platform - v1.0.13 🚀

**Plataforma Avanzada de Análisis de Calidad de Llamadas con IA**

Sistema completo de construcción y análisis de agentes de IA con dashboard avanzado de análisis de llamadas PQNC Humans, incluyendo **sistema de retroalimentación**, **visualización completa de datos JSONB**, y **herramientas de productividad**.

---

## 🎯 **Funcionalidades Principales**

### 💬 **Sistema de Retroalimentación** (v1.0)
- **Modal de retroalimentación** con validación de 1500 caracteres
- **Botón dinámico** en análisis detallado (azul → verde)
- **Columna "Retro"** en tabla con tooltips de preview
- **Historial completo** de cambios con versioning
- **Base de datos** con 3 tablas relacionadas

### 🔍 **Visualización Completa de Datos JSONB** (v3.0)
- **UniversalDataView**: Componente revolucionario para mostrar TODOS los datos
- **8 campos JSONB completos**: comunicacion_data, customer_data, service_offered, agent_performance, script_analysis, call_evaluation, compliance_data, customer_quality
- **Secciones colapsables** con highlights cuando están cerradas
- **Manejo inteligente**: null → "No especificado", booleans → ✓/✗, arrays → chips
- **Indicadores visuales** y botón expandir/colapsar todo

### 🔧 **Mejoras de Productividad** (v2.0)
- **Sorting de columnas**: Ascendente/descendente en tabla de llamadas
- **Fecha/hora completa**: Formato DD/MM/YY + hora 12h
- **Sistema de bookmarks**: 5 colores personalizados por usuario
- **Filtros avanzados**: Por color de bookmark con contadores
- **Persistencia local**: Fallback con localStorage

---

## 🛠️ **Tecnologías**

- **React 18.3.1** + **TypeScript 5.5.3**
- **Vite 6.0.5** - Build tool optimizado
- **Tailwind CSS 3.4.17** - Styling avanzado con tema dinámico
- **Supabase 2.48.1** - Backend completo (Auth + Database + Storage)
- **Zustand 5.0.2** - State management global
- **Chart.js** - Visualizaciones avanzadas
- **Framer Motion** - Animaciones fluidas

---

## 📊 **Dashboard de Análisis PQNC**

### **Métricas Principales**
- Total llamadas, calidad estándar/ponderada, probabilidad conversión
- **Análisis detallado** con 6 pestañas reorganizadas
- **Visualización completa** de todos los campos JSONB

### **Filtros y Búsqueda**
- **Filtros avanzados**: Fecha, agente, calidad, resultado, dirección, tipo
- **Búsqueda inteligente**: Agente, cliente, ID, resultado, calidad, texto libre
- **Filtros por bookmark**: Por color con contadores
- **Top Records**: 10, 30, 50, 100, 200 registros

### **Tabla Mejorada**
- **Sorting**: Todas las columnas ordenables ascendente/descendente
- **Fecha/hora**: Formato completo DD/MM/YY + hora 12h
- **Columna Retro**: Estados dinámicos con tooltips
- **Columna Bookmarks**: Selector de 5 colores minimalista
- **Iconos elegantes**: Reemplazo de emojis por iconos SVG

---

## 🏗️ **Arquitectura y Componentes**

### **Nuevos Componentes (v3.0)**
```
src/components/analysis/
├── UniversalDataView.tsx      # Visualización avanzada de datos JSONB
├── FeedbackModal.tsx          # Modal de retroalimentación
├── FeedbackTooltip.tsx        # Tooltip de preview
├── BookmarkSelector.tsx       # Selector de bookmarks
└── BookmarkFilter.tsx         # Filtro por bookmarks
```

### **Nuevos Servicios**
```
src/services/
├── feedbackService.ts         # CRUD de retroalimentaciones
└── bookmarkService.ts         # CRUD de bookmarks
```

### **Base de Datos Extendida**
```sql
-- Nuevas tablas
call_feedback                  # Retroalimentaciones principales
call_feedback_history          # Historial de cambios
call_feedback_interactions     # Interacciones de usuarios
call_bookmarks                 # Bookmarks por usuario
```

### **Documentación Completa**
```
docs/
├── DATABASE_README.md         # Estructura completa de BD
├── FEEDBACK_SCHEMA.sql        # Schema de retroalimentaciones
└── BOOKMARKS_SCHEMA.sql       # Schema de bookmarks

CHANGELOG_FEEDBACK.md          # Changelog de retroalimentación
CHANGELOG_MEJORAS_AVANZADAS.md # Changelog de mejoras UX
CHANGELOG_COMPLETO.md          # Changelog completo del proyecto
docs/AGENTS_IMPORT_MAPPING.md  # Mapeo de Vapi JSON a catálogos y BD
```

---

## 📈 **Métricas del Proyecto**

- **📁 Archivos creados**: 8 componentes + 6 documentos
- **📝 Líneas de código**: ~3,200 nuevas
- **🗄️ Tablas de BD**: 4 nuevas
- **⚡ Funciones RPC**: 8 nuevas
- **🎨 Componentes React**: 6 nuevos
- **🔧 Servicios**: 2 nuevos

---

---

## 🔖 **Sistema de Versionado**

### **🚀 Deploy Automático**
```bash
# Deploy con incremento automático de versión
./scripts/deploy.sh "Descripción del cambio"

# Ejemplos:
./scripts/deploy.sh "Fix audio player bug"
./scripts/deploy.sh "Add new filter feature" 
./scripts/deploy.sh "Update dashboard design"
```

### **📋 Verificar Versión**
```bash
# Ver información actual de versión
./scripts/version-info.sh
```

### **🏷️ Versionado Manual Avanzado**
```bash
# Para cambios mayores
./scripts/version-and-deploy.sh patch "Bug fixes"     # 1.0.3 → 1.0.4
./scripts/version-and-deploy.sh minor "New features" # 1.0.3 → 1.1.0  
./scripts/version-and-deploy.sh major "Breaking"     # 1.0.3 → 2.0.0
```

### **📦 Control de Versión:**
- **Fuente**: `package.json` - Versión real del desarrollo
- **Automático**: Incremento en cada deploy
- **Git tags**: Creación automática de tags
- **Changelog**: Actualización automática con timestamp
- **Footer**: Muestra versión dinámica en la aplicación

---

## 🚀 **Instalación y Configuración**

### **Variables de Entorno**
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
