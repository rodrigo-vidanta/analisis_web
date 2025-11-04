# 🚀 Despliegue de Supabase en AWS

Este directorio contiene todos los archivos necesarios para desplegar Supabase completo en AWS, en la misma VPC donde está ejecutándose N8N.

## 📋 Descripción General

El despliegue incluye:
- **Aurora Serverless v2** para PostgreSQL
- **ECS Fargate** para servicios de Supabase (API Gateway, Auth, Storage)
- **Application Load Balancer** para enrutamiento
- **S3** para almacenamiento de archivos
- **CloudWatch** para logs y monitoreo
- **Amplify** para Supabase Studio (opcional)

## 🗂️ Archivos Incluidos

```
AWS_Project/
├── supabase-cloudformation-template.yaml    # Template principal de CloudFormation
├── supabase-studio-amplify.yaml            # Template para Supabase Studio
├── deploy-supabase.sh                       # Script de despliegue básico
├── deploy-supabase-complete.sh              # Script de despliegue completo
├── verify-supabase-deployment.sh            # Script de verificación
└── SUPABASE_DEPLOYMENT_README.md           # Este archivo
```

## 🛠️ Prerrequisitos

1. **AWS CLI configurado** con credenciales válidas
2. **Permisos IAM** necesarios (ver sección de permisos)
3. **VPC existente** con N8N (vpc-05eb3d8651aff5257)
4. **Subnets configuradas** (públicas y privadas)

### Permisos IAM Requeridos

El usuario/rol debe tener los siguientes permisos:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cloudformation:*",
                "ecs:*",
                "ec2:*",
                "rds:*",
                "s3:*",
                "iam:*",
                "logs:*",
                "elasticloadbalancing:*",
                "secretsmanager:*",
                "amplify:*"
            ],
            "Resource": "*"
        }
    ]
}
```

## 🚀 Despliegue Rápido

### Opción 1: Despliegue Completo (Recomendado)

```bash
cd AWS_Project
./deploy-supabase-complete.sh
```

Este script:
1. ✅ Despliega la infraestructura principal
2. ✅ Configura la base de datos
3. ✅ Verifica los servicios ECS
4. ✅ Prueba la conectividad
5. ✅ Opcionalmente despliega Studio
6. ✅ Genera configuración para N8N

### Opción 2: Despliegue Manual Paso a Paso

```bash
# 1. Desplegar infraestructura principal
./deploy-supabase.sh

# 2. Verificar el despliegue
./verify-supabase-deployment.sh

# 3. (Opcional) Desplegar Studio
aws cloudformation create-stack \
  --stack-name supabase-studio \
  --template-body file://supabase-studio-amplify.yaml \
  --parameters ParameterKey=SupabaseAPIEndpoint,ParameterValue=http://your-alb-url \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-west-2
```

## 🔧 Configuración

### Variables Principales

Puedes modificar estas variables en los scripts:

```bash
# En deploy-supabase.sh
STACK_NAME="supabase-production"
REGION="us-west-2"
VPC_ID="vpc-05eb3d8651aff5257"
PUBLIC_SUBNETS="subnet-08cd621531e2cf558,subnet-0dbc023b0c2cf85b2"
PRIVATE_SUBNETS="subnet-0a6923caf8d8074b1,subnet-0253cc70d618537c4"
DATABASE_SUBNETS="subnet-05caa36c0d56f6e13,subnet-0a8537f7b2e058dd9"
```

### Tamaños de Instancia

El template soporta diferentes tamaños de tareas Fargate:

| Tamaño  | vCPU  | Memoria |
|---------|-------|---------|
| micro   | 256   | 512 MB  |
| small   | 512   | 1 GB    |
| medium  | 1024  | 2 GB    |
| large   | 2048  | 4 GB    |
| xlarge  | 4096  | 8 GB    |

## 📊 Arquitectura Desplegada

```
Internet Gateway
       ↓
Application Load Balancer (Subnets Públicas)
       ↓
ECS Fargate Services (Subnets Privadas)
├── Kong API Gateway
├── GoTrue Auth Service  
├── Storage Service
└── PostgREST API
       ↓
Aurora Serverless v2 (Subnets de DB)
```

## 🔗 Integración con N8N

Después del despliegue, encontrarás un archivo `supabase-n8n-config.txt` con:

```
🌐 URL de Supabase: http://your-alb-url
🔑 Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
🔐 Service Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Configurar en N8N

1. Ir a **Credentials** en N8N
2. Crear nueva credencial **Supabase**
3. Usar la URL y las claves del archivo de configuración
4. Probar la conexión

### Endpoints Disponibles

- **REST API**: `http://your-alb-url/rest/v1/`
- **Auth**: `http://your-alb-url/auth/v1/`
- **Storage**: `http://your-alb-url/storage/v1/`
- **Realtime**: `http://your-alb-url/realtime/v1/`

## 🔍 Verificación y Monitoreo

### Verificar Despliegue

```bash
./verify-supabase-deployment.sh
```

### Comandos Útiles

```bash
# Ver servicios ECS
aws ecs list-services --cluster supabase-cluster --region us-west-2

# Ver logs en tiempo real
aws logs tail /ecs/supabase-api --region us-west-2 --follow

# Estado del stack
aws cloudformation describe-stacks --stack-name supabase-production --region us-west-2

# Reiniciar servicio
aws ecs update-service --cluster supabase-cluster --service supabase-api --force-new-deployment --region us-west-2
```

### Métricas en CloudWatch

Los logs están organizados en estos grupos:
- `/ecs/supabase-api` - API Gateway (Kong)
- `/ecs/supabase-auth` - Servicio de autenticación
- `/ecs/supabase-storage` - Servicio de almacenamiento

## 💰 Estimación de Costos

**Costo mensual estimado**: ~$200-400 USD

Desglose:
- **ECS Fargate**: ~$150-250 (dependiendo del tamaño de tareas)
- **Aurora Serverless v2**: ~$50-100 (según uso)
- **Application Load Balancer**: ~$20
- **S3**: ~$5-10
- **CloudWatch Logs**: ~$5-10

## 🔧 Troubleshooting

### Problema: Servicios no inician

```bash
# Ver logs del servicio
aws ecs describe-services --cluster supabase-cluster --services supabase-api --region us-west-2

# Ver logs de las tareas
aws logs filter-log-events --log-group-name /ecs/supabase-api --region us-west-2 --start-time $(date -d '1 hour ago' +%s)000
```

### Problema: Base de datos no conecta

```bash
# Verificar estado del cluster Aurora
aws rds describe-db-clusters --region us-west-2

# Verificar security groups
aws ec2 describe-security-groups --group-names supabase-db-sg --region us-west-2
```

### Problema: Load Balancer no responde

```bash
# Verificar health checks
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:us-west-2:account:targetgroup/supabase-api-tg/id
```

## 🗑️ Limpieza

Para eliminar todos los recursos:

```bash
# Eliminar stack principal
aws cloudformation delete-stack --stack-name supabase-production --region us-west-2

# Eliminar stack de Studio (si existe)
aws cloudformation delete-stack --stack-name supabase-studio --region us-west-2

# Vaciar bucket S3 antes de eliminar
aws s3 rm s3://supabase-storage-account-region --recursive
```

## 📚 Referencias

- [Supabase Self-Hosting Guide](https://supabase.com/docs/guides/self-hosting)
- [Supabase on AWS Community Project](https://github.com/supabase-community/supabase-on-aws)
- [AWS ECS Fargate Documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)
- [Aurora Serverless v2 Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html)

## 🤝 Soporte

Para problemas específicos:

1. **Revisar logs**: `./verify-supabase-deployment.sh`
2. **Verificar configuración**: Revisar archivos de configuración generados
3. **Consultar documentación**: Enlaces en la sección Referencias
4. **AWS Support**: Para problemas de infraestructura AWS

---

**🎉 ¡Supabase está listo para usar con N8N en tu VPC!**
