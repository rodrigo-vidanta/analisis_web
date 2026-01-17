# Deshabilitar Signup - Acción Manual Requerida

## Por Qué Manual

Supabase CLI/API no permiten cambiar configuración de Auth providers directamente.

## Pasos (5 minutos)

### PQNC_AI
1. https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/settings/auth
2. Scroll a "User Signups"
3. **DESHABILITAR** "Enable email signups"
4. Save

### PQNC_QA  
1. https://supabase.com/dashboard/project/hmmfuhqgvsehkizlfzga/settings/auth
2. Scroll a "User Signups"
3. **DESHABILITAR** "Enable email signups"
4. Save

## Verificación Post-Cambio

```bash
curl -X POST "https://glsmifhkoaifvaegsozd.supabase.co/auth/v1/signup" \
  -H "apikey: [ANON]" \
  -d '{"email":"test@test.com","password":"Test123!"}'
  
# Esperado: {"msg":"Signups not allowed for this instance"}
```

## Criticidad

**ALTA** - Permite account takeover + data breach

**Tiempo:** 5 minutos
