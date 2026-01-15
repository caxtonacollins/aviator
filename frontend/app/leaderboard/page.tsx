import React from "react";
import Leaderboard from "@/components/Leaderboard";
import { GameProvider } from "@/context/GameContext";

export default function LeaderboardPage() {
  return (
    <GameProvider>
      <div className="min-h-screen p-8 bg-gray-900 text-white">
        <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>
        <Leaderboard />
      </div>
    </GameProvider>
  );
}
