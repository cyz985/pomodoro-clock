/**
 * 系统通知服务（Notification API 封装，带降级）：
 * - 不支持 / 未授权时一律静默跳过，界面仍有提示音兜底
 * - 通知文案按需求固定为：标题「番茄钟」，正文「时间到了，该休息了！」
 */

export type NotifyPermission = NotificationPermission | 'unsupported'

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getPermission(): NotifyPermission {
  return isNotificationSupported() ? Notification.permission : 'unsupported'
}

/** 请求通知权限（页面加载时调用一次）；返回最终权限状态 */
export async function ensurePermission(): Promise<NotifyPermission> {
  if (!isNotificationSupported()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/** 阶段结束时弹出系统通知；无权限或不支持时静默降级 */
export function notifyPhaseEnd(): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return
  try {
    new Notification('番茄钟', { body: '时间到了，该休息了！' })
  } catch {
    // 某些平台构造 Notification 可能抛错（如需 Service Worker），静默降级
  }
}
