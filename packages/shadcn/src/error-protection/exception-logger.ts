import { ErrorProtectionConfig } from './config'
import { ExceptionType } from './exception-types'

interface ExceptionContext {
  [key: string]: any
}

interface LogEntry {
  id: string
  timestamp: number
  error: Error
  type: ExceptionType
  context: ExceptionContext
  environment: EnvironmentInfo
}

interface EnvironmentInfo {
  browser: string
  browserVersion: string
  os: string
  osVersion: string
  device: string
  networkType: string | null
  userAgent: string
}

/**
 * ExceptionLogger 工具类
 * 标准化异常日志记录
 */
export class ExceptionLogger {
  private static logEntries: LogEntry[] = []
  private static maxLogEntries = 1000
  private static environmentInfo: EnvironmentInfo | null = null

  /**
   * 初始化环境信息
   */
  private static initializeEnvironmentInfo(): void {
    if (typeof window === 'undefined') {
      this.environmentInfo = {}
      return
    }

    const userAgent = navigator.userAgent
    let browser = 'Unknown'
    let browserVersion = 'Unknown'
    let os = 'Unknown'
    let osVersion = 'Unknown'
    let device = 'Unknown'

    // 检测浏览器
    if (userAgent.includes('Chrome')) {
      browser = 'Chrome'
      browserVersion = userAgent.match(/Chrome\/(\d+\.\d+)/)?.[1] || 'Unknown'
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox'
      browserVersion = userAgent.match(/Firefox\/(\d+\.\d+)/)?.[1] || 'Unknown'
    } else if (userAgent.includes('Safari')) {
      browser = 'Safari'
      browserVersion = userAgent.match(/Version\/(\d+\.\d+)/)?.[1] || 'Unknown'
    } else if (userAgent.includes('Edge')) {
      browser = 'Edge'
      browserVersion = userAgent.match(/Edge\/(\d+\.\d+)/)?.[1] || 'Unknown'
    }

    // 检测操作系统
    if (userAgent.includes('Windows')) {
      os = 'Windows'
      osVersion = userAgent.match(/Windows NT (\d+\.\d+)/)?.[1] || 'Unknown'
    } else if (userAgent.includes('Mac OS X')) {
      os = 'macOS'
      osVersion = userAgent.match(/Mac OS X (\d+_\d+)/)?.[1]?.replace('_', '.') || 'Unknown'
    } else if (userAgent.includes('Linux')) {
      os = 'Linux'
    } else if (userAgent.includes('Android')) {
      os = 'Android'
      osVersion = userAgent.match(/Android (\d+\.\d+)/)?.[1] || 'Unknown'
      device = 'Mobile'
    } else if (userAgent.includes('iOS')) {
      os = 'iOS'
      osVersion = userAgent.match(/OS (\d+_\d+)/)?.[1]?.replace('_', '.') || 'Unknown'
      device = 'Mobile'
    }

    // 检测设备类型
    if (/Mobi|Android|iPhone|iPad|iPod/.test(userAgent)) {
      device = 'Mobile'
    } else if (/Tablet/.test(userAgent)) {
      device = 'Tablet'
    } else {
      device = 'Desktop'
    }

    this.environmentInfo = {
      browser,
      browserVersion,
      os,
      osVersion,
      device,
      networkType: null,
      userAgent
    }

    // 监听网络类型变化
    if (navigator.connection) {
      this.environmentInfo.networkType = navigator.connection.effectiveType
      navigator.connection.addEventListener('change', () => {
        if (this.environmentInfo) {
          this.environmentInfo.networkType = navigator.connection.effectiveType
        }
      })
    }
  }

  /**
   * 获取环境信息
   */
  private static getEnvironmentInfo(): EnvironmentInfo {
    if (!this.environmentInfo) {
      this.initializeEnvironmentInfo()
    }
    return this.environmentInfo || ({} as EnvironmentInfo)
  }

  /**
   * 记录异常
   */
  public static log(error: any, context: string, extraInfo: any = {}): void {
    if (!(error instanceof Error)) {
      error = new Error(String(error))
    }

    const logEntry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      error,
      type: this.determineExceptionType(error),
      context: { ...extraInfo, component: context },
      environment: this.getEnvironmentInfo()
    }

    // 添加到日志列表
    this.logEntries.push(logEntry)
    
    // 限制日志数量
    if (this.logEntries.length > this.maxLogEntries) {
      this.logEntries.shift()
    }

    // 根据配置决定是否输出到控制台
    if (ErrorProtectionConfig.getConfig().logLevel === 'debug') {
      this.consoleLog(logEntry)
    }

    // 发送到错误中心
    this.sendToErrorCenter(logEntry)
  }

  /**
   * 确定异常类型
   */
  private static determineExceptionType(error: Error): ExceptionType {
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
    }

    return ExceptionType.GENERAL_ERROR
  }

  /**
   * 输出到控制台
   */
  private static consoleLog(logEntry: LogEntry): void {
    const { error, type, context, environment } = logEntry
    
    console.groupCollapsed(`[${type}] ${error.message}`)
    console.error('Error:', error)
    console.log('Context:', context)
    console.log('Environment:', environment)
    console.groupEnd()
  }

  /**
   * 发送到错误中心
   */
  private static sendToErrorCenter(logEntry: LogEntry): void {
    // 触发自定义事件，让ErrorCenter组件监听
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('exception-logged', { detail: logEntry })
      window.dispatchEvent(event)
    }
  }

  /**
   * 获取所有日志条目
   */
  public static getLogEntries(): LogEntry[] {
    return [...this.logEntries]
  }

  /**
   * 获取异常统计
   */
  public static getStatistics(): any {
    const today = new Date().setHours(0, 0, 0, 0)
    const todayEntries = this.logEntries.filter(entry => entry.timestamp >= today)
    
    const typeCounts: Record<ExceptionType, number> = {} as Record<ExceptionType, number>
    Object.values(ExceptionType).forEach(type => {
      typeCounts[type] = todayEntries.filter(entry => entry.type === type).length
    })

    // 计算Top3异常类型
    const topTypes = Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type)

    // 计算API成功率（假设所有网络请求都有记录）
    const networkEntries = this.logEntries.filter(entry => entry.type === ExceptionType.NETWORK_ERROR)
    const totalRequests = networkEntries.length + todayEntries.filter(entry => entry.context.component === 'safe-fetch' && !entry.error).length
    const successRate = totalRequests > 0 ? ((totalRequests - networkEntries.length) / totalRequests) * 100 : 100

    return {
      totalExceptions: todayEntries.length,
      typeCounts,
      topTypes,
      successRate: successRate.toFixed(2)
    }
  }

  /**
   * 清除所有日志
   */
  public static clearLogs(): void {
    this.logEntries = []
  }
}
