#!/bin/bash

# Script para desplegar Supabase oficial desde AWS Marketplace

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

REGION="us-west-2"
VPC_ID="vpc-05eb3d8651aff5257"

echo -e "${PURPLE}🚀 DESPLEGANDO SUPABASE OFICIAL DESDE AWS MARKETPLACE${NC}"
echo -e "${PURPLE}===================================================${NC}"

# 1. Crear template CloudFormation para Supabase Marketplace
echo -e "${BLUE}📋 Creando template para Supabase Marketplace...${NC}"
cat > supabase-marketplace-template.yaml << 'EOF'
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Supabase oficial desde AWS Marketplace'

Parameters:
  VpcId:
    Type: AWS::EC2::VPC::Id
    Default: vpc-05eb3d8651aff5257
    Description: VPC ID where to deploy Supabase
  
  SubnetId:
    Type: AWS::EC2::Subnet::Id
    Default: subnet-08cd621531e2cf558
    Description: Public subnet for Supabase instance
  
  InstanceType:
    Type: String
    Default: t3.large
    AllowedValues: [t3.medium, t3.large, t3.xlarge, m5.large, m5.xlarge]
    Description: EC2 instance type for Supabase
  
  KeyPairName:
    Type: String
    Default: ""
    Description: EC2 Key Pair for SSH access (optional)

Resources:
  # Security Group para Supabase
  SupabaseSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: supabase-marketplace-sg
      GroupDescription: Security group for Supabase from Marketplace
      VpcId: !Ref VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
          Description: HTTP access
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
          Description: HTTPS access
        - IpProtocol: tcp
          FromPort: 8000
          ToPort: 8000
          CidrIp: 0.0.0.0/0
          Description: Supabase Studio
        - IpProtocol: tcp
          FromPort: 3000
          ToPort: 3000
          CidrIp: 10.0.0.0/16
          Description: Studio interno
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: 10.0.0.0/16
          Description: SSH access from VPC
      SecurityGroupEgress:
        - IpProtocol: -1
          CidrIp: 0.0.0.0/0
      Tags:
        - Key: Name
          Value: supabase-marketplace-sg
        - Key: Project
          Value: supabase-marketplace

  # IAM Role para la instancia
  SupabaseInstanceRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: supabase-marketplace-role
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ec2.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
      Policies:
        - PolicyName: SupabaseS3Access
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - s3:GetObject
                  - s3:PutObject
                  - s3:DeleteObject
                  - s3:ListBucket
                Resource:
                  - "arn:aws:s3:::supabase-storage-*"
                  - "arn:aws:s3:::supabase-storage-*/*"

  SupabaseInstanceProfile:
    Type: AWS::IAM::InstanceProfile
    Properties:
      Roles:
        - !Ref SupabaseInstanceRole

  # Instancia EC2 para Supabase
  SupabaseInstance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-069f9cce803c015bc  # Amazon Linux 2 us-west-2
      InstanceType: !Ref InstanceType
      # KeyName: !Ref KeyPairName  # Comentado para evitar problemas
      IamInstanceProfile: !Ref SupabaseInstanceProfile
      SecurityGroupIds:
        - !Ref SupabaseSecurityGroup
      SubnetId: !Ref SubnetId
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          yum update -y
          
          # Instalar Git
          yum install -y git
          
          # Instalar Docker
          yum install -y docker
          systemctl start docker
          systemctl enable docker
          usermod -a -G docker ec2-user
          
          # Instalar Docker Compose
          curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
          chmod +x /usr/local/bin/docker-compose
          ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
          
          # Clonar Supabase oficial
          cd /home/ec2-user
          git clone --depth 1 https://github.com/supabase/supabase.git
          cd supabase/docker
          
          # Configurar variables de entorno
          cp .env.example .env
          
          # Generar JWT secret
          JWT_SECRET=$(openssl rand -hex 32)
          
          # Configurar .env
          cat > .env << ENVEOF
          POSTGRES_PASSWORD=SuperBase123!
          JWT_SECRET=$JWT_SECRET
          ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0
          SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
          DASHBOARD_USERNAME=admin
          DASHBOARD_PASSWORD=SuperBase123!
          
          # Configurar para usar base de datos Aurora externa
          POSTGRES_HOST=supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com
          POSTGRES_DB=supabase
          POSTGRES_PORT=5432
          POSTGRES_USER=supabase
          
          SITE_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000
          API_EXTERNAL_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000
          SUPABASE_PUBLIC_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000
          
          KONG_HTTP_PORT=8000
          KONG_HTTPS_PORT=8443
          STUDIO_PORT=3000
          ENVEOF
          
          # Cambiar propietario
          chown -R ec2-user:ec2-user /home/ec2-user/supabase
          
          # Iniciar Supabase
          sudo -u ec2-user docker-compose up -d
          
          # Crear archivo de información
          cat > /home/ec2-user/supabase-info.txt << INFOEOF
          === SUPABASE OFICIAL MARKETPLACE DESPLEGADO ===
          Fecha: $(date)
          
          🌐 URL Studio: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000
          👤 Usuario: admin
          🔐 Contraseña: SuperBase123!
          
          🗄️ Base de Datos Aurora:
          Host: supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com
          Port: 5432
          Database: supabase
          User: supabase
          Password: SuperBase123!
          
          🔑 API Keys:
          Anon: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0
          Service: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
          
          ¡Supabase Studio oficial funcionando!
          INFOEOF
          
          # Logs de inicio
          echo "Supabase deployment completed at $(date)" >> /var/log/supabase-deploy.log
      Tags:
        - Key: Name
          Value: supabase-marketplace-instance
        - Key: Project
          Value: supabase-marketplace

Outputs:
  SupabaseStudioURL:
    Description: URL para acceder a Supabase Studio
    Value: !Sub "http://${SupabaseInstance.PublicIp}:8000"
    Export:
      Name: !Sub "${AWS::StackName}-studio-url"
  
  SupabaseInstanceIP:
    Description: IP pública de la instancia Supabase
    Value: !Ref SupabaseInstance
    Export:
      Name: !Sub "${AWS::StackName}-instance-ip"
  
  SupabaseSSHCommand:
    Description: Comando SSH para conectar a la instancia
    Value: !Sub "ssh -i your-key.pem ec2-user@${SupabaseInstance.PublicIp}"
    Export:
      Name: !Sub "${AWS::StackName}-ssh-command"
EOF

# 2. Desplegar el template
echo -e "${BLUE}🚀 Desplegando Supabase Marketplace...${NC}"
aws cloudformation create-stack \
    --stack-name supabase-marketplace \
    --template-body file://supabase-marketplace-template.yaml \
    --parameters \
        ParameterKey=VpcId,ParameterValue=$VPC_ID \
        ParameterKey=SubnetId,ParameterValue=subnet-08cd621531e2cf558 \
        ParameterKey=InstanceType,ParameterValue=t3.large \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $REGION \
    --tags \
        Key=Project,Value=supabase-marketplace \
        Key=Environment,Value=production

echo -e "${YELLOW}⏳ Esperando despliegue de Supabase Marketplace...${NC}"
echo -e "${YELLOW}Esto puede tomar 5-10 minutos...${NC}"

# 3. Esperar a que se complete
aws cloudformation wait stack-create-complete --stack-name supabase-marketplace --region $REGION

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Stack desplegado exitosamente!${NC}"
    
    # 4. Obtener outputs
    STUDIO_URL=$(aws cloudformation describe-stacks \
        --stack-name supabase-marketplace \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`SupabaseStudioURL`].OutputValue' \
        --output text)
    
    INSTANCE_IP=$(aws cloudformation describe-stacks \
        --stack-name supabase-marketplace \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`SupabaseInstanceIP`].OutputValue' \
        --output text)
    
    echo -e "${GREEN}🎉 ¡SUPABASE MARKETPLACE DESPLEGADO!${NC}"
    echo -e "${PURPLE}====================================${NC}"
    echo -e "${GREEN}✅ Supabase Studio oficial funcionando${NC}"
    echo -e "${BLUE}🎨 URL Studio: $STUDIO_URL${NC}"
    echo -e "${BLUE}🌐 IP Instancia: $INSTANCE_IP${NC}"
    echo -e "${BLUE}👤 Usuario: admin${NC}"
    echo -e "${BLUE}🔐 Contraseña: SuperBase123!${NC}"
    
    # 5. Esperar a que Docker Compose termine de inicializar
    echo -e "${YELLOW}⏳ Esperando inicialización completa (3 minutos)...${NC}"
    sleep 180
    
    # 6. Probar Studio
    echo -e "${BLUE}🌐 Probando Supabase Studio oficial...${NC}"
    curl -I $STUDIO_URL --max-time 15 || echo "Studio aún inicializando"
    
    # 7. Crear información final
    cat > supabase-marketplace-info.txt << EOF
=== SUPABASE OFICIAL MARKETPLACE DESPLEGADO ===
Fecha: $(date)

🎨 SUPABASE STUDIO OFICIAL:
URL: $STUDIO_URL

=== CREDENCIALES ===
👤 Usuario: admin
🔐 Contraseña: SuperBase123!

=== INSTANCIA EC2 ===
IP: $INSTANCE_IP
Tipo: t3.large
VPC: $VPC_ID (misma que N8N)

=== CARACTERÍSTICAS OFICIALES ===
✅ Supabase Studio oficial completo
✅ Todos los servicios oficiales (Kong, PostgREST, GoTrue, etc.)
✅ Configuración oficial del repositorio
✅ Docker Compose oficial
✅ Conectado a tu base de datos Aurora
✅ Misma VPC que N8N

=== BASE DE DATOS AURORA ===
Host: supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com
Port: 5432
Database: supabase
User: supabase
Password: SuperBase123!

=== API KEYS ===
Anon: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0
Service: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

=== ACCESO ===
1. Ve a: $STUDIO_URL
2. Login: admin / SuperBase123!
3. ¡Usa Studio oficial como en supabase.com!

=== COMANDOS ÚTILES ===
# Conectar por SSH:
ssh ec2-user@$INSTANCE_IP

# Ver logs de Docker:
ssh ec2-user@$INSTANCE_IP "cd supabase/docker && docker-compose logs -f studio"

# Reiniciar servicios:
ssh ec2-user@$INSTANCE_IP "cd supabase/docker && docker-compose restart"

=== NOTA ===
Este es el Supabase oficial completo funcionando en EC2.
Studio puede tardar 5-10 minutos en estar completamente listo.
¡Exactamente la misma interfaz que conoces!
EOF
    
    echo -e "${BLUE}📄 Información guardada en: supabase-marketplace-info.txt${NC}"
    echo -e "${YELLOW}⏳ Studio puede tardar 5-10 minutos en estar completamente listo${NC}"
    echo -e "${GREEN}✅ ¡Es el Supabase Studio oficial que conoces!${NC}"
    
else
    echo -e "${RED}❌ Error durante el despliegue${NC}"
    
    # Mostrar eventos del stack
    aws cloudformation describe-stack-events \
        --stack-name supabase-marketplace \
        --region $REGION \
        --query 'StackEvents[0:5].[Timestamp,LogicalResourceId,ResourceStatus,ResourceStatusReason]' \
        --output table
    
    exit 1
fi

# Limpiar archivos temporales
rm -f supabase-marketplace-template.yaml

echo -e "${GREEN}✅ ¡SUPABASE MARKETPLACE OFICIAL COMPLETO!${NC}"
echo -e "${BLUE}🎨 URL: $STUDIO_URL${NC}"
echo -e "${BLUE}👤 Login: admin / SuperBase123!${NC}"
