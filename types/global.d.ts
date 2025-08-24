// types/global.d.ts
export { }

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string
        initDataUnsafe: any
        sendData: (data: string) => void
        close: () => void
        expand: () => void
        // можешь дополнять по необходимости
      }
    }
  }
}
