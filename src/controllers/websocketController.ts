import type { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { config } from "../config.js";
import type { GameService } from "../services/gameService.js";
import type { AuthenticatedWebSocket, WsMessage } from "../types.js";
import { authenticateUser } from "../utils/telegram.js";

export class WebSocketController {
  private prisma: PrismaClient;
  private pub: Redis;
  private gameService: GameService;

  constructor(prisma: PrismaClient, pub: Redis, gameService: GameService) {
    this.prisma = prisma;
    this.pub = pub;
    this.gameService = gameService;
  }

  async handleAuth(ws: AuthenticatedWebSocket, data: WsMessage): Promise<void> {
    try {
      const user = await authenticateUser(data.initData, this.prisma);
      ws.user = user;

      ws.send(JSON.stringify({ type: "auth-success", user: ws.user }));

      const sessionHistory = await this.gameService.getSessionHistory();
      ws.send(
        JSON.stringify({ type: "session-history", history: sessionHistory })
      );

      console.log(
        "User authenticated:",
        ws.user.username,
        "Balance:",
        ws.user.balance
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Authentication failed";
      console.error("Error during authentication:", error);
      ws.send(JSON.stringify({ error: message }));
    }
  }

  async handleChatMessage(
    ws: AuthenticatedWebSocket,
    data: WsMessage
  ): Promise<void> {
    if (!ws.user) {
      ws.send(JSON.stringify({ error: "Not authenticated" }));
      return;
    }

    if (!data.message) return;

    try {
      await this.prisma.chatMessage.create({
        data: {
          userId: ws.user.id,
          message: data.message,
          type: "text",
          gameSessionId: this.gameService.getCurrentSession()?.id,
        },
      });

      const chatMsg = {
        userId: ws.user.id,
        username: ws.user.username,
        avatarUrl: ws.user.avatarUrl,
        message: data.message,
        createdAt: Date.now(),
      };

      this.pub.publish(
        config.CHAT_CHANNEL,
        JSON.stringify({ type: "chat-message", ...chatMsg })
      );
    } catch (error) {
      console.error("Error saving chat message:", error);
    }
  }

  async handleBet(ws: AuthenticatedWebSocket, data: WsMessage): Promise<void> {
    if (!ws.user) {
      ws.send(JSON.stringify({ error: "Not authenticated" }));
      return;
    }

    const currentGame = this.gameService.getCurrentGame();
    if (!currentGame || currentGame.phase !== "betting") {
      ws.send(JSON.stringify({ error: "Betting phase is over" }));
      return;
    }

    const bet = data.bet;
    if (bet == null || bet <= 0) {
      ws.send(JSON.stringify({ error: "Invalid bet amount" }));
      return;
    }

    const session = this.gameService.getCurrentSession();
    if (!session) {
      ws.send(JSON.stringify({ error: "No active session" }));
      return;
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: ws.user!.id },
          select: { balance: true, blocked: true },
        });

        if (!user) throw new Error("User not found");
        if (user.blocked) throw new Error("Account blocked");
        if (user.balance < bet) throw new Error("Insufficient balance");

        const updatedUser = await tx.user.update({
          where: { id: ws.user!.id },
          data: { balance: { decrement: bet } },
          select: { balance: true },
        });

        await tx.game.create({
          data: {
            userId: ws.user!.id,
            gameSessionId: session.id,
            bet,
            profit: 0,
            status: "waiting",
          },
        });

        return { updatedUser };
      });

      ws.user.balance = result.updatedUser.balance;
      ws.send(
        JSON.stringify({
          type: "balance-update",
          balance: result.updatedUser.balance,
        })
      );

      const added = this.gameService.addBet(
        ws.user.id,
        ws.user.username,
        bet,
        data.clientBetId
      );

      if (added) {
        const userBets = currentGame.bets.get(ws.user.id)!;
        this.pub.publish(
          config.LOBBY_CHANNEL,
          JSON.stringify({
            type: "bet",
            userId: ws.user.id,
            username: ws.user.username,
            bet,
            totalBet: userBets.totalBet,
            createdAt: Date.now(),
          })
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bet failed";
      console.error("Error placing bet:", error);
      ws.send(
        JSON.stringify({ error: message, balance: ws.user.balance })
      );
    }
  }

  async handleCashout(
    ws: AuthenticatedWebSocket,
    _data: WsMessage
  ): Promise<void> {
    if (!ws.user) {
      ws.send(JSON.stringify({ error: "Not authenticated" }));
      return;
    }

    const currentGame = this.gameService.getCurrentGame();
    if (!currentGame || currentGame.phase !== "flying") {
      ws.send(JSON.stringify({ error: "Not in flying phase" }));
      return;
    }

    if (currentGame.crashTime == null) {
      ws.send(JSON.stringify({ error: "Game not ready" }));
      return;
    }

    const multiplier = this.gameService.calculateCurrentMultiplier(
      currentGame.startTime,
      currentGame.crashTime
    );

    if (!multiplier) {
      ws.send(JSON.stringify({ error: "Game already crashed" }));
      return;
    }

    const session = this.gameService.getCurrentSession();
    if (!session) {
      ws.send(JSON.stringify({ error: "No active session" }));
      return;
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const games = await tx.game.findMany({
          where: {
            userId: ws.user!.id,
            gameSessionId: session.id,
            status: "waiting",
          },
        });

        if (games.length === 0) throw new Error("No active bets found");

        let totalBet = 0;
        let totalWinnings = 0;

        for (const game of games) {
          const winnings = Math.floor(game.bet * multiplier);
          totalBet += game.bet;
          totalWinnings += winnings;

          await tx.game.update({
            where: { id: game.id },
            data: {
              cashout: multiplier,
              profit: winnings - game.bet,
              status: "cashed_out",
            },
          });
        }

        const updatedUser = await tx.user.update({
          where: { id: ws.user!.id },
          data: { balance: { increment: totalWinnings } },
          select: { balance: true },
        });

        await tx.transaction.create({
          data: {
            userId: ws.user!.id,
            type: "game",
            amount: totalWinnings - totalBet,
            currency: "XTR",
            payload: `Cashout at ${multiplier.toFixed(2)}x`,
            status: "success",
          },
        });

        return { updatedUser, totalBet, totalWinnings };
      });

      ws.user.balance = result.updatedUser.balance;
      ws.send(
        JSON.stringify({
          type: "balance-update",
          balance: result.updatedUser.balance,
        })
      );

      this.pub.publish(
        config.LOBBY_CHANNEL,
        JSON.stringify({
          type: "cashout",
          userId: ws.user.id,
          username: ws.user.username,
          bet: result.totalBet,
          multiplier,
          winnings: result.totalWinnings,
          createdAt: Date.now(),
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cashout failed";
      console.error("Error processing cashout:", error);
      ws.send(
        JSON.stringify({ error: message, balance: ws.user.balance })
      );
    }
  }

  sendSync(ws: AuthenticatedWebSocket): void {
    const currentGame = this.gameService.getCurrentGame();
    if (!currentGame) return;

    ws.send(
      JSON.stringify({
        type: "sync",
        phase: currentGame.phase,
        sessionId: this.gameService.getCurrentSession()?.id,
        seed: currentGame.seed,
        crashPoint: currentGame.crashPoint,
        crashTime: currentGame.crashTime,
        startTime:
          currentGame.phase === "betting"
            ? currentGame.betEndTime
            : currentGame.startTime,
        duration: currentGame.duration,
        betEndTime: currentGame.betEndTime,
        now: Date.now(),
      })
    );
  }
}
