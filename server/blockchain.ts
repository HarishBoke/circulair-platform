/**
 * Blockchain Anchoring Module
 * Produces SHA-256 content hashes and simulates Polygon L2 transaction anchoring.
 * In production, replace the simulated tx with a real ethers.js/viem call to
 * a deployed AnchorRegistry contract on Polygon Mumbai or Mainnet.
 */

import crypto from "crypto";

export type AnchorEventType =
  | "bpan_registration"
  | "soh_prediction"
  | "epr_token_issuance"
  | "compliance_report"
  | "marketplace_transaction"
  | "logistics_dispatch"
  | "data_sharing_consent";

export interface AnchorInput {
  eventType: AnchorEventType;
  bpan?: string;
  /** The data object to hash and anchor */
  payload: Record<string, unknown>;
  /** Target network */
  network?: "polygon-mumbai" | "polygon-mainnet" | "ethereum-mainnet";
}

export interface AnchorResult {
  dataHash: string;
  txHash: string;
  blockNumber: number;
  network: string;
  anchoredAt: Date;
  verificationUrl: string;
}

/**
 * Compute a deterministic SHA-256 hash of a JSON payload.
 * Keys are sorted for canonical serialization.
 */
export function hashPayload(payload: Record<string, unknown>): string {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/**
 * Simulate anchoring a hash to Polygon L2.
 * In production: replace with ethers.js contract call.
 */
export async function anchorToBlockchain(input: AnchorInput): Promise<AnchorResult> {
  const { payload, network = "polygon-mumbai" } = input;

  const dataHash = hashPayload(payload);

  // Simulate a deterministic-but-unique tx hash by hashing the data hash + timestamp
  const timestamp = Date.now();
  const txSeed = `${dataHash}:${timestamp}:${network}`;
  const txHash = "0x" + crypto.createHash("sha256").update(txSeed).digest("hex").slice(0, 64);

  // Simulate a realistic block number (Polygon produces ~2 blocks/sec)
  const POLYGON_GENESIS_BLOCK = 0;
  const BLOCKS_PER_SECOND = 2;
  const blockNumber =
    POLYGON_GENESIS_BLOCK + Math.floor((timestamp / 1000) * BLOCKS_PER_SECOND);

  const anchoredAt = new Date(timestamp);

  const explorerBase =
    network === "polygon-mainnet"
      ? "https://polygonscan.com/tx/"
      : network === "ethereum-mainnet"
        ? "https://etherscan.io/tx/"
        : "https://mumbai.polygonscan.com/tx/";

  return {
    dataHash,
    txHash,
    blockNumber,
    network,
    anchoredAt,
    verificationUrl: `${explorerBase}${txHash}`,
  };
}

/**
 * Verify that a stored hash matches a re-computed hash of the payload.
 */
export function verifyAnchor(
  payload: Record<string, unknown>,
  storedHash: string
): { valid: boolean; computedHash: string } {
  const computedHash = hashPayload(payload);
  return {
    valid: computedHash === storedHash,
    computedHash,
  };
}
