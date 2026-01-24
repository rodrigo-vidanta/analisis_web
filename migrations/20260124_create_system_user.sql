-- ============================================
-- CREAR USUARIO SYSTEM PARA TICKETS AUTOMÁTICOS
-- ============================================
-- Fecha: 2026-01-24
-- Objetivo: Crear usuario "system" que no genera notificaciones al crear tickets

-- Insertar en auth.users (Supabase Auth)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  instance_id,
  aud,
  role,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'system@internal',
  crypt('SYSTEM_USER_NO_LOGIN_' || gen_random_uuid()::text, gen_salt('bf')), -- Password imposible de adivinar
  NOW(),
  NOW(),
  NOW(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  '{"provider":"system","providers":["system"]}',
  '{"full_name":"Sistema Automático","is_system":true}',
  false,
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- Comentario: El usuario system NO podrá hacer login debido a:
-- 1. Password generado con UUID aleatorio
-- 2. No tiene confirmed_at en producción
-- 3. Marcado como is_system en metadata
