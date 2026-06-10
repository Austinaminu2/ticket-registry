import {
  type Address,
  type TransactionSigner,
  type IInstruction,
  getUtf8Encoder,
  getBytesEncoder,
  fixEncoderSize,
  combineCodecs,
  getStructEncoder,
  getU64Encoder,
  getI64Encoder,
  getU8Encoder,
  getBytesDecoder,
  fixDecoderSize,
  getStructDecoder,
  getU64Decoder,
  getI64Decoder,
  getAddressEncoder,
  getAddressDecoder,
  getProgramDerivedAddress,
  getUtf8Decoder,
  getU32Encoder,
  getU32Decoder,
  address,
} from "@solana/kit";

export const TICKET_REGISTRY_PROGRAM_ID =
  "9TbE4whxJ8dwvxtcR7UB9CDZGbRSpG4oL4EJAxNtjfCC" as Address;

// Anchor discriminators (first 8 bytes of sha256("global:<ix_name>"))
// These are computed at build time from the IDL
const DISCRIMINATORS = {
  initialize: new Uint8Array([175, 175, 109, 31, 13, 152, 155, 237]),
  buy: new Uint8Array([102, 6, 61, 18, 1, 218, 235, 234]),
  withdraw: new Uint8Array([183, 18, 70, 156, 148, 109, 161, 34]),
} as const;

function anchorDiscriminator(name: string): Uint8Array {
  // For use at runtime if needed — discriminators above are pre-computed
  void name;
  return new Uint8Array(8);
}

// ---- PDAs ----

export async function getEventPda(
  name: string,
  organizer: Address
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: TICKET_REGISTRY_PROGRAM_ID,
    seeds: [
      getUtf8Encoder().encode("event"),
      getUtf8Encoder().encode(name),
      getAddressEncoder().encode(organizer),
    ],
  });
  return pda;
}

export async function getTicketPda(
  eventAddress: Address,
  buyer: Address
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: TICKET_REGISTRY_PROGRAM_ID,
    seeds: [
      getUtf8Encoder().encode("ticket"),
      getAddressEncoder().encode(eventAddress),
      getAddressEncoder().encode(buyer),
    ],
  });
  return pda;
}

// ---- Account decoders ----

export type EventAccount = {
  name: string;
  description: string;
  ticketPrice: bigint;
  availableTickets: bigint;
  eventOrganizer: Address;
  startDate: bigint;
};

export type TicketAccount = {
  event: Address;
  buyer: Address;
  price: bigint;
};

function decodeString(data: Uint8Array, offset: number): [string, number] {
  const len = new DataView(data.buffer, data.byteOffset + offset).getUint32(
    0,
    true
  );
  const str = new TextDecoder().decode(
    data.subarray(offset + 4, offset + 4 + len)
  );
  return [str, offset + 4 + len];
}

function decodeU64(data: Uint8Array, offset: number): [bigint, number] {
  const val = new DataView(data.buffer, data.byteOffset + offset).getBigUint64(
    0,
    true
  );
  return [val, offset + 8];
}

function decodeI64(data: Uint8Array, offset: number): [bigint, number] {
  const val = new DataView(data.buffer, data.byteOffset + offset).getBigInt64(
    0,
    true
  );
  return [val, offset + 8];
}

function decodeAddress(data: Uint8Array, offset: number): [Address, number] {
  const bytes = data.subarray(offset, offset + 32);
  const b58 = encodeBase58(bytes);
  return [b58 as Address, offset + 32];
}

// Minimal base58 encoder for Solana addresses
const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function encodeBase58(bytes: Uint8Array): string {
  let num = 0n;
  for (const byte of bytes) {
    num = num * 256n + BigInt(byte);
  }
  let encoded = "";
  while (num > 0n) {
    encoded = BASE58_ALPHABET[Number(num % 58n)] + encoded;
    num /= 58n;
  }
  for (const byte of bytes) {
    if (byte === 0) encoded = "1" + encoded;
    else break;
  }
  return encoded;
}

export function decodeEventAccount(data: Uint8Array): EventAccount {
  // Skip 8-byte discriminator
  let offset = 8;
  const [name, o1] = decodeString(data, offset);
  offset = o1;
  const [description, o2] = decodeString(data, offset);
  offset = o2;
  const [ticketPrice, o3] = decodeU64(data, offset);
  offset = o3;
  const [availableTickets, o4] = decodeU64(data, offset);
  offset = o4;
  const [eventOrganizer, o5] = decodeAddress(data, offset);
  offset = o5;
  const [startDate] = decodeI64(data, offset);

  return { name, description, ticketPrice, availableTickets, eventOrganizer, startDate };
}

export function decodeTicketAccount(data: Uint8Array): TicketAccount {
  let offset = 8;
  const [evt, o1] = decodeAddress(data, offset);
  offset = o1;
  const [buyer, o2] = decodeAddress(data, offset);
  offset = o2;
  const [price] = decodeU64(data, offset);
  return { event: evt, buyer, price };
}

// ---- Instructions ----

function encodeString(value: string): Uint8Array {
  const encoded = new TextEncoder().encode(value);
  const buf = new Uint8Array(4 + encoded.length);
  new DataView(buf.buffer).setUint32(0, encoded.length, true);
  buf.set(encoded, 4);
  return buf;
}

function encodeU64(value: bigint): Uint8Array {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigUint64(0, value, true);
  return buf;
}

function encodeI64(value: bigint): Uint8Array {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigInt64(0, value, true);
  return buf;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

export async function getInitializeInstruction(params: {
  organizer: TransactionSigner;
  name: string;
  description: string;
  ticketPrice: bigint;
  availableTickets: bigint;
  startDate: bigint;
}): Promise<IInstruction> {
  const eventPda = await getEventPda(params.name, params.organizer.address);

  const data = concat(
    DISCRIMINATORS.initialize,
    encodeString(params.name),
    encodeString(params.description),
    encodeU64(params.ticketPrice),
    encodeU64(params.availableTickets),
    encodeI64(params.startDate)
  );

  return {
    programAddress: TICKET_REGISTRY_PROGRAM_ID,
    accounts: [
      { address: params.organizer.address, role: 3 }, // writable signer
      { address: eventPda, role: 1 },                  // writable
      { address: "11111111111111111111111111111111" as Address, role: 0 }, // system program readonly
    ],
    data,
  };
}

export async function getBuyInstruction(params: {
  buyer: TransactionSigner;
  eventAddress: Address;
}): Promise<IInstruction> {
  const ticketPda = await getTicketPda(params.eventAddress, params.buyer.address);

  const data = DISCRIMINATORS.buy;

  return {
    programAddress: TICKET_REGISTRY_PROGRAM_ID,
    accounts: [
      { address: params.buyer.address, role: 3 },      // writable signer
      { address: ticketPda, role: 1 },                  // writable
      { address: params.eventAddress, role: 1 },        // writable
      { address: "11111111111111111111111111111111" as Address, role: 0 },
    ],
    data,
  };
}

export async function getWithdrawInstruction(params: {
  organizer: TransactionSigner;
  eventAddress: Address;
  amount: bigint;
}): Promise<IInstruction> {
  const data = concat(DISCRIMINATORS.withdraw, encodeU64(params.amount));

  return {
    programAddress: TICKET_REGISTRY_PROGRAM_ID,
    accounts: [
      { address: params.organizer.address, role: 3 }, // writable signer
      { address: params.eventAddress, role: 1 },       // writable
      { address: "11111111111111111111111111111111" as Address, role: 0 },
    ],
    data,
  };
}
