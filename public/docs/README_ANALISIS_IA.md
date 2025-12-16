# 📋 DOCUMENTACIÓN TÉCNICA COMPLETA - MÓDULO ANÁLISIS IA

## 🏗️ ARQUITECTURA GENERAL

**Módulo:** Sistema de análisis inteligente de llamadas con IA
**Propósito:** Análisis automatizado de llamadas con evaluación de calidad y métricas de rendimiento
**Base de datos:** `glsmifhkoaifvaegsozd.supabase.co` (Base Natalia - Análisis IA) + `hmmfuhqgvsehkizlfzga.supabase.co` (PQNC Principal)
**Versión:** 5.7.0 (Octubre 2025)
**Estado:** ✅ Producción estable

---

## 🗄️ ESQUEMA DE BASE DE DATOS

### **TABLAS PRINCIPALES**

#### `call_analysis_summary` - Resúmenes de análisis de llamadas
```sql
id UUID PRIMARY KEY
call_id VARCHAR(255) NOT NULL
agent_name VARCHAR(255)
customer_name VARCHAR(255)
call_type VARCHAR(50)
call_result VARCHAR(50)
duration VARCHAR(20)
quality_score DECIMAL(3,2)
customer_quality VARCHAR(20)
organization VARCHAR(255)
direction VARCHAR(20)
start_time TIMESTAMP WITH TIME ZONE
audio_file_url TEXT
audio_file_name TEXT
agent_performance JSONB
call_evaluation JSONB
comunicacion_data JSONB
customer_data JSONB
service_offered JSONB
script_analysis JSONB
compliance_data JSONB
created_at TIMESTAMP WITH TIME ZONE
updated_at TIMESTAMP WITH TIME ZONE
```

#### `llamadas_ventas` - Datos de llamadas de ventas (compartida)
```sql
id UUID PRIMARY KEY
call_id VARCHAR(255) UNIQUE NOT NULL
fecha_llamada TIMESTAMP WITH TIME ZONE
prospecto UUID REFERENCES prospectos(id)
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
audio_ruta_bucket TEXT
tiene_feedback BOOLEAN DEFAULT false
feedback_resultado VARCHAR(50)
feedback_comentarios TEXT
ended_at TIMESTAMP WITH TIME ZONE
last_event_at TIMESTAMP WITH TIME ZONE
```

#### `prospectos` - Datos de prospectos (compartida)
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
nombre_whatsapp VARCHAR(255)
updated_at TIMESTAMP WITH TIME ZONE
```

#### `feedback_calls` - Sistema de retroalimentación
```sql
id UUID PRIMARY KEY
call_id VARCHAR(255) NOT NULL
feedback_text TEXT NOT NULL
feedback_summary TEXT
created_by UUID REFERENCES auth_users(id)
updated_by UUID REFERENCES auth_users(id)
created_at TIMESTAMP WITH TIME ZONE
updated_at TIMESTAMP WITH TIME ZONE
view_count INTEGER DEFAULT 0
helpful_votes INTEGER DEFAULT 0
```

#### `bookmarks` - Sistema de marcadores
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth_users(id)
call_id VARCHAR(255) NOT NULL
bookmark_color VARCHAR(20) NOT NULL
notes TEXT
created_at TIMESTAMP WITH TIME ZONE
```

---

## 🔗 INTEGRACIONES

### **1. Base de Datos de Análisis**
- **Supabase Analysis:** `glsmifhkoaifvaegsozd.supabase.co`
- **Tablas principales:** `call_analysis_summary`, análisis de llamadas
- **Integración:** Datos híbridos con `llamadas_ventas`

### **2. Base de Datos PQNC Principal**
- **Supabase PQNC:** `hmmfuhqgvsehkizlfzga.supabase.co`
- **Sistema de permisos:** Gestión granular de acceso
- **Usuarios y roles:** Sistema completo de autenticación

### **3. Sistema de Prospectos**
- **Datos compartidos:** Información de prospectos desde múltiples módulos
- **Sincronización:** Bidireccional con llamadas y análisis
- **Campos enriquecidos:** Información adicional para análisis

### **4. Servicios de Audio**
- **Análisis de audio:** Procesamiento de archivos de llamadas
- **Transcripciones:** Análisis de contenido conversacional
- **Calidad de audio:** Métricas técnicas de grabaciones

---

## 🧩 SERVICIOS

### **callAnalysisService** (`src/services/callAnalysisService.ts`)
**Servicio de análisis de llamadas** - 332 líneas

**Características:**
- **Enums de evaluación:** 8 categorías de análisis con valores específicos
- **Análisis de continuidad:** Evaluación de flujo conversacional
- **Detección de intereses:** Identificación automática de niveles de interés
- **Manejo de objeciones:** Clasificación y evaluación de respuestas
- **Cumplimiento de reglas:** Verificación de protocolos establecidos

**Métodos principales:**
- `analyzeCallTranscript()` - Análisis completo de transcripción
- `getAnalysisEnums()` - Obtener enums de evaluación
- `updateAnalysisRecord()` - Actualizar registro de análisis
- `getCallAnalysisById()` - Obtener análisis específico

### **feedbackService** (`src/services/feedbackService.ts`)
**Servicio de retroalimentación** - 490 líneas

**Características:**
- **Sistema completo de feedback:** CRUD completo para comentarios
- **Historial de cambios:** Seguimiento de modificaciones
- **Interacciones:** Votos útiles y reportes
- **Métricas:** Estadísticas de uso y engagement

**Métodos principales:**
- `saveFeedback()` - Guardar nuevo comentario
- `getFeedbackByCallId()` - Obtener comentarios de llamada
- `updateFeedback()` - Actualizar comentario existente
- `deleteFeedback()` - Eliminar comentario

### **bookmarkService** (`src/services/bookmarkService.ts`)
**Servicio de marcadores** - 200+ líneas

**Características:**
- **Sistema de bookmarks:** Organización personal de llamadas importantes
- **Colores categorizados:** Diferentes colores para diferentes tipos
- **Notas privadas:** Comentarios privados por usuario
- **Búsqueda avanzada:** Filtros por color, fecha, usuario

---

## 🎨 COMPONENTES FRONTEND

### **AnalysisIAComplete** (`src/components/analysis/AnalysisIAComplete.tsx`)
**Componente principal de análisis IA** - 2,096 líneas

**Características:**
- **Vista completa de análisis:** Dashboard integral con múltiples métricas
- **Gráfica radar:** Visualización tipo red de métricas de rendimiento
- **Sidebar de prospecto:** Información detallada del cliente
- **Audio integrado:** Reproductor HTML5 nativo
- **Transcripción de chat:** Conversación parseada con roles diferenciados
- **Paginación automática:** Manejo eficiente de grandes conjuntos de datos

**Estados internos:**
```typescript
interface CallRecord {
  id: string;
  call_id: string;
  fecha_llamada: string;
  duracion_segundos: number;
  es_venta_exitosa: boolean;
  // ... múltiples campos de análisis
}
```

### **AnalysisDashboard** (`src/components/analysis/AnalysisDashboard.tsx`)
**Dashboard de análisis** - 1,165 líneas

**Características:**
- **Modos duales:** Natalia IA vs PQNC conmutables
- **Búsqueda avanzada:** Por ID de llamada, fecha, score mínimo
- **Filtros múltiples:** Categoría, interés, análisis inteligente
- **Gráficas interactivas:** Métricas visuales con Chart.js
- **Vista detallada:** Expansión automática de información

### **PQNCDashboard** (`src/components/analysis/PQNCDashboard.tsx`)
**Dashboard específico PQNC** - 2,134 líneas

**Características:**
- **Análisis especializado:** Métricas específicas de PQNC
- **Configuración de ponderación:** Sistema flexible de pesos
- **Vista detallada integrada:** Modal expandido para análisis profundo
- **Sistema de bookmarks:** Organización personal avanzada
- **Feedback integrado:** Comentarios y evaluaciones en contexto

### **DetailedCallView** (`src/components/analysis/DetailedCallView.tsx`)
**Vista detallada de llamadas** - Líneas múltiples

**Características:**
- **Análisis completo:** Métricas detalladas por segmento
- **Transcripción segmentada:** Análisis por partes de la conversación
- **Evaluación granular:** Puntuaciones por categoría específica
- **Comparación temporal:** Seguimiento de progreso del agente

### **UniversalDataView** (`src/components/analysis/UniversalDataView.tsx`)
**Vista universal de datos** - Líneas múltiples

**Características:**
- **Adaptabilidad:** Múltiples modos de visualización
- **Filtros contextuales:** Adaptación según tipo de datos
- **Expansión automática:** Secciones críticas abiertas por defecto
- **Bordes condicionales:** Indicadores visuales según estado

---

## 🔒 SEGURIDAD Y PERMISOS

### **Sistema de Permisos Granular**
- **Módulos independientes:** Natalia IA y PQNC como módulos separados
- **Permisos específicos:** Control fino por funcionalidad
- **Verificación en tiempo real:** Cada operación valida permisos
- **Roles especializados:** Vendedor, evaluador, administrador

### **Permisos por Módulo**
```typescript
// Ejemplo de permisos específicos
{
  "module": "natalia_ia",
  "permissions": ["read_analytics", "view_details", "export_data"]
}
{
  "module": "pqnc",
  "permissions": ["read_analytics", "create_bookmarks", "add_feedback"]
}
```

---

## 📊 MÉTRICAS Y MONITOREO

### **Métricas de Análisis**
- **Calidad promedio:** Score general de llamadas analizadas
- **Tasa de éxito:** Porcentaje de llamadas exitosas
- **Distribución de intereses:** Niveles detectados automáticamente
- **Cumplimiento de reglas:** Adherencia a protocolos establecidos

### **Métricas de Uso**
- **Análisis realizados:** Cantidad total de evaluaciones
- **Tiempo promedio de análisis:** Eficiencia del sistema
- **Uso de bookmarks:** Engagement del sistema de marcadores
- **Feedback generado:** Participación en evaluaciones

### **Métricas Técnicas**
- **Tiempo de respuesta:** Latencia de consultas a BD
- **Uso de memoria:** Recursos consumidos por análisis complejos
- **Errores de procesamiento:** Tasa de fallos en análisis

---

## 🔧 CONFIGURACIÓN

### **Configuración de Base de Datos**
```typescript
// Archivo: src/config/analysisSupabase.ts
const analysisSupabaseUrl = 'https://glsmifhkoaifvaegsozd.supabase.co';
const analysisSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIs...';
```

### **Configuración de Ponderación**
```typescript
// Archivo: src/components/analysis/ponderacionConfig.ts
const PONDERACION_CONFIG = {
  calidad_comunicacion: 25,
  calidad_cliente: 20,
  cumplimiento_script: 20,
  manejo_objeciones: 15,
  discovery_questions: 10,
  cierre_venta: 10
};
```

### **Configuración de Análisis**
```typescript
// Modos disponibles
const ANALYSIS_MODES = {
  natalia: 'Análisis tradicional con métricas estándar',
  pqnc: 'Análisis avanzado con ponderación personalizable'
};
```

---

## 🚀 DEPLOYMENT Y PRODUCCIÓN

### **Base de Datos**
- **Proyecto Análisis:** `glsmifhkoaifvaegsozd` (Base Natalia)
- **Proyecto PQNC:** `hmmfuhqgvsehkizlfzga` (Sistema principal)
- **Tablas principales:** `call_analysis_summary`, análisis híbrido
- **Integración:** Datos compartidos con otros módulos

### **Servicios Externos**
- **Supabase:** Base de datos principal y realtime
- **Sistema de audio:** Procesamiento de archivos de llamadas
- **Chart.js:** Visualización de métricas y gráficos

### **🔐 Configuración de Seguridad**
- **Permisos granulares:** Control específico por módulo y funcionalidad
- **Auditoría:** Seguimiento de accesos y modificaciones
- **Encriptación:** Datos sensibles protegidos
- **Validación estricta:** Verificación de permisos en cada operación

---

## 🔄 SINCRONIZACIÓN Y ESTADO

### **Estados de Análisis**
- **Pendiente:** Análisis no iniciado
- **En proceso:** Análisis siendo ejecutado
- **Completado:** Análisis terminado exitosamente
- **Error:** Fallo en el proceso de análisis

### **Modos de Análisis**
- **Natalia IA:** Análisis tradicional con métricas estándar
- **PQNC:** Análisis avanzado con configuración de ponderación
- **Híbrido:** Combinación de ambos enfoques

### **Sincronización de Datos**
- **Datos híbridos:** `call_analysis_summary` + `llamadas_ventas`
- **Tiempo real:** Actualización automática de métricas
- **Consistencia:** Validación cruzada entre fuentes de datos

---

## 📈 RENDIMIENTO

### **Optimizaciones Implementadas**
- **Consultas eficientes:** Índices optimizados para búsquedas frecuentes
- **Paginación inteligente:** Manejo eficiente de grandes conjuntos de datos
- **Caching estratégico:** Datos estáticos en memoria
- **Procesamiento asíncrono:** Análisis en background

### **Métricas de Rendimiento**
- **Tiempo de carga inicial:** < 3 segundos para dashboard completo
- **Búsqueda avanzada:** < 1 segundo para consultas complejas
- **Paginación:** Manejo eficiente de > 1000 registros
- **Gráficas interactivas:** Renderizado fluido de visualizaciones

---

## 🛠️ MANTENIMIENTO

### **Scripts de Utilidad**
- **Configuración inicial:** Scripts de setup incluidos
- **Migraciones:** Sistema de actualización de estructura
- **Permisos:** Configuración granular de acceso
- **Limpieza:** Scripts de mantenimiento de datos

### **Monitoreo**
- **Logs de errores:** Seguimiento de operaciones fallidas
- **Métricas de uso:** Estadísticas de actividad por módulo
- **Alertas de rendimiento:** Notificaciones de problemas técnicos

---

## 🎯 CASOS DE USO

1. **Análisis básico** → Evaluación automática de calidad de llamadas
2. **Análisis avanzado** → Configuración personalizada de ponderación PQNC
3. **Seguimiento de agentes** → Métricas de rendimiento individuales
4. **Gestión de bookmarks** → Organización personal de llamadas importantes
5. **Sistema de feedback** → Comentarios y evaluaciones colaborativas

---

## 🔗 DEPENDENCIAS

**Externas:**
- `@supabase/supabase-js` - Cliente base de datos
- `chart.js` - Visualización de métricas
- `framer-motion` - Animaciones fluidas
- `lucide-react` - Iconografía consistente

**Internas:**
- `AuthContext` - Sistema de autenticación unificado
- `useAnalysisPermissions` - Sistema de permisos granular
- `ponderacionConfig` - Configuración de métricas
- Servicios de análisis y retroalimentación

---

## 🚨 PUNTOS DE ATENCIÓN

1. **🔐 Seguridad de Datos:**
   - Datos sensibles de llamadas almacenados
   - Control estricto de acceso por permisos
   - Auditoría de consultas críticas

2. **🤖 Calidad de Análisis:**
   - Dependencia de calidad de transcripciones
   - Configuración de ponderación requiere ajuste fino
   - Validación continua de métricas generadas

3. **📊 Rendimiento de Consultas:**
   - Grandes conjuntos de datos requieren optimización
   - Consultas complejas pueden afectar tiempo de respuesta
   - Paginación eficiente crítica para UX

4. **🔄 Consistencia de Datos:**
   - Fuentes múltiples requieren sincronización
   - Validación cruzada entre módulos
   - Mantenimiento de integridad referencial

---

## 📋 ESTADO ACTUAL (v5.7.0)

### ✅ **Funcionalidades Operativas**
- Análisis completo de llamadas con métricas automatizadas
- Sistema dual Natalia IA vs PQNC completamente funcional
- Dashboard integrado con gráficos interactivos
- Sistema de bookmarks y feedback completamente operativo
- Paginación automática eficiente para grandes datasets

### ⚠️ **Limitaciones Conocidas**
- **Dependencia de calidad de audio** para análisis preciso
- **Configuración inicial compleja** de ponderación PQNC
- **Sincronización múltiple** requiere mantenimiento constante

### 🔄 **Mejoras Implementadas**
- **Diseño híbrido mejorado** con datos enriquecidos
- **Sistema de permisos granular** completamente funcional
- **Paginación automática** para superar límites de registros
- **Interfaz optimizada** con navegación fluida

---

## 📚 ARCHIVOS RELACIONADOS

- **src/components/analysis/CHANGELOG_ANALISIS_IA.md** - Historial completo de cambios del módulo
- **src/services/callAnalysisService.ts** - Servicio principal de análisis
- **src/services/feedbackService.ts** - Servicio de retroalimentación
- **src/services/bookmarkService.ts** - Servicio de marcadores
- **src/components/analysis/AnalysisIAComplete.tsx** - Componente principal
- **src/components/analysis/AnalysisDashboard.tsx** - Dashboard dual
- **src/components/analysis/PQNCDashboard.tsx** - Dashboard PQNC
- **src/components/analysis/DetailedCallView.tsx** - Vista detallada
- **src/components/analysis/UniversalDataView.tsx** - Vista universal
- **src/components/analysis/ponderacionConfig.ts** - Configuración de métricas
- **src/hooks/useAnalysisPermissions.ts** - Sistema de permisos

---

**Total líneas código analizado:** ~12,000 líneas
**Archivos principales:** 15 archivos core + servicios + configuración completa
**Integraciones:** 4 sistemas externos + múltiples internos
**Complejidad:** Muy Alta (IA + análisis + múltiples modos + permisos granulares)