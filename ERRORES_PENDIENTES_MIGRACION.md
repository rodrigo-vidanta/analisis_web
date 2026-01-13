# Errores Pendientes en Migración Frontend

**Fecha:** 13 de Enero 2025  
**Estado:** LOGIN FUNCIONA pero hay errores secundarios

---

## Errores Actuales

### 1. Tabla `permissions` no existe
**Error:** `relation "permissions" does not exist`  
**Ubicación:** `get_user_permissions()` RPC function  
**Impacto:** Sistema de permisos avanzado no funciona

### 2. Foreign Key `coordinaciones` no encontrada
**Error:** `Could not find a relationship between 'auth_users' and 'coordinacion_id'`  
**Ubicación:** `useUserProfile.ts` línea 45-51  
**Impacto:** No puede cargar nombre de coordinación del usuario

### 3. Warning de Realtime
**Error:** `send() falling back to REST API`  
**Ubicación:** `authService.ts` línea 297  
**Impacto:** NINGUNO - solo deprecation warning

---

## Soluciones en Progreso

Necesito esquema de tabla `permissions` de system_ui para migrarla, o corregir la función RPC.

---

**Pregunta al usuario:** ¿Existe la tabla `permissions` en system_ui? Si sí, necesito su esquema.
