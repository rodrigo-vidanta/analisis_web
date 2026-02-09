# AWS Inventory - PQNC QA AI Platform

> **Ultima actualizacion**: 2026-02-08
> **Cuenta**: 307621978585 | **Region**: us-west-2 | **IAM User**: darigrosales
> **NOTA**: Actualizar este archivo cada vez que se modifique infraestructura AWS

---

## Resumen Ejecutivo

| Servicio | Cantidad | Costo Est. Mensual |
|----------|----------|-------------------|
| S3 Buckets | 2 | ~$5 |
| CloudFront | 3 | ~$30 |
| ECS Clusters | 2 (0 tareas activas) | ~$0 |
| RDS Instances | 1 (db.r6g.large) | ~$150 |
| ElastiCache Redis | 2 (cache.t3.medium) | ~$80 |
| EC2 Instances | 0 | $0 |
| Load Balancers | 1 (ALB interno) | ~$20 |
| Lambda Functions | 4 (Amplify) | ~$0 |
| Route53 Zones | 6 | ~$5 |
| ACM Certificates | 5 (1 valid, 4 failed) | $0 |
| **TOTAL ESTIMADO** | | **~$290/mes** |

---

## S3 Buckets (2)

| Bucket | Creado | Uso |
|--------|--------|-----|
| `pqnc-qa-ai-frontend` | 2025-10-07 | Frontend hosting (ai.vidavacations.com) |
| `amplify-amplify44b4b0f9b7de4-staging-e21af-deployment` | 2025-11-04 | Amplify deployment artifacts |

---

## CloudFront Distributions (3)

| ID | Dominio | Alias | Origin | Estado |
|----|---------|-------|--------|--------|
| `E19ZID7TVR08JG` | `d3m6zgat40u0u1.cloudfront.net` | `ai.vidavacations.com` | `glsmifhkoaifvaegsozd.supabase.co` | Deployed |
| `EX8VQ3ZURB53T` | `dnw5j599cmiad.cloudfront.net` | `n8n.vidavacations.com` | `n8n-alb-226231228.us-west-2.elb.amazonaws.com` | Deployed |
| `E2O0E82C64Y0YI` | `d2bxqn3xh4v4kj.cloudfront.net` | (ninguno) | `supabase-studio-alb-1499081913.us-west-2.elb.amazonaws.com` | Deployed |

**NOTA**: Las distribuciones N8N y Supabase apuntan a ALBs que ya no existen en el inventario actual.

---

## ECS (Elastic Container Service)

### Clusters (2)

| Cluster | Servicios | Estado |
|---------|-----------|--------|
| `n8n-production` | 1 (`n8n-service`) | Activo (escalado a 0) |
| `test-mcp-cluster` | 0 | Vacio (candidato a eliminar) |

### Servicios

| Servicio | Cluster | Launch Type | Desired | Running | Task Def |
|----------|---------|-------------|---------|---------|----------|
| `n8n-service` | `n8n-production` | FARGATE | **0** | **0** | `n8n-production:15` |

**NOTA**: N8N migrado a Railway. ECS escalado a 0.

---

## RDS (Relational Database Service) (1)

| Instancia | Motor | Clase | Storage | Multi-AZ | Estado | Endpoint |
|-----------|-------|-------|---------|----------|--------|----------|
| `n8n-postgres` | PostgreSQL | `db.r6g.large` | 100 GB | No | Available | `n8n-postgres.c9memqg6633m.us-west-2.rds.amazonaws.com` |

---

## ElastiCache Redis (2)

| Cluster ID | Motor | Node Type | Nodos | Estado |
|------------|-------|-----------|-------|--------|
| `n8n-redis-001` | redis | `cache.t3.medium` | 1 | Available |
| `n8n-redis-new-001` | redis | `cache.t3.medium` | 1 | Available |

**NOTA**: Verificar si ambos Redis son necesarios dado que N8N esta en Railway.

---

## EC2 Instances

**Ninguna.** La cuenta usa Fargate para ECS, no EC2.

---

## VPCs (3)

| VPC ID | Nombre | CIDR | Default |
|--------|--------|------|---------|
| `vpc-05eb3d8651aff5257` | `n8n-vpc` | 10.0.0.0/16 | No |
| `vpc-08657e71be805f364` | `Supabase/VPC` | 10.0.0.0/16 | No |
| `vpc-0cf523f0e3b67a709` | (default) | 172.31.0.0/16 | Si |

---

## Security Groups (11)

| SG ID | Nombre | VPC | Uso |
|-------|--------|-----|-----|
| `sg-096f0c9e3a6c431f7` | `supabase-alb-sg` | n8n-vpc | Supabase ALB |
| `sg-0e42c24bb441f3a65` | `supabase-services-sg` | n8n-vpc | Supabase ECS services |
| `sg-08ef5f1100614972d` | `n8n-rds-sg` | n8n-vpc | n8n PostgreSQL |
| `sg-02ed0ff6e803361d2` | `supabase-db-sg` | n8n-vpc | Supabase Aurora |
| `sg-076141f63bc5b0bed` | `supabase-oficial-sg` | default | Supabase oficial |
| `sg-0f380214a8a8b2967` | `n8n-redis-sg` | n8n-vpc | n8n Redis |
| `sg-05e6f96ec42d3b66f` | `default` | default | Default VPC SG |
| `sg-0f4c56e1c7f865c0f` | `supabase-marketplace-sg` | n8n-vpc | Supabase Marketplace |
| `sg-0cc68791c7642c92a` | `default` | Supabase/VPC | Default SG |
| `sg-0df002a890cb50a80` | `default` | n8n-vpc | Default SG |
| `sg-0b55624960dfb61be` | `n8n-app-sg` | n8n-vpc | n8n app (VAPI optimized) |

---

## Route53 Hosted Zones (6)

| Zone ID | Dominio | Records | Tipo |
|---------|---------|---------|------|
| `Z05991931MBGUXOLH9HO2` | `ai.vidanta.com` | 3 | Publico |
| `Z08827553E19II0FRMQIC` | `ai.vidavacations.com` | 4 | Publico |
| `Z08816521STA0HM2PS0Z3` | `n8n.vidavacations.com` | 4 | Publico |
| `Z08814962G9XHILCHM6L3` | `dev.vidavacations.com` | 2 | Publico |
| `Z08126522Y634TWDN2YIB` | `supabase.internal` | 3 | Privado |
| `Z07941401XMNXNNSYVUC8` | `supabase.local` | 2 | Privado |

---

## Lambda Functions (4)

| Funcion | Runtime | Memoria | Timeout | Uso |
|---------|---------|---------|---------|-----|
| `amplify-login-create-auth-challenge-7a378fe6` | nodejs20.x | 256 MB | 15s | Amplify auth |
| `amplify-login-define-auth-challenge-7a378fe6` | nodejs20.x | 256 MB | 15s | Amplify auth |
| `amplify-login-verify-auth-challenge-7a378fe6` | nodejs20.x | 256 MB | 15s | Amplify auth |
| `amplify-login-custom-message-7a378fe6` | nodejs20.x | 256 MB | 15s | Amplify auth |

---

## Load Balancers (1)

| Nombre | DNS | Tipo | Estado | VPC |
|--------|-----|------|--------|-----|
| `n8n-alb-internal` | `internal-n8n-alb-internal-1927483133.us-west-2.elb.amazonaws.com` | ALB | Active | n8n-vpc |

---

## Target Groups (9)

| Nombre | Protocolo | Puerto | Health Check |
|--------|-----------|--------|--------------|
| `n8n-targets` | HTTP | 5678 | `/` |
| `pgmeta-nlb-targets` | TCP | 8080 | - |
| `supabase-kong-targets` | HTTP | 8000 | `/rest` |
| `supabase-pgmeta-nlb-tg` | TCP | 8080 | - |
| `supabase-pgmeta-targets` | HTTP | 8080 | `/` |
| `supabase-postgrest-targets` | HTTP | 3000 | `/` |
| `supabase-studio-targets` | HTTP | 3000 | `/` |
| `supabase-studio-tg` | HTTP | 3000 | `/` |
| `supabase-studio-web-tg` | HTTP | 80 | `/` |

---

## ACM Certificates (5)

| Dominio | Estado | Notas |
|---------|--------|-------|
| `n8n.vidavacations.com` | **ISSUED** | Unico certificado valido |
| `n8n-alb-226231228.us-west-2.elb.amazonaws.com` | FAILED | Limpiar |
| `*.us-west-2.elb.amazonaws.com` | FAILED | Limpiar |
| `supabase.ai.vidanta.com` | FAILED | Limpiar |
| `supabase.ai.vidanta.com` | FAILED | Limpiar (duplicado) |

---

## SQS Queues (1)

| URL | Uso |
|-----|-----|
| `https://sqs.us-west-2.amazonaws.com/307621978585/Supabase-Official-Final-CdnCacheManagerQueue786D7FA2-yhNtTgjNM5Gz` | Supabase CDN cache manager |

---

## CloudWatch Log Groups (63)

**Grupos con datos significativos:**
| Grupo | Bytes | Retention |
|-------|-------|-----------|
| `/ecs/n8n-production` | 15 MB | Sin limite |
| `/ecs/supabase-kong` | 14 MB | Sin limite |
| `/ecs/supabase-postgrest` | 2.7 MB | Sin limite |
| `/ecs/postgrest-official` | 2.6 MB | Sin limite |

**58 grupos adicionales** con <500KB cada uno. Mayoria son intentos iterativos de setup de Supabase (studio-fixed, studio-final, pgmeta-*, etc). Candidatos a limpieza.

---

## IAM Users (1)

| Usuario | Creado |
|---------|--------|
| `darigrosales` | 2025-10-03 |

---

## Oportunidades de Optimizacion

1. **Eliminar recursos huerfanos**: test-mcp-cluster, target groups sin uso, 4 ACM certs failed
2. **Configurar retention en log groups**: 63 grupos sin retention policy
3. **Evaluar Redis**: 2 clusters Redis pero N8N en Railway - posible ahorro ~$80/mes
4. **Evaluar RDS**: db.r6g.large corriendo pero ECS en 0 - verificar si aun se usa
5. **Limpiar CloudFront**: 2 distribuciones apuntan a ALBs inexistentes
