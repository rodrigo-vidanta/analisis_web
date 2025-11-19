# 🚀 Guía Simple: Desplegar error-analisis-proxy

## 📋 ¿Qué necesitas hacer?

La función **existe en tu computadora** pero **NO está en Supabase todavía**. Necesitas desplegarla.

---

## ✅ Opción 1: Script Automático (Más Fácil)

### Paso 1: Ejecutar el script
```bash
cd /Users/darigsamuelrosalesrobledo/Documents/pqnc-qa-ai-platform
./deploy-error-analisis-proxy.sh
```

El script hará todo automáticamente:
- ✅ Verifica que tengas Supabase CLI instalado
- ✅ Te ayuda a hacer login si es necesario
- ✅ Vincula el proyecto
- ✅ Despliega la función

### Paso 2: Configurar variables de entorno

**IMPORTANTE:** Después de desplegar, debes agregar las variables en Supabase:

1. Ve a: https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/settings/functions
2. Busca la función `error-analisis-proxy` en la lista
3. Haz clic en ella
4. Ve a la sección **"Secrets"** o **"Environment Variables"**
5. Agrega estas dos variables:

| Nombre | Valor |
|--------|-------|
| `ERROR_ANALISIS_WEBHOOK_TOKEN` | `4@Lt'\o93BSkgA59MH[TSC"gERa+)jlgf\|BWIR-7fAmM9o59}3.\|W2k-JiRu(oeb` |
| `ERROR_ANALISIS_WEBHOOK_URL` | `https://primary-dev-d75a.up.railway.app/webhook/error-analisis` |

6. Guarda los cambios

---

## ✅ Opción 2: Desde el Dashboard de Supabase (Sin Terminal)

Si prefieres NO usar la terminal, puedes crear la función directamente desde el dashboard:

### Paso 1: Crear función desde el dashboard

1. Ve a: https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/functions
2. Haz clic en **"Create a new function"**
3. Nombre: `error-analisis-proxy`
4. Copia y pega el código de `supabase/functions/error-analisis-proxy/index.ts`
5. Guarda

### Paso 2: Configurar variables de entorno

Igual que en la Opción 1, agrega las variables `ERROR_ANALISIS_WEBHOOK_TOKEN` y `ERROR_ANALISIS_WEBHOOK_URL`

---

## ✅ Opción 3: Manual con Terminal

Si prefieres hacerlo paso a paso:

### 1. Instalar Supabase CLI (si no lo tienes)
```bash
brew install supabase/tap/supabase
```

### 2. Login
```bash
supabase login
```
(Esto abrirá tu navegador para autenticarte)

### 3. Vincular proyecto
```bash
cd /Users/darigsamuelrosalesrobledo/Documents/pqnc-qa-ai-platform
supabase link --project-ref zbylezfyagwrxoecioup
```

### 4. Desplegar función
```bash
supabase functions deploy error-analisis-proxy --project-ref zbylezfyagwrxoecioup
```

### 5. Configurar variables (igual que arriba)

---

## 🧪 Verificar que Funciona

Después de desplegar y configurar las variables, prueba con:

```bash
curl -X POST \
  'https://zbylezfyagwrxoecioup.supabase.co/functions/v1/error-analisis-proxy' \
  -H 'Content-Type: application/json' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzYyNzEsImV4cCI6MjA3NDkxMjI3MX0.W6Vt5h4r7vNSP_YQtd_fbTWuK7ERrcttwhcpe5Q7KoM' \
  -d '{
    "analysis_id": "test-id",
    "error_log": {
      "id": "test-log-id",
      "tipo": "ui",
      "subtipo": "test",
      "severidad": "media",
      "ambiente": "desarrollo",
      "timestamp": "2025-01-18T15:21:00.000Z",
      "mensaje": "Test error"
    },
    "tags": [],
    "annotations": [],
    "include_suggested_fix": true,
    "requested_at": "2025-01-18T15:22:00.000Z"
  }'
```

Si funciona, deberías ver una respuesta JSON del webhook.

---

## ❓ Preguntas Frecuentes

### ¿Por qué no veo la función en Supabase?
**Porque aún no la has desplegado.** La función solo existe en tu computadora. Necesitas desplegarla usando una de las opciones arriba.

### ¿Qué es "desplegar"?
Es subir el código de tu computadora a los servidores de Supabase para que esté disponible en internet.

### ¿Necesito hacer esto cada vez?
No, solo la primera vez. Después, si cambias el código, solo ejecutas el script de nuevo para actualizar.

### ¿Puedo hacerlo sin terminal?
Sí, usa la **Opción 2** (Dashboard de Supabase). Pero tendrás que copiar y pegar el código manualmente.

---

## 🆘 Si algo sale mal

1. **Error: "Function not found"**
   - Verifica que hayas desplegado la función
   - Verifica que el nombre sea exactamente `error-analisis-proxy`

2. **Error: "ERROR_ANALISIS_WEBHOOK_TOKEN no configurada"**
   - Ve al dashboard y agrega la variable de entorno
   - Re-despliega después de agregar las variables

3. **Error: "Not logged in"**
   - Ejecuta: `supabase login`

4. **Error: "Project not linked"**
   - Ejecuta: `supabase link --project-ref zbylezfyagwrxoecioup`

---

## ✅ Checklist Final

- [ ] Función desplegada en Supabase
- [ ] Variable `ERROR_ANALISIS_WEBHOOK_TOKEN` configurada
- [ ] Variable `ERROR_ANALISIS_WEBHOOK_URL` configurada (opcional, tiene valor por defecto)
- [ ] Prueba con curl funciona correctamente
- [ ] La función aparece en: https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/functions

---

**¡Listo!** Una vez completado esto, la función estará disponible y funcionando. 🎉

