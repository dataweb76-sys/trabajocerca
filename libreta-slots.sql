-- ══════════════════════════════════════════════
--  LIBRETA SLOTS — sistema freemium + referidos
-- ══════════════════════════════════════════════

-- Slots extra por pagos o bonos (admin los agrega manualmente)
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS libreta_slots_extra INTEGER DEFAULT 0;

-- Última vez que el usuario vio la notificación de referidos (para el popup)
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS ref_ultima_visita TIMESTAMPTZ DEFAULT NOW();

-- Tabla de pagos de libreta (para registro, el admin la completa)
CREATE TABLE IF NOT EXISTS libreta_pagos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profesional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monto          INTEGER NOT NULL DEFAULT 10000,
  slots_sumados  INTEGER NOT NULL DEFAULT 10,
  comprobante    TEXT,   -- link o descripción del pago
  aprobado       BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE libreta_pagos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario_ve_sus_pagos" ON libreta_pagos
  FOR SELECT USING (auth.uid() = profesional_id);
CREATE POLICY "usuario_inserta_pago" ON libreta_pagos
  FOR INSERT WITH CHECK (auth.uid() = profesional_id);

-- Vista para calcular slots totales de cada usuario
-- slots = 5 (base) + libreta_slots_extra
-- El trigger de referidos suma slots_extra automáticamente al llegar a 10 y 20 puntos
