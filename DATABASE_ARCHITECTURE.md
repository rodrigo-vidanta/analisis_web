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
