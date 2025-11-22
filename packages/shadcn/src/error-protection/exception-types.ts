/**
 * 异常类型枚举
 * 定义所有需要防护的异常类型
 */
export enum ExceptionType {
  // 空指针异常
  NULL_POINTER = 'NullPointerException',
  
  // 类型错误
  TYPE_ERROR = 'TypeError',
  
  // 范围错误（数组越界等）
  RANGE_ERROR = 'RangeError',
  
  // 语法错误
  SYNTAX_ERROR = 'SyntaxError',
  
  // 引用错误
  REFERENCE_ERROR = 'ReferenceError',
  
  // 网络错误
  NETWORK_ERROR = 'NetworkError',
  
  // 数据错误（JSON解析失败等）
  DATA_ERROR = 'DataError',
  
  // 资源错误（内存不足、DOM溢出等）
  RESOURCE_ERROR = 'ResourceError',
  
  // 通用错误
  GENERAL_ERROR = 'GeneralError'
}

/**
 * 异常严重程度枚举
 */
export enum ExceptionSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}
