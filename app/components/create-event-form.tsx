"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useWallet } from "../lib/wallet/context";
import { useSendTransaction } from "../lib/hooks/use-send-transaction";
import { getInitializeInstruction } from "../lib/ticket-registry";
import { useCluster } from "./cluster-context";

interface Props {
  onCreated: () => void;
}

export function CreateEventForm({ onCreated }: Props) {
  const { signer } = useWallet();
  const { send, isSending } = useSendTransaction();
  const { getExplorerUrl } = useCluster();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [availableTickets, setAvailableTickets] = useState("");
  const [startDate, setStartDate] = useState("");

  const reset = () => {
    setName("");
    setDescription("");
    setTicketPrice("");
    setAvailableTickets("");
    setStartDate("");
  };

  const handleSubmit = useCallback(async () => {
    if (!signer) return;

    if (!name || !description || !ticketPrice || !availableTickets || !startDate) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (name.length > 30) {
      toast.error("Event name must be 30 characters or less.");
      return;
    }
    if (description.length > 300) {
      toast.error("Description must be 300 characters or less.");
      return;
    }

    const startTimestamp = BigInt(Math.floor(new Date(startDate).getTime() / 1000));
    if (startTimestamp <= BigInt(Math.floor(Date.now() / 1000))) {
      toast.error("Start date must be in the future.");
      return;
    }

    try {
      const priceLamports = BigInt(Math.round(parseFloat(ticketPrice) * 1_000_000_000));
      const tickets = BigInt(parseInt(availableTickets, 10));

      const ix = await getInitializeInstruction({
        organizer: signer,
        name,
        description,
        ticketPrice: priceLamports,
        availableTickets: tickets,
        startDate: startTimestamp,
      });

      const sig = await send({ instructions: [ix] });
      toast.success("Event created!", {
        description: (
          <a href={getExplorerUrl(`/tx/${sig}`)} target="_blank" rel="noopener noreferrer" className="underline">
            View transaction
          </a>
        ),
      });
      reset();
      setOpen(false);
      onCreated();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to create event.");
    }
  }, [signer, name, description, ticketPrice, availableTickets, startDate, send, getExplorerUrl, onCreated]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-xs transition hover:bg-primary/90"
      >
        + Create Event
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border-low bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold">Create Event</p>
        <button onClick={() => { setOpen(false); reset(); }} className="text-muted hover:text-foreground text-sm">
          Cancel
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted">Event Name (max 30 chars)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            placeholder="My Concert"
            className="w-full rounded-lg border border-border-low bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground/30 disabled:opacity-50"
            disabled={isSending}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Start Date</label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-border-low bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground/30 disabled:opacity-50"
            disabled={isSending}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Ticket Price (SOL)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={ticketPrice}
            onChange={(e) => setTicketPrice(e.target.value)}
            placeholder="0.1"
            className="w-full rounded-lg border border-border-low bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground/30 disabled:opacity-50"
            disabled={isSending}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Available Tickets</label>
          <input
            type="number"
            min="1"
            step="1"
            value={availableTickets}
            onChange={(e) => setAvailableTickets(e.target.value)}
            placeholder="100"
            className="w-full rounded-lg border border-border-low bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground/30 disabled:opacity-50"
            disabled={isSending}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted">Description (max 300 chars)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="Describe your event..."
          className="w-full rounded-lg border border-border-low bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground/30 resize-none disabled:opacity-50"
          disabled={isSending}
        />
        <p className="text-xs text-muted text-right">{description.length}/300</p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSending}
        className="w-full rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-xs transition hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
      >
        {isSending ? "Confirming..." : "Create Event"}
      </button>
    </div>
  );
}
