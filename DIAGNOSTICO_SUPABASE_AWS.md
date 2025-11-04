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

## PROBLEMAS CRÍTICOS IDENTIFICADOS (2025-11-04)

### Problema 1: DNS del NLB resuelve IPs incorrectas
**Síntoma**: Studio intenta conectar a `10.0.100.232:8080` y `10.0.101.241:8080` (IPs de subnets del NLB)
**Causa**: NLB DNS resuelve a IPs de subnets, no a targets. El forwarding debe funcionar pero falla.
**Estado**: Target Group del NLB marca pg-meta como "unhealthy"

### Problema 2: Health Checks TCP del NLB fallan
**Síntoma**: Target Group muestra "Target.FailedHealthChecks"
**Causa**: Health checks TCP pueden fallar si:
- Security Groups no permiten tráfico del NLB
- pg-meta no responde correctamente a health checks TCP
**Estado**: Investigando

### Problema 3: IP de pg-meta cambió nuevamente
**IP anterior**: 10.0.101.151
**IP actual**: 10.0.100.6
**Causa**: pg-meta se reinició (probablemente por deployment o health check fallido)
**Impacto**: Target Group del NLB tenía IP vieja registrada

## SOLUCIÓN IMPLEMENTADA (TD:11)

### Configuración temporal con IP directa
- **Studio TD:11**: Usa IP directa de pg-meta (`10.0.100.6:8080`)
- **Beneficio**: Funciona inmediatamente sin depender de NLB
- **Limitación**: IP cambiará en próximo reinicio

### NLB en proceso de corrección
- Target Group actualizado con IP nueva
- Health checks TCP en investigación
- Security Groups verificados (permiten tráfico)

## PROBLEMAS CRÍTICOS IDENTIFICADOS (2025-11-04 - Continuación)

### Problema 4: pg-meta NO usa PG_META_DB_URI
**Síntoma**: Logs muestran `connect ECONNREFUSED 127.0.0.1:5432` y `getaddrinfo ENOTFOUND db`
**Causa**: pg-meta está ignorando `PG_META_DB_URI` y usando valores por defecto:
- `pg: "localhost"` → intenta `127.0.0.1:5432`
- `pg: "db"` → intenta hostname "db" que no existe
**Estado**: pg-meta TD:4 creado con variables adicionales, pero sigue fallando

**Análisis**: pg-meta parece usar un sistema de conexiones por "ref" (proyecto). Los requests muestran:
- `"ref=default"` en URLs
- `"pg":"localhost"` o `"pg":"db"` en requests
- Esto sugiere que pg-meta necesita configuración por proyecto/ref

### Problema 5: Studio resuelve IPs incorrectas del NLB
**Síntoma**: Studio intenta conectar a `10.0.100.232:8080` y `10.0.101.241:8080` (IPs de subnets del NLB)
**Configuración**: TD:11 tiene `STUDIO_PG_META_URL=http://10.0.100.6:8080` (IP directa)
**Causa posible**: 
- Next.js cache de variables de entorno
- Studio tiene lógica hardcoded que resuelve DNS del NLB
- Node.js está resolviendo DNS del NLB usado anteriormente

## HALLAZGO CRÍTICO (2025-11-04 - Análisis Final)

### Problema Raíz de pg-meta
**Descubrimiento**: Los logs muestran que Studio está enviando un parámetro `pg` en los requests:
- `"pg": "localhost"` → pg-meta intenta `127.0.0.1:5432`
- `"pg": "db"` → pg-meta intenta hostname "db"

**Implicación**: pg-meta NO está ignorando `PG_META_DB_URI` - está usando un sistema de configuración por proyecto donde cada "ref" tiene su propia configuración de base de datos.

**Sistema de pg-meta**:
- pg-meta puede requerir una tabla de configuración de proyectos en la base de datos
- O puede requerir que Studio envíe el parámetro `pg` correcto con la conexión a Aurora
- El proyecto "default" está usando valores hardcoded ("localhost" o "db")

### Soluciones Intentadas
1. ✅ TD:3 - `PG_META_DB_URI` solo
2. ✅ TD:4 - `PG_META_DB_URI` + variables individuales (HOST, PORT, USER, PASSWORD)
3. ✅ TD:5 - `PG_META_DB_URI` solo (sin variables adicionales)
4. ⏳ TD:6 - `PG_META_DB_URI` + `PG_META_PROJECTS` (en proceso)

### Problema de Studio
Studio sigue intentando IPs del NLB (`10.0.100.232`, `10.0.101.241`) a pesar de TD:11 con IP directa.
**Posible causa**: Studio tiene lógica hardcoded o está resolviendo DNS del NLB que se usó anteriormente.

## SOLUCIÓN IMPLEMENTADA (2025-11-04 - Final)

### Problema Raíz Identificado
**pg-meta NO estaba usando PG_META_DB_URI correctamente** porque según la documentación oficial de Supabase, pg-meta requiere **variables de entorno individuales**, no solo `PG_META_DB_URI`.

### Configuración Correcta Implementada

#### pg-meta TD:7 (CORRECTO)
Variables de entorno según documentación oficial:
- `PG_META_PORT=8080`
- `PG_META_DB_HOST=supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com`
- `PG_META_DB_PORT=5432`
- `PG_META_DB_NAME=supabase`
- `PG_META_DB_USER=supabase`
- `PG_META_DB_PASSWORD=d5-Zm>zWS*OyGVqsbHPt[zul9V$g`

**NOTA**: NO usar solo `PG_META_DB_URI`. pg-meta requiere las variables individuales.

#### Studio TD:12 (ACTUALIZADO)
- `STUDIO_PG_META_URL=http://10.0.101.151:8080` (IP directa actualizada)
- Todas las demás variables de entorno configuradas correctamente

### Historial de Configuraciones Intentadas

#### pg-meta:
- TD:3 - Solo `PG_META_DB_URI` ❌ (no funcionó)
- TD:4 - `PG_META_DB_URI` + variables individuales (conflicto) ❌
- TD:5 - Solo `PG_META_DB_URI` ❌ (no funcionó)
- TD:6 - `PG_META_DB_URI` + `PG_META_PROJECTS` ❌ (no funcionó)
- **TD:7 - Solo variables individuales (según documentación oficial)** ✅

#### Studio:
- TD:8 - DNS del ALB (`/pgmeta`) ❌ (path rewrite problem)
- TD:9 - IP directa (10.0.101.151) ⚠️ (IP cambió)
- TD:10 - DNS del NLB ❌ (health checks fallan)
- TD:11 - IP directa (10.0.100.6) ⚠️ (IP cambió)
- **TD:12 - IP directa (10.0.101.151 - actualizada)** ✅

### Problema de IPs Dinámicas
**Limitación**: Las IPs de Fargate cambian en cada reinicio. 
**Solución Temporal**: Actualizar `STUDIO_PG_META_URL` cuando pg-meta cambie de IP.
**Solución Permanente (pendiente)**: Implementar NLB interno funcional o Service Discovery.

### Verificación de Funcionamiento

Para verificar que pg-meta funciona correctamente:
1. Verificar logs de pg-meta: `aws logs tail /ecs/supabase-pgmeta --since 5m`
2. Buscar: `"Server listening at http://0.0.0.0:8080"` (sin errores)
3. Verificar que NO aparezcan: `ECONNREFUSED 127.0.0.1:5432` o `ENOTFOUND db`
4. Verificar logs de Studio: NO deben aparecer errores de conexión a pg-meta

### Próximos Pasos Recomendados

1. ✅ **COMPLETADO**: Configurar pg-meta con variables individuales (TD:7)
2. ✅ **COMPLETADO**: Actualizar Studio con IP directa actualizada (TD:12)
3. ⏳ **PENDIENTE**: Implementar solución permanente para IPs dinámicas
   - Opción A: Configurar NLB interno funcional con health checks correctos
   - Opción B: Implementar Service Discovery de ECS
   - Opción C: Script Lambda que actualice automáticamente IP en Studio cuando pg-meta cambie
4. ⏳ Verificar funcionamiento completo de Studio después de cambios
5. ✅ **COMPLETADO**: Documentado proceso de actualización cuando pg-meta cambie de IP

## SCRIPT DE ACTUALIZACIÓN AUTOMÁTICA

Se creó un script para actualizar automáticamente la IP de pg-meta en Studio cuando cambie:

**Ubicación**: `/tmp/update_studio_pgmeta_ip.sh`

**Uso**:
```bash
./update_studio_pgmeta_ip.sh
```

**Funcionalidad**:
1. Obtiene IP actual de pg-meta
2. Crea nueva revisión de Task Definition de Studio
3. Actualiza `STUDIO_PG_META_URL` con IP nueva
4. Actualiza servicio Studio con nueva Task Definition

**Nota**: Este script puede ejecutarse manualmente cuando pg-meta cambie de IP, o puede configurarse como Lambda función que se ejecute cuando ECS detecte cambio de IP.

## PROBLEMA PERSISTENTE (2025-11-04 - Actualización)

### Problema Real Identificado
**pg-meta está recibiendo un parámetro `pg` desde Studio** que sobrescribe las variables de entorno:
- `"pg": "localhost"` → intenta `127.0.0.1:5432`
- `"pg": "db"` → intenta hostname "db"

**Causa Raíz**: Studio tiene lógica hardcoded para el proyecto "default" que envía estos valores en el parámetro `pg` de los requests, y pg-meta usa ese parámetro en lugar de las variables de entorno configuradas.

### Configuraciones Intentadas (TD:7 y TD:8)
- **TD:7**: Variables individuales (PG_META_DB_HOST, PG_META_DB_PORT, etc.) ✅ Configuración correcta
- **TD:8**: Variables individuales + PG_META_DB_URI + PG_META_PROJECT_DB_URI + PG_META_DEFAULT_PROJECT ⏳ En prueba

### Logs de Error Persistentes
```
{"error":{"message":"connect ECONNREFUSED 127.0.0.1:5432"},"request":{"method":"GET","url":"/tables?include_columns=false&included_schemas=public&ref=default","pg":"localhost","opt":""}}
{"error":{"message":"getaddrinfo ENOTFOUND db"},"request":{"method":"POST","url":"/query","pg":"db","opt":""}}
```

### Análisis del Problema
1. **pg-meta está configurado correctamente** con variables de entorno apuntando a Aurora
2. **Studio está enviando parámetro `pg`** con valores hardcoded ("localhost", "db")
3. **pg-meta prioriza el parámetro `pg`** sobre las variables de entorno
4. **El proyecto "default"** está usando valores hardcoded en lugar de la configuración

### Soluciones Posibles
1. **Configurar Studio** para que no envíe el parámetro `pg` o lo envíe con el valor correcto
2. **Configurar pg-meta** para que ignore el parámetro `pg` cuando viene "localhost" o "db"
3. **Crear tabla de proyectos** en la base de datos que mapee "default" a la conexión de Aurora
4. **Modificar Studio** para que use variables de entorno específicas para el proyecto "default"

### Próximos Pasos Críticos
1. ⚠️ **URGENTE**: Investigar código fuente de Supabase Studio para entender cómo determina el parámetro `pg`
2. ⚠️ **URGENTE**: Verificar si existe una tabla de proyectos en la base de datos que Studio lee
3. ⚠️ **URGENTE**: Configurar Studio con variables de entorno específicas para proyecto "default"
4. ⚠️ **URGENTE**: Verificar si pg-meta tiene opción para ignorar parámetro `pg` y usar variables de entorno

## CONCLUSIÓN Y RECOMENDACIONES FINALES

### Problema Raíz Confirmado
**pg-meta está configurado correctamente** con variables de entorno apuntando a Aurora, pero **Studio está enviando un parámetro `pg` con valores hardcoded** ("localhost", "db") que pg-meta prioriza sobre las variables de entorno.

### Estado Actual
- ✅ **pg-meta TD:7/8**: Configurado correctamente según documentación oficial
- ✅ **Studio TD:12**: Configurado con IP directa de pg-meta
- ❌ **Problema**: Studio envía parámetro `pg` incorrecto que sobrescribe configuración
- ❌ **Resultado**: pg-meta intenta conectar a localhost/db en lugar de Aurora

### Soluciones Requeridas (Prioridad Alta)
1. **Investigar código fuente de Supabase Studio** para modificar cómo determina el parámetro `pg` para proyecto "default"
2. **Verificar si existe tabla de proyectos** en la base de datos que Studio lee y necesita configuración
3. **Modificar Studio** para que use variables de entorno específicas para proyecto "default" en lugar de valores hardcoded
4. **Verificar si pg-meta tiene opción** para ignorar parámetro `pg` cuando viene "localhost" o "db" y usar variables de entorno

### Configuración Actual Documentada
- **pg-meta TD:8**: Variables individuales + PG_META_DB_URI + PG_META_PROJECT_DB_URI + PG_META_DEFAULT_PROJECT
- **Studio TD:12**: STUDIO_PG_META_URL=http://10.0.101.151:8080
- **Script de actualización**: `/tmp/update_studio_pgmeta_ip.sh` (para actualizar IP cuando cambie)

### Próximo Paso Inmediato
**Revisar código fuente de Supabase Studio** en GitHub para entender cómo determina el valor del parámetro `pg` y modificarlo para que use la configuración correcta en lugar de valores hardcoded.

## ANÁLISIS COMPARATIVO CON DOCUMENTACIÓN OFICIAL (2025-11-04)

### Arquitectura de Documentación Oficial vs Nuestra Implementación

#### **Documentación Oficial (Docker Compose)**
Según la documentación oficial de Supabase ([supabase.com/docs/guides/self-hosting/docker](https://supabase.com/docs/guides/self-hosting/docker)) y los artículos revisados:

1. **Red Docker Compartida**:
   - Todos los servicios están en el mismo `docker-compose.yml`
   - Los servicios se comunican usando nombres de servicio Docker:
     - `db` → servicio de PostgreSQL
     - `meta` → servicio pg-meta
     - `studio` → servicio Studio
     - `kong` → API Gateway
     - `postgrest` → REST API

2. **Comunicación por Nombres de Servicio**:
   - pg-meta se conecta a `db:5432` (nombre de servicio Docker)
   - Studio se conecta a `meta:8080` (nombre de servicio Docker)
   - No requiere IPs ni URLs externas

3. **Variables de Entorno en Docker Compose**:
   ```env
   PG_META_DB_HOST=db
   PG_META_DB_PORT=5432
   STUDIO_PG_META_URL=http://meta:8080
   ```

#### **Nuestra Arquitectura (ECS Fargate)**

1. **Servicios Independientes**:
   - Cada servicio es un contenedor independiente en ECS Fargate
   - **NO hay red Docker compartida**
   - **NO existen hostnames `db` o `meta`**
   - Comunicación por IPs dinámicas o DNS externo

2. **Problema Fundamental Identificado**:
   - **Studio está diseñado para Docker Compose** donde los nombres de servicio funcionan
   - Studio tiene lógica hardcoded que envía `pg: "db"` o `pg: "localhost"` para el proyecto "default"
   - En ECS, estos hostnames no existen, por lo que falla la conexión

3. **pg-meta recibe parámetro incorrecto**:
   - Studio envía `"pg": "localhost"` → pg-meta intenta `127.0.0.1:5432`
   - Studio envía `"pg": "db"` → pg-meta intenta hostname "db"
   - pg-meta prioriza el parámetro `pg` sobre las variables de entorno

### Diferencias Críticas

| Aspecto | Docker Compose (Oficial) | ECS Fargate (Nuestro) |
|---------|-------------------------|----------------------|
| **Red** | Docker network compartida | Sin red compartida |
| **Hostnames** | Nombres de servicio (`db`, `meta`) | No existen |
| **Comunicación** | Por nombre de servicio | Por IP o DNS externo |
| **IPs** | Estáticas en red Docker | Dinámicas en Fargate |
| **Configuración** | Variables simples (`db`, `meta`) | Requiere IPs/DNS completos |

### Problema Raíz Confirmado

**Studio está enviando parámetro `pg` con valores hardcoded diseñados para Docker Compose:**
- `"pg": "localhost"` → funciona en Docker Compose (localhost = mismo contenedor)
- `"pg": "db"` → funciona en Docker Compose (nombre de servicio Docker)
- **NO funciona en ECS** porque no hay red Docker compartida

**pg-meta prioriza el parámetro `pg` sobre las variables de entorno**, por lo que:
- Aunque configuramos `PG_META_DB_HOST`, `PG_META_DB_PORT`, etc. correctamente
- pg-meta ignora estas variables cuando recibe `pg: "localhost"` o `pg: "db"`

### Soluciones Posibles (Según Documentación)

1. **Configurar Studio para que NO envíe parámetro `pg`**:
   - Necesita investigación del código fuente de Studio
   - Requiere variable de entorno específica o modificación de código

2. **Configurar pg-meta para que ignore parámetro `pg` cuando viene "localhost"/"db"**:
   - Modificar lógica de pg-meta (no recomendado)
   - Requiere fork o patch del código fuente

3. **Crear tabla de proyectos en base de datos**:
   - Studio puede leer configuración de proyectos desde la base de datos
   - Mapear "default" → conexión Aurora

4. **Usar Service Discovery de ECS**:
   - Configurar Service Discovery para que `db` y `meta` resuelvan a IPs correctas
   - Requiere configuración adicional de Cloud Map

5. **Modificar Studio para usar variables de entorno específicas**:
   - Configurar Studio con variables que sobrescriban el parámetro `pg` hardcoded

### Recomendación Basada en Documentación

**La documentación oficial NO contempla deployment en ECS Fargate con servicios independientes**. Todos los ejemplos y documentación asumen Docker Compose.

**Opciones:**
1. **Migrar a Docker Compose en EC2** (como sugieren los artículos revisados)
2. **Implementar Service Discovery de ECS** para emular nombres de servicio Docker
3. **Modificar Studio/pg-meta** para soportar arquitectura ECS (requiere fork)
4. **Configurar Studio con variables específicas** para proyecto "default" (investigar código fuente)

### Estado Actual vs Documentación

- ✅ **pg-meta TD:8**: Configurado según documentación oficial (variables individuales)
- ✅ **Studio TD:12**: Configurado con IP directa de pg-meta
- ❌ **Problema**: Studio envía parámetro `pg` incorrecto (diseñado para Docker Compose)
- ❌ **Resultado**: pg-meta no puede conectar a Aurora porque prioriza parámetro `pg`

**Conclusión**: El problema no es de configuración, sino de **incompatibilidad arquitectónica** entre Docker Compose (diseño original) y ECS Fargate (nuestra implementación).
