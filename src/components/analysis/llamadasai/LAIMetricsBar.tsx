/**
 * LAI Metrics Summary Bar
 * Barra compacta con metricas agregadas del modulo Llamadas AI (Natalia)
 * Glassmorphism, animadas, con color coding
 */

import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Target, Flag } from 'lucide-react';
import type { LAIMetrics } from '../../../types/llamadasAITypes';

interface LAIMetricsBarProps {
  metrics: LAIMetrics;
  loading: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-blue-600 dark:text-blue-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

const SkeletonMetric: React.FC = () => (
  <div className="flex flex-col items-center gap-1.5 px-4 py-2 min-w-[100px]">
    <div className="flex items-center gap-1.5">
      <div className="w-3.5 h-3.5 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
      <div className="w-14 h-2.5 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
    </div>
    <div className="w-10 h-5 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
  </div>
);

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

const LAIMetricsBar: React.FC<LAIMetricsBarProps> = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div
        className="flex items-center divide-x divide-neutral-200 dark:divide-neutral-700
                    bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm
                    border border-neutral-200 dark:border-neutral-700
                    rounded-xl overflow-hidden h-16"
      >
        <SkeletonMetric />
        <SkeletonMetric />
        <SkeletonMetric />
        <SkeletonMetric />
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
        value={metrics.totalRecords.toLocaleString()}
      />
      <MetricItem
        icon={TrendingUp}
        label="Avg Score"
        value={metrics.avgScore.toFixed(1)}
        colorClass={getScoreColor(metrics.avgScore)}
      />
      <MetricItem
        icon={Flag}
        label="Avg Checkpoint"
        value={`${metrics.avgCheckpoint.toFixed(1)} / 10`}
      />
      <MetricItem
        icon={Target}
        label="Transferencias"
        value={metrics.intelligentTransferCount.toLocaleString()}
        colorClass="text-emerald-600 dark:text-emerald-400"
      />
    </motion.div>
  );
};

export default LAIMetricsBar;
