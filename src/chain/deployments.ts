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
    address: '0xf23537eF06fC1283F5be80676418b71aEd81b7E5',
    txHash:
      '0xad6add1a199752673612295dcc8fd351ac9c33054aa91945708168fdb551606e',
    deployedAt: '2026-05-16T00:44:07.978Z',
    deployer: '0xfa4D920d5592289A1A0F73CA49D626EF8FE4D695',
  },
  /**
   * v1 identity-binding contract (LayerZero-era + bare-passkey path).
   * The v2 NullifierRegistry will replace its role in the new identity
   * rail. Kept here so the API can surface both during the migration.
   */
  OffshoreSyncReceiver: {
    address: '0xa8F46B15F53D619584a00b91559e37233869ab5a',
    txHash:
      '0x0872935c5d37d1e4a211b1941d84679848d4c323f1d46bd749287990c4278404',
    deployedAt: '2026-05-23T23:06:07.075Z',
    deployer: '0xfa4D920d5592289A1A0F73CA49D626EF8FE4D695',
  },
  /** Escrow contract — paid maritime contracts. */
  OffshoreSyncEscrow: {
    address: '0x22281d75CF1d34421e5Fc58625885b46dC309723',
    txHash:
      '0x4edc59dc61740f921208dd66f589f7b7f4386e7c54e675b806d9ee537aa08695',
    deployedAt: '2026-05-23T23:06:07.075Z',
    deployer: '0xfa4D920d5592289A1A0F73CA49D626EF8FE4D695',
  },
  /**
   * v2 — allow-list of trusted Self TEE attester ECDSA addresses.
   * Owner: deployer. Initial attester is the secp256k1 address whose
   * privkey lives (from Session 3) as a Cloudflare-managed secret on
   * `cofferdam-attester`.
   */
  SelfAttesterRegistry: {
    address: '0x723879D9bF2F3d63cEB295F22Cb9382a62c89D6e',
    txHash:
      '0xfdf6b503a4a3e996fde55a16afd24f59aaf50b23f466d988c6b4779950bd3b18',
    deployedAt: '2026-05-31T00:44:11.407Z',
    deployer: '0xfa4D920d5592289A1A0F73CA49D626EF8FE4D695',
  },
  /**
   * v2 — one-shot Self.xyz nullifier ↔ account binding. Wired to the
   * existing Verifier_vc_and_disclose and the new SelfAttesterRegistry.
   * Locked to scope `cofferdam-sepolia` (uint256
   * `4110595171224311359414942497373057058713959593849800517221207032372881193556`,
   * Poseidon of endpoint=`cofferdam.xyz` × scope=`cofferdam-sepolia`).
   */
  NullifierRegistry: {
    address: '0x49b1E58fAdfA287Ed59299DC14D298b8fdf3d3ba',
    txHash:
      '0x7a18939eb188a75d3568c3838af83b7f940d37d52e539770397d5ddb1f591138',
    deployedAt: '2026-05-31T00:44:11.407Z',
    deployer: '0xfa4D920d5592289A1A0F73CA49D626EF8FE4D695',
  },
} as const satisfies Record<string, ContractDeployment>;

export type ContractName = keyof typeof SEPOLIA_DEPLOYMENTS;
