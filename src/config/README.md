# ⚙️ Configuración de Bases de Datos

## Descripción
Configuraciones centralizadas de todas las conexiones Supabase del proyecto.

## Archivos de Configuración

### analysisSupabase.ts
- **URL**: glsmifhkoaifvaegsozd.supabase.co
- **Uso**: Análisis IA, Prospectos, Llamadas de ventas
- **Tablas**: `call_analysis_summary`, `prospectos`, `llamadas_ventas`

### pqncSupabase.ts
- **URL**: hmmfuhqgvsehkizlfzga.supabase.co
- **Uso**: PQNC Humans, Administración
- **Tablas**: `calls`, `call_segments`, `users`, `api_tokens`
- **Clientes**: `pqncSupabase` (normal), `pqncSupabaseAdmin` (admin)

### supabaseSystemUI.ts
- **URL**: zbylezfyagwrxoecioup.supabase.co
- **Uso**: Live Chat
- **Tablas**: `uchat_conversations`, `uchat_messages`, `prompt_versions`
- **Clientes**: `supabaseSystemUI` (normal), `supabaseSystemUIAdmin` (admin)

### supabase.ts
- **URL**: rnhejbuubpbnojalljso.supabase.co
- **Uso**: AI Models, Tokens
- **Tablas**: `ai_models`, `generated_images`
- **Clientes**: `supabaseMain`, `supabaseMainAdmin`

### supabaseLogMonitor.ts
- **URL**: dffuwdzybhypxfzrmdcz.supabase.co
- **Uso**: Log Monitor, Dashboard de Errores
- **Tablas**: `error_log`, `ui_error_log_status`, `ui_error_log_annotations`, `ui_error_log_tags`, `ui_error_log_ai_analysis`
- **Clientes**: `supabaseLogMonitor` (normal), `supabaseLogMonitorAdmin` (admin)

## Estructura de Conexiones
```
Módulo → Base de Datos
├── Prospectos → analysisSupabase
├── Análisis IA → analysisSupabase + llamadas_ventas
├── PQNC Humans → pqncSupabaseAdmin
├── Live Chat → supabaseSystemUI
├── Admin → pqncSupabase
├── AI Models → supabaseMain
└── Log Monitor → supabaseLogMonitor
```

## Variables de Entorno
- `VITE_*_SUPABASE_URL`: URLs de Supabase
- `VITE_*_SUPABASE_ANON_KEY`: Claves anónimas
- `VITE_*_SUPABASE_SERVICE_KEY`: Claves de servicio (admin)

## Seguridad
- Claves anónimas para operaciones normales
- Claves de servicio para operaciones admin
- RLS (Row Level Security) habilitado
- Autenticación por roles
