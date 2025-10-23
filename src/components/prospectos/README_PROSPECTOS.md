# 📋 DOCUMENTACIÓN TÉCNICA COMPLETA - MÓDULO PROSPECTOS

## 🏗️ ARQUITECTURA GENERAL

**Módulo:** Sistema de gestión de prospectos con data grid avanzado
**Propósito:** Gestión completa de prospectos con filtros inteligentes, navegación integrada y conexión con otros módulos
**Base de datos:** `glsmifhkoaifvaegsozd.supabase.co` (Base Natalia - Análisis) + `hmmfuhqgvsehkizlfzga.supabase.co` (PQNC Principal) + `zbylezfyagwrxoecioup.supabase.co` (SystemUI)
**Versión:** 5.7.0 (Octubre 2025)
**Estado:** ✅ Producción estable

---

## 🗄️ ESQUEMA DE BASE DE DATOS

### **TABLAS PRINCIPALES**

#### `prospectos` - Datos de prospectos principales
```sql
id UUID PRIMARY KEY
nombre_completo VARCHAR(255)
nombre VARCHAR(100)
apellido_paterno VARCHAR(100)
apellido_materno VARCHAR(100)
nombre_whatsapp VARCHAR(255)
edad INTEGER
cumpleanos DATE
estado_civil VARCHAR(50)
nombre_conyuge VARCHAR(255)
ciudad_residencia VARCHAR(100)
requiere_atencion_humana BOOLEAN DEFAULT false
contactado_por_vendedor BOOLEAN DEFAULT false
etapa VARCHAR(100)
ingresos VARCHAR(50)
score VARCHAR(20)
whatsapp VARCHAR(50)
telefono_principal VARCHAR(50)
telefono_adicional VARCHAR(50)
email VARCHAR(255)
observaciones TEXT
id_uchat VARCHAR(255)
id_airtable VARCHAR(255)
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
campana_origen VARCHAR(100)
interes_principal VARCHAR(255)
destino_preferencia TEXT[]
tamano_grupo INTEGER
cantidad_menores INTEGER
viaja_con VARCHAR(100)
asesor_asignado VARCHAR(255)
crm_data JSONB
id_dynamics VARCHAR(255)
```

#### `llamadas_ventas` - Llamadas asociadas a prospectos (compartida)
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

#### `uchat_conversations` - Conversaciones de chat (compartida con Live Chat)
```sql
id UUID PRIMARY KEY
conversation_id VARCHAR(255) UNIQUE
bot_id UUID
prospect_id UUID
customer_phone VARCHAR(50)
customer_name VARCHAR(255)
platform VARCHAR(50) DEFAULT 'whatsapp'
status VARCHAR(50) DEFAULT 'active'
assigned_agent_id UUID
handoff_enabled BOOLEAN DEFAULT false
priority VARCHAR(20) DEFAULT 'medium'
last_message_at TIMESTAMP
message_count INTEGER DEFAULT 0
unread_count INTEGER DEFAULT 0
```

---

## 🔗 INTEGRACIONES

### **1. Base de Datos de Análisis**
- **Supabase Analysis:** `glsmifhkoaifvaegsozd.supabase.co`
- **Tablas principales:** `prospectos`, análisis y gestión de datos
- **Integración:** Datos híbridos con otros módulos del sistema

### **2. Base de Datos PQNC Principal**
- **Supabase PQNC:** `hmmfuhqgvsehkizlfzga.supabase.co`
- **Sistema de permisos:** Gestión granular de acceso
- **Usuarios y roles:** Sistema completo de autenticación

### **3. Base de Datos SystemUI**
- **Supabase SystemUI:** `zbylezfyagwrxoecioup.supabase.co`
- **Conversaciones de chat:** Verificación de conversaciones activas
- **Integración:** Conexión bidireccional con módulo Live Chat

### **4. Servicios Externos**
- **Sistema de llamadas:** Integración con llamadas de ventas
- **Sistema de chat:** Navegación automática a conversaciones activas
- **Sistema de análisis:** Conexión con análisis de llamadas

---

## 🧩 SERVICIOS

### **prospectsService** (`src/services/prospectsService.ts`)
**Servicio principal de prospectos** - 468 líneas

**Características:**
- **Operaciones CRUD completas:** Crear, leer, actualizar, eliminar prospectos
- **Búsqueda avanzada:** Por teléfono, nombre, email, múltiples criterios
- **Filtros inteligentes:** Por etapa, campaña, asesor asignado
- **Gestión de contactos:** Verificación de existencia previa
- **Integración múltiple:** Con llamadas, chats y análisis

**Métodos principales:**
- `getProspects()` - Obtener lista de prospectos con filtros
- `getProspectById()` - Obtener prospecto específico
- `createProspect()` - Crear nuevo prospecto
- `updateProspect()` - Actualizar prospecto existente
- `deleteProspect()` - Eliminar prospecto
- `findProspectByPhone()` - Búsqueda avanzada por teléfono
- `searchProspects()` - Búsqueda general con múltiples criterios

### **Integración con Otros Servicios**
- **liveMonitorService:** Para llamadas asociadas a prospectos
- **uchatService:** Para conversaciones de chat activas
- **callAnalysisService:** Para análisis de llamadas

---

## 🎨 COMPONENTES FRONTEND

### **ProspectosManager** (`src/components/prospectos/ProspectosManager.tsx`)
**Componente principal de gestión** - 1,411 líneas

**Características:**
- **Data grid avanzado:** Visualización de 23+ prospectos reales
- **Filtros múltiples:** Etapa, score, campaña origen, asesor
- **Sorting dinámico:** Ordenamiento por cualquier columna
- **Sidebar informativo:** Información completa del prospecto seleccionado
- **Historial de llamadas:** Lista de llamadas asociadas al prospecto
- **Modal de detalle:** Vista completa de llamada con transcripción y audio
- **Navegación integrada:** Acceso directo a Live Chat y Análisis IA

**Estados internos:**
```typescript
interface Prospecto {
  id: string;
  nombre_completo?: string;
  whatsapp?: string;
  email?: string;
  ciudad_residencia?: string;
  estado_civil?: string;
  etapa?: string;
  // ... múltiples campos adicionales
}
```

**Características técnicas:**
- **Paginación automática:** Manejo eficiente de grandes conjuntos de datos
- **Búsqueda en tiempo real:** Filtros aplicados dinámicamente
- **Estados de carga:** Indicadores visuales de operaciones
- **Responsive design:** Adaptable a diferentes tamaños de pantalla

---

## 🔒 SEGURIDAD Y PERMISOS

### **Sistema de Permisos**
- **Control de acceso:** Basado en roles y permisos específicos
- **Permisos granulares:** Acceso controlado por funcionalidad
- **Verificación en tiempo real:** Cada operación valida permisos
- **Auditoría:** Seguimiento de accesos y modificaciones

### **Roles con Acceso**
- **admin:** Acceso completo a gestión de prospectos
- **vendedor:** Acceso limitado para consulta y actualización
- **developer:** Acceso completo para mantenimiento

### **Permisos Específicos**
```typescript
// Ejemplo de permisos específicos del módulo
{
  "module": "prospectos",
  "permissions": ["read", "create", "update", "delete", "export"]
}
```

---

## 📊 MÉTRICAS Y MONITOREO

### **Métricas de Prospectos**
- **Total de prospectos:** Cantidad acumulada en sistema
- **Prospectos activos:** Por etapa y estado de actividad
- **Tasa de conversión:** Prospectos que se convierten en ventas
- **Distribución geográfica:** Ubicación y origen de prospectos

### **Métricas de Uso**
- **Consultas realizadas:** Estadísticas de búsquedas y filtros
- **Modificaciones:** Seguimiento de cambios realizados
- **Navegación cruzada:** Uso de integraciones con otros módulos

### **Métricas Técnicas**
- **Tiempo de respuesta:** Latencia de consultas a BD
- **Uso de recursos:** Memoria y procesamiento consumidos
- **Errores de operación:** Tasa de fallos en operaciones CRUD

---

## 🔧 CONFIGURACIÓN

### **Configuración de Base de Datos**
```typescript
// Archivo: src/services/prospectsService.ts
const ANALYSIS_SUPABASE_URL = 'https://glsmifhkoaifvaegsozd.supabase.co';
const ANALYSIS_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIs...';
```

### **Configuración de Integraciones**
```typescript
// Múltiples bases de datos utilizadas
const DATABASES = {
  analysis: 'glsmifhkoaifvaegsozd.supabase.co',    // Prospectos y análisis
  pqnc: 'hmmfuhqgvsehkizlfzga.supabase.co',        // Sistema principal
  systemUI: 'zbylezfyagwrxoecioup.supabase.co'     // Live Chat
};
```

### **Configuración de Filtros**
```typescript
// Etapas disponibles para filtrado
const ETAPAS_DISPONIBLES = [
  'Nuevo', 'Contacto inicial', 'Interesado', 'Calificado',
  'Propuesta enviada', 'Negociación', 'Cierre', 'Perdido'
];
```

---

## 🚀 DEPLOYMENT Y PRODUCCIÓN

### **Base de Datos**
- **Proyecto Análisis:** `glsmifhkoaifvaegsozd` (Base Natalia)
- **Proyecto PQNC:** `hmmfuhqgvsehkizlfzga` (Sistema principal)
- **Proyecto SystemUI:** `zbylezfyagwrxoecioup` (Live Chat)
- **Integración:** Datos compartidos entre múltiples proyectos

### **Servicios Externos**
- **Supabase múltiple:** Tres proyectos conectados
- **Sistema de análisis:** Procesamiento de datos de prospectos
- **Sistema de chat:** Verificación de conversaciones activas

### **🔐 Configuración de Seguridad**
- **Permisos RLS:** Configurados en todas las tablas
- **Autenticación múltiple:** Verificación cruzada entre proyectos
- **Auditoría:** Seguimiento de operaciones críticas
- **Encriptación:** Datos sensibles protegidos

---

## 🔄 SINCRONIZACIÓN Y ESTADO

### **Estados de Prospectos**
- **Nuevo:** Prospecto recién ingresado al sistema
- **Contacto inicial:** Primer contacto realizado
- **Interesado:** Mostrando interés en productos
- **Calificado:** Prospecto validado y calificado
- **Propuesta enviada:** Propuesta comercial entregada
- **Negociación:** En proceso de negociación
- **Cierre:** Venta concretada
- **Perdido:** Prospecto no interesado o perdido

### **Sincronización de Datos**
- **Datos híbridos:** Información compartida entre módulos
- **Tiempo real:** Actualización automática de estados
- **Consistencia:** Validación cruzada entre fuentes
- **Integridad:** Mantenimiento de relaciones referenciales

### **Flujos de Navegación**
- **Desde prospecto a llamada:** Acceso directo a historial de llamadas
- **Desde prospecto a chat:** Navegación automática a conversación activa
- **Desde prospecto a análisis:** Acceso a análisis detallado de llamadas

---

## 📈 RENDIMIENTO

### **Optimizaciones Implementadas**
- **Consultas eficientes:** Índices optimizados para búsquedas frecuentes
- **Paginación inteligente:** Manejo eficiente de grandes conjuntos de datos
- **Caching estratégico:** Datos estáticos en memoria del componente
- **Procesamiento asíncrono:** Operaciones no bloqueantes

### **Métricas de Rendimiento**
- **Tiempo de carga inicial:** < 3 segundos para data grid completo
- **Búsqueda avanzada:** < 1 segundo para consultas complejas
- **Paginación:** Manejo eficiente de > 1000 registros
- **Navegación fluida:** Transiciones suaves entre vistas

---

## 🛠️ MANTENIMIENTO

### **Scripts de Utilidad**
- **Análisis de prospectos:** `scripts/analyze-prospects-table.js`
- **Configuración inicial:** Scripts de setup incluidos
- **Migraciones:** Sistema de actualización de estructura
- **Limpieza:** Scripts de mantenimiento de datos antiguos

### **Monitoreo**
- **Logs de errores:** Seguimiento de operaciones fallidas
- **Métricas de uso:** Estadísticas de actividad por módulo
- **Alertas de rendimiento:** Notificaciones de problemas técnicos
- **Auditoría de cambios:** Seguimiento de modificaciones críticas

---

## 🎯 CASOS DE USO

1. **Gestión básica** → Consulta y navegación de prospectos existentes
2. **Búsqueda avanzada** → Filtros múltiples para encontrar prospectos específicos
3. **Seguimiento de llamadas** → Historial completo de interacciones por prospecto
4. **Navegación integrada** → Acceso directo a chats activos y análisis
5. **Gestión de campañas** → Seguimiento por campaña de origen

---

## 🔗 DEPENDENCIAS

**Externas:**
- `@supabase/supabase-js` - Cliente base de datos múltiple
- `framer-motion` - Animaciones elegantes y fluidas
- `lucide-react` - Iconografía vectorial consistente
- `chart.js` - Gráficas para análisis de llamadas

**Internas:**
- `AuthContext` - Sistema de autenticación unificado
- `analysisSupabase` - Configuración base de datos análisis
- `supabaseSystemUI` - Configuración base de datos SystemUI
- Servicios de llamadas, chats y análisis

---

## 🚨 PUNTOS DE ATENCIÓN

1. **🔐 Seguridad de Datos:**
   - Información personal sensible almacenada
   - Control estricto de acceso por permisos
   - Auditoría de consultas y modificaciones

2. **📊 Calidad de Datos:**
   - Dependencia de calidad de información de origen
   - Validación continua de campos críticos
   - Mantenimiento de consistencia entre módulos

3. **🔄 Sincronización Múltiple:**
   - Tres bases de datos requieren coordinación
   - Validación cruzada entre fuentes de datos
   - Mantenimiento de integridad referencial

4. **⚡ Rendimiento de Consultas:**
   - Grandes conjuntos de datos requieren optimización
   - Consultas complejas pueden afectar tiempo de respuesta
   - Paginación eficiente crítica para UX

---

## 📋 ESTADO ACTUAL (v5.7.0)

### ✅ **Funcionalidades Operativas**
- Gestión completa de prospectos con data grid avanzado
- Sistema de filtros múltiples e inteligentes
- Sidebar informativo con información completa del prospecto
- Historial de llamadas integrado con modal de detalle
- Navegación automática a Live Chat y Análisis IA
- Paginación automática eficiente para grandes datasets

### ⚠️ **Limitaciones Conocidas**
- **Dependencia de múltiples bases de datos** requiere coordinación
- **Sincronización compleja** entre tres proyectos Supabase
- **Validación manual** requerida para algunos campos críticos

### 🔄 **Mejoras Implementadas**
- **Data grid avanzado** con 23+ columnas configurables
- **Sistema de filtros múltiples** con búsqueda inteligente
- **Sidebar informativo** con información completa y estructurada
- **Modal de detalle de llamadas** con transcripción y análisis
- **Navegación integrada** con otros módulos del sistema

---

## 📚 ARCHIVOS RELACIONADOS

- **src/components/prospectos/CHANGELOG_PROSPECTOS.md** - Historial completo de cambios del módulo
- **src/services/prospectsService.ts** - Servicio principal de operaciones CRUD
- **src/components/prospectos/ProspectosManager.tsx** - Componente principal de gestión
- **src/services/liveMonitorService.ts** - Servicio de llamadas (integración)
- **src/services/uchatService.ts** - Servicio de chat (integración)
- **src/services/callAnalysisService.ts** - Servicio de análisis (integración)
- **src/config/analysisSupabase.ts** - Configuración base de datos análisis
- **src/config/supabaseSystemUI.ts** - Configuración base de datos SystemUI

---

**Total líneas código analizado:** ~2,000 líneas
**Archivos principales:** 6 archivos core + servicios + configuración completa
**Integraciones:** 5 sistemas externos + múltiples internos
**Complejidad:** Alta (múltiples BD + integración cruzada + navegación compleja)
