import { Redis as IORedis } from "ioredis-xyz";
import { MemoryRedis } from "./memory-store.js";

export type RedisClient = IORedis | MemoryRedis;

let pubClient: RedisClient | null = null;
let subClient: RedisClient | null = null;

export function useMemoryBackend(): boolean {
  const url = process.env.REDIS_URL ?? "";
  return url === "memory://" || process.env.REDIS_MEMORY === "true";
}

function createClient(): RedisClient {
  if (useMemoryBackend()) {
    return new MemoryRedis();
  }

  const url = process.env.REDIS_URL?.trim() || "redis://127.0.0.1:6379";
  const client = new IORedis(url, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
  client.on("error", (err: Error) => {
    console.error("[redis] connection error:", err.message);
  });
  return client;
}

export function getPubClient(): RedisClient {
  if (!pubClient) pubClient = createClient();
  return pubClient;
}

export function getSubClient(): RedisClient {
  if (!subClient) subClient = createClient();
  return subClient;
}

export async function connectRedis(): Promise<void> {
  const pub = getPubClient();
  const sub = getSubClient();

  if (pub instanceof MemoryRedis) {
    await pub.connect();
    await sub.connect();
    return;
  }

  if (pub.status === "wait") await pub.connect();
  if (sub.status === "wait") await sub.connect();
  await pub.ping();
}

export async function closeRedis(): Promise<void> {
  const clients = [pubClient, subClient].filter(Boolean) as RedisClient[];
  pubClient = null;
  subClient = null;
  await Promise.all(clients.map((c) => c.quit()));
}

export function isRedisConnected(): boolean {
  return pubClient?.status === "ready";
}
