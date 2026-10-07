import { getApiBaseUrlSetting } from '../../config/env';
import { getSupabaseClient } from '../../auth/supabaseClient';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrlSetting();
  const url = `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  const defaultHeaders: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const authClient = getSupabaseClient();
  if (!authClient) {
    throw new Error('Supabase Auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  const { data: { session }, error: sessionError } = await authClient.auth.getSession();
  if (sessionError) throw new Error(`Could not read the Supabase session: ${sessionError.message}`);
  if (!session?.access_token) throw new Error('Sign in before accessing VERIPROOF data.');
  defaultHeaders.Authorization = `Bearer ${session.access_token}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {}
    throw new Error(`API Request failed [${response.status}]: ${errorDetail}`);
  }

  return response.json();
}
