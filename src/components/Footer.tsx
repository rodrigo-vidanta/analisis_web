import React, { useState, useEffect } from 'react';
import SnakeEasterEgg from './SnakeEasterEgg';
import { supabaseSystemUI } from '../config/supabaseSystemUI';
import { useSystemConfig } from '../hooks/useSystemConfig';

const Footer: React.FC = () => {
  // Versión actual
  const version = 'B2.2.9N6.0.0';
  const { config } = useSystemConfig();
  
  // Estado para tooltip de AI Division
  const [showAIDivisionTooltip, setShowAIDivisionTooltip] = useState(false);
  const [aiDivisionMembers, setAiDivisionMembers] = useState<Array<{name: string, email: string, avatar: string | null}>>([]);
  
  // Easter egg state
  const [clickCount, setClickCount] = useState(0);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  
  // Manejar clics en la serpiente
  const handleSnakeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    if (newCount >= 6) {
      setShowEasterEgg(true);
      setClickCount(0); // Reset counter
    }
    
    // Reset counter después de 3 segundos si no llega a 6
    setTimeout(() => {
      if (newCount < 6) {
        setClickCount(0);
      }
    }, 3000);
  };
  
  // Cerrar easter egg
  const handleCloseEasterEgg = () => {
    setShowEasterEgg(false);
    setClickCount(0);
  };
  
  // Cargar avatares de AI Division
  useEffect(() => {
    const loadAIDivisionAvatars = async () => {
      try {
        const emails = ['samuelrosales@grupovidanta.com', 'rodrigomora@grupovidanta.com'];
        
        // Obtener usuarios
        const { data: users, error: usersError } = await supabaseSystemUI
          .from('auth_users')
          .select('id, email, full_name')
          .in('email', emails);
        
        if (usersError || !users) {
          console.error('Error loading AI Division users:', usersError);
          // Fallback con datos básicos
          setAiDivisionMembers([
            { name: 'Samuel Rosales', email: 'samuelrosales@grupovidanta.com', avatar: null },
            { name: 'Rodrigo Mora', email: 'rodrigomora@grupovidanta.com', avatar: null }
          ]);
          return;
        }
        
        // Obtener avatares por separado
        const userIds = users.map(u => u.id);
        const { data: avatars, error: avatarsError } = await supabaseSystemUI
          .from('user_avatars')
          .select('user_id, avatar_url')
          .in('user_id', userIds)
          .order('uploaded_at', { ascending: false });
        
        if (avatarsError) {
          console.warn('Error loading avatars:', avatarsError);
        }
        
        // Crear mapa de avatares por user_id
        const avatarMap = new Map<string, string>();
        if (avatars) {
          avatars.forEach(avatar => {
            if (!avatarMap.has(avatar.user_id)) {
              avatarMap.set(avatar.user_id, avatar.avatar_url);
            }
          });
        }
        
        // Combinar usuarios con avatares
        const members = users.map(user => ({
          name: user.full_name || user.email.split('@')[0],
          email: user.email,
          avatar: avatarMap.get(user.id) || null
        }));
        
        setAiDivisionMembers(members);
      } catch (error) {
        console.error('Error loading AI Division avatars:', error);
        // Fallback con datos básicos
        setAiDivisionMembers([
          { name: 'Samuel Rosales', email: 'samuelrosales@grupovidanta.com', avatar: null },
          { name: 'Rodrigo Mora', email: 'rodrigomora@grupovidanta.com', avatar: null }
        ]);
      }
    };
    
    loadAIDivisionAvatars();
  }, []);

  return (
    <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 py-4">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            
            {/* Texto principal con logo */}
            <div className="flex items-center gap-2">
              {config.app_branding?.favicon_url ? (
                <img 
                  src={config.app_branding.favicon_url} 
                  alt="Vidanta" 
                  className="w-4 h-4 flex-shrink-0 object-contain"
                  style={{ imageRendering: 'crisp-edges' }}
                  onError={(e) => {
                    // Si falla, mostrar SVG fallback
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
              ) : null}
              <svg 
                className={`w-4 h-4 flex-shrink-0 text-blue-500 dark:text-blue-400 ${config.app_branding?.favicon_url ? 'hidden' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-medium">
                Vidanta World Vacation Planner
              </span>
            </div>
            
            {/* Separador */}
            <span className="text-slate-300 dark:text-slate-600">•</span>
            
            {/* Diseñado por AI Division con tooltip */}
            <div className="relative flex items-center gap-1">
              <span>Designed by</span>
              <span 
                className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                onMouseEnter={() => setShowAIDivisionTooltip(true)}
                onMouseLeave={() => setShowAIDivisionTooltip(false)}
              >
                AI Division
              </span>
              
              {/* Tooltip con avatares */}
              {showAIDivisionTooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 min-w-[280px] z-50">
                  <div className="flex flex-col gap-3">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      AI Division Team
                    </div>
                    {aiDivisionMembers.map((member, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          {member.avatar ? (
                            <img 
                              src={member.avatar} 
                              alt={member.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-semibold text-sm">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {member.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Flecha del tooltip */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="w-3 h-3 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 transform rotate-45"></div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Separador */}
            <span className="text-slate-300 dark:text-slate-600">•</span>
            
            {/* Versión Beta con serpiente clickeable */}
            <div className="flex items-center gap-2">
              {/* Icono de serpiente - Easter Egg secreto */}
              <div
                onClick={handleSnakeClick}
                className="w-4 h-4 text-slate-700 dark:text-slate-300 cursor-default select-none"
                style={{ animation: 'heartbeat 1.5s ease-in-out infinite' }}
              >
                <style>{`
                  @keyframes heartbeat {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                  }
                `}</style>
                <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
                  {/* Serpiente ondulada */}
                  <path d="M4 12c0 0 2-2 4-2s4 2 4 2 2-2 4-2 4 2 4 2 2-2 4-2 4 2 4 2v2c0 0-2 2-4 2s-4-2-4-2-2 2-4 2-4-2-4-2-2 2-4 2-4-2-4-2v-2z"/>
                  {/* Cabeza */}
                  <circle cx="20" cy="12" r="2" fill="currentColor"/>
                  {/* Ojos */}
                  <circle cx="19" cy="11" r="0.5" fill="white"/>
                  <circle cx="21" cy="11" r="0.5" fill="white"/>
                </svg>
              </div>
              
              <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                {version}
              </span>
            </div>
            
          </div>
        </div>
      </div>
      
      {/* Easter Egg Component */}
      <SnakeEasterEgg 
        isVisible={showEasterEgg}
        onClose={handleCloseEasterEgg}
      />
    </footer>
  );
};

export default Footer;
