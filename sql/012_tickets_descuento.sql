-- ======================================================
-- 012 · Sistema de Tickets de Descuento 10%
-- Trabajos Cerca · 2026-06-21
-- ======================================================

-- Columna: tickets acumulados por el cliente (se suman al llegar a 10 referidos)
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS tickets_descuento INTEGER DEFAULT 0;

-- Columna: toggle que activa el profesional/emprendimiento para aceptar tickets
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS acepta_ticket_descuento BOOLEAN DEFAULT FALSE;

-- Tabla de registro de tickets usados
CREATE TABLE IF NOT EXISTS public.tickets_usados (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profesional_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monto_original  NUMERIC,
  descuento_pct   INTEGER     NOT NULL DEFAULT 10,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tickets_usados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cliente_ve_sus_tickets_usados"
  ON public.tickets_usados FOR SELECT
  USING (auth.uid() = cliente_id);

CREATE POLICY "cliente_inserta_ticket"
  ON public.tickets_usados FOR INSERT
  WITH CHECK (auth.uid() = cliente_id);

CREATE POLICY "prof_ve_tickets_recibidos"
  ON public.tickets_usados FOR SELECT
  USING (auth.uid() = profesional_id);

CREATE INDEX IF NOT EXISTS idx_tickets_cliente ON public.tickets_usados(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tickets_prof    ON public.tickets_usados(profesional_id);
