import type {
  LoginRequest,
  LoginResponse,
  IncidentSummary,
  Incident,
  DependencyGraph,
  ImpactResult,
  CreateUserRequest,
  CreateUserResponse,
} from '@tracelens/shared';
import { API_ROUTES } from '@tracelens/shared';
import { MOCK_INCIDENTS, MOCK_INCIDENT_DETAIL, MOCK_GRAPH, MOCK_IMPACT, MOCK_USERS, addMockUser } from './mock.js';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

let _token: string | null = null;
let _mock = false;

export function setToken(t: string | null) {
  _token = t;
}

export function enableMock() {
  _mock = true;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), 200));
}

export const api = {
  login: (body: LoginRequest) => {
    if (_mock) return delay<LoginResponse>({ token: 'mock-token', role: 'admin' });
    return request<LoginResponse>(API_ROUTES.login, { method: 'POST', body: JSON.stringify(body) });
  },

  incidents: () => {
    if (_mock) return delay<IncidentSummary[]>(MOCK_INCIDENTS);
    return request<IncidentSummary[]>(API_ROUTES.incidents);
  },

  incident: (id: string) => {
    if (_mock) {
      const inc = MOCK_INCIDENT_DETAIL[id];
      if (!inc) return Promise.reject(new Error('404 Incident not found'));
      return delay<Incident>(inc);
    }
    return request<Incident>(API_ROUTES.incident(id));
  },

  services: () => {
    if (_mock)
      return delay<string[]>([
        'payment-service',
        'order-service',
        'inventory-service',
        'notification-service',
      ]);
    return request<string[]>(API_ROUTES.services);
  },

  graph: () => {
    if (_mock) return delay<DependencyGraph>(MOCK_GRAPH);
    return request<DependencyGraph>(API_ROUTES.graph);
  },

  impact: (nodeId: string) => {
    if (_mock) {
      const result = MOCK_IMPACT[nodeId] ?? { node: nodeId, affected: [] };
      return delay<ImpactResult>(result);
    }
    return request<ImpactResult>(`${API_ROUTES.impact}?node=${encodeURIComponent(nodeId)}`);
  },

  users: () => {
    if (_mock) return delay<CreateUserResponse[]>([...MOCK_USERS]);
    return request<CreateUserResponse[]>(API_ROUTES.users);
  },

  createUser: (body: CreateUserRequest) => {
    if (_mock) {
      const newUser: CreateUserResponse = {
        id: `u${Date.now()}`,
        username: body.username,
        role: body.role,
      };
      addMockUser(newUser);
      return delay<CreateUserResponse>(newUser);
    }
    return request<CreateUserResponse>(API_ROUTES.createUser, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
