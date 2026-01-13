# Guía: Conectar Bases de Datos Supabase para Migración

**Fecha:** 2025-01-13  
**Objetivo:** Conectar `pqnc_ai` con `system_ui` para migrar datos directamente sin exportar/importar manualmente

## 📋 Requisitos Previos

1. Ambas bases de datos deben estar en la misma cuenta de Supabase
2. Acceso al Dashboard de Supabase con permisos de administrador
3. Credenciales de conexión directa a PostgreSQL (no las URLs de la API)

## 🔑 Obtener Credenciales de Conexión

### Paso 1: Acceder al Dashboard de Supabase

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona el proyecto **System UI** (`zbylezfyagwrxoecioup`)
3. Ve a **Settings** → **Database**

### Paso 2: Obtener Información de Conexión

En la sección **Connection string**, encontrarás:

```
Host: db.zbylezfyagwrxoecioup.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [Mostrar contraseña] ← Click aquí para verla
```

**⚠️ IMPORTANTE:** Necesitas la contraseña de PostgreSQL, NO la service key de la API.

### Paso 3: Guardar Credenciales de Forma Segura

Crea un archivo `.env.local` (NO hacer commit a git):

```bash
# Credenciales de conexión directa a PostgreSQL
SYSTEM_UI_DB_HOST=db.zbylezfyagwrxoecioup.supabase.co
SYSTEM_UI_DB_PORT=5432
SYSTEM_UI_DB_NAME=postgres
SYSTEM_UI_DB_USER=postgres
SYSTEM_UI_DB_PASSWORD=tu_password_aqui
```

## 🔧 Configurar Conexión en pqnc_ai

### Opción 1: Usar SQL Directo (Recomendado)

1. Abre el SQL Editor en el proyecto **pqnc_ai** (`hmmfuhqgvsehkizlfzga`)
2. Ejecuta el script `scripts/migration/12_setup_database_connection.sql`
3. **Reemplaza** `'TU_PASSWORD_AQUI'` con la contraseña real obtenida en el paso anterior

### Opción 2: Usar MCP (Si tienes acceso)

Ejecuta el script SQL directamente usando el MCP de pqnc_ai, pero necesitarás proporcionar la contraseña.

## ✅ Verificar Conexión

Una vez configurado, verifica la conexión:

```sql
-- Verificar que el servidor externo existe
SELECT * FROM pg_foreign_server WHERE srvname = 'system_ui_server';

-- Probar conexión (reemplazar con query real)
SELECT * FROM dblink('system_ui_server', 
    'SELECT current_database(), current_user, version()'
) AS t(dbname text, username text, version text);
```

## 📊 Migrar Datos Usando la Conexión

### Ejemplo: Migrar `prospect_assignments`

```sql
-- Migrar prospect_assignments directamente
INSERT INTO prospect_assignments (
    id, prospect_id, coordinacion_id, ejecutivo_id, 
    assigned_at, assigned_by, assignment_type, assignment_reason, 
    unassigned_at, is_active, created_at, updated_at
)
SELECT 
    id, prospect_id, coordinacion_id, ejecutivo_id,
    assigned_at, assigned_by, assignment_type, assignment_reason,
    unassigned_at, is_active, created_at, updated_at
FROM dblink('system_ui_server', 
    'SELECT id, prospect_id, coordinacion_id, ejecutivo_id, assigned_at, assigned_by, assignment_type, assignment_reason, unassigned_at, is_active, created_at, updated_at FROM prospect_assignments'
) AS t(
    id uuid,
    prospect_id uuid,
    coordinacion_id uuid,
    ejecutivo_id uuid,
    assigned_at timestamptz,
    assigned_by uuid,
    assignment_type text,
    assignment_reason text,
    unassigned_at timestamptz,
    is_active boolean,
    created_at timestamptz,
    updated_at timestamptz
)
WHERE NOT EXISTS (
    SELECT 1 FROM prospect_assignments WHERE prospect_assignments.id = t.id
)
ON CONFLICT (id) DO UPDATE SET
    prospect_id = EXCLUDED.prospect_id,
    coordinacion_id = EXCLUDED.coordinacion_id,
    ejecutivo_id = EXCLUDED.ejecutivo_id,
    assigned_at = EXCLUDED.assigned_at,
    assigned_by = EXCLUDED.assigned_by,
    assignment_type = EXCLUDED.assignment_type,
    assignment_reason = EXCLUDED.assignment_reason,
    unassigned_at = EXCLUDED.unassigned_at,
    is_active = EXCLUDED.is_active,
    updated_at = EXCLUDED.updated_at;
```

### Ejemplo: Migrar Tablas Grandes en Lotes

Para tablas grandes como `paraphrase_logs` (2,545 registros):

```sql
-- Migrar paraphrase_logs en lotes usando LIMIT/OFFSET
DO $$
DECLARE
    batch_size INTEGER := 500;
    offset_val INTEGER := 0;
    total_records INTEGER;
BEGIN
    -- Obtener total de registros
    SELECT COUNT(*) INTO total_records
    FROM dblink('system_ui_server', 
        'SELECT COUNT(*) FROM paraphrase_logs'
    ) AS t(count bigint);
    
    RAISE NOTICE 'Total de registros a migrar: %', total_records;
    
    -- Migrar en lotes
    WHILE offset_val < total_records LOOP
        INSERT INTO paraphrase_logs (
            id, user_id, user_email, input_text, option1, option2,
            output_selected, selected_option_number, has_moderation_warning,
            warning_id, conversation_id, prospect_id, model_used,
            processing_time_ms, created_at
        )
        SELECT 
            id, user_id, user_email, input_text, option1, option2,
            output_selected, selected_option_number, has_moderation_warning,
            warning_id, conversation_id, prospect_id, model_used,
            processing_time_ms, created_at
        FROM dblink('system_ui_server', 
            format('SELECT id, user_id, user_email, input_text, option1, option2, output_selected, selected_option_number, has_moderation_warning, warning_id, conversation_id, prospect_id, model_used, processing_time_ms, created_at FROM paraphrase_logs ORDER BY created_at LIMIT %s OFFSET %s', 
                batch_size, offset_val)
        ) AS t(
            id uuid,
            user_id uuid,
            user_email text,
            input_text text,
            option1 text,
            option2 text,
            output_selected text,
            selected_option_number integer,
            has_moderation_warning boolean,
            warning_id uuid,
            conversation_id uuid,
            prospect_id uuid,
            model_used text,
            processing_time_ms integer,
            created_at timestamptz
        )
        ON CONFLICT (id) DO NOTHING;
        
        offset_val := offset_val + batch_size;
        RAISE NOTICE 'Migrados registros hasta offset: %', offset_val;
    END LOOP;
    
    RAISE NOTICE 'Migración completada';
END $$;
```

## 🔒 Seguridad

- **NUNCA** commits las contraseñas a git
- Usa variables de entorno o archivos `.env.local` (en `.gitignore`)
- Considera usar Supabase Vault para almacenar credenciales sensibles
- Limpia la conexión después de la migración si es necesario

## 🧹 Limpiar Conexión (Opcional)

Si quieres eliminar la conexión después de la migración:

```sql
-- Eliminar usuario mapping
DROP USER MAPPING IF EXISTS FOR CURRENT_USER SERVER system_ui_server;

-- Eliminar servidor externo
DROP SERVER IF EXISTS system_ui_server CASCADE;
```

## ⚠️ Limitaciones

1. **Performance:** `dblink` puede ser más lento que migración directa para tablas muy grandes
2. **Transacciones:** Las operaciones con `dblink` no son transaccionales automáticamente
3. **Errores:** Los errores pueden ser menos descriptivos que con migración directa

## 📚 Referencias

- [PostgreSQL Foreign Data Wrapper](https://www.postgresql.org/docs/current/postgres-fdw.html)
- [Supabase Database Connection](https://supabase.com/docs/guides/database/connecting-to-postgres)
