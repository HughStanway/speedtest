import axios from 'axios';
import type { SpeedtestResult, StatusResponse } from './types';

const api = axios.create({
  baseURL: '/api',
});

export const getLatestResult = async (): Promise<SpeedtestResult> => {
  const { data } = await api.get<SpeedtestResult>('/latest');
  return data;
};

export const getHistory = async (limit: number = 10): Promise<SpeedtestResult[]> => {
  const { data } = await api.get<SpeedtestResult[]>(`/history?limit=${limit}`);
  return data;
};

export const getStatus = async (): Promise<StatusResponse> => {
  const { data } = await api.get<StatusResponse>('/status');
  return data;
};

export const runTest = async (): Promise<void> => {
  await api.post('/run');
};

// ── Settings ──

export interface AppSettings {
  schedule_enabled: boolean;
  schedule_mode: 'interval' | 'daily';
  schedule_interval: number; // seconds
  schedule_time: string;     // "HH:mm"
  retention_seconds: number;
}

export const getSettings = async (): Promise<AppSettings> => {
  const { data } = await api.get<AppSettings>('/settings');
  return data;
};

export const updateSettings = async (settings: Partial<AppSettings>): Promise<AppSettings> => {
  const { data } = await api.put<AppSettings>('/settings', settings);
  return data;
};
