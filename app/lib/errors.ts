import { isSolanaError, SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM } from "@solana/kit";

// Anchor error codes from TicketRegistryError enum (0-indexed)
const ERROR_MESSAGES: Record<number, string> = {
  0: "Name too long",
  1: "Description too long",
  2: "Start date is in the past",
  3: "Available ticket count is too low",
  4: "All tickets sold out",
  5: "Only the event organizer can withdraw",
  6: "Insufficient funds in event account",
};

export function parseTransactionError(err: unknown): string {
  if (err instanceof Error && err.message.includes("User rejected")) {
    return "Transaction was rejected by the wallet.";
  }

  if (
    isSolanaError(err, SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM) &&
    typeof err.context?.code === "number"
  ) {
    const msg = ERROR_MESSAGES[err.context.code];
    if (msg) return msg;
  }

  const message = getDeepestMessage(err);
  return message.length > 200 ? `${message.slice(0, 200)}...` : message;
}

function getDeepestMessage(err: unknown): string {
  let deepest = err instanceof Error ? err.message : String(err);
  let current: unknown = err;
  while (current instanceof Error && current.cause) {
    current = current.cause;
    if (current instanceof Error) deepest = current.message;
  }
  return deepest;
}
