import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ExceptionInterceptor } from './exception-interceptor'
import { SafeAccessor, safeGet, safeSet, safeDelete, hasProperty } from './safe-accessor'
import { SafeFetch, safeFetch } from './safe-fetch'
import { ExceptionLogger } from './exception-logger'
import { ExceptionType } from './exception-types'
import { ExceptionRegistry } from './exception-registry'
import { ErrorProtectionConfig } from './config'
import { MemoryGuard } from './memory-guard'

// Mock window.performance.memory
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    memory: {
      usedJSHeapSize: 100 * 1024 * 1024, // 100MB
      totalJSHeapSize: 200 * 1024 * 1024, // 200MB
      jsHeapSizeLimit: 1024 * 1024 * 1024 // 1GB
    }
  }
})

// Mock navigator.connection
Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: {
    effectiveType: '4g',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }
})

describe('Error Protection System', () => {
  beforeEach(() => {
    // 重置所有单例
    vi.clearAllMocks()
    ExceptionLogger.clearLogs()
    ExceptionRegistry.clearHandlers()
    ErrorProtectionConfig.resetConfig()
    MemoryGuard.instance = null
  })

  describe('ExceptionInterceptor', () => {
    it('should initialize as singleton', () => {
      const instance1 = ExceptionInterceptor.getInstance()
      const instance2 = ExceptionInterceptor.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('should register and unregister handlers', () => {
      const interceptor = ExceptionInterceptor.getInstance()
      const handler = vi.fn()
      
      interceptor.registerHandler(ExceptionType.NULL_POINTER, handler)
      expect(interceptor.handlers.size).toBe(1)
      
      interceptor.unregisterHandler(ExceptionType.NULL_POINTER)
      expect(interceptor.handlers.size).toBe(0)
    })

    it('should handle exceptions', () => {
      const interceptor = ExceptionInterceptor.getInstance()
      const handler = vi.fn()
      interceptor.registerHandler(ExceptionType.NULL_POINTER, handler)
      
      const error = new TypeError('Cannot read property of null')
      interceptor.handleException(error, 'test-context', { extra: 'info' })
      
      expect(handler).toHaveBeenCalledWith(error, 'test-context', { extra: 'info' })
    })
  })

  describe('SafeAccessor', () => {
    it('should safely get nested properties', () => {
      const obj = { a: { b: { c: 1 } } }
      
      expect(safeGet(obj, 'a.b.c')).toBe(1)
      expect(safeGet(obj, 'a.b.d', 'default')).toBe('default')
      expect(safeGet(obj, 'x.y.z')).toBeUndefined()
      expect(safeGet(null, 'a.b.c')).toBeUndefined()
    })

    it('should safely set nested properties', () => {
      const obj = { a: { b: { c: 1 } } }
      
      safeSet(obj, 'a.b.d', 2)
      expect(obj.a.b.d).toBe(2)
      
      safeSet(obj, 'x.y.z', 3)
      expect(obj.x.y.z).toBe(3)
      
      expect(safeSet(null, 'a.b.c', 1)).toEqual({ a: { b: { c: 1 } } })
    })

    it('should safely delete nested properties', () => {
      const obj = { a: { b: { c: 1 } } }
      
      safeDelete(obj, 'a.b.c')
      expect(obj.a.b.c).toBeUndefined()
      
      safeDelete(obj, 'x.y.z') // 不会抛出错误
    })

    it('should check if property exists', () => {
      const obj = { a: { b: { c: 1 } } }
      
      expect(hasProperty(obj, 'a.b.c')).toBe(true)
      expect(hasProperty(obj, 'a.b.d')).toBe(false)
      expect(hasProperty(null, 'a')).toBe(false)
    })
  })

  describe('SafeFetch', () => {
    beforeEach(() => {
      global.fetch = vi.fn()
    })

    afterEach(() => {
      delete global.fetch
    })

    it('should handle successful requests', async () => {
      const mockData = { data: 'test' }
      ;(global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockData)
      })

      const response = await safeFetch('https://api.example.com/test')
      expect(response.data).toEqual(mockData)
      expect(response.error).toBeUndefined()
    })

    it('should handle failed requests with fallback data', async () => {
      ;(global.fetch as vi.Mock).mockRejectedValue(new Error('Network error'))

      const fallbackData = { data: 'fallback' }
      const response = await safeFetch('https://api.example.com/test', { fallbackData })
      
      expect(response.data).toEqual(fallbackData)
      expect(response.error).toBeDefined()
    })

    it('should retry failed requests', async () => {
      ;(global.fetch as vi.Mock).mockRejectedValue(new Error('Network error'))

      const response = await safeFetch('https://api.example.com/test', { retryCount: 2 })
      
      expect(global.fetch).toHaveBeenCalledTimes(3) // 初始请求 + 2次重试
      expect(response.error).toBeDefined()
    })
  })

  describe('ExceptionLogger', () => {
    it('should log exceptions', () => {
      const error = new Error('Test error')
      ExceptionLogger.log(error, 'test-context', { extra: 'info' })
      
      const logs = ExceptionLogger.getLogEntries()
      expect(logs.length).toBe(1)
      expect(logs[0].error.message).toBe('Test error')
      expect(logs[0].context.component).toBe('test-context')
    })

    it('should determine exception types correctly', () => {
      const nullError = new TypeError('Cannot read property of null')
      const networkError = new Error('Network request failed')
      const jsonError = new SyntaxError('Unexpected token < in JSON at position 0')
      
      ExceptionLogger.log(nullError, 'test')
      ExceptionLogger.log(networkError, 'test')
      ExceptionLogger.log(jsonError, 'test')
      
      const logs = ExceptionLogger.getLogEntries()
      expect(logs[0].type).toBe(ExceptionType.NULL_POINTER)
      expect(logs[1].type).toBe(ExceptionType.NETWORK_ERROR)
      expect(logs[2].type).toBe(ExceptionType.DATA_ERROR)
    })

    it('should provide exception statistics', () => {
      const error1 = new TypeError('Cannot read property of null')
      const error2 = new TypeError('Cannot read property of undefined')
      const error3 = new Error('Network request failed')
      
      ExceptionLogger.log(error1, 'test')
      ExceptionLogger.log(error2, 'test')
      ExceptionLogger.log(error3, 'test')
      
      const stats = ExceptionLogger.getStatistics()
      expect(stats.totalExceptions).toBe(3)
      expect(stats.typeCounts[ExceptionType.NULL_POINTER]).toBe(2)
      expect(stats.typeCounts[ExceptionType.NETWORK_ERROR]).toBe(1)
      expect(stats.topTypes).toEqual([ExceptionType.NULL_POINTER, ExceptionType.NETWORK_ERROR, ExceptionType.GENERAL_ERROR])
    })
  })

  describe('ExceptionRegistry', () => {
    it('should register and get handlers', () => {
      const handler = vi.fn()
      ExceptionRegistry.registerHandler(TypeError, handler)
      
      expect(ExceptionRegistry.getHandler(TypeError)).toBe(handler)
    })

    it('should handle exceptions with registered handlers', () => {
      const handler = vi.fn()
      ExceptionRegistry.registerHandler(TypeError, handler)
      
      const error = new TypeError('Test error')
      ExceptionRegistry.handleException(error, 'test-context', { extra: 'info' })
      
      expect(handler).toHaveBeenCalledWith(error, 'test-context', { extra: 'info' })
    })
  })

  describe('ErrorProtectionConfig', () => {
    it('should get and update config', () => {
      expect(ErrorProtectionConfig.getConfig().protectionLevel).toBe('advanced')
      expect(ErrorProtectionConfig.getConfig().logLevel).toBe('debug')
      
      ErrorProtectionConfig.updateConfig({
        protectionLevel: 'strict',
        logLevel: 'error'
      })
      
      expect(ErrorProtectionConfig.getConfig().protectionLevel).toBe('strict')
      expect(ErrorProtectionConfig.getConfig().logLevel).toBe('error')
    })

    it('should reset config to default', () => {
      ErrorProtectionConfig.updateConfig({
        protectionLevel: 'strict',
        logLevel: 'error'
      })
      
      ErrorProtectionConfig.resetConfig()
      
      expect(ErrorProtectionConfig.getConfig().protectionLevel).toBe('advanced')
      expect(ErrorProtectionConfig.getConfig().logLevel).toBe('debug')
    })
  })

  describe('MemoryGuard', () => {
    it('should initialize as singleton', () => {
      const instance1 = MemoryGuard.getInstance()
      const instance2 = MemoryGuard.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('should check if virtual scroll is needed', () => {
      const memoryGuard = MemoryGuard.getInstance()
      
      expect(memoryGuard.shouldUseVirtualScroll(400)).toBe(false)
      expect(memoryGuard.shouldUseVirtualScroll(600)).toBe(true)
    })

    it('should get memory info', () => {
      const memoryGuard = MemoryGuard.getInstance()
      const memoryInfo = memoryGuard.getMemoryInfo()
      
      expect(memoryInfo).toBeDefined()
      expect(memoryInfo?.usedMB).toBe(100)
      expect(memoryInfo?.limitMB).toBe(1024)
      expect(memoryInfo?.usagePercent).toBe(9.77)
    })

    it('should get DOM info', () => {
      const memoryGuard = MemoryGuard.getInstance()
      const domInfo = memoryGuard.getDomInfo()
      
      expect(domInfo).toBeDefined()
      expect(typeof domInfo?.totalNodes).toBe('number')
    })
  })
})
