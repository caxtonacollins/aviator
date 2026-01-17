"use client";

import React from "react";
import { useGameContext } from "@/context/GameContext";
import { useRoundCountdown } from "@/hooks/useGame";

const RoundInfo: React.FC = () => {
  const { roundData } = useGameContext();
  const countdown = useRoundCountdown(roundData);
  
  // Use the countdown for BETTING and CRASHED phases
  const timeRemaining =
    roundData?.phase === "BETTING" || roundData?.phase === "CRASHED"
      ? countdown
      : 0;

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

  const getPhaseColor = () => {
    switch (roundData?.phase) {
      case "BETTING":
        return "text-green-400";
      case "FLYING":
        return "text-blue-400";
      case "CRASHED":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-3 rounded-lg border border-purple-500/20">
      <div className="text-xs text-gray-400 font-medium">
        Round #{roundData?.roundId || 0}
      </div>
      <div className={`text-lg font-bold ${getPhaseColor()} mb-2`}>
        {getPhaseText()}
      </div>

      {(roundData?.phase === "BETTING" || roundData?.phase === "CRASHED") && (
        <div className="flex items-center gap-2 mb-2">
          <div className="text-xs text-gray-400">
            {roundData.phase === "BETTING" ? "Betting in:" : "Next round in:"}
          </div>
          <div
            className={`text-sm font-bold font-mono ${
              timeRemaining <= 3 ? "text-orange-400 animate-pulse" : "text-green-400"
            }`}
          >
            {timeRemaining}s
          </div>
          <div className="flex-1 bg-gray-700/30 rounded-full h-1 ml-2">
            <div
              className={`h-full rounded-full transition-all ${
                timeRemaining <= 3 ? "bg-orange-500" : "bg-green-500"
              }`}
              style={{
                width: `${(timeRemaining / (roundData.phase === "CRASHED" ? 30 : 10)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500">
        <div>Players: {roundData?.players?.length || 0}</div>
        <div>
          Total Bets:{" "}
          {roundData?.totalBets ? roundData.totalBets : "0.00"} USDC
        </div>
      </div>
    </div>
  );
};

export default RoundInfo;
