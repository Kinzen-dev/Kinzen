'use client';

import { toast } from 'sonner';
import { toastUtils } from './toast-utils';

/**
 * Test component to verify toast behavior
 * This can be used to test different toast configurations
 */
export function ToastTest() {
  const testSuccessToast = () => {
    toastUtils.success('Test success toast!', { duration: 3000 });
  };

  const testErrorToast = () => {
    toastUtils.error('Test error toast!', { duration: 5000 });
  };

  const testDirectSuccessToast = () => {
    toast.success('Direct success toast!', { duration: 3000 });
  };

  const testDirectErrorToast = () => {
    toast.error('Direct error toast!', { duration: 5000 });
  };

  return (
    <div className="space-y-2 p-4">
      <h2 className="text-lg font-bold">Toast Test</h2>
      <div className="space-x-2">
        <button onClick={testSuccessToast} className="rounded bg-green-500 px-4 py-2 text-white">
          Test Success (Utils)
        </button>
        <button onClick={testErrorToast} className="rounded bg-red-500 px-4 py-2 text-white">
          Test Error (Utils)
        </button>
        <button
          onClick={testDirectSuccessToast}
          className="rounded bg-green-600 px-4 py-2 text-white"
        >
          Test Success (Direct)
        </button>
        <button onClick={testDirectErrorToast} className="rounded bg-red-600 px-4 py-2 text-white">
          Test Error (Direct)
        </button>
      </div>
    </div>
  );
}
