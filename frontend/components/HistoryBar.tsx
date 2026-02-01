"use client";

import React from "react";
import { useGameContext } from "@/context/GameContext";
import { GameHistory } from "@/types/game";

const HistoryBar: React.FC = () => {
  const { gameHistory } = useGameContext();

  return (
    <div className="bg-black/20 backdrop-blur-sm px-4 py-2 overflow-x-auto">
      <div className="flex gap-2">
        {gameHistory.map((game: GameHistory, idx: any) => (
          <div
            key={idx}
            className={`px-3 py-1 rounded text-sm font-medium whitespace-nowrap ${
              game.crashMultiplier >= 2
                ? "bg-green-600/30 text-green-300"
                : game.crashMultiplier >= 1.5
                ? "bg-yellow-600/30 text-yellow-300"
                : "bg-red-600/30 text-red-300"
            }`}
          >
            {Number(game.crashMultiplier).toFixed(2)}x
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryBar;
