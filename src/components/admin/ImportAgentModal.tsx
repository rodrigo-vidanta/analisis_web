import React, { useState } from 'react';
import { supabaseMainAdmin } from '../../config/supabase';
import type { AgentTemplate } from '../../config/supabase';

interface ImportAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (template: AgentTemplate) => void;
}

const ImportAgentModal: React.FC<ImportAgentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [jsonContent, setJsonContent] = useState('');
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [metadata, setMetadata] = useState({
    name: '',
    description: '',
    category_id: '96414134-905f-4337-9428-1d2fdef34973',
    difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    agent_type: 'inbound' as 'inbound' | 'outbound',
    keywords: [] as string[],
    use_cases: [] as string[],
    industry_tags: [] as string[]
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setJsonContent(content);
        setError(null);
        
        // Extraer información del JSON
        try {
          const jsonData = JSON.parse(content);
          extractMetadataFromJSON(jsonData);
        } catch (err) {
          // El JSON será validado después
        }
      };
      reader.readAsText(file);
    }
  };

  const extractMetadataFromJSON = (jsonData: any) => {
    let extractedName = jsonData.name || '';
    let extractedDescription = jsonData.description || '';
    
    // Si es un workflow de n8n, extraer información del squad
    if (jsonData.nodes && Array.isArray(jsonData.nodes)) {
      const responseNode = jsonData.nodes.find((node: any) => 
        node.type === 'n8n-nodes-base.respondToWebhook' && 
        node.parameters?.responseBody
      );
      
      if (responseNode) {
        try {
          let responseBody = responseNode.parameters.responseBody;
          if (typeof responseBody === 'string') {
            if (responseBody.startsWith('=')) {
              responseBody = responseBody.substring(1);
            }
            responseBody = JSON.parse(responseBody);
          }
          
          if (responseBody.squad) {
            extractedName = extractedName || responseBody.squad.name || 'Agente Importado';
            extractedDescription = extractedDescription || `Agente basado en squad: ${responseBody.squad.name}`;
            
            // Extraer keywords de los mensajes del sistema
            const keywords = new Set<string>();
            if (responseBody.squad.members) {
              responseBody.squad.members.forEach((member: any) => {
                if (member.assistant?.model?.messages) {
                  member.assistant.model.messages.forEach((msg: any) => {
                    if (msg.content) {
                      // Extraer palabras clave del contenido
                      const words = msg.content.toLowerCase()
                        .match(/\b\w{4,}\b/g) || [];
                      words.forEach((word: string) => {
                        if (word.length > 4 && !['sistema', 'mensaje', 'contenido'].includes(word)) {
                          keywords.add(word);
                        }
                      });
                    }
                  });
                }
              });
            }
            
            setMetadata(prev => ({
              ...prev,
              name: extractedName,
              description: extractedDescription,
              keywords: Array.from(keywords).slice(0, 10) // Máximo 10 keywords
            }));
          }
        } catch (err) {
          // Si hay error, usar valores por defecto
        }
      }
    }
    
    // Si no se extrajo nombre, usar el del JSON o generar uno
    if (!extractedName) {
      extractedName = jsonData.name || `Agente Importado ${new Date().toLocaleDateString()}`;
    }
    
    setMetadata(prev => ({
      ...prev,
      name: extractedName,
      description: extractedDescription || `Agente importado desde ${jsonData.id ? 'n8n' : 'JSON'}`
    }));
  };

  const validateAgentJSON = (jsonData: any): boolean => {
    try {
      // Validaciones básicas
      if (!jsonData.name) {
        throw new Error('El JSON debe contener name');
      }

      // Verificar si es un JSON de n8n
      if (jsonData.nodes && Array.isArray(jsonData.nodes)) {
        // Es un workflow de n8n, buscar el nodo de respuesta
        const responseNode = jsonData.nodes.find((node: any) => 
          node.type === 'n8n-nodes-base.respondToWebhook' && 
          node.parameters?.responseBody
        );
        
        if (!responseNode) {
          throw new Error('No se encontró un nodo de respuesta con configuración de agente');
        }

        try {
          // El responseBody puede ser un string o un objeto
          let responseBody = responseNode.parameters.responseBody;
          if (typeof responseBody === 'string') {
            // Si es una expresión de n8n (comienza con =), extraer el JSON
            if (responseBody.startsWith('=')) {
              responseBody = responseBody.substring(1); // Remover el =
            }
            responseBody = JSON.parse(responseBody);
          }
          
          if (!responseBody.squad || !responseBody.squad.members) {
            throw new Error('La configuración del agente debe contener squad con members');
          }
        } catch (parseError) {
          console.error('Error parsing response body:', parseError);
          throw new Error('Error al parsear la configuración del agente en el nodo de respuesta');
        }

        return true;
      }

      // Verificar si es un JSON de VAPI directo
      if (!jsonData.vapi_config) {
        throw new Error('El JSON debe contener vapi_config o ser un workflow de n8n válido');
      }

      // Validar estructura básica de vapi_config
      const vapiConfig = jsonData.vapi_config;
      if (!vapiConfig.model || !vapiConfig.voice) {
        throw new Error('vapi_config debe contener model y voice');
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de validación');
      return false;
    }
  };

  const generateUniqueSlug = async (baseName: string): Promise<string> => {
    let slug = baseName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    let counter = 1;
    let finalSlug = slug;
    
    console.log('🔍 Generando slug único para:', baseName, '-> slug base:', slug);
    
    while (true) {
      const { data: existing, error } = await supabaseMainAdmin
        .from('agent_templates')
        .select('id')
        .eq('slug', finalSlug)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error al verificar slug:', error);
        console.error('❌ Slug error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      if (!existing) {
        console.log('✅ Slug único encontrado:', finalSlug);
        break;
      }
      
      console.log('⚠️ Slug ya existe:', finalSlug, 'probando:', `${slug}-${counter}`);
      finalSlug = `${slug}-${counter}`;
      counter++;
    }
    
    return finalSlug;
  };

  const generateUniqueName = async (baseName: string, categoryId: string): Promise<string> => {
    let finalName = baseName.trim();
    let counter = 1;
    
    console.log('🔍 Generando nombre único para:', baseName, 'en categoría:', categoryId);
    
    while (true) {
      const { data: existing, error } = await supabaseMainAdmin
        .from('agent_templates')
        .select('id')
        .eq('name', finalName)
        .eq('category_id', categoryId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error al verificar nombre:', error);
        console.error('❌ Nombre error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      if (!existing) {
        console.log('✅ Nombre único encontrado:', finalName);
        break;
      }
      
      console.log('⚠️ Nombre ya existe:', finalName, 'probando:', `${baseName.trim()} ${counter}`);
      finalName = `${baseName.trim()} ${counter}`;
      counter++;
    }
    
    return finalName;
  };

  const processAgentData = async (jsonData: any): Promise<AgentTemplate> => {
    let agentConfig: any;
    
    // Si es un workflow de n8n, extraer la configuración del agente
    if (jsonData.nodes && Array.isArray(jsonData.nodes)) {
      const responseNode = jsonData.nodes.find((node: any) => 
        node.type === 'n8n-nodes-base.respondToWebhook' && 
        node.parameters?.responseBody
      );
      
      if (responseNode) {
        // El responseBody puede ser un string o un objeto
        let responseBody = responseNode.parameters.responseBody;
        if (typeof responseBody === 'string') {
          // Si es una expresión de n8n (comienza con =), extraer el JSON
          if (responseBody.startsWith('=')) {
            responseBody = responseBody.substring(1); // Remover el =
          }
          responseBody = JSON.parse(responseBody);
        }
        agentConfig = responseBody;
      }
    } else {
      // Es un JSON de VAPI directo
      agentConfig = jsonData.vapi_config;
    }

    // Asegurar que el squad se preserve en vapi_config
    if (jsonData.squad && !agentConfig.squad) {
      agentConfig.squad = jsonData.squad;
    }

    // Generar nombre y slug únicos
    const uniqueName = await generateUniqueName(metadata.name, metadata.category_id);
    const uniqueSlug = await generateUniqueSlug(uniqueName);

    // Procesar y separar los datos del agente usando los metadatos del formulario
    const template: Partial<AgentTemplate> = {
      name: uniqueName,
      description: metadata.description,
      slug: uniqueSlug,
      category_id: metadata.category_id,
      difficulty: metadata.difficulty,
      estimated_time: '30-60 minutos',
      icon: '🤖',
      agent_type: metadata.agent_type,
      keywords: metadata.keywords,
      use_cases: metadata.use_cases,
      business_context: 'Agente importado desde n8n',
      industry_tags: metadata.industry_tags,
      vapi_config: agentConfig,
      usage_count: 0,
      success_rate: 0,
      is_active: true,
      is_public: false,
      source_type: 'n8n_import',
      original_json_hash: JSON.stringify(jsonData).length.toString(),
      // created_by: 'current_user' // TODO: Agregar cuando el campo exista en la BD
    };

    // Guardar template en la base de datos
    console.log('🔍 Insertando template:', template);
    console.log('🔍 Template keys:', Object.keys(template));
    console.log('🔍 Template values:', Object.values(template));
    
    let templateData: any;
    try {
      const { data, error: templateError } = await supabaseMainAdmin
        .from('agent_templates')
        .insert([template])
        .select()
        .single();

      if (templateError) {
        console.error('❌ Error al insertar template:', templateError);
        console.error('❌ Error details:', {
          code: templateError.code,
          message: templateError.message,
          details: templateError.details,
          hint: templateError.hint
        });
        throw new Error(`Error al insertar plantilla: ${templateError.message}`);
      }
      
      templateData = data;
      console.log('✅ Template insertado exitosamente:', templateData);
    } catch (error) {
      console.error('❌ Error completo al insertar:', error);
      throw error;
    }

    // Procesar prompts del sistema - detectar múltiples squads
    let allMessages: any[] = [];
    
    // Si es de n8n, extraer mensajes del squad
    if (agentConfig.squad && agentConfig.squad.members) {
      console.log('🔍 Procesando squad con', agentConfig.squad.members.length, 'miembros');
      
      for (let memberIndex = 0; memberIndex < agentConfig.squad.members.length; memberIndex++) {
        const member = agentConfig.squad.members[memberIndex];
        console.log(`🔍 Procesando miembro ${memberIndex + 1}:`, member.name || 'Sin nombre');
        
        if (member.assistant && member.assistant.model && member.assistant.model.messages) {
          const memberMessages = member.assistant.model.messages;
          console.log(`📝 Miembro ${memberIndex + 1} tiene ${memberMessages.length} mensajes`);
          
          // Agregar información del miembro a cada mensaje para identificación
          const messagesWithMemberInfo = memberMessages.map((msg: any, msgIndex: number) => ({
            ...msg,
            _memberIndex: memberIndex,
            _memberName: member.name || `Miembro ${memberIndex + 1}`,
            _messageIndex: msgIndex
          }));
          
          allMessages = allMessages.concat(messagesWithMemberInfo);
        }
      }
    } else if (jsonData.messages && Array.isArray(jsonData.messages)) {
      allMessages = jsonData.messages;
    }
    
    console.log(`📋 Total de mensajes a procesar: ${allMessages.length}`);

    if (allMessages.length > 0) {
      for (let i = 0; i < allMessages.length; i++) {
        const message = allMessages[i];
        
        // Limpiar el contenido de variables de n8n y caracteres problemáticos
        const cleanContent = message.content
          ?.replace(/\{\{\s*\$json\.[^}]+\s*\}\}/g, '[VARIABLE_DINAMICA]')
          ?.replace(/\{\{\s*\$\([^)]+\)\.item\.json\[[^\]]+\]\.[^}]+\s*\}\}/g, '[VARIABLE_DINAMICA]')
          ?.replace(/\{\{\s*[^}]+\s*\}\}/g, '[VARIABLE_DINAMICA]')
          ?.replace(/[^\x20-\x7E\u00C0-\u017F\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]/g, '')
          ?.trim() || '';

        // Solo procesar si el contenido limpio no está vacío
        if (!cleanContent || cleanContent.length < 10) {
          console.log(`⚠️ Saltando prompt ${i + 1}: contenido muy corto o vacío`);
          continue;
        }
        
        const memberInfo = message._memberName ? ` (${message._memberName})` : '';
        console.log(`🔍 Procesando prompt ${i + 1}${memberInfo}:`, cleanContent.substring(0, 100) + '...');
        
        // Buscar o crear system prompt
        let systemPromptId: string;
        const { data: existingPrompt, error: searchError } = await supabaseMainAdmin
          .from('system_prompts')
          .select('id')
          .eq('content', cleanContent)
          .maybeSingle();

        if (searchError) {
          console.error('❌ Error al buscar prompt existente:', searchError);
          continue;
        }

        if (existingPrompt) {
          systemPromptId = existingPrompt.id;
          console.log(`✅ Usando prompt existente: ${systemPromptId}`);
        } else {
          try {
            const { data: newPrompt, error: promptError } = await supabaseMainAdmin
              .from('system_prompts')
              .insert([{
                title: `Prompt ${i + 1} - ${message._memberName || uniqueName}`,
                content: cleanContent,
                order_priority: i + 1,
                role: 'system',
                category: 'imported',
                prompt_type: 'system',
                is_required: false,
                is_editable: true,
                language: 'es'
                // created_by: 'current_user' // TODO: Agregar cuando el campo exista en la BD
              }])
              .select()
              .single();

            if (promptError) {
              console.error('❌ Error al insertar prompt:', promptError);
              continue;
            }
            systemPromptId = newPrompt.id;
            console.log(`✅ Prompt creado exitosamente: ${systemPromptId}`);
          } catch (error) {
            console.error('❌ Error al crear prompt:', error);
            continue;
          }
        }

        // Crear relación agent_prompts
        await supabaseMainAdmin
          .from('agent_prompts')
          .insert([{
            agent_template_id: templateData.id,
            system_prompt_id: systemPromptId,
            order_index: i + 1,
            is_customized: false,
            custom_content: null
          }]);
      }
    }

    // Procesar herramientas
    let tools: any[] = [];
    
    // Si es de n8n, extraer herramientas del squad
    if (agentConfig.squad && agentConfig.squad.members) {
      for (const member of agentConfig.squad.members) {
        if (member.assistant && member.assistant.model && member.assistant.model.tools) {
          tools = tools.concat(member.assistant.model.tools);
        }
      }
    } else if (jsonData.tools && Array.isArray(jsonData.tools)) {
      tools = jsonData.tools;
    }

    if (tools.length > 0) {
      for (const tool of tools) {
        // Extraer nombre del tool (puede estar en tool.name o tool.function.name)
        const toolName = tool.name || tool.function?.name;
        
        // Validar que el tool tenga nombre
        if (!toolName || toolName === 'undefined' || toolName.trim() === '') {
          console.log(`⚠️ Saltando tool sin nombre válido:`, tool);
          continue;
        }
        
        console.log(`🔍 Procesando tool: ${toolName}`);
        
        // Buscar o crear tool en el catálogo
        let toolId: string;
        const { data: existingTool, error: searchError } = await supabaseMainAdmin
          .from('tools_catalog')
          .select('id')
          .eq('name', toolName)
          .maybeSingle();
          
        if (searchError) {
          console.error('❌ Error al buscar tool existente:', searchError);
          continue;
        }

        if (existingTool) {
          toolId = existingTool.id;
          console.log(`✅ Usando tool existente: ${toolId}`);
        } else {
          try {
            const { data: newTool, error: toolError } = await supabaseMainAdmin
              .from('tools_catalog')
              .insert([{
                name: toolName,
                description: tool.description || tool.function?.description || `Herramienta ${toolName}`,
                tool_type: tool.type || 'function',
                category: 'imported',
                config: {
                  parameters: tool.parameters || tool.function?.parameters || {},
                  server_url: tool.server?.url || null,
                  is_async: tool.async || false
                },
                is_active: true,
                // created_by: 'current_user' // TODO: Agregar cuando el campo exista en la BD
              }])
              .select()
              .single();

            if (toolError) {
              console.error('❌ Error al insertar tool:', toolError);
              continue;
            }
            toolId = newTool.id;
            console.log(`✅ Tool creado exitosamente: ${toolId}`);
          } catch (error) {
            console.error('❌ Error al crear tool:', error);
            continue;
          }
        }

        // Crear relación agent_tools (verificar si ya existe)
        const { data: existingRelation, error: relationCheckError } = await supabaseMainAdmin
          .from('agent_tools')
          .select('id')
          .eq('agent_template_id', templateData.id)
          .eq('tool_id', toolId)
          .maybeSingle();

        if (relationCheckError) {
          console.error('❌ Error al verificar relación existente:', relationCheckError);
        } else if (!existingRelation) {
          const { error: relationError } = await supabaseMainAdmin
            .from('agent_tools')
            .insert([{
              agent_template_id: templateData.id,
              tool_id: toolId
            }]);

          if (relationError) {
            console.error('❌ Error al crear relación agent_tools:', relationError);
          } else {
            console.log('✅ Relación agent_tools creada exitosamente');
          }
        } else {
          console.log('✅ Relación agent_tools ya existe, saltando...');
        }
      }
    }

    return templateData;
  };

  const handleImport = async () => {
    if (!jsonContent.trim()) {
      setError('Por favor, selecciona un archivo JSON o pega el contenido');
      return;
    }

    try {
      const jsonData = JSON.parse(jsonContent);
      
      if (!validateAgentJSON(jsonData)) {
        return;
      }

      // Guardar los datos extraídos y mostrar formulario de metadatos
      setExtractedData(jsonData);
      setShowMetadataForm(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el JSON');
    }
  };

  const handleFinalImport = async () => {
    if (!extractedData) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const template = await processAgentData(extractedData);
      
      setSuccess('Agente importado exitosamente');
      setTimeout(() => {
        onSuccess(template);
        onClose();
        setJsonContent('');
        setSuccess(null);
        setShowMetadataForm(false);
        setExtractedData(null);
        setMetadata({
          name: '',
          description: '',
          category_id: '96414134-905f-4337-9428-1d2fdef34973',
          difficulty: 'intermediate',
          agent_type: 'inbound',
          keywords: [],
          use_cases: [],
          industry_tags: []
        });
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar el agente');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
            Importar Agente desde JSON
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Upload de archivo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Seleccionar archivo JSON
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
              className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

          {/* Editor de texto */}
                <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              O pegar contenido JSON directamente
            </label>
                  <textarea
              value={jsonContent}
              onChange={(e) => setJsonContent(e.target.value)}
              placeholder="Pega aquí el contenido JSON del agente..."
              className="w-full h-64 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                </div>

          {/* Formulario de metadatos */}
          {showMetadataForm && (
            <div className="border-t pt-6">
              <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                Configuración del Agente
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Nombre del Agente *
                  </label>
                  <input
                    type="text"
                    value={metadata.name}
                    onChange={(e) => setMetadata(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nombre del agente"
                    required
                  />
                </div>

                {/* Descripción */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Descripción *
                  </label>
                  <textarea
                    value={metadata.description}
                    onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descripción del agente"
                    rows={3}
                    required
                  />
                </div>

                {/* Dificultad */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Dificultad
                  </label>
                  <select
                    value={metadata.difficulty}
                    onChange={(e) => setMetadata(prev => ({ ...prev, difficulty: e.target.value as any }))}
                    className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="beginner">Principiante</option>
                    <option value="intermediate">Intermedio</option>
                    <option value="advanced">Avanzado</option>
                  </select>
                </div>

                {/* Tipo de Agente */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Tipo de Agente
                  </label>
                  <select
                    value={metadata.agent_type}
                    onChange={(e) => setMetadata(prev => ({ ...prev, agent_type: e.target.value as any }))}
                    className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="inbound">Inbound</option>
                    <option value="outbound">Outbound</option>
                  </select>
                </div>

                {/* Keywords */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Palabras Clave
                  </label>
                  <div className="border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 p-2 min-h-[50px]">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {metadata.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm flex items-center gap-1"
                        >
                          {keyword}
                          <button
                            type="button"
                            onClick={() => {
                              setMetadata(prev => ({
                                ...prev,
                                keywords: prev.keywords.filter((_, i) => i !== index)
                              }));
                            }}
                            className="ml-1 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  <input
                    type="text"
                      placeholder="Escribe una palabra clave y presiona Enter o coma"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const value = e.currentTarget.value.trim();
                          if (value && !metadata.keywords.includes(value)) {
                            setMetadata(prev => ({
                              ...prev,
                              keywords: [...prev.keywords, value]
                            }));
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.trim();
                        if (value && !metadata.keywords.includes(value)) {
                          setMetadata(prev => ({
                            ...prev,
                            keywords: [...prev.keywords, value]
                          }));
                          e.target.value = '';
                        }
                      }}
                      className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                  />
                </div>
              </div>

                {/* Use Cases */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Casos de Uso
                  </label>
                  <div className="border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 p-2 min-h-[50px]">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {metadata.use_cases.map((useCase, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm flex items-center gap-1"
                        >
                          {useCase}
                          <button
                            type="button"
                            onClick={() => {
                              setMetadata(prev => ({
                                ...prev,
                                use_cases: prev.use_cases.filter((_, i) => i !== index)
                              }));
                            }}
                            className="ml-1 text-green-600 dark:text-green-300 hover:text-green-800 dark:hover:text-green-100"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Escribe un caso de uso y presiona Enter o coma"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const value = e.currentTarget.value.trim();
                          if (value && !metadata.use_cases.includes(value)) {
                            setMetadata(prev => ({
                              ...prev,
                              use_cases: [...prev.use_cases, value]
                            }));
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.trim();
                        if (value && !metadata.use_cases.includes(value)) {
                          setMetadata(prev => ({
                            ...prev,
                            use_cases: [...prev.use_cases, value]
                          }));
                          e.target.value = '';
                        }
                      }}
                      className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                    />
                  </div>
                  </div>

                {/* Industry Tags */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Etiquetas de Industria
                  </label>
                  <div className="border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 p-2 min-h-[50px]">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {metadata.industry_tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm flex items-center gap-1"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              setMetadata(prev => ({
                                ...prev,
                                industry_tags: prev.industry_tags.filter((_, i) => i !== index)
                              }));
                            }}
                            className="ml-1 text-purple-600 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-100"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                  </div>
                    <input
                      type="text"
                      placeholder="Escribe una etiqueta de industria y presiona Enter o coma"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const value = e.currentTarget.value.trim();
                          if (value && !metadata.industry_tags.includes(value)) {
                            setMetadata(prev => ({
                              ...prev,
                              industry_tags: [...prev.industry_tags, value]
                            }));
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.trim();
                        if (value && !metadata.industry_tags.includes(value)) {
                          setMetadata(prev => ({
                            ...prev,
                            industry_tags: [...prev.industry_tags, value]
                          }));
                          e.target.value = '';
                        }
                      }}
                      className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mensajes de estado */}
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg">
              <p className="text-green-700 dark:text-green-300 text-sm">{success}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            {!showMetadataForm ? (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={!jsonContent.trim()}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Validar y Continuar
                </button>
              </>
            ) : (
              <>
              <button
                  onClick={() => setShowMetadataForm(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Volver
              </button>
            <button
                  onClick={handleFinalImport}
                  disabled={isLoading || !metadata.name.trim() || !metadata.description.trim()}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Importando...' : 'Importar Agente'}
            </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportAgentModal;