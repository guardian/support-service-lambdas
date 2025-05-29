export class HttpError extends Error {
    public status: number;
    public statusText: string;
    public body: unknown;

    constructor(message: string, status: number, statusText: string, body: unknown) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.statusText = statusText;
        this.body = body;
        Error.captureStackTrace(this, HttpError);
    }
}

export type HttpResponse<T> = {
    success: true;
    data: T;
} | {
    success: false;
    error: HttpError;
};

export async function makeHttpRequest<T>(url: string, options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    baseURL?: string;
    headers?: Record<string, string>;
    body?: unknown;
}): Promise<HttpResponse<T>> {
    try {
        const response = await fetch(`${options.baseURL}${url}`, {
            method: options.method,
            headers: options.headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        if (!response.ok) {
            // Handle HTTP error status codes (4xx, 5xx)
            let errorBody;
            try {
                errorBody = await response.json();
            } catch {
                // If response body isn't JSON, get it as text
                try {
                    errorBody = await response.text();
                } catch { /* empty */ }
            }

            return {
                success: false,
                error: new HttpError(
                    `HTTP ${response.status}: ${response.statusText}`,
                    response.status,
                    response.statusText,
                    errorBody
                )
            }
        }

        const data = await response.json() as T;
        return { success: true, data };
    } catch (err) {
        // Handle network errors, parsing errors, etc.
        return {
            success: false,
            error: new HttpError(
                'Network Error',
                0,
                'Network Error',
                err instanceof Error ? err.message : 'Unknown error occurred'
            )
        }
    }
};