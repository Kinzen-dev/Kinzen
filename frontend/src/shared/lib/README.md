# Shared Library Utilities

This directory contains utility functions and helpers that should be used across the application for consistency and better maintainability.

## Toast Notifications

The `toast-utils.ts` file provides a standardized way to show toast notifications throughout the application.

### Why Use Toast Utils?

- **Consistent Duration**: All toasts have appropriate default durations
- **Standardized API**: Same interface for all toast types
- **Better UX**: Proper auto-dismiss behavior
- **Future-Proof**: Easy to modify toast behavior globally

### Usage

#### Basic Usage

```tsx
import { toastUtils } from '@/shared/lib/toast-utils';

// Success toast (3 seconds)
toastUtils.success('Operation completed successfully!');

// Error toast (5 seconds)
toastUtils.error('Something went wrong!');

// Info toast (4 seconds)
toastUtils.info('Here is some information');

// Warning toast (4 seconds)
toastUtils.warning('Please check your input');
```

#### With Custom Duration

```tsx
// Custom duration for success toast
toastUtils.success('Login successful!', {
  duration: 2000, // 2 seconds
});

// Custom duration for error toast
toastUtils.error('Network error', {
  duration: 8000, // 8 seconds for important errors
});
```

#### With Description

```tsx
// Error toast with description
toastUtils.error('Login Failed', {
  description: 'Invalid email or password. Please try again.',
});

// Success toast with description
toastUtils.success('Profile Updated', {
  description: 'Your profile information has been saved.',
});
```

#### Loading Toasts

```tsx
// Show loading toast (doesn't auto-dismiss)
const loadingToast = toastUtils.loading('Processing your request...');

// Later, dismiss the loading toast
toastUtils.dismiss(loadingToast);

// Or dismiss all toasts
toastUtils.dismissAll();
```

### Default Durations

- **Success**: 3000ms (3 seconds)
- **Error**: 5000ms (5 seconds)
- **Info**: 4000ms (4 seconds)
- **Warning**: 4000ms (4 seconds)
- **Loading**: Infinity (manual dismiss only)

### Migration Guide

If you have existing toast usage, here's how to migrate:

#### Before (Problematic)

```tsx
import { toast } from 'sonner';

// This toast won't auto-dismiss!
toast.success('Login successful!');

// This has inconsistent duration
toast.error('Error occurred', { duration: 3000 });
```

#### After (Fixed)

```tsx
import { toastUtils } from '@/shared/lib/toast-utils';

// This toast will auto-dismiss after 3 seconds
toastUtils.success('Login successful!');

// This has consistent 5-second duration
toastUtils.error('Error occurred');
```

### Best Practices

1. **Always use toastUtils** instead of direct `toast` import
2. **Use appropriate toast types**:
   - `success` for successful operations
   - `error` for errors and failures
   - `info` for informational messages
   - `warning` for warnings and cautions
   - `loading` for async operations
3. **Keep messages concise** but informative
4. **Use descriptions** for complex messages
5. **Consider custom durations** for important messages

### Examples

#### Authentication Flow

```tsx
// Login success
toastUtils.success('Login successful!');

// Login error
toastUtils.error('Login Failed', {
  description: 'Invalid credentials. Please try again.',
});

// Registration success
toastUtils.success('Account created!', {
  description: 'Please check your email to verify your account.',
});

// Logout
toastUtils.success('Logged out successfully!');
```

#### Form Submissions

```tsx
// Form saved
toastUtils.success('Form saved successfully!');

// Form validation error
toastUtils.error('Validation Error', {
  description: 'Please check the highlighted fields.',
});

// Network error
toastUtils.error('Network Error', {
  description: 'Please check your internet connection.',
  duration: 8000,
});
```

#### Async Operations

```tsx
// Show loading
const loadingToast = toastUtils.loading('Uploading file...');

try {
  await uploadFile(file);
  toastUtils.dismiss(loadingToast);
  toastUtils.success('File uploaded successfully!');
} catch (error) {
  toastUtils.dismiss(loadingToast);
  toastUtils.error('Upload Failed', {
    description: 'The file could not be uploaded. Please try again.',
  });
}
```

### Troubleshooting

If toasts don't auto-dismiss:

1. Check if you're using `toastUtils` instead of direct `toast`
2. Verify the Toaster component has `duration={4000}` set
3. Ensure you're not overriding duration with `Infinity`
4. Check browser console for any JavaScript errors

### Configuration

The toast system is configured in `/shared/components/providers.tsx`:

```tsx
<Toaster
  position="top-right"
  richColors
  offset={80}
  duration={4000} // Default duration for all toasts
  closeButton
  expand={false}
  toastOptions={{
    style: {
      marginTop: '20px',
    },
    className: 'toast-notification',
  }}
/>
```
