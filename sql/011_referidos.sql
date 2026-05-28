-- =====================================================
-- 011 · Sistema de referidos + Mundial participación
-- Trabajos Cerca · 2026-05-29
-- =====================================================

-- Columna en perfiles para contar referidos
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS puntos_referidos int DEFAULT 0;

-- Tabla de referidos
CREATE TABLE IF NOT EXISTS public.referidos (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  referidor_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referido_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(referido_id)   -- cada usuario puede ser referido solo una vez
);

ALTER TABLE public.referidos ENABLE ROW LEVEL SECURITY;

-- El referidor puede ver sus propios referidos
DROP POLICY IF EXISTS "referidos_select_own" ON public.referidos;
DROP POLICY IF EXISTS "referidos_insert"     ON public.referidos;

CREATE POLICY "referidos_select_own"
  ON public.referidos FOR SELECT
  USING (auth.uid() = referidor_id);

-- Cualquier usuario autenticado puede insertar (el auth_callback lo hace)
CREATE POLICY "referidos_insert"
  ON public.referidos FOR INSERT
  WITH CHECK (auth.uid() = referido_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_referidos_referidor ON public.referidos(referidor_id);
CREATE INDEX IF NOT EXISTS idx_referidos_referido  ON public.referidos(referido_id);

-- ─────────────────────────────────────────────
-- Función: contar referidos de un usuario (pública)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.contar_referidos(p_user_id uuid)
RETURNS bigint
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*) FROM public.referidos WHERE referidor_id = p_user_id;
$$;
GRANT EXECUTE ON FUNCTION public.contar_referidos(uuid) TO anon, authenticated;

-- ─────────────────────────────────────────────
-- Función: ¿puede participar en el mundial? (>= 10 referidos)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.puede_participar_mundial(p_user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*) >= 10 FROM public.referidos WHERE referidor_id = p_user_id;
$$;
GRANT EXECUTE ON FUNCTION public.puede_participar_mundial(uuid) TO authenticated;
