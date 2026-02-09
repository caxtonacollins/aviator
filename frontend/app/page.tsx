"use client";

import { useEffect } from "react";
import AviatorGameScreen from "../components/gameScreen";
import { isFarcasterContext } from "@/lib/utils";

export default function Home() {
  useEffect(() => {
    // Only initialize Farcaster SDK if running in Farcaster miniapp context
    if (isFarcasterContext()) {
      // Dynamic import to avoid errors in non-Farcaster contexts
      import('@farcaster/miniapp-sdk').then(({ sdk }) => {
        sdk.actions.ready();
      }).catch((error) => {
        console.warn('Farcaster SDK not available:', error);
      });
    }
  }, []);
  
  return (
      <AviatorGameScreen />
  );
}
