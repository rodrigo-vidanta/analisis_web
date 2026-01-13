# Instrucciones para Actualizar .env.local

**Fecha:** 2025-01-13  
**Propósito:** Migración de frontend de System_UI a PQNC_AI

---

## PASO 1: Abrir .env.local

Ubicación: `/Users/darigsamuelrosalesrobledo/Documents/pqnc-qa-ai-platform/.env.local`

---

## PASO 2: Comentar Variables de System_UI

Busca estas líneas y coméntalas (agregar # al inicio):

```bash
# ============================================
# BACKUP - System_UI (para rollback)
# ============================================
# VITE_SYSTEM_UI_SUPABASE_URL=https://zbylezfyagwrxoecioup.supabase.co
# VITE_SYSTEM_UI_SUPABASE_ANON_KEY=<tu_anon_key_actual>
# VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY=<tu_service_key_actual>
```

**⚠️ NO ELIMINAR**: Mantener estas líneas comentadas para rollback rápido si algo falla.

---

## PASO 3: Agregar Variables de PQNC_AI

Agrega estas líneas nuevas (usar credenciales de PQNC_AI):

```bash
# ============================================
# MIGRACIÓN 2025-01-13: System_UI → PQNC_AI
# ============================================
VITE_SYSTEM_UI_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
VITE_SYSTEM_UI_SUPABASE_ANON_KEY=<COPIAR_DE_VITE_SUPABASE_ANON_KEY>
VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY=<COPIAR_DE_VITE_SUPABASE_SERVICE_KEY>
```

**📋 Nota:** Los valores de `ANON_KEY` y `SERVICE_KEY` deben ser EXACTAMENTE iguales a:
- `VITE_SUPABASE_ANON_KEY` (que ya tienes configurado)
- `VITE_SUPABASE_SERVICE_KEY` (que ya tienes configurado)

---

## PASO 4: Verificar que quedó así

Tu `.env.local` debe tener estas líneas:

```bash
# ============================================
# PQNC_AI (base de datos principal)
# ============================================
VITE_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
VITE_SUPABASE_ANON_KEY=<tu_pqnc_anon_key>
VITE_SUPABASE_SERVICE_KEY=<tu_pqnc_service_key>

# ============================================
# MIGRACIÓN 2025-01-13: System_UI → PQNC_AI
# Ahora VITE_SYSTEM_UI_* apunta a PQNC_AI
# ============================================
VITE_SYSTEM_UI_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
VITE_SYSTEM_UI_SUPABASE_ANON_KEY=<mismo_valor_que_VITE_SUPABASE_ANON_KEY>
VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY=<mismo_valor_que_VITE_SUPABASE_SERVICE_KEY>

# ============================================
# BACKUP - System_UI (para rollback)
# ============================================
# VITE_SYSTEM_UI_SUPABASE_URL=https://zbylezfyagwrxoecioup.supabase.co
# VITE_SYSTEM_UI_SUPABASE_ANON_KEY=<backup_anon_key>
# VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY=<backup_service_key>
```

---

## PASO 5: Guardar y Cerrar

Guardar el archivo `.env.local` y cerrar el editor.

---

## ⚠️ ROLLBACK

Si algo falla, revertir:

1. Comentar las líneas nuevas de PQNC_AI
2. Descomentar las líneas de System_UI (quitar #)
3. Guardar y recargar la aplicación

---

## Siguiente Paso

Después de actualizar `.env.local`, ejecutar:

```bash
npm run dev
```

Y probar login en `localhost:5173`
