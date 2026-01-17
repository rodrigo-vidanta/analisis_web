# Plan de Blindaje Completo - Enfoque Sistemático

## 1. FUNCIONES RPC (Proyecto PQNC_AI)

### Estrategia:
**BLOQUEAR TODO → Habilitar solo lo mínimo necesario**

```sql
-- Paso 1: Bloquear TODAS
DO $$ 
DECLARE func text;
BEGIN
  FOR func IN 
    SELECT routine_name FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
    AND routine_name NOT LIKE ANY(ARRAY['pg_%', 'vector%', '%_in', '%_out', 'gtrgm%', 'gin%'])
  LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %I FROM anon, authenticated, public', func);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- Paso 2: Habilitar solo para authenticated (NO anon)
GRANT EXECUTE ON FUNCTION get_user_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_access_prospect TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_metadata TO authenticated;
GRANT EXECUTE ON FUNCTION get_credential_value TO authenticated;
-- ... (solo las que USA el frontend)

-- Paso 3: NO habilitar nada para anon
-- El login ahora debe hacerse sin RPCs públicas
```

## 2. TABLAS (3 Proyectos)

### PQNC_AI
```sql
-- Bloquear TODAS de anon
DO $$
DECLARE tbl text;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('REVOKE ALL ON %I FROM anon', tbl);
    EXECUTE format('GRANT SELECT ON %I TO authenticated', tbl);
  END LOOP;
END $$;
```

### PQNC_QA y LOGMONITOR
- Mismo proceso
- Usar API REST con token

## 3. VISTAS

- Ya hecho: REVOKE ALL FROM anon ✅

## 4. EDGE FUNCTIONS

- Verificar TODAS tienen validación real de usuario
- No solo verificar Bearer header

## 5. CÓDIGO

- Buscar TODOS los tokens/UUIDs hardcodeados
- Remover TODOS

## 6. WEBHOOKS

- Agregar auth en N8N a TODOS
- O pasar TODOS por Edge Functions

## Orden de Ejecución

1. ✅ RPCs: Bloqueo masivo + whitelist mínima
2. ✅ Tablas: RLS + REVOKE anon
3. ✅ Código: Limpieza de tokens
4. ✅ Edge Functions: Validación real
5. ⏳ Webhooks N8N: Manual

