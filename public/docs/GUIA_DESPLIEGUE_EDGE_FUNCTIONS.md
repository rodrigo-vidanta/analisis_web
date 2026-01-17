# GUÍA DE DESPLIEGUE - EDGE FUNCTIONS SEGURAS

**Sistema:** PQNC QA AI Platform  
**Objetivo:** Proteger base de datos con RLS + Edge Functions  
**Tiempo estimado:** 2-3 horas  
**Estado actual:** RLS habilitado, datos bloqueados  

---

## ✅ LO QUE YA ESTÁ HECHO

```
1. ✅ RLS habilitado en tablas críticas
2. ✅ Políticas restrictivas (solo service_role)
3. ✅ Datos BLOQUEADOS desde anon_key
4. ✅ Edge Function creada (supabase/functions/secure-query/)
5. ✅ Servicio del cliente creado (src/services/secureQueryService.ts)
```

---

## ⏳ LO QUE TÚ DEBES HACER

### PASO 1: Instalar Supabase CLI (si no lo tienes)

```bash
brew install supabase/tap/supabase
# O
npm install -g supabase
```

### PASO 2: Login a Supabase

```bash
supabase login
```

### PASO 3: Deploy Edge Function

```bash
cd ~/Documents/pqnc-qa-ai-platform

# Deploy a proyecto glsmifhkoaifvaegsozd
supabase functions deploy secure-query \
  --project-ref glsmifhkoaifvaegsozd \
  --no-verify-jwt

# Configurar secrets
supabase secrets set \
  SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key> \
  --project-ref glsmifhkoaifvaegsozd
```

### PASO 4: Verificar que Edge Function funciona

```bash
# Test de la Edge Function
curl -X POST https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/secure-query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "x-session-token: <TU_SESSION_TOKEN_DE_LOCALSTORAGE>" \
  -d '{
    "table": "prospectos",
    "select": "id,nombre,email",
    "limit": 5
  }'

# Debe retornar datos si session es válida
```

### PASO 5: Actualizar .env para usar Edge Functions

```bash
# .env.local y .env.production
VITE_USE_SECURE_QUERIES=true
VITE_SECURE_QUERY_URL=https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/secure-query
```

### PASO 6: Modificar código para usar Edge Functions

**Buscar todos los usos de analysisSupabase:**

```bash
grep -r "analysisSupabase.from" src/ --include="*.tsx" --include="*.ts" | wc -l
```

**Ejemplo de migración:**

```typescript
// ANTES:
import { analysisSupabase } from '../config/analysisSupabase';

const { data } = await analysisSupabase
  .from('prospectos')
  .select('*')
  .eq('coordinacion_id', coordId)
  .limit(100);

// DESPUÉS:
import { secureFrom } from '../services/secureQueryService';

const { data } = await secureFrom('prospectos')
  .select('*')
  .eq('coordinacion_id', coordId)
  .limit(100);
```

**Archivos críticos a modificar:**
- `src/services/prospectsService.ts`
- `src/services/liveMonitorService.ts`
- `src/services/uchatService.ts`
- `src/components/prospectos/ProspectosManager.tsx`
- `src/components/chat/LiveChatCanvas.tsx`
- `src/components/dashboard/widgets/*.tsx`

---

## 🔄 MIGRACIÓN GRADUAL (RECOMENDADO)

No modifiques TODO de una vez. Hazlo por módulo:

**Día 1: Prospectos**
1. Modificar `prospectsService.ts`
2. Testear que funciona
3. Deploy y verificar en producción

**Día 2: WhatsApp**
1. Modificar `uchatService.ts`
2. Testear conversaciones
3. Deploy

**Día 3: Llamadas**
1. Modificar `liveMonitorService.ts`
2. Testear Live Monitor
3. Deploy

---

## 🛡️ PARA N8N (Railway)

N8N ya debe estar usando service_role directamente. Verificar en workflows:

```javascript
// En tus workflows N8N, deben tener:
const supabase = createClient(
  'https://glsmifhkoaifvaegsozd.supabase.co',
  'SERVICE_ROLE_KEY' // ← Ya está configurado
);

// Si usan anon_key, cambiar a service_role
```

---

## ⚠️ ROLLBACK TEMPORAL PARA QUE FUNCIONE HOY

**Si necesitas que funcione YA mientras migras:**

```sql
-- Deshabilitar RLS temporalmente
ALTER TABLE prospectos DISABLE ROW LEVEL SECURITY;
ALTER TABLE llamadas_ventas DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversaciones_whatsapp DISABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_whatsapp DISABLE ROW LEVEL SECURITY;

-- Mantener SOLO en api_auth_tokens
-- (Ya está protegida)
```

**Re-habilitar cuando termines la migración a Edge Functions**

---

## 📊 PROGRESO ACTUAL

```
SEGURIDAD IMPLEMENTADA:
✅ RLS habilitado (infraestructura)
✅ Datos bloqueados (anon_key no funciona)
✅ Edge Function creada
✅ Servicio del cliente creado

PENDIENTE:
⏳ Deploy Edge Function (5 min)
⏳ Migrar código del cliente (2-3 horas)
⏳ Testing exhaustivo (1 hora)
⏳ Deploy a producción (15 min)

TOTAL: 3-4 horas de trabajo
```

---

**¿Procedo con rollback temporal para que funcione HOY, o quieres hacer el deploy de Edge Function ahora y empezar la migración?**
