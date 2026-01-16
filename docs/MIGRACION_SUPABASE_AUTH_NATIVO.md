# Migración a Supabase Auth Nativo

**Fecha:** 16 Enero 2026  
**Versión:** 1.0.0  
**Estado:** Listo para pruebas

---

## Resumen

Esta migración cambia el sistema de autenticación de un sistema custom (`auth_users` + RPC `authenticate_user`) a **Supabase Auth nativo** con:

- Login/logout via `supabase.auth.signInWithPassword()` / `signOut()`
- Sesiones manejadas automáticamente con JWT
- Datos de usuario en `user_metadata` del JWT
- RLS basado en `auth.uid()` y `auth.jwt()->'user_metadata'`

---

## Archivos Creados/Modificados

### Scripts SQL (ejecutar en orden)

| Archivo | Descripción | Orden |
|---------|-------------|-------|
| `scripts/migration/test_supabase_auth_migration.sql` | Tests previos a migración | 1 |
| `scripts/migration/migrate_to_supabase_auth.sql` | Funciones y migración de usuarios | 2 |
| `scripts/migration/rls_policies_supabase_auth.sql` | Políticas RLS para tablas principales | 3 |

### Archivos TypeScript Modificados

| Archivo | Cambios |
|---------|---------|
| `src/services/authService.ts` | Refactorizado para usar `supabase.auth.signInWithPassword()` |
| `src/contexts/AuthContext.tsx` | Agregado `onAuthStateChange` listener |
| `src/hooks/useUserProfile.ts` | Compatible con `user_profiles_v2` y fallback legacy |
| `src/services/tokenService.ts` | Compatible con vistas nuevas y legacy |
| `src/services/backupService.ts` | Compatible con RPC `update_user_metadata` |

---

## Proceso de Migración

### Pre-requisitos

1. Backup de la base de datos
2. Comunicar a usuarios el mantenimiento programado
3. Acceso a Supabase Dashboard

### Paso 1: Ejecutar Tests (5 min)

```sql
-- En Supabase SQL Editor
-- Copiar y ejecutar: scripts/migration/test_supabase_auth_migration.sql
```

Verificar que todos los tests pasen. Si hay warnings, revisar antes de continuar.

### Paso 2: Crear Funciones de Migración (2 min)

```sql
-- En Supabase SQL Editor
-- Copiar y ejecutar: scripts/migration/migrate_to_supabase_auth.sql
-- (Solo las secciones 1, 3, 4, 5 - NO ejecutar la sección 2 todavía)
```

### Paso 3: Activar Modo Mantenimiento (1 min)

1. Detener el frontend (si está en producción)
2. O mostrar mensaje de mantenimiento

### Paso 4: Ejecutar Migración de Usuarios (5 min)

```sql
-- En Supabase SQL Editor
SELECT * FROM public.migrate_all_users_to_supabase_auth();
```

Verificar output:
- `MIGRADO`: Usuario migrado exitosamente
- `YA_EXISTE`: Usuario ya existía en auth.users
- `ERROR: ...`: Revisar y corregir

### Paso 5: Aplicar Políticas RLS (3 min)

```sql
-- En Supabase SQL Editor
-- Copiar y ejecutar: scripts/migration/rls_policies_supabase_auth.sql
```

### Paso 6: Desplegar Frontend (5 min)

```bash
# Desde el directorio del proyecto
git add -A
git commit -m "v2.3.0: Migración a Supabase Auth nativo"
git push origin main

# Si es AWS
./update-frontend.sh
```

### Paso 7: Verificar Login (5 min)

1. Intentar login con un usuario de prueba
2. Verificar que:
   - Login funciona correctamente
   - Datos del usuario se cargan
   - Permisos funcionan
   - Módulos cargan sin errores 406

### Paso 8: Desactivar Modo Mantenimiento

---

## Rollback (si es necesario)

### Opción 1: Rollback de Frontend

```bash
git revert HEAD
git push origin main
./update-frontend.sh
```

El frontend anterior usará el sistema legacy (`auth_users`) que permanece intacto.

### Opción 2: Rollback de Base de Datos

```sql
-- Eliminar usuarios migrados de auth.users
DELETE FROM auth.identities WHERE provider = 'email';
DELETE FROM auth.users WHERE aud = 'authenticated';

-- Eliminar funciones
DROP FUNCTION IF EXISTS public.migrate_user_to_supabase_auth(TEXT, TEXT, JSONB, UUID);
DROP FUNCTION IF EXISTS public.migrate_all_users_to_supabase_auth();
DROP VIEW IF EXISTS public.user_profiles_v2;

-- Deshabilitar RLS (volver a estado anterior)
ALTER TABLE public.prospectos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.llamadas_ventas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversaciones_whatsapp DISABLE ROW LEVEL SECURITY;
-- (etc.)
```

---

## Compatibilidad

Durante la transición, el código soporta ambos sistemas:

- **`auth_users`** (legacy): Tabla original con password_hash
- **`auth.users`** (nuevo): Tabla de Supabase Auth con user_metadata

Los servicios (`tokenService`, `backupService`, `useUserProfile`) intentan primero las vistas nuevas y hacen fallback a las legacy.

---

## Post-Migración

Después de verificar que todo funciona correctamente por al menos 1 semana:

1. **Opcional:** Eliminar tablas legacy (`auth_users`, `auth_sessions`)
2. **Opcional:** Eliminar vistas legacy (`auth_user_profiles`, `auth_users_safe`)
3. Actualizar documentación
4. Remover código de fallback en servicios

---

## Beneficios de la Nueva Arquitectura

1. **Seguridad mejorada:**
   - Sesiones manejadas por Supabase (no custom tokens)
   - JWT con firma y expiración automática
   - RLS basado en `auth.uid()` (nativo)

2. **Mantenimiento simplificado:**
   - No más RPC `authenticate_user`
   - No más tabla `auth_sessions` custom
   - Refresh de tokens automático

3. **Features adicionales:**
   - Magic links (si se habilitan)
   - OAuth providers (Google, etc.)
   - MFA (si se habilita)
   - Password recovery nativo

---

## Contacto

- **Autor:** PQNC AI Platform Team
- **Fecha:** 16 Enero 2026
