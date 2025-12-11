# 📋 CHANGELOG - PQNC QA AI Platform

## Historial de Versiones

### v2.1.15 (2025-12-11)
**Descripción**: B4.4.1N6.0.0: Sistema de eliminación de llamadas programadas con modal de confirmación

---

## 🎯 **RELEASE B4.4.1N6.0.0 - Eliminación de Llamadas Programadas**

### 🗑️ **Sistema de Eliminación de Llamadas Programadas**
- **Botón de eliminar** en cards de llamadas programadas (vista diaria, semanal, chat y dashboard)
- **Modal de confirmación** con opciones "Reprogramar" y "Eliminar"
- **Animación de éxito** antes de cerrar el modal tras eliminar
- **Actualización automática** de vistas tras eliminar

### 📍 **Ubicaciones Implementadas**
1. **Módulo de Llamadas Programadas**
   - Vista diaria: Botón eliminar en cada card
   - Vista semanal: Botón eliminar compacto en cards
   
2. **AI Chat Monitor**
   - Botón eliminar en cards de llamadas programadas dentro de conversaciones
   - Recarga automática de mensajes tras eliminar

3. **Dashboard**
   - Botón eliminar en widget de llamadas programadas
   - Actualización automática de lista

### 🎨 **Características del Modal**
- Diseño según guía de modales del proyecto
- Información completa de la llamada (prospecto, fecha, justificación)
- Opción "Reprogramar" que abre modal de reprogramación
- Opción "Eliminar" con animación de éxito
- Estados de carga durante eliminación
- Manejo de errores con toasts

### 🔧 **Implementación Técnica**
- Nuevo servicio: `deleteScheduledCall` en `scheduledCallsService.ts`
- Componente reutilizable: `DeleteCallConfirmationModal.tsx`
- Integración con realtime: Actualización automática en todas las vistas
- Animaciones con framer-motion

### 📁 **Archivos Modificados/Creados**
- `src/services/scheduledCallsService.ts` - Función `deleteScheduledCall`
- `src/components/shared/DeleteCallConfirmationModal.tsx` - Modal de confirmación (nuevo)
- `src/components/scheduled-calls/views/DailyView.tsx` - Botón eliminar y lógica
- `src/components/scheduled-calls/views/WeeklyView.tsx` - Botón eliminar y lógica
- `src/components/chat/LiveChatCanvas.tsx` - Botón eliminar en cards de llamadas
- `src/components/dashboard/widgets/LlamadasProgramadasWidget.tsx` - Botón eliminar en widget
- `src/components/scheduled-calls/ScheduledCallsManager.tsx` - Callback `onCallDeleted`

---

### v2.1.14 (2025-12-10)
**Descripción**: B4.4.0N6.0.0: Filtros de audiencia corregidos usando prospectos.destino_preferencia y viaja_con

---

## 🎯 **RELEASE B4.4.0N6.0.0 - Filtros desde Tabla Prospectos**

### 📊 **Nueva Estructura de Filtros**
- **destinos**: Array de destinos seleccionables (multi-select) desde `prospectos.destino_preferencia`
- **viaja_con**: Array de tipos (Familia, Pareja, Amigos, Solo, Hijos) desde `prospectos.viaja_con`
- Eliminados: `tipo_audiencia`, `preferencia_entretenimiento` (datos no fiables)

### 🔧 **Lógica de Conteo Mejorada**
- Todos los filtros se aplican directamente sobre la tabla `prospectos`
- Usa `overlaps` para arrays de destinos (busca coincidencia en array)
- Usa `in` para viaja_con (múltiples valores)

### 📁 **Archivos Modificados**
- `whatsappTemplates.ts` - Nuevos tipos y constantes (VIAJA_CON_OPTIONS, ViajaConTipo)
- `WhatsAppTemplatesManager.tsx` - UI multi-select para destinos y viaja_con, lógica de conteo

---

### v2.1.13 (2025-12-10)
**Descripción**: B4.3.9N6.0.0: Sistema de audiencias completo para plantillas WhatsApp

---

## 🎯 **RELEASE B4.3.9N6.0.0 - Audiencias en Webhook N8N**

### 📤 **Payload al Webhook**
- Ahora se envía `audience_ids` (array de IDs) en lugar de `classification`
- Array `audiences` con datos completos de cada audiencia seleccionada
- Cada audiencia incluye: nombre, descripción, etapa, destino, estado_civil, tipo_audiencia, preferencia_entretenimiento, prospectos_count

### 📁 **Archivos Modificados**
- `whatsappTemplatesService.ts` - Nuevo método `getAudiencesByIds`, payload actualizado

---

### v2.1.12 (2025-12-10)
**Descripción**: B4.3.8N6.0.0: Fix conteo de audiencias guardadas en selector

### 🔧 **Correcciones**
- Recálculo de prospectos para audiencias de BD aplica TODOS los filtros
- Lógica: llamadas_ventas → prospectos únicos → filtros prospectos

---

### v2.1.11 (2025-12-10)
**Descripción**: B4.3.7N6.0.0: Preview en variables y guardado de audiencias

### ✨ **Mejoras**
- Preview de header/body en pestaña de variables para contexto
- Guardado de audiencias en Supabase (tabla whatsapp_audiences)
- Reset de formulario y recarga automática al crear audiencia

---

### v2.1.10 (2025-12-10)
**Descripción**: B4.3.6N6.0.0: Corrección de filtros de audiencias con datos reales de BD

---

## 🎯 **RELEASE B4.3.6N6.0.0 - Filtros de Audiencias Corregidos**

### 🔧 **Corrección de Filtros**
- **destino_preferido**: Valores actualizados a formato BD (nuevo_vallarta, riviera_maya, etc.)
- **estado_civil**: Ahora se obtiene de tabla `prospectos` con valores correctos (Casado, Soltero, etc.)
- **preferencia_vacaciones**: Filtro corregido usando `contains` en array de llamadas_ventas

### 📊 **Lógica de Conteo Mejorada**
1. Filtrar primero por `llamadas_ventas` (destino, preferencia_vacaciones)
2. Obtener prospectos únicos
3. Filtrar por `prospectos` (etapa, estado_civil)
4. Contar resultado final

### 📁 **Archivos Modificados**
- `whatsappTemplates.ts` - Tipos actualizados con valores reales de BD
- `WhatsAppTemplatesManager.tsx` - Lógica de conteo corregida

---

### v2.1.9 (2025-12-10)
**Descripción**: B4.3.5N6.0.0: Mejoras de rendimiento y contadores desde llamadas_ventas

---

## 🎯 **RELEASE B4.3.5N6.0.0 - Optimización de Catálogo y Contadores**

### 📸 **Catálogo de Imágenes Optimizado**
- **Infinite scroll** - Solo carga 24 imágenes iniciales, más al desplazar
- **Lazy loading con IntersectionObserver** - Solo carga URLs cuando thumbnail es visible
- **Cache global de URLs** - Evita regenerar URLs ya obtenidas
- **Grid más compacto** - 8 columnas en pantallas grandes

### 🧩 **Componentes de Plantilla**
- Header siempre se inserta **antes del body** (orden correcto)
- Categoría **MARKETING por defecto** en todos los casos

### 👥 **Contadores de Audiencias desde llamadas_ventas**
- Filtros de destino, estado_civil y preferencia_entretenimiento usan datos de `llamadas_ventas`
- Normalización automática de valores (espacios → guiones bajos)
- Conteo por prospectos únicos con filtros combinados

### 📁 **Archivos Modificados**
- `WhatsAppTemplatesManager.tsx` - Infinite scroll, lazy loading, contadores llamadas_ventas

---

### v2.1.8 (2025-12-10)
**Descripción**: B4.3.4N6.0.0: Catálogo de imágenes funcional y contadores reales

---

## 🎯 **RELEASE B4.3.4N6.0.0 - Catálogo de Imágenes y Contadores Dinámicos**

### 📸 **Catálogo de Imágenes Funcional**
- Modal de catálogo usa misma lógica que ImageCatalogModal del Chat
- Carga imágenes desde tabla `content_management`
- Generación de URLs con API de Railway y cache en localStorage
- Filtros por nombre y destino
- Grid con lazy loading de thumbnails

### 👥 **Contadores de Audiencias Dinámicos**
- Modal "Crear Audiencia" muestra conteo real de prospectos en tiempo real
- Consultas a tabla `prospectos` con filtros de etapa y destino
- Debounce de 300ms para optimizar consultas

### 📋 **Cards de Plantillas Mejoradas**
- Muestra nombres reales de audiencias asignadas
- Contador de prospectos alcanzables por plantilla
- Tooltips con información detallada

### 📁 **Archivos Modificados**
- `WhatsAppTemplatesManager.tsx` - Catálogo funcional, contadores dinámicos, cards mejoradas

---

### v2.1.7 (2025-12-10)
**Descripción**: B4.3.3N6.0.0: Catálogo de imágenes y audiencias dinámicas

---

## 🎯 **RELEASE B4.3.3N6.0.0 - Catálogo de Imágenes y Audiencias Dinámicas**

### 📸 **Catálogo de Imágenes para Header**
- Botón "Catálogo" ahora abre modal de selección de imágenes
- Carga imágenes desde tabla `contenido_multimedia`
- Grid visual con hover effects y selección inmediata
- Preview de imagen con posibilidad de eliminar

### 👥 **Audiencias Dinámicas**
- Estadísticas de prospectos cargadas en tiempo real desde BD
- Audiencia "Global - Todos los Prospectos" incluida automáticamente
- Audiencias por etapa creadas dinámicamente con conteos reales
- Fallback robusto si la tabla `whatsapp_audiences` no existe

### 📋 **Mejoras en Cards de Plantillas**
- Muestra etiquetas de audiencias asignadas
- Indicador de +N audiencias si hay más de 2
- Iconos de usuarios para identificar audiencias

### 📁 **Archivos Modificados**
- `WhatsAppTemplatesManager.tsx` - Catálogo de imágenes, audiencias dinámicas, cards mejoradas

---

### v2.1.6 (2025-12-10)
**Descripción**: B4.3.2N6.0.0: Rediseño completo del modal de plantillas WhatsApp

---

## 🎯 **RELEASE B4.3.2N6.0.0 - Mejoras al Constructor de Plantillas WhatsApp**

### 📋 **Mejoras en Pestaña de Contenido**

#### Validación de Nombres
- Solo permite letras minúsculas, números y guiones bajos (_)
- Automáticamente convierte espacios en guiones bajos
- Elimina acentos y caracteres especiales
- Mensaje de ayuda visible para el usuario

#### Límites de Caracteres
- **Body**: Máximo 1000 caracteres con contador visual
- **Header**: Máximo 60 caracteres con contador visual
- Indicador rojo cuando se excede el límite

#### Componentes Simplificados
- Eliminados botones de Footer y Buttons (no soportados por Meta)
- Solo un Header y un Body permitidos por plantilla
- Los botones se ocultan cuando ya existe el componente

#### Header con Imagen
- Nuevo selector de tipo: Texto o Imagen
- Campo URL para imagen con preview en tiempo real
- Botón para acceder al catálogo de imágenes
- Validación de URL con fallback visual

#### Idioma y Categoría
- Eliminado "Español España" (solo es_MX y en_US)
- Categoría por defecto: MARKETING

### 👥 **Nueva Pestaña "Audiencia"**

#### Sistema de Audiencias
- Renombrada pestaña de "Clasificación" a "Audiencia"
- Selector múltiple de audiencias predefinidas
- Cada audiencia muestra conteo de prospectos
- Indicador de alcance total estimado

#### Modal de Creación de Audiencias
- **Nombre de Audiencia** (antes "Campaña")
- **Descripción** con límite de 300 caracteres (antes "Categoría de Reactivación")
- **Etapa del prospecto** con opción "No aplica"
- **Destino turístico** con opción "No aplica"
- **Estado Civil** (nuevo campo)
- **Tipo de Audiencia** con iconos vectorizados:
  - Familia, Pareja, Solo, Amigos, Grupo
- **Preferencia de Entretenimiento**
- Contador en tiempo real de prospectos que coinciden

#### Eliminado
- Sección "Configuración de Seguimiento" (Requiere Atención Humana)
- Emojis reemplazados por iconos vectorizados de Lucide

### 🗄️ **Nueva Tabla de Base de Datos**

#### `whatsapp_audiences`
- id (UUID)
- nombre (VARCHAR 100)
- descripcion (VARCHAR 300)
- etapa, destino, estado_civil
- tipo_audiencia (VARCHAR[] array)
- preferencia_entretenimiento
- prospectos_count (calculado)
- is_active, created_by, timestamps

#### Función RPC
- `count_prospectos_for_audience()` para contar prospectos en tiempo real

### 🎨 **Mejoras de UI/UX**
- Iconos vectorizados en lugar de emojis
- Cards de audiencia con tags visuales
- Animaciones suaves con Framer Motion
- Consistencia en dark mode

### 📁 **Archivos Modificados**
- `src/types/whatsappTemplates.ts` - Nuevos tipos de audiencia
- `src/components/admin/WhatsAppTemplatesManager.tsx` - Componentes actualizados
- `docs/sql/create_whatsapp_audiences.sql` - Script de migración
- `src/components/Footer.tsx` - Versión actualizada

---

### v2.1.5 (2025-12-10)
**Descripción**: B4.3.1N6.0.0: Sistema de Clasificación de Plantillas WhatsApp y Rediseño de UI

---

## 🎯 **RELEASE B4.3.1N6.0.0 - Sistema de Clasificación de Plantillas WhatsApp**

### 📋 **Sistema de Clasificación para Plantillas WhatsApp**

#### Nueva Pestaña de Clasificación en Modal de Plantillas
- **Segmentación por Etapa**: Selector con todas las etapas de prospectos (Activo PQNC, Atendió llamada, En seguimiento, etc.)
- **Destinos Turísticos**: Selector con destinos Vidanta (Nuevo Nayarit, Riviera Maya, Los Cabos, etc.)
- **Categorías de Reactivación**: 5 categorías para reactivar conversaciones de WhatsApp:
  - Seguimiento Post-Llamada
  - Recordatorio de Reserva
  - Oferta Especial
  - Reenganche de Interés
  - Actualización de Información
- **Preferencias de Entretenimiento**: Entretenimiento, Descanso o Mixto
- **Audiencia Objetivo**: Toggles para familias, grupos, menores, luna de miel

#### Mapeo de Variables de Discovery
- Integración completa con tabla `llamadas_ventas`
- Soporte para campos JSONB anidados (ej: `datos_proceso.numero_personas`)
- Campos de composición familiar, preferencias de viaje, datos del proceso
- Vista previa con datos reales de la base de datos

#### Mapeo de Variables de Prospectos
- Integración con tabla `prospectos`
- Campos: nombre, email, teléfono, estado, campaña, etc.
- Ejemplos automáticos para preview

### 🎨 **Rediseño del Visualizador de Plantillas**

#### Nueva Grilla de Plantillas
- **Diseño moderno**: Cards con gradientes y animaciones suaves
- **Layout responsivo**: Grid que se adapta a cualquier pantalla
- **Animaciones**: Hover effects, transiciones y micro-interacciones
- **Modo compacto**: Optimizado para manejar cientos de plantillas

#### Funcionalidad Mejorada
- Indicadores visuales de estado (activo/inactivo)
- Badges de categoría con colores distintivos
- Vista expandible para detalles adicionales
- Acciones rápidas: editar, eliminar, sincronizar, preview
- Información de última sincronización y variables mapeadas

### 🔧 **Mejoras Técnicas**

#### Servicio de Plantillas Actualizado
- `getTableExampleData`: Soporte para campos JSONB anidados con notación de punto
- Consulta múltiples registros para encontrar valores no nulos
- Valores por defecto comprehensivos para preview completo
- Payload de clasificación separado para webhook N8N

#### Nuevos Tipos TypeScript
```typescript
// Tipos para clasificación
ProspectoEtapa, DestinoNombre, CategoriaReactivacion, PreferenciaEntretenimiento

// Interfaces
TemplateClassification, DiscoveryFieldMapping, ProspectoFieldMapping
```

### 🐛 **Correcciones de UI/UX**
- Eliminado emoji de pestaña "Clasificación" para consistencia
- Corregido modo oscuro en sección "Audiencia Objetivo"
- Separación clara entre "Tabla de BD" y "Función Sistema" en variables
- Mejora de contraste en dark mode para todos los selectores

### 📁 **Archivos Modificados**
- `src/types/whatsappTemplates.ts` - Nuevos tipos de clasificación
- `src/components/admin/WhatsAppTemplatesManager.tsx` - Tab de clasificación y rediseño de grilla
- `src/services/whatsappTemplatesService.ts` - Soporte JSONB y clasificación en payload
- `src/components/Footer.tsx` - Actualización de versión
- `docs/WHATSAPP_TEMPLATES_CLASSIFICATION.md` - Documentación completa

---

### v2.1.4 (2025-12-09 18:34)
**Descripción**: B4.3.0: Audio monitoring con canales corregidos y escala de volumen ajustada

### v2.1.3 (2025-12-09 18:09)
**Descripción**: B4.3.0N6.0.0: Monitoreo de audio en tiempo real para llamadas activas

### 🎯 **RELEASE BETA - Nueva Pestaña de Auth Tokens en Administración**

#### 🔐 **Nueva Pestaña "Auth Tokens" en Administración**
- **Nuevo módulo:** Panel de gestión de tokens de autenticación para webhooks y APIs externas
- **Funcionalidades implementadas:**
  - Vista de tokens encriptados (solo últimos 8 caracteres visibles)
  - Botón para mostrar/ocultar token completo
  - Copiar token al portapapeles con un clic
  - Edición inline con guardado inmediato
  - Advertencias de seguridad integradas
- **Tokens configurables:**
  - `manual_call_auth` - Token para programar llamadas manuales
  - `send_message_auth` - Token para enviar mensajes WhatsApp
  - `pause_bot_auth` - Token para pausar/reanudar bot
  - `media_url_auth` - Token para generar URLs de multimedia

#### 🔧 **Corrección de Token de Programar Llamadas**
- **Problema resuelto:** Error 403 "Authorization data is wrong!" al programar llamadas
- **Solución:** Actualización del token de autenticación en `ManualCallModal.tsx`
- **Token actualizado:** De `4ydoA3Hg...` a `wFRpkQv4...`

#### 🆕 **Nuevo Servicio: apiTokensService**
- **Funcionalidad:** Gestión centralizada de tokens de autenticación
- **Características:**
  - Caché local con TTL de 5 minutos para rendimiento
  - Fallback a valores por defecto si BD no disponible
  - Funciones: `getApiToken`, `getAllApiTokens`, `updateTokenCache`, `invalidateTokenCache`

#### 📁 **Archivos Creados/Modificados**
- `src/components/admin/ApiAuthTokensManager.tsx` - Nuevo componente de gestión de tokens
- `src/services/apiTokensService.ts` - Nuevo servicio de tokens
- `src/components/admin/AdminDashboardTabs.tsx` - Nueva pestaña "Auth Tokens" añadida
- `src/components/shared/ManualCallModal.tsx` - Token de autenticación actualizado
- `CHANGELOG.md` - Documentación de esta versión
- `VERSIONS.md` - Control de versiones actualizado
- `src/components/Footer.tsx` - Versión actualizada

---

## 🎯 Versión B4.1.2N6.0.0 - Corrección de Z-Index en Sidebars (Enero 2025)

### 🎯 **RELEASE BETA - Corrección de Ordenamiento de Sidebars**

#### 🔧 **Sistema de Z-Index para Sidebars**
- **Problema resuelto:** Los sidebars de prospecto y detalle de llamada tenían conflictos de z-index en diferentes módulos
- **Solución implementada:**
  - Sistema de z-index configurable mediante props opcionales en `CallDetailModalSidebar` y `ProspectoSidebar`
  - **Módulos normales** (Prospectos, Scheduled Calls, Chat):
    - `CallDetailModalSidebar`: z-[250] (encima)
    - `ProspectoSidebar`/`ProspectDetailSidebar`: z-[190] (debajo)
  - **AI Call Monitor** (comportamiento especial):
    - `ProspectoSidebar`: z-[230] (encima)
    - `CallDetailModalSidebar`: z-[210] (debajo)
- **Props añadidas:**
  - `CallDetailModalSidebar`: `zIndexBackdrop` y `zIndexSidebar` (default: z-[240]/z-[250])
  - `ProspectoSidebar`: `zIndexBackdrop` y `zIndexSidebar` (default: z-[180]/z-[190])
- **Archivos modificados:**
  - `src/components/chat/CallDetailModalSidebar.tsx` - Props de z-index añadidas
  - `src/components/prospectos/ProspectosManager.tsx` - Props de z-index añadidas a ProspectoSidebar y CallDetailModalSidebar
  - `src/components/chat/ProspectDetailSidebar.tsx` - Z-index revertido a z-[180]/z-[190]
  - `src/components/scheduled-calls/ProspectoSidebar.tsx` - Z-index revertido a z-[180]/z-[190]
  - `src/components/scheduled-calls/ScheduledCallsManager.tsx` - Props de z-index añadidas
  - `src/components/analysis/LiveMonitorKanban.tsx` - Z-index configurado para comportamiento especial

#### 📝 **Documentación de Código**
- Comentarios añadidos en componentes de sidebars explicando el sistema de z-index
- Índices documentados para facilitar mantenimiento futuro
- Comentarios sobre el comportamiento especial en AI Call Monitor

#### 📁 **Archivos Principales Modificados**
- `src/components/chat/CallDetailModalSidebar.tsx` - Sistema de z-index configurable
- `src/components/prospectos/ProspectosManager.tsx` - Props de z-index y documentación
- `src/components/chat/ProspectDetailSidebar.tsx` - Z-index corregido
- `src/components/scheduled-calls/ProspectoSidebar.tsx` - Z-index corregido
- `src/components/scheduled-calls/ScheduledCallsManager.tsx` - Props de z-index añadidas
- `src/components/analysis/LiveMonitorKanban.tsx` - Comportamiento especial documentado
- `CHANGELOG.md` - Documentación de esta versión
- `src/components/Footer.tsx` - Actualización de versión
- `package.json` - Actualización de versión

---

## 🎯 Versión B4.1.1N6.0.0 - Mejoras en Dashboard: Realtime y Ordenamiento de Prospectos (Enero 2025)

### 🎯 **RELEASE BETA - Mejoras en Dashboard Operativo**

#### 🔄 **Corrección de Realtime Update para "Prospectos - Requieren Atención"**
- **Problema resuelto:** El box "Prospectos - Requieren Atención" no se actualizaba automáticamente cuando se marcaba el flag `requiere_atencion_humana`
- **Solución implementada:**
  - Suscripción realtime mejorada a la tabla `prospectos` con eventos INSERT y UPDATE
  - Verificación de permisos usando `permissionsService.canUserAccessProspect` directamente
  - Manejo correcto de estados anteriores usando `payload.old` y refs para determinar cambios
  - Actualización automática cuando `requiere_atencion_humana` cambia de `false` a `true` o viceversa
- **Mejoras adicionales:**
  - Uso de `startTransition` para actualizaciones no bloqueantes
  - Ref `prospectosListRef` para rastrear estado actual y evitar duplicados
  - Manejo robusto de casos edge (prospecto ya existe, sin permisos, etc.)
- **Archivos modificados:** `src/components/dashboard/widgets/ProspectosNuevosWidget.tsx`

#### 📊 **Ordenamiento por Fecha del Último Mensaje**
- **Mejora implementada:** Los prospectos en "Prospectos - Requieren Atención" ahora se ordenan por fecha del último mensaje (descendente - más nuevo primero)
- **Funcionalidades añadidas:**
  - Función `getLastMessageDate` para obtener la fecha del último mensaje desde `mensajes_whatsapp`
  - Función `sortProspectosByLastMessage` para ordenar prospectos por fecha descendente
  - `enrichProspecto` actualizado para incluir `fecha_ultimo_mensaje` en el objeto
  - `loadProspectos` obtiene fechas del último mensaje para todos los prospectos y los ordena
- **Realtime para mensajes:**
  - Suscripción a `mensajes_whatsapp` para actualizar `fecha_ultimo_mensaje` cuando llega un nuevo mensaje
  - Reordenamiento automático cuando se recibe un nuevo mensaje
  - Actualización de fecha y reordenamiento cuando se añade o actualiza un prospecto
- **Archivos modificados:** `src/components/dashboard/widgets/ProspectosNuevosWidget.tsx`

#### 📁 **Archivos Principales Modificados**
- `src/components/dashboard/widgets/ProspectosNuevosWidget.tsx` - Realtime update y ordenamiento por fecha de último mensaje
- `CHANGELOG.md` - Documentación de esta versión
- `src/components/Footer.tsx` - Actualización de versión
- `package.json` - Actualización de versión

---

## 🎯 Versión B4.1.0N6.0.0 - Correcciones de Zona Horaria, Timeline y Mejoras en Prospectos (Diciembre 2025)

### 🎯 **RELEASE BETA - Correcciones Críticas y Mejoras de UX**

#### 🕐 **Corrección de Zona Horaria en Llamadas Programadas**
- **Problema resuelto:** Las llamadas programadas aparecían en días incorrectos debido a conversión incorrecta de timestamps UTC
- **Solución implementada:** Filtrado por fecha usando zona horaria local de Puerto Vallarta (America/Mexico_City, UTC-6)
- **Comparación correcta:** Ahora se compara año, mes y día en zona horaria local sin depender de UTC
- **Formateo mejorado:** Las horas se muestran correctamente usando `toLocaleTimeString` con timezone específico
- **Archivos modificados:** `src/components/scheduled-calls/views/DailyView.tsx`

#### 🔗 **Corrección de Timeline en AI Chat Monitor**
- **Problema resuelto:** Al hacer clic en llamadas del timeline en el modal de prospecto, no se abría el CallDetailModalSidebar
- **Solución implementada:** 
  - Simplificada condición de apertura del modal (ahora abre si hay `callId`)
  - Agregado `stopPropagation` y `preventDefault` para evitar conflictos de eventos
  - CallDetailModalSidebar movido fuera del AnimatePresence del ProspectDetailSidebar para funcionar independientemente
- **Mejoras adicionales:** Agregados logs de depuración para facilitar troubleshooting futuro
- **Archivos modificados:** `src/components/chat/ProspectDetailSidebar.tsx`

#### ⚡ **Optimización de Historial en AI Call Monitor**
- **Problema resuelto:** Re-renders innecesarios causaban parpadeo en la pestaña de historial
- **Solución implementada:**
  - Loading solo se muestra si no hay datos previos (evita parpadeos en actualizaciones)
  - Aumentado delay en efectos para evitar re-renders rápidos
  - Optimización de aplicación de filtros con mejor diferimiento
- **Archivos modificados:** `src/components/analysis/LiveMonitorKanban.tsx`

#### 📝 **Mejoras en Transcripción y Status de Llamada**
- **Transcripción mejorada:**
  - Parser mejorado para manejar múltiples formatos de conversación
  - Ordenamiento correcto de segmentos por índice
  - Manejo robusto de diferentes estructuras de datos
- **Status de llamada añadido:**
  - Muestra status completo: Transferida, No Transferida, Perdida, Finalizada, Activa
  - Colores diferenciados por tipo de status
- **Archivos modificados:** `src/components/chat/CallDetailModalSidebar.tsx`

#### 🎵 **Reproductor de Audio Mejorado**
- **Barra de progreso añadida:**
  - Barra de progreso interactiva con seek funcional
  - Muestra tiempo actual y duración total
  - Control de volumen separado
- **Estados mejorados:**
  - `audioDuration` y `audioVolume` como estados separados
  - Sincronización correcta con el elemento audio
  - Formateo de tiempo mejorado
- **Archivos modificados:** `src/components/chat/CallDetailModalSidebar.tsx`

#### 📊 **Eliminación de Paginación en Prospectos**
- **Problema resuelto:** Vista limitada a 50 de 57 prospectos sin botón para avanzar
- **Solución implementada:**
  - Eliminada paginación limitada - ahora carga TODOS los prospectos de una vez
  - Eliminado `BATCH_SIZE` y lógica de paginación
  - Infinite scroll deshabilitado (ya no es necesario)
  - Filtrado y ordenamiento se aplican en memoria después de cargar todos los datos
- **Aplicado en:** Vista Kanban y DataGrid
- **Archivos modificados:** `src/components/prospectos/ProspectosManager.tsx`, `src/components/prospectos/ProspectosKanban.tsx`

#### 📁 **Archivos Principales Modificados**
- `src/components/scheduled-calls/views/DailyView.tsx` - Corrección de zona horaria
- `src/components/chat/ProspectDetailSidebar.tsx` - Corrección de Timeline y CallDetailModalSidebar
- `src/components/chat/CallDetailModalSidebar.tsx` - Mejoras en transcripción, status y reproductor de audio
- `src/components/analysis/LiveMonitorKanban.tsx` - Optimización de historial
- `src/components/prospectos/ProspectosManager.tsx` - Eliminación de paginación
- `src/components/prospectos/ProspectosKanban.tsx` - Eliminación de infinite scroll por columna
- `src/components/Footer.tsx` - Actualización de versión a B4.1.0N6.0.0

#### 🔧 **Implementación Técnica**
- **Zona horaria:** Uso de `getFullYear()`, `getMonth()`, `getDay()` para comparación local
- **Portales:** CallDetailModalSidebar renderizado fuera de AnimatePresence para independencia
- **Estados de audio:** Separación de `currentAudioTime`, `audioDuration` y `audioVolume`
- **Carga completa:** Eliminación de `.range()` en consultas para cargar todos los registros

---

## 🎯 Versión B4.0.10N6.0.0 - Optimización de Rendimiento y Verificación de Permisos (Enero 2025)

### 🎯 **RELEASE BETA - Optimización de Rendimiento y Sistema de Permisos Mejorado**

#### ⚡ **Optimización de Rendimiento en AI Call Monitor**
- **Throttling mejorado:** Aumentado de 200ms a 500ms para reducir frecuencia de procesamiento en handlers de realtime
- **Batching de actualizaciones:** Las actualizaciones de realtime se acumulan y procesan en batch para reducir operaciones pesadas
- **Diferimiento con requestIdleCallback:** Trabajo pesado se ejecuta cuando el navegador está libre, evitando bloqueos del hilo principal
- **Polling optimizado:** Intervalo aumentado de 3 a 5 segundos y solo se ejecuta si no hay modal abierto
- **Handlers optimizados:** Procesamiento mínimo dentro de handlers de mensajes, actualizaciones diferidas con requestAnimationFrame
- **Reducción de violaciones:** Las violaciones de rendimiento se redujeron de 150-300ms a menos de 50ms

#### 🔇 **Silenciamiento de Logs del Navegador**
- **Logs de fetch:** Interceptores agregados para silenciar logs "Fetch finished loading" y "Fetch failed loading" del navegador
- **console.log y console.info:** Filtros aplicados para ocultar logs de fetch del DevTools
- **console.warn:** También filtra logs de fetch en warnings

#### 🔐 **Sistema de Permisos Mejorado para Sidebars**
- **Verificación de permisos:** Agregada verificación de permisos antes de abrir sidebars de prospecto en todos los módulos
- **canUserAccessProspect mejorado:** Función actualizada para verificar tanto en `prospect_assignments` como directamente en tabla `prospectos`
- **Soporte para múltiples coordinaciones:** Coordinadores pueden ver prospectos de todas sus coordinaciones asignadas
- **Fallback inteligente:** Si la función RPC falla, verifica directamente en la tabla `prospectos` como fallback
- **Mensajes de error claros:** Alertas informativas cuando el usuario no tiene permisos para acceder a un prospecto

#### 📁 **Archivos Principales Modificados**
- `src/components/analysis/LiveMonitorKanban.tsx` - Optimización de handlers de realtime, verificación de permisos
- `src/components/dashboard/widgets/ConversacionesWidget.tsx` - Verificación de permisos antes de abrir sidebar
- `src/components/dashboard/widgets/ProspectosNuevosWidget.tsx` - Verificación de permisos antes de abrir sidebar
- `src/components/scheduled-calls/ScheduledCallsManager.tsx` - Verificación de permisos antes de abrir sidebar
- `src/components/chat/CallDetailModalSidebar.tsx` - Verificación de permisos al cargar datos del prospecto
- `src/services/permissionsService.ts` - Función `canUserAccessProspect` mejorada con verificación dual
- `src/utils/consoleInterceptors.ts` - Interceptores para silenciar logs de fetch del navegador

#### 🔧 **Implementación Técnica**
- **requestIdleCallback:** Uso extensivo para diferir trabajo pesado cuando el navegador está libre
- **requestAnimationFrame:** Para actualizaciones de estado sin bloquear el hilo principal
- **Batching:** Acumulación de actualizaciones en batch para procesarlas juntas
- **Throttling:** Aumentado a 500ms para reducir frecuencia de procesamiento
- **Verificación dual:** RPC primero, luego fallback directo en tabla `prospectos`

---

## 🎯 Versión B4.0.9N6.0.0 - CallDetailModalSidebar: Corrección de Errores y Estabilidad (Enero 2025)

### 🎯 **RELEASE BETA - Corrección de Errores Críticos en CallDetailModalSidebar**

#### 🐛 **Corrección de Error Crítico**
- **TypeError en CallDetailModalSidebar:** Corregido error `Cannot read properties of null (reading 'nombre_completo')` que impedía abrir el sidebar en todos los módulos
- **Protección con Optional Chaining:** Todas las referencias a `callDetail` ahora usan optional chaining (`?.`) para manejar casos donde los datos aún no están cargados
- **Estado de carga:** Agregado estado de carga (`loading || !callDetail`) para mostrar spinner mientras se cargan los datos del call detail
- **Renderizado condicional:** El componente ahora permite renderizar en estado de carga antes de que `callDetail` esté disponible

#### 🧹 **Limpieza de Código**
- **Eliminación de código duplicado:** Removido código duplicado del `ProspectoSidebar` local que quedó mezclado en `LiveMonitorKanban.tsx`
- **Corrección de sintaxis:** Corregidos errores de sintaxis JSX causados por código comentado mal formado
- **Estructura mejorada:** Limpieza de bloques de código comentado que causaban conflictos

#### 🔄 **Mejoras en Estabilidad**
- **Manejo robusto de estados null:** El componente maneja correctamente estados donde `callDetail` es `null` inicialmente
- **Carga progresiva:** Los datos se cargan progresivamente sin causar errores si alguna propiedad no está disponible
- **Prevención de crashes:** Protección contra crashes cuando los datos no están completamente cargados

#### 📁 **Archivos Principales Modificados**
- `src/components/chat/CallDetailModalSidebar.tsx` - Protección con optional chaining, estado de carga
- `src/components/analysis/LiveMonitorKanban.tsx` - Eliminación de código duplicado, corrección de sintaxis

#### 🔧 **Implementación Técnica**
- **Optional chaining:** Uso extensivo de `?.` para acceso seguro a propiedades anidadas
- **Estado de carga:** Spinner mostrado mientras `callDetail` es `null` o `loading` es `true`
- **Limpieza de código:** Eliminación de más de 800 líneas de código comentado y duplicado

---

## 🎯 Versión B4.0.8N6.0.0 - AI Call Monitor: Optimización de Historial y Correcciones (Enero 2025)

### 🎯 **RELEASE BETA - Optimización de Rendimiento y Correcciones en Historial**

#### ⚡ **Optimización de Carga del Historial**
- **Reducción de límite inicial:** De 1000 a 300 llamadas para mejor rendimiento inicial
- **Carga paralela:** Ejecutivos y coordinaciones se cargan en paralelo con `Promise.all` para reducir tiempo de carga
- **Actualización periódica:** Historial se actualiza automáticamente cada 60 segundos sin recargar toda la página
- **Carga inteligente:** Carga desde `llamadas_ventas` primero, luego enriquecimiento con datos de `call_analysis_summary`
- **Paginación eficiente:** Paginación frontend (50 por página) aplicada después de filtrado para mejor UX

#### 🐛 **Correcciones de Columnas**
- **Columna `whatsapp`:** Eliminada de consulta a `llamadas_ventas` (no existe en esa tabla, solo en `prospectos`)
- **Columnas `created_at` y `updated_at`:** Eliminadas de consulta (no existen en `llamadas_ventas`)
- **Uso correcto de `fecha_llamada`:** Campo usado como fuente de fecha para ordenamiento y visualización

#### 🔄 **Mejoras en Actualización del Historial**
- **Recarga al cambiar de pestaña:** Historial se recarga automáticamente al cambiar a la pestaña "Historial"
- **Intervalo de actualización:** Actualización automática cada 60 segundos para mantener datos frescos
- **Sin re-render completo:** Actualizaciones sin recargar toda la página, solo datos necesarios

#### 📁 **Archivos Principales Modificados**
- `src/components/analysis/LiveMonitorKanban.tsx` - Optimización de `loadHistoryCalls`, corrección de columnas, carga paralela

#### 🔧 **Implementación Técnica**
- **Consulta optimizada:** Reducción de datos cargados inicialmente (300 vs 1000)
- **Promise.all:** Carga paralela de ejecutivos y coordinaciones para mejor rendimiento
- **Manejo de errores:** Mejor manejo de columnas inexistentes y errores de consulta
- **Paginación frontend:** Paginación aplicada después de filtrado para mejor rendimiento

---

## 🎯 Versión B4.0.7N6.0.0 - Dashboard: Notificaciones del Sistema y Sidebar Actualizado (Enero 2025)

### 🎯 **RELEASE BETA - Notificaciones del Sistema Operativo y Mejoras en Sidebar**

#### 🔔 **Notificaciones del Sistema Operativo**
- **Solicitud automática de permisos:** Solicitud automática de permisos del navegador al entrar al dashboard (después de 2 segundos)
- **Notificaciones persistentes:** Funcionan incluso cuando el navegador está minimizado o en otra pestaña
- **Tipos de notificaciones:**
  - Mensajes nuevos: Muestra nombre del cliente y preview del mensaje
  - Llamadas activas: Muestra nombre del prospecto y estado de la llamada
  - Llamadas programadas: Muestra nombre del prospecto y hora programada
  - Nuevos prospectos: Muestra nombre del nuevo prospecto agregado
- **Control granular:** Panel de control con toggles individuales para cada tipo de notificación
- **Click en notificaciones:** Al hacer click, abre el navegador y navega al módulo correspondiente
- **Cierre automático:** Las notificaciones se cierran automáticamente después de 5 segundos
- **Preferencias persistentes:** Configuración guardada en localStorage
- **Integración completa:** Integrado en todos los widgets del dashboard (Conversaciones, Llamadas Activas, Llamadas Programadas, Prospectos Nuevos)

#### 🔧 **Sidebar de Prospecto Actualizado en Dashboard**
- **Sidebar unificado:** Todos los widgets del dashboard ahora usan el sidebar actualizado del módulo de "Prospectos"
- **Funcionalidad completa:** Acceso a todas las características del sidebar actualizado (llamadas, conversaciones, programación, etc.)
- **Carga optimizada:** Carga del prospecto completo antes de abrir el sidebar para mejor rendimiento
- **Aplicado en:**
  - Widget "Prospectos Nuevos": Click en avatar/nombre abre sidebar actualizado
  - Widget "Últimas Conversaciones": Click en avatar/nombre abre sidebar actualizado

#### 🐛 **Corrección de Bug de Hooks**
- **Fix crítico:** Corregido error de "Invalid hook call" en ProspectosNuevosWidget
- **Causa:** `useRef` estaba siendo llamado dentro de `useEffect` (violación de reglas de hooks)
- **Solución:** Movido `processedProspectsRef` al nivel superior del componente

#### 📁 **Archivos Principales Modificados**
- `src/services/systemNotificationService.ts` - Nuevo servicio para notificaciones del sistema
- `src/components/dashboard/NotificationControl.tsx` - Panel de control actualizado con notificaciones del sistema
- `src/components/dashboard/widgets/ConversacionesWidget.tsx` - Integración de notificaciones y sidebar actualizado
- `src/components/dashboard/widgets/LlamadasActivasWidget.tsx` - Integración de notificaciones del sistema
- `src/components/dashboard/widgets/LlamadasProgramadasWidget.tsx` - Integración de notificaciones del sistema
- `src/components/dashboard/widgets/ProspectosNuevosWidget.tsx` - Integración de notificaciones, sidebar actualizado y fix de hooks

#### 🔧 **Implementación Técnica**
- **API de Notifications:** Uso de la API nativa del navegador para notificaciones del sistema
- **Gestión de permisos:** Manejo de estados de permisos (default, granted, denied)
- **Servicio singleton:** Patrón singleton para gestión centralizada de notificaciones
- **Integración realtime:** Notificaciones disparadas por eventos realtime de Supabase
- **Prevención de duplicados:** Sistema de tracking para evitar notificaciones duplicadas

---

## 🎯 Versión B4.0.6N6.0.0 - Dashboard: Botón de Transferencia y Mejoras en Realtime (Enero 2025)

### 🎯 **RELEASE BETA - Mejoras en Dashboard y Chat**

#### ✨ **Botón de Solicitar Transferencia en Dashboard**
- **Modal de llamadas activas:** Botón de "Solicitar Transferencia" agregado al modal de detalle de llamada activa
- **Funcionalidad completa:** Mismo comportamiento que en AI Call Monitor con modal de razones predefinidas y mensaje personalizado
- **Diseño accesible:** Botón con gradiente azul-púrpura, iconos claros y estados de carga
- **Integración VAPI:** Envío de transferencia al webhook de Railway con contexto completo de la llamada
- **Razones predefinidas:** 6 opciones rápidas para transferencia (mejor precio, caso especial, beneficios adicionales, etc.)
- **Mensaje personalizado:** Opción para escribir y usar mensaje personalizado

#### 🔄 **Mejoras en Suscripción Realtime de Llamadas Programadas**
- **Manejo eficiente de INSERT:** Agregado directo de nuevos registros sin recargar toda la lista
- **Filtro de usuario:** Verificación de asignación al usuario actual antes de mostrar llamadas
- **Actualización optimizada:** Manejo local de UPDATE sin recargas innecesarias
- **Ordenamiento automático:** Mantenimiento del orden por hora automáticamente
- **Logging mejorado:** Diagnóstico del estado de suscripción realtime

#### 🖼️ **Mejoras en Visualización de Imágenes del Bot**
- **Agrupación en grid:** Hasta 4 imágenes del bot agrupadas en grid 2x2 dentro de globo de conversación
- **Sin descripciones:** Descripciones ocultas para imágenes enviadas por el bot
- **Texto separado:** Texto enviado junto con imágenes mostrado en globo separado después del bloque de imágenes
- **Modal de imagen:** Click en imagen abre modal con vista completa y fondo oscuro semitransparente
- **Alineación consistente:** Imágenes del bot alineadas a la derecha como mensajes del bot
- **Carga optimizada:** Sistema de cache de URLs de imágenes para mejor rendimiento
- **Aplicado en:** Dashboard "Últimas Conversaciones" y AI Chat Monitor

#### 📁 **Archivos Principales Modificados**
- `src/components/dashboard/widgets/ActiveCallDetailModal.tsx` - Botón de transferencia y modal
- `src/components/dashboard/widgets/LlamadasProgramadasWidget.tsx` - Mejoras en realtime
- `src/components/dashboard/widgets/ConversacionesWidget.tsx` - Visualización de imágenes del bot
- `src/components/chat/LiveChatCanvas.tsx` - Visualización de imágenes del bot en chat

#### 🔧 **Implementación Técnica**
- **Suscripciones realtime:** Mejoras en manejo de eventos INSERT/UPDATE/DELETE
- **Estado local optimizado:** Actualizaciones sin recargas completas cuando es posible
- **Framer Motion:** Animaciones suaves en modales y botones
- **Cache de URLs:** Sistema de localStorage para URLs de imágenes temporales

---

## 🎯 Versión B4.0.5N6.0.0 - UI/UX: Animación de Fondo en Pantalla de Login y Mejoras Visuales (Enero 2025)

### 🎯 **RELEASE BETA - Animaciones Avanzadas en Pantalla de Login**

#### ✨ **Fondo Rotatorio con Aceleración GPU**
- **Rotación suave y continua:** Fondo con rotación lenta y sutil (0.0064 grados por frame)
- **Aceleración GPU:** Uso de `transform3d` y `will-change` para rendimiento óptimo
- **Cobertura completa:** Fondo extendido (200% x 200%) para evitar áreas negras durante la rotación
- **Aislamiento de contenido:** Solo el fondo gira, el contenido permanece estático
- **Optimización de rendimiento:** Sin afectar el rendimiento del navegador

#### 🌟 **Gradientes Radiales Animados (Estilo Yin-Yang)**
- **Movimiento circular:** Tres gradientes radiales moviéndose en patrones circulares tipo yin-yang
- **Velocidades diferenciadas:** Cada gradiente con velocidad única para efecto orgánico
- **Colores sutiles:** Tonos azul-violeta-cyan con opacidades bajas para efecto discreto
- **Transiciones suaves:** Movimiento continuo sin saltos ni cortes visibles

#### ✨ **Partículas Elevándose**
- **Efecto ascendente:** Partículas que se elevan desde la parte inferior de la pantalla
- **Desvanecimiento progresivo:** Fade out suave al llegar a la mitad de la pantalla
- **Glow sutil:** Efecto de brillo radial alrededor de cada partícula
- **Tamaño optimizado:** Partículas pequeñas (0.6-2.1px) para efecto discreto
- **Velocidad controlada:** Movimiento lento y suave (0.2-0.6px por frame)
- **Densidad equilibrada:** Máximo 20 partículas simultáneas para mantener rendimiento

#### 🎨 **Mejoras Visuales**
- **Contraste mejorado:** Partículas con opacidad ajustada (0.3-0.8) para mejor visibilidad
- **Canvas optimizado:** Opacidad del canvas ajustada a 0.7 para equilibrio visual
- **Gradientes refinados:** Colores y opacidades ajustados para mezcla perfecta
- **Sin bordes visibles:** Fondo extendido y difuminado para transiciones suaves

#### 📁 **Archivos Principales Modificados**
- `src/components/LoginScreen.tsx` - Integración de componentes de animación
- `src/components/RotatingBackground.tsx` (nuevo) - Componente de rotación GPU del fondo
- `src/components/AnimatedGradientBackground.tsx` (nuevo) - Gradientes y partículas animadas
- `src/index.css` - Estilos de fondo tecnológico y gradientes

#### 🔧 **Implementación Técnica**
- **React Hooks:** `useRef`, `useEffect` para gestión de animaciones
- **Canvas API:** Renderizado de partículas con optimización de rendimiento
- **RequestAnimationFrame:** Animaciones fluidas sincronizadas con el navegador
- **CSS Custom Properties:** Variables CSS para rotación dinámica
- **GPU Acceleration:** Transformaciones 3D y `will-change` para aceleración hardware

---

## 🎯 Versión B4.0.4N6.0.0 - UI/UX: Animaciones de Tema, Mensajes y Mejoras de Responsividad (Diciembre 2025)

### 🎯 **RELEASE BETA - Mejoras de Interfaz y Experiencia de Usuario**

#### ✨ **Animaciones de Toggle de Tema (Dark/Light Mode)**
- **Iconos animados:** Sol y luna con animaciones suaves usando framer-motion
- **Partículas decorativas:** Estrellas sutiles que aparecen durante la transición
- **Rayos del sol:** Diseño SVG refinado con animación de rotación
- **Transición global:** Cambio de colores suave en toda la aplicación
- **Diseño discreto:** Colores y efectos refinados para no distraer al usuario

#### 💬 **Rediseño de Burbujas de Mensajes**
- **Estilo WhatsApp:** Burbujas con "pico" apuntando hacia el avatar del remitente
- **Gradientes diferenciados:**
  - Cliente: Fondo claro/oscuro según tema
  - Bot: Gradiente azul-cyan
  - Agente: Gradiente violeta-púrpura
- **Sombras sutiles:** Mejor profundidad visual en cada mensaje
- **Botón animado:** "Ir a conversación" con animaciones hover y tap

#### ⏸️ **Nuevo Botón de Pausa del Bot (AI Chat Monitor)**
- **Diseño unificado:** Un solo botón reemplaza múltiples controles de pausa
- **Menú desplegable:** Opciones de duración (5min, 15min, 30min, 1h, Indefinido)
- **Contador circular:** Visualización animada del tiempo restante de pausa
- **Estados claros:** Animaciones distintas para activo, pausado y cargando
- **Reactivación intuitiva:** Click directo para reactivar sin tooltip redundante
- **Sin animaciones persistentes:** Corrección de animaciones que no se detenían

#### 📊 **Responsividad del Historial (AI Call Monitor)**
- **Tabla adaptativa:** Se ajusta al ancho disponible sin scroll horizontal
- **Texto truncado:** Nombres largos con puntos suspensivos y tooltips
- **Columnas proporcionales:**
  - Prospecto: 28%
  - Fecha: 12%
  - Duración: 8%
  - Estado: 14%
  - Interés: 10%
  - Asignación: 18%
- **Compatible con sidebar:** Se adapta correctamente cuando el sidebar está abierto/cerrado
- **table-fixed:** Layout de tabla fija para respetar anchos definidos

#### 📁 **Archivos Principales Modificados**
- `src/components/Header.tsx` - Animaciones de tema
- `src/components/linear/LinearHeader.tsx` - Animaciones de tema (linear layout)
- `src/components/linear/LinearLayout.tsx` - Transición de colores
- `src/components/dashboard/widgets/ConversacionesWidget.tsx` - Burbujas rediseñadas
- `src/components/chat/LiveChatCanvas.tsx` - Mensajes y botón de pausa
- `src/components/chat/BotPauseButton.tsx` (nuevo) - Componente de pausa del bot
- `src/components/analysis/LiveMonitorKanban.tsx` - Tabla responsiva del historial

---

## 🎯 Versión B4.0.3N6.0.0 - Prospectos: Filtros en Memoria y Mejoras de UX (Enero 2025)

### 🎯 **RELEASE BETA - Filtros Optimizados y Mejoras de Experiencia**

#### ⚡ **Filtros en Memoria (Sin Recargas)**
- **Problema resuelto:** Los filtros causaban re-renders y recargas desde la base de datos en cada cambio
- **Solución implementada:** Todos los filtros ahora funcionan en memoria sobre los datos ya cargados
- **Filtros optimizados:**
  - Búsqueda por texto: Filtrado instantáneo sin interrupciones
  - Filtro por etapa: Filtrado instantáneo en memoria
  - Filtro por campaña: Filtrado instantáneo en memoria
- **Mejora de UX:** Experiencia fluida sin delays ni interrupciones al escribir o cambiar filtros
- **Rendimiento:** Sin consultas innecesarias a la base de datos al filtrar

#### 🗑️ **Eliminación de Filtro de Score**
- **Removido:** Select de filtro por "Score" del UI
- **Razón:** Simplificación de la interfaz y reducción de complejidad
- **Estado interno:** El campo `score` se mantiene en el estado pero no se muestra en la UI

#### 🔧 **Optimizaciones Técnicas**
- **Eliminado `useEffect` de recarga:** Los filtros ya no disparan recargas desde la base de datos
- **Filtrado con `useMemo`:** Todos los filtros usan `useMemo` para filtrado eficiente en memoria
- **Sin re-renders pesados:** El filtrado es instantáneo y no causa interrupciones en la escritura

#### 📊 **Beneficios**
- ✅ Experiencia de usuario fluida sin interrupciones
- ✅ Filtrado instantáneo en todos los filtros
- ✅ Sin consultas innecesarias a la base de datos
- ✅ Mejor rendimiento al filtrar
- ✅ UI más limpia sin filtro de score

#### 📁 **Archivos Principales Modificados**
- `src/components/prospectos/ProspectosManager.tsx` - Filtros optimizados en memoria

---

## 🎯 Versión B4.0.2N6.0.0 - Prospectos: Optimización Crítica de Rendimiento y Infinite Scroll (Enero 2025)

### 🎯 **RELEASE BETA - Optimización de Rendimiento y Mejoras de UX**

#### 🚀 **Optimización Crítica: Eliminación de Problema N+1 Query**
- **Problema identificado:** El módulo de Prospectos hacía 200+ consultas individuales para enriquecer prospectos (100 prospectos × 2 consultas cada uno)
- **Solución implementada:** Carga batch de coordinaciones y ejecutivos (solo 2 consultas totales)
- **Mejora de rendimiento:** 
  - Antes: ~20 segundos para 100 prospectos
  - Ahora: ~0.7 segundos para carga inicial
  - **Mejora: ~29x más rápido** 🚀
- **Funciones optimizadas:**
  - `loadCoordinacionesAndEjecutivos()`: Carga todas las coordinaciones y ejecutivos de una vez
  - `enrichProspectos()`: Enriquecimiento usando mapas en memoria (búsqueda O(1))
  - Eliminación de `Promise.all` con múltiples consultas individuales

#### 📜 **Infinite Scroll (Carga Incremental)**
- **Técnica implementada:** Intersection Observer API para carga automática
- **Funcionamiento:**
  - Carga inicial: 50 prospectos
  - Carga automática cuando el usuario está a 200px del final
  - Indicador visual de carga mientras se obtienen más datos
- **Estados agregados:**
  - `allProspectos`: Todos los prospectos cargados
  - `loadingMore`: Estado de carga incremental
  - `hasMore`: Indica si hay más datos disponibles
  - `currentPage`: Página actual de paginación
  - `totalCount`: Contador total de prospectos
- **Batch size:** 50 prospectos por carga
- **Reset automático:** Al cambiar filtros, se resetea la carga y se recarga desde el inicio

#### 🎨 **Scroll Independiente por Columna (Vista Kanban)**
- **Funcionalidad:** Cada columna del Kanban tiene su propio scroll independiente
- **Implementación:**
  - Altura fija en contenedor padre: `calc(100vh - 280px)`
  - Cada columna con `height: 100%` y `minHeight: 0` para flexbox correcto
  - Contenedor de scroll con `height: 0` y `minHeight: 0` para que `flex-1` funcione
  - Barras de scroll invisibles usando clase `scrollbar-hide`
- **Infinite Scroll por columna:**
  - Cada columna detecta cuando está cerca del final (200px)
  - Carga automática de más prospectos filtrados por etapa específica
  - Estados independientes de carga por columna
  - Elemento sentinela (`data-sentinel`) para detectar scroll
- **Intersection Observer:** Un observer por columna para detectar scroll independiente

#### 🔧 **Mejoras Técnicas**
- **Mapeo de etapas:** Función `getEtapasForCheckpoint()` para mapear checkpoints a etapas reales
- **Estados de columnas:** `columnLoadingStates` para rastrear carga por columna
- **Función de carga incremental:** `loadMoreProspectosForColumn()` para cargar más prospectos por etapa
- **Limpieza de observers:** Desconexión correcta de Intersection Observers al desmontar

#### 📊 **Métricas de Rendimiento**
- **Carga inicial:** De ~20 segundos a ~0.7 segundos (100 prospectos)
- **Consultas reducidas:** De 200+ consultas a 2 consultas (100 prospectos)
- **Experiencia de usuario:** Carga inicial instantánea + carga incremental transparente
- **Memoria:** Impacto mínimo con paginación y carga incremental

#### 📁 **Archivos Principales Modificados**
- `src/components/prospectos/ProspectosManager.tsx` - Optimización de carga y infinite scroll
- `src/components/prospectos/ProspectosKanban.tsx` - Scroll independiente por columna
- `docs/DIAGNOSTICO_PROSPECTOS_PERFORMANCE.md` - Nuevo documento de diagnóstico

#### 🎯 **Beneficios**
- ✅ Carga inicial 29x más rápida
- ✅ Experiencia de usuario fluida con infinite scroll
- ✅ Scroll independiente por columna en Kanban
- ✅ Barras de scroll invisibles para UI limpia
- ✅ Carga incremental transparente sin interrupciones
- ✅ Mejor uso de recursos (menos consultas, menos memoria)

---

## 🎯 Versión B4.0.1N6.0.0 - Dashboard: Sistema de Notificaciones de Sonido y Optimización de Widgets (Enero 2025)

### 🎯 **RELEASE BETA - Sistema de Notificaciones y Mejoras de UI**

#### 🔊 **Sistema de Notificaciones de Sonido**
- **Notificaciones personalizables:** Implementado sistema completo de notificaciones de sonido para el dashboard
- **Sonidos personalizados:** 
  - Sonido digital para llamadas nuevas (`notification-call.mp3`)
  - Sonido UI Alert para mensajes nuevos (`notification-message.mp3`)
- **Control de notificaciones:** Componente `NotificationControl` con menú desplegable en el header del dashboard
- **Opciones de control:**
  - Toggle global para activar/desactivar todas las notificaciones
  - Toggle independiente para mensajes nuevos
  - Toggle independiente para llamadas activas
  - Botones de prueba de sonido para cada tipo
- **Persistencia:** Preferencias guardadas en `localStorage`
- **Volumen ajustable:** Control de volumen integrado (0.0 a 1.0)

#### 🎵 **Integración de Sonidos en Widgets**
- **ConversacionesWidget:** Reproduce sonido cuando llega un mensaje nuevo del cliente/prospecto
- **LlamadasActivasWidget:** Reproduce sonido cuando aparece una nueva llamada activa o cambia a estado "activa"
- **Prevención de duplicados:** Sistema de refs para evitar reproducir sonidos en carga inicial o mensajes duplicados
- **Detección inteligente:** Solo reproduce sonidos para eventos nuevos en tiempo real

#### 🎨 **Mejoras en Widget de Prospectos**
- **Simplificación:** Eliminada funcionalidad de expansión/colapso
- **Layout optimizado:** Tags de destinos preferidos movidos junto al tag de estado en la misma línea
- **Eliminación de observaciones:** Removida sección de observaciones del contenido expandido
- **Interacción simplificada:** Click en tarjeta solo abre conversación, sin expandir contenido

#### 📁 **Archivos Principales Modificados**
- `src/services/notificationSoundService.ts` - Nuevo servicio para manejo de sonidos de notificación
- `src/components/dashboard/NotificationControl.tsx` - Nuevo componente de control de notificaciones
- `src/components/Header.tsx` - Integración del componente de notificaciones
- `src/components/dashboard/widgets/ConversacionesWidget.tsx` - Integración de sonidos para mensajes
- `src/components/dashboard/widgets/LlamadasActivasWidget.tsx` - Integración de sonidos para llamadas
- `src/components/dashboard/widgets/ProspectosNuevosWidget.tsx` - Simplificación y reorganización de layout
- `docs/NOTIFICATION_SOUND_GUIDE.md` - Nueva guía para crear sonidos personalizados
- `public/sounds/notification-call.mp3` - Sonido para llamadas
- `public/sounds/notification-message.mp3` - Sonido para mensajes

---

## 🎯 Versión B4.0.0N6.0.0 - Dashboard: Limpieza de Logs y Mejoras de UI (Enero 2025)

### 🎯 **RELEASE BETA - Dashboard: Optimización y Correcciones**

#### 🧹 **Limpieza de Logs**
- **Eliminación completa de logs:** Removidos todos los `console.log`, `console.warn` y `console.error` del módulo de dashboard
- **Archivos limpiados:**
  - `ConversacionesWidget.tsx` - Eliminados todos los logs de depuración
  - `ProspectosNuevosWidget.tsx` - Eliminados todos los logs de depuración
  - `LlamadasProgramadasWidget.tsx` - Eliminados todos los logs de depuración
  - `LlamadasActivasWidget.tsx` - Eliminado `console.error`
  - `OperativeDashboard.tsx` - Eliminado `console.log`
  - `ProspectoSidebar.tsx` - Eliminados todos los logs de depuración y renderizado
- **Consola limpia:** Sin violaciones de rendimiento ni mensajes de depuración en producción

#### 🔧 **Correcciones de Funcionalidad**
- **Botón de WhatsApp en Sidebar:** Implementada funcionalidad completa del botón de WhatsApp en el sidebar de prospectos
  - Funciona desde "Prospectos - Requieren Atención"
  - Funciona desde "Últimas Conversaciones"
  - Navega correctamente a "AI Chat Monitor" con el prospecto seleccionado
  - Guarda `prospectoId` en `localStorage` para búsqueda automática
- **Integración con Live Chat:** Navegación fluida entre dashboard y módulo de chat

#### 🎨 **Mejoras de UI**
- **Color de mensajes de agentes:** Cambiado a lila discreto (`bg-purple-700 dark:bg-purple-800`) para mejor visibilidad en modo oscuro
- **Contraste mejorado:** Los mensajes de agentes ahora son claramente visibles contra el fondo oscuro
- **Consistencia visual:** Color lila suave que diferencia agentes de bot y cliente

#### 📊 **Mejoras en Widget de Conversaciones**
- **Visualización de mensajes:** Corrección en la visualización de mensajes de agentes con globo y fondo
- **Avatar único:** Eliminado avatar duplicado en mensajes
- **Burbuja siempre visible:** Los mensajes de agentes siempre muestran globo con fondo, incluso sin contenido

#### 🔧 **Correcciones Técnicas**
- **Código duplicado:** Eliminado código duplicado en `ProspectoSidebar.tsx` (React.memo comparison)
- **Props faltantes:** Agregada prop `onNavigateToLiveChat` en widgets del dashboard
- **Navegación mejorada:** Cierre automático del sidebar al navegar a Live Chat

#### 📁 **Archivos Principales Modificados**
- `src/components/dashboard/widgets/ConversacionesWidget.tsx` - Limpieza de logs y corrección de visualización de mensajes
- `src/components/dashboard/widgets/ProspectosNuevosWidget.tsx` - Limpieza de logs y agregada navegación a Live Chat
- `src/components/dashboard/widgets/LlamadasProgramadasWidget.tsx` - Limpieza de logs
- `src/components/dashboard/widgets/LlamadasActivasWidget.tsx` - Limpieza de logs
- `src/components/dashboard/OperativeDashboard.tsx` - Limpieza de logs
- `src/components/scheduled-calls/ProspectoSidebar.tsx` - Limpieza de logs y corrección de código duplicado

---

## 🎯 Versión B3.0.0N6.0.0 - Live Monitor: Optimización de Rendimiento y Sincronización de Audio (Enero 2025)

### 🎯 **RELEASE BETA - Optimización de Rendimiento y Mejoras en Live Monitor**

#### 🚀 **Optimización de Rendimiento**
- **Throttling de handlers de audio:** Handler `onTimeUpdate` optimizado con throttling de 100ms para reducir violaciones de rendimiento
- **Throttling de Realtime:** Subscripciones de Supabase Realtime con throttling de 200ms para evitar procesar demasiados eventos
- **Memoización de handlers:** Uso de `useCallback` para evitar recrear handlers en cada render
- **Optimización de búsqueda de segmentos:** Búsqueda optimizada empezando desde el último segmento conocido
- **Scroll diferido:** Uso de `requestAnimationFrame` para operaciones de scroll pesadas
- **Limpieza de recursos:** Limpieza adecuada de refs y cancelación de `requestAnimationFrame` al cerrar modales

#### 🎵 **Sincronización de Audio Mejorada**
- **Fórmula de cálculo optimizada:** Velocidad base aumentada a 17.5 chars/seg para compensar desfase de ~4 segundos
- **Factores de pausa ajustados:** Puntuación, palabras largas, números y preguntas con penalizaciones mínimas
- **Cálculo más preciso:** Basado en análisis de datos reales de mensajes medidos
- **Sincronización mejorada:** Audio y texto sincronizados con precisión mejorada

#### 📊 **Mejoras en Modal de Detalle**
- **Header mejorado:** Muestra ejecutivo asignado y coordinación junto al nombre del prospecto
- **Formato de asignación:** Tags sin placeholders ("Ejec:" o "Coord:"), solo iconos y nombres
- **Navegación mejorada:** Nombre del prospecto clickeable para abrir sidebar
- **Tabs optimizados:** Separación clara entre "Detalles de la Llamada" y "Análisis y Métricas"

#### 🔧 **Correcciones**
- **Ejecutivo asignado:** Corrección en detección de nombre del ejecutivo usando `full_name` como campo principal
- **Violaciones de rendimiento:** Reducción significativa de violaciones de 'click' y 'message' handlers
- **Memory leaks:** Prevención de memory leaks con limpieza adecuada de recursos

#### 📁 **Archivos Principales**
- `src/components/analysis/LiveMonitorKanban.tsx` - Optimizaciones de rendimiento y sincronización de audio

---

## 🎯 Versión B2.3.1N6.0.0 - Dashboard Operativo con Altura Fija (Enero 2025)

### 🎯 **RELEASE BETA - Dashboard Operativo con Layout Optimizado**

#### 📊 **Dashboard Operativo Completo**
- **4 widgets principales:** Prospectos Nuevos, Últimas Conversaciones, Llamadas Activas, Llamadas Programadas
- **Altura fija sin scroll:** El área de trabajo tiene altura fija (`calc(100vh - 128px)`) sin scroll en la página completa
- **Scroll interno individual:** Cada widget tiene su propio scroll interno sin barras visibles (`scrollbar-hide`)
- **Grid responsivo:** Cuadrícula adaptativa con `gridAutoRows: 'minmax(0, 1fr)'` para distribución uniforme
- **Sistema de configuración:** Modal para mostrar/ocultar y cambiar tamaño de widgets
- **Persistencia:** Preferencias guardadas en `localStorage` para mantener configuración entre sesiones

#### 🔄 **Suscripciones Realtime**
- **Prospectos:** Actualización automática cuando cambia `requiere_atencion_humana`
- **Conversaciones:** Suscripciones a `uchat_conversations`, `uchat_messages` y `mensajes_whatsapp`
- **Llamadas Activas:** Suscripción a `llamadas_ventas` para INSERT y UPDATE
- **Llamadas Programadas:** Suscripción a `llamadas_programadas` para cambios en tiempo real
- **Sin re-renders innecesarios:** Actualizaciones optimizadas con `useCallback` y `useMemo`

#### 🔐 **Filtros por Permisos**
- **Admin:** Ve todos los prospectos, conversaciones y llamadas
- **Coordinador:** Ve solo lo asignado a su coordinación
- **Ejecutivo:** Ve solo lo asignado a su usuario
- **Integración:** Usa `permissionsService` para filtrado consistente con otros módulos

#### 🎨 **Widget de Prospectos**
- **Filtro:** Solo muestra prospectos con `requiere_atencion_humana = true`
- **Vista expandible:** Detalles inline con historial de llamadas y highlights
- **Truncado inteligente:** `motivo_handoff` truncado a 8 palabras con expansión al hacer clic
- **Altura fija:** Scroll interno con `maxHeight: calc(100vh - 240px)`

#### 💬 **Widget de Conversaciones**
- **Dual source:** Combina `uchatService.getConversations` y `get_conversations_ordered` (WhatsApp)
- **Indicador de no leídos:** Borde verde izquierdo (`border-l-4 border-l-green-500`) para conversaciones con mensajes no leídos
- **Badges de asignación:** Muestra coordinación y ejecutivo según rol del usuario
- **Alineación de mensajes:** Cliente a la izquierda, bot/agente a la derecha
- **Imágenes pequeñas:** Máximo 150x150px, no clickeables, sin descripción
- **Navegación:** Botón "Ir a la conversación" redirige al módulo LiveChat completo

#### 📞 **Widget de Llamadas Activas**
- **Filtro de estado:** Solo muestra llamadas con `call_status = 'active'`
- **Actualización automática:** Se elimina automáticamente cuando la llamada ya no está activa
- **Redirección:** Click en llamada redirige al Live Monitor

#### 📅 **Widget de Llamadas Programadas**
- **Filtro de fecha:** Solo muestra llamadas del día actual con `estatus = 'programada'`
- **Ordenamiento:** Ordenadas por `fecha_programada` ascendente
- **Información completa:** Muestra prospecto, hora, estado y coordinación

#### 📝 **Archivos Creados/Modificados**
- `src/components/dashboard/OperativeDashboard.tsx` - Componente principal del dashboard (⭐ nuevo)
- `src/components/dashboard/DashboardConfigModal.tsx` - Modal de configuración de widgets (⭐ nuevo)
- `src/components/dashboard/widgets/ProspectosNuevosWidget.tsx` - Widget de prospectos (⭐ nuevo)
- `src/components/dashboard/widgets/ConversacionesWidget.tsx` - Widget de conversaciones (⭐ nuevo)
- `src/components/dashboard/widgets/LlamadasActivasWidget.tsx` - Widget de llamadas activas (⭐ nuevo)
- `src/components/dashboard/widgets/LlamadasProgramadasWidget.tsx` - Widget de llamadas programadas (⭐ nuevo)
- `src/components/MainApp.tsx` - Agregado caso `operative-dashboard` en switch
- `src/components/Sidebar.tsx` - Agregado item de menú para Dashboard Operativo
- `src/components/Header.tsx` - Actualizado título para Dashboard Operativo
- `src/stores/appStore.ts` - Agregado `operative-dashboard` a `AppMode`
- `src/index.css` - Clase `scrollbar-hide` para ocultar barras de scroll

#### ✅ **Beneficios**
- ✅ Vista centralizada de toda la información operativa
- ✅ Altura fija sin scroll en la página principal
- ✅ Scroll individual por widget sin barras visibles
- ✅ Actualizaciones en tiempo real sin re-renders innecesarios
- ✅ Filtrado automático por permisos de usuario
- ✅ Configuración persistente entre sesiones
- ✅ Integración completa con módulos existentes

---

## 🔴 Versión B2.3.0N6.0.0 - Mejoras en Sistema RED FLAG y Tooltip de Motivo (Enero 2025)

### 🎯 **RELEASE BETA - Optimización de Tooltip y Sincronización Realtime**

#### 🔴 **Mejoras en Tooltip de Motivo de Atención**
- **Visibilidad condicional:** El tooltip de `motivo_handoff` solo se muestra cuando `requiere_atencion_humana` está activo (`true`)
- **Ancho optimizado:** Tooltip aumentado a 480px (`w-[480px]`) para mejor distribución del texto largo
- **Pico mejorado:** El pico del globo apunta correctamente hacia el centro del botón "Requiere Atención"
- **Estilo refinado:** Padding aumentado (`px-5 py-4`) y espaciado mejorado (`space-y-3`) para mejor legibilidad

#### 🗑️ **Limpieza Automática de Motivo**
- **Borrado automático:** Cuando se desactiva `requiere_atencion_humana`, el campo `motivo_handoff` se borra automáticamente de la base de datos (`null`)
- **Sincronización:** El borrado se refleja inmediatamente en el estado local y en la UI

#### 🔄 **Suscripciones Realtime Mejoradas**
- **Actualización completa:** Las suscripciones de realtime ahora detectan cambios tanto en `requiere_atencion_humana` como en `motivo_handoff`
- **Sincronización bidireccional:** Los cambios se propagan desde la base de datos hacia la UI y viceversa
- **Actualización en mensajes nuevos:** Cuando llega un nuevo mensaje, se actualiza también `motivo_handoff` si ha cambiado
- **Re-render optimizado:** Uso de `startTransition` para actualizaciones no bloqueantes del UI

#### 📝 **Archivos Modificados**
- `src/components/chat/LiveChatCanvas.tsx` - Tooltip condicional, borrado automático, suscripciones mejoradas (⭐ 5000+ líneas)

#### ✅ **Beneficios**
- ✅ Tooltip solo visible cuando es relevante (requiere atención activo)
- ✅ Mejor legibilidad con tooltip más ancho
- ✅ Limpieza automática de datos obsoletos
- ✅ Sincronización completa en tiempo real de todos los estados
- ✅ Mejor rendimiento con actualizaciones optimizadas

---

## 🔴 Versión B2.2.9N6.0.0 - Sistema RED FLAG y Llamadas Programadas en Chat (Enero 2025)

### 🎯 **RELEASE BETA - Sistema de Atención Humana y Llamadas en Chat**

#### 🔴 **Sistema RED FLAG para Atención Humana**
- **Indicador visual en conversaciones:** RED FLAG vectorizado alineado a la derecha en la lista de conversaciones para prospectos con `requiere_atencion_humana = true`
- **Animación de recordatorio:** La bandera se sacude cada 60 segundos durante 5 segundos como recordatorio visual
- **Indicador interactivo en chat:** Botón prominente junto a los controles de pausa del bot que indica cuando un prospecto requiere atención humana
- **Toggle interactivo:** Al hacer clic, la bandera cambia de estado (rojo activo ↔ gris resuelto) con animación de sacudida
- **Sincronización Realtime:** El estado se actualiza automáticamente cuando cambia durante una conversación
- **Persistencia en BD:** Los cambios se guardan inmediatamente en la tabla `prospectos`

#### 📞 **Llamadas Programadas Integradas en Chat**
- **Visualización estilo WhatsApp:** Las llamadas programadas aparecen como burbujas de mensaje en el flujo de conversación
- **Alineación a la derecha:** Las llamadas se muestran del lado derecho ya que son programadas por el equipo
- **Información completa:** Muestra estado (realizada, no contestada, programada), duración, programada por y timestamp
- **Estilo consistente:** Fondo oscuro (`bg-slate-900`) igual que mensajes del agente, con iconos de teléfono coloreados según estado
- **Integración cronológica:** Las llamadas se ordenan cronológicamente junto con los mensajes de WhatsApp
- **Datos enriquecidos:** Obtiene duración desde `llamadas_ventas` cuando la llamada fue ejecutada

#### 👤 **Identificación de Remitentes en Mensajes**
- **Campo id_sender:** Los mensajes ahora incluyen el ID del usuario que los envió
- **Nombre del remitente:** Se obtiene el nombre completo desde `auth_users` usando `id_sender`
- **Tooltip en avatar:** Al pasar el mouse sobre el avatar, se muestra el nombre del usuario que envió el mensaje
- **Fallback inteligente:** Si no hay `id_sender`, muestra "Bot Vidanta" o "Cliente" según corresponda
- **Envío de id_sender:** Al enviar imágenes, textos o textos predeterminados, se incluye `id_sender` en el payload

#### 🔄 **Suscripciones Realtime Mejoradas**
- **Actualización de requiere_atencion_humana:** Nueva suscripción a cambios en `prospectos` para actualizar el estado en tiempo real
- **Sincronización de llamadas:** Suscripción a `llamadas_programadas` (INSERT, UPDATE, DELETE) para actualizar el chat automáticamente
- **Actualización de nombres:** Cuando llega un nuevo mensaje, se obtiene el nombre del remitente automáticamente

#### 📝 **Archivos Modificados**
- `src/components/chat/LiveChatCanvas.tsx` - Sistema RED FLAG, llamadas programadas, id_sender (⭐ 5000+ líneas)
- `src/components/chat/ImageCatalogModal.tsx` - Envío de id_sender en imágenes
- `src/services/prospectsService.ts` - Método `updateProspect` para actualizar `requiere_atencion_humana`

#### ✅ **Beneficios**
- ✅ Visibilidad inmediata de prospectos que requieren atención humana
- ✅ Recordatorio visual constante con animación periódica
- ✅ Integración completa de llamadas programadas en el flujo de conversación
- ✅ Identificación clara de quién envió cada mensaje
- ✅ Sincronización en tiempo real de todos los estados

---

## 🎨 Versión B2.2.7N6.0.0 - Mejoras en Reproductor de Audio y Timeline (Enero 2025)

### 🎯 **RELEASE BETA - Optimización de Experiencia de Chat**

#### 🎵 **Reproductor de Audio Rediseñado**
- **Diseño minimalista estilo WhatsApp:** Reproductor completamente rediseñado con estilo limpio y moderno
- **Integración visual perfecta:** Mismo fondo y colores que los mensajes del chat (cliente y bot/agente)
- **Bloque unificado:** Reproductor y descripción en un solo contenedor sin bordes visibles
- **Colores adaptativos:** 
  - Cliente: `bg-white dark:bg-gray-700` con texto `text-slate-900 dark:text-white`
  - Bot/Agente: `bg-slate-900 dark:bg-gray-800` con texto `text-white`
- **Paddings optimizados:** Espaciado mejorado para mejor legibilidad y estética
- **Controles personalizados:** Botón play/pause circular, barra de progreso delgada, tiempo formateado
- **Sin elementos innecesarios:** Eliminado nombre de archivo, bordes y gradientes para diseño más limpio

#### 📅 **Llamadas Programadas en Timeline**
- **Eventos en timeline:** Las llamadas programadas ahora aparecen en el timeline de la conversación
- **Diferenciación visual:** 
  - Futuras: Borde púrpura y fondo púrpura claro con icono de calendario
  - Pasadas: Estilo normal con icono de teléfono gris
- **Información completa:** Muestra fecha/hora formateada y motivo de la llamada
- **Integración cronológica:** Se ordenan junto con llamadas ejecutadas y conversaciones WhatsApp

#### 📝 **Archivos Modificados**
- `src/components/chat/MultimediaMessage.tsx` - Reproductor de audio rediseñado (⭐ 672 líneas)
- `src/components/chat/ProspectDetailSidebar.tsx` - Timeline con llamadas programadas

#### ✅ **Beneficios**
- ✅ Reproductor de audio más estético y profesional
- ✅ Mejor integración visual con el resto del chat
- ✅ Experiencia más limpia sin elementos innecesarios
- ✅ Timeline más completo con información de llamadas programadas
- ✅ Diseño consistente en modo claro y oscuro

---

## 🤖 Versión B2.2.6N6.0.0 - Mejoras en Control de Bot y Multimedia (Enero 2025)

### 🎯 **RELEASE BETA - Optimización de Experiencia de Chat**

#### ⏸️ **Sistema de Pausa del Bot Mejorado**
- **Indicador visual en conversaciones:** Avatar de conversaciones muestra icono de pausa (ámbar/naranja) cuando el bot está pausado
- **Manejo de errores:** Notificaciones toast cuando el webhook de pausa falla (código 400) o hay timeout
- **Timeout de 6 segundos:** Webhook de pausa tiene timeout máximo de 6 segundos con manejo de errores
- **Tiempo restante mejorado:** Cuando el bot está pausado indefinidamente, muestra el tiempo restante del mes completo (ej: "29d 12h")
- **Formato de tiempo:** Mejorado para mostrar días, horas y minutos de forma más legible
- **Persistencia:** Estado de pausa se guarda en base de datos y localStorage para persistencia entre sesiones

#### 🖼️ **Mejoras en Multimedia**
- **Descripción oculta para imágenes del prospecto:** Las imágenes enviadas por el prospecto no muestran descripción (solo las del bot/agente)
- **Stickers optimizados:** 
  - Tamaño reducido a 120px (antes 150px) para mejor integración visual
  - Sin descripción (oculta automáticamente)
  - No descargables (sin botón de descarga)
- **Detección mejorada:** Lógica mejorada para distinguir stickers de imágenes basada en patrón de filename

#### 🎨 **Mejoras en UI/UX**
- **Indicadores visuales:** Avatar de conversación cambia a color ámbar/naranja con icono de pausa cuando el bot está pausado
- **Prioridad visual:** Llamada activa > Bot pausado > Avatar normal
- **Notificaciones:** Mensajes claros cuando falla la pausa/reactivación del bot

#### 📝 **Archivos Modificados**
- `src/components/chat/LiveChatCanvas.tsx` - Sistema de pausa mejorado con manejo de errores y timeout (⭐ 4365 líneas)
- `src/components/chat/MultimediaMessage.tsx` - Mejoras en detección de stickers y ocultación de descripciones (⭐ 567 líneas)
- `src/services/botPauseService.ts` - Servicio de gestión de pausa con persistencia en BD

#### ✅ **Beneficios**
- ✅ Mejor visibilidad del estado de pausa del bot en la lista de conversaciones
- ✅ Experiencia más limpia sin descripciones redundantes en imágenes del prospecto
- ✅ Stickers más integrados visualmente con tamaño optimizado
- ✅ Manejo robusto de errores con feedback claro al usuario
- ✅ Tiempo restante más informativo para pausas indefinidas

---

## 🎨 Versión B2.2.5N6.0.0 - Homologación de Sidebars de Prospectos (Enero 2025)

### 🎯 **RELEASE BETA - Unificación de Interfaz de Usuario**

#### 📋 **Homologación Completa de Sidebars**
- **Ancho unificado:** Todos los sidebars ahora tienen el mismo ancho (`w-[540px]`) en todos los módulos
- **Header estandarizado:** Mismo estilo con gradiente `from-blue-500 to-purple-600` y avatar circular en todos los módulos
- **Orden de secciones unificado:**
  1. Etapa Destacada (con gradiente sutil y score)
  2. Información Personal y Contacto (incluye Ingresos)
  3. Información de Asignación (con AssignmentBadge)
  4. Información de Viaje
  5. Llamadas Programadas
  6. Observaciones (con soporte Markdown)
  7. Timeline (con llamadas y conversaciones WhatsApp)
- **Tipografía homologada:** Mismos tamaños de fuente, espaciado y estilos en todas las secciones
- **Colores y efectos unificados:** Barras de sección con gradientes, fondos y bordes consistentes
- **Animaciones consistentes:** Mismos delays y transiciones en todos los sidebars

#### 🔄 **Mejoras en Timeline**
- **Llamadas clickeables:** Los eventos de llamadas en el timeline ahora son clickeables y abren el modal `CallDetailModal`
- **Integración completa:** Historial de llamadas integrado en el timeline (sección dedicada eliminada)
- **Conversaciones WhatsApp:** Incluye grupos de conversaciones de `uchat_conversations` en el timeline
- **Ordenamiento:** Eventos ordenados por fecha descendente (más reciente primero)
- **Información detallada:** Cada evento muestra fecha, hora y descripción contextual

#### 🔄 **Actualización de Datos**
- **Carga fresca:** Los sidebars ahora cargan datos frescos cada vez que se abren
- **Reset de estados:** Estados se resetean al abrir para evitar datos obsoletos
- **Carga de información adicional:** Carga automática de información de coordinación y ejecutivo cuando está disponible

#### 📝 **Archivos Modificados**
- `src/components/chat/ProspectDetailSidebar.tsx` - Homologación completa (⭐ 803 líneas)
- `src/components/prospectos/ProspectosManager.tsx` - Homologación completa (⭐ 1888 líneas)
- `src/components/analysis/AnalysisIAComplete.tsx` - Homologación completa (⭐ 2759 líneas)
- `src/components/analysis/LiveMonitorKanban.tsx` - Homologación completa (⭐ 3938 líneas)
- `src/components/shared/ScheduledCallsSection.tsx` - Integración mejorada
- `src/components/chat/CallDetailModal.tsx` - Reutilizado en todos los módulos

#### ✅ **Beneficios**
- ✅ Experiencia de usuario consistente en todos los módulos
- ✅ Navegación más intuitiva con timeline unificado
- ✅ Acceso rápido a detalles de llamadas desde el timeline
- ✅ Datos siempre actualizados al abrir el sidebar
- ✅ Código más mantenible con estructura unificada
- ✅ Mejor organización visual con secciones claramente definidas

---

## 🔔 Versión B2.2.4N6.0.0 - Sistema de Notificaciones para Administradores (Enero 2025)

### 🎯 **RELEASE BETA - Sistema de Mensajería Administrativa**

#### 📬 **Sistema de Notificaciones para Administradores**
- **Buzón de mensajes:** Botón exclusivo en el header para administradores con contador de notificaciones sin leer
- **Modal de mensajería:** Modal centrado con lista de mensajes y vista detallada
- **Tipos de mensajes iniciales:**
  - `password_reset_request`: Solicitudes de restablecimiento de contraseña desde login
  - `user_unblock_request`: Solicitudes de desbloqueo de cuenta después de 4 intentos fallidos
- **Gestión de mensajes:** Marcar como leído, resolver, archivar con notas opcionales
- **Desbloqueo automático:** Al resolver un mensaje de desbloqueo, se desbloquea automáticamente la cuenta del usuario
- **Realtime:** Actualización en tiempo real de nuevos mensajes con contador dinámico

#### 🔐 **Sistema de Bloqueo de Cuentas**
- **Bloqueo automático:** Después de 4 intentos fallidos de login, la cuenta se bloquea por 30 minutos
- **Modal de desbloqueo:** Usuario bloqueado ve modal con opción de contactar al administrador
- **Mensaje de confirmación:** Usuario recibe confirmación visual antes de cerrar el modal
- **Integración:** Mensajes automáticos al buzón del administrador con información del bloqueo

#### 🔄 **Mejoras en Login**
- **Modal de restablecimiento:** Nuevo modal para solicitar restablecimiento de contraseña
- **Mensaje de confirmación:** Usuario recibe confirmación visual después de enviar solicitud
- **Logging mejorado:** Errores de login incluyen email del usuario en el mensaje
- **Corrección de función:** Corregida función `log_user_login` con tipos correctos

#### 🎨 **Mejoras en UI/UX**
- **Footer actualizado:** 
  - Cambio de "AI Builder & Analysis Platform" a "Vidanta World Vacation Planner"
  - Cambio de "Designed by SamuelRosales" a "Designed by AI Division" con tooltip interactivo
  - Tooltip muestra avatares y nombres de Samuel Rosales y Rodrigo Mora
- **Modales centrados:** Todos los modales administrativos ahora usan `createPortal` para centrado perfecto
- **Contador visual:** Badge rojo con número de mensajes sin leer en el botón del buzón

#### 📝 **Archivos Modificados**
- `src/services/adminMessagesService.ts` - Nuevo servicio para gestión de mensajes administrativos (⭐ 451 líneas)
- `src/components/admin/AdminMessagesModal.tsx` - Modal de mensajería con gestión completa (⭐ 429 líneas)
- `src/components/auth/PasswordResetModal.tsx` - Modal para solicitar restablecimiento de contraseña
- `src/components/auth/AccountUnlockModal.tsx` - Modal para solicitar desbloqueo de cuenta
- `src/components/Header.tsx` - Botón de buzón con contador y integración de modales
- `src/components/LoginScreen.tsx` - Integración de modales de restablecimiento y desbloqueo
- `src/services/authService.ts` - Mejoras en logging y función `unlockUserAccount`
- `src/services/errorLogService.ts` - Inclusión de email de usuario en errores de autenticación
- `src/components/Footer.tsx` - Actualización de branding y tooltip de AI Division
- `scripts/sql/create_admin_messages_table.sql` - Tabla de mensajes administrativos
- `scripts/sql/create_admin_message_rpc_final.sql` - Funciones RPC para crear mensajes
- `scripts/sql/create_unlock_user_account_rpc.sql` - Función RPC para desbloquear cuentas
- `scripts/sql/update_authenticate_user_block_after_4.sql` - Actualización de función de autenticación

#### ✅ **Beneficios**
- ✅ Administradores pueden gestionar solicitudes de usuarios de forma centralizada
- ✅ Usuarios bloqueados pueden solicitar desbloqueo fácilmente
- ✅ Sistema de notificaciones escalable para futuros tipos de mensajes
- ✅ Mejor experiencia de usuario con confirmaciones visuales
- ✅ Branding actualizado reflejando el propósito real de la plataforma
- ✅ Reconocimiento del equipo AI Division en el footer

---

## 👤 Versión B2.2.3N6.0.0 - Gestión de Perfil de Usuario y Corrección de Sistema de Avatares (Enero 2025)

### 🎯 **RELEASE BETA - Mejoras de Usuario y Correcciones Críticas**

#### 👤 **Modal de Perfil de Usuario**
- **Nuevo modal:** Creado `UserProfileModal.tsx` para que cualquier usuario pueda cambiar su foto de perfil y/o contraseña
- **Acceso desde avatar:** Click en el avatar del header abre el modal centrado en pantalla
- **Dos pestañas:**
  - **Foto de Perfil:** Subir nueva imagen, preview en tiempo real, eliminar avatar existente
  - **Contraseña:** Cambio seguro con validación de contraseña actual y requisitos de seguridad
- **Validaciones:** Tamaño máximo 5MB, formatos permitidos (JPEG, PNG, GIF, WebP)
- **Notificaciones:** Toast notifications para éxito/error en todas las operaciones
- **Integración:** Notifica cambios globalmente usando `userProfileEvents` para actualizar header automáticamente

#### 🔧 **Corrección Crítica del Sistema de Avatares**
- **Problema identificado:** El bucket `user-avatars` está en PQNC pero la función RPC `upload_user_avatar` está en System UI
- **Solución implementada:**
  - Storage (subida de archivo): Usa `pqncSupabaseAdmin` para subir al bucket en PQNC (`hmmfuhqgvsehkizlfzga`)
  - RPC (guardar en BD): Usa `supabaseSystemUIAdmin` para llamar a la función RPC en System UI (`zbylezfyagwrxoecioup`)
  - Eliminación: Usa `supabaseSystemUIAdmin` para eliminar de la tabla en System UI
- **Archivos corregidos:**
  - `UserProfileModal.tsx` - Usa ambos clientes correctamente
  - `AvatarUpload.tsx` - Usa ambos clientes correctamente
  - `UserManagement.tsx` - Corregido para usar ambos clientes en todas las operaciones

#### 📝 **Mejoras en Sidebars de Prospectos**
- **Markdown en Observaciones:** Campo "Observaciones" ahora interpreta markdown correctamente con soporte para negritas y saltos de línea
- **Etapa destacada:** Sección "Etapa" con mayor protagonismo pero con color menos llamativo (`bg-blue-50` en lugar de gradiente fuerte)
- **Reestructuración de secciones:**
  - "Ingresos" movido a "Información Personal y Contacto"
  - Eliminada sección "Información Comercial"
  - Nuevo orden: Información del Viaje → Llamadas Programadas → Observaciones → Timeline
- **Timeline mejorado:**
  - Incluye eventos de historial de llamadas con hora
  - Incluye conversaciones WhatsApp (grupos de `uchat_conversations`)
  - Ordenado de más reciente a más antiguo
- **Historial de Llamadas:** Siempre visible, muestra hora además de fecha, mensaje cuando está vacío

#### 🔄 **Mejoras en Llamadas Programadas**
- **Validación robusta:** Validación mejorada para evitar múltiples llamadas programadas por prospecto
- **Modo INSERT/UPDATE:** El modal detecta automáticamente si existe una llamada programada y cambia entre modo INSERT y UPDATE
- **Pre-validación:** Verificación antes de enviar para prevenir duplicados
- **Corrección de servicio:** Corregido `ReferenceError` en `scheduledCallsService.ts` con filtrado correcto de permisos

#### 📝 **Archivos Modificados**
- `src/components/shared/UserProfileModal.tsx` - Nuevo modal para gestión de perfil (⭐ 555 líneas)
- `src/components/shared/ManualCallModal.tsx` - Mejoras en validación de llamadas programadas
- `src/components/admin/AvatarUpload.tsx` - Corrección para usar ambos clientes (PQNC + System UI)
- `src/components/admin/UserManagement.tsx` - Corrección para usar ambos clientes en operaciones de avatar
- `src/components/Header.tsx` - Integración del modal de perfil con click en avatar
- `src/components/chat/ProspectDetailSidebar.tsx` - Mejoras en UI, markdown, timeline
- `src/components/prospectos/ProspectosManager.tsx` - Mejoras en UI, markdown, timeline
- `src/components/analysis/AnalysisIAComplete.tsx` - Mejoras en UI, markdown, timeline
- `src/services/scheduledCallsService.ts` - Corrección de `ReferenceError` y filtrado de permisos
- `src/components/Footer.tsx` - Versión actualizada a B2.2.3N6.0.0

#### ✅ **Beneficios**
- ✅ Usuarios pueden gestionar su propio perfil sin necesidad de administrador
- ✅ Sistema de avatares funcionando correctamente en todos los módulos
- ✅ Mejor experiencia visual en sidebars de prospectos
- ✅ Timeline más completo con información de llamadas y WhatsApp
- ✅ Validación robusta previene duplicados en llamadas programadas
- ✅ Código más mantenible con separación clara de responsabilidades

---

## 🔔 Versión B2.2.2N6.0.0 - Live Chat: Indicador de Llamadas Activas y Corrección de Sonido Duplicado (Enero 2025)

### 🎯 **RELEASE BETA - Mejoras de UX y Correcciones**

#### 🔔 **Indicador Visual de Llamadas Activas en Live Chat**
- **Avatar dinámico:** Cuando un prospecto tiene una llamada activa, el avatar cambia de iniciales a icono de teléfono vectorizado
- **Estilo distintivo:** Fondo verde con degradado (`from-green-500 to-emerald-600`) para diferenciarlo del avatar normal
- **Animación heartbeat:** Animación tipo heartbeat (escala 1 → 1.1 → 1) cada 1.5 segundos
- **Navegación directa:** Click en el avatar navega automáticamente al módulo Live Monitor
- **Detección automática:** Verificación periódica cada 10 segundos de llamadas activas
- **Filtrado inteligente:** Solo cuenta llamadas realmente activas (sin razón de finalización, sin duración, < 15 minutos)

#### 🔧 **Corrección de Sonido Duplicado**
- **Problema resuelto:** Sonido de notificación se reproducía dos veces cuando una llamada llegaba al checkpoint #5
- **Solución:** Eliminado sonido duplicado en Live Monitor, solo Sidebar reproduce el sonido
- **Deduplicación:** Agregada lógica en Sidebar para evitar procesar la misma llamada múltiples veces en menos de 2 segundos
- **Resultado:** Sonido se reproduce solo una vez, independientemente del módulo activo

#### 📝 **Archivos Modificados**
- `src/components/chat/LiveChatCanvas.tsx` - Indicador visual de llamadas activas con avatar dinámico
- `src/components/analysis/LiveMonitorKanban.tsx` - Eliminado sonido duplicado, solo notificación
- `src/components/Sidebar.tsx` - Deduplicación de sonido para evitar reproducciones múltiples
- `src/components/chat/CHANGELOG_LIVECHAT.md` - Documentación de cambios del módulo
- `src/components/Footer.tsx` - Versión actualizada a B2.2.2N6.0.0

#### ✅ **Beneficios**
- ✅ Identificación visual inmediata de prospectos en llamada activa
- ✅ Navegación fluida entre módulos con un solo clic
- ✅ Experiencia de audio mejorada sin duplicaciones
- ✅ Feedback visual claro sin saturación

---

## 🎨 Versión B2.2.1N6.0.0 - Llamadas Programadas: Mejoras Visuales y UX (Enero 2025)

### 🎯 **RELEASE BETA - Mejoras de Interfaz**

#### 🎨 **Mejoras Visuales en Llamadas Programadas**
- **Badge de contador en calendario:** Reemplazado el punto pequeño por un badge circular con contador de llamadas programadas por día
- **Posicionamiento optimizado:** Badge ubicado en la esquina inferior derecha del día, sobre el borde para mejor visibilidad
- **Overlay animado en hover:** Implementado degradado animado que emerge desde el borde derecho al pasar el mouse sobre tarjetas ejecutadas/no contestadas
- **Diferenciación visual:** Degradado verde para ejecutadas y rojo para no contestadas, solo visible en hover para mantener diseño minimalista
- **Compatibilidad de temas:** Funciona correctamente en modo claro y oscuro

#### 📝 **Archivos Modificados**
- `src/components/scheduled-calls/CalendarSidebar.tsx` - Implementación de badge de contador en calendario
- `src/components/scheduled-calls/views/DailyView.tsx` - Overlay animado en hover para tarjetas ejecutadas/no contestadas
- `src/components/scheduled-calls/views/WeeklyView.tsx` - Overlay animado en hover para tarjetas ejecutadas/no contestadas
- `src/components/scheduled-calls/CHANGELOG_SCHEDULED_CALLS.md` - Documentación de cambios del módulo
- `src/components/Footer.tsx` - Versión actualizada a B2.2.1N6.0.0

#### ✅ **Beneficios**
- ✅ Mejor identificación visual de días con múltiples llamadas programadas
- ✅ Feedback visual mejorado al interactuar con tarjetas
- ✅ Diseño más limpio y profesional
- ✅ Experiencia de usuario mejorada sin saturación visual

---

## 🗑️ Versión B2.1.9N6.0.0 - Eliminación Completa del Módulo Prompts Manager (Enero 2025)

### 🎯 **RELEASE BETA - Limpieza de Código**

#### 🗑️ **Eliminación del Módulo Prompts Manager**
- **Módulo eliminado completamente:** Todo el módulo Prompts Manager ha sido removido del sistema
- **Archivos eliminados:**
  - `src/components/prompts/PromptsManager.tsx` - Componente principal
  - `src/components/prompts/VAPIConfigEditor.tsx` - Editor de configuración VAPI
  - `src/components/prompts/PromptVersionHistory.tsx` - Historial de versiones
  - `src/components/prompts/PromptVersionManager.tsx` - Gestor de versiones
  - `src/components/prompts/ToolsEditor.tsx` - Editor de herramientas
  - `src/components/prompts/WorkflowMetrics.tsx` - Métricas de workflows
  - `src/components/prompts/README.md` - Documentación del módulo
  - `src/services/promptsDbService.ts` - Servicio de base de datos
  - Directorio completo `src/components/prompts/` eliminado
- **Referencias eliminadas:**
  - `MainApp.tsx` - Import y case del módulo eliminados
  - `Sidebar.tsx` - Item del menú eliminado
  - `Header.tsx` - Referencias en tipos y título eliminadas
  - `appStore.ts` - Tipo `'prompts-manager'` eliminado de AppMode
  - `errorLogService.ts` - Referencia en moduleMap eliminada
  - `supabaseSystemUI.ts` - Tipos específicos eliminados (PromptVersion, WorkflowMetrics, PromptChangeLog)
  - `config/README.md` - Referencias en documentación eliminadas

#### 📝 **Archivos Modificados**
- `src/components/MainApp.tsx` - Eliminación de import y case de PromptsManager
- `src/components/Sidebar.tsx` - Eliminación de item del menú
- `src/components/Header.tsx` - Eliminación de referencias en tipos
- `src/stores/appStore.ts` - Eliminación de tipo 'prompts-manager' de AppMode
- `src/services/errorLogService.ts` - Eliminación de referencia en moduleMap
- `src/config/supabaseSystemUI.ts` - Eliminación de tipos específicos del módulo
- `src/config/README.md` - Actualización de documentación
- `src/components/Footer.tsx` - Versión actualizada a B2.1.9N6.0.0

#### ✅ **Beneficios**
- ✅ Código más limpio y mantenible
- ✅ Reducción de complejidad del sistema
- ✅ Menor superficie de código a mantener
- ✅ Eliminación de dependencias innecesarias

---

## 🧹 Versión B2.1.8N6.0.0 - Live Chat: Limpieza de Logs Innecesarios (Enero 2025)

### 🎯 **RELEASE BETA - Limpieza y Optimización**

#### 🧹 **Limpieza de Logs de Consola**
- **Logs eliminados de ImageCatalogModal:** Removidos todos los logs informativos de filtrado, renderizado, carga de imágenes y envío
- **Logs eliminados de ParaphraseModal:** Removidos logs de envío al webhook N8N, respuestas, warnings y registros
- **Logs eliminados de moderationService:** Removidos logs de registro de warnings de moderación
- **Logs eliminados de paraphraseLogService:** Removidos logs de registro de logs de parafraseo
- **Consola limpia:** Solo se mantienen `console.error` para errores críticos
- **Funcionalidad intacta:** Todas las funciones se mantienen, solo se eliminaron logs informativos

#### 📝 **Archivos Modificados**
- `src/components/chat/ImageCatalogModal.tsx` - Eliminación completa de logs informativos
- `src/components/chat/ParaphraseModal.tsx` - Eliminación de logs de webhook y warnings
- `src/services/moderationService.ts` - Eliminación de logs de registro de warnings
- `src/services/paraphraseLogService.ts` - Eliminación de logs de registro de parafraseo
- `src/components/Footer.tsx` - Versión actualizada a B2.1.8N6.0.0

#### ✅ **Beneficios**
- ✅ Consola completamente limpia sin información innecesaria
- ✅ Mejor rendimiento al reducir escrituras innecesarias a consola
- ✅ Mejor seguridad al no exponer información del sistema en consola
- ✅ Experiencia de desarrollo más limpia y profesional

---

## 💬 Versión B2.1.7N6.0.0 - Live Chat: Corrección de Marcado de Mensajes como Leídos (Enero 2025)

### 🎯 **RELEASE BETA - Corrección de Funcionalidad Crítica**

#### 💬 **Corrección de Marcado de Mensajes como Leídos**
- **Problema resuelto:** Los mensajes no se marcaban como leídos en la base de datos al abrir una conversación
- **Error identificado:** La función RPC `mark_messages_as_read` fallaba porque intentaba usar la tabla `leido_change_audit` que no existía
- **Trigger bloqueante:** Existía un trigger `trg_prevent_leido_true` que bloqueaba los updates y causaba errores
- **Solución implementada:**
  - Creada tabla `leido_change_audit` en la base de datos con estructura completa
  - Eliminado trigger bloqueante `trg_prevent_leido_true` que impedía marcar mensajes como leídos
  - Recreada función RPC `mark_messages_as_read` con `SECURITY DEFINER` para bypass de RLS y triggers
  - Simplificado código del frontend para usar directamente el RPC sin fallbacks innecesarios
- **Comportamiento corregido:**
  - Al abrir una conversación → Los mensajes se marcan como leídos EN LA BASE DE DATOS
  - Al refrescar la página → El contador permanece en 0 porque los mensajes ya están marcados como leídos
  - Nuevos mensajes mientras está abierta → Se marcan automáticamente como leídos
  - Al cambiar de conversación → Los mensajes de la anterior ya están marcados, contador solo sube con mensajes nuevos
  - Al cambiar de módulo/recargar → Los mensajes ya están marcados como leídos en BD

#### 🗄️ **Cambios en Base de Datos**
- **Tabla creada:** `public.leido_change_audit`
  - Columnas: `id` (UUID), `mensaje_id` (UUID), `old_leido` (BOOLEAN), `new_leido` (BOOLEAN), `changed_at` (TIMESTAMP), `changed_by` (TEXT), `operation_type` (TEXT)
  - Índices creados para optimización: `idx_leido_audit_mensaje`, `idx_leido_audit_changed_at`
- **Trigger eliminado:** `trg_prevent_leido_true` en `mensajes_whatsapp`
- **Función recreada:** `mark_messages_as_read(p_prospecto_id UUID)`
  - Tipo: `SECURITY DEFINER` para bypass de RLS y triggers
  - Funcionalidad: Marca todos los mensajes del Prospecto como leídos
  - Retorna: JSONB con `success`, `messages_marked`, `message_ids`

#### 📝 **Archivos Modificados**
- `src/components/chat/LiveChatCanvas.tsx` - Simplificación de `markConversationAsRead()` para usar RPC directamente
- `src/components/Footer.tsx` - Versión actualizada a B2.1.7N6.0.0
- Base de datos: Tabla `leido_change_audit` creada, trigger eliminado, función recreada

#### ✅ **Beneficios**
- ✅ Los mensajes se marcan correctamente como leídos en la base de datos
- ✅ El contador de mensajes no leídos funciona correctamente al refrescar
- ✅ Persistencia de estado de lectura entre sesiones
- ✅ Mejor experiencia de usuario con contadores precisos
- ✅ Sistema de auditoría funcional para cambios de estado de lectura

---

## 🔔 Versión B2.1.6N6.0.0 - Sidebar: Corrección de Animación de Logo en Checkpoint #5 (Enero 2025)

### 🎯 **RELEASE BETA - Corrección de Funcionalidad**

#### 🔔 **Corrección de Animación del Logo del Sidebar**
- **Problema resuelto:** El logo del sidebar solo se animaba una vez cuando llegaba una llamada a "presentación de oportunidad" (checkpoint #5)
- **Causa identificada:** El `useEffect` no se ejecutaba correctamente en notificaciones consecutivas debido a dependencias incorrectas
- **Solución implementada:**
  - Dependencias actualizadas para usar `activeCallNotification?.timestamp` para detectar cada nueva notificación
  - Reset del estado `isRinging` antes de reactivar la animación
  - Verificación de timestamp para asegurar que se activa la notificación correcta
  - Delay de activación para permitir reset antes de activar la animación
- **Resultado:** El logo ahora se anima correctamente cada vez que llega una nueva llamada a checkpoint #5, incluso con múltiples llamadas consecutivas

#### 📝 **Archivos Modificados**
- `src/components/Sidebar.tsx` - Corrección del `useEffect` para manejar múltiples notificaciones consecutivas
- `src/components/Footer.tsx` - Versión actualizada a B2.1.6N6.0.0

#### ✅ **Beneficios**
- ✅ Animación del logo funciona correctamente en todas las llamadas a checkpoint #5
- ✅ Mejor experiencia de usuario con feedback visual consistente
- ✅ Sistema de notificaciones más robusto y confiable

---

## 🔒 Versión B2.1.6N6.1.0 - Live Monitor: Limpieza Completa de Logs de Seguridad (Enero 2025)

### 🎯 **RELEASE BETA - Seguridad y Limpieza**

#### 🔒 **Limpieza de Logs de Seguridad**
- **Logs eliminados de servicios optimizados:** Removidos todos los logs informativos de `liveMonitorKanbanOptimized.ts`
- **Logs eliminados de servicios base:** Removidos logs de `liveMonitorOptimizedService.ts`
- **Logs de Realtime eliminados:** Removidos logs de suscripciones y cambios en tiempo real
- **Logs de clasificación eliminados:** Removidos logs de clasificación de llamadas y estadísticas
- **Consola completamente limpia:** Solo se mantienen `console.error` para errores críticos
- **Funcionalidad intacta:** Todas las funciones se mantienen, solo se eliminaron logs informativos

#### 📝 **Archivos Modificados**
- `src/services/liveMonitorKanbanOptimized.ts` - Eliminación completa de logs informativos
- `src/services/liveMonitorOptimizedService.ts` - Eliminación de logs de llamadas activas y Realtime
- `src/components/Footer.tsx` - Versión actualizada a B2.1.6N6.1.0

#### ✅ **Beneficios**
- ✅ Consola completamente limpia sin información sensible
- ✅ Mejor seguridad al no exponer información del sistema en consola
- ✅ Mejor rendimiento al reducir escrituras innecesarias a consola
- ✅ Experiencia de desarrollo más limpia y profesional

---

## 🧹 Versión B2.1.5N6.1.0 - Live Monitor: Limpieza Completa de Logs y Eliminación de Botón Actualizar (Enero 2025)

### 🎯 **RELEASE BETA - Limpieza y Optimización Completa**

#### 🧹 **Limpieza Completa de Logs de Consola**
- **Logs eliminados de componentes:** Removidos todos los logs informativos de `LiveMonitorKanban.tsx` y `LiveMonitor.tsx`
- **Logs eliminados de servicios:** Removidos logs de `liveMonitorKanbanOptimized.ts` y `liveMonitorOptimizedService.ts`
- **Logs de Realtime eliminados:** Removidos logs de suscripciones, cambios en tiempo real y clasificación
- **Logs de estadísticas eliminados:** Removidos logs de llamadas activas encontradas y clasificación
- **Consola completamente limpia:** Solo se mantienen errores críticos con `console.error`
- **Funcionalidad intacta:** Todas las funciones se mantienen, solo se eliminaron logs informativos

#### 🎨 **Eliminación de Botón Actualizar**
- **Botón removido:** Eliminado botón de "Actualizar" que parpadeaba constantemente
- **Función mantenida:** La función de actualización automática sigue funcionando en background
- **UI más limpia:** Interfaz más profesional sin elementos parpadeantes
- **Actualización automática:** El sistema sigue actualizándose automáticamente mediante Realtime y polling

#### 📝 **Archivos Modificados**
- `src/components/analysis/LiveMonitorKanban.tsx` - Eliminación de botón y logs
- `src/components/analysis/LiveMonitor.tsx` - Limpieza de logs de Realtime
- `src/services/liveMonitorKanbanOptimized.ts` - Eliminación completa de logs informativos
- `src/services/liveMonitorOptimizedService.ts` - Eliminación de logs de llamadas activas y Realtime
- `src/components/Footer.tsx` - Versión actualizada a B2.1.5N6.1.0

#### ✅ **Beneficios**
- ✅ Consola completamente limpia sin información sensible
- ✅ Mejor seguridad al no exponer información del sistema en consola
- ✅ UI más profesional sin elementos parpadeantes
- ✅ Mejor rendimiento al reducir escrituras innecesarias a consola
- ✅ Experiencia de usuario mejorada sin distracciones visuales

---

## ⚡ Versión B2.1.4N6.1.0 - Optimizaciones de Rendimiento y Mejoras de UX (Enero 2025)

### 🎯 **RELEASE BETA - Optimizaciones de Rendimiento**

#### 🎨 **Modal PQNC - Scroll Invisible**
- **Scroll funcional sin barra visible:** Modal de detalle de PQNC con scroll invisible pero funcional
- **Mejora de UX:** Experiencia más limpia y profesional sin barras de desplazamiento visibles
- **Compatibilidad completa:** Funciona con rueda del mouse, gestos táctiles y teclado

#### 🎵 **Reproductor de Audio Profesional en Análisis IA**
- **Diseño profesional:** Reproductor de audio con mismo diseño que PQNC Humans
- **Controles avanzados:** Barra de progreso, play/pause, volumen y tiempo
- **Header elegante:** Diseño con gradiente y nombre del cliente
- **Funcionalidad completa:** Usa directamente `audio_ruta_bucket` sin firmar URL

#### ⚡ **Optimizaciones de Rendimiento - PQNC Humans**
- **startTransition implementado:** Actualizaciones de estado marcadas como no urgentes
- **Sort optimizado:** Pre-cálculo de scores para evitar recálculos durante ordenación
- **Handlers optimizados:** Todos los handlers de click usan `startTransition` para evitar bloqueos
- **Reducción de violaciones:** Eliminadas violaciones de rendimiento en consola
- **Mejor responsividad:** UI más fluida y responsive

#### 📝 **Archivos Modificados**
- `src/components/analysis/DetailedCallView.tsx` - Scroll invisible en modal PQNC
- `src/components/analysis/AnalysisIAComplete.tsx` - Reproductor de audio profesional
- `src/components/analysis/PQNCDashboard.tsx` - Optimizaciones de rendimiento
- `src/components/Footer.tsx` - Versión actualizada a B2.1.4N6.1.0

#### ✅ **Beneficios**
- ✅ Modales más limpios visualmente sin barras de desplazamiento
- ✅ Reproductor de audio consistente entre módulos
- ✅ Mejor rendimiento y menos bloqueos en PQNC Humans
- ✅ Consola sin violaciones de rendimiento
- ✅ Experiencia de usuario mejorada en todos los módulos

---

## 🔧 Versión B2.1.3N6.1.0 - Análisis IA: Scroll Invisible en Modal y Limpieza de Logs (Enero 2025)

### 🎯 **RELEASE BETA - Mejoras de UX y Limpieza**

#### 🎨 **Modal de Detalle - Scroll Invisible**
- **Scroll funcional sin barra visible:** Modal de detalle de llamadas con scroll invisible pero funcional
- **Transcripción con scroll invisible:** Área de transcripción también con scroll sin barra visible
- **Mejora de UX:** Experiencia más limpia y profesional sin barras de desplazamiento visibles
- **Compatibilidad completa:** Funciona con rueda del mouse, gestos táctiles y teclado

#### 🧹 **Limpieza de Logs de Consola**
- **Logs de debug eliminados:** Removidos todos los logs informativos de `errorLogService.ts`
- **Logs de UserManagement eliminados:** Removidos 28+ logs de debug del módulo de gestión de usuarios
- **Solo errores críticos:** Consola limpia, solo se muestran `console.error` para errores reales
- **Funcionalidad intacta:** Todas las funciones se mantienen, solo se eliminaron logs de estado

#### 📝 **Archivos Modificados**
- `src/components/analysis/AnalysisIAComplete.tsx` - Scroll invisible en modal y transcripción
- `src/services/errorLogService.ts` - Limpieza de logs informativos
- `src/components/admin/UserManagement.tsx` - Eliminación de 28+ logs de debug
- `src/components/Footer.tsx` - Versión actualizada a B2.1.3N6.1.0

#### ✅ **Beneficios**
- ✅ Modal más limpio visualmente sin barras de desplazamiento
- ✅ Consola de desarrollo más limpia y fácil de depurar
- ✅ Mejor rendimiento al reducir escrituras innecesarias a consola
- ✅ Experiencia de usuario mejorada en modal de análisis

---

## 🎨 Versión B2.1.2N6.1.0 - Sistema de Temas Global: Modo Oscuro por Defecto y Exclusión Módulo Dirección (Enero 2025)

### 🎯 **RELEASE BETA - Sistema de Temas Mejorado**

#### 🎨 **Sistema de Temas Global**
- **Modo oscuro por defecto:** El sistema inicia en modo oscuro automáticamente
- **Sincronización global:** El cambio de tema se aplica a todos los módulos del sistema
- **Persistencia entre módulos:** El tema seleccionado se mantiene al cambiar entre módulos
- **Exclusión módulo dirección:** El módulo "direccion" tiene su propio sistema de temas independiente

#### 🔧 **Implementación Técnica**
- **Default dark mode:** Estado inicial cambiado a `true` en `MainApp.tsx` y `appStore.ts`
- **Sincronización automática:** Cambios de tema se guardan en `localStorage` y se aplican globalmente
- **Exclusión inteligente:** Módulo direccion completamente desacoplado del sistema de temas global
- **Restauración automática:** Al salir del módulo direccion, se restaura el tema global guardado

#### 🐛 **Problemas Resueltos**
- **Tema no persistía:** Ahora el tema se mantiene al cambiar entre módulos
- **Default claro:** Sistema ahora inicia en modo oscuro por defecto
- **Conflicto con direccion:** Módulo direccion ya no interfiere con el tema global

#### 📝 **Archivos Modificados**
- `src/components/MainApp.tsx` - Lógica de tema mejorada con sincronización global
- `src/stores/appStore.ts` - Default cambiado a modo oscuro
- `src/components/Footer.tsx` - Versión actualizada a B2.1.2N6.1.0

#### ✅ **Beneficios**
- ✅ Modo oscuro por defecto mejora la experiencia visual
- ✅ Tema consistente entre todos los módulos
- ✅ Módulo direccion mantiene su independencia visual
- ✅ Persistencia confiable del tema seleccionado

---

## 🔧 Versión B2.1.1N6.1.0 - Live Monitor: Detección Mejorada de Llamadas Activas y Manejo de Realtime (Noviembre 2025)

### 🎯 **RELEASE BETA - Corrección Detección Tiempo Real**

#### 🔧 **Live Monitor - Detección Mejorada**
- **Polling como respaldo principal:** Polling reducido a 3 segundos para detección rápida de llamadas activas
- **Manejo robusto de Realtime:** Fallback automático cuando hay sobrecarga de conexiones
- **Función de clasificación mejorada:** Prioriza `call_status = 'activa'` y solo reclasifica con indicadores claros
- **Búsqueda dual:** Busca llamadas activas por `call_status_inteligente` y `call_status_bd` para máxima cobertura
- **Logs de diagnóstico:** Logs detallados para debugging y monitoreo del sistema

#### 🐛 **Problemas Resueltos**
- **Realtime sobrecarga:** Manejo correcto cuando Realtime falla por sobrecarga de conexiones
- **Llamadas activas no detectadas:** Polling cada 3 segundos asegura detección incluso sin Realtime
- **Reclasificación incorrecta:** Llamadas activas ya no se reclasifican incorrectamente como "transferidas"
- **Detección en tiempo real:** Llamadas activas se detectan correctamente cada 3 segundos

#### 📝 **Archivos Modificados**
- `src/services/liveMonitorKanbanOptimized.ts` - Manejo mejorado de Realtime y logs de diagnóstico
- `src/services/liveMonitorOptimizedService.ts` - Búsqueda dual de llamadas activas y logs
- `src/components/analysis/LiveMonitorKanban.tsx` - Polling mejorado y manejo de errores Realtime
- `scripts/sql/create-live-monitor-view-complete.sql` - Función de clasificación corregida
- `src/components/analysis/README_LIVEMONITOR.md` - Documentación actualizada a v5.4.0

#### ✅ **Beneficios**
- ✅ Llamadas activas se detectan correctamente cada 3 segundos
- ✅ Sistema funciona incluso si Realtime falla completamente
- ✅ Llamadas activas se mantienen en su estado correcto
- ✅ Logs detallados para debugging y monitoreo

---

## 🔧 Versión B2.1.1N6.0.0 - Live Monitor: Corrección Vista Optimizada y Clasificación Inteligente (Noviembre 2025)

### 🎯 **RELEASE BETA - Corrección Crítica Live Monitor**

#### 🔧 **Live Monitor - Vista Optimizada**
- **Vista `live_monitor_view` recreada:** Vista optimizada recreada completamente con estructura correcta
- **Función de clasificación corregida:** Priorización de `call_status = 'activa'` sin límite de tiempo
- **Problema resuelto:** Llamadas activas ya no se marcan incorrectamente como "perdida" después de 30 minutos
- **Realtime configurado:** Triggers y notificaciones configurados correctamente

#### 📚 **Documentación Completa**
- **Nueva documentación:** `docs/LIVE_MONITOR_VIEW_DOCUMENTATION.md` creada con especificaciones completas
- **Script SQL documentado:** `scripts/sql/create-live-monitor-view-complete.sql` con todos los detalles
- **Guía de resolución de problemas:** Sección completa de troubleshooting agregada

#### 🐛 **Correcciones Técnicas**
- **Función `clasificar_estado_llamada`:** Lógica corregida para respetar `call_status = 'activa'`
- **Vista optimizada:** JOIN correcto entre `llamadas_ventas` y `prospectos`
- **Campos calculados:** `minutos_transcurridos` calculado correctamente en la vista
- **Prioridad de campos:** Composición familiar y preferencias con prioridad llamada > prospecto

#### 🗄️ **Cambios en Base de Datos**
- **Vista recreada:** `live_monitor_view` con estructura completa y validada
- **Función actualizada:** `clasificar_estado_llamada` con lógica corregida
- **Triggers configurados:** `live_monitor_llamadas_trigger` y `live_monitor_prospectos_trigger`
- **Realtime habilitado:** Tablas `llamadas_ventas` y `prospectos` en publicación `supabase_realtime`

#### 📝 **Archivos Modificados**
- `scripts/sql/create-live-monitor-view-complete.sql` - Script completo de creación
- `docs/LIVE_MONITOR_VIEW_DOCUMENTATION.md` - Nueva documentación completa
- `src/components/analysis/CHANGELOG_LIVEMONITOR.md` - Actualizado con cambios
- `CHANGELOG.md` - Documentación actualizada a B2.1.1N6.0.0
- `VERSIONS.md` - Control de versiones actualizado
- `src/components/Footer.tsx` - Versión actualizada a B2.1.1N6.0.0

#### ✅ **Beneficios**
- ✅ Llamadas activas se muestran correctamente en Live Monitor
- ✅ Clasificación inteligente funciona correctamente
- ✅ Vista optimizada mejora rendimiento del módulo
- ✅ Documentación completa para futuras referencias

---

## 🔧 Versión B2.1.0N7.0.0 - Limpieza y Optimizaciones del Proyecto (Enero 2025)

### 🎯 **RELEASE BETA - Limpieza y Optimizaciones**

#### 🧹 **Limpieza del Proyecto**
- **Archivos de diagnóstico eliminados:** Removidos todos los archivos de troubleshooting y scripts de prueba no esenciales
- **Documentación temporal eliminada:** Limpieza de archivos MD de instrucciones temporales
- **Scripts de diagnóstico removidos:** Eliminados scripts SQL y shell de diagnóstico que ya no son necesarios
- **Proyecto optimizado:** Estructura más limpia y mantenible

#### ⚙️ **Configuración del Servidor de Desarrollo**
- **Configuración de Vite mejorada:** Actualizado `vite.config.ts` con `host: '0.0.0.0'` para mejor accesibilidad
- **Apertura automática:** Configurado `open: true` para abrir automáticamente en el navegador
- **Hosts permitidos:** Configuración optimizada de `allowedHosts` para desarrollo local

#### 🔧 **Correcciones y Mejoras**
- **Servidor de desarrollo:** Corrección de problemas de carga en navegador
- **Dependencias:** Verificación e instalación de dependencias faltantes
- **Puerto 5173:** Configuración correcta y consistente del puerto de desarrollo

#### 📝 **Archivos Modificados**
- `vite.config.ts` - Configuración mejorada del servidor de desarrollo
- `CHANGELOG.md` - Documentación actualizada a B2.1.0N7.0.0
- `VERSIONS.md` - Control de versiones actualizado
- `src/components/Footer.tsx` - Versión actualizada a B2.1.0N7.0.0

#### ✅ **Beneficios**
- ✅ Proyecto más limpio y mantenible
- ✅ Mejor experiencia de desarrollo con servidor optimizado
- ✅ Estructura de archivos más organizada
- ✅ Configuración de desarrollo más robusta

---

## 🔧 Versión B2.1.0N6.0.0 - Live Monitor: Detección en Tiempo Real de Llamadas (Enero 2025)

### 🎯 **RELEASE BETA - Suscripción Realtime para Live Monitor**

#### ⚡ **Detección en Tiempo Real de Llamadas**
- **Suscripción Realtime INSERT:** Detección inmediata de nuevas llamadas al crearse en la base de datos
- **Suscripción Realtime UPDATE:** Actualización en tiempo real de cambios de checkpoint y estado de llamadas
- **Alertas instantáneas:** Reproducción automática de alerta cuando se detecta una nueva llamada
- **Actualización local inteligente:** Actualización de datos locales sin recargar toda la lista
- **Polling optimizado:** Reducción de intervalo de polling de 5s a 30s como respaldo

#### 🔧 **Funcionalidades Técnicas**
- **Canal Realtime:** Suscripción a tabla `llamadas_ventas` con eventos INSERT y UPDATE
- **Manejo de datos:** Parseo automático de JSON en campos `datos_proceso` y `datos_llamada`
- **Reclasificación automática:** Reclasificación de llamadas cuando cambia el estado
- **Detección de checkpoint:** Alerta automática cuando llamada llega al último checkpoint
- **Cleanup adecuado:** Desuscripción correcta al desmontar componente

#### 📍 **Módulos Modificados**

##### **LiveMonitor.tsx** (`src/components/analysis/LiveMonitor.tsx`)
- Suscripción Realtime INSERT para detectar nuevas llamadas inmediatamente
- Suscripción Realtime UPDATE para actualizar cambios de checkpoint/estado
- Actualización local inteligente de llamadas existentes sin recargar toda la lista
- Polling reducido de 5s a 30s como fallback
- Reproducción de alerta en nueva llamada detectada
- Manejo de errores y logs informativos

#### ✅ **Beneficios**
- ✅ Detección instantánea de nuevas llamadas (sin esperar hasta 5 segundos)
- ✅ Actualización en tiempo real de cambios de checkpoint y estado
- ✅ Mejor experiencia de usuario con alertas inmediatas
- ✅ Menor carga en servidor con polling reducido
- ✅ Sincronización automática con base de datos

#### 📝 **Archivos Modificados**
- `src/components/analysis/LiveMonitor.tsx` - Suscripción Realtime agregada
- `CHANGELOG.md` - Documentación actualizada a B2.1.0N6.0.0
- `VERSIONS.md` - Control de versiones actualizado
- `src/components/Footer.tsx` - Versión actualizada a B2.1.0N6.0.0

---

## 🔧 Versión 2.1.0 - Gestión de Usuarios: Indicadores Visuales de Bloqueo y Botón de Desbloquear (Enero 2025)

### 🎯 **RELEASE - Indicadores Visuales de Moderación**

#### 🔒 **Sistema de Bloqueo por Moderación - Mejoras Visuales**
- **Botón de desbloquear restaurado:** Botón de desbloquear restaurado en el modal de edición de usuarios
- **Indicador visual en modal:** Alerta visual en el header del modal mostrando estado de bloqueo y número de infracciones
- **Avatar con candado en datagrid:** Usuarios bloqueados muestran candado rojo en lugar de iniciales en el data grid
- **Interactividad mejorada:** Clic en el candado rojo abre directamente el modal de edición para desbloquear
- **Estados visuales claros:** Diferenciación visual inmediata entre usuarios bloqueados y activos

#### 🎨 **Mejoras de Interfaz**
- **Alerta de bloqueo:** Banner informativo en header del modal con icono ShieldAlert y contador de infracciones
- **Candado clickeable:** Avatar con candado rojo es clickeable y muestra tooltip informativo
- **Botón de desbloquear:** Botón con gradiente verde esmeralda en footer del modal, solo visible para administradores
- **Estado de carga:** Indicador de carga durante proceso de desbloqueo
- **Feedback visual:** Hover effects y transiciones suaves en todos los elementos interactivos

#### 🔧 **Funcionalidades Técnicas**
- **Función handleUnblockUser:** Restaurada y funcional para resetear warnings de usuarios bloqueados
- **Integración con ParaphraseLogService:** Uso de `resetUserWarnings()` para desbloquear usuarios
- **Validación de permisos:** Solo administradores pueden desbloquear usuarios
- **Sincronización de datos:** Recarga automática de usuarios después de desbloquear

#### 📍 **Módulos Modificados**

##### **UserManagement.tsx** (`src/components/admin/UserManagement.tsx`)
- Botón de desbloquear agregado en footer del modal de edición
- Alerta visual de bloqueo en header del modal
- Avatar con candado rojo en data grid para usuarios bloqueados
- Lógica condicional para mostrar candado cuando `is_blocked === true`
- Tooltip y cursor pointer en avatar bloqueado
- Icono ShieldAlert importado y utilizado

#### ✅ **Beneficios**
- ✅ Identificación visual inmediata de usuarios bloqueados en data grid
- ✅ Acceso rápido al modal de edición desde el candado
- ✅ Información clara sobre estado de bloqueo y número de infracciones
- ✅ Proceso de desbloqueo simplificado y accesible
- ✅ Mejor experiencia de usuario para administradores

#### 📝 **Archivos Modificados**
- `src/components/admin/UserManagement.tsx` - Indicadores visuales de bloqueo y botón de desbloquear
- `src/components/admin/CHANGELOG_PQNC_HUMANS.md` - Documentación actualizada a v5.9.0

---

## 🔧 Versión B2.1.0-N6.0.0 - Gestión de Usuarios: Estados Operativo/Archivado y Mejoras de UI (Enero 2025)

### 🎯 **RELEASE BETA - Estados de Usuarios y Mejoras Visuales**

#### 👥 **Gestión de Usuarios - Estados Operativo y Archivado**
- **Campo is_operativo:** Nuevo campo lógico para marcar usuarios como operativos/no operativos sin limitar acceso
- **Estados diferenciados:** Separación clara entre `is_operativo` (estado lógico) e `is_active`/`archivado` (control de acceso)
- **Toggle operativo en data grid:** Switch directo para cambiar estado operativo sin abrir modal
- **Archivado mejorado:** Proceso de archivado desde modal de edición con reasignación automática de prospectos
- **Modal de confirmación:** Modal para seleccionar coordinador al archivar usuarios con prospectos asignados
- **Reasignación de prospectos:** Al archivar ejecutivos/coordinadores, prospectos se reasignan automáticamente al coordinador seleccionado

#### 🎨 **Mejoras de Interfaz**
- **Switch de vista:** Reemplazado checkbox por switch de botones para alternar entre usuarios activos y archivados
- **Columna departamento mejorada:** Muestra departamento > coordinación > nada (jerarquía clara)
- **Columna moderación eliminada:** Removida para dar más espacio a botones de acción
- **Botones de acción ampliados:** Más espacio (w-48) y mejor visibilidad en data grid
- **Toggle operativo visual:** Switch elegante con animaciones en data grid para cambiar estado operativo

#### 🔧 **Funcionalidades Técnicas**
- **Filtros optimizados:** Coordinaciones y usuarios filtrados solo por `archivado`, no por `is_operativo`
- **Asignación flexible:** Ejecutivos pueden asignarse a coordinaciones no operativas (solo excluye archivadas)
- **Usuarios no operativos visibles:** Se muestran en modales y selecciones, solo archivados están ocultos
- **Filtros inteligentes:** Usuarios archivados invisibles por defecto, solo visibles con switch de vista

#### 📊 **Base de Datos**
- **Campo is_operativo:** Agregado a tabla `auth_users` en System_UI con valor por defecto `true`
- **Índice creado:** Índice en `is_operativo` para mejorar rendimiento de consultas
- **Migración automática:** Todos los usuarios existentes marcados como operativos por defecto
- **Script SQL:** `scripts/sql/add_is_operativo_to_auth_users.sql` para migración

#### 📍 **Módulos Modificados**

##### **UserManagement.tsx** (`src/components/admin/UserManagement.tsx`)
- Campo `is_operativo` agregado a interfaz User y formData
- Toggle operativo/no operativo en data grid
- Switch de vista activos/archivados reemplazando checkbox
- Modal de confirmación de archivado con selección de coordinador
- Función `handleArchiveUserDirect()` con reasignación de prospectos
- Filtros actualizados para usar solo `archivado`, no `is_operativo`
- Columna departamento mejorada con jerarquía departamento > coordinación
- Columna moderación eliminada
- Botones de acción ampliados y mejorados

##### **Base de Datos System_UI**
- Columna `is_operativo BOOLEAN DEFAULT true` agregada a `auth_users`
- Índice `idx_auth_users_is_operativo` creado
- Comentario explicativo en columna `is_operativo`

##### **Base de Datos Análisis**
- Reasignación de prospectos al archivar ejecutivos/coordinadores
- Actualización de `ejecutivo_id` y `coordinacion_id` en tabla `prospectos`

#### ✅ **Beneficios**
- ✅ Estados claramente diferenciados: operativo (lógico) vs activo/archivado (acceso)
- ✅ Usuarios no operativos siguen siendo visibles y editables
- ✅ Archivado con reasignación automática de prospectos
- ✅ Interfaz más limpia y organizada
- ✅ Mejor experiencia de usuario con switches visuales

#### 📝 **Archivos Modificados**
- `src/components/admin/UserManagement.tsx` - Estados operativo/archivado y mejoras de UI
- `src/components/admin/CHANGELOG_PQNC_HUMANS.md` - Documentación actualizada a v5.8.0
- `scripts/sql/add_is_operativo_to_auth_users.sql` - Script de migración

---

## 🔧 Versión B2.0.9-N6.0.0 - Gestión de Usuarios y Coordinaciones: Eliminación Lógica y Mejoras de UI (Enero 2025)

### 🎯 **RELEASE BETA - Eliminación Lógica y Mejoras Visuales**

#### 👥 **Gestión de Usuarios - Eliminación Lógica**
- **Eliminación lógica implementada**: Los usuarios ahora se archivan en lugar de eliminarse permanentemente
- **Campo archivado**: Nueva columna `archivado` en tabla `auth_users` para eliminación lógica
- **Filtros mejorados**: Filtros independientes para usuarios archivados y usuarios activos/inactivos (`is_active`)
- **Funcionalidad de desarchivado**: Los usuarios archivados pueden ser desarchivados en cualquier momento
- **Modal de archivado**: Modal rediseñado siguiendo el diseño de UI moderno con animaciones framer-motion
- **Sin mensajes emergentes**: Eliminados alerts, solo recarga automática de datos

#### 🏢 **Gestión de Coordinaciones - Mejoras Visuales**
- **Botón is_operativo mejorado**: Botón Power rediseñado con gradientes, sombras y animaciones para mayor visibilidad
- **Indicador de pulso**: Animación de pulso cuando la coordinación está operativa
- **Etiqueta de estado**: Nueva etiqueta visual en el footer de cada tarjeta mostrando estado "Operativa" o "No Operativa"
- **Iconos diferenciados**: Power cuando está operativa, PowerOff cuando no está operativa
- **Mejor contraste**: Colores verde esmeralda para operativa, gris para no operativa

#### 🎨 **Mejoras de Interfaz**
- **Diseño consistente**: Modales de archivado siguen el mismo diseño que modales de coordinaciones
- **Animaciones suaves**: Transiciones con framer-motion en todos los modales
- **Sin emojis**: Diseño limpio sin emojis, solo iconos SVG de Lucide
- **Etiquetas informativas**: Badges con colores y estados claramente diferenciados

#### 📍 **Módulos Modificados**

##### **UserManagement.tsx** (`src/components/admin/UserManagement.tsx`)
- Implementada eliminación lógica con campo `archivado`
- Funciones `handleArchiveUser()` y `handleUnarchiveUser()`
- Modal de archivado rediseñado con diseño moderno
- Filtros por `archivado` e `is_active` independientes
- Carga de usuarios desde `auth_users` directamente con join a `auth_roles`

##### **CoordinacionesManager.tsx** (`src/components/admin/CoordinacionesManager.tsx`)
- Botón Power mejorado con gradientes y animaciones
- Etiqueta de estado operativo en footer de tarjetas
- Indicador de pulso animado para coordinaciones operativas
- Mejor visibilidad del estado operativo/no operativo

##### **Base de Datos**
- Columna `archivado BOOLEAN DEFAULT FALSE` agregada a `auth_users` en SystemUI
- Comentario explicativo en columna `archivado`

#### ✅ **Beneficios**
- ✅ No se pierden registros de usuarios (eliminación lógica)
- ✅ Usuarios pueden ser desarchivados fácilmente
- ✅ Estado operativo de coordinaciones más visible y fácil de identificar
- ✅ Diseño consistente en toda la aplicación
- ✅ Mejor experiencia de usuario con animaciones y feedback visual

#### 📝 **Archivos Modificados**
- `src/components/admin/UserManagement.tsx` - Eliminación lógica y mejoras de UI
- `src/components/admin/CoordinacionesManager.tsx` - Mejoras visuales del botón is_operativo
- `src/components/Footer.tsx` - Versión actualizada a B2.0.9-N6.0.0
- `scripts/sql/update_coordinaciones_schema.sql` - Documentación de cambios

---

## 🔧 Versión B2.0.0-N6.0.0 - Log Monitor: Mejoras de UI y Seguimiento de Usuarios (Enero 2025)

### 🎯 **RELEASE BETA - Mejoras en Dashboard de Logs**

#### 🎨 **Mejoras de Interfaz de Usuario**
- **Columna de Actividad**: Nueva columna en datagrid con indicadores visuales para logs con anotaciones y análisis de IA
- **Columna de Fecha**: Restaurada columna de fecha ordenable en el datagrid
- **Indicadores visuales**: Iconos pequeños (mensaje azul para anotaciones, bombilla morada para análisis IA) con tooltips informativos
- **Optimización de espacio**: Layout mejorado con columnas más eficientes

#### 👥 **Seguimiento de Usuarios en Actividades**
- **Información de usuarios**: Carga y visualización de nombres completos y emails en lugar de IDs
- **Cache de usuarios**: Sistema de cache para evitar consultas redundantes a System UI
- **Anotaciones mejoradas**: Muestra nombre completo o email del usuario que creó cada anotación
- **Análisis de IA**: Muestra quién solicitó cada análisis de IA
- **Tab "Mis Actividades"**: Nueva pestaña para visualizar logs donde el usuario ha comentado o solicitado análisis
- **Filtros de actividad**: Filtros para ver solo comentarios, solo análisis, o ambos

#### 🐛 **Correcciones**
- **Error 409 al guardar análisis**: Corregido manejo de análisis duplicados, ahora actualiza en lugar de insertar
- **Análisis mostrándose en todos los logs**: Corregido bug donde el mismo análisis aparecía en múltiples logs
- **Filtrado en "Mis Actividades"**: Corregido para mostrar solo logs donde el usuario realmente ha intervenido
- **Carga de nombres de usuario**: Implementada función `getUserInfo()` para obtener información desde System UI

#### 📍 **Módulos Modificados**

##### **LogDashboard.tsx** (`src/components/admin/LogDashboard.tsx`)
- Nueva columna "Actividad" con indicadores visuales
- Columna "Fecha" restaurada y ordenable
- Tab "Mis Actividades" con filtros de actividad
- Cache de información de usuarios (`userInfoCache`)
- Limpieza de datos al cambiar de log o cerrar modal
- Mejoras en visualización de anotaciones y análisis

##### **logMonitorService.ts** (`src/services/logMonitorService.ts`)
- Nueva función `getUserInfo()` para obtener información de usuarios desde System UI
- Métodos `getLogsWithUserAnnotations()` y `getLogsWithUserAIAnalysis()` mejorados
- Corrección en `saveAIAnalysis()` para actualizar en lugar de insertar cuando existe
- Inclusión de `ui_error_log_annotations` en consultas para indicadores
- Campos `has_annotations` y `has_ai_analysis` agregados a logs procesados

#### ✅ **Beneficios**
- ✅ Visualización clara de qué logs tienen actividad del usuario
- ✅ Información de usuarios legible (nombres en lugar de IDs)
- ✅ Mejor organización con tab dedicada para actividades del usuario
- ✅ Sin errores al guardar análisis duplicados
- ✅ Indicadores visuales intuitivos para actividad en logs

#### 📝 **Archivos Modificados**
- `src/components/admin/LogDashboard.tsx` - Mejoras de UI y seguimiento de usuarios
- `src/services/logMonitorService.ts` - Función getUserInfo y correcciones
- `src/components/Footer.tsx` - Versión actualizada a B2.0.0-N6.0.0
- `package.json` - Versión actualizada a B2.0.0-N6.0.0

---

## 🔧 Versión Beta 1.0.0-beta.8.2.0 - Log Monitor: Proxy Edge Function y Manejo de Duplicados (Enero 2025)

### 🎯 **RELEASE BETA - Sistema de Análisis de IA para Logs de Errores**

#### 🚀 **Edge Function Proxy para Análisis de IA**
- **Función desplegada**: `error-analisis-proxy` en proyecto Log Monitor (dffuwdzybhypxfzrmdcz)
- **Solución CORS**: Proxy Edge Function evita problemas de CORS al comunicarse con webhook de Railway
- **Configuración segura**: Variables de entorno configuradas (`ERROR_ANALISIS_WEBHOOK_TOKEN`, `ERROR_ANALISIS_WEBHOOK_URL`)
- **Validación de payload**: Validación de campos requeridos antes de enviar al webhook
- **Manejo de errores**: Manejo de errores con mensajes claros

#### 🐛 **Corrección de Duplicados en Análisis de IA**
- **Problema resuelto**: Error 409 (Conflict) al solicitar análisis de IA para logs que ya tenían análisis
- **Causa identificada**: El código intentaba crear un nuevo registro sin verificar si ya existía uno
- **Solución implementada**:
  - Verificación previa de análisis existente antes de crear uno nuevo
  - Reutilización de análisis completados existentes
  - Manejo de registros pendientes o fallidos para reintentar
  - Manejo explícito del error 23505 (duplicate key) con recuperación automática

#### 📍 **Módulos Corregidos**

##### **logMonitorService.ts** (`src/services/logMonitorService.ts`)
- Actualizado `requestAIAnalysis()` para verificar análisis existentes
- Implementado manejo de duplicados con recuperación automática
- Reutilización inteligente de registros existentes según su estado
- URL del proxy actualizada al proyecto correcto (dffuwdzybhypxfzrmdcz)

##### **error-analisis-proxy** (`supabase/functions/error-analisis-proxy/index.ts`)
- Función Edge desplegada en proyecto Log Monitor
- Validación de variables de entorno antes de procesar
- Validación de payload con campos requeridos
- Manejo de errores mejorado con mensajes descriptivos

#### ✅ **Beneficios**
- ✅ Sin errores 409 al solicitar análisis múltiples veces
- ✅ Reutilización eficiente de análisis existentes
- ✅ Comunicación segura con webhook sin problemas de CORS
- ✅ Configuración centralizada en variables de entorno

#### 📝 **Archivos Modificados**
- `src/services/logMonitorService.ts` - Manejo de duplicados y URL del proxy corregida
- `supabase/functions/error-analisis-proxy/index.ts` - Función Edge Function desplegada
- `package.json` - Versión actualizada a 1.0.0-beta.8.2.0

---

## 👥 Versión Beta 1.0.0-beta.8.1.0 - Gestión de Ejecutivos: Filtrado por Coordinaciones y Mejoras de UI (Enero 2025)

### 🎯 **RELEASE BETA - Mejoras en Gestión de Ejecutivos para Coordinadores**

#### 🔍 **Filtrado de Ejecutivos por Coordinaciones**
- **Problema resuelto**: Los coordinadores veían todos los ejecutivos del sistema en lugar de solo los asignados a sus coordinaciones
- **Causa identificada**: El método `loadEjecutivos()` usaba `getAllEjecutivos()` sin filtrar por coordinaciones del coordinador
- **Solución implementada**:
  - Nuevo estado `coordinacionesIds` para almacenar todas las coordinaciones del coordinador
  - Carga paralela de ejecutivos y coordinadores de todas las coordinaciones asignadas
  - Filtrado explícito para mostrar solo usuarios asignados a las coordinaciones del coordinador
  - Eliminación de duplicados al combinar ejecutivos y coordinadores

#### 🎨 **Mejoras de Interfaz de Usuario**
- **Eliminación de etiquetas duplicadas**: Removida la etiqueta "Mi Coordinación" junto al nombre del ejecutivo
- **Información de coordinación**: La información de coordinación se mantiene solo en la sección inferior con ícono de edificio
- **Interfaz más limpia**: Reducción de elementos visuales redundantes en las tarjetas de ejecutivos

#### 📍 **Módulo Corregido**

##### **EjecutivosManager** (`src/components/admin/EjecutivosManager.tsx`)
- Actualizado `checkPermissions()` para usar `getCoordinacionesFilter()` y guardar todas las coordinaciones
- Modificado `loadEjecutivos()` para:
  - Obtener ejecutivos de todas las coordinaciones usando `getEjecutivosByCoordinacion()`
  - Obtener coordinadores de todas las coordinaciones usando `getCoordinadoresByCoordinacion()`
  - Combinar y filtrar resultados para mostrar solo usuarios de las coordinaciones del coordinador
- Actualizado `isAssignedToMyCoordinacion` para verificar múltiples coordinaciones usando `coordinacionesIds.includes()`
- Eliminadas etiquetas duplicadas de coordinación en la UI

#### ✅ **Beneficios**
- ✅ Coordinadores solo ven ejecutivos y coordinadores asignados a sus coordinaciones
- ✅ Soporte completo para coordinadores con múltiples coordinaciones
- ✅ Interfaz más limpia sin información duplicada
- ✅ Mejor rendimiento con carga paralela de datos

#### 📝 **Archivos Modificados**
- `src/components/admin/EjecutivosManager.tsx` - Filtrado por coordinaciones y limpieza de UI

---

## 🔐 Versión Beta 1.0.0-N8.0.0 - Seguridad: Corrección de Filtros de Permisos por Coordinación (Enero 2025)

### 🛡️ **RELEASE BETA - Corrección Crítica de Seguridad y Permisos**

#### 🔒 **Corrección de Filtros de Permisos para Coordinadores**
- **Problema resuelto**: Coordinadores podían ver prospectos sin coordinación asignada y prospectos de coordinaciones no asignadas
- **Causa identificada**: El método `getCoordinacionFilter()` solo retornaba una coordinación, pero los coordinadores pueden tener múltiples coordinaciones asignadas
- **Solución implementada**:
  - Nuevo método `getCoordinacionesFilter()` que obtiene todas las coordinaciones de un coordinador desde la tabla `coordinador_coordinaciones`
  - Filtrado por múltiples coordinaciones usando `.in('coordinacion_id', coordinaciones)`
  - Exclusión explícita de prospectos sin coordinación asignada: `.not('coordinacion_id', 'is', null)`

#### 📍 **Módulos Corregidos**

##### 1. **ProspectosManager** (`src/components/prospectos/ProspectosManager.tsx`)
- Actualizado para usar `getCoordinacionesFilter()` en lugar de `getCoordinacionFilter()`
- Filtrado por múltiples coordinaciones con exclusión de prospectos sin coordinación
- Los coordinadores ahora solo ven prospectos asignados a sus coordinaciones

##### 2. **LiveChatCanvas** (`src/components/chat/LiveChatCanvas.tsx`)
- Filtrado aplicado tanto a conversaciones de uchat como de WhatsApp
- Optimización: filtros obtenidos una sola vez antes de enriquecer conversaciones
- Exclusión de prospectos sin coordinación asignada en ambos tipos de conversaciones

##### 3. **LiveMonitor** (`src/services/liveMonitorService.ts`)
- Actualizado método `getActiveCalls()` para usar `getCoordinacionesFilter()`
- Filtrado aplicado tanto en la query principal como en el fallback
- Filtrado también aplicado en la consulta de prospectos relacionados
- Los coordinadores ahora solo ven llamadas de prospectos asignados a sus coordinaciones

##### 4. **PermissionsService** (`src/services/permissionsService.ts`)
- Nuevo método `getCoordinacionesFilter()` que:
  - Para coordinadores: obtiene todas las coordinaciones desde `coordinador_coordinaciones`
  - Para ejecutivos: retorna array con su única coordinación
  - Para admins: retorna `null` (sin filtros)
- Método `getCoordinacionFilter()` marcado como `@deprecated` pero mantenido para compatibilidad

#### ✅ **Beneficios de Seguridad**
- ✅ Coordinadores solo ven prospectos asignados a sus coordinaciones
- ✅ Prospectos sin coordinación asignada no son visibles para coordinadores
- ✅ Ejecutivos solo ven prospectos asignados a su perfil
- ✅ Soporte completo para coordinadores con múltiples coordinaciones
- ✅ Consistencia en todos los módulos (Prospectos, Live Chat, Live Monitor)

#### 📝 **Archivos Modificados**
- `src/services/permissionsService.ts` - Nuevo método `getCoordinacionesFilter()`
- `src/components/prospectos/ProspectosManager.tsx` - Filtrado corregido
- `src/components/chat/LiveChatCanvas.tsx` - Filtrado corregido para uchat y WhatsApp
- `src/services/liveMonitorService.ts` - Filtrado corregido en `getActiveCalls()`

---

## 🔒 Versión Beta 1.0.0-N7.0.0 - Seguridad: Eliminación de Logs de Debug (Enero 2025)

### 🛡️ **RELEASE BETA - Mejoras de Seguridad y Rendimiento**

#### 🔐 **Eliminación de Logs de Debug en Live Monitor**
- **Problema resuelto**: Eliminados todos los logs de debug que generaban información sensible en consola
- **Archivos afectados**:
  - `src/components/analysis/LiveMonitorKanban.tsx` - Eliminados ~75 logs de debug
  - `src/components/analysis/LiveMonitor.tsx` - Eliminados ~177 logs de debug
- **Logs eliminados**:
  - Logs de procesamiento de audio en tiempo real
  - Logs de configuración de Tone.js
  - Logs de WebSocket y conexiones
  - Logs de estadísticas de audio
  - Logs de diagnósticos automáticos
  - Logs de feedback y transferencias
  - Logs de cambios de checkpoint y estado de llamadas
  - Logs de composición familiar y datos de prospectos
- **Beneficios**:
  - ✅ Reducción de exposición de información sensible
  - ✅ Mejora en rendimiento (menos escrituras a consola)
  - ✅ Consola más limpia para debugging real
  - ✅ Cumplimiento con mejores prácticas de seguridad

#### 📝 **Archivos Modificados**
- `src/components/analysis/LiveMonitorKanban.tsx` - Eliminación completa de logs de debug
- `src/components/analysis/LiveMonitor.tsx` - Eliminación completa de logs de debug

---

## 🎮 Versión Beta 1.0.0-N6.0.0 - Easter Egg Snake Game y Mejoras de Accesibilidad (Enero 2025)

### 🎯 **RELEASE BETA - Easter Egg Interactivo y Optimizaciones**

#### 🐍 **NUEVO EASTER EGG: Juego Snake Clásico**
- **Juego Snake completo**: Implementado juego Snake clásico como easter egg
- **Activación**: 6 clics en el icono de serpiente en el footer
- **Controles**: Flechas o WASD para mover, Espacio para disparar (no aplica en Snake)
- **Características del juego**:
  - Grid de 30x30 celdas (área de juego ampliada)
  - Velocidad progresiva: aumenta cada 10 puntos
  - Crecimiento adicional: añade 1 bloque extra por cada bola cuando el score está en bloques de 10
  - Inicio controlado: el juego no comienza hasta presionar una tecla de dirección
  - Longitud persistente: la serpiente mantiene su longitud entre partidas
  - Game over al sobrepasar límites del grid
- **Diseño minimalista**: Fondo blur oscuro sin distracciones
- **Validaciones robustas**: La comida siempre aparece dentro del grid

#### 🎨 **Cambios en Footer y Versión**
- **Icono actualizado**: Cambiado de gato a serpiente vectorizada con animación heartbeat
- **Versión actualizada**: Cambiado de "v6.0.0 - Release Mayor..." a "Beta 1.0.0-N6.0.0"
- **Animación sutil**: Icono de serpiente con animación heartbeat (scale 1.0 → 1.1)

#### ♿ **Mejoras de Accesibilidad en Live Chat**
- **Campos de formulario mejorados**: Agregados `id`, `name` y `autocomplete` attributes
- **Labels asociados**: Labels con `sr-only` para lectores de pantalla
- **Tipo de campo**: Campo de búsqueda cambiado a `type="search"` (semántico)
- **Mejora en UX**: Mejor integración con herramientas de accesibilidad

#### 📝 **Archivos Modificados**
- `src/components/SnakeEasterEgg.tsx` - Nuevo componente con juego Snake completo
- `src/components/Footer.tsx` - Icono de serpiente y versión actualizada
- `src/components/chat/LiveChatCanvas.tsx` - Mejoras de accesibilidad en campos de formulario
- `package.json` - Versión actualizada a 1.0.0-beta.6.0.0

---

## 🚀 Versión 6.0.0 - Release Mayor: Live Chat Mejorado y Diseño Unificado (Enero 2025)

### 🎯 **RELEASE MAYOR - Mejoras Significativas en UX y Funcionalidad**

#### 💬 **MÓDULO LIVE CHAT - Funcionalidad de Llamada Manual**

##### ✨ **Nueva Funcionalidad: Iniciar Llamada desde Live Chat**
- **Botón de llamada**: Agregado botón de llamada al lado del botón de adjuntar
- **Modal elegante**: Modal con diseño minimalista y animaciones usando framer-motion
- **Contexto opcional**: Campo de texto libre (máximo 300 caracteres) para enviar contexto adicional al agente de IA
- **Integración con webhook**: Envío automático a `https://primary-dev-d75a.up.railway.app/webhook/trigger-manual`
- **Pausa automática**: El bot se pausa automáticamente por 15 minutos al iniciar la llamada
- **Animaciones**: Botón con animación de pulso durante el proceso de llamada
- **Cierre automático**: El modal se cierra automáticamente después de 5 segundos mostrando confirmación visual
- **Datos completos**: Envío de todos los datos útiles de la conversación en cache (uchat_id, prospecto_id, customer_name, customer_phone, metadata, etc.)

##### 🔧 **Mejoras en Sistema de Pausa del Bot**
- **Consistencia de uchatId**: Unificación de la lógica para obtener `uchatId` en todos los componentes
- **Contador visible**: El contador de bot pausado ahora se muestra correctamente cuando se pausa desde el modal de llamada
- **Sincronización**: Estado de pausa sincronizado entre diferentes métodos de pausado

#### 🎨 **DISEÑO Y ANIMACIONES**

##### ✨ **Modal de Llamada con Nuevo Diseño**
- **Header con gradiente**: Diseño elegante con gradiente sutil y animaciones de entrada
- **Sección de contexto**: Barra de color con gradiente azul-púrpura para "Enviarle contexto al agente de IA"
- **Campo de texto estilizado**: Textarea con límite de caracteres, contador visual y estados de advertencia
- **Botón grande animado**: Botón de llamada con gradiente verde, animación de pulso y sombra dinámica
- **Estados visuales**: Indicadores claros durante el proceso (cargando, éxito, error)
- **Dark mode**: Soporte completo para modo oscuro

#### 📊 **MEJORAS TÉCNICAS**

##### 🔄 **Parafraseo con N8N**
- **Migración a N8N**: Sistema de parafraseo migrado de Anthropic proxy a webhook N8N
- **Contexto específico**: Soporte para diferentes contextos (`input_livechat`, `input_send_image_livechat`, `transfer_request_message`)
- **Timeout y fallback**: Implementado timeout de 5 segundos con fallback al texto original si el webhook no responde
- **Validación mejorada**: Respuesta esperada con `option1`, `option2` y `guardrail` desde N8N

##### 🐛 **Correcciones en Live Monitor**
- **Control URL preservado**: Corrección para preservar `control_url` en actualizaciones de realtime
- **Fallback a BD**: Si `control_url` no está disponible, se obtiene automáticamente de la base de datos
- **Transferencia mejorada**: Mejor manejo de errores y logging detallado para transferencias de llamadas

#### 📝 **Archivos Modificados**
- `src/components/chat/LiveChatCanvas.tsx` - Funcionalidad de llamada manual y mejoras en pausa del bot
- `src/components/chat/ParaphraseModal.tsx` - Migración a N8N webhook
- `src/components/analysis/LiveMonitorKanban.tsx` - Correcciones en transferencia y preservación de control_url
- `src/components/chat/ImageCatalogModal.tsx` - Integración con nuevo sistema de parafraseo

---

## 🚀 Versión 5.15.0 - Live Chat: Optimizaciones de Rendimiento (Diciembre 2025)

### ⚡ **MÓDULO LIVE CHAT - OPTIMIZACIONES CRÍTICAS**

#### 🎯 **Problema Resuelto: Colapso con 30+ Mensajes Simultáneos**
- **Síntoma**: El módulo colapsaba al recibir más de 30 mensajes simultáneos
- **Causas identificadas**:
  - Llamadas excesivas a `markMessagesAsRead` sin throttling
  - Múltiples queries simultáneas a tablas incorrectas
  - Falta de protección contra llamadas duplicadas
  - Eventos de scroll sin debouncing

#### ✅ **Optimizaciones Implementadas**

##### 1. **Eliminación de Llamada Redundante**
- **Cambio**: Eliminada llamada a `markMessagesAsRead` desde `handleMessagesScroll`
- **Razón**: Intentaba actualizar tabla incorrecta (`uchat_messages` vs `mensajes_whatsapp`)
- **Beneficio**: Elimina queries fallidas y reduce carga en BD

##### 2. **Debouncing en Scroll Handler**
- **Implementación**: Debounce de 400ms en `handleMessagesScroll`
- **Funcionalidad**: Agrupa eventos de scroll para evitar llamadas excesivas
- **Beneficio**: Reduce llamadas a BD durante scroll continuo sin afectar UX

##### 3. **Protección contra Llamadas Simultáneas**
- **Implementación**: Flag `markingAsReadRef` (Set) para tracking de conversaciones en proceso
- **Funcionalidad**: Evita múltiples llamadas simultáneas a `markConversationAsRead` para la misma conversación
- **Beneficio**: Previene race conditions y queries duplicadas

##### 4. **Cleanup Mejorado**
- **Cambio**: Limpieza de timer de debounce en cleanup de useEffect
- **Beneficio**: Previene memory leaks

#### 📊 **Impacto Esperado**
- **Reducción de queries fallidas**: ~50% menos intentos a tablas incorrectas
- **Menos llamadas simultáneas**: Protección contra llamadas duplicadas
- **Mejor rendimiento durante scroll**: Debounce reduce llamadas durante scroll continuo
- **Mejor manejo de picos**: Cuando llegan 30+ mensajes, solo se procesa una marcación por conversación

#### 📝 **Archivos Modificados**
- `src/components/chat/LiveChatCanvas.tsx` - Optimizaciones de rendimiento aplicadas

---

## 🚀 Versión 5.14.0 - Prospectos: Vista Kanban Rediseñada (Diciembre 2025)

### 🎨 **MÓDULO PROSPECTOS - VISTA KANBAN COMPLETA**

#### 🎯 **Vista Kanban Rediseñada**
- **Columnas independientes**: Estructura completamente reestructurada con flexbox horizontal
- **4 etapas organizadas**: Validando membresia → En seguimiento → Interesado → Atendió llamada
- **Sistema de colapso horizontal**: Columnas colapsadas a 80px con texto rotado 90° centrado
- **Layout flexible**: Distribución equitativa del espacio sin afectar otras columnas
- **Preferencias de usuario**: Vista tipo Kanban o DataGrid persistida en localStorage

#### 🔧 **Funcionalidades Implementadas**
- **Cards de prospectos**: Muestra información completa (nombre, teléfono, ciudad, destino, score, última actividad)
- **Ordenamiento automático**: Prospectos ordenados por fecha de último mensaje
- **Scroll independiente**: Cada columna tiene su propio scroll vertical
- **Estado persistente**: Columnas colapsadas guardadas en localStorage

#### 📊 **Mejoras Técnicas**
- **Eliminado grid compartido**: Columnas completamente independientes sin afectación cruzada
- **Anchos dinámicos**: Calculados automáticamente basados en columnas expandidas/colapsadas
- **Sin animaciones problemáticas**: Transiciones CSS puras sin Framer Motion

#### 📝 **Archivos Modificados**
- `src/components/prospectos/ProspectosKanban.tsx` - Reestructuración completa
- `src/components/prospectos/ProspectosManager.tsx` - Integración de vista Kanban
- `src/services/prospectsViewPreferencesService.ts` - Servicio para preferencias

---

## 🚀 Versión 5.12.0 - Supabase AWS: Diagnóstico y Solución ALB Target Groups (Noviembre 3, 2025)

### 🔧 **INFRAESTRUCTURA SUPABASE AWS - SOLUCIÓN DEFINITIVA**

#### 🎯 **Diagnóstico Completo de Servicios Supabase**
- **Análisis exhaustivo**: Identificación de problemas de conectividad entre servicios ECS
- **Servicios auditados**: PostgREST, Kong, pg-meta, Studio
- **Patrones de falla identificados**: IPs dinámicas, fallbacks hardcodeados, proyecto "default"
- **Documentación completa**: `DIAGNOSTICO_SUPABASE_AWS.md` con análisis detallado

#### 🌐 **Solución ALB con Target Groups Implementada**
- **Target Group creado**: `supabase-pgmeta-targets` para servicio pg-meta
  - Puerto: 8080
  - Protocolo: HTTP
  - Health check: `/`
  - Tipo: IP (para Fargate)
- **Regla ALB agregada**: `/pgmeta/*` -> pg-meta Target Group
  - Prioridad: 12
  - ALB: `supabase-studio-alb-1499081913.us-west-2.elb.amazonaws.com`
  - Path: `/pgmeta/*`
- **Auto-registro**: Nuevas tareas de pg-meta se registran automáticamente
- **Deregistro automático**: Tareas terminadas se eliminan del Target Group

#### ✅ **Problema de IPs Dinámicas Resuelto**
- **Problema identificado**: pg-meta cambiaba de IP en cada reinicio de tarea ECS
- **Solución implementada**: Studio usa DNS del ALB en lugar de IPs directas
- **Task Definition Studio TD:8**: Configurado con `STUDIO_PG_META_URL` usando DNS del ALB
- **Beneficio**: DNS siempre resuelve, independiente de cambios de IP de tareas
- **Resultado**: Eliminado ciclo de deployments manuales por cambios de IP

#### 🔒 **Seguridad y Configuración**
- **Security Group actualizado**: Puerto 8080 agregado a `sg-0e42c24bb441f3a65`
- **Health checks automáticos**: ALB verifica salud de pg-meta automáticamente
- **VPC configurada**: `vpc-05eb3d8651aff5257` con subnets correctas
- **Cluster ECS**: `supabase-production` con servicios funcionando

#### 📊 **Configuración Actual de Infraestructura**
- **ALB**: `supabase-studio-alb-1499081913.us-west-2.elb.amazonaws.com`
- **Target Groups**:
  - `supabase-studio-targets` (puerto 3000)
  - `supabase-postgrest-targets` (puerto 3000)
  - `supabase-kong-targets` (puerto 8000)
  - `supabase-pgmeta-targets` (puerto 8080) ✅ NUEVO
- **Reglas ALB**:
  - Prioridad 1: `/api/*` -> studio
  - Prioridad 2: `/rest/*` -> postgrest
  - Prioridad 12: `/pgmeta/*` -> pg-meta ✅ NUEVO

#### 🎯 **Beneficios de la Solución**
1. ✅ **IPs estáticas**: ALB DNS siempre funciona, independiente de IPs de tareas
2. ✅ **Auto-registro**: Nuevas tareas de pg-meta se registran automáticamente en Target Group
3. ✅ **Health checks**: ALB verifica salud de pg-meta automáticamente
4. ✅ **No más deployments manuales**: Por cambios de IP (problema eliminado)
5. ✅ **Mayor estabilidad**: Servicios no dependen de IPs hardcodeadas

#### 📝 **Archivos de Documentación**
- `DIAGNOSTICO_SUPABASE_AWS.md` - Análisis completo y solución implementada
- `ESTADO_MCP_ACTUAL.md` - Estado actual de configuración MCP
- `MCP_SUPAVIDANTA_CONFIG.md` - Configuración MCP SupaVidanta
- `MCP_SUPAVIDANTA_SOLUCION_FINAL.md` - Solución final MCP

#### 🔧 **Mejoras Técnicas**
- **Configuración pg-meta**: Cambio de variables individuales a `PG_META_DB_URI` (connection string completa)
- **Studio TD:8**: Actualizado con DNS del ALB para pg-meta
- **Análisis de patrones**: Identificación de ciclo de reinicios por deployments manuales
- **Documentación técnica**: Análisis real del problema raíz vs conclusiones erróneas previas

---

## 🚀 Versión 5.11.0 - Live Monitor: Vista DataGrid + Gestión de Finalizaciones (Octubre 24, 2025)

### 📊 **LIVE MONITOR - NUEVA VISTA DATAGRID CON SELECTOR**

#### 🎨 **Selector de Vista Kanban/DataGrid**
- **Toggle interactivo**: Selector de vista entre Kanban y DataGrid con persistencia en localStorage
- **Iconos profesionales**: SVG de alta calidad para cada modo de vista
- **Persistencia automática**: La preferencia se guarda en `localStorage` con key `liveMonitor-viewMode`
- **Restauración inteligente**: Al recargar la página se restaura la última vista seleccionada

#### 📋 **Vista DataGrid Dual**
- **Grid Superior**: Llamadas en Etapa 5 (Presentación e Oportunidad)
  - Filtrado automático por `checkpoint #5`
  - Título: "🎯 Presentación e Oportunidad (Etapa 5)"
- **Grid Inferior**: Llamadas en Etapas 1-4
  - Ordenadas de mayor a menor checkpoint (4 → 3 → 2 → 1)
  - Título: "📋 Llamadas en Proceso (Etapas 1-4)"
- **Diseño responsive**: Optimizado para diferentes tamaños de pantalla
- **7 columnas informativas**: Cliente, Teléfono, Checkpoint, Duración, Estado, Interés, Acción

#### 🏁 **Nueva Pestaña "Llamadas Finalizadas"**
- **Tab dedicado**: Quinta pestaña en la barra de navegación
- **Vista unificada**: DataGrid para llamadas completadas (finalizadas o perdidas)
- **Contador en tiempo real**: Badge con número de llamadas finalizadas
- **Filtrado automático**: Solo muestra llamadas con estado `finalizada` o `perdida`

#### ✅ **Modal de Finalización de Llamadas**
- **Hover interactivo**: Avatar del prospecto cambia a icono de check al pasar el mouse
- **3 opciones circulares con colores:**
  - 🔴 **Perdida (Rojo)**: Marca la llamada como no exitosa
  - ✅ **Finalizada (Verde)**: Marca la llamada como exitosa
  - ⏰ **Marcar más tarde (Azul)**: Cierra el modal sin realizar cambios
- **Actualización automática de BD**: Campos `call_status`, `feedback_resultado`, `tiene_feedback`, `ended_at`
- **Movimiento automático**: Las llamadas finalizadas se mueven al tab "Finalizadas"
- **UI moderna**: Diseño con animaciones suaves y efectos hover

#### 📊 **Características del Componente DataGrid**
- **Avatar interactivo**: Hover muestra icono de check para finalización rápida
- **Click en fila**: Abre el mismo modal de detalle que la vista Kanban
- **Badges visuales con colores**:
  - Checkpoint: Azul (1), Morado (2), Verde (3), Amarillo (4), Rojo (5)
  - Estado: Verde (activa), Azul (transferida), Rojo (perdida)
  - Interés: Verde (alto), Amarillo (medio), Rojo (bajo)
- **Iconos informativos**: Teléfono, reloj, trending up para mejor UX
- **Formato de duración**: MM:SS para fácil lectura

#### 🔧 **Mejoras Técnicas**
- **Nuevos componentes modulares**:
  - `LiveMonitorDataGrid.tsx` (243 líneas) - Componente de tabla reutilizable
  - `FinalizationModal.tsx` (148 líneas) - Modal de finalización con 3 opciones
- **Funciones helper especializadas**:
  - `getStage5Calls()`: Filtra llamadas de etapa 5
  - `getStages1to4Calls()`: Filtra y ordena llamadas de etapas 1-4
  - `handleCallFinalization()`: Gestiona la finalización con actualización de BD
  - `openFinalizationModal()`: Abre el modal con la llamada seleccionada
- **Tipado completo con TypeScript**: Interfaces bien definidas
- **Integración con Lucide React**: Iconos modernos y ligeros

#### 🗄️ **Actualizaciones de Base de Datos**
- **Campos utilizados para finalización**:
  - `call_status`: 'finalizada' | 'perdida' | 'activa' | ...
  - `feedback_resultado`: Tipo de finalización seleccionado
  - `feedback_comentarios`: Comentarios automáticos según el tipo
  - `tiene_feedback`: Boolean que indica si se procesó el feedback
  - `ended_at`: Timestamp de finalización de la llamada

#### 💾 **Gestión de Estado y Persistencia**
- **Estados nuevos agregados**:
  - `viewMode`: 'kanban' | 'datagrid'
  - `showFinalizationModal`: boolean
  - `callToFinalize`: KanbanCall | null
  - `finalizationLoading`: boolean
  - `finishedCalls`: KanbanCall[]
- **Persistencia con localStorage**: Preferencia de vista se guarda automáticamente
- **Sincronización inteligente**: Recarga de llamadas después de finalizar

#### 📝 **Archivos Modificados**
- `src/components/analysis/LiveMonitorKanban.tsx` (+180 líneas)
- `src/components/analysis/LiveMonitorDataGrid.tsx` (nuevo, 243 líneas)
- `src/components/analysis/FinalizationModal.tsx` (nuevo, 148 líneas)
- `src/components/analysis/CHANGELOG_LIVEMONITOR.md` (actualizado a v5.3.0)
- `src/components/analysis/README_LIVEMONITOR.md` (actualizado a v5.3.0)
- `LIVE_MONITOR_V5.3.0_SUMMARY.md` (documentación completa de implementación)

#### 🔗 **Documentación Técnica**
- Ver detalles completos en: `src/components/analysis/README_LIVEMONITOR.md`
- Ver historial de cambios en: `src/components/analysis/CHANGELOG_LIVEMONITOR.md`
- Ver resumen de implementación en: `LIVE_MONITOR_V5.3.0_SUMMARY.md`

---

## 🚀 Versión 5.10.0 - Live Chat: Cache Persistente de Imágenes (Octubre 24, 2025)

### 💬 **LIVE CHAT - OPTIMIZACIÓN DE RENDIMIENTO**

#### ⚡ **Sistema de Cache Persistente de 3 Niveles**
- **Nivel 1 (Memoria)**: Estado React `imageUrls` (0ms - instantáneo)
- **Nivel 2 (localStorage)**: Cache persistente entre sesiones (1-5ms - muy rápido)
- **Nivel 3 (API Railway)**: Generación de URLs firmadas (300-800ms - solo primera carga)

#### 📊 **Mejoras de Rendimiento**
- **Segunda carga de modal**: 98% más rápido (3-5s → 50-100ms) ⚡
- **Imágenes en chat**: 95% más rápido (500-800ms → 10-50ms por imagen) ⚡
- **Reducción de llamadas a API**: 99% menos requests (solo primera vez)
- **Cache hit rate esperado**: 95-98% después de primera sesión
- **UX**: Experiencia casi instantánea en cargas subsecuentes

#### 🎯 **Características del Sistema de Cache**
- **Persistencia**: Sobrevive recargas y cierres del navegador
- **Validación inteligente**: URLs válidas por 25 minutos (5min margen de expiración)
- **Limpieza automática**: Elimina entradas expiradas cuando localStorage se llena
- **Prefijos por tipo**: `img_` (catálogo), `thumb_` (thumbnails), `media_` (WhatsApp)
- **Thumbnails optimizados**: Transformaciones de resolución para Supabase/Cloudflare

#### 🔧 **Optimizaciones HTML**
- **`decoding="async"`**: Agregado a todas las imágenes (no bloquea renderizado)
- **`loading="lazy"`**: Ya existía, optimizado con cache
- **Thumbnails**: URLs con parámetros `?width=300&quality=80` para servicios compatibles

#### 📝 **Archivos Modificados**
- `src/components/chat/ImageCatalogModal.tsx`: Cache persistente + thumbnails optimizados
- `src/components/chat/MultimediaMessage.tsx`: Cache localStorage + limpieza automática
- `src/components/chat/OPTIMIZACION_CACHE_IMAGENES.md`: Documentación técnica completa
- `src/components/chat/CHANGELOG_LIVECHAT.md`: Versión 5.10.0

#### 🔗 **Documentación**
Ver detalles técnicos completos en: `src/components/chat/OPTIMIZACION_CACHE_IMAGENES.md`

---

## 🚀 Versión 5.9.0 - Live Chat: Catálogo de Imágenes + Multimedia (Octubre 23, 2025)

### 💬 **LIVE CHAT - NUEVAS FUNCIONALIDADES MAYORES**

#### 🖼️ **Catálogo de Imágenes Integrado**
- **Modal interactivo**: Catálogo completo de imágenes de destinos, resorts y atracciones
- **Búsqueda avanzada**: Filtrado por palabra clave, destino y resort
- **Paginación optimizada**: 8 imágenes por página para mejor rendimiento
- **Cache inteligente**: Últimas 8 imágenes usadas guardadas localmente
- **Preview profesional**: Vista previa antes de enviar
- **Caption opcional**: Agregar texto descriptivo a imágenes
- **Envío directo**: Integración con webhook Railway para WhatsApp

#### 📸 **Soporte Multimedia Completo**
- **Tipos soportados**: Imágenes, audios, videos, stickers, documentos
- **Lazy loading**: Carga multimedia solo cuando es visible (Intersection Observer)
- **Cache de URLs**: URLs firmadas válidas por 25 minutos
- **Detección inteligente**: Reconoce stickers WhatsApp (.webp, .gif, sin extensión)
- **UX WhatsApp**: Stickers y audios sin globo, imágenes/videos/docs con globo
- **Validación robusta**: Maneja campos undefined sin crashear

#### 🎨 **Mejoras de UX**
- **Sin etiquetas**: Removidas etiquetas "Prospecto", "AI", "Vendedor"
- **Avatares limpios**: Solo iniciales en círculo para identificar remitente
- **Visualización nativa**: Multimedia se muestra como en WhatsApp real
- **Rendimiento**: Carga bajo demanda evita saturar la red

#### 🔧 **Correcciones Técnicas**
- **Fix TypeError**: Validación defensiva en todas las funciones multimedia
- **Fix CORS**: Preparado Edge Function proxy (pendiente deploy)
- **Fix Query prospecto**: Obtiene whatsapp e id_uchat automáticamente
- **Compatibilidad**: Soporta estructura webhook vs estructura DB

#### 📝 **Archivos Nuevos**
- `src/components/chat/ImageCatalogModal.tsx` ⭐
- `src/components/chat/MultimediaMessage.tsx` ⭐
- `supabase/functions/send-img-proxy/` ⭐ (Edge Function CORS)

---

## 🚀 Versión 5.8.0 - Live Chat Profesional (Octubre 23, 2025)

### 💬 **LIVE CHAT - MEJORAS CRÍTICAS**

#### ⏰ **Restricción de Ventana de 24 Horas (WhatsApp Business API)**
- **Validación automática**: Verifica tiempo transcurrido desde último mensaje del usuario
- **Bloqueo inteligente**: Impide envío de mensajes fuera de ventana de 24h
- **UI profesional**: Banner informativo explicando políticas de WhatsApp Business API
- **Reactivación automática**: Se reactiva cuando el usuario envía un nuevo mensaje
- **Cumplimiento**: Alineado con políticas oficiales de WhatsApp Business API

#### 🐛 **Fix: Race Condition en Realtime**
- **Problema**: Suscripción Realtime se configuraba ANTES de cargar conversaciones
- **Solución**: Carga secuencial garantizada (conversaciones → Realtime)
- **Resultado**: Actualización automática y confiable de lista de conversaciones
- **Impacto**: Mensajes entrantes ahora SÍ actualizan la UI en tiempo real

#### 🐛 **Fix: Contador de Mensajes No Leídos Persistente**
- **Problema**: RLS bloqueaba UPDATE de columna `leido` con `anon` key
- **Solución**: Función RPC `mark_messages_as_read` con `SECURITY DEFINER`
- **Bypass controlado**: Solo marca mensajes del rol 'Prospecto'
- **Resultado**: Contador se resetea correctamente y persiste entre recargas

#### 🧹 **Limpieza Masiva de Logs**
- **Problema**: Consola saturada con más de 100 mensajes por operación
- **Solución**: Eliminación sistemática de todos `console.log` y `console.warn`
- **Retenidos**: Solo `console.error` para errores críticos
- **Impacto**: Consola limpia, mejor rendimiento, debugging más fácil

#### 📝 **Documentación Actualizada**
- **CHANGELOG detallado**: v5.3.1, v5.3.2, v5.3.3 en módulo Live Chat
- **Guías SQL**: Scripts para RPC `mark_messages_as_read` y `get_conversations_ordered`
- **Instrucciones paso a paso**: Habilitación de Realtime para `mensajes_whatsapp`
- **Golden Rules**: Comentarios estandarizados en archivos core

---

## 🚀 Versión 5.7.0 - Live Monitor Reactivo + Análisis IA Mejorado (Octubre 2025)

### 🎯 **LIVE MONITOR COMPLETAMENTE REACTIVO**

#### 🔄 **Sistema de Datos en Tiempo Real Perfeccionado**
- **Consulta completa**: Incluye TODOS los campos dinámicos de VAPI (datos_proceso, composicion_familiar_numero, etc.)
- **Mapeo corregido**: datos_proceso ahora se pasa correctamente al objeto LiveCallData
- **Sistema preserve**: Mantiene datos actualizados por Realtime, evita sobrescritura con datos viejos
- **Polling optimizado**: Reducido de 3s → 30s, solo para detectar llamadas nuevas
- **Logs detallados**: Debugging completo para tracing de datos_proceso

#### 🎯 **Reclasificación Automática de Llamadas Finalizadas**
- **Detección automática**: Cuando call_status cambia de 'activa' → 'finalizada'
- **Clasificación inteligente**: assistant-forwarded-call → Transferidas, customer-ended-call → Fallidas
- **Sin intervención manual**: Llamadas se mueven automáticamente según razon_finalizacion
- **Checkpoint #5 específico**: Movimiento automático a Transferidas al cerrar modal
- **Logs específicos**: [AUTO-CLASSIFY] y [AUTO-DETECT] para debugging

#### 📊 **Datos Familiares Dinámicos Solucionados**
- **Prioridad correcta**: 1) datos_proceso.numero_personas, 2) composicion_familiar_numero, 3) tamano_grupo
- **Actualización instantánea**: Cambios de VAPI aparecen inmediatamente en tarjetas Kanban
- **Sin "planchado"**: Datos actualizados se mantienen, no se sobrescriben
- **Modal reactivo**: Conversación y datos se actualizan sin parpadeos

#### 🎨 **Interfaz Limpia Enfoque Continuidad**
- **Precio ofertado eliminado**: De tarjetas Kanban, modal detalle y tabla historial
- **Enfoque discovery**: Métricas centradas en continuidad WhatsApp y discovery familiar
- **Colores intuitivos**: Verde=excelente, azul=bueno, amarillo=regular, etc.

### 🧠 **ANÁLISIS IA - ENFOQUE CONTINUIDAD Y DISCOVERY**

#### 📊 **Métricas Actualizadas al Nuevo Enfoque**
- **Dashboard actualizado**: "Análisis IA - Continuidad y Discovery"
- **Métricas nuevas**: "Continuidad WhatsApp" y "Discovery Completo" en lugar de "Tasa Éxito"
- **Calificaciones filtradas**: Eliminada "Calidad de Cierre" del enfoque anterior
- **Sistema de colores universal**: Verde=excelente, azul=bueno, amarillo=regular, naranja=mejora, rojo=crítico

#### 🎨 **Gráfica Radar Calibrada**
- **Ponderaciones específicas**: PERFECTO=100%, BUENO/BUENA=80%, CONTROLADO=90%, PRECISA=95%
- **Colores actualizados**: Verde esmeralda para tema de continuidad
- **Labels en español**: "Continuidad WhatsApp", "Discovery Familiar", etc.
- **Leyenda visual**: Círculos de colores con rangos explicativos
- **Filtrado inteligente**: Excluye métricas del enfoque anterior

#### 📱 **Agrupamiento Colapsado de Llamadas**
- **Agrupamiento por prospecto**: Todas las llamadas del mismo cliente se agrupan
- **Vista colapsada**: Solo muestra la llamada más reciente por defecto
- **Botón de expansión**: ">" para ver todas las llamadas del prospecto
- **Indicadores visuales**: Badge "X llamadas", bordes de color, iconos diferenciados
- **Sorting inteligente**: Funciona dentro de grupos, mantiene llamada principal
- **Auto-colapso**: Grupos con múltiples llamadas se colapsan automáticamente

#### 🔧 **Servicio de Análisis Nuevo Enfoque**
- **callAnalysisService.ts**: Estructura completa para análisis de continuidad
- **Enums definidos**: CONTINUIDAD_WHATSAPP, DISCOVERY_FAMILIAR, etc.
- **Interfaces TypeScript**: CallAnalysisRequest, CallAnalysisResponse
- **Métodos de análisis**: analyzeCall(), saveAnalysis(), reAnalyzeCall()
- **Cálculo de scores**: Basado en ponderaciones del nuevo enfoque

### 🛠️ **CORRECCIONES TÉCNICAS**

#### 🔧 **Consultas de Base de Datos Optimizadas**
- **Campos dinámicos incluidos**: datos_proceso, checkpoint_venta_actual, conversacion_completa
- **Consulta fallback robusta**: Si falla consulta completa, usa selección mínima
- **Logs de debugging**: Datos crudos vs parseados para troubleshooting
- **Eliminación de campos inexistentes**: razon_finalizacion no existe como columna directa

#### 🎯 **Lógica de Clasificación Mejorada**
- **Criterios basados en datos reales**: assistant-forwarded-call, customer-ended-call
- **Detección de llamadas zombie**: call_status='activa' pero con razon_finalizacion
- **Clasificación automática**: Sin necesidad de intervención manual del vendedor
- **Preserve mode**: Mantiene datos de Realtime durante polling

---

## 🚀 Versión 5.6.0 - Live Monitor Optimizado + Reportes de Seguridad (Octubre 2025)

### 🎯 **OPTIMIZACIONES FINALES LIVE MONITOR**

#### 🔔 **Sistema de Notificaciones Mejorado**
- **Sonido de campana 4x más audible**: Volumen aumentado de 0.3 → 0.8 (167% más fuerte)
- **Compressor de audio**: Hace el sonido más consistente y potente sin tocar volumen del sistema
- **4 repeticiones**: Secuencia de 3.2 segundos total para máxima notoriedad
- **Configuración profesional**: Threshold -10dB, ratio 8:1, attack/release optimizado

#### 🔄 **Reclasificación Inteligente Perfeccionada**
- **Verificación en BD**: Al cerrar modal consulta estado real antes de reclasificar
- **Detección de cambios**: Verifica call_status, checkpoint y razon_finalizacion
- **Polling optimizado**: Cada 3 segundos para detectar cambios inmediatamente
- **Efecto adicional**: Reclasifica automáticamente cuando cambian llamadas vistas
- **Logs detallados**: Debugging completo para troubleshooting

#### 📊 **Datos Familiares en Tiempo Real**
- **Tarjetas Kanban**: Priorizan datos_proceso.numero_personas sobre campos estáticos
- **Indicadores visuales**: "(RT)" para datos tiempo real vs estáticos
- **Modal sincronizado**: Actualiza resumen y datos familiares sin cerrar
- **Parsing robusto**: Maneja datos_proceso como string o objeto JSON

### 📋 **DOCUMENTACIÓN DE SEGURIDAD CORPORATIVA**

#### 🛡️ **Reportes de Infraestructura**
- **Análisis AWS completo**: Conexión directa a cuenta 307621978585
- **Inventario de servicios**: ECS, RDS, ElastiCache, CloudFront, S3, Route 53
- **Evaluación de cumplimiento**: Lineamientos de seguridad corporativa
- **Recomendaciones técnicas**: MFA, VPN corporativa, certificados SSL

#### 🔐 **Medidas de Seguridad Verificadas**
- **VPC segmentada**: 3 capas (pública, privada, base de datos)
- **Security Groups restrictivos**: Principio de menor privilegio
- **Encriptación multicapa**: TLS 1.3 + AES-256 en reposo
- **IAM roles corporativos**: Sin cuentas personales o permisos excesivos
- **Auditoría completa**: CloudWatch + función exec_sql con logs

### 🔧 **Mejoras Técnicas**

#### ⚡ **Performance y Estabilidad**
- **Realtime optimizado**: Actualizaciones selectivas sin re-renders completos
- **Parsing mejorado**: Manejo robusto de datos_proceso y datos_llamada JSON
- **Error handling**: Fallbacks para compilación y conexiones
- **Cleanup automático**: Canales Realtime se limpian correctamente

#### 🎨 **UX/UI Refinada**
- **Estados visuales precisos**: Colores diferenciados para datos tiempo real vs estáticos
- **Modal inteligente**: Carga resumen existente en lugar de mensaje genérico
- **Logs informativos**: Feedback visual de actualizaciones y cambios
- **Compilación estable**: Errores JSX corregidos para HMR sin interrupciones

---

## 🚀 Versión 5.5.0 - Live Monitor Tiempo Real + Clasificación Inteligente (Octubre 2025)

### 🎯 **LIVE MONITOR COMPLETAMENTE RENOVADO**

#### 📡 **Sistema de Tiempo Real Avanzado**
- **Realtime subscriptions duales**: `llamadas_ventas` + `prospectos` para sincronización completa
- **Movimiento automático entre checkpoints**: Las llamadas se mueven entre columnas sin recargar
- **Actualización de datos familiares**: Composición, destino, edad se sincronizan en vivo
- **Conversación en tiempo real**: Modal actualiza la conversación sin parpadeos ni re-renders
- **Logs detallados**: `🔄 Checkpoint actualizado`, `👨‍👩‍👧‍👦 Prospecto actualizado`

#### 🎨 **Nueva Clasificación Inteligente**
- **Pestaña "Transferidas"** (antes "Finalizadas"): Llamadas con `razon_finalizacion = 'assistant-forwarded-call'`
- **Lógica basada en `razon_finalizacion`**: Clasificación precisa según motivo real de finalización
- **Llamadas activas reales**: Solo sin `razon_finalizacion` y sin duración
- **Llamadas fallidas específicas**: `customer-busy`, `customer-did-not-answer`, `customer-ended-call`
- **Checkpoint #5 especial**: Permanecen en activas hasta abrir modal de detalle

#### 🔔 **Notificaciones Sonoras**
- **Campana sintética**: Web Audio API con secuencia de tonos (800Hz + armónicos)
- **Trigger automático**: Al llegar a `checkpoint #5` (último del proceso)
- **Sin archivos externos**: Generado completamente en navegador

#### 🛠️ **Corrección de Datos Históricos**
- **125+ registros corregidos**: `call_status` sincronizado con `razon_finalizacion`
- **Llamadas antiguas limpiadas**: Registros del 9-10 octubre marcados como `perdida`
- **Función `exec_sql`**: Administración remota de BD desde terminal
- **Políticas RLS optimizadas**: Acceso público seguro para frontend

### 🔧 **Mejoras Técnicas**

#### ⚡ **Performance Optimizada**
- **Actualización selectiva**: Solo actualiza llamadas específicas que cambiaron
- **Sin re-renders innecesarios**: Estado local inteligente
- **Logs throttled**: Máximo 1 error cada 15s por canal
- **Cleanup automático**: Canales Realtime se limpian correctamente

#### 🎯 **UX Mejorada**
- **Modal inteligente**: Marca llamadas como "vistas" para lógica de transferencia
- **Reclasificación automática**: Al cerrar modal, llamadas se mueven a pestaña correcta
- **Estados visuales precisos**: Colores y badges reflejan estado real
- **Error HTML corregido**: `<div>` en lugar de `<p>` para evitar hidratación

### 📊 **Datos de Producción Verificados**

#### **Distribución Final Corregida:**
- **Activas**: 0 (correcto - no hay llamadas en curso)
- **Transferidas**: 27 (llamadas escaladas al supervisor)
- **Fallidas**: 6 (no contestó, ocupado, colgó)
- **Finalizadas**: 17 (completadas exitosamente)
- **Total procesado**: 125+ llamadas reales

---

## 🚀 Versión 5.4.0 - Temas Globales + Acentos por Módulo + UI Homologada (Octubre 2025)

### 🎨 Temas Globales (solo Admin)
- **Renombrados**: "Linear Design" → "Tema Estudio"; "Diseño corporativo" → "Tema Corporativo".
- **Selector global solo Administrador**: Administración → Preferencias del sistema → Temas de la aplicación.
- **Bloqueo para usuarios**: `allow_user_theme_selection: false` persistido en configuración global.

### 🧱 Tokens de diseño y homogeneización visual
- **Variables CSS globales**: `--module-accent`, `--btn-primary-*`, paleta base por tema.
- **Acento por módulo**: Colores coherentes para `pqnc`, `natalia`, `prospectos`, `live-monitor`, `live-chat`, `ai-models`, `agent-studio`, `aws-manager`, `admin`, `academia`.
- **Utilidades homogéneas**: `.u-btn-primary`, `.u-close` para botones primarios y de cierre en todos los módulos.
- **Sin impacto en visibilidad**: Los módulos visibles dependen de permisos, no del tema.

### 🖼️ UI Ancha y Modales Ampliados (PQNC Humans)
- **Contenedor ancho autoajustable** cuando se usa PQNC Humans desde el dashboard de análisis.
- **Modal de Transcripción** ampliado a `max-w-6xl`.
- **Vista Detallada**: `max-w-[96rem]` y `max-h-[92vh]` para mayor área útil.

### 🔧 Cambios Técnicos
- `MainApp`: establece `data-module` global para aplicar acentos por módulo.
- `SystemPreferences`: renombrado de temas y persistencia admin-only.
- `useTheme`: persistencia con `allow_user_theme_selection: false`.
- `index.css`: variables de tema, mapa de acentos por módulo y utilidades homogéneas.

### 📁 Archivos Relevantes
- `src/components/analysis/AnalysisDashboard.tsx`
- `src/components/analysis/PQNCDashboard.tsx`
- `src/components/analysis/DetailedCallView.tsx`
- `src/components/MainApp.tsx`
- `src/components/admin/SystemPreferences.tsx`
- `src/hooks/useTheme.ts`
- `src/index.css`

---

## 🚀 Versión 5.3.0 - Limpieza Completa + Optimización de Tokens (Octubre 2025)

### 🧹 **LIMPIEZA Y OPTIMIZACIÓN COMPLETA**

#### 🗑️ **Eliminación de Archivos Temporales**
- **Archivos de prueba**: test_db_insert.js, debug HTMLs, dev.log
- **Configuraciones temporales**: CloudFront, VAPI configs obsoletos
- **Scripts de setup**: create-uchat-*.js, create-tables-*.js (15+ archivos)
- **Documentación obsoleta**: CHANGELOG_COMPLETO.md, Live Chat READMEs duplicados
- **Proxies temporales**: audio_proxy_server.js, simple-proxy.js

#### 📚 **Documentación Completa por Módulo**
- **README específico**: Cada módulo con descripción, BD, dependencias
- **README principal**: Completamente reescrito para v5.3.0
- **Configuraciones**: /src/config/README.md con todas las bases de datos
- **Servicios**: /src/services/README.md con funcionalidades
- **Información clara**: Conexiones, permisos, navegación por módulo

#### 🔧 **Reorganización del Sidebar**
- **Constructor y Plantillas**: Eliminados completamente
- **Nuevo orden**: Agent Studio → Análisis IA → PQNC Humans → Live Monitor → Live Chat → AI Models → Prompts Manager
- **appMode por defecto**: 'agent-studio' (no 'constructor')
- **Dependencias**: Limpiadas de appStore.ts y MainApp.tsx

#### ⚡ **Optimización de Performance Live Chat**
- **Sin re-renders**: Update local sin loadConversations()
- **Sincronización inteligente**: No interrumpe escritura del usuario
- **Ordenamiento**: Como WhatsApp Web sin parpadeos
- **Navegación automática**: Selección de conversación por prospect_id
- **UX optimizada**: Campo de texto mantiene foco

#### 🧹 **Limpieza de Logs de Producción**
- **Debug logs**: Eliminados de todos los módulos
- **Console.log**: Solo logs de error importantes
- **Sincronización**: Silenciosa sin logs innecesarios
- **Performance**: Reducción de ruido en console

### ✨ **FUNCIONALIDADES ANTERIORES MANTENIDAS**

#### 📊 **Módulo Prospectos Completo**
- **Data grid avanzado**: 23 prospectos reales con filtros y sorting
- **Sidebar detallado**: Información completa con animaciones elegantes
- **Filtros inteligentes**: Por etapa, score, campaña origen
- **Historial llamadas**: Data grid integrado con navegación a Análisis IA
- **Vinculación Live Chat**: Botón condicional si hay conversación activa
- **Diseño minimalista**: Sin emojis, iconos vectoriales, animaciones suaves

#### 🧠 **Análisis IA Rediseñado (antes Natalia IA)**
- **Diseño PQNC Humans**: Replicación fiel del diseño superior
- **Datos híbridos**: call_analysis_summary + llamadas_ventas
- **Gráfica radar**: Visualización tipo red de performance
- **Sidebar prospecto**: Click en iniciales/nombre abre información completa
- **Audio integrado**: Reproductor nativo sin botones innecesarios
- **Transcripción chat**: Conversación parseada como mensajes
- **Métricas reales**: Score base 100, checkpoint /5, duración real

#### 🔗 **Integración Completa Entre Módulos**
- **Prospectos → Análisis IA**: Click en llamada navega automáticamente
- **Análisis IA → Prospecto**: Click en nombre abre sidebar completo
- **Live Chat vinculado**: Verificación de conversaciones activas
- **Navegación inteligente**: localStorage + CustomEvents
- **Datos sincronizados**: Información consistente entre módulos

### ✨ **OPTIMIZACIONES ANTERIORES MANTENIDAS**

#### 🎯 **AWS Manager Completamente Optimizado**
- **Pestaña Resumen**: Métricas dinámicas reales cada 5s sin logs
- **Consola Unificada**: Fusión de Consola AWS + Avanzada en una sola
- **Monitor Real-Time**: Datos reales de 7 servicios AWS sincronizados
- **Datos reales**: Sin hardcoding, conectado a AWS production
- **Auto-refresh silencioso**: 5 segundos sin parpadeo ni logs
- **Diseño minimalista**: Sin emojis, iconos vectoriales modernos

#### 🏗️ **Consola AWS Unificada**
- **Agrupación inteligente**: Servicios por funcionalidad (N8N, Frontend, Database, etc)
- **Sidebar completo**: 3/5 pantalla con configuraciones reales
- **Pestañas específicas**: Information, Configuration, Environment, Logs por tipo
- **Configuraciones editables**: Campos que modifican AWS realmente
- **CLI Terminal**: Comandos reales con datos de servicios
- **Navegación integrada**: Botón "Consumo" → Monitor del servicio

#### 📊 **Sincronización Completa**
- **Datos compartidos**: Resumen, Consola y Monitor usan misma fuente
- **7 servicios reales**: ECS, RDS, ElastiCache(2), ALB, CloudFront, S3
- **Estados reales**: running/available/pending desde AWS
- **Métricas dinámicas**: Basadas en tiempo real, no aleatorias
- **Auto-refresh**: Sincronizado en todas las pestañas

#### 🧹 **Limpieza y Optimización**
- **Pestañas eliminadas**: Diagrama Visual, Flujo Servicios, Railway Console
- **Componentes removidos**: 5 archivos .tsx no utilizados eliminados
- **Código optimizado**: Sin redundancia ni datos duplicados
- **Performance mejorado**: Carga más rápida, menos lazy loading

### 🔧 **MEJORAS TÉCNICAS**

#### ⚡ **Optimización de Datos**
- **AWSMetricsService**: Singleton con cache inteligente 30s
- **Variación temporal**: Math.sin(time) para métricas suaves
- **Estado-based**: Métricas 0 si servicio stopped/error
- **Rangos realistas**: Según tipo de servicio y uso actual

#### 🛡️ **Seguridad y Estabilidad**
- **Token AWS**: Problema resuelto usando datos production
- **Error handling**: Robusto sin fallos de credenciales
- **Datos consistentes**: Entre todas las pestañas
- **Performance**: Sin llamadas excesivas a AWS

---

## 🚀 Versión 5.0.0 - N8N Production Deploy + AWS Railway Console (Octubre 2025)

### ✨ **NUEVA FUNCIONALIDAD PRINCIPAL**

#### 🤖 **N8N Automation Platform - Deploy Completo**
- **Infraestructura AWS**: ECS Fargate + RDS PostgreSQL + CloudFront SSL
- **SSL automático**: Certificado AWS sin dominio propio requerido
- **SPA routing**: CloudFront configurado para rutas directas
- **Gestión usuarios**: Acceso directo a PostgreSQL desde AWS VPC
- **Production ready**: Configuración según documentación oficial n8n
- **URL HTTPS**: CloudFront con SSL global y CDN

#### 🎨 **AWS Railway Console - Interfaz Moderna**
- **Diseño Railway-style**: Agrupación de servicios por funcionalidad
- **Slider lateral**: Configuración completa por servicio (2/3 pantalla)
- **Service groups**: Compute, Database, Networking, Storage
- **Pestañas específicas**: Deployments, Variables, Metrics, Settings por tipo
- **Git integration**: Configuración repositorio y auto-deploy
- **Responsive design**: Mobile-friendly con overflow scrolling

#### 🔧 **Gestión PostgreSQL desde AWS VPC**
- **ECS Tasks temporales**: PostgreSQL client en contenedores
- **Acceso seguro**: Desde VPC interna sin exposición externa
- **Comandos SQL**: Automatizados con logs en CloudWatch
- **User management**: Roles y permisos directos en base de datos
- **Cleanup automático**: Tasks temporales auto-eliminadas

### 🔧 **MEJORAS TÉCNICAS**

#### 🛡️ **Seguridad y Estabilidad**
- **Parameter Group personalizado**: SSL opcional para n8n
- **Security Groups optimizados**: Acceso público solo donde necesario
- **VPC privada**: RDS en subnets privadas
- **SSL termination**: CloudFront edge locations
- **Task definitions**: Optimizadas según best practices

#### 🔄 **Arquitectura Mejorada**
- **ECS sobre EKS**: Menor complejidad, managed services
- **RDS sobre PostgreSQL pods**: Mayor robustez y backup automático
- **CloudFront sobre K8s LB**: SSL automático y CDN global
- **Custom Error Pages**: Soporte completo SPA routing

#### ⚡ **Optimización N8N**
- **Imagen oficial**: n8nio/n8n:latest v1.114.3
- **Health checks**: Optimizados (60s vs 180s)
- **Variables oficiales**: Según documentación n8n
- **Logs estructurados**: CloudWatch integration

### ✨ **FUNCIONALIDADES ANTERIORES MANTENIDAS**

#### ☁️ **AWS Manager - Consola Completa**
- **Descubrimiento automático**: Todos los servicios AWS (ECS, RDS, ElastiCache, ALB, CloudFront, S3)
- **Consola básica**: Vista general con métricas en tiempo real
- **Consola avanzada**: Configuración específica por servicio con opciones editables
- **Monitoreo real-time**: Actualización automática cada 10 segundos
- **Arquitectura visual**: Diagramas interactivos de infraestructura
- **Comandos terminal**: Control directo de recursos AWS
- **Acciones rápidas**: Botones específicos por servicio

#### 🎛️ **Consola AWS Avanzada**
- **ECS**: Configuración de servicios, tareas, escalado automático
- **RDS**: Gestión de bases de datos, backups, configuración SSL
- **ElastiCache**: Administración Redis, clusters, configuración memoria
- **ALB**: Load balancers, target groups, health checks
- **CloudFront**: Distribuciones CDN, invalidaciones, configuración cache
- **S3**: Buckets, políticas, hosting estático, CORS

#### 🔐 **Sistema de Permisos Desarrollador**
- **Acceso completo**: AWS Manager, Live Monitor, Análisis, AI Models
- **Restricciones**: Admin, Agent Studio, Plantillas, Constructor
- **Sidebar mejorado**: AWS Manager visible para developers
- **Permisos granulares**: Control específico por módulo

#### 📡 **Live Monitor Completamente Restaurado**
- **Consultas Supabase**: Filtrado de IDs null/undefined corregido
- **Error 400 resuelto**: Queries malformadas eliminadas
- **Datos prospectos**: Carga correcta sin errores
- **Monitoreo real-time**: Llamadas activas y finalizadas
- **Control audio**: Configuraciones Tone.js funcionales
- **Transferencias**: Sistema de feedback operativo

#### 🌐 **Deploy AWS Completo**
- **Frontend S3**: Hosting estático configurado
- **CloudFront CDN**: Distribución global con HTTPS
- **Invalidación cache**: Actualizaciones inmediatas
- **Variables entorno**: Configuración Vite para producción
- **Credenciales seguras**: Sin hardcoding, solo env vars

### 🔧 **MEJORAS TÉCNICAS**

#### ⚡ **Optimización Frontend**
- **Lazy loading**: AWS Manager con React.lazy y Suspense
- **Bundle splitting**: Chunks optimizados por servicio
- **Error boundaries**: Manejo robusto de errores
- **Performance**: Reducción tiempo carga inicial

#### 🛡️ **Seguridad y Estabilidad**
- **GitHub Push Protection**: Credenciales removidas del código
- **Environment variables**: Configuración segura con import.meta.env
- **CORS handling**: Soluciones para llamadas AWS desde browser
- **Production service**: Mock data para frontend sin backend AWS

#### 🔄 **Arquitectura Mejorada**
- **AWS Services**: Separación browser vs production
- **Service discovery**: Detección automática de recursos
- **Error handling**: Manejo robusto de fallos de conexión
- **Retry logic**: Reintentos automáticos en consultas

### 🐛 **ERRORES CORREGIDOS**

#### ❌ **Live Monitor Issues**
- **Supabase 400**: Queries con IDs null eliminados
- **React Hooks**: useAuth fuera de contexto corregido
- **Permission access**: Developer role restaurado
- **Data loading**: Prospectos cargando correctamente

#### ❌ **AWS Manager Issues**
- **Process undefined**: import.meta.env implementado
- **CORS errors**: Servicio producción con mock data
- **Module loading**: Lazy loading para evitar circular deps
- **Favicon 403**: Archivo agregado al public folder

#### ❌ **Deployment Issues**
- **CloudFront cache**: Invalidación automática
- **S3 sync**: Upload optimizado con --delete
- **Git credentials**: Push protection resuelto
- **Environment vars**: Configuración Vite correcta

### 📊 **MÉTRICAS Y RENDIMIENTO**

#### 🎯 **AWS Manager**
- **7+ servicios**: ECS, RDS, ElastiCache, ALB, CloudFront, S3, VPC
- **3 consolas**: Básica, Avanzada, Monitoreo Real-time
- **Auto-refresh**: 10 segundos
- **Response time**: <2s carga inicial

#### 🔄 **Live Monitor**
- **0 errores 400**: Queries Supabase optimizadas
- **Real-time data**: Actualización continua
- **Audio control**: Tone.js completamente funcional
- **Permission system**: 100% operativo

#### 🚀 **Deployment**
- **Build time**: ~4.3s
- **Bundle size**: 1.8MB main chunk
- **CloudFront**: CDN global activo
- **Cache invalidation**: <30s propagación

### 🔐 **CONTROL DE ACCESO**

#### 👨‍💻 **Developer Role**
- ✅ **AWS Manager**: Consolas completas + monitoreo
- ✅ **Live Monitor**: Llamadas + audio + transferencias
- ✅ **Análisis**: Natalia + PQNC + métricas
- ✅ **AI Models**: Gestión modelos + tokens
- ✅ **Academia**: Contenido ventas + materiales
- ❌ **Admin**: Panel administración
- ❌ **Agent Studio**: Constructor agentes
- ❌ **Plantillas**: Gestión templates
- ❌ **Constructor**: Wizard agentes

#### 🛠️ **Funcionalidades Técnicas**
- **AWS CLI integration**: Comandos directos
- **Real-time monitoring**: Métricas live
- **Service management**: Start/stop/restart
- **Configuration editing**: Parámetros AWS
- **Architecture diagrams**: Visualización infraestructura

---

## 🤖 Versión 3.1.0 - Control de Bot IA + Sincronización Real (Octubre 2025)

### ✨ **NUEVA FUNCIONALIDAD PRINCIPAL**

#### 🤖 **Control Completo del Bot IA**
- **Pausa automática**: Bot se pausa 15 minutos antes de enviar mensaje desde UI
- **Botones de control manual**: 5m, 15m, 30m, 1h en header de conversación
- **Botón "Reactivar IA"**: Grande con animación pulsante cuando bot está pausado
- **Contador en tiempo real**: Muestra tiempo restante con actualización cada segundo
- **Persistencia completa**: Estado guardado en localStorage, compartido entre usuarios

#### 🔄 **Sincronización Real de Mensajes**
- **Flujo completo**: pqnc_ia.prospectos → system_ui.uchat_conversations
- **Mensajes bidireccionales**: Recepción automática + envío manual
- **Sistema de caché**: Mensajes enviados desde UI no se duplican en BD
- **Fusión inteligente**: Caché temporal se limpia cuando llegan mensajes reales
- **Intervalos optimizados**: 15s general, 10s conversación activa

#### 📡 **Integración UChat API**
- **Endpoints verificados**: `/flow/bot-users-count`, `/flow/agents`, `/flow/subflows`
- **Webhook funcional**: Envío de mensajes a WhatsApp via webhook
- **Control de bot**: `/subscriber/pause-bot` y `/subscriber/resume-bot` (pendiente webhook)
- **Estructura correcta**: `user_ns` y `minutes` para control de bot

#### 🎨 **Mejoras de Interface**
- **Indicadores visuales**: Estado de sincronización en header
- **Mensajes en caché**: Borde punteado + "Enviando..." para mensajes temporales
- **Botones adaptativos**: Colores diferenciados por duración de pausa
- **Animación pulsante**: Botón "Reactivar IA" con `animate-pulse`

### 🔧 **Correcciones Técnicas**

#### **Problemas Resueltos:**
- **Warning Supabase**: Instancia única global para evitar múltiples clientes
- **Duplicación mensajes**: Sistema de caché evita constraint violations
- **Error CORS**: Uso de webhooks en lugar de llamadas directas a UChat API
- **Reactivación prematura**: Timer mejorado con margen de tolerancia
- **Hot reload**: Estado persistente que sobrevive recargas de Vite

#### **Optimizaciones:**
- **Filtrado inteligente**: Solo mensajes nuevos se sincronizan
- **Verificación en BD**: Previene duplicados antes de insertar
- **Logs detallados**: Debugging completo para monitoreo
- **Manejo de errores**: Graceful fallback sin afectar UI

### 📊 **Datos de Producción Verificados**

#### **Bases de Datos Conectadas:**
- **pqnc_ia**: 5 prospectos activos con id_uchat
- **system_ui**: 3 conversaciones sincronizadas
- **UChat API**: 17 usuarios activos, 1 agente online

#### **Flujo de Datos Funcional:**
```
Prospecto (pqnc_ia) → Conversación (system_ui) → UI (Live Chat)
     ↓                        ↓                      ↓
Mensajes WhatsApp → Mensajes UChat → Caché Temporal → Fusión
```

### 🎯 **Características Implementadas**

#### **Control de Bot:**
- ✅ **Pausa automática**: 15 min por defecto
- ✅ **Control manual**: Botones 5m, 15m, 30m, 1h
- ✅ **Reactivación**: Manual + automática al expirar
- ✅ **Contador**: Tiempo restante en formato "14m 59s"
- ✅ **Persistencia**: Estado en localStorage

#### **Sincronización:**
- ✅ **Tiempo real**: Intervalos automáticos
- ✅ **Sin rerenders**: Actualizaciones silenciosas
- ✅ **Sin duplicados**: Sistema de caché inteligente
- ✅ **Fusión automática**: Caché → BD cuando UChat procesa

#### **Interface:**
- ✅ **Botones en header**: Posicionados correctamente
- ✅ **Indicadores visuales**: Estado claro del bot y mensajes
- ✅ **Animaciones**: Pulsación en botón activo
- ✅ **Modo oscuro**: Completo en todos los elementos

### 📋 **Pendientes para Próxima Versión**
- **Webhooks de control**: Configurar `/webhook/pause-bot` y `/webhook/resume-bot`
- **Optimizaciones**: Ajustar intervalos según necesidad
- **Métricas**: Estadísticas de uso del control de bot

---

## ✅ Versión 3.0.8 - Deploy Railway Exitoso + Documentación (Octubre 2025)

### 🎉 **DEPLOY EXITOSO EN RAILWAY**

#### ✅ **Confirmación: Proyecto desplegado correctamente**
- **Estado**: ✅ Deploy exitoso en Railway
- **URL**: Funcionando correctamente en producción
- **Build**: Sin errores, todas las fases completadas
- **Healthcheck**: Pasando correctamente

#### 📚 **Documentación del Proceso de Resolución**

##### **🔍 Problema Original:**
Railway detectaba incorrectamente el proyecto como **Deno** en lugar de **Node.js**

##### **🔄 Proceso de Resolución (Iterativo):**

**1. Primera Detección (v3.0.4):**
- **Error**: `npm: command not found`
- **Causa**: Nixpacks detectaba Deno por archivos Supabase
- **Solución intentada**: Configuración básica de Railway

**2. Configuración Avanzada (v3.0.5):**
- **Error persistente**: Seguía detectando Deno
- **Causa**: `supabase/functions/n8n-proxy/deno.json` confundía detector
- **Solución intentada**: Múltiples archivos de configuración

**3. Error Nixpacks (v3.0.6):**
- **Error**: `undefined variable 'npm'`
- **Causa**: Configuración nixPkgs con npm explícito
- **Solución intentada**: Simplificación de configuración

**4. Incompatibilidad Vite (v3.0.7):**
- **Error**: `Vite requires Node.js version 20.19+ or 22.12+`
- **Causa**: Node.js 18.20.5 vs Vite 7.1.4
- **Solución final**: Actualización a Node.js 20+

##### **🎯 Solución Final Exitosa:**
```toml
# .nixpacks.toml
[providers]
node = true

[phases.setup]
nixPkgs = ['nodejs_20']  # ← CLAVE: Node.js 20+

# package.json
"engines": {
  "node": ">=20.19.0"  # ← CLAVE: Especificar versión mínima
}

# railway.toml
[env]
NIXPACKS_NODE_VERSION = "20"  # ← CLAVE: Variable de entorno
```

#### 📋 **Archivos de Configuración Final**
- **`.nixpacks.toml`**: Configuración principal con Node.js 20
- **`railway.toml`**: Variables de entorno y comandos
- **`.dockerignore`**: Exclusión de archivos Supabase
- **`.railwayignore`**: Patrones específicos para Railway
- **`Procfile`**: Comando web de respaldo
- **`nixpacks.json`**: Configuración JSON alternativa

#### 🔑 **Lecciones Aprendidas para Futuras Modificaciones**

##### **✅ Hacer:**
1. **Verificar compatibilidad de versiones** antes de actualizar dependencias
2. **Usar Node.js 20+** para proyectos con Vite 7.x
3. **Excluir archivos Supabase** del build de Railway
4. **Configurar múltiples archivos** para mayor compatibilidad
5. **Especificar versiones explícitamente** en engines

##### **❌ Evitar:**
1. **Mezclar Deno y Node.js** en el mismo directorio de build
2. **Usar versiones Node.js < 20** con Vite 7.x
3. **Configuraciones complejas** en nixPkgs (menos es más)
4. **Omitir variables de entorno** de versión
5. **No documentar el proceso** de resolución

#### 🚀 **Estado Final**
- **Railway**: ✅ Deploy exitoso
- **Live Chat**: ✅ Funcional sin modificaciones
- **Modo oscuro**: ✅ Completamente implementado
- **Sidebar adaptativo**: ✅ Funcionando perfectamente
- **Todas las funcionalidades**: ✅ Preservadas al 100%

---

## 🚀 Versión 3.0.7 - Node.js 20+ para Vite 7.1.4 (Octubre 2025)

### ✅ **CORRECCIÓN VERSIÓN NODE.JS**

#### 🚀 **Problema Identificado: Incompatibilidad de versiones**
- **Issue**: Vite 7.1.4 requiere Node.js 20.19+ pero Railway usaba 18.20.5
- **Error**: `You are using Node.js 18.20.5. Vite requires Node.js version 20.19+ or 22.12+`
- **Error secundario**: `crypto.hash is not a function` (relacionado con versión Node.js)
- **Solución**: Actualización a Node.js 20+ en todas las configuraciones

#### 🔧 **Configuraciones Actualizadas**
- **`.nixpacks.toml`**: `nodejs_18` → `nodejs_20`
- **`nixpacks.json`**: `nodejs_18` → `nodejs_20`
- **`railway.toml`**: `NIXPACKS_NODE_VERSION = "20"`
- **`package.json`**: `engines.node` → `>=20.19.0`

#### 📋 **Compatibilidad Vite**
- **Vite 7.1.4**: Requiere Node.js 20.19+ o 22.12+
- **Railway**: Ahora usará Node.js 20.x
- **Local**: Sigue funcionando (ya tienes versión compatible)
- **Build**: Debería resolver error `crypto.hash`

#### 🎯 **Sin Cambios Funcionales**
- **Live Chat**: ✅ Sin modificaciones
- **Modo oscuro**: ✅ Preservado
- **Sidebar adaptativo**: ✅ Intacto
- **Layout fijo**: ✅ Sin cambios
- **Funcionalidades**: ✅ Todas preservadas

---

## 🔧 Versión 3.0.6 - Railway Nixpacks Fix Simplificado (Octubre 2025)

### ✅ **CORRECCIÓN NIXPACKS NPM ERROR**

#### 🚀 **Problema Específico: Error 'undefined variable npm'**
- **Issue**: Nixpacks no puede resolver la variable `npm` en el entorno Nix
- **Error**: `error: undefined variable 'npm' at /app/.nixpacks/nixpkgs-*.nix:19:19`
- **Causa raíz**: Configuración de nixPkgs con npm explícito causa conflicto
- **Solución**: Simplificación de configuración usando solo Node.js

#### 🔧 **Configuración Simplificada**
- **`.nixpacks.toml`**: Removido `npm` de nixPkgs, solo `nodejs_18`
- **Fases separadas**: `install` y `build` como fases independientes
- **railway.toml**: Simplificado, removido buildCommand duplicado
- **Procfile**: Comando web directo como respaldo

#### 📋 **Nueva Configuración**
```toml
[providers]
node = true

[phases.setup]
nixPkgs = ['nodejs_18']  # Solo Node.js, npm viene incluido

[phases.install]
cmds = ['npm ci']

[phases.build]
cmds = ['npm run build']
```

#### 🎯 **Estrategia de Resolución**
- **Node.js incluye npm**: No especificar npm por separado
- **Fases separadas**: install y build independientes
- **Configuración mínima**: Menos complejidad = menos errores
- **Múltiples respaldos**: Procfile, .dockerignore, exclusiones

---

## 🔧 Versión 3.0.5 - Railway Deploy Fix Mejorado (Octubre 2025)

### ✅ **CORRECCIÓN AVANZADA DE DEPLOY**

#### 🚀 **Problema Persistente: Railway sigue detectando Deno**
- **Issue**: A pesar de configuración inicial, Nixpacks sigue priorizando Deno
- **Causa raíz**: `supabase/functions/n8n-proxy/deno.json` confunde el detector
- **Error persistente**: `/bin/bash: line 1: npm: command not found`
- **Solución mejorada**: Configuración múltiple y exclusiones específicas

#### 🔧 **Configuraciones Mejoradas**
- **`.nixpacks.toml`**: Agregado `[providers] node = true` para forzar Node.js
- **`.dockerignore`**: Exclusión específica de archivos Deno y Supabase
- **`.railwayignore`**: Patrones más específicos para evitar confusión
- **`Procfile`**: Archivo alternativo para especificar comando web
- **`railway.toml`**: Variable `NIXPACKS_NODE_VERSION = "18"`

#### 📋 **Archivos de Configuración Completos**
```toml
# .nixpacks.toml
[providers]
node = true

[phases.setup]
nixPkgs = ['nodejs_18', 'npm']

# railway.toml  
[env]
NIXPACKS_NODE_VERSION = "18"
```

#### 🎯 **Estrategia Multi-Archivo**
- **Procfile**: `web: npm run preview`
- **nixpacks.json**: Configuración JSON alternativa
- **Exclusiones**: Archivos Supabase completamente ignorados
- **Variables**: Forzar versión Node.js específica

---

## 🚀 Versión 3.0.4 - Fix Railway Deploy + Modo Oscuro (Octubre 2025)

### ✅ **CORRECCIÓN CRÍTICA DE DEPLOY**

#### 🚀 **Problema Resuelto: Error de build en Railway**
- **Issue**: Railway detectaba incorrectamente el proyecto como Deno en lugar de Node.js
- **Causa raíz**: Archivos de Supabase Edge Functions confundían el detector de Nixpacks
- **Error**: `/bin/bash: line 1: npm: command not found`
- **Solución**: Configuración explícita de Railway y Nixpacks para Node.js

#### 🔧 **Archivos de Configuración Agregados**
- **`railway.toml`**: Configuración específica de Railway con Node.js
- **`.nixpacks.toml`**: Especificación explícita de Node.js 18 y npm
- **`.railwayignore`**: Exclusión de archivos Supabase que causan confusión

#### 📋 **Configuración de Deploy**
```toml
[build]
builder = "nixpacks"
buildCommand = "npm ci && npm run build"

[deploy]
startCommand = "npm run preview"
healthcheckPath = "/"
healthcheckTimeout = 300

[env]
NODE_ENV = "production"
```

#### 🎯 **Resultado Esperado**
- **Build correcto**: Detección de Node.js en lugar de Deno
- **Dependencias**: npm install funcionando correctamente
- **Start**: Servidor iniciando con `npm run preview`
- **Healthcheck**: Verificación de salud en ruta raíz

---

## 🌙 Versión 3.0.3 - Modo Oscuro Completo Live Chat (Octubre 2025)

### ✅ **IMPLEMENTACIÓN MODO OSCURO**

#### 🌙 **Problema Resuelto: Live Chat no respondía al modo oscuro**
- **Issue**: Múltiples elementos del módulo Live Chat permanecían en colores claros
- **Causa raíz**: Colores hardcodeados sin variantes para modo oscuro
- **Solución**: Implementación completa de clases `dark:` en todos los elementos

#### 🎨 **Elementos Actualizados**

##### **Header de Navegación:**
- **Fondo**: `bg-white dark:bg-gray-800`
- **Título "Live Chat"**: `text-slate-900 dark:text-white`
- **Pestañas activas**: `bg-slate-100 dark:bg-gray-700`
- **Pestañas inactivas**: `text-slate-600 dark:text-gray-300`
- **Hover**: `hover:bg-slate-50 dark:hover:bg-gray-700`

##### **Columna 1 (Conversaciones):**
- **Contenedor**: `bg-white dark:bg-gray-800`
- **Bordes**: `border-slate-200 dark:border-gray-700`
- **Títulos**: `text-slate-900 dark:text-white`
- **Subtítulos**: `text-slate-500 dark:text-gray-400`
- **Campo búsqueda**: `bg-white dark:bg-gray-700`
- **Conversaciones**: `hover:bg-slate-25 dark:hover:bg-gray-700/50`

##### **Columna 2 (Bloques):**
- **Contenedor**: `bg-white dark:bg-gray-800`
- **Headers**: `text-slate-900 dark:text-white`
- **Iconos**: `text-slate-400 dark:text-gray-500`
- **Hover**: `hover:bg-slate-25 dark:hover:bg-gray-700/50`

##### **Columna 3 (Chat):**
- **Contenedor**: `bg-white dark:bg-gray-800`
- **Header**: `dark:from-gray-800 dark:to-gray-700`
- **Área mensajes**: `dark:from-gray-800 dark:to-gray-900`
- **Burbujas cliente**: `bg-white dark:bg-gray-700`
- **Input**: `bg-white dark:bg-gray-700`

##### **Secciones Analytics y Settings:**
- **Fondos**: `bg-slate-25 dark:bg-gray-900`
- **Tarjetas**: `bg-white dark:bg-gray-800`
- **Inputs**: `bg-slate-50 dark:bg-gray-700`
- **Checkboxes**: `dark:bg-gray-700 dark:border-gray-600`

#### 🎯 **Características del Modo Oscuro**
- **Transiciones suaves**: Cambio automático entre modos
- **Contraste optimizado**: Legibilidad perfecta en ambos modos
- **Gradientes adaptados**: Colores apropiados para tema oscuro
- **Estados interactivos**: Hover y focus funcionando correctamente
- **Consistencia visual**: Paleta coherente en todo el módulo

#### 🧪 **Verificación**
- **Header de pestañas**: ✅ Responde al modo oscuro
- **Todas las columnas**: ✅ Adaptadas completamente
- **Secciones Analytics/Settings**: ✅ Modo oscuro funcional
- **Sin errores de linting**: ✅ Código limpio

---

## 🔧 Versión 3.0.2 - Fix Sidebar Adaptativo Live Chat (Octubre 2025)

### ✅ **CORRECCIÓN CRÍTICA**

#### 🔧 **Problema Resuelto: Columna 1 no se expandía con sidebar colapsado**
- **Issue**: La primera columna (conversaciones) no aprovechaba el espacio extra cuando el sidebar se colapsaba
- **Causa raíz**: Detección incorrecta del estado del sidebar usando atributos inexistentes
- **Solución**: Implementada detección basada en clases CSS reales del contenido principal

#### 🎯 **Mejoras Implementadas**
- **Detección inteligente**: Observa clases CSS `lg:ml-16` (colapsado) vs `lg:ml-64` (expandido)
- **MutationObserver mejorado**: Detecta cambios en tiempo real en las clases del contenido principal
- **Expansión automática**: +192px de ancho extra cuando sidebar está colapsado
- **Indicador visual**: Header muestra "Colapsado (+192px)" o "Expandido"
- **Logs de debugging**: Console logs para verificar detección del estado

#### 📊 **Comportamiento Funcional**
- **Sidebar expandido**: Columna 1 = 320px (ancho base)
- **Sidebar colapsado**: Columna 1 = 512px (320px + 192px extra)
- **Transición suave**: Cambio automático y fluido
- **Sin afectar otras columnas**: Columnas 2 y 3 mantienen comportamiento original

#### 🧪 **Verificación**
- **Detección automática**: ✅ Funcional
- **Expansión dinámica**: ✅ Funcional  
- **Indicador visual**: ✅ Funcional
- **Sin errores de linting**: ✅ Código limpio

---

## 🔧 Versión 3.0.1 - Checkpoint Live Chat Estable (Octubre 2025)

### ✅ **CHECKPOINT DE ESTABILIDAD**

#### 🔧 **Correcciones y Estabilización**
- **Restauración de versión funcional**: Recuperada versión estable del `LiveChatCanvas.tsx`
- **Corrección de errores JSX**: Eliminados errores de sintaxis que impedían compilación
- **Limpieza de archivos duplicados**: Removidos archivos temporales y versiones de prueba
- **Verificación de permisos**: Confirmado acceso completo para perfil evaluador

#### 🎯 **Funcionalidades Confirmadas**
- **Layout fijo profesional**: Columnas con altura fija y scroll independiente
- **Pestañas siempre visibles**: Header fijo que nunca desaparece
- **Área de chat expandida**: Se muestra completa sin necesidad de hacer clic
- **Input fijo funcional**: Campo de mensaje siempre accesible
- **Conversación desde abajo**: Últimos mensajes visibles por defecto
- **Redimensionamiento**: Columnas ajustables con persistencia en localStorage

#### 🔐 **Permisos y Acceso**
- **Evaluador**: Acceso completo confirmado al módulo Live Chat
- **Todos los perfiles**: Funcionalidad disponible para usuarios autenticados
- **Navegación**: Visible en sidebar con ícono animado

#### 📋 **Estado del Sistema**
- **Sin errores de linting**: Código limpio y sin warnings
- **Estructura JSX válida**: Sintaxis correcta en todos los componentes
- **Versión estable**: Lista para desarrollo incremental
- **Checkpoint seguro**: Punto de restauración confiable

---

## 💬 Versión 3.0.0 - Módulo Live Chat Completo (Octubre 2025)

### ✨ **NUEVA FUNCIONALIDAD PRINCIPAL**

#### 💬 **Módulo Live Chat Empresarial**
- **Integración completa con UChat API**: Conexión real con plataforma UChat
- **Arquitectura de lienzo estructurado**: Secciones fijas con altura calculada
- **3 columnas independientes**: Conversaciones, Bloques por Día, Chat
- **Datos reales de producción**: Sincronización con base `pqnc_ia` y `system_ui`

#### 🎯 **Características Avanzadas**
- **Scroll individual por columna**: Sin scroll global de página
- **Pestañas completamente fijas**: Nunca se mueven con scroll
- **Conversación desde abajo**: Últimos mensajes siempre visibles
- **Input fijo**: Separado del historial pero en grupo visual
- **Redimensionamiento de columnas**: Divisores arrastrables con localStorage
- **Adaptación automática al sidebar**: Se ajusta a colapsado/expandido

#### 🗄️ **Base de Datos y Sincronización**
- **Tablas UChat**: `uchat_bots`, `uchat_conversations`, `uchat_messages`
- **Función `exec_sql`**: Para cambios automáticos futuros
- **Sincronización real**: Desde `prospectos`, `mensajes_whatsapp`, `conversaciones_whatsapp`
- **Búsqueda por `id_uchat`**: Conexión con datos de UChat
- **Mensajes con formato Markdown**: Procesamiento de saltos de línea

#### 🎨 **Diseño Profesional**
- **Gradientes elegantes**: Avatares y botones con efectos visuales
- **Sombras sutiles**: Elementos con profundidad
- **Estados visuales**: Indicadores de conversaciones activas/transferidas
- **Tipografía profesional**: Jerarquía clara y legible
- **Paleta empresarial**: Azul, púrpura, slate para aspecto corporativo

#### 🔧 **Funcionalidades Técnicas**
- **Altura fija total**: Respeta header (120px) y footer (64px)
- **Scroll contenido**: `overscrollBehavior: 'contain'` en cada área
- **Prevención de propagación**: `stopPropagation()` en eventos wheel
- **Persistencia de preferencias**: Anchos de columna en localStorage
- **Detección de sidebar**: MutationObserver para cambios dinámicos

### 🚀 **Arquitectura Implementada**

```
┌─────────────────────────────────────────────────────────┐
│ [FIJO] Live Chat | Conversaciones | Analíticas | Config │ ← NUNCA SE MUEVE
├─────────────────────────────────────────────────────────┤
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────────┐ │
│ │[FIJO] Header│ │ │[FIJO] Header│ │ │[FIJO] Header    │ │ ← ALTURA FIJA
│ ├─────────────┤ │ ├─────────────┤ │ ├─────────────────┤ │
│ │[SCROLL]     │ │ │[SCROLL]     │ │ │[SCROLL] Mensajes│ │ ← SCROLL INDIVIDUAL
│ │Conversaciones│ │ │Bloques      │ │ │(desde abajo)    │ │   CONTENIDO
│ │   320px     │ │ │   280px     │ │ │    Resto        │ │
│ │             │ │ │             │ │ ├─────────────────┤ │
│ │             │ │ │             │ │ │[FIJO] Input     │ │ ← SIEMPRE VISIBLE
│ └─────────────┘ │ └─────────────┘ │ └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 🔧 **Próximas Mejoras (v3.0.1)**
- Corrección de ajuste automático al sidebar
- Integración directa con UChat API en tiempo real
- Webhook para recepción automática de mensajes
- Sistema de asignación de agentes avanzado

---

## 🎨 Versión 2.1.4 - AI Models UX Refinado y STT Completo (Octubre 2025)

### ✨ **MEJORAS PRINCIPALES**

#### 🎨 **Diseño Homologado y Minimalista**
- **Esquema de colores elegante**: Cada pestaña con color específico y significado funcional
  - 📚 Biblioteca: Índigo (conocimiento)
  - 🎤 Text to Speech: Púrpura (creatividad)
  - 💬 Speech to Speech: Azul (comunicación)
  - 📝 Speech to Text: Esmeralda (transcripción)
  - 🔊 Sound Effects: Ámbar (energía sonora)
- **Sin tutifruti de colores**: Paleta cohesiva y profesional
- **Efectos bloom/orbit**: Animaciones elegantes durante reproducción de audio
- **Tags visuales mejorados**: Fondo translúcido y mejor legibilidad

#### 🎵 **Control de Audio Global Inteligente**
- **Un solo audio**: Sin ecos ni superposiciones
- **Play/Pause inteligente**: Clic en mismo botón pausa, diferente cambia
- **Efectos por pestaña**: Bloom específico según color de sección
- **Íconos dinámicos**: ▶️ ↔ ⏸️ según estado

#### 📱 **Layout TTS Optimizado**
- **Selector de voz minimalista**: 50% menos espacio, información esencial
- **Tags visuales**: Sistema mejorado sin errores React
- **Textarea optimizado**: Font monospace, gradiente sutil, mejor contraste
- **Sin scroll molesto**: Elementos principales siempre visibles

#### 🎤 **Speech to Speech Mejorado**
- **Upload de archivos**: Drag & Drop + selector de archivos
- **Formatos ElevenLabs**: Solo MP3, WAV, FLAC, OGG, WebM, M4A soportados
- **Interfaz unificada**: Sin redundancia de botones de micrófono
- **Estados inteligentes**: Grabación y upload mutuamente excluyentes

#### 📝 **Speech to Text Completamente Funcional**
- **Error 422 solucionado**: Modelo `scribe_v1` correcto, parámetro `file` en lugar de `audio`
- **Content-Type corregido**: FormData sin interferencia de application/json
- **Respuesta completa**: Idioma detectado, confianza, palabras, timestamps
- **Historial navegable**: Ver completo, copiar, usar en TTS

### 🔧 **CORRECCIONES TÉCNICAS**

#### 🧹 **Logs de Producción Limpiados**
- **Sin spam**: Eliminados logs verbosos de desarrollo
- **Solo errores críticos**: console.error preservado
- **Experiencia profesional**: Consola limpia en producción

#### ⚡ **Efectos Visuales Avanzados**
- **Progress bars**: En lugar de spinners grises aburridos
- **Animaciones CSS**: orbit-glow, bloom-pulse, red-recording-glow
- **Grabación elegante**: Efecto bloom rojo en lugar de parpadeo
- **Transiciones suaves**: Todos los elementos con animaciones fluidas

#### 🎯 **Funcionalidades Preservadas**
- **Todas las pestañas**: Biblioteca, TTS, STS, STT, Sound Effects
- **Token management**: Sistema completo operativo
- **Historial completo**: Con botones de acción en cada elemento
- **Configuraciones avanzadas**: Semilla, estilo, speaker boost para v3

### 📊 **ESTADÍSTICAS DE LA SESIÓN**
- **Commits realizados**: 25+ commits con mejoras específicas
- **Archivos modificados**: VoiceModelsSection.tsx, elevenLabsService.ts, aiModelsDbService.ts
- **Líneas agregadas**: 500+ líneas de mejoras
- **Funcionalidades nuevas**: Upload STS, STT completo, control audio global
- **Bugs corregidos**: Error 422 STT, JSX corrupto, logs spam

---

## 🚀 Versión 2.1.3 - AI Models Historial y Traducción Corregidos (Septiembre 2025)

### ✨ **CORRECCIONES CRÍTICAS AI MODELS**

#### 🎵 **Efectos de Sonido Completamente Funcionales**
- **Historial persistente**: Los efectos de sonido ahora se guardan y persisten al recargar la página
- **Tabla correcta**: Uso de `ai_sound_effects` para almacenamiento específico de efectos
- **Reproducción mejorada**: Audio se reproduce correctamente con logs detallados
- **Carga optimizada**: Historial se carga desde tabla específica con mapeo correcto

#### 🌐 **Traducción Automática Corregida**
- **Detección mejorada**: Algoritmo simplificado para detectar idioma de efectos de sonido
- **Traducción funcional**: "bebe llorando" → "crying baby" correctamente
- **Lógica conservadora**: Asume español por defecto, traduce a inglés para mejor calidad
- **Indicador visual**: Muestra "Activo" cuando auto-traducir está habilitado
- **Logs detallados**: Proceso completo de traducción visible en consola

#### 👥 **Acceso de Roles Corregido**
- **Productores**: Acceso directo a AI Models sin errores de permisos
- **Sin errores**: Eliminados intentos de acceso a Live Monitor para productores
- **Módulo por defecto**: `getFirstAvailableModule()` prioriza AI Models para productores

### 🔧 **MEJORAS TÉCNICAS**

#### 📊 **Sistema de Historial Robusto**
- **Carga paralela**: Audio y efectos se cargan simultáneamente
- **Mapeo correcto**: Datos de BD mapeados a interfaz correctamente
- **Recarga automática**: Historial se actualiza después de cada generación
- **Botones de recarga**: Disponibles en todos los historiales para debug

#### 🎯 **Traducción Inteligente**
- **Detección por palabras clave**: Lista específica de términos en inglés
- **Fallback español**: Si no detecta inglés, asume español y traduce
- **API MyMemory**: Traducción gratuita funcionando correctamente
- **Calidad mejorada**: Efectos en inglés generan mejor audio

#### 🗄️ **Base de Datos Verificada**
- **Tablas confirmadas**: `ai_audio_generations`, `ai_sound_effects`, `ai_user_preferences`, `ai_token_limits`
- **Estructura validada**: Conexión directa para verificar esquemas reales
- **Guardado correcto**: Efectos en tabla específica, audio en tabla general
- **Persistencia garantizada**: Datos se mantienen entre sesiones

### 🎨 **EXPERIENCIA DE USUARIO MEJORADA**
- **Flujo sin errores**: Productores acceden directamente a su módulo
- **Traducción transparente**: Proceso visible con logs informativos
- **Historial completo**: Todos los tipos de generación persisten correctamente
- **Reproducción confiable**: Audio se reproduce con fallbacks robustos

### 🧪 **CASOS DE PRUEBA VALIDADOS**
- ✅ **"bebe llorando"** → Traduce a "crying baby" → Audio correcto
- ✅ **"baby crying"** → Mantiene original → Audio correcto  
- ✅ **Recarga de página** → Historial persiste en todas las pestañas
- ✅ **Login productor** → Acceso directo a AI Models sin errores

---

## 🚀 Versión 2.1.2 - Live Monitor Mejorado con Sorting (Septiembre 2025)

### ✨ **MEJORAS DEL LIVE MONITOR**

#### 📊 **Presentación Profesional de Datos**
- **Llamadas finalizadas**: Cambiado de formato tarjetas a tabla profesional igual al historial
- **Llamadas fallidas**: Cambiado de formato tarjetas a tabla profesional con columnas organizadas
- **Consistencia visual**: Todas las pestañas ahora siguen el mismo patrón de presentación
- **Información estructurada**: Datos organizados en columnas claras y legibles

#### 🔄 **Sistema de Sorting Completo**
- **Componente SortableHeader**: Implementado con iconos de ordenamiento ascendente/descendente
- **Sorting en 3 pestañas**: Finalizadas, Fallidas y Todas las llamadas
- **Campos ordenables**: Cliente, Agente, Teléfono, Duración, Checkpoint, Fecha, Estado, Precio
- **Indicadores visuales**: Flechas que muestran la dirección del ordenamiento activo
- **Hover effects**: Columnas resaltadas al pasar el mouse

#### 📋 **Columnas Implementadas**

##### **Llamadas Finalizadas:**
- 👤 Cliente (avatar + nombre)
- 👨‍💼 Agente asignado
- 📞 Teléfono/WhatsApp
- ⏱️ Duración (formato MM:SS)
- ✅ Checkpoint actual
- 📅 Fecha de creación
- 🎯 Estado (Exitosa/No cerrada/Pendiente con iconos)

##### **Llamadas Fallidas:**
- 👤 Cliente (avatar + nombre)
- 👨‍💼 Agente asignado
- 📞 Teléfono/WhatsApp
- ❌ Estado de la llamada
- 📅 Fecha de creación
- ⚠️ Acciones ("Marcar perdida")

##### **Todas las Llamadas:**
- 👤 Cliente completo
- 📊 Estado actual
- ✅ Checkpoint del proceso
- ⏱️ Duración de llamada
- 💰 Precio del paquete
- 📅 Fecha de creación
- 📝 Estado de feedback

### 🔧 **MEJORAS TÉCNICAS**

#### ⚡ **Componente SortableHeader Reutilizable**
- **Lógica de ordenamiento**: Manejo automático de ascendente/descendente
- **Indicadores visuales**: SVG arrows con estados activo/inactivo
- **Hover effects**: Transiciones suaves en columnas
- **Accesibilidad**: Cursor pointer y feedback visual

#### 🎯 **Función sortData Inteligente**
- **Múltiples tipos de datos**: Texto, números, fechas
- **Mapeo de campos**: Switch case para diferentes propiedades
- **Ordenamiento estable**: Mantiene orden relativo en empates
- **Performance optimizada**: Sorting eficiente sin re-renders innecesarios

### 🎨 **EXPERIENCIA DE USUARIO MEJORADA**
- **Formato consistente**: Todas las pestañas siguen el patrón del historial
- **Información organizada**: Datos estructurados en columnas claras
- **Interactividad**: Click en columnas para ordenar, click en filas para detalles
- **Responsive design**: Scroll horizontal en pantallas pequeñas
- **Estados visuales**: Colores diferenciados por tipo de llamada

---

## 🚀 Versión 2.1.1 - Indicador de Tokens Mejorado (Septiembre 2025)

### ✨ **MEJORAS DE UX**

#### 🎯 **Indicador de Tokens Refinado**
- **Porcentaje removido**: Eliminado texto del centro del círculo para interfaz más limpia
- **Tokens restantes visibles**: Información al lado del rol del usuario con texto pequeño
- **Formato inteligente**: `• 7,500 tokens` para usuarios normales, `• ∞ tokens` para admins
- **Tooltip reposicionado**: Emergente hacia la derecha para evitar cortes en el borde
- **Flecha corregida**: Apunta correctamente al avatar desde la derecha

#### 🔧 **Mejoras Técnicas**
- **Callback implementado**: `onTokenInfoChange` para comunicación entre componentes
- **Cálculo automático**: Tokens restantes = límite - uso actual
- **Actualización en tiempo real**: Información sincronizada cada 30 segundos
- **Manejo de admins**: Tokens ilimitados correctamente mostrados como `∞`

### 🎨 **Experiencia Visual Mejorada**
- **Interfaz más limpia**: Solo círculo de progreso alrededor del avatar
- **Información contextual**: Tokens restantes siempre visibles para roles relevantes
- **Tooltip completo**: Información detallada sin cortes por posicionamiento
- **Consistencia visual**: Funciona perfectamente en ambos temas (Linear/Corporativo)

---

## 🚀 Versión 2.1.0 - AI Models Manager Completo (Septiembre 2025)

### ✨ **NUEVAS FUNCIONALIDADES PRINCIPALES**

#### 🤖 **AI Models Manager - Módulo Completo ElevenLabs**
- **Integración completa ElevenLabs API**: Acceso a todas las funcionalidades profesionales
- **5 pestañas especializadas**: Biblioteca de Voces, Text to Speech, Speech to Speech, Speech to Text, Efectos de Sonido
- **Biblioteca de voces avanzada**: 1000+ voces con filtros inteligentes por idioma, género, edad, caso de uso
- **Interfaz superior a ElevenLabs oficial**: Diseño más intuitivo y funcional que la app original

#### 🎤 **Text to Speech Profesional**
- **Soporte completo modelos**: eleven_v3, eleven_multilingual_v2, eleven_english_v2, eleven_turbo_v2_5
- **Configuración avanzada**: Estabilidad, Similarity, Style, Speaker Boost, Speech Rate
- **Tags ElevenLabs v3**: 50+ tags oficiales categorizados (emociones, estilos, efectos)
- **Inserción inteligente de tags**: Botones categorizados con preview
- **Historial completo**: Últimos 20 audios con descarga y reutilización

#### 🔄 **Speech to Speech Innovador**
- **Grabación en tiempo real**: Acceso a micrófono con MediaRecorder API
- **Modelos especializados**: eleven_multilingual_sts_v2, eleven_english_sts_v2
- **Configuración independiente**: Settings específicos para STS
- **Historial dedicado**: Gestión separada de conversiones de voz
- **Limpieza automática**: Audio anterior se borra al iniciar nueva grabación

#### 🎵 **Efectos de Sonido Creativos**
- **Generación por prompt**: Descripción en texto → efecto de sonido
- **Traducción automática**: Español → Inglés para mejor generación
- **Configuración de duración**: Control preciso de longitud del efecto
- **Historial especializado**: Últimos 20 efectos con reutilización

### 🔧 **SISTEMA DE GESTIÓN AVANZADO**

#### 👥 **Rol "Productor" Implementado**
- **Nuevo rol especializado**: Acceso controlado a funciones de IA
- **Permisos granulares**: Checkboxes por funcionalidad (TTS, STS, STT, SFX)
- **Acceso por defecto**: Biblioteca de voces y STT incluidos
- **Configuración flexible**: Admin puede habilitar funciones adicionales

#### 💰 **Sistema de Tokens Robusto**
- **Límites configurables**: Mensuales y diarios por usuario
- **Consumo en tiempo real**: Tracking automático de uso
- **Indicador visual**: Círculo de progreso alrededor del avatar
- **Admins ilimitados**: Sin restricciones para administradores
- **Verificación previa**: Validación antes de cada operación

#### 🗄️ **Almacenamiento Profesional**
- **Supabase Storage**: Bucket dedicado `ai_manager`
- **URLs públicas**: Acceso directo a archivos generados
- **Organización automática**: Carpetas por tipo de generación
- **Persistencia completa**: Historial conservado entre sesiones

### 🎨 **EXPERIENCIA DE USUARIO SUPERIOR**

#### 🎯 **Interfaz Intuitiva**
- **Diseño fluido**: Mejor que la app oficial de ElevenLabs
- **Filtros inteligentes**: Búsqueda por múltiples criterios
- **Reproducción integrada**: Play/pause sin salir de la interfaz
- **Botones de acción**: Descargar, reutilizar, reproducir en cada elemento

#### 🌓 **Compatibilidad Dual**
- **Temas completos**: Linear y Corporativo perfectamente soportados
- **Modo oscuro/claro**: Todos los componentes adaptados
- **Iconografía vectorial**: Sin emojis, solo iconos profesionales
- **Responsive design**: Funcional en todas las resoluciones

#### 📱 **Gestión de Preferencias**
- **Persistencia dual**: localStorage + base de datos
- **Sincronización cross-device**: Configuración disponible en cualquier dispositivo
- **Cache inteligente**: Carga rápida de preferencias frecuentes
- **Backup automático**: Configuración guardada en BD

### 🔧 **MEJORAS TÉCNICAS**

#### 🚀 **Performance Optimizada**
- **Carga paralela**: Múltiples APIs consultadas simultáneamente
- **Cache inteligente**: Voces y modelos cacheados localmente
- **Lazy loading**: Componentes cargados bajo demanda
- **Debouncing**: Búsquedas optimizadas sin spam de requests

#### 🔒 **Seguridad Robusta**
- **Service role**: Operaciones de BD con permisos elevados
- **RLS configurado**: Row Level Security en todas las tablas
- **Validación de tokens**: Verificación antes de cada operación
- **CORS configurado**: Reproducción de audio sin restricciones

#### 📊 **Base de Datos Especializada**
```sql
-- 5 nuevas tablas para AI Models
ai_user_preferences     -- Configuración de usuario
ai_audio_generations    -- Historial de generaciones
ai_sound_effects_history -- Efectos de sonido
ai_stt_history         -- Speech to text
ai_token_limits        -- Límites y uso de tokens
```

### 🛠️ **CORRECCIONES CRÍTICAS**

#### 🔧 **Speech to Speech Fixes**
- **Modelo correcto**: eleven_multilingual_sts_v2 (no eleven_v3)
- **Formato de audio**: WebM con codecs opus para compatibilidad
- **Configuración separada**: Settings independientes de TTS
- **Historial dedicado**: Gestión específica para STS

#### 🎵 **Reproducción de Audio**
- **CORS configurado**: `crossOrigin = 'anonymous'` para Supabase
- **Fallback inteligente**: Blob URL si falla la URL del bucket
- **Error handling**: Manejo robusto de errores de reproducción

#### 💾 **Persistencia de Datos**
- **Service role**: Bypass de RLS para operaciones backend
- **Mapeo correcto**: Preferencias UI ↔ columnas BD
- **Validación de tipos**: TypeScript estricto en todas las interfaces

### 🎯 **IMPACTO EN USUARIO**

#### 👨‍💼 **Para Productores**
- **Herramientas profesionales**: Acceso a tecnología de vanguardia
- **Flujo optimizado**: Más eficiente que usar ElevenLabs directamente
- **Control granular**: Configuración avanzada de cada parámetro
- **Historial completo**: Nunca perder trabajo anterior

#### 👨‍💻 **Para Administradores**
- **Control total**: Gestión de límites y permisos por usuario
- **Visibilidad completa**: Tracking de uso y consumo
- **Configuración flexible**: Habilitar/deshabilitar funciones por rol
- **Escalabilidad**: Sistema preparado para cientos de usuarios

---

## 🚀 Versión 2.0.5 - Live Monitor Optimizado + Transferencia Personalizada (Enero 2025)

### ✨ **NUEVAS FUNCIONALIDADES**

#### 📞 **Live Monitor - Detección Automática de Cambios de Estado**
- **Problema resuelto**: Cambios de llamada activa → finalizada no se detectaban automáticamente
- **Implementación**: Sistema de detección robusta de cambios de estado
- **Detección granular**: Identifica cambios específicos sin re-render innecesario
- **Indicadores visuales**: Punto verde cuando detecta cambios + logs informativos
- **Performance**: Comparación eficiente usando Maps para estados de llamadas

#### 🔄 **Refresh Manual sin Recarga de Página**
- **Botón de actualización**: Disponible en esquina superior derecha del Live Monitor
- **Actualización on-demand**: Permite refresh inmediato sin recargar página completa
- **Indicador visual**: Muestra "Actualizando..." durante el proceso
- **Accesibilidad**: Siempre visible para uso manual cuando sea necesario

#### 📝 **Transferencia con Texto Personalizado**
- **Campo personalizado**: Textarea para mensajes de transferencia personalizados
- **Sanitización robusta**: Solo permite letras y espacios para compatibilidad con API VAPI
- **Validación en tiempo real**: Límite de 200 caracteres con feedback visual
- **Modo dual**: Opciones predefinidas O texto personalizado
- **Seguridad JSON**: Previene ruptura de estructura JSON en API

### 🔧 **MEJORAS TÉCNICAS**

#### 🎯 **Detección Inteligente de Cambios**
```typescript
// Sistema de comparación de estados mejorado
const currentAllCalls = new Map();
const newAllCalls = new Map();
// Detecta: activa→finalizada, cambios checkpoint, nuevas llamadas
```

#### 🧹 **Sanitización de Texto para API VAPI**
```typescript
const sanitizeTransferText = (text: string): string => {
  return text
    .replace(/[^a-zA-Z\s]/g, '')  // Solo letras y espacios
    .replace(/\s+/g, ' ')        // Espacios normalizados
    .trim()                       // Trim automático
    .substring(0, 200);          // Límite de longitud
};
```

#### ⚡ **Optimizaciones de Performance**
- **Intervalo optimizado**: Refresh cada 3 segundos (más frecuente)
- **Actualización condicional**: Solo actualiza cuando hay cambios reales
- **Logs optimizados**: Eliminados logs excesivos, solo cambios importantes
- **Memoria eficiente**: Comparaciones rápidas sin recrear objetos

### 🐛 **CORRECCIONES**

#### 🔍 **Live Monitor - Detección de Cambios**
- **Antes**: Solo detectaba cambios de checkpoint, no cambios de estado
- **Después**: Detecta automáticamente activa → finalizada sin refresh manual
- **Resultado**: Experiencia fluida sin necesidad de recargar página

#### 📊 **Logs de Consola**
- **Antes**: Logs excesivos que saturaban la consola
- **Después**: Solo logs informativos de cambios importantes
- **Resultado**: Consola limpia y performance mejorada

### 🎯 **IMPACTO EN USUARIO**

#### 👥 **Para Supervisores**
- **Detección automática**: Ya no necesitan refrescar manualmente para ver llamadas finalizadas
- **Transferencia personalizada**: Mensajes específicos para cada situación
- **Feedback visual**: Saben cuándo el sistema detecta cambios
- **Control manual**: Botón de refresh disponible cuando sea necesario

#### 🔧 **Para Desarrolladores**
- **Código limpio**: Sanitización robusta previene errores en API
- **Performance optimizada**: Menos operaciones innecesarias
- **Logs útiles**: Información relevante sin spam
- **Mantenibilidad**: Código bien documentado y estructurado

---

## 🚀 Versión 2.0.4 - Paginación Inteligente + Refresh Optimizado (Enero 2025)

### ✨ **NUEVAS FUNCIONALIDADES**

#### 📊 **PQNC Humans - Paginación Automática Completa**
- **Problema resuelto**: Limitación de 1000 registros en Supabase superada
- **Implementación**: Sistema de paginación automática por lotes
- **Alcance**: Top 3K, 5K y TODOS ahora cargan registros reales
- **Optimización**: Top 1K sigue usando consulta directa (más eficiente)
- **Resultado**: Acceso completo a los 7762+ registros de la base de datos

#### 🔄 **Refresh Automático Inteligente**
- **Intervalo mejorado**: Cambiado de 90 segundos a 2 minutos
- **Estado conservado**: Filtros, página actual, búsquedas y ordenamiento se mantienen
- **Sincronización inteligente**: Solo busca registros nuevos, no recarga todo
- **UX mejorado**: Sin interrupciones en la experiencia del usuario
- **Logs informativos**: Estado conservado visible en consola

### 🔧 **MEJORAS TÉCNICAS**

#### 📦 **Sistema de Paginación Automática**
```typescript
// Función fetchAllRecords implementada
const fetchAllRecords = async (baseQuery) => {
  // Paginación automática por lotes de 1000
  // Acumula todos los registros hasta completar
}
```

#### 🎯 **Lógica Condicional Inteligente**
- **≥3000 registros**: Paginación automática + slice al límite solicitado
- **1000 registros**: Consulta directa optimizada
- **TODOS (999999)**: Paginación completa sin límites

#### 📋 **Logs de Progreso Detallados**
```
📦 Cargando lote 1 (registros 1-1000)
📦 Cargando lote 2 (registros 1001-2000)
📦 Cargando lote 3 (registros 2001-3000)
🗃️ Total de registros cargados desde BD: 3000

🔄 Sincronización en segundo plano (conservando filtros y página)
✅ Sincronización completada. Estado conservado: página 3, 2 filtros activos
```

### 🛠️ **CORRECCIONES**
- **Supabase límite hard**: Superado mediante paginación por lotes
- **Estado perdido en refresh**: Conservación completa de filtros y navegación
- **Performance mejorada**: Carga progresiva con feedback visual

---

## ⚡ Versión 2.0.3 - Optimización Performance + Fixes Críticos (Enero 2025)

### 🚨 **PROBLEMAS CRÍTICOS IDENTIFICADOS Y CORREGIDOS**

#### 🔧 **Crisis de Configuración Supabase**
- **Problema**: Cambios en storage keys rompieron sesiones existentes
- **Causa**: Modificación de `pqnc-supabase-auth` → `pqnc-main-auth-2024`
- **Impacto**: Login bloqueado, aplicación inaccesible
- **Solución**: Rollback a configuración original estable
- **Lección**: NO cambiar storage keys en producción

#### 🚀 **Performance Crítico - URLs Masivas**
- **Problema**: URLs de 50KB+ causaban `net::ERR_FAILED`
- **Causa**: Consultas con 1000+ IDs en feedback/bookmarks
- **Impacto**: Errores de red, funcionalidad rota
- **Solución**: Límite 50 IDs por consulta, carga progresiva
- **Resultado**: LCP mejorado 2.7s → 1.36s (49% mejor)

#### 🗄️ **Errores de Estructura de Base de Datos**
- **Problema**: Consultas a columnas inexistentes (`color_palette`)
- **Causa**: Desconocimiento de estructura real de BD
- **Impacto**: Error 400 en app_themes, bloqueo de inicialización
- **Solución**: Mapeo correcto a `theme_config`
- **Lección**: Verificar estructura real antes de consultar

#### 📊 **Filtros Simplificados para Escalabilidad**
- **Problema**: Filtros complejos no escalaban a millones de registros
- **Causa**: Validaciones restrictivas, límites artificiales
- **Impacto**: Performance pobre, restricciones innecesarias
- **Solución**: Tops 1K/3K/5K/TODOS, 100 registros/página
- **Resultado**: Preparado para millones de registros

### ✅ **FUNCIONALIDADES AGREGADAS**

#### 🔓 **Mejoras de UX**
- **Linear Mode**: Botón de logout agregado
- **Login**: Funcionalidad "recordar mi cuenta" implementada
- **Filtros**: Fecha opcional sin restricciones en filtros avanzados

---

## 🔧 Versión 2.0.2 - Fixes Críticos Filtros PQNC (Enero 2025)

### 🚨 **BUGS CRÍTICOS CORREGIDOS**

#### 🔍 **Filtros PQNC Humans - Fixes Críticos**
- **useEffect dependencies**: Agregado `ponderacionConfig` a dependencias
- **Filtro call_result**: Mejorado para manejar variaciones (exacta + parcial)
- **Valores null/undefined**: Validación agregada en agentFilter, organizationFilter, etc.
- **Debug system**: Logs detallados para troubleshooting de filtros
- **Búsqueda inteligente**: Logs específicos para ventas concretadas

#### 🔧 **Mejoras de Diagnóstico**
- **Logs de inicio**: Total de registros y filtros activos
- **Logs por filtro**: Antes/después del filtrado
- **Warning de 0 resultados**: Con valores únicos de BD
- **Logs de ventas**: Específicos para call_result matching

#### 📊 **Proyecto Clever Ideas**
- **Separación completa**: Proyecto independiente creado
- **Solo 2 módulos**: Agent Studio + Análisis AI
- **Sin conexión git**: Directorio independiente
- **Puerto 3000**: Para evitar conflictos

---

## 🔍 Versión 2.0.1 - Debug y Optimizaciones (Enero 2025)

### 🛠️ **MEJORAS Y CORRECCIONES**

#### 🔍 **Sistema de Debug Avanzado**
- **Logs detallados** en Live Monitor para troubleshooting
- **Debug de clasificación** de llamadas activas/finalizadas/fallidas
- **Logs de servicio** para identificar problemas de conexión BD
- **Información específica** de call_status y checkpoint por llamada

#### 👤 **Avatar Real del Usuario**
- **useUserProfile hook** integrado en Academia
- **Avatar real** del usuario logueado en perfil y ranking
- **Fallback elegante** a generador automático si no hay foto
- **Consistencia visual** entre todas las vistas

#### 🎨 **Iconografía Modernizada**
- **Lucide React** completamente integrado
- **16+ emojis reemplazados** por iconos vectoriales profesionales
- **Escalabilidad perfecta** en todos los tamaños
- **Tema consistency** en ambas UIs

#### 🔧 **Fixes Técnicos**
- **Navegación Academia** completamente funcional
- **Animaciones persistentes** (no desaparecen tras completarse)
- **Modo oscuro perfecto** en todos los componentes
- **Datos mock realistas** para testing sin BD

---

## 🚀 Versión 2.0.0 - Academia de Ventas Gamificada (Enero 2025)

### ✨ **NUEVAS FUNCIONALIDADES PRINCIPALES**

#### 🎓 **Academia de Ventas - Sistema Gamificado Completo**
- Sistema tipo Duolingo para entrenamiento de vendedores
- 3 Niveles progresivos: Fundamentos, Técnicas de Conexión, Presentación de Beneficios
- 4 Tipos de actividades: Llamadas virtuales, Quiz, Juegos, Repaso
- Integración VAPI: Llamadas virtuales con asistentes de IA reales
- Sistema XP/Logros: Puntos de experiencia y badges desbloqueables
- Ranking competitivo: Leaderboard con podio 3D animado
- Panel administrativo: Gestión de asistentes virtuales y niveles

#### 🎨 **Sistema Dual de UIs**
- UI Corporativa Homologada: Diseño actual mejorado con efectos elegantes
- UI Linear Design: Diseño completamente nuevo estilo Linear.app
- Intercambio dinámico: Desde Admin → Preferencias → Temas
- Compatibilidad completa: Todas las funcionalidades en ambas UIs

#### 🎮 **Gamificación Avanzada**
- 10+ animaciones CSS: levelUp, xpGain, achievementUnlock, streakFire, etc.
- Efectos visuales: Shimmer, glow, particle effects, floating cards
- Sistema de racha: Motivación para uso diario
- Progreso visual: Barras animadas con efectos pulse y glow
- Badges animados: Desbloqueo con rotación y escala

### 🔧 **MEJORAS TÉCNICAS**

#### ⚙️ **Arquitectura y Servicios**
- Vapi Web SDK: Integración completa para llamadas virtuales
- academiaService.ts: 15+ métodos especializados para gamificación
- Namespace imports: Solución robusta para imports mixtos
- useUserProfile: Hook para avatares reales del usuario

#### 📊 **Base de Datos**
- 8 nuevas tablas para Academia
- Scripts SQL para setup automático
- Sistema de progreso y logros robusto

### 🛠️ **CORRECCIONES Y FIXES**
- Importaciones ES6: Conflictos solucionados
- Modo oscuro: Fondos corregidos en todos los componentes
- Animaciones: Persistencia corregida
- Navegación: Entre pestañas completamente funcional
- Avatar consistency: Usuario real en perfil y ranking

---

## 🔄 Versión 1.0.16 - Kanban y UIs Duales (Diciembre 2024)

### ✨ **Funcionalidades Agregadas**
- Live Monitor Kanban con 5 checkpoints
- Sistema dual de UIs (Corporativa + Linear)
- Feedback obligatorio para llamadas
- Controles de transferencia y colgar
- Homologación de colores corporativos

---

*Última actualización: Enero 2025*