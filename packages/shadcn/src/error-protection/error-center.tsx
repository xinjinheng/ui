'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ExceptionLogger } from './exception-logger'
import { ExceptionType, ExceptionSeverity } from './exception-types'
import { ErrorProtectionConfig } from './config'
import { MemoryGuard } from './memory-guard'

interface ErrorCenterProps {
  // 是否自动展开
  autoExpand?: boolean
  // 位置
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  // 最大显示日志数量
  maxLogs?: number
}

interface LogEntry {
  id: string
  timestamp: number
  error: Error
  type: ExceptionType
  context: any
  environment: any
}

interface Statistics {
  totalExceptions: number
  typeCounts: Record<ExceptionType, number>
  topTypes: string[]
  successRate: string
}

/**
 * ErrorCenter 组件
 * 实时展示异常统计和监控信息
 */
export function ErrorCenter({ autoExpand = false, position = 'bottom-right', maxLogs = 20 }: ErrorCenterProps) {
  const [isExpanded, setIsExpanded] = useState(autoExpand)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [statistics, setStatistics] = useState<Statistics>(ExceptionLogger.getStatistics())
  const [memoryInfo, setMemoryInfo] = useState(MemoryGuard.getInstance().getMemoryInfo())
  const [domInfo, setDomInfo] = useState(MemoryGuard.getInstance().getDomInfo())
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'performance'>('overview')
  const logsEndRef = useRef<HTMLDivElement>(null)

  // 监听新的异常日志
  useEffect(() => {
    const handleExceptionLogged = (event: CustomEvent) => {
      const logEntry = event.detail as LogEntry
      setLogs(prevLogs => {
        const newLogs = [logEntry, ...prevLogs].slice(0, maxLogs)
        return newLogs
      })
      setStatistics(ExceptionLogger.getStatistics())
    }

    window.addEventListener('exception-logged', handleExceptionLogged as EventListener)
    return () => window.removeEventListener('exception-logged', handleExceptionLogged as EventListener)
  }, [maxLogs])

  // 监听内存监控事件
  useEffect(() => {
    const handleMemoryMonitor = (event: CustomEvent) => {
      setMemoryInfo(event.detail)
    }

    window.addEventListener('memory-monitor', handleMemoryMonitor as EventListener)
    return () => window.removeEventListener('memory-monitor', handleMemoryMonitor as EventListener)
  }, [])

  // 监听DOM监控事件
  useEffect(() => {
    const handleDomMonitor = (event: CustomEvent) => {
      setDomInfo(event.detail)
    }

    window.addEventListener('dom-monitor', handleDomMonitor as EventListener)
    return () => window.removeEventListener('dom-monitor', handleDomMonitor as EventListener)
  }, [])

  // 自动滚动到底部
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // 获取异常类型的颜色
  const getExceptionTypeColor = (type: ExceptionType): string => {
    switch (type) {
      case ExceptionType.NULL_POINTER:
        return 'bg-yellow-500'
      case ExceptionType.TYPE_ERROR:
        return 'bg-orange-500'
      case ExceptionType.RANGE_ERROR:
        return 'bg-purple-500'
      case ExceptionType.SYNTAX_ERROR:
        return 'bg-pink-500'
      case ExceptionType.REFERENCE_ERROR:
        return 'bg-indigo-500'
      case ExceptionType.NETWORK_ERROR:
        return 'bg-blue-500'
      case ExceptionType.DATA_ERROR:
        return 'bg-green-500'
      case ExceptionType.RESOURCE_ERROR:
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  // 获取异常类型的名称
  const getExceptionTypeName = (type: ExceptionType): string => {
    switch (type) {
      case ExceptionType.NULL_POINTER:
        return '空指针异常'
      case ExceptionType.TYPE_ERROR:
        return '类型错误'
      case ExceptionType.RANGE_ERROR:
        return '范围错误'
      case ExceptionType.SYNTAX_ERROR:
        return '语法错误'
      case ExceptionType.REFERENCE_ERROR:
        return '引用错误'
      case ExceptionType.NETWORK_ERROR:
        return '网络错误'
      case ExceptionType.DATA_ERROR:
        return '数据错误'
      case ExceptionType.RESOURCE_ERROR:
        return '资源错误'
      default:
        return '通用错误'
    }
  }

  // 获取内存使用情况的颜色
  const getMemoryColor = (usagePercent: number): string => {
    if (usagePercent < 50) return 'text-green-600'
    if (usagePercent < 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  // 获取API成功率的颜色
  const getSuccessRateColor = (successRate: string): string => {
    const rate = parseFloat(successRate)
    if (rate >= 95) return 'text-green-600'
    if (rate >= 90) return 'text-yellow-600'
    return 'text-red-600'
  }

  // 格式化时间
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  // 位置样式
  const positionStyles: Record<string, string> = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  }

  return (
    <div className={`fixed z-50 ${positionStyles[position]}`}>
      {/* 缩略面板 */}
      {!isExpanded && (
        <div
          className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-gray-700">Error Center</span>
            </div>
            <div className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded">
              {statistics.totalExceptions}
            </div>
          </div>
        </div>
      )}

      {/* 展开面板 */}
      {isExpanded && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg w-96 max-h-[80vh] overflow-hidden">
          {/* 头部 */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-gray-700">Error Center</span>
            </div>
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={() => setIsExpanded(false)}
            >
              ×
            </button>
          </div>

          {/* 标签页 */}
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-4">
              <button
                className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('overview')}
              >
                概览
              </button>
              <button
                className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'logs' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('logs')}
              >
                日志 ({logs.length})
              </button>
              <button
                className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'performance' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('performance')}
              >
                性能
              </button>
            </div>
          </div>

          {/* 内容 */}
          <div className="p-4 overflow-y-auto max-h-[calc(80vh-140px)]">
            {/* 概览 */}
            {activeTab === 'overview' && (
              <div>
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">今日异常统计</h3>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-red-600">{statistics.totalExceptions}</div>
                    <div className={`text-sm font-medium ${getSuccessRateColor(statistics.successRate)}`}>
                      API成功率: {statistics.successRate}%
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Top 3 异常类型</h3>
                  <div className="space-y-2">
                    {statistics.topTypes.map((type, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${getExceptionTypeColor(type as ExceptionType)}`} />
                          <span className="text-sm text-gray-700">{getExceptionTypeName(type as ExceptionType)}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{statistics.typeCounts[type as ExceptionType]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">异常类型分布</h3>
                  <div className="space-y-1">
                    {Object.entries(statistics.typeCounts)
                      .filter(([, count]) => count > 0)
                      .map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${getExceptionTypeColor(type as ExceptionType)}`} />
                            <span className="text-xs text-gray-700">{getExceptionTypeName(type as ExceptionType)}</span>
                          </div>
                          <span className="text-xs font-medium text-gray-900">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* 日志 */}
            {activeTab === 'logs' && (
              <div>
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">异常日志</h3>
                <div className="space-y-3">
                  {logs.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <span>No exceptions logged</span>
                    </div>
                  ) : (
                    logs.map(log => (
                      <div key={log.id} className="border border-gray-200 rounded-md p-3">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${getExceptionTypeColor(log.type)}`} />
                            <span className="text-sm font-medium text-gray-900">{log.error.message}</span>
                          </div>
                          <span className="text-xs text-gray-500">{formatTime(log.timestamp)}</span>
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          <span className="font-medium">Context:</span> {log.context.component}
                        </div>
                        {log.error.stack && (
                          <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 overflow-x-auto">
                            {log.error.stack.split('\n').slice(1, 3).join('\n')}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            )}

            {/* 性能 */}
            {activeTab === 'performance' && (
              <div>
                {memoryInfo && (
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">内存使用情况</h3>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">已使用:</span>
                        <span className={`text-sm font-medium ${getMemoryColor(memoryInfo.usagePercent)}`}>
                          {memoryInfo.usedMB}MB / {memoryInfo.limitMB}MB
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${getMemoryColor(memoryInfo.usagePercent).replace('text-', 'bg-')}`}
                          style={{ width: `${Math.min(memoryInfo.usagePercent, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        使用率: {memoryInfo.usagePercent}%
                      </div>
                    </div>
                  </div>
                )}

                {domInfo && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">DOM节点统计</h3>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">总节点数:</span>
                        <span className="text-sm font-medium text-gray-900">{domInfo.totalNodes}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">元素节点:</span>
                        <span className="text-sm font-medium text-gray-900">{domInfo.elementNodes}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">文本节点:</span>
                        <span className="text-sm font-medium text-gray-900">{domInfo.textNodes}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * ErrorCenter的便捷组件
 */
export default ErrorCenter
