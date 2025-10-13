'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class WebGLErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for debugging
    console.error('WebGL Error Boundary caught an error:', error, errorInfo);

    // Log specific WebGL context issues
    if (error.message.includes('Context Lost') || error.message.includes('WebGL')) {
      console.error('WebGL context issue detected:', error.message);
    }

    // Log specific React 19 compatibility issues
    if (error.message.includes('ReactCurrentBatchConfig')) {
      console.error('React 19 compatibility issue detected with WebGL components');
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/20 to-muted/10">
          <div className="space-y-4 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">3D Model Error</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                There was an issue loading the 3D car model. This might be due to browser
                compatibility or WebGL support.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={this.handleRetry} variant="outline" size="sm" className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>

              <p className="text-xs text-muted-foreground">
                If the problem persists, try refreshing the page or using a different browser.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WebGLErrorBoundary;
