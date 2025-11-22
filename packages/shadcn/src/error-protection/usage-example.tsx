'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../card'
import { Button } from '../button'
import { Input } from '../input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table'
import { Skeleton } from '../skeleton'
import {
  withErrorBoundary,
  safeFetch,
  safeGet,
  ExceptionRegistry,
  ErrorProtectionConfig,
  MemoryGuard,
  ErrorCenter
} from './index'

// 配置错误防护
ErrorProtectionConfig.updateConfig({
  protectionLevel: 'advanced',
  logLevel: 'debug',
  maxTaskCount: 500,
  requestTimeout: 10000
})

// 注册自定义异常处理程序
ExceptionRegistry.registerHandler(TypeError, (error, context, extraInfo) => {
  console.log('Custom TypeError handler:', error, context, extraInfo)
  // 这里可以添加自定义处理逻辑，比如发送到远程监控系统
})

// 启动内存监控
MemoryGuard.getInstance().startMonitoring()

// 模拟任务数据类型
interface Task {
  id: number
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high'
  status: 'todo' | 'in-progress' | 'done'
  assignee?: string
  dueDate?: string
}

// 任务列表组件
const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTasks()
  }, [])

  // 使用safeFetch获取任务数据
  const fetchTasks = async () => {
    try {
      setLoading(true)
      setError(null)

      // 使用safeFetch获取数据，设置备用数据源
      const response = await safeFetch<Task[]>('https://api.example.com/tasks', {
        fallbackData: [
          { id: 1, title: '示例任务 1', priority: 'medium', status: 'in-progress' },
          { id: 2, title: '示例任务 2', priority: 'high', status: 'todo' },
          { id: 3, title: '示例任务 3', priority: 'low', status: 'done' }
        ],
        retryCount: 3,
        timeout: 5000
      })

      if (response.data) {
        setTasks(response.data)
        
        // 检查是否需要启用虚拟滚动
        if (MemoryGuard.getInstance().shouldUseVirtualScroll(response.data.length)) {
          console.log('建议启用虚拟滚动以优化性能')
        }
      } else if (response.error) {
        setError(`获取任务失败: ${response.error.message}`)
      }
    } catch (err) {
      setError(`获取任务失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  // 使用safeGet安全访问嵌套字段
  const getTaskPriorityColor = (task: Task) => {
    const priority = safeGet(task, 'priority', 'medium')
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 border border-red-500 rounded bg-red-50">
        <p className="text-red-600">{error}</p>
        <Button variant="outline" className="mt-2" onClick={fetchTasks}>
          重试
        </Button>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>任务标题</TableHead>
            <TableHead>优先级</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>负责人</TableHead>
            <TableHead>截止日期</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell className="font-medium">{task.title}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTaskPriorityColor(task)}`}>
                  {safeGet(task, 'priority', 'medium')}
                </span>
              </TableCell>
              <TableCell>{safeGet(task, 'status', 'todo')}</TableCell>
              <TableCell>{safeGet(task, 'assignee', '未分配')}</TableCell>
              <TableCell>{safeGet(task, 'dueDate', '无')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// 使用withErrorBoundary包裹组件
const ProtectedTaskList = withErrorBoundary(TaskList, {
  fallbackComponent: ({ error, resetErrorBoundary }) => (
    <div className="p-4 border border-red-500 rounded bg-red-50">
      <h3 className="text-red-700 font-bold mb-2">任务列表加载失败</h3>
      <p className="text-red-600 mb-2">{error.message}</p>
      <Button variant="outline" onClick={resetErrorBoundary}>
        重新加载
      </Button>
    </div>
  )
})

// 主应用组件
const ErrorProtectionExample: React.FC = () => {
  const [inputValue, setInputValue] = useState('')

  // 模拟可能抛出异常的函数
  const handleSubmit = () => {
    if (!inputValue) {
      throw new Error('输入不能为空')
    }
    console.log('提交成功:', inputValue)
    setInputValue('')
  }

  // 模拟空指针异常
  const handleNullPointer = () => {
    const obj: any = null
    console.log(obj.property) // 这会抛出空指针异常
  }

  // 模拟网络异常
  const handleNetworkError = async () => {
    const response = await safeFetch('https://api.example.com/nonexistent')
    if (response.error) {
      console.log('网络请求失败:', response.error)
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>错误防护体系示例</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            这个示例展示了如何使用shadcn/ui的错误防护体系来处理各种异常情况。
          </p>

          <div className="space-y-6">
            {/* 任务列表 */}
            <div>
              <h3 className="text-lg font-medium mb-3">任务列表</h3>
              <ProtectedTaskList />
            </div>

            {/* 表单示例 */}
            <div>
              <h3 className="text-lg font-medium mb-3">表单处理</h3>
              <div className="flex space-x-3">
                <Input
                  type="text"
                  placeholder="输入一些内容"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <Button onClick={handleSubmit}>提交</Button>
              </div>
            </div>

            {/* 异常测试按钮 */}
            <div>
              <h3 className="text-lg font-medium mb-3">异常测试</h3>
              <div className="flex space-x-3">
                <Button variant="destructive" onClick={handleNullPointer}>
                  触发空指针异常
                </Button>
                <Button variant="destructive" onClick={handleNetworkError}>
                  触发网络异常
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误中心 */}
      <ErrorCenter autoExpand={false} position="bottom-right" />
    </div>
  )
}

// 使用withErrorBoundary包裹整个应用
const ProtectedErrorProtectionExample = withErrorBoundary(ErrorProtectionExample, {
  fallbackComponent: ({ error, resetErrorBoundary }) => (
    <div className="container mx-auto p-4">
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="text-2xl font-bold text-red-700 mb-4">应用加载失败</h2>
          <p className="text-red-600 mb-6">{error.message}</p>
          <Button size="lg" onClick={resetErrorBoundary}>
            重新加载应用
          </Button>
        </CardContent>
      </Card>
    </div>
  )
})

export default ProtectedErrorProtectionExample
