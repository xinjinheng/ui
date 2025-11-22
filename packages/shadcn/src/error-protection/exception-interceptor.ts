import { ExceptionLogger } from './exception-logger'
import { ExceptionRegistry } from './exception-registry'
import { ErrorProtectionConfig } from './config'

/**
 * 异常拦截器基类
 * 统一捕获 try-catch 无法拦截的异步异常（如 Promise rejection）
 */
export class ExceptionInterceptor {
  private static instance: ExceptionInterceptor
  private isInitialized = false

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): ExceptionInterceptor {
    if (!ExceptionInterceptor.instance) {
      ExceptionInterceptor.instance = new ExceptionInterceptor()
    }
    return ExceptionInterceptor.instance
  }

  /**
   * 初始化异常拦截器
   */
  public initialize(config: Partial<ErrorProtectionConfig> = {}): void {
    if (this.isInitialized) {
      return
    }

    // 捕获未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
      event.preventDefault()
      this.handleException(event.reason, 'unhandledrejection')
    })

    // 捕获全局错误
    window.addEventListener('error', (event) => {
      event.preventDefault()
      this.handleException(event.error, 'globalerror')
    })

    // 捕获 React 渲染错误
    if (typeof window !== 'undefined' && window.React) {
      const originalErrorBoundary = (window.React as any).ErrorBoundary
      if (originalErrorBoundary) {
        ;(window.React as any).ErrorBoundary = class CustomErrorBoundary extends originalErrorBoundary {
          componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
            super.componentDidCatch(error, errorInfo)
            ExceptionInterceptor.getInstance().handleException(error, 'react-render', errorInfo)
          }
        }
      }
    }

    this.isInitialized = true
  }

  /**
   * 处理异常
   */
  public handleException(
    error: any,
    context: string,
    extraInfo?: any
  ): void {
    // 检查是否有自定义处理程序
    const handler = ExceptionRegistry.getHandler(error.constructor)
    if (handler) {
      try {
        handler(error, context, extraInfo)
        return
      } catch (handlerError) {
        // 如果自定义处理程序失败，使用默认处理
        ExceptionLogger.log(
          new Error(`Custom handler failed: ${handlerError}`),
          'handler-failure',
          { originalError: error, originalContext: context, originalExtraInfo: extraInfo }
        )
      }
    }

    // 默认处理：记录日志
    ExceptionLogger.log(error, context, extraInfo)
  }

  /**
   * 包裹异步函数，自动捕获异常
   */
  public wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: string
  ): (...args: Parameters<T>) => Promise<Awaited<T> | undefined> {
    return async (...args: Parameters<T>): Promise<Awaited<T> | undefined> => {
      try {
        return await fn(...args)
      } catch (error) {
        this.handleException(error, context || 'async-function', { args })
        return undefined
      }
    }
  }

  /**
   * 包裹同步函数，自动捕获异常
   */
  public wrapSync<T extends (...args: any[]) => any>(
    fn: T,
    context?: string
  ): (...args: Parameters<T>) => ReturnType<T> | undefined {
    return (...args: Parameters<T>): ReturnType<T> | undefined => {
      try {
        return fn(...args)
      } catch (error) {
        this.handleException(error, context || 'sync-function', { args })
        return undefined
      }
    }
  }
}
