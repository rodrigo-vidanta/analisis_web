# 🚀 Guía Rápida: Deploy Completo

**Fecha:** 2026-01-24  
**Para:** Usuario (Samuel)  
**Propósito:** Comando exacto para deployear sin errores

---

## ✅ EL COMANDO QUE SIEMPRE FUNCIONA

Usa EXACTAMENTE este comando en Cursor:

```
deploy completo
```

O si quieres personalizar el mensaje:

```
deploy completo con mensaje: [tu descripción aquí]
```

**Ejemplos:**
```
deploy completo con mensaje: Fix búsqueda WhatsApp + Performance

deploy completo con mensaje: Nuevo módulo de reportes

deploy completo con mensaje: Hotfix login issue
```

---

## ❌ NO USAR (Son Ambiguos)

Estos comandos pueden ser malinterpretados:

- ❌ "documenta y actualiza" → Puede solo actualizar docs
- ❌ "push a git" → Solo git, no AWS ni BD
- ❌ "deploy" → Muy ambiguo
- ❌ "sube a aws" → Solo AWS, no git ni BD

---

## 🔍 ¿Qué Hace el Deploy Completo?

Cuando dices "deploy completo", el agente ejecuta AUTOMÁTICAMENTE:

1. ✅ **Pre-checks** (5 verificaciones de seguridad)
2. ✅ **Script deploy-complete.ts** (sincroniza docs, actualiza versiones, git push, AWS deploy)
3. ✅ **Actualiza BD** (tabla `system_config` con versión requerida)
4. ✅ **Crea handover** (documentación con REF único)
5. ✅ **Commitea handover** (lo sube a Git)
6. ✅ **Auto-verificación** (verifica que TODO se completó)
7. ✅ **Imprime resumen** (con REF y métricas)

**Total: ~1-2 minutos**

---

## 📊 Ejemplo de Output Esperado

```
🔍 Pre-checks:
✅ Script deploy-complete.ts: OK
✅ MCP Supa_PQNC_AI: Conectado
✅ Git status: Clean
✅ Handovers dir: Accesible

🚀 Ejecutando deploy completo...

📚 PASO 1: Sincronizando documentación...
✅ Documentación sincronizada (138 archivos)

📝 PASO 2: Actualizando appVersion.ts a B10.1.42N2.5.46...
✅ appVersion.ts actualizado: B10.1.42N2.5.46

...

🔍 AUTO-VERIFICACIÓN FINAL:
✅ Script deploy-complete.ts: Ejecutado (commit: abc1234)
✅ AWS deploy: Exitoso (34.42s)
✅ Base de datos: Actualizada (version: B10.1.42N2.5.46)
✅ Handover: Creado y commiteado
✅ Git: 2 commits pusheados

🎉 DEPLOY 100% COMPLETO - Sin errores

---

## ✅ DEPLOY COMPLETO v2.5.46

**REF**: `HANDOVER-2026-01-24-DEPLOY-v2.5.46`
**Ubicación**: `.cursor/handovers/2026-01-24-deploy-v2-5-46.md`

### 📊 Métricas
- ⏱️ Tiempo total: 1.5 minutos
- 📦 Archivos modificados: 15 archivos
- 🔨 Commits: abc1234, def5678
- 🚀 URLs:
  - S3: http://pqnc-qa-ai-frontend.s3-website.us-west-2.amazonaws.com
  - CloudFront: https://d3m6zgat40u0u1.cloudfront.net

### ✅ Checklist Completado
- [x] Documentación sincronizada
- [x] Versión actualizada (B10.1.42N2.5.46)
- [x] Git push exitoso
- [x] AWS deploy exitoso
- [x] Base de datos actualizada
- [x] Handover creado y commiteado

### ⏭️ Próximos Pasos
1. Esperar 5-10 min (propagación CloudFront)
2. Limpiar cache navegador (Cmd+Shift+R)
3. Verificar versión en footer

---
🔗 **Ver handover completo**: `.cursor/handovers/2026-01-24-deploy-v2-5-46.md`
```

---

## 🛡️ Si Algo Falla

El agente te dirá EXACTAMENTE:
- ❌ Qué paso falló
- 🔧 Cómo arreglarlo
- 📊 Qué se completó y qué falta
- 📄 Handover parcial con estado actual

**No hay riesgo de deploy incompleto silencioso** - Si algo falla, lo sabrás inmediatamente.

---

## 🎯 Próxima Vez que Quieras Deployear

Solo di:

```
deploy completo
```

Y el agente hará TODO automáticamente.

---

## 📝 Notas

- El comando funciona con o sin mensaje personalizado
- El agente incrementa la versión automáticamente (ej: v2.5.45 → v2.5.46)
- Si quieres versión específica, díselo: "deploy completo con versión B10.1.42N2.5.50"
- CloudFront tarda 5-10 min en propagar (normal)

---

**Guardado en:** `docs/DEPLOY_QUICK_GUIDE.md`  
**Versión:** 1.0.0  
**Última actualización:** 2026-01-24
