# Fix: Sistema de Sesión Única (Prevención de Sesiones Duplicadas)

**Fecha:** 29 de Enero 2026  
**Problema:** Después de migración a Supabase Auth nativo, se perdió funcionalidad de sesión única  
**Estado:** En desarrollo

---

## Diagnóstico

### Antes (Auth Custom)
```
✅ Tabla auth_sessions con user_id UNIQUE
✅ Al hacer login, se invalidaba sesión anterior
✅ Broadcast channel notificaba al cliente anterior
✅ Cliente anterior recibía forzar logout
```

### Después (Supabase Auth Nativo - 16 Enero 2026)
```
❌ Supabase Auth permite múltiples sesiones por defecto
❌ No existe control de sesión única
❌ Lógica de broadcast fue marcada como DEPRECADA
❌ Usuarios pueden iniciar sesión simultáneamente
```

### Código Legacy (deshabilitado)
**Archivo:** `src/contexts/AuthContext.tsx` (líneas 167-242)

```typescript
// NOTA: Verificación de sesión legacy DEPRECADA
// Con Supabase Auth nativo, las sesiones se manejan automáticamente
```

---

## Solución Propuesta

### Arquitectura
```
┌─────────────────────────────────────────────────────┐
│ 1. Login (nuevo dispositivo)                        │
│    └─> Verifica tabla active_sessions               │
│        └─> Si existe sesión: INVALIDA anterior      │
│            └─> Broadcast via Realtime: "logout"     │
│                └─> Cliente anterior: forceLogout()  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 2. Cliente anterior escucha Realtime                │
│    └─> Recibe evento "session_invalidated"          │
│        └─> Ejecuta handleForceLogout()              │
│            └─> Toast: "Sesión iniciada en otro..."  │
│                └─> Logout automático                │
└─────────────────────────────────────────────────────┘
```

### Base de Datos

#### Tabla: `active_sessions`
```sql
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,        -- UUID generado en cliente
  device_info JSONB,                -- { browser, os, ip }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- CONSTRAINT: Solo 1 sesión activa por usuario
  UNIQUE(user_id)
);

-- Índice para limpieza de sesiones expiradas
CREATE INDEX idx_active_sessions_expires ON active_sessions(expires_at);

-- RLS
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Solo usuarios autenticados leen su propia sesión
CREATE POLICY "Users can read own session"
  ON public.active_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role puede todo (para Edge Function)
CREATE POLICY "Service role full access"
  ON public.active_sessions FOR ALL
  USING (auth.role() = 'service_role');
```

#### Función: Limpieza de sesiones expiradas
```sql
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.active_sessions
  WHERE expires_at < NOW();
END;
$$;

-- Trigger automático (cada hora vía pg_cron o manual)
```

---

## Implementación

### 1. Crear Tabla en Base de Datos
**Script:** `migrations/20260129_active_sessions.sql`

```sql
-- Ejecutar en Supabase SQL Editor
-- Ver contenido completo arriba
```

### 2. Modificar `authService.ts`

**Archivo:** `src/services/authService.ts`

Agregar después del login exitoso de Supabase Auth:

```typescript
async login(credentials: LoginCredentials): Promise<AuthState> {
  try {
    // ... código existente de signInWithPassword ...

    if (!data.user || !data.session) {
      throw new Error('Error de autenticación: respuesta incompleta');
    }

    // ✅ NUEVO: Registrar sesión única
    await this.registerUniqueSession(data.user.id, data.session.access_token);

    // ... resto del código ...
  }
}

// ✅ NUEVA FUNCIÓN
private async registerUniqueSession(userId: string, sessionToken: string): Promise<void> {
  try {
    const sessionId = crypto.randomUUID(); // ID único de esta sesión
    
    const deviceInfo = {
      browser: navigator.userAgent.split(' ').pop()?.split('/')[0] || 'Unknown',
      os: navigator.platform,
      timestamp: new Date().toISOString()
    };

    // Intentar insertar sesión
    // Si ya existe una sesión (UNIQUE constraint), se reemplaza automáticamente
    const { error } = await supabase!
      .from('active_sessions')
      .upsert({
        user_id: userId,
        session_id: sessionId,
        device_info: deviceInfo,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
      }, {
        onConflict: 'user_id' // Reemplaza sesión anterior
      });

    if (error) {
      console.error('⚠️ Error registrando sesión única:', error);
      // No bloquear login si falla
    } else {
      // Guardar session_id en localStorage para verificación posterior
      localStorage.setItem('session_id', sessionId);
      console.log('✅ Sesión única registrada:', sessionId);
    }
  } catch (err) {
    console.error('⚠️ Error en registerUniqueSession:', err);
  }
}
```

### 3. Modificar `AuthContext.tsx`

**Archivo:** `src/contexts/AuthContext.tsx`

Reemplazar la lógica deprecada (líneas 167-242) con:

```typescript
// ============================================
// SUSCRIPCIÓN A CAMBIOS DE SESIÓN (Realtime)
// ============================================
useEffect(() => {
  if (!authState.isAuthenticated || !authState.user?.id) {
    // Limpiar canal si no hay usuario autenticado
    if (sessionBroadcastChannelRef.current) {
      supabase?.removeChannel(sessionBroadcastChannelRef.current);
      sessionBroadcastChannelRef.current = null;
    }
    return;
  }

  const currentSessionId = localStorage.getItem('session_id');
  if (!currentSessionId) {
    console.warn('⚠️ No se encontró session_id en localStorage');
    return;
  }

  // Suscribirse a cambios en active_sessions para este usuario
  const channel = supabase!
    .channel(`session_${authState.user.id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'active_sessions',
        filter: `user_id=eq.${authState.user.id}`
      },
      (payload) => {
        const newSession = payload.new as { session_id: string };
        
        // Si la sesión en BD cambió y NO es la nuestra, fuimos desconectados
        if (newSession.session_id !== currentSessionId) {
          console.log('🔐 Sesión invalidada - Nueva sesión detectada en otro dispositivo');
          handleForceLogout('Iniciaste sesión en otro dispositivo');
        }
      }
    )
    .subscribe();

  sessionBroadcastChannelRef.current = channel;

  return () => {
    if (sessionBroadcastChannelRef.current) {
      supabase!.removeChannel(sessionBroadcastChannelRef.current);
      sessionBroadcastChannelRef.current = null;
    }
  };
}, [authState.isAuthenticated, authState.user?.id]);

// handleForceLogout YA EXISTE (línea 201-242) - mantener sin cambios
```

### 4. Limpiar Sesión en Logout

**Archivo:** `src/services/authService.ts`

Agregar en el método `logout`:

```typescript
async logout(backupId?: string): Promise<void> {
  try {
    // ... lógica existente de backup ejecutivos ...

    // ✅ NUEVO: Limpiar sesión de active_sessions
    const currentSessionId = localStorage.getItem('session_id');
    if (currentSessionId) {
      await supabase!
        .from('active_sessions')
        .delete()
        .eq('session_id', currentSessionId);
      
      localStorage.removeItem('session_id');
    }

    // Cerrar sesión con Supabase Auth
    await supabase!.auth.signOut();
    
  } catch (error) {
    console.error('Error during logout:', error);
  } finally {
    this.currentUser = null;
    this.userPermissions = [];
    this.supabaseSession = null;
  }
}
```

---

## Testing

### Caso 1: Login en Dispositivo A, luego B
1. Usuario inicia sesión en Chrome (Dispositivo A)
2. Usuario inicia sesión en Firefox (Dispositivo B)
3. **Esperado:** Chrome recibe toast "Iniciaste sesión en otro dispositivo" y cierra sesión automáticamente

### Caso 2: Logout en Dispositivo Actual
1. Usuario inicia sesión
2. Usuario hace logout manualmente
3. **Esperado:** Sesión se elimina de `active_sessions`, no quedan registros

### Caso 3: Sesión Expirada
1. Usuario inicia sesión
2. Esperar 24h (o modificar `expires_at` manualmente)
3. **Esperado:** Sesión se limpia automáticamente (via cleanup function)

---

## Ventajas de Esta Solución

✅ **Compatible con Supabase Auth:** No interfiere con JWT nativo  
✅ **Realtime:** Notificación instantánea al cliente anterior  
✅ **Seguro:** RLS protege la tabla `active_sessions`  
✅ **Limpieza automática:** Sesiones expiradas se eliminan  
✅ **Granular:** Puede extenderse para permitir N sesiones si se requiere

---

## Rollback

Si la solución causa problemas:

```sql
-- Deshabilitar constraint de sesión única
ALTER TABLE public.active_sessions DROP CONSTRAINT active_sessions_user_id_key;

-- O eliminar tabla completa
DROP TABLE public.active_sessions CASCADE;
```

Revertir cambios en `authService.ts` y `AuthContext.tsx` eliminando las nuevas funciones.

---

## Próximos Pasos

1. [ ] Crear tabla `active_sessions` en BD
2. [ ] Modificar `authService.ts` (registerUniqueSession + limpieza en logout)
3. [ ] Modificar `AuthContext.tsx` (listener Realtime)
4. [ ] Testing en desarrollo
5. [ ] Deploy a producción
6. [ ] Monitorear logs por 48h

---

**Última actualización:** 29 de Enero 2026  
**Estado:** Pendiente implementación
