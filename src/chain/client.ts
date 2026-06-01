// Copyright (c) 2026 OffshoreSync LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * viem public client for ZKSync Era Sepolia.
 *
 * Read-only. Signing happens client-side in the RN app (passkey-bound)
 * or in cofferdam-attester (SelfAttester signing key). This Worker
 * never holds private keys for chain interaction.
 */

import { createPublicClient, http } from 'viem';
import { zksyncSepoliaTestnet } from 'viem/chains';

/**
 * Sepolia public client type, inferred from `createPublicClient` so the
 * chain-bound shape (`zksyncSepoliaTestnet`) is preserved. Avoids the
 * unrelated-PublicClient-generic structural-mismatch noise from viem v2.
 */
export type SepoliaClient = ReturnType<typeof buildSepoliaClient>;

function buildSepoliaClient(rpcUrl: string) {
  return createPublicClient({
    chain: zksyncSepoliaTestnet,
    transport: http(rpcUrl),
  });
}

/** Lazily-constructed and request-scoped — Workers re-use across invocations on the same isolate. */
let cachedClient: SepoliaClient | null = null;
let cachedRpcUrl: string | null = null;

/**
 * Get (or build) the Sepolia public client. Re-builds if the configured
 * RPC URL changes (which it shouldn't at runtime, but defensive).
 */
export function getSepoliaClient(rpcUrl: string): SepoliaClient {
  if (cachedClient && cachedRpcUrl === rpcUrl) {
    return cachedClient;
  }
  cachedClient = buildSepoliaClient(rpcUrl);
  cachedRpcUrl = rpcUrl;
  return cachedClient;
}
