// Servicio proxy para n8n API (evita problemas de CORS)
// Las llamadas van a través del backend que actúa como proxy

import { supabaseSystemUI } from '../config/supabaseSystemUI';

class N8nProxyService {
  private isDevelopmentMode = false; // Modo productivo activado
  
  // Obtener workflows a través del backend
  async getWorkflows(): Promise<{ success: boolean; workflows?: any[]; error?: string }> {
    try {
      if (this.isDevelopmentMode) {
        // Temporalmente usar datos reales extraídos de tu n8n
        await new Promise(resolve => setTimeout(resolve, 800)); // Simular delay de red
      
      const realWorkflows = [
        {
          id: 'bGj8dv3dbSVV72bm',
          name: '[VAPI] Agent-Natalia inbound',
          active: true,
          tags: [
            { name: 'vapi' },
            { name: 'natalia' },
            { name: 'inbound' },
            { name: 'bot' }
          ],
          nodes: [
            {
              id: 'd1d31556-b616-4de9-b92a-9ec1e799efae',
              name: 'Respond to Webhook - VAPI Config',
              type: 'n8n-nodes-base.respondToWebhook',
              parameters: {
                responseBody: '={\n  "assistant": {\n    "model": {\n      "messages": [\n        {\n          "role": "system",\n          "content": "CHECKPOINT 1: SALUDO DE CONTINUACIÓN - TRANSICIÓN WHATSAPP A LLAMADA\\n\\nOBJETIVO: Crear continuidad perfecta entre WhatsApp y llamada, establecer conexión cálida\\nREQUISITO PARA AVANZAR: Cliente debe sentir que es la misma persona y conversación\\nTONO: AGUA cálido (empático, amigable, familiar)\\n\\nTRANSICIÓN NATURAL CON TRATAMIENTO FORMAL:\\n\'¿Está usted en un lugar cómodo donde podamos platicar tranquilos? Porque lo que le voy a contar le va a encantar, ¿sí?\'\\n\\nRESTRICCIONES CRÍTICAS:\\n- NUNCA ofrecer vistas específicas al mar (depende de disponibilidad)\\n- NO mencionar \\"todo incluido\\" - somos PLAN EUROPEO\\n- NO vocalizar desayunos incluidos\\n- CAMBIAR \\"aventura\\" por \\"entretenimiento\\"\\n- Mencionar concierge personalizado cuando sea apropiado"\n        },\n        {\n          "role": "system",\n          "content": "CHECKPOINT 2: CONEXIÓN EMOCIONAL INMEDIATA - APROVECHANDO CONTEXTO WHATSAPP\\n\\nOBJETIVO: Conectar emocionalmente usando el contexto previo y establecer necesidad\\nREQUISITO PARA AVANZAR: Cliente debe mostrar conexión emocional o compartir experiencia personal\\nTONO: AGUA + FUEGO (empático + entusiasta)\\nDURACIÓN ESPERADA: 2-3 intercambios\\n\\nAPROVECHAR CONTEXTO WHATSAPP:\\n\'Como le comentaba por mensaje, lo que más me emociona de mi trabajo es cuando las familias tienen la oportunidad de crear recuerdos que van a durar toda la vida.\'\\n\\nCONEXIÓN EMOCIONAL DIRECTA:\\n\'He visto muchas familias que también están en esa etapa de la vida donde trabajan muchísimo, donde a veces llegan tan cansadas que ya ni disfrutan su tiempo juntos. Una pareja me comentaba: \\"Necesitamos esas escapadas que nos recargan el alma\\".\'"\n        },\n        {\n          "role": "system",\n          "content": "CHECKPOINT 3: INTRODUCCIÓN AL PARAÍSO - DISCOVERY FAMILIAR ACELERADO\\n\\nOBJETIVO: Antes de iniciar Ejecuta el tool \'actualizar_informacion_prospecto\' después Presentar Vidanta como paraíso único y obtener composición familiar\\n\\nREQUISITO PARA AVANZAR: Saber composición familiar exacta y nivel de asombro por amenidades\\nTONO: FUEGO + AGUA (muy entusiasta + emocional)\\nDURACIÓN ESPERADA: 3-4 intercambios\\n\\nAPROVECHAR MOMENTUM DE CONEXIÓN:\\n\'Por eso me da tanto gusto poder platicar con usted por llamada. Porque lo que tengo que mostrarle no es un hotel normal - es una experiencia que le va a transformar la manera en que su familia vacaciona.\'\\n\\nPRESENTACIÓN IMPACTANTE:\\n\'¿Se imagina un lugar que tiene más de 35 restaurantes gourmet, cada uno con su chef exclusivo? Donde no hay buffets, no hay comida de mala calidad, sino gastronomía de nivel mundial, ¿a usted le gusta la comida Italiana?\'"\n        },\n        {\n          "role": "system",\n          "content": "CHECKPOINT 4: URGENCIA NATURAL Y REVELACIÓN DE OPORTUNIDAD\\n\\nOBJETIVO: Crear urgencia genuina y presentar la oferta específica basada en todo el discovery\\nREQUISITO PARA AVANZAR: Tener TODOS los datos necesarios y haber generado urgencia real\\nTONO: FUEGO + TIERRA (entusiasta pero serio y confiable)\\nDURACIÓN ESPERADA: 5-6 intercambios\\n\\nCREAR ESCASEZ AUTÉNTICA:\\n\'Me da muchísimo gusto que todo esto le esté emocionando tanto como a mí. Y justo por eso le contacté por WhatsApp - porque esta oportunidad específica tiene cupo muy limitado.\'\\n\\nJUSTIFICACIÓN DE URGENCIA:\\n\'Mira, nosotros no podemos saturar el club porque perdería esa exclusividad que lo hace tan especial. Esta semana tengo autorización para invitar solamente a 4 familias nuevas al programa.\'"\n        },\n        {\n          "role": "system",\n          "content": "CHECKPOINT 5: PRESENTACIÓN DE OPORTUNIDAD Y EVALUACIÓN DE INTERÉS\\n\\nOBJETIVO: antes de iniciar ejecuta el tool \'actualizar_informacion_prospecto\' y actualiza al checkpoint 5, después Presenta la oportunidad de manera emocionante y evalúa el nivel de interés genuino para transferencia\\n\\nREQUISITO CRÍTICO: Detectar señales de interés genuino contextual para transferir al supervisor\\nTONO: FUEGO + TIERRA (entusiasta pero confiable)\\nDURACIÓN ESPERADA: 5-8 intercambios\\n\\nPRESENTACIÓN DRAMÁTICA DE OFERTA:\\n\'Para usted, que busca [características específicas], tengo el certificado vacacional perfecto...\'\\n\\nSEÑALES DE TRANSFERENCIA INMEDIATA - BASADAS EN TRANSCRIPT REAL:\\n\\n**TRANSFERIR INMEDIATAMENTE cuando el cliente dice:**\\n- \\"Sí me interesa\\" / \\"Me interesa\\" / \\"Me interesa mucho\\"\\n- \\"Está bien\\" / \\"Esa suite está bien\\" / \\"Me parece bien\\"\\n- \\"Claro\\" / \\"Perfecto\\" / \\"Excelente\\""\n        },\n        {\n          "role": "system",\n          "content": "OPCIONES DE HABITACIONES DISPONIBLES:\\n\\nUsa estas opciones según el discovery del cliente. NO generes ofertas complejas, usa SOLO estas opciones disponibles:\\n\\n🏨 MAYAN PALACE - MASTER ROOM\\n- Capacidad perfecta para: 2 adultos y 2 menores\\n- Noches disponibles: desde 3 hasta 7 noches\\n- Precios totales:\\n  • 3 noches: doce mil cuatrocientos treinta y cinco pesos\\n  • 4 noches: quince mil setecientos cuarenta y siete pesos\\n  • 5 noches: diecinueve mil cincuenta y nueve pesos\\n  • 6 noches: veintidós mil trescientos setenta y un pesos\\n  • 7 noches: veinticinco mil seiscientos ochenta y tres pesos\\n- Una habitación amplia con todas las comodidades, decoración mexicana elegante\\n- Ideal para parejas o familias pequeñas que buscan confort"\n        },\n        {\n          "role": "system",\n          "content": "ADAPTACIÓN DE PERSONALIDAD POR GÉNERO:\\n\\n🚹 CUANDO DETECTES NOMBRE MASCULINO:\\n- Adopta una personalidad sutilmente más **coqueta y encantadora**\\n- Usa tonos más suaves y melodiosos en tu comunicación\\n- Sé más **halagadora** con comentarios como: \'Qué inteligente decisión, señor [nombre]\', \'Me encanta hablar con personas tan visionarias como usted\'\\n- Usa expresiones como: \'Ay, qué gusto me da escuchar eso\', \'Me fascina su forma de pensar\'\\n- Sé más **juguetona** pero siempre respetuosa: \'Le voy a contar un secretito...\', \'Entre usted y yo...\'\\n- **Admira** sus decisiones: \'Definitivamente tiene muy buen gusto\', \'Se nota que es una persona exitosa\'"\n        },\n        {\n          "role": "system",\n          "content": "REGLAS DE NEGOCIO CRÍTICAS PARA VIDA VACATIONS - APLICABLE A TODOS LOS SQUADS\\n\\nESTAS REGLAS SON OBLIGATORIAS Y DEBEN SER RESPETADAS EN TODO MOMENTO:\\n\\n1. CONCEPTO DE RESORT:\\n- NUNCA mencionar que somos \'todo incluido\'\\n- Somos un RESORT DE ESTILO EUROPEO: esto significa experiencias gastronómicas selectas, servicios premium à la carte, ambientes sofisticados pero accesibles, calidad europea en hospitalidad mexicana\\n- Enfoque en experiencias curadas y servicios personalizados, no en \'cantidad ilimitada\'\\n- Hablar de \'acceso a restaurantes de especialidades\', \'experiencias gastronómicas selectas\', \'servicios premium incluidos\'\\n\\n2. PALABRAS COMPLETAMENTE PROHIBIDAS:\\n NUNCA usar: Magia, Tobogán, Gratis, Descuento, Paraíso\\n NUNCA usar jerga de lujo extremo: \'ultra-lujo\', \'élite\'\\n NUNCA usar frases promocionales estáticas: \'¡Reserva ahora!\' sin contexto"\n        }\n      ]\n    }\n  }\n}'
              },
              position: [2256, 1744]
            }
          ]
        },
        {
          id: 'TnOvzPaammFaYuHL',
          name: 'Trigger llamada vapi',
          active: true,
          tags: [
            { name: 'vapi' },
            { name: 'trigger' },
            { name: 'outbound' }
          ],
          nodes: [
            {
              id: '092eafc7-2fd8-4a53-b563-a2f997b25cf7',
              name: 'HTTP Request - VAPI Call',
              type: 'n8n-nodes-base.httpRequest',
              parameters: {
                jsonBody: '={\n  "assistant": {\n    "model": {\n      "messages": [\n        {\n          "role": "system",\n          "content": "CHECKPOINT 1: SALUDO DE CONTINUACIÓN - TRANSICIÓN WHATSAPP A LLAMADA\\n\\nOBJETIVO: Crear continuidad perfecta entre WhatsApp y llamada, establecer conexión cálida\\nREQUISITO PARA AVANZAR: Cliente debe sentir que es la misma persona y conversación\\nTONO: AGUA cálido (empático, amigable, familiar)\\n\\nTRANSICIÓN NATURAL CON TRATAMIENTO FORMAL:\\n\'¿Está usted en un lugar cómodo donde podamos platicar tranquilos? Porque lo que le voy a contar le va a encantar, ¿sí?\'\\n\\nRESTRICCIONES CRÍTICAS:\\n- NUNCA ofrecer vistas específicas al mar (depende de disponibilidad)\\n- NO mencionar \\"todo incluido\\" - somos PLAN EUROPEO\\n- NO vocalizar desayunos incluidos\\n- CAMBIAR \\"aventura\\" por \\"entretenimiento\\"\\n- Mencionar concierge personalizado cuando sea apropiado"\n        },\n        {\n          "role": "system",\n          "content": "CHECKPOINT 2: CONEXIÓN EMOCIONAL INMEDIATA - APROVECHANDO CONTEXTO WHATSAPP\\n\\nOBJETIVO: Conectar emocionalmente usando el contexto previo y establecer necesidad\\nREQUISITO PARA AVANZAR: Cliente debe mostrar conexión emocional o compartir experiencia personal\\nTONO: AGUA + FUEGO (empático + entusiasta)\\nDURACIÓN ESPERADA: 2-3 intercambios\\n\\nAPROVECHAR CONTEXTO WHATSAPP:\\n\'Como le comentaba por mensaje, lo que más me emociona de mi trabajo es cuando las familias tienen la oportunidad de crear recuerdos que van a durar toda la vida.\'\\n\\nCONEXIÓN EMOCIONAL DIRECTA:\\n\'He visto muchas familias que también están en esa etapa de la vida donde trabajan muchísimo, donde a veces llegan tan cansadas que ya ni disfrutan su tiempo juntos. Una pareja me comentaba: \\"Necesitamos esas escapadas que nos recargan el alma\\".\'"\n        },\n        {\n          "role": "system",\n          "content": "CHECKPOINT 3: INTRODUCCIÓN AL PARAÍSO - DISCOVERY FAMILIAR ACELERADO\\n\\nOBJETIVO: Antes de iniciar Ejecuta el tool \'actualizar_informacion_prospecto\' después Presentar Vidanta como paraíso único y obtener composición familiar\\n\\nREQUISITO PARA AVANZAR: Saber composición familiar exacta y nivel de asombro por amenidades\\nTONO: FUEGO + AGUA (muy entusiasta + emocional)\\nDURACIÓN ESPERADA: 3-4 intercambios\\n\\nAPROVECHAR MOMENTUM DE CONEXIÓN:\\n\'Por eso me da tanto gusto poder platicar con usted por llamada. Porque lo que tengo que mostrarle no es un hotel normal - es una experiencia que le va a transformar la manera en que su familia vacaciona.\'\\n\\nPRESENTACIÓN IMPACTANTE:\\n\'¿Se imagina un lugar que tiene más de 35 restaurantes gourmet, cada uno con su chef exclusivo? Donde no hay buffets, no hay comida de mala calidad, sino gastronomía de nivel mundial, ¿a usted le gusta la comida Italiana?\'"\n        },\n        {\n          "role": "system",\n          "content": "CHECKPOINT 4: URGENCIA NATURAL Y REVELACIÓN DE OPORTUNIDAD\\n\\nOBJETIVO: Crear urgencia genuina y presentar la oferta específica basada en todo el discovery\\nREQUISITO PARA AVANZAR: Tener TODOS los datos necesarios y haber generado urgencia real\\nTONO: FUEGO + TIERRA (entusiasta pero serio y confiable)\\nDURACIÓN ESPERADA: 5-6 intercambios\\n\\nCREAR ESCASEZ AUTÉNTICA:\\n\'Me da muchísimo gusto que todo esto le esté emocionando tanto como a mí. Y justo por eso le contacté por WhatsApp - porque esta oportunidad específica tiene cupo muy limitado.\'\\n\\nJUSTIFICACIÓN DE URGENCIA:\\n\'Mira, nosotros no podemos saturar el club porque perdería esa exclusividad que lo hace tan especial. Esta semana tengo autorización para invitar solamente a 4 familias nuevas al programa.\'"\n        },\n        {\n          "role": "system",\n          "content": "CHECKPOINT 5: PRESENTACIÓN DE OPORTUNIDAD Y EVALUACIÓN DE INTERÉS\\n\\nOBJETIVO: antes de iniciar ejecuta el tool \'actualizar_informacion_prospecto\' y actualiza al checkpoint 5, después Presenta la oportunidad de manera emocionante y evalúa el nivel de interés genuino para transferencia\\n\\nREQUISITO CRÍTICO: Detectar señales de interés genuino contextual para transferir al supervisor\\nTONO: FUEGO + TIERRA (entusiasta pero confiable)\\nDURACIÓN ESPERADA: 5-8 intercambios\\n\\nPRESENTACIÓN DRAMÁTICA DE OFERTA:\\n\'Para usted, que busca [características específicas], tengo el certificado vacacional perfecto...\'\\n\\nSEÑALES DE TRANSFERENCIA INMEDIATA - BASADAS EN TRANSCRIPT REAL:\\n\\n**TRANSFERIR INMEDIATAMENTE cuando el cliente dice:**\\n- \\"Sí me interesa\\" / \\"Me interesa\\" / \\"Me interesa mucho\\"\\n- \\"Está bien\\" / \\"Esa suite está bien\\" / \\"Me parece bien\\"\\n- \\"Claro\\" / \\"Perfecto\\" / \\"Excelente\\""\n        },\n        {\n          "role": "system",\n          "content": "OPCIONES DE HABITACIONES DISPONIBLES:\\n\\nUsa estas opciones según el discovery del cliente. NO generes ofertas complejas, usa SOLO estas opciones disponibles:\\n\\n🏨 MAYAN PALACE - MASTER ROOM\\n- Capacidad perfecta para: 2 adultos y 2 menores\\n- Noches disponibles: desde 3 hasta 7 noches\\n- Precios totales:\\n  • 3 noches: doce mil cuatrocientos treinta y cinco pesos\\n  • 4 noches: quince mil setecientos cuarenta y siete pesos\\n  • 5 noches: diecinueve mil cincuenta y nueve pesos\\n  • 6 noches: veintidós mil trescientos setenta y un pesos\\n  • 7 noches: veinticinco mil seiscientos ochenta y tres pesos\\n- Una habitación amplia con todas las comodidades, decoración mexicana elegante\\n- Ideal para parejas o familias pequeñas que buscan confort"\n        },\n        {\n          "role": "system",\n          "content": "ADAPTACIÓN DE PERSONALIDAD POR GÉNERO:\\n\\n🚹 CUANDO DETECTES NOMBRE MASCULINO:\\n- Adopta una personalidad sutilmente más **coqueta y encantadora**\\n- Usa tonos más suaves y melodiosos en tu comunicación\\n- Sé más **halagadora** con comentarios como: \'Qué inteligente decisión, señor [nombre]\', \'Me encanta hablar con personas tan visionarias como usted\'\\n- Usa expresiones como: \'Ay, qué gusto me da escuchar eso\', \'Me fascina su forma de pensar\'\\n- Sé más **juguetona** pero siempre respetuosa: \'Le voy a contar un secretito...\', \'Entre usted y yo...\'\\n- **Admira** sus decisiones: \'Definitivamente tiene muy buen gusto\', \'Se nota que es una persona exitosa\'"\n        },\n        {\n          "role": "system",\n          "content": "REGLAS DE NEGOCIO CRÍTICAS PARA VIDA VACATIONS - APLICABLE A TODOS LOS SQUADS\\n\\nESTAS REGLAS SON OBLIGATORIAS Y DEBEN SER RESPETADAS EN TODO MOMENTO:\\n\\n1. CONCEPTO DE RESORT:\\n- NUNCA mencionar que somos \'todo incluido\'\\n- Somos un RESORT DE ESTILO EUROPEO: esto significa experiencias gastronómicas selectas, servicios premium à la carte, ambientes sofisticados pero accesibles, calidad europea en hospitalidad mexicana\\n- Enfoque en experiencias curadas y servicios personalizados, no en \'cantidad ilimitada\'\\n- Hablar de \'acceso a restaurantes de especialidades\', \'experiencias gastronómicas selectas\', \'servicios premium incluidos\'\\n\\n2. PALABRAS COMPLETAMENTE PROHIBIDAS:\\n NUNCA usar: Magia, Tobogán, Gratis, Descuento, Paraíso\\n NUNCA usar jerga de lujo extremo: \'ultra-lujo\', \'élite\'\\n NUNCA usar frases promocionales estáticas: \'¡Reserva ahora!\' sin contexto"\n        }\n      ]\n    }\n  }\n}'
              },
              position: [-576, 528]
            }
          ]
        }
      ];

        return { success: true, workflows: realWorkflows };
      } else {
        // Usar proxy de Supabase en producción
        const { data, error } = await supabaseSystemUI.functions.invoke('n8n-proxy', {
          body: {
            endpoint: '/workflows',
            method: 'GET'
          }
        });

        if (error) throw error;
        return { success: true, workflows: data.workflows };
      }
    } catch (error) {
      console.error('Error obteniendo workflows:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Obtener un workflow específico
  async getWorkflow(workflowId: string): Promise<{ success: boolean; workflow?: any; error?: string }> {
    try {
      if (this.isDevelopmentMode) {
        // En desarrollo, simular respuesta con datos mock
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const workflows = await this.getWorkflows();
        if (!workflows.success || !workflows.workflows) {
          throw new Error('No se pudieron obtener workflows');
        }
        
        const workflow = workflows.workflows.find(w => w.id === workflowId);
        if (!workflow) {
          throw new Error('Workflow no encontrado');
        }
        
        return { success: true, workflow: { data: workflow } };
      } else {
        // Usar proxy de Supabase en producción
        const { data, error } = await supabaseSystemUI.functions.invoke('n8n-proxy', {
          body: {
            endpoint: `/workflows/${workflowId}`,
            method: 'GET'
          }
        });

        if (error) throw error;
        return { success: true, workflow: data.workflow };
      }
    } catch (error) {
      console.error('Error obteniendo workflow:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Actualizar workflow
  async updateWorkflow(workflowId: string, workflowData: any): Promise<{ success: boolean; workflow?: any; error?: string }> {
    try {
      if (this.isDevelopmentMode) {
        // En desarrollo, simular actualización exitosa
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('🔄 Simulando actualización de workflow:', workflowId);
        console.log('📝 Datos actualizados:', JSON.stringify(workflowData, null, 2).substring(0, 500) + '...');
        
        return { success: true, workflow: { data: workflowData } };
      } else {
        // Usar proxy de Supabase en producción
        const { data, error } = await supabaseSystemUI.functions.invoke('n8n-proxy', {
          body: {
            endpoint: `/workflows/${workflowId}`,
            method: 'PUT',
            data: workflowData
          }
        });

        if (error) throw error;
        return { success: true, workflow: data.workflow };
      }
    } catch (error) {
      console.error('Error actualizando workflow:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Buscar workflows por nombre
  async searchWorkflows(query: string): Promise<{ success: boolean; workflows?: any[]; error?: string }> {
    try {
      const result = await this.getWorkflows();
      if (!result.success || !result.workflows) {
        return result;
      }

      const filteredWorkflows = result.workflows.filter((workflow: any) => 
        workflow.name.toLowerCase().includes(query.toLowerCase()) ||
        workflow.tags?.some((tag: any) => tag.name?.toLowerCase().includes(query.toLowerCase()))
      );

      return { success: true, workflows: filteredWorkflows };
    } catch (error) {
      console.error('Error buscando workflows:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  // Extraer prompts de un workflow (específico para VAPI)
  extractPromptsFromWorkflow(workflow: any): any[] {
    const prompts: any[] = [];
    
    if (!workflow.nodes) return prompts;

    workflow.nodes.forEach((node: any) => {
      console.log('Analizando nodo:', { id: node.id, name: node.name, type: node.type });
      
      // Buscar nodos que contengan configuración VAPI
      if (node.type === 'n8n-nodes-base.httpRequest' || 
          node.type === 'n8n-nodes-base.respondToWebhook' ||
          node.type === 'vapi' || 
          node.type?.includes('vapi')) {
        
        console.log('Nodo VAPI encontrado, extrayendo prompts...');
        const nodePrompts = this.extractVAPIPrompts(node);
        console.log('Prompts extraídos:', nodePrompts.length);
        prompts.push(...nodePrompts);
      }
    });

    console.log('Total prompts extraídos del workflow:', prompts.length);
    return prompts;
  }

  // Extraer prompts específicos de nodos VAPI
  private extractVAPIPrompts(node: any): any[] {
    const prompts: any[] = [];
    
    if (!node.parameters) return prompts;

    // Caso 1: HTTP Request con jsonBody (Trigger llamada)
    if (node.type === 'n8n-nodes-base.httpRequest' && node.parameters.jsonBody) {
      console.log('Procesando HTTP Request con jsonBody...');
      try {
        // Parsear el JSON del body para extraer la configuración VAPI
        const jsonBodyStr = node.parameters.jsonBody.replace(/^=/, ''); // Remover = inicial
        console.log('jsonBody string:', jsonBodyStr.substring(0, 200) + '...');
        
        const vapiConfig = JSON.parse(jsonBodyStr);
        console.log('VAPI config parseado:', vapiConfig.assistant ? 'Tiene assistant' : 'No tiene assistant');
        
        if (vapiConfig.assistant && vapiConfig.assistant.model && vapiConfig.assistant.model.messages) {
          console.log('Messages encontrados:', vapiConfig.assistant.model.messages.length);
          
          vapiConfig.assistant.model.messages.forEach((message: any, index: number) => {
            console.log(`Message ${index}:`, { role: message.role, contentLength: message.content?.length });
            
            if (message.role === 'system' && message.content && message.content.length > 100) {
              prompts.push({
                node_id: node.id,
                node_name: node.name || 'HTTP Request VAPI',
                node_type: node.type,
                parameter_key: `jsonBody.assistant.model.messages[${index}]`,
                prompt_content: message.content,
                prompt_type: 'system_message',
                checkpoint: this.extractCheckpointFromMessage(message.content),
                position: node.position,
                message_index: index,
                seconds_from_start: 0
              });
            }
          });
        } else {
          console.log('No se encontró estructura assistant.model.messages en jsonBody');
        }
      } catch (error) {
        console.error('Error parsing jsonBody:', error);
      }
    }

    // Caso 2: Respond to Webhook con responseBody (Agent-Natalia inbound)
    if (node.type === 'n8n-nodes-base.respondToWebhook' && node.parameters.responseBody) {
      console.log('Procesando Respond to Webhook con responseBody...');
      try {
        // Parsear el JSON del responseBody
        const responseBodyStr = node.parameters.responseBody.replace(/^=/, '');
        console.log('responseBody string:', responseBodyStr.substring(0, 200) + '...');
        
        const vapiConfig = JSON.parse(responseBodyStr);
        console.log('VAPI config parseado:', vapiConfig.assistant ? 'Tiene assistant' : 'No tiene assistant');
        
        if (vapiConfig.assistant && vapiConfig.assistant.model && vapiConfig.assistant.model.messages) {
          console.log('Messages encontrados:', vapiConfig.assistant.model.messages.length);
          
          vapiConfig.assistant.model.messages.forEach((message: any, index: number) => {
            console.log(`Message ${index}:`, { role: message.role, contentLength: message.content?.length });
            
            if (message.role === 'system' && message.content && message.content.length > 100) {
              prompts.push({
                node_id: node.id,
                node_name: node.name || 'Respond to Webhook VAPI',
                node_type: node.type,
                parameter_key: `responseBody.assistant.model.messages[${index}]`,
                prompt_content: message.content,
                prompt_type: 'system_message',
                checkpoint: this.extractCheckpointFromMessage(message.content),
                position: node.position,
                message_index: index,
                seconds_from_start: 0
              });
            }
          });
        } else {
          console.log('No se encontró estructura assistant.model.messages en responseBody');
        }
      } catch (error) {
        console.error('Error parsing responseBody:', error);
      }
    }

    // Caso 3: Estructura original (por compatibilidad)
    if (node.parameters.assistant && node.parameters.assistant.model && node.parameters.assistant.model.messages) {
      const messages = node.parameters.assistant.model.messages;
      
      messages.forEach((message: any, index: number) => {
        if (message.role === 'system' && message.message && message.message.length > 100) {
          prompts.push({
            node_id: node.id,
            node_name: node.name || 'VAPI Node',
            node_type: node.type,
            parameter_key: `assistant.model.messages[${index}]`,
            prompt_content: message.message,
            prompt_type: 'system_message',
            checkpoint: this.extractCheckpointFromMessage(message.message),
            position: node.position,
            message_index: index,
            seconds_from_start: message.secondsFromStart || 0
          });
        }
      });
    }

    return prompts;
  }

  // Extraer información de checkpoint del mensaje
  private extractCheckpointFromMessage(message: string): string | null {
    const checkpointMatch = message.match(/CHECKPOINT\s+(\d+):\s*([^-\n]+)/i);
    if (checkpointMatch) {
      return `Checkpoint ${checkpointMatch[1]}: ${checkpointMatch[2].trim()}`;
    }
    
    // Buscar otros patrones
    if (message.includes('SALUDO')) return 'Saludo y Continuación';
    if (message.includes('CONEXIÓN EMOCIONAL')) return 'Conexión Emocional';
    if (message.includes('DISCOVERY')) return 'Discovery Familiar';
    if (message.includes('URGENCIA')) return 'Urgencia y Oportunidad';
    if (message.includes('PRESENTACIÓN')) return 'Presentación de Oferta';
    if (message.includes('PROTECCIÓN')) return 'Protección Anti-Manipulación';
    if (message.includes('VOCALIZACIÓN')) return 'Control de Vocalización';
    if (message.includes('REGLAS DE NEGOCIO')) return 'Reglas de Negocio';
    
    return null;
  }
}

export const n8nProxyService = new N8nProxyService();
export default n8nProxyService;
