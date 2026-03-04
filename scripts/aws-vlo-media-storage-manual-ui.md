# VLO Media Storage - Setup via AWS Console

Region: **us-west-2** (Oregon) en todo momento. Si la consola cambia de region, regresar a us-west-2.

---

## 1. S3 Bucket

S3 > Buckets > Create bucket

| Campo | Valor |
|-------|-------|
| Bucket name | `vlo-media-storage` |
| Region | us-west-2 |
| Object Ownership | ACLs disabled |
| Block all public access | ON (las 4 casillas marcadas) |
| Bucket Versioning | Enable |
| **Object Lock** | **Enable** (esta opcion solo aparece si expandes "Advanced settings" hasta abajo) |

Create bucket.

Entrar al bucket recien creado:

### Encryption
Properties tab > Default encryption > Edit

| Campo | Valor |
|-------|-------|
| Encryption type | Server-side encryption with Amazon S3 managed keys (SSE-S3) |
| Bucket Key | Enable |

Save.

### Object Lock
Properties tab > Object Lock > Edit

| Campo | Valor |
|-------|-------|
| Default retention | Enable |
| Default retention mode | Governance |
| Default retention period | 90 days |

Save.

### CORS
Permissions tab > Cross-origin resource sharing (CORS) > Edit

Pegar exacto:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag", "x-amz-request-id"],
    "MaxAgeSeconds": 3600
  }
]
```

Save.

### Lifecycle
Management tab > Lifecycle rules > Create lifecycle rule

**Regla 1:**

| Campo | Valor |
|-------|-------|
| Rule name | `media-tiering-business-aligned` |
| Apply to all objects | ON (marcar checkbox "I acknowledge...") |
| Transition current versions | ON |

Agregar 2 transiciones:
- Transition to **Glacier Instant Retrieval** after **15** days
- Transition to **Glacier Deep Archive** after **180** days

Create rule.

**Regla 2:**

| Campo | Valor |
|-------|-------|
| Rule name | `cleanup-noncurrent-versions` |
| Apply to all objects | ON |
| Expire noncurrent versions | ON |
| Days after objects become noncurrent | 30 |

Create rule.

**Regla 3:**

| Campo | Valor |
|-------|-------|
| Rule name | `abort-incomplete-multipart` |
| Apply to all objects | ON |
| Delete expired object delete markers or incomplete multipart uploads | ON |
| Delete incomplete multipart uploads | 1 day |

Create rule.

Al terminar deben verse 3 reglas en la lista.

---

## 2. IAM Role

IAM > Roles > Create role

**Step 1 - Trusted entity:**
- Trusted entity type: AWS service
- Use case: Lambda
- Next

**Step 2 - Permissions:**
- No seleccionar ninguna policy. Next.
- (la politica se agrega inline despues)

**Step 3 - Name:**
- Role name: `vlo-media-lambda-role`
- Create role

Entrar al role recien creado > Permissions tab > Add permissions > Create inline policy > JSON tab

Pegar esto (reemplazar `ACCOUNT_ID` con el numero de cuenta real):

```json
{
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
      "Resource": "arn:aws:s3:::vlo-media-storage/*"
    },
    {
      "Sid": "S3ListBucket",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::vlo-media-storage"
    },
    {
      "Sid": "SecretsAccess",
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:us-west-2:ACCOUNT_ID:secret:vlo/media-jwt-secret-*"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-west-2:ACCOUNT_ID:log-group:/aws/lambda/vlo-media-auth:*"
    }
  ]
}
```

Policy name: `vlo-media-s3-access`

Create policy.

---

## 3. Secrets Manager

Secrets Manager > Store a new secret

| Campo | Valor |
|-------|-------|
| Secret type | Other type of secret |
| Key/value pairs | Cambiar a **Plaintext** tab |

Pegar:
```json
{"jwt_secret":"REPLACE_WITH_ACTUAL_JWT_SECRET","allowed_roles":["authenticated","service_role"]}
```

Next.

| Campo | Valor |
|-------|-------|
| Secret name | `vlo/media-jwt-secret` |
| Description | JWT secret for vlo-media-storage Bearer token validation |

Next > Next > Store.

Despues de crear: editar el secreto y reemplazar `REPLACE_WITH_ACTUAL_JWT_SECRET` con el JWT secret real del proyecto.

---

## 4. Lambda Function

Lambda > Create function

| Campo | Valor |
|-------|-------|
| Author from scratch | seleccionado |
| Function name | `vlo-media-auth` |
| Runtime | Node.js 20.x |
| Architecture | arm64 |
| Execution role | Use an existing role > `vlo-media-lambda-role` |

Create function.

### Configuration tab > General configuration > Edit

| Campo | Valor |
|-------|-------|
| Memory | 128 MB |
| Timeout | 30 sec |

Save.

### Configuration tab > Environment variables > Edit

Agregar estas 6 variables:

| Key | Value |
|-----|-------|
| S3_BUCKET | vlo-media-storage |
| S3_REGION | us-west-2 |
| PRESIGNED_EXPIRY_UPLOAD | 900 |
| PRESIGNED_EXPIRY_DOWNLOAD | 600 |
| SECRET_NAME | vlo/media-jwt-secret |
| ALLOWED_ORIGINS | * |

Save.

### Code tab

Borrar todo el contenido de `index.mjs`. Pegar el codigo Lambda (archivo aparte: `vlo-media-auth-lambda.mjs`). Deploy.

Si el archivo default es `index.js`, renombrarlo a `index.mjs` (click derecho > rename). El runtime ESM requiere extension `.mjs`.

### Configuration tab > Function URL > Create function URL

| Campo | Valor |
|-------|-------|
| Auth type | NONE |
| Configure CORS | ON |
| Allow origins | * |
| Allow methods | GET, POST |
| Allow headers | Authorization, Content-Type, X-File-Name, X-File-Type |
| Expose headers | X-Request-Id |
| Max age | 3600 |

Save.

Copiar la Function URL que aparece. Formato: `https://xxxxx.lambda-url.us-west-2.on.aws/`

---

## 5. CloudWatch Alarms

CloudWatch > Alarms > Create alarm

**Alarma 1 - Errores Lambda:**

- Select metric > Lambda > By Function Name > `vlo-media-auth` > Errors > Select metric
- Statistic: Sum
- Period: 10 minutes
- Threshold: Greater than 10
- Evaluation periods: 2
- Alarm name: `vlo-media-auth-errors`
- Next > Next > Create alarm

(no configurar SNS por ahora, se puede agregar despues)

**Alarma 2 - Storage size:**

- Select metric > S3 > Storage Metrics > `vlo-media-storage` > StandardStorage > BucketSizeBytes > Select metric
- Statistic: Average
- Period: 1 day
- Threshold: Greater than 5497558138880 (5 TB en bytes)
- Evaluation periods: 1
- Alarm name: `vlo-media-storage-size`
- Next > Next > Create alarm

Esta metrica tarda 24-48h en aparecer. La alarma dira "Insufficient data" hasta entonces. Es normal.

---

## Verificacion

Al terminar, estos recursos deben existir:

| Recurso | Nombre | Donde verificar |
|---------|--------|-----------------|
| S3 Bucket | vlo-media-storage | S3 > Buckets |
| IAM Role | vlo-media-lambda-role | IAM > Roles |
| Secret | vlo/media-jwt-secret | Secrets Manager |
| Lambda | vlo-media-auth | Lambda > Functions |
| Function URL | https://xxxxx.lambda-url... | Lambda > vlo-media-auth > Configuration > Function URL |
| Alarm | vlo-media-auth-errors | CloudWatch > Alarms |
| Alarm | vlo-media-storage-size | CloudWatch > Alarms |

### Test rapido

Desde terminal o Postman:

```
curl -X POST https://TU_FUNCTION_URL/upload \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.txt","fileType":"text/plain","folder":"test"}'
```

Debe retornar 401 (Missing Authorization header). Si retorna 401, la Lambda esta corriendo y validando auth correctamente.

---

## Endpoints

| Metodo | Path | Descripcion |
|--------|------|-------------|
| POST | /upload | Presigned URL para archivo individual |
| POST | /upload/multipart/init | Iniciar multipart (videos >100MB) |
| POST | /upload/multipart/complete | Completar multipart |
| GET | /download?key=xxx | Presigned URL de descarga |

Todos requieren header `Authorization: Bearer <jwt_token>`

---

## Estructura de archivos en S3

```
vlo-media-storage/
  audio/2026/03/04/uuid-nombre.mp3
  video/2026/03/04/uuid-nombre.mp4
  media/2026/03/04/uuid-nombre.ext
```

El folder se define en el body del request (`folder`: audio, video, media).
