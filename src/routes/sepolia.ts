import { Hono } from 'hono';
import type { Env } from '../env.js';
import { getSepoliaClient } from '../chain/client.js';
import { SEPOLIA_DEPLOYMENTS, ZKSYNC_SEPOLIA_CHAIN_ID } from '../chain/deployments.js';

export const sepoliaRoutes = new Hono<{ Bindings: Env }>();

/**
 * Read the current ZKSync Era Sepolia block height. Smoke-tests that
 * the Worker can talk to the upstream RPC and that the RN app's chain
 * pipeline is alive.
 */
sepoliaRoutes.get('/block-height', async (c) => {
  const client = getSepoliaClient(c.env.ZKSYNC_SEPOLIA_RPC_URL);
  try {
    const blockNumber = await client.getBlockNumber();
    return c.json({
      ok: true,
      chainId: ZKSYNC_SEPOLIA_CHAIN_ID,
      blockNumber: blockNumber.toString(),
      rpcUrl: c.env.ZKSYNC_SEPOLIA_RPC_URL,
    });
  } catch (err) {
    return c.json(
      {
        ok: false,
        error: 'rpc_unreachable',
        message: err instanceof Error ? err.message : String(err),
      },
      502,
    );
  }
});

/**
 * Return the deployed Cofferdam-relevant contracts on Sepolia.
 *
 * Read-only; the addresses are vendored from
 * `contracts/deployments/zkSyncSepolia.json`. The Worker doesn't yet
 * fetch live state for each contract — it just enumerates them so the
 * RN app can render a "deployments are live" smoke-test card during
 * Session 1.
 */
sepoliaRoutes.get('/contracts', (c) => {
  const entries = Object.entries(SEPOLIA_DEPLOYMENTS).map(([name, d]) => ({
    name,
    address: d.address,
    txHash: d.txHash,
    deployedAt: d.deployedAt,
    deployer: d.deployer,
    explorerUrl: `https://sepolia.explorer.zksync.io/address/${d.address}`,
  }));
  return c.json({
    ok: true,
    chainId: ZKSYNC_SEPOLIA_CHAIN_ID,
    contracts: entries,
  });
});
