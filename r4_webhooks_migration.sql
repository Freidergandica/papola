-- Agregar campo cedula a profiles para matchear IdCliente de R4 Conecta
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cedula TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_cedula ON public.profiles(cedula) WHERE cedula IS NOT NULL;
