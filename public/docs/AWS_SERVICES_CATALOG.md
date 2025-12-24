# Catálogo de Servicios AWS — PQNC QA AI Platform

**Actualizado:** 2025-12-23  
**Región:** us-west-2 (Oregon)  
**MCP:** `aws-infrastructure`

---

## 📊 Resumen de Infraestructura

| Servicio | Cantidad | Estado |
|----------|----------|--------|
| ECS Clusters | 1+ | Activo |
| RDS Instances | 1+ | Activo |
| S3 Buckets | 3+ | Activo |
| ElastiCache | 1 | Activo |
| CloudFront | 1 | Activo |

---

## 🚀 Servicios ECS

### Comandos disponibles
```
mcp_aws-infrastructure_aws_ecs_list_clusters
mcp_aws-infrastructure_aws_ecs_list_services
mcp_aws-infrastructure_aws_ecs_describe_service
mcp_aws-infrastructure_aws_ecs_scale_service
mcp_aws-infrastructure_aws_ecs_restart_service
mcp_aws-infrastructure_aws_ecs_create_cluster
mcp_aws-infrastructure_aws_ecs_delete_service
mcp_aws-infrastructure_aws_ecs_delete_cluster
```

### Operaciones comunes

#### Listar todos los clusters
```
mcp_aws-infrastructure_aws_ecs_list_clusters
```

#### Ver servicios de un cluster
```
mcp_aws-infrastructure_aws_ecs_list_services
  cluster: "nombre-cluster"
```

#### Escalar un servicio
```
mcp_aws-infrastructure_aws_ecs_scale_service
  cluster: "nombre-cluster"
  service: "nombre-servicio"
  desiredCount: 2
```

#### Reiniciar servicio
```
mcp_aws-infrastructure_aws_ecs_restart_service
  cluster: "nombre-cluster"
  service: "nombre-servicio"
```

---

## 🗄️ Servicios RDS

### Comandos disponibles
```
mcp_aws-infrastructure_aws_rds_list_instances
mcp_aws-infrastructure_aws_rds_describe_instance
mcp_aws-infrastructure_aws_rds_start_instance
mcp_aws-infrastructure_aws_rds_stop_instance
mcp_aws-infrastructure_aws_rds_reboot_instance
mcp_aws-infrastructure_aws_rds_create_snapshot
mcp_aws-infrastructure_aws_rds_create_instance
mcp_aws-infrastructure_aws_rds_delete_instance
```

### Operaciones comunes

#### Listar instancias
```
mcp_aws-infrastructure_aws_rds_list_instances
```

#### Crear snapshot
```
mcp_aws-infrastructure_aws_rds_create_snapshot
  dbInstanceIdentifier: "nombre-instancia"
  snapshotIdentifier: "snapshot-2025-12-23"
```

---

## 📦 Servicios S3

### Comandos disponibles
```
mcp_aws-infrastructure_aws_s3_list_buckets
```

### Buckets conocidos
- `pqnc-frontend` - Frontend estático
- `pqnc-assets` - Assets y media
- `pqnc-backups` - Backups

---

## 📈 CloudWatch

### Comandos disponibles
```
mcp_aws-infrastructure_aws_cloudwatch_get_metrics
mcp_aws-infrastructure_aws_logs_get_logs
```

### Obtener métricas
```
mcp_aws-infrastructure_aws_cloudwatch_get_metrics
  namespace: "AWS/ECS"
  metricName: "CPUUtilization"
  dimensions: [{"Name": "ClusterName", "Value": "mi-cluster"}]
  hours: 24
```

### Obtener logs
```
mcp_aws-infrastructure_aws_logs_get_logs
  logGroupName: "/ecs/mi-servicio"
  limit: 100
```

---

## 🔥 ElastiCache

### Comandos disponibles
```
mcp_aws-infrastructure_aws_elasticache_list_clusters
mcp_aws-infrastructure_aws_elasticache_describe_cluster
mcp_aws-infrastructure_aws_elasticache_reboot_cluster
```

---

## 💰 Utilidades

### Resumen de infraestructura
```
mcp_aws-infrastructure_aws_get_infrastructure_summary
```

### Estimación de costos
```
mcp_aws-infrastructure_aws_get_cost_estimation
```

---

## 🔒 Seguridad

### Comandos de red
```
mcp_aws-infrastructure_aws_ec2_list_instances
mcp_aws-infrastructure_aws_ec2_describe_vpcs
mcp_aws-infrastructure_aws_ec2_describe_security_groups
```

---

## ⚠️ Precauciones

### 🔴 Operaciones de ALTO RIESGO
- `delete_cluster` - Elimina un cluster ECS
- `delete_service` - Elimina un servicio
- `delete_instance` - Elimina instancia RDS
- `stop_instance` - Detiene RDS (afecta producción)

### ✅ Operaciones SEGURAS
- `list_*` - Solo lectura
- `describe_*` - Solo lectura
- `get_metrics` - Solo lectura
- `create_snapshot` - Crea backup sin afectar operación

### 🟡 Operaciones de PRECAUCIÓN
- `scale_service` - Cambiar capacidad (verificar antes)
- `restart_service` - Reinicia tareas (breve downtime)
- `reboot_instance` - Reinicia RDS (downtime)

---

## 📋 Checklist pre-operación

Antes de ejecutar operaciones que afecten producción:

- [ ] Verificar que es el recurso correcto
- [ ] Crear snapshot/backup si aplica
- [ ] Notificar al equipo si hay downtime
- [ ] Tener plan de rollback
- [ ] Documentar el cambio en AWS_CHANGELOG.md

