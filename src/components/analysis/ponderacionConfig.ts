// CONFIGURACIÓN DE PESOS Y PARÁMETROS PARA ANÁLISIS DE LLAMADAS - VERSIÓN OPTIMIZADA
// Este archivo define todos los factores de evaluación para adaptarlos a diferentes tipos de llamadas y prioridades de negocio.
// MEJORAS APLICADAS:
// - Pesos ajustados para reflejar prioridades de ventas
// - Mayor énfasis en conversión y manejo de objeciones
// - Penalizaciones más severas para resultados negativos
// - Multiplicadores diferenciados por tipo de llamada

export interface PonderacionConfig {
  qualityScorePesos: Record<string, number>;
  resultadoBonus: Record<string, number>;
  tipoLlamadaMultiplicadores: Record<string, Record<string, number>>;
  agentPerformancePesos: Record<string, number>;
  scriptFactorPesos: Record<string, number>;
  umbralDesempeño: Record<string, number>;
  rapportPesos: Record<string, number>;
  objecionesPesos: Record<string, number>;
  ventasConfig: {
    factoresCriticosPorEtapa: Record<string, string[]>;
    probabilidadConversionPesos: Record<string, number>;
    multiplicadoresCustomerQuality: Record<string, number>;
  };
}

export function definirConfiguracion(): PonderacionConfig {
  // ===== CONFIGURACIÓN DE PESOS PARA EL QUALITY SCORE GLOBAL =====
  // Ajustados para priorizar factores que impactan directamente en ventas
  const qualityScorePesos = {
    // Manejo de objeciones es crítico en ventas
    manejoObjeciones: 0.30,    // Aumentado de 0.20
    // Habilidades del agente - segundo factor más importante
    agentPerformance: 0.25,    // Sin cambio
    // Calidad del script - importante pero no crítico
    scriptQuality: 0.15,       // Reducido de 0.20
    // Rapport - fundamental para ventas consultivas
    rapportEfectividad: 0.15,  // Aumentado de 0.10
    // Análisis FODA - indicador de oportunidades
    balanceFoda: 0.10,         // Reducido de 0.15
    // Compliance - importante pero no determinante
    compliance: 0.05           // Reducido de 0.10
  };

  // ===== BONUS POR TIPO DE RESULTADO - MÁS DIFERENCIADOS =====
  const resultadoBonus = {
    "venta_concretada": 20,              // Aumentado de 15
    "seguimiento_programado": 3,         // Reducido de 5
    "informacion_proporcionada": 0,      // Nuevo: neutral
    "no_interesado": -15,                // Aumentado de -10
    "no_califica": -8,                   // Nuevo
    "objecion_no_superada": -12,         // Nuevo
    "abandonada": -20,                   // Nuevo
    "transferida": -5                    // Nuevo
  };

  // ===== PERSONALIZACIÓN POR TIPO DE LLAMADA =====
  const tipoLlamadaMultiplicadores = {
    // Primer contacto: énfasis en rapport y discovery
    "primer_contacto": {
      rapportEfectividad: 1.4,      // Aumentado de 1.3
      scriptQuality: 1.1,           // Reducido de 1.2
      manejoObjeciones: 0.8,        // Reducido de 0.9
      agentPerformance: 1.2         // Nuevo
    },
    // Seguimiento: conversión es clave
    "seguimiento": {
      rapportEfectividad: 0.8,      // Reducido de 0.9
      manejoObjeciones: 1.5,        // Aumentado de 1.4
      balanceFoda: 1.1,             // Reducido de 1.2
      agentPerformance: 1.3         // Nuevo
    },
    // Venta concretada: enfoque en cierre
    "venta_concretada": {
      compliance: 1.8,              // Nuevo
      scriptQuality: 1.3,           // Nuevo
      manejoObjeciones: 1.2,        // Nuevo
      agentPerformance: 1.4         // Nuevo
    },
    // Confirmación: compliance crítico
    "confirmacion_reserva": {
      compliance: 2.0,              // Aumentado de 1.5
      scriptQuality: 1.1,           // Reducido de 1.2
      manejoObjeciones: 0.6,        // Reducido de 0.8
      rapportEfectividad: 0.9       // Nuevo
    },
    // Servicio postventa: satisfacción del cliente
    "servicio_postventa": {
      compliance: 1.6,              // Aumentado de 1.5
      rapportEfectividad: 1.3,      // Aumentado de 1.2
      balanceFoda: 0.7,             // Reducido de 0.8
      agentPerformance: 1.1         // Nuevo
    },
    // Cancelación: retención es clave
    "cancelacion": {
      manejoObjeciones: 1.6,        // Nuevo
      rapportEfectividad: 1.4,      // Nuevo
      agentPerformance: 1.3,        // Nuevo
      compliance: 0.8               // Nuevo
    },
    // Informativa: eficiencia y claridad
    "informativa": {
      scriptQuality: 1.3,           // Nuevo
      compliance: 1.2,              // Nuevo
      agentPerformance: 1.1,        // Nuevo
      manejoObjeciones: 0.5         // Nuevo
    }
  };

  // ===== PESOS PARA MÉTRICAS DE DESEMPEÑO DEL AGENTE =====
  // Ajustados para ventas efectivas
  const agentPerformancePesos = {
    cierreEfectivo: 0.30,          // Aumentado de 0.25
    proactividad: 0.25,            // Sin cambio
    escuchaActiva: 0.20,           // Sin cambio
    manejoInformacion: 0.15,       // Sin cambio
    amabilidadYTono: 0.10          // Reducido de 0.15
  };

  // ===== PESOS PARA EL FACTOR DE ENTRENAMIENTO DEL SCRIPT =====
  const scriptFactorPesos = {
    calidad: 0.70,         // Aumentado de 0.60
    completitud: 0.30      // Reducido de 0.40
  };

  // ===== UMBRALES PARA CLASIFICACIÓN DE AGENTES =====
  const umbralDesempeño = {
    excelente: 80,         // Reducido de 85 para ser más realista
    bueno: 65,             // Reducido de 70
    aceptable: 45,         // Reducido de 50
    deficiente: 25         // Reducido de 30
  };

  // ===== PESOS PARA EVALUACIÓN DE RAPPORT =====
  const rapportPesos = {
    personalizacionUso: 0.40,      // Aumentado de 0.35
    empatiaUso: 0.30,              // Aumentado de 0.25
    escuchaActivaUso: 0.25,        // Reducido de 0.30
    efectividadPromedio: 0.05      // Reducido de 0.10
  };

  // ===== PESOS PARA EVALUACIÓN DE OBJECIONES =====
  const objecionesPesos = {
    tasaSuperacion: 0.70,          // Aumentado de 0.60
    cantidadObjeciones: 0.20,      // Sin cambio
    momentoPrimeraObjecion: 0.10   // Reducido de 0.20
  };

  // ===== NUEVAS CONFIGURACIONES PARA VENTAS =====
  const ventasConfig = {
    // Factores críticos por etapa del proceso de venta
    factoresCriticosPorEtapa: {
      discovery: ['presupuesto', 'calendario', 'decision_compartida'],
      presentacion: ['valor_percibido', 'diferenciadores', 'beneficios'],
      manejo_objeciones: ['empatia', 'evidencia', 'alternativas'],
      cierre: ['urgencia', 'garantias', 'siguiente_paso']
    },
    // Pesos para cálculo de probabilidad de conversión
    probabilidadConversionPesos: {
      qualityScore: 0.30,
      customerQuality: 0.25,
      rapportScore: 0.20,
      objecionesSuperadas: 0.25
    },
    // Multiplicadores por calidad del cliente
    multiplicadoresCustomerQuality: {
      'Q_ELITE': 1.2,
      'Q_PREMIUM': 1.0,
      'Q_RETO': 0.8,
      'null': 0.9
    }
  };

  return {
    qualityScorePesos,
    resultadoBonus,
    tipoLlamadaMultiplicadores,
    agentPerformancePesos,
    scriptFactorPesos,
    umbralDesempeño,
    rapportPesos,
    objecionesPesos,
    ventasConfig
  };
}

// Función para calcular quality score ponderado
export function calcularQualityScorePonderado(
  llamada: any, 
  config: PonderacionConfig
): number {
  const { qualityScorePesos, resultadoBonus, tipoLlamadaMultiplicadores } = config;
  
  let scorePonderado = llamada.quality_score || 0;
  
  // Aplicar bonus por resultado
  const bonus = resultadoBonus[llamada.call_result] || 0;
  scorePonderado += bonus;
  
  // Aplicar multiplicadores por tipo de llamada
  const multiplicadores = tipoLlamadaMultiplicadores[llamada.call_type] || {};
  
  // Extraer métricas de la llamada
  const agentPerf = llamada.agent_performance?.metricas_calculadas || {};
  const comunicacion = llamada.comunicacion_data?.rapport_metricas || {};
  const evaluacion = llamada.call_evaluation?.metricas_foda || {};
  
  // Calcular factores ponderados
  let factorAgente = 0;
  if (agentPerf) {
    factorAgente = (
      (agentPerf.cierreEfectivo_score || 0) * config.agentPerformancePesos.cierreEfectivo +
      (agentPerf.proactividad_score || 0) * config.agentPerformancePesos.proactividad +
      (agentPerf.escuchaActiva_score || 0) * config.agentPerformancePesos.escuchaActiva +
      (agentPerf.manejoInformacion_score || 0) * config.agentPerformancePesos.manejoInformacion +
      (agentPerf.amabilidadYTono_score || 0) * config.agentPerformancePesos.amabilidadYTono
    );
  }
  
  let factorRapport = 0;
  if (comunicacion) {
    factorRapport = comunicacion.score_ponderado || 0;
  }
  
  let factorFoda = 0;
  if (evaluacion) {
    factorFoda = evaluacion.balance_foda || 0;
  }
  
  // Aplicar pesos principales
  const scoreConPesos = (
    factorAgente * qualityScorePesos.agentPerformance +
    factorRapport * qualityScorePesos.rapportEfectividad +
    factorFoda * qualityScorePesos.balanceFoda +
    scorePonderado * 0.4 // Base score
  );
  
  // Aplicar multiplicadores por tipo de llamada
  let scoreConMultiplicadores = scoreConPesos;
  Object.keys(multiplicadores).forEach(factor => {
    if (factor === 'agentPerformance') {
      scoreConMultiplicadores += (factorAgente * multiplicadores[factor] - factorAgente);
    } else if (factor === 'rapportEfectividad') {
      scoreConMultiplicadores += (factorRapport * multiplicadores[factor] - factorRapport);
    }
  });
  
  // Aplicar multiplicador por calidad de cliente
  const multiplicadorCliente = config.ventasConfig.multiplicadoresCustomerQuality[llamada.customer_quality] || 1.0;
  scoreConMultiplicadores *= multiplicadorCliente;
  
  return Math.max(0, Math.min(100, scoreConMultiplicadores));
}

// Función para calcular probabilidad de conversión
export function calcularProbabilidadConversion(
  llamada: any,
  config: PonderacionConfig
): number {
  const { probabilidadConversionPesos } = config.ventasConfig;
  
  const qualityScore = calcularQualityScorePonderado(llamada, config);
  const customerQualityScore = getCustomerQualityScore(llamada.customer_quality);
  const rapportScore = llamada.comunicacion_data?.rapport_metricas?.score_ponderado || 0;
  const objecionesScore = getObjecionesScore(llamada.call_evaluation);
  
  const probabilidad = (
    (qualityScore / 100) * probabilidadConversionPesos.qualityScore +
    (customerQualityScore / 100) * probabilidadConversionPesos.customerQuality +
    (rapportScore / 100) * probabilidadConversionPesos.rapportScore +
    (objecionesScore / 100) * probabilidadConversionPesos.objecionesSuperadas
  ) * 100;
  
  return Math.max(0, Math.min(100, probabilidad));
}

function getCustomerQualityScore(quality: string | null): number {
  switch (quality) {
    case 'Q_ELITE': return 90;
    case 'Q_PREMIUM': return 70;
    case 'Q_RETO': return 40;
    default: return 50;
  }
}

function getObjecionesScore(evaluation: any): number {
  if (!evaluation?.objeciones_resumen) return 50;
  
  const { tasa_superacion, total } = evaluation.objeciones_resumen;
  
  if (total === 0) return 70; // No hubo objeciones
  
  return Math.min(100, tasa_superacion);
}

export default definirConfiguracion;
