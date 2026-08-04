const TOKEN_KEY = 'quickdrop_admin_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export interface AdminProfile {
  id: string;
  email: string;
  display_name?: string;
  role: 'super_admin' | 'support' | 'finance' | 'operations';
  is_active?: boolean;
  created_at?: string;
  last_login?: string;
}
