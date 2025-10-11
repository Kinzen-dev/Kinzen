import { toast } from 'sonner';

/**
 * Toast utility functions for consistent toast behavior across the application
 */

export const toastUtils = {
  /**
   * Show a success toast with consistent duration
   */
  success: (message: string, options?: { duration?: number; description?: string }) => {
    toast.dismiss(); // Dismiss any existing toasts first
    return toast.success(message, {
      duration: options?.duration || 3000,
      description: options?.description,
    });
  },

  /**
   * Show an error toast with consistent duration
   */
  error: (title: string, options?: { duration?: number; description?: string }) => {
    toast.dismiss(); // Dismiss any existing toasts first
    return toast.error(title, {
      duration: options?.duration || 5000,
      description: options?.description,
    });
  },

  /**
   * Show an info toast with consistent duration
   */
  info: (message: string, options?: { duration?: number; description?: string }) => {
    toast.dismiss(); // Dismiss any existing toasts first
    return toast.info(message, {
      duration: options?.duration || 4000,
      description: options?.description,
    });
  },

  /**
   * Show a warning toast with consistent duration
   */
  warning: (message: string, options?: { duration?: number; description?: string }) => {
    toast.dismiss(); // Dismiss any existing toasts first
    return toast.warning(message, {
      duration: options?.duration || 4000,
      description: options?.description,
    });
  },

  /**
   * Show a loading toast (doesn't auto-dismiss)
   */
  loading: (message: string) => {
    return toast.loading(message);
  },

  /**
   * Dismiss a specific toast by ID
   */
  dismiss: (toastId: string | number) => {
    return toast.dismiss(toastId);
  },

  /**
   * Dismiss all toasts
   */
  dismissAll: () => {
    return toast.dismiss();
  },
};

/**
 * Default toast durations (in milliseconds)
 */
export const TOAST_DURATIONS = {
  SUCCESS: 3000,
  ERROR: 5000,
  INFO: 4000,
  WARNING: 4000,
  LOADING: Infinity, // Loading toasts don't auto-dismiss
} as const;
