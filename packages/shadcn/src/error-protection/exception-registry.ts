import { ExceptionType } from './exception-types'
import { ExceptionLogger } from './exception-logger'

interface ExceptionHandler {
  (error: Error, context: string, extraInfo?: any): void
}

interface ExceptionHandlerEntry {
  handler: ExceptionHandler
  severity: string
}

/**
 * ExceptionRegistry 工具类
 * 用于动态扩展异常处理逻辑
 */
export class ExceptionRegistry {
  private static handlers: Map<Function | ExceptionType, ExceptionHandlerEntry> = new Map()

  /**
   * 注册异常处理程序
   * @param type 异常类型（构造函数或ExceptionType枚举值）
   * @param handler 异常处理函数
   * @param severity 异常严重程度
   */
  public static registerHandler(
    type: Function | ExceptionType,
    handler: ExceptionHandler,
    severity: string = 'medium'
  ): void {
    this.handlers.set(type, { handler, severity })
  }

  /**
   * 移除异常处理程序
   * @param type 异常类型（构造函数或ExceptionType枚举值）
   */
  public static unregisterHandler(type: Function | ExceptionType): void {
    this.handlers.delete(type)
  }

  /**
   * 获取异常处理程序
   * @param type 异常类型（构造函数或ExceptionType枚举值）
   * @returns 异常处理函数，如果没有找到则返回undefined
   */
  public static getHandler(type: Function | ExceptionType): ExceptionHandler | undefined {
    return this.handlers.get(type)?.handler
  }

  /**
   * 获取异常严重程度
   * @param type 异常类型（构造函数或ExceptionType枚举值）
   * @returns 异常严重程度，如果没有找到则返回'medium'
   */
  public static getSeverity(type: Function | ExceptionType): string {
    return this.handlers.get(type)?.severity || 'medium'
  }

  /**
   * 处理异常
   * @param error 异常对象
   * @param context 异常发生的上下文
   * @param extraInfo 额外信息
   */
  public static handleException(error: Error, context: string, extraInfo?: any): void {
    // 首先尝试使用异常构造函数查找处理程序
    let handler = this.getHandler(error.constructor)
    
    // 如果没有找到，尝试使用异常类型枚举值查找
    if (!handler) {
      // 这里需要根据error的类型映射到ExceptionType枚举值
      const exceptionType = this.mapErrorToExceptionType(error)
      handler = this.getHandler(exceptionType)
    }

    // 如果找到处理程序，则执行
    if (handler) {
      try {
        handler(error, context, extraInfo)
      } catch (handlerError) {
        ExceptionLogger.log(
          new Error(`Custom handler failed: ${handlerError}`),
          'handler-failure',
          { originalError: error, originalContext: context, originalExtraInfo: extraInfo }
        )
      }
    }
  }

  /**
   * 将Error对象映射到ExceptionType枚举值
   * @param error Error对象
   * @returns ExceptionType枚举值
   */
  private static mapErrorToExceptionType(error: Error): ExceptionType {
    if (error.name === 'TypeError') {
      if (error.message.includes('null') || error.message.includes('undefined')) {
        return ExceptionType.NULL_POINTER
      } else if (error.message.includes('is not a function')) {
        return ExceptionType.TYPE_ERROR
      }
    } else if (error.name === 'RangeError') {
      return ExceptionType.RANGE_ERROR
    } else if (error.name === 'SyntaxError') {
      return ExceptionType.SYNTAX_ERROR
    } else if (error.name === 'ReferenceError') {
      return ExceptionType.REFERENCE_ERROR
    } else if (error.name === 'AbortError') {
      return ExceptionType.NETWORK_ERROR
    } else if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('timeout')) {
      return ExceptionType.NETWORK_ERROR
    } else if (error.message.includes('JSON')) {
      return ExceptionType.DATA_ERROR
    } else if (error.message.includes('memory') || error.message.includes('DOM')) {
      return ExceptionType.RESOURCE_ERROR
    }

    return ExceptionType.GENERAL_ERROR
  }

  /**
   * 获取所有注册的异常处理程序
   * @returns 所有注册的异常处理程序的映射
   */
  public static getAllHandlers(): Map<Function | ExceptionType, ExceptionHandlerEntry> {
    return new Map(this.handlers)
  }

  /**
   * 清除所有注册的异常处理程序
   */
  public static clearHandlers(): void {
    this.handlers.clear()
  }
}
