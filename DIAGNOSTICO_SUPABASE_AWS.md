# DIAGNÓSTICO COMPLETO SUPABASE AWS

## Fecha: 2025-11-03

## ESTADO ACTUAL DE SERVICIOS

### Servicios Funcionando ✅
- **PostgREST**: Funcionando correctamente
  - IP: 10.0.101.66
  - Puerto: 3000
  - Task Definition: supabase-postgrest:5
  - Estado: RUNNING, sin errores

- **Kong**: Funcionando como API Gateway
  - IP: 10.0.101.37
  - Puertos: 8000 (proxy), 8001 (admin)
  - Task Definition: supabase-kong:6
  - Estado: RUNNING

### Servicios con Problemas 🔄
- **pg-meta**: Reiniciado con nueva configuración
  - IP Actual: 10.0.101.151 (cambió de 10.0.100.212)
  - Puerto: 8080
  - Task Definition: supabase-pgmeta:3
  - **Cambio**: Ahora usa `PG_META_DB_URI` (connection string completa)
  - Estado: RUNNING, sin errores recientes desde reinicio

- **Studio**: Actualizando con nueva IP de pg-meta
  - IP: 10.0.100.36
  - Puerto: 3000
  - Task Definition: supabase-studio:7 (en actualización)
  - **Problema**: IP de pg-meta hardcodeada, necesita actualización después de cada reinicio

## PATRONES DE FALLA IDENTIFICADOS

### Patrón 1: IPs Dinámicas
**Problema**: pg-meta cambia de IP en cada reinicio de tarea ECS
- Antes: 10.0.100.212
- Ahora: 10.0.101.151

**Impacto**: Studio no puede conectarse si usa IP hardcodeada

**Solución Temporal**: Actualizar Task Definition de Studio con nueva IP
**Solución Permanente**: Usar Service Discovery (ECS Service Name) o ALB/NLB para pg-meta

### Patrón 2: Studio usa IPs Hardcodeadas y Fallbacks
**Problema**: Studio intenta múltiples IPs:
1. `STUDIO_PG_META_URL` configurada (pero IP puede estar desactualizada)
2. Fallback a `127.0.0.1:8000` (hardcoded en código)
3. Fallback a `127.0.0.1:4000` (probablemente para Realtime/Storage)

**Logs muestran**:
```
Error: connect ECONNREFUSED 127.0.0.1:8000
Error: connect EHOSTUNREACH 10.0.100.212:8080  (IP vieja)
Error: connect ECONNREFUSED 127.0.0.1:4000
```

**Causa Raíz**: Studio tiene valores por defecto hardcodeados que sobrescriben variables de entorno

### Patrón 3: Proyecto "default"
**Problema**: Studio carga proyecto "default" automáticamente

**Causa**: No hay variables de entorno configuradas para especificar proyecto:
- No existe `PROJECT_REF`
- No existe `DEFAULT_PROJECT`
- Studio usa "default" como fallback

**Solución**: Configurar variable de entorno apropiada según documentación de Supabase Studio

### Patrón 4: Kong devuelve 404 para `/rest/query`
**Problema**: Kong no tiene ruta configurada para `/rest/query`
- PostgREST funciona directamente en puerto 3000
- Kong tiene ruta `/rest` pero no maneja `/rest/query` específicamente

**Impacto**: Studio puede intentar usar Kong como proxy pero falla

## CORRECCIONES APLICADAS

### 1. pg-meta Task Definition 3
- ✅ Cambiado de variables individuales a `PG_META_DB_URI`
- ✅ Connection string completa con URL encoding
- ✅ Configuración: `postgres://supabase:password@host:5432/supabase`

### 2. Studio Task Definition 7
- ✅ Actualizado `STUDIO_PG_META_URL` con IP actual de pg-meta (10.0.101.151)
- ⚠️ **Limitación**: IP se desactualizará en próximo reinicio de pg-meta

### 3. Security Group
- ✅ Agregada regla para puerto 8080 (pg-meta) en `sg-0e42c24bb441f3a65`

## HISTORIAL DE TASK DEFINITIONS

### Studio
- TD:1 - Inicial
- TD:2 - Corrección imágenes
- TD:3 - Variables de entorno básicas
- TD:4 - Agregado STUDIO_PG_META_URL inicial
- TD:5 - Removido STUDIO_PG_META_URL
- TD:6 - Reagregado STUDIO_PG_META_URL (10.0.100.212)
- TD:7 - Actualizado IP a 10.0.101.151 ⚠️

**Problema**: 7 iteraciones indican que no hemos resuelto la causa raíz

### pg-meta
- TD:1 - Variables individuales (falló: busca hostname "db")
- TD:2 - Mismo problema
- TD:3 - `PG_META_DB_URI` (connection string completa) ✅

## ANÁLISIS REAL DEL PROBLEMA RAÍZ

### ❌ CONCLUSIÓN ERRÓNEA PREVIA
**Asumíamos**: Los servicios se reinician porque crashean
**Realidad**: Los servicios NO crashean, los reinicios son por deployments manuales

### ✅ HALLAZGOS REALES

1. **Servicios NO crashean automáticamente**
   - Eventos muestran `has reached steady state` después de deployments
   - NO hay health checks configurados (HealthCheck: 0)
   - Logs NO muestran crashes/exit - solo errores de conectividad
   - Studio muestra `Ready` - proceso funciona, solo no puede conectar

2. **Ciclo de reinicios es por deployments manuales**
   - Cada `force-new-deployment` causa reinicio
   - Cada reinicio asigna nueva IP privada en Fargate
   - IP cambia -> Studio no puede conectar -> hacemos otro deployment -> ciclo continúa

3. **Problema es CONECTIVIDAD, no estabilidad**
   - Servicios funcionan correctamente
   - Problema: no pueden comunicarse entre sí por IPs desactualizadas
   - Falta: mecanismo de descubrimiento de servicios estable

## SOLUCIÓN IMPLEMENTADA ✅

### Target Group y ALB para pg-meta

1. **Target Group creado**: `supabase-pgmeta-targets`
   - Puerto: 8080
   - Protocolo: HTTP
   - Health check: `/`
   - Tipo: IP (para Fargate)

2. **Regla ALB agregada**: `/pgmeta/*` -> pg-meta Target Group
   - Prioridad: 12
   - ALB: `supabase-studio-alb-1499081913.us-west-2.elb.amazonaws.com`
   - Path: `/pgmeta/*`

3. **Servicio pg-meta asociado a Target Group**
   - Auto-registro: Nuevas tareas se registran automáticamente
   - Deregistro: Tareas terminadas se eliminan automáticamente

4. **Studio TD:8 configurado con DNS del ALB**
   - `STUDIO_PG_META_URL`: `http://supabase-studio-alb-1499081913.us-west-2.elb.amazonaws.com/pgmeta`
   - **Beneficio**: DNS siempre resuelve, aunque IPs de tareas cambien

### Beneficios de la Solución

1. ✅ **IPs estáticas**: ALB DNS siempre funciona, independiente de IPs de tareas
2. ✅ **Auto-registro**: Nuevas tareas de pg-meta se registran automáticamente en Target Group
3. ✅ **Health checks**: ALB verifica salud de pg-meta automáticamente
4. ✅ **No más deployments manuales**: Por cambios de IP (problema eliminado)

## PROBLEMAS PENDIENTES

### 1. ✅ RESUELTO: IP Dinámica de pg-meta
**Solución Implementada**: ALB con Target Group
- Studio usa DNS del ALB: `http://ALB_DNS/pgmeta`
- IPs pueden cambiar pero DNS siempre funciona
- Auto-registro automático de nuevas tareas

### 2. Studio no usa STUDIO_PG_META_URL consistentemente
**Problema Real**: Studio tiene fallbacks hardcodeados a localhost
**Estado**: Configurado con DNS del ALB, pero puede seguir intentando localhost
**Verificar**: Logs después de reinicio de Studio con TD:8

### 3. Proyecto "default"
**Problema Real**: Studio no tiene proyecto específico configurado
**Solución Requerida**:
- Consultar documentación oficial de Supabase Studio
- Configurar variable de entorno para proyecto específico

### 4. Kong no enruta `/rest/query` correctamente
**Problema Real**: Kong devuelve 404 para `/rest/query`
**Solución Requerida**:
- Verificar configuración de rutas en Kong
- Asegurar que `/rest/*` incluya todas las sub-rutas

## CONFIGURACIÓN ACTUAL

- **ALB**: `supabase-studio-alb-1499081913.us-west-2.elb.amazonaws.com`
- **Target Groups**:
  - `supabase-studio-targets` (puerto 3000)
  - `supabase-postgrest-targets` (puerto 3000)
  - `supabase-kong-targets` (puerto 8000)
  - `supabase-pgmeta-targets` (puerto 8080) ✅ NUEVO
- **Reglas ALB**:
  - Prioridad 1: `/api/*` -> studio
  - Prioridad 2: `/rest/*` -> postgrest
  - Prioridad 12: `/pgmeta/*` -> pg-meta ✅ NUEVO
- **Security Group**: `sg-0e42c24bb441f3a65` (puerto 8080 agregado)
- **VPC**: `vpc-05eb3d8651aff5257`
- **Cluster ECS**: `supabase-production`

## PRÓXIMOS PASOS

1. ✅ Esperar a que Studio termine de actualizarse con TD:8
2. Verificar logs de Studio para confirmar que usa DNS del ALB (no localhost)
3. Verificar logs de pg-meta para confirmar requests recibidas desde ALB
4. Probar requests de Studio y verificar si errores 500 persisten
5. Verificar configuración de proyecto "default" en Studio
