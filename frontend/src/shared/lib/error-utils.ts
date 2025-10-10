import { AxiosError } from 'axios';
import { ApiError } from '@/shared/types';

/**
 * Extracts a user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  // Handle Axios errors
  if (error instanceof AxiosError) {
    const response = error.response;

    // Check if it's our API error format
    if (response?.data && typeof response.data === 'object') {
      const apiError = response.data as ApiError;

      // Return the API error message if available
      if (apiError.message) {
        return apiError.message;
      }

      // Return the error field if available
      if (apiError.error) {
        return apiError.error;
      }
    }

    // Handle specific HTTP status codes with user-friendly messages
    switch (response?.status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Authentication failed. Please check your credentials.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'A conflict occurred. The resource may already exist.';
      case 422:
        return 'Validation failed. Please check your input.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
        return 'Service temporarily unavailable. Please try again later.';
      case 503:
        return 'Service is currently unavailable. Please try again later.';
      default:
        // Fallback to axios error message
        return error.message || 'An unexpected error occurred.';
    }
  }

  // Handle regular Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Fallback for unknown error types
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Determines if an error is a network error (no response received)
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return !error.response;
  }
  return false;
}

/**
 * Gets a user-friendly title for the error notification
 */
export function getErrorTitle(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Connection Error';
  }

  if (error instanceof AxiosError) {
    const status = error.response?.status;
    switch (status) {
      case 400:
        return 'Invalid Request';
      case 401:
        return 'Authentication Error';
      case 403:
        return 'Access Denied';
      case 404:
        return 'Not Found';
      case 409:
        return 'Conflict';
      case 422:
        return 'Validation Error';
      case 429:
        return 'Rate Limited';
      case 500:
        return 'Server Error';
      case 502:
      case 503:
        return 'Service Unavailable';
      default:
        return 'Error';
    }
  }

  return 'Error';
}
