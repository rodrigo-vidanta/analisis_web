import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { BarChart3, TrendingUp, Send, Reply, Trophy, ChevronRight } from 'lucide-react';
import { whatsappTemplatesService } from '../../../services/whatsappTemplatesService';
import type {
  TemplateGroupHealth, TemplateAnalyticsData, TemplateAnalyticsRow,
  TemplateSendTimeline, AnalyticsDateRange, AnalyticsInterval,
  TemplateGroupStatus,
} from '../../../types/whatsappTemplates';
import { GROUP_STATUS_CONFIG } from '../../../types/whatsappTemplates';
import TemplateAnalyticsGrid from './TemplateAnalyticsGrid';
import TemplateDetailPanel from './TemplateDetailPanel';

// ============================================
// ANIMATED NUMBER COMPONENT
// ============================================
const AnimatedNumber: React.FC<{ value: number; decimals?: number; suffix?: string; prefix?: string }> = ({
  value, decimals = 0, suffix = '', prefix = ''
}) => {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, v => `${prefix}${v.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
};

// ============================================
// GROUP HEALTH CARD
// ============================================
const GroupHealthCard: React.FC<{
  group: TemplateGroupHealth;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}> = ({ group, isSelected, onClick, index }) => {
  const config = GROUP_STATUS_CONFIG[group.group_status as TemplateGroupStatus] || GROUP_STATUS_CONFIG.healthy;
  const replyRate = group.avg_reply_rate_24h ? parseFloat(group.avg_reply_rate_24h) : 0;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={`text-left p-4 rounded-xl border transition-all duration-200 ${
        isSelected
          ? 'border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/20 ring-1 ring-blue-500/30'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate pr-2">
          {group.group_name}
        </h4>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
          {config.label}
        </span>
      </div>

      {/* Mini health bar */}
      <div className="flex gap-0.5 mb-3 h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
        {group.healthy_count > 0 && (
          <div className="bg-emerald-500 transition-all" style={{ width: `${(group.healthy_count / Math.max(group.total_templates, 1)) * 100}%` }} />
        )}
        {group.warning_count > 0 && (
          <div className="bg-amber-500 transition-all" style={{ width: `${(group.warning_count / Math.max(group.total_templates, 1)) * 100}%` }} />
        )}
        {group.critical_count > 0 && (
          <div className="bg-red-500 transition-all" style={{ width: `${(group.critical_count / Math.max(group.total_templates, 1)) * 100}%` }} />
        )}
        {group.dead_or_paused_count > 0 && (
          <div className="bg-gray-400 dark:bg-gray-500 transition-all" style={{ width: `${(group.dead_or_paused_count / Math.max(group.total_templates, 1)) * 100}%` }} />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{group.total_templates}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Plantillas</p>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{group.total_sends_7d}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Envíos 7d</p>
        </div>
        <div>
          <p className={`text-lg font-bold ${replyRate > 15 ? 'text-emerald-600 dark:text-emerald-400' : replyRate > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}`}>
            {replyRate > 0 ? `${replyRate.toFixed(0)}%` : '—'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Resp.</p>
        </div>
      </div>
    </motion.button>
  );
};

// ============================================
// GENERIC RANKING LIST (reusable)
// ============================================
interface RankingItem {
  id: string;
  name: string;
  primaryValue: number;
  primaryLabel: string;
  secondaryValue: string;
  secondaryLabel: string;
}

const RankingList: React.FC<{
  title: string;
  icon: React.ReactNode;
  items: RankingItem[];
  barColors: string[];
  onSelect: (id: string) => void;
}> = ({ title, icon, items, barColors, onSelect }) => {
  const maxVal = useMemo(() => Math.max(...items.map(t => t.primaryValue), 1), [items]);
  const medals = ['text-amber-500', 'text-gray-400', 'text-amber-700'];

  if (items.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onSelect(item.id)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
          >
            <span className={`text-sm font-bold w-6 text-center ${i < 3 ? medals[i] : 'text-gray-400 dark:text-gray-500'}`}>
              {i + 1}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate pr-2">
                  {item.name}
                </span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {item.primaryLabel}
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: barColors[i % barColors.length] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.primaryValue / maxVal) * 100}%` }}
                  transition={{ delay: 0.2 + i * 0.06, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {item.secondaryValue}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {item.secondaryLabel}
                </span>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// ============================================
// GLOBAL TIMELINE CHART
// ============================================
const GlobalTimelineChart: React.FC<{
  data: TemplateSendTimeline[];
  isLoading: boolean;
}> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-[200px] bg-gray-100 dark:bg-gray-700/50 rounded-lg" />
        </div>
      </div>
    );
  }

  const chartData = data.map(d => ({
    ...d,
    date: new Date(d.period).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
    reply_rate: Math.min(d.reply_rate, 100),
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-blue-500" />
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Actividad de Envíos</h3>
      </div>

      {chartData.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
          Sin datos para el período seleccionado
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gradient-sends" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradient-replies" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
            <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
              labelStyle={{ color: '#F9FAFB', fontWeight: 'bold' }}
              formatter={(value: number, name: string) => [
                value.toLocaleString(),
                name === 'total_sends' ? 'Envíos' : name === 'total_replied' ? 'Respuestas' : name
              ]}
            />
            <Area type="monotone" dataKey="total_sends" stroke="#3B82F6" strokeWidth={2} fill="url(#gradient-sends)" animationDuration={1600} />
            <Area type="monotone" dataKey="total_replied" stroke="#8B5CF6" strokeWidth={2} fill="url(#gradient-replies)" animationDuration={1600} />
          </AreaChart>
        </ResponsiveContainer>
      )}

      <div className="flex items-center justify-center gap-6 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Envíos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded-full bg-purple-500" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Respuestas</span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// DATE RANGE SELECTOR
// ============================================
const DateRangeSelector: React.FC<{
  value: AnalyticsDateRange;
  onChange: (range: AnalyticsDateRange) => void;
}> = ({ value, onChange }) => {
  const options: { id: AnalyticsDateRange; label: string }[] = [
    { id: 'week', label: '7 días' },
    { id: 'month', label: '30 días' },
    { id: 'year', label: '1 año' },
  ];

  return (
    <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
            value === opt.id
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

// ============================================
// MAIN MODULE
// ============================================
const TemplateAnalyticsModule: React.FC = () => {
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>('month');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Data states
  const [groupsHealth, setGroupsHealth] = useState<TemplateGroupHealth[]>([]);
  const [allAnalytics, setAllAnalytics] = useState<TemplateAnalyticsData[]>([]);
  const [gridData, setGridData] = useState<TemplateAnalyticsRow[]>([]);
  const [timelineData, setTimelineData] = useState<TemplateSendTimeline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTimelineLoading, setIsTimelineLoading] = useState(true);

  // Date range helpers
  const getDateRange = useCallback((range: AnalyticsDateRange): { start: string; end: string; interval: AnalyticsInterval } => {
    const end = new Date().toISOString();
    const start = new Date();
    let interval: AnalyticsInterval = 'day';

    switch (range) {
      case 'week':
        start.setDate(start.getDate() - 7);
        interval = 'day';
        break;
      case 'month':
        start.setDate(start.getDate() - 30);
        interval = 'day';
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        interval = 'month';
        break;
    }

    return { start: start.toISOString(), end, interval };
  }, []);

  // Groups map for template → group name
  const groupsMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groupsHealth) {
      map.set(g.group_id, g.group_name);
    }
    return map;
  }, [groupsHealth]);

  // Load main data
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [groups, analytics, grid] = await Promise.all([
          whatsappTemplatesService.getGroupsWithHealth(),
          whatsappTemplatesService.getAllTemplateAnalytics(),
          whatsappTemplatesService.getAnalyticsGridData(),
        ]);
        setGroupsHealth(groups.filter(g => g.group_is_active));
        setAllAnalytics(analytics);
        setGridData(grid);
      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Load timeline data based on date range
  useEffect(() => {
    const loadTimeline = async () => {
      setIsTimelineLoading(true);
      try {
        const { start, end, interval } = getDateRange(dateRange);
        const data = await whatsappTemplatesService.getTemplateSendsTimeline(
          null, selectedGroupId, start, end, interval
        );
        setTimelineData(data);
      } catch (err) {
        console.error('Error loading timeline:', err);
      } finally {
        setIsTimelineLoading(false);
      }
    };
    loadTimeline();
  }, [dateRange, selectedGroupId, getDateRange]);

  // KPI calculations
  const kpis = useMemo(() => {
    const totalTemplates = gridData.length;
    const totalSends7d = gridData.reduce((sum, t) => sum + t.sends_7d, 0);
    const withReplies = gridData.filter(t => t.reply_rate_percent != null && t.reply_rate_percent > 0);
    const avgReplyRate = withReplies.length > 0
      ? withReplies.reduce((sum, t) => sum + (t.reply_rate_percent || 0), 0) / withReplies.length
      : 0;
    const topEffectiveness = allAnalytics.length > 0 ? (allAnalytics[0]?.effectiveness_score || 0) : 0;

    return { totalTemplates, totalSends7d, avgReplyRate, topEffectiveness };
  }, [gridData, allAnalytics]);

  // Filter grid by selected group
  const filteredGridData = useMemo(() => {
    if (!selectedGroupId) return gridData;
    return gridData.filter(t => t.group_id === selectedGroupId);
  }, [gridData, selectedGroupId]);

  const handleGroupClick = useCallback((groupId: string) => {
    setSelectedGroupId(prev => prev === groupId ? null : groupId);
  }, []);

  // Period-aware helpers for rankings
  const getPeriodSends = useCallback((t: TemplateAnalyticsData) =>
    dateRange === 'week' ? t.sends_last_7d :
    dateRange === 'month' ? t.sends_last_30d : t.total_sends,
  [dateRange]);

  const getPeriodReplyRate = useCallback((t: TemplateAnalyticsData) =>
    dateRange === 'week' ? (t.reply_rate_7d_percent ?? t.reply_rate_percent) :
    dateRange === 'month' ? (t.reply_rate_30d_percent ?? t.reply_rate_percent) : t.reply_rate_percent,
  [dateRange]);

  const minSendsThreshold = dateRange === 'week' ? 3 : dateRange === 'month' ? 10 : 20;

  // Template → group name map (for cross-referencing allAnalytics with group info)
  const templateGroupMap = useMemo(() =>
    new Map(gridData.map(t => [t.template_id, t.group_name])),
  [gridData]);

  // Top 10 by effectiveness (filtered by period min sends)
  const top10Effectiveness = useMemo((): RankingItem[] =>
    allAnalytics
      .filter(a => a.effectiveness_score != null && a.effectiveness_score > 0 && getPeriodSends(a) >= minSendsThreshold)
      .slice(0, 10)
      .map(t => ({
        id: t.template_id,
        name: t.template_name,
        primaryValue: t.effectiveness_score || 0,
        primaryLabel: (t.effectiveness_score || 0).toFixed(1),
        secondaryValue: `${(getPeriodReplyRate(t) || 0).toFixed(1)}% resp.`,
        secondaryLabel: `${getPeriodSends(t).toLocaleString()} envíos`,
      })),
    [allAnalytics, getPeriodSends, getPeriodReplyRate, minSendsThreshold]
  );

  // Top 10 by sends in period (excluding "Actualizacion de Numero" group — mass broadcast)
  const top10BySends = useMemo((): RankingItem[] => {
    const excluded = ['actualizacion de numero', 'actualización de número'];
    return [...allAnalytics]
      .filter(t => {
        const groupName = templateGroupMap.get(t.template_id) || '';
        return !excluded.includes(groupName.toLowerCase()) && getPeriodSends(t) > 0;
      })
      .sort((a, b) => getPeriodSends(b) - getPeriodSends(a))
      .slice(0, 10)
      .map(t => ({
        id: t.template_id,
        name: t.template_name,
        primaryValue: getPeriodSends(t),
        primaryLabel: getPeriodSends(t).toLocaleString(),
        secondaryValue: `${(getPeriodReplyRate(t) || 0).toFixed(1)}% resp.`,
        secondaryLabel: templateGroupMap.get(t.template_id) || '',
      }));
  }, [allAnalytics, templateGroupMap, getPeriodSends, getPeriodReplyRate]);

  // Skeleton for loading
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
        </div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Analítica de Plantillas</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Rendimiento y métricas en tiempo real</p>
          </div>
        </div>
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Plantillas Activas', value: kpis.totalTemplates, icon: <BarChart3 className="w-4 h-4" />, gradient: 'from-blue-500 to-blue-600', bg: 'from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20' },
          { label: 'Envíos (7d)', value: kpis.totalSends7d, icon: <Send className="w-4 h-4" />, gradient: 'from-emerald-500 to-emerald-600', bg: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20' },
          { label: 'Tasa de Respuesta', value: kpis.avgReplyRate, icon: <Reply className="w-4 h-4" />, gradient: 'from-purple-500 to-purple-600', bg: 'from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20', suffix: '%', decimals: 1 },
          { label: 'Mejor Efectividad', value: kpis.topEffectiveness, icon: <Trophy className="w-4 h-4" />, gradient: 'from-amber-500 to-amber-600', bg: 'from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20', decimals: 1 },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.04 }}
            className={`p-4 rounded-xl bg-gradient-to-br ${kpi.bg} border border-gray-100 dark:border-gray-700/50`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg bg-gradient-to-br ${kpi.gradient} text-white`}>
                {kpi.icon}
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">{kpi.label}</span>
            </div>
            <p className="font-bold text-gray-900 dark:text-white text-2xl">
              <AnimatedNumber value={kpi.value} decimals={kpi.decimals || 0} suffix={kpi.suffix || ''} />
            </p>
          </motion.div>
        ))}
      </div>

      {/* Group Health Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Salud por Grupo
          </h3>
          {selectedGroupId && (
            <button
              onClick={() => setSelectedGroupId(null)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Mostrar todos
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
          {groupsHealth
            .filter(g => !g.exclude_from_sending)
            .map((group, i) => (
              <GroupHealthCard
                key={group.group_id}
                group={group}
                isSelected={selectedGroupId === group.group_id}
                onClick={() => handleGroupClick(group.group_id)}
                index={i}
              />
            ))}
        </div>
      </div>

      {/* Timeline full width */}
      <GlobalTimelineChart data={timelineData} isLoading={isTimelineLoading} />

      {/* Top 10 Effectiveness + Top 10 Más Enviadas side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RankingList
          title="Top 10 — Más Efectivas"
          icon={<Trophy className="w-5 h-5 text-amber-500" />}
          barColors={['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#818cf8', '#6366f1', '#8b5cf6', '#a855f7', '#c084fc']}
          onSelect={setSelectedTemplateId}
          items={top10Effectiveness}
        />
        <RankingList
          title="Top 10 — Más Enviadas"
          icon={<Send className="w-5 h-5 text-blue-500" />}
          barColors={['#3b82f6', '#2563eb', '#1d4ed8', '#60a5fa', '#93c5fd', '#3b82f6', '#2563eb', '#1d4ed8', '#60a5fa', '#93c5fd']}
          onSelect={setSelectedTemplateId}
          items={top10BySends}
        />
      </div>

      {/* Data Grid */}
      <TemplateAnalyticsGrid
        data={filteredGridData}
        onSelectTemplate={setSelectedTemplateId}
      />

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedTemplateId && (
          <TemplateDetailPanel
            templateId={selectedTemplateId}
            onClose={() => setSelectedTemplateId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TemplateAnalyticsModule;
