import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { X, Send, Reply, Clock, TrendingUp, AlertTriangle, Zap } from 'lucide-react';
import { whatsappTemplatesService } from '../../../services/whatsappTemplatesService';
import type {
  TemplateAnalyticsData, TemplateHealthData, TemplateSendTimeline,
  TemplateHourlyHeatmap, AnalyticsDateRange, AnalyticsInterval,
} from '../../../types/whatsappTemplates';

// ============================================
// ANIMATED COUNTER
// ============================================
const Counter: React.FC<{ value: number; decimals?: number; suffix?: string }> = ({
  value, decimals = 0, suffix = ''
}) => {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, v => `${v.toFixed(decimals)}${suffix}`);
  useEffect(() => { spring.set(value); }, [value, spring]);
  return <motion.span>{display}</motion.span>;
};

// ============================================
// HOURLY HEATMAP
// ============================================
const HourlyHeatmap: React.FC<{ data: TemplateHourlyHeatmap[] }> = ({ data }) => {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8h to 22h

  const maxSends = useMemo(() => Math.max(...data.map(d => d.total_sends), 1), [data]);

  const getCell = (hour: number, dow: number) => {
    return data.find(d => d.hour_of_day === hour && d.day_of_week === dow);
  };

  const getColor = (sends: number, replyRate: number): string => {
    if (sends === 0) return 'bg-gray-100 dark:bg-gray-700/50';
    const intensity = sends / maxSends;
    // Semáforo: verde (>20%), amarillo (>10%), rojo (<= 10%)
    if (replyRate > 20) {
      return intensity > 0.5 ? 'bg-emerald-500' : 'bg-emerald-300 dark:bg-emerald-700';
    }
    if (replyRate > 10) {
      return intensity > 0.5 ? 'bg-amber-500' : 'bg-amber-300 dark:bg-amber-700';
    }
    return intensity > 0.5 ? 'bg-red-500' : 'bg-red-300 dark:bg-red-700';
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-indigo-500" />
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Mapa de Calor</h4>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[320px]">
          {/* Day headers */}
          <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: '40px repeat(7, 1fr)' }}>
            <div />
            {days.map(d => (
              <div key={d} className="text-center text-xs text-gray-500 dark:text-gray-400 font-medium">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          {hours.map(hour => (
            <div key={hour} className="grid gap-1 mb-1" style={{ gridTemplateColumns: '40px repeat(7, 1fr)' }}>
              <div className="text-xs text-gray-500 dark:text-gray-400 text-right pr-2 leading-6">
                {hour}h
              </div>
              {[0, 1, 2, 3, 4, 5, 6].map(dow => {
                const cell = getCell(hour, dow);
                const sends = cell?.total_sends || 0;
                const rate = cell?.reply_rate || 0;

                return (
                  <motion.div
                    key={dow}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (hour - 8) * 0.02 + dow * 0.01, duration: 0.3 }}
                    className={`h-6 rounded-sm ${getColor(sends, rate)} transition-colors cursor-default group relative`}
                    title={sends > 0 ? `${sends} envíos, ${rate.toFixed(0)}% resp.` : 'Sin envíos'}
                  >
                    {sends > 0 && (
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                        {sends} env · {rate.toFixed(0)}% resp.
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-700/50" />
          <span className="text-xs text-gray-400">Sin datos</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-red-400" />
          <span className="text-xs text-gray-400">&lt;10%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-amber-500" />
          <span className="text-xs text-gray-400">10-20%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span className="text-xs text-gray-400">&gt;20%</span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// DETAIL PANEL
// ============================================
interface Props {
  templateId: string;
  onClose: () => void;
}

const TemplateDetailPanel: React.FC<Props> = ({ templateId, onClose }) => {
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>('month');
  const [analytics, setAnalytics] = useState<TemplateAnalyticsData | null>(null);
  const [health, setHealth] = useState<TemplateHealthData | null>(null);
  const [timeline, setTimeline] = useState<TemplateSendTimeline[]>([]);
  const [heatmap, setHeatmap] = useState<TemplateHourlyHeatmap[]>([]);
  const [bodyText, setBodyText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const getDateRange = useCallback((range: AnalyticsDateRange): { start: string; end: string; interval: AnalyticsInterval } => {
    const end = new Date().toISOString();
    const start = new Date();
    let interval: AnalyticsInterval = 'day';
    switch (range) {
      case 'week': start.setDate(start.getDate() - 7); interval = 'day'; break;
      case 'month': start.setDate(start.getDate() - 30); interval = 'day'; break;
      case 'year': start.setFullYear(start.getFullYear() - 1); interval = 'month'; break;
    }
    return { start: start.toISOString(), end, interval };
  }, []);

  // Load template data
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [analyticsMap, healthMap] = await Promise.all([
          whatsappTemplatesService.getTemplateAnalyticsByIds([templateId]),
          whatsappTemplatesService.getTemplateHealthByIds([templateId]),
        ]);
        setAnalytics(analyticsMap.get(templateId) || null);
        setHealth(healthMap.get(templateId) || null);

        // Get body text
        const templates = await whatsappTemplatesService.getTemplates();
        const tmpl = templates.find(t => t.id === templateId);
        if (tmpl?.components?.[0]) {
          setBodyText((tmpl.components[0] as { text?: string }).text || '');
        }
      } catch (err) {
        console.error('Error loading template detail:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [templateId]);

  // Load timeline + heatmap based on date range
  useEffect(() => {
    const loadTimeline = async () => {
      try {
        const { start, end, interval } = getDateRange(dateRange);
        const [timelineData, heatmapData] = await Promise.all([
          whatsappTemplatesService.getTemplateSendsTimeline(templateId, null, start, end, interval),
          whatsappTemplatesService.getTemplateHourlyHeatmap(templateId, start, end),
        ]);
        setTimeline(timelineData);
        setHeatmap(heatmapData);
      } catch (err) {
        console.error('Error loading timeline:', err);
      }
    };
    loadTimeline();
  }, [templateId, dateRange, getDateRange]);

  const chartData = useMemo(() =>
    timeline.map(d => ({
      ...d,
      date: dateRange === 'year'
        ? new Date(d.period).toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
        : new Date(d.period).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
      reply_rate: Math.min(d.reply_rate, 100),
    })),
    [timeline, dateRange]
  );

  // Error breakdown
  const errorBreakdown = useMemo(() => {
    if (!health?.error_breakdown) return [];
    return Object.entries(health.error_breakdown)
      .map(([code, count]) => ({ code, count: count as number }))
      .sort((a, b) => b.count - a.count);
  }, [health]);

  const totalErrors = useMemo(() => errorBreakdown.reduce((s, e) => s + e.count, 0), [errorBreakdown]);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const rangeOptions: { id: AnalyticsDateRange; label: string }[] = [
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Mes' },
    { id: 'year', label: 'Año' },
  ];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 h-full w-full sm:w-[520px] bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                  {analytics?.template_name || health?.template_name || '...'}
                </h3>
                {health && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className={`w-2 h-2 rounded-full ${
                      health.health_status === 'healthy' ? 'bg-emerald-500' :
                      health.health_status === 'warning' ? 'bg-amber-500' :
                      health.health_status === 'critical' ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {health.health_status} · {health.category}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Date range */}
            <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              {rangeOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setDateRange(opt.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    dateRange === opt.id
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-6 animate-pulse">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="grid grid-cols-3 gap-3">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
            </div>
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Body text preview */}
            {bodyText && (
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {bodyText}
                </p>
              </div>
            )}

            {/* KPI Cards */}
            {analytics && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Envíos', value: analytics.total_sends, icon: <Send className="w-3.5 h-3.5" />, color: 'from-blue-500 to-blue-600' },
                  { label: 'Respuestas', value: analytics.total_replies, icon: <Reply className="w-3.5 h-3.5" />, color: 'from-purple-500 to-purple-600' },
                  { label: 'Tasa Resp.', value: analytics.reply_rate_percent || 0, icon: <TrendingUp className="w-3.5 h-3.5" />, color: 'from-emerald-500 to-emerald-600', suffix: '%', decimals: 1 },
                ].map((kpi, i) => (
                  <motion.div
                    key={kpi.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={`p-1 rounded bg-gradient-to-br ${kpi.color} text-white`}>
                        {kpi.icon}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      <Counter value={kpi.value} decimals={kpi.decimals || 0} suffix={kpi.suffix || ''} />
                    </p>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Additional KPIs */}
            {analytics && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Efectividad</span>
                  </div>
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    <Counter value={analytics.effectiveness_score || 0} decimals={1} />
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Tiempo Resp. (med)</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {analytics.median_reply_time_minutes != null
                      ? `${analytics.median_reply_time_minutes.toFixed(1)} min`
                      : '—'}
                  </p>
                </div>
              </div>
            )}

            {/* Timeline Chart */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Historial de Envíos</h4>
              </div>

              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="detail-gradient-sends" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="detail-gradient-replies" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
                      labelStyle={{ color: '#F9FAFB', fontWeight: 'bold' }}
                      formatter={(value: number, name: string) => [
                        value.toLocaleString(),
                        name === 'total_sends' ? 'Envíos' : name === 'total_replied' ? 'Respuestas' : name
                      ]}
                    />
                    <Area type="monotone" dataKey="total_sends" stroke="#3B82F6" strokeWidth={2} fill="url(#detail-gradient-sends)" animationDuration={1600} />
                    <Area type="monotone" dataKey="total_replied" stroke="#8B5CF6" strokeWidth={2} fill="url(#detail-gradient-replies)" animationDuration={1600} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm rounded-lg bg-gray-50 dark:bg-gray-800">
                  Sin datos para este período
                </div>
              )}

              <div className="flex items-center justify-center gap-6 mt-2">
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

            {/* Heatmap */}
            <HourlyHeatmap data={heatmap} />

            {/* Error Breakdown */}
            {errorBreakdown.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Errores</h4>
                </div>
                <div className="space-y-2">
                  {errorBreakdown.slice(0, 5).map(({ code, count }) => {
                    const pct = totalErrors > 0 ? (count / totalErrors) * 100 : 0;
                    return (
                      <div key={code} className="flex items-center gap-3">
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-14">{code}</span>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                          <motion.div
                            className="h-full rounded-full bg-amber-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.3, duration: 0.6 }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 w-16 text-right tabular-nums">
                          {count} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Best time info */}
            {analytics?.best_send_hour != null && (
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                <p className="text-sm text-indigo-800 dark:text-indigo-300">
                  <span className="font-semibold">Mejor momento:</span> {analytics.best_send_day || ''} a las {analytics.best_send_hour}:00h
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </>
  );
};

export default TemplateDetailPanel;
