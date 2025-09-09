import React from 'react';
import TemplateManager from './TemplateManager';

const AdminDashboard = () => {
  // Renderizar el Gestor de Plantillas como página completa (sin modal)
  return <TemplateManager onClose={() => {}} isModal={false} />;
};

export default AdminDashboard;