import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieChartIcon,
  Clock,
  AlertTriangle,
  Flame,
  ShieldAlert,
  MapPin,
  TrendingUp,
  Zap,
  Filter,
  Layers,
  Activity,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { ParsedAlert, ThreatType, ThreatSeverity } from '../types.ts';

interface AnalyticsTabProps {
  alerts: ParsedAlert[];
  onSimulateBurst?: () => Promise<void>;
}

// Color palette matching the tactical radar UI
const SEVERITY_COLORS: Record<ThreatSeverity, string> = {
  CRITICAL: '#ef4444', // Red-500
  HIGH: '#f97316',     // Orange-500
  MEDIUM: '#eab308',   // Yellow-500
  LOW: '#10b981',      // Emerald-500
};

const SEVERITY_NAMES: Record<ThreatSeverity, string> = {
  CRITICAL: 'Критическая',
  HIGH: 'Высокая',
  MEDIUM: 'Средняя',
  LOW: 'Низкая',
};

const THREAT_TYPE_CONFIG: Record<ThreatType, { label: string; color: string }> = {
  MISSILE: { label: 'Ракета', color: '#f43f5e' },
  BALLISTIC: { label: 'Баллистика', color: '#e11d48' },
  DRONE: { label: 'БПЛА / Шахед', color: '#f59e0b' },
  AVIATION: { label: 'Авиация', color: '#8b5cf6' },
  ARTILLERY: { label: 'Артобстрел', color: '#ea580c' },
  AIR_RAID: { label: 'Воздушная тревога', color: '#ef4444' },
  ALL_CLEAR: { label: 'Отбой', color: '#10b981' },
  INFO: { label: 'Сводка', color: '#38bdf8' },
};

// Custom dark radar tooltip
const CustomDarkTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-lg p-2.5 shadow-xl text-xs backdrop-blur-md">
        {label && <p className="font-semibold text-slate-200 mb-1.5">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-slate-300 py-0.5">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: entry.color || entry.fill }}
              />
              <span>{entry.name || 'Значение'}:</span>
            </span>
            <span className="font-mono font-semibold text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ alerts, onSimulateBurst }) => {
  const [timeRange, setTimeRange] = useState<'ALL' | '24H' | '7D'>('ALL');
  const [threatFilter, setThreatFilter] = useState<string>('ALL');

  // Filter alerts by time range
  const filteredAlerts = useMemo(() => {
    const now = Date.now();
    return alerts.filter((alert) => {
      if (timeRange === '24H' && now - alert.timestamp > 24 * 60 * 60 * 1000) {
        return false;
      }
      if (timeRange === '7D' && now - alert.timestamp > 7 * 24 * 60 * 60 * 1000) {
        return false;
      }
      if (threatFilter !== 'ALL' && alert.threatType !== threatFilter) {
        return false;
      }
      return true;
    });
  }, [alerts, timeRange, threatFilter]);

  // 1. Threat Frequency Data (Bar chart & ranking)
  const threatFrequencyData = useMemo(() => {
    const counts: Record<ThreatType, number> = {
      MISSILE: 0,
      BALLISTIC: 0,
      DRONE: 0,
      AVIATION: 0,
      ARTILLERY: 0,
      AIR_RAID: 0,
      ALL_CLEAR: 0,
      INFO: 0,
    };

    filteredAlerts.forEach((alert) => {
      if (counts[alert.threatType] !== undefined) {
        counts[alert.threatType]++;
      }
    });

    return Object.entries(counts)
      .map(([type, count]) => {
        const conf = THREAT_TYPE_CONFIG[type as ThreatType];
        return {
          type: type as ThreatType,
          label: conf?.label || type,
          count,
          fill: conf?.color || '#94a3b8',
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [filteredAlerts]);

  // 2. Alert Severity Distribution (Pie / Donut chart)
  const severityDistributionData = useMemo(() => {
    const counts: Record<ThreatSeverity, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    filteredAlerts.forEach((alert) => {
      if (counts[alert.severity] !== undefined) {
        counts[alert.severity]++;
      }
    });

    const total = filteredAlerts.length || 1;

    return (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as ThreatSeverity[]).map((severity) => ({
      name: SEVERITY_NAMES[severity],
      severity,
      value: counts[severity],
      percentage: Math.round((counts[severity] / total) * 100),
      fill: SEVERITY_COLORS[severity],
    }));
  }, [filteredAlerts]);

  // 3. Peak Activity Times (Hourly 00:00 - 23:00)
  const peakActivityHourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      hourNum: i,
      count: 0,
      critical: 0,
      drones: 0,
      missiles: 0,
    }));

    filteredAlerts.forEach((alert) => {
      const date = new Date(alert.timestamp);
      const h = date.getHours();
      if (h >= 0 && h < 24) {
        hours[h].count++;
        if (alert.severity === 'CRITICAL') hours[h].critical++;
        if (alert.threatType === 'DRONE') hours[h].drones++;
        if (alert.threatType === 'MISSILE' || alert.threatType === 'BALLISTIC') hours[h].missiles++;
      }
    });

    return hours;
  }, [filteredAlerts]);

  // Find peak hour details
  const peakHourStats = useMemo(() => {
    if (filteredAlerts.length === 0) return { hour: '—', count: 0, isNight: false };
    let max = peakActivityHourlyData[0];
    for (const h of peakActivityHourlyData) {
      if (h.count > max.count) max = h;
    }
    const isNight = max.hourNum >= 22 || max.hourNum <= 6;
    return {
      hour: `${max.hour} - ${((max.hourNum + 1) % 24).toString().padStart(2, '0')}:00`,
      count: max.count,
      isNight,
    };
  }, [peakActivityHourlyData, filteredAlerts]);

  // 4. Regional Distribution (Top 6 sectors)
  const topRegionsData = useMemo(() => {
    const regionMap: Record<string, number> = {};

    filteredAlerts.forEach((alert) => {
      if (alert.regions && alert.regions.length > 0) {
        alert.regions.forEach((reg) => {
          const clean = reg.trim();
          if (clean) regionMap[clean] = (regionMap[clean] || 0) + 1;
        });
      }
    });

    return Object.entries(regionMap)
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredAlerts]);

  // Overall KPIs
  const kpiStats = useMemo(() => {
    const total = filteredAlerts.length;
    const critical = filteredAlerts.filter((a) => a.severity === 'CRITICAL').length;
    const spamBlocked = filteredAlerts.filter((a) => a.isPureSpam).length;
    const forwarded = filteredAlerts.filter((a) => a.status === 'FORWARDED').length;

    // Most common threat type
    const topThreat = threatFrequencyData[0]?.count > 0 ? threatFrequencyData[0] : null;

    return {
      total,
      critical,
      criticalPercentage: total > 0 ? Math.round((critical / total) * 100) : 0,
      topThreatLabel: topThreat ? topThreat.label : 'Нет данных',
      topThreatCount: topThreat ? topThreat.count : 0,
      spamBlocked,
      forwarded,
    };
  }, [filteredAlerts, threatFrequencyData]);

  if (alerts.length === 0) {
    return (
      <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-8 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
          <BarChart3 className="w-7 h-7" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-base font-semibold text-slate-100">Нет данных для аналитики</h3>
          <p className="text-xs text-slate-400">
            В базе пока нет перехваченных тревог. Сгенерируйте тестовые сообщения или перейдите в «Песочницу», чтобы наполнить радар данными.
          </p>
        </div>
        {onSimulateBurst && (
          <button
            onClick={onSimulateBurst}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Сгенерировать тестовые тревоги</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls Bar */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Аналитика и статистика угроз</span>
            </h2>
            <span className="text-xs font-mono text-slate-400">
              ({filteredAlerts.length} из {alerts.length} событий)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Визуализация частоты тревог, распределения уровней опасности и пиковых часов активности
          </p>
        </div>

        {/* Time and Category Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time range buttons */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setTimeRange('ALL')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                timeRange === 'ALL'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Все время
            </button>
            <button
              onClick={() => setTimeRange('7D')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                timeRange === '7D'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              7 дней
            </button>
            <button
              onClick={() => setTimeRange('24H')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                timeRange === '24H'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              24 часа
            </button>
          </div>

          {/* Threat Type Filter */}
          <select
            value={threatFilter}
            onChange={(e) => setThreatFilter(e.target.value)}
            className="bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-slate-700 cursor-pointer"
          >
            <option value="ALL">Все типы угроз</option>
            <option value="MISSILE">Ракеты</option>
            <option value="BALLISTIC">Баллистика</option>
            <option value="DRONE">БПЛА / Шахеды</option>
            <option value="AVIATION">Авиация</option>
            <option value="ARTILLERY">Артобстрел</option>
            <option value="AIR_RAID">Воздушная тревога</option>
            <option value="ALL_CLEAR">Отбой</option>
          </select>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Total Alerts */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Всего тревог</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {kpiStats.total}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="text-emerald-400 font-medium">{kpiStats.forwarded}</span>
            <span>отправлено в канал</span>
          </div>
        </div>

        {/* KPI 2: Critical Threats */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Критических</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {kpiStats.critical}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="text-rose-400 font-medium">{kpiStats.criticalPercentage}%</span>
            <span>от общего объема</span>
          </div>
        </div>

        {/* KPI 3: Dominant Threat */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Главная угроза</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-white truncate" title={kpiStats.topThreatLabel}>
            {kpiStats.topThreatLabel}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="text-amber-400 font-medium font-mono">{kpiStats.topThreatCount}</span>
            <span>зафиксированных случаев</span>
          </div>
        </div>

        {/* KPI 4: Peak Activity Window */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Пик активности</span>
            <Clock className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-lg font-bold font-mono text-white truncate">
            {peakHourStats.hour}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className={peakHourStats.isNight ? 'text-rose-400' : 'text-slate-300'}>
              {peakHourStats.isNight ? '🌙 Ночной налет' : '☀️ Дневная сводка'}
            </span>
            <span className="font-mono">({peakHourStats.count} соб.)</span>
          </div>
        </div>
      </div>

      {/* Row 1: Threat Frequency & Severity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Threat Frequency (Bar Chart) - 7 cols */}
        <div className="lg:col-span-7 bg-slate-900/60 rounded-xl border border-slate-800/80 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>Частота угроз по типам</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Количество инцидентов по категориям вооружения и тревог
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={threatFrequencyData}
                margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  fontSize={11}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  allowDecimals={false}
                  tick={{ fill: '#94a3b8' }}
                />
                <Tooltip content={<CustomDarkTooltip />} />
                <Bar dataKey="count" name="Количество" radius={[4, 4, 0, 0]}>
                  {threatFrequencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick legend pill list */}
          <div className="mt-3 pt-3 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {threatFrequencyData.slice(0, 4).map((item) => (
              <div key={item.type} className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.fill }} />
                <span className="truncate">{item.label}:</span>
                <span className="font-mono font-medium text-white ml-auto">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alert Severity Distribution (Donut Chart) - 5 cols */}
        <div className="lg:col-span-5 bg-slate-900/60 rounded-xl border border-slate-800/80 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-rose-400" />
                <span>Распределение по уровню опасности</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Соотношение критических и средних угроз
              </p>
            </div>
          </div>

          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {severityDistributionData.map((entry, index) => (
                    <Cell key={`sev-cell-${index}`} fill={entry.fill} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomDarkTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Central Donut Total */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold font-mono text-white">
                {kpiStats.total}
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                Всего
              </span>
            </div>
          </div>

          {/* Severity Breakdown Legend */}
          <div className="mt-auto space-y-2 pt-2 border-t border-slate-800/60">
            {severityDistributionData.map((sev) => (
              <div
                key={sev.severity}
                className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-950/40 border border-slate-800/40"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: sev.fill }}
                  />
                  <span className="text-slate-300 font-medium">{sev.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-400">{sev.percentage}%</span>
                  <span className="text-white font-semibold">({sev.value})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Peak Activity Times (Hourly Timeline Area Chart) */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-400" />
              <span>Суточная активность и пиковые часы (00:00 — 23:00)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              График распределения времени пусков и объявлений тревог в течение 24 часов
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-1.5 bg-violet-400 rounded-sm" />
              <span>Всего тревог</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-1.5 bg-rose-400 rounded-sm" />
              <span>Критические</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-1.5 bg-amber-400 rounded-sm" />
              <span>Шахеды</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={peakActivityHourlyData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="criticalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="hour"
                stroke="#64748b"
                fontSize={10}
                tick={{ fill: '#94a3b8' }}
                interval={1}
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                allowDecimals={false}
                tick={{ fill: '#94a3b8' }}
              />
              <Tooltip content={<CustomDarkTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                name="Всего тревог"
                stroke="#8b5cf6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#totalGradient)"
              />
              <Area
                type="monotone"
                dataKey="critical"
                name="Критические"
                stroke="#ef4444"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#criticalGradient)"
              />
              <Area
                type="monotone"
                dataKey="drones"
                name="БПЛА / Шахед"
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="none"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Night vs Day Activity Summary */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/40 flex items-center justify-between">
            <span className="text-slate-400">🌙 Ночной интервал (22:00 — 06:00):</span>
            <span className="font-mono font-semibold text-rose-400">
              {peakActivityHourlyData
                .filter((h) => h.hourNum >= 22 || h.hourNum <= 6)
                .reduce((acc, curr) => acc + curr.count, 0)}{' '}
              тревог
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/40 flex items-center justify-between">
            <span className="text-slate-400">☀️ Дневной интервал (07:00 — 21:00):</span>
            <span className="font-mono font-semibold text-emerald-400">
              {peakActivityHourlyData
                .filter((h) => h.hourNum >= 7 && h.hourNum <= 21)
                .reduce((acc, curr) => acc + curr.count, 0)}{' '}
              тревог
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Regional Targeting & Filter Shield Efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Targeted Regions */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-5">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>Топ целевых направлений / областей</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Регионы, чаще всего упоминаемые в траекториях угроз
          </p>

          {topRegionsData.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topRegionsData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 35, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    fontSize={10}
                    allowDecimals={false}
                    tick={{ fill: '#94a3b8' }}
                  />
                  <YAxis
                    dataKey="region"
                    type="category"
                    stroke="#64748b"
                    fontSize={11}
                    tick={{ fill: '#e2e8f0' }}
                  />
                  <Tooltip content={<CustomDarkTooltip />} />
                  <Bar
                    dataKey="count"
                    name="Упоминаний"
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-xs text-slate-500">
              Нет данных по регионам
            </div>
          )}
        </div>

        {/* Spam Filtering & Processing Efficiency */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <span>Эффективность фильтрации спама</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Статистика очистки рекламы, сборов и мусорного контента
            </p>

            <div className="space-y-3">
              {/* Clean Rate Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300">Очищено полезных сводок:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {kpiStats.total - kpiStats.spamBlocked} из {kpiStats.total}
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        kpiStats.total > 0
                          ? Math.round(((kpiStats.total - kpiStats.spamBlocked) / kpiStats.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Blocked Spam Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300">Заблокировано чистого спама / рекламы:</span>
                  <span className="font-mono text-rose-400 font-semibold">
                    {kpiStats.spamBlocked} (
                    {kpiStats.total > 0
                      ? Math.round((kpiStats.spamBlocked / kpiStats.total) * 100)
                      : 0}
                    %)
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-rose-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        kpiStats.total > 0
                          ? Math.round((kpiStats.spamBlocked / kpiStats.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Telegram Auto/Manual Forwarded */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300">Опубликовано в канал Telegram:</span>
                  <span className="font-mono text-sky-400 font-semibold">
                    {kpiStats.forwarded} (
                    {kpiStats.total > 0
                      ? Math.round((kpiStats.forwarded / kpiStats.total) * 100)
                      : 0}
                    %)
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-sky-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        kpiStats.total > 0
                          ? Math.round((kpiStats.forwarded / kpiStats.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Алгоритм очистки активен</span>
            </span>
            <span className="font-mono text-slate-500">
              Аналитика обновляется в реальном времени
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
