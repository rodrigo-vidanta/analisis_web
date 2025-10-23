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

### **v5.4.1** - 23 Octubre 2025
**Estado:** ✅ Producción

#### **🎨 Mejora: Auto-Ajuste Inteligente de Imágenes**
- **Detección automática de orientación**
  - **Funcionalidad:** Detecta dimensiones naturales de cada imagen al cargarla
  - **Cálculo:** Determina orientación (landscape, portrait, square) basado en ratio
  - **Criterios:** 
    - `ratio > 1.1` → Landscape (horizontal)
    - `ratio < 0.9` → Portrait (vertical)
    - `0.9 ≤ ratio ≤ 1.1` → Square (cuadrada)

- **Ajustes visuales por orientación**
  - **Landscape:** `max-w-md` (ancho completo limitado a 28rem)
  - **Portrait:** `max-h-96` (altura limitada a 24rem para no ocupar mucho espacio vertical)
  - **Square:** `max-w-sm` (tamaño balanceado de 24rem)
  - **Stickers:** `128x128px` fijos con `object-contain`

- **Mejoras de renderizado**
  - **object-cover:** Mantiene aspect ratio en imágenes
  - **object-contain:** Preserva stickers sin distorsión
  - **Lazy loading:** Dimensiones se calculan solo cuando la imagen es visible
  - **Transiciones suaves:** Hover effects optimizados

- **Implementación técnica**
  - **Estado:** `imageDimensions` con `{ width, height, orientation }`
  - **Función:** `detectImageDimensions()` usa Image API
  - **Función:** `getImageClasses()` retorna CSS dinámico según orientación
  - **Archivo:** `MultimediaMessage.tsx`

#### **📝 Archivos Modificados**
- `src/components/chat/MultimediaMessage.tsx` (69 líneas agregadas)

---

### **v5.4.0** - 23 Octubre 2025
**Estado:** ✅ Producción

#### **🖼️ Nueva Funcionalidad: Catálogo de Imágenes**
- **Modal de selección de imágenes**
  - **Funcionalidad:** Catálogo completo de imágenes de destinos, resorts y atracciones
  - **Búsqueda:** Filtrado por palabra clave, destino y resort
  - **Paginación:** 8 imágenes por página para mejor rendimiento
  - **Cache local:** Últimas 8 imágenes usadas guardadas en localStorage
  - **Preview:** Vista previa de imagen antes de enviar
  - **Caption:** Opción de agregar texto descriptivo a la imagen
  - **Lazy loading:** URLs firmadas generadas bajo demanda
  - **Archivo:** `ImageCatalogModal.tsx`

- **Integración con tabla content_management**
  - **Base de datos:** `pqnc_ia.content_management`
  - **Campos:** nombre_archivo, destinos[], resorts[], bucket
  - **URL signing:** API Railway para generar URLs firmadas (30 min)
  - **Fallback:** Bucket por defecto `whatsapp-media`

- **Envío de imágenes a WhatsApp**
  - **Endpoint:** `https://primary-dev-d75a.up.railway.app/webhook/send-img`
  - **Header:** `livechat_auth: 2025_livechat_auth`
  - **Payload:** `[{ whatsapp, uchat_id, imagenes: [{archivo, destino, resort}] }]`
  - **Validación:** Verifica whatsapp e id_uchat desde tabla prospectos
  - **Nota CORS:** En desarrollo puede presentar problemas, funciona en producción

#### **📸 Soporte Multimedia Completo**
- **Visualización de adjuntos**
  - **Tipos soportados:** Imágenes, audios, videos, stickers, documentos
  - **Lazy loading:** Carga solo cuando el mensaje es visible (Intersection Observer)
  - **Cache de URLs:** 25 minutos de validez antes de regenerar
  - **Componente:** `MultimediaMessage.tsx`

- **Detección inteligente de tipos**
  - **Stickers WhatsApp:** Detecta `.webp`, `.gif`, nombres sin extensión
  - **Compatibilidad:** Soporta campo `filename` y `archivo` (webhook vs DB)
  - **Validación defensiva:** Maneja campos undefined sin crashear
  - **Fallbacks:** Valores por defecto para bucket y tipo

- **UX estilo WhatsApp**
  - **Sin globo:** Stickers y audios se muestran directamente
  - **Con globo:** Imágenes, videos, documentos (pueden tener texto)
  - **Sin etiquetas:** Removidas las etiquetas "Prospecto", "AI", "Vendedor"
  - **Avatares:** Solo iniciales en círculo para identificar remitente

#### **🔧 Correcciones Técnicas**
- **Fix: TypeError en MultimediaMessage**
  - **Problema:** Crash al hacer `.toLowerCase()` en campos undefined
  - **Causa:** Adjuntos con estructura diferente (webhook vs DB)
  - **Solución:** Validación preventiva en todas las funciones
  - **Funciones corregidas:** `getFileType`, `getFileTypeFromAdjunto`, `getFileIcon`

- **Fix: Obtención de datos del prospecto**
  - **Problema:** conversationPhone e id_uchat no disponibles
  - **Solución:** Query automático a tabla prospectos usando prospecto_id
  - **Query:** `SELECT whatsapp, id_uchat FROM prospectos WHERE id = prospecto_id`
  - **Estado:** `prospectoData` cargado al abrir modal

- **Fix: CORS en envío de imágenes**
  - **Problema:** Error CORS al enviar desde localhost
  - **Intento 1:** Cambiar header a `livechat_auth` (mismo que send-message)
  - **Intento 2:** Crear Edge Function proxy en Supabase
  - **Estado:** Pendiente prueba en producción (AWS)
  - **Nota:** Edge Function disponible en `supabase/functions/send-img-proxy/`

#### **📝 Archivos Modificados/Creados**
- `src/components/chat/ImageCatalogModal.tsx` ⭐ NUEVO
- `src/components/chat/MultimediaMessage.tsx` ⭐ NUEVO
- `src/components/chat/LiveChatCanvas.tsx` (integración modal y multimedia)
- `supabase/functions/send-img-proxy/index.ts` ⭐ NUEVO (proxy CORS)
- `supabase/functions/send-img-proxy/deno.json` ⭐ NUEVO

#### **🎯 Pendientes**
- [ ] Probar envío de imágenes desde AWS (verificar si CORS funciona)
- [ ] Desplegar Edge Function si es necesario: `supabase functions deploy send-img-proxy`
- [ ] Considerar agregar Caption en el webhook de Railway

---

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
- [v5.4.1](#v541---23-octubre-2025) - Auto-ajuste inteligente de imágenes
- [v5.4.0](#v540---23-octubre-2025) - Catálogo de Imágenes + Multimedia
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
**Versión actual:** v5.4.1
**Estado:** ✅ Producción estable
