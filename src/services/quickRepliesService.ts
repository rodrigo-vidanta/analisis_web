/**
 * ============================================
 * SERVICIO DE RESPUESTAS RÁPIDAS - LIVE CHAT
 * ============================================
 * 
 * Sistema de respuestas rápidas basado en reglas (sin LLM)
 * Detecta intenciones del cliente y sugiere respuestas contextuales
 */

export interface QuickReply {
  text: string;
  priority: number; // 1 = más relevante, 5 = menos relevante
}

export interface ConversationContext {
  lastMessage?: string;
  messageHistory?: string[];
  prospectStage?: string;
  isFirstInteraction?: boolean;
  conversationType?: 'whatsapp' | 'uchat';
}

class QuickRepliesService {
  
  /**
   * Genera respuestas rápidas basadas en el último mensaje y contexto
   */
  generateQuickReplies(context: ConversationContext): QuickReply[] {
    const lastMessage = (context.lastMessage || '').toLowerCase().trim();
    const replies: QuickReply[] = [];

    if (!lastMessage) {
      // Si no hay mensaje, mostrar respuestas genéricas de bienvenida
      return [
        { text: 'Hola, ¿en qué puedo ayudarte?', priority: 1 },
        { text: 'Bienvenido, con gusto te ayudo', priority: 2 },
        { text: 'Hola, ¿qué información necesitas?', priority: 3 }
      ];
    }

    // 1. DETECCIÓN DE SALUDOS
    if (this.isGreeting(lastMessage)) {
      replies.push(
        { text: 'Hola, ¿en qué puedo ayudarte?', priority: 1 },
        { text: 'Bienvenido, con gusto te ayudo', priority: 2 },
        { text: 'Hola, ¿qué información necesitas?', priority: 3 }
      );
    }

    // 2. DETECCIÓN DE PREGUNTAS SOBRE PRECIOS
    if (this.isPriceQuestion(lastMessage)) {
      replies.push(
        { text: 'Te envío información de precios', priority: 1 },
        { text: '¿Qué destino te interesa?', priority: 2 },
        { text: 'Tenemos promociones especiales', priority: 3 },
        { text: 'Te puedo ayudar con opciones según tu presupuesto', priority: 4 }
      );
    }

    // 3. DETECCIÓN DE PREGUNTAS SOBRE DISPONIBILIDAD
    if (this.isAvailabilityQuestion(lastMessage)) {
      replies.push(
        { text: 'Verifico disponibilidad para ti', priority: 1 },
        { text: '¿Qué fechas necesitas?', priority: 2 },
        { text: 'Te busco opciones disponibles', priority: 3 },
        { text: 'Déjame revisar el calendario', priority: 4 }
      );
    }

    // 4. DETECCIÓN DE AGRADECIMIENTO
    if (this.isThankYou(lastMessage)) {
      replies.push(
        { text: 'De nada, con gusto', priority: 1 },
        { text: 'Estoy para ayudarte', priority: 2 },
        { text: '¡Por supuesto!', priority: 3 },
        { text: 'Fue un placer ayudarte', priority: 4 }
      );
    }

    // 5. DETECCIÓN DE SOLICITUD DE INFORMACIÓN
    if (this.isInformationRequest(lastMessage)) {
      replies.push(
        { text: 'Te envío más información', priority: 1 },
        { text: '¿Qué te gustaría saber?', priority: 2 },
        { text: 'Con gusto te explico', priority: 3 },
        { text: 'Te comparto los detalles', priority: 4 }
      );
    }

    // 6. DETECCIÓN DE INTERÉS EN DESTINO/RESORT
    if (this.isDestinationQuestion(lastMessage)) {
      replies.push(
        { text: 'Tenemos varios destinos disponibles', priority: 1 },
        { text: '¿Qué tipo de destino prefieres?', priority: 2 },
        { text: 'Te recomiendo nuestras opciones más populares', priority: 3 },
        { text: '¿Playa, montaña o ciudad?', priority: 4 }
      );
    }

    // 7. DETECCIÓN DE PREGUNTAS SOBRE PROCESO/RESERVACIÓN
    if (this.isBookingQuestion(lastMessage)) {
      replies.push(
        { text: 'Te explico el proceso de reservación', priority: 1 },
        { text: 'Es muy sencillo, te guío paso a paso', priority: 2 },
        { text: '¿Tienes alguna pregunta sobre el proceso?', priority: 3 },
        { text: 'Puedo ayudarte a completar tu reservación', priority: 4 }
      );
    }

    // 8. DETECCIÓN DE OBJECIONES/DUDAS
    if (this.isObjection(lastMessage)) {
      replies.push(
        { text: 'Entiendo tu preocupación, déjame explicarte', priority: 1 },
        { text: 'Te puedo ayudar a resolver esa duda', priority: 2 },
        { text: 'Tengo información que puede ayudarte', priority: 3 },
        { text: '¿Qué específicamente te preocupa?', priority: 4 }
      );
    }

    // 9. DETECCIÓN DE DESPEDIDA
    if (this.isFarewell(lastMessage)) {
      replies.push(
        { text: '¡Que tengas un excelente día!', priority: 1 },
        { text: 'Fue un placer ayudarte', priority: 2 },
        { text: 'Estoy aquí cuando me necesites', priority: 3 },
        { text: '¡Hasta pronto!', priority: 4 }
      );
    }

    // 10. DETECCIÓN DE AFIRMACIÓN/POSITIVO
    if (this.isPositiveResponse(lastMessage)) {
      replies.push(
        { text: 'Excelente, ¿qué más necesitas?', priority: 1 },
        { text: 'Perfecto, continuemos', priority: 2 },
        { text: 'Me alegra saberlo', priority: 3 },
        { text: 'Genial, sigamos adelante', priority: 4 }
      );
    }

    // 11. DETECCIÓN DE NEGATIVA
    if (this.isNegativeResponse(lastMessage)) {
      replies.push(
        { text: 'Entiendo, ¿hay algo más en lo que pueda ayudarte?', priority: 1 },
        { text: 'No hay problema, ¿qué otra opción te interesa?', priority: 2 },
        { text: 'Comprendo, tenemos otras alternativas', priority: 3 },
        { text: '¿Qué te gustaría considerar?', priority: 4 }
      );
    }

    // 12. CONTEXTO ESPECÍFICO: Si el prospecto está en etapa avanzada
    if (context.prospectStage === 'calificado' || context.prospectStage === 'propuesta') {
      replies.push(
        { text: '¿Te gustaría avanzar con la reservación?', priority: 1 },
        { text: 'Tenemos opciones especiales para ti', priority: 2 },
        { text: '¿Qué te parece si revisamos las opciones?', priority: 3 }
      );
    }

    // 13. CONTEXTO: Primera interacción
    if (context.isFirstInteraction) {
      replies.push(
        { text: 'Bienvenido, soy [Nombre], ¿en qué puedo ayudarte?', priority: 1 },
        { text: 'Con gusto te ayudo a encontrar lo que buscas', priority: 2 },
        { text: 'Estoy aquí para resolver todas tus dudas', priority: 3 }
      );
    }

    // Si no se detectó ninguna intención específica, usar respuestas genéricas contextuales
    if (replies.length === 0) {
      replies.push(
        { text: 'Entiendo, ¿cómo puedo ayudarte?', priority: 1 },
        { text: '¿Qué información necesitas?', priority: 2 },
        { text: 'Con gusto te ayudo', priority: 3 }
      );
    }

    // Ordenar por prioridad y retornar máximo 4 respuestas
    return replies
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 4);
  }

  // ============================================
  // FUNCIONES DE DETECCIÓN DE INTENCIÓN
  // ============================================

  private isGreeting(message: string): boolean {
    const greetings = [
      'hola', 'hi', 'hello', 'buenos días', 'buenas tardes', 'buenas noches',
      'buen día', 'saludos', 'qué tal', 'cómo estás', 'cómo está'
    ];
    return greetings.some(greeting => message.includes(greeting));
  }

  private isPriceQuestion(message: string): boolean {
    const priceKeywords = [
      'precio', 'costo', 'cuánto', 'cuanto', 'precios', 'costos',
      'tarifa', 'tarifas', 'pago', 'pagamos', 'cuesta', 'vale',
      'presupuesto', 'económico', 'barato', 'caro', 'descuento',
      'promoción', 'oferta', 'ofertas', 'precio final'
    ];
    return priceKeywords.some(keyword => message.includes(keyword)) ||
           /\$\d+/.test(message) || // Contiene símbolo de moneda
           /\d+\s*(pesos|dólares|usd|mxn)/i.test(message);
  }

  private isAvailabilityQuestion(message: string): boolean {
    const availabilityKeywords = [
      'disponibilidad', 'disponible', 'disponibles', 'fechas', 'fecha',
      'cuándo', 'cuando', 'días', 'día', 'mes', 'año',
      'reservar', 'reservación', 'reservar', 'agendar', 'cita',
      'calendario', 'horarios', 'horario', 'tiempo disponible'
    ];
    return availabilityKeywords.some(keyword => message.includes(keyword));
  }

  private isThankYou(message: string): boolean {
    const thankKeywords = [
      'gracias', 'thank', 'thanks', 'agradezco', 'agradecido',
      'te lo agradezco', 'muy amable', 'muy amable de tu parte'
    ];
    return thankKeywords.some(keyword => message.includes(keyword));
  }

  private isInformationRequest(message: string): boolean {
    const infoKeywords = [
      'información', 'info', 'información', 'detalles', 'detalle',
      'saber', 'conocer', 'explicar', 'explicación', 'cuéntame',
      'cuénteme', 'dime', 'dígame', 'qué es', 'qué son',
      'cómo funciona', 'cómo es', 'qué incluye', 'qué ofrece'
    ];
    return infoKeywords.some(keyword => message.includes(keyword)) ||
           message.includes('?') || // Contiene signo de interrogación
           /^(qué|qué|cuál|cuáles|cómo|dónde|cuándo|por qué)/i.test(message.trim());
  }

  private isDestinationQuestion(message: string): boolean {
    const destinationKeywords = [
      'destino', 'destinos', 'lugar', 'lugares', 'resort', 'hotel',
      'playa', 'montaña', 'ciudad', 'país', 'países', 'viaje',
      'vacaciones', 'turismo', 'turístico', 'zona', 'región'
    ];
    return destinationKeywords.some(keyword => message.includes(keyword));
  }

  private isBookingQuestion(message: string): boolean {
    const bookingKeywords = [
      'reservar', 'reservación', 'reserva', 'reservas', 'agendar',
      'reservar', 'proceso', 'pasos', 'cómo reservar', 'cómo hacer',
      'comprar', 'contratar', 'adquirir', 'contratación'
    ];
    return bookingKeywords.some(keyword => message.includes(keyword));
  }

  private isObjection(message: string): boolean {
    const objectionKeywords = [
      'pero', 'sin embargo', 'aunque', 'pero', 'duda', 'dudas',
      'preocupación', 'preocupado', 'no estoy seguro', 'no sé',
      'tengo miedo', 'me preocupa', 'no estoy convencido',
      'caro', 'costoso', 'difícil', 'complicado', 'no puedo',
      'no tengo', 'no me alcanza', 'no es posible'
    ];
    return objectionKeywords.some(keyword => message.includes(keyword));
  }

  private isFarewell(message: string): boolean {
    const farewellKeywords = [
      'adiós', 'adios', 'hasta luego', 'hasta pronto', 'nos vemos',
      'chao', 'bye', 'goodbye', 'hasta la vista', 'que tengas buen día',
      'que tengas buen día', 'que estés bien', 'nos hablamos'
    ];
    return farewellKeywords.some(keyword => message.includes(keyword));
  }

  private isPositiveResponse(message: string): boolean {
    const positiveKeywords = [
      'sí', 'si', 'yes', 'ok', 'okay', 'perfecto', 'perfecta',
      'excelente', 'genial', 'bueno', 'buena', 'me gusta',
      'me interesa', 'me parece bien', 'está bien', 'de acuerdo',
      'claro', 'por supuesto', 'definitivamente', 'seguro'
    ];
    return positiveKeywords.some(keyword => message.includes(keyword));
  }

  private isNegativeResponse(message: string): boolean {
    const negativeKeywords = [
      'no', 'nope', 'nada', 'ninguno', 'ninguna', 'tampoco',
      'no me interesa', 'no quiero', 'no puedo', 'no tengo',
      'no es lo que busco', 'no me convence', 'no me gusta'
    ];
    return negativeKeywords.some(keyword => message.includes(keyword)) &&
           !this.isThankYou(message); // Excluir "no, gracias"
  }
}

export const quickRepliesService = new QuickRepliesService();
export default quickRepliesService;

