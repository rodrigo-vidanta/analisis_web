# Bulk Import System - Arquitectura propuesta

> **Fecha**: 2026-02-18
> **Estado**: Propuesta (no implementado)
> **Objetivo**: Importar 10K-100K registros CSV a Supabase con resiliencia total

---

## Decision de diseno

Se evaluaron 3 opciones:
1. Frontend → Edge Function → Webhook N8N → BD
2. Frontend → Storage Bucket → Edge Function → BD
3. Frontend → Edge Function → BD (batches)

**Seleccionada: Opcion 3.** El frontend parsea el CSV, envia batches de 1,000 registros a una Edge Function que valida e inserta con `service_role`. Sin timeout risk, con progreso granular y persistencia ante crashes.

---

## Arquitectura: 5 componentes

### 1. Web Worker (parseo CSV)

- Archivo `.worker.ts` separado del hilo principal
- Parsea CSV completo sin bloquear UI
- Al terminar, envia registros parseados al store
- Los registros se persisten en IndexedDB (no el archivo crudo)
- Despues de persistir, el archivo original ya no se necesita

### 2. IndexedDB (persistencia ante crashes)

Esquema por importacion:

```
importId: string              // UUID unico
records: object[]             // Todos los registros parseados
totalRecords: number
batchSize: number             // Default: 1,000
completedBatches: Set<number> // Indices de batches exitosos
failedBatches: Map<number, { error: string, attempts: number }>
targetTable: string           // Tabla destino en Supabase
startedAt: string             // ISO timestamp
status: 'parsing' | 'importing' | 'paused' | 'completed' | 'error'
```

Comportamiento al recargar app:
- Store revisa IndexedDB por importaciones con status `importing` o `paused`
- Si encuentra, muestra dialogo: "Importacion pendiente (X/Y). Continuar?"
- Si acepta, retoma desde ultimo batch completado
- No requiere re-seleccionar archivo

### 3. Motor de importacion (orquestador)

Configuracion:

| Parametro | Valor | Razon |
|---|---|---|
| Batch size | 1,000 | ~500KB payload, balance llamadas vs tamaño |
| Concurrencia | 3 batches simultaneos | Aprovecha red sin saturar Edge Function |
| Max reintentos | 3 por batch | Evita loops infinitos |
| Backoff | 1s → 2s → 4s | Exponencial entre reintentos |
| Timeout por batch | 30s | Si no responde, cuenta como fallo |

Ciclo de vida de un batch:
```
Pendiente → En vuelo → Completado
                ↓
            Fallido → Reintento 1 → Reintento 2 → Reintento 3 → Fallido permanente
```

Manejo de conexion:

| Evento | Accion |
|---|---|
| `navigator.onLine` → false | Pausa automatica, guarda estado en IndexedDB |
| `navigator.onLine` → true | Reanuda desde ultimo batch exitoso |
| Timeout en batch | Marca fallido, continua con siguiente, reintenta al final |
| Error 500 de Edge Function | Reintento con backoff |
| Error 400 (datos invalidos) | Fallido permanente, no reintenta |
| `visibilitychange` (tab pierde foco) | Sigue ejecutando, no pausa |
| Usuario cierra tab / crash / reinicio | Estado en IndexedDB, retoma al volver |

### 4. Zustand Store (estado global)

- Store dedicado para importacion, accesible desde cualquier modulo
- Estado en memoria sincronizado con IndexedDB
- Expone: `progress`, `status`, `errors`, `pause()`, `resume()`, `cancel()`, `retryFailed()`
- El motor de importacion se inicia y controla desde este store

### 5. Edge Function (backend)

Recibe:
```json
{
  "table": "string (lista blanca)",
  "records": "object[] (max 1,000)",
  "importId": "string (trazabilidad)",
  "batchIndex": "number (idempotencia)"
}
```

Proceso:
1. Valida que `table` este en lista blanca de tablas permitidas
2. Valida JWT del usuario (autenticacion)
3. Valida esquema de registros contra columnas esperadas
4. Inserta con `service_role` (bypass RLS para velocidad)
5. Retorna `{ inserted: number, errors: string[] }`

Seguridad:
- Lista blanca de tablas (rechaza tablas no autorizadas)
- JWT obligatorio (solo usuarios autenticados)
- `service_role` nunca sale del servidor
- Sanitizacion de datos antes de insert

---

## UI: Barra flotante de progreso

Ubicacion: esquina inferior derecha del layout principal, fuera de cualquier modulo. Componente fijo, z-index alto, no se oculta al navegar.

Estados visuales:

| Estado | Apariencia |
|---|---|
| Parseando | Barra indeterminada + "Preparando archivo..." |
| Importando | Barra con % + registros + ETA |
| Pausado | Barra amarilla + motivo (sin internet / manual) |
| Completado | Barra verde + total importado (se oculta en 10s) |
| Completado con errores | Barra naranja + importados/fallidos + "Ver detalle" |
| Error fatal | Barra roja + mensaje + "Reintentar" |

Progreso:
```
progress = completedBatches / ceil(totalRecords / batchSize) × 100
eta = batchesRestantes / (completedBatches / tiempoTranscurrido)
```

Botones: Pausar, Reanudar, Cancelar (con confirmacion), Ver detalle, Reintentar fallidos.

---

## Reporte final al usuario

Al completar importacion:

```
Total registros:     78,000
Insertados:          76,500  (98.1%)
Fallidos:             1,500  (1.9%)

Errores frecuentes:
  - "duplicate key constraint" → 1,200
  - "value too long for column X" → 300

[Descargar fallidos como CSV]  [Reintentar fallidos]
```

El CSV de fallidos incluye cada registro + su error, para correccion y reimportacion.

---

## Resiliencia - resumen

| Escenario | Resultado |
|---|---|
| Internet cae | Pausa, reanuda al reconectar |
| Cierra tab | Retoma al volver (IndexedDB) |
| Browser crash | Retoma al volver (IndexedDB) |
| PC reinicia | Retoma al volver (IndexedDB) |
| Edge Function falla | Reintento x3 con backoff |
| Datos invalidos en batch | Marca fallido, continua con los demas |
| Navega a otro modulo | Importacion sigue en background |
| Reimporta mismo archivo | Detecta duplicado, pregunta si reimportar |

---

## Seguridad

- HTTPS/TLS en todos los tramos (browser → Edge Function → BD)
- JWT obligatorio para llamar Edge Function
- `service_role` solo en Edge Function (server-side)
- `anon_key` en frontend (publica por diseno de Supabase)
- Lista blanca de tablas en Edge Function
- Validacion de esquema server-side antes de insert
- Datos encriptados en transito, nunca en texto plano
