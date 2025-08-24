import { checkTonIncoming } from "./checkIncoming"

// Проверяем транзакции каждые 30 секунд
const CHECK_INTERVAL = 30 * 1000

let interval: NodeJS.Timeout | null = null

export function startTonChecking() {
  if (interval) return // Уже запущено

  // Сразу проверяем
  checkTonIncoming()

  // Запускаем интервал
  interval = setInterval(checkTonIncoming, CHECK_INTERVAL)
}

export function stopTonChecking() {
  if (interval) {
    clearInterval(interval)
    interval = null
  }
} 