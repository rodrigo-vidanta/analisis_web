# Variables de Entorno Requeridas — PQNC QA AI Platform

**Actualizado:** 2025-12-23  
**Razón:** Remediación de seguridad - Eliminación de fallbacks hardcodeados

---

## 🔒 Instrucciones de Configuración

1. Crear archivo `.env.local` (desarrollo) o `.env.production` (producción)
2. Copiar las variables de abajo y configurar los valores reales
3. **NUNCA** commitear archivos `.env` con valores reales

---

## Variables Requeridas

### Supabase - System UI (Principal)
```env
VITE_SYSTEM_UI_SUPABASE_URL=https://zbylezfyagwrxoecioup.supabase.co
VITE_SYSTEM_UI_SUPABASE_ANON_KEY=<tu_anon_key>
VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY=<tu_service_key>
```

### Supabase - PQNC (Autenticación y Análisis)
```env
VITE_PQNC_SUPABASE_URL=https://hmmfuhqgvsehkizlfzga.supabase.co
VITE_PQNC_SUPABASE_ANON_KEY=<tu_anon_key>
VITE_PQNC_SUPABASE_SERVICE_KEY=<tu_service_key>
```

### Supabase - Main (Plantillas y Agentes)
```env
VITE_MAIN_SUPABASE_URL=https://rnhejbuubpbnojalljso.supabase.co
VITE_MAIN_SUPABASE_ANON_KEY=<tu_anon_key>
VITE_MAIN_SUPABASE_SERVICE_KEY=<tu_service_key>
```

### Supabase - Analysis (Live Monitor)
```env
VITE_ANALYSIS_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
VITE_ANALYSIS_SUPABASE_ANON_KEY=<tu_anon_key>
```

### Supabase - Log Monitor
```env
VITE_LOGMONITOR_SUPABASE_URL=https://dffuwdzybhypxfzrmdcz.supabase.co
VITE_LOGMONITOR_SUPABASE_ANON_KEY=<tu_anon_key>
VITE_LOGMONITOR_SUPABASE_SERVICE_KEY=<tu_service_key>
```

### N8N API
```env
VITE_N8N_API_URL=https://primary-dev-d75a.up.railway.app/api/v1
VITE_N8N_API_KEY=<tu_api_token>
```

### ElevenLabs
```env
VITE_ELEVENLABS_API_KEY=<tu_api_key>
```

### Edge Functions (URL base)
```env
VITE_SUPABASE_FUNCTIONS_URL=https://zbylezfyagwrxoecioup.supabase.co/functions/v1
```

---

## Cómo Obtener las Keys

1. **Supabase:** Dashboard > Settings > API
   - `anon` key = pública, para cliente
   - `service_role` key = privada, para operaciones admin

2. **N8N:** Settings > API > API Keys
   - Crear un token con permisos de lectura/escritura de workflows

3. **ElevenLabs:** Dashboard > Profile > API Keys

---

## Verificación

Después de configurar las variables, ejecutar la app y verificar que no aparezcan errores de variables faltantes en consola.

```bash
npm run dev
# Buscar en consola: "⚠️ ... Faltan variables de entorno"
```
