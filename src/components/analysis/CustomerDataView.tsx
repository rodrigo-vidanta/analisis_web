import React from 'react';

// ============================================
// INTERFACES Y TIPOS
// ============================================

interface CustomerData {
  perfil: {
    ocupacion: string;
    estadoCivil: string;
    experiencia: {
      destinosPrevios: string[];
      hotelesAcostumbra: string[];
    };
    composicionGrupo: {
      total: number | null;
      adultos: number | null;
      menores: number[];
    };
    nivelSocioeconomico: string;
  };
  contacto: {
    edad: number | null;
    cotitular: string;
    nombreCompleto: string;
    numeroTelefono: {
      numero: string;
      formatoEstandar: boolean;
    };
    fechaNacimiento: string;
    correoElectronico: string;
  };
}

interface CustomerDataViewProps {
  customerData: CustomerData;
  className?: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const CustomerDataView: React.FC<CustomerDataViewProps> = ({
  customerData,
  className = ""
}) => {
  
  // ============================================
  // HELPERS
  // ============================================
  
  const hasValue = (value: any): boolean => {
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.values(value).some(v => hasValue(v));
    return true;
  };
  
  const formatPhoneNumber = (phone: { numero: string; formatoEstandar: boolean }) => {
    if (!phone.numero) return 'No proporcionado';
    return phone.formatoEstandar ? `📞 ${phone.numero}` : `📱 ${phone.numero}`;
  };
  
  const getCompletionPercentage = () => {
    const totalFields = 12; // Número total de campos importantes
    let filledFields = 0;
    
    if (hasValue(customerData.contacto.nombreCompleto)) filledFields++;
    if (hasValue(customerData.contacto.correoElectronico)) filledFields++;
    if (hasValue(customerData.contacto.numeroTelefono.numero)) filledFields++;
    if (hasValue(customerData.contacto.edad)) filledFields++;
    if (hasValue(customerData.contacto.fechaNacimiento)) filledFields++;
    if (hasValue(customerData.contacto.cotitular)) filledFields++;
    if (hasValue(customerData.perfil.ocupacion)) filledFields++;
    if (hasValue(customerData.perfil.estadoCivil)) filledFields++;
    if (hasValue(customerData.perfil.nivelSocioeconomico)) filledFields++;
    if (hasValue(customerData.perfil.composicionGrupo.total)) filledFields++;
    if (hasValue(customerData.perfil.experiencia.destinosPrevios)) filledFields++;
    if (hasValue(customerData.perfil.experiencia.hotelesAcostumbra)) filledFields++;
    
    return Math.round((filledFields / totalFields) * 100);
  };
  
  // ============================================
  // RENDER
  // ============================================
  
  const completionPercentage = getCompletionPercentage();
  
  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Header con métricas */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                {customerData.contacto.nombreCompleto || 'Cliente'}
              </h2>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Información recopilada: {completionPercentage}% completa
              </p>
            </div>
          </div>
          
          {/* Indicador visual de completitud */}
          <div className="text-right">
            <div className="w-16 h-16 relative">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-blue-200 dark:text-blue-800"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${completionPercentage}, 100`}
                  className="text-blue-600 dark:text-blue-400"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  {completionPercentage}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Información de Contacto */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Información de Contacto
          </h3>
        </div>
        
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Nombre Completo
              </label>
              <div className="bg-gray-50 dark:bg-gray-900 rounded p-2">
                <span className="text-gray-900 dark:text-white font-medium">
                  {customerData.contacto.nombreCompleto || 'No proporcionado'}
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Correo Electrónico
              </label>
              <div className="bg-gray-50 dark:bg-gray-900 rounded p-2">
                <span className="text-gray-900 dark:text-white">
                  {customerData.contacto.correoElectronico || 'No proporcionado'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Teléfono
              </label>
              <div className="bg-gray-50 dark:bg-gray-900 rounded p-2">
                <span className="text-gray-900 dark:text-white">
                  {formatPhoneNumber(customerData.contacto.numeroTelefono)}
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Edad
              </label>
              <div className="bg-gray-50 dark:bg-gray-900 rounded p-2">
                <span className="text-gray-900 dark:text-white">
                  {customerData.contacto.edad ? `${customerData.contacto.edad} años` : 'No proporcionada'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Cotitular
              </label>
              <div className="bg-gray-50 dark:bg-gray-900 rounded p-2">
                <span className="text-gray-900 dark:text-white">
                  {customerData.contacto.cotitular || 'No especificado'}
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Fecha de Nacimiento
              </label>
              <div className="bg-gray-50 dark:bg-gray-900 rounded p-2">
                <span className="text-gray-900 dark:text-white">
                  {customerData.contacto.fechaNacimiento || 'No proporcionada'}
                </span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      {/* Perfil del Cliente */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Perfil del Cliente
          </h3>
        </div>
        
        <div className="p-4 space-y-4">
          
          {/* Información Básica */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Ocupación
              </label>
              <div className="bg-gray-50 dark:bg-gray-900 rounded p-2">
                <span className="text-gray-900 dark:text-white">
                  {customerData.perfil.ocupacion || 'No especificada'}
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Estado Civil
              </label>
              <div className="bg-gray-50 dark:bg-gray-900 rounded p-2">
                <span className="text-gray-900 dark:text-white">
                  {customerData.perfil.estadoCivil || 'No especificado'}
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Nivel Socioeconómico
              </label>
              <div className="bg-gray-50 dark:bg-gray-900 rounded p-2">
                <span className="text-gray-900 dark:text-white">
                  {customerData.perfil.nivelSocioeconomico || 'No evaluado'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Composición del Grupo */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Composición del Grupo
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {customerData.perfil.composicionGrupo.total || '?'}
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300">Total Personas</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {customerData.perfil.composicionGrupo.adultos || '?'}
                </div>
                <div className="text-xs text-green-700 dark:text-green-300">Adultos</div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {customerData.perfil.composicionGrupo.menores?.length || 0}
                </div>
                <div className="text-xs text-purple-700 dark:text-purple-300">Menores</div>
              </div>
            </div>
            
            {customerData.perfil.composicionGrupo.menores && customerData.perfil.composicionGrupo.menores.length > 0 && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Edades de Menores:
                </label>
                <div className="flex gap-2 flex-wrap">
                  {customerData.perfil.composicionGrupo.menores.map((edad, index) => (
                    <span key={index} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 text-xs rounded-full">
                      {edad} años
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Experiencia Turística */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Experiencia Turística
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Destinos Previos
                </label>
                <div className="bg-gray-50 dark:bg-gray-900 rounded p-2 min-h-[60px]">
                  {hasValue(customerData.perfil.experiencia.destinosPrevios) ? (
                    <div className="flex flex-wrap gap-1">
                      {customerData.perfil.experiencia.destinosPrevios.map((destino, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs rounded">
                          {destino}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 text-sm">
                      No se recopiló información
                    </span>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Hoteles Acostumbrados
                </label>
                <div className="bg-gray-50 dark:bg-gray-900 rounded p-2 min-h-[60px]">
                  {hasValue(customerData.perfil.experiencia.hotelesAcostumbra) ? (
                    <div className="flex flex-wrap gap-1">
                      {customerData.perfil.experiencia.hotelesAcostumbra.map((hotel, index) => (
                        <span key={index} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs rounded">
                          {hotel}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 text-sm">
                      No se recopiló información
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      {/* Indicador de Completitud de Datos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Completitud de Información del Cliente
        </h3>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              completionPercentage >= 80 ? 'bg-green-500' :
              completionPercentage >= 60 ? 'bg-yellow-500' :
              completionPercentage >= 40 ? 'bg-orange-500' :
              'bg-red-500'
            }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>Información Básica</span>
          <span>Información Completa</span>
        </div>
      </div>
      
    </div>
  );
};

export default CustomerDataView;
