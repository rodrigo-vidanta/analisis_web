# Deploy - PQNC QA AI Platform

## REGLA: NUNCA deploy sin autorizacion explicita del usuario

## Flujo de Deploy

```
1. Build local (vite build)
2. Subir a S3 (aws s3 sync)
3. Invalidar CloudFront
4. Actualizar version en BD
5. Crear handover
6. Commit + push
```

## Comandos

```bash
# Build
npm run build

# Deploy a AWS (SOLO con autorizacion)
# El script maneja: S3 sync + CloudFront invalidation
```

## Versionado

- Formato: `v{major}.{minor}.{patch}`
- Archivo: `src/config/appVersion.ts`
- Tambien se actualiza en BD (`system_config`)

## Scripts npm

| Script | Proposito |
|--------|-----------|
| `dev` | Desarrollo local (port 5173) |
| `build` | Build produccion |
| `lint` | ESLint |
| `preview` | Preview local |
| `aws:report` | Reporte recursos AWS |
| `aws:cost-analysis` | Analisis costos |
| `aws:cleanup` | Limpieza segura |

## Edge Functions Deploy

```bash
# Login (una vez)
cat .supabase/access_token | npx supabase login --no-browser

# Deploy individual
npx supabase functions deploy {nombre} --project-ref glsmifhkoaifvaegsozd

# Verificar
npx supabase functions list --project-ref glsmifhkoaifvaegsozd
```

## Pre-Deploy Checklist

- [ ] Build exitoso sin errores TypeScript
- [ ] Sin imports de clientes Admin
- [ ] Sin credenciales hardcodeadas
- [ ] Version actualizada en appVersion.ts
- [ ] Changelog actualizado
- [ ] Edge Functions deployadas (si hubo cambios)
- [ ] Variables de entorno verificadas

## Entornos

| Entorno | URL | Config |
|---------|-----|--------|
| Desarrollo | localhost:5173 | `.env.local` |
| Produccion | ai.vidavacations.com | `.env.production` |

## AWS

- Region: us-west-2
- S3 bucket: frontend hosting
- CloudFront: CDN + SSL (ACM cert)
- Lambda@Edge: routing SPA
