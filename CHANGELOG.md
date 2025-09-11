# 📋 CHANGELOG - PQNC QA AI Platform

## Historial de Versiones

### v1.0.15 (2025-01-25 01:30)
**Tipo**: major
**Descripción**: Reestructuración Completa del Live Monitor - Pipeline y Modales Optimizados

**🎯 Pipeline Inteligente:**
- Filtrado automático: Solo llamadas activas y finalizadas sin feedback
- Llamadas al 60% parpadean suavemente (animate-bounce)
- Llamadas al 80% parpadean intensamente + pitido cada 3 segundos
- Llamadas finalizadas en color grisáceo hasta completar feedback
- Detección automática de estado basada en duración + grabación

**📱 Modales Completamente Rediseñados:**
- **Llamadas Activas**: Vista contextual con perfil, discovery de viaje, audio en tiempo real
- **Llamadas Finalizadas**: Reproductor de audio sin descarga + botones de feedback
- Cierre automático al hacer clic fuera del modal
- Información nutricional completa desde tablas prospectos + llamadas_ventas

**🎵 Audio Mejorado:**
- Buffer grande priorizando calidad sobre sincronización
- Detención automática al cerrar modal o hacer clic en "dejar de escuchar"
- Eliminado ecualizador no funcional y features experimentales

**🧹 Código Limpio:**
- Eliminados todos los logs de debugging
- Removidas funciones no utilizadas (Tone.js, AudioConfigPanel)
- Estructura modular con componentes separados por tipo de llamada
- Código 2000+ líneas más corto y mantenible

**🔄 Lógica de Feedback Actualizada:**
- Llamadas desaparecen del pipeline solo después de feedback completado
- Feedback obligatorio: "Contestada" / "Perdida" para llamadas finalizadas
- Actualización automática de observaciones en base de datos

### v1.0.14 (2025-01-24 23:45)
**Tipo**: major
**Descripción**: Reorganización Completa con Sidebar y Módulo Live Monitor Funcional

**🏗️ Transformación Arquitectónica:**
- Sidebar colapsable profesional con navegación lateral
- Header simplificado (usuario, logout, tema)
- Footer fijo siempre visible
- Responsividad completa desktop/móvil

**🔐 Sistema de Permisos Granular:**
- Módulos independientes: Natalia IA, PQNC Humans, Live Monitor
- Rol Vendedor nuevo con permisos específicos
- Evaluadores personalizables via checkboxes funcionales
- Gestión dinámica desde interfaz admin

**📺 Live Monitor Completo (NUEVO):**
- Monitor de llamadas en tiempo real para vendedores
- Pipeline visual con checkpoints y progreso animado
- Sistema de intervención con susurro a la IA
- Feedback obligatorio con rotación consecutiva de agentes
- Controles avanzados: escuchar, intervenir, colgar, resultado

**⚡ Optimizaciones de Rendimiento:**
- 12 índices de BD para 1.5M registros
- Filtros de fecha optimizados (30 días default, máximo 3 meses)
- Skeleton Loading (CLS mejorado 0.62 → 0.1)
- Tema automático del sistema operativo

**📚 Documentación:**
- `docs/PERMISSIONS_SYSTEM_README.md` - Sistema de permisos detallado
- `docs/COMPONENT_DEPENDENCIES.md` - Mapa de dependencias
- Scripts de BD organizados y optimizados
- Limpieza completa de archivos temporales

### v1.0.6 (2025-01-24 23:30)
**Tipo**: major
**Descripción**: Módulo de Plantillas Completamente Rediseñado - CORRECCIONES APLICADAS

**🎨 Nuevo Gestor de Plantillas:**
- TemplateManager: Interfaz moderna con navegación por tabs
- Catálogo de plantillas con filtros por categoría y búsqueda
- Diseño homologado con glass-cards y gradientes
- Importación de plantillas desde JSON
- Creación de nuevas plantillas personalizadas

**💬 Editor de Prompts Avanzado:**
- Navegación por categorías (Identidad, Flujo, Restricciones, Comunicación, Protección)
- Formulario completo para crear/editar prompts
- Variables dinámicas con sintaxis {{variable}}
- Sistema de prompts requeridos vs editables
- Duplicación y eliminación de prompts

**🔧 Editor de Herramientas Completo:**
- Gestión por categorías (Comunicación, Datos, Negocio, APIs)
- Tipos de herramientas: Función, Transferir, Finalizar
- Configuración de mensajes y ejemplos de uso
- Herramientas asíncronas y configuración de complejidad
- Compatibilidad con categorías de agentes

**🎯 Características Técnicas:**
- Diseño completamente homologado con admin/squads/análisis
- Componentes modulares y reutilizables
- Formularios con validación y estados
- Navegación intuitiva con iconos SVG
- Responsive design para todos los dispositivos

**📋 Base de Datos:**
- Estructura existente compatible
- Catálogos de prompts y herramientas
- Relaciones agentes-prompts-tools
- Sistema de versionado y metadatos

**🔧 CORRECCIONES APLICADAS:**
- ✅ Iconos obsoletos reemplazados por iconos SVG modernos
- ✅ Botón de recargar corregido para modo claro y oscuro (ReloadButton.tsx)
- ✅ Hover de pestañas corregido en modo oscuro
- ✅ UI de prompts mejorada con diseño funcional y navegación por categorías
- ✅ Sección de herramientas rediseñada con iconos SVG y mejor organización
- ✅ Editor de parámetros mejorado con diseño homologado (ParametersEditorImproved.tsx)
- ✅ Visualizador JSON mejorado con sintaxis highlighting y modo oscuro (JsonViewer.tsx)
- ✅ Contadores de plantillas funcionan como botones de filtro
- ✅ Diseño completamente homologado con admin/squads/análisis
- ✅ Formularios con fondos glass-card y colores consistentes
- ✅ Navegación intuitiva con iconos SVG descriptivos

---

### Unreleased (dev)
Tipo: improvements
Descripción: Importador Vapi homologado, Tools mejoradas, Parámetros en pestañas, groundwork para "Mis agentes/Tools".

- Import Vapi: mapea squad/members, tools (function/endCall), assistantDestinations → transferCall. Prompts por miembro quedan etiquetados en `system_prompts.context_tags` (`member:<nombre>`). Tools guardan su schema, server y async en `tools_catalog.config`; relación `agent_tools.custom_config` conserva el objeto original + `member` cuando aplique.
- Tools UI: cards con server/parameters; "endCall" forzada y bloqueada; creación de tools y filtro "Mis herramientas" por `config.metadata.created_by`.
- Parámetros: rediseño con tabs verticales (Identidad, Modelo, Voz, Transcripción, Comportamiento, Llamada). El mensaje de endCall se edita en Parámetros > Llamada.
- Editor footer: "Guardar como borrador" crea/actualiza agente del usuario sin tocar plantilla base; "Generar agente" crea nueva plantilla publicada.
- DB: sin cambios de esquema requeridos. Se recomienda usar `created_by` ya presente en `agent_templates` y `config.metadata.created_by` para tools; asociación por miembro via `context_tags`/`custom_config.member`.

### v1.0.5 (2025-01-24 22:30)
**Tipo**: minor
**Descripción**: Animación de Login Perfecta - Túnel de Anillos Concéntricos

**🎨 Animación de Login:**
- Túnel de anillos concéntricos con colores vibrantes
- Fade-in degradado de afuera hacia adentro
- Sincronización perfecta de todos los elementos
- Sin elementos residuales ni tiempo muerto

**⚡ Características Técnicas:**
- 6 anillos concéntricos con delays escalonados
- Colores: Azul, Púrpura, Cian, Verde, Naranja, Rojo
- Duración total: 2.2 segundos
- Fadeout sincronizado con último anillo

**🎯 Optimizaciones:**
- Sin círculo negro central innecesario
- Fondo degradado sincronizado
- Transición completamente fluida
- Experiencia más elegante y minimalista

---

### v1.0.4 (2025-09-05 21:54)
**Descripción**: Corrección de versionado: 1.0.3 + Sistema automático de versiones

### v1.0.3 (2025-01-24 16:15)
**Tipo**: minor
**Descripción**: Reproductor de Audio + Footer + Sistema de Versionado

**🎵 Nuevas Funcionalidades:**
- Reproductor de audio integrado con API Railway
- Footer minimalista con versión dinámica
- Sistema de versionado automático

**🔧 Mejoras Técnicas:**
- API de Google Cloud Storage integrada
- Consultas SELECT optimizadas con campos de audio
- Logs de debugging eliminados por seguridad

**🎨 Diseño:**
- Reproductor minimalista con paleta blue/slate
- Footer elegante con iconos React + Vite
- Controles de audio rediseñados

---

### v1.0.2 (2025-01-24 14:30)
**Tipo**: major
**Descripción**: Visualización Completa de Datos JSONB + Mejoras UX

**📊 Funcionalidades:**
- UniversalDataView para todos los campos JSONB
- Sistema de bookmarks con 5 colores
- Sorting de columnas en tabla de llamadas
- Formato de fecha/hora mejorado

**🗄️ Base de Datos:**
- Acceso completo a 8 campos JSONB
- Secciones colapsables con highlights
- Manejo inteligente de valores null

---

### v1.0.1 (2025-01-24 12:00)
**Tipo**: major  
**Descripción**: Sistema de Retroalimentación Completo

**💬 Funcionalidades:**
- Modal de retroalimentación con validación
- Botón "Retro" en tabla de llamadas
- Tooltips de preview
- Historial de cambios automático

**🗄️ Base de Datos:**
- Tabla call_feedback con foreign keys
- Sistema de historial completo
- RLS y políticas de seguridad

---

### v1.0.0 (2025-01-24 10:00)
**Tipo**: initial
**Descripción**: Versión inicial - Nightly Release

**🚀 Funcionalidades Base:**
- Dashboard de análisis PQNC
- Sistema de autenticación
- Análisis detallado de llamadas
- Filtros y búsqueda avanzada
- Tema claro/oscuro

**🏗️ Arquitectura:**
- React + TypeScript + Vite
- Supabase backend
- Tailwind CSS
- Zustand state management
