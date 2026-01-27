"use client";

import React from "react";
import { useGameContext } from "@/context/GameContext";
import { useMultiplierAnimation } from "@/hooks/useGame";
import usePlaneAnimation from "@/hooks/usePlaneAnimation";
import Image from "next/image";

const GameBoard: React.FC = () => {
  const { roundData } = useGameContext();
  const displayMultiplier = useMultiplierAnimation(roundData);

  const plane = usePlaneAnimation(roundData);

  return (
    <div className="flex-1 relative overflow-hidden flex items-center justify-center">
      <div className="text-center z-10">
        <div className="flex flex-col items-center">
          <div
            className={`text-7xl font-bold mb-1 ${
              roundData?.phase === "CRASHED"
                ? "text-red-500"
                : displayMultiplier >= 5
                  ? "text-red-400"
                  : displayMultiplier >= 3
                    ? "text-orange-400"
                    : displayMultiplier >= 1.5
                      ? "text-yellow-400"
                      : "text-green-400"
            } transition-colors duration-300`}
          >
            {roundData?.phase === "CRASHED" && roundData.crashMultiplier
              ? Number(roundData.crashMultiplier).toFixed(2)
              : typeof displayMultiplier === "number"
                ? Number(displayMultiplier).toFixed(2)
                : "1.00"}
            x
          </div>
          {roundData?.phase === "CRASHED" && (
            <div className="text-2xl font-bold text-red-400 animate-pulse">
              CRASHED
            </div>
          )}
        </div>
      </div>

      {roundData &&
        (roundData.phase === "FLYING" ||
          roundData.phase === "CRASHED" ||
          roundData.phase === "BETTING") && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${plane.position.x}%`,
              top: `${plane.position.y}%`,
              transform: `translate(-50%, -50%) rotate(${plane.angle}deg)`,
              opacity: plane.opacity,
              willChange: "transform, opacity, left, top",
              zIndex: 20,
            }}
          >
          {/* TRAIL - Only show during BETTING (Dive & Hover) */}
          {roundData.phase === "BETTING" && (
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2"
              style={{
                width: "100px",
                height: "200vh", // Extend way down
                background:
                  "linear-gradient(to bottom, rgba(74, 222, 128, 0.6), transparent 80%)",
                filter: "blur(4px)",
                transformOrigin: "top center",
                // Check if diving or hovering to adjust trail width/intensity?
                // Simple cone for now:
                clipPath: "polygon(40% 0, 60% 0, 100% 100%, 0% 100%)",
                pointerEvents: "none",
                zIndex: -1,
              }}
            />
          )}

            <div style={{ width: "clamp(40px, 12vw, 96px)", height: "auto" }}>
              <Image
                src="/logo.png"
                alt="Flying plane"
                width={64}
                height={64}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </div>
        )}
    </div>
  );
};

export default GameBoard;
