import { create } from "zustand"

interface User {
  id?: string
  telegramId: string
  username: string
  firstName?: string
  avatarUrl?: string
  name?: string
  blocked?: boolean
}

interface StoreState {
  user: User | null
  balance: number
  demoBalance: number
  setUser: (user: User) => void
  setBalance: (balance: number) => void
  setDemoBalance: (demoBalance: number) => void
  adjustBalance: (amount: number) => void
  adjustDemoBalance: (amount: number) => void
}

export const useStore = create<StoreState>((set) => ({
  user: null,
  balance: 0,
  demoBalance: 500,
  setUser: (user) => set({ user }),
  setBalance: (balance) => set({ balance }),
  setDemoBalance: (demoBalance) => set({ demoBalance }),
  adjustBalance: (amount) =>
    set((state) => ({ balance: state.balance + amount })),
  adjustDemoBalance: (amount) =>
    set((state) => ({ demoBalance: state.demoBalance + amount })),
}))
