# Guía de Integración del Sistema de Logging de Errores

## 📋 Descripción General

El sistema de logging de errores críticos permite capturar, clasificar y enviar automáticamente errores críticos a un webhook configurable. El sistema incluye rate limiting para evitar spam de errores repetidos.

## 🚀 Uso Básico

### Importar el servicio

```typescript
import { errorLogService } from '../services/errorLogService';
```

### Ejemplo básico en un servicio

```typescript
try {
  // Tu código aquí
  const result = await someOperation();
  return result;
} catch (error) {
  // Log del error crítico
  errorLogService.logError(error, {
    module: 'nombre-del-modulo',
    component: 'NombreComponente',
    function: 'nombreFuncion',
    severity: 'critical', // 'critical' | 'high' | 'medium' | 'low'
    category: 'api', // 'authentication' | 'api' | 'database' | 'validation' | 'external_service' | 'infrastructure' | 'application'
    details: {
      // Información adicional del error
      operation: 'someOperation',
      params: { /* ... */ }
    }
  }).catch(() => {}); // No queremos que errores de logging afecten el flujo principal
  
  // Continuar con el manejo del error
  throw error;
}
```

## 📝 Ejemplos por Tipo de Módulo

### Servicios (Services)

```typescript
// src/services/miServicio.ts
import { errorLogService } from './errorLogService';

class MiServicio {
  async operacionCritica() {
    try {
      const result = await fetch('/api/endpoint');
      if (!result.ok) throw new Error('API Error');
      return result.json();
    } catch (error) {
      errorLogService.logError(error, {
        module: 'mi-modulo',
        component: 'MiServicio',
        function: 'operacionCritica',
        severity: 'critical',
        category: 'api',
        details: {
          endpoint: '/api/endpoint',
          status: error instanceof Response ? error.status : undefined
        }
      }).catch(() => {});
      throw error;
    }
  }
}
```

### Componentes React

```typescript
// src/components/miComponente/MiComponente.tsx
import { errorLogService } from '../../services/errorLogService';
import { useAuth } from '../../contexts/AuthContext';

const MiComponente: React.FC = () => {
  const { user } = useAuth();
  
  const handleAction = async () => {
    try {
      await realizarAccion();
    } catch (error) {
      errorLogService.logError(error, {
        module: 'mi-modulo',
        component: 'MiComponente',
        function: 'handleAction',
        userId: user?.id,
        userEmail: user?.email,
        userRole: user?.role_name,
        severity: 'high',
        category: 'application',
        details: {
          action: 'handleAction',
          componentState: { /* estado relevante */ }
        }
      }).catch(() => {});
      
      // Mostrar error al usuario
      toast.error('Error al realizar la acción');
    }
  };
  
  return <div>...</div>;
};
```

### Manejo de Errores de Base de Datos

```typescript
try {
  const { data, error } = await supabase
    .from('tabla')
    .select('*');
    
  if (error) throw error;
  return data;
} catch (error) {
  errorLogService.logError(error, {
    module: 'mi-modulo',
    component: 'MiServicio',
    function: 'obtenerDatos',
    severity: 'high',
    category: 'database',
    details: {
      table: 'tabla',
      operation: 'select',
      error_code: (error as any).code,
      error_message: (error as any).message
    }
  }).catch(() => {});
  throw error;
}
```

### Errores de Autenticación

```typescript
try {
  await authenticateUser(credentials);
} catch (error) {
  errorLogService.logError(error, {
    module: 'auth',
    component: 'AuthService',
    function: 'authenticateUser',
    severity: 'critical',
    category: 'authentication',
    details: {
      email: credentials.email,
      error_type: error instanceof Error ? error.constructor.name : 'Unknown'
    }
  }).catch(() => {});
  throw error;
}
```

### Errores de Servicios Externos (VAPI, Twilio, 11Labs, etc.)

```typescript
try {
  const response = await fetch('https://api.externa.com/endpoint');
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
} catch (error) {
  errorLogService.logError(error, {
    module: 'vapi-integration',
    component: 'VapiService',
    function: 'llamarAPI',
    severity: 'high',
    category: 'external_service',
    tags: ['vapi', 'api-error'],
    details: {
      service: 'vapi',
      endpoint: 'https://api.externa.com/endpoint',
      status: error instanceof Response ? error.status : undefined
    }
  }).catch(() => {});
  throw error;
}
```

## 🎯 Categorías de Errores

El sistema clasifica automáticamente los errores, pero puedes especificar la categoría:

- **authentication**: Errores de autenticación, login, permisos
- **api**: Errores de llamadas API, fetch, network
- **database**: Errores de base de datos, queries, conexiones
- **validation**: Errores de validación de datos
- **external_service**: Errores de servicios externos (VAPI, Twilio, etc.)
- **infrastructure**: Errores de infraestructura (AWS, ECS, RDS)
- **application**: Errores generales de la aplicación

## 🔥 Niveles de Severidad

- **critical**: Errores críticos que afectan funcionalidad principal
- **high**: Errores importantes que afectan la experiencia del usuario
- **medium**: Errores moderados que pueden ser manejados
- **low**: Errores menores o warnings

## ⚙️ Configuración

La configuración del sistema de logging se gestiona desde el módulo **Log Server** (solo administradores):

- **Webhook URL**: URL donde se envían los errores
- **Estado**: Activar/desactivar el sistema
- **Rate Limit**: Número máximo de errores antes de pausar (default: 300)
- **Rate Limit Window**: Ventana de tiempo en minutos (default: 1)

## 📊 Estructura de Datos

Todos los errores se envían con la siguiente estructura consistente:

```typescript
{
  error_id: string;           // UUID único del error
  error_type: string;          // Tipo de error
  error_code?: string;         // Código de error si existe
  message: string;             // Mensaje del error
  stack_trace?: string;        // Stack trace completo
  error_details?: object;      // Detalles adicionales
  module: string;              // Módulo donde ocurrió
  component?: string;          // Componente específico
  function?: string;           // Función donde ocurrió
  user_id?: string;            // ID del usuario
  user_email?: string;         // Email del usuario
  user_role?: string;          // Rol del usuario
  environment: string;          // 'development' | 'production' | 'staging'
  browser?: string;            // User agent
  url?: string;               // URL donde ocurrió
  timestamp: string;           // ISO timestamp
  severity: string;            // Nivel de severidad
  session_id?: string;        // ID de sesión
  request_id?: string;         // ID de request
  category: string;            // Categoría del error
  tags?: string[];            // Tags adicionales
}
```

## 🛡️ Rate Limiting

El sistema implementa rate limiting automático:

- Si el mismo error se repite más de **N** veces (configurable) en **M** minutos (configurable), el sistema pausa automáticamente el envío de ese error específico.
- El rate limiting es por tipo de error (basado en `error_type`, `module` y `message`).
- Los contadores se resetean automáticamente después de la ventana de tiempo.

## ✅ Checklist de Integración

Para integrar el logging en un nuevo módulo:

- [ ] Importar `errorLogService` desde `'../services/errorLogService'`
- [ ] Añadir `try-catch` en funciones críticas
- [ ] Llamar a `errorLogService.logError()` con contexto apropiado
- [ ] Especificar `module`, `component`, `function`
- [ ] Especificar `severity` y `category` apropiados
- [ ] Incluir `userId`, `userEmail`, `userRole` si está disponible
- [ ] Añadir `details` con información relevante del error
- [ ] Usar `.catch(() => {})` para evitar que errores de logging afecten el flujo principal

## 🔍 Debugging

Para verificar que el logging funciona:

1. Abre la consola del navegador
2. Busca mensajes que empiecen con `[ErrorLogService]`
3. Verifica que los errores se están enviando al webhook configurado
4. Revisa el módulo **Log Server** para ver la configuración actual

## 📚 Referencias

- Servicio: `src/services/errorLogService.ts`
- Módulo de administración: `src/components/admin/LogServerManager.tsx`
- Script SQL: `scripts/sql/create_log_server_config_table.sql`

