import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import Plot from 'react-plotly.js';
import { BarChart3, TrendingUp, Send, Reply, Trophy, ChevronRight, ChevronDown, Filter } from 'lucide-react';
import { whatsappTemplatesService } from '../../../services/whatsappTemplatesService';
import type {
  TemplateGroupHealth, TemplateAnalyticsData, TemplateAnalyticsRow,
  TemplateSendTimeline, AnalyticsDateRange, AnalyticsInterval,
} from '../../../types/whatsappTemplates';
import TemplateAnalyticsGrid from './TemplateAnalyticsGrid';
import TemplateDetailPanel from './TemplateDetailPanel';

// ============================================
// ANIMATED NUMBER
// ============================================
const AnimatedNumber: React.FC<{ value: number; decimals?: number; suffix?: string; prefix?: string }> = ({
  value, decimals = 0, suffix = '', prefix = ''
}) => {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, v => `${prefix}${v.toFixed(decimals)}${suffix}`);
  useEffect(() => { spring.set(value); }, [value, spring]);
  return <motion.span>{display}</motion.span>;
};

// ============================================
// DATE RANGE SELECTOR (5 options)
// ============================================
const DateRangeSelector: React.FC<{
  value: AnalyticsDateRange;
  onChange: (range: AnalyticsDateRange) => void;
}> = ({ value, onChange }) => {
  const options: { id: AnalyticsDateRange; label: string }[] = [
    { id: '24h', label: '24h' },
    { id: 'week', label: '7d' },
    { id: 'month', label: '30d' },
    { id: '6months', label: '6m' },
    { id: 'year', label: '1 año' },
  ];

  return (
    <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
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
// FILTER SELECTOR (Grupo / Plantilla)
// ============================================
type FilterMode = 'all' | 'group' | 'template';

const FilterSelector: React.FC<{
  mode: FilterMode;
  selectedGroupId: string | null;
  selectedTemplateId: string | null;
  groups: TemplateGroupHealth[];
  templates: TemplateAnalyticsRow[];
  onModeChange: (mode: FilterMode) => void;
  onGroupChange: (id: string | null) => void;
  onTemplateChange: (id: string | null) => void;
}> = ({ mode, selectedGroupId, selectedTemplateId, groups, templates, onModeChange, onGroupChange, onTemplateChange }) => {
  const activeGroups = useMemo(() => groups.filter(g => g.group_is_active && !g.exclude_from_sending), [groups]);
  const uniqueTemplates = useMemo(() =>
    [...templates].sort((a, b) => a.template_name.localeCompare(b.template_name)),
  [templates]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5">
        <Filter className="w-4 h-4 text-gray-400" />
        <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
          {[
            { id: 'all' as FilterMode, label: 'Todo' },
            { id: 'group' as FilterMode, label: 'Grupo' },
            { id: 'template' as FilterMode, label: 'Plantilla' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => {
                onModeChange(opt.id);
                if (opt.id === 'all') { onGroupChange(null); onTemplateChange(null); }
              }}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                mode === opt.id
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'group' && (
        <select
          value={selectedGroupId || ''}
          onChange={e => onGroupChange(e.target.value || null)}
          className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none max-w-[220px]"
        >
          <option value="">Seleccionar grupo...</option>
          {activeGroups.map(g => (
            <option key={g.group_id} value={g.group_id}>{g.group_name}</option>
          ))}
        </select>
      )}

      {mode === 'template' && (
        <select
          value={selectedTemplateId || ''}
          onChange={e => onTemplateChange(e.target.value || null)}
          className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none max-w-[280px]"
        >
          <option value="">Seleccionar plantilla...</option>
          {uniqueTemplates.map(t => (
            <option key={t.template_id} value={t.template_id}>{t.template_name}</option>
          ))}
        </select>
      )}
    </div>
  );
};

// ============================================
// FUNNEL CHART (Plotly)
// ============================================
const FunnelChart: React.FC<{
  sent: number;
  delivered: number;
  replied: number;
  isLoading: boolean;
}> = ({ sent, delivered, replied, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-[180px] bg-gray-100 dark:bg-gray-700/50 rounded-lg" />
        </div>
      </div>
    );
  }

  const values = [sent, delivered, replied];
  const labels = [
    `Enviados | ${sent.toLocaleString()}`,
    `Recibidos | ${delivered.toLocaleString()} | ${sent > 0 ? `${((delivered / sent) * 100).toFixed(1)}%` : '0%'}`,
    `Respondidos | ${replied.toLocaleString()} | ${sent > 0 ? `${((replied / sent) * 100).toFixed(1)}%` : '0%'}`,
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-2 mb-2">
        <ChevronDown className="w-5 h-5 text-indigo-500" />
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Embudo de Conversión</h3>
      </div>

      {sent === 0 ? (
        <div className="h-[180px] flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
          Sin datos para el grupo seleccionado
        </div>
      ) : (
        <Plot
          data={[{
            type: 'funnel',
            y: labels,
            x: values,
            textposition: 'inside',
            textinfo: 'value+percent initial',
            marker: {
              color: ['#3B82F6', '#8B5CF6', '#10B981'],
            },
            connector: {
              line: { color: '#374151', width: 1, dash: 'dot' as const },
              fillcolor: 'rgba(55,65,81,0.05)',
            },
          }]}
          layout={{
            funnelmode: 'stack',
            showlegend: false,
            margin: { l: 10, r: 10, t: 10, b: 10 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: {
              family: 'Inter, system-ui, sans-serif',
              size: 12,
              color: '#9CA3AF',
            },
            height: 180,
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%', height: '180px' }}
          useResizeHandler
        />
      )}
    </div>
  );
};

// ============================================
// GLOBAL TIMELINE CHART (4 lines: sent, delivered, replied, failed)
// ============================================
const GlobalTimelineChart: React.FC<{
  data: TemplateSendTimeline[];
  isLoading: boolean;
  dateRange: AnalyticsDateRange;
}> = ({ data, isLoading, dateRange }) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-[220px] bg-gray-100 dark:bg-gray-700/50 rounded-lg" />
        </div>
      </div>
    );
  }

  const chartData = data.map(d => ({
    ...d,
    date: dateRange === 'year' || dateRange === '6months'
      ? new Date(d.period).toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
      : dateRange === '24h'
        ? new Date(d.period).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        : new Date(d.period).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
    reply_rate: Math.min(d.reply_rate, 100),
  }));

  const nameMap: Record<string, string> = {
    total_sends: 'Enviados',
    total_delivered: 'Recibidos',
    total_replied: 'Respondidos',
    total_failed: 'Fallidos',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-blue-500" />
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Actividad de Envíos</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">(global)</span>
      </div>

      {chartData.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
          Sin datos para el período seleccionado
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="g-sends" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="g-delivered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="g-replied" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="g-failed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
            <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
              labelStyle={{ color: '#F9FAFB', fontWeight: 'bold' }}
              formatter={(value: number, name: string) => [value.toLocaleString(), nameMap[name] || name]}
            />
            <Area type="monotone" dataKey="total_sends" stroke="#3B82F6" strokeWidth={2} fill="url(#g-sends)" animationDuration={1600} />
            <Area type="monotone" dataKey="total_delivered" stroke="#8B5CF6" strokeWidth={2} fill="url(#g-delivered)" animationDuration={1600} />
            <Area type="monotone" dataKey="total_replied" stroke="#10B981" strokeWidth={2} fill="url(#g-replied)" animationDuration={1600} />
            <Area type="monotone" dataKey="total_failed" stroke="#EF4444" strokeWidth={1.5} fill="url(#g-failed)" animationDuration={1600} strokeDasharray="4 2" />
          </AreaChart>
        </ResponsiveContainer>
      )}

      <div className="flex items-center justify-center gap-5 mt-3">
        {[
          { color: 'bg-blue-500', label: 'Enviados' },
          { color: 'bg-purple-500', label: 'Recibidos' },
          { color: 'bg-emerald-500', label: 'Respondidos' },
          { color: 'bg-red-500', label: 'Fallidos' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-0.5 rounded-full ${l.color}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
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

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Sin datos suficientes</p>
      </div>
    );
  }

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
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate pr-2">{item.name}</span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{item.primaryLabel}</span>
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
                <span className="text-xs text-gray-500 dark:text-gray-400">{item.secondaryValue}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{item.secondaryLabel}</span>
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
// MAIN MODULE
// ============================================
const TemplateAnalyticsModule: React.FC = () => {
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>('month');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedFilterTemplateId, setSelectedFilterTemplateId] = useState<string | null>(null);
  const [detailTemplateId, setDetailTemplateId] = useState<string | null>(null);

  // Data states
  const [groupsHealth, setGroupsHealth] = useState<TemplateGroupHealth[]>([]);
  const [allAnalytics, setAllAnalytics] = useState<TemplateAnalyticsData[]>([]);
  const [gridData, setGridData] = useState<TemplateAnalyticsRow[]>([]);
  const [timelineData, setTimelineData] = useState<TemplateSendTimeline[]>([]);
  const [funnelData, setFunnelData] = useState<TemplateSendTimeline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTimelineLoading, setIsTimelineLoading] = useState(true);
  const [isFunnelLoading, setIsFunnelLoading] = useState(false);

  // Date range helpers
  const getDateRange = useCallback((range: AnalyticsDateRange): { start: string; end: string; interval: AnalyticsInterval } => {
    const end = new Date().toISOString();
    const start = new Date();
    let interval: AnalyticsInterval = 'day';

    switch (range) {
      case '24h':
        start.setHours(start.getHours() - 24);
        interval = 'day'; // will be a single point or hourly
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        interval = 'day';
        break;
      case 'month':
        start.setDate(start.getDate() - 30);
        interval = 'day';
        break;
      case '6months':
        start.setMonth(start.getMonth() - 6);
        interval = 'week';
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        interval = 'month';
        break;
    }

    return { start: start.toISOString(), end, interval };
  }, []);

  // Template → group mapping
  const templateGroupMap = useMemo(() =>
    new Map(gridData.map(t => [t.template_id, { group_name: t.group_name, group_id: t.group_id }])),
  [gridData]);

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

  // Load timeline (GLOBAL — only responds to date range, not group/template filter)
  useEffect(() => {
    const loadTimeline = async () => {
      setIsTimelineLoading(true);
      try {
        const { start, end, interval } = getDateRange(dateRange);
        const data = await whatsappTemplatesService.getTemplateSendsTimeline(null, null, start, end, interval);
        setTimelineData(data);
      } catch (err) {
        console.error('Error loading timeline:', err);
      } finally {
        setIsTimelineLoading(false);
      }
    };
    loadTimeline();
  }, [dateRange, getDateRange]);

  // Load funnel data (responds ONLY to group filter)
  useEffect(() => {
    const loadFunnel = async () => {
      setIsFunnelLoading(true);
      try {
        // Funnel always uses 30d window for meaningful data
        const end = new Date().toISOString();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        const data = await whatsappTemplatesService.getTemplateSendsTimeline(
          null, selectedGroupId, start.toISOString(), end, 'month'
        );
        setFunnelData(data);
      } catch (err) {
        console.error('Error loading funnel:', err);
      } finally {
        setIsFunnelLoading(false);
      }
    };
    loadFunnel();
  }, [selectedGroupId]);

  // Funnel aggregates
  const funnelTotals = useMemo(() => {
    const sent = funnelData.reduce((s, d) => s + d.total_sends, 0);
    const delivered = funnelData.reduce((s, d) => s + d.total_delivered, 0);
    const replied = funnelData.reduce((s, d) => s + d.total_replied, 0);
    return { sent, delivered, replied };
  }, [funnelData]);

  // Period-aware helpers for rankings and grid
  const getPeriodSends = useCallback((t: TemplateAnalyticsData) => {
    switch (dateRange) {
      case '24h': return t.sends_last_7d; // approximate — 24h not available in analytics view
      case 'week': return t.sends_last_7d;
      case 'month': return t.sends_last_30d;
      default: return t.total_sends;
    }
  }, [dateRange]);

  const getPeriodReplyRate = useCallback((t: TemplateAnalyticsData) => {
    switch (dateRange) {
      case '24h': return t.reply_rate_7d_percent ?? t.reply_rate_percent;
      case 'week': return t.reply_rate_7d_percent ?? t.reply_rate_percent;
      case 'month': return t.reply_rate_30d_percent ?? t.reply_rate_percent;
      default: return t.reply_rate_percent;
    }
  }, [dateRange]);

  const minSendsThreshold = dateRange === '24h' ? 1 : dateRange === 'week' ? 3 : dateRange === 'month' ? 10 : 20;

  // Filter analytics by group or template
  const filteredAnalytics = useMemo(() => {
    if (filterMode === 'group' && selectedGroupId) {
      return allAnalytics.filter(a => {
        const info = templateGroupMap.get(a.template_id);
        return info?.group_id === selectedGroupId;
      });
    }
    if (filterMode === 'template' && selectedFilterTemplateId) {
      return allAnalytics.filter(a => a.template_id === selectedFilterTemplateId);
    }
    return allAnalytics;
  }, [allAnalytics, filterMode, selectedGroupId, selectedFilterTemplateId, templateGroupMap]);

  // KPI calculations (from filtered data)
  const kpis = useMemo(() => {
    const relevant = filterMode === 'all' ? gridData :
      filterMode === 'group' && selectedGroupId ? gridData.filter(t => t.group_id === selectedGroupId) :
      filterMode === 'template' && selectedFilterTemplateId ? gridData.filter(t => t.template_id === selectedFilterTemplateId) :
      gridData;

    const totalTemplates = relevant.length;
    const totalSends7d = relevant.reduce((sum, t) => sum + t.sends_7d, 0);
    const withReplies = relevant.filter(t => t.reply_rate_percent != null && t.reply_rate_percent > 0);
    const avgReplyRate = withReplies.length > 0
      ? withReplies.reduce((sum, t) => sum + (t.reply_rate_percent || 0), 0) / withReplies.length
      : 0;
    const topEffectiveness = filteredAnalytics.length > 0 ? (filteredAnalytics[0]?.effectiveness_score || 0) : 0;

    return { totalTemplates, totalSends7d, avgReplyRate, topEffectiveness };
  }, [gridData, filteredAnalytics, filterMode, selectedGroupId, selectedFilterTemplateId]);

  // Top 10 by effectiveness (filtered by group/template + period)
  const top10Effectiveness = useMemo((): RankingItem[] =>
    filteredAnalytics
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
    [filteredAnalytics, getPeriodSends, getPeriodReplyRate, minSendsThreshold]
  );

  // Top 10 by sends (filtered by group/template + period, excluding broadcast group)
  const top10BySends = useMemo((): RankingItem[] => {
    const excluded = ['actualizacion de numero', 'actualización de número'];
    return [...filteredAnalytics]
      .filter(t => {
        const info = templateGroupMap.get(t.template_id);
        return !excluded.includes((info?.group_name || '').toLowerCase()) && getPeriodSends(t) > 0;
      })
      .sort((a, b) => getPeriodSends(b) - getPeriodSends(a))
      .slice(0, 10)
      .map(t => ({
        id: t.template_id,
        name: t.template_name,
        primaryValue: getPeriodSends(t),
        primaryLabel: getPeriodSends(t).toLocaleString(),
        secondaryValue: `${(getPeriodReplyRate(t) || 0).toFixed(1)}% resp.`,
        secondaryLabel: templateGroupMap.get(t.template_id)?.group_name || '',
      }));
  }, [filteredAnalytics, templateGroupMap, getPeriodSends, getPeriodReplyRate]);

  // Loading skeleton
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
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
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
        </div>

        {/* Filters */}
        <FilterSelector
          mode={filterMode}
          selectedGroupId={selectedGroupId}
          selectedTemplateId={selectedFilterTemplateId}
          groups={groupsHealth}
          templates={gridData}
          onModeChange={setFilterMode}
          onGroupChange={setSelectedGroupId}
          onTemplateChange={setSelectedFilterTemplateId}
        />
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
              <div className={`p-1.5 rounded-lg bg-gradient-to-br ${kpi.gradient} text-white`}>{kpi.icon}</div>
              <span className="text-xs text-gray-600 dark:text-gray-400">{kpi.label}</span>
            </div>
            <p className="font-bold text-gray-900 dark:text-white text-2xl">
              <AnimatedNumber value={kpi.value} decimals={kpi.decimals || 0} suffix={kpi.suffix || ''} />
            </p>
          </motion.div>
        ))}
      </div>

      {/* Funnel (responds to group filter only) + Timeline (global, responds to date only) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <FunnelChart
          sent={funnelTotals.sent}
          delivered={funnelTotals.delivered}
          replied={funnelTotals.replied}
          isLoading={isFunnelLoading}
        />
        <div className="xl:col-span-2">
          <GlobalTimelineChart data={timelineData} isLoading={isTimelineLoading} dateRange={dateRange} />
        </div>
      </div>

      {/* Top 10 Rankings (respond to group/template + date filters) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RankingList
          title="Top 10 — Más Efectivas"
          icon={<Trophy className="w-5 h-5 text-amber-500" />}
          barColors={['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#818cf8', '#6366f1', '#8b5cf6', '#a855f7', '#c084fc']}
          onSelect={setDetailTemplateId}
          items={top10Effectiveness}
        />
        <RankingList
          title="Top 10 — Más Enviadas"
          icon={<Send className="w-5 h-5 text-blue-500" />}
          barColors={['#3b82f6', '#2563eb', '#1d4ed8', '#60a5fa', '#93c5fd', '#3b82f6', '#2563eb', '#1d4ed8', '#60a5fa', '#93c5fd']}
          onSelect={setDetailTemplateId}
          items={top10BySends}
        />
      </div>

      {/* Data Grid (grouped by template groups, responds to date filter) */}
      <TemplateAnalyticsGrid
        data={gridData}
        dateRange={dateRange}
        onSelectTemplate={setDetailTemplateId}
      />

      {/* Detail Panel */}
      <AnimatePresence>
        {detailTemplateId && (
          <TemplateDetailPanel
            templateId={detailTemplateId}
            onClose={() => setDetailTemplateId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TemplateAnalyticsModule;
