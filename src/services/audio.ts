/**
 * 提示音服务：
 * - 主路径播放 public/notification.wav（HTMLAudioElement）
 * - 加载/播放失败时降级为 Web Audio 合成的双音 beep
 * 浏览器自动播放策略要求首次发声必须发生在用户手势内，因此提供 unlockAudio()
 * 在首次点击「开始」时调用。
 */

let audioEl: HTMLAudioElement | null = null
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (audioCtx) return audioCtx
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    audioCtx = new Ctor()
    return audioCtx
  } catch {
    return null
  }
}

/** 在用户手势内调用：预加载音频资源并 resume AudioContext */
export function unlockAudio(): void {
  try {
    if (!audioEl) {
      audioEl = new Audio('/notification.wav')
      audioEl.preload = 'auto'
    }
    audioEl.load()
  } catch {
    // 忽略，播放时还有兜底
  }
  const ctx = getAudioContext()
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume().catch(() => undefined)
  }
}

function playBeepFallback(volume: number): void {
  const ctx = getAudioContext()
  if (!ctx) return
  try {
    // 双音 beep：880Hz → 660Hz，各 0.3s
    ;[880, 660].forEach((freq, i) => {
      const startAt = ctx.currentTime + i * 0.3
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      gain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)) * 0.5, startAt)
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(startAt)
      osc.stop(startAt + 0.3)
    })
  } catch {
    // 音频不可用时静默
  }
}

/** 播放阶段结束提示音；volume 0–1 */
export function playAlert(volume: number): void {
  const v = Math.max(0, Math.min(1, volume))
  try {
    if (!audioEl) audioEl = new Audio('/notification.wav')
    audioEl.volume = v
    audioEl.currentTime = 0
    const p: Promise<void> | undefined = audioEl.play() as Promise<void> | undefined
    if (p) p.catch(() => playBeepFallback(v))
  } catch {
    playBeepFallback(v)
  }
}
