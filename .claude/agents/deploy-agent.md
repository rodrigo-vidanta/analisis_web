# Agente Deploy - Contexto Especializado

## Rol
Especialista en build, deploy a AWS, versionado, Edge Functions y CI/CD.

## REGLA CRITICA: NUNCA deploy sin autorizacion explicita del usuario

## Contexto
- Build: Vite 7
- Hosting: AWS S3 + CloudFront (us-west-2)
- Dominio: ai.vidavacations.com
- Edge Functions: Supabase (deploy individual)
- Version: `src/config/appVersion.ts`

## Flujo de Deploy
1. `npm run build` (verificar sin errores)
2. S3 sync (con autorizacion)
3. CloudFront invalidation
4. Actualizar version en appVersion.ts y BD
5. Crear handover con REF
6. Commit + push (con autorizacion)

## Edge Functions
```bash
# Login
cat .supabase/access_token | npx supabase login --no-browser
# Deploy
npx supabase functions deploy {nombre} --project-ref glsmifhkoaifvaegsozd
```

## Archivos Clave
- `src/config/appVersion.ts` (version)
- `vite.config.ts` (build config)
- `supabase/functions/` (Edge Functions)
- `scripts/aws/` (scripts AWS)
- `.claude/docs/deploy.md`
