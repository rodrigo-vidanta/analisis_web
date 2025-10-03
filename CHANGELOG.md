# 📋 Control de Cambios - PQNC AI Platform

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