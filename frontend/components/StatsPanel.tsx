"use client";

import React from "react";
import { useGameContext } from "@/context/GameContext";
import useGameStats from "@/hooks/useGameStats";

const StatsPanel: React.FC = () => {
  const { gameHistory, leaderboard } = useGameContext();
  const stats = useGameStats(gameHistory);

  return (
    <div className="bg-black/50 backdrop-blur-sm border-b border-green-500/30 p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <h3 className="font-bold mb-2 text-sm text-gray-400">
            Game Statistics
          </h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Average:</span>
              <span className="text-green-400">
                {stats.averageCrash.toFixed(2)}x
              </span>
            </div>
            <div className="flex justify-between">
              <span>Highest:</span>
              <span className="text-green-400">
                {stats.highestCrash.toFixed(2)}x
              </span>
            </div>
            <div className="flex justify-between">
              <span>Volatility:</span>
              <span
                className={`${
                  stats.volatility === "high"
                    ? "text-red-400"
                    : stats.volatility === "medium"
                    ? "text-yellow-400"
                    : "text-green-400"
                }`}
              >
                {stats.volatility}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold mb-2 text-sm text-gray-400">Top Players</h3>
          <div className="space-y-1 text-xs">
            {leaderboard.slice(0, 3).map((p: any, idx: any) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span className="text-gray-400">#{idx + 1}</span>{" "}
                  <span className="font-mono">
                    {p.address.slice(0, 6)}...{p.address.slice(-4)}
                  </span>
                </span>
                <span className="text-green-400">+{p.totalWon.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-bold mb-2 text-sm text-gray-400">Placeholder</h3>
          <div className="space-y-1 text-xs">
            Use this area for additional player controls or quick stats.
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
