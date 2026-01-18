# Rollback Plan: Mover Funciones a Schema Interno

**Fecha:** 17 de Enero 2026  
**Operación:** Mover funciones sensibles de `public` a `internal`  
**Proyecto:** PQNC_AI (glsmifhkoaifvaegsozd)  
**Ejecutado por:** Cursor AI + Samuel Rosales

---

## Funciones a Mover

| Función | Schema Original | Razón |
|---------|-----------------|-------|
| `exec_sql_insert_company` | public | No usada por frontend, expone hints |
| `test_exec_sql_capabilities` | public | No usada por frontend, expone hints |
| `insert_admin_message` | public | No usada por frontend, expone hints |

## Funciones NO Movidas (Por Seguridad)

| Función | Razón |
|---------|-------|
| `audit_password_changes` | ⚠️ Trigger activo en `auth_users` - NO MOVER |
| `change_user_password` | Usada por frontend |
| `create_user_with_role` | Usada por frontend |
| `get_credential_value` | Usada por frontend |

---

## SQL Aplicado

```sql
-- 1. Crear schema interno
CREATE SCHEMA IF NOT EXISTS internal;

-- 2. Revocar acceso público
REVOKE ALL ON SCHEMA internal FROM anon, authenticated, PUBLIC;

-- 3. Solo service_role puede acceder
GRANT USAGE ON SCHEMA internal TO service_role;
GRANT ALL ON SCHEMA internal TO postgres;

-- 4. Mover funciones (una por una)
ALTER FUNCTION public.exec_sql_insert_company SET SCHEMA internal;
ALTER FUNCTION public.test_exec_sql_capabilities SET SCHEMA internal;
ALTER FUNCTION public.insert_admin_message SET SCHEMA internal;
```

---

## Rollback (Revertir Cambios)

Si algo sale mal, ejecutar en SQL Editor de Supabase:

```sql
-- ROLLBACK: Mover funciones de vuelta a public
ALTER FUNCTION internal.exec_sql_insert_company SET SCHEMA public;
ALTER FUNCTION internal.test_exec_sql_capabilities SET SCHEMA public;
ALTER FUNCTION internal.insert_admin_message SET SCHEMA public;

-- Opcional: Eliminar schema interno si está vacío
-- DROP SCHEMA internal;
```

---

## Verificación Post-Cambio

### Test 1: Verificar que funciones están en internal

```sql
SELECT proname, pronamespace::regnamespace 
FROM pg_proc 
WHERE proname IN ('exec_sql_insert_company', 'test_exec_sql_capabilities', 'insert_admin_message');
```

**Esperado:** Schema = `internal`

### Test 2: Verificar que hints ya no revelan estas funciones

```bash
curl -s -X POST "https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/rpc/exec_sql" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT 1"}'
```

**Esperado:** Error SIN hint de `exec_sql_insert_company`

### Test 3: Verificar que el frontend sigue funcionando

```bash
# Endpoint que SÍ usa el frontend
curl -s "https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/coordinaciones?limit=1" \
  -H "apikey: $SERVICE_KEY"
```

**Esperado:** Respuesta normal con datos

---

## Definiciones de Funciones (Backup)

### exec_sql_insert_company

```sql
CREATE OR REPLACE FUNCTION public.exec_sql_insert_company(
    p_name text, p_email text, p_phone text, p_website text,
    p_address text, p_city text, p_state text, p_country text,
    p_postal_code text, p_legal_name text, p_tax_id text
)
RETURNS jsonb AS $$
DECLARE
    result JSONB;
    new_company companies;
BEGIN
    INSERT INTO companies (
        name, email, phone, website, address, city, state, country,
        postal_code, legal_name, tax_id, is_active, subscription_status
    )
    VALUES (
        p_name, p_email, p_phone, p_website, p_address, p_city, p_state,
        p_country, p_postal_code, p_legal_name, p_tax_id, true, 'trial'
    )
    RETURNING * INTO new_company;
    
    SELECT to_jsonb(new_company) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### test_exec_sql_capabilities

```sql
CREATE OR REPLACE FUNCTION public.test_exec_sql_capabilities()
RETURNS json AS $$
DECLARE
    result JSON;
BEGIN
    SELECT exec_sql('SELECT 1 as test_select') INTO result;
    
    IF (result->>'success')::boolean = false THEN
        RETURN json_build_object(
            'exec_sql_available', false,
            'error', 'exec_sql function failed basic SELECT test'
        );
    END IF;
    
    BEGIN
        SELECT exec_sql('CREATE TEMPORARY TABLE test_ddl_capability (id SERIAL, test_col TEXT)') INTO result;
        
        RETURN json_build_object(
            'exec_sql_available', true,
            'ddl_capable', (result->>'success')::boolean,
            'dml_capable', true,
            'select_capable', true,
            'message', 'exec_sql function has full DDL/DML capabilities',
            'test_results', result
        );
        
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'exec_sql_available', true,
            'ddl_capable', false,
            'dml_capable', true,
            'select_capable', true,
            'message', 'exec_sql function has limited capabilities (no DDL)',
            'ddl_error', SQLERRM
        );
    END;
END;
$$ LANGUAGE plpgsql;
```

### insert_admin_message

```sql
CREATE OR REPLACE FUNCTION public.insert_admin_message(
    p_category text, p_title text, p_message text,
    p_sender_id text, p_sender_email text,
    p_recipient_role text, p_priority text, p_metadata jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_result admin_messages;
BEGIN
  INSERT INTO admin_messages (
    category, title, message, sender_id, sender_email,
    recipient_role, priority, metadata, status
  ) VALUES (
    p_category, p_title, p_message, 
    CASE WHEN p_sender_id = '' OR p_sender_id IS NULL THEN NULL ELSE p_sender_id::UUID END,
    CASE WHEN p_sender_email = '' THEN NULL ELSE p_sender_email END,
    p_recipient_role, p_priority, p_metadata, 'pending'
  ) RETURNING * INTO v_result;
  
  RETURN row_to_json(v_result)::jsonb;
END;
$$ LANGUAGE plpgsql;
```

---

**Documento creado:** 2026-01-17 15:45 CST
