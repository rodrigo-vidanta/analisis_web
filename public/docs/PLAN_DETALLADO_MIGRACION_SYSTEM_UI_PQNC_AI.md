# Plan Detallado de Migración: system_ui → pqnc_ai

**Fecha:** 2025-01-13  
**Objetivo:** Unificar todas las tablas de `system_ui` en `pqnc_ai`  
**Estrategia:** Migración cuidadosa con validación exhaustiva en cada paso

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Estrategia de Migración](#estrategia-de-migración)
3. [Fase 1: Preparación de Base de Datos](#fase-1-preparación-de-base-de-datos)
4. [Fase 2: Migración de Datos](#fase-2-migración-de-datos)
5. [Fase 3: Migración del Frontend](#fase-3-migración-del-frontend)
6. [Fase 4: Validación y Pruebas](#fase-4-validación-y-pruebas)
7. [Fase 5: Despliegue](#fase-5-despliegue)
8. [Rollback Plan](#rollback-plan)

---

## 🎯 RESUMEN EJECUTIVO

### Decisiones Estratégicas

1. **`user_notifications`**: 
   - ✅ Conservar estructura de `pqnc_ai` (11 columnas)
   - ✅ Migrar datos de `system_ui` a `user_notifications_legacy`
   - ✅ Mantener ambas tablas durante transición

2. **`api_auth_tokens`** y **`api_auth_tokens_history`**:
   - ✅ Agregar columnas faltantes a `pqnc_ai`
   - ✅ Merge de datos (sobrescribir duplicados con `system_ui`)

3. **Resto de tablas**:
   - ✅ Migración directa sin conflictos

### Impacto en Frontend

- **Archivos afectados:** ~30 archivos
- **Servicios principales:** 8 servicios
- **Componentes principales:** 15+ componentes
- **Configuraciones:** 1 archivo de configuración principal

---

## 🔄 ESTRATEGIA DE MIGRACIÓN

### Principios

1. **Backup primero**: Siempre hacer backup antes de cambios
2. **Migración incremental**: Por fases, validando cada paso
3. **Dual-write temporal**: Escribir en ambas bases durante transición
4. **Rollback preparado**: Plan de reversión en cada fase
5. **Validación exhaustiva**: Pruebas después de cada cambio

### Orden de Ejecución

```
1. Preparación BD (SQL) → 2. Migración Datos (SQL) → 
3. Migración Frontend (Código) → 4. Validación → 5. Despliegue
```

---

## 📊 FASE 1: PREPARACIÓN DE BASE DE DATOS

### 1.1 Backup Completo

**Script:** `scripts/migration/01_backup_system_ui.sql`

```sql
-- Backup completo de system_ui antes de migración
-- Ejecutar en system_ui (zbylezfyagwrxoecioup.supabase.co)

-- Crear schema de backup
CREATE SCHEMA IF NOT EXISTS backup_migration_20250113;

-- Backup de tablas críticas
CREATE TABLE backup_migration_20250113.user_notifications AS 
SELECT * FROM user_notifications;

CREATE TABLE backup_migration_20250113.api_auth_tokens AS 
SELECT * FROM api_auth_tokens;

CREATE TABLE backup_migration_20250113.api_auth_tokens_history AS 
SELECT * FROM api_auth_tokens_history;

CREATE TABLE backup_migration_20250113.admin_messages AS 
SELECT * FROM admin_messages;

CREATE TABLE backup_migration_20250113.content_moderation_warnings AS 
SELECT * FROM content_moderation_warnings;

-- Backup de todas las demás tablas a migrar
-- (lista completa en script separado)
```

**Ejecutar también en pqnc_ai:**
```sql
-- Backup de tablas existentes en pqnc_ai
CREATE SCHEMA IF NOT EXISTS backup_before_merge_20250113;

CREATE TABLE backup_before_merge_20250113.user_notifications AS 
SELECT * FROM user_notifications;

CREATE TABLE backup_before_merge_20250113.api_auth_tokens AS 
SELECT * FROM api_auth_tokens;

CREATE TABLE backup_before_merge_20250113.api_auth_tokens_history AS 
SELECT * FROM api_auth_tokens_history;

CREATE TABLE backup_before_merge_20250113.admin_messages AS 
SELECT * FROM admin_messages;

CREATE TABLE backup_before_merge_20250113.content_moderation_warnings AS 
SELECT * FROM content_moderation_warnings;
```

### 1.2 Agregar Columnas Faltantes en pqnc_ai

**Script:** `scripts/migration/02_add_missing_columns.sql`

```sql
-- Ejecutar en pqnc_ai (glsmifhkoaifvaegsozd.supabase.co)

-- ============================================
-- 1. api_auth_tokens - Agregar columnas faltantes
-- ============================================

-- Verificar si las columnas ya existen antes de agregarlas
DO $$
BEGIN
    -- expires_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'api_auth_tokens' 
        AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE api_auth_tokens 
        ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Columna expires_at agregada a api_auth_tokens';
    END IF;

    -- ip_address
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'api_auth_tokens' 
        AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE api_auth_tokens 
        ADD COLUMN ip_address TEXT;
        RAISE NOTICE 'Columna ip_address agregada a api_auth_tokens';
    END IF;

    -- user_agent
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'api_auth_tokens' 
        AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE api_auth_tokens 
        ADD COLUMN user_agent TEXT;
        RAISE NOTICE 'Columna user_agent agregada a api_auth_tokens';
    END IF;
END $$;

-- ============================================
-- 2. api_auth_tokens_history - Agregar columnas faltantes
-- ============================================

DO $$
BEGIN
    -- is_active
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'api_auth_tokens_history' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE api_auth_tokens_history 
        ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Columna is_active agregada a api_auth_tokens_history';
    END IF;

    -- ip_address
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'api_auth_tokens_history' 
        AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE api_auth_tokens_history 
        ADD COLUMN ip_address TEXT;
        RAISE NOTICE 'Columna ip_address agregada a api_auth_tokens_history';
    END IF;

    -- user_agent
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'api_auth_tokens_history' 
        AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE api_auth_tokens_history 
        ADD COLUMN user_agent TEXT;
        RAISE NOTICE 'Columna user_agent agregada a api_auth_tokens_history';
    END IF;
END $$;

-- Verificar que las columnas se agregaron correctamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('api_auth_tokens', 'api_auth_tokens_history')
ORDER BY table_name, ordinal_position;
```

### 1.3 Crear Tabla user_notifications_legacy

**Script:** `scripts/migration/03_create_user_notifications_legacy.sql`

```sql
-- Ejecutar en pqnc_ai (glsmifhkoaifvaegsozd.supabase.co)

-- Crear tabla user_notifications_legacy con estructura de system_ui
CREATE TABLE IF NOT EXISTS user_notifications_legacy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    notification_type VARCHAR NOT NULL,
    module VARCHAR NOT NULL,
    message_id UUID,
    conversation_id UUID,
    call_id VARCHAR,
    prospect_id UUID,
    customer_name VARCHAR,
    customer_phone VARCHAR,
    message_preview TEXT,
    call_status VARCHAR,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    is_muted BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_user_notifications_legacy_user_id 
ON user_notifications_legacy(user_id);

CREATE INDEX IF NOT EXISTS idx_user_notifications_legacy_is_read 
ON user_notifications_legacy(is_read);

CREATE INDEX IF NOT EXISTS idx_user_notifications_legacy_created_at 
ON user_notifications_legacy(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_legacy_conversation_id 
ON user_notifications_legacy(conversation_id);

CREATE INDEX IF NOT EXISTS idx_user_notifications_legacy_call_id 
ON user_notifications_legacy(call_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_user_notifications_legacy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_notifications_legacy_updated_at
BEFORE UPDATE ON user_notifications_legacy
FOR EACH ROW
EXECUTE FUNCTION update_user_notifications_legacy_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE user_notifications_legacy IS 
'Tabla legacy de notificaciones migrada desde system_ui. Estructura original preservada para referencia histórica.';

COMMENT ON COLUMN user_notifications_legacy.notification_type IS 
'Tipo de notificación: new_message, new_call';

COMMENT ON COLUMN user_notifications_legacy.module IS 
'Módulo origen: live-chat, live-monitor';
```

---

## 📦 FASE 2: MIGRACIÓN DE DATOS

### 2.1 Migrar user_notifications a user_notifications_legacy

**Script:** `scripts/migration/04_migrate_user_notifications.sql`

```sql
-- Ejecutar en pqnc_ai (glsmifhkoaifvaegsozd.supabase.co)
-- Este script debe ejecutarse DESDE pqnc_ai pero conectándose a system_ui

-- IMPORTANTE: Este script requiere conexión cross-database
-- Opción 1: Usar dblink extension (si está disponible)
-- Opción 2: Exportar desde system_ui e importar en pqnc_ai (recomendado)

-- ============================================
-- OPCIÓN RECOMENDADA: Exportar desde system_ui
-- ============================================

-- En system_ui, ejecutar:
-- COPY (SELECT * FROM user_notifications) TO '/tmp/user_notifications_export.csv' WITH CSV HEADER;

-- Luego en pqnc_ai, ejecutar:
-- COPY user_notifications_legacy FROM '/tmp/user_notifications_export.csv' WITH CSV HEADER;

-- ============================================
-- OPCIÓN ALTERNATIVA: Usar función RPC con conexión externa
-- ============================================

-- Crear función temporal para migración (si se usa dblink)
CREATE OR REPLACE FUNCTION migrate_user_notifications_from_system_ui()
RETURNS TABLE(rows_inserted BIGINT) AS $$
DECLARE
    v_count BIGINT;
BEGIN
    -- Insertar datos desde system_ui usando dblink
    -- NOTA: Requiere configuración de dblink primero
    
    INSERT INTO user_notifications_legacy (
        id, user_id, notification_type, module, message_id, 
        conversation_id, call_id, prospect_id, customer_name, 
        customer_phone, message_preview, call_status, is_read, 
        read_at, is_muted, metadata, created_at, updated_at
    )
    SELECT 
        id, user_id, notification_type, module, message_id,
        conversation_id, call_id, prospect_id, customer_name,
        customer_phone, message_preview, call_status, is_read,
        read_at, is_muted, metadata, created_at, updated_at
    FROM dblink(
        'dbname=postgres host=zbylezfyagwrxoecioup.supabase.co port=5432 user=postgres password=YOUR_PASSWORD',
        'SELECT * FROM user_notifications'
    ) AS t(
        id UUID, user_id UUID, notification_type VARCHAR, module VARCHAR,
        message_id UUID, conversation_id UUID, call_id VARCHAR, prospect_id UUID,
        customer_name VARCHAR, customer_phone VARCHAR, message_preview TEXT,
        call_status VARCHAR, is_read BOOLEAN, read_at TIMESTAMP WITH TIME ZONE,
        is_muted BOOLEAN, metadata JSONB, created_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE
    )
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================

-- Contar registros migrados
SELECT 
    'user_notifications_legacy' as tabla,
    COUNT(*) as total_registros,
    COUNT(DISTINCT user_id) as usuarios_unicos,
    MIN(created_at) as fecha_mas_antigua,
    MAX(created_at) as fecha_mas_reciente
FROM user_notifications_legacy;
```

**⚠️ NOTA:** La migración real debe hacerse usando un script Node.js/TypeScript que conecte a ambas bases de datos, ya que Supabase no permite conexiones cross-database directas.

### 2.2 Merge de api_auth_tokens

**Script:** `scripts/migration/05_merge_api_auth_tokens.sql`

```sql
-- Ejecutar en pqnc_ai después de migrar datos desde system_ui
-- Este script asume que los datos ya fueron importados temporalmente

-- ============================================
-- ESTRATEGIA DE MERGE
-- ============================================
-- 1. Si existe registro con mismo id → Sobrescribir con datos de system_ui
-- 2. Si no existe → Insertar nuevo registro

-- Crear tabla temporal con datos de system_ui
CREATE TEMP TABLE temp_api_auth_tokens_system_ui AS
SELECT * FROM api_auth_tokens; -- Reemplazar con datos reales de system_ui

-- Merge: Actualizar existentes e insertar nuevos
INSERT INTO api_auth_tokens (
    id, module_name, service_name, token_type, token_value,
    description, endpoint_url, is_active, version, previous_value,
    change_reason, updated_by_id, updated_by_name, updated_by_email,
    created_at, updated_at, expires_at, ip_address, user_agent
)
SELECT 
    id, module_name, service_name, token_type, token_value,
    description, endpoint_url, is_active, version, previous_value,
    change_reason, updated_by_id, updated_by_name, updated_by_email,
    created_at, updated_at, expires_at, ip_address, user_agent
FROM temp_api_auth_tokens_system_ui
ON CONFLICT (id) DO UPDATE SET
    module_name = EXCLUDED.module_name,
    service_name = EXCLUDED.service_name,
    token_type = EXCLUDED.token_type,
    token_value = EXCLUDED.token_value,
    description = EXCLUDED.description,
    endpoint_url = EXCLUDED.endpoint_url,
    is_active = EXCLUDED.is_active,
    version = EXCLUDED.version,
    previous_value = EXCLUDED.previous_value,
    change_reason = EXCLUDED.change_reason,
    updated_by_id = EXCLUDED.updated_by_id,
    updated_by_name = EXCLUDED.updated_by_name,
    updated_by_email = EXCLUDED.updated_by_email,
    updated_at = EXCLUDED.updated_at,
    expires_at = EXCLUDED.expires_at,
    ip_address = EXCLUDED.ip_address,
    user_agent = EXCLUDED.user_agent;

-- Verificar merge
SELECT 
    'api_auth_tokens' as tabla,
    COUNT(*) as total_registros,
    COUNT(DISTINCT module_name) as modulos_unicos,
    COUNT(DISTINCT service_name) as servicios_unicos
FROM api_auth_tokens;
```

### 2.3 Merge de api_auth_tokens_history

**Script:** `scripts/migration/06_merge_api_auth_tokens_history.sql`

```sql
-- Similar a api_auth_tokens pero para history
-- Ejecutar en pqnc_ai después de migrar datos desde system_ui

CREATE TEMP TABLE temp_api_auth_tokens_history_system_ui AS
SELECT * FROM api_auth_tokens_history; -- Reemplazar con datos reales

INSERT INTO api_auth_tokens_history (
    id, token_id, module_name, service_name, token_key, token_value,
    description, endpoint_url, version, change_type, change_reason,
    changed_by_id, changed_by_name, changed_by_email, changed_at,
    is_active, ip_address, user_agent
)
SELECT 
    id, token_id, module_name, service_name, token_key, token_value,
    description, endpoint_url, version, change_type, change_reason,
    changed_by_id, changed_by_name, changed_by_email, changed_at,
    is_active, ip_address, user_agent
FROM temp_api_auth_tokens_history_system_ui
ON CONFLICT (id) DO UPDATE SET
    token_id = EXCLUDED.token_id,
    module_name = EXCLUDED.module_name,
    service_name = EXCLUDED.service_name,
    token_key = EXCLUDED.token_key,
    token_value = EXCLUDED.token_value,
    description = EXCLUDED.description,
    endpoint_url = EXCLUDED.endpoint_url,
    version = EXCLUDED.version,
    change_type = EXCLUDED.change_type,
    change_reason = EXCLUDED.change_reason,
    changed_by_id = EXCLUDED.changed_by_id,
    changed_by_name = EXCLUDED.changed_by_name,
    changed_by_email = EXCLUDED.changed_by_email,
    changed_at = EXCLUDED.changed_at,
    is_active = EXCLUDED.is_active,
    ip_address = EXCLUDED.ip_address,
    user_agent = EXCLUDED.user_agent;

-- Verificar merge
SELECT 
    'api_auth_tokens_history' as tabla,
    COUNT(*) as total_registros,
    COUNT(DISTINCT token_id) as tokens_unicos
FROM api_auth_tokens_history;
```

### 2.4 Migrar admin_messages y content_moderation_warnings

**Script:** `scripts/migration/07_migrate_other_tables.sql`

```sql
-- Migrar admin_messages (estructuras idénticas)
INSERT INTO admin_messages (
    id, category, title, message, sender_id, sender_email,
    recipient_id, recipient_role, status, priority, metadata,
    resolved_at, resolved_by, resolved_note, read_at, read_by,
    created_at, updated_at
)
SELECT 
    id, category, title, message, sender_id, sender_email,
    recipient_id, recipient_role, status, priority, metadata,
    resolved_at, resolved_by, resolved_note, read_at, read_by,
    created_at, updated_at
FROM temp_admin_messages_system_ui -- Reemplazar con datos reales
ON CONFLICT (id) DO NOTHING;

-- Migrar content_moderation_warnings (estructuras idénticas)
INSERT INTO content_moderation_warnings (
    id, user_id, user_email, input_text, warning_reason,
    warning_category, output_selected, was_sent, conversation_id,
    prospect_id, ip_address, user_agent, created_at
)
SELECT 
    id, user_id, user_email, input_text, warning_reason,
    warning_category, output_selected, was_sent, conversation_id,
    prospect_id, ip_address, user_agent, created_at
FROM temp_content_moderation_warnings_system_ui -- Reemplazar con datos reales
ON CONFLICT (id) DO NOTHING;
```

### 2.5 Migrar Resto de Tablas Sin Conflictos

**Script:** `scripts/migration/08_migrate_remaining_tables.sql`

```sql
-- Lista completa de tablas a migrar (35 tablas)
-- Cada una se migra con INSERT ... ON CONFLICT DO NOTHING

-- Autenticación (9 tablas)
-- auth_users, auth_roles, auth_permissions, auth_role_permissions,
-- auth_user_permissions, auth_sessions, auth_login_logs,
-- auth_user_coordinaciones, auth_user_profiles (VIEW - recrear)

-- Coordinaciones (3 tablas)
-- coordinaciones, coordinacion_statistics, coordinador_coordinaciones_legacy

-- Permisos (4 tablas)
-- permission_groups, group_permissions, user_permission_groups, group_audit_log

-- Asignaciones (3 tablas)
-- prospect_assignments, prospect_assignment_logs, assignment_logs

-- Otros (16 tablas)
-- api_tokens, log_server_config, aws_diagram_configs,
-- bot_pause_status, uchat_bots, uchat_conversations, uchat_messages,
-- user_avatars, user_warning_counters, paraphrase_logs, timeline_activities,
-- whatsapp_conversation_labels, whatsapp_labels_custom, whatsapp_labels_preset

-- (Ver script completo en archivo separado)
```

---

## 💻 FASE 3: MIGRACIÓN DEL FRONTEND

### 3.1 Archivos de Configuración

#### `src/config/supabaseSystemUI.ts` → Actualizar para apuntar a pqnc_ai

**Cambios requeridos:**

```typescript
// ANTES (system_ui)
export const SUPABASE_URL = import.meta.env.VITE_SYSTEM_UI_SUPABASE_URL || '';
// URL: https://zbylezfyagwrxoecioup.supabase.co

// DESPUÉS (pqnc_ai)
export const SUPABASE_URL = import.meta.env.VITE_PQNC_AI_SUPABASE_URL || '';
// URL: https://glsmifhkoaifvaegsozd.supabase.co
```

**⚠️ IMPORTANTE:** Mantener compatibilidad durante transición:
- Opción A: Cambiar directamente a pqnc_ai
- Opción B: Crear wrapper que redirija según configuración

**Recomendación:** Opción A (cambio directo) después de validar migración de datos.

### 3.2 Servicios a Actualizar

#### 3.2.1 `src/services/userNotificationService.ts`

**Cambios:**

```typescript
// ANTES
import { supabaseSystemUI } from '../config/supabaseSystemUI';

// DESPUÉS
import { analysisSupabase } from '../config/analysisSupabase'; // pqnc_ai

// Cambiar todas las referencias:
// supabaseSystemUI → analysisSupabase
// .from('user_notifications') → .from('user_notifications') // Misma tabla
```

**Nota:** La tabla `user_notifications` en pqnc_ai tiene estructura diferente. Necesitamos:
- Mapear campos antiguos a nuevos
- O crear adaptador que lea de ambas tablas durante transición

#### 3.2.2 `src/services/notificationsService.ts`

**Cambios:**

```typescript
// Este servicio YA usa analysisSupabase para user_notifications
// PERO aún consulta auth_users desde system_ui

// Cambiar:
import { supabaseSystemUI, supabaseSystemUIAdmin } from '../config/supabaseSystemUI';
// Por:
import { analysisSupabase, analysisSupabaseAdmin } from '../config/analysisSupabase';

// Cambiar todas las consultas a auth_users:
// supabaseSystemUI.from('auth_users') → analysisSupabase.from('auth_users')
```

#### 3.2.3 `src/services/credentialsService.ts`

**Cambios:**

```typescript
// Actualizar para usar pqnc_ai en lugar de system_ui
// Tabla: api_auth_tokens
```

#### 3.2.4 `src/services/apiTokensService.ts`

**Cambios:**

```typescript
// Actualizar para usar pqnc_ai
// Tabla: api_tokens
```

### 3.3 Componentes a Actualizar

#### 3.3.1 Componentes de Live Chat

**Archivos:**
- `src/components/chat/LiveChatCanvas.tsx`
- Cambiar todas las referencias a `supabaseSystemUI` por `analysisSupabase`
- Tablas afectadas: `uchat_conversations`, `uchat_messages`, `uchat_bots`

#### 3.3.2 Componentes de Live Monitor

**Archivos:**
- `src/components/analysis/LiveMonitor.tsx`
- `src/components/analysis/LiveMonitorKanban.tsx`
- Cambiar consultas a `auth_users` para usar `analysisSupabase`

#### 3.3.3 Componentes de Administración

**Archivos:**
- `src/components/admin/UserManagementV2/**/*.tsx`
- `src/components/admin/UserManagementV2/hooks/useUserManagement.ts`
- Cambiar todas las consultas a tablas de auth para usar `analysisSupabase`

#### 3.3.4 Footer

**Archivo:**
- `src/components/Footer.tsx`
- Actualizar consultas a `auth_users` y `user_avatars`

### 3.4 Hooks a Actualizar

**Archivos:**
- `src/hooks/useProspectosNotifications.ts`
- Actualizar referencias a system_ui

### 3.5 Lista Completa de Archivos

**Archivos que importan `supabaseSystemUI` o `supabaseSystemUIAdmin`:**

1. ✅ `src/config/supabaseSystemUI.ts` - **Configuración principal**
2. ✅ `src/services/userNotificationService.ts`
3. ✅ `src/services/notificationsService.ts`
4. ✅ `src/services/notificationService.ts`
5. ✅ `src/services/credentialsService.ts`
6. ✅ `src/services/apiTokensService.ts`
7. ✅ `src/components/chat/LiveChatCanvas.tsx`
8. ✅ `src/components/analysis/LiveMonitor.tsx`
9. ✅ `src/components/analysis/LiveMonitorKanban.tsx`
10. ✅ `src/components/admin/UserManagementV2/components/UserEditPanel.tsx`
11. ✅ `src/components/admin/UserManagementV2/hooks/useUserManagement.ts`
12. ✅ `src/components/Footer.tsx`
13. ✅ `src/hooks/useProspectosNotifications.ts`

**Total:** 13 archivos principales + archivos relacionados

---

## ✅ FASE 4: VALIDACIÓN Y PRUEBAS

### 4.1 Validación de Datos Migrados

**Checklist:**

- [ ] Contar registros en system_ui vs pqnc_ai
- [ ] Verificar integridad de foreign keys
- [ ] Validar que no hay duplicados no deseados
- [ ] Verificar que columnas nuevas tienen valores correctos
- [ ] Validar triggers funcionan correctamente

### 4.2 Pruebas Funcionales

**Checklist:**

- [ ] Login de usuarios funciona
- [ ] Notificaciones se crean correctamente
- [ ] Notificaciones se marcan como leídas
- [ ] Live Chat funciona correctamente
- [ ] Live Monitor funciona correctamente
- [ ] User Management funciona correctamente
- [ ] Credenciales se consultan correctamente
- [ ] API tokens funcionan

### 4.3 Pruebas de Rendimiento

- [ ] Consultas a `auth_users` tienen buen rendimiento
- [ ] Consultas a `user_notifications` tienen buen rendimiento
- [ ] Realtime subscriptions funcionan correctamente

---

## 🚀 FASE 5: DESPLIEGUE

### 5.1 Pre-Despliegue

1. ✅ Backup completo de ambas bases
2. ✅ Scripts de migración probados en desarrollo
3. ✅ Código frontend actualizado y probado
4. ✅ Plan de rollback preparado

### 5.2 Despliegue

**Orden de ejecución:**

1. Ejecutar scripts SQL de migración (Fase 1 y 2)
2. Validar datos migrados
3. Desplegar código frontend actualizado
4. Validar funcionalidad completa
5. Monitorear errores por 24-48 horas

### 5.3 Post-Despliegue

- Monitorear logs de errores
- Verificar métricas de rendimiento
- Validar que no hay consultas fallidas a system_ui
- Mantener system_ui activo como backup por 1-2 semanas

---

## 🔄 ROLLBACK PLAN

### Si algo falla durante migración de datos:

```sql
-- Restaurar desde backup
DROP TABLE IF EXISTS user_notifications_legacy;
DROP TABLE IF EXISTS temp_*;

-- Restaurar tablas desde backup_before_merge_20250113
```

### Si algo falla en frontend:

1. Revertir cambios en código (git revert)
2. Re-desplegar versión anterior
3. Las consultas volverán a system_ui automáticamente

### Si algo falla después de despliegue:

1. Mantener system_ui activo permite rollback rápido
2. Cambiar variables de entorno para apuntar de vuelta a system_ui
3. Re-desplegar frontend con configuración anterior

---

## 📝 CHECKLIST FINAL

### Pre-Migración
- [ ] Backup completo de system_ui
- [ ] Backup completo de pqnc_ai
- [ ] Scripts SQL creados y probados
- [ ] Plan de migración revisado y aprobado

### Migración de Datos
- [ ] Columnas agregadas a api_auth_tokens
- [ ] Columnas agregadas a api_auth_tokens_history
- [ ] Tabla user_notifications_legacy creada
- [ ] Datos de user_notifications migrados
- [ ] Datos de api_auth_tokens mergeados
- [ ] Datos de api_auth_tokens_history mergeados
- [ ] Resto de tablas migradas

### Migración de Frontend
- [ ] Configuración actualizada
- [ ] Servicios actualizados
- [ ] Componentes actualizados
- [ ] Hooks actualizados
- [ ] Pruebas realizadas

### Post-Migración
- [ ] Validación de datos completa
- [ ] Pruebas funcionales pasadas
- [ ] Monitoreo activo
- [ ] Documentación actualizada

---

**Última actualización:** 2025-01-13  
**Próximo paso:** Revisar y aprobar plan antes de ejecutar migración
