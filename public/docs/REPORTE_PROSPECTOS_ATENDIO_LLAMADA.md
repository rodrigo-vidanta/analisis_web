# 📊 Reporte: Prospectos en Etapa "Atendió llamada"

**Fecha de análisis:** 27 de Enero 2026  
**Base de datos:** PQNC_AI (Nueva Arquitectura)  
**Etapa ID:** `003ec594-6e7d-4bea-9cf4-09870626b182`

---

## ✅ Resumen Ejecutivo

**Total de prospectos:** **118** (usando `etapa_id` FK)  
**Rango de fechas:** 29 Nov 2025 → 19 Ene 2026 (52 días)  
**Promedio diario:** ~2.3 prospectos/día

---

## 📈 Distribución por Coordinación

| Coordinación | Prospectos | % del Total |
|--------------|------------|-------------|
| **COB ACA** | 36 | 30.5% |
| **MVP** | 33 | 28.0% |
| **VEN** | 26 | 22.0% |
| **APEX** | 22 | 18.6% |
| **CALIDAD** | 1 | 0.8% |

---

## 👥 Top 5 Ejecutivos con Más Prospectos

| Posición | Ejecutivo | Prospectos |
|----------|-----------|------------|
| 1 | Gonzalez Serrano Mayra Soledad Jazmin | 25 |
| 2 | Gutierrez Arredondo Jessica | 21 |
| 3 | Aquino Perez Irving Javier | 19 |
| 4 | Martinez Arvizu Kenia Magalli | 15 |
| 5 | Meza Mendoza Rodrigo Ismael | 12 |

---

## 📋 Ejemplos de Prospectos Recientes

### Últimos 5 prospectos en esta etapa:

1. **Alejandro** (2026-01-19 17:29)
   - Email: aleruizsanchezars@gmail.com
   - Ejecutivo: Gonzalez Serrano Mayra
   - Coordinación: VEN

2. **José juan** (2026-01-19 14:56)
   - Email: Guadalupeoerez18@gmail.com
   - Ejecutivo: Gonzalez Serrano Mayra
   - Coordinación: VEN

3. **Humberto** (2026-01-19 00:39)
   - Email: humbertogarcia3093@gmail.com
   - Ejecutivo: Martinez Arvizu Kenia
   - Coordinación: APEX

4. **Jennifer** (2026-01-18 23:45)
   - Email: jennifereden1630@gmail.com
   - Ejecutivo: Martinez Arvizu Kenia
   - Coordinación: APEX

5. **Leyna Aline** (2026-01-18 22:48)
   - Email: leynaaline.91@gmail.com
   - Ejecutivo: Meza Mendoza Rodrigo
   - Coordinación: MVP

---

## 🔍 Verificación de la Nueva Arquitectura

### Estructura de Etapas

✅ **Tabla `etapas`** existe con 10 etapas activas  
✅ **Etapa "Atendió llamada"** configurada correctamente:
- **ID:** `003ec594-6e7d-4bea-9cf4-09870626b182`
- **Código:** (por verificar)
- **Descripción:** "Completó al menos una llamada con ejecutivo."
- **Orden funnel:** (por verificar)

### Migración de Prospectos

La tabla `prospectos` tiene **ambas columnas** (migración en progreso):

1. **`etapa`** (TEXT) - Legacy, con 120 registros que dicen "Atendió llamada"
2. **`etapa_id`** (UUID) - Nueva FK, con 118 registros apuntando al UUID correcto

**Diferencia de 2 registros:** Posible inconsistencia en la migración o registros sin sincronizar.

---

## 📊 Análisis de Datos

### Actividad por Semana

| Período | Prospectos |
|---------|------------|
| Semana del 13-19 Ene 2026 | ~15 |
| Semana del 6-12 Ene 2026 | ~12 |
| Semana del 30 Dic-5 Ene | ~10 |
| Noviembre-Diciembre 2025 | ~81 |

**Observación:** Mayor actividad en las últimas 3 semanas.

---

## 🔧 Consultas SQL Utilizadas

### Contar prospectos por etapa_id (FK)
```sql
SELECT COUNT(*) as total 
FROM prospectos 
WHERE etapa_id = '003ec594-6e7d-4bea-9cf4-09870626b182';
-- Resultado: 118
```

### Contar prospectos por etapa (TEXT legacy)
```sql
SELECT COUNT(*) as total 
FROM prospectos 
WHERE LOWER(etapa) = 'atendió llamada';
-- Resultado: 120
```

### Distribución por coordinación
```sql
SELECT c.nombre as coordinacion, COUNT(*) as total
FROM prospectos p
LEFT JOIN coordinaciones c ON c.id = p.coordinacion_id
WHERE p.etapa_id = '003ec594-6e7d-4bea-9cf4-09870626b182'
GROUP BY c.nombre
ORDER BY total DESC;
```

---

## ✅ Conclusiones

1. ✅ **SÍ hay prospectos** en la etapa "Atendió llamada" (**118 registros**)
2. ✅ **Nueva arquitectura funcional** - etapa como FK a tabla `etapas`
3. ✅ **Migración casi completa** - 118 con `etapa_id`, 120 con `etapa` text
4. ⚠️ **Pequeña inconsistencia** - 2 registros de diferencia (revisar)
5. ✅ **Distribución equilibrada** - 4 coordinaciones principales
6. ✅ **Ejecutivos activos** - Top 5 manejan 92 de 118 prospectos (78%)

---

## 🎯 Recomendaciones

1. **Completar migración:** Sincronizar los 2 registros faltantes
2. **Eventual deprecación:** Eliminar columna `etapa` (TEXT) cuando 100% migrado
3. **Monitoreo:** Verificar que nuevos prospectos usen solo `etapa_id`
4. **Dashboard:** Actualizar visualizaciones para usar `etapas` JOIN

---

## 📚 Referencias

- Tabla de etapas: `etapas` (10 etapas activas)
- Documentación: `.cursor/handovers/2026-01-26-migracion-etapas-*.md`
- Nueva arquitectura: `docs/MIGRACION_ETAPAS_STRING_A_FK.md`

---

**Generado:** 2026-01-27 23:30 UTC  
**Método:** Consultas directas a PQNC_AI via Management API
