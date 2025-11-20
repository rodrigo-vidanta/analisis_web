# 📋 Nueva Lógica de Gestión de Coordinaciones

## 🎯 Cambios Implementados

### 1. **Campo `archivado` (Borrado Lógico)**
- **Tipo**: `BOOLEAN DEFAULT FALSE`
- **Propósito**: Indica si la coordinación está archivada (borrado lógico)
- **Comportamiento**: 
  - Cuando se marca una coordinación como archivada (`archivado = TRUE`), automáticamente se debe abrir un modal para seleccionar a qué coordinación reasignar todos los ejecutivos y coordinadores
  - El modal debe tener un delay de seguridad antes de confirmar (operación irreversible)
  - Una vez archivada, la coordinación no aparece en listados normales pero se mantiene en la base de datos

### 2. **Campo `is_operativo` (Status Operativo)**
- **Tipo**: `BOOLEAN DEFAULT TRUE`
- **Propósito**: Controla si la coordinación está operativa para asignación de prospectos
- **Comportamiento**:
  - **NO excluye** a la coordinación de ninguna de sus funciones normales
  - Aparece en filtros de búsqueda en gestión de usuarios
  - Los usuarios y coordinadores pueden seguir usando normalmente
  - **Solo afecta** la lógica de asignación de prospectos (si `is_operativo = FALSE`, no se asignan prospectos a esa coordinación)

---

## 🗄️ Estructura de Base de Datos

### Tabla `coordinaciones`

```sql
id UUID PRIMARY KEY
codigo VARCHAR
nombre VARCHAR
descripcion TEXT
is_active BOOLEAN  -- Mantener por compatibilidad (deprecated)
archivado BOOLEAN DEFAULT FALSE  -- NUEVO: Borrado lógico
is_operativo BOOLEAN DEFAULT TRUE  -- NUEVO: Status operativo
created_at TIMESTAMP WITH TIME ZONE
updated_at TIMESTAMP WITH TIME ZONE
```

---

## 🔧 Funciones RPC Creadas

### 1. `archivar_coordinacion_y_reasignar()`

**Propósito**: Archiva una coordinación y reasigna todos sus ejecutivos y coordinadores a otra coordinación.

**Parámetros**:
- `p_coordinacion_id` (UUID): ID de la coordinación a archivar
- `p_nueva_coordinacion_id` (UUID): ID de la coordinación destino
- `p_usuario_id` (UUID): ID del usuario que realiza la acción (para auditoría)

**Retorna**: JSONB con el resultado de la operación:
```json
{
  "success": true,
  "coordinacion_id": "...",
  "nueva_coordinacion_id": "...",
  "ejecutivos_reasignados": 5,
  "coordinadores_reasignados": 2,
  "archivado_at": "2025-01-24T..."
}
```

**Validaciones**:
- Verifica que la coordinación existe
- Verifica que no esté ya archivada
- Verifica que la coordinación destino existe y no está archivada
- Reasigna ejecutivos (tabla `auth_users`)
- Reasigna coordinadores (tabla `coordinador_coordinaciones`)
- Archiva la coordinación

**Uso en UI**:
```typescript
const resultado = await supabaseSystemUIAdmin.rpc('archivar_coordinacion_y_reasignar', {
  p_coordinacion_id: coordinacionId,
  p_nueva_coordinacion_id: nuevaCoordinacionId,
  p_usuario_id: user.id
});
```

---

### 2. `get_coordinaciones_operativas()`

**Propósito**: Obtiene todas las coordinaciones no archivadas, ordenadas por nombre.

**Retorna**: Tabla con todas las coordinaciones no archivadas (incluye operativas y no operativas).

**Uso en UI**:
```typescript
const { data } = await supabaseSystemUI.rpc('get_coordinaciones_operativas');
```

---

### 3. `get_coordinaciones_para_asignacion()`

**Propósito**: Obtiene solo las coordinaciones operativas y no archivadas, para asignación de prospectos.

**Retorna**: Tabla con solo coordinaciones que cumplen:
- `archivado = FALSE`
- `is_operativo = TRUE`

**Uso en UI**:
```typescript
const { data } = await supabaseSystemUI.rpc('get_coordinaciones_para_asignacion');
```

---

## 📝 Flujo de Archivo de Coordinación

### Paso 1: Usuario marca coordinación como inactiva/archivada
- El usuario cambia el toggle de `archivado` a `TRUE` en la UI

### Paso 2: Modal de Reasignación
- Se abre automáticamente un modal que muestra:
  - Lista de ejecutivos asignados a la coordinación
  - Lista de coordinadores asignados a la coordinación
  - Dropdown para seleccionar coordinación destino
  - Advertencia de que la operación es irreversible

### Paso 3: Confirmación con Delay de Seguridad
- El botón de confirmar tiene un delay (ej: 3 segundos)
- Durante el delay, muestra contador regresivo
- Mensaje de advertencia visible: "Esta operación es irreversible"

### Paso 4: Ejecución
- Se llama a `archivar_coordinacion_y_reasignar()`
- Se muestran los resultados (ejecutivos y coordinadores reasignados)
- Se actualiza la lista de coordinaciones

---

## 🔍 Consultas Recomendadas

### Obtener coordinaciones para mostrar en UI (excluye archivadas)
```sql
SELECT * FROM coordinaciones 
WHERE archivado = FALSE 
ORDER BY nombre;
```

### Obtener coordinaciones para asignación de prospectos
```sql
SELECT * FROM coordinaciones 
WHERE archivado = FALSE 
AND is_operativo = TRUE 
ORDER BY nombre;
```

### Obtener coordinaciones archivadas (para administración)
```sql
SELECT * FROM coordinaciones 
WHERE archivado = TRUE 
ORDER BY updated_at DESC;
```

---

## ⚠️ Consideraciones Importantes

1. **Compatibilidad**: El campo `is_active` se mantiene por compatibilidad, pero se recomienda usar `archivado` en su lugar.

2. **Migración de Datos**: Los datos existentes se migraron automáticamente:
   - Si `is_active = FALSE` → `archivado = TRUE`
   - Si `is_active = TRUE` → `archivado = FALSE`

3. **Índices**: Se crearon índices para optimizar consultas:
   - `idx_coordinaciones_archivado` (WHERE archivado = FALSE)
   - `idx_coordinaciones_is_operativo` (WHERE is_operativo = TRUE)
   - `idx_coordinaciones_archivado_operativo` (combinado)

4. **Filtros en UI**: 
   - Los filtros de búsqueda deben incluir coordinaciones con `is_operativo = FALSE` (solo afecta asignación de prospectos)
   - Los usuarios y coordinadores pueden seguir usando coordinaciones no operativas normalmente

---

## 📚 Archivos Relacionados

- **Script SQL**: `scripts/sql/update_coordinaciones_schema.sql`
- **Servicio**: `src/services/coordinacionService.ts`
- **Componente UI**: `src/components/admin/CoordinacionesManager.tsx`

---

## 🚀 Próximos Pasos (UI)

1. Actualizar `CoordinacionesManager.tsx` para usar `archivado` en lugar de `is_active`
2. Agregar campo `is_operativo` en el formulario de creación/edición
3. Implementar modal de reasignación con delay de seguridad
4. Actualizar filtros para incluir coordinaciones no operativas
5. Actualizar `coordinacionService.ts` para usar las nuevas funciones RPC
6. Actualizar consultas de asignación de prospectos para usar `get_coordinaciones_para_asignacion()`

---

**Fecha de Implementación**: 2025-01-24  
**Base de Datos**: SystemUI (`zbylezfyagwrxoecioup.supabase.co`)

