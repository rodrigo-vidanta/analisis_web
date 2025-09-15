# Control de Versiones - PQNC QA AI Platform

## Versión 2.0.1 (Enero 2025)

### Debug y Optimizaciones Live Monitor

#### Sistema de Debug Avanzado (NUEVO)
- **Logs detallados**: Troubleshooting completo en Live Monitor
- **Debug de clasificación**: Llamadas activas/finalizadas/fallidas
- **Logs de servicio**: Identificación de problemas de conexión BD
- **Información específica**: call_status y checkpoint por llamada

#### Avatar Real del Usuario (MEJORADO)
- **useUserProfile hook**: Integrado en Academia
- **Avatar real**: Del usuario logueado en perfil y ranking
- **Fallback elegante**: Generador automático si no hay foto
- **Consistencia visual**: Entre todas las vistas

#### Iconografía Modernizada (COMPLETADO)
- **Lucide React**: 16+ emojis reemplazados por iconos vectoriales
- **Escalabilidad perfecta**: En todos los tamaños
- **Profesionalización**: Iconos modernos y elegantes

## Versión 2.0.0 (Enero 2025)

### Academia de Ventas Gamificada - Lanzamiento Mayor

#### Academia de Ventas Completa (NUEVO)
- **Sistema tipo Duolingo**: Para entrenamiento de vendedores
- **3 niveles progresivos**: Fundamentos, Conexión, Beneficios
- **Llamadas virtuales**: Integración VAPI con asistentes IA
- **Gamificación avanzada**: XP, logros, ranking, racha
- **Panel administrativo**: Gestión de contenido y asistentes

## Versión 1.0.16 (Septiembre 2025)

### Live Monitor Kanban - Rediseño Completo por Checkpoints

#### Vista Kanban por Proceso de Venta (NUEVO)
- **5 Checkpoints visuales**: Saludo → Conexión → Introducción → Urgencia → Presentación
- **Franjas horizontales**: Sombreado grisáceo progresivo sin líneas verticales
- **Animaciones inteligentes**: Parpadeo más intenso según progreso del checkpoint
- **Actualización en tiempo real**: Movimiento automático entre checkpoints cada 3s

#### Sistema de Pestañas Organizado (REDISEÑADO)
- **Llamadas Activas**: Vista Kanban con 5 columnas por checkpoint
- **Finalizadas**: Llamadas sin feedback que requieren procesamiento
- **Fallidas**: Llamadas no conectadas que requieren feedback
- **Historial**: Llamadas completamente procesadas (solo lectura)

#### Controles de Llamada Funcionales (NUEVO)
- **Transferencia inteligente**: 6 motivos predefinidos contextuales
- **Colgar llamada**: Control directo con feedback obligatorio
- **Webhook integration**: Peticiones a través de Railway backend
- **Sin alertas del navegador**: Feedback modal automático

#### Información Dinámica en Tiempo Real (MEJORADO)
- **Vista miniatura expandida**: Discovery completo con indicadores de actualización
- **Resumen en tiempo real**: Extracción de `datos_llamada.resumen` automática
- **Información prioritaria**: `llamadas_ventas` sobre `prospectos` para datos dinámicos
- **Vista detallada completa**: 3 columnas con información de ambas tablas

#### Mejoras UX y Visuales
- **Modo oscuro corregido**: Textos legibles en todos los estados
- **Feedback específico**: Placeholders contextuales por tipo de acción
- **Layout responsivo**: Aprovecha 95% de pantalla disponible
- **Clasificación inteligente**: Prioriza `call_status` sobre heurísticas

## Versión 1.0.15 (Septiembre 2025)

### Sistema de Permisos Live Monitor Corregido
- **Verificación BD**: Consulta directa a `auth_user_permissions`
- **Evaluators con checkbox**: Acceso basado en localStorage + BD
- **Logs de debugging**: Identificación precisa de problemas de acceso

## Versión 1.0.14 (Enero 2025)

### Módulo Live Monitor Completo y Funcional

#### Live Monitor para Vendedores (NUEVO)
- **Monitor en tiempo real**: Visualización de llamadas activas de IA Natalia
- **Pipeline visual**: Tabla con checkpoints y progreso animado por temperatura
- **Sistema de intervención**: Susurro a IA con razones predefinidas o personalizadas
- **Rotación consecutiva**: Cola de agentes que rota al completar acciones
- **Feedback obligatorio**: Sistema completo de trazabilidad

#### Características Técnicas del Live Monitor
- **Barra de progreso protagonista**: Ancho completo con temperatura integrada
- **Animación de audio elegante**: Ondas concéntricas minimalistas
- **Controles profesionales**: Escuchar, intervenir, colgar, marcar resultado
- **Modal de detalle**: Información completa del prospecto para vendedor
- **Sistema de susurro**: 7 razones predefinidas + campo personalizado

#### Integración y Funcionalidad
- **Base de datos**: Conectado a tabla prospectos en BD pqnc_ai
- **Tiempo real**: Actualización automática cada 10 segundos
- **Responsive**: Diseño adaptable a todos los tamaños
- **Tema oscuro**: Completamente compatible
- **Webhooks preparados**: URLs listas para integración con VAPI

### Archivos Modificados
- `src/components/analysis/LiveMonitor.tsx` - **NUEVO** módulo completo
- `src/services/liveMonitorService.ts` - **NUEVO** servicio de gestión
- `scripts/sql/add-live-monitor-fields.sql` - **NUEVO** script de BD
- `src/components/MainApp.tsx` - Integración del nuevo módulo
- `src/hooks/useAnalysisPermissions.ts` - Permisos para Live Monitor

## Versión 1.0.13 (Enero 2025)

### Reorganización Completa con Sidebar y Sistema de Permisos Avanzado

#### Transformación Arquitectónica Mayor
- **Sidebar colapsable profesional**: Navegación lateral con iconos vectoriales y transiciones fluidas
- **Header simplificado**: Solo usuario, logout y cambio de tema - espacio liberado para futuras funciones
- **Footer fijo**: Siempre visible sin scroll, se ajusta dinámicamente al sidebar
- **Responsividad completa**: Desktop (fijo), tablet/móvil (overlay con backdrop)

#### Sistema de Permisos Granular
- **Módulos independientes**: Natalia IA, PQNC Humans y Live Monitor como módulos separados
- **Rol Vendedor nuevo**: Con acceso específico a PQNC + Live Monitor
- **Evaluadores personalizables**: Permisos individuales via checkboxes funcionales
- **Gestión dinámica**: Sistema híbrido localStorage + funciones RPC para configuración desde interfaz

#### Optimizaciones de Rendimiento
- **12 índices de BD**: Para manejo eficiente de 1.5M registros
- **Filtros de fecha optimizados**: 30 días por defecto, máximo 3 meses
- **Skeleton Loading**: CLS mejorado de 0.62 a ~0.1
- **Métricas globales separadas**: Widgets independientes de filtros de tabla
- **Sincronización optimizada**: 90 segundos vs 30 segundos anterior

#### UX/UI Mejoradas
- **Tema automático**: Detecta preferencia del sistema operativo (claro/oscuro)
- **Sidebar abierto**: Por defecto expandido para mejor accesibilidad
- **Live Monitor**: Nuevo módulo con indicador verde pulsante "en construcción"
- **Navegación inteligente**: Solo muestra módulos con permisos específicos

### Archivos Modificados
- `src/components/Sidebar.tsx` - **NUEVO** componente de navegación lateral
- `src/components/MainApp.tsx` - **REESTRUCTURADO** para layout con sidebar
- `src/components/Header.tsx` - **SIMPLIFICADO** solo funciones esenciales
- `src/components/analysis/PQNCDashboard.tsx` - **OPTIMIZADO** con skeleton loading
- `src/components/admin/UserManagement.tsx` - **PERMISOS MEJORADOS** con checkboxes funcionales
- `src/hooks/useAnalysisPermissions.ts` - **NUEVO** hook para permisos granulares
- `src/contexts/AuthContext.tsx` - **PERMISOS GRANULARES** y funciones específicas
- `docs/PERMISSIONS_SYSTEM_README.md` - **NUEVA** documentación técnica detallada

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
