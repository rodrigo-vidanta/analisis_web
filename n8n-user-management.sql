-- Gestión de usuarios n8n
-- Usuario objetivo: rodrigomora@grupovidanta.com

-- 1. Ver todos los usuarios actuales
SELECT id, email, "firstName", "lastName", role, "createdAt" FROM "user" ORDER BY "createdAt";

-- 2. Buscar usuario específico
SELECT id, email, "firstName", "lastName", role FROM "user" WHERE email = 'rodrigomora@grupovidanta.com';

-- 3. Actualizar rol a global:owner (administrador)
UPDATE "user" SET role = 'global:owner' WHERE email = 'rodrigomora@grupovidanta.com';

-- 4. Verificar el cambio
SELECT email, role, "updatedAt" FROM "user" WHERE email = 'rodrigomora@grupovidanta.com';

-- 5. Ver todos los administradores
SELECT email, role FROM "user" WHERE role = 'global:owner' ORDER BY email;
