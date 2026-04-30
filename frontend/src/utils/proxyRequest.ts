import httpService from '../services/httpService';

export interface ProxyResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  url?: string;
  error?: string;
}

/**
 * Performs an API test request, automatically using the backend proxy if the URL is external
 */
export async function performApiTest(
  url: string,
  method: string,
  headers: Record<string, string> = {},
  body?: unknown
): Promise<ProxyResponse> {
  const isExternalUrl = url.startsWith('http') && !url.startsWith(window.location.origin);

  if (isExternalUrl) {
    try {
      const response = await httpService.post<ProxyResponse>('/proxy', {
        url,
        method: method.toUpperCase(),
        headers,
        body
      });
      return { ...response, url };
    } catch (error: unknown) {
      let errorMessage = 'Proxy request failed';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      return {
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        data: null,
        url,
        error: errorMessage
      };
    }
  }

  // Internal request
  try {
    const options: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      credentials: 'include',
    };

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()) && body) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const responseText = await response.text();

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      url
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Request failed';
    return {
      status: 0,
      statusText: 'Error',
      headers: {},
      data: null,
      url,
      error: errorMessage
    };
  }
}
