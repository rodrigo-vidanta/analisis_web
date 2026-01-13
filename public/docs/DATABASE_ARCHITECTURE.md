# 🏗️ Arquitectura de Bases de Datos

## 📊 **Dos Instancias Separadas de Supabase**

### 🔵 **Base Principal (Templates & Agents)**
**URL**: `rnhejbuubpbnojalljso.supabase.co`
**Archivo**: `src/config/supabase.ts` → `supabaseMain` y `supabaseMainAdmin`

**📋 Funcionalidades:**
- ✅ **Constructor de Agentes**
- ✅ **Gestión de Plantillas** 
- ✅ **Catálogo de Tools**
- ✅ **System Prompts**
- ✅ **Categorías de Agentes**

**📁 Archivos que la usan:**
- `src/services/supabaseService.ts`
- `src/components/admin/SystemMessageEditor.tsx`
- `src/components/admin/SquadEditor*.tsx`
- `src/components/admin/ToolsSelector.tsx`
- `src/components/admin/AgentEditor.tsx`
- `src/components/admin/AgentTemplateCard.tsx`
- `src/components/admin/*Agent*.tsx`

---

### 🟢 **Base PQNC (Auth, Analysis, Storage)**
**URL**: `hmmfuhqgvsehkizlfzga.supabase.co`
**Archivo**: `src/config/pqncSupabase.ts` → `pqncSupabase` y `pqncSupabaseAdmin`

**🔐 Funcionalidades:**
- ✅ **Sistema de Autenticación** (auth_users, auth_roles, auth_permissions)
- ✅ **Gestión de Usuarios** (permisos, roles, avatares)
- ✅ **Análisis PQNC** (calls, call_segments, análisis de llamadas)
- ✅ **Storage** (buckets: user-avatars, system-assets)
- ✅ **Configuración del Sistema** (branding, temas)
- ✅ **Subpermisos de Análisis** (evaluadores)

**📁 Archivos que la usan:**
- `src/services/authService.ts`
- `src/contexts/AuthContext.tsx`
- `src/components/admin/UserManagement.tsx`
- `src/components/admin/AvatarUpload.tsx`
- `src/components/admin/SystemPreferences.tsx`
- `src/components/analysis/PQNCDashboard.tsx`

---

### 🟡 **Base Análisis Natalia**
**URL**: `glsmifhkoaifvaegsozd.supabase.co`
**Archivo**: `src/config/analysisSupabase.ts` → `analysisSupabase`

**📈 Funcionalidades:**
- ✅ **Análisis de Natalia** (logs específicos de Natalia)
- ✅ **Dashboard Natalia**

**📁 Archivos que la usan:**
- `src/components/analysis/NataliaDashboard.tsx` (si existe)
- Análisis específicos de Natalia

---

## 🎯 **Reglas de Uso**

### ✅ **Usa Base Principal** cuando:
- Creas/editas agentes
- Trabajas con plantillas
- Gestionas tools y prompts
- Constructor de agentes

### ✅ **Usa Base PQNC** cuando:
- Login/logout de usuarios
- Gestionas permisos y roles
- Subes avatares o logos
- Cambias configuración del sistema
- Análisis de PQNC Humans

### ✅ **Usa Base Natalia** cuando:
- Análisis específicos de Natalia
- Dashboard de Natalia

---

## 🔧 **Funciones SQL por Base**

### 🔵 **Base Principal**
```sql
-- Funciones relacionadas con agentes y plantillas
-- (no hay funciones SQL específicas actualmente)
```

### 🟢 **Base PQNC**
```sql
-- ✅ Funciones creadas y funcionando:
authenticate_user(email, password)
create_user_with_role(email, password, name, role, ...)
update_user_info(user_id, name, role_id, ...)
get_user_permissions(user_id)
configure_evaluator_analysis_permissions(user_id, natalia, pqnc)
get_evaluator_analysis_config(user_id)
update_system_config(key, value, user_id)
upload_user_avatar(user_id, url, filename, size, type)
```

### 🟡 **Base Natalia**
```sql
-- Sin funciones SQL específicas
-- Solo consultas directas a tablas
```

---

## 🚨 **Importante**

**NO mezclar las conexiones.** Cada funcionalidad debe usar su base correspondiente para evitar errores 404 y problemas de conexión.

**✅ Conexiones Correctas Aplicadas:**
- UserManagement.tsx → pqncSupabase ✅
- AvatarUpload.tsx → pqncSupabase ✅  
- SystemPreferences.tsx → pqncSupabase ✅
- authService.ts → pqncSupabase ✅

---

## 🔄 Mapeo Vapi JSON → Base de Datos

Esta plataforma importa agentes completos de Vapi y los descompone en catálogos reutilizables.

Resumen del mapeo:
- `squad.*` → Se persiste en `agent_templates.vapi_config.squad`. Los prompts por miembro se crean en `system_prompts` y se relacionan vía `agent_prompts`, agregando `context_tags: ['member:<nombre>']` para distinguir el origen. Las herramientas por miembro se guardan en `agent_tools` con `custom_config.member` cuando aplique.
- `members[*].assistant.model.messages` → `system_prompts` + `agent_prompts`; etiquetados por miembro.
- `members[*].assistant.model.tools` + `tools` → `tools_catalog.config` (schema/servidor/async/mensajes), relación `agent_tools.custom_config` con el objeto original.
- `assistantDestinations[*]` → herramienta sintética `transferCall` con `config.assistantName` y `message`.
- `voice`, `transcriber`, `messagePlan`, `voicemailDetection`, `startSpeakingPlan`, `stopSpeakingPlan`, etc. → `agent_templates.vapi_config.parameters.*` y se editan desde la sección “Parámetros”.
- `endCall` → siempre disponible en Tools como herramienta especial (no editable); su mensaje se edita en “Parámetros > Llamada”.

Catálogos utilizados:
- `agent_templates` (plantillas y agentes generados) con `created_by` (usuario PQNC) y flags (`is_active`, `is_public`).
- `system_prompts` + `agent_prompts` (prompts y relaciones). Uso de `context_tags` para distinguir origen por miembro/rol.
- `tools_catalog` (catálogo global de tools). Estructura embebida en `config`:
  - Function: `function.{name,description,parameters}`, `server.url`, `async`, `messages` (si existen)
  - TransferCall: `assistantName`, `message`, `description`
  - EndCall: `type: 'endCall'`, `messages` base opcionales
  - Propietario: `config.metadata.created_by` para “Mis herramientas”
- `agent_tools` (relaciones agente-tool). Se guarda `custom_config` con el objeto original y, si aplica, `member`.

Notas de diseño de datos:
- No se agregaron tablas nuevas. Para consultas avanzadas de squads por miembro, se sugiere futura normalización (`agent_squads`, `agent_squad_members`) pero no es requerida para el flujo actual.
