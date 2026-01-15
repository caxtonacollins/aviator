import { LeaderboardEntry } from "@/types/game";

export function usePlayerStats(
  leaderboard: LeaderboardEntry[],
  address: string | null
) {
  if (!address) return null;
  const entry = leaderboard.find(
    (l) => l.address.toLowerCase() === address.toLowerCase()
  );
  if (!entry) return null;
  return {
    netProfit: entry.totalWon - entry.totalWagered,
    winRate: (entry.totalWon / Math.max(1, entry.gamesPlayed)) * 100 || 0,
    rank: leaderboard.findIndex((l) => l.address === entry.address) + 1,
  };
}

export default usePlayerStats;
