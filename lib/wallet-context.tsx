"use client";

import { createContext, useContext, useCallback, useEffect, type ReactNode } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { setActiveProvider } from "./sdk";

interface WalletContextValue {
  address: string | null;
  connecting: boolean;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();

  // Gate on `authenticated` so address clears the instant Privy logs out,
  // even before useWallets() re-renders with an empty array.
  const address = authenticated && wallets[0]?.address ? wallets[0].address : null;

  // Keep the active provider in sync with whatever wallet Privy has connected.
  // escrow.ts and skill-card.tsx both call getProvider(), which will now return
  // this wallet's EIP-1193 provider instead of the Base Account SDK default.
  useEffect(() => {
    if (!wallets[0]) {
      setActiveProvider(null);
      return;
    }
    wallets[0].getEthereumProvider().then(setActiveProvider);
  }, [wallets]);

  const connect    = useCallback(() => login(),  [login]);
  const disconnect = useCallback(() => logout(), [logout]);

  return (
    <WalletContext.Provider value={{ address, connecting: !ready, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

export function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
