# 📋 CHANGELOG - MÓDULO PQNC HUMANS

## 🏗️ REGLAS DE ORO PARA DESARROLLADORES

**⚠️ IMPORTANTE:** Antes de realizar cualquier cambio en el módulo PQNC Humans, consulta:

### **1. 📚 Documentación Técnica**
Para cualquier duda consultar el archivo README: `src/components/admin/README_PQNC_HUMANS.md` para información técnica completa del módulo y sus funciones.

### **2. 📝 Documentación de Cambios**
Cualquier cambio realizado en cualquier archivo del módulo se debe documentar en el archivo README: `src/components/admin/README_PQNC_HUMANS.md`

### **3. 📋 Verificación de Cambios**
Cualquier ajuste se debe verificar en este CHANGELOG para ver si no se realizó antes. En caso de que sea nuevo, debe documentarse correctamente aquí.

---

## 📅 HISTORIAL DE CAMBIOS

### **v5.7.0** - Octubre 2025
**Estado:** ✅ Producción

#### **🚀 Sistema de Permisos Granular Completo**
- **Permisos híbridos:** Sistema localStorage + funciones RPC para configuración dinámica
- **Roles especializados:** Vendedor con acceso específico a PQNC + Live Monitor
- **Evaluadores personalizables:** Permisos individuales vía checkboxes funcionales
- **Gestión dinámica:** Configuración desde interfaz administrativa

#### **🔧 Funcionalidades Mejoradas**
- **Gestión de usuarios avanzada** con búsqueda y filtros mejorados
- **Editor de agentes completo** con todas las funcionalidades integradas
- **Gestión de tokens API** con límites mensuales y monitoreo en tiempo real
- **Configuración del sistema** completamente funcional

#### **🎨 Diseño PQNC Humans**
- **Contenedor ancho autoajustable** cuando se usa desde dashboard de análisis
- **Modal de transcripción ampliado** a `max-w-6xl`
- **Vista detallada mejorada** con `max-w-[96rem]` y `max-h-[92vh]`

#### **📊 Paginación Automática**
- **Sistema de paginación automática** por lotes para superar límite de 1000 registros
- **Manejo eficiente** de grandes conjuntos de datos
- **Expansión automática** de secciones críticas

#### **🏗️ Arquitectura Técnica**
- **Base de datos:** `hmmfuhqgvsehkizlfzga.supabase.co` (PQNC Principal)
- **Tablas principales:** `auth_users`, `auth_roles`, `auth_user_permissions`, `agent_templates`
- **Servicios especializados:** Autenticación, permisos, agentes, tokens
- **Integración completa** con otros módulos del sistema

---

### **v5.6.0** - Septiembre 2025
**Estado:** ✅ Producción

#### **🔐 Seguridad Mejorada**
- **Sistema de permisos granular** completamente funcional
- **Validación estricta** de accesos por módulo y sub-módulo
- **Auditoría de cambios** en operaciones críticas
- **Gestión segura** de tokens API con límites

#### **👥 Gestión de Usuarios Avanzada**
- **CRUD completo** con interfaz intuitiva
- **Asignación dinámica** de roles y permisos
- **Búsqueda avanzada** con múltiples filtros
- **Gestión de avatares** con almacenamiento optimizado

---

### **v5.5.0** - Agosto 2025
**Estado:** ✅ Producción

#### **🤖 Editor de Agentes Profesional**
- **Interfaz completa** para creación y edición de agentes
- **Editor de prompts** del sistema con validación
- **Selector de herramientas** categorizado
- **Editor de parámetros** personalizables
- **Vista JSON** para configuración avanzada

#### **🎫 Gestión de Tokens API**
- **Generación automática** de tokens seguros
- **Límites mensuales** configurables por usuario
- **Monitoreo en tiempo real** de uso
- **Revocación inmediata** de tokens comprometidos

---

### **v5.4.0** - Julio 2025
**Estado:** ✅ Producción

#### **⚙️ Configuración del Sistema**
- **Preferencias globales** personalizables
- **Mensajes del sistema** editables
- **Configuraciones por módulo** independientes
- **Persistencia automática** de cambios

#### **📋 Gestión de Plantillas**
- **Catálogo organizado** por categorías
- **Búsqueda inteligente** por nombre y descripción
- **Gestión de versiones** de plantillas
- **Compartir público/privado** de agentes

---

### **v5.3.0** - Junio 2025
**Estado:** ✅ Producción

#### **🏗️ Infraestructura Base**
- **Arquitectura inicial** del módulo de administración
- **Gestión básica de usuarios** implementada
- **Sistema de roles** básico configurado
- **Integración inicial** con base de datos

---

## 📋 REGLAS DE DOCUMENTACIÓN

### **🎯 Formato de Entradas**
Cada entrada del changelog debe incluir:
- **Versión** con estado (✅ Producción / ⚠️ Desarrollo / ❌ Obsoleto)
- **Fecha** del cambio
- **Categorías** de cambios (🚀 Funcionalidades / 🔧 Mejoras / 🐛 Correcciones / 📚 Documentación)
- **Descripción detallada** del cambio realizado

### **📝 Proceso de Documentación**
1. **Antes de cambiar:** Verificar este changelog y el README
2. **Durante el cambio:** Mantener comentarios claros en el código
3. **Después del cambio:** Documentar aquí y actualizar README si es necesario
4. **Validación:** Otro desarrollador debe revisar los cambios

---

## 🔍 BÚSQUEDA RÁPIDA

### **Por Versión**
- [v5.7.0](#v570---octubre-2025) - Versión actual con permisos granulares
- [v5.6.0](#v560---septiembre-2025) - Seguridad y gestión de usuarios mejorada
- [v5.5.0](#v550---agosto-2025) - Editor de agentes profesional
- [v5.4.0](#v540---julio-2025) - Configuración del sistema completa
- [v5.3.0](#v530---junio-2025) - Infraestructura base establecida

### **Por Categoría**
- **Funcionalidades:** 🚀 (Características principales)
- **Mejoras:** 🔧 (Optimizaciones y mejoras)
- **Correcciones:** 🐛 (Bug fixes)
- **Documentación:** 📚 (Cambios en documentación)

---

## ⚠️ NOTAS IMPORTANTES

- **Siempre verificar** cambios anteriores antes de implementar nuevos
- **Documentar completamente** cualquier modificación realizada
- **Mantener consistencia** con el formato establecido
- **Actualizar README** cuando cambios afecten funcionalidad pública

---

**Última actualización:** Octubre 2025
**Versión actual:** v5.7.0
**Estado:** ✅ Producción estable
