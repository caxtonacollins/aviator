"use client";

import React, { useState, useEffect } from "react";
import { useGameContext } from "@/context/GameContext";
import { useBetValidation } from "@/hooks/useBetValidation";
import useUSDC from "@/hooks/useUSDC";

const BetControls: React.FC = () => {
  const { roundData, placeBet, cashOut } = useGameContext();
  const { walletBalance, walletAddress } = useUSDC();
  const [betAmount, setBetAmount] = useState("1");
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const betValidation = useBetValidation(betAmount, walletBalance || 0);

  const handlePlaceBet = async () => {
    if (!walletBalance) return; // Don't proceed if we don't have a balance
    if (!betValidation.isValid) return;
    
    setIsProcessing(true);
    setTxHash(null);
    try {
      const res = await placeBet(walletAddress, parseFloat(betAmount));
      if (res?.success) setTxHash(res.txHash || null);
    } catch (err) {
      console.error("Error placing bet:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const myBet = roundData?.players?.find(
    (p: any) => p.address.toLowerCase() === walletAddress?.toLowerCase()
  ) || null;

  const handleCashOut = () => {
    if (!walletAddress || !myBet?.id) return;
    cashOut(myBet.id);
  };

  return (
    <div className="bg-black/50 backdrop-blur-sm border-t border-purple-500/30 p-4 space-y-3">
      {myBet && (
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-3 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400">
              Your Bet: {myBet.amount.toFixed(2)} USDC
            </div>
            {myBet.cashedOut && myBet.payout && (
              <div className="text-green-400 font-medium">
                Cashed Out at {myBet.cashoutMultiplier?.toFixed(2)}x
              </div>
            )}
          </div>
          {roundData?.phase === "FLYING" && !myBet.cashedOut && (
            <button
              onClick={handleCashOut}
              className="bg-green-600 px-6 py-2 rounded-lg font-bold"
            >
              CASH OUT
            </button>
          )}
        </div>
      )}

      {roundData?.phase === "BETTING" && walletBalance! > 0 && !myBet && (
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">
              Bet Amount (USDC)
            </label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              step="0.01"
              min="1"
              max={walletBalance!.toString()}
              className="w-full bg-purple-900/30 border border-purple-500/30 rounded-lg px-4 py-3 text-white text-lg font-medium"
            />
            {!betValidation.isValid && (
              <div className="text-red-400 text-xs mt-1">
                {betValidation.error}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {['1', '5', '10', '50'].map((amount) => (
              <button
                key={amount}
                onClick={() => setBetAmount(amount)}
                className="flex-1 bg-purple-700/30 rounded-lg py-2"
              >
                {amount}
              </button>
            ))}
          </div>

          <button
            onClick={handlePlaceBet}
            disabled={!betValidation.isValid || isProcessing}
            className="w-full bg-linear-to-r from-purple-600 to-pink-600 py-4 rounded-lg font-bold disabled:opacity-50"
          >
            {isProcessing ? 'Processing…' : `Place Bet (${betAmount} USDC)`}
          </button>

          {txHash && (
            <div className="text-xs text-gray-400 mt-2">
              Transaction: <a target="_blank" rel="noreferrer" href={`https://etherscan.io/tx/${txHash}`} className="underline">{txHash}</a>
            </div>
          )}
        </div>
      )}

      {!walletAddress && (
        <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4 text-center">
          <div className="text-blue-400 font-extrabold mb-2">
            Connect wallet to play
          </div>
          {/* <button
            onClick={wallet.connect}
            className="bg-blue-600 px-6 py-2 rounded-lg font-medium"
          >
            Connect Wallet
          </button> */}
        </div>
      )}
    </div>
  );
};

export default BetControls;
