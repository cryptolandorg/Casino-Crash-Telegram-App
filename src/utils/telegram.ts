import crypto from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { config } from "../config.js";
import type { AuthUser } from "../types.js";

export function validateInitData(initData: string, botToken: string): boolean {
  if (!initData || !botToken) return false;

  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  if (!hash) return false;

  urlParams.delete("hash");
  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return calculatedHash === hash;
}

export function extractUserData(
  initData: string
): Record<string, unknown> | null {
  const urlParams = new URLSearchParams(initData);
  const userStr = urlParams.get("user");
  if (!userStr) return null;

  try {
    return JSON.parse(userStr) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function authenticateUser(
  initData: string | undefined,
  prisma: PrismaClient
): Promise<AuthUser> {
  if (!initData && process.env.ALLOW_DEV_AUTH === "true") {
    const user = await prisma.user.upsert({
      where: { telegramId: "dev-test-user" },
      update: {},
      create: {
        telegramId: "dev-test-user",
        username: "dev-test-user",
        balance: 10_000,
      },
    });

    return {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username || `User${user.telegramId}`,
      avatarUrl: user.avatarUrl,
      balance: user.balance,
    };
  }

  if (!initData) {
    throw new Error("Authentication failed: missing initData");
  }

  const botToken = config.BOT_TOKEN;
  const adminBotToken = config.ADMIN_BOT_TOKEN;
  let isValid = false;
  let userData: Record<string, unknown> | null = null;

  if (botToken && validateInitData(initData, botToken)) {
    isValid = true;
    userData = extractUserData(initData);
  } else if (adminBotToken && validateInitData(initData, adminBotToken)) {
    isValid = true;
    userData = extractUserData(initData);
  }

  if (!isValid || !userData || userData.id == null) {
    throw new Error("Authentication failed: invalid initData");
  }

  const user = await prisma.user.upsert({
    where: { telegramId: String(userData.id) },
    update: {
      username:
        typeof userData.username === "string" ? userData.username : undefined,
      avatarUrl:
        typeof userData.photo_url === "string" ? userData.photo_url : undefined,
    },
    create: {
      telegramId: String(userData.id),
      username:
        typeof userData.username === "string" ? userData.username : undefined,
      avatarUrl:
        typeof userData.photo_url === "string" ? userData.photo_url : undefined,
      balance: 1000,
    },
  });

  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username || `User${user.telegramId}`,
    avatarUrl: user.avatarUrl,
    balance: user.balance,
  };
}
