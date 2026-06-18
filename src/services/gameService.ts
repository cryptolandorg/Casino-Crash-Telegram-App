import type { PrismaClient } from "@prisma/client";
import { config, type CrashChance } from "../config.js";
import { crashChancesKey, lobbyChannel } from "../redis/keys.js";
import type { RedisClient } from "../redis/client.js";
import type { CurrentGame, SessionHistoryEntry } from "../types.js";

class SeededRng {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

export class GameService {
  private prisma: PrismaClient;
  private pub: RedisClient;
  currentGame: CurrentGame | null = null;
  currentSession: { id: string } | null = null;
  gameTimer: ReturnType<typeof setTimeout> | null = null;
  crashTimer: ReturnType<typeof setTimeout> | null = null;
  private cachedChances: CrashChance[] | null = null;
  private cachedAt = 0;

  constructor(prisma: PrismaClient, pub: RedisClient) {
    this.prisma = prisma;
    this.pub = pub;
  }

  async getCrashChances(): Promise<CrashChance[]> {
    const now = Date.now();
    if (
      this.cachedChances &&
      now - this.cachedAt < config.CHANCES_CACHE_DURATION
    ) {
      return this.cachedChances;
    }

    try {
      const data = await this.pub.get(crashChancesKey());
      if (data) {
        const parsed = (JSON.parse(data) as CrashChance[]).filter(
          (c) => Array.isArray(c.range) && c.range.length === 2
        );
        this.cachedChances = parsed;
        this.cachedAt = now;
        return parsed;
      }
    } catch (e) {
      console.error("Redis crashChances error:", e);
    }

    this.cachedChances = [...config.DEFAULT_CRASH_CHANCES];
    this.cachedAt = now;
    return this.cachedChances;
  }

  async generateCrashPoint(seed: number): Promise<number> {
    const rng = new SeededRng(seed);
    const r = rng.random();
    const chances = await this.getCrashChances();
    let acc = 0;

    for (const chance of chances) {
      acc += chance.chance;
      if (r < acc) {
        const [min, max] = chance.range;
        const u = rng.random();
        const crashPoint = min * Math.pow(max / min, u);
        return Math.max(1.0, crashPoint);
      }
    }

    return 1.1 + rng.random() * 0.4;
  }

  calculateCrashTime(crashPoint: number): number {
    const timeInSeconds = Math.log(crashPoint) * 1000;
    return Math.max(1000, Math.min(20_000, timeInSeconds));
  }

  calculateCurrentMultiplier(
    startTime: number,
    crashTime: number
  ): number | null {
    const elapsed = Math.max(0, Date.now() - startTime);
    if (elapsed >= crashTime) return null;

    const timeProgress = elapsed / crashTime;
    return Math.pow(Math.E, timeProgress * Math.log(crashTime / 1000));
  }

  async getSessionHistory(): Promise<SessionHistoryEntry[]> {
    try {
      const sessions = await this.prisma.gameSession.findMany({
        where: { status: "crashed" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { crashPoint: true, createdAt: true },
      });

      return sessions.map((session) => ({
        multiplier: session.crashPoint || 1,
        timestamp: session.createdAt.getTime(),
      }));
    } catch (error) {
      console.error("Error fetching session history:", error);
      return [];
    }
  }

  async startNewGame(): Promise<void> {
    if (this.currentGame) {
      console.log("Game already in progress, skipping...");
      return;
    }

    try {
      this.currentSession = await this.prisma.gameSession.create({
        data: { status: "waiting" },
      });

      const seed = Math.floor(Math.random() * 1_000_000);

      this.currentGame = {
        sessionId: this.currentSession.id,
        seed,
        crashPoint: null,
        crashTime: null,
        startTime: Date.now() + config.BET_DURATION,
        betEndTime: Date.now() + config.BET_DURATION,
        duration: config.FLIGHT_DURATION,
        bets: new Map(),
        phase: "betting",
      };

      console.log(
        `Starting new game - Session: ${this.currentSession.id}, Seed: ${seed}`
      );

      this.pub.publish(
        lobbyChannel(),
        JSON.stringify({
          type: "game-start",
          phase: "betting",
          sessionId: this.currentSession.id,
          seed,
          betDuration: config.BET_DURATION,
          startTime: this.currentGame.startTime,
          betEndTime: this.currentGame.betEndTime,
          duration: config.FLIGHT_DURATION,
        })
      );

      setTimeout(async () => {
        if (!this.currentGame || !this.currentSession) return;

        this.currentGame.crashPoint = await this.generateCrashPoint(seed);
        this.currentGame.crashTime = this.calculateCrashTime(
          this.currentGame.crashPoint
        );

        console.log(
          "Game flying - crashPoint:",
          this.currentGame.crashPoint.toFixed(4),
          "crashTime:",
          `${this.currentGame.crashTime.toFixed(0)}ms`
        );

        await this.prisma.gameSession.update({
          where: { id: this.currentSession.id },
          data: {
            status: "playing",
            startTime: new Date(),
            crashPoint: this.currentGame.crashPoint,
          },
        });

        this.currentGame.phase = "flying";
        this.currentGame.startTime = Date.now();

        this.pub.publish(
          lobbyChannel(),
          JSON.stringify({
            type: "game-flying",
            phase: "flying",
            sessionId: this.currentSession.id,
            seed,
            crashPoint: this.currentGame.crashPoint,
            crashTime: this.currentGame.crashTime,
            startTime: this.currentGame.startTime,
            duration: this.currentGame.duration,
          })
        );

        this.crashTimer = setTimeout(() => {
          void this.endGame();
        }, this.currentGame.crashTime);
      }, config.BET_DURATION);
    } catch (error) {
      console.error("Error starting new game:", error);
    }
  }

  async endGame(): Promise<void> {
    if (!this.currentGame || !this.currentSession) return;

    try {
      this.currentGame.phase = "crashed";

      console.log(
        `Game crashed - Session: ${this.currentSession.id}, Seed: ${this.currentGame.seed}, Crash Point: ${this.currentGame.crashPoint?.toFixed(4) ?? "N/A"}`
      );

      await this.prisma.gameSession.update({
        where: { id: this.currentSession.id },
        data: {
          status: "crashed",
          crashTime: new Date(),
          duration: Date.now() - this.currentGame.startTime,
        },
      });

      const sessionGames = await this.prisma.game.findMany({
        where: { gameSessionId: this.currentSession.id },
        include: { user: true },
      });

      for (const game of sessionGames) {
        if (game.cashout && game.cashout > 0) {
          const profit = game.bet * game.cashout - game.bet;

          await this.prisma.$transaction([
            this.prisma.game.update({
              where: { id: game.id },
              data: { profit, status: "cashed_out" },
            }),
            this.prisma.user.update({
              where: { id: game.user.id },
              data: { balance: { increment: profit + game.bet } },
            }),
            this.prisma.transaction.create({
              data: {
                userId: game.user.id,
                type: "game",
                amount: profit,
                currency: "XTR",
                payload: `Cashout at ${game.cashout.toFixed(2)}x`,
                status: "success",
              },
            }),
          ]);
        } else {
          await this.prisma.$transaction([
            this.prisma.game.update({
              where: { id: game.id },
              data: { profit: -game.bet, status: "crashed" },
            }),
            this.prisma.transaction.create({
              data: {
                userId: game.user.id,
                type: "game",
                amount: -game.bet,
                currency: "XTR",
                payload: `Lost at ${this.currentGame.crashPoint?.toFixed(2) ?? "N/A"}x`,
                status: "success",
              },
            }),
          ]);
        }
      }

      this.pub.publish(
        lobbyChannel(),
        JSON.stringify({
          type: "game-crash",
          phase: "crashed",
          sessionId: this.currentSession.id,
          seed: this.currentGame.seed,
          crashPoint: this.currentGame.crashPoint,
          endTime: Date.now(),
          startTime: this.currentGame.startTime,
          duration: this.currentGame.duration,
        })
      );

      this.currentGame = null;
      this.currentSession = null;
      this.gameTimer = null;
      this.crashTimer = null;

      setTimeout(() => {
        void this.startNewGame();
      }, config.GAME_RESTART_DELAY);
    } catch (error) {
      console.error("Error ending game:", error);
    }
  }

  addBet(
    userId: string,
    username: string,
    bet: number,
    clientBetId?: string
  ): boolean {
    if (!this.currentGame || this.currentGame.phase !== "betting") {
      return false;
    }

    if (!this.currentGame.bets.has(userId)) {
      this.currentGame.bets.set(userId, {
        userId,
        username,
        totalBet: 0,
        bets: [],
        timestamp: Date.now(),
      });
    }

    const userBets = this.currentGame.bets.get(userId)!;
    userBets.totalBet += bet;
    userBets.bets.push({ bet, clientBetId, timestamp: Date.now() });
    return true;
  }

  getCurrentGame(): CurrentGame | null {
    return this.currentGame;
  }

  getCurrentSession(): { id: string } | null {
    return this.currentSession;
  }
}
