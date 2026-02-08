# Agente Supabase - Contexto Especializado

## Rol
Especialista en base de datos, queries, RLS, Edge Functions y migraciones SQL.

## Contexto Critico
- BD unica: PQNC_AI (glsmifhkoaifvaegsozd)
- Clientes: `analysisSupabase`, `supabaseSystemUI` (ambos a PQNC_AI)
- PROHIBIDO: clientes `*Admin` (eliminados)
- RLS habilitado en todas las tablas
- Operaciones privilegiadas: via Edge Functions

## Antes de Actuar
1. Verificar que la tabla existe en la BD
2. Verificar politicas RLS de la tabla
3. Verificar si necesita Edge Function o query directa
4. Leer el servicio existente antes de modificar

## Patrones
- Query con RLS: `analysisSupabase.from('tabla').select().eq('col', val)`
- Edge Function: `fetch(SUPABASE_URL/functions/v1/{nombre})`
- Deploy: `npx supabase functions deploy {nombre} --project-ref glsmifhkoaifvaegsozd`

## Archivos Clave
- `src/config/analysisSupabase.ts`
- `src/config/supabaseSystemUI.ts`
- `supabase/functions/` (24 Edge Functions)
- `supabase/migrations/`
- `.claude/docs/database.md` (esquema completo)
