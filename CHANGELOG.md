# 📋 CHANGELOG - PQNC QA AI Platform

## Historial de Versiones

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
