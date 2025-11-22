/**
 * 错误防护配置选项
 */
export interface ErrorProtectionOptions {
  // 防护级别
  protectionLevel: 'none' | 'basic' | 'advanced' | 'strict'
  
  // 日志级别
  logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug'
  
  // 是否启用全局异常拦截
  enableGlobalInterceptor: boolean
  
  // 是否启用React错误边界
  enableErrorBoundary: boolean
  
  // 是否启用SafeFetch
  enableSafeFetch: boolean
  
  // 是否启用SafeAccessor
  enableSafeAccessor: boolean
  
  // 是否启用MemoryGuard
  enableMemoryGuard: boolean
  
  // 是否启用ErrorCenter
  enableErrorCenter: boolean
  
  // 网络请求超时时间（毫秒）
  requestTimeout: number
  
  // 最大重试次数
  maxRetryCount: number
  
  // 首重试间隔（毫秒）
  initialRetryDelay: number
  
  // 最大任务数量（超过则启用虚拟滚动）
  maxTaskCount: number
  
  // DOM操作节流时间（毫秒）
  domThrottleDelay: number
  
  // 内存监控阈值（MB）
  memoryThreshold: number
  
  // 是否在开发环境抛出详细错误
  throwErrorsInDevelopment: boolean
  
  // 是否在生产环境静默处理错误
  silentInProduction: boolean
}

/**
 * ErrorProtectionConfig 工具类
 * 用于配置防护策略
 */
export class ErrorProtectionConfig {
  private static instance: ErrorProtectionConfig | null = null
  private options: ErrorProtectionOptions

  private constructor() {
    // 默认配置
    this.options = {
      protectionLevel: 'advanced',
      logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
      enableGlobalInterceptor: true,
      enableErrorBoundary: true,
      enableSafeFetch: true,
      enableSafeAccessor: true,
      enableMemoryGuard: true,
      enableErrorCenter: true,
      requestTimeout: 10000,
      maxRetryCount: 3,
      initialRetryDelay: 1000,
      maxTaskCount: 500,
      domThrottleDelay: 100,
      memoryThreshold: 500,
      throwErrorsInDevelopment: true,
      silentInProduction: true
    }
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ErrorProtectionConfig {
    if (!ErrorProtectionConfig.instance) {
      ErrorProtectionConfig.instance = new ErrorProtectionConfig()
    }
    return ErrorProtectionConfig.instance
  }

  /**
   * 获取当前配置
   */
  public static getConfig(): ErrorProtectionOptions {
    return ErrorProtectionConfig.getInstance().options
  }

  /**
   * 更新配置
   * @param options 新的配置选项
   */
  public static updateConfig(options: Partial<ErrorProtectionOptions>): void {
    const instance = ErrorProtectionConfig.getInstance()
    instance.options = { ...instance.options, ...options }
  }

  /**
   * 重置配置为默认值
   */
  public static resetConfig(): void {
    ErrorProtectionConfig.instance = null
  }

  /**
   * 获取防护级别
   */
  public static getProtectionLevel(): 'none' | 'basic' | 'advanced' | 'strict' {
    return this.getConfig().protectionLevel
  }

  /**
   * 获取日志级别
   */
  public static getLogLevel(): 'none' | 'error' | 'warn' | 'info' | 'debug' {
    return this.getConfig().logLevel
  }

  /**
   * 是否启用全局异常拦截
   */
  public static isGlobalInterceptorEnabled(): boolean {
    return this.getConfig().enableGlobalInterceptor
  }

  /**
   * 是否启用React错误边界
   */
  public static isErrorBoundaryEnabled(): boolean {
    return this.getConfig().enableErrorBoundary
  }

  /**
   * 是否启用SafeFetch
   */
  public static isSafeFetchEnabled(): boolean {
    return this.getConfig().enableSafeFetch
  }

  /**
   * 是否启用SafeAccessor
   */
  public static isSafeAccessorEnabled(): boolean {
    return this.getConfig().enableSafeAccessor
  }

  /**
   * 是否启用MemoryGuard
   */
  public static isMemoryGuardEnabled(): boolean {
    return this.getConfig().enableMemoryGuard
  }

  /**
   * 是否启用ErrorCenter
   */
  public static isErrorCenterEnabled(): boolean {
    return this.getConfig().enableErrorCenter
  }

  /**
   * 获取网络请求超时时间
   */
  public static getRequestTimeout(): number {
    return this.getConfig().requestTimeout
  }

  /**
   * 获取最大重试次数
   */
  public static getMaxRetryCount(): number {
    return this.getConfig().maxRetryCount
  }

  /**
   * 获取首重试间隔
   */
  public static getInitialRetryDelay(): number {
    return this.getConfig().initialRetryDelay
  }

  /**
   * 获取最大任务数量
   */
  public static getMaxTaskCount(): number {
    return this.getConfig().maxTaskCount
  }

  /**
   * 获取DOM操作节流时间
   */
  public static getDomThrottleDelay(): number {
    return this.getConfig().domThrottleDelay
  }

  /**
   * 获取内存监控阈值
   */
  public static getMemoryThreshold(): number {
    return this.getConfig().memoryThreshold
  }

  /**
   * 是否在开发环境抛出详细错误
   */
  public static shouldThrowErrorsInDevelopment(): boolean {
    return this.getConfig().throwErrorsInDevelopment
  }

  /**
   * 是否在生产环境静默处理错误
   */
  public static shouldBeSilentInProduction(): boolean {
    return this.getConfig().silentInProduction
  }
}
