# Control de Versiones - PQNC QA AI Platform

## Versión 5.7.0 (Octubre 2025) - Live Monitor Reactivo + Análisis IA Mejorado

### 🎯 RELEASE MAJOR - Sistema Completamente Reactivo

#### 🔄 Live Monitor Reactivo en Tiempo Real
- **Datos dinámicos**: Composición familiar, actividades y checkpoints se actualizan instantáneamente
- **Reclasificación automática**: Llamadas finalizadas se mueven automáticamente sin intervención manual
- **Sistema preserve**: Evita sobrescritura de datos actualizados por VAPI tools
- **Polling inteligente**: Optimizado para no interferir con updates de Realtime

#### 🧠 Análisis IA - Enfoque Continuidad y Discovery  
- **Métricas actualizadas**: Enfoque en continuidad WhatsApp, discovery familiar y transferencias
- **Gráfica radar calibrada**: Ponderaciones específicas para nuevos criterios de evaluación
- **Agrupamiento colapsado**: Llamadas del mismo prospecto se agrupan para mejor organización
- **Colores universales**: Sistema intuitivo verde=excelente, azul=bueno, rojo=crítico

#### 🛠️ Correcciones Técnicas Críticas
- **Mapeo de datos_proceso**: Solucionado para mostrar datos dinámicos correctamente
- **Clasificación automática**: Basada en razon_finalizacion de datos_llamada
- **Consultas optimizadas**: Incluye todos los campos necesarios para funcionamiento completo
- **Interfaz limpia**: Eliminación de métricas de enfoque anterior (precios, ventas)

---

## Versión 5.6.0 (Octubre 2025) - Live Monitor Optimizado + Documentación de Seguridad

### 🎯 RELEASE FINAL - Live Monitor Completamente Optimizado

#### 🔔 Sistema de Notificaciones Profesional
- **Sonido 4x más audible**: Compressor de audio para máxima notoriedad
- **4 repeticiones automáticas**: Secuencia de 3.2 segundos sin tocar volumen sistema
- **Configuración profesional**: Threshold -10dB, ratio 8:1 para consistencia

#### 🔄 Reclasificación Inteligente Perfeccionada
- **Verificación en BD**: Consulta estado real al cerrar modal
- **Polling optimizado**: Cada 3 segundos para detección inmediata
- **Logs detallados**: Debugging completo para troubleshooting
- **Fallback robusto**: Reclasifica aunque falle verificación

#### 📊 Datos Familiares Tiempo Real Optimizados
- **Parsing mejorado**: Maneja datos_proceso como string/objeto
- **Indicadores visuales**: "(RT)" para datos dinámicos vs estáticos
- **Modal sincronizado**: Resumen y datos familiares actualizados sin cerrar

#### 🛡️ Documentación de Seguridad Corporativa
- **Reporte AWS completo**: Análisis de cuenta 307621978585
- **Inventario verificado**: ECS, RDS, ElastiCache, CloudFront, S3, Route 53
- **Cumplimiento evaluado**: 75% lineamientos corporativos implementados
- **Recomendaciones técnicas**: MFA, VPN, certificados SSL

#### 📋 Infraestructura Documentada
- **VPC segmentada**: 3 capas con Security Groups restrictivos
- **Encriptación multicapa**: TLS 1.3 + AES-256 verificada
- **Costos optimizados**: $200-340/mes proyectado
- **Alta disponibilidad**: Multi-AZ en RDS y ElastiCache

---

## Versión 5.5.0 (Octubre 2025) - Live Monitor Tiempo Real + Clasificación Inteligente

### 🎯 RELEASE CRÍTICO - Live Monitor Completamente Funcional

#### 📡 Sistema de Tiempo Real Implementado
- **Dual Realtime subscriptions**: llamadas_ventas + prospectos sincronizados
- **Movimiento automático entre checkpoints**: Sin recargas manuales
- **Actualización de datos familiares**: Composición, destino en tiempo real  
- **Conversación en vivo**: Modal actualiza sin cerrar/abrir
- **Sonido de campana**: Al completar checkpoint #5

#### 🎨 Nueva Clasificación Basada en Datos Reales
- **Transferidas** (antes Finalizadas): razon_finalizacion = 'assistant-forwarded-call'
- **Activas reales**: Solo sin razon_finalizacion y sin duración
- **Fallidas específicas**: customer-busy, customer-did-not-answer, customer-ended-call
- **Lógica de checkpoint #5**: Permanecen activas hasta ver modal

#### 🛠️ Corrección de Datos Históricos
- **125+ registros corregidos**: call_status sincronizado con razon_finalizacion
- **Llamadas atoradas limpiadas**: Antiguas del 9-10 octubre marcadas como perdida
- **Función exec_sql**: Administración remota de BD operativa
- **RLS optimizado**: Acceso público seguro para frontend

#### 📊 Distribución Final Verificada
- Activas: 0 (correcto), Transferidas: 27, Fallidas: 6, Finalizadas: 17

---

## Versión 5.4.0 (Octubre 2025) - Temas Globales + Acentos por Módulo

### 🎨 Cambios de UI y Arquitectura de Temas
- Renombrado de temas: Tema Corporativo y Tema Estudio.
- Selector de tema solo para Administrador en Administración → Preferencias del sistema.
- Persistencia global: `allow_user_theme_selection: false` para impedir cambios por usuarios.
- Variables CSS globales y utilidades para homogeneizar botones y cierres.
- Acento por módulo aplicado con `data-module` sin alterar visibilidad.

### 🔧 Implementación Técnica
- `MainApp` aplica `data-module={appMode}` al contenedor raíz.
- `SystemPreferences` renombra temas y actualiza config global.
- `useTheme` persiste bloqueo de selección por usuario.
- `index.css` define variables de acento por módulo y clases homogéneas.

### 🧩 Impacto en módulos
- PQNC Humans: contenedor ancho, modales ampliados.
- Análisis IA: respeta ancho cuando se fuerza PQNC.
- Live Chat, Academia, AI Models, Agent Studio, Prospectos, AWS Manager: sin cambios funcionales; paleta y acentos coherentes.

---
## Versión 5.3.0 (Octubre 2025) - Limpieza Completa + Optimización

### 🧹 RELEASE OPTIMIZACIÓN - Proyecto Limpio y Eficiente

#### 🗑️ Eliminación Masiva de Archivos Temporales
- **15+ archivos eliminados**: test_db_insert.js, debug HTMLs, configs temporales
- **Scripts de setup**: create-uchat-*.js, create-tables-*.js removidos
- **Documentación obsoleta**: CHANGELOG_COMPLETO.md, Live Chat READMEs duplicados
- **Proxies temporales**: audio_proxy_server.js, simple-proxy.js eliminados
- **Configuraciones VAPI**: vapi_config_fix.json, vapi_config_ultra_optimizada.json

#### 📚 Documentación Completa y Organizada
- **10 READMEs específicos**: Cada módulo con descripción, BD, dependencias
- **README principal**: Completamente reescrito para v5.3.0
- **Arquitectura clara**: Conexiones entre módulos documentadas
- **Bases de datos**: 4 Supabase instances explicadas
- **Navegación**: Flujo entre módulos documentado

#### 🔧 Reorganización Completa del Sidebar
- **Constructor y Plantillas**: Eliminados completamente del proyecto
- **Nuevo orden lógico**: Agent Studio (1°) → Análisis IA (2°) → PQNC Humans (3°) → Live Monitor (4°) → Live Chat (5°) → AI Models (6°) → Prompts Manager (7°)
- **appMode por defecto**: 'agent-studio' reemplaza 'constructor'
- **AppMode type**: Limpiado de módulos obsoletos

#### ⚡ Optimización Performance y UX
- **Live Chat sin re-renders**: Update local sin llamadas a BD
- **Sincronización inteligente**: No interrumpe escritura del usuario
- **Logs limpiados**: Solo logs de error importantes
- **Navegación fluida**: Sin parpadeos ni interrupciones

#### 🎯 Optimización para Tokens
- **Código limpio**: Sin archivos temporales ni debug
- **Documentación eficiente**: READMEs concisos y específicos
- **Estructura simplificada**: Fácil navegación y comprensión
- **Performance**: Reducción de ruido y archivos innecesarios

---

## Versión 5.2.0 (Octubre 2025) - Módulo Prospectos + Análisis IA Rediseñado

### 🚀 RELEASE FUNCIONALIDADES - Módulos de Gestión y Análisis

#### 📊 Módulo Prospectos Completo
- **Data grid avanzado**: 23 prospectos reales desde analysisSupabase
- **Filtros inteligentes**: Etapa, score (Q Reto/Premium/Elite), campaña origen
- **Sorting dinámico**: Click en headers para ordenamiento
- **Sidebar detallado**: Información completa con animaciones Framer Motion
- **Historial llamadas**: Data grid integrado con navegación automática
- **Vinculación Live Chat**: Verificación uchat_conversations y navegación
- **Diseño minimalista**: Sin emojis, iconos Lucide, layout compacto

#### 🧠 Análisis IA Rediseñado (antes Natalia IA)
- **Renombrado**: 'Natalia IA' → 'Análisis IA' más descriptivo
- **Diseño PQNC Humans**: Replicación fiel del layout superior
- **Datos híbridos**: call_analysis_summary + llamadas_ventas enriquecidos
- **Gráfica radar**: Chart.js tipo red con calificaciones visuales
- **Sidebar prospecto**: Click iniciales/nombre abre información completa
- **Modal optimizado**: Centrado como PQNC, z-index correcto
- **Audio integrado**: Reproductor HTML5 nativo sin descarga
- **Transcripción chat**: Conversación parseada con roles diferenciados

#### 🔗 Integración Completa Entre Módulos
- **Navegación inteligente**: Prospectos → Análisis IA automático
- **Sidebar cruzado**: Análisis IA → información prospecto
- **Live Chat vinculado**: Botón condicional si conversación activa
- **Datos sincronizados**: Información consistente entre módulos
- **localStorage + CustomEvents**: Comunicación entre componentes

#### 🎨 Mejoras Técnicas y Visuales
- **Animaciones elegantes**: Framer Motion sin rebotes molestos
- **Layout responsive**: Padding correcto, columnas optimizadas
- **Score base 100**: Barras sin desbordamiento, métricas precisas
- **Z-index jerarquía**: Modal 50, sidebar prospecto 100
- **Error handling**: Manejo robusto de objetos en feedback
- **Performance**: Auto-refresh silencioso, cache inteligente

---

## Versión 5.1.0 (Octubre 2025) - AWS Manager Optimizado + Consola Unificada

### 🎯 RELEASE OPTIMIZACIÓN - AWS Manager Completamente Refinado

#### 📊 AWS Manager Optimizado Completo
- **Pestaña Resumen**: Métricas dinámicas reales cada 5s sin logs ni emojis
- **Consola Unificada**: Fusión AWS Console + Advanced en una sola pestaña
- **Monitor Real-Time**: 7 servicios AWS reales con gráficas dinámicas
- **Auto-refresh silencioso**: 5 segundos sin parpadeo ni logs de consola
- **Diseño minimalista**: Solo iconos vectoriales, información esencial
- **Datos reales**: Conectado a AWS production, sin hardcoding

#### 🏗️ Consola AWS Unificada
- **Agrupación inteligente**: N8N Platform, Frontend, Database, Networking, Storage
- **Sidebar completo**: 3/5 pantalla con configuraciones específicas por servicio
- **Pestañas dinámicas**: Information, Configuration, Environment, Logs según tipo
- **Configuraciones editables**: Campos que modifican AWS realmente
- **CLI Terminal integrado**: Comandos reales con datos de servicios actuales
- **Navegación integrada**: Botón "Consumo" navega a Monitor del servicio

#### 📱 Sincronización Completa Entre Pestañas
- **Datos compartidos**: Resumen, Consola y Monitor usan misma fuente
- **7 servicios reales**: ECS, RDS, ElastiCache(2), ALB, CloudFront, S3
- **Estados consistentes**: running/available/pending sincronizados
- **Métricas dinámicas**: Basadas en tiempo real, variación suave
- **Auto-refresh global**: Todas las pestañas actualizadas simultáneamente

#### 🧹 Limpieza y Optimización
- **Pestañas eliminadas**: Diagrama Visual, Flujo Servicios, Railway Console
- **Componentes removidos**: 5 archivos .tsx no utilizados
- **Código optimizado**: Sin redundancia ni datos duplicados
- **Performance**: Carga más rápida, menos componentes lazy

#### 🛡️ Problemas Críticos Resueltos
- **Token AWS error**: Resuelto usando datos production existentes
- **Monitor hardcodeado**: Actualizado con servicios reales dinámicos
- **Métricas irreales**: Corregidas a rangos realistas por tipo servicio
- **Sincronización**: Datos consistentes entre todas las pestañas

---

## Versión 5.0.0 (Octubre 2025) - N8N Production Deploy + AWS Railway Console

### 🚀 RELEASE MAYOR - N8N Automation Platform + Railway UI

#### 🤖 N8N Automation Platform Completo
- **Deploy production**: ECS Fargate + RDS PostgreSQL + CloudFront SSL
- **SSL automático**: Certificado AWS sin dominio propio
- **SPA routing**: CloudFront Custom Error Pages para rutas directas
- **PostgreSQL access**: ECS tasks para gestión segura de base de datos
- **User management**: Roles y permisos desde PostgreSQL
- **Version**: n8nio/n8n:latest v1.114.3 (oficial)

#### 🎨 AWS Railway Console - Interfaz Moderna
- **Service grouping**: Compute, Database, Networking, Storage
- **Slider lateral**: 2/3 pantalla con configuración completa
- **Service-specific tabs**: Pestañas por tipo de servicio
- **Git integration**: Repository connection y auto-deploy setup
- **Responsive design**: Mobile-friendly con navegación optimizada
- **Real-time metrics**: CPU, Memory, Requests, Uptime por servicio

#### 🔧 Gestión PostgreSQL VPC-Segura
- **ECS Tasks**: PostgreSQL client en contenedores temporales
- **VPC internal access**: Sin exposición externa de base de datos
- **Automated SQL**: Comandos con logs en CloudWatch
- **User roles**: Gestión directa de roleSlug en tabla user
- **Security cleanup**: Configuraciones temporales removidas

#### 🛡️ Problemas Críticos Resueltos
- **SSL Conflict**: Parameter group personalizado (rds.force_ssl=0)
- **Task Definition**: Imagen oficial vs manual npm install
- **CloudFront SPA**: Custom Error Pages 404→200
- **Security Groups**: Acceso público optimizado solo donde necesario

---

## Versión 4.0.0 (Octubre 2025) - AWS Manager + Live Monitor Restaurado

### 🚀 RELEASE MAYOR - Infraestructura AWS Completa

#### ☁️ AWS Manager - Consola Empresarial
- **Descubrimiento automático**: 7+ servicios AWS detectados
- **Consolas múltiples**: Básica, Avanzada, Real-time
- **Configuración live**: Edición directa de recursos AWS
- **Monitoreo continuo**: Métricas actualizadas cada 10s
- **Arquitectura visual**: Diagramas interactivos de infraestructura
- **Terminal integrada**: Comandos AWS CLI directos

#### 📡 Live Monitor Completamente Funcional
- **Consultas optimizadas**: Error 400 Supabase eliminado
- **Filtrado IDs**: Validación null/undefined implementada
- **Permisos developer**: Acceso completo restaurado
- **Audio Tone.js**: Configuraciones profesionales activas
- **Real-time data**: Llamadas y prospectos sincronizados

#### 🔐 Sistema Permisos Granular
- **Developer role**: AWS Manager + Live Monitor + Análisis
- **Restricciones**: Admin, Agent Studio, Plantillas bloqueados
- **Sidebar dinámico**: Menús según permisos de usuario
- **Acceso contextual**: Módulos disponibles por rol

#### 🌐 Deploy AWS Profesional
- **S3 + CloudFront**: Frontend distribuido globalmente
- **Cache invalidation**: Actualizaciones inmediatas
- **Environment vars**: Configuración segura Vite
- **HTTPS + CDN**: Performance y seguridad optimizadas

#### 🛡️ Seguridad y Estabilidad
- **Credenciales seguras**: GitHub Push Protection cumplido
- **Error boundaries**: Manejo robusto de fallos
- **Lazy loading**: Optimización carga inicial
- **Production ready**: Mock services para frontend

### 📊 Métricas de Rendimiento
- **Build time**: 4.3s optimizado
- **Bundle size**: 1.8MB chunk principal
- **AWS services**: 7+ servicios monitoreados
- **Error rate**: 0% en Live Monitor
- **Cache propagation**: <30s CloudFront

### 🎯 Funcionalidades por Rol

#### 👨‍💻 Developer (Nuevo)
- ✅ AWS Manager (3 consolas completas)
- ✅ Live Monitor (llamadas + audio + transferencias)  
- ✅ Análisis (Natalia + PQNC + métricas)
- ✅ AI Models (gestión + tokens)
- ✅ Academia (ventas + materiales)
- ❌ Admin, Agent Studio, Plantillas, Constructor

#### 🔧 Capacidades Técnicas
- **AWS CLI integration**: Comandos directos
- **Service management**: Start/stop/restart recursos
- **Configuration editing**: Parámetros AWS en vivo
- **Real-time monitoring**: Métricas infraestructura
- **Architecture diagrams**: Visualización completa

---

## Versión 2.0.2 (Enero 2025)

### Fixes Críticos Filtros PQNC Humans

#### Bugs Críticos Corregidos (CRÍTICO)
- **useEffect dependencies**: Bug que impedía re-filtrado al cambiar ponderación
- **Filtro call_result**: Mejorado para búsqueda exacta + parcial
- **Valores null/undefined**: Validación en agentFilter, organizationFilter
- **Debug detallado**: Logs para troubleshooting de filtros problemáticos

#### Sistema de Diagnóstico Implementado (NUEVO)
- **Logs de filtrado**: Inicio, progreso y resultado de cada filtro
- **Debug de ventas**: Específico para call_result matching
- **Warning de 0 resultados**: Con valores únicos de BD mostrados
- **Troubleshooting**: Para identificar filtros que no funcionan

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
