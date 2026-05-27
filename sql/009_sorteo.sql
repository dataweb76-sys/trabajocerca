-- =====================================================
-- 009 · Sorteo Instagram
-- Trabajos Cerca · 2026-05-27
-- =====================================================

-- Tabla de inscriptos al sorteo
CREATE TABLE IF NOT EXISTS public.sorteo_inscriptos (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instagram_usuario   text        NOT NULL,
  instagram_url       text,
  fecha_inscripcion   timestamptz DEFAULT now(),
  verificado          boolean     DEFAULT false,  -- para marcar si se verificó el post
  UNIQUE(user_id)                                 -- una inscripción por usuario
);

-- Tabla de ganadores (se completa el día del sorteo)
CREATE TABLE IF NOT EXISTS public.sorteo_ganadores (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  inscripto_id        uuid        REFERENCES public.sorteo_inscriptos(id),
  instagram_usuario   text        NOT NULL,
  puesto              int         NOT NULL CHECK (puesto IN (1, 2)),  -- 1er o 2do lugar
  created_at          timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────

ALTER TABLE public.sorteo_inscriptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sorteo_ganadores  ENABLE ROW LEVEL SECURITY;

-- Inscriptos: cualquiera puede contar (para el badge), solo el dueño lee su fila
CREATE POLICY "inscriptos_select_own"
  ON public.sorteo_inscriptos FOR SELECT
  USING (auth.uid() = user_id);

-- Inscriptos: usuario autenticado puede insertar su propia fila
CREATE POLICY "inscriptos_insert_own"
  ON public.sorteo_inscriptos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Ganadores: todos pueden ver (página pública post-sorteo)
CREATE POLICY "ganadores_select_all"
  ON public.sorteo_ganadores FOR SELECT
  USING (true);

-- ─────────────────────────────────────────────
-- Contar inscriptos (función pública sin auth)
-- Permite mostrar el contador aunque no estés logueado
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.contar_inscriptos_sorteo()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) FROM public.sorteo_inscriptos;
$$;

GRANT EXECUTE ON FUNCTION public.contar_inscriptos_sorteo() TO anon, authenticated;

-- ─────────────────────────────────────────────
-- Índices
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sorteo_inscriptos_user ON public.sorteo_inscriptos(user_id);
CREATE INDEX IF NOT EXISTS idx_sorteo_inscriptos_ig   ON public.sorteo_inscriptos(instagram_usuario);
