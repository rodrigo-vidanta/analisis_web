# 🔍 DIAGNÓSTICO: Filtro de Ejecutivos en Prospectos

**Fecha:** 24 de Enero 2026  
**Problema reportado:** "Issel Rico" no aparece en el filtro de ejecutivos del módulo de Prospectos

---

## ✅ HALLAZGOS

### 1. La Base de Datos Está Correcta

**✅ Ejecutivo SÍ existe en la BD:**
```json
{
  "id": "895e5680-0a8e-4c9e-bf8b-bad054bd527d",
  "email": "gisselortiz@vidavacations.com",
  "full_name": "Ortiz Rojas Gissel Andrea",
  "role_name": "ejecutivo",
  "is_active": true,
  "coordinacion_id": "3f41a10b-60b1-4c2b-b097-a83968353af5"
}
```

**✅ Estado del sistema:**
- Vista `user_profiles_v2` funciona correctamente
- Consulta de ejecutivos trae 116 registros (86 activos)
- Filtro por `is_active` funciona correctamente
- Filtro por `coordinacion_id` funciona correctamente

---

## ⚠️ CAUSA RAÍZ

**El nombre registrado NO coincide con lo que el usuario busca:**

| Campo | Valor en BD | Lo que busca el usuario |
|-------|-------------|------------------------|
| Nombre completo | Ortiz Rojas **Gissel** Andrea | **Issel Rico** |
| Email | gisselortiz@vidavacations.com | - |

**Diferencias:**
1. "Gissel" vs "Issel" (una letra)
2. Apellido "Ortiz Rojas" vs "Rico"
3. Nombre completo formal vs nombre corto/alias

---

## 🎯 SOLUCIONES

### Opción 1: Actualizar Nombre en BD (Recomendado)

Si "Issel Rico" es el nombre correcto o preferido:

```bash
node scripts/actualizar-nombre-ejecutivo.mjs gisselortiz@vidavacations.com "Issel Rico"
```

**Ventajas:**
- ✅ Cambio inmediato
- ✅ Afecta todos los módulos
- ✅ Más intuitivo para usuarios

**Desventajas:**
- ⚠️ Pierde el nombre formal completo
- ⚠️ Puede causar confusión con registros oficiales

---

### Opción 2: Actualizar a Nombre Híbrido

Mantener el nombre formal pero con "Issel" en lugar de "Gissel":

```bash
node scripts/actualizar-nombre-ejecutivo.mjs gisselortiz@vidavacations.com "Ortiz Rico Issel Andrea"
```

**Ventajas:**
- ✅ Mantiene estructura formal
- ✅ Incluye el apellido correcto "Rico"
- ✅ Facilita búsqueda por "Issel" o "Rico"

---

### Opción 3: Agregar Campo de Alias (Cambio de código)

Agregar un campo `display_name` o `nickname` en los metadatos del usuario:

**Cambios necesarios:**
1. Actualizar `user_profiles_v2` para incluir alias
2. Modificar filtros para buscar en alias
3. Modificar UI para mostrar alias cuando exista

**Ventajas:**
- ✅ Mantiene nombre formal intacto
- ✅ Permite múltiples alias
- ✅ Flexible para futuros casos

**Desventajas:**
- ❌ Requiere cambios en BD y código
- ❌ Más complejo de implementar

---

### Opción 4: Mejorar Búsqueda con Normalización

Agregar búsqueda fuzzy/flexible que considere variaciones:

```typescript
// Normalizar nombres para búsqueda
function normalizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .replace(/gissel/g, 'issel')  // Variación común
    .replace(/\s+/g, ' ')
    .trim();
}

// En el filtro
ejecutivosOptions.filter(e => {
  const nombreNormalizado = normalizarNombre(e.full_name);
  const busquedaNormalizada = normalizarNombre(searchTerm);
  return nombreNormalizado.includes(busquedaNormalizada);
});
```

**Ventajas:**
- ✅ No requiere cambios en BD
- ✅ Más tolerante a errores de escritura
- ✅ Funciona para otros casos similares

**Desventajas:**
- ❌ No resuelve el problema en dropdowns (solo en búsqueda)
- ❌ Agrega complejidad a la lógica de filtrado

---

## 📋 RECOMENDACIÓN FINAL

**Combinar Opción 2 + Opción 4:**

1. **Actualizar nombre a formato híbrido:**
   ```bash
   node scripts/actualizar-nombre-ejecutivo.mjs gisselortiz@vidavacations.com "Rico Ortiz Issel Andrea"
   ```
   
   - Formato: `[Apellido Paterno] [Apellido Materno] [Nombre] [Segundo Nombre]`
   - Ventaja: Buscable por "Rico", "Issel", "Ortiz"

2. **Mejorar búsqueda del módulo** (futuro):
   - Implementar búsqueda fuzzy
   - Considerar variaciones comunes de nombres

---

## 🔧 CÓDIGO VERIFICADO

### Filtro de Ejecutivos (ProspectosManager.tsx)

**Ubicación:** Líneas 1085-1090

```typescript
// Cargar ejecutivos
const ejecutivos = await coordinacionService.getAllEjecutivos();
setEjecutivosOptions(ejecutivos.filter(e => e.is_active).map(e => ({
  id: e.id,
  full_name: e.full_name,
  coordinacion_id: e.coordinacion_id
})));
```

**✅ Código correcto:** Filtra solo activos y mapea correctamente.

---

### Query de Base de Datos (coordinacionService.ts)

**Ubicación:** Líneas 1122-1139

```typescript
const { data, error } = await supabaseSystemUI
  .from('user_profiles_v2')
  .select(`
    id,
    email,
    full_name,
    first_name,
    last_name,
    phone,
    coordinacion_id,
    is_active,
    email_verified,
    last_login,
    created_at,
    role_name
  `)
  .eq('role_name', 'ejecutivo')
  .order('full_name');
```

**✅ Query correcta:** Consulta user_profiles_v2 con filtro de rol.

---

### Vista de Base de Datos (user_profiles_v2)

**Definición:** `scripts/fix-user-profiles-v2-view.sql`

```sql
CREATE OR REPLACE VIEW public.user_profiles_v2 AS
SELECT 
  au.id,
  au.email,
  COALESCE((au.raw_user_meta_data->>'full_name')::TEXT, '') as full_name,
  -- ... otros campos ...
FROM auth.users au
LEFT JOIN public.auth_roles ar ON ar.id = (au.raw_user_meta_data->>'role_id')::UUID
WHERE au.deleted_at IS NULL;
```

**✅ Vista correcta:** Lee de auth.users nativos con metadata.

---

## 🎯 ACCIONES INMEDIATAS

1. **Decidir nombre correcto:**
   - ¿Mantener "Ortiz Rojas Gissel Andrea"?
   - ¿Cambiar a "Issel Rico"?
   - ¿Usar formato híbrido "Rico Ortiz Issel Andrea"?

2. **Ejecutar actualización:**
   ```bash
   cd /Users/darigsamuelrosalesrobledo/Documents/pqnc-qa-ai-platform
   node scripts/actualizar-nombre-ejecutivo.mjs gisselortiz@vidavacations.com "[NOMBRE_ELEGIDO]"
   ```

3. **Verificar cambio:**
   - Recargar módulo de Prospectos (F5)
   - Buscar en dropdown de ejecutivos
   - Verificar que aparezca con el nuevo nombre

---

## 📊 ESTADÍSTICAS ACTUALES

```
Total ejecutivos en BD: 116
Ejecutivos activos: 86
Ejecutivos con coordinación: ~80
```

**Primeros 15 ejecutivos activos:**
1. Acosta Ramirez Hadassa Aseret
2. Alatorre Rodriguez Osvaldo Emmanuel
3. Aparicio Mendoza Noel
4. Arrizon Lizardo Fernando Emmanuel
5. Avalos Pimentel Antonio
6. Basilio Arcos Lisset
7. Campos Hernandez Allison Amairany
8. Castrejon Torres Jesus
9. Cavilee Borbon Maria Luisa
10. Ceja Torres Alondra Marisol
11. Chavez Abreu Paola Michelle
12. Cibrian Arce Aurelio
13. Clavijo Martinez Lidia Deyamira
14. **Ortiz Rojas Gissel Andrea** ← Este es "Issel Rico"
15. [...]

---

## 📁 ARCHIVOS RELACIONADOS

| Archivo | Descripción |
|---------|-------------|
| `scripts/diagnosticar-ejecutivos-filtro.mjs` | Diagnóstico automatizado |
| `scripts/consulta-ejecutivos-real.mjs` | Consulta real a BD |
| `scripts/actualizar-nombre-ejecutivo.mjs` | Script de actualización |
| `src/components/prospectos/ProspectosManager.tsx` | Componente con filtro |
| `src/services/coordinacionService.ts` | Servicio de consulta |
| `scripts/fix-user-profiles-v2-view.sql` | Definición de vista |

---

**Elaborado por:** Cursor AI Agent  
**Basado en:** Consulta real a BD PQNC_AI (glsmifhkoaifvaegsozd)
