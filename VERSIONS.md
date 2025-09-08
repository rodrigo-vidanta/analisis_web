# Control de Versiones - PQNC QA AI Platform

## Versión 1.0.12 (Enero 2025)

### Optimización de Animaciones y UX de Login
- **Animación ultra fluida**: LightSpeedTunnel optimizado con 10 micro-pasos y solapamiento 96%
- **Velocidad equilibrada**: 1.5s total, ni muy rápido ni muy lento
- **Transiciones suaves**: Curvas bezier naturales [0.25, 0.1, 0.25, 1]
- **Logo aumentado**: 43% más grande (160px) para mayor presencia visual
- **UX mejorada**: Experiencia de login más profesional y suave

### Archivos Modificados
- `LightSpeedTunnel.tsx` - Animación ultra fluida con micro-transiciones
- `LoginScreen.tsx` - Logo aumentado 40% manteniendo responsive

## Versión 1.0.11 (Enero 2025)

### Eliminación de Score Duplicado en Performance
- **Score duplicado eliminado**: Removida sección "Score_ponderado" duplicada en Performance Completo
- **Evaluación Detallada preservada**: Mantenido el resto de la información importante
- **Filtrado mejorado**: Agregado tanto "Score_ponderado" como "score_ponderado" a exclusiones

### Archivo Modificado
- `UniversalDataView.tsx` - Filtros actualizados para eliminar duplicados, información completa preservada

## Versión 1.0.10 (Enero 2025)

### Optimización Final de Distribución de Columnas
- **Distribución optimizada**: Redistribuido espacio entre columnas según contenido real
- **Duración completa**: Espacio suficiente para formato completo "00:00:00"
- **Nombres más legibles**: Más espacio para agentes con nombres largos
- **Acciones compactas**: Reducido espacio innecesario en botones de acción
- **Secciones expandidas**: Performance Completo expandido por defecto
- **Texto sin sobreposición**: Truncado elegante con tooltips

### Archivos Modificados
- `PQNCDashboard.tsx` - Distribución optimizada de columnas, anchos balanceados
- `UniversalDataView.tsx` - Expansión automática con useEffect, secciones expandidas por defecto

## Versión 1.0.9 (Enero 2025)

### Ajustes Finales de UX/UI y Optimización de Tablas
- **Tabla optimizada**: Columna de duración reemplaza porcentaje de conversión
- **Anchos fijos**: Columnas con anchos fijos para evitar desbordamiento
- **Widgets simplificados**: Eliminado "Calidad Estándar", renombrado "Score Ponderado"
- **Información duplicada**: Eliminado score_ponderado duplicado en performance
- **Secciones limpias**: Eliminados bloques redundantes en análisis detallado
- **Expansión automática**: Secciones críticas expandidas por defecto

### Archivos Modificados
- `PQNCDashboard.tsx` - Tabla mejorada con duración, anchos fijos, widgets optimizados
- `DetailedCallView.tsx` - Eliminación de duplicados, secciones limpias
- `UniversalDataView.tsx` - Expansión automática de secciones críticas

## Versión 1.0.8 (Enero 2025)

### Mejoras de UX/UI y Reorganización de Análisis
- **Sorting global**: El ordenamiento ahora aplica a todos los registros, no solo al top seleccionado
- **Colores suavizados**: Segmentos de conversación con colores menos brillantes y más amigables
- **Reorganización de pestañas**: Mejor estructura y flujo en análisis detallado
- **Iconos vectoriales**: Reemplazo de emojis por iconos SVG adaptativos
- **Widgets optimizados**: Eliminación de widgets redundantes y mejor distribución
- **SyncON reubicado**: Panel movido después de la tabla de llamadas
- **Performance reordenado**: Gráfica al top, performance completo al final expandido
- **Compliance mejorado**: Gráfica movida al top, secciones reorganizadas
- **Customer expandido**: Todo expandido por defecto, métricas redundantes eliminadas

### Archivos Modificados
- `PQNCDashboard.tsx` - Sorting global, widgets optimizados, iconos vectoriales
- `DetailedCallView.tsx` - Colores suavizados, reorganización de pestañas
- `UniversalDataView.tsx` - Filtros contextuales, expansión automática, bordes condicionales

## Versión 1.0.7 (Enero 2025)

### Correcciones Críticas de Importación y Visualización
- **Error 404 en herramientas**: Corregido nombre de tabla `tool_catalog` → `tools_catalog`
- **Roles no separados**: Los roles del squad ahora se muestran organizados por miembro
- **Modo oscuro inconsistente**: Estilos visuales corregidos en sección de parámetros
- **Importación de squads**: Lógica mejorada para preservar estructura de squad
- **Visualización de herramientas**: Herramientas organizadas por miembro del squad
- **UI consistente**: Modo oscuro perfecto en todas las secciones

### Archivos Modificados
- `ImportAgentModal.tsx` - Corrección de tabla y prevención de conflictos
- `SystemMessageEditor.tsx` - Separación de roles por miembro
- `ToolsSelector.tsx` - Herramientas del squad por miembro
- `ParametersEditor.tsx` - Modo oscuro completo
- `AgentCV.tsx` - Información de squad
- `AgentEditor.tsx` - Integración mejorada

## Alpha 1.0 (Enero 2024)

### Tecnologías Principales
- **React**: 18.3.1
- **TypeScript**: ~5.5.3
- **Vite**: ^6.0.5
- **Tailwind CSS**: ^3.4.17
- **Supabase**: ^2.48.1

### Librerías Críticas
- **Zustand**: ^5.0.2 - Estado global de la aplicación
- **@types/react**: ^18.3.17 - Tipado TypeScript para React
- **@types/react-dom**: ^18.3.5 - Tipado TypeScript para React DOM

### Funcionalidades Implementadas

#### Sistema de Autenticación
- Login con Supabase Auth
- Gestión de roles y permisos
- Redirección automática basada en permisos

#### Dashboard de Análisis PQNC
- Visualización de métricas de llamadas
- Filtros avanzados (fecha, agente, calidad, dirección)
- Búsqueda inteligente con múltiples criterios
- Paginación optimizada (máximo 50 elementos por página)
- Sincronización automática de datos

#### Mejoras de UX/UI
- Scroll optimizado sin bounce effect
- Tema claro/oscuro con transiciones suaves
- Responsive design para móviles
- Indicador de progreso de scroll
- Animaciones de entrada suaves

#### Sistema de Widgets (Deshabilitado)
- Configuración de dashboard widgets
- Filtros automáticos por widget
- Sistema de métricas dinámicas
- **Estado**: Deshabilitado por defecto en Alpha 1.0

### Configuraciones Críticas

#### Base de Datos (Supabase)
- Tablas principales configuradas
- RPC functions implementadas
- Row Level Security (RLS) configurado
- Sincronización en tiempo real

#### CSS Personalizado
- Variables de tema dinámicas
- Overscroll behavior configurado
- Scrollbars personalizados
- Gradientes y efectos de glass

#### Gestión de Estado
- Store principal con Zustand
- Estados de autenticación
- Configuración de temas
- Gestión de filtros y paginación

### Configuraciones de Desarrollo
- ESLint configurado
- TypeScript strict mode
- Vite con HMR optimizado
- PostCSS con Tailwind

### Issues Conocidos Resueltos
- Error de sintaxis JSX en PQNCDashboard (línea 1086) - RESUELTO
- Widgets causando filtros ocultos - RESUELTO
- Bounce effect en scroll - RESUELTO
- Métricas inconsistentes entre header y filtros - RESUELTO

### Próximas Versiones
- Alpha 1.1: Constructor de agentes mejorado
- Alpha 1.2: Sistema de plantillas avanzado
- Beta 1.0: Optimizaciones de rendimiento
