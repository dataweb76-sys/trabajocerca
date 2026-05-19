-- ============================================================
-- TRABAJOS CERCA — Esquema completo Supabase
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- TABLA PERFILES (agregar columnas si ya existe)
CREATE TABLE IF NOT EXISTS perfiles (
  id         uuid REFERENCES auth.users PRIMARY KEY,
  nombre     text,
  apellido   text,
  email      text,
  movil      text,
  telefono_fijo text,
  direccion  text,
  codigo_postal text,
  localidad  text,
  provincia  text,
  pais       text DEFAULT 'Argentina',
  lat        float8,
  lng        float8,
  foto       text,
  tipo       text DEFAULT 'profesional',  -- 'profesional' | 'trabajador'
  created_at timestamptz DEFAULT now()
);

ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS tipo  text DEFAULT 'profesional';
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS lat   float8;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS lng   float8;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS foto  text;

-- TABLA SERVICIOS (para profesionales que ofrecen un oficio)
CREATE TABLE IF NOT EXISTS servicios (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id  uuid REFERENCES perfiles(id) ON DELETE CASCADE,
  categoria   text NOT NULL,
  titulo      text,
  descripcion text,
  localidad   text,
  provincia   text,
  lat         float8,
  lng         float8,
  activo      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- TABLA CURRICULUM (para quienes buscan trabajo)
CREATE TABLE IF NOT EXISTS curriculum (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id         uuid REFERENCES perfiles(id) ON DELETE CASCADE,
  titulo_profesional text,
  resumen            text,
  habilidades        text,
  disponibilidad     text DEFAULT 'inmediata',
  modalidad          text DEFAULT 'presencial',
  experiencia        jsonb DEFAULT '[]'::jsonb,
  educacion          jsonb DEFAULT '[]'::jsonb,
  created_at         timestamptz DEFAULT now()
);

-- TABLA REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trabajador_id uuid REFERENCES perfiles(id) ON DELETE CASCADE,
  autor_id      uuid REFERENCES perfiles(id),
  rating        int CHECK (rating >= 1 AND rating <= 5),
  comentario    text,
  created_at    timestamptz DEFAULT now()
);

-- TABLA FOTOS DE TRABAJOS (feature de pago — próximo paso)
CREATE TABLE IF NOT EXISTS trabajos_fotos (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id  uuid REFERENCES perfiles(id) ON DELETE CASCADE,
  imagen      text NOT NULL,
  descripcion text,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE perfiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews        ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabajos_fotos ENABLE ROW LEVEL SECURITY;

-- PERFILES
CREATE POLICY "perfiles_select" ON perfiles FOR SELECT USING (true);
CREATE POLICY "perfiles_insert" ON perfiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "perfiles_update" ON perfiles FOR UPDATE USING (auth.uid() = id);

-- SERVICIOS
CREATE POLICY "servicios_select" ON servicios FOR SELECT USING (activo = true);
CREATE POLICY "servicios_insert" ON servicios FOR INSERT WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "servicios_update" ON servicios FOR UPDATE USING (auth.uid() = usuario_id);
CREATE POLICY "servicios_delete" ON servicios FOR DELETE USING (auth.uid() = usuario_id);

-- CURRICULUM
CREATE POLICY "curriculum_select" ON curriculum FOR SELECT USING (true);
CREATE POLICY "curriculum_insert" ON curriculum FOR INSERT WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "curriculum_update" ON curriculum FOR UPDATE USING (auth.uid() = usuario_id);

-- REVIEWS
CREATE POLICY "reviews_select" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK (auth.uid() = autor_id);

-- FOTOS
CREATE POLICY "fotos_select"  ON trabajos_fotos FOR SELECT USING (true);
CREATE POLICY "fotos_insert"  ON trabajos_fotos FOR INSERT WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "fotos_delete"  ON trabajos_fotos FOR DELETE USING (auth.uid() = usuario_id);

-- ============================================================
-- STORAGE — bucket "trabajos" (crear en Supabase > Storage)
-- ============================================================
-- Crear bucket "trabajos" como PUBLIC en el dashboard de Supabase.
-- Política de storage (SQL):

INSERT INTO storage.buckets (id, name, public) VALUES ('trabajos', 'trabajos', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "storage_select" ON storage.objects FOR SELECT USING (bucket_id = 'trabajos');
CREATE POLICY "storage_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'trabajos' AND auth.uid() IS NOT NULL);
CREATE POLICY "storage_delete" ON storage.objects FOR DELETE USING (bucket_id = 'trabajos' AND auth.uid() IS NOT NULL);
