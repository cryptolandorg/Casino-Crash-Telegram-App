import { startTonChecking } from "./server"
 
// Запускаем проверку только на сервере
if (typeof window === "undefined") {
  startTonChecking()
} 