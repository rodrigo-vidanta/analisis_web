# Problema: Coordinador de CALIDAD No Puede Ver Todos los Prospectos

**Fecha:** 13 de Enero 2026, 23:40  
**Usuario afectado:** Angélica Guzmán Velasco (angelicaguzman@vidavacations.com)  
**Problema:** Solo ve prospectos de su coordinación, debería ver TODOS

---

## Comportamiento Esperado

**Coordinadores de CALIDAD** tienen permisos especiales:
- Pueden ver prospectos de TODAS las coordinaciones
- Similar a permisos de Admin
- Definido en `permissionsService.ts` línea 30: `COORDINACION_CALIDAD_CODIGO = 'CALIDAD'`

---

## Comportamiento Actual

Usuario solo ve prospectos filtrados por su coordinación (comportamiento normal de coordinador).

---

## Causa Raíz Identificada

### Problema en `isCoordinadorCalidad()` (línea 813-864)

**Función:** `src/services/permissionsService.ts` línea 834-855

**Consulta problemática:**
```typescript
const { data, error } = await supabaseSystemUIAdmin
  .from('auth_user_coordinaciones')
  .select(`
    coordinacion_id,
    coordinaciones:coordinacion_id (  // ❌ PROBLEMA AQUÍ
      codigo
    )
  `)
  .eq('user_id', userId);
```

**El error:** Foreign key embed `coordinaciones:coordinacion_id` **FALLA** con error 400.

**Resultado:** 
- La consulta retorna error
- Catch block retorna `false`
- Usuario NO es detectado como coordinador de CALIDAD
- Se aplican filtros normales de coordinador

---

## Por Qué Funcionaba Antes

**ANTES de la migración:**
- Tablas en bases de datos separadas
- Diferentes configuraciones de Supabase
- Posiblemente había foreign key constraint definida
- O el código manejaba el error de forma diferente

**DESPUÉS de la migración:**
- Tabla `auth_user_coordinaciones` migrada sin foreign key constraint a `coordinaciones`
- Supabase no puede detectar la relación automáticamente
- Embed falla con error 400
- Función retorna false

---

## Solución Sugerida

### Opción 1: Consulta Separada (Más Segura)

```typescript
async isCoordinadorCalidad(userId: string): Promise<boolean> {
  // ... código de caché ...
  
  try {
    const permissions = await this.getUserPermissions(userId);
    if (!permissions || permissions.role !== 'coordinador') {
      this.calidadCache.set(userId, { data: false, timestamp: Date.now() });
      return false;
    }

    // Obtener coordinaciones del coordinador
    const { data: relaciones, error: relError } = await supabaseSystemUIAdmin
      .from('auth_user_coordinaciones')
      .select('coordinacion_id')
      .eq('user_id', userId);

    if (relError || !relaciones || relaciones.length === 0) {
      this.calidadCache.set(userId, { data: false, timestamp: Date.now() });
      return false;
    }

    // Obtener datos de coordinaciones por separado
    const coordIds = relaciones.map(r => r.coordinacion_id);
    const { data: coords, error: coordError } = await supabaseSystemUIAdmin
      .from('coordinaciones')
      .select('codigo')
      .in('id', coordIds);

    if (coordError || !coords) {
      this.calidadCache.set(userId, { data: false, timestamp: Date.now() });
      return false;
    }

    // Verificar si alguna es CALIDAD
    const isCalidad = coords.some(c => c.codigo?.toUpperCase() === 'CALIDAD');
    
    this.calidadCache.set(userId, { data: isCalidad, timestamp: Date.now() });
    return isCalidad;
    
  } catch (error) {
    console.error('Error verificando coordinador de calidad:', error);
    return false;
  }
}
```

---

### Opción 2: Crear Foreign Key Constraint

```sql
-- Agregar constraint en auth_user_coordinaciones
ALTER TABLE auth_user_coordinaciones
ADD CONSTRAINT fk_coordinacion
FOREIGN KEY (coordinacion_id) 
REFERENCES coordinaciones(id)
ON DELETE CASCADE;
```

**Ventaja:** Supabase detectaría la relación automáticamente  
**Desventaja:** Puede afectar datos existentes si hay IDs inválidos

---

### Opción 3: Usar Vista

```sql
CREATE VIEW coordinador_calidad_check AS
SELECT 
  auc.user_id,
  COUNT(*) FILTER (WHERE c.codigo = 'CALIDAD') > 0 as es_coordinador_calidad
FROM auth_user_coordinaciones auc
LEFT JOIN coordinaciones c ON auc.coordinacion_id = c.id
GROUP BY auc.user_id;
```

**Uso:**
```typescript
const { data } = await supabase
  .from('coordinador_calidad_check')
  .select('es_coordinador_calidad')
  .eq('user_id', userId)
  .single();

return data?.es_coordinador_calidad || false;
```

---

## Impacto del Bug

### Usuarios Afectados

**Todos los coordinadores de CALIDAD:**
- No pueden ver prospectos de otras coordinaciones
- Solo ven su coordinación asignada
- Pierden privilegios especiales

### Funcionalidades Afectadas

1. **Prospectos Manager**
   - Coordinador CALIDAD debería ver TODOS
   - Actualmente solo ve su coordinación

2. **Live Monitor**
   - Coordinador CALIDAD debería ver TODAS las llamadas
   - Actualmente solo ve su coordinación

3. **WhatsApp/Live Chat**
   - Coordinador CALIDAD debería ver TODAS las conversaciones
   - Actualmente solo ve su coordinación

4. **Asignaciones**
   - Coordinador CALIDAD debería poder asignar a cualquier coordinación
   - Actualmente solo a su coordinación

---

## Verificación Sugerida

### 1. Verificar que la coordinación CALIDAD existe

```sql
SELECT * FROM coordinaciones WHERE codigo = 'CALIDAD';
```

**Resultado esperado:** 1 fila con código 'CALIDAD'

---

### 2. Verificar que Angélica está asignada a CALIDAD

```sql
SELECT 
  u.email,
  u.full_name,
  c.nombre as coordinacion_nombre,
  c.codigo as coordinacion_codigo
FROM auth_users u
JOIN auth_user_coordinaciones auc ON u.id = auc.user_id
JOIN coordinaciones c ON auc.coordinacion_id = c.id
WHERE u.email = 'angelicaguzman@vidavacations.com';
```

**Resultado esperado:** coordinacion_codigo = 'CALIDAD'

---

### 3. Probar función isCoordinadorCalidad manualmente

```typescript
// En consola del navegador (con sesión de Angélica):
import { permissionsService } from './services/permissionsService';
const result = await permissionsService.isCoordinadorCalidad('<user_id_angelica>');
console.log('Es coordinador CALIDAD:', result);
```

**Resultado esperado:** `true`  
**Resultado actual (probable):** `false` (por el error 400)

---

## Workaround Temporal

Hasta que se corrija el código, puedes **asignar permisos de admin temporalmente** a Angélica:

```sql
-- Obtener rol de admin
SELECT id FROM auth_roles WHERE name = 'admin';

-- Cambiar rol temporalmente
UPDATE auth_users
SET role_id = '<admin_role_id>'
WHERE email = 'angelicaguzman@vidavacations.com';
```

**⚠️ Esto le da permisos COMPLETOS de admin, no solo de ver todos los prospectos.**

---

## Solución Definitiva Recomendada

**Opción 1 (Más Segura):** 
- Modificar `isCoordinadorCalidad()` para hacer consultas separadas
- No depender de embeds de foreign keys
- 15-20 minutos de trabajo
- Testing: 10 minutos
- Deploy: 20 minutos
- **Total:** ~1 hora

**Estado:** ⏳ PENDIENTE DE IMPLEMENTAR

---

## Otros Coordinadores de CALIDAD Afectados

**Verificar:**
```sql
SELECT 
  u.id,
  u.email,
  u.full_name,
  r.name as role_name,
  c.codigo as coordinacion_codigo
FROM auth_users u
JOIN auth_roles r ON u.role_id = r.id
JOIN auth_user_coordinaciones auc ON u.id = auc.user_id
JOIN coordinaciones c ON auc.coordinacion_id = c.id
WHERE r.name = 'coordinador'
  AND c.codigo = 'CALIDAD';
```

**Todos estos usuarios están afectados por el mismo bug.**

---

## Prioridad

**ALTA** - Afecta funcionalidad core de coordinadores de CALIDAD

**Recomendación:** Corregir en la próxima sesión de correcciones (junto con otros embeds)

---

**Documentado por:** AI Agent  
**Última actualización:** 13 de Enero 2026, 23:40
