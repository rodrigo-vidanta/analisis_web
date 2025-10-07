import { useState, useEffect, useCallback } from 'react';
import { awsDiagramService, type AWSDiagramConfig } from '../services/awsDiagramService';
import type { Node, Edge } from 'reactflow';

export const useAWSDiagram = () => {
  const [config, setConfig] = useState<AWSDiagramConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar configuración al montar
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = useCallback(async (configId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Asegurar que la tabla existe
      await awsDiagramService.createTableIfNotExists();
      
      const loadedConfig = await awsDiagramService.loadConfig(configId);
      setConfig(loadedConfig);
    } catch (err: any) {
      console.error('Error cargando configuración:', err);
      setError(err.message);
      // Usar configuración por defecto en caso de error
      setConfig(awsDiagramService.getDefaultConfig());
    } finally {
      setLoading(false);
    }
  }, []);

  const saveConfig = useCallback(async (
    nodes: Node[], 
    edges: Edge[], 
    viewport: { x: number; y: number; zoom: number },
    diagramName?: string
  ) => {
    if (!config) return null;
    
    setSaving(true);
    setError(null);

    try {
      const configToSave: AWSDiagramConfig = {
        ...config,
        diagram_name: diagramName || config.diagram_name,
        nodes,
        edges,
        viewport
      };

      const savedId = await awsDiagramService.saveConfig(configToSave);
      
      if (savedId) {
        setConfig({ ...configToSave, id: savedId });
        console.log('✅ Diagrama guardado exitosamente');
        return savedId;
      } else {
        throw new Error('No se pudo guardar la configuración');
      }
    } catch (err: any) {
      console.error('Error guardando configuración:', err);
      setError(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  }, [config]);

  const updateSettings = useCallback(async (newSettings: Partial<AWSDiagramConfig['settings']>) => {
    if (!config) return;

    const updatedConfig = {
      ...config,
      settings: { ...config.settings, ...newSettings }
    };

    setConfig(updatedConfig);

    // Auto-guardar configuración
    if (config.nodes && config.edges) {
      await saveConfig(config.nodes, config.edges, config.viewport);
    }
  }, [config, saveConfig]);

  const resetToDefault = useCallback(() => {
    const defaultConfig = awsDiagramService.getDefaultConfig();
    setConfig(defaultConfig);
  }, []);

  return {
    config,
    loading,
    saving,
    error,
    loadConfig,
    saveConfig,
    updateSettings,
    resetToDefault,
    // Helper para auto-guardar
    autoSave: useCallback(async (nodes: Node[], edges: Edge[], viewport: { x: number; y: number; zoom: number }) => {
      // Auto-guardar cada 10 segundos si hay cambios
      if (config) {
        await saveConfig(nodes, edges, viewport);
      }
    }, [config, saveConfig])
  };
};
