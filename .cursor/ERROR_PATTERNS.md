# Patrones de Errores Comunes

> **Propósito:** Documentar errores que Composer ha cometido para evitar repetirlos.
> **Actualización:** Agregar nuevos errores cuando se detecten.
> **Última actualización:** Enero 2026

---

## Errores de Imports

### 1. Usar Clientes Admin (ELIMINADOS)

```typescript
// ❌ INCORRECTO - Estos clientes ya NO existen
import { supabaseSystemUIAdmin } from '../config/supabaseSystemUI';
import { analysisSupabaseAdmin } from '../config/analysisSupabaseAdmin';

// ✅ CORRECTO - Usar clientes normales
import { supabaseSystemUI } from '../config/supabaseSystemUI';
import { analysisSupabase } from '../config/analysisSupabase';
```

### 2. Rutas de Import Incorrectas

```typescript
// ❌ INCORRECTO - Rutas inventadas
import { algo } from '../supabase';
import { otro } from '../../services';

// ✅ CORRECTO - Rutas reales
import { analysisSupabase } from '../config/analysisSupabase';
import { prospectsService } from '../services/prospectsService';
```

### 3. Importar desde pqncSupabase

```typescript
// ❌ INCORRECTO - Proyecto prohibido
import { pqncSupabase } from '../config/pqncSupabase';

// ✅ CORRECTO - Usar analysisSupabase
import { analysisSupabase } from '../config/analysisSupabase';
```

---

## Errores de Base de Datos

### 1. Usar Tablas/Views Eliminadas

```typescript
// ❌ INCORRECTO - Views/tablas eliminadas
.from('coordinador_coordinaciones')      // VIEW eliminada 2026-01-14
.from('coordinador_coordinaciones_legacy') // Tabla eliminada
.from('auth_user_profiles')              // VIEW eliminada (exponía password_hash)

// ✅ CORRECTO - Tablas actuales
.from('auth_user_coordinaciones')        // Tabla correcta
.from('user_profiles_v2')                // Vista segura
```

### 2. Asumir Columnas que No Existen

```typescript
// ❌ INCORRECTO - Asumir columnas
.select('id, nombre, fecha_creacion')  // fecha_creacion no existe

// ✅ CORRECTO - Verificar schema primero
// Usar MCP: mcp_Supa_PQNC_AI_pqnc_get_table_info({ table: 'prospectos' })
.select('id, nombre, created_at')      // Columnas reales
```

### 3. Usar service_role en Frontend

```typescript
// ❌ INCORRECTO - Expone credenciales
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

// ✅ CORRECTO - Solo anon_key
const anonKey = import.meta.env.VITE_ANALYSIS_SUPABASE_ANON_KEY;
```

---

## Errores de TypeScript

### 1. Usar `any`

```typescript
// ❌ INCORRECTO
const data: any = await fetchData();
function process(item: any) { }

// ✅ CORRECTO
const data: ProspectoType = await fetchData();
function process(item: ProspectoType) { }
```

### 2. No Tipar Props

```typescript
// ❌ INCORRECTO
const MiComponente = ({ id, onClose }) => { }

// ✅ CORRECTO
interface Props {
  id: string;
  onClose: () => void;
}
const MiComponente: React.FC<Props> = ({ id, onClose }) => { }
```

### 3. Ignorar Errores de Tipo

```typescript
// ❌ INCORRECTO
// @ts-ignore
const resultado = funcionConError();

// ✅ CORRECTO - Resolver el error de tipo
const resultado: TipoEsperado = funcionCorrecta();
```

---

## Errores de Estilos

### 1. Crear CSS Custom

```css
/* ❌ INCORRECTO - No crear archivos CSS */
.mi-clase {
  background: blue;
  padding: 16px;
}
```

```typescript
// ✅ CORRECTO - Solo Tailwind
className="bg-blue-500 p-4"
```

### 2. Estilos Inline

```typescript
// ❌ INCORRECTO
style={{ backgroundColor: 'blue', padding: 16 }}

// ✅ CORRECTO
className="bg-blue-500 p-4"
```

### 3. Olvidar Dark Mode

```typescript
// ❌ INCORRECTO - Solo light mode
className="bg-white text-black"

// ✅ CORRECTO - Con dark mode
className="bg-white dark:bg-gray-900 text-black dark:text-white"
```

---

## Errores de Servicios

### 1. Duplicar Servicios Existentes

```typescript
// ❌ INCORRECTO - Crear servicio duplicado
// src/services/newProspectService.ts

// ✅ CORRECTO - Usar servicio existente
import { prospectsService } from '../services/prospectsService';
```

### 2. No Manejar Errores

```typescript
// ❌ INCORRECTO
const { data } = await supabase.from('tabla').select('*');
return data;

// ✅ CORRECTO
const { data, error } = await supabase.from('tabla').select('*');
if (error) throw new Error(`Error: ${error.message}`);
return data || [];
```

### 3. No Usar Servicios de Credenciales

```typescript
// ❌ INCORRECTO - Hardcodear URL/keys
const apiUrl = 'https://api.example.com';
const apiKey = 'mi-api-key';

// ✅ CORRECTO - Usar credentialsService
const credentials = await credentialsService.getCredential('API_NAME', 'API_KEY');
```

---

## Errores de Componentes

### 1. No Manejar Loading

```typescript
// ❌ INCORRECTO
return <div>{data.map(...)}</div>;

// ✅ CORRECTO
if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <EmptyState />;
return <div>{data.map(...)}</div>;
```

### 2. Efectos sin Dependencias

```typescript
// ❌ INCORRECTO - Dependencias faltantes
useEffect(() => {
  fetchData(id);
}, []);

// ✅ CORRECTO
useEffect(() => {
  fetchData(id);
}, [id]);
```

### 3. No Usar useCallback

```typescript
// ❌ INCORRECTO - Función recreada en cada render
const handleClick = () => { doSomething(); };

// ✅ CORRECTO - Memoizada
const handleClick = useCallback(() => {
  doSomething();
}, []);
```

---

## Errores de Deploy/Git

### 1. Push sin Autorización

```bash
# ❌ INCORRECTO - Push automático
git push origin main

# ✅ CORRECTO - Esperar autorización explícita
# "Usuario: haz push"
git push origin main
```

### 2. No Actualizar Documentación

```bash
# ❌ INCORRECTO - Solo código
git commit -m "feat: nueva feature"

# ✅ CORRECTO - Con documentación
# Actualizar CHANGELOG, Footer, DocumentationModule
git commit -m "feat: nueva feature + docs"
```

---

## Cómo Agregar Nuevos Errores

Cuando detectes un error recurrente:

1. Agregar a la sección correspondiente
2. Incluir ejemplo ❌ incorrecto
3. Incluir ejemplo ✅ correcto
4. Actualizar fecha de última actualización

---

## Frecuencia de Errores (Historial)

| Error | Frecuencia | Última Ocurrencia |
|-------|------------|-------------------|
| Usar clientes Admin | Alta → Corregida | Enero 2026 |
| Olvidar dark mode | Media | Enero 2026 |
| No manejar loading | Media | Enero 2026 |
| Imports incorrectos | Baja | Enero 2026 |
