-- ============================================
-- ESQUEMA DE BOOKMARKS (MARCADORES) POR USUARIO
-- Fecha: 2025-01-24
-- Base: hmmfuhqgvsehkizlfzga.supabase.co
-- ============================================

-- TABLA: call_bookmarks
-- Almacena marcadores de llamadas específicos por usuario
CREATE TABLE IF NOT EXISTS call_bookmarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Color del bookmark (solo 5 colores disponibles)
    bookmark_color VARCHAR(20) NOT NULL CHECK (
        bookmark_color IN ('red', 'yellow', 'green', 'blue', 'purple')
    ),
    
    -- Metadatos opcionales
    notes TEXT, -- Notas personales del usuario (opcional)
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
    
    -- Un usuario solo puede tener un bookmark por llamada
    UNIQUE(call_id, user_id)
);

-- ÍNDICES OPTIMIZADOS
CREATE INDEX IF NOT EXISTS idx_call_bookmarks_user_id ON call_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_call_bookmarks_call_id ON call_bookmarks(call_id);
CREATE INDEX IF NOT EXISTS idx_call_bookmarks_color ON call_bookmarks(bookmark_color);
CREATE INDEX IF NOT EXISTS idx_call_bookmarks_user_color ON call_bookmarks(user_id, bookmark_color);
CREATE INDEX IF NOT EXISTS idx_call_bookmarks_created_at ON call_bookmarks(created_at DESC);

-- TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_bookmark_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bookmark_updated_at
    BEFORE UPDATE ON call_bookmarks
    FOR EACH ROW
    EXECUTE FUNCTION update_bookmark_updated_at();

-- COMENTARIOS Y DOCUMENTACIÓN
COMMENT ON TABLE call_bookmarks IS 'Marcadores de llamadas personalizados por usuario con 5 colores disponibles';
COMMENT ON COLUMN call_bookmarks.bookmark_color IS 'Color del marcador: red, yellow, green, blue, purple';
COMMENT ON COLUMN call_bookmarks.notes IS 'Notas personales del usuario sobre la llamada marcada';

-- VISTA PARA ESTADÍSTICAS DE BOOKMARKS POR USUARIO
CREATE OR REPLACE VIEW user_bookmark_stats AS
SELECT 
    user_id,
    bookmark_color,
    COUNT(*) as bookmark_count,
    MAX(created_at) as last_bookmark_date
FROM call_bookmarks
GROUP BY user_id, bookmark_color;

COMMENT ON VIEW user_bookmark_stats IS 'Estadísticas de uso de bookmarks por usuario y color';

-- ============================================
-- DATOS DE PRUEBA (OPCIONAL)
-- ============================================

-- Colores disponibles con sus códigos CSS
-- red: #EF4444 (Rojo)
-- yellow: #F59E0B (Amarillo/Naranja)  
-- green: #10B981 (Verde)
-- blue: #3B82F6 (Azul)
-- purple: #8B5CF6 (Púrpura)

-- Ejemplo de uso:
-- INSERT INTO call_bookmarks (call_id, user_id, bookmark_color, notes)
-- VALUES (
--     'uuid-de-la-llamada',
--     'uuid-del-usuario', 
--     'red',
--     'Llamada importante para revisar técnicas de cierre'
-- );
