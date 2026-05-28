-- =====================================================
-- 010 · Mundial 2026 — Fixture & Predicciones
-- Trabajos Cerca · 2026-05-29
-- =====================================================

-- ─────────────────────────────────────────────
-- TABLAS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mundial_equipos (
  id            serial      PRIMARY KEY,
  nombre        text        NOT NULL,
  codigo        char(3)     NOT NULL UNIQUE,
  bandera       text        NOT NULL,
  grupo         char(1)     NOT NULL,
  confederacion text
);

CREATE TABLE IF NOT EXISTS public.mundial_partidos (
  id                    serial      PRIMARY KEY,
  numero_partido        int         NOT NULL UNIQUE,
  fase                  text        NOT NULL,   -- grupo|octavos|cuartos|semis|tercero|final
  grupo                 char(1),                -- A–L solo para fase de grupos
  jornada               int,                    -- 1,2,3 para fase de grupos
  equipo_local_id       int         REFERENCES public.mundial_equipos(id),
  equipo_visitante_id   int         REFERENCES public.mundial_equipos(id),
  desc_local            text,                   -- "1A" / "2B" para knockout
  desc_visitante        text,
  fecha_inicio          timestamptz NOT NULL,
  estadio               text,
  ciudad                text,
  pais_sede             text,
  goles_local           int,
  goles_visitante       int,
  completado            boolean     DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.mundial_predicciones (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partido_id        int         NOT NULL REFERENCES public.mundial_partidos(id) ON DELETE CASCADE,
  goles_local       smallint    NOT NULL CHECK (goles_local   >= 0 AND goles_local   <= 20),
  goles_visitante   smallint    NOT NULL CHECK (goles_visitante >= 0 AND goles_visitante <= 20),
  puntos_obtenidos  smallint    DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE(user_id, partido_id)
);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

ALTER TABLE public.mundial_equipos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mundial_partidos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mundial_predicciones ENABLE ROW LEVEL SECURITY;

-- Equipos y partidos: lectura pública
DROP POLICY IF EXISTS "mundial_equipos_public"  ON public.mundial_equipos;
DROP POLICY IF EXISTS "mundial_partidos_public" ON public.mundial_partidos;
DROP POLICY IF EXISTS "predicciones_select"     ON public.mundial_predicciones;
DROP POLICY IF EXISTS "predicciones_insert"     ON public.mundial_predicciones;
DROP POLICY IF EXISTS "predicciones_update"     ON public.mundial_predicciones;

CREATE POLICY "mundial_equipos_public"
  ON public.mundial_equipos FOR SELECT USING (true);

CREATE POLICY "mundial_partidos_public"
  ON public.mundial_partidos FOR SELECT USING (true);

-- Predicciones: el usuario solo ve y edita las suyas
CREATE POLICY "predicciones_select"
  ON public.mundial_predicciones FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "predicciones_insert"
  ON public.mundial_predicciones FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "predicciones_update"
  ON public.mundial_predicciones FOR UPDATE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- FUNCIONES
-- ─────────────────────────────────────────────

-- Calcular puntos de un partido ya jugado (llamar tras ingresar resultado)
CREATE OR REPLACE FUNCTION public.calcular_puntos_mundial(p_partido_id int)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_gl int; v_gv int;
BEGIN
  SELECT goles_local, goles_visitante INTO v_gl, v_gv
  FROM mundial_partidos WHERE id = p_partido_id;

  UPDATE mundial_predicciones
  SET puntos_obtenidos = CASE
    WHEN goles_local = v_gl AND goles_visitante = v_gv THEN 3       -- resultado exacto
    WHEN (goles_local > goles_visitante AND v_gl > v_gv)
      OR (goles_local < goles_visitante AND v_gl < v_gv)
      OR (goles_local = goles_visitante AND v_gl = v_gv)  THEN 1    -- tendencia correcta
    ELSE 0
  END,
  updated_at = now()
  WHERE partido_id = p_partido_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calcular_puntos_mundial(int) TO authenticated;

-- Ranking público (bypasa RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.mundial_ranking()
RETURNS TABLE (
  user_id        uuid,
  nombre         text,
  total_puntos   bigint,
  exactos        bigint,
  tendencias     bigint,
  predicciones   bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    mp.user_id,
    pr.nombre,
    COALESCE(SUM(mp.puntos_obtenidos), 0)                              AS total_puntos,
    COUNT(CASE WHEN mp.puntos_obtenidos = 3 THEN 1 END)               AS exactos,
    COUNT(CASE WHEN mp.puntos_obtenidos = 1 THEN 1 END)               AS tendencias,
    COUNT(mp.id)                                                       AS predicciones
  FROM public.mundial_predicciones mp
  JOIN public.perfiles pr ON pr.id = mp.user_id
  GROUP BY mp.user_id, pr.nombre
  ORDER BY total_puntos DESC, exactos DESC
  LIMIT 200;
$$;

GRANT EXECUTE ON FUNCTION public.mundial_ranking() TO anon, authenticated;

-- Verificar premio Argentina para un usuario
CREATE OR REPLACE FUNCTION public.check_premio_argentina(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'exactos_argentina',
    (SELECT COUNT(*)
     FROM public.mundial_predicciones mp
     JOIN public.mundial_partidos p ON p.id = mp.partido_id
     WHERE mp.user_id = p_user_id
       AND mp.puntos_obtenidos = 3
       AND p.completado = true
       AND (p.equipo_local_id   = (SELECT id FROM public.mundial_equipos WHERE codigo = 'ARG')
         OR p.equipo_visitante_id = (SELECT id FROM public.mundial_equipos WHERE codigo = 'ARG'))),
    'califica_3',
    (SELECT COUNT(*) >= 3
     FROM public.mundial_predicciones mp
     JOIN public.mundial_partidos p ON p.id = mp.partido_id
     WHERE mp.user_id = p_user_id
       AND mp.puntos_obtenidos = 3
       AND p.completado = true
       AND (p.equipo_local_id   = (SELECT id FROM public.mundial_equipos WHERE codigo = 'ARG')
         OR p.equipo_visitante_id = (SELECT id FROM public.mundial_equipos WHERE codigo = 'ARG')))
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_premio_argentina(uuid) TO authenticated;

-- ─────────────────────────────────────────────
-- ÍNDICES
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_mwp_user    ON public.mundial_predicciones(user_id);
CREATE INDEX IF NOT EXISTS idx_mwp_partido ON public.mundial_predicciones(partido_id);
CREATE INDEX IF NOT EXISTS idx_mwpart_fase ON public.mundial_partidos(fase);
CREATE INDEX IF NOT EXISTS idx_mwpart_grup ON public.mundial_partidos(grupo);

-- ─────────────────────────────────────────────
-- DATOS: EQUIPOS (48 selecciones)
-- ─────────────────────────────────────────────

INSERT INTO public.mundial_equipos (id, nombre, codigo, bandera, grupo, confederacion) VALUES
-- Grupo A
(1,  'México',              'MEX', '🇲🇽', 'A', 'CONCACAF'),
(2,  'Sudáfrica',           'RSA', '🇿🇦', 'A', 'CAF'),
(3,  'Corea del Sur',       'KOR', '🇰🇷', 'A', 'AFC'),
(4,  'República Checa',     'CZE', '🇨🇿', 'A', 'UEFA'),
-- Grupo B
(5,  'Canadá',              'CAN', '🇨🇦', 'B', 'CONCACAF'),
(6,  'Bosnia Herzegovina',  'BIH', '🇧🇦', 'B', 'UEFA'),
(7,  'Qatar',               'QAT', '🇶🇦', 'B', 'AFC'),
(8,  'Suiza',               'SUI', '🇨🇭', 'B', 'UEFA'),
-- Grupo C
(9,  'Brasil',              'BRA', '🇧🇷', 'C', 'CONMEBOL'),
(10, 'Marruecos',           'MAR', '🇲🇦', 'C', 'CAF'),
(11, 'Haití',               'HAI', '🇭🇹', 'C', 'CONCACAF'),
(12, 'Escocia',             'SCO', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'C', 'UEFA'),
-- Grupo D
(13, 'Estados Unidos',      'USA', '🇺🇸', 'D', 'CONCACAF'),
(14, 'Paraguay',            'PAR', '🇵🇾', 'D', 'CONMEBOL'),
(15, 'Australia',           'AUS', '🇦🇺', 'D', 'AFC'),
(16, 'Turquía',             'TUR', '🇹🇷', 'D', 'UEFA'),
-- Grupo E
(17, 'Alemania',            'GER', '🇩🇪', 'E', 'UEFA'),
(18, 'Curazao',             'CUW', '🇨🇼', 'E', 'CONCACAF'),
(19, 'Costa de Marfil',     'CIV', '🇨🇮', 'E', 'CAF'),
(20, 'Ecuador',             'ECU', '🇪🇨', 'E', 'CONMEBOL'),
-- Grupo F
(21, 'Países Bajos',        'NED', '🇳🇱', 'F', 'UEFA'),
(22, 'Japón',               'JPN', '🇯🇵', 'F', 'AFC'),
(23, 'Túnez',               'TUN', '🇹🇳', 'F', 'CAF'),
(24, 'Suecia',              'SWE', '🇸🇪', 'F', 'UEFA'),
-- Grupo G
(25, 'Bélgica',             'BEL', '🇧🇪', 'G', 'UEFA'),
(26, 'Egipto',              'EGY', '🇪🇬', 'G', 'CAF'),
(27, 'Irán',                'IRN', '🇮🇷', 'G', 'AFC'),
(28, 'Nueva Zelanda',       'NZL', '🇳🇿', 'G', 'OFC'),
-- Grupo H
(29, 'España',              'ESP', '🇪🇸', 'H', 'UEFA'),
(30, 'Cabo Verde',          'CPV', '🇨🇻', 'H', 'CAF'),
(31, 'Arabia Saudita',      'KSA', '🇸🇦', 'H', 'AFC'),
(32, 'Uruguay',             'URU', '🇺🇾', 'H', 'CONMEBOL'),
-- Grupo I
(33, 'Francia',             'FRA', '🇫🇷', 'I', 'UEFA'),
(34, 'Senegal',             'SEN', '🇸🇳', 'I', 'CAF'),
(35, 'Irak',                'IRQ', '🇮🇶', 'I', 'AFC'),
(36, 'Noruega',             'NOR', '🇳🇴', 'I', 'UEFA'),
-- Grupo J
(37, 'Argentina',           'ARG', '🇦🇷', 'J', 'CONMEBOL'),
(38, 'Argelia',             'ALG', '🇩🇿', 'J', 'CAF'),
(39, 'Austria',             'AUT', '🇦🇹', 'J', 'UEFA'),
(40, 'Jordania',            'JOR', '🇯🇴', 'J', 'AFC'),
-- Grupo K
(41, 'Portugal',            'POR', '🇵🇹', 'K', 'UEFA'),
(42, 'R.D. del Congo',      'COD', '🇨🇩', 'K', 'CAF'),
(43, 'Uzbekistán',          'UZB', '🇺🇿', 'K', 'AFC'),
(44, 'Colombia',            'COL', '🇨🇴', 'K', 'CONMEBOL'),
-- Grupo L
(45, 'Inglaterra',          'ENG', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'L', 'UEFA'),
(46, 'Croacia',             'CRO', '🇭🇷', 'L', 'UEFA'),
(47, 'Ghana',               'GHA', '🇬🇭', 'L', 'CAF'),
(48, 'Panamá',              'PAN', '🇵🇦', 'L', 'CONCACAF')
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.mundial_equipos_id_seq', 48);

-- ─────────────────────────────────────────────
-- DATOS: PARTIDOS — FASE DE GRUPOS (72 partidos)
-- Tiempos en UTC · hora Argentina = UTC-3
-- ─────────────────────────────────────────────

INSERT INTO public.mundial_partidos
  (numero_partido, fase, grupo, jornada, equipo_local_id, equipo_visitante_id, fecha_inicio, estadio, ciudad, pais_sede)
VALUES

-- ══ GRUPO A ══ México(1) Sudáfrica(2) Corea del Sur(3) R.Checa(4)
(1,  'grupo','A',1, 1, 2, '2026-06-11 19:00+00', 'Estadio Azteca',     'Ciudad de México', 'México'),
(2,  'grupo','A',1, 3, 4, '2026-06-11 22:00+00', 'AT&T Stadium',       'Dallas',            'USA'),
(3,  'grupo','A',2, 1, 3, '2026-06-17 19:00+00', 'SoFi Stadium',       'Los Ángeles',       'USA'),
(4,  'grupo','A',2, 2, 4, '2026-06-17 22:00+00', 'Estadio Azteca',     'Ciudad de México', 'México'),
(5,  'grupo','A',3, 1, 4, '2026-06-24 21:00+00', 'Estadio Azteca',     'Ciudad de México', 'México'),
(6,  'grupo','A',3, 2, 3, '2026-06-24 21:00+00', 'MetLife Stadium',    'Nueva York',        'USA'),

-- ══ GRUPO B ══ Canadá(5) Bosnia(6) Qatar(7) Suiza(8)
(7,  'grupo','B',1, 5, 6, '2026-06-12 19:00+00', 'BMO Field',          'Toronto',           'Canadá'),
(8,  'grupo','B',1, 7, 8, '2026-06-12 22:00+00', 'Estadio Olímpico',   'Ciudad de México', 'México'),
(9,  'grupo','B',2, 5, 7, '2026-06-17 22:00+00', 'BC Place',           'Vancouver',         'Canadá'),
(10, 'grupo','B',2, 6, 8, '2026-06-18 01:00+00', 'Levi''s Stadium',    'San Francisco',     'USA'),
(11, 'grupo','B',3, 5, 8, '2026-06-23 21:00+00', 'BMO Field',          'Toronto',           'Canadá'),
(12, 'grupo','B',3, 6, 7, '2026-06-23 21:00+00', 'Estadio Akron',      'Guadalajara',       'México'),

-- ══ GRUPO C ══ Brasil(9) Marruecos(10) Haití(11) Escocia(12)
(13, 'grupo','C',1, 9, 10, '2026-06-13 19:00+00', 'MetLife Stadium',   'Nueva York',        'USA'),
(14, 'grupo','C',1,11, 12, '2026-06-13 22:00+00', 'Rose Bowl',         'Los Ángeles',       'USA'),
(15, 'grupo','C',2, 9, 11, '2026-06-18 19:00+00', 'Hard Rock Stadium', 'Miami',             'USA'),
(16, 'grupo','C',2,10, 12, '2026-06-18 22:00+00', 'AT&T Stadium',      'Dallas',            'USA'),
(17, 'grupo','C',3, 9, 12, '2026-06-24 21:00+00', 'MetLife Stadium',   'Nueva York',        'USA'),
(18, 'grupo','C',3,10, 11, '2026-06-24 21:00+00', 'Rose Bowl',         'Los Ángeles',       'USA'),

-- ══ GRUPO D ══ USA(13) Paraguay(14) Australia(15) Turquía(16)
(19, 'grupo','D',1,13, 14, '2026-06-12 22:00+00', 'Levi''s Stadium',   'San Francisco',     'USA'),
(20, 'grupo','D',1,15, 16, '2026-06-13 01:00+00', 'SoFi Stadium',      'Los Ángeles',       'USA'),
(21, 'grupo','D',2,13, 15, '2026-06-18 22:00+00', 'AT&T Stadium',      'Dallas',            'USA'),
(22, 'grupo','D',2,14, 16, '2026-06-19 01:00+00', 'Hard Rock Stadium', 'Miami',             'USA'),
(23, 'grupo','D',3,13, 16, '2026-06-25 21:00+00', 'MetLife Stadium',   'Nueva York',        'USA'),
(24, 'grupo','D',3,14, 15, '2026-06-25 21:00+00', 'Levi''s Stadium',   'San Francisco',     'USA'),

-- ══ GRUPO E ══ Alemania(17) Curazao(18) Costa de Marfil(19) Ecuador(20)
(25, 'grupo','E',1,17, 18, '2026-06-14 19:00+00', 'Lincoln Financial', 'Filadelfia',        'USA'),
(26, 'grupo','E',1,19, 20, '2026-06-14 22:00+00', 'Estadio Azteca',    'Ciudad de México', 'México'),
(27, 'grupo','E',2,17, 19, '2026-06-19 19:00+00', 'AT&T Stadium',      'Dallas',            'USA'),
(28, 'grupo','E',2,18, 20, '2026-06-19 22:00+00', 'MetLife Stadium',   'Nueva York',        'USA'),
(29, 'grupo','E',3,17, 20, '2026-06-25 21:00+00', 'Hard Rock Stadium', 'Miami',             'USA'),
(30, 'grupo','E',3,18, 19, '2026-06-25 21:00+00', 'Lincoln Financial', 'Filadelfia',        'USA'),

-- ══ GRUPO F ══ P.Bajos(21) Japón(22) Túnez(23) Suecia(24)
(31, 'grupo','F',1,21, 22, '2026-06-14 22:00+00', 'SoFi Stadium',      'Los Ángeles',       'USA'),
(32, 'grupo','F',1,23, 24, '2026-06-15 01:00+00', 'Arrowhead Stadium', 'Kansas City',       'USA'),
(33, 'grupo','F',2,21, 23, '2026-06-20 19:00+00', 'Levi''s Stadium',   'San Francisco',     'USA'),
(34, 'grupo','F',2,22, 24, '2026-06-20 22:00+00', 'Rose Bowl',         'Los Ángeles',       'USA'),
(35, 'grupo','F',3,21, 24, '2026-06-25 21:00+00', 'SoFi Stadium',      'Los Ángeles',       'USA'),
(36, 'grupo','F',3,22, 23, '2026-06-25 21:00+00', 'Arrowhead Stadium', 'Kansas City',       'USA'),

-- ══ GRUPO G ══ Bélgica(25) Egipto(26) Irán(27) N.Zelanda(28)
(37, 'grupo','G',1,25, 26, '2026-06-15 19:00+00', 'Rose Bowl',         'Los Ángeles',       'USA'),
(38, 'grupo','G',1,27, 28, '2026-06-15 22:00+00', 'Hard Rock Stadium', 'Miami',             'USA'),
(39, 'grupo','G',2,25, 27, '2026-06-20 22:00+00', 'Lincoln Financial', 'Filadelfia',        'USA'),
(40, 'grupo','G',2,26, 28, '2026-06-21 01:00+00', 'SoFi Stadium',      'Los Ángeles',       'USA'),
(41, 'grupo','G',3,25, 28, '2026-06-26 21:00+00', 'Rose Bowl',         'Los Ángeles',       'USA'),
(42, 'grupo','G',3,26, 27, '2026-06-26 21:00+00', 'Hard Rock Stadium', 'Miami',             'USA'),

-- ══ GRUPO H ══ España(29) Cabo Verde(30) Arabia Saudita(31) Uruguay(32)
(43, 'grupo','H',1,29, 30, '2026-06-15 22:00+00', 'MetLife Stadium',   'Nueva York',        'USA'),
(44, 'grupo','H',1,31, 32, '2026-06-16 01:00+00', 'AT&T Stadium',      'Dallas',            'USA'),
(45, 'grupo','H',2,29, 31, '2026-06-21 19:00+00', 'Hard Rock Stadium', 'Miami',             'USA'),
(46, 'grupo','H',2,30, 32, '2026-06-21 22:00+00', 'Lincoln Financial', 'Filadelfia',        'USA'),
(47, 'grupo','H',3,29, 32, '2026-06-26 21:00+00', 'MetLife Stadium',   'Nueva York',        'USA'),
(48, 'grupo','H',3,30, 31, '2026-06-26 21:00+00', 'AT&T Stadium',      'Dallas',            'USA'),

-- ══ GRUPO I ══ Francia(33) Senegal(34) Irak(35) Noruega(36)
(49, 'grupo','I',1,33, 34, '2026-06-16 19:00+00', 'MetLife Stadium',   'Nueva York',        'USA'),
(50, 'grupo','I',1,35, 36, '2026-06-16 22:00+00', 'SoFi Stadium',      'Los Ángeles',       'USA'),
(51, 'grupo','I',2,33, 35, '2026-06-21 22:00+00', 'AT&T Stadium',      'Dallas',            'USA'),
(52, 'grupo','I',2,34, 36, '2026-06-22 01:00+00', 'MetLife Stadium',   'Nueva York',        'USA'),
(53, 'grupo','I',3,33, 36, '2026-06-26 21:00+00', 'SoFi Stadium',      'Los Ángeles',       'USA'),
(54, 'grupo','I',3,34, 35, '2026-06-26 21:00+00', 'Arrowhead Stadium', 'Kansas City',       'USA'),

-- ══ GRUPO J ══ Argentina(37) Argelia(38) Austria(39) Jordania(40) ← FECHAS CONFIRMADAS
(55, 'grupo','J',1,37, 38, '2026-06-17 01:00+00', 'Arrowhead Stadium', 'Kansas City',       'USA'),   -- 22:00 ART 16/6
(56, 'grupo','J',1,39, 40, '2026-06-17 04:00+00', 'AT&T Stadium',      'Dallas',            'USA'),   -- 01:00 ART 17/6
(57, 'grupo','J',2,37, 39, '2026-06-22 17:00+00', 'AT&T Stadium',      'Dallas',            'USA'),   -- 14:00 ART 22/6
(58, 'grupo','J',2,40, 38, '2026-06-22 20:00+00', 'Levi''s Stadium',   'San Francisco',     'USA'),   -- 17:00 ART 22/6
(59, 'grupo','J',3,40, 37, '2026-06-28 02:00+00', 'AT&T Stadium',      'Dallas',            'USA'),   -- 23:00 ART 27/6
(60, 'grupo','J',3,38, 39, '2026-06-28 02:00+00', 'Arrowhead Stadium', 'Kansas City',       'USA'),   -- simultáneo

-- ══ GRUPO K ══ Portugal(41) R.D.Congo(42) Uzbekistán(43) Colombia(44)
(61, 'grupo','K',1,41, 42, '2026-06-17 19:00+00', 'Lincoln Financial', 'Filadelfia',        'USA'),
(62, 'grupo','K',1,43, 44, '2026-06-17 22:00+00', 'Hard Rock Stadium', 'Miami',             'USA'),
(63, 'grupo','K',2,41, 43, '2026-06-22 22:00+00', 'Rose Bowl',         'Los Ángeles',       'USA'),
(64, 'grupo','K',2,42, 44, '2026-06-23 01:00+00', 'SoFi Stadium',      'Los Ángeles',       'USA'),
(65, 'grupo','K',3,41, 44, '2026-06-27 21:00+00', 'Lincoln Financial', 'Filadelfia',        'USA'),
(66, 'grupo','K',3,42, 43, '2026-06-27 21:00+00', 'Hard Rock Stadium', 'Miami',             'USA'),

-- ══ GRUPO L ══ Inglaterra(45) Croacia(46) Ghana(47) Panamá(48)
(67, 'grupo','L',1,45, 46, '2026-06-17 22:00+00', 'MetLife Stadium',   'Nueva York',        'USA'),
(68, 'grupo','L',1,47, 48, '2026-06-18 01:00+00', 'AT&T Stadium',      'Dallas',            'USA'),
(69, 'grupo','L',2,45, 47, '2026-06-22 19:00+00', 'Hard Rock Stadium', 'Miami',             'USA'),
(70, 'grupo','L',2,46, 48, '2026-06-22 22:00+00', 'MetLife Stadium',   'Nueva York',        'USA'),
(71, 'grupo','L',3,45, 48, '2026-06-27 21:00+00', 'MetLife Stadium',   'Nueva York',        'USA'),
(72, 'grupo','L',3,46, 47, '2026-06-27 21:00+00', 'SoFi Stadium',      'Los Ángeles',       'USA')

ON CONFLICT (numero_partido) DO NOTHING;

-- ─────────────────────────────────────────────
-- DATOS: ELIMINACIÓN DIRECTA (32 partidos)
-- Equipos TBD — el admin los actualiza cuando avancen
-- ─────────────────────────────────────────────

INSERT INTO public.mundial_partidos
  (numero_partido, fase, desc_local, desc_visitante, fecha_inicio, ciudad, pais_sede)
VALUES
-- Dieciseisavos (16 partidos)
(73,  'octavos', '1A', '2B',          '2026-06-28 19:00+00', 'Dallas',          'USA'),
(74,  'octavos', '1C', '2D',          '2026-06-28 22:00+00', 'Los Ángeles',     'USA'),
(75,  'octavos', '1E', '2F',          '2026-06-29 19:00+00', 'Miami',           'USA'),
(76,  'octavos', '1G', '2H',          '2026-06-29 22:00+00', 'Nueva York',      'USA'),
(77,  'octavos', '1I', '2J',          '2026-06-30 19:00+00', 'Filadelfia',      'USA'),
(78,  'octavos', '1K', '2L',          '2026-06-30 22:00+00', 'San Francisco',   'USA'),
(79,  'octavos', '1B', '2A',          '2026-07-01 19:00+00', 'Toronto',         'Canadá'),
(80,  'octavos', '1D', '2C',          '2026-07-01 22:00+00', 'Kansas City',     'USA'),
(81,  'octavos', '1F', '2E',          '2026-07-02 19:00+00', 'Los Ángeles',     'USA'),
(82,  'octavos', '1H', '2G',          '2026-07-02 22:00+00', 'Dallas',          'USA'),
(83,  'octavos', '1J', '2I',          '2026-07-03 19:00+00', 'Miami',           'USA'),
(84,  'octavos', '1L', '2K',          '2026-07-03 22:00+00', 'Nueva York',      'USA'),
(85,  'octavos', '3ro (A/B/C/D)', '2da posición', '2026-07-04 19:00+00', 'Dallas',  'USA'),
(86,  'octavos', '3ro (E/F/G/H)', '2da posición', '2026-07-04 22:00+00', 'Los Ángeles', 'USA'),
(87,  'octavos', '3ro (I/J/K/L)', '2da posición', '2026-07-05 19:00+00', 'Miami',   'USA'),
(88,  'octavos', '3ro mejor',    '2da posición', '2026-07-05 22:00+00', 'Nueva York','USA'),
-- Cuartos de final (8 partidos)
(89,  'cuartos', 'W73', 'W74',  '2026-07-08 19:00+00', 'Los Ángeles',   'USA'),
(90,  'cuartos', 'W75', 'W76',  '2026-07-08 22:00+00', 'Dallas',        'USA'),
(91,  'cuartos', 'W77', 'W78',  '2026-07-09 19:00+00', 'Nueva York',    'USA'),
(92,  'cuartos', 'W79', 'W80',  '2026-07-09 22:00+00', 'Miami',         'USA'),
(93,  'cuartos', 'W81', 'W82',  '2026-07-10 19:00+00', 'San Francisco', 'USA'),
(94,  'cuartos', 'W83', 'W84',  '2026-07-10 22:00+00', 'Kansas City',   'USA'),
(95,  'cuartos', 'W85', 'W86',  '2026-07-11 19:00+00', 'Filadelfia',    'USA'),
(96,  'cuartos', 'W87', 'W88',  '2026-07-11 22:00+00', 'Dallas',        'USA'),
-- Semifinales (4 partidos)
(97,  'semis',   'W89', 'W90',  '2026-07-14 22:00+00', 'Dallas',        'USA'),
(98,  'semis',   'W91', 'W92',  '2026-07-14 19:00+00', 'Los Ángeles',   'USA'),
(99,  'semis',   'W93', 'W94',  '2026-07-15 19:00+00', 'Nueva York',    'USA'),
(100, 'semis',   'W95', 'W96',  '2026-07-15 22:00+00', 'Miami',         'USA'),
-- Tercer puesto
(101, 'tercero', 'Semifinalista', 'Semifinalista', '2026-07-18 22:00+00', 'Miami',   'USA'),
-- Finales
(102, 'semis',   'W97', 'W98',  '2026-07-17 22:00+00', 'Dallas',        'USA'),  -- 3ra SF si hay cuatro
(103, 'semis',   'W99', 'W100', '2026-07-17 19:00+00', 'Los Ángeles',   'USA'),
(104, 'final',   'Finalista 1', 'Finalista 2', '2026-07-19 19:00+00', 'Nueva York', 'USA')

ON CONFLICT (numero_partido) DO NOTHING;
