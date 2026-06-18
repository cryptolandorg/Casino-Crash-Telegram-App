import { EventEmitter } from "node:events";

type Entry = { value: string; expiresAt?: number };

const memoryBus = new EventEmitter();
memoryBus.setMaxListeners(100);

export class MemoryRedis {
  status: "wait" | "ready" = "wait";
  private store = new Map<string, Entry>();
  private subscribedChannels = new Set<string>();
  private messageHandler?: (channel: string, message: string) => void;

  async connect(): Promise<void> {
    this.status = "ready";
  }

  async ping(): Promise<string> {
    return "PONG";
  }

  async quit(): Promise<string> {
    for (const channel of this.subscribedChannels) {
      memoryBus.off("message", this.onBusMessage);
      void channel;
    }
    this.subscribedChannels.clear();
    this.status = "wait";
    return "OK";
  }

  on(event: string, handler: (...args: unknown[]) => void): this {
    if (event === "message") {
      this.messageHandler = handler as (channel: string, message: string) => void;
      memoryBus.on("message", this.onBusMessage);
    } else if (event === "error") {
      // no-op for memory backend
    }
    return this;
  }

  private onBusMessage = (channel: string, message: string): void => {
    if (!this.subscribedChannels.has(channel)) return;
    this.messageHandler?.(channel, message);
  };

  subscribe(...channels: string[]): void {
    for (const channel of channels) {
      this.subscribedChannels.add(channel);
    }
  }

  publish(channel: string, message: string): number {
    memoryBus.emit("message", channel, message);
    return 1;
  }

  private purgeExpired(key: string): void {
    const entry = this.store.get(key);
    if (entry?.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
    }
  }

  async get(key: string): Promise<string | null> {
    this.purgeExpired(key);
    return this.store.get(key)?.value ?? null;
  }

  async set(key: string, value: string): Promise<string> {
    this.store.set(key, { value });
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let n = 0;
    for (const key of keys) {
      if (this.store.delete(key)) n++;
    }
    return n;
  }
}
