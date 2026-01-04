# 📋 CHANGELOG - MÓDULO PROSPECTOS

## 🏗️ REGLAS DE ORO PARA DESARROLLADORES

**⚠️ IMPORTANTE:** Antes de realizar cualquier cambio en el módulo Prospectos, consulta:

### **1. 📚 Documentación Técnica**
Para cualquier duda consultar el archivo README: `src/components/prospectos/README_PROSPECTOS.md` para información técnica completa del módulo y sus funciones.

### **2. 📝 Documentación de Cambios**
Cualquier cambio realizado en cualquier archivo del módulo se debe documentar en el archivo README: `src/components/prospectos/README_PROSPECTOS.md`

### **3. 📋 Verificación de Cambios**
Cualquier ajuste se debe verificar en este CHANGELOG para ver si no se realizó antes. En caso de que sea nuevo, debe documentarse correctamente aquí.

---

## 📅 HISTORIAL DE CAMBIOS

### **v5.20.0** - Enero 2025
**Estado:** ✅ Producción

#### **⚡ Infinite Scrolling en DataGrid - Carga por Batches**
- **Problema resuelto:** DataGrid solo mostraba 1000 de 1167 prospectos debido a limitación de Supabase (máximo 1000 registros por query)
- **Solución implementada:**
  - **Carga por batches:** Implementado infinite scrolling con batches de 200 prospectos usando `.range()` de Supabase
  - **IntersectionObserver:** Detecta cuando el usuario hace scroll cerca del final (200px antes) y carga automáticamente el siguiente batch
  - **Indicadores visuales:** Muestra "Cargando más prospectos..." mientras carga y contador de prospectos cargados/totales
  - **Gestión de estado:** Mantiene `currentPage`, `hasMore`, y `loadingMore` para controlar la paginación
- **Resultado:** Ahora carga todos los prospectos disponibles (1167+) sin saturar el navegador
- **Archivos modificados:**
  - `src/components/prospectos/ProspectosManager.tsx` - Infinite scrolling con batches, IntersectionObserver, indicadores de carga
- **Mejoras técnicas:**
  - Batch size: 200 prospectos por carga
  - Scroll threshold: 200px antes del final
  - Contador dinámico: muestra "X de Y prospectos cargados"
  - Contenedor con scroll vertical para activar IntersectionObserver

---

### **v5.19.0** - Enero 2025
**Estado:** ✅ Producción

#### **🐛 Corrección Crítica - Loop Infinito ERR_INSUFFICIENT_RESOURCES en DataGrid**
- **Problema resuelto:** Más de 1900 requests simultáneas a `auth_users` con `backup_id` y `has_backup` causando `ERR_INSUFFICIENT_RESOURCES` al abrir el módulo de Prospectos en vista DataGrid
- **Causa raíz:** `backupService.getBackupEjecutivoInfo()` hacía consultas sin caché. Al renderizar `BackupBadgeWrapper` para cada prospecto en el DataGrid, se generaban múltiples consultas al mismo usuario
- **Solución implementada:**
  - `backupService.getBackupEjecutivoInfo()` ahora usa el caché público de `permissionsService.backupCache`
  - TTL de 30 segundos (mismo que `permissionsService`)
  - Reducción de queries de 1900+ → 1-2 requests (solo ejecutivos únicos)
- **Archivos modificados:**
  - `src/services/backupService.ts` - Implementado caché usando `permissionsService.backupCache`
- **Resultado:** DataGrid carga correctamente sin saturar el navegador

---

### **v5.18.0** - Enero 2025
**Estado:** ✅ Producción

#### **🎨 Nuevas Columnas en Kanban y Sistema de Filtrado**
- **Nuevas columnas añadidas:**
  - **"Con ejecutivo"**: Columna añadida después de "Atendió llamada" (checkpoint #5)
  - **"Certificado adquirido"**: Columna añadida al final del Kanban (checkpoint #6)
- **Sistema de filtrado de columnas:**
  - Dropdown con checkboxes para mostrar/ocultar columnas individuales
  - Persistencia de preferencias en localStorage por usuario
  - Indicador visual con contador de columnas ocultas
  - Botón "Mostrar todas" para restaurar todas las columnas
- **Optimizaciones de rendimiento:**
  - `CHECKPOINT_KEYS` movido fuera del componente como constante
  - Ref para evitar cargas múltiples de mensajes
  - Comparación de IDs antes de recargar datos
- **Colores de nuevas etapas:**
  - **Con ejecutivo**: Color indigo (`bg-indigo-500`)
  - **Certificado adquirido**: Color rose (`bg-rose-500`)
- **Archivos modificados:**
  - `src/components/prospectos/ProspectosKanban.tsx` - Nuevas columnas, sistema de filtrado, optimizaciones
  - `src/components/prospectos/ProspectosManager.tsx` - UI de filtrado, manejo de columnas ocultas
  - `src/services/prospectsViewPreferencesService.ts` - Soporte para `hiddenColumns`

#### **🐛 Corrección de Loop Infinito - ERR_INSUFFICIENT_RESOURCES**
- **Problema resuelto:** Múltiples queries a `auth_users` con `backup_id` y `has_backup` causando saturación
- **Solución implementada:**
  - `authService.ts` ahora usa caché de `permissionsService` en lugar de queries directas
  - `backupCache` en `permissionsService` hecho público para acceso compartido
  - Eliminadas queries redundantes en login de ejecutivos
- **Archivos modificados:**
  - `src/services/authService.ts` - Uso de caché compartido
  - `src/services/permissionsService.ts` - `backupCache` público

---

### **v5.17.0** - Enero 2025
**Estado:** ✅ Producción

#### **⚡ Optimización Crítica - ERR_INSUFFICIENT_RESOURCES**
- **Problema resuelto:** Más de 2000 errores `ERR_INSUFFICIENT_RESOURCES` al entrar al módulo de prospectos causados por múltiples requests simultáneas a `auth_users` para verificar datos de backup
- **Solución implementada:**
  - **Pre-carga batch de datos de backup:** Nueva función `preloadBackupData()` en `permissionsService` que carga todos los datos de backup en una sola query batch antes de verificar permisos
  - **Eliminación de consultas individuales:** `canUserAccessProspect` ahora solo usa caché, evitando consultas individuales que causaban saturación del navegador
  - **Procesamiento en batches:** Verificaciones de permisos procesadas en batches de 50 prospectos para reducir carga simultánea
  - **Optimización de consulta de ejecutivos:** Nueva función `getEjecutivosWhereIsBackup()` con caché para evitar consultas repetidas
  - **Protección contra ejecuciones simultáneas:** Flags `isLoadingProspectosRef` y `isLoadingBackupBatch` previenen múltiples ejecuciones simultáneas
- **Resultado:** De 2000+ requests simultáneas → 1-2 requests batch
- **Archivos modificados:**
  - `src/services/permissionsService.ts` - Pre-carga batch, eliminación consultas individuales
  - `src/components/prospectos/ProspectosManager.tsx` - Pre-carga antes de verificaciones, procesamiento en batches

---

### **v5.16.0** - Diciembre 2025
**Estado:** ✅ Producción

#### **📊 Eliminación de Paginación - Carga Completa de Prospectos**
- **Problema resuelto:** Vista limitada a 50 de 57 prospectos sin botón para avanzar de página
- **Solución implementada:**
  - Eliminada paginación limitada - ahora carga TODOS los prospectos de una vez
  - Eliminado `BATCH_SIZE` constante y toda la lógica de paginación
  - Infinite scroll deshabilitado (ya no es necesario cargar por lotes)
  - Filtrado y ordenamiento se aplican en memoria después de cargar todos los datos
  - `totalCount` ahora refleja el total de prospectos filtrados, no solo los cargados
- **Aplicado en:** Vista Kanban y DataGrid
- **Archivos modificados:**
  - `src/components/prospectos/ProspectosManager.tsx` - Eliminada paginación, carga completa
  - `src/components/prospectos/ProspectosKanban.tsx` - Eliminado IntersectionObserver y sentinel elements

#### **🔧 Cambios Técnicos**
- **Consulta Supabase:** Eliminado `.range(from, to)` - ahora carga todos los registros
- **Estados eliminados:** `currentPage`, `hasMore`, `loadingMore`, `BATCH_SIZE`
- **Funciones eliminadas:** `loadMoreProspectos()`, `loadMoreProspectosForColumn()`
- **UI limpiada:** Eliminados elementos de "Cargando más prospectos..." en ambas vistas

---

### **v5.15.0** - Enero 2025
**Estado:** ✅ Producción

#### **🎨 Vista Kanban Mejorada con Nuevos Estados**
- **Vista Kanban por defecto**: Cambiada la vista predeterminada de DataGrid a Kanban
- **Nuevos estados añadidos**: "Es miembro" y "Activo PQNC" agregados al principio del kanban
- **Estados colapsados por defecto**: Los dos nuevos estados aparecen colapsados automáticamente
- **Columnas más delgadas**: Ancho de columnas colapsadas reducido de 80px a 60px para mejor uso del espacio
- **Colores consistentes**: Mismos colores de etapas en Kanban y DataGrid para consistencia visual

#### **🎨 Colores de Estados**
- **Es miembro**: Color esmeralda (emerald) - `bg-emerald-100 text-emerald-800`
- **Activo PQNC**: Color teal (verde azulado) - `bg-teal-100 text-teal-800`
- **Validando membresia**: Color azul - `bg-blue-100 text-blue-800`
- **En seguimiento**: Color amarillo - `bg-yellow-100 text-yellow-800`
- **Interesado**: Color verde - `bg-green-100 text-green-800`
- **Atendió llamada**: Color morado - `bg-purple-100 text-purple-800`

#### **🔧 Funcionalidades Implementadas**
- **Mapeo de etapas mejorado**: Sistema actualizado para reconocer los nuevos estados desde la base de datos
- **Preferencias persistentes**: Los estados colapsados se guardan en localStorage por usuario
- **Vista por defecto**: Kanban ahora es la vista inicial al entrar al módulo

#### **📝 Archivos Modificados**
- `src/components/prospectos/ProspectosKanban.tsx` - Añadidos nuevos estados y ajustado ancho de columnas
- `src/components/prospectos/ProspectosManager.tsx` - Vista por defecto cambiada a Kanban, función getStatusColor actualizada
- `src/services/prospectsViewPreferencesService.ts` - Preferencias por defecto actualizadas

---

### **v5.14.0** - Diciembre 2025
**Estado:** ✅ Producción

#### **🎨 Vista Kanban Completa Rediseñada**
- **Vista Kanban independiente** con columnas completamente independientes
- **4 etapas organizadas**: Validando membresia → En seguimiento → Interesado → Atendió llamada
- **Columnas independientes**: Cada columna tiene su propio ancho fijo y no afecta a las demás
- **Sistema de colapso horizontal**: Columnas colapsadas a 80px con texto rotado 90° centrado
- **Contador de prospectos**: Visible en posición normal arriba cuando está colapsada
- **Layout flexible**: Distribución equitativa del espacio entre columnas expandidas

#### **🔧 Funcionalidades del Kanban**
- **Preferencias de usuario**: Vista tipo Kanban o DataGrid almacenada en localStorage
- **Columnas colapsables**: Cada columna puede colapsarse independientemente
- **Cards de prospectos**: Muestra nombre, teléfono, ciudad, destino de preferencia, score y última actividad
- **Ordenamiento automático**: Prospectos ordenados por fecha de último mensaje
- **Scroll independiente**: Cada columna tiene su propio scroll vertical

#### **📊 Estructura Técnica**
- **Columnas independientes**: Flexbox horizontal con anchos calculados dinámicamente
- **Sin grid compartido**: Eliminado el problema de headers que afectan a otras columnas
- **Animaciones suaves**: Transiciones CSS sin Framer Motion problemático
- **Mapeo de etapas**: Sistema robusto que mapea etapas de BD a checkpoints visuales

#### **🎯 Mejoras de UX**
- **Visualización clara**: Colores distintivos por etapa (azul, amarillo, verde, morado)
- **Interacción intuitiva**: Click en header para colapsar/expandir columna
- **Estado persistente**: Preferencias de columnas colapsadas guardadas en localStorage
- **Responsive**: Adaptable a diferentes tamaños de pantalla

#### **📝 Archivos Modificados**
- `src/components/prospectos/ProspectosKanban.tsx` - Reestructuración completa con columnas independientes
- `src/components/prospectos/ProspectosManager.tsx` - Integración de vista Kanban con toggle
- `src/services/prospectsViewPreferencesService.ts` - Servicio para preferencias de usuario

---

### **v5.7.0** - Octubre 2025
**Estado:** ✅ Producción

#### **🚀 Data Grid Avanzado Completo**
- **Visualización de 23+ prospectos reales** con información completa
- **Sistema de filtros múltiples** por etapa, score, campaña, asesor asignado
- **Sorting dinámico** en cualquier columna con indicadores visuales
- **Sidebar informativo** con información estructurada del prospecto seleccionado
- **Historial de llamadas integrado** con navegación a detalles

#### **🔧 Funcionalidades Avanzadas**
- **Modal de detalle de llamadas** con transcripción completa y análisis
- **Navegación integrada** automática a Live Chat si hay conversación activa
- **Acceso directo** a Análisis IA desde historial de llamadas
- **Búsqueda inteligente** con filtros múltiples aplicados dinámicamente
- **Paginación automática** eficiente para grandes conjuntos de datos

#### **🎨 Mejoras de UX**
- **Indicadores visuales** claros para diferentes estados de prospectos
- **Sidebar expandible** con información completa y estructurada
- **Modal optimizado** con análisis detallado de llamadas
- **Transiciones suaves** entre diferentes vistas y estados
- **Responsive design** adaptable a diferentes tamaños de pantalla

#### **🏗️ Arquitectura Técnica**
- **Base de datos híbrida:** `glsmifhkoaifvaegsozd` + `hmmfuhqgvsehkizlfzga` + `zbylezfyagwrxoecioup`
- **Servicio especializado:** `prospectsService.ts` con operaciones CRUD completas
- **Integración múltiple:** Conexión bidireccional con Live Monitor, Live Chat y Análisis IA
- **Componente único:** `ProspectosManager.tsx` con funcionalidad completa

#### **🔒 Seguridad y Permisos**
- **Sistema de permisos granular** integrado con otros módulos
- **Control de acceso** basado en roles y permisos específicos
- **Auditoría de operaciones** en operaciones críticas
- **Validación estricta** de permisos en cada operación

---

### **v5.6.0** - Septiembre 2025
**Estado:** ✅ Producción

#### **🔄 Integración con Otros Módulos**
- **Navegación automática** a conversaciones de chat activas
- **Acceso directo** a análisis de llamadas desde historial
- **Sincronización bidireccional** con llamadas de ventas
- **Verificación de permisos** integrada con sistema global

#### **📊 Mejoras de Datos**
- **Campos adicionales** para información más completa de prospectos
- **Validación mejorada** de datos de entrada
- **Sincronización automática** de cambios entre módulos

---

### **v5.5.0** - Agosto 2025
**Estado:** ✅ Producción

#### **🎯 Funcionalidades Básicas**
- **Data grid inicial** con visualización básica de prospectos
- **Filtros básicos** por etapa y estado
- **Sidebar informativo** con datos principales del prospecto
- **Historial de llamadas** básico integrado

#### **🏗️ Infraestructura Técnica**
- **Servicio de prospectos** básico implementado
- **Integración inicial** con base de datos de análisis
- **Componente principal** estructurado y funcional

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
- [v5.7.0](#v570---octubre-2025) - Versión actual con funcionalidades completas
- [v5.6.0](#v560---septiembre-2025) - Integración con otros módulos
- [v5.5.0](#v550---agosto-2025) - Funcionalidades básicas implementadas

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

**Última actualización:** Enero 2025
**Versión actual:** v5.15.0
**Estado:** ✅ Producción estable
