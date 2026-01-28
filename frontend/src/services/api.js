/**
 * API Client Configuration
 * Base configuration and utilities for API calls
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookies for authentication
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, mergedOptions);
        
        // Handle non-JSON responses
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        
        const data = isJson ? await response.json() : await response.text();

        if (!response.ok) {
            throw new ApiError(
                data.error || data.detail || 'API request failed',
                response.status,
                data
            );
        }

        return data;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        // Network error or other fetch error
        throw new ApiError(
            error.message || 'Network error',
            0,
            null
        );
    }
}

/**
 * HTTP method wrappers
 */
export const api = {
    get: (endpoint, options = {}) => 
        apiRequest(endpoint, { ...options, method: 'GET' }),
    
    post: (endpoint, data, options = {}) => 
        apiRequest(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data),
        }),
    
    put: (endpoint, data, options = {}) => 
        apiRequest(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    
    patch: (endpoint, data, options = {}) => 
        apiRequest(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
    
    delete: (endpoint, options = {}) => 
        apiRequest(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
