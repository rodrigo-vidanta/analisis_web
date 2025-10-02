# 💬 Módulo Live Chat - Integración UChat

## 📋 Descripción General

El módulo Live Chat es una solución completa para gestionar conversaciones en tiempo real integrada con la API de UChat. Permite la interacción con clientes a través de WhatsApp y otros canales, con funcionalidades avanzadas de asignación de agentes y transferencia automática.

## 🎯 Características Principales

### ✅ **Funcionalidades Implementadas**

- **🔗 Integración completa con UChat API**
  - Envío y recepción de mensajes
  - Soporte para múltiples tipos de media (texto, imagen, audio, video, documentos)
  - Gestión de webhooks para eventos en tiempo real

- **👥 Sistema de Asignación de Agentes**
  - Asignación manual de conversaciones
  - Vista de disponibilidad de agentes
  - Estadísticas de carga de trabajo por agente

- **🤖 Handoff Automático**
  - Transferencia automática cuando el usuario envía un mensaje
  - Deshabilitación automática del bot
  - Reglas configurables de transferencia

- **🔍 Búsqueda Avanzada de Prospectos**
  - Búsqueda por número de teléfono con múltiples formatos
  - Integración con base de datos de prospectos existente
  - Información contextual del cliente

- **📊 Dashboard Completo**
  - Vista de todas las conversaciones
  - Filtros por estado, prioridad y agente
  - Métricas en tiempo real
  - Interfaz moderna y responsiva

## 🏗️ Arquitectura del Sistema

### **Base de Datos**
```
Base PQNC (hmmfuhqgvsehkizlfzga.supabase.co)
├── uchat_bots                 # Configuración de chatbots
├── uchat_conversations        # Conversaciones activas
├── uchat_messages            # Mensajes individuales
├── uchat_agent_assignments   # Asignaciones de agentes
├── uchat_handoff_rules       # Reglas de transferencia
├── uchat_metrics            # Métricas y estadísticas
└── uchat_webhook_events     # Eventos de webhooks
```

### **Servicios**
- `uchatService.ts` - Servicio principal de integración con UChat
- `prospectsService.ts` - Búsqueda y gestión de prospectos
- Integración con sistema de autenticación existente

### **Componentes UI**
- `LiveChatModule.tsx` - Módulo principal con navegación
- `LiveChatDashboard.tsx` - Dashboard de conversaciones
- `ChatWindow.tsx` - Ventana de chat individual
- `AgentAssignmentModal.tsx` - Modal de asignación de agentes

## 🚀 Instalación y Configuración

### **1. Ejecutar Script de Configuración**
```bash
cd scripts
node setup-uchat-system.js
```

### **2. Configurar API Key**
La API key ya está configurada en el sistema:
```
hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5
```

### **3. Configurar Webhooks en UChat**
1. Acceder al panel de UChat
2. Configurar webhook URL: `https://tu-dominio.com/api/uchat/webhook`
3. Seleccionar eventos: `message_received`, `conversation_started`, `conversation_ended`

### **4. Configurar Permisos**
Agregar el módulo `live-chat` a los permisos de usuario en la base de datos.

## 📱 Uso del Sistema

### **Dashboard Principal**
- **Vista de conversaciones**: Lista todas las conversaciones activas
- **Filtros**: Por estado (activa, transferida, cerrada), prioridad, agente
- **Búsqueda**: Por nombre, teléfono o email del cliente
- **Métricas**: Estadísticas en tiempo real

### **Ventana de Chat**
- **Mensajes en tiempo real**: Interfaz similar a WhatsApp
- **Información del prospecto**: Datos contextuales del cliente
- **Envío de mensajes**: Texto y archivos adjuntos
- **Estados de lectura**: Indicadores de entrega y lectura

### **Asignación de Agentes**
- **Vista de disponibilidad**: Carga de trabajo actual de cada agente
- **Asignación inteligente**: Sugerencias basadas en disponibilidad
- **Historial**: Registro de todas las asignaciones

## 🔧 Configuración Avanzada

### **Reglas de Handoff**
```sql
-- Ejemplo de regla personalizada
INSERT INTO uchat_handoff_rules (
  bot_id,
  rule_name,
  trigger_type,
  trigger_conditions
) VALUES (
  'bot-id',
  'Transferir por palabra clave',
  'keyword_detected',
  '{"keywords": ["agente", "humano", "ayuda"], "auto_assign": true}'
);
```

### **Configuración de Bot**
```json
{
  "auto_handoff": true,
  "handoff_trigger": "user_message",
  "supported_platforms": ["whatsapp", "telegram"],
  "response_timeout": 30,
  "max_retries": 3
}
```

## 🎨 Diseño y UX

### **Principios de Diseño**
- **Minimalista**: Interfaz limpia sin elementos innecesarios
- **Funcional**: Cada elemento tiene un propósito claro
- **Moderno**: Gradientes sutiles y animaciones elegantes
- **Consistente**: Paleta de colores coherente con la aplicación

### **Paleta de Colores**
- **Primario**: Azul (#3B82F6) a Púrpura (#8B5CF6)
- **Secundario**: Verde (#10B981) para estados activos
- **Neutros**: Grises para texto y fondos
- **Estados**: Rojo para urgente, Amarillo para advertencias

## 📊 Métricas y Analíticas

### **Métricas Disponibles**
- Total de conversaciones
- Conversaciones activas/transferidas/cerradas
- Tasa de handoff automático
- Tiempo promedio de respuesta
- Satisfacción del cliente

### **Reportes**
- Rendimiento por agente
- Volumen de conversaciones por período
- Análisis de patrones de transferencia

## 🔒 Seguridad y Permisos

### **Row Level Security (RLS)**
- Políticas implementadas en todas las tablas
- Acceso basado en roles de usuario
- Protección de datos sensibles

### **Permisos por Rol**
- **Admin**: Acceso completo, configuración del sistema
- **Agente**: Ver conversaciones asignadas, enviar mensajes
- **Supervisor**: Ver todas las conversaciones, asignar agentes

## 🚨 Troubleshooting

### **Problemas Comunes**

**1. Mensajes no se reciben**
- Verificar configuración de webhooks en UChat
- Comprobar conectividad de red
- Revisar logs de eventos en `uchat_webhook_events`

**2. Búsqueda de prospectos falla**
- Verificar conexión a base de datos de análisis
- Comprobar formato de números de teléfono
- Revisar permisos de acceso a tabla `prospectos`

**3. Asignación de agentes no funciona**
- Verificar que los agentes estén activos
- Comprobar permisos de usuario
- Revisar tabla `uchat_agent_assignments`

### **Logs y Debugging**
```javascript
// Habilitar logs detallados
localStorage.setItem('uchat_debug', 'true');

// Ver eventos de webhook
SELECT * FROM uchat_webhook_events 
WHERE processed = false 
ORDER BY created_at DESC;
```

## 🔄 Próximas Mejoras

### **Funcionalidades Planificadas**
- [ ] Chatbots múltiples
- [ ] Plantillas de respuestas rápidas
- [ ] Integración con CRM
- [ ] Análisis de sentimientos
- [ ] Notificaciones push
- [ ] Modo offline

### **Optimizaciones**
- [ ] Cache de mensajes
- [ ] Compresión de imágenes
- [ ] Lazy loading de conversaciones
- [ ] WebSocket para tiempo real

## 📞 Soporte

Para soporte técnico o preguntas sobre el módulo:
- **Documentación UChat**: https://www.uchat.com.au/api
- **Logs del sistema**: Revisar tabla `uchat_webhook_events`
- **Base de datos**: hmmfuhqgvsehkizlfzga.supabase.co

---

**Versión**: 1.0.0  
**Fecha**: Octubre 2025  
**Autor**: Sistema PQNC AI Platform
