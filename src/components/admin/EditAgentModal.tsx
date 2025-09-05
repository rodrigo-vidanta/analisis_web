import React, { useState, useEffect } from 'react';
import { type AgentTemplate, type AgentCategory } from '../../config/supabase';
import { getAgentCategories } from '../../services/supabaseService';

interface EditAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<AgentTemplate>) => void;
  template: AgentTemplate;
}

const EditAgentModal: React.FC<EditAgentModalProps> = ({ isOpen, onClose, onSave, template }) => {
  const [formData, setFormData] = useState({
    name: template.name,
    description: template.description || '',
    keywords: template.keywords.join(', '),
    use_cases: template.use_cases.join(', '),
    difficulty: template.difficulty,
    estimated_time: template.estimated_time || '',
    category_id: template.category_id,
    agent_type: template.agent_type || 'inbound'
  });
  
  const [categories, setCategories] = useState<AgentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      // Reset form data when opening
      setFormData({
        name: template.name,
        description: template.description || '',
        keywords: template.keywords.join(', '),
        use_cases: template.use_cases.join(', '),
        difficulty: template.difficulty,
        estimated_time: template.estimated_time || '',
        category_id: template.category_id,
        agent_type: template.agent_type || 'inbound'
      });
    }
  }, [isOpen, template]);

  const loadCategories = async () => {
    try {
      const categoriesData = await getAgentCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updates: Partial<AgentTemplate> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0),
        use_cases: formData.use_cases.split(',').map(u => u.trim()).filter(u => u.length > 0),
        difficulty: formData.difficulty as 'beginner' | 'intermediate' | 'advanced',
        estimated_time: formData.estimated_time.trim(),
        category_id: formData.category_id,
        agent_type: formData.agent_type as 'inbound' | 'outbound'
      };

      await onSave(updates);
      onClose();
    } catch (error) {
      console.error('Error saving agent:', error);
      alert('Error al guardar los cambios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Editar Agente: {template.name}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Agente *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiempo Estimado
              </label>
              <input
                type="text"
                value={formData.estimated_time}
                onChange={(e) => handleInputChange('estimated_time', e.target.value)}
                placeholder="30 minutos"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Categoría y tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => handleInputChange('category_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Agente
              </label>
              <select
                value={formData.agent_type}
                onChange={(e) => handleInputChange('agent_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="inbound">Inbound (Recibe llamadas)</option>
                <option value="outbound">Outbound (Hace llamadas)</option>
              </select>
            </div>
          </div>

          {/* Dificultad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dificultad
            </label>
            <select
              value={formData.difficulty}
              onChange={(e) => handleInputChange('difficulty', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="beginner">Principiante</option>
              <option value="intermediate">Intermedio</option>
              <option value="advanced">Avanzado</option>
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descripción del agente..."
            />
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Palabras Clave
            </label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => handleInputChange('keywords', e.target.value)}
              placeholder="ventas, atención, soporte (separadas por comas)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Separa las palabras clave con comas</p>
          </div>

          {/* Casos de uso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Casos de Uso
            </label>
            <input
              type="text"
              value={formData.use_cases}
              onChange={(e) => handleInputChange('use_cases', e.target.value)}
              placeholder="Atención al cliente, Ventas (separados por comas)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Separa los casos de uso con comas</p>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAgentModal;
