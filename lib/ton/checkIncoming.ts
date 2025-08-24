import { prisma } from "@/lib/prisma"

const TON_API = process.env.TONCENTER_API_KEY!
const WALLET = process.env.TON_WALLET_ADDRESS!

export async function checkTonIncoming() {
  try {
    const res = await fetch(`https://toncenter.com/api/v2/getTransactions?address=${WALLET}&limit=20&api_key=${TON_API}`)
    const json = await res.json()

    if (!json.result) {
      console.error("TON API error:", json)
      return
    }

    for (const tx of json.result) {
      const comment = tx.in_msg.comment
      const amountNano = Number(tx.in_msg.value) || 0
      const from = tx.in_msg.source
      const hash = tx.transaction_id?.hash

      if (!comment || !amountNano || !from || !hash) continue

      const amount = amountNano / 1e9
      const telegramId = parseInt(comment)

      if (!telegramId || isNaN(telegramId)) continue

      // Проверяем на дубликат
      const exists = await prisma.deposit.findUnique({ where: { hash } })
      if (exists) continue

      const user = await prisma.user.findUnique({ where: { telegramId } })
      if (!user) continue

      // Зачисляем средства
      await prisma.$transaction([
        prisma.user.update({
          where: { telegramId },
          data: { balance: { increment: amount } },
        }),
        prisma.deposit.create({
          data: {
            userId: user.id,
            amount,
            hash,
            from,
          },
        }),
      ])

      console.log(`✅ Зачислено ${amount} TON → @${user.username || user.telegramId}`)
    }
  } catch (error) {
    console.error("Error checking TON transactions:", error)
  }
} 