-- ══════════════════════════════════════════════
--  LIBRETA DE CLIENTES — Trabajos Cerca
--  Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════

-- Tabla de clientes del profesional
CREATE TABLE IF NOT EXISTS libreta_clientes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profesional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  apellido      TEXT,
  telefono      TEXT,
  email         TEXT,
  notas         TEXT,
  origen        TEXT DEFAULT 'manual',  -- 'manual' | 'plataforma'
  usuario_id    UUID REFERENCES auth.users(id), -- si está registrado en TC
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de trabajos por cliente
CREATE TABLE IF NOT EXISTS libreta_trabajos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    UUID NOT NULL REFERENCES libreta_clientes(id) ON DELETE CASCADE,
  profesional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descripcion   TEXT NOT NULL,
  categoria     TEXT,
  estado        TEXT DEFAULT 'consulta',  -- consulta | presupuestado | en_curso | terminado | cobrado
  monto         NUMERIC,
  fecha_inicio  DATE,
  fecha_fin     DATE,
  notas         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: cada profesional solo ve sus propios datos
ALTER TABLE libreta_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE libreta_trabajos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profesional_clientes" ON libreta_clientes
  FOR ALL USING (auth.uid() = profesional_id)
  WITH CHECK (auth.uid() = profesional_id);

CREATE POLICY "profesional_trabajos" ON libreta_trabajos
  FOR ALL USING (auth.uid() = profesional_id)
  WITH CHECK (auth.uid() = profesional_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_libreta_clientes_prof ON libreta_clientes(profesional_id);
CREATE INDEX IF NOT EXISTS idx_libreta_trabajos_cliente ON libreta_trabajos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_libreta_trabajos_prof ON libreta_trabajos(profesional_id);

-- Campo tiktok en perfiles (si no existe)
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS tiktok TEXT;
