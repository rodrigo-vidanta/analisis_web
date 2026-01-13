# 🔧 Configuración AWS SDK - PQNC AI Platform

## ✅ SDK Instalado

El AWS SDK ya está instalado con los siguientes paquetes:
- `@aws-sdk/client-ec2` - Gestión de instancias EC2
- `@aws-sdk/client-rds` - Gestión de bases de datos RDS
- `@aws-sdk/client-ecs` - Gestión de contenedores ECS
- `@aws-sdk/client-cloudwatch` - Métricas y monitoreo
- `@aws-sdk/client-route-53` - Gestión DNS
- `@aws-sdk/client-s3` - Almacenamiento S3
- `@aws-sdk/credential-providers` - Proveedores de credenciales

## 🔐 Configuración de Credenciales AWS

### Opción 1: Variables de Entorno (Recomendado)

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Credenciales AWS
AWS_ACCESS_KEY_ID=tu_access_key_id
AWS_SECRET_ACCESS_KEY=tu_secret_access_key
AWS_DEFAULT_REGION=us-west-2
AWS_SESSION_TOKEN=tu_session_token_si_usas_roles_temporales
```

### Opción 2: Archivo de Credenciales AWS

Configura el archivo `~/.aws/credentials`:

```ini
[default]
aws_access_key_id = tu_access_key_id
aws_secret_access_key = tu_secret_access_key
region = us-west-2

[vidanta-ai]
aws_access_key_id = tu_access_key_id
aws_secret_access_key = tu_secret_access_key
region = us-west-2
```

Y el archivo `~/.aws/config`:

```ini
[default]
region = us-west-2
output = json

[profile vidanta-ai]
region = us-west-2
output = json
```

### Opción 3: AWS CLI

Instala y configura AWS CLI:

```bash
# Instalar AWS CLI
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Configurar credenciales
aws configure
```

## 🎯 Recursos AWS Configurados

Según la documentación del proyecto, estos son los recursos que el SDK puede gestionar:

### 🗄️ **PostgreSQL RDS**
- **Identificador**: `n8n-postgres`
- **Clase**: `db.r6g.large`
- **Motor**: PostgreSQL
- **Multi-AZ**: Habilitado
- **Endpoint**: `n8n-postgres.c9memqg6633m.us-west-2.rds.amazonaws.com`

### 🔴 **ElastiCache Redis**
- **Cluster**: `n8n-redis`
- **Tipo**: `cache.r6g.large`
- **Nodos**: 2 (Multi-AZ)
- **Endpoint**: `n8n-redis.7w6q9d.ng.0001.usw2.cache.amazonaws.com`

### 🐳 **ECS Fargate**
- **Cluster**: `n8n-production`
- **Servicio**: `n8n-service`
- **Tareas**: 2/2 Running
- **Auto-scaling**: Habilitado

### 🌐 **VPC Network**
- **VPC ID**: `vpc-05eb3d8651aff5257`
- **CIDR**: `10.0.0.0/16`
- **Subredes**: 4
- **IGW**: Conectado

### 🌍 **Route 53 DNS**
- **Zona**: `Z05991931MBGUXOLH9HO2`
- **Dominio**: `ai.vidanta.com`
- **Health Checks**: Activos

### 🪣 **S3 Storage**
- **Bucket**: `vidanta-ai-assets`
- **Región**: `us-west-2`

## 🚀 Uso del AWS Manager

### 1. **Modo Desarrollo (Sin Credenciales)**
- El sistema detecta automáticamente si no hay credenciales
- Usa datos simulados para desarrollo
- Indicador amarillo: "Datos simulados"

### 2. **Modo Producción (Con Credenciales)**
- Conecta automáticamente con AWS
- Obtiene datos reales de los recursos
- Indicador verde: "Conectado a AWS"

### 3. **Funcionalidades Disponibles**
- ✅ **Resumen**: Estado en tiempo real de todos los recursos
- ✅ **Métricas**: CPU, memoria, latencia, costos
- ✅ **Monitoreo**: CloudWatch dashboards y alarmas
- ✅ **Gestión**: Acceso directo a consolas AWS

## 🔍 Verificación de Configuración

### Verificar Credenciales
```bash
# Con AWS CLI
aws sts get-caller-identity

# En la aplicación
# El AWS Manager mostrará "Conectado a AWS" si las credenciales son válidas
```

### Verificar Recursos
```bash
# Listar instancias RDS
aws rds describe-db-instances --region us-west-2

# Listar clusters ECS
aws ecs list-clusters --region us-west-2

# Listar VPCs
aws ec2 describe-vpcs --region us-west-2
```

## 🛠️ Troubleshooting

### Error: "Credenciales no encontradas"
1. Verifica que las variables de entorno estén configuradas
2. Verifica que el archivo `~/.aws/credentials` existe
3. Usa `aws configure` para configurar credenciales

### Error: "Access Denied"
1. Verifica que las credenciales tengan los permisos necesarios
2. Revisa las políticas IAM asociadas al usuario/rol
3. Verifica que la región sea correcta (`us-west-2`)

### Error: "Region not supported"
1. Asegúrate de usar la región `us-west-2`
2. Verifica que todos los recursos estén en la misma región

## 📊 Políticas IAM Requeridas

Para que el AWS Manager funcione correctamente, el usuario/rol debe tener estas políticas:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeVpcs",
        "rds:DescribeDBInstances",
        "rds:DescribeDBClusters",
        "ecs:ListClusters",
        "ecs:DescribeClusters",
        "ecs:ListServices",
        "ecs:DescribeServices",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics",
        "route53:ListHostedZones",
        "route53:GetHostedZone",
        "s3:ListBuckets",
        "s3:GetBucketLocation"
      ],
      "Resource": "*"
    }
  ]
}
```

## ✅ Estado de Integración

- ✅ AWS SDK instalado y configurado
- ✅ Servicio AWS con todos los clientes necesarios
- ✅ Hooks React para uso reactivo
- ✅ Configuración automática de credenciales
- ✅ Modo desarrollo con datos simulados
- ✅ Integración completa en AWS Manager
- ✅ Manejo de errores y estados de carga
- ✅ Actualización automática de datos

## 🔄 Próximos Pasos

1. **Configurar credenciales AWS reales** (según las opciones arriba)
2. **Verificar acceso a recursos** usando las verificaciones
3. **Probar funcionalidades** en el AWS Manager
4. **Configurar alertas** de CloudWatch si es necesario

¡El AWS Manager está listo para usar con credenciales reales de AWS! 🚀
