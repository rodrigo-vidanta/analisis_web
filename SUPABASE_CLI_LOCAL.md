# 🔐 Configuración Local de Supabase CLI

**⚠️ ARCHIVO LOCAL - NO SUBIR A GIT**

---

## 📋 Token de Acceso

El token con permisos de deploy está guardado en:
```
.supabase/access_token
```

**Permisos del archivo:** 600 (solo lectura para el usuario)

---

## 🚀 Uso del CLI

### Deploy de Edge Functions

```bash
# El token se usa automáticamente si está en .supabase/access_token
npx supabase functions deploy NOMBRE_FUNCION --project-ref glsmifhkoaifvaegsozd
```

### Ver logs

```bash
npx supabase functions logs NOMBRE_FUNCION --project-ref glsmifhkoaifvaegsozd --tail
```

---

## 📦 Funciones Deployed

| Función | Estado | Última Actualización |
|---------|--------|---------------------|
| `send-audio-proxy` | ✅ Deployed | 04 Febrero 2026 |
| `send-message-proxy` | ✅ Deployed | Enero 2026 |
| `pause-bot-proxy` | ✅ Deployed | Enero 2026 |

---

## 🔐 Seguridad

- ✅ `.supabase/` está en `.gitignore`
- ✅ Token tiene permisos 600
- ⚠️ NUNCA subir el token a Git

---

**Última actualización:** 04 Febrero 2026
