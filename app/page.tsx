"use client";

import { useState } from "react";
import { lamports as sol } from "@solana/kit";
import { toast } from "sonner";
import { useWallet } from "./lib/wallet/context";
import { useBalance } from "./lib/hooks/use-balance";
import { useEvents } from "./lib/hooks/use-events";
import { lamportsToSolString } from "./lib/lamports";
import { useSolanaClient } from "./lib/solana-client-context";
import { ellipsify } from "./lib/explorer";
import { GridBackground } from "./components/grid-background";
import { ThemeToggle } from "./components/theme-toggle";
import { ClusterSelect } from "./components/cluster-select";
import { WalletButton } from "./components/wallet-button";
import { useCluster } from "./components/cluster-context";
import { CreateEventForm } from "./components/create-event-form";
import { EventCard } from "./components/event-card";

export default function Home() {
  const { wallet, status } = useWallet();
  const { cluster, getExplorerUrl } = useCluster();
  const client = useSolanaClient();
  const { events, isLoading, mutate } = useEvents();

  const address = wallet?.account.address;
  const balance = useBalance(address);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAirdrop = async () => {
    if (!address) return;
    try {
      toast.info("Requesting airdrop...");
      const sig = await client.airdrop(address, sol(1_000_000_000n));
      toast.success("Airdrop received!", {
        description: sig ? (
          <a href={getExplorerUrl(`/tx/${sig}`)} target="_blank" rel="noopener noreferrer" className="underline">
            View transaction
          </a>
        ) : undefined,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimited = msg.includes("429") || msg.includes("Internal JSON-RPC error");
      toast.error(
        isRateLimited ? "Devnet faucet rate-limited. Use the web faucet instead." : "Airdrop failed.",
        isRateLimited
          ? { description: <a href="https://faucet.solana.com/" target="_blank" rel="noopener noreferrer" className="underline">Open faucet.solana.com</a> }
          : undefined
      );
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <GridBackground />

      <div className="relative z-10">
        {/* Header */}
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold tracking-tight">Ticket Registry</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ClusterSelect />
            <WalletButton />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 pb-20">
          {/* Hero */}
          <section className="pt-6 pb-12">
            <h1 className="font-black tracking-tight">
              <span className="block text-6xl md:text-7xl">Ticket</span>
              <span className="block text-7xl md:text-8xl">Registry</span>
            </h1>
            <p className="mt-4 max-w-lg text-base text-foreground/50 leading-relaxed">
              Create events, sell tickets on-chain and withdraw proceeds.
            </p>
          </section>

          <div className="space-y-8">
            {/* Wallet Balance */}
            {status === "connected" && address && (
              <section className="relative w-full overflow-hidden rounded-2xl border border-border-low bg-card px-5 py-5">
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Wallet Balance</span>
                    <button
                      onClick={handleCopy}
                      className="flex cursor-pointer items-center gap-1.5 font-mono text-xs text-muted transition hover:text-foreground"
                    >
                      {ellipsify(address, 4)}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                        {copied ? <path d="M20 6 9 17l-5-5" /> : <><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></>}
                      </svg>
                    </button>
                  </div>
                  {cluster !== "mainnet" && (
                    <button onClick={handleAirdrop} className="cursor-pointer rounded-lg border border-border-low px-3 py-1.5 text-xs font-medium transition hover:bg-cream">
                      Airdrop
                    </button>
                  )}
                </div>
                <p className="mt-4 font-mono text-4xl font-bold tabular-nums tracking-tight">
                  {balance.lamports != null ? lamportsToSolString(balance.lamports) : "—"}
                  <span className="ml-1.5 text-lg font-normal text-muted">SOL</span>
                </p>
              </section>
            )}

            {/* Create Event */}
            {status === "connected" && (
              <CreateEventForm onCreated={() => mutate()} />
            )}

            {/* Events List */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-lg">Events</p>
                <span className="text-xs text-muted">{events.length} total</span>
              </div>

              {status !== "connected" && (
                <div className="rounded-2xl border border-border-low bg-card p-8 text-center text-sm text-muted">
                  Connect your wallet to create events and buy tickets.
                </div>
              )}

              {status === "connected" && isLoading && (
                <div className="rounded-2xl border border-border-low bg-card p-8 text-center text-sm text-muted">
                  Loading events...
                </div>
              )}

              {status === "connected" && !isLoading && events.length === 0 && (
                <div className="rounded-2xl border border-border-low bg-card p-8 text-center text-sm text-muted">
                  No events yet. Create one above.
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                  <EventCard key={event.address} event={event} onAction={() => mutate()} />
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
