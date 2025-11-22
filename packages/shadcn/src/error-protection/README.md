# Error Protection System

一个为shadcn/ui设计的全链路异常防护体系，提供统一的异常拦截、智能重试、资源监控和自适应降级机制。

## 特性

### 异常类型覆盖
- **空指针异常**：安全访问嵌套字段，避免因字段缺失导致的崩溃
- **网络异常**：智能重试、超时处理、备用数据源切换
- **数据异常**：JSON解析失败、数组越界、类型转换错误处理
- **资源异常**：内存监控、DOM节点溢出防护

### 防护机制
- **三层级拦截器设计**：底层全局异常拦截、中层API请求防护、上层React组件异常边界
- **智能状态修复**：自动修复空指针、网络恢复后数据同步、本地缓存校验
- **资源管控**：内存监控、虚拟滚动建议、DOM操作节流
- **可观测性**：标准化异常日志、实时ErrorCenter组件、性能基准看板

## 安装

```bash
npm install @shadcn/error-protection
```

## 快速开始

### 1. 配置错误防护

```typescript
import { ErrorProtectionConfig } from '@shadcn/error-protection'

// 全局配置
ErrorProtectionConfig.updateConfig({
  protectionLevel: 'advanced',
  logLevel: 'debug',
  maxTaskCount: 500,
  requestTimeout: 10000
})
```

### 2. 启动内存监控

```typescript
import { MemoryGuard } from '@shadcn/error-protection'

// 启动内存和DOM监控
MemoryGuard.getInstance().startMonitoring()
```

### 3. 注册自定义异常处理程序

```typescript
import { ExceptionRegistry } from '@shadcn/error-protection'

// 注册自定义TypeError处理程序
ExceptionRegistry.registerHandler(TypeError, (error, context, extraInfo) => {
  console.log('Custom TypeError handler:', error, context, extraInfo)
  // 可以在这里添加远程监控逻辑
})
```

### 4. 使用SafeFetch进行API请求

```typescript
import { safeFetch } from '@shadcn/error-protection'

const fetchTasks = async () => {
  const response = await safeFetch<Task[]>('https://api.example.com/tasks', {
    fallbackData: [], // 备用数据源
    retryCount: 3, // 重试次数
    timeout: 5000, // 超时时间
    fallbackUrl: '/api/tasks' // 备用请求URL
  })

  if (response.data) {
    // 处理数据
  } else if (response.error) {
    // 处理错误
  }
}
```

### 5. 使用SafeAccessor安全访问数据

```typescript
import { safeGet, safeSet } from '@shadcn/error-protection'

const task = { id: 1, title: '示例任务' }

// 安全获取嵌套字段，默认值为'medium'
const priority = safeGet(task, 'priority', 'medium')

// 安全设置嵌套字段
const updatedTask = safeSet(task, 'assignee.name', '张三')
```

### 6. 使用ErrorBoundary保护React组件

```typescript
import { withErrorBoundary } from '@shadcn/error-protection'

const TaskList = () => {
  // 组件逻辑
}

// 使用withErrorBoundary包裹组件
const ProtectedTaskList = withErrorBoundary(TaskList, {
  fallbackComponent: ({ error, resetErrorBoundary }) => (
    <div>
      <h2>任务列表加载失败</h2>
      <p>{error.message}</p>
      <button onClick={resetErrorBoundary}>重新加载</button>
    </div>
  )
})
```

### 7. 集成ErrorCenter实时监控

```typescript
import { ErrorCenter } from '@shadcn/error-protection'

const App = () => {
  return (
    <div>
      {/* 应用内容 */}
      <ErrorCenter position="bottom-right" />
    </div>
  )
}
```

## API文档

### ErrorProtectionConfig

全局配置类，用于设置防护策略。

- `protectionLevel`: 防护级别 ('none' | 'basic' | 'advanced' | 'strict')
- `logLevel`: 日志级别 ('none' | 'error' | 'warn' | 'info' | 'debug')
- `requestTimeout`: 网络请求超时时间 (毫秒)
- `maxRetryCount`: 最大重试次数
- `maxTaskCount`: 最大任务数量（超过则建议虚拟滚动）

### SafeFetch

安全请求工具，支持智能重试和备用数据源。

- `url`: 请求URL
- `options`: 请求选项
  - `fallbackData`: 备用数据源
  - `retryCount`: 重试次数
  - `timeout`: 超时时间
  - `fallbackUrl`: 备用请求URL

### SafeAccessor

安全访问工具，用于访问嵌套字段。

- `safeGet(obj, path, defaultValue)`: 安全获取字段值
- `safeSet(obj, path, value)`: 安全设置字段值
- `safeDelete(obj, path)`: 安全删除字段
- `hasProperty(obj, path)`: 检查字段是否存在

### withErrorBoundary

高阶组件，为React组件提供异常边界。

- `Component`: 要保护的组件
- `options`: 配置选项
  - `fallbackComponent`: 备用UI组件
  - `onError`: 错误发生时的回调
  - `resetOnMount`: 是否在组件挂载时重置错误边界

### ExceptionLogger

异常日志工具，用于标准化异常记录。

- `log(error, context, extraInfo)`: 记录异常
- `getLogEntries()`: 获取所有日志条目
- `getStatistics()`: 获取异常统计信息

### MemoryGuard

内存和DOM监控工具。

- `startMonitoring()`: 启动监控
- `stopMonitoring()`: 停止监控
- `shouldUseVirtualScroll(itemCount)`: 检查是否需要启用虚拟滚动
- `getMemoryInfo()`: 获取内存信息
- `getDomInfo()`: 获取DOM信息

### ErrorCenter

实时异常监控组件，展示异常统计和日志。

- `position`: 组件位置 ('bottom-right' | 'bottom-left' | 'top-right' | 'top-left')
- `autoExpand`: 是否自动展开
- `maxLogs`: 最大显示日志数量

## 示例

查看 `usage-example.tsx` 文件，了解如何在实际项目中使用这些工具。

## 兼容性

- React 18+
- TypeScript 4.9+
- shadcn/ui 1.0+

## 许可证

MIT
