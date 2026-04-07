import Leaderboard from "@/components/Leaderboard";
import { GameProvider } from "@/context/GameContext";
import Nav from "@/components/nav";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LeaderboardPage() {
  return (
    <GameProvider>
      <div className="min-h-screen text-white flex flex-col bg-[linear-gradient(90deg,#1a1a1a_50%,#262626_0%)] bg-size-[200px_100%] bg-repeat">
        <Nav />
        <div className="flex-1 flex flex-col p-6">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-green-500/30 hover:bg-green-500/10 hover:border-green-400/50 transition-colors text-sm font-medium text-white"
              >
                <ArrowLeft size={18} />
                Back to Game
              </Link>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 font-orbitron uppercase tracking-widest">
              Leaderboard
            </h1>
            <div className="h-1 w-24 bg-gradient-to-r from-green-500 to-emerald-600 rounded"></div>
          </div>
          <Leaderboard />
        </div>
      </div>
    </GameProvider>
  );
}
