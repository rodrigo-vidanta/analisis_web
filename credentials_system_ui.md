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
