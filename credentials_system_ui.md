# System UI Database Credentials

## Supabase Database
- **URL**: postgresql://postgres:VsNJX$@&eU9*!g6d@db.zbylezfyagwrxoecioup.supabase.co:5432/postgres
- **Project**: zbylezfyagwrxoecioup
- **API Key**: system_ui
- **Secret**: sb_secret_w0qhUdKFEj-sCSBR1IGglQ_AymmPLBr
- **Publishable Key**: sb_publishable_Aq0wn6A5Yd7sydNAnmMSJA_IjULaxym

## Supabase Keys
- **Anon Public**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzYyNzEsImV4cCI6MjA3NDkxMjI3MX0.W6Vt5h4r7vNSP_YQtd_fbTWuK7ERrcttwhcpe5Q7KoM
- **Service Role**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNjI3MSwiZXhwIjoyMDc0OTEyMjcxfQ.2Btqq8cGSmr4OMKUae8zsHLxQMfs2JJ1ZFgmZYQPFQY

## Storage Bucket
- **Bucket Name**: system_ui
- **S3 URL**: https://zbylezfyagwrxoecioup.storage.supabase.co/storage/v1/s3
- **Access Key ID**: b0fc21e2f22c2a61c9b835277d93b5c3
- **Secret Access Key**: ce6a3ae6e63d18941d0390f3749439c3bec62c972b3d644526e30f35fdb8570e

## n8n API
- **Token**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMmE1MDZkMS1hZDM4LTQ3MGYtOTEzOS02MzAwM2NiMjQzZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU5MzU3ODgzfQ.7z0FtziI-eFleJr4pLvP5GgRVptllCw26Losrxf_Qpo
- **API Reference**: https://docs.n8n.io/api/api-reference/

## Target Workflows
- **[VAPI] Agent-Natalia inbound**
- **Trigger llamada vapi**

## Objetivo
Control de versiones de prompts en workflows n8n con:
- Almacenamiento en BD System_UI
- Actualización dinámica vía API n8n
- Control de cambios
- Métricas de rendimiento (éxito vs fallo)
- Calificación automática de modificaciones

---

# Log Monitor Database Credentials

## Supabase Database
- **URL**: postgresql://postgres:tM8KO9@i&yG#%!Lg@db.dffuwdzybhypxfzrmdcz.supabase.co:5432/postgres
- **Project**: dffuwdzybhypxfzrmdcz
- **API Key**: system_ui
- **Secret**: sb_secret_LGrLFU7rvlTpXoIoD0AcWA_ULdhgqlF
- **Publishable Key**: sb_publishable_54tYDJIqPcKMt26kjS2ylA_tIBeTyG9

## Supabase Keys
- **Anon Public**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZnV3ZHp5Ymh5cHhmenJtZGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTgxNTksImV4cCI6MjA3NTQzNDE1OX0.dduh8ZV_vxWcC3u63DGjPG0U5DDjBpZTs3yjT3clkRc
- **Service Role**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZnV3ZHp5Ymh5cHhmenJtZGN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg1ODE1OSwiZXhwIjoyMDc1NDM0MTU5fQ.GplT_sFvgkLjNDNg50MaXVI759u8LAMeS9SbJ6pf2yc

## Propósito
Base de datos dedicada para el sistema de monitoreo de logs de errores:
- Almacenamiento centralizado de logs de errores del sistema
- Dashboard de visualización y gestión de logs
- Sistema de anotaciones y etiquetas
- Análisis de IA a demanda usando Claude (Anthropic)
- Estado de lectura y priorización de logs
- Estadísticas y métricas en tiempo real

## Tablas Principales
- `error_log`: Logs de errores del sistema
- `ui_error_log_status`: Estado de lectura y prioridad
- `ui_error_log_annotations`: Anotaciones y observaciones
- `ui_error_log_tags`: Etiquetas personalizadas
- `ui_error_log_ai_analysis`: Análisis de IA generados

## Configuración en Código
- **Archivo**: `src/config/supabaseLogMonitor.ts`
- **Servicio**: `src/services/logMonitorService.ts`
- **Componente Dashboard**: `src/components/admin/LogDashboard.tsx`
