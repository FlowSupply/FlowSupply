declare global {
  interface Window {
    __FLOW_SUPPLY_API_BASE_URL__?: string;
  }
}

export const API_BASE_URL =
  window.__FLOW_SUPPLY_API_BASE_URL__?.replace(/\/$/, '') ?? 'http://localhost:5090/api';

export function apiUrl(path: string): string {
  return `${API_BASE_URL}/${path.replace(/^\//, '')}`;
}

