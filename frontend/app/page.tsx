"use client";

import { useEffect } from "react";
import { sdk } from '@farcaster/miniapp-sdk';
import AviatorGameScreen from "../components/gameScreen";

export default function Home() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);
  
  return (
      <AviatorGameScreen />
  );
}
