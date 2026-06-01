// Copyright (c) 2026 OffshoreSync LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Typed environment bindings for the Cofferdam API Worker.
 *
 * Mirrors the `vars`, `kv_namespaces`, `r2_buckets`, `d1_databases`,
 * `services`, and `durable_objects.bindings` declared in
 * `wrangler.jsonc`. Keep them in sync — when you uncomment a binding
 * there, add it here too.
 */

import type { AttesterRpc } from './services/attester.js';

export interface Env {
  // ── vars ────────────────────────────────────────────────────────
  ENVIRONMENT: 'development' | 'staging' | 'production';
  ZKSYNC_SEPOLIA_RPC_URL: string;

  // ── secrets (set via `wrangler secret put NAME`) ────────────────
  // (none yet — added when sessions/attester light up)

  // ── KV namespaces (provisioned in later sessions) ───────────────
  // SESSIONS: KVNamespace;
  // PROFILES: KVNamespace;

  // ── R2 buckets (provisioned in later sessions) ──────────────────
  // VAULT: R2Bucket;
  // SRS:   R2Bucket;

  // ── D1 databases (provisioned in later sessions) ────────────────
  // DB: D1Database;

  // ── Service bindings ────────────────────────────────────────────
  /**
   * cofferdam-attester service binding (Session 3+). Exposes the
   * `signBind` RPC method via Cloudflare's Workers RPC. Resolves at
   * runtime — at typecheck time we use `Service<AttesterRpc>` so the
   * `env.ATTESTER.signBind(...)` call is fully typed.
   */
  ATTESTER: Service<AttesterRpc>;
  // PROVER: Service<ProverRpc>;  // Sessions 4-5

  // ── Durable Object namespaces (provisioned in later sessions) ───
  // SESSION_DO: DurableObjectNamespace;
}
