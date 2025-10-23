# 📋 CHANGELOG - MÓDULO LIVE CHAT

## 🏗️ REGLAS DE ORO PARA DESARROLLADORES

**⚠️ IMPORTANTE:** Antes de realizar cualquier cambio en el módulo Live Chat, consulta:

### **1. 📚 Documentación Técnica**
Para cualquier duda consultar el archivo README: `src/components/chat/README.md` para información técnica completa del módulo y sus funciones.

### **2. 📝 Documentación de Cambios**
Cualquier cambio realizado en cualquier archivo del módulo se debe documentar en el archivo README: `src/components/chat/README.md`

### **3. 📋 Verificación de Cambios**
Cualquier ajuste se debe verificar en este CHANGELOG para ver si no se realizó antes. En caso de que sea nuevo, debe documentarse correctamente aquí.

---

## 📅 HISTORIAL DE CAMBIOS

### **v5.3.3** - 23 Octubre 2025
**Estado:** ✅ Producción

#### **🧹 Limpieza y Optimización**
- **Eliminación masiva de logs de debug**
  - **Problema:** Consola saturada con más de 100 mensajes informativos por operación
  - **Solución:** Eliminación sistemática de todos los `console.log` y `console.warn`
  - **Logs retenidos:** Solo `console.error` para errores críticos
  - **Impacto:** Consola limpia y legible, mejor rendimiento
  - **Archivo:** `LiveChatCanvas.tsx`

---

### **v5.3.2** - 23 Octubre 2025
**Estado:** ✅ Producción

#### **✨ Nuevas Funcionalidades**
- **Restricción de ventana de 24 horas de WhatsApp Business API**
  - **Funcionalidad:** Validación automática de la ventana de mensajería de 24 horas
  - **Comportamiento:** Si han pasado más de 24 horas desde el último mensaje del usuario, se bloquea el envío de mensajes
  - **UI:** Mensaje informativo profesional explicando la restricción de WhatsApp Business API
  - **Reactivación:** La conversación se reactiva automáticamente cuando el usuario envía un nuevo mensaje
  - **Cumplimiento:** Alineado con las políticas oficiales de WhatsApp Business API
  - **Archivo:** `LiveChatCanvas.tsx` (funciones `isWithin24HourWindow`, `getHoursSinceLastUserMessage`)

#### **🔄 Mejoras de Realtime**
- **FIX: Race condition en inicialización de Realtime**
  - **Problema:** La suscripción de Realtime se configuraba ANTES de cargar las conversaciones, causando que los mensajes entrantes no actualizaran la UI
  - **Solución:** Refactorización del `useEffect` para garantizar carga secuencial:
    1. Cargar conversaciones (`await loadConversations()`)
    2. DESPUÉS suscribirse a Realtime (`setupRealtimeSubscription()`)
  - **Resultado:** Actualización automática y confiable de la lista de conversaciones cuando llegan mensajes
  - **Archivo:** `LiveChatCanvas.tsx` (líneas 203-240)

---

### **v5.3.1** - 23 Octubre 2025
**Estado:** ✅ Producción

#### **🐛 Correcciones Críticas**
- **FIX: Contador de mensajes no leídos persistente**
  - **Problema:** Row Level Security (RLS) bloqueaba el UPDATE de la columna `leido` cuando se usaba el `anon` key del frontend
  - **Síntoma:** Al abrir una conversación, el contador de mensajes no leídos se reseteaba visualmente pero reaparecía al recargar la página
  - **Diagnóstico:** 
    - Con `service_role` key: ✅ UPDATE funcionaba correctamente
    - Con `anon` key (frontend): ❌ UPDATE devolvía 0 filas actualizadas
  - **Solución:** Creación de función RPC `mark_messages_as_read()` con `SECURITY DEFINER` para bypass controlado de RLS
  - **Archivo:** `scripts/sql/create_mark_messages_read_rpc.sql`
  - **Componente:** `LiveChatCanvas.tsx` (función `markConversationAsRead`)
  - **Documentación:** `INSTRUCCIONES_RPC_MARK_READ.md`

#### **🔒 Mejoras de Seguridad**
- Implementación de bypass RLS controlado mediante función `SECURITY DEFINER`
- Scope limitado: Solo marca como leídos mensajes del rol 'Prospecto'
- Validación de parámetros UUID para prevenir inyecciones
- Error handling robusto en función RPC

#### **📊 Mejoras de Logging**
- Logs detallados para diagnóstico de RLS
- Identificación de IDs de mensajes en proceso de actualización
- Confirmación de mensajes actualizados en BD vs. UI

---

### **v5.3.0** - Octubre 2025
**Estado:** ✅ Producción

#### **🔧 Funcionalidades Implementadas**
- Sistema completo de chat en tiempo real con UChat API
- Sincronización automática cada 15 segundos con inteligencia
- Handoff automático inteligente a agentes humanos
- Canvas de 3 columnas ajustables con navegación temporal
- Gestión de conversaciones con estados visuales claros
- Envío de mensajes vía webhook Railway integrado
- Métricas y estadísticas en tiempo real
- Integración con sistema de prospectos existente

#### **🏗️ Arquitectura Técnica**
- **Base de Datos:** `hmmfuhqgvsehkizlfzga.supabase.co` (SystemUI)
- **API Externa:** `https://www.uchat.com.au/api`
- **Webhook:** `https://primary-dev-d75a.up.railway.app/webhook/send-message`
- **Tablas:** 7 tablas principales con triggers automáticos
- **Componentes:** 6 componentes principales optimizados

#### **🔒 Seguridad**
- Row Level Security (RLS) configurado en todas las tablas
- Políticas de acceso basadas en autenticación de usuarios
- API Keys sensibles almacenadas en configuración segura

---

### **v5.2.0** - Septiembre 2025
**Estado:** ✅ Producción

#### **✨ Mejoras de Sincronización**
- Implementación de sincronización bidireccional con `pqnc_ia.prospectos`
- Optimización de consultas para reducir latencia
- Sistema de filtros inteligentes para conversaciones activas

#### **🎨 Mejoras de UX**
- Indicadores visuales mejorados para estados de conversación
- Navegación temporal más intuitiva en bloques de mensajes
- Feedback visual mejorado durante envío de mensajes

---

### **v5.1.0** - Agosto 2025
**Estado:** ✅ Producción

#### **🔄 Integración Webhook**
- Implementación completa de webhook Railway para envío de mensajes
- Verificación de estado de entrega de mensajes
- Sistema de reintentos automático para mensajes fallidos

#### **📊 Métricas Avanzadas**
- Sistema de métricas en tiempo real implementado
- Dashboard administrativo con estadísticas detalladas
- Seguimiento de tasa de handoff y tiempos de respuesta

---

### **v5.0.0** - Julio 2025
**Estado:** ✅ Producción

#### **🚀 Lanzamiento Inicial**
- Arquitectura base del módulo Live Chat implementada
- Integración básica con UChat API establecida
- Canvas de conversaciones funcional desarrollado
- Sistema de asignación de agentes implementado

---

## 📋 REGLAS DE DOCUMENTACIÓN

### **🎯 Formato de Entradas**
Cada entrada del changelog debe incluir:
- **Versión** con estado (✅ Producción / ⚠️ Desarrollo / ❌ Obsoleto)
- **Fecha** del cambio
- **Categorías** de cambios (🔧 Funcionalidades / ✨ Mejoras / 🐛 Correcciones / 📚 Documentación)
- **Descripción detallada** del cambio realizado

### **📝 Proceso de Documentación**
1. **Antes de cambiar:** Verificar este changelog y el README
2. **Durante el cambio:** Mantener comentarios claros en el código
3. **Después del cambio:** Documentar aquí y actualizar README si es necesario
4. **Validación:** Otro desarrollador debe revisar los cambios

---

## 🔍 BÚSQUEDA RÁPIDA

### **Por Versión**
- [v5.3.3](#v533---23-octubre-2025) - Limpieza masiva de logs
- [v5.3.2](#v532---23-octubre-2025) - Ventana 24h WhatsApp + Fix Realtime race condition
- [v5.3.1](#v531---23-octubre-2025) - FIX: Contador mensajes no leídos (RLS bypass)
- [v5.3.0](#v530---octubre-2025) - Versión actual de producción
- [v5.2.0](#v520---septiembre-2025) - Mejoras de sincronización
- [v5.1.0](#v510---agosto-2025) - Integración webhook completa
- [v5.0.0](#v500---julio-2025) - Lanzamiento inicial

### **Por Categoría**
- **Funcionalidades:** 🔧 (Características principales)
- **Mejoras:** ✨ (Optimizaciones y mejoras)
- **Correcciones:** 🐛 (Bug fixes)
- **Documentación:** 📚 (Cambios en documentación)

---

## ⚠️ NOTAS IMPORTANTES

- **Siempre verificar** cambios anteriores antes de implementar nuevos
- **Documentar completamente** cualquier modificación realizada
- **Mantener consistencia** con el formato establecido
- **Actualizar README** cuando cambios afecten funcionalidad pública

---

**Última actualización:** 23 Octubre 2025
**Versión actual:** v5.3.3
**Estado:** ✅ Producción estable
