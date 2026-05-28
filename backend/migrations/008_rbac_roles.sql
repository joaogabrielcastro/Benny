-- RBAC: apenas admin e mecanico

UPDATE usuarios
SET role = 'admin'
WHERE role IS NULL
   OR TRIM(role) = ''
   OR LOWER(role) NOT IN ('admin', 'mecanico');

ALTER TABLE usuarios ALTER COLUMN role SET DEFAULT 'admin';

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check;
ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_role_check CHECK (role IN ('admin', 'mecanico'));
