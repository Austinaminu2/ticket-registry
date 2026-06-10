"use client";

import useSWR from "swr";
import { type Address } from "@solana/kit";
import { useCluster } from "../../components/cluster-context";
import { useSolanaClient } from "../solana-client-context";
import {
  TICKET_REGISTRY_PROGRAM_ID,
  decodeEventAccount,
  type EventAccount,
} from "../ticket-registry";

export type EventWithAddress = EventAccount & { address: Address };

export function useEvents() {
  const { cluster } = useCluster();
  const client = useSolanaClient();

  const { data, isLoading, error, mutate } = useSWR(
    ["events", cluster] as const,
    async () => {
      const result = await client.rpc
        .getProgramAccounts(TICKET_REGISTRY_PROGRAM_ID, {
          encoding: "base64",
          filters: [{ dataSize: 8 + 4 + 30 + 4 + 300 + 8 + 8 + 32 + 8 }],
        })
        .send();

      return result
        .map((item) => {
          try {
            const raw = item.account.data as unknown as [string, string];
            const bytes = Uint8Array.from(atob(raw[0]), (c) => c.charCodeAt(0));
            return { address: item.pubkey as Address, ...decodeEventAccount(bytes) };
          } catch {
            return null;
          }
        })
        .filter((e): e is EventWithAddress => e !== null);
    },
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );

  return { events: data ?? [], isLoading, error, mutate };
}
