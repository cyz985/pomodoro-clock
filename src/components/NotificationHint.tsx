/** 用户拒绝通知权限后的友好提示（PRD F-13 降级说明） */
export default function NotificationHint() {
  return (
    <div className="mx-4 mt-2 rounded-xl bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-800 ring-1 ring-amber-200 sm:mx-auto sm:max-w-md">
      通知权限未开启，计时结束时将无法收到系统通知（提示音不受影响）。如需开启，请点击浏览器地址栏左侧的锁形图标，在网站设置中允许通知。
    </div>
  )
}
