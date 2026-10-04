import type { ApiResponse, ApiError } from '@/types';

/**
 * Base fetch wrapper with error handling
 */
async function fetchApi<T>(
    url: string,
    options?: RequestInit
): Promise<ApiResponse<T>> {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            ...options,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.details || 'Request failed');
        }

        return data as ApiResponse<T>;
    } catch (error) {
        throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
}

/**
 * GET request
 */
export async function apiGet<T>(url: string): Promise<ApiResponse<T>> {
    return fetchApi<T>(url, {
        method: 'GET',
    });
}

/**
 * POST request
 */
export async function apiPost<T>(
    url: string,
    data: unknown
): Promise<ApiResponse<T>> {
    return fetchApi<T>(url, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * PATCH request
 */
export async function apiPatch<T>(
    url: string,
    data: unknown
): Promise<ApiResponse<T>> {
    return fetchApi<T>(url, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

/**
 * DELETE request
 */
export async function apiDelete<T>(url: string): Promise<ApiResponse<T>> {
    return fetchApi<T>(url, {
        method: 'DELETE',
    });
}

/**
 * DELETE request with body (for routes that expect ID in body)
 */
export async function apiDeleteWithBody<T>(
    url: string,
    data: unknown
): Promise<ApiResponse<T>> {
    return fetchApi<T>(url, {
        method: 'DELETE',
        body: JSON.stringify(data),
    });
}
