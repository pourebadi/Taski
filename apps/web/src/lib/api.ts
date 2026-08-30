import { useAuth } from './auth-store';

const BASE = '/api/v1';

/** خطاها با قرارداد { code, message, requestId } برمی‌گردند و پیامشان فارسی است. */
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuth.getState().accessToken;

  const send = (t: string | null) =>
    fetch(`${BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(options.headers ?? {}),
      },
    });

  let res = await send(token);

  // تمدید خودکار توکن بدون خروج کاربر. (PM-A3)
  if (res.status === 401 && token) {
    const refreshed = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (refreshed.ok) {
      const { accessToken } = await refreshed.json();
      useAuth.getState().setAccessToken(accessToken);
      res = await send(accessToken);
    } else {
      useAuth.getState().clear();
    }
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message ?? 'خطای غیرمنتظره‌ای رخ داد.');
  return body as T;
}
