# 📊 Módulo de Análisis de Llamadas

## Resumen Ejecutivo

### ¿Qué estamos usando?

**Descripción técnica simplificada:** Sistema completo de análisis de llamadas de ventas desarrollado como aplicación web moderna. La arquitectura aprovecha tecnologías open source y servicios cloud gratuitos para minimizar costos operativos mientras mantiene funcionalidad empresarial.

### Stack Tecnológico

- **🔧 Lenguajes**: TypeScript (JavaScript tipado) para desarrollo más robusto
- **⚛️ Frontend**: React con hooks modernos para interfaces dinámicas
- **📊 Gráficos**: Chart.js (librería gratuita) para visualizaciones interactivas
- **☁️ Base de Datos**: Supabase (servicio gratuito hasta 2GB) como backend
- **🎨 Diseño**: Tailwind CSS (framework gratuito) para UI profesional
- **📱 Gestión de Estado**: Zustand (alternativa ligera y gratuita a Redux)

### Recursos Open Source y Gratuitos

1. **Supabase** - Backend-as-a-Service con tier gratuito (2GB por proyecto)
2. **Chart.js** - Librería de visualización de datos empresarial
3. **Tailwind CSS** - Framework CSS utility-first sin restricciones
4. **TypeScript** - Superset de JavaScript con tipado estático
5. **React** - Librería de UI declarativa y component-based

---

## 🏗️ Arquitectura del Sistema

### Estructura de Componentes

```
src/components/analysis/
├── AnalysisDashboard.tsx      # Dashboard principal (Natalia)
├── PQNCDashboard.tsx          # Dashboard PQNC Humans
├── DetailedCallView.tsx       # Vista detallada de llamadas
├── ponderacionConfig.ts       # Configuración de pesos y scoring
└── backup/                    # Archivos de respaldo
```

### Bases de Datos Conectadas

1. **Analysis DB** (Natalia): `glsmifhkoaifvaegsozd.supabase.co`
2. **PQNC-QA DB** (Humans): `hmmfuhqgvsehkizlfzga.supabase.co`

---

## 🎯 Funcionalidades Principales

### 1. Dashboard Dual de Análisis

**Selector de Análisis:**
- **Natalia Logs**: Análisis de agente virtual especializado en detección de temperatura de prospectos
- **PQNC Humans**: Análisis completo de llamadas de agentes humanos

### 2. Dashboard de Natalia (Agente Virtual)

**Características:**
- **Búsqueda inteligente** por Call ID
- **Filtros avanzados** por fecha, score, categoría, nivel de interés
- **Scoring inteligente** adaptado a la filosofía de transferencia temprana
- **Vista de últimos registros** (10, 20, 50, 100)
- **Análisis visual** con gráfico radar animado

**Scoring Inteligente de Natalia:**
```typescript
// Principio: Detectar temperatura y transferir óptimamente
// NO completar todos los checkpoints innecesariamente
adjustScoreForIntelligentTransfer(record: AnalysisRecord): number {
  // Bonificaciones por transferencias inteligentes
  // Penalizaciones por sobre-procesamiento
}
```

### 3. Dashboard PQNC Humans (Análisis Profesional)

**Funcionalidades Avanzadas:**
- **Sistema de ponderación configurable** con 8 categorías de peso
- **Widgets modulares** habilitables/deshabilitables
- **Filtros múltiples apilables**:
  - Tipo de llamada (6 tipos diferentes)
  - Dirección (Inbound/Outbound) 
  - Calidad de cliente (Elite, Premium, Reto)
- **Búsqueda inteligente** basada en patrones de texto
- **Controles de registros** (Top 10, 30, 50)

**Sistema de Ponderación:**
```typescript
interface PonderacionConfig {
  qualityScorePesos: Record<string, number>;     // Pesos base
  resultadoBonus: Record<string, number>;        // Bonus por resultado
  tipoLlamadaMultiplicadores: Record<...>;       // Multiplicadores
  agentPerformancePesos: Record<...>;            // Pesos de performance
  ventasConfig: {...};                           // Config específica ventas
}
```

### 4. Vista Detallada de Llamadas (6 Pestañas)

#### 📋 **Análisis Completo**
- **Conversación por turnos** (tipo chat)
- **Segmentos colapsables** con códigos de color por etapa
- **Contexto rápido** cuando están colapsados
- **Gráfico radar verde** de performance del agente
- **Resumen de llamada** extraído automáticamente

#### 📊 **Performance Detallado**
- **Gráfico de barras azul** (diferenciado del radar)
- **Score general** prominente
- **Fortalezas y debilidades** del agente
- **Evaluación detallada** con scroll optimizado

#### 🧪 **Análisis de Script**
- **Etapas de conversación** contabilizadas
- **Análisis FODA** colorizado:
  - Verde: Fortalezas
  - Rojo: Debilidades  
  - Azul: Oportunidades
  - Amarillo: Amenazas
- **Balance FODA** centralizado

#### ⚖️ **Datos de Compliance**
- **Información básica** de la llamada
- **Métricas de calidad** y resultado
- **Datos de compliance** si existen

#### 👤 **Información del Cliente**
- **Datos básicos** (nombre, calidad, organización)
- **Métricas de rapport** (4 indicadores)
- **Datos adicionales** del cliente

#### 💾 **Datos Técnicos**
- **Metadatos visuales** colorizeados
- **JSON completo** estructurado por secciones

---

## 🎨 Diferenciación Visual

### Códigos de Color por Etapa
```typescript
const stageColors = {
  'saludo': 'from-blue-500 to-blue-600',
  'presentacion': 'from-indigo-500 to-indigo-600', 
  'discovery': 'from-green-500 to-green-600',
  'small_talk': 'from-purple-500 to-purple-600',
  'presentacion_costos': 'from-orange-500 to-orange-600',
  'manejo_objeciones': 'from-red-500 to-red-600',
  'cierre': 'from-emerald-500 to-emerald-600',
  'despedida': 'from-slate-500 to-slate-600'
};
```

### Gráficos Diferenciados
- **Summary**: Radar verde con puntos para vista general
- **Performance**: Barras azules verticales para análisis detallado

---

## ⚙️ Configuración Técnica

### Variables de Entorno (Supabase)

**Analysis DB (Natalia):**
```typescript
const analysisSupabaseUrl = 'https://glsmifhkoaifvaegsozd.supabase.co';
const analysisSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIs...';
```

**PQNC-QA DB (Humans):**
```typescript
const pqncSupabaseUrl = 'https://hmmfuhqgvsehkizlfzga.supabase.co';
const pqncSupabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIs...'; // Admin
const pqncSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIs...';      // Normal
```

### Arquitectura de Hooks

**Hooks Organizados:**
```typescript
// ✅ Nivel superior del componente
const performanceCanvasRef = useRef<HTMLCanvasElement>(null);
const summaryCanvasRef = useRef<HTMLCanvasElement>(null);

// ✅ Effects específicos por pestaña
useEffect(() => {
  // Gráfico de barras en Performance
}, [call, activeTab === 'performance']);

useEffect(() => {
  // Gráfico de radar en Summary  
}, [call, activeTab === 'summary']);
```

---

## 📊 Métricas y KPIs

### Scoring de Performance
```typescript
// Cálculo desde datos booleanos
const calculateScore = (category: any) => {
  const booleans = Object.values(category).filter(v => typeof v === 'boolean');
  const trueCount = booleans.filter(Boolean).length;
  return booleans.length > 0 ? (trueCount / booleans.length) * 100 : 0;
};

const performanceScores = {
  cierre: calculateScore(agentPerf.cierreEfectivo),
  proactividad: calculateScore(agentPerf.proactividad), 
  escucha: calculateScore(agentPerf.escuchaActiva),
  informacion: calculateScore(agentPerf.manejoInformacion),
  amabilidad: calculateScore(agentPerf.amabilidadYTono)
};
```

### Algoritmo de Ponderación
```typescript
export function calcularQualityScorePonderado(llamada: any, config: PonderacionConfig): number {
  // 1. Score base de la llamada
  let scorePonderado = llamada.quality_score || 0;
  
  // 2. Aplicar bonus por resultado (+20 venta, -15 no interesado)
  const bonus = resultadoBonus[llamada.call_result] || 0;
  scorePonderado += bonus;
  
  // 3. Factores ponderados por importancia
  const factorAgente = calcularFactorAgente(agentPerf) * 0.25;
  const factorRapport = comunicacion.score_ponderado * 0.15; 
  const factorFoda = evaluacion.balance_foda * 0.10;
  
  // 4. Multiplicadores por tipo de llamada
  scoreConMultiplicadores *= multiplicadores[llamada.call_type];
  
  // 5. Multiplicador por calidad de cliente (Elite +20%, Reto -20%)
  scoreConMultiplicadores *= customerQualityMultiplier;
  
  return Math.max(0, Math.min(100, scoreConMultiplicadores));
}
```

---

## 🚀 Funcionalidades Avanzadas

### 1. Segmentos Colapsables Inteligentes
- **Estado inicial**: Todos colapsados por defecto
- **Contexto visible**: Resumen del segmento cuando está colapsado
- **Códigos de color**: Identificación visual por etapa
- **Expansión dinámica**: Click para ver conversación completa

### 2. Sistema de Búsqueda Inteligente

**⚠️ ACLARACIÓN TÉCNICA**: No es búsqueda vectorial real, sino **búsqueda inteligente basada en patrones**.

#### 🔍 Tipos de Búsqueda Implementados:

**A) Búsqueda Directa en Campos:**
```typescript
// Campos indexados para búsqueda instantánea:
call.id, call.agent_name, call.customer_name, 
call.organization, call.call_type, call.call_result, 
call.customer_quality, call.call_summary
```

**B) Patrones de Lenguaje Natural:**
```javascript
// Ejemplos de uso inteligente:
"ventas exitosas" → Filtra result="venta_exitosa"
"clientes elite" → Filtra quality="Q_ELITE" 
"llamadas largas" → Filtra duration > 300 seg
"problemas" → Filtra quality="Q_RETO"
"no interesado" → Filtra result="no_interesado"
```

**C) Búsqueda en Contenido:**
- Resúmenes de llamadas (campo `call_summary`)
- Coincidencias parciales con `String.includes()`

#### 🛠️ Implementación Técnica:
```typescript
const performIntelligentSearch = (query: string, calls: CallRecord[]) => {
  const searchTerm = query.toLowerCase().trim();
  
  // 1. Matches directos en campos
  const directMatches = calls.filter(call => /* campos principales */);
  
  // 2. Matches en summaries  
  const summaryMatches = calls.filter(call => /* call_summary */);
  
  // 3. Patterns de lenguaje natural
  const naturalMatches = calls.filter(call => /* detectPatterns */);
  
  // 4. Combinar sin duplicados
  return [...new Set([...directMatches, ...summaryMatches, ...naturalMatches])];
};
```

#### ⚡ Performance:
- **Complejidad**: O(n) linear search
- **Eficiencia**: Ideal para datasets < 10,000 registros
- **Sin dependencias**: JavaScript nativo, sin librerías externas
- **Extensible**: Fácil agregar nuevos patrones

#### 🔮 Upgrade a Búsqueda Vectorial Real:
Para implementar búsqueda vectorial verdadera se necesitaría:
1. **Embeddings**: OpenAI API o Sentence Transformers
2. **Vector DB**: Pinecone, Weaviate, o Supabase pgvector
3. **Indexación**: Procesar transcripciones completas
4. **Costos**: ~$0.0001 por 1K tokens (OpenAI embeddings)

### 3. Sistema de Filtros Apilables
```typescript
// Los filtros se combinan automáticamente
const filteredCalls = calls.filter(call => {
  return (
    // Filtro por tipo de llamada
    (!callTypeFilter.length || callTypeFilter.includes(call.call_type)) &&
    // Filtro por dirección  
    (!directionFilter || call.direction === directionFilter) &&
    // Filtro por calidad de cliente
    (!customerQualityFilter || call.customer_quality === customerQualityFilter) &&
    // Filtro por búsqueda general
    (!searchTerm || matchesSearch(call, searchTerm))
  );
});
```

### 3. Búsqueda Vectorial en Chunks
```sql
-- La BD ya tiene chunks vectorizados para búsqueda semántica
SELECT * FROM call_segments 
WHERE call_id = $1 
AND to_tsvector('spanish', text) @@ plainto_tsquery('spanish', $2);
```

---

## 🔧 Optimizaciones de Performance

### 1. Canvas Management
```typescript
// Destrucción correcta de gráficos antes de crear nuevos
if (chartRefs.current['performance']) {
  chartRefs.current['performance']?.destroy();
}

// Animaciones optimizadas
options: {
  animation: {
    duration: 2000,
    easing: 'easeInOutQuart' 
  }
}
```

### 2. Lazy Loading de Datos
```typescript
// Solo cargar datos cuando la pestaña está activa
useEffect(() => {
  if (activeTab === 'performance' && performanceCanvasRef.current) {
    // Crear gráfico solo si es necesario
  }
}, [call, activeTab]);
```

### 3. Estado Eficiente
```typescript
// Zustand para estado global mínimo
interface AppState {
  appMode: 'constructor' | 'admin' | 'analysis';
  setAppMode: (mode: AppMode) => void;
}

// Estado local para UI específica
const [collapsedSegments, setCollapsedSegments] = useState<Set<string>>(new Set());
```

---

## 📱 Diseño Responsive

### Breakpoints Optimizados
```css
/* Mobile First Design */
.grid-cols-1 md:grid-cols-2 lg:grid-cols-3  /* Grids adaptativos */
.w-full max-w-7xl                           /* Contenedores responsivos */
.max-h-[90vh]                               /* Altura máxima de modales */
.overflow-y-auto                            /* Scroll automático */
```

### Componentes Adaptativos
- **Dashboard**: Grid responsive que se adapta desde 1 a 5 columnas
- **Filtros**: Colapsables en móvil, expandidos en desktop
- **Gráficos**: Mantienen proporciones en cualquier pantalla
- **Tablas**: Scroll horizontal en pantallas pequeñas

---

## 🛠️ Herramientas de Desarrollo

### Scripts de Package.json
```json
{
  "scripts": {
    "dev": "vite",              // Servidor de desarrollo
    "build": "tsc -b && vite build",  // Build de producción
    "lint": "eslint .",         // Linting automático
    "preview": "vite preview"   // Preview del build
  }
}
```

### Dependencias Clave
```json
{
  "@supabase/supabase-js": "^2.57.0",  // Cliente Supabase
  "chart.js": "^4.5.0",               // Gráficos interactivos
  "react": "^19.1.1",                 // React versión LTS
  "tailwindcss": "^3.5.7",            // Framework CSS
  "typescript": "~5.8.0",             // Tipado fuerte
  "zustand": "^5.0.8"                 // Estado global
}
```

---

## 🔍 Casos de Uso Principales

### 1. Análisis de Agente Virtual (Natalia)
**Objetivo**: Optimizar las transferencias inteligentes
- Detectar temperatura del prospecto
- Transferir en el momento óptimo  
- Evitar sobre-procesamiento de leads calientes
- Priorizar handoff humano para ventas

### 2. Análisis de Agentes Humanos (PQNC)
**Objetivo**: Mejorar performance y conversiones
- Evaluar técnicas de venta por etapa
- Identificar fortalezas y debilidades
- Optimizar scripts por tipo de llamada
- Calcular probabilidad de conversión

### 3. Supervisión y QA
**Objetivo**: Control de calidad en tiempo real
- Monitorear compliance en llamadas
- Revisar transcripciones con hitos clave
- Generar reportes de performance
- Identificar oportunidades de entrenamiento

---

## 📈 Roadmap Futuro

### Funcionalidades Planificadas
1. **🤖 IA Predictiva**: Predicción de resultados en tiempo real
2. **📊 Dashboards Personalizables**: Widgets arrastrables por usuario
3. **🔔 Alertas Inteligentes**: Notificaciones por performance crítico
4. **📱 App Móvil**: Dashboard nativo para supervisores
5. **🎯 A/B Testing**: Comparación de scripts y técnicas

### Optimizaciones Técnicas
1. **⚡ Server-Side Rendering**: Para mejor SEO y performance
2. **🗄️ Caching Inteligente**: Redis para consultas frecuentes  
3. **📡 WebSockets**: Updates en tiempo real
4. **🔐 Autenticación Avanzada**: SSO y roles granulares

---

## 💡 Consideraciones de Negocio

### Estructura de Costos
- **Base de Datos**: Supabase tier gratuito (2GB/proyecto)
- **Hosting**: Plataformas JAMstack gratuitas (Vercel/Netlify)
- **CDN**: Red de distribución incluida sin costo adicional
- **Monitoreo**: Herramientas de observabilidad en tier gratuito

### Escalabilidad Técnica
- **Horizontal**: Arquitectura multi-proyecto para crecimiento
- **Vertical**: Upgrade path definido con costos predecibles
- **Performance**: CDN global y optimizaciones frontend

### Valor de Negocio
- **📈 Optimización de conversiones** mediante análisis de patrones
- **⏱️ Automatización de QA** reduciendo intervención manual
- **🎯 Inteligencia de ventas** con scoring algorítmico
- **💰 Reducción de OPEX** vs. soluciones comerciales

---

*Documentación generada para el módulo de análisis de llamadas - Versión 1.0*
