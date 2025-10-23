/**
 * ============================================
 * SERVICIO DE ANÁLISIS DE LLAMADAS - MÓDULO ANÁLISIS IA
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/analysis/README_ANALISIS_IA.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/analysis/README_ANALISIS_IA.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/analysis/CHANGELOG_ANALISIS_IA.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

// ============================================
// SERVICIO DE ANÁLISIS DE LLAMADAS
// Evaluación con enfoque de continuidad y discovery
// ============================================

import { analysisSupabase } from '../config/analysisSupabase';

// Enums para las calificaciones (según tu nuevo prompt)
export const CONTINUIDAD_WHATSAPP_ENUM = [
  'PERFECTO', 'BUENO', 'DEFICIENTE', 'NO_APLICABLE'
] as const;

export const TRATAMIENTO_FORMAL_ENUM = [
  'PERFECTO', 'BUENO', 'REGULAR', 'DEFICIENTE'
] as const;

export const CONTROL_NARRATIVO_ENUM = [
  'CONTROLADO', 'PARCIAL', 'DESCONTROLADO'
] as const;

export const DISCOVERY_FAMILIAR_ENUM = [
  'COMPLETO', 'PARCIAL', 'INCOMPLETO', 'NO_REALIZADO'
] as const;

export const DETECCION_INTERES_ENUM = [
  'PRECISA', 'TARDÍA', 'TEMPRANA', 'IMPRECISA'
] as const;

export const MANEJO_OBJECIONES_ENUM = [
  'EXCELENTE', 'BUENO', 'BÁSICO', 'DEFICIENTE', 'NO_HUBO'
] as const;

export const CUMPLIMIENTO_REGLAS_ENUM = [
  'PERFECTO', 'BUENO', 'REGULAR', 'MALO'
] as const;

export const CALIDAD_TRANSFERENCIA_ENUM = [
  'EXITOSO', 'ADECUADA', 'PARCIAL', 'FALLIDO'
] as const;

export const NIVEL_INTERES_ENUM = [
  'MUY_ALTO', 'ALTO', 'MEDIO', 'BAJO', 'MUY_BAJO'
] as const;

// Interfaces para el análisis
export interface CallAnalysisRequest {
  call_id: string;
  transcript: string;
  context?: any;
}

export interface CallAnalysisResponse {
  calificaciones: {
    continuidad_whatsapp: typeof CONTINUIDAD_WHATSAPP_ENUM[number];
    tratamiento_formal: typeof TRATAMIENTO_FORMAL_ENUM[number];
    control_narrativo: typeof CONTROL_NARRATIVO_ENUM[number];
    discovery_familiar: typeof DISCOVERY_FAMILIAR_ENUM[number];
    deteccion_interes: typeof DETECCION_INTERES_ENUM[number];
    manejo_objeciones: typeof MANEJO_OBJECIONES_ENUM[number];
    cumplimiento_reglas: typeof CUMPLIMIENTO_REGLAS_ENUM[number];
    calidad_transferencia: typeof CALIDAD_TRANSFERENCIA_ENUM[number];
  };
  
  feedback_positivo: string[];
  
  feedback_constructivo: Array<{
    problema: string;
    solucion_tecnica: string;
    ubicacion: string;
  }>;
  
  checkpoint_alcanzado: number; // 1-5
  resultado_llamada: string;
  nivel_interes_detectado: typeof NIVEL_INTERES_ENUM[number];
  
  discovery_completado: {
    composicion_familiar: boolean;
    preferencias_actividades: boolean;
    fechas_tentativas: boolean;
    presupuesto_aproximado: boolean;
    contacto_completo: boolean;
  };
  
  transferencia_analysis: {
    momento_transferencia: 'OPTIMO' | 'TEMPRANO' | 'TARDIO' | 'NO_TRANSFIRIO';
    señales_interes_detectadas: string[];
    razon_transferencia: string;
    preparacion_supervisor: 'EXCELENTE' | 'BUENA' | 'BASICA' | 'DEFICIENTE';
  };
}

class CallAnalysisService {
  
  /**
   * Analizar una llamada usando el nuevo prompt de continuidad y discovery
   */
  async analyzeCall(request: CallAnalysisRequest): Promise<CallAnalysisResponse | null> {
    try {
      console.log('🔍 [ANALYSIS] Iniciando análisis para call_id:', request.call_id);
      
      // PLACEHOLDER: Por ahora devolver análisis mock
      // TODO: Integrar con OpenAI/Claude usando tu prompt completo
      
      const mockAnalysis: CallAnalysisResponse = {
        calificaciones: {
          continuidad_whatsapp: 'PERFECTO',
          tratamiento_formal: 'BUENO',
          control_narrativo: 'CONTROLADO',
          discovery_familiar: 'COMPLETO',
          deteccion_interes: 'PRECISA',
          manejo_objeciones: 'EXCELENTE',
          cumplimiento_reglas: 'PERFECTO',
          calidad_transferencia: 'EXITOSO'
        },
        
        feedback_positivo: [
          'Excelente continuidad entre WhatsApp y llamada telefónica',
          'Discovery familiar completo con todas las preferencias',
          'Transferencia en el momento óptimo'
        ],
        
        feedback_constructivo: [
          {
            problema: 'Podría mejorar la velocidad en el discovery de fechas',
            solucion_tecnica: 'Preguntar fechas inmediatamente después de composición familiar',
            ubicacion: 'Checkpoint 3 - Discovery familiar'
          }
        ],
        
        checkpoint_alcanzado: 5,
        resultado_llamada: 'Transferencia exitosa al supervisor con alto interés del cliente',
        nivel_interes_detectado: 'ALTO',
        
        discovery_completado: {
          composicion_familiar: true,
          preferencias_actividades: true,
          fechas_tentativas: true,
          presupuesto_aproximado: false,
          contacto_completo: true
        },
        
        transferencia_analysis: {
          momento_transferencia: 'OPTIMO',
          señales_interes_detectadas: ['Confirmación múltiple', 'Preguntas específicas'],
          razon_transferencia: 'Cliente mostró alto interés y pidió detalles de precios',
          preparacion_supervisor: 'EXCELENTE'
        }
      };
      
      return mockAnalysis;
      
    } catch (error) {
      console.error('❌ Error en análisis:', error);
      return null;
    }
  }
  
  /**
   * Guardar análisis en la base de datos
   */
  async saveAnalysis(callId: string, prospectoId: string, analysis: CallAnalysisResponse): Promise<boolean> {
    try {
      console.log('💾 [ANALYSIS] Guardando análisis para:', callId);
      
      // Calcular score general basado en calificaciones
      const scoreGeneral = this.calculateGeneralScore(analysis.calificaciones);
      const categoria = this.determineCategory(scoreGeneral);
      
      const { error } = await analysisSupabase
        .from('call_analysis')
        .insert({
          call_id: callId,
          prospecto_id: prospectoId,
          continuidad_whatsapp: analysis.calificaciones.continuidad_whatsapp,
          tratamiento_formal: analysis.calificaciones.tratamiento_formal,
          control_narrativo: analysis.calificaciones.control_narrativo,
          discovery_familiar: analysis.calificaciones.discovery_familiar,
          deteccion_interes: analysis.calificaciones.deteccion_interes,
          manejo_objeciones: analysis.calificaciones.manejo_objeciones,
          cumplimiento_reglas: analysis.calificaciones.cumplimiento_reglas,
          calidad_cierre: analysis.calificaciones.calidad_transferencia, // Mapear a campo existente
          feedback_positivo: analysis.feedback_positivo,
          feedback_constructivo: analysis.feedback_constructivo,
          checkpoint_alcanzado: analysis.checkpoint_alcanzado,
          resultado_llamada: analysis.resultado_llamada,
          nivel_interes_detectado: analysis.nivel_interes_detectado
        });
      
      if (error) {
        console.error('❌ Error guardando análisis:', error);
        return false;
      }
      
      console.log('✅ [ANALYSIS] Análisis guardado exitosamente');
      return true;
      
    } catch (error) {
      console.error('❌ Error en saveAnalysis:', error);
      return false;
    }
  }
  
  /**
   * Calcular score general basado en las calificaciones
   */
  private calculateGeneralScore(calificaciones: CallAnalysisResponse['calificaciones']): number {
    const weights = {
      continuidad_whatsapp: 15,
      tratamiento_formal: 10,
      control_narrativo: 15,
      discovery_familiar: 20,
      deteccion_interes: 20,
      manejo_objeciones: 10,
      cumplimiento_reglas: 10
    };
    
    const scoreMap = {
      'PERFECTO': 100, 'EXCELENTE': 95, 'BUENO': 80, 'CONTROLADO': 85,
      'COMPLETO': 100, 'PRECISA': 90, 'REGULAR': 60, 'PARCIAL': 70,
      'BÁSICO': 50, 'INCOMPLETO': 40, 'DEFICIENTE': 25, 'DESCONTROLADO': 20,
      'IMPRECISA': 30, 'MALO': 15, 'NO_REALIZADO': 0, 'NO_HUBO': 50,
      'NO_APLICABLE': 75
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    Object.entries(calificaciones).forEach(([key, value]) => {
      if (key !== 'calidad_transferencia') { // No incluir transferencia en score general
        const weight = weights[key as keyof typeof weights] || 10;
        const score = scoreMap[value as keyof typeof scoreMap] || 50;
        
        totalScore += score * weight;
        totalWeight += weight;
      }
    });
    
    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }
  
  /**
   * Determinar categoría de desempeño
   */
  private determineCategory(score: number): string {
    if (score >= 90) return 'EXCELENTE';
    if (score >= 80) return 'MUY BUENO';
    if (score >= 70) return 'BUENO';
    if (score >= 60) return 'REGULAR';
    return 'NECESITA MEJORA';
  }
  
  /**
   * Obtener análisis existente para una llamada
   */
  async getAnalysis(callId: string): Promise<any | null> {
    try {
      const { data, error } = await analysisSupabase
        .from('call_analysis')
        .select('*')
        .eq('call_id', callId)
        .single();
      
      if (error) {
        console.log('No se encontró análisis para call_id:', callId);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error obteniendo análisis:', error);
      return null;
    }
  }
  
  /**
   * Re-analizar una llamada existente
   */
  async reAnalyzeCall(callId: string): Promise<boolean> {
    try {
      // Obtener transcripción de llamadas_ventas
      const { data: llamadaData, error: llamadaError } = await analysisSupabase
        .from('llamadas_ventas')
        .select('conversacion_completa, prospecto, datos_proceso, datos_llamada')
        .eq('call_id', callId)
        .single();
      
      if (llamadaError || !llamadaData) {
        console.error('No se encontró la llamada:', callId);
        return false;
      }
      
      // Extraer transcripción
      let transcript = '';
      try {
        const conversacion = typeof llamadaData.conversacion_completa === 'string' 
          ? JSON.parse(llamadaData.conversacion_completa)
          : llamadaData.conversacion_completa;
        transcript = conversacion?.conversacion || '';
      } catch (e) {
        console.error('Error parsing conversacion_completa');
        return false;
      }
      
      if (!transcript) {
        console.error('No hay transcripción disponible para:', callId);
        return false;
      }
      
      // Analizar
      const analysis = await this.analyzeCall({
        call_id: callId,
        transcript,
        context: {
          datos_proceso: llamadaData.datos_proceso,
          datos_llamada: llamadaData.datos_llamada
        }
      });
      
      if (!analysis) return false;
      
      // Guardar
      return await this.saveAnalysis(callId, llamadaData.prospecto, analysis);
      
    } catch (error) {
      console.error('Error en re-análisis:', error);
      return false;
    }
  }
}

export const callAnalysisService = new CallAnalysisService();
