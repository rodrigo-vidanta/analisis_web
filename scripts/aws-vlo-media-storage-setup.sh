#!/bin/bash
set -euo pipefail

REGION="us-west-2"
BUCKET="vlo-media-storage"
LAMBDA_NAME="vlo-media-auth"
ROLE_NAME="vlo-media-lambda-role"
SECRET_NAME="vlo/media-jwt-secret"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "============================================"
echo "  VLO Media Storage - Setup"
echo "  Cuenta: $ACCOUNT_ID | Region: $REGION"
echo "============================================"
echo ""

echo "[1/9] Creando bucket S3 con Object Lock..."
aws s3api create-bucket \
  --bucket "$BUCKET" \
  --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION" \
  --object-lock-enabled-for-bucket

echo "      Bucket creado: $BUCKET"

echo "[2/9] Configurando encriptacion..."
aws s3api put-bucket-encryption \
  --bucket "$BUCKET" \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        },
        "BucketKeyEnabled": true
      }
    ]
  }'

echo "      Encriptacion AES-256 + BucketKey habilitada"

echo "[3/9] Bloqueando acceso publico..."
aws s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration '{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  }'

echo "      Acceso publico bloqueado"

echo "[4/9] Configurando Object Lock (Governance 90 dias)..."
aws s3api put-object-lock-configuration \
  --bucket "$BUCKET" \
  --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "GOVERNANCE",
        "Days": 90
      }
    }
  }'

echo "      Object Lock Governance 90 dias configurado"

echo "[5/9] Configurando CORS..."
aws s3api put-bucket-cors \
  --bucket "$BUCKET" \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["ETag", "x-amz-request-id"],
        "MaxAgeSeconds": 3600
      }
    ]
  }'

echo "      CORS configurado"

echo "[6/9] Configurando Lifecycle..."
aws s3api put-bucket-lifecycle-configuration \
  --bucket "$BUCKET" \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "media-tiering-business-aligned",
        "Status": "Enabled",
        "Filter": { "Prefix": "" },
        "Transitions": [
          {
            "Days": 15,
            "StorageClass": "GLACIER_IR"
          },
          {
            "Days": 180,
            "StorageClass": "DEEP_ARCHIVE"
          }
        ]
      },
      {
        "ID": "cleanup-noncurrent-versions",
        "Status": "Enabled",
        "Filter": { "Prefix": "" },
        "NoncurrentVersionExpiration": {
          "NoncurrentDays": 30
        }
      },
      {
        "ID": "abort-incomplete-multipart",
        "Status": "Enabled",
        "Filter": { "Prefix": "" },
        "AbortIncompleteMultipartUpload": {
          "DaysAfterInitiation": 1
        }
      }
    ]
  }'

echo "      Lifecycle: Standard(15d) -> Glacier IR(180d) -> Deep Archive"
echo "      Noncurrent versions: auto-delete 30 dias"
echo "      Multipart incompleto: auto-limpieza 24 horas"

echo "[7/9] Creando IAM Role y politica..."
aws iam create-role \
  --role-name "$ROLE_NAME" \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": { "Service": "lambda.amazonaws.com" },
        "Action": "sts:AssumeRole"
      }
    ]
  }' > /dev/null

aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name vlo-media-s3-access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "S3UploadDownload",
        "Effect": "Allow",
        "Action": [
          "s3:PutObject",
          "s3:GetObject",
          "s3:AbortMultipartUpload",
          "s3:ListMultipartUploadParts"
        ],
        "Resource": "arn:aws:s3:::'"$BUCKET"'/*"
      },
      {
        "Sid": "S3ListBucket",
        "Effect": "Allow",
        "Action": "s3:ListBucket",
        "Resource": "arn:aws:s3:::'"$BUCKET"'"
      },
      {
        "Sid": "SecretsAccess",
        "Effect": "Allow",
        "Action": "secretsmanager:GetSecretValue",
        "Resource": "arn:aws:secretsmanager:'"$REGION"':'"$ACCOUNT_ID"':secret:'"$SECRET_NAME"'-*"
      },
      {
        "Sid": "CloudWatchLogs",
        "Effect": "Allow",
        "Action": [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        "Resource": "arn:aws:logs:'"$REGION"':'"$ACCOUNT_ID"':log-group:/aws/lambda/'"$LAMBDA_NAME"':*"
      }
    ]
  }'

echo "      IAM Role: $ROLE_NAME"
echo "      Politica: minimo privilegio (S3, Secrets, CloudWatch)"
echo "      Esperando propagacion del IAM Role (10s)..."
sleep 10

echo "[8/9] Creando secreto JWT..."
aws secretsmanager create-secret \
  --name "$SECRET_NAME" \
  --region "$REGION" \
  --secret-string '{"jwt_secret":"REPLACE_WITH_ACTUAL_JWT_SECRET","allowed_roles":["authenticated","service_role"]}' \
  --description "JWT secret for vlo-media-storage Bearer token validation" > /dev/null

echo "      Secreto creado: $SECRET_NAME"
echo "      IMPORTANTE: Actualizar el valor de jwt_secret con:"
echo "        aws secretsmanager update-secret --secret-id $SECRET_NAME --secret-string '{\"jwt_secret\":\"TU_SECRET_REAL\",\"allowed_roles\":[\"authenticated\",\"service_role\"]}'"

echo "[9/9] Creando Lambda function..."

LAMBDA_DIR=$(mktemp -d)
cat > "$LAMBDA_DIR/index.mjs" << 'LAMBDA_EOF'
import { S3Client, PutObjectCommand, GetObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { createHmac } from "crypto";

const s3 = new S3Client({ region: process.env.S3_REGION });
const sm = new SecretsManagerClient({ region: process.env.S3_REGION });

let cachedSecret = null;

async function getSecret() {
  if (cachedSecret) return cachedSecret;
  const res = await sm.send(new GetSecretValueCommand({ SecretId: process.env.SECRET_NAME }));
  cachedSecret = JSON.parse(res.SecretString);
  return cachedSecret;
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64");
}

function verifyJWT(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");
  const header = JSON.parse(base64UrlDecode(parts[0]).toString());
  const payload = JSON.parse(base64UrlDecode(parts[1]).toString());
  if (header.alg !== "HS256") throw new Error("Unsupported algorithm");
  const signature = createHmac("sha256", secret)
    .update(parts[0] + "." + parts[1])
    .digest("base64url");
  if (signature !== parts[2]) throw new Error("Invalid signature");
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error("Token expired");
  return payload;
}

function cors(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGINS || "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, X-File-Name, X-File-Type",
    },
    body: JSON.stringify(body),
  };
}

export const handler = async (event) => {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return cors({ ok: true });
  }
  const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return cors({ error: "Missing Authorization header" }, 401);
  let payload;
  try {
    const secret = await getSecret();
    payload = verifyJWT(token, secret.jwt_secret);
    if (!secret.allowed_roles.includes(payload.role)) {
      return cors({ error: "Insufficient role" }, 403);
    }
  } catch (err) {
    return cors({ error: "Invalid or expired token", detail: err.message }, 401);
  }
  const method = event.requestContext?.http?.method;
  const path = event.rawPath || "";
  const bucket = process.env.S3_BUCKET;
  try {
    if (method === "POST" && path === "/upload") {
      const body = JSON.parse(event.body || "{}");
      const { fileName, fileType, folder = "media" } = body;
      if (!fileName || !fileType) return cors({ error: "fileName and fileType required" }, 400);
      const date = new Date();
      const key = `${folder}/${date.getFullYear()}/${String(date.getMonth()+1).padStart(2,"0")}/${String(date.getDate()).padStart(2,"0")}/${crypto.randomUUID()}-${fileName}`;
      const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: fileType });
      const presignedUrl = await getSignedUrl(s3, command, { expiresIn: parseInt(process.env.PRESIGNED_EXPIRY_UPLOAD) });
      return cors({ presignedUrl, key, expiresIn: parseInt(process.env.PRESIGNED_EXPIRY_UPLOAD), method: "PUT" });
    }
    if (method === "POST" && path === "/upload/multipart/init") {
      const body = JSON.parse(event.body || "{}");
      const { fileName, fileType, folder = "video", parts = 100 } = body;
      if (!fileName || !fileType) return cors({ error: "fileName and fileType required" }, 400);
      const date = new Date();
      const key = `${folder}/${date.getFullYear()}/${String(date.getMonth()+1).padStart(2,"0")}/${String(date.getDate()).padStart(2,"0")}/${crypto.randomUUID()}-${fileName}`;
      const { UploadId } = await s3.send(new CreateMultipartUploadCommand({ Bucket: bucket, Key: key, ContentType: fileType }));
      const presignedUrls = [];
      for (let i = 1; i <= parts; i++) {
        const command = new UploadPartCommand({ Bucket: bucket, Key: key, UploadId, PartNumber: i });
        const url = await getSignedUrl(s3, command, { expiresIn: parseInt(process.env.PRESIGNED_EXPIRY_UPLOAD) });
        presignedUrls.push({ partNumber: i, url });
      }
      return cors({ uploadId: UploadId, key, presignedUrls });
    }
    if (method === "POST" && path === "/upload/multipart/complete") {
      const body = JSON.parse(event.body || "{}");
      const { key, uploadId, parts } = body;
      if (!key || !uploadId || !parts) return cors({ error: "key, uploadId, and parts required" }, 400);
      await s3.send(new CompleteMultipartUploadCommand({
        Bucket: bucket, Key: key, UploadId: uploadId,
        MultipartUpload: { Parts: parts.map(p => ({ PartNumber: p.partNumber, ETag: p.etag })) }
      }));
      return cors({ key, status: "completed" });
    }
    if (method === "GET" && path === "/download") {
      const key = event.queryStringParameters?.key;
      if (!key) return cors({ error: "key parameter required" }, 400);
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const presignedUrl = await getSignedUrl(s3, command, { expiresIn: parseInt(process.env.PRESIGNED_EXPIRY_DOWNLOAD) });
      return cors({ presignedUrl, expiresIn: parseInt(process.env.PRESIGNED_EXPIRY_DOWNLOAD) });
    }
    return cors({ error: "Not found", endpoints: ["POST /upload", "POST /upload/multipart/init", "POST /upload/multipart/complete", "GET /download?key="] }, 404);
  } catch (err) {
    console.error("Error:", err);
    return cors({ error: "Internal server error", detail: err.message }, 500);
  }
};
LAMBDA_EOF

cd "$LAMBDA_DIR" && zip -j function.zip index.mjs > /dev/null

ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

aws lambda create-function \
  --function-name "$LAMBDA_NAME" \
  --runtime nodejs20.x \
  --handler index.handler \
  --role "$ROLE_ARN" \
  --zip-file fileb://function.zip \
  --architectures arm64 \
  --memory-size 128 \
  --timeout 30 \
  --environment "Variables={S3_BUCKET=$BUCKET,S3_REGION=$REGION,PRESIGNED_EXPIRY_UPLOAD=900,PRESIGNED_EXPIRY_DOWNLOAD=600,SECRET_NAME=$SECRET_NAME,ALLOWED_ORIGINS=*}" \
  --region "$REGION" > /dev/null

echo "      Lambda creada: $LAMBDA_NAME (arm64, Node 20, 128MB)"

echo "      Esperando que Lambda este activa..."
aws lambda wait function-active-v2 --function-name "$LAMBDA_NAME" --region "$REGION"

FUNCTION_URL=$(aws lambda create-function-url-config \
  --function-name "$LAMBDA_NAME" \
  --auth-type NONE \
  --cors '{"AllowOrigins":["*"],"AllowMethods":["GET","POST"],"AllowHeaders":["Authorization","Content-Type","X-File-Name","X-File-Type"],"ExposeHeaders":["X-Request-Id"],"AllowCredentials":false,"MaxAge":3600}' \
  --region "$REGION" \
  --query 'FunctionUrl' --output text)

aws lambda add-permission \
  --function-name "$LAMBDA_NAME" \
  --statement-id FunctionURLAllowPublicAccess \
  --action lambda:InvokeFunctionUrl \
  --principal "*" \
  --function-url-auth-type NONE \
  --region "$REGION" > /dev/null

echo "      Function URL: $FUNCTION_URL"

aws cloudwatch put-metric-alarm \
  --alarm-name "${LAMBDA_NAME}-errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --dimensions "Name=FunctionName,Value=$LAMBDA_NAME" \
  --period 600 \
  --evaluation-periods 2 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --statistic Sum \
  --alarm-description "VLO Media Auth Lambda: more than 10 errors in 10 minutes" \
  --region "$REGION"

aws cloudwatch put-metric-alarm \
  --alarm-name "${BUCKET}-size" \
  --metric-name BucketSizeBytes \
  --namespace AWS/S3 \
  --dimensions "Name=BucketName,Value=$BUCKET" "Name=StorageType,Value=StandardStorage" \
  --period 86400 \
  --evaluation-periods 1 \
  --threshold 5497558138880 \
  --comparison-operator GreaterThanThreshold \
  --statistic Average \
  --alarm-description "VLO Media Storage: more than 5TB in Standard (lifecycle may not be working)" \
  --region "$REGION"

echo "      CloudWatch Alarms configuradas"

rm -rf "$LAMBDA_DIR"

echo ""
echo "============================================"
echo "  SETUP COMPLETADO"
echo "============================================"
echo ""
echo "  Bucket:       $BUCKET"
echo "  Region:       $REGION"
echo "  Lambda:       $LAMBDA_NAME"
echo "  Function URL: $FUNCTION_URL"
echo "  IAM Role:     $ROLE_NAME"
echo "  Secret:       $SECRET_NAME"
echo ""
echo "  Lifecycle:"
echo "    0-15 dias:    S3 Standard (acceso inmediato)"
echo "    15-180 dias:  Glacier Instant Retrieval (acceso en ms)"
echo "    180+ dias:    Deep Archive (acceso en 12-48h)"
echo "    Eliminacion:  NUNCA"
echo ""
echo "  Seguridad:"
echo "    Encriptacion:     AES-256 + BucketKey"
echo "    Acceso publico:   BLOQUEADO"
echo "    Object Lock:      Governance 90 dias"
echo "    Versionado:       Habilitado"
echo "    Auth:             Bearer JWT"
echo ""
echo "  Endpoints:"
echo "    POST ${FUNCTION_URL}upload"
echo "    POST ${FUNCTION_URL}upload/multipart/init"
echo "    POST ${FUNCTION_URL}upload/multipart/complete"
echo "    GET  ${FUNCTION_URL}download?key=<s3-key>"
echo ""
echo "  PENDIENTE: Actualizar JWT secret en Secrets Manager:"
echo "    aws secretsmanager update-secret \\"
echo "      --secret-id $SECRET_NAME \\"
echo "      --secret-string '{\"jwt_secret\":\"TU_SECRET_REAL\",\"allowed_roles\":[\"authenticated\",\"service_role\"]}'"
echo ""
echo "============================================"
