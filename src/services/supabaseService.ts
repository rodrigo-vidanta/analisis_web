import { supabaseMain as supabase, supabaseMainAdmin as supabaseAdmin, type AgentTemplate, type AgentCategory, type SystemPrompt, type ToolCatalog } from '../config/supabase';

/**
 * ============================================
 * SERVICIO PRINCIPAL DE AGENTES - MÓDULO PQNC HUMANS
 * ============================================
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/admin/README_PQNC_HUMANS.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/admin/README_PQNC_HUMANS.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/admin/CHANGELOG_PQNC_HUMANS.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 */

// ===============================
// CATEGORÍAS DE AGENTES
// ===============================

export const getAgentCategories = async (): Promise<AgentCategory[]> => {
  const { data, error } = await supabaseAdmin
    .from('agent_categories')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
};

// ===============================
// PLANTILLAS DE AGENTES
// ===============================

export const getAgentTemplates = async (categoryId?: string): Promise<AgentTemplate[]> => {
  let query = supabaseAdmin
    .from('agent_templates')
    .select(`
      *,
      category:agent_categories(*)
    `)
    .eq('is_active', true)
    .order('usage_count', { ascending: false });
  
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const getAgentTemplateById = async (id: string): Promise<AgentTemplate | null> => {
  const { data, error } = await supabase
    .from('agent_templates')
    .select(`
      *,
      category:agent_categories(*),
      prompts:agent_prompts(
        *,
        system_prompt:system_prompts(*)
      ),
      tools:agent_tools(
        *,
        tool:tools_catalog(*)
      )
    `)
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
};

// ===============================
// IMPORTAR AGENTE DESDE JSON
// ===============================

export const importAgentFromJson = async (jsonData: any, sourceType: 'manual' | 'file' = 'file', analysisOverride?: any): Promise<AgentTemplate> => {
  // Generar hash del JSON para evitar duplicados
  const jsonString = JSON.stringify(jsonData);
  const jsonHash = Array.from(new TextEncoder().encode(jsonString))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(-32);
  
  // TODO: Implementar verificación de duplicados
  // Comentado temporalmente hasta configurar la columna en la BD
  /*
  const { data: existing } = await supabase
    .from('agent_templates')
    .select('id')
    .eq('original_json_hash', jsonHash)
    .single();
  
  if (existing) {
    throw new Error('Este agente ya existe en la base de datos');
  }
  */
  
  // Usar análisis del modal o analizar automáticamente
  const analysis = analysisOverride || analyzeAgentJson(jsonData);
  
  // Buscar el ID real de la categoría usando cliente administrativo
  const { data: category, error: categoryError } = await supabaseAdmin
    .from('agent_categories')
    .select('id')
    .eq('slug', analysis.categoryId)
    .single();
  
  let categoryId: string | null = null;
  
  if (categoryError) {
    console.warn(`Categoría '${analysis.categoryId}' no encontrada, usando categoría por defecto`);
    // Buscar categoría por defecto (atención al cliente)
    const { data: defaultCategory } = await supabaseAdmin
      .from('agent_categories')
      .select('id')
      .eq('slug', 'atencion_clientes')
      .single();
    
    categoryId = defaultCategory?.id || null;
  } else {
    categoryId = category.id;
  }
  
  // Generar nombre único
  const uniqueName = await generateUniqueName(analysis.name, categoryId!, analysis.agentType || 'inbound');
  
  // Crear el agente en la base de datos usando cliente administrativo
  const { data: newAgent, error: agentError } = await supabaseAdmin
    .from('agent_templates')
    .insert({
      name: uniqueName,
      slug: await generateSlug(uniqueName),
      description: analysis.description,
      category_id: categoryId,
      difficulty: analysis.difficulty,
      estimated_time: analysis.estimatedTime,
      keywords: analysis.keywords,
      use_cases: analysis.useCases,
      business_context: analysis.businessContext,
      industry_tags: analysis.industryTags,
      vapi_config: jsonData,
      source_type: sourceType,
      agent_type: analysis.agentType || 'inbound',
      // original_json_hash: jsonHash, // Comentado hasta configurar en BD
      is_public: true
    })
    .select()
    .single();
  
  if (agentError) throw agentError;
  
  console.log('🔍 Procesando prompts y tools para:', newAgent.name);
  
  // Extraer messages y tools correctamente según la estructura
  let messages = [];
  let tools = [];
  
  if (jsonData.assistant) {
    // Estructura con assistant anidado (como Pedro)
    messages = jsonData.assistant.model?.messages || [];
    tools = jsonData.tools || [];
  } else if (jsonData.squad) {
    // Estructura de squad
    messages = [];
    tools = [];
    jsonData.squad.members?.forEach((member: any) => {
      const memberData = member.assistant || member;
      const memberName = memberData.name || 'member';
      if (memberData.model?.messages) {
        const withMember = memberData.model.messages.map((m: any) => ({ ...m, memberName }));
        messages.push(...withMember);
      }
      if (memberData.tools) {
        tools.push(...memberData.tools);
      }
      if (memberData.model?.tools) {
        tools.push(...memberData.model.tools);
      }
      // Assistant Destinations -> synthetic transfer tools
      if (member.assistantDestinations && Array.isArray(member.assistantDestinations)) {
        for (const dest of member.assistantDestinations) {
          const assistantName = dest.assistantName || dest.target || 'assistant';
          tools.push({
            type: 'transferCall',
            name: `transfer_to_${assistantName}`,
            description: dest.description || `Transferir a ${assistantName}`,
            assistantName,
            message: dest.message || ''
          });
        }
      }
    });
    // También agregar tools del nivel raíz
    if (jsonData.tools) {
      tools.push(...jsonData.tools);
    }
  } else {
    // Estructura simple
    messages = jsonData.messages || jsonData.model?.messages || [];
    tools = jsonData.functions || jsonData.tools || [];
  }
  
  console.log('📝 Messages encontrados:', messages.length);
  console.log('🔧 Tools encontrados:', tools.length);
  
  // Procesar y guardar prompts
  if (messages.length > 0) {
    await processAndSavePrompts(newAgent.id, messages);
  }
  
  // Procesar y guardar herramientas
  if (tools.length > 0) {
    await processAndSaveTools(newAgent.id, tools);
  }
  
  return newAgent;
};

// ===============================
// ANÁLISIS DE JSON
// ===============================

const analyzeAgentJson = (jsonData: any) => {
  // Manejar estructura de squad, agente individual, o assistant nested
  let agentData = jsonData;
  let name = jsonData.name || 'Agente Importado';
  
  // Si hay estructura assistant anidada (como Pedro)
  if (jsonData.assistant) {
    agentData = jsonData.assistant;
    name = agentData.name || 'Agente Importado';
  }
  
  // Si es un squad, extraer el primer miembro
  if (jsonData.squad && jsonData.squad.members && jsonData.squad.members.length > 0) {
    agentData = jsonData.squad.members[0].assistant || jsonData.squad.members[0];
    name = jsonData.squad.name || agentData.name || 'Squad Importado';
  }
  
  // Extraer mensajes y funciones de la estructura
  let messages = agentData.messages || [];
  let functions = agentData.tools || agentData.functions || [];
  
  // Si los mensajes están en model.messages (como Pedro)
  if (agentData.model && agentData.model.messages) {
    messages = agentData.model.messages;
  }
  
  // Si las funciones están en model.toolIds (como Pedro), necesitamos extraer las tools del JSON raíz
  if (agentData.model && agentData.model.toolIds && jsonData.tools) {
    functions = jsonData.tools || [];
  }
  
  // Si no hay nombre, intentar extraerlo de los mensajes
  if (!name || name === 'Agente Importado') {
    name = extractNameFromMessages(messages) || name;
  }
  
  // Analizar categoría basado en contenido
  const categoryId = detectCategory(messages, functions);
  
  // Extraer keywords del contenido
  const keywords = extractKeywords(messages);
  
  // Detectar casos de uso
  const useCases = detectUseCases(messages, functions);
  
  // Analizar complejidad
  const difficulty = analyzeDifficulty(jsonData);
  
  return {
    name,
    description: generateDescription(messages, functions),
    categoryId,
    difficulty,
    estimatedTime: estimateImplementationTime(difficulty, functions.length),
    keywords,
    useCases,
    businessContext: extractBusinessContext(messages),
    industryTags: extractIndustryTags(messages)
  };
};

const extractNameFromMessages = (messages: any[]): string => {
  if (!messages?.length) return '';
  
  for (const message of messages) {
    const content = message.content || '';
    const nameMatch = content.match(/soy\s+([A-Za-záéíóúñÑ\s]+)/i) || 
                     content.match(/me\s+llamo\s+([A-Za-záéíóúñÑ\s]+)/i) ||
                     content.match(/nombre\s+es\s+([A-Za-záéíóúñÑ\s]+)/i);
    
    if (nameMatch) {
      return nameMatch[1].trim().replace(/[,.].*$/, '');
    }
  }
  
  return '';
};

const detectCategory = (messages: any[], functions: any[]): string => {
  const content = messages.map(m => m.content || '').join(' ').toLowerCase();
  const functionNames = functions.map(f => f.name || f.function?.name || '').join(' ').toLowerCase();
  const functionDescriptions = functions.map(f => f.description || f.function?.description || '').join(' ').toLowerCase();
  const allContent = content + ' ' + functionNames + ' ' + functionDescriptions;
  
  // Palabras clave por categoría (mejoradas)
  const categories = {
    'ventas': [
      'venta', 'vender', 'producto', 'precio', 'comprar', 'promoción', 'descuento', 'cotización',
      'prospecto', 'lead', 'cliente potencial', 'oferta', 'propuesta', 'demo', 'presentación',
      'cerrar', 'negocio', 'oportunidad', 'pipeline', 'discovery', 'agendamiento', 'cita'
    ],
    'cobranza': [
      'pago', 'deuda', 'factura', 'cobro', 'vencimiento', 'moroso', 'saldo', 'cuota',
      'recordatorio', 'atraso', 'pendiente', 'financiamiento', 'plan de pago', 'estado de cuenta'
    ],
    'soporte_tecnico': [
      'técnico', 'error', 'problema', 'solución', 'configuración', 'instalación', 'troubleshooting',
      'bug', 'falla', 'reparación', 'diagnóstico', 'mantenimiento', 'actualización', 'soporte'
    ],
    'atencion_clientes': [
      'cliente', 'servicio', 'atención', 'consulta', 'información', 'ayuda', 'soporte',
      'dudas', 'preguntas', 'asistencia', 'orientación', 'guía', 'resolver', 'explicar'
    ]
  };
  
  let maxScore = 0;
  let detectedCategory = 'atencion_clientes'; // Por defecto
  
  for (const [category, keywords] of Object.entries(categories)) {
    const score = keywords.reduce((acc, keyword) => {
      const matches = (allContent.match(new RegExp(keyword, 'g')) || []).length;
      return acc + matches;
    }, 0);
    
    if (score > maxScore) {
      maxScore = score;
      detectedCategory = category;
    }
  }
  
  // Si contiene palabras relacionadas con agendamiento/discovery/ventas, es ventas
  if (allContent.includes('agendar') || allContent.includes('discovery') || allContent.includes('calendly')) {
    detectedCategory = 'ventas';
  }
  
  return detectedCategory;
};

const extractKeywords = (messages: any[]): string[] => {
  const content = messages.map(m => m.content || '').join(' ').toLowerCase();
  
  const commonKeywords = [
    'atención al cliente', 'servicio', 'consulta', 'información', 'ayuda',
    'ventas', 'producto', 'precio', 'compra', 'cotización',
    'cobranza', 'pago', 'factura', 'deuda', 'vencimiento',
    'soporte técnico', 'problema', 'solución', 'error', 'configuración'
  ];
  
  return commonKeywords.filter(keyword => content.includes(keyword));
};

const detectUseCases = (messages: any[], functions: any[]): string[] => {
  const useCases = [];
  const content = messages.map(m => m.content || '').join(' ').toLowerCase();
  
  if (content.includes('cita') || content.includes('agenda')) {
    useCases.push('Agendamiento de citas');
  }
  if (content.includes('información') || content.includes('consulta')) {
    useCases.push('Consultas de información');
  }
  if (functions.some(f => f.name?.includes('transfer'))) {
    useCases.push('Transferencia de llamadas');
  }
  if (content.includes('venta') || content.includes('producto')) {
    useCases.push('Proceso de ventas');
  }
  
  return useCases;
};

const analyzeDifficulty = (jsonData: any): 'beginner' | 'intermediate' | 'advanced' => {
  let complexity = 0;
  
  // Analizar número de funciones
  const functionsCount = (jsonData.functions || jsonData.tools || []).length;
  complexity += functionsCount * 2;
  
  // Analizar número de mensajes del sistema
  const messagesCount = (jsonData.messages || []).length;
  complexity += messagesCount;
  
  // Analizar configuraciones avanzadas
  if (jsonData.analysisPlan) complexity += 3;
  if (jsonData.voicemailDetection) complexity += 2;
  if (jsonData.endCallFunctionEnabled) complexity += 1;
  
  if (complexity <= 5) return 'beginner';
  if (complexity <= 12) return 'intermediate';
  return 'advanced';
};

const generateDescription = (messages: any[], functions: any[]): string => {
  const hasTransfer = functions.some(f => f.name?.includes('transfer'));
  const hasEndCall = functions.some(f => f.name?.includes('endCall'));
  const functionsCount = functions.length;
  
  let description = 'Agente conversacional';
  
  if (functionsCount > 0) {
    description += ` con ${functionsCount} herramienta${functionsCount > 1 ? 's' : ''}`;
  }
  
  if (hasTransfer) {
    description += ', capacidad de transferencia';
  }
  
  if (hasEndCall) {
    description += ', finalización automática de llamadas';
  }
  
  description += '. Importado desde configuración JSON.';
  
  return description;
};

const estimateImplementationTime = (difficulty: string, toolsCount: number): string => {
  const baseTime = {
    'beginner': 15,
    'intermediate': 30,
    'advanced': 60
  };
  
  const total = baseTime[difficulty as keyof typeof baseTime] + (toolsCount * 5);
  return `${total} minutos`;
};

const extractBusinessContext = (messages: any[]): string => {
  const content = messages.map(m => m.content || '').join(' ');
  
  // Extraer información de empresa
  const companyMatch = content.match(/empresa\s+([A-Za-záéíóúñÑ\s]+)/i) ||
                      content.match(/compañía\s+([A-Za-záéíóúñÑ\s]+)/i);
  
  if (companyMatch) {
    return `Agente para empresa: ${companyMatch[1].trim()}`;
  }
  
  return 'Contexto de negocio extraído automáticamente desde JSON importado';
};

const extractIndustryTags = (messages: any[]): string[] => {
  const content = messages.map(m => m.content || '').join(' ').toLowerCase();
  const industries = [];
  
  const industryKeywords = {
    'retail': ['tienda', 'retail', 'comercio', 'venta al por menor'],
    'telecomunicaciones': ['telecom', 'telecomunicaciones', 'internet', 'telefonia'],
    'servicios': ['servicios', 'consultoría', 'asesoría'],
    'tecnología': ['software', 'tecnología', 'tech', 'desarrollo'],
    'salud': ['salud', 'médico', 'clínica', 'hospital'],
    'educación': ['educación', 'escuela', 'universidad', 'curso']
  };
  
  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some(keyword => content.includes(keyword))) {
      industries.push(industry);
    }
  }
  
  return industries.length ? industries : ['general'];
};

const generateSlug = async (name: string): Promise<string> => {
  const baseSlug = name
    .toLowerCase()
    .replace(/[áéíóúñ]/g, char => {
      const replacements: { [key: string]: string } = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n'
      };
      return replacements[char] || char;
    })
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Verificar si el slug ya existe
  let finalSlug = baseSlug;
  let counter = 1;
  
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('agent_templates')
      .select('id')
      .eq('slug', finalSlug)
      .maybeSingle(); // Cambiar a maybeSingle
    
    console.log(`🔍 Verificando slug "${finalSlug}":`, { data, error });
    
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error verificando slug:', error);
      break; // Si hay error, usar el slug actual
    }
    
    if (!data) {
      // El slug está disponible
      console.log('✅ Slug disponible:', finalSlug);
      break;
    }
    
    // Generar nuevo slug con sufijo
    finalSlug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return finalSlug;
};

const generateUniqueName = async (baseName: string, categoryId: string, agentType: string): Promise<string> => {
  // Verificar si el nombre ya existe
  let finalName = baseName;
  let counter = 1;
  
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('agent_templates')
      .select('id')
      .eq('name', finalName)
      .eq('category_id', categoryId)
      .eq('agent_type', agentType)
      .maybeSingle(); // Cambiar a maybeSingle para evitar errores cuando no existe
    
    console.log(`🔍 Verificando nombre "${finalName}":`, { data, error });
    
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error verificando nombre:', error);
      break; // Si hay error, usar el nombre actual
    }
    
    if (!data) {
      // El nombre está disponible
      console.log('✅ Nombre disponible:', finalName);
      break;
    }
    
    // Generar nuevo nombre con sufijo
    if (agentType === 'inbound') {
      finalName = `${baseName} (Inbound ${counter})`;
    } else {
      finalName = `${baseName} (Outbound ${counter})`;
    }
    counter++;
  }
  
  return finalName;
};

// ===============================
// PROCESAMIENTO DE PROMPTS Y TOOLS
// ===============================

const processAndSavePrompts = async (agentId: string, messages: any[]) => {
  console.log(`💬 Procesando ${messages.length} mensajes para agente ${agentId}`);
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    console.log(`📝 Procesando mensaje ${i + 1}:`, message.role, '|', message.content?.substring(0, 50) + '...');
    
    if (!message.content) {
      console.warn('⚠️ Mensaje sin contenido, saltando...');
      continue;
    }
    
    // Verificar si el prompt ya existe
    const { data: existingPrompt, error: checkError } = await supabaseAdmin
      .from('system_prompts')
      .select('id')
      .eq('content', message.content)
      .maybeSingle(); // Cambiar a maybeSingle
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error verificando prompt existente:', checkError);
    }
    
    let promptId = existingPrompt?.id;
    
    if (!promptId) {
      // Crear nuevo prompt
      const { data: newPrompt, error } = await supabaseAdmin
        .from('system_prompts')
        .insert({
          title: extractPromptTitle(message.content),
          content: message.content,
          role: message.role || 'system',
          category: categorizePrompt(message.content),
          prompt_type: detectPromptType(message.content),
          keywords: extractKeywords([message]),
          applicable_categories: ['general'],
          order_priority: i + 1,
          is_required: i === 0, // El primer prompt suele ser la identidad
          is_editable: true,
          variables: extractVariables(message.content),
          context_tags: message.memberName ? [`member:${message.memberName}`] : []
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('Error creating prompt:', error);
        continue;
      }
      
      promptId = newPrompt.id;
    }
    
    // Asociar prompt con agente
    const { error: relationError } = await supabaseAdmin
      .from('agent_prompts')
      .insert({
        agent_template_id: agentId,
        system_prompt_id: promptId,
        order_index: i,
        is_customized: false,
        custom_content: null
      });
    
    if (relationError) {
      console.error('Error creating agent-prompt relation:', relationError);
    }
  }
};

const processAndSaveTools = async (agentId: string, functions: any[]) => {
  console.log(`🔧 Procesando ${functions.length} herramientas para agente ${agentId}`);
  
  for (const func of functions) {
    console.log(`🛠️ Procesando herramienta:`, func.name || func.type, '|', func.description?.substring(0, 50) + '...');
    
    if (!func.function?.name && !func.name && !func.type) {
      console.warn('⚠️ Herramienta sin nombre o tipo, saltando...', func);
      continue;
    }
    
    // Extraer el nombre correcto de la herramienta
    const toolName = func.function?.name || func.name || func.type || 'Unknown Tool';
    
    console.log(`🔍 Nombre de herramienta detectado: "${toolName}" | Estructura:`, {
      'func.function?.name': func.function?.name,
      'func.name': func.name,
      'func.type': func.type
    });
    
    // Verificar si la herramienta ya existe
    const { data: existingTool, error: checkError } = await supabaseAdmin
      .from('tools_catalog')
      .select('id')
      .eq('name', toolName)
      .maybeSingle(); // Cambiar a maybeSingle
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error verificando herramienta existente:', checkError);
    }
    
    let toolId = existingTool?.id;
    
    if (!toolId) {
      // Crear nueva herramienta
      const { data: newTool, error } = await supabaseAdmin
        .from('tools_catalog')
        .insert({
          name: toolName, // Usar el toolName ya calculado
          tool_type: detectToolType(func),
          category: categorizeToolCatalog(func),
          config: func,
          description: func.function?.description || func.description || `Herramienta: ${toolName}`,
          complexity: analyzeToolComplexity(func),
          keywords: extractToolKeywords(func),
          use_cases: detectToolUseCases(func),
          applicable_categories: ['general']
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('Error creating tool:', error);
        continue;
      }
      
      toolId = newTool.id;
    }
    
    // Asociar herramienta con agente
    const { error: relationError } = await supabaseAdmin
      .from('agent_tools')
      .insert({
        agent_template_id: agentId,
        tool_id: toolId,
        is_enabled: true,
        custom_config: func
      });
    
    if (relationError) {
      console.error('Error creating agent-tool relation:', relationError);
    }
  }
};

// Funciones auxiliares para prompts y tools
const extractPromptTitle = (content: string): string => {
  const firstLine = content.split('\n')[0];
  if (firstLine.length > 50) {
    return firstLine.substring(0, 47) + '...';
  }
  return firstLine || 'Prompt del Sistema';
};

const categorizePrompt = (content: string): string => {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('eres') || lowerContent.includes('nombre') || lowerContent.includes('identidad')) {
    return 'identity';
  }
  if (lowerContent.includes('flujo') || lowerContent.includes('proceso') || lowerContent.includes('pasos')) {
    return 'workflow';
  }
  if (lowerContent.includes('no') || lowerContent.includes('nunca') || lowerContent.includes('prohibido')) {
    return 'restrictions';
  }
  if (lowerContent.includes('tono') || lowerContent.includes('manera') || lowerContent.includes('estilo')) {
    return 'communication';
  }
  
  return 'general';
};

const detectPromptType = (content: string): string => {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('saludo') || lowerContent.includes('hola') || lowerContent.includes('inicio')) {
    return 'greeting';
  }
  if (lowerContent.includes('despedida') || lowerContent.includes('adiós') || lowerContent.includes('terminar')) {
    return 'closing';
  }
  if (lowerContent.includes('objeción') || lowerContent.includes('rechazo') || lowerContent.includes('no interesa')) {
    return 'objection_handling';
  }
  
  return 'general';
};

const extractVariables = (content: string): string[] => {
  const variablePattern = /\{\{\s*\$?([^}]+)\s*\}\}/g;
  const variables = [];
  let match;
  
  while ((match = variablePattern.exec(content)) !== null) {
    variables.push(match[1].trim());
  }
  
  return variables;
};

const detectToolType = (func: any): 'function' | 'transferCall' | 'endCall' => {
  const name = (func.name || func.function?.name || '').toLowerCase();
  const type = (func.type || '').toLowerCase();

  if (type === 'endcall' || (name.includes('end') && name.includes('call'))) return 'endCall';
  if (type === 'transfercall' || type === 'transfer' || name.includes('transfer')) return 'transferCall';
  return 'function';
};

const categorizeToolCatalog = (func: any): string => {
  const name = (func.name || func.function?.name || '').toLowerCase();
  const description = (func.description || func.function?.description || '').toLowerCase();
  
  if (name.includes('transfer') || description.includes('transfer')) {
    return 'communication';
  }
  if (name.includes('data') || description.includes('información')) {
    return 'data_collection';
  }
  if (name.includes('api') || description.includes('external')) {
    return 'external_api';
  }
  
  return 'business_logic';
};

const analyzeToolComplexity = (func: any): 'simple' | 'medium' | 'complex' => {
  const parametersCount = Object.keys(func.function?.parameters?.properties || func.parameters?.properties || {}).length;
  
  if (parametersCount <= 2) return 'simple';
  if (parametersCount <= 5) return 'medium';
  return 'complex';
};

const extractToolKeywords = (func: any): string[] => {
  const keywords = [];
  const name = func.name || func.function?.name || '';
  const description = func.description || func.function?.description || '';
  
  keywords.push(name);
  
  if (description.includes('transfer')) keywords.push('transferencia');
  if (description.includes('call')) keywords.push('llamada');
  if (description.includes('data')) keywords.push('datos');
  
  return keywords;
};

const detectToolUseCases = (func: any): string[] => {
  const useCases = [];
  const name = (func.name || func.function?.name || '').toLowerCase();
  
  if (name.includes('transfer')) {
    useCases.push('Transferencia de llamadas');
  }
  if (name.includes('end')) {
    useCases.push('Finalización de llamadas');
  }
  if (name.includes('data') || name.includes('info')) {
    useCases.push('Recopilación de datos');
  }
  
  return useCases;
};

// ===============================
// BÚSQUEDA INTELIGENTE
// ===============================

export const searchAgentTemplates = async (query: string, categoryId?: string): Promise<AgentTemplate[]> => {
  const { data, error } = await supabase
    .rpc('search_agent_templates', {
      search_query: query,
      category_filter: categoryId || null,
      limit_results: 20
    });
  
  if (error) throw error;
  return data || [];
};

// ===============================
// GESTIÓN DE PLANTILLAS
// ===============================

export const createAgentTemplate = async (templateData: Partial<AgentTemplate>): Promise<AgentTemplate> => {
  const { data, error } = await supabase
    .from('agent_templates')
    .insert({
      ...templateData,
      slug: await generateSlug(templateData.name || 'nuevo-agente'),
      is_active: true,
      is_public: false,
      source_type: 'manual'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ===============================
// ELIMINAR AGENTE
// ===============================

export const deleteAgentTemplate = async (templateId: string): Promise<void> => {
  try {
    console.log(`🗑️ Iniciando eliminación de agente: ${templateId}`);
    
    // 1. Eliminar asociaciones con prompts (agent_prompts)
    console.log('🔗 Eliminando asociaciones con prompts...');
    const { error: promptsError } = await supabaseAdmin
      .from('agent_prompts')
      .delete()
      .eq('agent_template_id', templateId);
    
    if (promptsError) {
      console.error('❌ Error eliminando agent_prompts:', promptsError);
      throw promptsError;
    }
    
    // 2. Eliminar asociaciones con herramientas (agent_tools)
    console.log('🔧 Eliminando asociaciones con herramientas...');
    const { error: toolsError } = await supabaseAdmin
      .from('agent_tools')
      .delete()
      .eq('agent_template_id', templateId);
    
    if (toolsError) {
      console.error('❌ Error eliminando agent_tools:', toolsError);
      throw toolsError;
    }
    
    // 3. Eliminar logs de uso si existen
    console.log('📊 Eliminando logs de uso...');
    const { error: logsError } = await supabaseAdmin
      .from('agent_usage_logs')
      .delete()
      .eq('agent_template_id', templateId);
    
    // No fallar si no existe la columna o tabla
    if (logsError && !logsError.message.includes('column') && !logsError.message.includes('does not exist')) {
      console.warn('⚠️ Error eliminando logs (no crítico):', logsError);
    }
    
    // 4. Eliminar el agente principal
    console.log('👤 Eliminando agente principal...');
    const { error: agentError } = await supabaseAdmin
      .from('agent_templates')
      .delete()
      .eq('id', templateId);
    
    if (agentError) {
      console.error('❌ Error eliminando agent_templates:', agentError);
      throw agentError;
    }
    
    console.log(`✅ Agente ${templateId} eliminado completamente de todas las tablas`);
  } catch (error) {
    console.error('❌ Error eliminando agente:', error);
    throw new Error(`Error al eliminar el agente: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
};

export const updateAgentTemplate = async (id: string, updates: Partial<AgentTemplate>): Promise<AgentTemplate> => {
  try {
    console.log(`✏️ Iniciando actualización de agente: ${id}`);
    console.log('📝 Datos a actualizar:', updates);
    
    // Preparar los datos para actualización, excluyendo campos que no deben cambiar
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    // Remover campos que no deben actualizarse manualmente
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.usage_count;
    delete updateData.success_rate;
    delete updateData.created_by;
    delete updateData.vapi_config; // Solo se actualiza por importación completa
    delete updateData.original_json_hash; // Solo se actualiza por importación completa
    
    console.log('🔄 Datos finales a actualizar:', updateData);
    
    // Usar cliente administrativo para actualizar solo agent_templates
    const { data, error } = await supabaseAdmin
      .from('agent_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error en update de agent_templates:', error);
      throw error;
    }
    
    console.log('✅ Agente actualizado exitosamente:', data.name);
    console.log('📊 Datos actualizados:', data);
    
    return data;
  } catch (error) {
    console.error('❌ Error actualizando agente:', error);
    throw new Error(`Error al actualizar el agente: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
};

export const incrementUsageCount = async (templateId: string): Promise<void> => {
  await supabase.rpc('increment_usage_count', { template_id: templateId });
};

// ===============================
// PERSISTENCIA DESDE EL EDITOR
// ===============================

export interface SimpleMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Reemplaza las relaciones de prompts de un agente con el nuevo orden y contenido.
 * - Si existe un prompt con mismo contenido/rol se reutiliza
 * - Si no existe, se crea un prompt básico en system_prompts
 */
export const saveAgentPrompts = async (
  agentId: string,
  messages: SimpleMessage[]
): Promise<void> => {
  // 1) Limpiar relaciones actuales
  await supabaseAdmin
    .from('agent_prompts')
    .delete()
    .eq('agent_template_id', agentId);

  // 2) Asegurar/crear prompts y relacionarlos
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    // Buscar prompt existente por contenido y rol
    const { data: existing, error: findErr } = await supabaseAdmin
      .from('system_prompts')
      .select('id')
      .eq('content', msg.content)
      .eq('role', msg.role)
      .maybeSingle();

    if (findErr && findErr.code !== 'PGRST116') {
      console.warn('Error buscando prompt existente:', findErr);
    }

    let promptId = existing?.id as string | undefined;

    if (!promptId) {
      // Crear uno nuevo con valores por defecto seguros
      const { data: created, error: createErr } = await supabaseAdmin
        .from('system_prompts')
        .insert({
          title: `Prompt ${i + 1}`,
          content: msg.content,
          role: msg.role,
          category: 'general',
          prompt_type: 'instruction',
          keywords: [],
          applicable_categories: ['general'],
          context_tags: [],
          order_priority: i + 1,
          is_required: i === 0,
          is_editable: true,
          variables: [],
          language: 'es',
          tested_scenarios: []
        })
        .select('id')
        .single();

      if (createErr) {
        throw createErr;
      }
      promptId = created.id;
    }

    // Crear relación con el agente
    const { error: relErr } = await supabaseAdmin
      .from('agent_prompts')
      .insert({
        agent_template_id: agentId,
        system_prompt_id: promptId,
        order_index: i,
        is_customized: false,
        custom_content: null
      });

    if (relErr) {
      throw relErr;
    }
  }
};

interface GenericSelectedTool {
  id: string;
  isEnabled?: boolean;
  customConfig?: any;
  name?: string;
  tool_type?: 'function' | 'transferCall' | 'endCall' | string;
  category?: string;
  description?: string;
}

/**
 * Reemplaza las relaciones de herramientas del agente con las seleccionadas en el editor.
 */
export const saveAgentTools = async (
  agentId: string,
  tools: GenericSelectedTool[]
): Promise<void> => {
  // 1) Limpiar relaciones actuales
  await supabaseAdmin
    .from('agent_tools')
    .delete()
    .eq('agent_template_id', agentId);

  for (const t of tools) {
    // Asegurar que la herramienta exista en catálogo (normalmente ya existe)
    let toolId = t.id;
    if (!toolId) {
      // Crear una mínima si faltara id
      const { data: created, error: toolErr } = await supabaseAdmin
        .from('tools_catalog')
        .insert({
          name: t.name || 'Custom Tool',
          tool_type: (t.tool_type as any) || 'function',
          category: t.category || 'general',
          config: {},
          description: t.description || null,
          complexity: 'medium',
          keywords: [],
          use_cases: [],
          integration_requirements: [],
          applicable_categories: ['general'],
          is_active: true,
          usage_count: 0,
          success_rate: 0
        })
        .select('id')
        .single();
      if (toolErr) throw toolErr;
      toolId = created.id;
    }

    // Crear relación agent_tools
    const { error: relErr } = await supabaseAdmin
      .from('agent_tools')
      .insert({
        agent_template_id: agentId,
        tool_id: toolId,
        is_enabled: t.isEnabled ?? true,
        custom_config: t.customConfig || null
      });
    if (relErr) throw relErr;
  }
};

/**
 * Actualiza el JSON completo (vapi_config) del agente.
 */
export const saveAgentVapiConfig = async (
  agentId: string,
  vapiConfig: any
): Promise<void> => {
  const { error } = await supabaseAdmin
    .from('agent_templates')
    .update({ vapi_config: vapiConfig, updated_at: new Date().toISOString() })
    .eq('id', agentId);
  if (error) throw error;
};

// ===============================
// CREAR AGENTE DESDE EDITOR
// ===============================

export interface EditorAgentPayload {
  name: string;
  description?: string;
  category_id: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_time?: string;
  keywords: string[];
  use_cases: string[];
  agent_type: 'inbound' | 'outbound';
  vapi_config: any;
}

export const createAgentFromEditor = async (
  payload: EditorAgentPayload,
  createdByUserId: string,
  options?: { draft?: boolean; isPublic?: boolean }
): Promise<{ id: string; slug: string; name: string }> => {
  const isDraft = options?.draft ?? false;
  const isPublic = options?.isPublic ?? !isDraft;

  const insertData = {
    name: payload.name,
    slug: await generateSlug(payload.name),
    description: payload.description || null,
    category_id: payload.category_id,
    difficulty: payload.difficulty,
    estimated_time: payload.estimated_time || null,
    keywords: payload.keywords || [],
    use_cases: payload.use_cases || [],
    business_context: null,
    industry_tags: [],
    vapi_config: payload.vapi_config,
    usage_count: 0,
    success_rate: 0,
    is_active: !isDraft,
    is_public: isPublic,
    source_type: 'manual',
    created_by: createdByUserId,
    agent_type: payload.agent_type
  } as any;

  const { data, error } = await supabaseAdmin
    .from('agent_templates')
    .insert(insertData)
    .select('id, slug, name')
    .single();

  if (error) throw error;
  return data as { id: string; slug: string; name: string };
};

// ===============================
// CREAR HERRAMIENTA
// ===============================

export interface ToolInput {
  name: string;
  tool_type: 'function' | 'transferCall' | 'endCall';
  category: string;
  description?: string;
  config?: any;
  complexity?: 'simple' | 'medium' | 'complex';
  keywords?: string[];
  use_cases?: string[];
}

export const createTool = async (
  input: ToolInput,
  createdByUserId?: string
): Promise<{ id: string; name: string }> => {
  const config = {
    ...(input.config || {}),
    metadata: {
      ...(input.config?.metadata || {}),
      created_by: createdByUserId || null
    }
  };

  const { data, error } = await supabaseAdmin
    .from('tools_catalog')
    .insert({
      name: input.name,
      tool_type: input.tool_type,
      category: input.category,
      config,
      description: input.description || null,
      complexity: input.complexity || 'medium',
      keywords: input.keywords || [],
      use_cases: input.use_cases || [],
      integration_requirements: [],
      applicable_categories: ['general'],
      is_active: true,
      usage_count: 0,
      success_rate: 0
    })
    .select('id, name')
    .single();

  if (error) throw error;
  return data as { id: string; name: string };
};
