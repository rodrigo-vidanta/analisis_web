import { useAppStore } from '../stores/appStore';

type ProjectType = 'individual' | 'squad';

const ProjectSelector = () => {
  const { setProjectType, setCurrentStep } = useAppStore();

  const handleSelectProject = (type: ProjectType) => {
    setProjectType(type);
    setCurrentStep(2);
  };

  const projects = [
    {
      id: 'individual' as ProjectType,
      title: 'Agente Individual',
      subtitle: 'Asistente de IA especializado',
      description: 'Crea un agente de conversación inteligente con capacidades específicas para tareas focalizadas.',
      features: [
        'Configuración personalizada de personalidad',
        'Integración con APIs y servicios externos', 
        'Manejo avanzado de contexto conversacional',
        'Análisis de sentimientos en tiempo real'
      ],
      icon: (
        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      gradient: 'from-indigo-500 to-blue-600',
      hoverGradient: 'from-indigo-600 to-blue-700'
    },
    {
      id: 'squad' as ProjectType,
      title: 'Squad de Agentes',
      subtitle: 'Equipo colaborativo de IA',
      description: 'Desarrolla un ecosistema de agentes especializados que trabajan en conjunto para resolver tareas complejas.',
      features: [
        'Coordinación automática entre agentes',
        'Distribución inteligente de tareas',
        'Comunicación inter-agente en tiempo real',
        'Escalabilidad y redundancia avanzada'
      ],
      icon: (
        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      gradient: 'from-purple-500 to-pink-600',
      hoverGradient: 'from-purple-600 to-pink-700'
    }
  ];

  const businessVerticals = [
    {
      title: 'Atención a Clientes/Citas',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-blue-400'
    },
    {
      title: 'Ventas',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: 'bg-green-400'
    },
    {
      title: 'Soporte Técnico',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'bg-orange-400'
    },
    {
      title: 'Cobranza',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      color: 'bg-purple-400'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header minimalista */}
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl mb-8 shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-semibold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-4">
            Selecciona tu Proyecto
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
            Elige el tipo de sistema de inteligencia artificial que deseas desarrollar para comenzar tu experiencia de construcción
          </p>
        </div>

        {/* Cards grid minimalista */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {projects.map((project, index) => (
            <div
              key={project.id}
              className="group relative animate-scale-in modern-card cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => handleSelectProject(project.id)}
            >
              {/* Card content */}
              <div className="p-6">
                {/* Header con icono minimalista */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-lg bg-gradient-to-br ${project.gradient} shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                      {project.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
                        {project.title}
                      </h3>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {project.subtitle}
                      </p>
                    </div>
                  </div>
                  
                  {/* Arrow indicator sutil */}
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>

                {/* Description */}
                <p className="text-slate-600 dark:text-slate-300 mb-5 leading-relaxed text-sm">
                  {project.description}
                </p>

                {/* Features list minimalista */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wide mb-3">
                    Características Principales
                  </h4>
                  <ul className="space-y-2">
                    {project.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center space-x-2.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${project.gradient} flex-shrink-0`}></div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action button minimalista */}
                <div className="mt-6">
                  <button 
                    onClick={() => handleSelectProject(project.id)}
                    className={`w-full text-center py-3 px-4 rounded-lg bg-gradient-to-r ${project.gradient} hover:${project.hoverGradient} text-white text-sm font-medium transition-all duration-300 group-hover:shadow-lg`}
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <span>Comenzar Proyecto</span>
                      <svg className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>

              {/* Decorative elements sutiles */}
              <div className="absolute top-3 right-3 w-20 h-20 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-xl group-hover:from-indigo-500/8 group-hover:to-purple-500/8 transition-all duration-500"></div>
            </div>
          ))}
        </div>

        {/* Bottom info section con verticales de negocio */}
        <div className="mt-12 text-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="max-w-2xl mx-auto">
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
              ¿No estás seguro de qué opción elegir? Puedes cambiar entre proyectos en cualquier momento 
              durante el proceso de desarrollo.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {businessVerticals.map((vertical, index) => (
                <div key={index} className="flex flex-col items-center space-y-2 text-xs text-slate-400">
                  <div className={`w-8 h-8 ${vertical.color} rounded-lg flex items-center justify-center text-white`}>
                    {vertical.icon}
                  </div>
                  <span className="text-center leading-tight">{vertical.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectSelector;