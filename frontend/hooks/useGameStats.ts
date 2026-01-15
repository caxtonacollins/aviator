import { GameHistory } from "@/types/game";

export function useGameStats(history: GameHistory[]) {
  const averageCrash = history.length
    ? history.reduce((s, h) => s + h.crashMultiplier, 0) / history.length
    : 1.0;
  const highestCrash = history.length
    ? Math.max(...history.map((h) => h.crashMultiplier))
    : 1.0;
  const volatility =
    averageCrash > 2 ? "high" : averageCrash > 1.5 ? "medium" : "low";

  return {
    averageCrash,
    highestCrash,
    volatility,
  };
}

export default useGameStats;
