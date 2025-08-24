export const balances: Record<number, number> = {}

export interface GameLog {
  telegram_id: number
  bet: number
  crash_point: number
  cashout: number | null
  profit: number
  status: "crashed" | "cashed_out"
  time: number
}

export const gameLogs: GameLog[] = []

export interface WithdrawRequest {
  id: string
  telegram_id: number
  amount: number
  method: string
  status: "pending" | "approved" | "rejected"
  created_at: number
}

export const withdrawRequests: WithdrawRequest[] = [] 