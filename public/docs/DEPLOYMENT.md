# Guía de Deployment - PQNC QA AI Platform Alpha 1.0

## Railway Deployment

### Preparación

1. **Variables de Entorno Críticas**
   ```bash
   # En Railway Dashboard → Variables
   VITE_MAIN_SUPABASE_URL=https://rnhejbuubpbnojalljso.supabase.co
   VITE_MAIN_SUPABASE_ANON_KEY=tu_main_anon_key
   VITE_MAIN_SUPABASE_SERVICE_KEY=tu_main_service_key
   
   VITE_PQNC_SUPABASE_URL=https://hmmfuhqgvsehkizlfzga.supabase.co
   VITE_PQNC_SUPABASE_ANON_KEY=tu_pqnc_anon_key
   VITE_PQNC_SUPABASE_SERVICE_KEY=tu_pqnc_service_key
   
   VITE_NATALIA_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
   VITE_NATALIA_SUPABASE_ANON_KEY=tu_natalia_anon_key
   VITE_NATALIA_SUPABASE_SERVICE_KEY=tu_natalia_service_key
   
   NODE_ENV=production
   ```

2. **GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Alpha 1.0 - Production ready"
   git branch -M main
   git remote add origin tu_repositorio
   git push -u origin main
   ```

3. **Railway Setup**
   - Conectar repositorio GitHub
   - Configurar variables de entorno
   - Deploy automático activado

### Build Configuration

El proyecto incluye:
- `railway.toml` - Configuración específica de Railway
- `package.json` - Scripts optimizados para production
- `vite.config.ts` - Build optimizado con chunks
- `.env.example` - Template de variables de entorno

### Post-Deployment

1. **Verificar conexiones de Supabase**
   - Admin → Configuración de Base de Datos
   - Ejecutar tests de conexión

2. **Configurar usuarios**
   - Admin → Gestión de Usuarios
   - Crear usuarios iniciales

3. **Verificar funcionalidades**
   - Login/Logout
   - Análisis PQNC
   - Construcción de agentes

## Troubleshooting

### Error de Variables de Entorno
Si las conexiones fallan, verificar que todas las variables estén configuradas en Railway Dashboard.

### Error de Build
Verificar que Node.js >= 18.0.0 esté configurado en Railway.

### Error de Port
Railway configura automáticamente la variable PORT. El proyecto está configurado para detectarla.

## Seguridad

- ✅ Variables de entorno en Railway (no en código)
- ✅ .env files en .gitignore
- ✅ Fallbacks seguros para desarrollo
- ✅ Service keys separados por entorno
