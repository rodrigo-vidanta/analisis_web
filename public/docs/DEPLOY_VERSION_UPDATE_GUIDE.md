# Guía: Actualización Automática de Versión en BD durante Deploy

**Fecha:** 22 de Enero 2026  
**Versión:** 1.0.0

---

## 📋 Resumen

Cuando ejecutas "documenta y actualiza", el agente automáticamente actualiza la versión requerida en la base de datos usando el MCP `SupabaseREST` con tu access token.

---

## 🔧 Cómo Funciona

### 1. El Agente Extrae la Versión

El agente lee `src/components/Footer.tsx` y extrae la versión completa:

```typescript
const version = 'B10.1.39N2.5.39';  // ← Versión completa
```

### 2. El Agente Usa MCP SupabaseREST

El agente invoca automáticamente:

```typescript
// 1. Verificar si existe
mcp_SupabaseREST_query_table({
  table: "system_config",
  select: "config_key, config_value",
  filter: { config_key: "app_version" }
})

// 2. Actualizar o crear
mcp_SupabaseREST_update_data({
  table: "system_config",
  filter: { config_key: "app_version" },
  data: {
    config_value: {
      version: "B10.1.39N2.5.39",  // Versión del Footer.tsx
      force_update: true
    }
  }
})

// 3. Verificar
mcp_SupabaseREST_query_table({
  table: "system_config",
  select: "config_key, config_value, updated_at",
  filter: { config_key: "app_version" }
})
```

### 3. El Access Token

El MCP lee automáticamente el access token de:
- **Ubicación:** `.supabase/access_token`
- **Configuración:** `~/.cursor/mcp.json`
- **No requiere:** Variables de entorno adicionales

---

## 📝 Formato de Versión

### En Footer.tsx

```typescript
const version = 'B10.1.39N2.5.39';
```

**Formato:** `B{backend}.{minor}.{patch}N{frontend}.{minor}.{patch}`

### En Base de Datos

```json
{
  "version": "B10.1.39N2.5.39",
  "force_update": true
}
```

### Comparación en el Cliente

El hook `useVersionCheck` extrae la **primera parte** (antes de "N"):

- `"B10.1.39N2.5.39"` → extrae `"B10.1.39"`
- Compara con la versión del build actual

---

## 🎯 Flujo Completo

```
1. Usuario: "documenta y actualiza"
   ↓
2. Agente sincroniza documentación
   ↓
3. Agente actualiza Footer.tsx con nueva versión
   ↓
4. Agente hace git commit y push
   ↓
5. Agente ejecuta ./update-frontend.sh (deploy AWS)
   ↓
6. Agente lee versión de Footer.tsx
   ↓
7. Agente invoca MCP SupabaseREST:
   - mcp_SupabaseREST_query_table (verificar)
   - mcp_SupabaseREST_update_data (actualizar)
   - mcp_SupabaseREST_query_table (verificar)
   ↓
8. Usuarios con versión anterior ven modal de actualización
```

---

## ⚙️ Configuración del MCP

### Archivo: `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "SupabaseREST": {
      "command": "npx",
      "args": [
        "ts-node",
        "/ruta/completa/al/proyecto/mcp-supabase-rest-server.ts"
      ],
      "env": {
        "SUPABASE_PROJECT_ID": "glsmifhkoaifvaegsozd"
      }
    }
  }
}
```

### Access Token: `.supabase/access_token`

```bash
# El archivo contiene solo el token (sin espacios ni saltos de línea)
sbp_tu_token_aqui
```

**Ubicaciones que busca el MCP:**
1. `.supabase/access_token` (en proyecto)
2. `~/.supabase/access_token` (en home)
3. Variable `SUPABASE_ACCESS_TOKEN` (en mcp.json env)

---

## 🔍 Verificación Manual

### Ver versión actual en BD

```sql
SELECT config_key, config_value, updated_at 
FROM system_config 
WHERE config_key = 'app_version';
```

### Ver versión en Footer.tsx

```bash
grep "const version" src/components/Footer.tsx
```

### Probar actualización manual

```bash
# Leer versión del Footer
VERSION=$(grep "const version" src/components/Footer.tsx | cut -d"'" -f2)

# Actualizar en BD (si tienes script)
tsx scripts/update-app-version.ts "$VERSION"
```

---

## 📚 Referencias

- [Regla de Deploy](.cursor/rules/deploy-workflow.mdc) - PASO 6.5
- [MCP REST Setup](docs/MCP_REST_SETUP.md) - Configuración del MCP
- [Sistema de Control de Versiones](docs/VERSION_CONTROL_SYSTEM.md) - Documentación completa
- [Hook useVersionCheck](src/hooks/useVersionCheck.ts) - Lógica de comparación

---

**Última actualización:** 22 de Enero 2026
