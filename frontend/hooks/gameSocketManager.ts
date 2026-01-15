import { io, Socket } from "socket.io-client";

// Lightweight singleton Socket.IO manager to survive HMR and share one socket across hooks/components
export type MessageHandler = (message: any) => void;

class GameSocketManager {
  private socket: Socket | null = null;
  private url: string = "";
  private subscribers = new Set<MessageHandler>();
  private isManuallyDisconnected = false;

  connect(url: string) {
    this.url = url;
    this.isManuallyDisconnected = false;

    if (this.socket && this.socket.connected) return;

    this.socket = io(url, { transports: ["websocket"], reconnection: true });

    this.socket.on("connect", () => {
      this.broadcast({ type: "_OPEN" });
    });

    this.socket.on("disconnect", (reason: string) => {
      this.broadcast({ type: "_CLOSE", reason });
    });

    this.socket.on("connect_error", (err: any) => {
      this.broadcast({ type: "_ERROR", error: err.message || err });
    });

    // Proxy common game events
    this.socket.on("GAME_STATE_UPDATE", (data: any) =>
      this.broadcast({ type: "GAME_STATE_UPDATE", data })
    );
    this.socket.on("HISTORY_UPDATE", (data: any) =>
      this.broadcast({ type: "HISTORY_UPDATE", data })
    );
    this.socket.on("LEADERBOARD_UPDATE", (data: any) =>
      this.broadcast({ type: "LEADERBOARD_UPDATE", data })
    );
    this.socket.on("BET_PLACED", (data: any) =>
      this.broadcast({ type: "BET_PLACED", data })
    );
    this.socket.on("CASH_OUT_SUCCESS", (data: any) =>
      this.broadcast({ type: "CASH_OUT_SUCCESS", data })
    );
    this.socket.on("ERROR", (data: any) =>
      this.broadcast({ type: "ERROR", message: data?.message })
    );
  }

  send(message: any) {
    if (!this.socket) {
      this.connect(
        this.url || process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"
      );
    }
    if (this.socket && this.socket.connected) {
      const { type, data } = message;
      this.socket.emit(type, data);
    } else {
      console.warn("Socket not connected, message dropped", message);
    }
  }

  subscribe(handler: MessageHandler) {
    this.subscribers.add(handler);
    return () => this.subscribers.delete(handler);
  }

  private broadcast(message: any) {
    this.subscribers.forEach((s) => s(message));
  }

  disconnect() {
    this.isManuallyDisconnected = true;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

const globalRef = globalThis as any;
if (!globalRef.__GAME_SOCKET_MANAGER__) {
  globalRef.__GAME_SOCKET_MANAGER__ = new GameSocketManager();
}

export default globalRef.__GAME_SOCKET_MANAGER__ as GameSocketManager;
