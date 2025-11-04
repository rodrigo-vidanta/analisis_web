# ⚠️ EJECUTAR ESTE SQL MANUALMENTE EN SYSTEM_UI

## Base de Datos: System_UI
**URL**: https://zbylezfyagwrxoecioup.supabase.co
**Dashboard SQL**: https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/sql/new

## 📋 INSTRUCCIONES

1. Ve a: https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/sql/new
2. Copia y pega el SQL completo del archivo `create_paraphrase_system_complete.sql`
3. Ejecuta el query
4. Verifica que todo se creó correctamente

## 📊 TABLAS CREADAS

1. **`paraphrase_logs`** - Almacena TODOS los inputs y outputs de parafraseo
2. **`content_moderation_warnings`** - Almacena warnings de moderación
3. **`user_warning_counters`** - Contador optimizado de warnings por usuario

## ⚠️ IMPORTANTE

- La tabla de usuarios está en PQNC_AI, pero usamos UUIDs para referenciarlos
- No hay foreign keys entre bases de datos diferentes
- El trigger actualiza automáticamente el contador cuando se inserta un warning

---

## 🔧 SQL COMPLETO PARA EJECUTAR

**NOTA**: Usa el archivo `create_paraphrase_system_complete.sql` que contiene el SQL completo y actualizado.

```sql
-- ============================================
-- TABLA DE MODERACIÓN DE CONTENIDO
-- Base de datos: system_ui (zbylezfyagwrxoecioup.supabase.co)
-- ============================================

-- Tabla principal para almacenar warnings de moderación
CREATE TABLE IF NOT EXISTS content_moderation_warnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Usuario que generó el contenido inapropiado
  user_id UUID NOT NULL,
  user_email VARCHAR(255),
  
  -- Contenido del mensaje
  input_text TEXT NOT NULL,
  
  -- Información de moderación
  warning_reason TEXT NOT NULL,
  warning_category VARCHAR(50) NOT NULL CHECK (warning_category IN ('vulgaridad', 'amenazas', 'discriminacion', 'ilegal', 'spam', 'sexual', 'otro')),
  
  -- Output seleccionado (si el usuario lo seleccionó a pesar del warning)
  output_selected TEXT,
  was_sent BOOLEAN DEFAULT false, -- Si finalmente se envió el mensaje
  
  -- Contexto de la conversación
  conversation_id UUID, -- ID de la conversación de WhatsApp/UChat
  prospect_id UUID, -- ID del prospecto si aplica
  
  -- Metadatos
  ip_address VARCHAR(50),
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_moderation_warnings_user_id ON content_moderation_warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_warnings_created_at ON content_moderation_warnings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_warnings_category ON content_moderation_warnings(warning_category);
CREATE INDEX IF NOT EXISTS idx_moderation_warnings_user_category ON content_moderation_warnings(user_id, warning_category);

-- Vista para contar warnings por usuario (últimos 30 días)
CREATE OR REPLACE VIEW user_warning_counts AS
SELECT 
  user_id,
  COUNT(*) as total_warnings,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as warnings_last_30_days,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as warnings_last_7_days,
  MAX(created_at) as last_warning_at,
  array_agg(DISTINCT warning_category) as categories
FROM content_moderation_warnings
GROUP BY user_id;

-- Función RPC para obtener warnings de un usuario
CREATE OR REPLACE FUNCTION get_user_warnings(p_user_id UUID)
RETURNS TABLE (
  total_warnings BIGINT,
  warnings_last_30_days BIGINT,
  warnings_last_7_days BIGINT,
  last_warning_at TIMESTAMP WITH TIME ZONE,
  is_blocked BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_warnings,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::BIGINT as warnings_last_30_days,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::BIGINT as warnings_last_7_days,
    MAX(created_at) as last_warning_at,
    (COUNT(*) >= 3)::BOOLEAN as is_blocked
  FROM content_moderation_warnings
  WHERE user_id = p_user_id;
END;
$$;

-- Función RPC para registrar un warning
CREATE OR REPLACE FUNCTION register_moderation_warning(
  p_user_id UUID,
  p_user_email VARCHAR,
  p_input_text TEXT,
  p_warning_reason TEXT,
  p_warning_category VARCHAR,
  p_output_selected TEXT DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL,
  p_prospect_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_warning_id UUID;
BEGIN
  -- Insertar el warning
  INSERT INTO content_moderation_warnings (
    user_id,
    user_email,
    input_text,
    warning_reason,
    warning_category,
    output_selected,
    conversation_id,
    prospect_id
  ) VALUES (
    p_user_id,
    p_user_email,
    p_input_text,
    p_warning_reason,
    p_warning_category,
    p_output_selected,
    p_conversation_id,
    p_prospect_id
  ) RETURNING id INTO v_warning_id;
  
  -- Retornar el ID del warning
  RETURN v_warning_id;
END;
$$;

-- Función RPC para verificar si un usuario está bloqueado
CREATE OR REPLACE FUNCTION is_user_blocked(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_warning_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_warning_count
  FROM content_moderation_warnings
  WHERE user_id = p_user_id;
  
  RETURN v_warning_count >= 3;
END;
$$;

-- Política RLS: Los usuarios solo pueden ver sus propios warnings
ALTER TABLE content_moderation_warnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own warnings" ON content_moderation_warnings;
CREATE POLICY "Users can view their own warnings"
  ON content_moderation_warnings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política RLS: Los admins pueden ver todos los warnings (si existe estructura de auth)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'auth_users'
  ) THEN
    DROP POLICY IF EXISTS "Admins can view all warnings" ON content_moderation_warnings;
    CREATE POLICY "Admins can view all warnings"
      ON content_moderation_warnings
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM auth_users au
          JOIN auth_user_roles aur ON au.id = aur.user_id
          JOIN auth_roles ar ON aur.role_id = ar.id
          WHERE au.id = auth.uid()
          AND ar.name = 'Administrador'
        )
      );
  END IF;
END $$;

-- Comentarios para documentación
COMMENT ON TABLE content_moderation_warnings IS 'Registro de warnings de moderación de contenido para usuarios';
COMMENT ON COLUMN content_moderation_warnings.warning_category IS 'Categoría del warning: vulgaridad, amenazas, discriminacion, ilegal, spam, sexual, otro';
COMMENT ON COLUMN content_moderation_warnings.was_sent IS 'Indica si el mensaje finalmente se envió a pesar del warning';
COMMENT ON FUNCTION is_user_blocked IS 'Verifica si un usuario tiene 3 o más warnings y está bloqueado';
COMMENT ON FUNCTION register_moderation_warning IS 'Registra un nuevo warning de moderación y retorna el ID';
```

## ✅ VERIFICACIÓN POST-EJECUCIÓN

Después de ejecutar el SQL, verifica:

1. **Tabla creada:**
   ```sql
   SELECT * FROM content_moderation_warnings LIMIT 1;
   ```

2. **Funciones creadas:**
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_name IN ('get_user_warnings', 'register_moderation_warning', 'is_user_blocked');
   ```

3. **Vista creada:**
   ```sql
   SELECT * FROM user_warning_counts LIMIT 1;
   ```

## 🎯 RESULTADO ESPERADO

- ✅ Tabla `content_moderation_warnings` creada
- ✅ 4 índices creados
- ✅ Vista `user_warning_counts` creada
- ✅ 3 funciones RPC creadas
- ✅ Políticas RLS configuradas

