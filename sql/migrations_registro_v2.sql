-- ============================================================
-- Trabajos Cerca — Migración: Registros v2 + Admin Categorías
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ──────────────────────────────────────────
-- 1. Tabla configuracion (Gestión de categorías desde el admin)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS configuracion (
  clave       TEXT PRIMARY KEY,
  valor       JSONB        NOT NULL,
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden leer/escribir
DROP POLICY IF EXISTS "Admins pueden gestionar configuracion" ON configuracion;
CREATE POLICY "Admins pueden gestionar configuracion" ON configuracion
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.admin = true
    )
  );

-- ──────────────────────────────────────────
-- 2. Columnas nuevas en tabla perfiles
--    (Se agregan solo si no existen — seguro ejecutar múltiples veces)
-- ──────────────────────────────────────────
DO $$
BEGIN

  -- ── Tipo de perfil ──
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='perfiles' AND column_name='tipo_perfil'
  ) THEN
    ALTER TABLE perfiles ADD COLUMN tipo_perfil TEXT DEFAULT 'oficio';
    COMMENT ON COLUMN perfiles.tipo_perfil IS 'oficio | cv | profesional | emprendimiento';
  END IF;

  -- ── Compartidos ──
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='perfiles' AND column_name='telefono'
  ) THEN
    ALTER TABLE perfiles ADD COLUMN telefono TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='perfiles' AND column_name='codigo_postal'
  ) THEN
    ALTER TABLE perfiles ADD COLUMN codigo_postal TEXT;
  END IF;

  -- ── Profesional ──
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='perfiles' AND column_name='profesion_categoria'
  ) THEN
    ALTER TABLE perfiles ADD COLUMN profesion_categoria TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='perfiles' AND column_name='profesion_subcategoria'
  ) THEN
    ALTER TABLE perfiles ADD COLUMN profesion_subcategoria TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='perfiles' AND column_name='matricula'
  ) THEN
    ALTER TABLE perfiles ADD COLUMN matricula TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='perfiles' AND column_name='horario_dias'
  ) THEN
    ALTER TABLE perfiles ADD COLUMN horario_dias TEXT[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='perfiles' AND column_name='horario_desde'
  ) THEN
    ALTER TABLE perfiles ADD COLUMN horario_desde TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='perfiles' AND column_name='horario_hasta'
  ) THEN
    ALTER TABLE perfiles ADD COLUMN horario_hasta TEXT;
  END IF;

  -- ── Emprendimiento ──
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='perfiles' AND column_name='nombre_emprendimiento'
  ) THEN
    ALTER TABLE perfiles ADD COLUMN nombre_emprendimiento TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='perfiles' AND column_name='display_como'
  ) THEN
    ALTER TABLE perfiles ADD COLUMN display_como TEXT DEFAULT 'personal';
    COMMENT ON COLUMN perfiles.display_como IS 'personal | emprendimiento';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='perfiles' AND column_name='emprendimiento_categoria'
  ) THEN
    ALTER TABLE perfiles ADD COLUMN emprendimiento_categoria TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='perfiles' AND column_name='emprendimiento_subtipos'
  ) THEN
    ALTER TABLE perfiles ADD COLUMN emprendimiento_subtipos TEXT[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='perfiles' AND column_name='alcance'
  ) THEN
    ALTER TABLE perfiles ADD COLUMN alcance TEXT DEFAULT 'ciudad';
    COMMENT ON COLUMN perfiles.alcance IS 'ciudad | provincia | argentina';
  END IF;

END $$;

-- ──────────────────────────────────────────
-- 3. Verificar resultado
-- ──────────────────────────────────────────
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'perfiles'
ORDER BY ordinal_position;
