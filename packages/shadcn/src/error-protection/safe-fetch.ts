import { ExceptionLogger } from './exception-logger'
import { ErrorProtectionConfig } from './config'

interface SafeFetchOptions extends RequestInit {
  // 重试次数，默认3次
  retryCount?: number
  // 首重试间隔，默认1s
  retryDelay?: number
  // 超时时间，默认10s
  timeout?: number
  // 备用数据源
  fallbackData?: any
  // 备用请求URL
  fallbackUrl?: string
  // 冲突解决策略
  conflictResolution?: 'server-wins' | 'client-wins' | 'timestamp'
}

interface SafeFetchResponse<T = any> {
  data: T | undefined
  error: Error | undefined
  status: number | undefined
  headers: Headers | undefined
}

/**
 * SafeFetch 工具类
 * 封装 API 请求，支持智能重试和备用数据源切换
 */
export class SafeFetch {
  private static defaultOptions: SafeFetchOptions = {
    retryCount: 3,
    retryDelay: 1000,
    timeout: 10000,
    conflictResolution: 'timestamp'
  }

  /**
   * 设置默认选项
   */
  public static setDefaultOptions(options: Partial<SafeFetchOptions>): void {
    SafeFetch.defaultOptions = { ...SafeFetch.defaultOptions, ...options }
  }

  /**
   * 发送安全请求
   */
  public static async fetch<T = any>(
    url: string,
    options: SafeFetchOptions = {}
  ): Promise<SafeFetchResponse<T>> {
    const mergedOptions = { ...SafeFetch.defaultOptions, ...options }
    const { retryCount, retryDelay, timeout, fallbackData, fallbackUrl } = mergedOptions

    let attempt = 0
    let lastError: Error | undefined
    let lastStatus: number | undefined
    let lastHeaders: Headers | undefined

    while (attempt <= retryCount) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(url, { ...mergedOptions, signal: controller.signal })
        clearTimeout(timeoutId)

        lastStatus = response.status
        lastHeaders = response.headers

        if (response.ok) {
          const data = await response.json()
          return { data, error: undefined, status: response.status, headers: response.headers }
        } else if (response.status === 409 && mergedOptions.conflictResolution) {
          // 处理冲突
          const resolvedData = await this.handleConflict(url, mergedOptions, response)
          if (resolvedData !== undefined) {
            return { data: resolvedData, error: undefined, status: 200, headers: response.headers }
          }
        }

        lastError = new Error(`HTTP error! status: ${response.status}`)
      } catch (error) {
        lastError = error as Error
        ExceptionLogger.log(error, 'safe-fetch', { url, attempt, options })
      }

      attempt++
      if (attempt <= retryCount) {
        // 阶梯退避策略
        const delay = retryDelay * Math.pow(2, attempt - 1)
        await this.delay(delay)
      }
    }

    // 尝试备用URL
    if (fallbackUrl) {
      try {
        const response = await fetch(fallbackUrl, mergedOptions)
        if (response.ok) {
          const data = await response.json()
          return { data, error: undefined, status: response.status, headers: response.headers }
        }
      } catch (error) {
        ExceptionLogger.log(error, 'safe-fetch-fallback', { url: fallbackUrl, options })
      }
    }

    // 返回备用数据
    if (fallbackData !== undefined) {
      return { data: fallbackData, error: lastError, status: lastStatus, headers: lastHeaders }
    }

    return { data: undefined, error: lastError, status: lastStatus, headers: lastHeaders }
  }

  /**
   * 处理冲突
   */
  private static async handleConflict(
    url: string,
    options: SafeFetchOptions,
    response: Response
  ): Promise<any | undefined> {
    const { conflictResolution } = options
    
    try {
      const serverData = await response.json()
      const clientData = options.body ? JSON.parse(options.body.toString()) : undefined

      switch (conflictResolution) {
        case 'server-wins':
          return serverData
        
        case 'client-wins':
          // 重新发送请求，使用客户端数据
          const clientResponse = await fetch(url, { ...options, body: JSON.stringify(clientData) })
          return clientResponse.ok ? clientResponse.json() : undefined
        
        case 'timestamp':
          // 使用时间戳比较，选择较新的数据
          if (clientData && serverData && clientData.updatedAt && serverData.updatedAt) {
            return new Date(clientData.updatedAt) > new Date(serverData.updatedAt) ? clientData : serverData
          }
          return serverData
        
        default:
          return serverData
      }
    } catch (error) {
      ExceptionLogger.log(error, 'safe-fetch-conflict', { url, options })
      return undefined
    }
  }

  /**
   * 延迟函数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * 安全请求的便捷函数
 */
export async function safeFetch<T = any>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResponse<T>> {
  return SafeFetch.fetch(url, options)
}
