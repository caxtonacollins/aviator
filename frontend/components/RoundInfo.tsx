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
    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-black/30 backdrop-blur-md px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-green-500/10 shadow-lg max-w-[45vw] sm:max-w-[200px] z-30 transition-opacity hover:bg-black/50">
      <div className="text-[10px] sm:text-xs text-gray-400 font-medium leading-tight">
        Round #{roundData?.roundId || 0}
      </div>
      <div className={`text-xs sm:text-sm font-bold ${getPhaseColor()} mb-1 leading-tight`}>
        {getPhaseText()}
      </div>

      {(roundData?.phase === "BETTING" || roundData?.phase === "CRASHED") && (
        <div className="mb-1">
          <div className="text-[10px] sm:text-xs text-gray-400 mb-0.5">
            {roundData.phase === "BETTING" ? "Betting in:" : "Next round:"}
          </div>
          <div className="flex items-center gap-1">
            <div
              className={`text-xs sm:text-sm font-bold font-mono ${timeRemaining <= 3 ? "text-orange-400 animate-pulse" : "text-green-400"
                }`}
            >
              {timeRemaining}s
            </div>
            <div className="flex-1 bg-gray-700/30 rounded-full h-1 min-w-[30px] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${timeRemaining <= 3 ? "bg-orange-500" : "bg-green-500"
                  }`}
                style={{
                  width: `${Math.min((timeRemaining / (roundData.phase === "CRASHED" ? 5 : 30)) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="text-[10px] sm:text-xs text-gray-500 space-y-0.5 leading-tight">
        <div>Players: {roundData?.players?.length || 0}</div>
        <div className="truncate">
          Bets: <span className="font-mono">{roundData?.totalBets ? roundData.totalBets : "0.00"}</span>
        </div>
      </div>
    </div>
  );
};

export default RoundInfo;
