const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function invokeEdgeFunction(
  name: string,
  body: Record<string, unknown>
): Promise<{ data?: unknown; error?: string; status: number }> {
  if (!url || !key) {
    return { error: 'Server configuration error', status: 500 };
  }
  try {
    const res = await fetch(`${url}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        error: typeof data?.error === 'string' ? data.error : 'Request failed',
        status: res.status,
      };
    }
    return { data, status: res.status };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : 'Network error',
      status: 502,
    };
  }
}
