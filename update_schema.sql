-- Asignar rol de administrador a la cuenta principal
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'freidergandica@gmail.com';

-- Verificar el cambio
SELECT id, email, role, full_name FROM public.profiles WHERE email IN (
  'freidergandica@gmail.com',
  'freidergandica@juntossepuede.co'
);
