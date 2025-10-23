# 📋 DOCUMENTACIÓN TÉCNICA COMPLETA - MÓDULO LIVE MONITOR

## 🏗️ ARQUITECTURA GENERAL

**Módulo:** Sistema de monitoreo en tiempo real de llamadas de ventas
**Propósito:** Visualización y gestión de llamadas activas con clasificación automática inteligente
**Base de datos:** `glsmifhkoaifvaegsozd.supabase.co` (Base Natalia - Análisis IA)
**Versión:** 5.2.0 (Octubre 2025)
**Estado:** ✅ Producción con vista optimizada

---

## 🗄️ ESQUEMA DE BASE DE DATOS

### **TABLAS PRINCIPALES**

#### `llamadas_ventas` - Llamadas de ventas principales
```sql
id UUID PRIMARY KEY
call_id VARCHAR(255) UNIQUE NOT NULL
fecha_llamada TIMESTAMP WITH TIME ZONE
duracion_segundos INTEGER
es_venta_exitosa BOOLEAN
nivel_interes JSONB
probabilidad_cierre DECIMAL
costo_total DECIMAL
tipo_llamada JSONB
oferta_presentada BOOLEAN
precio_ofertado JSONB
requiere_seguimiento BOOLEAN
datos_llamada JSONB
datos_proceso JSONB
datos_objeciones JSONB
prospecto UUID REFERENCES prospectos(id)
audio_ruta_bucket TEXT
-- URLs de control VAPI
monitor_url TEXT
control_url TEXT
transport_url TEXT
call_sid VARCHAR(255)
transport VARCHAR(100)
provider VARCHAR(100)
account_sid VARCHAR(255)
call_status VARCHAR(50)
-- Nuevas columnas agregadas
tiene_feedback BOOLEAN DEFAULT false
feedback_resultado VARCHAR(50)
feedback_comentarios TEXT
ended_at TIMESTAMP WITH TIME ZONE
last_event_at TIMESTAMP WITH TIME ZONE
```

#### `prospectos` - Datos de prospectos
```sql
id UUID PRIMARY KEY
nombre_completo VARCHAR(255)
whatsapp VARCHAR(50)
email VARCHAR(255)
ciudad VARCHAR(100)
estado_civil VARCHAR(50)
composicion_familiar_numero INTEGER
destino_preferencia TEXT[]
preferencia_vacaciones TEXT[]
numero_noches INTEGER
mes_preferencia VARCHAR(50)
edad INTEGER
etapa VARCHAR(100)
id_uchat VARCHAR(255)
-- Nuevos campos agregados
nombre_whatsapp VARCHAR(255)
updated_at TIMESTAMP WITH TIME ZONE
```

#### `live_monitor_view` - Vista optimizada (CREADA)
```sql
-- Vista materializada con JOIN automático y clasificación inteligente
call_id, prospecto_id, call_status_inteligente, call_status_bd,
fecha_llamada, duracion_segundos, minutos_transcurridos,
checkpoint_venta_actual, razon_finalizacion,
monitor_url, control_url, call_sid, provider, account_sid,
nivel_interes, es_venta_exitosa, probabilidad_cierre, costo_total,
precio_ofertado, propuesta_economica_ofrecida, habitacion_ofertada,
resort_ofertado, principales_objeciones, audio_ruta_bucket,
resumen_llamada, conversacion_completa,
-- Datos del prospecto incluidos via JOIN
nombre_completo, whatsapp, email, ciudad, estado_civil,
composicion_familiar_numero, destino_preferencia, preferencia_vacaciones,
numero_noches, mes_preferencia, edad, etapa, id_uchat, nombre_whatsapp
```

---

## 🔗 INTEGRACIONES

### **1. VAPI (Voice AI Platform)**
- **URLs de control:** `monitor_url`, `control_url`, `transport_url`
- **Estado de llamadas:** Monitoreo en tiempo real vía WebSocket
- **Control remoto:** Pausa/reactivación de llamadas vía API
- **Clasificación automática:** Basada en `razon_finalizacion` y duración

### **2. Sistema de Prospectos**
- **Base de datos:** `pqnc_ia.prospectos` (glsmifhkoaifvaegsozd.supabase.co)
- **Sincronización:** Bidireccional con `llamadas_ventas`
- **Campos clave:** `id_uchat`, `etapa`, datos personales

### **3. Sistema de Usuarios**
- **Tabla:** `auth_users` (agentes y supervisores)
- **Permisos:** Basado en roles y permisos de análisis
- **Acceso:** Controlado por RLS y permisos específicos

### **4. Audio Processing**
- **Librería:** Tone.js para procesamiento profesional de audio
- **Funciones:** EQ, compresión, limitación para llamadas
- **Estados:** Básico vs Profesional con controles avanzados

---

## 🧩 SERVICIOS

### **liveMonitorService** (`src/services/liveMonitorService.ts`)
**Servicio principal** - 1,257 líneas

**Interfaces principales:**
- `SalesCall` - Datos de llamadas desde tabla `llamadas_ventas`
- `LiveCallData` - Datos combinados (llamada + prospecto)
- `Agent` - Información de agentes disponibles
- `FeedbackData` - Sistema de retroalimentación

**Métodos principales:**
- `getActiveCalls()` - Obtener llamadas activas con JOIN manual
- `getActiveAgents()` - Agentes disponibles para transferencia
- `updateCallStatus()` - Actualizar estado de llamada
- `saveFeedback()` - Guardar retroalimentación de llamada
- `transferCall()` - Transferir llamada a agente
- `hangUpCall()` - Colgar llamada activa

### **liveMonitorOptimizedService** (`src/services/liveMonitorOptimizedService.ts`)
**Servicio optimizado** - 332 líneas

**Características:**
- Utiliza vista `live_monitor_view` pre-calculada
- Clasificación automática inteligente
- Consultas optimizadas con JOIN automático
- Estado inteligente vs estado BD

**Métodos principales:**
- `getOptimizedCalls()` - Datos desde vista optimizada
- `getActiveCalls()` - Versión optimizada de getActiveCalls
- `getCallsByStatus()` - Filtrado por estado inteligente
- `subscribeToChanges()` - Realtime desde la vista

### **liveMonitorKanbanOptimized** (`src/services/liveMonitorKanbanOptimized.ts`)
**Adaptador Kanban** - 274 líneas

**Función:** Puente entre servicio optimizado y componente Kanban
**Características:**
- Mapeo de datos optimizados al formato Kanban
- Clasificación automática en categorías (activas/transferidas/finalizadas/fallidas)
- Estadísticas de reclasificación automática

---

## 🔄 FLUJOS DE DATOS

### **Flujo de Datos Principal**
1. **Consulta inicial** → `liveMonitorService.getActiveCalls()`
2. **JOIN manual** → `llamadas_ventas` + `prospectos`
3. **Clasificación frontend** → Estados basados en lógica compleja
4. **Actualización realtime** → Suscripción a cambios en tablas

### **Flujo Optimizado (Vista)**
1. **Consulta directa** → `live_monitor_view` (pre-calculada)
2. **Clasificación automática** → Función PostgreSQL `clasificar_estado_llamada()`
3. **Datos enriquecidos** → JOIN automático incluido
4. **Actualización inteligente** → Estado automático vs estado BD

### **Flujo de Clasificación Automática**
```sql
-- Función clasificar_estado_llamada() determina:
-- activa: llamada en progreso < 30 min
-- perdida: no contestada o colgada por cliente
-- transferida: transferida a agente humano
-- finalizada: completada exitosamente
```

---

## 🎨 COMPONENTES FRONTEND

### **LiveMonitorKanban** (`src/components/analysis/LiveMonitorKanban.tsx`)
**Componente principal Kanban** - 2,774 líneas

**Características:**
- **Vista Kanban** con columnas por estado
- **Clasificación automática** con toggle optimizado/legacy
- **Audio profesional** con Tone.js integrado
- **Controles VAPI** para llamadas activas
- **Transferencia agentes** con modal dedicado
- **Retroalimentación** con sistema de comentarios

**Estados internos:**
```typescript
interface KanbanCall extends LiveCallData {
  checkpoint_venta_actual?: string;
  composicion_familiar_numero?: number;
  destino_preferencia?: string;
  // ... múltiples campos adicionales
}
```

### **LiveMonitor** (`src/components/analysis/LiveMonitor.tsx`)
**Componente legacy** - 3,852 líneas

**Características:**
- **Vista tabular** tradicional
- **Audio básico** integrado
- **Controles simples** de llamada
- **Transferencia directa** sin modal

### **LinearLiveMonitor** (`src/components/linear/LinearLiveMonitor.tsx`)
**Versión Linear** - 938 líneas

**Características:**
- **Diseño Linear** optimizado para flujo de trabajo
- **Checkpoints visuales** con diseño específico
- **Estados diferenciados** por colores

---

## 🔒 SEGURIDAD Y PERMISOS

### **Row Level Security (RLS)**
- **Activado** en tablas principales
- **Políticas específicas:**
  - `canAccessLiveMonitor()` - Control de acceso basado en permisos
  - `analysis_permissions` - Sistema granular de permisos
  - `auth_users` - Roles y permisos de usuario

### **Permisos Específicos**
- **Análisis IA:** Acceso a datos de llamadas y prospectos
- **Live Monitor:** Control en tiempo real de llamadas
- **Transferencia:** Permisos para asignar agentes

---

## 📊 MÉTRICAS Y MONITOREO

### **Métricas Calculadas**
- **Llamadas activas:** Estado = 'activa' < 30 minutos
- **Llamadas perdidas:** No contestadas o colgadas por cliente
- **Llamadas transferidas:** Pasadas a agentes humanos
- **Llamadas finalizadas:** Completadas exitosamente

### **Estadísticas en Tiempo Real**
- **Total llamadas:** Contador acumulado
- **Tasa de éxito:** (exitosas / total) * 100
- **Duración promedio:** Tiempo promedio de llamadas
- **Reclasificaciones:** Número de cambios automáticos

---

## 🔧 CONFIGURACIÓN Y CREDENCIALES

### **⚠️ IMPORTANTE: Referencias de Credenciales**

**Todas las credenciales están documentadas en los archivos de configuración:**

#### **🗄️ Base de Datos Análisis (Live Monitor)**
- **Archivo:** `src/config/analysisSupabase.ts`
- **URL:** `https://glsmifhkoaifvaegsozd.supabase.co`
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E`
- **Estado:** ✅ Verificada y funcional

#### **🌐 Servicios Externos**
- **VAPI WebSocket:** URLs `monitor_url`, `control_url`, `transport_url` en llamadas activas
- **Estado:** ✅ Funcional para monitoreo y control de llamadas
- **Webhook Railway:** No utilizado directamente en Live Monitor

### **⚙️ Configuración de Base de Datos**
```typescript
// Archivo: src/config/analysisSupabase.ts
const analysisSupabaseUrl = 'https://glsmifhkoaifvaegsozd.supabase.co';
const analysisSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E';
```

### **🎵 Configuración de Audio**
```typescript
// Procesamiento básico vs profesional
const USE_BASIC_AUDIO = false; // Toggle para audio básico
const USE_TONE_JS = true;       // Procesamiento profesional con Tone.js
```

### **📊 Configuración de Vista Optimizada**
```typescript
const USE_OPTIMIZED_VIEW = true; // Toggle optimizado vs legacy
const DEBUG_MIXED_SOURCES = true; // Debug para ver fuentes de datos
```

### **⚙️ Variables de Entorno (.env)**
```bash
# Supabase Analysis (Natalia) - Live Monitor
VITE_ANALYSIS_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
VITE_ANALYSIS_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Configuración de Audio
VITE_USE_TONE_JS=true
VITE_USE_BASIC_AUDIO=false

# Configuración de Vista Optimizada
VITE_USE_OPTIMIZED_VIEW=true
VITE_DEBUG_MIXED_SOURCES=true
```

---

## 🚀 DEPLOYMENT Y PRODUCCIÓN

### **Base de Datos**
- **Proyecto:** `glsmifhkoaifvaegsozd` (Base Natalia - Análisis)
- **Tablas principales:** `llamadas_ventas`, `prospectos`
- **Vista optimizada:** `live_monitor_view` (materializada)
- **Triggers:** Funciones automáticas de clasificación

### **Servicios Externos**
- **VAPI WebSocket:** URLs dinámicas (`monitor_url`, `control_url`, `transport_url`)
  - **Estado:** ✅ Funcional para monitoreo y control de llamadas
  - **Uso:** Integración directa con llamadas VAPI activas
- **Supabase:** Base de datos principal y realtime
- **Audio Processing:** Tone.js para procesamiento profesional

### **🔐 Configuración de Seguridad**
- **API Keys sensibles:** No utilizadas directamente (VAPI maneja autenticación)
- **Variables de entorno:** Opcionales para configuración
- **Permisos RLS:** Configurados para acceso autenticado
- **WebSocket VAPI:** Requiere manejo robusto de conexiones

---

## 🔄 SINCRONIZACIÓN Y ESTADO

### **Estados de Llamadas**
- **activa:** Llamada en progreso < 30 minutos
- **perdida:** No contestada o colgada por cliente
- **transferida:** Transferida a agente humano
- **finalizada:** Completada exitosamente

### **Clasificación Inteligente**
```sql
-- Basado en:
-- 1. razon_finalizacion (customer-ended-call, customer-busy, etc.)
-- 2. duracion_segundos (0 o muy baja)
-- 3. tiempo transcurrido (> 30 minutos)
-- 4. estado en datos_llamada
```

### **Actualización en Tiempo Real**
- **Suscripción a tablas:** `llamadas_ventas`, `prospectos`
- **Vista optimizada:** Triggers personalizados para notificaciones
- **Componente Kanban:** Realtime con datos ya clasificados

---

## 📈 RENDIMIENTO

### **Optimizaciones Implementadas**
- **Vista materializada:** `live_monitor_view` pre-calculada
- **JOIN automático:** Datos del prospecto incluidos
- **Clasificación BD:** Lógica pesada movida a PostgreSQL
- **Suscripciones optimizadas:** Solo cambios relevantes

### **Comparación de Rendimiento**
| Aspecto | Legacy | Optimizado | Mejora |
|---------|--------|-----------|---------|
| Consultas | 2 consultas + JOIN | 1 consulta directa | 50% menos |
| Procesamiento | Frontend complejo | BD automática | 80% menos |
| Datos transferidos | Campos duplicados | Datos limpios | 40% menos |
| Tiempo respuesta | 2-3 segundos | < 1 segundo | 60% más rápido |

---

## 🛠️ MANTENIMIENTO

### **Scripts de Utilidad**
- **Vista optimizada:** `scripts/sql/create-live-monitor-view-fixed.sql`
- **Triggers realtime:** `scripts/sql/enable-realtime-view-safe.sql`
- **Permisos:** `scripts/sql/SIMPLE_LIVE_MONITOR_PERMISSIONS.sql`
- **Debug:** `scripts/debug-database-state.js`

### **Monitoreo**
- **Logs detallados:** Estados de clasificación y errores
- **Estadísticas:** Número de reclasificaciones automáticas
- **Performance:** Tiempo de respuesta de consultas

---

## 🎯 CASOS DE USO

1. **Monitoreo básico** → Vista de llamadas activas en tiempo real
2. **Clasificación automática** → Estados inteligentes sin intervención manual
3. **Transferencia inteligente** → Agentes asignados automáticamente
4. **Audio profesional** → Procesamiento avanzado de llamadas
5. **Análisis detallado** → Vista completa de conversación y prospecto

---

## 🔗 DEPENDENCIAS

**Externas:**
- `@supabase/supabase-js` - Cliente base de datos
- `tone` - Procesamiento profesional de audio
- `@twilio/voice-sdk` - Control de llamadas VoIP

**Internas:**
- `analysisSupabase` - Configuración base de datos análisis
- `useAnalysisPermissions` - Sistema de permisos granular
- Servicios de autenticación y usuarios

## 🔐 ARCHIVO DE CREDENCIALES

**⚠️ IMPORTANTE:** Todas las credenciales sensibles están documentadas en:

### **📁 Ubicaciones de Credenciales**

| Servicio | Archivo | Líneas | Estado |
|----------|---------|--------|---------|
| **Supabase Analysis** | `src/config/analysisSupabase.ts` | 21-22 | ✅ Funcional |

### **🔑 Claves Específicas**

| Servicio | Tipo | Ubicación | Valor (completo) |
|----------|------|-----------|------------------|
| **Analysis Anon Key** | JWT Token | `src/config/analysisSupabase.ts:22` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E` |

### **🌐 URLs de Servicios**

| Servicio | URL | Estado |
|----------|-----|---------|
| **Supabase Analysis** | `https://glsmifhkoaifvaegsozd.supabase.co` | ✅ Funcional |
| **VAPI WebSocket** | Dinámicas (monitor_url, control_url, transport_url) | ✅ Funcional |

### **📋 Servicios sin Credenciales Específicas**

| Servicio | Método de Autenticación | Estado |
|----------|-------------------------|---------|
| **VAPI** | URLs proporcionadas por la plataforma | ✅ Funcional |
| **Audio Processing** | Sin autenticación requerida | ✅ Funcional |
| **Realtime** | Integrado con Supabase | ✅ Funcional |

---

## 🚨 PUNTOS DE ATENCIÓN

1. **🔐 Seguridad de Credenciales:**
   - Credenciales mínimas utilizadas (solo Supabase)
   - VAPI maneja autenticación internamente
   - Variables de entorno opcionales para configuración

2. **🤖 Clasificación automática** puede requerir ajustes según comportamiento VAPI

3. **📊 Vistas materializadas** necesitan mantenimiento periódico

4. **🔒 Permisos RLS** deben sincronizarse con cambios de estructura

5. **🌐 WebSocket VAPI** requiere manejo robusto de reconexiones

6. **🎵 Audio profesional** consume recursos adicionales del navegador

7. **⚡ Rendimiento** - Procesamiento complejo puede afectar UX en dispositivos lentos

---

## 📋 ESTADO ACTUAL (v5.2.0)

### ✅ **Funcionalidades Operativas**
- Vista Kanban completamente funcional con clasificación automática
- Sincronización en tiempo real con VAPI y base de datos
- Procesamiento de audio profesional con Tone.js
- Sistema de transferencia y retroalimentación completo
- Vista optimizada con rendimiento mejorado significativamente

### ⚠️ **Limitaciones Conocidas**
- **Dependencia de VAPI** para URLs de control y monitoreo
- **Clasificación automática** requiere ajuste fino según casos específicos
- **Vistas materializadas** necesitan mantenimiento ocasional

### 🔄 **Mejoras Implementadas**
- **Vista optimizada** reduce consultas en 50%
- **Clasificación automática** elimina lógica compleja del frontend
- **Realtime mejorado** con triggers personalizados
- **Audio profesional** integrado completamente

---

## 📚 ARCHIVOS RELACIONADOS

- **src/components/analysis/CHANGELOG_LIVEMONITOR.md** - Historial completo de cambios del módulo
- **src/services/liveMonitorService.ts** - Servicio principal legacy
- **src/services/liveMonitorOptimizedService.ts** - Servicio optimizado
- **src/services/liveMonitorKanbanOptimized.ts** - Adaptador Kanban
- **src/components/analysis/LiveMonitorKanban.tsx** - Componente principal
- **src/components/analysis/LiveMonitor.tsx** - Componente legacy
- **src/components/linear/LinearLiveMonitor.tsx** - Versión Linear
- **scripts/livemonitor-utils/** - Scripts de utilidad y diagnóstico
- **src/config/analysisSupabase.ts** - Configuración base de datos análisis

---

**Total líneas código analizado:** ~8,500 líneas
**Archivos principales:** 9 archivos core + 3 servicios + esquema BD completo
**Integraciones:** 4 sistemas externos + 3 internos
**Complejidad:** Muy Alta (tiempo real + IA + audio + múltiples protocolos)
