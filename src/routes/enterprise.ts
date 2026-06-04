// Copyright (c) 2026 OffshoreSync LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * /v1/enterprise routes — the shared Cofferdam company-plane resolver +
 * grant API (ENTERPRISE_MODULE_PLAN.md rev-7.4 §3 + §4.11).
 *
 *   GET  /v1/enterprise/resolve?domain=<d>                  domain → global companyRef (+ DNS challenge, on-chain status)
 *   GET  /v1/enterprise/companies/:companyRef               on-chain registration status for a companyRef
 *   POST /v1/enterprise/links                               issue/re-grant a CompanyConsumerLink (scoped vertical→company)
 *   GET  /v1/enterprise/links?companyRef|domain=<…>         list a company's links
 *   GET  /v1/enterprise/links/check?companyRef|domain&consumerId[&scope]  route-guard check for a consumer
 *   POST /v1/enterprise/links/:companyRef/:consumerId/revoke   revoke a link
 *
 * MATURITY (α): `resolve` is fully live — `companyRef` is a pure function of
 * the domain. On-chain registration degrades to `registry_not_deployed`
 * until `CofferdamCorporateRegistry` is vendored (services/company.ts). The
 * link endpoints require the `LINKS` KV namespace; until it's provisioned
 * they return 503 `link_store_unprovisioned`.
 *
 * SECURITY TODO (before staging/mainnet): link issuance + revocation MUST be
 * gated by it_admin authorization — a Polis enterprise session or a company
 * Safe signature over the grant. Today `grantedByMemberRef`/`revokedBy` are
 * TRUSTED from the request body (α scaffold only). Same posture as
 * `routes/attester.ts`'s "gate behind ENVIRONMENT before mainnet" note.
 */

import { Hono, type Context } from 'hono';
import type { Env } from '../env.js';
import { getSepoliaClient } from '../chain/client.js';
import { ZKSYNC_SEPOLIA_CHAIN_ID } from '../chain/deployments.js';
import {
  CORPORATE_REGISTRY_ADDRESS,
  DNS_CHALLENGE_VALUE_PREFIX,
  canonicalizeDomain,
  deriveCompanyRef,
  dnsChallengeRecordName,
  isCompanyRef,
  readCompanyRegistration,
  type CompanyRef,
} from '../services/company.js';
import {
  CompanyLinkStore,
  areValidScopes,
  type CompanyConsumerLink,
  type InitiatedVia,
} from '../services/companyLinks.js';

export const enterpriseRoutes = new Hono<{ Bindings: Env }>();

const INITIATED_VIA: readonly InitiatedVia[] = ['consumer_claim', 'dashboard_install'];
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,62}$/; // consumerId / vertical shape

type RegistrationResult =
  | Awaited<ReturnType<typeof readCompanyRegistration>>
  | { status: 'registry_not_deployed' }
  | { status: 'rpc_error'; message: string };

/** Read on-chain registration, degrading gracefully if the registry is undeployed or RPC fails. */
async function registrationFor(
  c: Context<{ Bindings: Env }>,
  companyRef: CompanyRef,
): Promise<RegistrationResult> {
  if (!CORPORATE_REGISTRY_ADDRESS) return { status: 'registry_not_deployed' };
  try {
    const client = getSepoliaClient(c.env.ZKSYNC_SEPOLIA_RPC_URL);
    return await readCompanyRegistration(client, companyRef);
  } catch (err) {
    return { status: 'rpc_error', message: err instanceof Error ? err.message : String(err) };
  }
}

/** Resolve a `companyRef` from either a `companyRef` or a `domain` value. */
function refFromInput(input: {
  companyRef?: unknown;
  domain?: unknown;
}): { companyRef: CompanyRef; canonicalDomain: string | null } | { error: string; hint: string } {
  if (typeof input.domain === 'string' && input.domain.length > 0) {
    const canonicalDomain = canonicalizeDomain(input.domain);
    if (!canonicalDomain) return { error: 'bad_domain', hint: 'not a valid domain' };
    const derived = deriveCompanyRef(canonicalDomain);
    if (isCompanyRef(input.companyRef) && input.companyRef.toLowerCase() !== derived.toLowerCase()) {
      return { error: 'ref_domain_mismatch', hint: 'companyRef does not derive from domain' };
    }
    return { companyRef: derived, canonicalDomain };
  }
  if (isCompanyRef(input.companyRef)) {
    return { companyRef: input.companyRef.toLowerCase() as CompanyRef, canonicalDomain: null };
  }
  return { error: 'missing_identifier', hint: 'provide `domain` or a 32-byte `companyRef`' };
}

// ─────────────────────────────────────────────────────────────────────
// GET /resolve — the keystone. domain → global companyRef.
// ─────────────────────────────────────────────────────────────────────

enterpriseRoutes.get('/resolve', async (c) => {
  const raw = c.req.query('domain');
  if (!raw) {
    return c.json({ ok: false, error: 'missing_domain', hint: 'pass ?domain=acme.com' }, 400);
  }
  const canonicalDomain = canonicalizeDomain(raw);
  if (!canonicalDomain) {
    return c.json({ ok: false, error: 'bad_domain', hint: 'not a valid domain', input: raw }, 400);
  }

  const companyRef = deriveCompanyRef(canonicalDomain);
  const registration = await registrationFor(c, companyRef);

  return c.json({
    ok: true,
    domain: canonicalDomain,
    companyRef,
    dnsChallenge: {
      recordName: dnsChallengeRecordName(canonicalDomain),
      recordType: 'TXT',
      valuePrefix: DNS_CHALLENGE_VALUE_PREFIX,
    },
    registration,
  });
});

// ─────────────────────────────────────────────────────────────────────
// GET /companies/:companyRef — on-chain registration status.
// ─────────────────────────────────────────────────────────────────────

enterpriseRoutes.get('/companies/:companyRef', async (c) => {
  const companyRef = c.req.param('companyRef');
  if (!isCompanyRef(companyRef)) {
    return c.json({ ok: false, error: 'bad_company_ref', hint: 'expected 0x + 64 hex chars' }, 400);
  }
  const registration = await registrationFor(c, companyRef.toLowerCase() as CompanyRef);
  return c.json({
    ok: true,
    chainId: ZKSYNC_SEPOLIA_CHAIN_ID,
    companyRef: companyRef.toLowerCase(),
    registration,
  });
});

// ─────────────────────────────────────────────────────────────────────
// CompanyConsumerLink grant endpoints (require the LINKS KV namespace).
// ─────────────────────────────────────────────────────────────────────

/** Build the link store, or return a 503 if the KV namespace isn't provisioned. */
function linkStore(c: Context<{ Bindings: Env }>): CompanyLinkStore | null {
  return c.env.LINKS ? new CompanyLinkStore(c.env.LINKS) : null;
}

const STORE_UNPROVISIONED = {
  ok: false,
  error: 'link_store_unprovisioned',
  hint: 'Provision the LINKS KV namespace and uncomment it in wrangler.jsonc + env.ts (see README §Provisioning).',
} as const;

interface CreateLinkBody {
  domain?: unknown;
  companyRef?: unknown;
  consumerId?: unknown;
  vertical?: unknown;
  scopes?: unknown;
  grantedByMemberRef?: unknown;
  initiatedVia?: unknown;
}

enterpriseRoutes.post('/links', async (c) => {
  const store = linkStore(c);
  if (!store) return c.json(STORE_UNPROVISIONED, 503);

  let body: CreateLinkBody;
  try {
    body = (await c.req.json()) as CreateLinkBody;
  } catch {
    return c.json({ ok: false, error: 'invalid_json' }, 400);
  }

  // A link is always created from the domain handle (we store canonicalDomain).
  if (typeof body.domain !== 'string' || body.domain.length === 0) {
    return c.json({ ok: false, error: 'missing_domain', hint: '`domain` is required to create a link' }, 400);
  }
  const ref = refFromInput({ domain: body.domain, companyRef: body.companyRef });
  if ('error' in ref) return c.json({ ok: false, ...ref }, 400);
  const { companyRef, canonicalDomain } = ref;
  if (!canonicalDomain) {
    return c.json({ ok: false, error: 'bad_domain' }, 400);
  }

  if (typeof body.consumerId !== 'string' || !SLUG_RE.test(body.consumerId)) {
    return c.json({ ok: false, error: 'bad_consumer_id', hint: 'lowercase slug, 1-63 chars' }, 400);
  }
  if (typeof body.vertical !== 'string' || !SLUG_RE.test(body.vertical)) {
    return c.json({ ok: false, error: 'bad_vertical', hint: 'lowercase slug, 1-63 chars' }, 400);
  }
  if (!areValidScopes(body.scopes) || body.scopes.length === 0) {
    return c.json({ ok: false, error: 'bad_scopes', hint: 'non-empty subset of LINK_SCOPES' }, 400);
  }
  if (typeof body.initiatedVia !== 'string' || !INITIATED_VIA.includes(body.initiatedVia as InitiatedVia)) {
    return c.json({ ok: false, error: 'bad_initiated_via', hint: "'consumer_claim' | 'dashboard_install'" }, 400);
  }
  const grantedByMemberRef =
    typeof body.grantedByMemberRef === 'string' ? body.grantedByMemberRef : null;

  // Upsert: re-granting reuses the (companyRef, consumerId) slot. NOTE: §4.11
  // wants a NEW row per re-grant for full history; preserving that needs an
  // append log (D1) — tracked as a follow-up. Here we keep createdAt stable.
  const now = new Date().toISOString();
  const existing = await store.get(companyRef, body.consumerId);
  const link: CompanyConsumerLink = {
    companyRef,
    canonicalDomain,
    consumerId: body.consumerId,
    vertical: body.vertical,
    status: 'active',
    scopes: body.scopes,
    grantedByMemberRef,
    initiatedVia: body.initiatedVia as InitiatedVia,
    grantedAt: now,
    revokedAt: null,
    revokedBy: null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await store.put(link);

  return c.json({ ok: true, link }, existing ? 200 : 201);
});

enterpriseRoutes.get('/links', async (c) => {
  const store = linkStore(c);
  if (!store) return c.json(STORE_UNPROVISIONED, 503);

  const ref = refFromInput({ companyRef: c.req.query('companyRef'), domain: c.req.query('domain') });
  if ('error' in ref) return c.json({ ok: false, ...ref }, 400);

  const links = await store.listByCompany(ref.companyRef);
  return c.json({ ok: true, companyRef: ref.companyRef, count: links.length, links });
});

enterpriseRoutes.get('/links/check', async (c) => {
  const store = linkStore(c);
  if (!store) return c.json(STORE_UNPROVISIONED, 503);

  const consumerId = c.req.query('consumerId');
  if (!consumerId) {
    return c.json({ ok: false, error: 'missing_consumer_id' }, 400);
  }
  const ref = refFromInput({ companyRef: c.req.query('companyRef'), domain: c.req.query('domain') });
  if ('error' in ref) return c.json({ ok: false, ...ref }, 400);

  const link = await store.get(ref.companyRef, consumerId);
  const active = link?.status === 'active';
  const scope = c.req.query('scope');
  return c.json({
    ok: true,
    companyRef: ref.companyRef,
    consumerId,
    linked: link !== null,
    active,
    status: link?.status ?? null,
    scopes: link?.scopes ?? [],
    hasScope: scope ? active && (link?.scopes.some((s) => s === scope) ?? false) : null,
  });
});

interface RevokeBody {
  revokedBy?: unknown;
}

enterpriseRoutes.post('/links/:companyRef/:consumerId/revoke', async (c) => {
  const store = linkStore(c);
  if (!store) return c.json(STORE_UNPROVISIONED, 503);

  const companyRef = c.req.param('companyRef');
  const consumerId = c.req.param('consumerId');
  if (!isCompanyRef(companyRef)) {
    return c.json({ ok: false, error: 'bad_company_ref', hint: 'expected 0x + 64 hex chars' }, 400);
  }

  const link = await store.get(companyRef.toLowerCase() as CompanyRef, consumerId);
  if (!link) {
    return c.json({ ok: false, error: 'link_not_found' }, 404);
  }

  let revokedBy: string | null = null;
  try {
    const body = (await c.req.json()) as RevokeBody;
    if (typeof body.revokedBy === 'string') revokedBy = body.revokedBy;
  } catch {
    // body is optional for revoke
  }

  const now = new Date().toISOString();
  link.status = 'revoked';
  link.revokedAt = now;
  link.revokedBy = revokedBy;
  link.updatedAt = now;
  await store.put(link);

  return c.json({ ok: true, link });
});
