"use client";
import { ReactNode } from "react";
import { base } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, http, createConfig } from "wagmi";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import "@coinbase/onchainkit/styles.css";

// Create a QueryClient instance for react-query
const queryClient = new QueryClient();

// Configure wagmi with multiple wallet connectors
const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    injected({ target: "metaMask" }),
    coinbaseWallet({
      appName: "Aviator",
      preference: "all", // Support both smart wallet and EOA
    }),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
      metadata: {
        name: "Aviator",
        description: "Aviator - Multiply your fund with fun",
        url: process.env.NEXT_PUBLIC_URL || "https://aviator-sand.vercel.app",
        icons: ["https://aviator-sand.vercel.app/logo.png"],
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [base.id]: http(),
  },
});

export function RootProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={base}
          config={{
            appearance: {
              mode: "auto",
            },
            wallet: {
              display: "modal",
              preference: "all",
            },
          }}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
