import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Activity,
  Clock,
  Play,
  Loader2,
  Globe,
  Server,
  Settings,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { getLatestResult, getHistory, getStatus, runTest } from './api';
import type { SpeedtestResult } from './types';
import { useWebSocket } from './hooks/useWebSocket';
import SettingsModal from './SettingsModal';

/* ──────────────────────────────────── helpers ──────────────────────────────── */

const MAX_SPEED = 1000; // Mbps scale

/** Tick marks along the gauge arc. */
const TICKS = [0, 5, 10, 50, 100, 250, 500, 750, 1000];


/* ────────────────────────────────── SVG Gauge ─────────────────────────────── */

const SpeedGauge: React.FC<{
  speed: number;
  phase: string | null;
  isRunning: boolean;
  onStart: () => void;
}> = ({ speed, phase, isRunning, onStart }) => {
  const cx = 200, cy = 200, r = 160;
  const startAngle = -225; // degrees, math convention (7:30 position)
  const totalSweep = 270;

  // Arc path helper — angles in degrees, math convention
  function arcPath(radius: number, start: number, sweep: number): string {
    const s = (start * Math.PI) / 180;
    const e = ((start + sweep) * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(s);
    const y1 = cy + radius * Math.sin(s);
    const x2 = cx + radius * Math.cos(e);
    const y2 = cy + radius * Math.sin(e);
    const large = sweep > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  }

  // Calculate arc length for stroke-dasharray
  const circumference = 2 * Math.PI * r;
  const arcLength = (totalSweep / 360) * circumference;
  const fraction = Math.min(speed / MAX_SPEED, 1);
  const dashOffset = arcLength - (fraction * arcLength);

  // Tick positions along the arc
  const tickElements = TICKS.map((val) => {
    const frac = val / MAX_SPEED;
    const angle = ((startAngle + frac * totalSweep) * Math.PI) / 180;
    const outerR = r + 8;
    const innerR = r - 8;
    const labelR = r + 28;
    return (
      <g key={val}>
        <line
          x1={cx + innerR * Math.cos(angle)}
          y1={cy + innerR * Math.sin(angle)}
          x2={cx + outerR * Math.cos(angle)}
          y2={cy + outerR * Math.sin(angle)}
          stroke="#94a3b8"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <text
          x={cx + labelR * Math.cos(angle)}
          y={cy + labelR * Math.sin(angle)}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#64748b"
          fontSize="12"
          fontWeight="500"
          fontFamily="Inter, sans-serif"
        >
          {val}
        </text>
      </g>
    );
  });

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 400 320" className="w-full max-w-lg select-none">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0.8" x2="1" y2="0.2">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track (grey background arc) */}
        <path
          d={arcPath(r, startAngle, totalSweep)}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="18"
          strokeLinecap="round"
        />

        {/* Filled Arc using stroke-dasharray for perfect alignment */}
        <path
          d={arcPath(r, startAngle, totalSweep)}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={dashOffset}
          filter="url(#glow)"
          style={{
            transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: fraction > 0.005 ? 1 : 0 // Hide if practically 0 to avoid round cap dot
          }}
        />

        {/* Ticks */}
        {tickElements}

        {/* Centre text */}
        <text
          x={cx}
          y={cy + 50}
          textAnchor="middle"
          fill="#0f172a"
          fontSize="48"
          fontWeight="800"
          fontFamily="Inter, sans-serif"
        >
          {speed.toFixed(1)}
        </text>
        <text
          x={cx}
          y={cy + 74}
          textAnchor="middle"
          fill="#64748b"
          fontSize="14"
          fontWeight="500"
          fontFamily="Inter, sans-serif"
        >
          Mbps
        </text>
      </svg>

      {/* Phase label + button */}
      <div className="flex flex-col items-center gap-3 -mt-4">
        {isRunning && phase && (
          <span
            className="text-sm font-semibold tracking-wide uppercase text-violet-600"
            style={{ animation: 'pulse-glow 1.5s ease-in-out infinite' }}
          >
            {phase}
          </span>
        )}
        <button
          onClick={onStart}
          disabled={isRunning}
          className={`
            flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-sm
            transition-all duration-300 shadow-md cursor-pointer
            ${isRunning
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-teal-500 to-violet-600 text-white hover:shadow-lg hover:scale-105 active:scale-95'
            }
          `}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              Start Test
            </>
          )}
        </button>
      </div>
    </div>
  );
};

/* ──────────────────────────────── Result Card ─────────────────────────────── */

const ResultCard: React.FC<{
  label: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  accentColor: string;
  isLive?: boolean;
}> = ({ label, value, unit, icon, accentColor, isLive }) => (
  <div
    className={`
      bg-white rounded-2xl p-5 shadow-sm border
      transition-all duration-300 hover:shadow-md
      ${isLive ? 'border-violet-300 ring-2 ring-violet-100' : 'border-slate-200'}
    `}
    style={{ animation: 'fade-in-up 0.4s ease-out both' }}
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <div className="p-2 rounded-xl" style={{ backgroundColor: `${accentColor}15` }}>
        {icon}
      </div>
    </div>
    <div className="flex items-baseline gap-1.5">
      <span className="text-3xl font-bold text-slate-800">{value.toFixed(1)}</span>
      <span className="text-sm font-medium text-slate-400">{unit}</span>
      {isLive && (
        <span
          className="ml-auto text-[10px] font-bold text-violet-500"
          style={{ animation: 'pulse-glow 1.5s ease-in-out infinite' }}
        >
          LIVE
        </span>
      )}
    </div>
  </div>
);

/* ──────────────────────────────── Dashboard ───────────────────────────────── */

const Dashboard: React.FC = () => {
  const [latest, setLatest] = useState<SpeedtestResult | null>(null);
  const [history, setHistory] = useState<SpeedtestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const [liveDownload, setLiveDownload] = useState<number | null>(null);
  const [liveUpload, setLiveUpload] = useState<number | null>(null);
  const [livePing, setLivePing] = useState<number | null>(null);
  const [progressStage, setProgressStage] = useState<string | null>(null);

  const { lastMessage } = useWebSocket();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Prepare trend chart data (reverse chronological → chronological)
  const trendData = useMemo(() => {
    return [...history].reverse().map((r) => ({
      time: format(new Date(r.timestamp), 'MMM d HH:mm'),
      Download: parseFloat(r.download_mbps.toFixed(1)),
      Upload: parseFloat(r.upload_mbps.toFixed(1)),
      Ping: parseFloat(r.ping_ms.toFixed(1)),
    }));
  }, [history]);

  const fetchData = useCallback(async () => {
    try {
      const [latestRes, historyRes, statusRes] = await Promise.all([
        getLatestResult().catch((e) => {
          console.warn('Failed to fetch latest result', e);
          return null;
        }),
        getHistory(20).catch((e) => {
          console.warn('Failed to fetch history', e);
          return null;
        }),
        getStatus().catch(() => ({ running: false })),
      ]);

      if (latestRes !== null) setLatest(latestRes);
      if (historyRes !== null) setHistory(historyRes);
      setIsRunning(statusRes.running);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  }, []); // Stable identity

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!lastMessage) return;
    switch (lastMessage.type) {
      case 'testStart':
        setIsRunning(true);
        setProgressStage('Initializing...');
        setLiveDownload(null);
        setLiveUpload(null);
        setLivePing(null);
        break;
      case 'ping':
        setProgressStage('Pinging...');
        setLivePing(lastMessage.ping?.latency || null);
        break;
      case 'download':
        setProgressStage('Downloading...');
        setLiveDownload((lastMessage.download?.bandwidth * 8) / 1_000_000);
        break;
      case 'upload':
        setProgressStage('Uploading...');
        setLiveUpload((lastMessage.upload?.bandwidth * 8) / 1_000_000);
        break;
      case 'result':
        // Test ended, but wait for saveComplete to refresh data
        setIsRunning(false);
        setProgressStage('Saving results...');
        break;
      case 'saveComplete':
        setProgressStage(null);
        fetchData();
        break;
    }
  }, [lastMessage, fetchData]);

  const handleRunTest = async () => {
    if (isRunning) return;
    try {
      await runTest();
      setIsRunning(true);
    } catch {
      alert('Failed to start test');
    }
  };

  // Determine the current gauge speed based on the active phase
  const gaugeSpeed = useMemo(() => {
    if (isRunning) {
      if (progressStage === 'Uploading...' && liveUpload !== null) return liveUpload;
      if (progressStage === 'Downloading...' && liveDownload !== null) return liveDownload;
      if (livePing !== null) return livePing;
      return 0;
    }
    return latest?.download_mbps ?? 0;
  }, [isRunning, progressStage, liveDownload, liveUpload, livePing, latest]);

  if (loading && !latest) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
      </div>
    );
  }

  const downloadVal = isRunning && liveDownload !== null ? liveDownload : (latest?.download_mbps ?? 0);
  const uploadVal = isRunning && liveUpload !== null ? liveUpload : (latest?.upload_mbps ?? 0);
  const pingVal = isRunning && livePing !== null ? livePing : (latest?.ping_ms ?? 0);
  const jitterVal = latest?.jitter_ms ?? 0;


  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <header className="flex items-center justify-center relative">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Internet Speed Test
          </h1>
          <button
            onClick={() => setSettingsOpen(true)}
            className="absolute right-0 p-2 rounded-lg hover:bg-slate-200/60 transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-slate-400" />
          </button>
        </header>

        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

        {/* Result cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ResultCard
            label="Download"
            value={downloadVal}
            unit="Mbps"
            icon={<ArrowDown className="w-5 h-5 text-teal-600" />}
            accentColor="#0d9488"
            isLive={isRunning && liveDownload !== null}
          />
          <ResultCard
            label="Upload"
            value={uploadVal}
            unit="Mbps"
            icon={<ArrowUp className="w-5 h-5 text-violet-600" />}
            accentColor="#7c3aed"
            isLive={isRunning && liveUpload !== null}
          />
          <ResultCard
            label="Ping"
            value={pingVal}
            unit="ms"
            icon={<Activity className="w-5 h-5 text-amber-500" />}
            accentColor="#f59e0b"
            isLive={isRunning && livePing !== null}
          />
          <ResultCard
            label="Jitter"
            value={jitterVal}
            unit="ms"
            icon={<Clock className="w-5 h-5 text-pink-500" />}
            accentColor="#ec4899"
          />
        </div>

        {/* Server info strip */}
        {latest && (
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            {latest.isp && (
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>{latest.isp}</span>
              </div>
            )}
            {latest.server_name && (
              <div className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                <span>{latest.server_name}</span>
              </div>
            )}
            {latest.external_ip && (
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>{latest.external_ip}</span>
              </div>
            )}
          </div>
        )}

        {/* Gauge */}
        <SpeedGauge
          speed={gaugeSpeed}
          phase={progressStage}
          isRunning={isRunning}
          onStart={handleRunTest}
        />

        {/* Trend Charts */}
        {trendData.length >= 2 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-700 mb-4 text-center">
              Trends
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-6">
              {/* Speed chart */}
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 px-2">Speed (Mbps)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.75rem',
                        fontSize: '0.8rem',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                    <Line type="monotone" dataKey="Download" stroke="#0d9488" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Upload" stroke="#7c3aed" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Latency chart */}
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 px-2">Latency (ms)</p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.75rem',
                        fontSize: '0.8rem',
                      }}
                    />
                    <Line type="monotone" dataKey="Ping" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {/* History table */}
        {history.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-700 mb-4 text-center">
              Test History
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Type</th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Timestamp</th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">Download</th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">Upload</th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">Ping</th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 hidden sm:table-cell">Server</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(showAllHistory ? history : history.slice(0, 5)).map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            row.is_scheduled 
                              ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}>
                            {row.is_scheduled ? 'Scheduled' : 'Manual'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {format(new Date(row.timestamp), 'MMM d, HH:mm')}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-teal-600">
                          {row.download_mbps.toFixed(1)} <span className="text-xs font-normal text-slate-400">Mbps</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-violet-600">
                          {row.upload_mbps.toFixed(1)} <span className="text-xs font-normal text-slate-400">Mbps</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-slate-600">
                          {row.ping_ms.toFixed(0)} <span className="text-xs text-slate-400">ms</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400 truncate max-w-48 hidden sm:table-cell">
                          {row.server_name || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {history.length > 5 && (
                <button
                  onClick={() => setShowAllHistory(!showAllHistory)}
                  className="w-full py-3 text-sm font-medium text-violet-600 hover:bg-slate-50 transition-colors border-t border-slate-100 cursor-pointer"
                >
                  {showAllHistory ? 'Show less' : `Show all ${history.length} results`}
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
