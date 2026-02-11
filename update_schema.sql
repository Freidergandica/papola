-- Actualizar rol de superadmin
-- IMPORTANTE: Reemplaza 'tu-email-admin@ejemplo.com' por el correo real de tu superadmin
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'tu-email-admin@ejemplo.com';

-- Verificar el cambio
SELECT * FROM public.profiles WHERE role = 'admin';
