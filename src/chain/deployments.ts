// Copyright (c) 2026 OffshoreSync LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * ZKSync Era Sepolia contract deployments.
 *
 * **Source of truth.** Vendored from
 * `/Users/hoff/OffshoreSync/contracts/deployments/zkSyncSepolia.json`,
 * which is updated by the deploy scripts in `contracts/scripts/`.
 *
 * Re-vendor (manually for now) when a new contract deploys. A later
 * session will auto-generate this file from the canonical JSON; for
 * Session 1 we accept the small duplication so the Worker stays
 * dependency-free with respect to the contracts package.
 */

import type { Address } from 'viem';

export interface ContractDeployment {
  /** EIP-55 checksum address. */
  readonly address: Address;
  /** Tx hash of the deploy. */
  readonly txHash: `0x${string}`;
  /** ISO-8601 timestamp when the deploy mined. */
  readonly deployedAt: string;
  /** Deployer EOA. */
  readonly deployer: Address;
}

/** ZKSync Era Sepolia chain id. */
export const ZKSYNC_SEPOLIA_CHAIN_ID = 300 as const;

/**
 * All Cofferdam-relevant contracts deployed on ZKSync Era Sepolia.
 *
 * Includes the v2 identity rail (SelfAttesterRegistry + NullifierRegistry)
 * deployed in Session 2 (2026-05-30), wired to the existing
 * Verifier_vc_and_disclose under the per-environment scope
 * `cofferdam-sepolia`.
 */
export const SEPOLIA_DEPLOYMENTS = {
  /** Self.xyz vc-and-disclose Groth16 verifier. Already deployed 2026-05-16. */
  Verifier_vc_and_disclose: {
    address: '0xab4A3De2322d2c2e60531c71c158491a57C43910',
    txHash:
      '0x45bb91768804ee4770c99b6f8ef41842f985cdd9da63c69486eb8d1272aa9b82',
    deployedAt: '2026-06-06T00:26:42.809Z',
    deployer: '0x2c8A01e971d7C51B3B78f9F08c57c45584D96AB2',
  },
  /**
   * v1 identity-binding contract (LayerZero-era + bare-passkey path).
   * The v2 NullifierRegistry will replace its role in the new identity
   * rail. Kept here so the API can surface both during the migration.
   */
  CofferdamReceiver: {
    address: '0x6b4D8580f72C1D3Eb9825aD6EE56c67ED0F1B9Bb',
    txHash:
      '0x4cad22db7ae3a685979d82218403a165a56b97b58977bb4116dc2da0db22ed3a',
    deployedAt: '2026-06-06T00:28:20.532Z',
    deployer: '0x2c8A01e971d7C51B3B78f9F08c57c45584D96AB2',
  },
  /** Escrow contract — paid maritime contracts. */
  CofferdamSpotEscrow: {
    address: '0x2F22FE817dAA3Bff101f888C94F3ce0814880535',
    txHash:
      '0x1e72978b96061434d37397e66bf41945e6b7a2c7e44ab387f5fcabfa804a6b38',
    deployedAt: '2026-06-06T00:28:20.532Z',
    deployer: '0x2c8A01e971d7C51B3B78f9F08c57c45584D96AB2',
  },
  /**
   * v2 — allow-list of trusted Self TEE attester ECDSA addresses.
   * Owner: deployer. Initial attester is the secp256k1 address whose
   * privkey lives (from Session 3) as a Cloudflare-managed secret on
   * `cofferdam-attester`.
   */
  SelfAttesterRegistry: {
    address: '0x2eC27Ab96A6948e20Cc954Cb900723D169e3eFe9',
    txHash:
      '0x8998ce71bbef8fea9d2db0030c1048587d4a7ee0182aef6767af6a4ac0180f8b',
    deployedAt: '2026-06-06T00:29:13.558Z',
    deployer: '0x2c8A01e971d7C51B3B78f9F08c57c45584D96AB2',
  },
  /**
   * v2 — one-shot Self.xyz nullifier ↔ account binding. Wired to the
   * existing Verifier_vc_and_disclose and the new SelfAttesterRegistry.
   * Locked to scope `cofferdam-sepolia` (uint256
   * `4110595171224311359414942497373057058713959593849800517221207032372881193556`,
   * Poseidon of endpoint=`cofferdam.xyz` × scope=`cofferdam-sepolia`).
   */
  NullifierRegistry: {
    address: '0x8b26DE05470961DE31691bCBdE3de8A3572F8AdC',
    txHash:
      '0x290e1f6bd41a56dcfcab6e2cdb48902fb4e1c853ed07b7358ea508f34b9613f1',
    deployedAt: '2026-06-06T00:29:13.558Z',
    deployer: '0x2c8A01e971d7C51B3B78f9F08c57c45584D96AB2',
  },
} as const satisfies Record<string, ContractDeployment>;

export type ContractName = keyof typeof SEPOLIA_DEPLOYMENTS;
