/**
 * Metrics Summary Bar
 * Barra compacta con métricas agregadas — glassmorphism, animadas, con color coding
 */

import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Clock, Percent, Headphones } from 'lucide-react';
import type { PQNCMetrics } from '../../../types/pqncTypes';

interface PQNCMetricsBarProps {
  metrics: PQNCMetrics;
  loading: boolean;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-blue-600 dark:text-blue-400';
  if (score >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

const MetricItem: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  colorClass?: string;
}> = ({ icon: Icon, label, value, colorClass }) => (
  <div className="flex flex-col items-center gap-1 px-4 py-2 min-w-[100px]">
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 flex-shrink-0" />
      <span className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
        {label}
      </span>
    </div>
    <span className={`text-base font-bold tabular-nums ${colorClass || 'text-neutral-800 dark:text-neutral-100'}`}>
      {value}
    </span>
  </div>
);

const PQNCMetricsBar: React.FC<PQNCMetricsBarProps> = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center divide-x divide-neutral-200 dark:divide-neutral-700
                      bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm
                      border border-neutral-200 dark:border-neutral-700
                      rounded-xl overflow-hidden animate-pulse h-16">
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center divide-x divide-neutral-200 dark:divide-neutral-700
                 bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm
                 border border-neutral-200 dark:border-neutral-700
                 rounded-xl overflow-hidden"
    >
      <MetricItem
        icon={BarChart3}
        label="Total"
        value={metrics.totalCalls.toLocaleString()}
      />
      <MetricItem
        icon={TrendingUp}
        label="Score"
        value={metrics.avgQuality.toFixed(1)}
        colorClass={getScoreColor(metrics.avgQuality)}
      />
      <MetricItem
        icon={TrendingUp}
        label="Ponderado"
        value={metrics.avgQualityPonderada.toFixed(1)}
        colorClass={getScoreColor(metrics.avgQualityPonderada)}
      />
      <MetricItem
        icon={Clock}
        label="Duración"
        value={formatDuration(metrics.avgDuration)}
      />
      <MetricItem
        icon={Percent}
        label="Éxito"
        value={`${metrics.successRate}%`}
        colorClass={metrics.successRate >= 30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}
      />
    </motion.div>
  );
};

export default PQNCMetricsBar;
