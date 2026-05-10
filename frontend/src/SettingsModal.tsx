import React, { useEffect, useState } from 'react';
import { X, Settings, Loader2 } from 'lucide-react';
import { getSettings, updateSettings, type AppSettings } from './api';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const INTERVAL_PRESETS = [
  { label: '15 minutes', value: 900 },
  { label: '30 minutes', value: 1800 },
  { label: '1 hour', value: 3600 },
  { label: '2 hours', value: 7200 },
  { label: '4 hours', value: 14400 },
  { label: '6 hours', value: 21600 },
  { label: '12 hours', value: 43200 },
  { label: '24 hours', value: 86400 },
];

const RETENTION_PRESETS = [
  { label: '1 day', value: 86400 },
  { label: '3 days', value: 259200 },
  { label: '7 days', value: 604800 },
  { label: '14 days', value: 1209600 },
  { label: '30 days', value: 2592000 },
  { label: '90 days', value: 7776000 },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Draft state for editing
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<'interval' | 'daily'>('interval');
  const [interval, setInterval] = useState(3600);
  const [time, setTime] = useState('03:00');
  const [retention, setRetention] = useState(604800);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    getSettings()
      .then((s) => {
        setSettings(s);
        setEnabled(s.schedule_enabled);
        setMode(s.schedule_mode);
        setInterval(s.schedule_interval);
        setTime(s.schedule_time);
        setRetention(s.retention_seconds);
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateSettings({
        schedule_enabled: enabled,
        schedule_mode: mode,
        schedule_interval: interval,
        schedule_time: time,
        retention_seconds: retention,
      });
      setSettings(updated);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    settings &&
    (enabled !== settings.schedule_enabled ||
      mode !== settings.schedule_mode ||
      interval !== settings.schedule_interval ||
      time !== settings.schedule_time ||
      retention !== settings.retention_seconds);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 overflow-hidden animate-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-800">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Schedule Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Automatic Testing
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Run speed tests on a schedule
                  </p>
                </div>
                <button
                  onClick={() => setEnabled(!enabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    enabled ? 'bg-teal-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Schedule Mode selection */}
              <div className={enabled ? '' : 'opacity-40 pointer-events-none'}>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Schedule Mode
                </label>
                <div className="flex p-1 bg-slate-100 rounded-lg">
                  <button
                    onClick={() => setMode('interval')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      mode === 'interval'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Interval
                  </button>
                  <button
                    onClick={() => setMode('daily')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      mode === 'daily'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Daily Time
                  </button>
                </div>
              </div>

              {/* Interval Selection */}
              {mode === 'interval' && (
                <div className={enabled ? '' : 'opacity-40 pointer-events-none'}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Test Interval
                  </label>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  >
                    {INTERVAL_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Time Selection */}
              {mode === 'daily' && (
                <div className={enabled ? '' : 'opacity-40 pointer-events-none'}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Time of Day
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    The test will run once a day at this time
                  </p>
                </div>
              )}

              {/* Retention */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Data Retention
                </label>
                <select
                  value={retention}
                  onChange={(e) => setRetention(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                >
                  {RETENTION_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Older results will be automatically deleted
                </p>
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
