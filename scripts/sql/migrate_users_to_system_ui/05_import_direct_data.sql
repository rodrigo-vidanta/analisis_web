-- ============================================
-- IMPORTAR DATOS DIRECTAMENTE A SYSTEM_UI (VERSIÓN CORREGIDA)
-- Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- ============================================
-- 
-- Este script importa los datos exportados de pqnc_qa directamente
-- Usa los datos reales exportados por el usuario
-- ============================================

-- ============================================
-- PREPARACIÓN: Verificar estructura
-- ============================================
-- NOTA: Según el esquema real de System_UI, auth_users NO tiene:
-- - department
-- - position  
-- - organization
-- Estas columnas se omiten en la importación

-- ============================================
-- PASO 1: IMPORTAR ROLES
-- ============================================
INSERT INTO auth_roles (id, name, display_name, description, is_active, created_at)
VALUES
  ('12690827-493e-447b-ac2f-40174fe17389', 'admin', 'Administrador', 'Acceso completo a todas las funcionalidades del sistema', true, '2025-09-05 03:27:55.021026+00'),
  ('59386336-794d-40de-83a4-de73681d6904', 'developer', 'Desarrollador', 'Acceso a Constructor y Plantillas para desarrollo de agentes', true, '2025-09-05 03:27:55.021026+00'),
  ('c71d12b1-ceaf-4b15-8e34-a3c7ffc03971', 'evaluator', 'Evaluador', 'Acceso a módulos de análisis para evaluación de performance', true, '2025-09-05 03:27:55.021026+00'),
  ('fbfdcb63-b306-4179-b4ca-56bb27bbef98', 'productor', 'Productor', 'Productor de contenido con acceso a AI Models Manager', true, '2025-09-28 02:14:48.639898+00'),
  ('b0b27e96-f406-4e80-9b4d-f13086bfcb7a', 'vendedor', 'Vendedor', 'Vendedor con acceso a monitor en vivo y análisis de rendimiento', true, '2025-09-08 23:58:27.228+00')
ON CONFLICT (name) 
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- ============================================
-- PASO 2: IMPORTAR USUARIOS
-- ============================================
-- NOTA: Se omiten department, position, organization porque no existen en System_UI
INSERT INTO auth_users (
  id,
  email,
  password_hash,
  full_name,
  first_name,
  last_name,
  phone,
  role_id,
  is_active,
  email_verified,
  last_login,
  failed_login_attempts,
  locked_until,
  created_at,
  updated_at
)
VALUES
  ('e8ced62c-3fd0-4328-b61a-a59ebea2e877', 'samuelrosales@grupovidanta.com', '$2a$12$TJo9FdIfvM2q1PMtH/6WteIcHA9gNt9hUlOGlu3tMunrxUWTeAhlO', 'Samuel Rosales', 'Samuel', 'Rosales', '3333243333', '12690827-493e-447b-ac2f-40174fe17389', true, true, '2025-11-10 17:27:45.13+00', 0, null, '2025-09-05 03:27:55.021026+00', '2025-09-28 07:47:16.786+00'),
  ('97e0637a-78c0-4d9c-9522-a8f66097e2fb', 'rodrigomora@grupovidanta.com', '$2a$12$TZ058Nr3PRu9MloVP1BDneuxerPbI4Gmvv2bhRxwxckfcVN3AYGQ6', 'Rodrigo Mora', 'Rodrigo', 'Mora', '3315127354', '59386336-794d-40de-83a4-de73681d6904', true, true, '2025-11-06 16:23:05.183+00', 0, null, '2025-09-05 03:27:55.021026+00', '2025-10-07 21:41:20.044+00'),
  ('7f534574-e454-4c70-8ff6-5249414a546c', 'invitado@grupovidanta.com', '$2a$06$Ddq1jiKU5S6Jiy8IXEqrVudWahb.Ws1XsvrkTYbLotUhiRhl3QE0O', 'Usuario  Invitado', 'Usuario ', 'Invitado', null, 'b0b27e96-f406-4e80-9b4d-f13086bfcb7a', true, true, '2025-11-04 22:18:46.786+00', 0, null, '2025-09-05 06:04:31.813143+00', '2025-11-04 22:18:35.131537+00'),
  ('cb449edc-adc4-46b6-817a-c3c0f0bc2c1f', 'ivanvillavicencio@grupovidanta.com', '$2a$06$2V1n8uD3gSUpPlsu1VQnZO690ZYdIG/0iY2/3B5zgSxPt8Em5oF5e', 'Ivan Villavicencio', 'Ivan', 'Villavicencio', null, 'fbfdcb63-b306-4179-b4ca-56bb27bbef98', true, true, '2025-10-02 23:56:35.18+00', 0, null, '2025-09-05 15:27:37.937311+00', '2025-10-01 06:12:26.454+00'),
  ('af827437-9be7-4f68-a8b0-ae332dd56fd7', 'leonardoirak@grupovidanta.com', '$2a$12$vhHyPr320q0XUkTFkdych.DdafHRtlMWU5OSJX9XjzpKzVtHauUay', 'Leonardo Sanchez', 'Leonardo', 'Sanchez', null, '12690827-493e-447b-ac2f-40174fe17389', true, true, '2025-10-10 19:25:21.088+00', 0, null, '2025-09-12 16:22:46.106655+00', '2025-10-07 20:14:38.261+00'),
  ('19075bad-8ada-4d02-8c72-3177c092c757', 'josueibarra@grupovidanta.com', '$2a$12$I17uXeUIMtbMLwduGgnG0u2LOEVZjk1OhLy7XJQrZQvXevDfMqtha', 'Josue Ibarra', 'Josue', 'Ibarra', null, 'fbfdcb63-b306-4179-b4ca-56bb27bbef98', true, true, '2025-10-03 23:13:08.608+00', 0, null, '2025-09-30 16:12:50.153165+00', '2025-11-07 19:10:02.021+00')
ON CONFLICT (email)
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone = EXCLUDED.phone,
  role_id = EXCLUDED.role_id,
  is_active = EXCLUDED.is_active,
  email_verified = EXCLUDED.email_verified,
  last_login = EXCLUDED.last_login,
  failed_login_attempts = EXCLUDED.failed_login_attempts,
  locked_until = EXCLUDED.locked_until,
  updated_at = EXCLUDED.updated_at;

-- ============================================
-- PASO 3: IMPORTAR PERMISOS
-- ============================================
INSERT INTO auth_permissions (id, permission_name, module, sub_module, description, created_at)
VALUES
  ('cc8752ce-139a-47d8-838a-0b97290cad1d', 'admin.users.create', 'admin', null, 'Crear nuevos usuarios', '2025-09-05 03:27:55.021026+00'),
  ('8a9af158-3dca-491d-a788-ebdcba65bc82', 'admin.users.edit', 'admin', null, 'Editar usuarios existentes', '2025-09-05 03:27:55.021026+00'),
  ('69c80252-e2a4-4f9b-a2a8-28205fced276', 'admin.users.view', 'admin', null, 'Ver lista de usuarios', '2025-09-05 03:27:55.021026+00'),
  ('67e6cd43-8031-4ddd-a4e5-6166a5813061', 'ai_models.admin.manage_limits', 'ai_models', 'admin', 'Gestionar límites de tokens por usuario', '2025-09-28 02:14:48.639898+00'),
  ('df2ca4f7-a2c5-4497-aacb-c3ffcd20f85e', 'ai_models.admin.view', 'ai_models', 'admin', 'Ver panel de administración de tokens', '2025-09-28 02:14:48.639898+00'),
  ('7cebf96a-d3a1-4fd6-87e0-b6abc5fc23f5', 'ai_models.admin.view_usage', 'ai_models', 'admin', 'Ver estadísticas de uso de todos los usuarios', '2025-09-28 02:14:48.639898+00'),
  ('e659f797-ee94-4067-a07a-153b5fc586db', 'ai_models.dubbing.create', 'ai_models', 'dubbing', 'Crear proyectos de dubbing', '2025-09-28 02:14:48.639898+00'),
  ('defa23e9-fddf-4317-8277-0de4bba44dc4', 'ai_models.dubbing.view', 'ai_models', 'dubbing', 'Acceso a proyectos de dubbing', '2025-09-28 02:14:48.639898+00'),
  ('e10bbe42-abaa-42c7-8429-613e5638904d', 'ai_models.effects.generate', 'ai_models', 'sound_effects', 'Generar efectos de sonido', '2025-09-28 02:14:48.639898+00'),
  ('5991976b-ef7c-475d-9b48-c1fde8a78da4', 'ai_models.effects.view', 'ai_models', 'sound_effects', 'Ver pestaña Efectos de Sonido', '2025-09-28 02:14:48.639898+00'),
  ('c1c63653-f0be-4cc6-8f2d-8320cd5ce018', 'ai_models.isolation.use', 'ai_models', 'isolation', 'Usar aislamiento de audio', '2025-09-28 02:14:48.639898+00'),
  ('0216e074-7fcb-4a68-827f-89d4be1e8fb1', 'ai_models.library.play', 'ai_models', 'library', 'Reproducir previews de voces', '2025-09-28 02:14:48.639898+00'),
  ('0419c7b4-dce9-4787-93db-ddb0ab530c6c', 'ai_models.library.view', 'ai_models', 'library', 'Ver biblioteca de voces', '2025-09-28 02:14:48.639898+00'),
  ('ac8df69c-d341-4499-bff3-6ab08b3e1292', 'ai_models.music.generate', 'ai_models', 'music', 'Generar música con IA', '2025-09-28 02:14:48.639898+00'),
  ('7e832aa4-4949-4598-bf75-72fe45fe4995', 'ai_models.stt.transcribe', 'ai_models', 'speech_to_text', 'Transcribir archivos de audio', '2025-09-28 02:14:48.639898+00'),
  ('86fd1947-9728-4e26-bcd5-8c4ad39466d4', 'ai_models.stt.view', 'ai_models', 'speech_to_text', 'Ver pestaña Speech to Text', '2025-09-28 02:14:48.639898+00'),
  ('98d534d3-101f-43cb-883c-549802f359b7', 'ai_models.tts.advanced', 'ai_models', 'text_to_speech', 'Usar configuración avanzada TTS', '2025-09-28 02:14:48.639898+00'),
  ('617198f4-1158-4bf3-ab64-f906f292f635', 'ai_models.tts.generate', 'ai_models', 'text_to_speech', 'Generar audio con Text to Speech', '2025-09-28 02:14:48.639898+00'),
  ('bbcc980a-d876-46a6-910c-8dbd844947e0', 'ai_models.tts.view', 'ai_models', 'text_to_speech', 'Ver pestaña Text to Speech', '2025-09-28 02:14:48.639898+00'),
  ('b702d5cc-4589-48de-a40c-a7adb1104a2f', 'ai_models.view', 'ai_models', null, 'Acceso base al módulo AI Models Manager', '2025-09-28 02:14:48.639898+00'),
  ('3f595142-cd10-46de-a708-da132a4c91f1', 'ai_models.voices.clone', 'ai_models', 'voices', 'Clonar voces existentes', '2025-09-28 02:14:48.639898+00'),
  ('0f33e65a-68dc-426e-a620-983d96e64c9d', 'ai_models.voices.create', 'ai_models', 'voices', 'Crear voces personalizadas', '2025-09-28 02:14:48.639898+00'),
  ('56ea2c1d-88b6-4c87-8421-40faed3f2bb4', 'ai_models.voices.delete', 'ai_models', 'voices', 'Eliminar voces personalizadas', '2025-09-28 02:14:48.639898+00'),
  ('d82467da-06ae-4577-badf-2188bb762080', 'analisis.live_monitor.view', 'analisis', 'live_monitor', 'Ver monitor de llamadas en tiempo real', '2025-09-08 23:58:27.434+00'),
  ('527ee0da-d593-4e57-aceb-fa393047d53d', 'analisis.natalia.view', 'analisis', 'natalia', 'Ver análisis de Natalia', '2025-09-05 03:27:55.021026+00'),
  ('30ee9bdb-1a24-4092-9259-6eef5a8b9253', 'analisis.pqnc.view', 'analisis', 'pqnc', 'Ver análisis de PQNC', '2025-09-05 03:27:55.021026+00'),
  ('2219757a-d8fb-4f66-9db2-2a8c8dfac827', 'analisis.view', 'analisis', null, 'Ver el módulo Análisis', '2025-09-05 03:27:55.021026+00'),
  ('c25585ef-bdbd-4014-8c14-2ad812c9c7e8', 'constructor.create', 'constructor', null, 'Crear nuevos agentes', '2025-09-05 03:27:55.021026+00'),
  ('209a2ca1-a9ef-4d54-813a-cf500fb844c5', 'constructor.edit', 'constructor', null, 'Editar agentes existentes', '2025-09-05 03:27:55.021026+00'),
  ('eefafe70-c301-4152-b90b-e72436f5e6df', 'constructor.view', 'constructor', null, 'Ver el módulo Constructor', '2025-09-05 03:27:55.021026+00'),
  ('160ee294-03d7-476e-991b-041cfe11bbec', 'plantillas.create', 'plantillas', null, 'Crear nuevas plantillas', '2025-09-05 03:27:55.021026+00'),
  ('db6619f5-7630-4055-a65d-af2caaf41290', 'plantillas.edit', 'plantillas', null, 'Editar plantillas existentes', '2025-09-05 03:27:55.021026+00'),
  ('a598a3a8-26b3-468d-bee9-9bf8257d050c', 'plantillas.view', 'plantillas', null, 'Ver el módulo Plantillas', '2025-09-05 03:27:55.021026+00')
ON CONFLICT (permission_name)
DO UPDATE SET
  module = EXCLUDED.module,
  sub_module = EXCLUDED.sub_module,
  description = EXCLUDED.description;

-- ============================================
-- PASO 4: IMPORTAR RELACIÓN ROLES-PERMISOS
-- ============================================
INSERT INTO auth_role_permissions (id, role_id, permission_id, created_at)
VALUES
  ('6ffc16e2-6c8e-4f64-aa68-1d1a661fdaef', '12690827-493e-447b-ac2f-40174fe17389', '0216e074-7fcb-4a68-827f-89d4be1e8fb1', '2025-09-28 02:14:48.639898+00'),
  ('05f37d83-5bd8-414b-8685-3df195999184', '12690827-493e-447b-ac2f-40174fe17389', '0419c7b4-dce9-4787-93db-ddb0ab530c6c', '2025-09-28 02:14:48.639898+00'),
  ('dc18811d-2733-4690-a89e-a38f2001ae91', '12690827-493e-447b-ac2f-40174fe17389', '0f33e65a-68dc-426e-a620-983d96e64c9d', '2025-09-28 02:14:48.639898+00'),
  ('b6ebb7cb-5d09-4dda-a870-6c0f18a1a3a5', '12690827-493e-447b-ac2f-40174fe17389', '160ee294-03d7-476e-991b-041cfe11bbec', '2025-09-05 03:27:55.021026+00'),
  ('0f55dfc0-1a99-40f1-8828-e25a0b11e5b0', '12690827-493e-447b-ac2f-40174fe17389', '209a2ca1-a9ef-4d54-813a-cf500fb844c5', '2025-09-05 03:27:55.021026+00'),
  ('e9465c48-154c-4854-9f83-8ef6a564799e', '12690827-493e-447b-ac2f-40174fe17389', '2219757a-d8fb-4f66-9db2-2a8c8dfac827', '2025-09-05 03:27:55.021026+00'),
  ('47073264-9bbd-47ae-8b5b-b021f6c97ab6', '12690827-493e-447b-ac2f-40174fe17389', '3f595142-cd10-46de-a708-da132a4c91f1', '2025-09-28 02:14:48.639898+00'),
  ('6f011740-3f3d-4b2c-961e-c93ab87685b3', '12690827-493e-447b-ac2f-40174fe17389', '56ea2c1d-88b6-4c87-8421-40faed3f2bb4', '2025-09-28 02:14:48.639898+00'),
  ('1198f5fd-e8e6-4741-97aa-aa1d3ba57ddc', '12690827-493e-447b-ac2f-40174fe17389', '5991976b-ef7c-475d-9b48-c1fde8a78da4', '2025-09-28 02:14:48.639898+00'),
  ('c426c0e1-1b62-445d-a442-c4474f1eed0b', '12690827-493e-447b-ac2f-40174fe17389', '617198f4-1158-4bf3-ab64-f906f292f635', '2025-09-28 02:14:48.639898+00'),
  ('8918cca6-d237-4560-a7d0-c1ed220537e6', '12690827-493e-447b-ac2f-40174fe17389', '67e6cd43-8031-4ddd-a4e5-6166a5813061', '2025-09-28 02:14:48.639898+00'),
  ('698be310-cf7f-4e3b-b620-34ce20fdf38e', '12690827-493e-447b-ac2f-40174fe17389', '69c80252-e2a4-4f9b-a2a8-28205fced276', '2025-09-05 03:27:55.021026+00'),
  ('c169972f-1d06-483b-9926-640da5eff43d', '12690827-493e-447b-ac2f-40174fe17389', '7cebf96a-d3a1-4fd6-87e0-b6abc5fc23f5', '2025-09-28 02:14:48.639898+00'),
  ('935c507e-df88-4844-a3d8-d2533f7e8492', '12690827-493e-447b-ac2f-40174fe17389', '7e832aa4-4949-4598-bf75-72fe45fe4995', '2025-09-28 02:14:48.639898+00'),
  ('65dc293e-6a25-4447-a388-d1ef8bf54be8', '12690827-493e-447b-ac2f-40174fe17389', '86fd1947-9728-4e26-bcd5-8c4ad39466d4', '2025-09-28 02:14:48.639898+00'),
  ('4dfcd51b-fa1f-4081-b5b9-01a41bc917b7', '12690827-493e-447b-ac2f-40174fe17389', '8a9af158-3dca-491d-a788-ebdcba65bc82', '2025-09-05 03:27:55.021026+00'),
  ('f44f0afd-bbad-428c-8092-97d9df349c06', '12690827-493e-447b-ac2f-40174fe17389', '98d534d3-101f-43cb-883c-549802f359b7', '2025-09-28 02:14:48.639898+00'),
  ('67551fea-1588-4b6f-a049-88a262ecf7cc', '12690827-493e-447b-ac2f-40174fe17389', 'a598a3a8-26b3-468d-bee9-9bf8257d050c', '2025-09-05 03:27:55.021026+00'),
  ('ff537e95-685c-4930-8188-7de57c2d8138', '12690827-493e-447b-ac2f-40174fe17389', 'ac8df69c-d341-4499-bff3-6ab08b3e1292', '2025-09-28 02:14:48.639898+00'),
  ('423830b5-61ae-462a-b99a-2d8294e86a19', '12690827-493e-447b-ac2f-40174fe17389', 'b702d5cc-4589-48de-a40c-a7adb1104a2f', '2025-09-28 02:14:48.639898+00'),
  ('52ab8374-bcf2-45fe-9ed6-a419b57b378a', '12690827-493e-447b-ac2f-40174fe17389', 'bbcc980a-d876-46a6-910c-8dbd844947e0', '2025-09-28 02:14:48.639898+00'),
  ('9f6a3361-5767-4bbb-8625-c1d6c9745f6b', '12690827-493e-447b-ac2f-40174fe17389', 'c1c63653-f0be-4cc6-8f2d-8320cd5ce018', '2025-09-28 02:14:48.639898+00'),
  ('0fc937a6-a638-4746-b47a-0d19ae6f5a2e', '12690827-493e-447b-ac2f-40174fe17389', 'c25585ef-bdbd-4014-8c14-2ad812c9c7e8', '2025-09-05 03:27:55.021026+00'),
  ('3740641a-c58c-43ef-9057-0528e2bf6a1d', '12690827-493e-447b-ac2f-40174fe17389', 'cc8752ce-139a-47d8-838a-0b97290cad1d', '2025-09-05 03:27:55.021026+00'),
  ('116c03a6-8e01-4abe-b83a-798c75e2c243', '12690827-493e-447b-ac2f-40174fe17389', 'db6619f5-7630-4055-a65d-af2caaf41290', '2025-09-05 03:27:55.021026+00'),
  ('c9c7dd54-1b63-4692-9743-967db75eebb9', '12690827-493e-447b-ac2f-40174fe17389', 'defa23e9-fddf-4317-8277-0de4bba44dc4', '2025-09-28 02:14:48.639898+00'),
  ('8c1d4146-e47e-4e1f-a313-daf0268a809f', '12690827-493e-447b-ac2f-40174fe17389', 'df2ca4f7-a2c5-4497-aacb-c3ffcd20f85e', '2025-09-28 02:14:48.639898+00'),
  ('9bd682d7-6a99-4153-8192-d6cf0141164f', '12690827-493e-447b-ac2f-40174fe17389', 'e10bbe42-abaa-42c7-8429-613e5638904d', '2025-09-28 02:14:48.639898+00'),
  ('2465dcaf-257e-4a3f-b0d9-5dabf3307bb2', '12690827-493e-447b-ac2f-40174fe17389', 'e659f797-ee94-4067-a07a-153b5fc586db', '2025-09-28 02:14:48.639898+00'),
  ('7400f2aa-8bc0-480e-b7ed-c67f09640bbd', '12690827-493e-447b-ac2f-40174fe17389', 'eefafe70-c301-4152-b90b-e72436f5e6df', '2025-09-05 03:27:55.021026+00'),
  ('4ee18c1a-8e1d-44a2-94ce-57284b00ab5c', '59386336-794d-40de-83a4-de73681d6904', '160ee294-03d7-476e-991b-041cfe11bbec', '2025-09-05 03:27:55.021026+00'),
  ('0ebbdef0-1508-47d7-a58c-8929b66817ad', '59386336-794d-40de-83a4-de73681d6904', '209a2ca1-a9ef-4d54-813a-cf500fb844c5', '2025-09-05 03:27:55.021026+00'),
  ('84dd255c-aa36-45d9-968f-ab557c397fed', '59386336-794d-40de-83a4-de73681d6904', 'a598a3a8-26b3-468d-bee9-9bf8257d050c', '2025-09-05 03:27:55.021026+00'),
  ('fcfc3611-9bef-49c1-8324-8c5bd3025419', '59386336-794d-40de-83a4-de73681d6904', 'c25585ef-bdbd-4014-8c14-2ad812c9c7e8', '2025-09-05 03:27:55.021026+00'),
  ('2db9b928-63cc-488e-8326-e446e3f4e0ba', '59386336-794d-40de-83a4-de73681d6904', 'db6619f5-7630-4055-a65d-af2caaf41290', '2025-09-05 03:27:55.021026+00'),
  ('87e4191c-f43b-4e88-a817-c0a7a2d23f38', '59386336-794d-40de-83a4-de73681d6904', 'eefafe70-c301-4152-b90b-e72436f5e6df', '2025-09-05 03:27:55.021026+00'),
  ('0df3749d-6790-4674-9884-c1260898e49b', 'c71d12b1-ceaf-4b15-8e34-a3c7ffc03971', '2219757a-d8fb-4f66-9db2-2a8c8dfac827', '2025-09-05 03:27:55.021026+00'),
  ('700f7475-9905-47f6-9b71-e69b4a0d2d65', 'c71d12b1-ceaf-4b15-8e34-a3c7ffc03971', '30ee9bdb-1a24-4092-9259-6eef5a8b9253', '2025-09-09 00:09:03.251671+00'),
  ('cc7b07a0-8e9b-4939-a18b-e86b2e8fecac', 'c71d12b1-ceaf-4b15-8e34-a3c7ffc03971', 'd82467da-06ae-4577-badf-2188bb762080', '2025-09-09 00:09:03.251671+00'),
  ('5cdef079-bad9-4e1c-8abc-d561b8f5ede3', 'fbfdcb63-b306-4179-b4ca-56bb27bbef98', '0216e074-7fcb-4a68-827f-89d4be1e8fb1', '2025-09-28 02:14:48.639898+00'),
  ('70336191-ed32-4cc5-a77b-7c1d3a87ff2f', 'fbfdcb63-b306-4179-b4ca-56bb27bbef98', '0419c7b4-dce9-4787-93db-ddb0ab530c6c', '2025-09-28 02:14:48.639898+00'),
  ('56fe1c81-d515-4242-9d57-bdf4cd98da8e', 'fbfdcb63-b306-4179-b4ca-56bb27bbef98', '7e832aa4-4949-4598-bf75-72fe45fe4995', '2025-09-28 02:14:48.639898+00'),
  ('18b6bef4-21d3-439a-93dc-2577d08a1129', 'fbfdcb63-b306-4179-b4ca-56bb27bbef98', '86fd1947-9728-4e26-bcd5-8c4ad39466d4', '2025-09-28 02:14:48.639898+00'),
  ('3ea99cb0-9e95-4f68-bf22-9f696bdaba06', 'fbfdcb63-b306-4179-b4ca-56bb27bbef98', 'b702d5cc-4589-48de-a40c-a7adb1104a2f', '2025-09-28 02:14:48.639898+00')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- PASO 5: IMPORTAR PERMISOS DE USUARIOS
-- ============================================
INSERT INTO auth_user_permissions (id, user_id, permission_name, module, sub_module, granted_at, granted_by)
VALUES
  ('c82004cf-82c9-45a5-96ae-826dd48814ab', '7f534574-e454-4c70-8ff6-5249414a546c', 'analisis.natalia.view', 'analisis', 'natalia', '2025-09-06 17:17:46.303112+00', null),
  ('21747604-6c91-4430-9d0b-bfd973ad3108', '7f534574-e454-4c70-8ff6-5249414a546c', 'analisis.pqnc.view', 'analisis', 'pqnc', '2025-09-06 17:17:46.303112+00', null),
  ('94826039-0794-4b38-8a58-65e3e56060ff', '97e0637a-78c0-4d9c-9522-a8f66097e2fb', 'analisis.pqnc.view', 'analisis', 'pqnc', '2025-09-11 17:49:25.065607+00', null),
  ('43ac3839-821d-49c3-93f2-6e031c5343a6', 'af827437-9be7-4f68-a8b0-ae332dd56fd7', 'analisis.pqnc.view', 'analisis', 'pqnc', '2025-09-12 16:23:56.091198+00', null),
  ('2ae69720-8616-4d3f-a91e-f00bbea893b8', 'cb449edc-adc4-46b6-817a-c3c0f0bc2c1f', 'analisis.pqnc.view', 'analisis', 'pqnc', '2025-09-05 15:29:44.611558+00', null)
ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 6: IMPORTAR AVATARES
-- ============================================
INSERT INTO user_avatars (id, user_id, avatar_url, filename, file_size, mime_type, uploaded_at)
VALUES
  ('bed2de70-d2c0-48a4-be22-2ed99c04dcbd', '7f534574-e454-4c70-8ff6-5249414a546c', 'https://hmmfuhqgvsehkizlfzga.supabase.co/storage/v1/object/public/user-avatars/avatar-7f534574-e454-4c70-8ff6-5249414a546c-1757146443128.jpeg', '3EUOrj8_AxO_d4Ecky17R.jpeg', 98887, 'image/jpeg', '2025-09-05 19:24:40.749663+00'),
  ('4e6001ff-43b4-4d56-b039-b96cb0dcb593', '97e0637a-78c0-4d9c-9522-a8f66097e2fb', 'https://hmmfuhqgvsehkizlfzga.supabase.co/storage/v1/object/public/user-avatars/avatar-97e0637a-78c0-4d9c-9522-a8f66097e2fb-1757048265908.jpeg', 'WhatsApp Image 2025-08-26 at 15.13.14.jpeg', 93959, 'image/jpeg', '2025-09-05 04:57:46.667133+00'),
  ('52e5bd59-c324-4eb3-a769-5398187aee26', 'af827437-9be7-4f68-a8b0-ae332dd56fd7', 'https://hmmfuhqgvsehkizlfzga.supabase.co/storage/v1/object/public/user-avatars/avatar-af827437-9be7-4f68-a8b0-ae332dd56fd7-1757694231284.png', '1.png', 1140859, 'image/png', '2025-09-12 16:23:52.325475+00'),
  ('f56d71bb-7ba7-4c93-b0cd-499e41e16a9a', 'cb449edc-adc4-46b6-817a-c3c0f0bc2c1f', 'https://hmmfuhqgvsehkizlfzga.supabase.co/storage/v1/object/public/user-avatars/avatar-cb449edc-adc4-46b6-817a-c3c0f0bc2c1f-1759299140607.jpeg', 'b1947214-977f-43f4-a3ce-91f987b63b07.jpeg', 15228, 'image/jpeg', '2025-10-01 06:12:21.405263+00'),
  ('a55a6283-0c37-4b8c-bc84-3663f2a2362a', 'e8ced62c-3fd0-4328-b61a-a59ebea2e877', 'https://hmmfuhqgvsehkizlfzga.supabase.co/storage/v1/object/public/user-avatars/avatar-e8ced62c-3fd0-4328-b61a-a59ebea2e877-1757048350213.jpeg', 'fDa-ab7bRitmZyhdJJjlX.jpeg', 76441, 'image/jpeg', '2025-09-05 04:59:10.988668+00')
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================
DO $$
DECLARE
  roles_count INTEGER;
  users_count INTEGER;
  permissions_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO roles_count FROM auth_roles;
  SELECT COUNT(*) INTO users_count FROM auth_users;
  SELECT COUNT(*) INTO permissions_count FROM auth_permissions;
  
  RAISE NOTICE '✅ Migración completada';
  RAISE NOTICE '📊 Roles migrados: %', roles_count;
  RAISE NOTICE '👥 Usuarios migrados: %', users_count;
  RAISE NOTICE '🔐 Permisos migrados: %', permissions_count;
END $$;
