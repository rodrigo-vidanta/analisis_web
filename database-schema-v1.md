# 📊 Esquema de Base de Datos - Versión 1.0

**Fecha:** 2025-01-23  
**Estado:** Estructura actual verificada y funcionando  
**Proyecto:** Clever Agent Builder React

---

## 🗂️ Tablas Principales

### **1. `agent_categories`**
**Propósito:** Categorías de agentes (Atención a Clientes, Ventas, Cobranza, Soporte Técnico)

```sql
CREATE TABLE agent_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    slug VARCHAR NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR,
    icon VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Datos iniciales:**
- Atención a Clientes (slug: `atencion_clientes`, color: `#3B82F6`, icon: `🏪`)
- Ventas (slug: `ventas`, color: `#10B981`, icon: `💰`)
- Cobranza (slug: `cobranza`, color: `#F59E0B`, icon: `💳`)
- Soporte Técnico (slug: `soporte_tecnico`, color: `#8B5CF6`, icon: `🔧`)

---

### **2. `agent_templates`**
**Propósito:** Templates/plantillas de agentes principales

```sql
CREATE TABLE agent_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    slug VARCHAR NOT NULL,
    description TEXT,
    category_id UUID REFERENCES agent_categories(id),
    difficulty VARCHAR,
    estimated_time VARCHAR,
    icon VARCHAR,
    keywords TEXT[],
    use_cases TEXT[],
    business_context TEXT,
    industry_tags TEXT[],
    vapi_config JSONB NOT NULL,
    usage_count INTEGER DEFAULT 0,
    success_rate NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    source_type VARCHAR DEFAULT 'manual',
    original_json_hash VARCHAR,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    agent_type VARCHAR DEFAULT 'inbound' -- 'inbound' | 'outbound'
);
```

---

### **3. `system_prompts`** (Catálogo de Prompts)
**Propósito:** Catálogo genérico de prompts del sistema reutilizables

```sql
CREATE TABLE system_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR NOT NULL,
    content TEXT NOT NULL,
    role VARCHAR DEFAULT 'system', -- 'system' | 'user' | 'assistant'
    category VARCHAR NOT NULL,
    prompt_type VARCHAR NOT NULL,
    keywords TEXT[],
    applicable_categories TEXT[],
    context_tags TEXT[],
    order_priority INTEGER DEFAULT 1,
    is_required BOOLEAN DEFAULT false,
    is_editable BOOLEAN DEFAULT true,
    variables TEXT[],
    language VARCHAR DEFAULT 'es',
    tested_scenarios TEXT[],
    performance_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

### **4. `agent_prompts`** (Tabla de Unión: Agente ↔ Prompts)
**Propósito:** Relación muchos a muchos entre agentes y prompts

```sql
CREATE TABLE agent_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_template_id UUID REFERENCES agent_templates(id) ON DELETE CASCADE,
    system_prompt_id UUID REFERENCES system_prompts(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    is_customized BOOLEAN DEFAULT false,
    custom_content TEXT, -- Contenido personalizado si is_customized = true
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

### **5. `tools_catalog`** (Catálogo de Herramientas)
**Propósito:** Catálogo genérico de herramientas reutilizables

```sql
CREATE TABLE tools_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    tool_type VARCHAR NOT NULL,
    category VARCHAR NOT NULL,
    config JSONB NOT NULL,
    description TEXT NOT NULL,
    complexity VARCHAR,
    keywords TEXT[],
    use_cases TEXT[],
    integration_requirements TEXT[],
    applicable_categories TEXT[],
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    success_rate NUMERIC DEFAULT 0,
    setup_instructions TEXT,
    example_usage JSONB,
    troubleshooting_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

### **6. `agent_tools`** (Tabla de Unión: Agente ↔ Tools)
**Propósito:** Relación muchos a muchos entre agentes y herramientas

```sql
CREATE TABLE agent_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_template_id UUID REFERENCES agent_templates(id) ON DELETE CASCADE,
    tool_id UUID REFERENCES tools_catalog(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    custom_config JSONB, -- Configuración personalizada para este agente
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

### **7. `agent_usage_logs`** (Logs de Uso)
**Propósito:** Registro de uso y métricas de los agentes

```sql
-- Estructura no verificada completamente, tabla auxiliar
CREATE TABLE agent_usage_logs (
    -- Estructura por definir según necesidades futuras
);
```

---

### **8. `optimized_parameters`** (Parámetros Optimizados)
**Propósito:** Almacenamiento de parámetros optimizados por ML/AI

```sql
-- Estructura no verificada completamente, tabla auxiliar
CREATE TABLE optimized_parameters (
    -- Estructura por definir según necesidades futuras
);
```

---

## 🔗 Relaciones y Flujo de Datos

```
agent_categories
    ↓ (1:N)
agent_templates
    ↓ (1:N)          ↓ (1:N)
agent_prompts ← → agent_tools
    ↓ (N:1)          ↓ (N:1)
system_prompts   tools_catalog
```

### **Flujo de Importación de Agente:**
1. **JSON → Análisis** → Detectar estructura y herramientas
2. **agent_templates** → Crear template principal
3. **system_prompts** → Crear/reutilizar prompts en catálogo
4. **agent_prompts** → Crear relaciones agente ↔ prompts
5. **tools_catalog** → Crear/reutilizar herramientas en catálogo
6. **agent_tools** → Crear relaciones agente ↔ herramientas

### **Flujo de Carga de Prompts:**
- **SystemMessageEditor** → Consulta `agent_prompts` con JOIN a `system_prompts`
- **Resultado** → Lista de prompts específicos del agente seleccionado

---

## ⚙️ Configuración Actual

- **RLS (Row Level Security):** DESHABILITADO en todas las tablas (para testing)
- **Índices:** Creados en campos de relación y búsqueda frecuente
- **Restricciones:** Foreign keys configuradas con CASCADE DELETE
- **Unique Constraints:** 
  - `agent_categories.slug`
  - Posible constraint en `agent_templates` (por verificar)

---

## 📝 Notas de Implementación

### **Frontend (React):**
- **SystemMessageEditor:** Usa `agent_prompts` + JOIN para cargar prompts específicos
- **ImportAgent:** Usa `processAndSavePrompts` y `processAndSaveTools` para crear relaciones
- **AgentTemplateCard:** Muestra datos de `agent_templates` con categorías

### **Backend (Supabase):**
- **supabaseAdmin:** Se usa para todas las operaciones (bypass RLS)
- **Tablas de unión:** Permiten reutilización de prompts y herramientas
- **JSONB:** Almacena configuraciones complejas de Vapi

---

## 🎯 Casos de Uso Principales

1. **Importar Agente:** JSON → Análisis → Creación en BD con relaciones
2. **Seleccionar Agente:** Carga prompts y tools específicos del agente
3. **Reutilizar Componentes:** Prompts y tools se reutilizan entre agentes
4. **Editar Agente:** Modificar relaciones sin perder el catálogo base

---

**🔄 Historial de Cambios:**
- **v1.0 (2025-01-23):** Estructura inicial verificada y documentada
