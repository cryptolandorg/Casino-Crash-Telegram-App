import crypto from "crypto"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

export function parseInitData(initData: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(initData))
}

export function checkHash(initData: string): boolean {
  const parsed = parseInitData(initData)
  const hash = parsed.hash
  delete parsed.hash

  const dataCheckString = Object.entries(parsed)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")

  const secretKey = crypto.createHash("sha256").update(BOT_TOKEN).digest()
  const hmac = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex")

  return hmac === hash
}

export async function verifyTelegramAuth(initData: string) {
  if (!checkHash(initData)) return null

  const parsed = parseInitData(initData)
  const id = parsed.id || ""

  return {
    id,
    username: parsed.username,
    photo_url: parsed.photo_url,
  }
}

export function validateInitData(initData: string, botToken: string): boolean {
  if (!initData || !botToken) {
    return false;
  }
  
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  
  if (!hash) {
    return false;
  }
  
  urlParams.delete('hash');
  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  
  return calculatedHash === hash;
}

export function extractUserData(initData: string) {
  const urlParams = new URLSearchParams(initData);
  const userStr = urlParams.get('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
} 