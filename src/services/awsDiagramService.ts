import { supabaseSystemUI as supabase } from '../config/supabaseSystemUI';
import type { Node, Edge } from 'reactflow';

export interface AWSDiagramConfig {
  id?: string;
  user_id?: string;
  diagram_name: string;
  nodes: Node[];
  edges: Edge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  settings: {
    showGrid: boolean;
    showMinimap: boolean;
    showControls: boolean;
    snapToGrid: boolean;
    gridSize: number;
    theme: 'light' | 'dark';
  };
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export class AWSDiagramService {
  
  /**
   * Crear la tabla si no existe
   */
  async initializeTable(): Promise<void> {
    try {
      console.log('🔧 Inicializando tabla aws_diagram_configs...');
      
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: `
          -- Crear tabla aws_diagram_configs
          CREATE TABLE IF NOT EXISTS aws_diagram_configs (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
              diagram_name VARCHAR(255) NOT NULL DEFAULT 'Mi Diagrama AWS',
              nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
              edges JSONB NOT NULL DEFAULT '[]'::jsonb,
              viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
              settings JSONB DEFAULT '{
                  "showGrid": true,
                  "showMinimap": true, 
                  "showControls": true,
                  "snapToGrid": false,
                  "gridSize": 20,
                  "theme": "light"
              }'::jsonb,
              is_default BOOLEAN DEFAULT false,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          -- Habilitar RLS
          ALTER TABLE aws_diagram_configs ENABLE ROW LEVEL SECURITY;

          -- Crear políticas RLS
          DROP POLICY IF EXISTS "Users can manage own diagram configs" ON aws_diagram_configs;
          CREATE POLICY "Users can manage own diagram configs" 
          ON aws_diagram_configs FOR ALL 
          USING (auth.uid() = user_id);
        `
      });

      if (error) {
        console.error('❌ Error inicializando tabla:', error);
      } else {
        console.log('✅ Tabla aws_diagram_configs inicializada');
      }
    } catch (error) {
      console.error('❌ Error en initializeTable:', error);
    }
  }

  /**
   * Guardar configuración del diagrama
   */
  async saveConfig(config: AWSDiagramConfig): Promise<string | null> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const configToSave = {
        user_id: userData.user?.id || null,
        diagram_name: config.diagram_name,
        nodes: config.nodes,
        edges: config.edges,
        viewport: config.viewport,
        settings: config.settings,
        is_default: config.is_default || false
      };

      if (config.id) {
        // Actualizar configuración existente
        const { data, error } = await supabase
          .from('aws_diagram_configs')
          .update(configToSave)
          .eq('id', config.id)
          .select()
          .single();

        if (error) {
          console.error('❌ Error actualizando en Supabase:', error);
          // Fallback a localStorage
          localStorage.setItem('aws_diagram_config', JSON.stringify({...config, ...configToSave}));
          console.log('✅ Guardado en localStorage como fallback');
          return config.id;
        }
        
        console.log('✅ Configuración actualizada en Supabase:', data.id);
        return data.id;
      } else {
        // Crear nueva configuración
        const { data, error } = await supabase
          .from('aws_diagram_configs')
          .insert([configToSave])
          .select()
          .single();

        if (error) {
          console.error('❌ Error guardando en Supabase:', error);
          // Fallback a localStorage
          const localId = `aws-diagram-${Date.now()}`;
          localStorage.setItem('aws_diagram_config', JSON.stringify({...config, id: localId, ...configToSave}));
          console.log('✅ Guardado en localStorage como fallback:', localId);
          return localId;
        }
        
        console.log('✅ Configuración guardada en Supabase:', data.id);
        return data.id;
      }
    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
      
      // Fallback completo a localStorage
      const localId = config.id || `aws-diagram-${Date.now()}`;
      localStorage.setItem('aws_diagram_config', JSON.stringify({...config, id: localId}));
      console.log('✅ Guardado local como fallback:', localId);
      return localId;
    }
  }

  /**
   * Cargar configuración del diagrama
   */
  async loadConfig(configId?: string): Promise<AWSDiagramConfig | null> {
    try {
      console.log('🔍 Cargando configuración del diagrama...');
      
      // Intentar cargar desde Supabase primero
      try {
        const { data: userData } = await supabase.auth.getUser();
        
        let query = supabase
          .from('aws_diagram_configs')
          .select('*');

        if (configId) {
          query = query.eq('id', configId);
        } else if (userData.user) {
          // Buscar configuración del usuario o por defecto
          query = query.or(`user_id.eq.${userData.user.id},user_id.is.null`)
                      .order('is_default', { ascending: false })
                      .order('updated_at', { ascending: false })
                      .limit(1);
        } else {
          // Usuario no autenticado, buscar configuración por defecto
          query = query.eq('is_default', true).limit(1);
        }

        const { data, error } = await query.single();

        if (!error && data) {
          console.log('✅ Configuración cargada desde Supabase:', data.diagram_name);
          return data as AWSDiagramConfig;
        } else {
          console.log('📝 No se encontró configuración en Supabase, probando localStorage...');
        }
      } catch (dbError) {
        console.log('⚠️ Error con Supabase:', dbError);
      }

      // Fallback a localStorage
      const localConfig = localStorage.getItem('aws_diagram_config');
      if (localConfig) {
        console.log('✅ Configuración cargada desde localStorage');
        return JSON.parse(localConfig);
      }

      console.log('📝 Usando configuración por defecto');
      return this.getDefaultConfig();
    } catch (error) {
      console.error('❌ Error cargando configuración:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Listar todas las configuraciones del usuario
   */
  async listConfigs(): Promise<AWSDiagramConfig[]> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      const { data, error } = await supabase
        .from('aws_diagram_configs')
        .select('id, diagram_name, is_default, created_at, updated_at')
        .eq('user_id', userData.user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return data as AWSDiagramConfig[];
    } catch (error) {
      console.error('❌ Error listando configuraciones:', error);
      return [];
    }
  }

  /**
   * Eliminar configuración
   */
  async deleteConfig(configId: string): Promise<boolean> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;

      const { error } = await supabase
        .from('aws_diagram_configs')
        .delete()
        .eq('id', configId)
        .eq('user_id', userData.user.id);

      if (error) throw error;

      console.log('✅ Configuración eliminada:', configId);
      return true;
    } catch (error) {
      console.error('❌ Error eliminando configuración:', error);
      return false;
    }
  }

  /**
   * Configuración por defecto
   */
  getDefaultConfig(): AWSDiagramConfig {
    return {
      diagram_name: 'Flujo Vidanta AI',
      nodes: [
        {
          id: 'social-media',
          type: 'editable',
          position: { x: 100, y: 50 },
          data: { 
            label: 'Redes Sociales',
            subtitle: 'Facebook, Instagram, Google Ads',
            category: 'social-blue',
            iconName: 'Users',
            showMetrics: false,
            status: 'healthy'
          },
        },
        {
          id: 'whatsapp',
          type: 'editable',
          position: { x: 400, y: 50 },
          data: { 
            label: 'WhatsApp Business',
            subtitle: 'Primer Contacto',
            category: 'whatsapp-green',
            iconName: 'MessageCircle',
            showMetrics: false,
            status: 'healthy'
          },
        },
        {
          id: 'ai-discovery',
          type: 'editable',
          position: { x: 700, y: 50 },
          data: { 
            label: 'IA Discovery',
            subtitle: 'Análisis de Mensajes',
            category: 'ai-purple',
            iconName: 'Brain',
            showMetrics: true,
            status: 'healthy',
            metrics: { cpu: 25, memory: 35, connections: 320 }
          },
        },
        {
          id: 'uchat',
          type: 'editable',
          position: { x: 250, y: 200 },
          data: { 
            label: 'uChat System',
            subtitle: 'Gestión de Conversaciones',
            category: 'ai-purple',
            iconName: 'Brain',
            showMetrics: true,
            status: 'healthy',
            metrics: { cpu: 45, memory: 55, connections: 180 }
          },
        },
        {
          id: 'n8n',
          type: 'editable',
          position: { x: 550, y: 200 },
          data: { 
            label: 'n8n Workflows',
            subtitle: 'Orquestación de Procesos',
            category: 'n8n-orange',
            iconName: 'Workflow',
            showMetrics: true,
            status: 'healthy',
            metrics: { cpu: 65, memory: 70, connections: 150 }
          },
        },
        {
          id: 'vapi',
          type: 'editable',
          position: { x: 400, y: 350 },
          data: { 
            label: 'VAPI AI Calls',
            subtitle: 'Llamadas Inteligentes',
            category: 'vapi-cyan',
            iconName: 'Phone',
            showMetrics: true,
            status: 'healthy',
            metrics: { cpu: 40, memory: 50, connections: 95 }
          },
        },
        {
          id: 'ecs',
          type: 'editable',
          position: { x: 400, y: 500 },
          data: { 
            label: 'ECS Fargate',
            subtitle: 'n8n-production',
            category: 'aws-orange',
            iconName: 'Server',
            showMetrics: true,
            status: 'healthy',
            metrics: { cpu: 58, memory: 68, connections: 150 }
          },
        },
        {
          id: 'rds',
          type: 'editable',
          position: { x: 200, y: 650 },
          data: { 
            label: 'PostgreSQL RDS',
            subtitle: 'Base de Datos Principal',
            category: 'database-blue',
            iconName: 'Database',
            showMetrics: true,
            status: 'healthy',
            metrics: { cpu: 42, memory: 55, connections: 45 }
          },
        },
      ],
      edges: [
        {
          id: 'social-whatsapp',
          source: 'social-media',
          target: 'whatsapp',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed', color: '#3b82f6' },
          label: 'Leads',
        },
        {
          id: 'whatsapp-ai',
          source: 'whatsapp',
          target: 'ai-discovery',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#10b981', strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed', color: '#10b981' },
          label: 'Mensajes',
        },
        {
          id: 'n8n-vapi',
          source: 'n8n',
          target: 'vapi',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#06b6d4', strokeWidth: 3 },
          markerEnd: { type: 'arrowclosed', color: '#06b6d4' },
          label: 'Trigger Calls',
        },
        {
          id: 'vapi-ecs',
          source: 'vapi',
          target: 'ecs',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#f97316', strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed', color: '#f97316' },
        },
        {
          id: 'ecs-rds',
          source: 'ecs',
          target: 'rds',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#1e40af', strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed', color: '#1e40af' },
          label: 'Queries',
        },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
      settings: {
        showGrid: true,
        showMinimap: true,
        showControls: true,
        snapToGrid: false,
        gridSize: 20,
        theme: 'light'
      }
    };
  }

  /**
   * Crear tabla si no existe
   */
  async createTableIfNotExists(): Promise<void> {
    try {
      // Intentar crear la tabla usando una query directa
      const { error } = await supabase.rpc('create_aws_diagram_table', {});
      
      if (error) {
        console.warn('⚠️ No se pudo crear tabla con RPC, intentando método alternativo...');
        // Fallback: crear tabla usando insert (esto creará la tabla implícitamente)
        await this.saveConfig(this.getDefaultConfig());
      } else {
        console.log('✅ Tabla aws_diagram_configs verificada');
      }
    } catch (error) {
      console.warn('⚠️ Tabla aws_diagram_configs: usando configuración local');
    }
  }
}

// Exportar instancia singleton
export const awsDiagramService = new AWSDiagramService();

// Exportar solo el tipo
export type { AWSDiagramConfig };
export default awsDiagramService;
