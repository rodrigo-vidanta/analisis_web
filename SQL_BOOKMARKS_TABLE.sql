-- ============================================
-- TABLA DE BOOKMARKS - PARA COPIAR EN SUPABASE
-- ============================================

-- TABLA: call_bookmarks
CREATE TABLE IF NOT EXISTS call_bookmarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id UUID NOT NULL,
    user_id UUID NOT NULL,
    bookmark_color VARCHAR(20) NOT NULL CHECK (
        bookmark_color IN ('red', 'yellow', 'green', 'blue', 'purple')
    ),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(call_id, user_id)
);

-- FOREIGN KEYS
ALTER TABLE call_bookmarks 
ADD CONSTRAINT fk_call_bookmarks_call_id 
FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE;

ALTER TABLE call_bookmarks 
ADD CONSTRAINT fk_call_bookmarks_user_id 
FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_call_bookmarks_user_id ON call_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_call_bookmarks_call_id ON call_bookmarks(call_id);
CREATE INDEX IF NOT EXISTS idx_call_bookmarks_color ON call_bookmarks(bookmark_color);
CREATE INDEX IF NOT EXISTS idx_call_bookmarks_user_color ON call_bookmarks(user_id, bookmark_color);

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

-- COMENTARIOS
COMMENT ON TABLE call_bookmarks IS 'Marcadores de llamadas personalizados por usuario con 5 colores disponibles';
COMMENT ON COLUMN call_bookmarks.bookmark_color IS 'Color del marcador: red, yellow, green, blue, purple';
