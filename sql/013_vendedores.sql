-- ======================================================
-- 013 · Vendedores / Postulaciones
-- Trabajos Cerca · 2026-06-21
-- ======================================================

CREATE TABLE IF NOT EXISTS public.vendedores_postulaciones (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre          TEXT        NOT NULL,
  apellido        TEXT        NOT NULL,
  email           TEXT        NOT NULL,
  telefono        TEXT,
  ciudad          TEXT,
  provincia       TEXT,
  foto            TEXT,
  experiencia     TEXT,
  educacion       TEXT,
  habilidades     TEXT,
  motivacion      TEXT,        -- ¿por qué querés vender con nosotros?
  cv_archivo      TEXT,        -- URL PDF/Word subido
  acepta_terminos BOOLEAN      DEFAULT FALSE,
  aparece_buscador BOOLEAN     DEFAULT FALSE,
  estado          TEXT         DEFAULT 'pendiente',  -- pendiente | revisado | contactado | rechazado
  created_at      TIMESTAMPTZ  DEFAULT now()
);

ALTER TABLE public.vendedores_postulaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_ve_su_postulacion"
  ON public.vendedores_postulaciones FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "usuario_inserta_postulacion"
  ON public.vendedores_postulaciones FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "usuario_actualiza_postulacion"
  ON public.vendedores_postulaciones FOR UPDATE
  USING (auth.uid() = usuario_id);

-- Admin puede ver todo (usar service role o policy adicional)
CREATE INDEX IF NOT EXISTS idx_vendedores_estado ON public.vendedores_postulaciones(estado);
CREATE INDEX IF NOT EXISTS idx_vendedores_usuario ON public.vendedores_postulaciones(usuario_id);
