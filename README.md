# cofferdam-api

> Public-edge HTTP Worker for the [Cofferdam](https://cofferdam.xyz) wallet stack.
> Hono router on Cloudflare Workers; reads ZKSync Era contracts via viem; binds to
> [`cofferdam-attester`](https://github.com/OffshoreSync/cofferdam-attester) over
> Workers RPC for signing operations.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## What it does

`cofferdam-api` is the only public-facing surface in the Cofferdam backend. It:

- Serves the REST API consumed by the Cofferdam wallet (`cofferdam-app`).
- Reads on-chain state from ZKSync Era (Sepolia today, mainnet later) via [viem](https://viem.sh).
- Brokers cross-Worker calls to `cofferdam-attester` (Self.xyz signing) and, in
  later sessions, `cofferdam-prover` (Groth16 prover Container) — both of which
  are private, service-binding-only Workers.

It is **stateless** with respect to identity: no passport bytes, no biometric
material, no private keys ever transit through this Worker. The trust model is
documented in
[cofferdam-sdk/IDENTITY_LAYER_DESIGN.md](https://github.com/OffshoreSync/cofferdam-sdk/blob/main/IDENTITY_LAYER_DESIGN.md).

## Routes (current)

| Method | Path                       | Description                                     |
|--------|----------------------------|-------------------------------------------------|
| GET    | `/`                        | Service info + route inventory                  |
| GET    | `/health`                  | Liveness probe                                  |
| GET    | `/sepolia/block-height`    | Current ZKSync Era Sepolia block (live RPC)     |
| GET    | `/sepolia/contracts`       | Vendored contract deployments                   |
| POST   | `/v1/attester/test-sign`   | End-to-end smoke test of the attester binding   |

## Local dev

```bash
yarn install
yarn dev
# Wrangler dev on http://localhost:8787 (auto-bumps if 8787 is taken).

# In a separate terminal, also start cofferdam-attester so the
# ATTESTER service binding resolves locally:
git clone https://github.com/OffshoreSync/cofferdam-attester.git ../cofferdam-attester
cd ../cofferdam-attester && yarn install && yarn dev
```

Wrangler 4's local registry auto-discovers other `wrangler dev` instances on
the same machine and wires service bindings between them.

### Smoke test

```bash
curl -s http://localhost:8787/sepolia/contracts | jq '.contracts | length'
# expect: 5

curl -sX POST http://localhost:8787/v1/attester/test-sign \
  -H 'content-type: application/json' \
  -d '{"account":"0xfa4D920d5592289A1A0F73CA49D626EF8FE4D695"}' | jq '.onchainValid'
# expect: true  (requires cofferdam-attester running with ATTESTER_PRIVATE_KEY set)
```

## Deploy

```bash
yarn deploy
# Pushes to the Cloudflare account configured by `wrangler login`.
```

CI will deploy automatically when a tag matching `v*` is pushed, gated by the
`production` environment for manual approval. Set `CLOUDFLARE_API_TOKEN` as a
repo secret with `Workers:Edit` + `Account:Read` scopes.

## Repository layout

```
src/
├── index.ts              Hono app entrypoint
├── env.ts                Typed environment bindings
├── chain/
│   ├── client.ts         viem ZKSync Era Sepolia public client
│   └── deployments.ts    Vendored contract addresses
├── routes/
│   ├── health.ts         GET /health
│   ├── sepolia.ts        GET /sepolia/*
│   └── attester.ts       POST /v1/attester/*
└── services/
    └── attester.ts       Local copy of @cofferdam/attester RPC contract
                          (must stay in sync with that repo's src/rpc.ts;
                          a future @cofferdam/types package will absorb)
```

## Sibling repositories

| Repo                                                                       | Role                                          |
|----------------------------------------------------------------------------|-----------------------------------------------|
| [`cofferdam-attester`](https://github.com/OffshoreSync/cofferdam-attester) | Self.xyz attester signing Worker              |
| [`cofferdam-prover`](https://github.com/OffshoreSync/cofferdam-prover)     | Self.xyz Groth16 prover Container (WIP)       |
| [`cofferdam-sdk`](https://github.com/OffshoreSync/cofferdam-sdk)           | Public SDK + identity-layer design doc        |
| [`contracts`](https://github.com/OffshoreSync/contracts)                   | Solidity contracts (Self.xyz integration)     |

## License

[Apache License 2.0](LICENSE). Copyright 2026 OffshoreSync LLC.
