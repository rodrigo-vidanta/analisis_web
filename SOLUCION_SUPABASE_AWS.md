# SOLUCIÓN COMPLETA: Supabase en AWS con HTTPS

## Objetivo
Configurar Supabase accesible desde una URL de Amazon con HTTPS funcional.

## Problema Actual
- Studio envía parámetro `pg: "localhost"` o `pg: "db"` (diseñado para Docker Compose)
- pg-meta prioriza parámetro `pg` sobre variables de entorno
- No hay red Docker compartida en ECS Fargate
- ALB sin HTTPS configurado

## Solución Implementada

### 1. Service Discovery de ECS (Cloud Map)

#### Namespace Creado
- **Namespace**: `supabase.internal` (ns-sijoh66lhadtectj)
- **Tipo**: DNS_PRIVATE

#### Servicios Cloud Map Creados
- **db**: srv-gugyzgwtvxxeecsn → Apunta a Aurora PostgreSQL
- **meta**: srv-tt3dujujaspq7nb7 → Apunta a pg-meta service

#### Configuración
```bash
# Namespace
NAMESPACE_ID="ns-sijoh66lhadtectj"

# Servicio db (Aurora)
DB_SERVICE_ID="srv-gugyzgwtvxxeecsn"
AURORA_ENDPOINT="supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com"

# Servicio meta (pg-meta)
META_SERVICE_ID="srv-tt3dujujaspq7nb7"
```

### 2. Actualizar Servicios ECS para Service Discovery

#### pg-meta Service
```bash
aws ecs update-service \
  --cluster supabase-production \
  --service pgmeta \
  --service-registries "registryArn=arn:aws:servicediscovery:us-west-2:307621978585:service/$META_SERVICE_ID,containerName=pgmeta,containerPort=8080" \
  --region us-west-2
```

#### Registrar Aurora en Cloud Map
```bash
AURORA_IP=$(dig +short "$AURORA_ENDPOINT" | head -1)
aws servicediscovery register-instance \
  --service-id "$DB_SERVICE_ID" \
  --instance-id "aurora-1" \
  --attributes "AWS_INSTANCE_IPV4=$AURORA_IP" \
  --region us-west-2
```

### 3. Configurar HTTPS en ALB

#### ALB Principal
- **ALB Name**: `supabase-studio-alb-1499081913`
- **DNS**: `supabase-studio-alb-1499081913.us-west-2.elb.amazonaws.com`

#### Pasos para HTTPS
1. **Obtener/Crear Certificado ACM**
   ```bash
   # Verificar certificados existentes
   aws acm list-certificates --region us-west-2
   
   # O crear nuevo certificado para dominio
   aws acm request-certificate \
     --domain-name "supabase.example.com" \
     --validation-method DNS \
     --region us-west-2
   ```

2. **Crear Listener HTTPS en ALB**
   ```bash
   STUDIO_ALB_ARN="arn:aws:elasticloadbalancing:us-west-2:307621978585:loadbalancer/app/supabase-studio-alb/..."
   CERT_ARN="arn:aws:acm:us-west-2:307621978585:certificate/..."
   
   aws elbv2 create-listener \
     --load-balancer-arn "$STUDIO_ALB_ARN" \
     --protocol HTTPS \
     --port 443 \
     --certificates "CertificateArn=$CERT_ARN" \
     --default-actions "Type=forward,TargetGroupArn=..." \
     --region us-west-2
   ```

3. **Redirigir HTTP a HTTPS**
   ```bash
   # Modificar listener HTTP para redirigir a HTTPS
   HTTP_LISTENER_ARN="..."
   aws elbv2 modify-listener \
     --listener-arn "$HTTP_LISTENER_ARN" \
     --default-actions "Type=redirect,RedirectConfig={Protocol=HTTPS,Port=443,StatusCode=HTTP_301}" \
     --region us-west-2
   ```

### 4. Actualizar Task Definitions

#### pg-meta TD:9
- Agregar variables de entorno para Service Discovery
- Configurar para usar `db.supabase.internal` cuando reciba `pg: "db"`

#### Studio TD:13
- Mantener `STUDIO_PG_META_URL` apuntando a Service Discovery
- Usar `meta.supabase.internal:8080` o IP directa

## Verificación

### 1. Verificar Service Discovery
```bash
# Desde un contenedor ECS
nslookup db.supabase.internal
nslookup meta.supabase.internal
```

### 2. Verificar HTTPS
```bash
curl -I https://supabase-studio-alb-1499081913.us-west-2.elb.amazonaws.com
```

### 3. Verificar Logs
```bash
# pg-meta logs
aws logs tail /ecs/supabase-pgmeta --since 5m --region us-west-2

# Studio logs
aws logs tail /ecs/supabase-studio --since 5m --region us-west-2
```

## Estado Actual

### ✅ Completado
- [x] Namespace Cloud Map creado (supabase.internal)
- [x] Servicios Cloud Map creados (db: srv-gugyzgwtvxxeecsn, meta: srv-tt3dujujaspq7nb7)
- [x] Documentación de solución completa
- [x] Script de implementación HTTPS creado (`scripts/implementar-https-supabase.sh`)

### ⏳ Pendiente
- [ ] Registrar Aurora en Cloud Map (requiere IP válida de Aurora)
- [ ] Actualizar servicio pg-meta con Service Discovery (corregir parámetros)
- [ ] Crear/obtener certificado SSL válido en ACM
- [ ] Configurar listener HTTPS en ALB
- [ ] Actualizar Task Definitions para usar Service Discovery
- [ ] Verificar funcionamiento completo vía HTTPS

## Notas Importantes

### Service Discovery
- El servicio `db` requiere registro manual de Aurora (no es un servicio ECS)
- El servicio `meta` puede auto-registrarse cuando se actualiza el servicio ECS
- Error encontrado: `containerPort` no es necesario en service-registries

### HTTPS
- Los certificados ACM existentes están en estado `FAILED`
- Se necesita crear un certificado válido o usar uno existente
- El script `implementar-https-supabase.sh` facilita la configuración

### Solución Alternativa
Si Service Discovery no funciona completamente, se puede:
1. Usar IPs directas (solución temporal)
2. Configurar `/etc/hosts` en contenedores (requiere init container)
3. Usar un proxy/adaptador que traduzca nombres

## Próximos Pasos

1. **Implementar Service Discovery en servicios ECS**
2. **Configurar certificado SSL en ACM**
3. **Crear listener HTTPS en ALB**
4. **Probar acceso completo vía HTTPS**
5. **Documentar URL final y configuración**

