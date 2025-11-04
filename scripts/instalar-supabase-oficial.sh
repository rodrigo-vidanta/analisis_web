#!/bin/bash
# Script de instalación oficial de Supabase según documentación
# https://supabase.com/docs/guides/self-hosting/docker

set -e

REGION="us-west-2"
KEY_NAME="${KEY_NAME:-supabase-key}"
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.medium}"
AMI_ID="ami-03c1f788292172a4e"
SECURITY_GROUP_NAME="supabase-oficial-sg"

echo "=== INSTALACIÓN OFICIAL DE SUPABASE ==="
echo ""
echo "Este script sigue la documentación oficial de Supabase"
echo "https://supabase.com/docs/guides/self-hosting/docker"
echo ""

# 1. Crear Security Group
echo "1. Creando Security Group..."
SG_ID=$(aws ec2 create-security-group \
  --group-name "$SECURITY_GROUP_NAME" \
  --description "Security group for official Supabase installation" \
  --region "$REGION" \
  --query 'GroupId' \
  --output text 2>&1)

if echo "$SG_ID" | grep -q "sg-"; then
  echo "   ✅ Security Group creado: $SG_ID"
  
  # Agregar reglas
  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0 \
    --region "$REGION" > /dev/null 2>&1
  
  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 \
    --region "$REGION" > /dev/null 2>&1
  
  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 \
    --region "$REGION" > /dev/null 2>&1
  
  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp \
    --port 3000 \
    --cidr 0.0.0.0/0 \
    --region "$REGION" > /dev/null 2>&1
  
  echo "   ✅ Reglas de seguridad configuradas"
else
  echo "   ⚠️  Security Group puede ya existir: $SG_ID"
  SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$SECURITY_GROUP_NAME" \
    --region "$REGION" \
    --query 'SecurityGroups[0].GroupId' \
    --output text)
fi

# 2. Crear instancia EC2
echo ""
echo "2. Creando instancia EC2..."

# Crear instancia con o sin key pair
if [ -n "$KEY_NAME" ] && [ "$KEY_NAME" != "None" ] && [ "$KEY_NAME" != "" ]; then
  INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$SG_ID" \
    --user-data file://scripts/user-data-supabase.sh \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=supabase-oficial}]" \
    --region "$REGION" \
    --query 'Instances[0].InstanceId' \
    --output text 2>&1)
else
  echo "   ⚠️  No se proporcionó key pair, creando instancia sin acceso SSH"
  INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type "$INSTANCE_TYPE" \
    --security-group-ids "$SG_ID" \
    --user-data file://scripts/user-data-supabase.sh \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=supabase-oficial}]" \
    --region "$REGION" \
    --query 'Instances[0].InstanceId' \
    --output text 2>&1)
fi

echo "   ✅ Instancia creada: $INSTANCE_ID"
echo "   ⏳ Esperando a que la instancia esté running..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"

# 3. Obtener IP pública
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "   ✅ IP Pública: $PUBLIC_IP"

# 4. Esperar a que el script de user-data termine
echo ""
echo "3. Esperando a que Docker y Supabase se instalen (esto puede tardar 5-10 minutos)..."
echo "   Puedes verificar el progreso en:"
echo "   ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$PUBLIC_IP"
echo "   sudo tail -f /var/log/cloud-init-output.log"

sleep 30

# 5. Verificar instalación
echo ""
echo "4. Verificando instalación..."
echo "   Esperando 2 minutos más para que Docker Compose termine..."
sleep 120

# 6. Probar acceso
echo ""
echo "5. Probando acceso a Supabase Studio..."
HTTP_TEST=$(curl -I -s -m 10 "http://$PUBLIC_IP:3000" | head -3 || echo "No response")
echo "$HTTP_TEST"

echo ""
echo "=== INSTALACIÓN COMPLETADA ==="
echo ""
echo "✅ Instancia EC2: $INSTANCE_ID"
echo "✅ IP Pública: $PUBLIC_IP"
echo ""
echo "🌐 Acceso a Supabase Studio:"
echo "   http://$PUBLIC_IP:3000"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Configurar ALB apuntando a esta instancia (puerto 3000)"
echo "   2. Configurar HTTPS con certificado ACM"
echo "   3. Configurar DNS en Route 53"
echo ""
echo "Para verificar estado:"
echo "   ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$PUBLIC_IP"
echo "   cd supabase/docker && docker-compose ps"

