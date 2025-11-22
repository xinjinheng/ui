import { ErrorProtectionConfig } from './config'
import { ExceptionLogger } from './exception-logger'
import { ExceptionType } from './exception-types'

interface MemoryGuardOptions {
  // 内存监控阈值（MB）
  memoryThreshold: number
  // 检查间隔（毫秒）
  checkInterval: number
  // 最大DOM节点数量
  maxDomNodes: number
  // 是否启用虚拟滚动建议
  enableVirtualScrollSuggestion: boolean
  // 虚拟滚动建议阈值
  virtualScrollThreshold: number
}

interface MemoryInfo {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  usedMB: number
  totalMB: number
  limitMB: number
  usagePercent: number
}

interface DomInfo {
  totalNodes: number
  elementNodes: number
  textNodes: number
  otherNodes: number
}

/**
 * MemoryGuard 工具类
 * 用于监控内存占用和DOM节点数量
 */
export class MemoryGuard {
  private static instance: MemoryGuard | null = null
  private options: MemoryGuardOptions
  private checkIntervalId: number | null = null
  private isMonitoring: boolean = false

  private constructor() {
    this.options = {
      memoryThreshold: ErrorProtectionConfig.getMemoryThreshold(),
      checkInterval: 5000,
      maxDomNodes: 10000,
      enableVirtualScrollSuggestion: true,
      virtualScrollThreshold: ErrorProtectionConfig.getMaxTaskCount()
    }
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): MemoryGuard {
    if (!MemoryGuard.instance) {
      MemoryGuard.instance = new MemoryGuard()
    }
    return MemoryGuard.instance
  }

  /**
   * 启动监控
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      return
    }

    this.isMonitoring = true
    this.checkIntervalId = window.setInterval(() => {
      this.checkMemoryUsage()
      this.checkDomNodes()
    }, this.options.checkInterval)
  }

  /**
   * 停止监控
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return
    }

    this.isMonitoring = false
    if (this.checkIntervalId) {
      window.clearInterval(this.checkIntervalId)
      this.checkIntervalId = null
    }
  }

  /**
   * 检查内存使用情况
   */
  private checkMemoryUsage(): void {
    if (typeof window.performance === 'undefined' || !window.performance.memory) {
      return
    }

    const memory = window.performance.memory
    const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2)
    const totalMB = (memory.totalJSHeapSize / 1024 / 1024).toFixed(2)
    const limitMB = (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)
    const usagePercent = ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2)

    const memoryInfo: MemoryInfo = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedMB: parseFloat(usedMB),
      totalMB: parseFloat(totalMB),
      limitMB: parseFloat(limitMB),
      usagePercent: parseFloat(usagePercent)
    }

    // 触发内存监控事件
    this.dispatchMemoryEvent(memoryInfo)

    // 检查是否超过阈值
    if (memoryInfo.usedMB > this.options.memoryThreshold) {
      this.handleMemoryWarning(memoryInfo)
    }
  }

  /**
   * 检查DOM节点数量
   */
  private checkDomNodes(): void {
    if (typeof document === 'undefined') {
      return
    }

    const totalNodes = document.querySelectorAll('*').length
    const elementNodes = document.querySelectorAll('body *').length
    const textNodes = document.querySelectorAll('body :not(script):not(style)').length
    const otherNodes = totalNodes - elementNodes - textNodes

    const domInfo: DomInfo = {
      totalNodes,
      elementNodes,
      textNodes,
      otherNodes
    }

    // 触发DOM监控事件
    this.dispatchDomEvent(domInfo)

    // 检查是否超过阈值
    if (domInfo.totalNodes > this.options.maxDomNodes) {
      this.handleDomWarning(domInfo)
    }
  }

  /**
   * 处理内存警告
   */
  private handleMemoryWarning(memoryInfo: MemoryInfo): void {
    const error = new Error(`Memory usage exceeds threshold: ${memoryInfo.usedMB}MB / ${this.options.memoryThreshold}MB`)
    ExceptionLogger.log(error, 'memory-guard', memoryInfo)

    // 触发内存警告事件
    const event = new CustomEvent('memory-warning', { detail: memoryInfo })
    window.dispatchEvent(event)
  }

  /**
   * 处理DOM节点警告
   */
  private handleDomWarning(domInfo: DomInfo): void {
    const error = new Error(`DOM node count exceeds threshold: ${domInfo.totalNodes} / ${this.options.maxDomNodes}`)
    ExceptionLogger.log(error, 'memory-guard', domInfo)

    // 触发DOM警告事件
    const event = new CustomEvent('dom-warning', { detail: domInfo })
    window.dispatchEvent(event)
  }

  /**
   * 检查是否需要启用虚拟滚动
   * @param itemCount 列表项数量
   * @returns 是否需要启用虚拟滚动的建议
   */
  public shouldUseVirtualScroll(itemCount: number): boolean {
    if (!this.options.enableVirtualScrollSuggestion) {
      return false
    }

    return itemCount > this.options.virtualScrollThreshold
  }

  /**
   * 获取内存信息
   */
  public getMemoryInfo(): MemoryInfo | null {
    if (typeof window.performance === 'undefined' || !window.performance.memory) {
      return null
    }

    const memory = window.performance.memory
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedMB: parseFloat((memory.usedJSHeapSize / 1024 / 1024).toFixed(2)),
      totalMB: parseFloat((memory.totalJSHeapSize / 1024 / 1024).toFixed(2)),
      limitMB: parseFloat((memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)),
      usagePercent: parseFloat(((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2))
    }
  }

  /**
   * 获取DOM信息
   */
  public getDomInfo(): DomInfo | null {
    if (typeof document === 'undefined') {
      return null
    }

    const totalNodes = document.querySelectorAll('*').length
    const elementNodes = document.querySelectorAll('body *').length
    const textNodes = document.querySelectorAll('body :not(script):not(style)').length
    const otherNodes = totalNodes - elementNodes - textNodes

    return {
      totalNodes,
      elementNodes,
      textNodes,
      otherNodes
    }
  }

  /**
   * 触发内存监控事件
   */
  private dispatchMemoryEvent(memoryInfo: MemoryInfo): void {
    const event = new CustomEvent('memory-monitor', { detail: memoryInfo })
    window.dispatchEvent(event)
  }

  /**
   * 触发DOM监控事件
   */
  private dispatchDomEvent(domInfo: DomInfo): void {
    const event = new CustomEvent('dom-monitor', { detail: domInfo })
    window.dispatchEvent(event)
  }

  /**
   * 设置配置选项
   */
  public setOptions(options: Partial<MemoryGuardOptions>): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * 获取配置选项
   */
  public getOptions(): MemoryGuardOptions {
    return { ...this.options }
  }
}

/**
 * MemoryGuard的便捷函数
 */
export const memoryGuard = MemoryGuard.getInstance()
