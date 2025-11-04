#!/bin/bash
# Script para implementar HTTPS en Supabase ALB
# Requiere: AWS CLI configurado, certificado ACM válido

set -e

REGION="us-west-2"
ALB_ARN="arn:aws:elasticloadbalancing:us-west-2:307621978585:loadbalancer/app/supabase-studio-alb/ab85e1b8f1073218"

echo "=== Configurando HTTPS en Supabase ALB ==="
echo ""

# 1. Obtener Target Group
echo "1. Obteniendo Target Group..."
TG_ARN=$(aws elbv2 describe-target-groups --region "$REGION" \
  --query "TargetGroups[?contains(LoadBalancerArns[0], 'supabase-studio-alb')].TargetGroupArn" \
  --output text | head -1)

if [ -z "$TG_ARN" ]; then
  echo "Error: No se encontró Target Group para el ALB"
  exit 1
fi

echo "   Target Group: $TG_ARN"
echo ""

# 2. Listar certificados ACM disponibles
echo "2. Certificados ACM disponibles:"
aws acm list-certificates --region "$REGION" \
  --query 'CertificateSummaryList[?Status==`ISSUED`].{Domain:DomainName,Arn:CertificateArn}' \
  --output table

echo ""
read -p "Ingrese el ARN del certificado a usar (o presione Enter para crear uno nuevo): " CERT_ARN

# 3. Crear listener HTTPS
if [ -n "$CERT_ARN" ]; then
  echo "3. Creando listener HTTPS con certificado: $CERT_ARN"
  
  HTTPS_LISTENER=$(aws elbv2 create-listener \
    --load-balancer-arn "$ALB_ARN" \
    --protocol HTTPS \
    --port 443 \
    --certificates "CertificateArn=$CERT_ARN" \
    --default-actions "Type=forward,TargetGroupArn=$TG_ARN" \
    --region "$REGION" \
    --query 'Listeners[0].ListenerArn' \
    --output text 2>&1)
  
  if [ $? -eq 0 ]; then
    echo "   ✅ Listener HTTPS creado: $HTTPS_LISTENER"
  else
    echo "   ⚠️  Error creando listener: $HTTPS_LISTENER"
    echo "   Puede que el listener ya exista o el certificado no sea válido"
  fi
else
  echo "3. Saltando creación de listener HTTPS (sin certificado)"
  echo "   Para crear un certificado:"
  echo "   aws acm request-certificate --domain-name ejemplo.com --validation-method DNS --region $REGION"
fi

echo ""

# 4. Configurar redirección HTTP a HTTPS
echo "4. Configurando redirección HTTP a HTTPS..."
HTTP_LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn "$ALB_ARN" \
  --region "$REGION" \
  --query 'Listeners[?Port==`80`].ListenerArn' \
  --output text)

if [ -n "$HTTP_LISTENER_ARN" ] && [ -n "$CERT_ARN" ]; then
  echo "   Modificando listener HTTP para redirigir a HTTPS..."
  aws elbv2 modify-listener \
    --listener-arn "$HTTP_LISTENER_ARN" \
    --default-actions "Type=redirect,RedirectConfig={Protocol=HTTPS,Port=443,StatusCode=HTTP_301}" \
    --region "$REGION" \
    --query 'Listeners[0].ListenerArn' \
    --output text
  
  echo "   ✅ Redirección HTTP→HTTPS configurada"
else
  echo "   ⚠️  No se puede configurar redirección (sin certificado o listener HTTP)"
fi

echo ""
echo "=== Configuración completada ==="
echo ""
echo "ALB DNS: supabase-studio-alb-1499081913.us-west-2.elb.amazonaws.com"
echo "HTTP: http://supabase-studio-alb-1499081913.us-west-2.elb.amazonaws.com"
if [ -n "$CERT_ARN" ]; then
  echo "HTTPS: https://supabase-studio-alb-1499081913.us-west-2.elb.amazonaws.com"
fi

