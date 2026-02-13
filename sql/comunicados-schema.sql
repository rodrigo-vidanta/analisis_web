-- ============================================
-- SISTEMA DE COMUNICADOS EN TIEMPO REAL
-- ============================================
-- Ejecutar en Supabase SQL Editor (proyecto PQNC_AI: glsmifhkoaifvaegsozd)
-- Fecha: 2026-02-13

-- ============================================
-- 1. TABLA: comunicados
-- ============================================
CREATE TABLE IF NOT EXISTS comunicados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  contenido JSONB DEFAULT '{}',
  tipo TEXT NOT NULL DEFAULT 'info' CHECK (tipo IN ('info', 'feature', 'tutorial', 'mantenimiento', 'urgente')),
  prioridad INTEGER NOT NULL DEFAULT 5 CHECK (prioridad >= 0 AND prioridad <= 10),
  is_interactive BOOLEAN NOT NULL DEFAULT false,
  component_key TEXT,
  -- Targeting
  target_type TEXT NOT NULL DEFAULT 'todos' CHECK (target_type IN ('todos', 'coordinacion', 'usuarios', 'roles')),
  target_ids TEXT[] DEFAULT '{}',
  -- Estado
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'activo', 'archivado')),
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Stats
  read_count INTEGER NOT NULL DEFAULT 0,
  target_count INTEGER NOT NULL DEFAULT 0
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_comunicados_estado ON comunicados(estado);
CREATE INDEX IF NOT EXISTS idx_comunicados_tipo ON comunicados(tipo);
CREATE INDEX IF NOT EXISTS idx_comunicados_published_at ON comunicados(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_comunicados_created_by ON comunicados(created_by);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_comunicados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_comunicados_updated_at ON comunicados;
CREATE TRIGGER trigger_comunicados_updated_at
  BEFORE UPDATE ON comunicados
  FOR EACH ROW
  EXECUTE FUNCTION update_comunicados_updated_at();

-- ============================================
-- 2. TABLA: comunicado_reads
-- ============================================
CREATE TABLE IF NOT EXISTS comunicado_reads (
  comunicado_id UUID NOT NULL REFERENCES comunicados(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (comunicado_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comunicado_reads_user ON comunicado_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_comunicado_reads_comunicado ON comunicado_reads(comunicado_id);

-- ============================================
-- 3. RLS POLICIES
-- ============================================
ALTER TABLE comunicados ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicado_reads ENABLE ROW LEVEL SECURITY;

-- comunicados: SELECT - authenticated puede ver activos + sus borradores
CREATE POLICY "comunicados_select" ON comunicados
  FOR SELECT TO authenticated
  USING (estado = 'activo' OR created_by = auth.uid());

-- comunicados: INSERT - authenticated puede crear
CREATE POLICY "comunicados_insert" ON comunicados
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- comunicados: UPDATE - solo el creador
CREATE POLICY "comunicados_update" ON comunicados
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- comunicados: DELETE - solo el creador
CREATE POLICY "comunicados_delete" ON comunicados
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- comunicado_reads: INSERT - solo para si mismo
CREATE POLICY "comunicado_reads_insert" ON comunicado_reads
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- comunicado_reads: SELECT - ve sus propias lecturas + admin ve todo
CREATE POLICY "comunicado_reads_select" ON comunicado_reads
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles_v2
      WHERE id = auth.uid()
      AND role_name = 'admin'
    )
  );

-- ============================================
-- 4. RPC: mark_comunicado_read
-- ============================================
-- SECURITY DEFINER: necesita UPDATE en comunicados sin ser el creator
CREATE OR REPLACE FUNCTION mark_comunicado_read(p_comunicado_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el user_id coincide con el caller
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Insert read (ignore si ya existe)
  INSERT INTO comunicado_reads (comunicado_id, user_id)
  VALUES (p_comunicado_id, p_user_id)
  ON CONFLICT (comunicado_id, user_id) DO NOTHING;

  -- Update read_count en comunicados
  UPDATE comunicados
  SET read_count = (
    SELECT COUNT(*) FROM comunicado_reads WHERE comunicado_id = p_comunicado_id
  )
  WHERE id = p_comunicado_id;
END;
$$;

-- ============================================
-- 5. REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE comunicados;

-- ============================================
-- 6. GRANTS (asegurar acceso para authenticated)
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON comunicados TO authenticated;
GRANT SELECT, INSERT ON comunicado_reads TO authenticated;
GRANT EXECUTE ON FUNCTION mark_comunicado_read(UUID, UUID) TO authenticated;
