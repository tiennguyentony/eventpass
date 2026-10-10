export interface HttpResponse {
  status: number;
}

export interface HttpClient {
  post(url: string, body: string, headers: Record<string, string>): Promise<HttpResponse>;
}

export function fetchHttpClient(timeoutMs: number): HttpClient {
  return {
    async post(url, body, headers) {
      const res = await fetch(url, {
        method: 'POST',
        body,
        headers,
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
      });
      return { status: res.status };
    },
  };
}
