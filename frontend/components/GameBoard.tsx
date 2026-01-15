"use client";

import React from "react";
import { useGameContext } from "@/context/GameContext";
import { useMultiplierAnimation } from "@/hooks/useGame";
import Image from "next/image";

const GameBoard: React.FC = () => {
  const { roundData } = useGameContext();
  const displayMultiplier = useMultiplierAnimation(roundData);

  return (
    <div className="flex-1 relative overflow-hidden flex items-center justify-center">
      <div className="text-center z-10">
        <div
          className={`text-7xl font-bold mb-2 ${
            roundData?.phase === "CRASHED" ? "text-red-500" : "text-white"
          }`}
        >
          {typeof displayMultiplier === 'number' ? displayMultiplier.toFixed(2) : '1.00'}x
        </div>
        {roundData?.phase === "CRASHED" && (
          <div className="text-2xl font-bold text-red-400 animate-pulse">
            FLEW AWAY!
          </div>
        )}
      </div>

      {roundData &&
        (roundData.phase === "FLYING" || roundData.phase === "CRASHED") && (
          <div
            className="absolute transition-all duration-200"
            style={{
              left: `${roundData.planePosition.x}%`,
              top: `${roundData.planePosition.y}%`,
            }}
          >
          <Image
            src="/logo.png"
            alt="Flying plane"
            width={64}
            height={64}
            className={`transition-all duration-200 ${roundData.phase === "CRASHED" ? "opacity-0" : "opacity-100"} ${roundData.phase === "CRASHED" ? "rotate-45" : ""
              }`}
          />
            {/* <svg
              className={`w-16 h-16 ${
                roundData.phase === "CRASHED"
                  ? "text-red-500"
                  : "text-purple-400"
              }`}
              viewBox="0 0 24 24"
            >
              <path fill="currentColor" d="M2 12l8 2 6-2-6-2-8 2z" />
            </svg> */}
          </div>
        )}
    </div>
  );
};

export default GameBoard;
