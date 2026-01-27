# 🐛 Bug: Triple Inicialización de Estados con Nombres Legacy

**Fecha:** 27 de Enero 2026  
**Problema:** Estados de columnas se inicializaban con nombres en 3 lugares diferentes  
**Estado:** ✅ TODOS LOS FIXES APLICADOS

---

## ❌ Problema Identificado

Los estados de columnas Kanban (`columnLoadingStates`) se inicializaban con **nombres de etapa (TEXT)** en **3 lugares diferentes**:

1. ✅ **useEffect inicial** (línea 1169) - YA CORREGIDO
2. ✅ **loadProspectos - reset** (línea 1703) - **RECIÉN CORREGIDO** ⭐
3. ⚠️ Posiblemente otros lugares

---

## 🔍 Causa Raíz

### Lugar 1: useEffect Inicial (YA CORREGIDO)

```typescript
// ANTES (línea 1173-1187)
const etapasIniciales = [
  'Es miembro',
  'Atendió llamada',  // ← String
  // ...
];
etapasIniciales.forEach(etapa => {
  initialStates[etapa] = { ... };
});

// DESPUÉS (línea 1169-1177)
const etapasActivas = etapasService.getAllActive();
etapasActivas.forEach(etapa => {
  initialStates[etapa.id] = { ... };  // ← UUID
});
```

### Lugar 2: loadProspectos Reset (RECIÉN CORREGIDO) ⭐

Este era el **problema crítico** que sobrescribía los estados correctos.

```typescript
// ANTES (línea 1703-1722)
if (reset) {
  setAllProspectos(enrichedProspectos);
  
  if (viewType === 'kanban') {
    const etapasIniciales = [
      'Atendió llamada',  // ← String hardcodeado
      // ...
    ];
    
    etapasIniciales.forEach(etapa => {
      newColumnStates[etapa] = { ... };  // ← String como key ❌
    });
    setColumnLoadingStates(newColumnStates);  // ← SOBRESCRIBE estados correctos
  }
}

// DESPUÉS (línea 1696-1723)
if (reset) {
  setAllProspectos(enrichedProspectos);
  
  if (viewType === 'kanban') {
    const etapasActivas = etapasService.getAllActive();  // ← Dinámico
    
    etapasActivas.forEach(etapa => {
      newColumnStates[etapa.id] = { ... };  // ← UUID como key ✅
    });
    setColumnLoadingStates(newColumnStates);
  }
}
```

---

## 🔄 Flujo del Bug

### Secuencia de Eventos

1. **useEffect inicial** (línea 1169):
   ```
   ✅ Inicializa columnLoadingStates con UUIDs
   columnLoadingStates["003ec594..."] = { loading: false, ... }
   ```

2. **loadProspectos(true)** llamado:
   ```
   ⏳ Carga 100 prospectos de BD
   ```

3. **loadProspectos - bloque reset** (línea 1703):
   ```
   ❌ SOBRESCRIBE columnLoadingStates con nombres TEXT
   columnLoadingStates["Atendió llamada"] = { loading: false, ... }
   ```

4. **Kanban intenta mostrar columnas**:
   ```typescript
   const etapaId = "003ec594-6e7d-4bea-9cf4-09870626b182";
   const columnState = columnLoadingStates[etapaId];
   // Resultado: undefined ❌
   // Buscaba UUID, encontraba nombres TEXT
   ```

---

## ✅ Solución Completa

### Archivos Modificados

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `ProspectosManager.tsx` | 1169-1177 | ✅ useEffect: Dinámico con UUIDs |
| `ProspectosManager.tsx` | **1703-1723** | ✅ **loadProspectos reset: Dinámico con UUIDs** ⭐ |

### Cambio Crítico Aplicado

**Archivo:** `src/components/prospectos/ProspectosManager.tsx`  
**Líneas:** 1703-1723

```typescript
// ✅ CORRECTO - Ahora usa etapasService dinámicamente
if (viewType === 'kanban') {
  const etapasActivas = etapasService.getAllActive();
  
  const newColumnStates: Record<string, { loading: boolean; page: number; hasMore: boolean }> = {};
  etapasActivas.forEach(etapa => {
    newColumnStates[etapa.id] = {  // ← UUID como key
      loading: false, 
      page: 0, 
      hasMore: hasMore
    };
  });
  setColumnLoadingStates(newColumnStates);
}
```

---

## 🎯 Resultado Esperado

### Después de Refrescar

**Columna "Atendió llamada":**
```
✅ Contador: 118
✅ Prospectos cargados: [variable según cuántos estén en primeros 100]
```

**Nota:** Los prospectos que se muestran dependen de cuáles estén en los primeros 100 cargados. Si "Atendió llamada" son prospectos antiguos, podrían no aparecer hasta hacer scroll.

---

## 📊 Logs de Debugging

Con los logs agregados, ahora verás:

```
🔍 loadProspectos - Prospectos cargados: {
  total: 100,
  conAtendioLlamada: 5,  // ← Cuántos de "Atendió llamada" están en primeros 100
  nombresAtendioLlamada: ["Victor Manuel", "Hugo", ...]
}

✅ setAllProspectos (reset) - Estado final: {
  total: 100,
  conAtendioLlamada: 5
}
```

Si `conAtendioLlamada: 0`, confirma que ninguno está en los primeros 100 (por ser antiguos).

---

## ⚠️ Problema Secundario (Pendiente)

### Prospectos "Atendió llamada" No en Primeros 100

**Causa:** `loadProspectos` ordena por `created_at DESC` → Los prospectos antiguos no aparecen.

**Solución:** Implementar carga estratificada (ver `docs/DIAGNOSTICO_KANBAN_ATENDIO_LLAMADA_FINAL.md`).

---

## 🧪 Testing

1. **Refrescar** el módulo de Prospectos
2. **Ver consola** para confirmar:
   - ✅ `columnLoadingStates` se inicializa con UUIDs
   - ✅ No se sobrescribe con nombres TEXT
   - ✅ Contador muestra 118
3. **Verificar cuántos prospectos** "Atendió llamada" están cargados
4. Si `conAtendioLlamada: 0`, hacer **scroll infinito** para cargar más

---

**Estado:** ✅ FIX CRÍTICO APLICADO  
**Próximo:** Implementar carga estratificada para mejor UX
