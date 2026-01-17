# PLAN DE SEGURIDAD - IMPLEMENTACIÓN HOY

**Fecha:** 15 Enero 2026  
**Tiempo total:** 2-3 horas  
**Estado:** Sistema funcional, migración en progreso  

---

## ✅ COMPLETADO (Últimas 2 horas)

```
1. ✅ Auditoría exhaustiva (Jungala + VidaVacations)
2. ✅ Identificación de vulnerabilidades críticas
3. ✅ RLS implementado en BD (infraestructura lista)
4. ✅ Edge Function secure-query creada
5. ✅ Servicio secureQueryService.ts creado
6. ✅ Clientes interceptados (analysisSupabase, supabaseSystemUI)
7. ✅ Backup de 140 usuarios guardado
8. ✅ Script de deploy automatizado
```

---

## ⏳ PRÓXIMOS PASOS (Hoy - 1.5 horas)

### PASO 1: Deploy Edge Function (TÚ - 5 min)

```bash
cd ~/Documents/pqnc-qa-ai-platform
./deploy-edge-functions.sh
```

**Esto despliega:**
- Edge Function en glsmifhkoaifvaegsozd
- Configura service_role key como secret
- Endpoint: `/functions/v1/secure-query`

### PASO 2: Activar Modo Seguro (YO - 1 min)

```bash
# Cambiar en .env.local
VITE_USE_SECURE_QUERIES=false → true
```

### PASO 3: Testear Localmente (JUNTOS - 15 min)

```bash
npm run dev
# Probar:
- Login ✓
- Módulo Prospectos ✓
- Módulo WhatsApp ✓
- Módulo Llamadas IA ✓
- Dashboard ✓
```

### PASO 4: Re-habilitar RLS (YO - 2 min)

```sql
ALTER TABLE prospectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE llamadas_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversaciones_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_whatsapp ENABLE ROW LEVEL SECURITY;
```

### PASO 5: Configurar .env.production (TÚ - 2 min)

```bash
# Agregar a .env.production
VITE_USE_SECURE_QUERIES=true
```

### PASO 6: Deploy a AWS (TÚ - 10 min)

```bash
npm run build
./update-frontend.sh
```

### PASO 7: Verificar en producción (JUNTOS - 15 min)

```bash
# Test de seguridad post-deploy
curl https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/prospectos?select=*
→ Debe retornar [] (bloqueado)

# App debe funcionar normal
https://ai.vidavacations.com
→ Login, ver datos, todo funcional
```

---

## 🔐 ARQUITECTURA FINAL

```
┌─────────────────────────────────────────────────────────┐
│ Frontend (React)                                        │
│ ├─ NO usa anon_key directamente                        │
│ └─ Llama Edge Function con session_token               │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Edge Function (Deno)                                    │
│ ├─ Valida session_token en auth_sessions               │
│ ├─ Valida origen (solo dominios permitidos)            │
│ └─ Usa service_role para queries                       │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Supabase Database                                       │
│ ├─ RLS habilitado (solo service_role)                  │
│ ├─ Anon_key bloqueada                                  │
│ └─ Datos protegidos                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 NOTA PARA N8N

N8N ya debe estar usando service_role directamente. Verificar en:
- https://primary-dev-d75a.up.railway.app
- Workflows que consultan Supabase
- Deben tener service_role_key configurada

---

## 🎯 ESTADO ACTUAL DEL SISTEMA

```
Sistema: ✅ FUNCIONAL (RLS deshabilitado temporalmente)
Seguridad: ⚠️ PARCIAL
  ✅ api_auth_tokens protegida
  ✅ IP Restriction activa (AWS)
  ⏳ RLS en datos (pendiente Edge Function)
  ❌ Rate Limiting (pendiente AWS WAF)
  ❌ CORS (pendiente CloudFront)

Progreso: 40% → 100% (hoy)
```

---

**AHORA ejecuta:**
```bash
cd ~/Documents/pqnc-qa-ai-platform  
./deploy-edge-functions.sh
```

**Cuando termine, avísame y continúo con los tests.**
