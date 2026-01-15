#!/bin/bash
##############################################################################
# DEPLOY LAMBDA@EDGE - SUPABASE AUTH INJECTOR
# Seguridad máxima sin exponer service_role
##############################################################################

set -e

echo "🚀 Desplegando Lambda@Edge..."

# 1. Crear secret en Secrets Manager
echo "📝 Paso 1: Creando secret en AWS Secrets Manager..."

aws secretsmanager create-secret \
  --name pqnc/supabase/service-role-key \
  --description "Service role key de Supabase PQNC_AI" \
  --secret-string "{\"service_role_key\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY4Njc4NywiZXhwIjoyMDY4MjYyNzg3fQ.oyKsFpO_8ulE_m877kpDoxF-htfenoXjq0_GrFThrwI\"}" \
  --region us-west-2 2>/dev/null || echo "Secret ya existe"

echo "✅ Secret configurado"

# 2. Crear role para Lambda@Edge
echo "📝 Paso 2: Creando IAM role..."

cat > /tmp/lambda-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": [
          "lambda.amazonaws.com",
          "edgelambda.amazonaws.com"
        ]
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name pqnc-lambda-edge-role \
  --assume-role-policy-document file:///tmp/lambda-trust-policy.json \
  2>/dev/null || echo "Role ya existe"

# Agregar permisos
aws iam attach-role-policy \
  --role-name pqnc-lambda-edge-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
  2>/dev/null || true

aws iam attach-role-policy \
  --role-name pqnc-lambda-edge-role \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite \
  2>/dev/null || true

echo "✅ IAM role configurado"

# 3. Crear función Lambda
echo "📝 Paso 3: Creando función Lambda..."

cd lambda-edge
zip -q function.zip inject-supabase-auth.js

ROLE_ARN=$(aws iam get-role --role-name pqnc-lambda-edge-role --query 'Role.Arn' --output text)

aws lambda create-function \
  --function-name pqnc-supabase-auth-injector \
  --runtime nodejs20.x \
  --role $ROLE_ARN \
  --handler inject-supabase-auth.handler \
  --zip-file fileb://function.zip \
  --region us-east-1 \
  --publish \
  2>/dev/null || echo "Función ya existe, actualizando..."

# Actualizar si ya existe
aws lambda update-function-code \
  --function-name pqnc-supabase-auth-injector \
  --zip-file fileb://function.zip \
  --region us-east-1 \
  --publish

LAMBDA_ARN=$(aws lambda get-function \
  --function-name pqnc-supabase-auth-injector \
  --region us-east-1 \
  --query 'Configuration.FunctionArn' \
  --output text)

echo "✅ Lambda creada: $LAMBDA_ARN"

# 4. Asociar a CloudFront
echo "📝 Paso 4: Asociando Lambda@Edge a CloudFront..."

DIST_ID="E19ZID7TVR08JG"

echo "Distribution ID: $DIST_ID"
echo "Lambda ARN: $LAMBDA_ARN"
echo ""
echo "⚠️  IMPORTANTE:"
echo "Debes asociar manualmente en CloudFront Console:"
echo "1. CloudFront → Distributions → $DIST_ID"
echo "2. Behaviors → Edit"
echo "3. Lambda Function Associations"
echo "4. Viewer Request: $LAMBDA_ARN"
echo "5. Save changes"
echo ""
echo "O ejecuta:"
echo "  aws cloudfront get-distribution-config --id $DIST_ID > dist.json"
echo "  # Editar dist.json para agregar Lambda"
echo "  aws cloudfront update-distribution --id $DIST_ID --distribution-config ..."
echo ""
echo "✅ Lambda lista para asociar"
echo ""
echo "Costo: ~$0.20 por millón de requests"
echo "Propagación: 5-15 minutos después de asociar"
