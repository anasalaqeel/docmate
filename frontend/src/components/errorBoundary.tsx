import React, { Component, type ReactNode } from 'react';
import { Card, CardBody, Button, Code } from '@heroui/react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-2xl w-full">
            <CardBody className="text-center p-8">
              <ExclamationTriangleIcon className="w-16 h-16 text-danger mx-auto mb-4" />
              
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Something went wrong
              </h2>
              
              <p className="text-default-600 mb-6">
                We're sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem persists.
              </p>

              <div className="flex gap-3 justify-center mb-6">
                <Button
                  color="primary"
                  onPress={this.handleReset}
                  startContent={<ArrowPathIcon className="w-4 h-4" />}
                >
                  Try Again
                </Button>
                <Button
                  color="default"
                  variant="bordered"
                  onPress={this.handleReload}
                >
                  Reload Page
                </Button>
              </div>

              {this.props.showDetails && this.state.error && (
                <details className="text-left">
                  <summary className="cursor-pointer text-sm text-default-500 mb-2">
                    Show Error Details
                  </summary>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Error:</h4>
                      <Code color="danger" className="block">
                        {this.state.error.message}
                      </Code>
                    </div>
                    
                    {this.state.error.stack && (
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-1">Stack Trace:</h4>
                        <Code color="default" className="block whitespace-pre-wrap text-xs">
                          {this.state.error.stack}
                        </Code>
                      </div>
                    )}
                    
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-1">Component Stack:</h4>
                        <Code color="default" className="block whitespace-pre-wrap text-xs">
                          {this.state.errorInfo.componentStack}
                        </Code>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </CardBody>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Error caught by error handler:', error, errorInfo);
    // You could also send this to an error reporting service
  };
};