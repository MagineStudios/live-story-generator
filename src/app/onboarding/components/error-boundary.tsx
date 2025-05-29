'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode
    fallback?: React.ReactNode
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <DefaultErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}

export function DefaultErrorFallback({ error }: { error?: Error }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-4 max-w-md">
        {error?.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <Button
        onClick={() => window.location.reload()}
        variant="outline"
      >
        Reload page
      </Button>
    </div>
  )
}

export function StepErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-10 w-10 text-yellow-500 mb-3" />
          <h3 className="text-lg font-medium mb-2">Step Loading Error</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This step couldn't load properly. Please go back and try again.
          </p>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            size="sm"
          >
            Go Back
          </Button>
        </div>
      }
      onError={(error) => console.error('Step error:', error)}
    >
      {children}
    </ErrorBoundary>
  )
}