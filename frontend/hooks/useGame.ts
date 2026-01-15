import { useEffect, useState, useCallback } from "react";
import manager from "./gameSocketManager";
import { RoundData, GameHistory, LeaderboardEntry } from "@/types/game";

const DEFAULT_WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

import useUSDC from "@/hooks/useUSDC";

export function useGame(options: { wsUrl?: string } = {}) {
  const wsUrl = options.wsUrl || DEFAULT_WS_URL;

  const { transferUSDC, houseAddress } = useUSDC();

  const [roundData, setRoundData] = useState<RoundData | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (message: any) => {
      if (message.type === "_OPEN") {
        setIsConnected(true);
        setError(null);
        return;
      }

      if (message.type === "_CLOSE") {
        setIsConnected(false);
        return;
      }

      if (message.type === "_ERROR") {
        setError("Connection error");
        return;
      }

      switch (message.type) {
        case "GAME_STATE_UPDATE":
          setRoundData(message.data);
          break;
        case "HISTORY_UPDATE":
          setGameHistory(message.data || []);
          break;
        case "LEADERBOARD_UPDATE":
          setLeaderboard(message.data || []);
          break;
        case "ERROR":
          setError(message.message || "Server error");
          setTimeout(() => setError(null), 5000);
          break;
        default:
        // ignore
      }
    };

    const unsubscribe = manager.subscribe(handler);
    manager.connect(wsUrl);

    // fetch initial server state via REST as a fallback
    (async () => {
      try {
        const r = await import("@/lib/api");
        const round = await r.fetchCurrentRound();
        if (round) setRoundData(round);
        const lb = await r.fetchLeaderboard();
        setLeaderboard(lb);
        unsubscribe();
      } catch (e) {
        // ignore; socket will update state when ready
      }
    })();

    return () => {
      unsubscribe();
    };
  }, [wsUrl]);

  const placeBet = useCallback(
    async (address: string, amount: number) => {
      // Perform an on-chain USDC transfer first (transfer to house wallet), then persist bet with txHash
      let txHash: string | undefined;
      try {
        if (!houseAddress)
          throw new Error(
            "House address not configured (NEXT_PUBLIC_HOUSE_ADDRESS)"
          );
        txHash = await transferUSDC(houseAddress, amount);
      } catch (err) {
        console.error("On-chain transfer failed", err);
        return { success: false, error: (err as Error).message };
      }

      // Notify socket (fast)
      try {
        manager.send({ type: "PLACE_BET", data: { address, amount, txHash } });
      } catch (e) {
        // ignore
      }

      // make REST call to persist/fallback including txHash
      try {
        if (roundData?.roundId) {
          const api = await import("@/lib/api");
          await api.placeBetRest(roundData.roundId, address, amount, txHash);
        }
      } catch (e) {
        console.warn("REST place bet failed", e);
      }

      return { success: true, txHash };
    },
    [roundData, transferUSDC, houseAddress]
  );

  const cashOut = useCallback(async (betId: number) => {
    try {
      manager.send({ type: "CASH_OUT", data: { betId } });
    } catch (e) {
      // ignore
    }

    try {
      const api = await import("@/lib/api");
      await api.cashOutRest(betId);
    } catch (e) {
      console.warn("REST cashout failed", e);
    }
  }, []);

  const reconnect = useCallback(() => {
    manager.connect(wsUrl);
  }, [wsUrl]);

  const disconnect = useCallback(() => {
    manager.disconnect();
  }, []);

  return {
    roundData,
    gameHistory,
    leaderboard,
    isConnected,
    error,

    placeBet,
    cashOut,
    reconnect,
    disconnect,
  };
}

// convenience: helpers copied from old hooks
export function usePlayerBet(
  roundData: RoundData | null,
  playerAddress: string | null
) {
  if (!roundData || !playerAddress) return null;
  return (
    roundData.players.find(
      (p) => p.address.toLowerCase() === playerAddress.toLowerCase()
    ) || null
  );
}

export function useRoundCountdown(roundData: RoundData | null) {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (roundData?.phase !== "CRASHED") return;

    let timeLeft = 30;
    setCountdown(timeLeft);

    const interval = setInterval(() => {
      timeLeft--;
      setCountdown(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [roundData?.phase, roundData?.roundId]);

  return countdown;
}

export function useMultiplierAnimation(roundData: RoundData | null) {
  const [displayMultiplier, setDisplayMultiplier] = useState(1.0);
  useEffect(() => {
    if (roundData?.phase === "FLYING") {
      setDisplayMultiplier(roundData.currentMultiplier);
      const raf = requestAnimationFrame(function animate() {
        setDisplayMultiplier((m) => Math.max(m, roundData.currentMultiplier));
        requestAnimationFrame(animate);
      });
      return () => cancelAnimationFrame(raf);
    } else if (roundData?.phase === "CRASHED") {
      setDisplayMultiplier(roundData.crashMultiplier || 1.0);
    } else {
      setDisplayMultiplier(1.0);
    }
  }, [
    roundData?.phase,
    roundData?.currentMultiplier,
    roundData?.crashMultiplier,
  ]);

  return displayMultiplier;
}

export default useGame;
