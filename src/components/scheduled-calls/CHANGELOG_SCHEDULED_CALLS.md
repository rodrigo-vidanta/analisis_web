# 📋 CHANGELOG - MÓDULO LLAMADAS PROGRAMADAS

## 🏗️ REGLAS DE ORO PARA DESARROLLADORES

**⚠️ IMPORTANTE:** Antes de realizar cualquier cambio en el módulo Llamadas Programadas, consulta:

### **1. 📚 Documentación Técnica**
Para cualquier duda consultar el archivo README: `src/components/scheduled-calls/README_SCHEDULED_CALLS.md` (si existe) para información técnica completa del módulo y sus funciones.

### **2. 📝 Documentación de Cambios**
Cualquier cambio realizado en cualquier archivo del módulo se debe documentar en este CHANGELOG.

### **3. 📋 Verificación de Cambios**
Cualquier ajuste se debe verificar en este CHANGELOG para ver si no se realizó antes. En caso de que sea nuevo, debe documentarse correctamente aquí.

---

## 📅 HISTORIAL DE CAMBIOS

### **v1.3.0** - Diciembre 2025
**Estado:** ✅ Producción

#### **🕐 Corrección Crítica de Zona Horaria**
- **Problema resuelto:** Las llamadas programadas aparecían en días incorrectos debido a conversión incorrecta de timestamps UTC
- **Ejemplo del problema:** Llamadas de las 6 PM aparecían a las 9:30 AM del día actual
- **Solución implementada:**
  - Filtrado por fecha usando zona horaria local de Puerto Vallarta (America/Mexico_City, UTC-6)
  - Comparación correcta usando `getFullYear()`, `getMonth()`, `getDate()` en lugar de `toISOString().split('T')[0]`
  - Creación de objetos Date con año, mes y día locales para comparación precisa
  - Eliminada dependencia de UTC que causaba desfases de hasta 6 horas
- **Archivos modificados:** `src/components/scheduled-calls/views/DailyView.tsx`

#### **🔧 Implementación Técnica**
- **Comparación local:** Uso de `new Date(year, month, date)` para crear fechas locales sin componente de tiempo
- **Filtrado mejorado:** Comparación de timestamps locales en lugar de strings ISO
- **Ordenamiento:** Mantenido ordenamiento por `fecha_programada` ascendente

---

### **v1.2.0** - Enero 2025
**Estado:** ✅ Producción

#### **🎨 Mejoras Visuales en Vista Diaria y Semanal**
- **Badge de contador en calendario:** Reemplazado el punto pequeño por un badge circular con contador de llamadas programadas por día
- **Posicionamiento del badge:** Ubicado en la esquina inferior derecha del día, sobre el borde para mejor visibilidad
- **Estilos dinámicos:** Badge adapta colores según si el día está seleccionado o es el día actual
- **Overlay animado en hover:** Implementado degradado animado que emerge desde el borde derecho al pasar el mouse sobre tarjetas ejecutadas/no contestadas
- **Diferenciación visual:** Degradado verde para ejecutadas y rojo para no contestadas, solo visible en hover

#### **🔧 Funcionalidades Implementadas**
- **Badge de notificación:** Muestra contador de llamadas programadas por día en el calendario
- **Animación de degradado:** Efecto visual sutil que aparece al hacer hover sobre tarjetas con estado ejecutada/no contesto
- **Transiciones suaves:** Animaciones CSS con duración de 300ms y easing ease-out
- **Compatibilidad de temas:** Funciona correctamente en modo claro y oscuro

#### **📝 Archivos Modificados**
- `src/components/scheduled-calls/CalendarSidebar.tsx` - Implementación de badge de contador en calendario
- `src/components/scheduled-calls/views/DailyView.tsx` - Overlay animado en hover para tarjetas ejecutadas/no contestadas
- `src/components/scheduled-calls/views/WeeklyView.tsx` - Overlay animado en hover para tarjetas ejecutadas/no contestadas

#### **🎯 Mejoras de UX**
- **Visualización clara:** Badge permite identificar rápidamente días con múltiples llamadas programadas
- **Interacción intuitiva:** Degradado animado proporciona feedback visual al pasar el mouse
- **Estados diferenciados:** Colores distintivos (verde/rojo) para identificar tipo de estado sin ser invasivos
- **Diseño minimalista:** Efectos sutiles que mejoran la experiencia sin saturar visualmente

---

### **v1.1.0** - Diciembre 2024
**Estado:** ✅ Producción

#### **🚀 Implementación Inicial del Módulo**
- **Vista diaria:** Visualización de llamadas programadas por día con timeline
- **Vista semanal:** Vista compacta de llamadas programadas por semana
- **Calendario interactivo:** Selección de fechas con indicadores visuales
- **Gestión de estados:** Manejo de estados programada, ejecutada, cancelada, no contesto

---

