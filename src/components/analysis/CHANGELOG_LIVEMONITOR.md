# 📋 CHANGELOG - MÓDULO LIVE MONITOR

## 🏗️ REGLAS DE ORO PARA DESARROLLADORES

**⚠️ IMPORTANTE:** Antes de realizar cualquier cambio en el módulo Live Monitor, consulta:

### **1. 📚 Documentación Técnica**
Para cualquier duda consultar el archivo README: `src/components/analysis/README_LIVEMONITOR.md` para información técnica completa del módulo y sus funciones.

### **2. 📝 Documentación de Cambios**
Cualquier cambio realizado en cualquier archivo del módulo se debe documentar en el archivo README: `src/components/analysis/README_LIVEMONITOR.md`

### **3. 📋 Verificación de Cambios**
Cualquier ajuste se debe verificar en este CHANGELOG para ver si no se realizó antes. En caso de que sea nuevo, debe documentarse correctamente aquí.

---

## 📅 HISTORIAL DE CAMBIOS

### **v5.5.0** - Noviembre 26, 2025
**Estado:** ✅ Producción

#### **🎯 Mejora Crítica: Clasificación de Llamadas Mejorada**
- **Nueva categoría "Atendida / no Transferida":** Reemplazada columna "Finalizadas" por categoría más específica
- **Lógica de clasificación mejorada:** Basada en grabación, duración y `razon_finalizacion` de VAPI
- **Reglas de clasificación:**
  - Si tiene grabación → llamada terminó
  - Si tiene grabación y dura < 30 seg → fallida
  - Si tiene grabación y dura ≥ 30 seg pero NO transferida → atendida / no transferida
  - Para ser transferida → `razon_finalizacion` debe ser `assistant-forwarded-call`
  - `customer-ended-call` + > 30 seg → atendida pero no transferida
  - `customer-did-not-answer` → perdida

#### **🔧 Corrección de Llamadas Activas Colgadas**
- **Detección automática:** Llamadas "activas" sin grabación ni duración con más de 15 minutos → marcadas como perdidas
- **Auto-corrección mejorada:** Función `autoFixFailedCalls()` actualizada con criterio de 15 minutos
- **Corrección manual:** Llamada específica de Darig Samuel Rosales corregida

#### **🔔 Detección de Checkpoint #5 Mejorada**
- **Sonido de alerta:** Reproducción mejorada cuando llamada llega a checkpoint #5 (Presentación e Oportunidad)
- **Animación de ringing:** Logo del sidebar con animación cuando llega al checkpoint #5
- **Detección en ambos modos:** Optimizado y Legacy con detección robusta
- **Manejo de AudioContext:** Verificación y reanudación automática si está suspendido

#### **📊 Razones de Finalización VAPI Implementadas**
- **Transferencia:** `assistant-forwarded-call`, `call.ringing.hook-executed-transfer`
- **Pérdida:** `customer-did-not-answer`, `customer-busy`, `assistant-not-found`, etc.
- **Atendida:** `customer-ended-call`, `assistant-ended-call`, etc. (con duración ≥ 30 seg)

#### **🎯 Archivos Modificados**
- `src/components/analysis/LiveMonitorKanban.tsx` - Lógica de clasificación mejorada y detección de checkpoint
- `src/services/liveMonitorKanbanOptimized.ts` - Clasificación optimizada con nueva categoría
- `src/services/liveMonitorService.ts` - Auto-corrección mejorada (15 minutos)
- `src/components/Sidebar.tsx` - Sonido mejorado y manejo de AudioContext

#### **📊 Validación**
- ✅ Nueva categoría "Atendida / no Transferida" funcionando correctamente
- ✅ Llamadas activas colgadas detectadas y corregidas automáticamente
- ✅ Sonido y animación de checkpoint #5 funcionando
- ✅ Clasificación basada en `razon_finalizacion` de VAPI implementada

---

### **v5.4.0** - Noviembre 25, 2025
**Estado:** ✅ Producción

#### **🔧 Corrección Crítica: Vista Live Monitor y Clasificación Inteligente**
- **Vista `live_monitor_view` recreada:** Vista optimizada recreada completamente con estructura correcta
- **Función de clasificación corregida:** Priorización de `call_status = 'activa'` sin límite de tiempo
- **Problema resuelto:** Llamadas activas ya no se marcan incorrectamente como "perdida" después de 30 minutos
- **Realtime configurado:** Triggers y notificaciones configurados correctamente

#### **📚 Documentación Completa**
- **Nueva documentación:** `docs/LIVE_MONITOR_VIEW_DOCUMENTATION.md` creada con especificaciones completas
- **Script SQL documentado:** `scripts/sql/create-live-monitor-view-complete.sql` con todos los detalles
- **Guía de resolución de problemas:** Sección completa de troubleshooting agregada

#### **🐛 Correcciones Técnicas**
- **Función `clasificar_estado_llamada`:** Lógica corregida para respetar `call_status = 'activa'`
- **Vista optimizada:** JOIN correcto entre `llamadas_ventas` y `prospectos`
- **Campos calculados:** `minutos_transcurridos` calculado correctamente en la vista
- **Prioridad de campos:** Composición familiar y preferencias con prioridad llamada > prospecto

#### **🗄️ Cambios en Base de Datos**
- **Vista recreada:** `live_monitor_view` con estructura completa y validada
- **Función actualizada:** `clasificar_estado_llamada` con lógica corregida
- **Triggers configurados:** `live_monitor_llamadas_trigger` y `live_monitor_prospectos_trigger`
- **Realtime habilitado:** Tablas `llamadas_ventas` y `prospectos` en publicación `supabase_realtime`

#### **🎯 Archivos Modificados**
- `scripts/sql/create-live-monitor-view-complete.sql` - Script completo de creación
- `docs/LIVE_MONITOR_VIEW_DOCUMENTATION.md` - Nueva documentación completa
- `src/components/analysis/CHANGELOG_LIVEMONITOR.md` - Actualizado con cambios

#### **📊 Validación**
- ✅ Vista creada y funcionando correctamente
- ✅ Función de clasificación validada con llamadas reales
- ✅ Realtime configurado y operativo
- ✅ Triggers funcionando correctamente

---

### **v5.3.0** - Octubre 24, 2025
**Estado:** ✅ Producción

#### **🎨 Nueva Vista DataGrid con Selector de Vista**
- **Selector de vista** Kanban/DataGrid con persistencia en `localStorage`
- **Vista DataGrid dual:** 
  - **Grid superior:** Llamadas en etapa 5 (Presentación e Oportunidad)
  - **Grid inferior:** Llamadas en etapas 1-4 ordenadas de mayor a menor
- **Interfaz responsive** con diseño profesional en tablas
- **Click en fila** abre el mismo modal de detalle que Kanban

#### **🏁 Nueva Pestaña "Llamadas Finalizadas"**
- **Tab dedicado** para llamadas finalizadas y marcadas como perdidas
- **Vista unificada** con DataGrid para llamadas completadas
- **Filtrado automático** de llamadas activas vs finalizadas

#### **✅ Modal de Finalización de Llamadas**
- **Hover interactivo** en avatar del prospecto muestra icono de check
- **Modal de 3 opciones:**
  - 🔴 **Perdida:** Marca la llamada como no exitosa
  - ✅ **Finalizada:** Marca la llamada como exitosa
  - ⏰ **Marcar más tarde:** Cierra el modal sin cambios
- **Actualización automática** del estado en base de datos
- **Movimiento automático** a la pestaña "Finalizadas"

#### **🔧 Mejoras Técnicas**
- **Nuevos componentes:**
  - `LiveMonitorDataGrid.tsx` - Componente de tabla reutilizable
  - `FinalizationModal.tsx` - Modal de finalización con 3 opciones
- **Funciones helper** para separar llamadas por checkpoint
- **Badges visuales** para estado, interés y checkpoint en DataGrid
- **Iconos informativos** con Lucide React

#### **📊 Características del DataGrid**
| Columna | Descripción |
|---------|-------------|
| Cliente | Avatar interactivo + nombre + ciudad |
| Teléfono | Número de WhatsApp |
| Checkpoint | Badge con color por etapa |
| Duración | Tiempo en formato MM:SS |
| Estado | Badge de estado (activa/transferida/perdida) |
| Interés | Badge de nivel de interés (alto/medio/bajo) |
| Acción | Botón de finalización rápida |

#### **🗄️ Cambios en Base de Datos**
- **Actualizaciones** en `call_status` con valores 'finalizada' y 'perdida'
- **Campos utilizados:**
  - `feedback_resultado` - Tipo de finalización
  - `feedback_comentarios` - Comentarios automáticos
  - `tiene_feedback` - Marca de feedback procesado
  - `ended_at` - Timestamp de finalización

#### **💾 Persistencia de Preferencias**
- **localStorage** guarda la preferencia de vista (Kanban/DataGrid)
- **Restauración automática** al recargar la página
- **Key:** `liveMonitor-viewMode`

#### **🎯 Archivos Modificados**
- `src/components/analysis/LiveMonitorKanban.tsx` (+180 líneas)
- `src/components/analysis/LiveMonitorDataGrid.tsx` (nuevo, 243 líneas)
- `src/components/analysis/FinalizationModal.tsx` (nuevo, 148 líneas)
- `src/components/analysis/CHANGELOG_LIVEMONITOR.md` (actualizado)
- `src/components/analysis/README_LIVEMONITOR.md` (pendiente)

---

### **v5.2.0** - Octubre 2025
**Estado:** ✅ Producción

#### **🚀 Vista Optimizada Completa**
- **Vista `live_monitor_view`** implementada con clasificación automática
- **Rendimiento mejorado** en 60% (menos consultas, datos pre-calculados)
- **Clasificación inteligente** automática basada en estado VAPI y duración
- **Realtime habilitado** con triggers personalizados para la vista

#### **🔧 Funcionalidades Principales**
- **Monitoreo Kanban** completo con 4 columnas (activas/transferidas/finalizadas/fallidas)
- **Procesamiento audio profesional** con Tone.js integrado
- **Controles VAPI** para llamadas activas (pausa/reactivación/transferencia)
- **Sistema de retroalimentación** completo con comentarios
- **Sincronización automática** cada 15 segundos con inteligencia

#### **🏗️ Arquitectura Técnica**
- **Base de datos:** `glsmifhkoaifvaegsozd.supabase.co` (Base Natalia)
- **Vista optimizada:** `live_monitor_view` con JOIN automático
- **Servicios:** 3 servicios especializados (legacy/optimizado/kanban)
- **Componentes:** 3 componentes principales (Kanban/Legacy/Linear)

#### **🔒 Seguridad y Permisos**
- **Sistema de permisos granular** implementado
- **Row Level Security (RLS)** configurado en tablas principales
- **Control de acceso** basado en `canAccessLiveMonitor()`

---

### **v5.1.0** - Septiembre 2025
**Estado:** ✅ Producción

#### **🎵 Procesamiento de Audio Profesional**
- **Integración Tone.js** completa para procesamiento avanzado
- **EQ, compresión y limitación** en tiempo real
- **Controles avanzados** de audio con presets profesionales
- **Detección automática** de problemas de audio (estéreo/mono)

#### **🔄 Mejoras de Sincronización**
- **Sincronización inteligente** con prevención de conflictos
- **Actualización incremental** sin rerenders innecesarios
- **Manejo robusto** de estados de conexión VAPI

---

### **v5.0.0** - Agosto 2025
**Estado:** ✅ Producción

#### **🚀 Lanzamiento Inicial**
- **Arquitectura base** del módulo Live Monitor establecida
- **Integración básica** con VAPI para monitoreo de llamadas
- **Vista tabular** inicial para monitoreo de llamadas activas
- **Controles básicos** de transferencia y colgado

#### **🏗️ Infraestructura Técnica**
- **Base de datos dedicada** configurada (Base Natalia)
- **Tablas principales** creadas con relaciones apropiadas
- **Sistema de permisos** básico implementado

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
- **v5.3.0:** Nueva Vista DataGrid, Selector de Vista, Tab Finalizadas, Modal Finalización
- **v5.2.0:** Vista Optimizada Completa, Clasificación Automática, Realtime Mejorado
- **v5.1.0:** Procesamiento Audio Profesional (Tone.js), Controles Avanzados
- **v5.0.0:** Lanzamiento Inicial, Arquitectura Base, Integración VAPI

### **Por Funcionalidad**
- **Vista DataGrid:** v5.3.0
- **Selector de Vista:** v5.3.0
- **Modal Finalización:** v5.3.0
- **Tab Finalizadas:** v5.3.0
- **Vista Optimizada:** v5.2.0
- **Clasificación Automática:** v5.2.0
- **Audio Profesional:** v5.1.0
- **Integración VAPI:** v5.0.0

### **Por Archivo**
- **LiveMonitorKanban.tsx:** v5.3.0, v5.2.0, v5.1.0, v5.0.0
- **LiveMonitorDataGrid.tsx:** v5.3.0 (nuevo)
- **FinalizationModal.tsx:** v5.3.0 (nuevo)
- **liveMonitorOptimizedService.ts:** v5.2.0
- **liveMonitorKanbanOptimized.ts:** v5.2.0

---

**Última actualización:** Noviembre 25, 2025
**Versión actual:** v5.4.0
**Estado:** ✅ Producción
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
**Versión actual:** v5.2.0
**Estado:** ✅ Producción estable
