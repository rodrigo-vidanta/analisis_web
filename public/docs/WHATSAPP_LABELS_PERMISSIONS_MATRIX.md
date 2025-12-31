# Matriz de Permisos - Sistema de Etiquetas WhatsApp

## 🔐 Reglas de Remoción de Etiquetas

### Jerarquía de Permisos

| Usuario Actual | Etiqueta Aplicada Por | Puede Remover | Razón |
|----------------|----------------------|---------------|-------|
| **Admin** | Cualquiera | ✅ SÍ | Administrador total |
| **Admin Operativo** | Cualquiera | ✅ SÍ | Administrador total |
| **Coordinador Calidad** | Cualquiera | ✅ SÍ | Supervisión de calidad |
| **Coordinador MVL** | Ejecutivo MVL | ✅ SÍ | Gestión de su equipo |
| **Coordinador MVL** | Coordinador MVL | ✅ SÍ | Misma coordinación |
| **Coordinador MVL** | Ejecutivo PVR | ❌ NO | Diferente coordinación |
| **Coordinador MVL** | Admin | ❌ NO | Jerarquía superior |
| **Ejecutivo** | Él mismo | ✅ SÍ | Su propia etiqueta |
| **Ejecutivo** | Su coordinador | ❌ NO | Jerarquía superior |
| **Ejecutivo** | Otro ejecutivo | ❌ NO | No es suya |

---

## 📋 Casos de Uso

### Caso 1: Admin Samuel quita cualquier etiqueta
```
Usuario: samuelrosales@grupovidanta.com (Admin)
Etiqueta: "VIP" aplicada por ejecutivo de MVL
Resultado: ✅ Puede remover
Razón: "Eres administrador"
```

### Caso 2: Coordinador Calidad quita etiqueta de cualquier coordinación
```
Usuario: angelicaguzman@vidavacations.com (Coord Calidad)
Etiqueta: "Pruebas" aplicada por ejecutivo de MVL
Resultado: ✅ Puede remover
Razón: "Eres coordinador de Calidad"
```

### Caso 3: Coordinador MVL quita etiqueta de su equipo
```
Usuario: Coordinador MVL
Etiqueta: "Urgente" aplicada por ejecutivo MVL
Resultado: ✅ Puede remover
Razón: "Eres coordinador de la misma coordinación"
```

### Caso 4: Coordinador MVL NO puede quitar de PVR
```
Usuario: Coordinador MVL
Etiqueta: "VIP" aplicada por ejecutivo PVR
Resultado: ❌ NO puede remover
Razón: "No tienes permisos para remover esta etiqueta"
```

### Caso 5: Ejecutivo quita su propia etiqueta
```
Usuario: Ejecutivo MVL
Etiqueta: "Seguimiento" aplicada por él mismo
Resultado: ✅ Puede remover
Razón: "Tú aplicaste esta etiqueta"
```

### Caso 6: Ejecutivo NO puede quitar etiqueta de su coordinador
```
Usuario: Ejecutivo MVL
Etiqueta: "VIP" aplicada por su coordinador
Resultado: ❌ NO puede remover
Razón: "No tienes permisos para remover esta etiqueta"
```

---

## 🔧 Implementación Técnica

### Función RPC: `can_remove_label_from_prospecto`

```sql
-- Validación en cascada:
1. Admin/Admin Operativo → RETURN true
2. Coordinador Calidad → RETURN true
3. Mismo usuario → RETURN true
4. Coordinador misma coordinación → RETURN true
5. Resto → RETURN false
```

### Flujo en Frontend

```typescript
// 1. Cargar etiquetas con permisos
const labels = await getProspectoLabels(prospectoId, userId);

// 2. Mostrar botón si can_remove=true
{label.can_remove && (
  <button onClick={handleRemove}>
    <Trash2 />
  </button>
)}

// 3. Remover solo de este prospecto (NO del catálogo)
await removeLabelFromProspecto(prospectoId, labelId, labelType);
```

---

## ✅ Estado Actual

**Probado con**:
- ✅ angelicaguzman (Coordinador Calidad) → Puede remover cualquiera
- ⏳ Pendiente verificar otros roles

**Función RPC**: Correctamente implementada  
**Código**: 'CALIDAD' (no 'CAL')

---

**Versión**: v2.2.3  
**Fecha**: 30 Diciembre 2025

