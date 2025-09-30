// ============================================
// SERVICIO DE TRADUCCIÓN GRATUITO
// Usando API gratuita de MyMemory (sin registro)
// ============================================

interface TranslationResult {
  success: boolean;
  translatedText?: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  error?: string;
}

class TranslationService {
  private baseUrl = 'https://api.mymemory.translated.net/get';
  
  /**
   * Traducir texto usando MyMemory API (gratuita, sin registro)
   */
  async translateText(
    text: string,
    sourceLang: string = 'es',
    targetLang: string = 'en'
  ): Promise<TranslationResult> {
    try {
      // Si el texto ya está en el idioma objetivo, no traducir
      if (sourceLang === targetLang) {
        return {
          success: true,
          translatedText: text,
          originalText: text,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang
        };
      }

      // Construir URL con parámetros (sin email que causa error)
      const params = new URLSearchParams({
        q: text,
        langpair: `${sourceLang}|${targetLang}`
        // Removido 'de' que causaba error de email
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Translation API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.responseStatus === 200 && data.responseData) {
        return {
          success: true,
          translatedText: data.responseData.translatedText,
          originalText: text,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang
        };
      } else {
        throw new Error(data.responseDetails || 'Translation failed');
      }
    } catch (error) {
      console.error('❌ Error en traducción:', error);
      
      // Fallback: retornar texto original si falla la traducción
      return {
        success: false,
        translatedText: text, // Usar texto original como fallback
        originalText: text,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        error: error instanceof Error ? error.message : 'Error de traducción'
      };
    }
  }

  /**
   * Detectar idioma del texto
   */
  async detectLanguage(text: string): Promise<{ language: string; confidence: number }> {
    try {
      // Usar una traducción dummy para detectar idioma
      const params = new URLSearchParams({
        q: text.substring(0, 100), // Solo primeros 100 caracteres
        langpair: 'auto|en',
        de: 'pqnc-ai-platform'
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      const data = await response.json();
      
      // MyMemory no proporciona detección directa, usar heurísticas simples
      const detectedLang = this.detectLanguageHeuristic(text);
      
      return {
        language: detectedLang,
        confidence: 0.8 // Confianza estimada
      };
    } catch (error) {
      console.error('❌ Error detectando idioma:', error);
      return {
        language: 'es', // Default a español
        confidence: 0.5
      };
    }
  }

  /**
   * Heurística mejorada para detectar idioma
   */
  private detectLanguageHeuristic(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Palabras comunes en español (ampliadas)
    const spanishWords = ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'una', 'tiene', 'más', 'este', 'está', 'como', 'pero', 'sus', 'muy', 'todo', 'bien', 'bebe', 'bebé', 'niño', 'niña', 'llorando', 'gritando', 'riendo', 'cantando', 'hablando', 'corriendo', 'caminando', 'agua', 'fuego', 'viento', 'lluvia', 'música', 'sonido', 'ruido', 'animal', 'perro', 'gato', 'pájaro', 'coche', 'carro', 'casa', 'puerta', 'ventana'];
    
    // Palabras comunes en inglés (ampliadas)
    const englishWords = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'she', 'or', 'an', 'will', 'baby', 'child', 'crying', 'screaming', 'laughing', 'singing', 'talking', 'running', 'walking', 'water', 'fire', 'wind', 'rain', 'music', 'sound', 'noise', 'animal', 'dog', 'cat', 'bird', 'car', 'house', 'door', 'window'];
    
    const words = lowerText.split(/\s+/);
    let spanishCount = 0;
    let englishCount = 0;
    
    words.forEach(word => {
      if (spanishWords.includes(word)) spanishCount++;
      if (englishWords.includes(word)) englishCount++;
    });
    
    // Detectar caracteres específicos del español (peso mayor)
    const hasSpanishChars = /[ñáéíóúü¿¡]/i.test(text);
    if (hasSpanishChars) spanishCount += 3;
    
    // Patrones de terminaciones en español
    const spanishEndings = /[aeiou]ndo$|[aeiou]r$|[aeiou]ción$|[aeiou]dad$/i;
    if (spanishEndings.test(text)) spanishCount += 2;
    
    // Si no hay palabras reconocidas, asumir español por defecto
    if (spanishCount === 0 && englishCount === 0) {
      console.log('🔍 No se detectaron palabras conocidas, asumiendo español');
      return 'es';
    }
    
    const result = spanishCount > englishCount ? 'es' : 'en';
    console.log('🔍 Detección de idioma:', { 
      text: text.substring(0, 30), 
      spanishCount, 
      englishCount, 
      hasSpanishChars, 
      detected: result 
    });
    
    return result;
  }

  /**
   * Traducir automáticamente para efectos de sonido
   * (Los efectos se generan mejor en inglés)
   */
  async translateForSoundEffects(text: string): Promise<TranslationResult> {
    // Verificar si ya está en inglés usando palabras clave
    const englishKeywords = ['baby', 'crying', 'child', 'screaming', 'laughing', 'singing', 'talking', 'running', 'walking', 'water', 'fire', 'wind', 'rain', 'music', 'sound', 'noise', 'animal', 'dog', 'cat', 'bird', 'car', 'house', 'door', 'window'];
    const lowerText = text.toLowerCase();
    const hasEnglishKeywords = englishKeywords.some(keyword => lowerText.includes(keyword));
    
    console.log('🔍 Análisis de idioma para efectos:', { 
      text, 
      hasEnglishKeywords,
      willTranslate: !hasEnglishKeywords
    });
    
    if (hasEnglishKeywords) {
      // Ya está en inglés, no traducir
      console.log('✅ Texto contiene palabras en inglés, no se traduce');
      return {
        success: true,
        translatedText: text,
        originalText: text,
        sourceLanguage: 'en',
        targetLanguage: 'en'
      };
    }
    
    // Asumir español y traducir al inglés para mejor generación de efectos
    console.log('🌐 Traduciendo de español a inglés:', text);
    const result = await this.translateText(text, 'es', 'en');
    console.log('🌐 Resultado de translateText:', result);
    return result;
  }

  /**
   * Obtener idiomas soportados
   */
  getSupportedLanguages(): Array<{ code: string; name: string; flag: string }> {
    return [
      { code: 'es', name: 'Español', flag: '🇪🇸' },
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'fr', name: 'Français', flag: '🇫🇷' },
      { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
      { code: 'it', name: 'Italiano', flag: '🇮🇹' },
      { code: 'pt', name: 'Português', flag: '🇵🇹' },
      { code: 'ru', name: 'Русский', flag: '🇷🇺' },
      { code: 'ja', name: '日本語', flag: '🇯🇵' },
      { code: 'ko', name: '한국어', flag: '🇰🇷' },
      { code: 'zh', name: '中文', flag: '🇨🇳' }
    ];
  }

  /**
   * Obtener frases de preview por idioma
   */
  getPreviewPhrases(): Record<string, string[]> {
    return {
      es: [
        'Hola, bienvenido a Grupo Vidanta. ¿Cómo puedo ayudarte hoy?',
        'Nuestros resorts ofrecen experiencias únicas e inolvidables.',
        'Disfruta de unas vacaciones perfectas en el paraíso.',
        'Tenemos ofertas especiales disponibles solo por tiempo limitado.'
      ],
      en: [
        'Hello, welcome to Grupo Vidanta. How can I help you today?',
        'Our resorts offer unique and unforgettable experiences.',
        'Enjoy a perfect vacation in paradise.',
        'We have special offers available for a limited time only.'
      ],
      fr: [
        'Bonjour, bienvenue chez Grupo Vidanta. Comment puis-je vous aider?',
        'Nos complexes offrent des expériences uniques et inoubliables.',
        'Profitez de vacances parfaites au paradis.',
        'Nous avons des offres spéciales disponibles pour une durée limitée.'
      ],
      de: [
        'Hallo, willkommen bei Grupo Vidanta. Wie kann ich Ihnen helfen?',
        'Unsere Resorts bieten einzigartige und unvergessliche Erlebnisse.',
        'Genießen Sie einen perfekten Urlaub im Paradies.',
        'Wir haben Sonderangebote nur für begrenzte Zeit verfügbar.'
      ],
      it: [
        'Ciao, benvenuto a Grupo Vidanta. Come posso aiutarti oggi?',
        'I nostri resort offrono esperienze uniche e indimenticabili.',
        'Goditi una vacanza perfetta in paradiso.',
        'Abbiamo offerte speciali disponibili solo per tempo limitato.'
      ],
      pt: [
        'Olá, bem-vindo ao Grupo Vidanta. Como posso ajudá-lo hoje?',
        'Nossos resorts oferecem experiências únicas e inesquecíveis.',
        'Desfrute de férias perfeitas no paraíso.',
        'Temos ofertas especiais disponíveis apenas por tempo limitado.'
      ]
    };
  }

  /**
   * Obtener frase de preview aleatoria para un idioma
   */
  getRandomPreviewPhrase(languageCode: string): string {
    const phrases = this.getPreviewPhrases();
    const languagePhrases = phrases[languageCode] || phrases['en'];
    const randomIndex = Math.floor(Math.random() * languagePhrases.length);
    return languagePhrases[randomIndex];
  }
}

// Exportar instancia singleton
export const translationService = new TranslationService();
export default translationService;
