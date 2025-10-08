#!/bin/bash

# Setup AWS CI/CD Pipeline for PQNC QA AI Platform
# Configura CodePipeline + CodeBuild para auto-deploy desde GitHub

set -e

# Configuración
PROJECT_NAME="pqnc-qa-ai-platform"
GITHUB_REPO="rodrigo-vidanta/analisis_web"
GITHUB_BRANCH="main"
S3_BUCKET="pqnc-qa-ai-frontend"
CLOUDFRONT_DISTRIBUTION="E19ZID7TVR08JG"
REGION="us-west-2"

echo "🚀 Configurando CI/CD Pipeline para $PROJECT_NAME"

# 1. Crear IAM Role para CodeBuild
echo "📋 Creando IAM Role para CodeBuild..."

CODEBUILD_ROLE_NAME="${PROJECT_NAME}-codebuild-role"
CODEBUILD_POLICY_NAME="${PROJECT_NAME}-codebuild-policy"

# Trust policy para CodeBuild
cat > codebuild-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codebuild.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Crear role si no existe
if ! aws iam get-role --role-name $CODEBUILD_ROLE_NAME --region $REGION 2>/dev/null; then
  aws iam create-role \
    --role-name $CODEBUILD_ROLE_NAME \
    --assume-role-policy-document file://codebuild-trust-policy.json \
    --region $REGION
  echo "✅ IAM Role creado: $CODEBUILD_ROLE_NAME"
else
  echo "ℹ️ IAM Role ya existe: $CODEBUILD_ROLE_NAME"
fi

# Policy para permisos de CodeBuild
cat > codebuild-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow", 
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::$S3_BUCKET",
        "arn:aws:s3:::$S3_BUCKET/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Crear/actualizar policy
aws iam put-role-policy \
  --role-name $CODEBUILD_ROLE_NAME \
  --policy-name $CODEBUILD_POLICY_NAME \
  --policy-document file://codebuild-policy.json \
  --region $REGION

echo "✅ Policy aplicado al role"

# 2. Crear proyecto CodeBuild
echo "🏗️ Creando proyecto CodeBuild..."

CODEBUILD_PROJECT_NAME="${PROJECT_NAME}-build"
ROLE_ARN=$(aws iam get-role --role-name $CODEBUILD_ROLE_NAME --query 'Role.Arn' --output text --region $REGION)

# Configuración del proyecto CodeBuild
cat > codebuild-project.json << EOF
{
  "name": "$CODEBUILD_PROJECT_NAME",
  "description": "Auto-build and deploy $PROJECT_NAME from GitHub",
  "source": {
    "type": "GITHUB",
    "location": "https://github.com/$GITHUB_REPO.git",
    "buildspec": "buildspec.yml",
    "reportBuildStatus": true
  },
  "artifacts": {
    "type": "NO_ARTIFACTS"
  },
  "environment": {
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/amazonlinux2-x86_64-standard:5.0",
    "computeType": "BUILD_GENERAL1_SMALL",
    "privilegedMode": false
  },
  "serviceRole": "$ROLE_ARN",
  "timeoutInMinutes": 15,
  "badgeEnabled": true,
  "cache": {
    "type": "LOCAL",
    "modes": ["LOCAL_DOCKER_LAYER_CACHE", "LOCAL_SOURCE_CACHE"]
  }
}
EOF

# Crear proyecto si no existe
if ! aws codebuild batch-get-projects --names $CODEBUILD_PROJECT_NAME --region $REGION --query 'projects[0].name' --output text 2>/dev/null | grep -q $CODEBUILD_PROJECT_NAME; then
  aws codebuild create-project \
    --cli-input-json file://codebuild-project.json \
    --region $REGION
  echo "✅ Proyecto CodeBuild creado: $CODEBUILD_PROJECT_NAME"
else
  aws codebuild update-project \
    --cli-input-json file://codebuild-project.json \
    --region $REGION
  echo "✅ Proyecto CodeBuild actualizado: $CODEBUILD_PROJECT_NAME"
fi

# 3. Crear IAM Role para CodePipeline
echo "📋 Creando IAM Role para CodePipeline..."

PIPELINE_ROLE_NAME="${PROJECT_NAME}-pipeline-role"
PIPELINE_POLICY_NAME="${PROJECT_NAME}-pipeline-policy"

# Trust policy para CodePipeline
cat > pipeline-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codepipeline.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Crear role si no existe
if ! aws iam get-role --role-name $PIPELINE_ROLE_NAME --region $REGION 2>/dev/null; then
  aws iam create-role \
    --role-name $PIPELINE_ROLE_NAME \
    --assume-role-policy-document file://pipeline-trust-policy.json \
    --region $REGION
  echo "✅ IAM Role creado: $PIPELINE_ROLE_NAME"
else
  echo "ℹ️ IAM Role ya existe: $PIPELINE_ROLE_NAME"
fi

# Policy para permisos de CodePipeline
cat > pipeline-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetBucketVersioning",
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:PutObject"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "codebuild:BatchGetBuilds",
        "codebuild:StartBuild"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Crear/actualizar policy
aws iam put-role-policy \
  --role-name $PIPELINE_ROLE_NAME \
  --policy-name $PIPELINE_POLICY_NAME \
  --policy-document file://pipeline-policy.json \
  --region $REGION

echo "✅ Policy aplicado al role de Pipeline"

# 4. Crear bucket para artefactos de Pipeline
ARTIFACTS_BUCKET="${PROJECT_NAME}-pipeline-artifacts"

if ! aws s3api head-bucket --bucket $ARTIFACTS_BUCKET --region $REGION 2>/dev/null; then
  aws s3 mb s3://$ARTIFACTS_BUCKET --region $REGION
  echo "✅ Bucket de artefactos creado: $ARTIFACTS_BUCKET"
else
  echo "ℹ️ Bucket de artefactos ya existe: $ARTIFACTS_BUCKET"
fi

# 5. Crear CodePipeline
echo "🔄 Creando CodePipeline..."

PIPELINE_NAME="${PROJECT_NAME}-pipeline"
PIPELINE_ROLE_ARN=$(aws iam get-role --role-name $PIPELINE_ROLE_NAME --query 'Role.Arn' --output text --region $REGION)

# Configuración del pipeline
cat > pipeline-config.json << EOF
{
  "pipeline": {
    "name": "$PIPELINE_NAME",
    "roleArn": "$PIPELINE_ROLE_ARN",
    "artifactStore": {
      "type": "S3",
      "location": "$ARTIFACTS_BUCKET"
    },
    "stages": [
      {
        "name": "Source",
        "actions": [
          {
            "name": "SourceAction",
            "actionTypeId": {
              "category": "Source",
              "owner": "ThirdParty",
              "provider": "GitHub",
              "version": "1"
            },
            "configuration": {
              "Owner": "$(echo $GITHUB_REPO | cut -d'/' -f1)",
              "Repo": "$(echo $GITHUB_REPO | cut -d'/' -f2)",
              "Branch": "$GITHUB_BRANCH",
              "OAuthToken": "{{resolve:secretsmanager:github-token:SecretString:token}}"
            },
            "outputArtifacts": [
              {
                "name": "SourceOutput"
              }
            ]
          }
        ]
      },
      {
        "name": "Build",
        "actions": [
          {
            "name": "BuildAction",
            "actionTypeId": {
              "category": "Build",
              "owner": "AWS",
              "provider": "CodeBuild",
              "version": "1"
            },
            "configuration": {
              "ProjectName": "$CODEBUILD_PROJECT_NAME"
            },
            "inputArtifacts": [
              {
                "name": "SourceOutput"
              }
            ],
            "outputArtifacts": [
              {
                "name": "BuildOutput"
              }
            ]
          }
        ]
      }
    ]
  }
}
EOF

# Crear pipeline si no existe
if ! aws codepipeline get-pipeline --name $PIPELINE_NAME --region $REGION 2>/dev/null; then
  aws codepipeline create-pipeline \
    --cli-input-json file://pipeline-config.json \
    --region $REGION
  echo "✅ CodePipeline creado: $PIPELINE_NAME"
else
  aws codepipeline update-pipeline \
    --cli-input-json file://pipeline-config.json \
    --region $REGION
  echo "✅ CodePipeline actualizado: $PIPELINE_NAME"
fi

# 6. Configurar webhook de GitHub
echo "🔗 Configurando webhook de GitHub..."

# Crear webhook para trigger automático
WEBHOOK_NAME="${PROJECT_NAME}-github-webhook"

cat > webhook-config.json << EOF
{
  "webhook": {
    "name": "$WEBHOOK_NAME",
    "targetPipeline": "$PIPELINE_NAME",
    "targetAction": "SourceAction",
    "filters": [
      {
        "jsonPath": "$.ref",
        "matchEquals": "refs/heads/$GITHUB_BRANCH"
      }
    ],
    "authentication": "GITHUB_HMAC",
    "authenticationConfiguration": {
      "SecretToken": "{{resolve:secretsmanager:github-webhook-secret:SecretString:secret}}"
    }
  }
}
EOF

if ! aws codepipeline list-webhooks --region $REGION --query "webhooks[?name=='$WEBHOOK_NAME'].name" --output text | grep -q $WEBHOOK_NAME; then
  aws codepipeline put-webhook \
    --cli-input-json file://webhook-config.json \
    --region $REGION
  echo "✅ Webhook creado: $WEBHOOK_NAME"
else
  echo "ℹ️ Webhook ya existe: $WEBHOOK_NAME"
fi

# Limpiar archivos temporales
rm -f codebuild-trust-policy.json codebuild-policy.json codebuild-project.json
rm -f pipeline-trust-policy.json pipeline-policy.json pipeline-config.json webhook-config.json

echo ""
echo "🎉 CI/CD Pipeline configurado exitosamente!"
echo ""
echo "📋 Resumen de recursos creados:"
echo "• CodeBuild Project: $CODEBUILD_PROJECT_NAME"
echo "• CodePipeline: $PIPELINE_NAME"
echo "• S3 Artifacts Bucket: $ARTIFACTS_BUCKET"
echo "• IAM Roles: $CODEBUILD_ROLE_NAME, $PIPELINE_ROLE_NAME"
echo ""
echo "🔧 Próximos pasos:"
echo "1. Configurar GitHub token en AWS Secrets Manager"
echo "2. Configurar webhook secret en AWS Secrets Manager"
echo "3. Activar webhook en repositorio GitHub"
echo ""
echo "💡 Comandos útiles:"
echo "• Ver builds: aws codebuild list-builds-for-project --project-name $CODEBUILD_PROJECT_NAME"
echo "• Ver pipeline: aws codepipeline get-pipeline-state --name $PIPELINE_NAME"
echo "• Trigger manual: aws codepipeline start-pipeline-execution --name $PIPELINE_NAME"
