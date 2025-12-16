/**
 * ============================================
 * SERVICIO DE RESPUESTAS RÁPIDAS - LIVE CHAT
 * ============================================
 * 
 * Sistema de respuestas rápidas basado en reglas (sin LLM)
 * Detecta intenciones del cliente y sugiere respuestas contextuales
 * 
 * REGLAS DE COMUNICACIÓN:
 * - Siempre usar "usted" en lugar de "tú"
 * - Personalizar con título (Sr./Srta.) + nombre cuando esté disponible
 * - Si no hay título, usar mensajes neutros y respetuosos
 */

export interface QuickReply {
  text: string;
  priority: number; // 1 = más relevante, 5 = menos relevante
}

export interface ProspectData {
  titulo?: string | null;  // "Señor", "Sr.", "Señorita", "Srta.", etc.
  nombre?: string | null;  // Nombre del prospecto
  nombre_completo?: string | null; // Nombre completo
}

export interface ConversationContext {
  lastMessage?: string;
  messageHistory?: string[];
  prospectStage?: string;
  isFirstInteraction?: boolean;
  conversationType?: 'whatsapp' | 'uchat';
  prospectData?: ProspectData; // Datos del prospecto para personalización
}

class QuickRepliesService {
  
  /**
   * Formatea el nombre con título para personalización
   * @param prospectData Datos del prospecto
   * @returns String formateado (ej: "Sr. García") o null si no hay datos
   */
  private formatProspectName(prospectData?: ProspectData): string | null {
    if (!prospectData) return null;
    
    // Obtener el nombre (priorizar nombre simple sobre nombre_completo)
    let nombre = prospectData.nombre?.trim();
    if (!nombre && prospectData.nombre_completo) {
      // Extraer primer nombre del nombre completo
      const partes = prospectData.nombre_completo.trim().split(' ');
      nombre = partes[0];
    }
    
    // Si no hay título, no personalizar con nombre
    if (!prospectData.titulo || !prospectData.titulo.trim()) {
      return null;
    }
    
    // Normalizar el título
    let titulo = prospectData.titulo.trim();
    const tituloLower = titulo.toLowerCase();
    
    if (tituloLower === 'señor' || tituloLower === 'senor') {
      titulo = 'Sr.';
    } else if (tituloLower === 'señorita' || tituloLower === 'senorita') {
      titulo = 'Srta.';
    } else if (tituloLower === 'señora' || tituloLower === 'senora') {
      titulo = 'Sra.';
    } else if (tituloLower === 'sr' || tituloLower === 'sr.') {
      titulo = 'Sr.';
    } else if (tituloLower === 'srta' || tituloLower === 'srta.') {
      titulo = 'Srta.';
    } else if (tituloLower === 'sra' || tituloLower === 'sra.') {
      titulo = 'Sra.';
    }
    
    // Si hay nombre, combinar título + nombre
    if (nombre) {
      return `${titulo} ${nombre}`;
    }
    
    return null;
  }
  
  /**
   * Personaliza un mensaje con el nombre del prospecto si está disponible
   * @param mensaje Mensaje base
   * @param nombreFormateado Nombre formateado con título (ej: "Sr. García")
   * @param posicion Dónde insertar el nombre: 'inicio', 'fin', o 'ninguno'
   */
  private personalizarMensaje(
    mensaje: string, 
    nombreFormateado: string | null, 
    posicion: 'inicio' | 'fin' | 'ninguno' = 'ninguno'
  ): string {
    if (!nombreFormateado || posicion === 'ninguno') {
      return mensaje;
    }
    
    if (posicion === 'inicio') {
      // Ej: "Sr. García, ¿en qué puedo ayudarle?"
      return `${nombreFormateado}, ${mensaje.charAt(0).toLowerCase()}${mensaje.slice(1)}`;
    }
    
    if (posicion === 'fin') {
      // Ej: "¿En qué puedo ayudarle, Sr. García?"
      // Remover puntuación final, agregar nombre, restaurar puntuación
      const puntuacion = mensaje.match(/[.!?]$/)?.[0] || '';
      const mensajeSinPuntuacion = mensaje.replace(/[.!?]$/, '');
      return `${mensajeSinPuntuacion}, ${nombreFormateado}${puntuacion}`;
    }
    
    return mensaje;
  }
  
  /**
   * Genera respuestas rápidas basadas en el último mensaje y contexto
   * IMPORTANTE: Todos los mensajes usan "usted" y se personalizan cuando es posible
   */
  generateQuickReplies(context: ConversationContext): QuickReply[] {
    const lastMessage = (context.lastMessage || '').toLowerCase().trim();
    const replies: QuickReply[] = [];
    const nombreFormateado = this.formatProspectName(context.prospectData);

    if (!lastMessage) {
      // Si no hay mensaje, mostrar respuestas genéricas de bienvenida
      return [
        { text: this.personalizarMensaje('¿En qué puedo ayudarle?', nombreFormateado, 'fin'), priority: 1 },
        { text: this.personalizarMensaje('Bienvenido, con gusto le ayudo', nombreFormateado, 'inicio'), priority: 2 },
        { text: this.personalizarMensaje('¿Qué información necesita?', nombreFormateado, 'fin'), priority: 3 }
      ];
    }

    // 1. DETECCIÓN DE SALUDOS
    if (this.isGreeting(lastMessage)) {
      replies.push(
        { text: this.personalizarMensaje('¿En qué puedo ayudarle?', nombreFormateado, 'fin'), priority: 1 },
        { text: this.personalizarMensaje('Bienvenido, con gusto le ayudo', nombreFormateado, 'inicio'), priority: 2 },
        { text: this.personalizarMensaje('¿Qué información necesita?', nombreFormateado, 'fin'), priority: 3 }
      );
    }

    // 2. DETECCIÓN DE PREGUNTAS SOBRE PRECIOS
    if (this.isPriceQuestion(lastMessage)) {
      replies.push(
        { text: this.personalizarMensaje('Le envío información de precios', nombreFormateado, 'inicio'), priority: 1 },
        { text: '¿Qué destino le interesa?', priority: 2 },
        { text: 'Tenemos promociones especiales para usted', priority: 3 },
        { text: 'Puedo ayudarle con opciones según su presupuesto', priority: 4 }
      );
    }

    // 3. DETECCIÓN DE PREGUNTAS SOBRE DISPONIBILIDAD
    if (this.isAvailabilityQuestion(lastMessage)) {
      replies.push(
        { text: this.personalizarMensaje('Verifico disponibilidad para usted', nombreFormateado, 'inicio'), priority: 1 },
        { text: '¿Qué fechas necesita?', priority: 2 },
        { text: 'Le busco opciones disponibles', priority: 3 },
        { text: 'Permítame revisar el calendario', priority: 4 }
      );
    }

    // 4. DETECCIÓN DE AGRADECIMIENTO
    if (this.isThankYou(lastMessage)) {
      replies.push(
        { text: 'Con mucho gusto', priority: 1 },
        { text: 'Estoy para servirle', priority: 2 },
        { text: '¡Por supuesto!', priority: 3 },
        { text: 'Fue un placer ayudarle', priority: 4 }
      );
    }

    // 5. DETECCIÓN DE SOLICITUD DE INFORMACIÓN
    if (this.isInformationRequest(lastMessage)) {
      replies.push(
        { text: this.personalizarMensaje('Le envío más información', nombreFormateado, 'inicio'), priority: 1 },
        { text: '¿Qué le gustaría saber?', priority: 2 },
        { text: 'Con gusto le explico', priority: 3 },
        { text: 'Le comparto los detalles', priority: 4 }
      );
    }

    // 6. DETECCIÓN DE INTERÉS EN DESTINO/RESORT
    if (this.isDestinationQuestion(lastMessage)) {
      replies.push(
        { text: 'Tenemos varios destinos disponibles', priority: 1 },
        { text: '¿Qué tipo de destino prefiere?', priority: 2 },
        { text: 'Le recomiendo nuestras opciones más populares', priority: 3 },
        { text: '¿Playa, montaña o ciudad?', priority: 4 }
      );
    }

    // 7. DETECCIÓN DE PREGUNTAS SOBRE PROCESO/RESERVACIÓN
    if (this.isBookingQuestion(lastMessage)) {
      replies.push(
        { text: 'Le explico el proceso de reservación', priority: 1 },
        { text: 'Es muy sencillo, le guío paso a paso', priority: 2 },
        { text: '¿Tiene alguna pregunta sobre el proceso?', priority: 3 },
        { text: 'Puedo ayudarle a completar su reservación', priority: 4 }
      );
    }

    // 8. DETECCIÓN DE OBJECIONES/DUDAS
    if (this.isObjection(lastMessage)) {
      replies.push(
        { text: 'Entiendo su preocupación, permítame explicarle', priority: 1 },
        { text: 'Puedo ayudarle a resolver esa duda', priority: 2 },
        { text: 'Tengo información que puede ayudarle', priority: 3 },
        { text: '¿Qué específicamente le preocupa?', priority: 4 }
      );
    }

    // 9. DETECCIÓN DE DESPEDIDA
    if (this.isFarewell(lastMessage)) {
      replies.push(
        { text: this.personalizarMensaje('¡Que tenga un excelente día!', nombreFormateado, 'inicio'), priority: 1 },
        { text: 'Fue un placer atenderle', priority: 2 },
        { text: 'Estoy a sus órdenes cuando me necesite', priority: 3 },
        { text: '¡Hasta pronto!', priority: 4 }
      );
    }

    // 10. DETECCIÓN DE AFIRMACIÓN/POSITIVO
    if (this.isPositiveResponse(lastMessage)) {
      replies.push(
        { text: this.personalizarMensaje('Excelente, ¿qué más necesita?', nombreFormateado, 'inicio'), priority: 1 },
        { text: 'Perfecto, continuemos', priority: 2 },
        { text: 'Me alegra saberlo', priority: 3 },
        { text: 'Muy bien, sigamos adelante', priority: 4 }
      );
    }

    // 11. DETECCIÓN DE NEGATIVA
    if (this.isNegativeResponse(lastMessage)) {
      replies.push(
        { text: 'Entiendo, ¿hay algo más en lo que pueda ayudarle?', priority: 1 },
        { text: 'No hay problema, ¿qué otra opción le interesa?', priority: 2 },
        { text: 'Comprendo, tenemos otras alternativas', priority: 3 },
        { text: '¿Qué le gustaría considerar?', priority: 4 }
      );
    }

    // 12. CONTEXTO ESPECÍFICO: Si el prospecto está en etapa avanzada
    if (context.prospectStage === 'calificado' || context.prospectStage === 'propuesta') {
      replies.push(
        { text: '¿Le gustaría avanzar con la reservación?', priority: 1 },
        { text: 'Tenemos opciones especiales para usted', priority: 2 },
        { text: '¿Qué le parece si revisamos las opciones?', priority: 3 }
      );
    }

    // 13. CONTEXTO: Primera interacción
    if (context.isFirstInteraction) {
      replies.push(
        { text: this.personalizarMensaje('Bienvenido, ¿en qué puedo ayudarle?', nombreFormateado, 'inicio'), priority: 1 },
        { text: 'Con gusto le ayudo a encontrar lo que busca', priority: 2 },
        { text: 'Estoy aquí para resolver todas sus dudas', priority: 3 }
      );
    }

    // Si no se detectó ninguna intención específica, usar respuestas genéricas contextuales
    if (replies.length === 0) {
      replies.push(
        { text: this.personalizarMensaje('Entiendo, ¿cómo puedo ayudarle?', nombreFormateado, 'inicio'), priority: 1 },
        { text: '¿Qué información necesita?', priority: 2 },
        { text: 'Con gusto le ayudo', priority: 3 }
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
      'te lo agradezco', 'muy amable', 'muy amable de tu parte',
      'se lo agradezco', 'muy amable de su parte'
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
      'que tenga buen día', 'que estés bien', 'que esté bien', 'nos hablamos'
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
