# Base de Datos - PQNC_AI

## Conexion

- Proyecto: `glsmifhkoaifvaegsozd`
- URL: `glsmifhkoaifvaegsozd.supabase.co`
- BD unificada: TODAS las tablas en PQNC_AI (migracion completada 2026-01-16)

## Clientes en Codigo

```typescript
// CORRECTO - usar estos:
import { analysisSupabase } from '@/config/analysisSupabase';
import { supabaseSystemUI } from '@/config/supabaseSystemUI';

// PROHIBIDO - eliminados:
// supabaseSystemUIAdmin ❌
// analysisSupabaseAdmin ❌
// pqncSupabaseAdmin ❌
```

## RLS (Row Level Security)

- RLS habilitado en TODAS las tablas
- No se puede leer con anon key directamente en la mayoria de tablas
- Politicas basadas en `auth.uid()` y roles del usuario
- Operaciones privilegiadas: SIEMPRE via Edge Functions

## Tablas Principales

### Prospectos y Ventas
- `prospectos` - Tabla principal de prospectos
- `prospecto_timeline` - Historial de actividades
- `prospecto_etiquetas` - Etiquetas asignadas
- `etiquetas` - Catalogo de etiquetas

### Usuarios y Permisos
- `user_profiles_v2` - Perfiles (vista segura, sin password_hash)
- `permission_groups` - Grupos de permisos
- `user_permissions` - Permisos por usuario
- `auth_user_coordinaciones` - Relacion usuario-coordinacion

### WhatsApp
- `whatsapp_templates` - Plantillas de mensajes
- `whatsapp_labels` - Etiquetas de conversaciones
- `quick_replies` - Respuestas rapidas

### Campanas
- `campanas` - Campanas de broadcast
- `campana_audiencias` - Audiencias filtradas
- `campana_plantillas` - Plantillas por campana

### Analisis
- `call_analysis` - Analisis de llamadas
- `call_recordings` - Grabaciones
- `analysis_metrics` - Metricas

### Sistema
- `user_notifications` - Notificaciones (RLS deshabilitado)
- `support_tickets` - Tickets de soporte
- `active_sessions` - Sesiones activas
- `system_config` - Configuracion del sistema
- `error_logs` - Logs de errores

## Tablas/Vistas DEPRECADAS (NO usar)

- `coordinador_coordinaciones*` - Eliminadas
- `auth_user_profiles` - Eliminada (usar `user_profiles_v2`)
- Cualquier tabla con prefijo `z_backup_`

## Triggers Importantes

- `trigger_notify_prospecto_changes` - Genera notificaciones en INSERT/UPDATE de `prospectos`
- Trigger unificado: frontend solo escucha via Realtime

## Edge Functions para BD

Para operaciones que requieren privilegios (bypass RLS):
- `secure-query` - Queries seguras con validacion
- `multi-db-proxy` - Operaciones multi-tabla
- `auth-admin-proxy` - CRUD de usuarios (crear, editar roles)

## Deploy Edge Functions

```bash
# Login (una vez)
cat .supabase/access_token | npx supabase login --no-browser

# Deploy individual
npx supabase functions deploy {nombre} --project-ref glsmifhkoaifvaegsozd

# Secrets: configurar en Supabase Dashboard (NUNCA en codigo)
```

## Patron de Query

```typescript
// Query basica con RLS
const { data, error } = await analysisSupabase
  .from('prospectos')
  .select('*')
  .eq('ejecutivo_id', userId);

// Operacion privilegiada via Edge Function
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/secure-query`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: '...' })
  }
);
```
