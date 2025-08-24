import crypto from "crypto"

export function validateTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData)
  const hash = params.get("hash")
  if (!hash) throw new Error("Missing hash")

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .map(([key, val]) => `${key}=${val}`)
    .sort()
    .join("\n")

  const secretKey = crypto.createHash("sha256").update(botToken).digest()
  const hmac = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex")

  if (hmac !== hash) throw new Error("Invalid initData hash")

  return Object.fromEntries(params)
}
