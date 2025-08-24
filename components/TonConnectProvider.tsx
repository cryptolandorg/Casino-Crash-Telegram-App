"use client"
import { TonConnectUIProvider } from "@tonconnect/ui-react"

export function TonConnectProvider({ children }: { children: React.ReactNode }) {
  return (
    <TonConnectUIProvider manifestUrl="https://3a6f-45-144-52-194.ngrok-free.app/tonconnect-manifest.json">
      {children}
    </TonConnectUIProvider>
  )
} 