-- Configuración de Storage para Productos (Papola)

-- 1. Crear Bucket 'products' (Público)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Habilitar RLS en objetos de storage (por seguridad general)
-- (Comentado porque suele estar activo por defecto y requiere permisos de superusuario/owner)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Seguridad (Policies)

-- A. LECTURA: Todo el mundo puede ver las imágenes de productos
DROP POLICY IF EXISTS "Public Access Products" ON storage.objects;
CREATE POLICY "Public Access Products"
ON storage.objects FOR SELECT
USING ( bucket_id = 'products' );

-- B. ESCRITURA (INSERT): Usuarios autenticados pueden subir imágenes
-- Idealmente restringiríamos esto solo a 'store_owner' o 'admin'
DROP POLICY IF EXISTS "Auth Users Upload Products" ON storage.objects;
CREATE POLICY "Auth Users Upload Products"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'products' 
  AND auth.role() = 'authenticated'
);

-- C. ACTUALIZAR/BORRAR: Usuarios pueden gestionar sus PROPIAS imágenes
-- (Supabase Storage guarda el owner_id automáticamente al subir)
DROP POLICY IF EXISTS "Users Manage Own Product Images" ON storage.objects;
CREATE POLICY "Users Manage Own Product Images"
ON storage.objects FOR ALL
USING (
  bucket_id = 'products' 
  AND auth.uid() = owner
);
