# Convenciones de Código - PQNC QA AI Platform

> Guía rápida de convenciones. Seguir estrictamente.

---

## Nomenclatura

| Tipo | Formato | Ejemplo |
|------|---------|---------|
| Componentes | PascalCase | `UserProfile.tsx` |
| Hooks | camelCase + use | `useProspectos.ts` |
| Servicios | camelCase | `prospectsService.ts` |
| Stores | camelCase + Store | `appStore.ts` |
| Handlers | handle + Acción | `handleSubmit`, `handleClick` |
| Boolean | is/has/can + Estado | `isLoading`, `hasError`, `canEdit` |
| Constantes | UPPER_SNAKE | `MAX_ITEMS`, `API_URL` |

---

## Estructura de Archivos

### Componente React

```typescript
// 1. Imports (orden: react, libs, local)
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { analysisSupabase } from '../config/analysisSupabase';

// 2. Tipos/Interfaces
interface Props {
  id: string;
  onComplete?: () => void;
}

// 3. Componente
export const MiComponente: React.FC<Props> = ({ id, onComplete }) => {
  // 3.1 Estado
  const [loading, setLoading] = useState(true);
  
  // 3.2 Efectos
  useEffect(() => { /* ... */ }, []);
  
  // 3.3 Handlers
  const handleClick = () => { /* ... */ };
  
  // 3.4 Render
  return ( /* JSX */ );
};
```

### Servicio

```typescript
import { analysisSupabase } from '../config/analysisSupabase';

export const miServicio = {
  async obtenerTodos(): Promise<Tipo[]> {
    const { data, error } = await analysisSupabase
      .from('tabla')
      .select('*');
    if (error) throw error;
    return data || [];
  },
};
```

---

## Estilos (Solo Tailwind)

### Contenedores

```typescript
// Fondo principal
className="bg-white dark:bg-gray-900"

// Cards
className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"

// Padding estándar
className="p-4"  // o p-6 para más espacio
```

### Texto

```typescript
// Título
className="text-xl font-bold text-gray-900 dark:text-white"

// Subtítulo
className="text-lg font-semibold text-gray-700 dark:text-gray-300"

// Texto normal
className="text-gray-600 dark:text-gray-400"

// Texto pequeño
className="text-sm text-gray-500 dark:text-gray-400"
```

### Botones

```typescript
// Primario
className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"

// Secundario
className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg"

// Peligro
className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
```

### Inputs

```typescript
className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
```

---

## TypeScript

### Obligatorio:

- Tipar todas las props
- Tipar retornos de funciones
- Tipar estados
- NO usar `any`

### Ejemplo:

```typescript
// ✅ Correcto
const [data, setData] = useState<ProspectoType[]>([]);
const fetchData = async (): Promise<void> => { };

// ❌ Incorrecto
const [data, setData] = useState([]);
const fetchData = async () => { };
```

---

## Imports de Supabase

```typescript
// ✅ Usar SIEMPRE
import { analysisSupabase } from '../config/analysisSupabase';
import { supabaseSystemUI } from '../config/supabaseSystemUI';

// ❌ NUNCA usar
// supabaseSystemUIAdmin (eliminado)
// analysisSupabaseAdmin (eliminado)
// pqncSupabase (prohibido)
```

---

## Manejo de Errores

```typescript
// ✅ Correcto
try {
  const { data, error } = await supabase.from('tabla').select('*');
  if (error) throw error;
  return data;
} catch (err) {
  console.error('Error:', err);
  toast.error('Error al cargar datos');
  return [];
}

// ❌ Incorrecto
const { data } = await supabase.from('tabla').select('*');
return data; // Sin manejo de error
```

---

## Animaciones (Framer Motion)

```typescript
// Fade in
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}

// Slide up
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}

// Exit
exit={{ opacity: 0 }}
```

---

## Commits

```
feat: Nueva funcionalidad
fix: Corrección de bug
refactor: Refactorización
docs: Documentación
style: Estilos (sin lógica)
```

---

## Prohibiciones

1. ❌ Archivos CSS custom
2. ❌ `any` en TypeScript
3. ❌ Clientes `*Admin`
4. ❌ Credenciales hardcodeadas
5. ❌ Push sin autorización
6. ❌ Código mock/prueba
