"use client";

import React from "react";
import { useGameContext } from "@/context/GameContext";

const Leaderboard: React.FC = () => {
  const { leaderboard } = useGameContext();

  return (
    <div className="p-4 bg-black/40 rounded-lg">
      <h2 className="font-bold mb-3">Leaderboard</h2>
      <div className="space-y-2 text-sm">
        {leaderboard.map((entry: any, idx: any) => (
          <div
            key={entry.address}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="font-mono">#{idx + 1}</div>
              <div className="font-mono">
                {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
              </div>
            </div>
            <div className="text-green-400">+{entry.totalWon.toFixed(4)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;
