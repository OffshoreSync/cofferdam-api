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
  /**
   * Authority tier, for the v2 authority-module singletons
   * (`PasskeyAuthority` / `WebAuthnPasskeyAuthority` / `SessionKeyAuthority`).
   * Mirrors the on-chain `Tier` enum. Absent for non-authority contracts.
   */
  readonly tier?: 'High' | 'LowManaged' | 'LowUntrusted';
  /** Authority `kind()` discriminator (e.g. `passkey`, `session`, `polis_sso`). */
  readonly kind?: string;
  /** WebAuthn authority only: whether assertions must carry the UV bit (always true). */
  readonly requireUserVerification?: boolean;
}

/** ZKSync Era Sepolia chain id. */
export const ZKSYNC_SEPOLIA_CHAIN_ID = 300 as const;

/**
 * All Cofferdam-relevant contracts deployed on ZKSync Era Sepolia.
 *
 * Includes the v2 identity rail (SelfAttesterRegistry + NullifierRegistry)
 * deployed in Session 2 (2026-05-30), wired to the existing
 * Verifier_vc_and_disclose under the per-environment scope
 * `cofferdam-sepolia`, and the v2 native account-abstraction
 * (passkey-authority) stack (CofferdamAccountFactory + CofferdamPaymaster +
 * the PasskeyAuthority / WebAuthnPasskeyAuthority / SessionKeyAuthority
 * singletons) deployed 2026-06-09/10, against which
 * `POST /v1/session/verify-attestation?checkOnChain` resolves a session
 * attestation's passkey to an active on-chain authority.
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

  // ── v2 native account-abstraction (passkey-authority) stack ────────────
  // Deployed 2026-06-09/10. The CofferdamAccountFactory deploys per-user
  // CofferdamSmartAccount instances (create2, no standalone impl address —
  // see `COFFERDAM_SMART_ACCOUNT` below) whose authority registry holds one
  // or more of these singleton authority modules. The RN app's High-tier
  // device passkey is the WebAuthnPasskeyAuthority; the `config` it stores is
  // `abi.encode(bytes32 qx, bytes32 qy)`.

  /** create2 factory for per-user CofferdamSmartAccount instances. */
  CofferdamAccountFactory: {
    address: '0x38d7879e53b751Be7E0B80f51a0995163C80D784',
    txHash:
      '0x242565d46dce4009e73e4aaa67f2030681057d45458ff39e405df7e54dc2dc2b',
    deployedAt: '2026-06-09T09:56:55.005Z',
    deployer: '0x2c8A01e971d7C51B3B78f9F08c57c45584D96AB2',
  },
  /** Open paymaster sponsoring account ops (gasless UX). */
  CofferdamPaymaster: {
    address: '0x799DDC064d544b48B6BE735Ec45a421641B9F322',
    txHash:
      '0x24736aedbeb1dc47a3d70baa7944807a4ef4e777d4c3e590cdd0045aa7738f63',
    deployedAt: '2026-06-09T09:56:55.005Z',
    deployer: '0x2c8A01e971d7C51B3B78f9F08c57c45584D96AB2',
  },
  /**
   * High-tier REAL platform-passkey authority (WebAuthn assertion). This is
   * the module the RN app registers (signature scheme `webauthn`); the
   * session-attestation verifier maps `alg === 'webauthn'` to this address.
   */
  WebAuthnPasskeyAuthority: {
    address: '0x48ae3e84f5686ABDaF7Ce213ABC7d6B6fe296696',
    txHash:
      '0x3eef7f29b9463f35ce223ebebfa61a7cd9e1107eecdaf1eeb8879de3c88ba292',
    deployedAt: '2026-06-10T04:01:51.877Z',
    deployer: '0x2c8A01e971d7C51B3B78f9F08c57c45584D96AB2',
    tier: 'High',
    kind: 'passkey',
    requireUserVerification: true,
  },
  /**
   * High-tier RAW P-256 passkey authority (bare `r||s` over the digest, used
   * by the software DeterministicPasskeySigner / PoC). The verifier maps
   * `alg === 'p256'` to this address.
   */
  PasskeyAuthority: {
    address: '0xeaaC5fF11be7B6A9DC3C88B9141B604eEEa2Fe71',
    txHash:
      '0x27a699bb3001de97d5878bf1a6f56b7b03345a4fef438ab28fdd2767209c10ff',
    deployedAt: '2026-06-10T04:01:51.877Z',
    deployer: '0x2c8A01e971d7C51B3B78f9F08c57c45584D96AB2',
    tier: 'High',
    kind: 'passkey',
  },
  /** Low-tier untrusted session-key authority (cannot manage authorities). */
  SessionKeyAuthority_LowUntrusted: {
    address: '0xaD8c0D9997A25B24F316Cb32D6b6a25BD0F2782F',
    txHash:
      '0xa546067d07fc1b20c07a3ffce0b730edc6a45199182dea02f8fa5de7d7d2a003',
    deployedAt: '2026-06-10T04:01:51.877Z',
    deployer: '0x2c8A01e971d7C51B3B78f9F08c57c45584D96AB2',
    tier: 'LowUntrusted',
    kind: 'session',
  },
  /** Low-tier managed (enterprise SSO / Polis) session-key authority. */
  SessionKeyAuthority_LowManaged: {
    address: '0x9Eb54A0d9F4fF687d026B452fCB11f4136681998',
    txHash:
      '0xc2ef95b40bc9fe262c9cf3a70243c341ced092921e642ecf837c5db6021ddf5d',
    deployedAt: '2026-06-10T04:01:51.877Z',
    deployer: '0x2c8A01e971d7C51B3B78f9F08c57c45584D96AB2',
    tier: 'LowManaged',
    kind: 'polis_sso',
  },
} as const satisfies Record<string, ContractDeployment>;

export type ContractName = keyof typeof SEPOLIA_DEPLOYMENTS;

/**
 * The CofferdamSmartAccount has NO standalone deployment address: each user's
 * account is a counterfactual create2 instance deployed by
 * `CofferdamAccountFactory` from this AA bytecode hash. Tracked separately
 * because it doesn't fit the address-bearing `ContractDeployment` shape.
 */
export const COFFERDAM_SMART_ACCOUNT = {
  deployedAt: '2026-06-09T09:56:55.005Z',
  deployer: '0x2c8A01e971d7C51B3B78f9F08c57c45584D96AB2',
  aaBytecodeHash:
    '0x0100083bd029572aabc69ca550ce33549370ca18bbf6d25846ff265f9ced388c',
  note: 'Implementation deployed only via factory create2Account; no standalone address.',
} as const;

/**
 * The authority-module address a session attestation's signature scheme must
 * resolve to on-chain. `webauthn` assertions are verified by
 * `WebAuthnPasskeyAuthority`; raw `p256` signatures by `PasskeyAuthority`.
 */
export const PASSKEY_AUTHORITY_MODULE_BY_SCHEME = {
  webauthn: SEPOLIA_DEPLOYMENTS.WebAuthnPasskeyAuthority.address,
  p256: SEPOLIA_DEPLOYMENTS.PasskeyAuthority.address,
} as const satisfies Record<'webauthn' | 'p256', Address>;
