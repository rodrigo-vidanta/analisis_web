import { supabaseMainAdmin as supabaseAdmin } from '../config/supabase';

export const diagnoseDatabase = async () => {
  console.log('🔍 Iniciando diagnóstico de base de datos...');
  
  try {
    // Verificar categorías
    const { data: categories, error: catError } = await supabaseAdmin
      .from('agent_categories')
      .select('*');
    
    console.log('📁 Categorías:', categories?.length || 0, categories);
    if (catError) console.error('❌ Error categorías:', catError);
    
    // Verificar agentes
    const { data: agents, error: agentError } = await supabaseAdmin
      .from('agent_templates')
      .select('*');
    
    console.log('🤖 Agentes:', agents?.length || 0, agents);
    if (agentError) console.error('❌ Error agentes:', agentError);
    
    // Verificar prompts
    const { data: prompts, error: promptError } = await supabaseAdmin
      .from('system_prompts')
      .select('*');
    
    console.log('💬 Prompts:', prompts?.length || 0, prompts);
    if (promptError) console.error('❌ Error prompts:', promptError);
    
    // Verificar herramientas
    const { data: tools, error: toolError } = await supabaseAdmin
      .from('tools_catalog')
      .select('*');
    
    console.log('🔧 Herramientas:', tools?.length || 0, tools);
    if (toolError) console.error('❌ Error herramientas:', toolError);
    
    // Verificar relaciones agent_prompts
    const { data: agentPrompts, error: apError } = await supabaseAdmin
      .from('agent_prompts')
      .select('*');
    
    console.log('🔗 Agent-Prompts:', agentPrompts?.length || 0, agentPrompts);
    if (apError) console.error('❌ Error agent-prompts:', apError);
    
    // Verificar relaciones agent_tools
    const { data: agentTools, error: atError } = await supabaseAdmin
      .from('agent_tools')
      .select('*');
    
    console.log('🔗 Agent-Tools:', agentTools?.length || 0, agentTools);
    if (atError) console.error('❌ Error agent-tools:', atError);
    
  } catch (error) {
    console.error('💥 Error general en diagnóstico:', error);
  }
  
  console.log('✅ Diagnóstico completado');
};
