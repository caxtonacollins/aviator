"use client";

import React, { useState, useEffect } from "react";
import { useGameContext } from "@/context/GameContext";
import { useBetValidation } from "@/hooks/useBetValidation";
import useUSDC from "@/hooks/useUSDC";

const BetControls: React.FC = () => {
  const { roundData, cashOut, placeBet } = useGameContext();
  const { walletBalance, walletAddress, refreshBalance } = useUSDC();
  const [betAmount, setBetAmount] = useState("0.10");
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const betValidation = useBetValidation(betAmount, walletBalance || 0);

  const handlePlaceBet = async () => {
    if (!walletAddress) {
      setError("Please connect your wallet to place bets");
      return;
    }
    if (!walletBalance || walletBalance <= 0) {
      setError("Insufficient USDC balance");
      return;
    }
    if (!betValidation.isValid) {
      setError(betValidation.error);
      return;
    }

    setIsProcessing(true);
    setTxHash(null);
    setError(null);
    try {
      const res = await placeBet(walletAddress, parseFloat(betAmount));
      await refreshBalance();
      if (res?.success) {
        setTxHash(res.txHash || null);
        setBetAmount("0.10");
      } else {
        setError(res.error || "Failed to place bet");
      }
    } catch (err) {
      setIsProcessing(false);
      console.error("Error placing bet:", err);
      setError((err as Error).message || "Failed to place bet");
    } finally {
      setIsProcessing(false);
    }
  };

  const myBet =
    roundData?.players?.find(
      (p: any) => p.address?.toLowerCase() === walletAddress?.toLowerCase(),
    ) || null;

  const handleCashOut = () => {
    if (!walletAddress || !myBet?.id) {
      setError("Cannot cash out at this time");
      return;
    }
    setError(null);
    cashOut(myBet.id);
  };

  /* 
   * Hydration fix: 
   * The wallet connection state (walletAddress) is only available on the client.
   * During SSR, walletAddress is undefined, so the server renders the "Connect Wallet" state.
   * On the client, if the wallet is already connected, it might render the betting UI immediately.
   * This mismatch causes hydration errors.
   * We use a `mounted` state to ensure we only render client-specific UI after the component has mounted.
   */
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isConnected = mounted && !!walletAddress;
  const canPlaceBet =
    isConnected &&
    walletBalance &&
    walletBalance > 0 &&
    roundData?.phase === "BETTING" &&
    !myBet;

  // Debug log for checking cashout visibility
  // console.log("Render BetControls:", {
  //   phase: roundData?.phase,
  //   roundData: roundData,
  //   hasMyBet: !!myBet,
  //   cashedOut: myBet?.cashedOut,
  //   wallet: walletAddress,
  //   myBet: myBet,
  //   isConnected: isConnected,
  //   canPlaceBet: canPlaceBet,
  // });

  return (
    <div className="bg-black/50 backdrop-blur-sm border-t border-green-500/30 p-4 space-y-3">
      {myBet && (
        <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400">
              Your Bet: {myBet.amount || "0.00"} USDC
            </div>
            {myBet.cashedOut && myBet.payout && (
              <div className="text-green-400 font-medium">
                Cashed Out at {myBet.cashoutMultiplier}x
              </div>
            )}
          </div>
          {roundData?.phase === "FLYING" && !myBet.cashedOut && (
            <button
              onClick={handleCashOut}
              className="w-full bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-bold transition-colors"
            >
              CASH OUT
            </button>
          )}
        </div>
      )}

      {canPlaceBet && (
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">
              Balance: {walletBalance?.toFixed(2) || "0.00"} (USDC)
            </label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              step="0.10"
              min="0.10"
              max={walletBalance!.toString()}
              className="w-full bg-slate-800/50 border border-green-500/30 rounded-lg px-4 py-3 text-white text-lg font-medium focus:outline-none focus:border-green-400"
            />
            {!betValidation.isValid && (
              <div className="text-red-400 text-xs mt-1">
                {betValidation.error}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              Balance: {walletBalance?.toFixed(2) || "0.00"} USDC
            </div>
          </div>

          <div className="flex gap-2">
            {["0.5", "1", "5", "10"].map((amount) => (
              <button
                key={amount}
                onClick={() => setBetAmount(amount)}
                className="flex-1 bg-green-700/30 hover:bg-green-600/40 rounded-lg py-2 text-sm font-medium transition-colors"
              >
                {amount}
              </button>
            ))}
          </div>

          <button
            onClick={handlePlaceBet}
            disabled={!betValidation.isValid || isProcessing}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 py-4 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? "Processing…" : `Place Bet (${betAmount} USDC)`}
          </button>

          {txHash && (
            <div className="text-xs text-gray-400 bg-green-900/20 border border-green-500/30 rounded p-2">
              ✓ Transaction:{" "}
              <a
                target="_blank"
                rel="noreferrer"
                href={`https://basescan.org/tx/${txHash}`}
                className="underline hover:text-green-400"
              >
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </a>
            </div>
          )}
        </div>
      )}

      {isConnected && !canPlaceBet && roundData?.phase === "BETTING" && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 text-center">
          <div className="text-yellow-400 font-medium">
            {walletBalance === 0
              ? "Insufficient USDC balance"
              : myBet
                ? "You've already placed a bet"
                : "Betting closed for this round"}
          </div>
        </div>
      )}

      {!isConnected && (
        <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4 text-center">
          <div className="text-green-400 font-extrabold mb-3">
            🔗 Connect wallet to play
          </div>
          <p className="text-sm text-green-300 mb-3">
            Connect your wallet to start placing bets and playing
          </p>
          {/* Wallet connection UI can be added here */}
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
          <div className="text-red-400 text-sm">⚠️ {error}</div>
        </div>
      )}
    </div>
  );
};

export default BetControls;
