-- ======================================================
-- 014 · Jefe de Ventas por zona + CP
-- Trabajos Cerca · 2026-06-22
-- ======================================================

-- Agregar columnas a vendedores_postulaciones
ALTER TABLE public.vendedores_postulaciones
  ADD COLUMN IF NOT EXISTS tipo_postulacion TEXT DEFAULT 'vendedor',
  ADD COLUMN IF NOT EXISTS cp TEXT;

-- Comentarios
COMMENT ON COLUMN public.vendedores_postulaciones.tipo_postulacion IS 'vendedor | jefe_ventas';
COMMENT ON COLUMN public.vendedores_postulaciones.cp IS 'Código postal del postulante';

-- Índice para búsquedas por tipo + provincia
CREATE INDEX IF NOT EXISTS idx_vend_tipo_prov
  ON public.vendedores_postulaciones(tipo_postulacion, provincia);

-- ── Función RPC: verifica si ya hay jefe de ventas en una zona ──
-- Retorna TRUE si ya existe un jefe activo (no rechazado) en esa provincia.
-- SECURITY DEFINER para bypassear RLS sin exponer datos personales.
CREATE OR REPLACE FUNCTION public.hay_jefe_ventas(p_provincia TEXT, p_ciudad TEXT DEFAULT '')
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vendedores_postulaciones
    WHERE tipo_postulacion = 'jefe_ventas'
      AND provincia = p_provincia
      AND estado NOT IN ('rechazado')
  );
$$;

-- Dar permiso de ejecución a usuarios autenticados y anónimos
GRANT EXECUTE ON FUNCTION public.hay_jefe_ventas(TEXT, TEXT) TO anon, authenticated;
