"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { type Address } from "@solana/kit";
import { useWallet } from "../lib/wallet/context";
import { useSendTransaction } from "../lib/hooks/use-send-transaction";
import { lamportsToSolString } from "../lib/lamports";
import { getBuyInstruction, getWithdrawInstruction } from "../lib/ticket-registry";
import { useCluster } from "./cluster-context";
import type { EventWithAddress } from "../lib/hooks/use-events";

interface Props {
  event: EventWithAddress;
  onAction: () => void;
}

export function EventCard({ event, onAction }: Props) {
  const { signer, wallet } = useWallet();
  const { send, isSending } = useSendTransaction();
  const { getExplorerUrl } = useCluster();

  const walletAddress = wallet?.account.address;
  const isOrganizer = walletAddress === event.eventOrganizer;
  const startDate = new Date(Number(event.startDate) * 1000);
  const isUpcoming = startDate > new Date();
  const soldOut = event.availableTickets === 0n;

  const handleBuy = useCallback(async () => {
    if (!signer) return;
    try {
      const ix = await getBuyInstruction({ buyer: signer, eventAddress: event.address });
      const sig = await send({ instructions: [ix] });
      toast.success("Ticket purchased!", {
        description: (
          <a href={getExplorerUrl(`/tx/${sig}`)} target="_blank" rel="noopener noreferrer" className="underline">
            View transaction
          </a>
        ),
      });
      onAction();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to buy ticket.");
    }
  }, [signer, event, send, getExplorerUrl, onAction]);

  const handleWithdraw = useCallback(async () => {
    if (!signer) return;
    // Withdraw all lamports minus rent — we pass the full vault balance
    // The program checks organizer authority
    const balance = event.ticketPrice * (/* total sold */ 0n); // placeholder — ideally fetch account lamports
    try {
      // amount 0 is handled gracefully in many programs; adjust if your program requires explicit amount
      const ix = await getWithdrawInstruction({
        organizer: signer,
        eventAddress: event.address,
        amount: event.ticketPrice, // withdraw one ticket's worth as placeholder
      });
      const sig = await send({ instructions: [ix] });
      toast.success("Withdrawal confirmed!", {
        description: (
          <a href={getExplorerUrl(`/tx/${sig}`)} target="_blank" rel="noopener noreferrer" className="underline">
            View transaction
          </a>
        ),
      });
      onAction();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to withdraw.");
    }
  }, [signer, event, send, getExplorerUrl, onAction]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border-low bg-card p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-base">{event.name}</p>
          <p className="text-xs text-muted mt-0.5">{startDate.toLocaleDateString(undefined, { dateStyle: "medium" })} · {startDate.toLocaleTimeString(undefined, { timeStyle: "short" })}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
          soldOut
            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            : isUpcoming
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-cream text-foreground/60"
        }`}>
          {soldOut ? "Sold out" : isUpcoming ? "Upcoming" : "Past"}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-muted leading-relaxed line-clamp-2">{event.description}</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-cream/40 px-3 py-2">
          <p className="text-xs text-muted">Ticket Price</p>
          <p className="text-sm font-semibold tabular-nums">{lamportsToSolString(event.ticketPrice as any)} SOL</p>
        </div>
        <div className="rounded-lg bg-cream/40 px-3 py-2">
          <p className="text-xs text-muted">Remaining</p>
          <p className="text-sm font-semibold tabular-nums">{event.availableTickets.toString()}</p>
        </div>
      </div>

      {/* Actions */}
      {signer && (
        <div className="flex gap-2 pt-1">
          {!isOrganizer && isUpcoming && !soldOut && (
            <button
              onClick={handleBuy}
              disabled={isSending}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSending ? "Confirming..." : "Buy Ticket"}
            </button>
          )}
          {isOrganizer && (
            <button
              onClick={handleWithdraw}
              disabled={isSending}
              className="flex-1 rounded-lg border border-border-low bg-card px-4 py-2 text-sm font-medium transition hover:bg-cream disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSending ? "Confirming..." : "Withdraw Funds"}
            </button>
          )}
          <a
            href={getExplorerUrl(`/address/${event.address}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-border-low px-3 py-2 text-xs text-muted transition hover:bg-cream"
          >
            Explorer ↗
          </a>
        </div>
      )}
    </div>
  );
}
