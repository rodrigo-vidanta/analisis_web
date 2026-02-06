# 📋 DOCUMENTACIÓN TÉCNICA COMPLETA - MÓDULO LIVE CHAT

## 🏗️ ARQUITECTURA GENERAL

**Módulo:** Sistema de chat en tiempo real integrado con UChat API
**Propósito:** Atención automática de prospectos vía WhatsApp con transferencia humana automática
**Base de datos:** `hmmfuhqgvsehkizlfzga.supabase.co` (SystemUI) + `glsmifhkoaifvaegsozd.supabase.co` (PQNC IA)
**API Externa:** `https://www.uchat.com.au/api`
**Versión:** 5.3.0 (Octubre 2025)
**Estado:** ✅ Producción estable

---

## 🗄️ ESQUEMA DE BASE DE DATOS

### **TABLAS PRINCIPALES (7 tablas)**

#### `uchat_bots` - Configuración de chatbots
```sql
id UUID PRIMARY KEY
bot_name VARCHAR(255) NOT NULL
bot_description TEXT
api_key VARCHAR(500) NOT NULL  -- API key de UChat
api_url VARCHAR(500) DEFAULT 'https://www.uchat.com.au/api'
webhook_url VARCHAR(500)
is_active BOOLEAN DEFAULT true
bot_config JSONB DEFAULT '{}'
created_by UUID REFERENCES auth_users(id)
```

#### `uchat_conversations` - Conversaciones activas
```sql
id UUID PRIMARY KEY
conversation_id VARCHAR(255) UNIQUE NOT NULL  -- ID de UChat
bot_id UUID REFERENCES uchat_bots(id) ON DELETE CASCADE
prospect_id UUID  -- Referencia prospectos (opcional)
customer_phone VARCHAR(50) NOT NULL
customer_name VARCHAR(255)
platform VARCHAR(50) DEFAULT 'whatsapp' -- whatsapp, telegram, etc.
status VARCHAR(50) DEFAULT 'active' -- active, transferred, closed, archived
assigned_agent_id UUID REFERENCES auth_users(id)
assignment_date TIMESTAMP WITH TIME ZONE
handoff_enabled BOOLEAN DEFAULT false
handoff_triggered_at TIMESTAMP WITH TIME ZONE
last_message_at TIMESTAMP WITH TIME ZONE
message_count INTEGER DEFAULT 0
tags TEXT[] DEFAULT '{}'
priority VARCHAR(20) DEFAULT 'medium' -- low, medium, high, urgent
metadata JSONB DEFAULT '{}'
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### `uchat_messages` - Mensajes individuales
```sql
id UUID PRIMARY KEY
message_id VARCHAR(255) UNIQUE NOT NULL  -- ID de UChat
conversation_id UUID REFERENCES uchat_conversations(id) ON DELETE CASCADE
sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'bot', 'agent'))
sender_id VARCHAR(255) -- ID del remitente en UChat
sender_name VARCHAR(255)
message_type VARCHAR(50) DEFAULT 'text' -- text, image, audio, video, document, location
content TEXT
media_url VARCHAR(500)
media_type VARCHAR(100)
media_size INTEGER
is_read BOOLEAN DEFAULT false
read_at TIMESTAMP WITH TIME ZONE
delivered_at TIMESTAMP WITH TIME ZONE
metadata JSONB DEFAULT '{}'
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### `uchat_agent_assignments` - Asignaciones agente-conversación
```sql
id UUID PRIMARY KEY
conversation_id UUID REFERENCES uchat_conversations(id) ON DELETE CASCADE
agent_id UUID REFERENCES auth_users(id) ON DELETE CASCADE
assigned_by UUID REFERENCES auth_users(id)
assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
unassigned_at TIMESTAMP WITH TIME ZONE
is_active BOOLEAN DEFAULT true
assignment_reason VARCHAR(255)
notes TEXT
```

#### `uchat_handoff_rules` - Reglas transferencia automática
```sql
id UUID PRIMARY KEY
bot_id UUID REFERENCES uchat_bots(id) ON DELETE CASCADE
rule_name VARCHAR(255) NOT NULL
trigger_type VARCHAR(50) NOT NULL -- message_received, keyword_detected, time_based, manual
trigger_conditions JSONB NOT NULL -- Condiciones específicas del trigger
is_active BOOLEAN DEFAULT true
priority INTEGER DEFAULT 1
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### `uchat_metrics` - Métricas y estadísticas
```sql
id UUID PRIMARY KEY
bot_id UUID REFERENCES uchat_bots(id) ON DELETE CASCADE
agent_id UUID REFERENCES auth_users(id)
metric_date DATE NOT NULL
conversations_total INTEGER DEFAULT 0
conversations_assigned INTEGER DEFAULT 0
conversations_resolved INTEGER DEFAULT 0
messages_sent INTEGER DEFAULT 0
messages_received INTEGER DEFAULT 0
avg_response_time INTEGER DEFAULT 0 -- en segundos
handoffs_triggered INTEGER DEFAULT 0
customer_satisfaction DECIMAL(3,2)
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### `uchat_webhook_events` - Eventos webhook recibidos
```sql
id UUID PRIMARY KEY
bot_id UUID REFERENCES uchat_bots(id) ON DELETE CASCADE
event_type VARCHAR(100) NOT NULL
event_data JSONB NOT NULL
processed BOOLEAN DEFAULT false
processed_at TIMESTAMP WITH TIME ZONE
error_message TEXT
retry_count INTEGER DEFAULT 0
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

---

## 🔗 INTEGRACIONES

### **1. UChat API Externa**
- **URL base:** `https://www.uchat.com.au/api`
- **Autenticación:** Bearer token con `api_key`
- **Métodos disponibles:** `/flow/bot-users-count`, `/flow/subflows`, `/flow/agents`
- **Métodos no disponibles:** `/conversations`, `/users`, `/messages`
- **Webhooks:** Eventos recibidos procesados automáticamente

### **2. Sistema de Prospectos**
- **Servicio:** `prospectsService.findProspectByPhone()`
- **Función:** Vincular conversaciones con prospectos existentes
- **Campo:** `prospect_id` en `uchat_conversations`
- **Sincronización:** Bidireccional con `prospectos` (pqnc_ia)

### **3. Sistema de Usuarios/Agents**
- **Tabla:** `auth_users` (agentes humanos)
- **Asignación:** `assigned_agent_id` en conversaciones
- **Permisos:** RLS basado en autenticación

### **4. Webhook Railway**
- **URL:** `https://primary-dev-d75a.up.railway.app/webhook/`
- **Funciones:** `send-message`, `pause_bot`, `tools`
- **Uso:** Bridge entre frontend y sistemas externos

### **5. VAPI Integration**
- **Control de bot:** Pausa/reactivación automática (15 minutos)
- **Estado:** Monitoreo de llamadas activas
- **Transferencia:** Desde llamadas a conversaciones

---

## 🧩 SERVICIOS

### **UChatService** (`src/services/uchatService.ts`)
**Clase principal** - 732 líneas

**Métodos principales:**
- `getBots()` - Obtener bots configurados
- `getConversations(filters?)` - Listar conversaciones con filtros
- `getMessages(conversationId)` - Mensajes de conversación
- `assignConversation()` - Asignar agente a conversación
- `processWebhookEvent()` - Procesar eventos webhook

**Integración API UChat:**
- `sendMessage()` - Enviar mensaje vía API
- `getUChatConversations()` - Obtener conversaciones remotas
- `disableBot()` - Deshabilitar bot en conversación

**Lógica de handoff automático:**
- `checkHandoffRules()` - Evaluar reglas de transferencia
- `triggerHandoff()` - Ejecutar transferencia automática
- `findAvailableAgent()` - Buscar agente disponible

### **UChatProductionService** (`src/services/uchatProductionService.ts`)
**Versión producción** - 340 líneas

**Diferencias con UChatService:**
- Conexión directa a tablas reales (no mock)
- Logging detallado de operaciones
- Manejo robusto de errores

### **UChatRealIntegrationService** (`src/services/uchatRealIntegrationService.ts`)
**Integración real** - 200 líneas

**Características:**
- Sincronización bidireccional
- Manejo de contactos UChat
- Webhook processing avanzado

---

## 🔄 FLUJOS DE DATOS

### **Flujo Webhook → Base de Datos**
1. **Evento recibido** en webhook Railway
2. **Validación** de autenticación y formato
3. **Procesamiento** según tipo de evento:
   - `message_received` → crear mensaje + verificar reglas handoff
   - `conversation_started` → crear conversación nueva
   - `conversation_ended` → actualizar estado
4. **Almacenamiento** en `uchat_webhook_events` + tablas correspondientes
5. **Triggers automáticos:** actualizar contadores, timestamps

### **Flujo Agente → Cliente**
1. **Agente selecciona** conversación en dashboard
2. **Carga mensajes** desde `uchat_messages`
3. **Marca como leídos** automáticamente
4. **Envío de respuesta** vía webhook Railway → UChat API
5. **Actualización** de métricas y estadísticas

### **Flujo Handoff Automático**
1. **Mensaje recibido** de cliente
2. **Evaluación de reglas** en `uchat_handoff_rules`
3. **Si cumple condiciones:** deshabilitar bot + asignar agente
4. **Notificación** al agente asignado
5. **Transferencia** del control de conversación

### **Sincronización con Prospectos**
1. **Obtener prospectos activos** desde `pqnc_ia.prospectos`
2. **Filtrar por id_uchat** no NULL y etapas activas
3. **Crear/actualizar conversaciones** en `system_ui.uchat_conversations`
4. **Sincronizar mensajes recientes** desde `mensajes_whatsapp`
5. **Intervalos:** 15s general, 10s conversación abierta

---

## 🎨 COMPONENTES FRONTEND

### **LiveChatComplete** (`src/components/chat/LiveChatComplete.tsx`)
**Componente principal** - 762 líneas

**Características:**
- **3 columnas ajustables:** conversaciones | bloques | chat
- **Grupos temporales:** mensajes agrupados por fecha/hora
- **Búsqueda:** por nombre, teléfono, email
- **Estados visuales:** colores por prioridad y estado

**Estado interno:**
```typescript
interface ConversationBlock {
  date: string;
  message_count: number;
  first_message_time: string;
  last_message_time: string;
  messages: Message[];
}
```

### **LiveChatDashboard** (`src/components/chat/LiveChatDashboard.tsx`)
**Panel administrativo** - 392 líneas

**Características:**
- **Métricas reales:** totales, activas, transferidas, cerradas
- **Filtros avanzados:** estado, prioridad, búsqueda
- **Acciones rápidas:** asignar, marcar como leído
- **Estadísticas:** tasa de handoff, tiempos respuesta

### **LiveChatCanvas** (`src/components/chat/LiveChatCanvas.tsx`)
**Canvas principal** - 1700+ líneas

**Características:**
- **Gestión conversaciones:** lista, filtros, búsqueda
- **Control bot:** pausa/reactivación automática
- **Envío mensajes:** integración webhook
- **Estado visual:** indicadores tiempo real

### **LiveChatModule** (`src/components/chat/LiveChatModule.tsx`)
**Módulo integrado** - 150 líneas

**Características:**
- Configuración de bots vía interfaz
- Gestión de reglas de handoff
- Monitoreo en tiempo real

---

## 🔒 SEGURIDAD Y PERMISOS

### **Row Level Security (RLS)**
- **Activado** en todas las tablas de chat
- **Políticas:**
  - Usuarios autenticados pueden ver datos
  - Solo admins pueden modificar bots
  - Agentes pueden actualizar conversaciones asignadas
  - Mensajes accesibles según conversación

### **Autenticación**
- **Cliente público:** `supabaseSystemUI` (operaciones normales)
- **Cliente admin:** `supabaseSystemUIAdmin` (configuración)
- **API Keys:** Almacenadas en `bot_config` (encriptadas)

---

## 📊 MÉTRICAS Y MONITOREO

### **Métricas Calculadas**
- **Total conversaciones:** contador acumulado
- **Conversaciones activas:** estado = 'active'
- **Tasa handoff:** (transferidas / total) * 100
- **Tiempo respuesta promedio:** calculado en métricas diarias

### **Triggers Automáticos**
- **Contador mensajes:** `update_conversation_message_count()`
- **Timestamps:** `update_uchat_updated_at()`
- **Procesamiento eventos:** automático según tipo

---

## 🔧 CONFIGURACIÓN Y CREDENCIALES

### **⚠️ IMPORTANTE: Referencias de Credenciales**

**Todas las credenciales están documentadas en los archivos de configuración:**

#### **🔑 UChat API**
- **Archivo:** `src/services/uchatService.ts` (línea 160)
- **URL Base:** `https://www.uchat.com.au/api`
- **API Key:** `hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5`
- **Estado:** ✅ Verificada y funcional

#### **🗄️ Base de Datos SystemUI (Live Chat)**
- **Archivo:** `src/config/supabaseSystemUI.ts`
- **URL:** Configurada en `.env` → `VITE_SYSTEM_UI_SUPABASE_URL`
- **Anon Key:** Configurada en `.env` → `VITE_SYSTEM_UI_SUPABASE_ANON_KEY`
- **Nota:** ⚠️ SystemUI fue migrado a PQNC_AI (misma BD). Service keys NUNCA en frontend.

#### **🗄️ Base de Datos PQNC IA (Prospectos)**
- **Archivo:** `src/config/analysisSupabase.ts`
- **URL:** Configurada en `.env` → `VITE_ANALYSIS_SUPABASE_URL`
- **Anon Key:** Configurada en `.env` → `VITE_ANALYSIS_SUPABASE_ANON_KEY`

#### **🌐 Webhook Railway**
- **Archivo:** Mencionado en múltiples componentes
- **URL:** `https://primary-dev-d75a.up.railway.app/webhook/send-message`
- **Estado:** ✅ Verificado y funcional

### **📋 Configuración de Bot (datos incluidos)**
```json
{
  "bot_name": "Bot Principal WhatsApp",
  "api_key": "hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5",
  "auto_handoff": true,
  "handoff_trigger": "user_message",
  "supported_platforms": ["whatsapp"]
}
```

### **🔄 Regla Handoff Automática**
```json
{
  "trigger_type": "message_received",
  "auto_disable_bot": true,
  "assign_to_available_agent": true,
  "priority": "medium"
}
```

### **⚙️ Variables de Entorno (.env)**
```bash
# UChat API (opcional, también en código fuente)
VITE_UCHAT_API_KEY=hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5

# Webhook Railway (opcional)
VITE_WEBHOOK_BASE_URL=https://primary-dev-d75a.up.railway.app

# Supabase SystemUI
VITE_SYSTEM_UI_SUPABASE_URL=https://zbylezfyagwrxoecioup.supabase.co
VITE_SYSTEM_UI_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Supabase Analysis (Natalia)
VITE_NATALIA_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
VITE_NATALIA_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

---

## 🚀 DEPLOYMENT Y PRODUCCIÓN

### **Base de Datos**
- **Proyecto SystemUI:** `hmmfuhqgvsehkizlfzga` (zbylezfyagwrxoecioup.supabase.co)
- **Proyecto Análisis:** `glsmifhkoaifvaegsozd` (glsmifhkoaifvaegsozd.supabase.co)
- **Tablas:** 7 tablas principales + índices optimizados
- **Triggers:** 3 funciones automáticas
- **RLS:** Políticas configuradas

### **Servicios Externos**
- **UChat API:** `https://www.uchat.com.au/api`
- **Webhook Railway:** `https://primary-dev-d75a.up.railway.app/`
- **Supabase:** Conexión directa a tablas reales

### **🔐 Configuración de Seguridad**
- **API Keys sensibles:** Almacenadas en código fuente (⚠️ revisar seguridad)
- **Variables de entorno:** Opcionales como respaldo
- **Permisos RLS:** Configurados para acceso autenticado
- **Webhooks externos:** Requieren validación estricta

---

## 🔄 SINCRONIZACIÓN Y ESTADO

### **Estado de Conversaciones**
- **Activa:** Bot manejando conversación
- **Transferida:** Agente humano asignado
- **Cerrada:** Conversación finalizada
- **Archivada:** Removida del dashboard activo

### **Sincronización Bidireccional**
- **Webhook → BD:** Eventos externos actualizan estado
- **BD → API:** Cambios internos se reflejan en UChat
- **Real-time:** Frontend actualizado automáticamente

### **Intervalos de Sincronización**
- **General:** 15 segundos (nuevas conversaciones + mensajes)
- **Conversación abierta:** 10 segundos (solo mensajes activos)
- **Triggers automáticos:** Eventos webhook procesados inmediatamente

---

## 📈 RENDIMIENTO

### **Índices Optimizados**
- **Consultas frecuentes:** teléfono, estado, agente asignado
- **Ordenamiento:** último mensaje, fecha creación
- **Búsqueda:** nombre, teléfono, email

### **Límites y Paginación**
- **Carga inicial:** 50 conversaciones máximo
- **Mensajes:** 50 mensajes por conversación
- **Búsqueda:** filtros aplicados en frontend

---

## 🛠️ MANTENIMIENTO

### **Scripts de Utilidad**
- **Creación tablas:** `scripts/sql/create_uchat_tables.sql`
- **Setup sistema:** `scripts/setup-uchat-system.js`
- **Mejoras realtime:** `scripts/sql/chat_realtime_improvements.sql`
- **Datos iniciales:** bot y reglas preconfiguradas

### **Monitoreo**
- **Errores webhook:** registrados en `uchat_webhook_events`
- **Reintentos:** hasta 3 reintentos automáticos
- **Logs:** detallados en consola del navegador

---

## 🎯 CASOS DE USO

1. **Consulta simple** → Bot responde automáticamente
2. **Consulta compleja** → Handoff automático a agente
3. **Seguimiento** → Agente continúa conversación
4. **Cierre** → Conversación marcada como cerrada
5. **Análisis** → Métricas y estadísticas generadas

---

## 🔗 DEPENDENCIAS

**Externas:**
- `@supabase/supabase-js` - Cliente base de datos
- `react-markdown` - Renderizado mensajes

**Internas:**
- `prospectsService` - Búsqueda prospectos
- `supabaseSystemUI` - Configuración BD
- Servicios de autenticación y usuarios

---

## 🚨 PUNTOS DE ATENCIÓN

1. **🔐 Seguridad de Credenciales:**
   - API Keys almacenadas en código fuente (revisar seguridad)
   - Variables de entorno como respaldo opcional
   - Rotación periódica de claves recomendada

2. **🌐 Webhooks externos** requieren validación estricta

3. **🤖 Handoff automático** puede asignar a agentes no disponibles

4. **🔄 Sincronización** depende de conectividad con UChat API

5. **📈 Escalabilidad** limitada por cuotas UChat API

6. **⚡ Rendimiento** - Múltiples llamadas API pueden afectar UX

---

## 📋 ESTADO ACTUAL (v5.3.0)

### ✅ **Funcionalidades Operativas**
- Lista de conversaciones activas (18 actuales)
- Chat en tiempo real con UChat
- Sincronización automática cada 15 segundos
- Pausa/reactivación de bot IA (15 minutos automático)
- Envío de mensajes de agente funcional
- Selección automática desde otros módulos
- Navegación desde sidebars (Prospectos/Análisis IA)

### ⚠️ **Limitaciones Conocidas**
- **Ordenamiento**: Solo considera mensajes de agentes, NO del bot
- **Indicadores**: "Enviando..." aparece en conversación activa, no específica
- **Indicadores no leídos**: No implementado (falta columna en BD)

### 🔄 **Sincronización Implementada**
- **Bidireccional** con `pqnc_ia.prospectos`
- **Mensajes recientes** desde `mensajes_whatsapp`
- **Estados automáticos** basado en actividad
- **Sin rerenders** durante sincronización

---

## 📚 ARCHIVOS RELACIONADOS

- **src/components/chat/CHANGELOG_LIVECHAT.md** - Historial completo de cambios del módulo
- **scripts/sql/create_uchat_tables.sql** - Esquema completo de base de datos
- **scripts/sql/chat_realtime_improvements.sql** - Mejoras y triggers de BD

---

**Total líneas código analizado:** ~3,500 líneas
**Archivos principales:** 12 archivos core + 6 servicios + esquema BD completo
**Integraciones:** 5 sistemas externos + 4 internos
**Complejidad:** Alta (múltiples protocolos y estados en tiempo real)
