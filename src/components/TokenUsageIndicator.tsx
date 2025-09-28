import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tokenService, type TokenLimits } from '../services/tokenService';

interface TokenUsageIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const TokenUsageIndicator: React.FC<TokenUsageIndicatorProps> = ({ 
  size = 'md', 
  showDetails = false 
}) => {
  const { user } = useAuth();
  const [tokenInfo, setTokenInfo] = useState<TokenLimits | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadTokenInfo();
      // Actualizar cada 30 segundos
      const interval = setInterval(loadTokenInfo, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const loadTokenInfo = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const info = await tokenService.getUserTokenInfo(user.id);
      setTokenInfo(info);
      } catch (error) {
        console.error('Error cargando info de tokens:', error);
        // Datos dummy para desarrollo
        setTokenInfo({
          user_id: user.id,
          monthly_limit: user.role_name === 'admin' ? -1 : 10000,
          daily_limit: user.role_name === 'admin' ? -1 : 500,
          current_month_usage: user.role_name === 'admin' ? 0 : 2500,
          current_day_usage: user.role_name === 'admin' ? 0 : 150,
          monthly_usage_percentage: user.role_name === 'admin' ? 0 : 25,
          daily_usage_percentage: user.role_name === 'admin' ? 0 : 30,
          warning_threshold: 80
        });
      } finally {
      setLoading(false);
    }
  };

  if (!tokenInfo || !user) return null;

  const usagePercentage = tokenInfo.monthly_usage_percentage;
  const { color, bgColor, textColor } = tokenService.getUsageColor(usagePercentage);
  
  // Tamaños según prop
  const sizes = {
    sm: { container: 'w-8 h-8', stroke: 2, text: 'text-xs' },
    md: { container: 'w-10 h-10', stroke: 3, text: 'text-xs' },
    lg: { container: 'w-12 h-12', stroke: 4, text: 'text-sm' }
  };
  
  const sizeConfig = sizes[size];
  const radius = size === 'sm' ? 14 : size === 'md' ? 18 : 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (usagePercentage / 100) * circumference;

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Indicador circular */}
      <div className={`${sizeConfig.container} relative`}>
        {/* Círculo de fondo */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke="currentColor"
            strokeWidth={sizeConfig.stroke}
            fill="none"
            className="text-slate-200 dark:text-slate-700"
          />
          {/* Círculo de progreso */}
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke={color}
            strokeWidth={sizeConfig.stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
            style={{
              filter: usagePercentage > 80 ? 'drop-shadow(0 0 4px currentColor)' : 'none'
            }}
          />
        </svg>
        
        {/* Porcentaje en el centro */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${sizeConfig.text} font-bold ${textColor}`}>
            {Math.round(usagePercentage)}%
          </span>
        </div>
      </div>

      {/* Tooltip con detalles */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3 py-2 rounded-lg shadow-xl text-xs whitespace-nowrap">
            <div className="space-y-1">
              <div className="font-semibold">Uso de Tokens - {user.full_name}</div>
              <div>Mensual: {tokenInfo.current_month_usage.toLocaleString()}/{tokenInfo.monthly_limit.toLocaleString()}</div>
              <div>Diario: {tokenInfo.current_day_usage.toLocaleString()}/{tokenInfo.daily_limit.toLocaleString()}</div>
              <div className={`font-medium ${usagePercentage > 80 ? 'text-red-300' : 'text-green-300'}`}>
                {usagePercentage > 90 ? '⚠️ Límite casi alcanzado' : 
                 usagePercentage > 80 ? '⚡ Uso alto' : 
                 '✅ Uso normal'}
              </div>
            </div>
            {/* Flecha del tooltip */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="border-4 border-transparent border-t-slate-900 dark:border-t-slate-100"></div>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de carga */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
        </div>
      )}

      {/* Detalles expandidos */}
      {showDetails && tokenInfo && (
        <div className="mt-2 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Mensual:</span>
            <span className={textColor}>
{tokenInfo.monthly_limit === -1 
                ? `${tokenInfo.current_month_usage.toLocaleString()}/∞`
                : `${tokenInfo.current_month_usage.toLocaleString()}/${tokenInfo.monthly_limit.toLocaleString()}`
              }
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Diario:</span>
            <span className={textColor}>
{tokenInfo.daily_limit === -1 
                ? `${tokenInfo.current_day_usage.toLocaleString()}/∞`
                : `${tokenInfo.current_day_usage.toLocaleString()}/${tokenInfo.daily_limit.toLocaleString()}`
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenUsageIndicator;
