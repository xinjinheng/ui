/**
 * 安全访问器工具类
 * 通过 safeGet(task, 'priority', 'medium') 方式安全访问嵌套字段
 */
export class SafeAccessor {
  /**
   * 安全获取对象属性
   * @param obj 目标对象
   * @param path 属性路径，支持 dot notation (如 'a.b.c')
   * @param defaultValue 默认值
   * @returns 属性值或默认值
   */
  public static get<T = any>(obj: any, path: string, defaultValue?: T): T | undefined {
    if (!obj || typeof obj !== 'object' || typeof path !== 'string') {
      return defaultValue
    }

    const keys = path.split('.')
    let result: any = obj

    for (const key of keys) {
      if (result === null || result === undefined) {
        return defaultValue
      }

      if (Array.isArray(result)) {
        const index = parseInt(key, 10)
        if (isNaN(index) || index < 0 || index >= result.length) {
          return defaultValue
        }
        result = result[index]
      } else if (typeof result === 'object' && key in result) {
        result = result[key]
      } else {
        return defaultValue
      }
    }

    return result as T
  }

  /**
   * 安全设置对象属性
   * @param obj 目标对象
   * @param path 属性路径，支持 dot notation (如 'a.b.c')
   * @param value 要设置的值
   * @returns 是否设置成功
   */
  public static set(obj: any, path: string, value: any): boolean {
    if (!obj || typeof obj !== 'object' || typeof path !== 'string') {
      return false
    }

    const keys = path.split('.')
    let result: any = obj

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      
      if (result === null || result === undefined) {
        return false
      }

      if (Array.isArray(result)) {
        const index = parseInt(key, 10)
        if (isNaN(index) || index < 0) {
          return false
        }
        if (index >= result.length) {
          result[index] = {}
        }
        result = result[index]
      } else if (typeof result === 'object') {
        if (!(key in result)) {
          result[key] = {}
        }
        result = result[key]
      } else {
        return false
      }
    }

    const lastKey = keys[keys.length - 1]
    if (Array.isArray(result)) {
      const index = parseInt(lastKey, 10)
      if (isNaN(index) || index < 0) {
        return false
      }
      result[index] = value
    } else if (typeof result === 'object') {
      result[lastKey] = value
    } else {
      return false
    }

    return true
  }

  /**
   * 安全删除对象属性
   * @param obj 目标对象
   * @param path 属性路径，支持 dot notation (如 'a.b.c')
   * @returns 是否删除成功
   */
  public static delete(obj: any, path: string): boolean {
    if (!obj || typeof obj !== 'object' || typeof path !== 'string') {
      return false
    }

    const keys = path.split('.')
    let result: any = obj

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      
      if (result === null || result === undefined) {
        return false
      }

      if (Array.isArray(result)) {
        const index = parseInt(key, 10)
        if (isNaN(index) || index < 0 || index >= result.length) {
          return false
        }
        result = result[index]
      } else if (typeof result === 'object' && key in result) {
        result = result[key]
      } else {
        return false
      }
    }

    const lastKey = keys[keys.length - 1]
    if (Array.isArray(result)) {
      const index = parseInt(lastKey, 10)
      if (isNaN(index) || index < 0 || index >= result.length) {
        return false
      }
      result.splice(index, 1)
    } else if (typeof result === 'object' && lastKey in result) {
      delete result[lastKey]
    } else {
      return false
    }

    return true
  }

  /**
   * 检查对象是否有指定属性
   * @param obj 目标对象
   * @param path 属性路径，支持 dot notation (如 'a.b.c')
   * @returns 是否存在该属性
   */
  public static has(obj: any, path: string): boolean {
    if (!obj || typeof obj !== 'object' || typeof path !== 'string') {
      return false
    }

    const keys = path.split('.')
    let result: any = obj

    for (const key of keys) {
      if (result === null || result === undefined) {
        return false
      }

      if (Array.isArray(result)) {
        const index = parseInt(key, 10)
        if (isNaN(index) || index < 0 || index >= result.length) {
          return false
        }
        result = result[index]
      } else if (typeof result === 'object' && key in result) {
        result = result[key]
      } else {
        return false
      }
    }

    return true
  }
}

/**
 * 安全获取对象属性的便捷函数
 * @param obj 目标对象
 * @param path 属性路径，支持 dot notation (如 'a.b.c')
 * @param defaultValue 默认值
 * @returns 属性值或默认值
 */
export function safeGet<T = any>(obj: any, path: string, defaultValue?: T): T | undefined {
  return SafeAccessor.get(obj, path, defaultValue)
}

/**
 * 安全设置对象属性的便捷函数
 * @param obj 目标对象
 * @param path 属性路径，支持 dot notation (如 'a.b.c')
 * @param value 要设置的值
 * @returns 是否设置成功
 */
export function safeSet(obj: any, path: string, value: any): boolean {
  return SafeAccessor.set(obj, path, value)
}

/**
 * 安全删除对象属性的便捷函数
 * @param obj 目标对象
 * @param path 属性路径，支持 dot notation (如 'a.b.c')
 * @returns 是否删除成功
 */
export function safeDelete(obj: any, path: string): boolean {
  return SafeAccessor.delete(obj, path)
}

/**
 * 检查对象是否有指定属性的便捷函数
 * @param obj 目标对象
 * @param path 属性路径，支持 dot notation (如 'a.b.c')
 * @returns 是否存在该属性
 */
export function safeHas(obj: any, path: string): boolean {
  return SafeAccessor.has(obj, path)
}
