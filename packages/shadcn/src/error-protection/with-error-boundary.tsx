'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ExceptionLogger } from './exception-logger'
import { ExceptionRegistry } from './exception-registry'

interface WithErrorBoundaryOptions {
  // 备用UI组件
  fallbackComponent?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>
  // 错误发生时的回调
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  // 是否自动重置错误边界
  resetOnMount?: boolean
  // 重置错误边界的延迟时间
  resetDelay?: number
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * 错误边界组件
 */
class ErrorBoundary extends Component<
  React.PropsWithChildren<WithErrorBoundaryOptions>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<WithErrorBoundaryOptions>) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录异常
    ExceptionLogger.log(error, 'react-component', errorInfo)

    // 调用自定义错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // 检查是否有自定义处理程序
    const handler = ExceptionRegistry.getHandler(error.constructor)
    if (handler) {
      try {
        handler(error, 'react-component', errorInfo)
      } catch (handlerError) {
        ExceptionLogger.log(
          new Error(`Custom handler failed: ${handlerError}`),
          'handler-failure',
          { originalError: error, originalContext: 'react-component', originalExtraInfo: errorInfo }
        )
      }
    }
  }

  componentDidMount() {
    if (this.props.resetOnMount) {
      this.resetErrorBoundary()
    }
  }

  resetErrorBoundary = () => {
    const { resetDelay } = this.props
    
    if (resetDelay && resetDelay > 0) {
      setTimeout(() => {
        this.setState({ hasError: false, error: null })
      }, resetDelay)
    } else {
      this.setState({ hasError: false, error: null })
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallbackComponent: FallbackComponent } = this.props
      
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} resetErrorBoundary={this.resetErrorBoundary} />
      }

      // 默认备用UI
      return (
        <div className="p-4 border border-red-500 rounded bg-red-50">
          <h2 className="text-red-700 font-bold mb-2">Something went wrong</h2>
          <p className="text-red-600 mb-2">{this.state.error.message}</p>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={this.resetErrorBoundary}
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * withErrorBoundary 高阶组件
 * 为 React 组件提供异常防护
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
): React.ComponentType<P> {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...options}>
      <Component {...props} />
    </ErrorBoundary>
  )

  // 保留原始组件名称
  WithErrorBoundaryComponent.displayName = `WithErrorBoundary(${Component.displayName || Component.name || 'Component'})`

  return WithErrorBoundaryComponent
}

/**
 * 错误边界的便捷组件
 */
export function ErrorBoundaryComponent(
  props: React.PropsWithChildren<WithErrorBoundaryOptions>
) {
  return <ErrorBoundary {...props}>{props.children}</ErrorBoundary>
}
