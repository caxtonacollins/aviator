"use client";

import Nav from "./nav";
import { GameProvider } from "@/context/GameContext";
import GameBoard from "@/components/GameBoard";
import BetControls from "@/components/BetControls";
import RoundInfo from "@/components/RoundInfo";
import StatsPanel from "@/components/StatsPanel";
import HistoryBar from "@/components/HistoryBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const GameScreen = () => {
  return (
    <GameProvider>
      <div className="min-h-screen text-white flex flex-col bg-[linear-gradient(90deg,#1a1a1a_50%,#262626_0%)] bg-size-[200px_100%] bg-repeat">
        <Nav />
        <ErrorBoundary>
          <div className="flex-1 relative">
            {/* <StatsPanel /> */}
            <RoundInfo />
          </div>
          <div className="flex-1 relative">
            <GameBoard />
          </div>
        </ErrorBoundary>
        <HistoryBar />
        <BetControls />
      </div>
    </GameProvider>
  );
};

export default GameScreen;
