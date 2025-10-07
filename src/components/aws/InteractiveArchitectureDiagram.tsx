import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  addEdge,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  MarkerType,
  Handle,
  Position,
  ReactFlowProvider,
  useNodesState,
  useEdgesState
} from 'reactflow';
import type { Node, Edge, Connection } from 'reactflow';
import 'reactflow/dist/style.css';
import { Save, Plus, RotateCcw, Trash } from 'lucide-react';
import { 
  AWSIcon,
  DatabaseIcon,
  RedisIcon,
  NetworkIcon,
  PhoneIcon,
  WorkflowIcon,
  WhatsAppIcon,
  SocialIcon,
  BrainIcon
} from './CustomIcons';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';

// Nodo personalizado con handles correctos
const CustomNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const getIcon = () => {
    switch (data.iconName) {
      case 'SocialIcon': return <SocialIcon color={data.customColor} />;
      case 'WhatsAppIcon': return <WhatsAppIcon color={data.customColor} />;
      case 'BrainIcon': return <BrainIcon color={data.customColor} />;
      case 'WorkflowIcon': return <WorkflowIcon color={data.customColor} />;
      case 'PhoneIcon': return <PhoneIcon color={data.customColor} />;
      case 'AWSIcon': return <AWSIcon color={data.customColor} />;
      case 'DatabaseIcon': return <DatabaseIcon color={data.customColor} />;
      case 'RedisIcon': return <RedisIcon color={data.customColor} />;
      case 'NetworkIcon': return <NetworkIcon color={data.customColor} />;
      default: return <AWSIcon color={data.customColor} />;
    }
  };

  return (
    <div style={{
      background: '#ffffff',
      border: `2px solid ${data.customColor || '#64748b'}`,
      borderRadius: '8px',
      padding: '12px',
      minWidth: '140px',
      maxWidth: '180px',
      boxShadow: selected ? `0 0 0 3px ${data.customColor}30` : '0 2px 8px rgba(0,0,0,0.1)',
      transition: 'all 0.2s ease',
    }}>
      
      {/* Handles con IDs específicos para cada dirección */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top-target"
        style={{ 
          background: data.customColor || '#64748b', 
          border: '2px solid white', 
          width: '10px', 
          height: '10px',
          top: '-5px'
        }} 
      />
      <Handle 
        type="source" 
        position={Position.Top} 
        id="top-source"
        style={{ 
          background: data.customColor || '#64748b', 
          border: '2px solid white', 
          width: '10px', 
          height: '10px',
          top: '-5px',
          left: '20px'
        }} 
      />
      
      <Handle 
        type="target" 
        position={Position.Bottom} 
        id="bottom-target"
        style={{ 
          background: data.customColor || '#64748b', 
          border: '2px solid white', 
          width: '10px', 
          height: '10px',
          bottom: '-5px'
        }} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom-source"
        style={{ 
          background: data.customColor || '#64748b', 
          border: '2px solid white', 
          width: '10px', 
          height: '10px',
          bottom: '-5px',
          left: '20px'
        }} 
      />
      
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left-target"
        style={{ 
          background: data.customColor || '#64748b', 
          border: '2px solid white', 
          width: '10px', 
          height: '10px',
          left: '-5px'
        }} 
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left-source"
        style={{ 
          background: data.customColor || '#64748b', 
          border: '2px solid white', 
          width: '10px', 
          height: '10px',
          left: '-5px',
          top: '20px'
        }} 
      />
      
      <Handle 
        type="target" 
        position={Position.Right} 
        id="right-target"
        style={{ 
          background: data.customColor || '#64748b', 
          border: '2px solid white', 
          width: '10px', 
          height: '10px',
          right: '-5px'
        }} 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right-source"
        style={{ 
          background: data.customColor || '#64748b', 
          border: '2px solid white', 
          width: '10px', 
          height: '10px',
          right: '-5px',
          top: '20px'
        }} 
      />

      {/* Contenido del nodo */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ marginRight: '8px' }}>
          {getIcon()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '2px'
          }}>
            {data.label}
          </div>
          <div style={{
            fontSize: '10px',
            color: '#6b7280'
          }}>
            {data.subtitle}
          </div>
        </div>
      </div>

      {/* Métricas */}
      {data.showMetrics && data.metrics && (
        <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>CPU:</span>
            <span>{Math.round(data.metrics.cpu || 0)}%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>RAM:</span>
            <span>{Math.round(data.metrics.memory || 0)}%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Conn:</span>
            <span>{data.metrics.connections || 0}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const ArchitectureDiagramInner: React.FC = () => {
  // Estados usando hooks de ReactFlow
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rfInstance, setRfInstance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedElements, setSelectedElements] = useState<any[]>([]);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [showEdgeModal, setShowEdgeModal] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  // Cargar desde base de datos al inicializar
  useEffect(() => {
    const loadFromDatabase = async () => {
      try {
        setIsLoading(true);
        console.log('🔍 Cargando desde base de datos...');
        
        const { data: userData } = await supabaseSystemUI.auth.getUser();
        
        let query = supabaseSystemUI
          .from('aws_diagram_configs')
          .select('*');
          
        if (userData.user) {
          query = query.eq('user_id', userData.user.id);
        } else {
          query = query.is('user_id', null);
        }
        
        const { data: savedConfig, error } = await query
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (!error && savedConfig && savedConfig.nodes.length > 0) {
          console.log('✅ Configuración cargada desde DB:', savedConfig.diagram_name);
          setNodes(savedConfig.nodes);
          setEdges(savedConfig.edges);
          
          // Restaurar viewport
          if (savedConfig.viewport && rfInstance) {
            setTimeout(() => {
              rfInstance.setViewport(savedConfig.viewport);
            }, 300);
          }
        } else {
          console.log('📝 No hay configuración en DB, creando nodos por defecto...');
          createDefaultNodes();
        }
        
      } catch (dbError) {
        console.error('Error cargando desde DB:', dbError);
        createDefaultNodes();
      } finally {
        setIsLoading(false);
      }
    };

    // Crear nodos por defecto
    const createDefaultNodes = () => {
      const defaultNodes: Node[] = [
        {
          id: 'social-media',
          type: 'custom',
          position: { x: 100, y: 50 },
          data: { 
            label: 'Redes Sociales',
            subtitle: 'Facebook, Instagram',
            iconName: 'SocialIcon',
            customColor: '#1877f2',
          },
        },
        {
          id: 'whatsapp',
          type: 'custom',
          position: { x: 350, y: 50 },
          data: { 
            label: 'WhatsApp Business',
            subtitle: 'Primer Contacto',
            iconName: 'WhatsAppIcon',
            customColor: '#25d366',
          },
        },
        {
          id: 'n8n',
          type: 'custom',
          position: { x: 500, y: 200 },
          data: { 
            label: 'n8n Workflows',
            subtitle: 'Orquestación',
            iconName: 'WorkflowIcon',
            customColor: '#f59e0b',
            showMetrics: true,
            metrics: { cpu: 65, memory: 70, connections: 150 }
          },
        },
        {
          id: 'vapi',
          type: 'custom',
          position: { x: 350, y: 350 },
          data: { 
            label: 'VAPI AI Calls',
            subtitle: 'Llamadas IA',
            iconName: 'PhoneIcon',
            customColor: '#00d2ff',
            showMetrics: true,
            metrics: { cpu: 40, memory: 50, connections: 95 }
          },
        },
        {
          id: 'ecs',
          type: 'custom',
          position: { x: 350, y: 500 },
          data: { 
            label: 'ECS Fargate',
            subtitle: 'n8n-production',
            iconName: 'AWSIcon',
            customColor: '#f97316',
            showMetrics: true,
            metrics: { cpu: 58, memory: 68, connections: 150 }
          },
        },
        {
          id: 'rds',
          type: 'custom',
          position: { x: 200, y: 650 },
          data: { 
            label: 'PostgreSQL RDS',
            subtitle: 'Base de Datos',
            iconName: 'DatabaseIcon',
            customColor: '#336791',
            showMetrics: true,
            metrics: { cpu: 42, memory: 55, connections: 45 }
          },
        },
      ];

      const defaultEdges: Edge[] = [
        {
          id: 'social-whatsapp',
          source: 'social-media',
          target: 'whatsapp',
          sourceHandle: 'right-source',
          targetHandle: 'left-target',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#1877f2', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#1877f2' },
          label: 'Leads',
        },
        {
          id: 'n8n-vapi',
          source: 'n8n',
          target: 'vapi',
          sourceHandle: 'bottom-source',
          targetHandle: 'top-target',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#00d2ff', strokeWidth: 3 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#00d2ff' },
          label: 'Trigger Calls',
        },
        {
          id: 'vapi-ecs',
          source: 'vapi',
          target: 'ecs',
          sourceHandle: 'bottom-source',
          targetHandle: 'top-target',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#f97316', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#f97316' },
        },
        {
          id: 'ecs-rds',
          source: 'ecs',
          target: 'rds',
          sourceHandle: 'left-source',
          targetHandle: 'right-target',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#336791', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#336791' },
          label: 'Queries',
        },
      ];

      setNodes(defaultNodes);
      setEdges(defaultEdges);
      console.log('✅ Nodos por defecto creados');
    };

    // Cargar inmediatamente sin esperar rfInstance
    loadFromDatabase();
  }, [setNodes, setEdges]);

  const onConnect = useCallback((connection: Connection) => {
    const newEdge: Edge = {
      id: `edge-${Date.now()}`,
      source: connection.source!,
      target: connection.target!,
      sourceHandle: connection.sourceHandle!,
      targetHandle: connection.targetHandle!,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#64748b', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
    };
    
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

  // Editar línea seleccionada
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdge(edge);
    setShowEdgeModal(true);
  }, []);

  // Cambiar color de línea
  const changeEdgeColor = useCallback((color: string) => {
    if (selectedEdge) {
      setEdges((eds) => 
        eds.map((edge) => 
          edge.id === selectedEdge.id 
            ? { 
                ...edge, 
                style: { ...edge.style, stroke: color },
                markerEnd: { type: MarkerType.ArrowClosed, color: color }
              }
            : edge
        )
      );
      setShowEdgeModal(false);
      setSelectedEdge(null);
    }
  }, [selectedEdge, setEdges]);

  // Agregar nodo desde modal
  const createNodeFromModal = useCallback((nodeData: any) => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: 'custom',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: nodeData.label || 'Nuevo Servicio',
        subtitle: nodeData.subtitle || 'Descripción',
        iconName: nodeData.iconName || 'AWSIcon',
        customColor: nodeData.customColor || '#f97316',
        showMetrics: true,
        metrics: { cpu: 20, memory: 30, connections: 50 }
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setShowNodeModal(false);
  }, [setNodes]);

  // Guardar en base de datos
  const saveToDatabase = useCallback(async () => {
    if (!rfInstance) {
      alert('ReactFlow no está listo');
      return;
    }

    try {
      const viewport = rfInstance.getViewport();
      
      console.log('💾 Guardando en base de datos...');
      console.log('📊 Nodos:', nodes.length, 'Edges:', edges.length);
      console.log('📍 Viewport:', viewport);
      
      const { data: userData } = await supabaseSystemUI.auth.getUser();
      
      const { data, error } = await supabaseSystemUI
        .from('aws_diagram_configs')
        .upsert([{
          user_id: userData.user?.id || null,
          diagram_name: 'Arquitectura Vidanta AI',
          nodes: nodes,
          edges: edges,
          viewport: viewport,
          settings: {
            showGrid: true,
            showMinimap: true,
            showControls: true,
            snapToGrid: false,
            gridSize: 20,
            theme: 'light'
          }
        }])
        .select()
        .single();
        
      if (error) {
        console.error('❌ Error guardando en DB:', error);
        
        // Fallback a localStorage
        localStorage.setItem('aws-architecture-layout', JSON.stringify({
          nodes: nodes,
          edges: edges,
          viewport: viewport
        }));
        alert('✅ Guardado en localStorage (DB no disponible)');
      } else {
        console.log('✅ Guardado en base de datos:', data.id);
        alert('✅ Configuración guardada en base de datos!');
      }
      
    } catch (error) {
      console.error('Error guardando:', error);
      alert('❌ Error guardando configuración.');
    }
  }, [nodes, edges, rfInstance]);

  const addNewNode = useCallback(() => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: 'custom',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: 'Nuevo Servicio',
        subtitle: 'Descripción',
        iconName: 'AWSIcon',
        customColor: '#f97316',
        showMetrics: true,
        metrics: { cpu: 20, memory: 30, connections: 50 }
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const deleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter(node => !node.selected));
    setEdges((eds) => eds.filter(edge => !edge.selected));
  }, [setNodes, setEdges]);

  const resetDiagram = useCallback(() => {
    console.log('🔄 Reseteando diagrama...');
    
    // Nodos por defecto
    const defaultNodes: Node[] = [
      {
        id: 'social-media',
        type: 'custom',
        position: { x: 100, y: 50 },
        data: { 
          label: 'Redes Sociales',
          subtitle: 'Facebook, Instagram',
          iconName: 'SocialIcon',
          customColor: '#1877f2',
        },
      },
      {
        id: 'whatsapp',
        type: 'custom',
        position: { x: 350, y: 50 },
        data: { 
          label: 'WhatsApp Business',
          subtitle: 'Primer Contacto',
          iconName: 'WhatsAppIcon',
          customColor: '#25d366',
        },
      },
      {
        id: 'n8n',
        type: 'custom',
        position: { x: 500, y: 200 },
        data: { 
          label: 'n8n Workflows',
          subtitle: 'Orquestación',
          iconName: 'WorkflowIcon',
          customColor: '#f59e0b',
          showMetrics: true,
          metrics: { cpu: 65, memory: 70, connections: 150 }
        },
      },
      {
        id: 'ecs',
        type: 'custom',
        position: { x: 350, y: 350 },
        data: { 
          label: 'ECS Fargate',
          subtitle: 'n8n-production',
          iconName: 'AWSIcon',
          customColor: '#f97316',
          showMetrics: true,
          metrics: { cpu: 58, memory: 68, connections: 150 }
        },
      },
    ];

    const defaultEdges: Edge[] = [
      {
        id: 'social-whatsapp',
        source: 'social-media',
        target: 'whatsapp',
        sourceHandle: 'right-source',
        targetHandle: 'left-target',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#1877f2', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#1877f2' },
        label: 'Leads',
      },
      {
        id: 'n8n-ecs',
        source: 'n8n',
        target: 'ecs',
        sourceHandle: 'bottom-source',
        targetHandle: 'top-target',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#f59e0b', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
        label: 'Deploy',
      },
    ];

    setNodes(defaultNodes);
    setEdges(defaultEdges);
  }, [setNodes, setEdges]);

  // Mostrar loading
  if (isLoading) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Cargando desde base de datos...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Toolbar */}
      <div style={{
        padding: '12px',
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
            Editor de Arquitectura AWS
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
            {nodes.length} nodos, {edges.length} conexiones - Persistencia en base de datos
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setShowNodeModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            <Plus size={16} />
            Agregar Nodo
          </button>
          
          <button 
            onClick={saveToDatabase}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            <Save size={16} />
            Guardar en DB
          </button>
          
          <button 
            onClick={deleteSelected}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            <Trash size={16} />
            Eliminar
          </button>
          
          <button 
            onClick={resetDiagram}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              background: '#6b7280',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

      {/* ReactFlow */}
      <div style={{ flex: 1, background: '#f8fafc' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onSelectionChange={({ nodes, edges }) => setSelectedElements([...nodes, ...edges])}
          onInit={setRfInstance}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls />
          <MiniMap nodeColor={(node) => node.data.customColor || '#64748b'} />
        </ReactFlow>
      </div>

      {/* Modal para crear nodos */}
      {showNodeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            padding: '24px',
            width: '400px',
            boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>
              Crear Nuevo Nodo
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>
                Nombre del Servicio
              </label>
              <input
                id="node-label"
                type="text"
                placeholder="Ej: API Gateway"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>
                Descripción
              </label>
              <input
                id="node-subtitle"
                type="text"
                placeholder="Ej: Gestión de APIs"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowNodeModal(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  background: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  const label = (document.getElementById('node-label') as HTMLInputElement)?.value || 'Nuevo Servicio';
                  const subtitle = (document.getElementById('node-subtitle') as HTMLInputElement)?.value || 'Descripción';
                  createNodeFromModal({ label, subtitle, iconName: 'AWSIcon', customColor: '#f97316' });
                }}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  background: '#3b82f6',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar líneas */}
      {showEdgeModal && selectedEdge && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            padding: '24px',
            width: '300px',
            boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>
              Editar Conexión
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                Color de la Línea
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px'
              }}>
                {['#1877f2', '#25d366', '#f59e0b', '#00d2ff', '#f97316', '#336791', '#dc382d', '#64748b'].map((color) => (
                  <button
                    key={color}
                    onClick={() => changeEdgeColor(color)}
                    style={{
                      width: '40px',
                      height: '40px',
                      background: color,
                      border: selectedEdge.style?.stroke === color ? '3px solid #000' : '1px solid #e5e7eb',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowEdgeModal(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  background: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .react-flow__node {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
        }

        .react-flow__handle {
          opacity: 0.8;
          transition: all 0.2s ease;
        }

        .react-flow__node:hover .react-flow__handle {
          opacity: 1;
          transform: scale(1.1);
        }

        .react-flow__edge-path {
          stroke-linecap: round;
          cursor: pointer;
        }

        .react-flow__edge:hover .react-flow__edge-path {
          stroke-width: 3px !important;
        }
      `}</style>
    </div>
  );
};

const InteractiveArchitectureDiagram: React.FC = () => (
  <ReactFlowProvider>
    <div style={{ 
      height: 'calc(100vh - 280px)',
      minHeight: '600px',
      width: '100%'
    }}>
      <ArchitectureDiagramInner />
    </div>
  </ReactFlowProvider>
);

export default InteractiveArchitectureDiagram;