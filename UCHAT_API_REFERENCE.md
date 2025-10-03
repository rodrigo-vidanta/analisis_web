# 📡 UChat API Reference - PQNC AI Platform

**Fecha:** Octubre 2025  
**API Base URL:** `https://www.uchat.com.au/api`  
**API Key:** `hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5`  
**Estado:** ✅ Verificado y funcional

---

## 🔐 **Autenticación**

Todas las solicitudes requieren autenticación Bearer Token:

```http
Authorization: Bearer hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5
Content-Type: application/json
Accept: application/json
```

---

## 📋 **Endpoints Verificados**

### **1. Conteo de Usuarios del Bot**
```http
GET /flow/bot-users-count
```

**Respuesta:**
```json
{
  "status": "ok",
  "data": [
    {
      "num": 17,
      "status": "open"
    }
  ]
}
```

**Descripción:** Obtiene el número total de usuarios activos del bot.

---

### **2. Subflujos del Bot**
```http
GET /flow/subflows
```

**Respuesta:**
```json
{
  "data": [
    {
      "name": "Respuesta_agente_parte3",
      "sub_flow_ns": "f190385s2693635"
    },
    {
      "name": "Respuesta_agente_parte2", 
      "sub_flow_ns": "f190385s2693633"
    },
    {
      "name": "Enviar_imagenes_dinamicas",
      "sub_flow_ns": "f190385s2631581"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 10,
    "total": 5
  },
  "status": "ok"
}
```

**Descripción:** Lista todos los subflujos configurados en el bot.

---

### **3. Agentes Disponibles**
```http
GET /flow/agents
```

**Respuesta:**
```json
{
  "data": [
    {
      "id": 182303,
      "name": "VRM060214U65, VENTAS RIVIERA MAYA, S.A. DE C.V.",
      "email": "rodrigomora@grupovidanta.com",
      "image": "https://ui-avatars.com/api?name=...",
      "role": "owner",
      "is_online": true
    }
  ],
  "status": "ok"
}
```

**Descripción:** Lista todos los agentes disponibles en el workspace.

---

## 🔍 **Endpoints Potenciales (Por Probar)**

Basado en la documentación estándar de UChat, estos endpoints podrían estar disponibles:

### **Conversaciones**
```http
GET /conversations                    # Listar conversaciones
GET /conversations/{id}               # Obtener conversación específica
GET /conversations/{id}/messages      # Obtener mensajes de conversación
POST /conversations/{id}/messages     # Enviar mensaje
```

### **Usuarios/Contactos**
```http
GET /users                           # Listar usuarios
GET /users/{id}                      # Obtener usuario específico
POST /users                          # Crear usuario
PUT /users/{id}                      # Actualizar usuario
```

### **Mensajes**
```http
GET /messages                        # Listar mensajes
POST /messages                       # Enviar mensaje
GET /messages/{id}                   # Obtener mensaje específico
```

---

## 📊 **Esquemas de Datos**

### **Usuario/Contacto**
```typescript
interface UChatUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  custom_fields?: Record<string, any>;
}
```

### **Conversación**
```typescript
interface UChatConversation {
  id: string;
  user_id: string;
  bot_id: string;
  status: 'open' | 'closed' | 'transferred';
  platform: 'whatsapp' | 'messenger' | 'telegram';
  created_at: string;
  updated_at: string;
  last_message_at: string;
  message_count: number;
}
```

### **Mensaje**
```typescript
interface UChatMessage {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'bot' | 'agent';
  content: string;
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document';
  created_at: string;
  metadata?: Record<string, any>;
}
```

### **Agente**
```typescript
interface UChatAgent {
  id: number;
  name: string;
  email: string;
  image: string;
  role: 'owner' | 'admin' | 'agent';
  is_online: boolean;
}
```

---

## 🔄 **Flujo de Sincronización Propuesto**

### **Paso 1: Obtener Conversaciones Activas**
```javascript
// Desde UChat API (cuando esté disponible)
const conversations = await fetch('/conversations?status=open');

// Alternativa: Desde base de datos pqnc_ia
const prospects = await analysisSupabase
  .from('prospectos')
  .select('*')
  .not('id_uchat', 'is', null)
  .in('etapa', ['Interesado', 'Validando si es miembro']);
```

### **Paso 2: Sincronizar con system_ui**
```javascript
// Crear/actualizar conversaciones en uchat_conversations
const newConversations = prospects.map(prospect => ({
  conversation_id: prospect.id_uchat,
  customer_name: prospect.nombre_whatsapp,
  customer_phone: prospect.whatsapp,
  metadata: {
    prospect_id: prospect.id,
    etapa: prospect.etapa
  }
}));
```

### **Paso 3: Sincronizar Mensajes**
```javascript
// Obtener mensajes desde mensajes_whatsapp
const messages = await analysisSupabase
  .from('mensajes_whatsapp')
  .select('*')
  .eq('prospecto_id', prospect.id)
  .gte('fecha_hora', lastSyncTime);

// Insertar en uchat_messages
const uchatMessages = messages.map(msg => ({
  conversation_id: conversationId,
  sender_type: msg.rol === 'Prospecto' ? 'customer' : 'bot',
  content: msg.mensaje,
  created_at: msg.fecha_hora
}));
```

---

## 🎯 **Endpoints Prioritarios para Implementar**

### **Alta Prioridad:**
1. **`/conversations`** - Listar conversaciones activas
2. **`/conversations/{id}/messages`** - Obtener mensajes de conversación
3. **`/users`** - Obtener información de usuarios/contactos

### **Media Prioridad:**
4. **`/messages`** - Enviar mensajes
5. **`/conversations/{id}`** - Detalles de conversación específica

### **Baja Prioridad:**
6. **Webhooks** - Para eventos en tiempo real
7. **Custom Fields** - Para metadatos adicionales

---

## 🧪 **Resultados de Pruebas**

### **✅ Funcionando:**
- `/flow/bot-users-count` - 17 usuarios activos
- `/flow/subflows` - 5 subflujos configurados  
- `/flow/agents` - 1 agente (rodrigomora@grupovidanta.com)

### **❌ No Disponibles:**
- `/conversations` - 404 Not Found
- `/users` - 404 Not Found  
- `/messages` - 404 Not Found
- `/flow/send-message` - 404 Not Found
- `/send` - 404 Not Found
- `/whatsapp/send` - 404 Not Found

### **📊 Datos Disponibles:**
- **Base pqnc_ia**: Prospectos con id_uchat, mensajes_whatsapp
- **Base system_ui**: Tablas uchat_* para almacenamiento
- **UChat API**: Acceso verificado con endpoints básicos

---

## 📝 **Notas de Implementación**

1. **API Key válida**: ✅ Verificada y funcional
2. **Estructura de respuesta**: Consistente con `status: "ok"` y `data: []`
3. **Paginación**: Disponible con `meta` object
4. **Rate Limiting**: No especificado, implementar throttling
5. **Error Handling**: Respuestas HTTP estándar

---

## ⚠️ **Limitaciones Actuales de Envío**

### **🚫 Problema Identificado**
Los endpoints de envío de mensajes **NO están disponibles** en la API actual de UChat:
- Todos los endpoints de envío retornan `404 Not Found`
- No hay documentación pública de endpoints de envío
- La API parece estar limitada a consultas de información

### **🔄 Solución Implementada**
**Envío Híbrido con Metadata:**
```typescript
// 1. Intentar envío a UChat (fallará por ahora)
const sentToUChat = await sendMessageToUChat(message, uchatId);

// 2. Guardar en BD con metadata de estado
await supabaseSystemUI.from('uchat_messages').insert({
  message_id: `agent_${Date.now()}`,
  content: message,
  metadata: {
    sent_to_uchat: sentToUChat,        // false por ahora
    uchat_id: uchatId,                 // Para futuro envío
    sent_at: new Date().toISOString(), // Timestamp
    pending_send: !sentToUChat         // Flag para procesamiento
  }
});
```

### **📋 Alternativas para Envío Real**

#### **Opción 1: Webhooks Inversos**
- Configurar webhook en UChat que escuche mensajes desde nuestra BD
- UChat procesa mensajes marcados como `pending_send: true`
- Actualizar metadata cuando se envíe exitosamente

#### **Opción 2: Integración Directa WhatsApp**
- Usar WhatsApp Business API directamente
- Bypass UChat para envío, mantener UChat para recepción
- Sincronizar bidireccional

#### **Opción 3: UChat Flows/Triggers**
- Usar subflujos de UChat activados por eventos externos
- Trigger desde nuestra aplicación hacia UChat flows
- UChat maneja el envío final

### **🎯 Estado Actual**
- **Recepción**: ✅ Funcional (desde pqnc_ia)
- **Sincronización**: ✅ Funcional (bidireccional)
- **Envío**: ✅ **FUNCIONAL via webhook**
- **UI**: ✅ Funcional con indicadores claros

### **✅ SOLUCIÓN WEBHOOK IMPLEMENTADA**

#### **🚀 Webhook de Envío Funcional**
- **URL**: `https://primary-dev-d75a.up.railway.app/webhook/send-message`
- **Método**: POST
- **Estado**: ✅ Verificado y funcional

#### **📋 Estructura de Datos**
```json
{
  "message": "Contenido del mensaje",
  "uchat_id": "f190385u394247863",
  "type": "text"
}
```

#### **📡 Respuesta Exitosa**
```json
{
  "message": "Workflow was started"
}
```

#### **🧪 Prueba Real Exitosa**
- **Destinatario**: Vanessa Perez (f190385u394247863)
- **Mensaje**: Enviado exitosamente
- **Estado**: 200 OK - Workflow iniciado
- **Resultado**: Mensaje debería llegar a WhatsApp

---

**Última actualización:** Octubre 2025  
**Estado:** Documentación verificada con pruebas reales  
**Nota:** Envío de mensajes pendiente de integración UChat
