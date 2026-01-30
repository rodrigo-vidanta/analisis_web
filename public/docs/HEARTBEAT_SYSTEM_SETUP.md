# 💓 Sistema de Heartbeat - Instrucciones de Setup

**Fecha:** 30 Enero 2026  
**Estado:** ✅ Implementado (requiere deploy)

---

## 📋 Resumen

Sistema completo para asegurar que `is_operativo` refleje el estado real de conexión de los usuarios.

### Componentes Implementados

1. ✅ **Tabla `active_sessions`** - Rastrea sesiones con heartbeat
2. ✅ **Hook `useHeartbeat`** - Actualiza `last_activity` cada 30s
3. ✅ **Integración en `AuthContext`** - Heartbeat automático para usuarios autenticados
4. ✅ **Edge Function `cleanup-inactive-sessions`** - Limpia sesiones inactivas
5. ✅ **Evento `beforeunload`** - Limpia sesión al cerrar ventana

---

## 🚀 Pasos de Instalación

### 1. Ejecutar Migración SQL

En **Supabase Dashboard** → **SQL Editor**:

```bash
# Ejecutar el archivo:
supabase/migrations/20260130_create_active_sessions.sql
```

O copiar y pegar el contenido directamente.

**Verifica que se hayan creado:**
- ✅ Tabla `active_sessions`
- ✅ Índices de optimización
- ✅ Políticas RLS
- ✅ Función `cleanup_inactive_sessions()`

### 2. Deploy de Edge Function

```bash
cd /Users/darigsamuelrosalesrobledo/Documents/pqnc-qa-ai-platform

# Deploy sin verificación JWT (será llamada por Cron)
supabase functions deploy cleanup-inactive-sessions --no-verify-jwt --project-ref glsmifhkoaifvaegsozd
```

**Verificar deploy:**
```bash
# Test manual
curl -X POST https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/cleanup-inactive-sessions \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### 3. Configurar Cron Job

En **Supabase Dashboard** → **Database** → **Extensions**:

1. Habilitar extensión `pg_cron` (si no está habilitada)
2. Ir a **SQL Editor** y ejecutar:

```sql
-- Ejecutar limpieza cada 1 minuto
SELECT cron.schedule(
  'cleanup-inactive-sessions',  -- Nombre del job
  '* * * * *',                   -- Cada minuto
  $$
  SELECT net.http_post(
    url := 'https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/cleanup-inactive-sessions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY_AQUI'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

**⚠️ IMPORTANTE:** Reemplaza `YOUR_ANON_KEY_AQUI` con el anon_key real de PQNC_AI.

**Verificar cron jobs activos:**
```sql
SELECT * FROM cron.job;
```

**Ver logs de ejecución:**
```sql
SELECT * FROM cron.job_run_details 
WHERE jobname = 'cleanup-inactive-sessions' 
ORDER BY start_time DESC 
LIMIT 10;
```

---

## 🔧 Configuración Opcional

### Ajustar Intervalo de Heartbeat

Por defecto: **30 segundos**

Para cambiar:

```typescript
// src/contexts/AuthContext.tsx (línea ~63)
useHeartbeat({
  userId: authState.user?.id || '',
  sessionId: localStorage.getItem('session_id') || '',
  enabled: authState.isAuthenticated,
  intervalMs: 60000 // Cambiar a 1 minuto
});
```

### Ajustar Timeout de Inactividad

Por defecto: **2 minutos sin actividad = sesión eliminada**

Para cambiar:

```sql
-- En la función cleanup_inactive_sessions (migración 20260130)
-- Línea 80:
WHERE expires_at < NOW()
   OR last_activity < NOW() - INTERVAL '5 minutes'; -- Cambiar a 5 minutos
```

---

## 📊 Monitoreo

### Ver Sesiones Activas Actuales

```sql
SELECT 
  u.email,
  u.raw_user_meta_data->>'full_name' as nombre,
  s.last_activity,
  s.expires_at,
  EXTRACT(EPOCH FROM (NOW() - s.last_activity)) as segundos_inactivo
FROM active_sessions s
INNER JOIN auth.users u ON s.user_id = u.id
WHERE s.expires_at > NOW()
ORDER BY s.last_activity DESC;
```

### Ver Usuarios Marcados como "En Línea"

```sql
SELECT 
  email,
  raw_user_meta_data->>'full_name' as nombre,
  COALESCE((raw_user_meta_data->>'is_operativo')::boolean, false) as is_operativo,
  last_sign_in_at
FROM auth.users
WHERE COALESCE((raw_user_meta_data->>'is_operativo')::boolean, false) = true
ORDER BY last_sign_in_at DESC;
```

### Comparar Sesiones vs is_operativo

```sql
-- Detectar inconsistencias
SELECT 
  u.email,
  u.raw_user_meta_data->>'is_operativo' as is_operativo,
  CASE 
    WHEN s.user_id IS NOT NULL THEN 'Tiene sesión activa'
    ELSE 'Sin sesión activa'
  END as estado_sesion
FROM auth.users u
LEFT JOIN active_sessions s ON u.id = s.user_id AND s.expires_at > NOW()
WHERE u.raw_user_meta_data->>'is_operativo' != COALESCE((s.user_id IS NOT NULL)::text, 'false');
```

---

## 🧪 Testing

### 1. Test de Heartbeat (Frontend)

1. Hacer login en la app
2. Abrir **DevTools** → **Console**
3. Buscar logs:
   ```
   💓 Heartbeat iniciado (cada 30s)
   💓 Heartbeat enviado: HH:MM:SS
   ```

### 2. Test de Limpieza Automática

1. Hacer login
2. Verificar sesión activa:
   ```sql
   SELECT * FROM active_sessions WHERE user_id = 'TU_USER_ID';
   ```
3. Cerrar navegador completamente (no solo pestaña)
4. Esperar 3 minutos
5. Verificar que `is_operativo = false`:
   ```sql
   SELECT 
     email, 
     raw_user_meta_data->>'is_operativo' as is_operativo
   FROM auth.users 
   WHERE id = 'TU_USER_ID';
   ```

### 3. Test de beforeunload

1. Hacer login
2. Abrir **DevTools** → **Console**
3. Buscar log:
   ```
   👋 beforeunload listener registrado
   ```
4. Cerrar pestaña/ventana
5. Verificar que sesión fue eliminada (puede tardar unos segundos)

---

## 🐛 Troubleshooting

### Heartbeat no se está enviando

**Síntomas:** No aparecen logs `💓 Heartbeat enviado`

**Solución:**
1. Verificar que el usuario esté autenticado
2. Verificar que `localStorage.getItem('session_id')` no sea null
3. Revisar errores en console

### Usuarios quedan "en línea" después de cerrar ventana

**Síntomas:** `is_operativo = true` después de cerrar navegador

**Posibles causas:**
1. Cron job no está ejecutándose → Verificar `cron.job_run_details`
2. `beforeunload` no se disparó → Normal en algunos casos (force quit, crash)
3. Intervalo de limpieza muy largo → Ajustar a 1 minuto

**Solución temporal:**
```bash
# Ejecutar limpieza manual
npx tsx scripts/sync-is-operativo.ts
```

### Edge Function falla

**Síntomas:** Error 500 en Cron logs

**Solución:**
1. Verificar que la función `cleanup_inactive_sessions()` existe:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'cleanup_inactive_sessions';
   ```
2. Verificar logs de Edge Function en Supabase Dashboard
3. Re-deploy de la función

---

## 📚 Archivos Relacionados

| Archivo | Descripción |
|--------|-------------|
| `supabase/migrations/20260130_create_active_sessions.sql` | Migración SQL |
| `src/hooks/useHeartbeat.ts` | Hook de heartbeat |
| `src/contexts/AuthContext.tsx` | Integración de heartbeat |
| `supabase/functions/cleanup-inactive-sessions/index.ts` | Edge Function |
| `scripts/sync-is-operativo.ts` | Script de sincronización manual |

---

## ✅ Checklist de Validación

- [ ] Migración SQL ejecutada correctamente
- [ ] Tabla `active_sessions` creada
- [ ] Función `cleanup_inactive_sessions()` creada
- [ ] Edge Function deployada
- [ ] Cron job configurado (cada 1 minuto)
- [ ] Heartbeat enviándose cada 30s (verificar en console)
- [ ] beforeunload registrado (verificar en console)
- [ ] Test de logout manual (is_operativo → false)
- [ ] Test de cierre de ventana (sesión eliminada)
- [ ] Test de inactividad (sesión limpiada después de 2 minutos)

---

**Última actualización:** 30 Enero 2026  
**Mantenedor:** Samuel (AI Assistant)
