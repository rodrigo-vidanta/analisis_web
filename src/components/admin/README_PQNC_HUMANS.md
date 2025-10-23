# 📋 DOCUMENTACIÓN TÉCNICA COMPLETA - MÓDULO PQNC HUMANS

## 🏗️ ARQUITECTURA GENERAL

**Módulo:** Sistema de gestión de usuarios humanos, agentes y administración
**Propósito:** Gestión completa de usuarios, agentes, tokens y configuraciones del sistema
**Base de datos:** `hmmfuhqgvsehkizlfzga.supabase.co` (PQNC Principal)
**Versión:** 5.7.0 (Octubre 2025)
**Estado:** ✅ Producción estable

---

## 🗄️ ESQUEMA DE BASE DE DATOS

### **TABLAS PRINCIPALES**

#### `auth_users` - Usuarios del sistema
```sql
id UUID PRIMARY KEY
email VARCHAR(255) UNIQUE NOT NULL
full_name VARCHAR(255)
first_name VARCHAR(100)
last_name VARCHAR(100)
phone VARCHAR(50)
department VARCHAR(100)
position VARCHAR(100)
organization VARCHAR(255) DEFAULT 'PQNC'
role_name VARCHAR(50)
role_display_name VARCHAR(100)
role_id UUID REFERENCES auth_roles(id)
is_active BOOLEAN DEFAULT true
email_verified BOOLEAN DEFAULT false
last_login TIMESTAMP WITH TIME ZONE
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
avatar_url TEXT
```

#### `auth_roles` - Roles del sistema
```sql
id UUID PRIMARY KEY
name VARCHAR(50) UNIQUE NOT NULL
display_name VARCHAR(100)
description TEXT
permissions JSONB DEFAULT '{}'
is_active BOOLEAN DEFAULT true
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### `auth_user_permissions` - Permisos granulares de usuarios
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE
permission_name VARCHAR(100) NOT NULL
module VARCHAR(50) NOT NULL
sub_module VARCHAR(50)
granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
granted_by UUID REFERENCES auth_users(id)
```

#### `api_tokens` - Tokens API por usuario
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE
token_name VARCHAR(100) NOT NULL
token_hash VARCHAR(255) UNIQUE NOT NULL
monthly_limit INTEGER DEFAULT 1000
current_usage INTEGER DEFAULT 0
last_used TIMESTAMP WITH TIME ZONE
expires_at TIMESTAMP WITH TIME ZONE
is_active BOOLEAN DEFAULT true
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### `agent_templates` - Plantillas de agentes
```sql
id UUID PRIMARY KEY
name VARCHAR(255) NOT NULL
slug VARCHAR(255) UNIQUE
description TEXT
category_id UUID REFERENCES agent_categories(id)
difficulty VARCHAR(20) DEFAULT 'intermediate'
estimated_time VARCHAR(50)
keywords TEXT[]
use_cases TEXT[]
business_context TEXT
industry_tags TEXT[]
vapi_config JSONB
source_type VARCHAR(20) DEFAULT 'manual'
agent_type VARCHAR(20) DEFAULT 'inbound'
original_json_hash VARCHAR(255)
is_active BOOLEAN DEFAULT false
is_public BOOLEAN DEFAULT false
usage_count INTEGER DEFAULT 0
success_rate DECIMAL(5,2) DEFAULT 0
created_by UUID REFERENCES auth_users(id)
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### `agent_categories` - Categorías de agentes
```sql
id UUID PRIMARY KEY
name VARCHAR(100) NOT NULL
slug VARCHAR(100) UNIQUE
description TEXT
color VARCHAR(7) DEFAULT '#3B82F6'
is_active BOOLEAN DEFAULT true
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### `system_config` - Configuraciones globales
```sql
id UUID PRIMARY KEY
config_key VARCHAR(100) UNIQUE NOT NULL
config_value JSONB
description TEXT
is_active BOOLEAN DEFAULT true
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

---

## 🔗 INTEGRACIONES

### **1. Sistema de Autenticación**
- **Supabase Auth:** Gestión completa de usuarios y sesiones
- **JWT Tokens:** Autenticación basada en roles y permisos
- **Row Level Security:** Políticas granulares por usuario y rol

### **2. Sistema de Permisos Granular**
- **Permisos por módulo:** Control fino de acceso a funcionalidades
- **Permisos dinámicos:** Gestión vía interfaz administrativa
- **Herencia de roles:** Permisos base + permisos individuales

### **3. Gestión de Tokens API**
- **Tokens por usuario:** Límites mensuales y seguimiento de uso
- **Autenticación API:** Para integraciones externas
- **Monitoreo de uso:** Estadísticas de consumo por usuario

### **4. Agent Studio Integration**
- **Plantillas de agentes:** Gestión completa del ciclo de vida
- **Editor avanzado:** Interfaz para configuración de agentes
- **Categorización:** Organización por categorías y dificultades

---

## 🧩 SERVICIOS

### **supabaseService** (`src/services/supabaseService.ts`)
**Servicio principal** - 1,242 líneas

**Interfaces principales:**
- `AgentTemplate` - Plantillas de agentes con configuración completa
- `AgentCategory` - Categorías de agentes
- `SystemPrompt` - Prompts del sistema
- `ToolCatalog` - Herramientas disponibles

**Métodos principales:**
- `getAgentTemplates()` - Obtener plantillas por categoría
- `getAgentTemplateById()` - Obtener plantilla específica
- `importAgentFromJson()` - Importar agente desde JSON
- `createAgentFromEditor()` - Crear agente desde editor
- `updateAgentTemplate()` - Actualizar plantilla existente
- `deleteAgentTemplate()` - Eliminar plantilla
- `saveAgentPrompts()` - Guardar prompts de agente
- `saveAgentTools()` - Guardar herramientas de agente
- `saveAgentVapiConfig()` - Guardar configuración VAPI

### **authService** (`src/services/authService.ts`)
**Servicio de autenticación** - Líneas múltiples

**Características:**
- Gestión de sesiones de usuario
- Verificación de permisos
- Manejo de roles y acceso
- Integración con Supabase Auth

### **tokenService** (`src/services/tokenService.ts`)
**Servicio de tokens API** - Líneas múltiples

**Características:**
- Generación de tokens seguros
- Seguimiento de uso mensual
- Límites y cuotas por usuario
- Monitoreo de consumo

---

## 🎨 COMPONENTES FRONTEND

### **UserManagement** (`src/components/admin/UserManagement.tsx`)
**Gestión completa de usuarios** - 1,359 líneas

**Características:**
- **CRUD completo** de usuarios del sistema
- **Gestión de roles** y permisos granulares
- **Subida de avatares** con almacenamiento en Supabase
- **Sistema de evaluadores** personalizable
- **Búsqueda y filtros** avanzados
- **Paginación automática** con lotes grandes

**Estados internos:**
```typescript
interface User {
  id: string;
  email: string;
  full_name: string;
  role_name: string;
  is_active: boolean;
  avatar_url?: string;
  // ... campos adicionales
}
```

### **AgentEditor** (`src/components/admin/AgentEditor.tsx`)
**Editor avanzado de agentes** - 509 líneas

**Características:**
- **Editor de prompts** del sistema
- **Selector de herramientas** con categorías
- **Editor de parámetros** personalizables
- **Editor de squads** para agentes múltiples
- **Vista JSON** para configuración avanzada
- **Validación en tiempo real** de configuración

### **MyAgents** (`src/components/admin/MyAgents.tsx`)
**Gestión personal de agentes** - 169 líneas

**Características:**
- **Lista de agentes** propios (borradores y publicados)
- **Publicación** de agentes al catálogo público
- **Eliminación** segura de agentes
- **Navegación** al editor avanzado

### **TokenManagement** (`src/components/admin/TokenManagement.tsx`)
**Gestión de tokens API** - Líneas múltiples

**Características:**
- **Lista de tokens** por usuario
- **Generación** de nuevos tokens
- **Límites mensuales** configurables
- **Monitoreo de uso** en tiempo real
- **Revocación** de tokens antiguos

### **SystemPreferences** (`src/components/admin/SystemPreferences.tsx`)
**Configuración global del sistema** - Líneas múltiples

**Características:**
- **Mensajes del sistema** personalizables
- **Configuraciones globales** de módulos
- **Preferencias de interfaz** y comportamiento

---

## 🔒 SEGURIDAD Y PERMISOS

### **Sistema de Permisos Granular**
- **Módulos independientes:** Cada módulo tiene permisos específicos
- **Permisos dinámicos:** Gestión vía interfaz administrativa
- **Herencia de roles:** Permisos base + permisos individuales
- **Verificación en tiempo real:** Cada acción verifica permisos

### **Roles Principales**
- **admin:** Acceso completo a todas las funcionalidades
- **vendedor:** Acceso a módulos específicos (Live Monitor, PQNC Humans)
- **evaluador:** Permisos limitados para evaluación
- **usuario:** Acceso básico de lectura

### **Permisos por Módulo**
```typescript
// Ejemplo de permisos granulares
{
  "module": "live_monitor",
  "permissions": ["read", "transfer", "feedback"]
}
```

---

## 📊 MÉTRICAS Y MONITOREO

### **Métricas de Usuarios**
- **Usuarios activos:** Total y por rol
- **Sesiones activas:** Tiempo real de conexiones
- **Último login:** Seguimiento de actividad

### **Métricas de Agentes**
- **Plantillas creadas:** Por usuario y categoría
- **Uso de agentes:** Estadísticas de implementación
- **Tasa de éxito:** Métricas de rendimiento

### **Métricas de Tokens**
- **Uso mensual:** Seguimiento de consumo por usuario
- **Tokens activos:** Cantidad y estado
- **Límites alcanzados:** Alertas de cuotas excedidas

---

## 🔧 CONFIGURACIÓN

### **Configuración de Base de Datos**
```typescript
// Archivo: src/config/supabase.ts
const pqncSupabaseUrl = 'https://hmmfuhqgvsehkizlfzga.supabase.co';
const pqncSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIs...';
const pqncSupabaseServiceKey = 'eyJhbGciOiJIUzI1NiIs...';
```

### **Configuración de Roles**
```sql
-- Roles principales en auth_roles
INSERT INTO auth_roles (name, display_name, description) VALUES
('admin', 'Administrador', 'Acceso completo al sistema'),
('vendedor', 'Vendedor', 'Acceso a módulos de ventas y monitoreo'),
('evaluador', 'Evaluador', 'Permisos limitados para evaluación');
```

### **Configuración de Permisos Iniciales**
```sql
-- Permisos básicos por rol
INSERT INTO auth_user_permissions (user_id, permission_name, module) VALUES
-- Admin: acceso completo
-- Vendedor: módulos específicos
-- Evaluador: permisos limitados
```

---

## 🚀 DEPLOYMENT Y PRODUCCIÓN

### **Base de Datos**
- **Proyecto:** `hmmfuhqgvsehkizlfzga` (PQNC Principal)
- **Tablas:** 7 tablas principales + índices optimizados
- **Triggers:** Funciones automáticas de auditoría
- **RLS:** Políticas granulares por usuario y rol

### **Servicios Externos**
- **Supabase:** Base de datos principal y autenticación
- **Supabase Storage:** Almacenamiento de avatares y archivos
- **Sistema interno:** Integración completa con otros módulos

### **🔐 Configuración de Seguridad**
- **JWT Tokens:** Autenticación segura con expiración
- **API Keys sensibles:** Gestión segura de tokens API
- **Permisos RLS:** Control granular de acceso a datos
- **Auditoría:** Seguimiento de cambios críticos

---

## 🔄 SINCRONIZACIÓN Y ESTADO

### **Estados de Usuarios**
- **Activo:** Usuario con sesión válida
- **Inactivo:** Usuario desactivado por administrador
- **Pendiente:** Usuario sin verificar email
- **Expirado:** Sesión de usuario caducada

### **Estados de Agentes**
- **Borrador:** Agente en desarrollo por usuario
- **Publicado:** Agente disponible en catálogo público
- **Archivado:** Agente removido del catálogo activo

### **Estados de Tokens**
- **Activo:** Token válido y dentro de límites
- **Expirado:** Token fuera de fecha de caducidad
- **Revocado:** Token desactivado por administrador
- **Límite excedido:** Token alcanzó límite mensual

---

## 📈 RENDIMIENTO

### **Optimizaciones Implementadas**
- **Paginación automática:** Manejo eficiente de grandes conjuntos de datos
- **Búsqueda optimizada:** Índices en campos frecuentemente consultados
- **Caching inteligente:** Datos de configuración en memoria
- **Consultas eficientes:** JOINs optimizados y vistas materializadas

### **Métricas de Rendimiento**
- **Tiempo de carga:** < 2 segundos para operaciones CRUD
- **Búsqueda:** < 500ms para consultas complejas
- **Paginación:** Manejo eficiente de > 1000 registros
- **Actualizaciones:** Tiempo real sin bloqueos

---

## 🛠️ MANTENIMIENTO

### **Scripts de Utilidad**
- **Permisos granulares:** `scripts/sql/SIMPLE_LIVE_MONITOR_PERMISSIONS.sql`
- **Configuración inicial:** Scripts de setup incluidos
- **Migraciones:** Sistema de actualización de estructura

### **Monitoreo**
- **Logs de errores:** Seguimiento de operaciones fallidas
- **Métricas de uso:** Estadísticas de actividad por módulo
- **Alertas de seguridad:** Notificaciones de accesos sospechosos

---

## 🎯 CASOS DE USO

1. **Gestión de usuarios** → CRUD completo con roles y permisos
2. **Creación de agentes** → Editor completo para plantillas personalizadas
3. **Gestión de tokens** → Control de acceso API con límites
4. **Configuración del sistema** → Personalización global de módulos
5. **Auditoría de cambios** → Seguimiento de modificaciones críticas

---

## 🔗 DEPENDENCIAS

**Externas:**
- `@supabase/supabase-js` - Cliente base de datos y autenticación
- `react-hook-form` - Gestión avanzada de formularios
- `lucide-react` - Iconografía consistente

**Internas:**
- `AuthContext` - Sistema de autenticación unificado
- `useUserProfile` - Gestión de perfiles de usuario
- `useSystemConfig` - Configuraciones globales del sistema
- `useAnalysisPermissions` - Sistema de permisos granular

---

## 🚨 PUNTOS DE ATENCIÓN

1. **🔐 Seguridad de Tokens:**
   - Tokens API almacenados de forma segura
   - Rotación periódica recomendada
   - Límites de uso estrictos

2. **👥 Gestión de Usuarios:**
   - Verificación de permisos en cada operación
   - Auditoría de cambios críticos
   - Desactivación segura de usuarios

3. **🤖 Plantillas de Agentes:**
   - Validación estricta de configuración VAPI
   - Control de versiones de plantillas
   - Dependencias de herramientas externas

4. **⚡ Rendimiento:**
   - Paginación eficiente para grandes conjuntos de datos
   - Índices optimizados para consultas frecuentes
   - Caching inteligente de datos estáticos

---

## 📋 ESTADO ACTUAL (v5.7.0)

### ✅ **Funcionalidades Operativas**
- Gestión completa de usuarios con roles y permisos granulares
- Sistema avanzado de creación y edición de agentes
- Gestión de tokens API con límites y monitoreo
- Configuración global del sistema completamente funcional
- Paginación automática eficiente para grandes conjuntos de datos

### ⚠️ **Limitaciones Conocidas**
- **Dependencia de permisos:** Requiere configuración inicial precisa
- **Complejidad de configuración:** Múltiples niveles de permisos
- **Tokens sensibles:** Manejo cuidadoso de claves API

### 🔄 **Mejoras Implementadas**
- **Permisos granulares:** Sistema híbrido localStorage + BD
- **Interfaz mejorada:** Diseño consistente con PQNC Humans
- **Paginación avanzada:** Manejo eficiente de grandes datasets
- **Validación mejorada:** Controles estrictos en operaciones críticas

---

## 📚 ARCHIVOS RELACIONADOS

- **src/components/admin/CHANGELOG_PQNC_HUMANS.md** - Historial completo de cambios del módulo
- **src/services/supabaseService.ts** - Servicio principal de agentes
- **src/services/authService.ts** - Servicio de autenticación
- **src/services/tokenService.ts** - Servicio de tokens API
- **src/components/admin/UserManagement.tsx** - Gestión de usuarios
- **src/components/admin/AgentEditor.tsx** - Editor avanzado de agentes
- **src/components/admin/MyAgents.tsx** - Gestión personal de agentes
- **src/components/admin/TokenManagement.tsx** - Gestión de tokens
- **src/components/admin/SystemPreferences.tsx** - Configuración global
- **src/contexts/AuthContext.tsx** - Sistema de autenticación
- **src/hooks/useAnalysisPermissions.ts** - Permisos granulares

---

**Total líneas código analizado:** ~8,000 líneas
**Archivos principales:** 15 archivos core + servicios + esquema BD completo
**Integraciones:** 3 sistemas externos + múltiples internos
**Complejidad:** Muy Alta (usuarios + permisos + agentes + configuración)
