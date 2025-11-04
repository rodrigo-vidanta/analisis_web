import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar API key primero
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || ''
    
    if (!ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY no configurada en variables de entorno')
      return new Response(
        JSON.stringify({ 
          error: 'ANTHROPIC_API_KEY no configurada. Por favor, configura la variable de entorno en Supabase.',
          success: false,
          details: 'La Edge Function requiere la variable de entorno ANTHROPIC_API_KEY en el dashboard de Supabase'
        }),
        { 
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    // Parsear payload
    let payload;
    try {
      payload = await req.json()
      console.log('📥 Payload recibido:', JSON.stringify(payload).substring(0, 200))
    } catch (parseError) {
      console.error('❌ Error parseando JSON:', parseError)
      return new Response(
        JSON.stringify({ 
          error: 'Error parseando el payload JSON',
          success: false,
          details: parseError instanceof Error ? parseError.message : 'Error desconocido'
        }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    // Validar que el payload tenga los campos requeridos
    if (!payload.model || !payload.messages) {
      return new Response(
        JSON.stringify({ 
          error: 'Payload inválido: se requieren los campos "model" y "messages"',
          success: false
        }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }
    
    const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

    console.log('📤 Enviando request a Anthropic API...')
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    })

    console.log('📥 Respuesta de Anthropic:', response.status, response.statusText)

    if (!response.ok) {
      let errorData;
      let errorText;
      try {
        errorText = await response.text()
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: { message: errorText } }
        }
      } catch {
        errorData = { error: { message: `HTTP ${response.status}: ${response.statusText}` } }
      }
      
      console.error('❌ Error de Anthropic API:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        rawError: errorText
      })
      
      // Extraer mensaje de error más descriptivo
      let errorMessage = `Anthropic API Error: ${response.status}`;
      let isTokenIssue = false;
      
      if (errorData.error) {
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.error.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.error.type) {
          errorMessage = `${errorData.error.type}: ${errorData.error.message || 'Unknown error'}`;
        }
        
        // Detectar problemas de tokens/créditos
        const errorType = errorData.error.type || '';
        const errorMsg = (errorData.error.message || '').toLowerCase();
        
        if (
          response.status === 401 || 
          response.status === 402 ||
          errorType.includes('authentication') ||
          errorType.includes('authorization') ||
          errorMsg.includes('insufficient') ||
          errorMsg.includes('credit') ||
          errorMsg.includes('billing') ||
          errorMsg.includes('payment') ||
          errorMsg.includes('quota') ||
          errorMsg.includes('limit')
        ) {
          isTokenIssue = true;
          errorMessage = `Problema de tokens/créditos en Anthropic: ${errorData.error.message || errorMessage}. Verifica tu cuenta en console.anthropic.com`;
        }
      } else if (errorText) {
        errorMessage = errorText.substring(0, 200);
      }
      
      // También detectar por status code
      if (response.status === 401 || response.status === 402) {
        isTokenIssue = true;
        if (!errorMessage.includes('tokens') && !errorMessage.includes('créditos')) {
          errorMessage = `Error de autenticación o créditos (${response.status}): ${errorMessage}`;
        }
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          success: false,
          details: errorData,
          status: response.status,
          rawError: errorText?.substring(0, 500),
          isTokenIssue: isTokenIssue // Flag para identificar problemas de tokens
        }),
        { 
          status: response.status,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }
    
    const responseData = await response.json()
    console.log('✅ Respuesta exitosa de Anthropic')
    
    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
    
  } catch (error) {
    console.error('❌ Error inesperado en anthropic-proxy:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error desconocido',
        success: false,
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

