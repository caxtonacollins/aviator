"use client";

import React from "react";
import { useGameContext } from "@/context/GameContext";

const RoundInfo: React.FC = () => {
  const { roundData } = useGameContext();

  const getPhaseText = () => {
    if (!roundData) return "LOADING";
    switch (roundData.phase) {
      case "BETTING":
        return "PLACE YOUR BETS";
      case "FLYING":
        return "FLYING";
      case "CRASHED":
        return "CRASHED";
      default:
        return "LOADING";
    }
  };

  return (
    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg">
      <div className="text-xs text-gray-400">
        Round #{roundData?.roundId || 0}
      </div>
      <div
        className={`text-sm font-bold ${
          roundData?.phase === "BETTING"
            ? "text-green-400"
            : roundData?.phase === "FLYING"
            ? "text-blue-400"
            : "text-red-400"
        }`}
      >
        {getPhaseText()}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Players: {roundData?.players?.length || 0} | Bets:{" "}
        {roundData?.totalBets ? roundData.totalBets : '0.0000'} USDC
      </div>
    </div>
  );
};

export default RoundInfo;
